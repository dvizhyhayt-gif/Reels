/**
 * Firebase Configuration
 * ВАЖНО: Замени эти значения на свои из Firebase Console!
 * Инструкции в FIREBASE_SETUP.md
 */

console.log('🔥 [1] firebase-config.js начал загружаться');

const firebaseConfig = {
  apiKey: "AIzaSyCIn6UKRIPdaKFuCBZUUW0GYR4fG4eQ9gQ",
  authDomain: "kazreels.firebaseapp.com",
  projectId: "kazreels",
  storageBucket: "kazreels.appspot.com",
  messagingSenderId: "849520714213",
  appId: "1:849520714213:web:54975013c201e75a110f0c"
};

// Cloudflare Media config (заполни под свой Worker/API endpoint)
// Пример uploadEndpoint: https://your-worker.your-subdomain.workers.dev/upload
// Пример deleteEndpoint: https://your-worker.your-subdomain.workers.dev/delete
window.CLOUDFLARE_MEDIA_CONFIG = {
  enabled: true,
  provider: "cloudflare",
  uploadEndpoint: "https://kazreels.dvizhyhayt.workers.dev/upload",
  deleteEndpoint: "https://kazreels.dvizhyhayt.workers.dev/delete",
  authToken: "",
  folderPrefix: "kazreels"
};

console.log('🔥 [2] Config объект создан:', firebaseConfig.projectId);

// Инициализация Firebase (не трогай это)
if (typeof firebase === 'undefined') {
  console.error('❌ [CRITICAL] Firebase SDK не найден! Убедись, что Firebase SDKs загружены ПЕРЕД firebase-config.js');
} else {
  console.log('✅ [3] Firebase SDK доступен');
  try {
    console.log('🔥 [4] Вызываю firebase.initializeApp()...');
    const app = firebase.initializeApp(firebaseConfig);
    console.log('✅ [5] firebase.initializeApp() успешен! App:', app.name);
  } catch (error) {
    if (error.code === 'app/duplicate-app') {
      console.log('ℹ️ [6] Firebase уже инициализирован (duplicate-app - это нормально)');
    } else {
      console.error('❌ [CRITICAL] Ошибка firebase.initializeApp():', error.code, error.message);
      console.error('   Stack:', error.stack);
    }
  }
}

// Получаем сервисы (если Firebase готов)
console.log('🔥 [7] Пытаюсь получить Firebase Services...');

if (typeof firebase !== 'undefined') {
  try {
    const app = firebase.app();
    console.log('✅ [8] firebase.app() работает, app.name:', app.name);
    
    const auth = firebase.auth();
    console.log('✅ [9] firebase.auth() работает');
    
    const db = firebase.firestore();
    console.log('✅ [10] firebase.firestore() работает');
    
    try {
      const storage = firebase.storage();
      console.log('✅ [11] firebase.storage() работает');
    } catch (storageError) {
      console.warn('⚠️ [11] firebase.storage() недоступен:', storageError.message);
      console.warn('ℹ️ Будет использован внешний media storage (например Cloudflare), если настроен.');
    }

    // Настройки Firestore
    db.settings({ 
        experimentalForceLongPolling: true // Для лучшей совместимости
    });

    console.log('✅ [12] Все Firebase Services готовы!');
  } catch (error) {
    console.error('❌ [CRITICAL] Ошибка при получении Firebase Services:', error.message);
    console.error('   Code:', error.code);
    console.error('   Stack:', error.stack);
  }
} else {
  console.error('❌ [CRITICAL] Firebase SDK все еще не доступен в firebase-config.js!');
}

console.log('✅ firebase-config.js завершил загрузку');


