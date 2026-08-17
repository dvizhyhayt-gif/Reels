const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const TTL = 45_000;
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const sessions = new Map();
const rate = new Map();
const games = {
  'orbit-tap': { plays: 0 },
  'quick-math': { plays: 0 }
};
const dataDir = path.join(ROOT, 'data');
const usersFile = path.join(dataDir, 'users.json');
fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(usersFile)) fs.writeFileSync(usersFile, '{}');
let users = JSON.parse(fs.readFileSync(usersFile, 'utf8') || '{}');

const mime = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'application/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml'
};

function saveUsers(){
  const tmp = usersFile + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2));
  fs.renameSync(tmp, usersFile);
}
function clean(s){return typeof s === 'string' ? s.trim() : ''}
function validEmail(email){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)}
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')){
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return {hash, salt};
}
function samePassword(password, user){
  const hash = crypto.scryptSync(password, user.salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash,'hex'), Buffer.from(user.hash,'hex'));
}
function cookieValue(req,name){
  const match = new RegExp('(?:^|; )' + name + '=([^;]+)').exec(req.headers.cookie || '');
  return match ? match[1] : '';
}
function setSession(res, userId){
  const id = crypto.randomBytes(32).toString('hex');
  sessions.set(id, {userId, game:null, seen:Date.now(), expires:Date.now()+SESSION_TTL});
  res.setHeader('Set-Cookie', `kz_session=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL/1000}`);
  return id;
}
function currentSession(req){
  const id = cookieValue(req,'kz_session');
  const s = sessions.get(id);
  if (!s || s.expires < Date.now()){ if (id) sessions.delete(id); return null; }
  return {id,s};
}
function publicUser(user){
  return {id:user.id, username:user.username, email:user.email, role:user.role, avatar:user.avatar||'', favorites:user.favorites, history:user.history, createdAt:user.createdAt};
}
function json(res,status,data,headers={}){
  res.writeHead(status,{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    ...headers
  });
  res.end(JSON.stringify(data));
}
function readBody(req, callback){
  let body='';
  req.on('data',chunk=>{body+=chunk;if(body.length>5000) req.destroy()});
  req.on('end',()=>{try{callback(JSON.parse(body||'{}'))}catch{callback({})}});
}
function limited(req,key,limit=12,windowMs=60_000){
  const ip=req.socket.remoteAddress||'unknown', now=Date.now(), id=ip+'|'+key;
  const list=(rate.get(id)||[]).filter(t=>now-t<windowMs);
  list.push(now); rate.set(id,list); return list.length<=limit;
}
function active(){
  const now=Date.now(), online={site:0,games:{}};
  for(const [id,s] of sessions){
    if(now-s.seen>TTL||s.expires<now){sessions.delete(id);continue}
    online.site++;
    if(s.game) online.games[s.game]=(online.games[s.game]||0)+1;
  }
  return online;
}

const server=http.createServer((req,res)=>{
  const url=new URL(req.url,`http://${req.headers.host}`);

  if(url.pathname==='/api/online') return json(res,200,active());
  if(url.pathname==='/api/games') return json(res,200,games);

  if(url.pathname==='/api/heartbeat'&&req.method==='POST'){
    const current=currentSession(req);
    let id=current?.id;
    if(!id) id=setSession(res,'guest');
    return readBody(req,body=>{
      const s=sessions.get(id);
      const game=typeof body.game==='string'&&games[body.game]?body.game:null;
      if(s){s.game=game;s.seen=Date.now()}
      json(res,200,{ok:true});
    });
  }


  if(url.pathname==='/api/auth/register'&&req.method==='POST'){
    if(!limited(req,'register')) return json(res,429,{error:'Слишком много попыток'});
    return readBody(req,body=>{
      const username=clean(body.username), email=clean(body.email).toLowerCase(), password=body.password||'', role=body.role==='developer'?'developer':'player';
      if(!/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(username)) return json(res,400,{error:'Логин: 3–20 английских букв, цифр или _'});
      if(!validEmail(email)||password.length<8) return json(res,400,{error:'Проверь email и пароль (минимум 8 символов)'});
      if(Object.values(users).some(u=>u.username.toLowerCase()===username.toLowerCase())) return json(res,409,{error:'Такой логин уже занят'});
      if(Object.values(users).some(u=>u.email===email)) return json(res,409,{error:'Этот email уже зарегистрирован'});
      const {hash,salt}=hashPassword(password), id=crypto.randomUUID();
      users[id]={id,username,email,role,avatar:'',hash,salt,favorites:[],history:[],createdAt:new Date().toISOString()}; saveUsers(); setSession(res,id);
      json(res,201,{user:publicUser(users[id])});
    });
  }

  if(url.pathname==='/api/avatar'&&req.method==='POST'){
    const current=currentSession(req); if(!current||!users[current.s.userId]) return json(res,401,{error:'Нужен вход'});
    return readBody(req,body=>{
      if(!['bear','panda','wolf','fox',''].includes(body.avatar)) return json(res,400,{error:'Неизвестный аватар'});
      users[current.s.userId].avatar=body.avatar; saveUsers(); json(res,200,{user:publicUser(users[current.s.userId])});
    });
  }

  if(url.pathname==='/api/auth/login'&&req.method==='POST'){
    if(!limited(req,'login')) return json(res,429,{error:'Слишком много попыток'});
    return readBody(req,body=>{
      const email=clean(body.email).toLowerCase(), password=body.password||'';
      const user=Object.values(users).find(u=>u.email===email);
      if(!user||!samePassword(password,user)) return json(res,401,{error:'Неверный email или пароль'});
      setSession(res,user.id); json(res,200,{user:publicUser(user)});
    });
  }

  if(url.pathname==='/api/auth/logout'&&req.method==='POST'){
    const id=cookieValue(req,'kz_session'); if(id) sessions.delete(id);
    res.setHeader('Set-Cookie','kz_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
    return json(res,200,{ok:true});
  }

  if(url.pathname==='/api/me'){
    const current=currentSession(req); if(!current||!users[current.s.userId]) return json(res,200,{user:null});
    return json(res,200,{user:publicUser(users[current.s.userId])});
  }

  if(url.pathname==='/api/favorite'&&req.method==='POST'){
    const current=currentSession(req); if(!current||!users[current.s.userId]) return json(res,401,{error:'Нужен вход'});
    return readBody(req,body=>{
      const game=clean(body.game); if(!games[game]) return json(res,400,{error:'Неизвестная игра'});
      const user=users[current.s.userId], index=user.favorites.indexOf(game);
      if(body.active && index===-1) user.favorites.push(game);
      if(!body.active && index!==-1) user.favorites.splice(index,1);
      saveUsers(); json(res,200,{favorites:user.favorites});
    });
  }

  if(url.pathname==='/api/play'&&req.method==='POST'){
    if(!limited(req,'play',30,60_000)) return json(res,429,{error:'Слишком много запусков'});
    return readBody(req,body=>{
      const game=clean(body.game); if(!games[game]) return json(res,400,{error:'Unknown game'});
      games[game].plays++;
      const current=currentSession(req);
      if(current&&users[current.s.userId]){
        const history=users[current.s.userId].history.filter(x=>x!==game); history.unshift(game); users[current.s.userId].history=history.slice(0,12); saveUsers();
      }
      json(res,200,{ok:true,plays:games[game].plays});
    });
  }

  const requested=decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname);
  const safe=path.normalize(requested).replace(/^([.][.][/\\])+/, '');
  const full=path.join(ROOT,safe);
  if(!full.startsWith(ROOT)) return json(res,403,{error:'Forbidden'});
  fs.readFile(full,(err,data)=>{
    if(err) return json(res,404,{error:'Not found'});
    res.writeHead(200,{'Content-Type':mime[path.extname(full)]||'application/octet-stream','X-Content-Type-Options':'nosniff','X-Frame-Options':'SAMEORIGIN','Referrer-Policy':'strict-origin-when-cross-origin'});
    res.end(data);
  });
});

setInterval(active,15_000);
server.listen(PORT,()=>console.log(`AYUVERSE: http://localhost:${PORT}`));
