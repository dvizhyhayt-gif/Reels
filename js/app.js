const games = {
  'orbit-tap': {
    name:'Orbit Tap', image:'img/bannerMini1.png', developer:'AYUVERSE Studio', rating:'4.7', reviews:'18', category:'Аркада', plays:'',
    description:'Нажимай на движущуюся цель как можно быстрее. Раунд длится 30 секунд.', devices:['ПК','Телефон']
  },
  'quick-math': {
    name:'Quick Math', image:'img/bannermini2.png', developer:'AYUVERSE Studio', rating:'4.6', reviews:'12', category:'Логика', plays:'',
    description:'Решай примеры на скорость. За 30 секунд набери максимум правильных ответов.', devices:['ПК','Телефон']
  }
};

let authMode='register', currentGame=null, gameTimer=null, gameScore=0, currentUser=null, selectedAvatar='bear';
const avatars={bear:'🐻',panda:'🐼',wolf:'🐺',fox:'🦊'};
const overlay=document.getElementById('overlay');
const gameOverlay=document.getElementById('gameOverlay');
const playOverlay=document.getElementById('playOverlay');
const profileOverlay=document.getElementById('profileOverlay');
const avatarOverlay=document.getElementById('avatarOverlay');
const submitGameOverlay=document.getElementById('submitGameOverlay');
const title=document.getElementById('modalTitle');
const sub=document.getElementById('modalSub');
const registerBox=document.getElementById('registerBox');
const submit=document.getElementById('submit');
const switchEl=document.getElementById('switch');

function toast(text){
  const box=document.getElementById('toastBox'); box.textContent=text; box.classList.add('show');
  clearTimeout(window.toastT); window.toastT=setTimeout(()=>box.classList.remove('show'),2400);
}
function lock(on){document.body.classList.toggle('lock',on)}
function openAuth(mode='register',developer=false){
  authMode=mode; overlay.classList.add('open'); lock(true);
  registerBox.style.display=mode==='register'?'block':'none';
  title.textContent=mode==='register'?'Создать аккаунт':'Добро пожаловать';
  sub.textContent=mode==='register'?'Присоединяйся к AYUVERSE':'Войди в свой аккаунт';
  submit.textContent=mode==='register'?'Зарегистрироваться':'Войти';
  switchEl.innerHTML=mode==='register'?'Уже есть аккаунт? <a>Войти</a>':'Нет аккаунта? <a>Зарегистрироваться</a>';
  switchEl.querySelector('a').onclick=()=>openAuth(mode==='register'?'login':'register');
  if(developer)document.querySelectorAll('.role').forEach(x=>x.classList.toggle('selected',x.dataset.role==='developer'));
}
function closeAuth(){overlay.classList.remove('open');lock(false)}
function scrollGames(){
  if(playOverlay.classList.contains('open'))closeGame();
  document.querySelectorAll('.overlay.open').forEach(item=>item.classList.remove('open'));
  lock(false);
  document.getElementById('games').scrollIntoView({behavior:'smooth'});
}

async function post(url,body){try{return await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}catch{return null}}
async function firebase(){if(!window.firebaseApi)await new Promise(resolve=>addEventListener('firebase-ready',resolve,{once:true}));return window.firebaseApi}
async function heartbeat(game=currentGame){await post('/api/heartbeat',{game})}
async function updateLiveCounts(){
  try{
    const data=await (await fetch('/api/online',{cache:'no-store'})).json();
    const site=document.getElementById('siteOnline'); if(site)site.textContent=data.site;
    const featured=document.getElementById('featuredOnline'); if(featured)featured.textContent=data.games['orbit-tap']||0;
    document.querySelectorAll('[data-online-game]').forEach(el=>el.textContent=data.games[el.dataset.onlineGame]||0);
  }catch{}
}
async function getGameStats(){
  try{return await (await fetch('/api/games',{cache:'no-store'})).json()}catch{return {}}
}

async function openGameProfile(slug){
  const game=games[slug]; if(!game)return;
  const stats=await getGameStats(); game.plays=stats[slug]?.plays||0;
  const online=(await getOnline())?.games?.[slug]||0;
  document.getElementById('gameProfile').innerHTML=`
    <div class="game-profile-cover">
      <img src="${game.image}" alt="${game.name}">
      <button class="profile-back" onclick="closeGameProfile()"><i class="fa-solid fa-arrow-left"></i></button>
    </div>
    <div class="game-profile-body">
      <h2 class="profile-title">${game.name}</h2>
      <div class="profile-dev">${game.developer}</div>
      <div class="profile-tags"><span>${game.category}</span><span>Онлайн</span><span>${game.devices.join(' + ')}</span></div>
      <div class="profile-rating"><b>★ ${game.rating}</b><span>${game.reviews} отзывов</span><span>${online} играют сейчас</span></div>
      <button class="btn btn-primary profile-play" onclick="startGame('${slug}')"><i class="fa-solid fa-play"></i> Играть</button>
      <div class="game-about"><h3>Описание</h3><p>${game.description}</p></div>
      <div class="game-about"><h3>Скриншоты</h3><div class="game-screens"><img src="${game.image}" alt=""><img src="${game.image}" alt=""><img src="${game.image}" alt=""></div></div>
    </div>`;
  gameOverlay.classList.add('open'); lock(true);
}
async function getOnline(){try{return await (await fetch('/api/online',{cache:'no-store'})).json()}catch{return null}}
function closeGameProfile(){gameOverlay.classList.remove('open'); if(!playOverlay.classList.contains('open'))lock(false)}

async function startGame(slug){
  const game=games[slug]; if(!game)return;
  currentGame=slug;
  await (await firebase()).play(slug);
  await heartbeat(slug);
  gameOverlay.classList.remove('open');
  playOverlay.classList.add('open'); lock(true);
  gameScore=0;
  if(slug==='orbit-tap')startOrbit(); else startMath();
}
function closeGame(){
  clearInterval(gameTimer); gameTimer=null; currentGame=null; heartbeat(null);
  playOverlay.classList.remove('open'); lock(false); updateLiveCounts();
}
function startOrbit(){
  const box=document.getElementById('gameWindow');
  box.innerHTML=`<div class="play-head"><strong>Orbit Tap</strong><div><span class="play-meta">Очки: <b id="score">0</b></span> <button class="btn btn-dark game-close" onclick="closeGame()">Выйти</button></div></div><div class="game-stage" id="orbitStage"><div class="game-stage-inner"><h2>Лови цель</h2><p>30 секунд. Тапай или кликай по синей цели.</p><div class="game-score">Время: <span id="time">30</span></div></div><button class="game-target" id="target"></button></div>`;
  const stage=document.getElementById('orbitStage'), target=document.getElementById('target'), score=document.getElementById('score'), time=document.getElementById('time');
  const move=()=>{const maxX=Math.max(40,stage.clientWidth-100), maxY=Math.max(90,stage.clientHeight-90);target.style.left=(15+Math.random()*maxX)+'px';target.style.top=(65+Math.random()*maxY)+'px'};
  target.onclick=()=>{gameScore++;score.textContent=gameScore;move()}; move();
  let left=30; gameTimer=setInterval(()=>{left--;time.textContent=left;if(left<=0){clearInterval(gameTimer);toast('Раунд окончен: '+gameScore+' очков')}} ,1000);
}
function startMath(){
  const box=document.getElementById('gameWindow');
  box.innerHTML=`<div class="play-head"><strong>Quick Math</strong><div><span class="play-meta">Очки: <b id="score">0</b></span> <button class="btn btn-dark game-close" onclick="closeGame()">Выйти</button></div></div><div class="game-stage"><div class="game-stage-inner"><h2>Решай быстрее</h2><p>Выбирай правильный ответ.</p><div class="game-score">Время: <span id="time">30</span></div><div class="math-box"><div class="math-question" id="question"></div><div class="math-options" id="options"></div></div></div></div>`;
  const question=document.getElementById('question'), options=document.getElementById('options'), score=document.getElementById('score'), time=document.getElementById('time');
  function round(){const a=1+Math.floor(Math.random()*12),b=1+Math.floor(Math.random()*12),answer=a+b;question.textContent=`${a} + ${b} = ?`;const values=[answer,answer+1+Math.floor(Math.random()*3),answer-1,answer+3].sort(()=>Math.random()-.5);options.innerHTML=values.map(v=>`<button>${v}</button>`).join('');options.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{if(Number(btn.textContent)===answer){gameScore++;score.textContent=gameScore}round()})} round();
  let left=30; gameTimer=setInterval(()=>{left--;time.textContent=left;if(left<=0){clearInterval(gameTimer);toast('Раунд окончен: '+gameScore+' правильных')}} ,1000);
}
async function fav(e,button){
  e.stopPropagation();
  const card=button.closest('.game-card'); const slug=card?.onclick?.toString().match(/'([^']+)'/)?.[1];
  if(!slug){toast('Игра не определена');return}
  const active=!button.classList.contains('active');
  if(await toggleFavorite(slug,active)){button.classList.toggle('active',active);button.innerHTML=active?'<i class="fa-solid fa-heart"></i>':'<i class="fa-regular fa-heart"></i>';toast(active?'Добавлено в избранное':'Удалено из избранного')}
}

document.getElementById('register').onclick=()=>openAuth('register');
document.getElementById('login').onclick=()=>openAuth('login');
document.getElementById('close').onclick=closeAuth;
overlay.onclick=e=>{if(e.target===overlay)closeAuth()};
gameOverlay.onclick=e=>{if(e.target===gameOverlay)closeGameProfile()};
playOverlay.onclick=e=>{if(e.target===playOverlay)closeGame()};
profileOverlay.onclick=e=>{if(e.target===profileOverlay)closeProfile()};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAuth();closeGameProfile();closeGame();closeProfile();closeGameSubmission()}});
document.querySelectorAll('.role').forEach(role=>role.onclick=()=>{document.querySelectorAll('.role').forEach(x=>x.classList.remove('selected'));role.classList.add('selected')});
submit.onclick=async()=>{
  const body={email:document.getElementById('email').value.trim(),password:document.getElementById('password').value};
  if(authMode==='register'){
    body.username=document.getElementById('username').value.trim();
    body.role=document.querySelector('.role.selected')?.dataset.role||'player';
    if(!/^[A-Za-z][A-Za-z0-9_]{2,19}$/.test(body.username)){toast('Логин: 3–20 английских букв, цифр или _');return}
  }
  try{
    const api=await firebase(),registered=authMode==='register';
    currentUser=registered?await api.register(body):await api.login(body.email,body.password);
    closeAuth();renderAccount();
    if(registered){avatarOverlay.classList.add('open');lock(true)}else toast('Вход выполнен: '+currentUser.username);
  }catch(error){toast(error.message||'Не удалось выполнить вход')}
};

document.querySelectorAll('.avatar-option').forEach(button=>button.onclick=()=>{
  selectedAvatar=button.dataset.avatar; document.getElementById('avatarPreview').textContent=avatars[selectedAvatar];
  document.querySelectorAll('.avatar-option').forEach(item=>item.classList.toggle('active',item===button));
});
async function saveAvatar(avatar){
  try{currentUser=await (await firebase()).saveAvatar(avatar);avatarOverlay.classList.remove('open');lock(false);renderAccount();toast('Аккаунт готов')}catch{toast('Не удалось сохранить аватар')}
}
document.getElementById('avatarContinue').onclick=()=>saveAvatar(selectedAvatar);
document.getElementById('avatarSkip').onclick=()=>saveAvatar('');

async function loadMe(){
  try{currentUser=await (await firebase()).me();renderAccount()}catch{}
}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function renderAccount(){
  document.querySelectorAll('.game-card').forEach(card=>{
    const slug=card.onclick?.toString().match(/\'([^\']+)\'/)?.[1];
    const btn=card.querySelector('.heart');
    if(btn&&currentUser&&slug){
      const active=currentUser.favorites.includes(slug);
      btn.classList.toggle('active',active);
      btn.innerHTML=active?'<i class="fa-solid fa-heart"></i>':'<i class="fa-regular fa-heart"></i>';
    }
  });

  const loginBtn=document.getElementById('login');
  const regBtn=document.getElementById('register');
  const mobileBtn=document.getElementById('menu');
  const mobileAvatar=document.getElementById('mobileAccountAvatar');
  const mobileName=document.getElementById('mobileAccountName');
  const mobileRole=document.getElementById('mobileAccountRole');
  if(currentUser){
    loginBtn.innerHTML='<span class="account-avatar">'+(avatars[currentUser.avatar]||escapeHtml(currentUser.username.slice(0,1).toUpperCase()))+'</span><span class="account-name">'+escapeHtml(currentUser.username)+'</span>';
    loginBtn.classList.add('account-button');
    loginBtn.onclick=openProfile;
    regBtn.style.display='none';
    mobileAvatar.textContent=avatars[currentUser.avatar]||currentUser.username.slice(0,1).toUpperCase();
    mobileName.textContent=currentUser.username;
    mobileRole.textContent=currentUser.role==='developer'?'Разработчик':'Игрок';
    mobileBtn.onclick=openProfile;
  }else{
    loginBtn.innerHTML='<i class="fa-solid fa-right-to-bracket"></i> Войти';
    loginBtn.classList.remove('account-button');
    loginBtn.onclick=()=>openAuth('login');
    regBtn.style.display='';
    mobileAvatar.innerHTML='<i class="fa-solid fa-user"></i>';
    mobileName.textContent='Профиль';
    mobileRole.textContent='Войти';
    mobileBtn.onclick=()=>openAuth('login');
  }
}

async function openProfile(){
  if(!currentUser){openAuth('login');return}
  const gamesById=Object.entries(games);
  const favs=gamesById.filter(([id])=>currentUser.favorites.includes(id));
  const history=gamesById.filter(([id])=>currentUser.history.includes(id));
  const developer=currentUser.role==='developer', avatar=avatars[currentUser.avatar]||escapeHtml(currentUser.username.slice(0,1).toUpperCase());
  const recentCards=history.map(([id,g])=>`<button class="dashboard-game" onclick="closeProfile();openGameProfile('${id}')"><img src="${g.image}" alt=""><strong>${g.name}</strong><span>★ ${g.rating}</span></button>`).join('');
  const favoriteCards=favs.map(([id,g])=>`<button class="favorite-game" onclick="closeProfile();openGameProfile('${id}')"><img src="${g.image}" alt=""><span><strong>${g.name}</strong><small>${g.category} · ★ ${g.rating}</small></span></button>`).join('');
  document.getElementById('profileModal').innerHTML=`
    <div class="profile-dashboard">
      <aside class="profile-sidebar">
        <div class="profile-user"><div class="profile-avatar-large">${avatar}</div><div><h2>${escapeHtml(currentUser.username)}</h2><p>${escapeHtml(currentUser.email)}</p><span class="role-badge">${developer?'Разработчик':'Игрок'}</span></div></div>
        <div class="profile-side-stats"><div><b>${history.length}</b><span>Сыграно</span></div><div><b>${favs.length}</b><span>Избранное</span></div></div>
        <nav class="profile-menu"><button class="active"><i class="fa-solid fa-house"></i> Обзор</button>${developer?'<button onclick="openGameSubmission()"><i class="fa-solid fa-cloud-arrow-up"></i> Добавить игру</button>':''}<button onclick="document.getElementById('profileFavorites').scrollIntoView({behavior:'smooth'})"><i class="fa-regular fa-heart"></i> Избранное</button></nav>
        <button class="profile-logout" onclick="logout()"><i class="fa-solid fa-arrow-right-from-bracket"></i> Выйти из аккаунта</button>
      </aside>
      <main class="profile-content">
        <header class="profile-content-head"><div><h2>Профиль</h2><p>Управляйте аккаунтом на AYUVERSE</p></div><button class="close" onclick="closeProfile()">×</button></header>
        <div class="profile-metrics"><div><i class="fa-solid fa-gamepad"></i><b>${history.length}</b><span>Сыграно игр</span></div><div><i class="fa-solid fa-heart"></i><b>${favs.length}</b><span>В избранном</span></div><div><i class="fa-solid fa-user-shield"></i><b>${developer?'DEV':'PLAYER'}</b><span>Тип аккаунта</span></div><div><i class="fa-solid fa-circle-check"></i><b>Активен</b><span>Статус</span></div></div>
        <section class="profile-block"><h3>Последние игры</h3><div class="dashboard-games">${recentCards||'<div class="profile-empty">История появится после первой игры</div>'}${developer?'<button class="add-game-tile" onclick="openGameSubmission()"><i class="fa-solid fa-plus"></i><span>Добавить игру</span></button>':''}</div></section>
        <section class="profile-block" id="profileFavorites"><h3>Избранные игры</h3><div class="favorite-games">${favoriteCards||'<div class="profile-empty">Пока ничего не добавлено</div>'}</div></section>
        ${developer?'<div class="profile-cta"><div><strong>Опубликуйте свою игру</strong><p>Заполните информацию и отправьте проект на модерацию</p></div><button class="btn btn-primary" onclick="openGameSubmission()">Добавить игру</button></div>':''}
      </main>
    </div>`;
  document.getElementById('profileOverlay').classList.add('open');lock(true);
}
function closeProfile(){document.getElementById('profileOverlay').classList.remove('open');if(!overlay.classList.contains('open')&&!gameOverlay.classList.contains('open')&&!playOverlay.classList.contains('open'))lock(false)}
function openGameSubmission(){
  if(currentUser?.role!=='developer')return; profileOverlay.classList.remove('open'); submitGameOverlay.classList.add('open'); lock(true);
  const developer=document.getElementById('gameDeveloper'); if(!developer.value)developer.value=currentUser.username;
}
function closeGameSubmission(){submitGameOverlay.classList.remove('open');if(!overlay.classList.contains('open'))lock(false)}
submitGameOverlay.onclick=e=>{if(e.target===submitGameOverlay)closeGameSubmission()};
document.querySelectorAll('.platform-option').forEach(button=>button.onclick=()=>button.classList.toggle('active'));
[['gameName','gameNameCount'],['gameDescription','gameDescriptionCount']].forEach(([field,count])=>document.getElementById(field).oninput=e=>document.getElementById(count).textContent=e.target.value.length);
document.getElementById('gameSubmissionForm').onsubmit=e=>{e.preventDefault();toast('Основная информация заполнена')};
async function logout(){await (await firebase()).logout();currentUser=null;closeProfile();renderAccount();toast('Вы вышли из аккаунта')}
async function toggleFavorite(slug,active){
  if(!currentUser){toast('Сначала войди в аккаунт');return false}
  try{currentUser.favorites=await (await firebase()).favorite(slug,active);return true}catch{toast('Не удалось сохранить');return false}
}

const search=document.getElementById('search');
search.addEventListener('input',()=>{const q=search.value.toLowerCase().trim();document.querySelectorAll('#gameRow .game-card').forEach(card=>card.style.display=card.dataset.name.toLowerCase().includes(q)?'block':'none')});
document.querySelectorAll('#chips .chip').forEach(chip=>chip.onclick=()=>{document.querySelectorAll('#chips .chip').forEach(x=>x.classList.remove('active'));chip.classList.add('active');const f=chip.dataset.filter;document.querySelectorAll('#gameRow .game-card').forEach(card=>card.style.display=f==='all'||card.dataset.tags.includes(f)?'block':'none')});
setInterval(()=>{heartbeat();updateLiveCounts()},15000); updateLiveCounts(); loadMe();
