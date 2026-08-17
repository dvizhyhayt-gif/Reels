import {initializeApp} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js';
import {createUserWithEmailAndPassword,deleteUser,getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js';
import {arrayRemove,arrayUnion,doc,getDoc,getFirestore,runTransaction,serverTimestamp,updateDoc} from 'https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js';

const app=initializeApp({
  apiKey:'AIzaSyD_-yLKP8BVysojwzrl9Xlg0959Z4bONRU',
  authDomain:'ayuversegames.firebaseapp.com',
  projectId:'ayuversegames',
  storageBucket:'ayuversegames.firebasestorage.app',
  messagingSenderId:'553643426228',
  appId:'1:553643426228:web:b12bb1ff2845bd281eb2e1'
});
const auth=getAuth(app),db=getFirestore(app);
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

window.firebaseApi={register,login,me,saveAvatar,favorite,play,logout:()=>signOut(auth)};
window.dispatchEvent(new Event('firebase-ready'));
