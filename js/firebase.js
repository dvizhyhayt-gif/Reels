import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {createUserWithEmailAndPassword,deleteUser,getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {addDoc,arrayRemove,arrayUnion,collection,doc,getDoc,getDocs,getFirestore,query,runTransaction,serverTimestamp,setDoc,updateDoc,where} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';
import {createClient} from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const app=initializeApp({
  apiKey:'AIzaSyD_-yLKP8BVysojwzrl9Xlg0959Z4bONRU',
  authDomain:'ayuversegames.firebaseapp.com',
  projectId:'ayuversegames',
  storageBucket:'ayuversegames.firebasestorage.app',
  messagingSenderId:'553643426228',
  appId:'1:553643426228:web:b12bb1ff2845bd281eb2e1'
});
const auth=getAuth(app),db=getFirestore(app);
const OWNER_UID='KfR8Z39adYPI5z0L2wOV4Hc5tqO2';
const storage=createClient('https://kxijwexpydfqvhennnok.supabase.co','sb_publishable_NyG5-4mVxVTyOrcQqzoQJw_pIsLDaZS');
const ready=new Promise(resolve=>{let stop;stop=onAuthStateChanged(auth,user=>{stop();resolve(user)})});
const profile=async uid=>{const snap=await getDoc(doc(db,'users',uid));return snap.exists()?snap.data():null};

async function register({email,password,username,role}){
  const credential=await createUserWithEmailAndPassword(auth,email,password),key=username.toLowerCase();
  try{
    await runTransaction(db,async transaction=>{
      const nameRef=doc(db,'usernames',key),userRef=doc(db,'users',credential.user.uid);
      if((await transaction.get(nameRef)).exists())throw new Error('Логин уже занят');
      transaction.set(nameRef,{uid:credential.user.uid});
      transaction.set(userRef,{uid:credential.user.uid,username,usernameLower:key,email,role,avatar:'',favorites:[],history:[],createdAt:serverTimestamp()});
    });
    return profile(credential.user.uid);
  }catch(error){await deleteUser(credential.user);throw error}
}
async function login(email,password){const user=(await signInWithEmailAndPassword(auth,email,password)).user;return profile(user.uid)}
async function me(){const user=await ready;return user?profile(user.uid):null}
async function saveAvatar(avatar){await updateDoc(doc(db,'users',auth.currentUser.uid),{avatar});return profile(auth.currentUser.uid)}
async function favorite(game,active){const ref=doc(db,'users',auth.currentUser.uid);await updateDoc(ref,{favorites:active?arrayUnion(game):arrayRemove(game)});return (await profile(auth.currentUser.uid)).favorites}
async function play(game){if(auth.currentUser)await updateDoc(doc(db,'users',auth.currentUser.uid),{history:arrayUnion(game)})}

async function gameApi(body){
  const response=await fetch('/.netlify/functions/game-api',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+await auth.currentUser.getIdToken()},body:JSON.stringify(body)});
  const data=await response.json();if(!response.ok)throw new Error(data.error||'Ошибка сервера');return data;
}
async function uploadArchive(file){
  const signed=await gameApi({action:'sign',name:file.name,size:file.size});
  const {error}=await storage.storage.from('game-submissions').uploadToSignedUrl(signed.path,signed.token,file,{contentType:'application/zip'});
  if(error)throw error;return signed.path;
}
async function submitGame(data){
  if(!auth.currentUser)throw new Error('Войдите в аккаунт');
  return (await addDoc(collection(db,'gameSubmissions'),{...data,developerId:auth.currentUser.uid,developerEmail:auth.currentUser.email,status:'pending',createdAt:serverTimestamp()})).id;
}
async function getSubmissions(){
  if(!auth.currentUser)return [];
  const source=auth.currentUser.uid===OWNER_UID?collection(db,'gameSubmissions'):query(collection(db,'gameSubmissions'),where('developerId','==',auth.currentUser.uid));
  return (await getDocs(source)).docs.map(item=>({id:item.id,...item.data()})).sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
}
async function downloadArchive(path){return (await gameApi({action:'download',path})).url}
async function rejectGame(id,reason){await updateDoc(doc(db,'gameSubmissions',id),{status:'rejected',reason,reviewedAt:serverTimestamp()})}
async function approveGame(game){
  const deployed=await gameApi({action:'publish',path:game.archivePath,slug:game.slug});
  await setDoc(doc(db,'publishedGames',game.id),{name:game.name,developer:game.developer,description:game.description,category:game.category,platforms:game.platforms,url:deployed.url,status:'published',createdAt:serverTimestamp()});
  await updateDoc(doc(db,'gameSubmissions',game.id),{status:'approved',publicUrl:deployed.url,reviewedAt:serverTimestamp()});return deployed.url;
}
async function getPublishedGames(){return (await getDocs(collection(db,'publishedGames'))).docs.map(item=>({id:item.id,...item.data()}))}

window.firebaseApi={register,login,me,saveAvatar,favorite,play,uploadArchive,submitGame,getSubmissions,downloadArchive,rejectGame,approveGame,getPublishedGames,isOwner:()=>auth.currentUser?.uid===OWNER_UID,logout:()=>signOut(auth)};
window.dispatchEvent(new Event('firebase-ready'));
