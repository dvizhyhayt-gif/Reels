# 🔥 Firebase Setup Guide

## Как подключить Firebase к проекту

### Шаг 1: Создай Firebase проект
1. Перейди на [firebase.google.com](https://firebase.google.com)
2. Нажми "Add Project"
3. Назови его "TikClone" (или как хочешь)
4. Включи Google Analytics (опционально)
5. Создай проект

### Шаг 2: Добавь веб-приложение
1. В Console перейди на "Project Settings"
2. Вкладка "Your apps"
3. Нажми на иконку веб приложения `</>`
4. Регистрируешь приложение с любым именем
5. Скопируй конфигурацию (это твои credentials)

### Шаг 3: Скопируй credentials
Твоя конфиг будет выглядеть так:
```javascript
{
  apiKey: "AIza...",
  authDomain: "tikclone-xxxxx.firebaseapp.com",
  projectId: "tikclone-xxxxx",
  storageBucket: "tikclone-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123..."
}
```

### Шаг 4: Включи сервисы в Firebase
В левой панели Console:
- **Authentication** → включи "Email/Password"
- **Firestore Database** → создай в режиме "Start in test mode"
- **Storage** → нужен для видео (или подключи Cloudflare, см. `docs/CLOUDFLARE_MEDIA_SETUP.md`)

### Шаг 5: Обнови firebase-config.js
Скопируй свою конфигурацию в файл `js/firebase-config.js`

Готово! 🚀
