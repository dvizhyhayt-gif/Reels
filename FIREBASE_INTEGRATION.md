# Firebase Integration Guide

## ✅ Completed: Firebase Backend Integration

TezTap теперь полностью интегрирована с Firebase для синхронизации данных и аналитики.

## 🔧 Что было добавлено:

### 1. **Firebase Configuration** (`js/firebase-config.js`)
- Конфигурация Firebase проекта (teztap-2df50)
- API ключи и endpoints
- Загружается первым в `index.html`

### 2. **Firebase Service Module** (`js/firebase-service.js`)
Модуль предоставляет API для работы с Firestore и Analytics:

#### Методы для сохранения данных:
- `saveAccount(account)` - Сохранение профиля пользователя
- `saveOrder(order)` - Создание новой задачи
- `updateOrder(orderId, updates)` - Обновление статуса задачи

#### Методы для получения данных:
- `getAccount(accountId)` - Получение профиля по ID
- `getOrdersByCity(city)` - Получение всех задач по городу
- `getUserOrders(userId)` - Получение задач конкретного пользователя
- `getUserNotifications(userId)` - Получение уведомлений

#### Методы для уведомлений:
- `saveNotification(userId, notification)` - Сохранение уведомления

#### Аналитика:
- `logEvent(eventName, eventData)` - Логирование событий в Firebase Analytics

### 3. **App.js Integration** (`js/app.js`)
Добавлены вызовы Firebase методов в следующих местах:

#### 🔐 Регистрация & Вход:
- **`createAccountFromPending()`** - Сохраняет новый аккаунт в Firebase при регистрации
- Логирует событие `account_created`

#### 📋 Работа с заказами:
- **`persist()` функция** - Теперь синхронизирует все заказы в Firebase после каждого изменения
- **`bootstrapAccountOrders()`** - Загружает заказы из Firebase при входе (с фолбеком на демо-данные)
- **Создание заказа** - Логирует событие `order_created`
- **Принятие заказа** - `takeOrder()` обновляет статус в Firebase, логирует `order_taken`
- **Завершение заказа** - `completeOrder()` обновляет статус, логирует `order_completed`
- **Текущее предложение** - `offer` форма логирует `bid_created`
- **Принятие предложения** - `acceptBid()` обновляет заказ, логирует `bid_accepted`

#### 👤 Профиль:
- **`edit-profile` форма** - Сохраняет обновленный профиль, логирует `profile_updated`
- Синхронизирует имя, город, "о себе"

#### 💰 Финансы:
- **Пополнение баланса** - `topup` форма логирует `wallet_topup`

## 🌍 Firestore Collections:

```
Firestore Database Structure:
├── accounts/
│   └── {accountId}
│       ├── name: string
│       ├── city: string
│       ├── phone: string
│       ├── role: "customer" | "executor"
│       ├── balance: number
│       ├── jobsDone: number
│       ├── rating: number
│       └── createdAt: timestamp
│
├── orders/
│   └── {orderId}
│       ├── title: string
│       ├── city: string
│       ├── status: "open" | "assigned" | "done"
│       ├── budget: number
│       ├── ownerId: string
│       ├── assigneeId: string
│       └── createdAt: timestamp
│
├── notifications/
│   └── {userId}
│       └── {notificationId}
│           ├── title: string
│           ├── message: string
│           └── createdAt: timestamp
```

## 📊 Analytics Events (logEvent):

Логируются в Firebase Analytics:
- `account_created` - Новая регистрация
- `order_created` - Новый заказ
- `order_taken` - Заказ принян исполнителем
- `order_completed` - Заказ завершен
- `bid_created` - Новое предложение
- `bid_accepted` - Предложение принято
- `profile_updated` - Профиль обновлен
- `wallet_topup` - Пополнение баланса

## 🔄 Как это работает:

### При входе пользователя:
1. Пользователь логинится
2. `bootstrapAccountOrders()` пытается загрузить заказы из Firebase по городу
3. Если есть заказы в Firebase - загружаются они
4. Если нет - показываются демо-заказы (для первого запуска)

### При каждом изменении:
1. Данные сохраняются локально (localStorage для офлайн работы)
2. `persist()` функция отправляет данные в Firebase
3. Если Firebase недоступен - приложение продолжает работать с локальными данными

### Ошибки:
- Если Firebase недоступна - все методы конвертируются в заглушки
- Консоль логирует все ошибки для дебага
- Пользователь не видит ошибок - приложение работает нормально

## 🚀 Следующие шаги:

### 1. Firestore Security Rules (важно для продакшена!)
Дополнительно нужно настроить правила доступа в консоли Firebase:
```firestore
// accounts - только владелец может читать/писать свои данные
match /accounts/{accountId} {
  allow read, write: if request.auth.uid == accountId;
}

// orders - читать все, писать только владельцу
match /orders/{document=**} {
  allow read: if true;  // Все видят все заказы
  allow write: if request.auth.uid == resource.data.ownerId;
}

// notifications - только владелец может читать
match /notifications/{userId}/{document=**} {
  allow read: if request.auth.uid == userId;
  allow write: if request.auth.uid == userId;
}
```

### 2. Real-time Sync (опционально)
Для реал-тайм обновлений ордеров, добавить слушатели:
```javascript
window.FirebaseService.listenToOrders(city, (orders) => {
  state.orders = orders;
  render();
});
```

### 3. Push Notifications (опционально)
Для push-уведомлений, подключить Firebase Cloud Messaging (FCM)

### 4. Authentication (опционально)
Заменить демо-аутентификацию на Firebase Auth:
- Phone authentication для Казахстана
- Серверная валидация кодов

## 📝 Примечания:

- ✅ Все существующие функции работают как раньше
- ✅ Firebase интеграция - неинвазивная, работает параллельно с localStorage
- ✅ Проверка `if (window.FirebaseService)` перед каждым вызовом - безопасно
- ✅ Никакие секреты не хранятся в git (firebase-config.js в .gitignore)
- ⚠️ Текущая аутентификация - все равно локальная (демо), нужно наполнить Firebase Auth

## 🔐 Безопасность:

ВАЖНО: Firebase config содержит API key который можно использовать только с разрешанными хостами:
- В Firebase Console → Project Settings → Restrictions
- Ограничить к prodomain домену когда готовы к deployement  

## 🏗️ Архитектура:

```
index.html (загружает скрипты в порядке)
  ↓
firebase-config.js (конфиг)
  ↓
firebase-service.js (сервис с методами)
  ↓
app.js (использует window.firebase и window.FirebaseService)
```

## 📞 Контакты для вопросов:

Если Firebase методы не работают:
1. Проверить консоль браузера (F12) на ошибки
2. Проверить Firebase Console - есть ли данные в Firestore
3. Проверить Firestore Rules - юзер имеет доступ?
4. В firebase-service.js установить `debug: true` для больше логов
