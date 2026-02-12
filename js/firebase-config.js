/**
 * Firebase Configuration
 * ВАЖНО: Замени эти значения на свои из Firebase Console!
 * Инструкции в FIREBASE_SETUP.md
 */

const firebaseConfig = {
  apiKey: "AIzaSyCIn6UKRIPdaKFuCBZUUW0GYR4fG4eQ9gQ",
  authDomain: "kazreels.firebaseapp.com",
  projectId: "kazreels",
  storageBucket: "kazreels.firebasestorage.app",
  messagingSenderId: "849520714213",
  appId: "1:849520714213:web:54975013c201e75a110f0c"
};
// Инициализация Firebase (не трогай это)
firebase.initializeApp(firebaseConfig);

// Получаем сервисы
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Настройки Firestore
db.settings({ 
    experimentalForceLongPolling: true // Для лучшей совместимости
});

console.log('🔥 Firebase инициализирован');
