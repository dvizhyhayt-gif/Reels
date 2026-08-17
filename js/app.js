const games={};

let authMode='register',currentGame=null,currentUser=null,selectedAvatar='bear',liveCounts={site:0,games:{}},currentTop=null,editingGame=null,developerGames=[];
const avatars={bear:'🐻',panda:'🐼',wolf:'🐺',fox:'🦊'};
const overlay=document.getElementById('overlay');
const gameOverlay=document.getElementById('gameOverlay');
const playOverlay=document.getElementById('playOverlay');
const profileOverlay=document.getElementById('profileOverlay');
const avatarOverlay=document.getElementById('avatarOverlay');
const submitGameOverlay=document.getElementById('submitGameOverlay');
const moderationOverlay=document.getElementById('moderationOverlay');
const myGamesOverlay=document.getElementById('myGamesOverlay');
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

async function firebase(){if(!window.firebaseApi)await new Promise(resolve=>addEventListener('firebase-ready',resolve,{once:true}));return window.firebaseApi}
async function heartbeat(game=currentGame){try{await (await firebase()).heartbeat(game||'')}catch{}}
async function updateLiveCounts(){
  try{liveCounts=await (await firebase()).online();document.getElementById('siteOnline').textContent=liveCounts.site;document.querySelectorAll('[data-online-game]').forEach(el=>el.textContent=liveCounts.games[el.dataset.onlineGame]||0);selectTopGame()}catch{}
}
function selectTopGame(){
  const ids=Object.keys(games);if(!ids.length)return;let top=currentTop&&games[currentTop]?currentTop:ids[0];ids.forEach(id=>{if((liveCounts.games[id]||0)>(liveCounts.games[top]||0))top=id});if(top!==currentTop){currentTop=top;renderFeatured(top)}else{const n=document.getElementById('featuredOnline');if(n)n.textContent=liveCounts.games[top]||0}
}
function renderFeatured(slug){
  const game=games[slug],box=document.getElementById('featuredGame');box.classList.remove('empty');box.innerHTML=`<div class="featured-art"><img src="${escapeHtml(game.banner)}" alt=""></div><div class="featured-content"><span class="featured-badge"><i class="fa-solid fa-crown"></i> ТОП ИГРА</span><h1>${escapeHtml(game.name)}</h1><p>${escapeHtml(game.description)}</p><div class="hero-meta"><span><i class="fa-solid fa-users"></i> <b id="featuredOnline">${liveCounts.games[slug]||0}</b> игроков</span><span><i class="fa-solid fa-play"></i> ${game.plays||0} запусков</span></div><div class="hero-actions"><button class="btn btn-primary" onclick="openGameProfile('${slug}')"><i class="fa-solid fa-circle-play"></i> Играть сейчас</button></div></div>`
}

async function openGameProfile(slug){
  const game=games[slug]; if(!game)return;
  const online=liveCounts.games[slug]||0;
  document.getElementById('gameProfile').innerHTML=`
    <div class="game-profile-cover">
      <img src="${escapeHtml(game.banner)}" alt="${escapeHtml(game.name)}">
      <button class="profile-back" onclick="closeGameProfile()"><i class="fa-solid fa-arrow-left"></i></button>
    </div>
    <div class="game-profile-body">
      <h2 class="profile-title">${game.name}</h2>
      <div class="profile-dev">${game.developer}</div>
      <div class="profile-tags"><span>${game.category}</span><span>Онлайн</span><span>${game.devices.join(' + ')}</span></div>
      <div class="profile-rating"><b>${game.plays||0} запусков</b><span>${online} играют сейчас</span></div>
      <button class="btn btn-primary profile-play" onclick="startGame('${slug}')"><i class="fa-solid fa-play"></i> Играть</button>
      <div class="game-about"><h3>Описание</h3><p>${game.description}</p></div>
      <div class="game-about"><h3>Скриншоты</h3><div class="game-screens">${game.screenshots.map(x=>`<img src="${escapeHtml(x)}" alt="">`).join('')}</div></div>
    </div>`;
  gameOverlay.classList.add('open'); lock(true);
}
function closeGameProfile(){gameOverlay.classList.remove('open'); if(!playOverlay.classList.contains('open'))lock(false)}

async function startGame(slug){
  const game=games[slug]; if(!game)return;
  currentGame=slug;
  await (await firebase()).play(slug,game.id);game.plays=(game.plays||0)+1;
  await heartbeat(slug);
  gameOverlay.classList.remove('open');
  playOverlay.classList.add('open'); lock(true);
  document.getElementById('gameWindow').innerHTML=`<div class="play-head"><strong>${escapeHtml(game.name)}</strong><button class="btn btn-dark game-close" onclick="closeGame()">Выйти</button></div><iframe class="external-game" src="${game.url}" sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-popups" allowfullscreen></iframe>`;
}
function closeGame(){
  currentGame=null;heartbeat(null);
  playOverlay.classList.remove('open'); lock(false); updateLiveCounts();
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
document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAuth();closeGameProfile();closeGame();closeProfile();closeGameSubmission();closeModeration();closeMyGames()}});
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
    closeAuth();renderAccount();heartbeat();updateLiveCounts();
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
  const owner=(await firebase()).isOwner();
  const gamesById=Object.entries(games);
  const favs=gamesById.filter(([id])=>currentUser.favorites.includes(id));
  const history=gamesById.filter(([id])=>currentUser.history.includes(id));
  const developer=currentUser.role==='developer', avatar=avatars[currentUser.avatar]||escapeHtml(currentUser.username.slice(0,1).toUpperCase());
  const recentCards=history.map(([id,g])=>`<button class="dashboard-game" onclick="closeProfile();openGameProfile('${id}')"><img src="${g.image}" alt=""><strong>${g.name}</strong><span>${g.plays||0} запусков</span></button>`).join('');
  const favoriteCards=favs.map(([id,g])=>`<button class="favorite-game" onclick="closeProfile();openGameProfile('${id}')"><img src="${g.image}" alt=""><span><strong>${g.name}</strong><small>${g.category}</small></span></button>`).join('');
  document.getElementById('profileModal').innerHTML=`
    <div class="profile-dashboard">
      <aside class="profile-sidebar">
        <div class="profile-user"><div class="profile-avatar-large">${avatar}</div><div><h2>${escapeHtml(currentUser.username)}</h2><p>${escapeHtml(currentUser.email)}</p><span class="role-badge">${developer?'Разработчик':'Игрок'}</span></div></div>
        <div class="profile-side-stats"><div><b>${history.length}</b><span>Сыграно</span></div><div><b>${favs.length}</b><span>Избранное</span></div></div>
        <nav class="profile-menu"><button class="active"><i class="fa-solid fa-house"></i> Обзор</button>${developer?'<button onclick="openMyGames()"><i class="fa-solid fa-table-list"></i> Мои игры</button><button onclick="openGameSubmission()"><i class="fa-solid fa-cloud-arrow-up"></i> Добавить игру</button>':''}${owner?'<button onclick="openModeration()"><i class="fa-solid fa-shield-halved"></i> Модерация</button>':''}<button onclick="document.getElementById('profileFavorites').scrollIntoView({behavior:'smooth'})"><i class="fa-regular fa-heart"></i> Избранное</button></nav>
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
function openGameSubmission(game=null){
  if(currentUser?.role!=='developer')return;editingGame=game;profileOverlay.classList.remove('open');myGamesOverlay.classList.remove('open');submitGameOverlay.classList.add('open');lock(true);
  const form=document.getElementById('gameSubmissionForm');form.reset();document.querySelector('.submission-head h2').textContent=game?'Обновить игру':'Отправить игру на модерацию';
  ['gameArchive','gameCover','gameBanner','gameScreens'].forEach(id=>document.getElementById(id).required=!game);
  if(game){['name','category','description','developer','website','version','language','tags'].forEach(name=>{if(form.elements[name])form.elements[name].value=game[name]||''});document.querySelectorAll('.platform-option').forEach(x=>x.classList.toggle('active',game.platforms?.includes(x.dataset.platform)))}
  else{document.getElementById('gameDeveloper').value=currentUser.username;document.querySelectorAll('.platform-option').forEach((x,i)=>x.classList.toggle('active',i===0))}
  document.getElementById('gameNameCount').textContent=form.elements.name.value.length;document.getElementById('gameDescriptionCount').textContent=form.elements.description.value.length;
}
function closeGameSubmission(){submitGameOverlay.classList.remove('open');editingGame=null;if(!overlay.classList.contains('open'))lock(false)}
submitGameOverlay.onclick=e=>{if(e.target===submitGameOverlay)closeGameSubmission()};
document.querySelectorAll('.platform-option').forEach(button=>button.onclick=()=>button.classList.toggle('active'));
[['gameName','gameNameCount'],['gameDescription','gameDescriptionCount']].forEach(([field,count])=>document.getElementById(field).oninput=e=>document.getElementById(count).textContent=e.target.value.length);
const imageSize=file=>new Promise((resolve,reject)=>{const image=new Image(),url=URL.createObjectURL(file);image.onload=()=>{URL.revokeObjectURL(url);resolve([image.width,image.height])};image.onerror=reject;image.src=url});
async function validImage(file,width,height,label){if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>5*1024*1024)throw new Error(`${label}: JPG, PNG или WebP до 5 МБ`);const size=await imageSize(file);if(size[0]!==width||size[1]!==height)throw new Error(`${label}: нужен размер ${width}×${height}`)}
document.getElementById('gameSubmissionForm').onsubmit=async e=>{
  e.preventDefault();const form=e.currentTarget,archive=document.getElementById('gameArchive').files[0],cover=document.getElementById('gameCover').files[0],banner=document.getElementById('gameBanner').files[0],screens=[...document.getElementById('gameScreens').files],button=document.getElementById('gameSubmitButton'),edit=editingGame;
  if((!edit&&!archive)||(archive&&(!/\.zip$/i.test(archive.name)||archive.size>50*1024*1024))){toast('Выберите ZIP до 50 МБ');return}if((!edit||screens.length)&&(screens.length<3||screens.length>5)){toast('Нужно выбрать от 3 до 5 скриншотов');return}
  button.disabled=true;button.textContent='Загрузка архива...';
  try{
    const api=await firebase(),values=Object.fromEntries(new FormData(form)),name=values.name.trim();
    if(cover)await validImage(cover,1280,720,'Обложка');if(banner)await validImage(banner,1600,720,'Баннер');for(const image of screens)await validImage(image,1280,720,'Скриншот');
    button.textContent='Загрузка файлов...';const data={...values,name,slug:edit?.slug||name.toLowerCase().replace(/[^a-z0-9а-яё]+/gi,'-').replace(/^-|-$/g,'').slice(0,45)||'game-'+Date.now(),archivePath:archive?await api.uploadArchive(archive):edit.archivePath,coverUrl:cover?await api.uploadMedia(cover):edit.coverUrl,bannerUrl:banner?await api.uploadMedia(banner):edit.bannerUrl,screenshotUrls:screens.length?await Promise.all(screens.map(api.uploadMedia)):edit.screenshotUrls,platforms:[...document.querySelectorAll('.platform-option.active')].map(x=>x.dataset.platform)};
    if(edit)await api.updateGame(edit.id,data);else await api.submitGame(data);form.reset();closeGameSubmission();toast(edit?'Обновление отправлено на модерацию':'Игра отправлена на модерацию');if(edit)openMyGames();
  }catch(error){toast(error.message||'Не удалось отправить игру')}finally{button.disabled=false;button.innerHTML='Отправить на модерацию <i class="fa-solid fa-arrow-right"></i>'}
};

let moderationGames=[];
const statusName=status=>({pending:'На модерации',approved:'Одобрена',published:'Опубликована',rejected:'Отклонена'}[status]||status);
function statusLine(game){const current={pending:0,approved:1,published:2,rejected:0}[game.status],steps=['Отправлена','Одобрена','Опубликована'];return `<div class="status-line">${steps.map((x,i)=>`<span class="${i<current?'done':i===current?'current':''}">${x}</span>`).join('')}</div>`}
function mediaGallery(game){return `<div class="moderation-media">${[game.bannerUrl,game.coverUrl,...(game.screenshotUrls||[])].filter(Boolean).map(url=>`<a href="${escapeHtml(url)}" target="_blank"><img src="${escapeHtml(url)}" alt=""></a>`).join('')}</div>`}
function submissionCard(game,owner=false){return `<article class="moderation-card"><div class="moderation-main"><span class="moderation-status ${game.status}">${statusName(game.status)}</span><h3>${escapeHtml(game.name)}</h3><p>${escapeHtml(game.developer)} · ${escapeHtml(game.category)} · ${escapeHtml(game.version)}</p><small>${escapeHtml(game.description)}${game.reason?`<br>Причина: ${escapeHtml(game.reason)}`:''}</small>${statusLine(game)}${mediaGallery(game)}</div><div class="moderation-actions">${owner?`<button class="btn btn-dark" onclick="openSubmittedArchive('${game.id}')">Скачать ZIP</button>`:''}${owner&&game.status==='pending'?`<button class="btn btn-dark reject" onclick="rejectSubmission('${game.id}')">Отклонить</button><button class="btn btn-primary" onclick="approveSubmission('${game.id}')">Одобрить</button>`:''}${!owner?`<button class="btn btn-primary" onclick="editMyGame('${game.id}')">Изменить</button>`:''}${game.publicUrl?`<a class="btn btn-dark" target="_blank" href="${game.publicUrl}">Открыть</a>`:''}</div></article>`}
async function openModeration(){
  const api=await firebase();if(!api.isOwner())return;
  closeProfile();moderationOverlay.classList.add('open');lock(true);const list=document.getElementById('moderationList');list.innerHTML='<div class="profile-empty">Загрузка заявок...</div>';
  try{moderationGames=await api.getSubmissions();list.innerHTML=moderationGames.map(game=>submissionCard(game,true)).join('')||'<div class="profile-empty">Заявок пока нет</div>'}catch(error){list.innerHTML=`<div class="profile-empty">${escapeHtml(error.message)}</div>`}
}
function closeModeration(){moderationOverlay.classList.remove('open');if(!document.querySelector('.overlay.open'))lock(false)}
moderationOverlay.onclick=e=>{if(e.target===moderationOverlay)closeModeration()};
async function openMyGames(){closeProfile();myGamesOverlay.classList.add('open');lock(true);const list=document.getElementById('myGamesList');list.innerHTML='<div class="profile-empty">Загрузка игр...</div>';try{developerGames=await (await firebase()).getMyGames();list.innerHTML=developerGames.map(game=>submissionCard(game)).join('')||'<div class="profile-empty">Вы ещё не отправляли игры</div>'}catch(error){list.innerHTML=`<div class="profile-empty">${escapeHtml(error.message)}</div>`}}
function closeMyGames(){myGamesOverlay.classList.remove('open');if(!document.querySelector('.overlay.open'))lock(false)}
myGamesOverlay.onclick=e=>{if(e.target===myGamesOverlay)closeMyGames()};
function editMyGame(id){const game=developerGames.find(x=>x.id===id);if(game)openGameSubmission(game)}
async function openSubmittedArchive(id){try{window.open(await (await firebase()).downloadArchive(moderationGames.find(x=>x.id===id).archivePath),'_blank')}catch(error){toast(error.message)}}
async function rejectSubmission(id){const reason=prompt('Причина отклонения:')||'Не соответствует требованиям';try{await (await firebase()).rejectGame(id,reason);toast('Заявка отклонена');openModeration()}catch(error){toast(error.message)}}
async function approveSubmission(id){try{toast('Публикация игры...');await (await firebase()).approveGame(moderationGames.find(x=>x.id===id));toast('Игра опубликована');openModeration();loadPublishedGames()}catch(error){toast(error.message)}}
async function logout(){await (await firebase()).logout();currentUser=null;closeProfile();renderAccount();toast('Вы вышли из аккаунта')}
async function toggleFavorite(slug,active){
  if(!currentUser){toast('Сначала войди в аккаунт');return false}
  try{currentUser.favorites=await (await firebase()).favorite(slug,active);return true}catch{toast('Не удалось сохранить');return false}
}

async function loadPublishedGames(){
  try{const items=await (await firebase()).getPublishedGames(),row=document.getElementById('gameRow');Object.keys(games).forEach(id=>delete games[id]);row.innerHTML='';
    items.forEach(item=>{const slug='published-'+item.id,tags=`all ${item.platforms?.includes('ПК')?'pc':''} ${item.platforms?.includes('Мобильные')?'mobile':''}`;games[slug]={id:item.id,name:item.name,image:item.coverUrl,banner:item.bannerUrl,screenshots:item.screenshotUrls||[],developer:item.developer,category:item.category,plays:item.plays||0,description:item.description,devices:item.platforms||['ПК'],url:item.url};row.insertAdjacentHTML('beforeend',`<article class="game-card" data-published="${item.id}" data-name="${escapeHtml(item.name)}" data-tags="${tags}" onclick="openGameProfile('${slug}')"><div class="game-thumb"><img src="${escapeHtml(item.coverUrl)}" alt=""><button class="heart" onclick="fav(event,this)"><i class="fa-regular fa-heart"></i></button></div><div class="game-info"><div class="game-name">${escapeHtml(item.name)}</div><div class="game-dev">${escapeHtml(item.developer)}</div><div class="game-bottom"><span><b data-online-game="${slug}">0</b> сейчас</span><span>${item.plays||0} запусков</span></div></div></article>`)});
    document.getElementById('catalogCount').textContent=items.length;if(!items.length){row.innerHTML='<div class="catalog-empty">Опубликованных игр пока нет</div>';currentTop=null;document.getElementById('featuredGame').className='featured empty';document.getElementById('featuredGame').innerHTML='<div class="featured-empty"><i class="fa-solid fa-gamepad"></i><h1>AYUVERSE</h1><p>Первая опубликованная игра появится здесь</p></div>'}renderAccount();selectTopGame();
  }catch(error){console.error(error)}
}

const search=document.getElementById('search');
search.addEventListener('input',()=>{const q=search.value.toLowerCase().trim();document.querySelectorAll('#gameRow .game-card').forEach(card=>card.style.display=card.dataset.name.toLowerCase().includes(q)?'block':'none')});
document.querySelectorAll('#chips .chip').forEach(chip=>chip.onclick=()=>{document.querySelectorAll('#chips .chip').forEach(x=>x.classList.remove('active'));chip.classList.add('active');const f=chip.dataset.filter;document.querySelectorAll('#gameRow .game-card').forEach(card=>card.style.display=f==='all'||card.dataset.tags.includes(f)?'block':'none')});
setInterval(()=>{heartbeat();updateLiveCounts()},15000);setInterval(loadPublishedGames,60000);(async()=>{await loadMe();await loadPublishedGames();await heartbeat();await updateLiveCounts()})();
