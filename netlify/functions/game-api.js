const crypto=require('crypto');

const OWNER_UID='KfR8Z39adYPI5z0L2wOV4Hc5tqO2';
const FIREBASE_KEY='AIzaSyD_-yLKP8BVysojwzrl9Xlg0959Z4bONRU';
const SUPABASE_URL='https://kxijwexpydfqvhennnok.supabase.co';
const BUCKET='game-submissions';
const json=(status,data)=>({statusCode:status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'},body:JSON.stringify(data)});
const encoded=path=>path.split('/').map(encodeURIComponent).join('/');

async function identity(event){
  const token=(event.headers.authorization||'').replace(/^Bearer\s+/,'');
  if(!token)throw new Error('Требуется вход');
  const response=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_KEY}`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idToken:token})});
  const user=(await response.json()).users?.[0];if(!user)throw new Error('Сессия недействительна');return {uid:user.localId,token};
}
async function profile(uid,token){
  const response=await fetch(`https://firestore.googleapis.com/v1/projects/ayuversegames/databases/(default)/documents/users/${uid}`,{headers:{Authorization:`Bearer ${token}`}});
  return (await response.json()).fields||{};
}
async function storageCall(path,body){
  const key=process.env.SUPABASE_SERVICE_ROLE_KEY;if(!key)throw new Error('Не настроен ключ Supabase');
  const response=await fetch(`${SUPABASE_URL}/storage/v1/object/${path}`,{method:'POST',headers:{Authorization:`Bearer ${key}`,apikey:key,'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json();if(!response.ok)throw new Error(data.message||data.error||'Ошибка хранилища');return data;
}
exports.handler=async event=>{
  if(event.httpMethod!=='POST')return json(405,{error:'Метод запрещён'});
  try{
    const user=await identity(event),request=JSON.parse(event.body||'{}');
    if(request.action==='sign'){
      const role=(await profile(user.uid,user.token)).role?.stringValue;
      if(role!=='developer'&&user.uid!==OWNER_UID)throw new Error('Нужен аккаунт разработчика');
      if(!/\.zip$/i.test(request.name)||request.size>50*1024*1024)throw new Error('Нужен ZIP до 50 МБ');
      const path=`${user.uid}/${crypto.randomUUID()}.zip`;
      const signed=await storageCall(`upload/sign/${BUCKET}/${encoded(path)}`,{});return json(200,{path,token:signed.token});
    }
    if(user.uid!==OWNER_UID)throw new Error('Нет доступа к модерации');
    if(request.action==='download'){
      const signed=await storageCall(`sign/${BUCKET}/${encoded(request.path)}`,{expiresIn:600});
      return json(200,{url:signed.signedURL?.startsWith('http')?signed.signedURL:SUPABASE_URL+signed.signedURL});
    }
    if(request.action==='publish'){
      const secret=process.env.NETLIFY_TOKEN;if(!secret)throw new Error('Не настроен токен Netlify');
      const signed=await storageCall(`sign/${BUCKET}/${encoded(request.path)}`,{expiresIn:600});
      const archive=await fetch(signed.signedURL?.startsWith('http')?signed.signedURL:SUPABASE_URL+signed.signedURL);
      if(!archive.ok)throw new Error('Архив не загружен');
      const slug=String(request.slug||'game').replace(/[^a-z0-9-]/g,'').replace(/^-+|-+$/g,'').slice(0,35)||'game';
      const siteName=`ayu-${slug}-${crypto.randomBytes(3).toString('hex')}`;
      const siteResponse=await fetch('https://api.netlify.com/api/v1/sites',{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/json'},body:JSON.stringify({name:siteName})});
      const site=await siteResponse.json();if(!siteResponse.ok)throw new Error(site.message||'Не создан сайт игры');
      const deploy=await fetch(`https://api.netlify.com/api/v1/sites/${site.id}/deploys`,{method:'POST',headers:{Authorization:`Bearer ${secret}`,'Content-Type':'application/zip'},body:Buffer.from(await archive.arrayBuffer())});
      if(!deploy.ok)throw new Error('Не удалось опубликовать архив');return json(200,{url:site.ssl_url||site.url});
    }
    return json(400,{error:'Неизвестное действие'});
  }catch(error){return json(400,{error:error.message})}
};
