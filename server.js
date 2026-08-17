const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const PORT = process.env.PORT || 3000;
const TTL = 45_000;
const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;
const sessions = new Map();
const games = {
  'orbit-tap': { plays: 0 },
  'quick-math': { plays: 0 }
};

const mime = {
  '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8',
  '.js':'application/javascript; charset=utf-8', '.json':'application/json; charset=utf-8',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml'
};

function cookieValue(req,name){
  const match = new RegExp('(?:^|; )' + name + '=([^;]+)').exec(req.headers.cookie || '');
  return match ? match[1] : '';
}
function setSession(res){
  const id = crypto.randomBytes(32).toString('hex');
  sessions.set(id, {game:null, seen:Date.now(), expires:Date.now()+SESSION_TTL});
  res.setHeader('Set-Cookie', `kz_session=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL/1000}`);
  return id;
}
function currentSession(req){
  const id = cookieValue(req,'kz_session');
  const s = sessions.get(id);
  if (!s || s.expires < Date.now()){ if (id) sessions.delete(id); return null; }
  return {id,s};
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
    if(!id) id=setSession(res);
    return readBody(req,body=>{
      const s=sessions.get(id);
      const game=typeof body.game==='string'&&games[body.game]?body.game:null;
      if(s){s.game=game;s.seen=Date.now()}
      json(res,200,{ok:true});
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
