# TezTap MVP - Реальная Firebase интеграция (убрать фейки)

## 📋 Статус задачи
**Цель:** Заменить `seedOrders()`, `simulateBidForOrder()`, `DEMO_EXECUTORS` на реальные данные из Firebase Firestore

**Текущее состояние:**
- ✅ Firebase config работает (teztap-2df50)
- ❌ firebase-service.js = заглушки (demo mode) 
- ❌ Нет реального Firebase SDK
- ❌ app.js использует фейки: seedOrders(), simulateBidForOrder()

## ✅ Уже готово в коде:
```
✅ create-order форма сохраняет в Firebase (persist())
✅ takeOrder() вызывает FirebaseService.updateOrder()
✅ Логика комиссий/баланса работает
✅ UI полностью готов
```

## 🔧 План реализации (5 шагов):

### **Шаг 1: Установить Firebase SDK** 
```bash
# Добавить CDN в index.html
<script src="https://www.gstatic.com/firebasejs/10.13.1/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.13.1/firebase-analytics-compat.js"></script>
```

### **Шаг 2: Заменить firebase-service.js заглушки** 
```
- async saveOrder() → db.collection('orders').add()
- async getOrdersByCity(city) → db.collection('orders').where('city', '==', city)
- async updateOrder(id, data) → docRef.update()
```

### **Шаг 3: Удалить фейки из app.js**
```
❌ Удалить: seedOrders(), createDemoOrders(), simulateBidForOrder()
❌ DEMO_EXECUTORS = []
✅ Загружать реальные данные при login: getOrdersByCity()
```

### **Шаг 4: Firestore Security Rules** (Firebase Console)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Заказы читают все, пишут владельцы
    match /orders/{orderId} {
      allow read: if true;
      allow write: if request.auth != null && 
        resource.data.ownerId == request.auth.uid;
    }
    
    // Профили только свои
    match /accounts/{accountId} {
      allow read, write: if request.auth.uid == accountId;
    }
  }
}
```

### **Шаг 5: Тестирование**
```
1. Зарегистрироваться 
2. Создать заказ → появляется в Firestore
3. Другой аккаунт → видит заказ в ленте
4. Взять заказ → статус меняется реал-тайм
```

## ⏱️ Время: 2 часа

**Первый шаг: Согласны с планом? Начинаю с Firebase SDK + firebase-service.js**
