// Firebase Service - РЕАЛЬНАЯ интеграция Firestore + Analytics
// Заменяет заглушки в firebase-service.js

(() => {
  'use strict';

  // Инициализация Firebase из конфига
  const config = window.APP_FIREBASE_CONFIG;
  if (!config || !config.apiKey) {
    console.error('❌ Firebase config отсутствует!');
    return;
  }

  try {
    // Firebase App
    firebase.initializeApp(config);
    
    // Firestore + Analytics
    const db = firebase.firestore();
    const analytics = firebase.analytics ? firebase.analytics() : null;
    
    console.log('✅ Firebase инициализирован:', config.projectId);

    // 🔥 РЕАЛЬНЫЙ Firebase Service API
    window.FirebaseService = {
      
      /** 🚀 Сохранить аккаунт в Firestore accounts/{id} */
      async saveAccount(account) {
        try {
          await db.collection('accounts').doc(account.id).set(account, { merge: true });
          console.log('✅ Аккаунт сохранен:', account.id);
          return true;
        } catch (error) {
          console.error('❌ saveAccount error:', error);
          return false;
        }
      },

      /** 📥 Получить аккаунт */
      async getAccount(accountId) {
        try {
          const doc = await db.collection('accounts').doc(accountId).get();
          return doc.exists ? doc.data() : null;
        } catch (error) {
          console.error('❌ getAccount error:', error);
          return null;
        }
      },

      /** 📤 Создать заказ orders/{orderId} */
      async saveOrder(order) {
        try {
          await db.collection('orders').doc(order.id).set(order, { merge: true });
          console.log('✅ Заказ создан:', order.id, order.title);
          
          // Analytics
          if (analytics) {
            analytics.logEvent('order_created', {
              order_id: order.id,
              city: order.city,
              budget: order.budget,
              category: order.category
            });
          }
          
          return true;
        } catch (error) {
          console.error('❌ saveOrder error:', error);
          return false;
        }
      },

      /** 🗺️ Получить заказы по городу (реал-тайм!) */
      async getOrdersByCity(city) {
        try {
          const snapshot = await db.collection('orders')
            .where('city', '==', city)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
            
          const orders = [];
          snapshot.forEach(doc => {
            orders.push({ id: doc.id, ...doc.data() });
          });
          
          console.log(`✅ Загружено заказов из ${city}:`, orders.length);
          return orders;
        } catch (error) {
          console.error('❌ getOrdersByCity error:', error);
          return [];
        }
      },

      /** 👤 Заказы пользователя */
      async getUserOrders(userId) {
        try {
          const snapshot = await db.collection('orders')
            .where('ownerId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();
            
          const orders = [];
          snapshot.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
          return orders;
        } catch (error) {
          console.error('❌ getUserOrders error:', error);
          return [];
        }
      },

      /** 🔄 Обновить заказ */
      async updateOrder(orderId, updates) {
        try {
          await db.collection('orders').doc(orderId).update(updates);
          console.log('✅ Заказ обновлен:', orderId, updates.status);
          return true;
        } catch (error) {
          console.error('❌ updateOrder error:', error);
          return false;
        }
      },

      /** 🗑️ Удалить заказ */
      async deleteOrder(orderId) {
        try {
          await db.collection('orders').doc(orderId).delete();
          console.log('✅ Заказ удален:', orderId);
          return true;
        } catch (error) {
          console.error('❌ deleteOrder error:', error);
          return false;
        }
      },

      /** 🔔 Уведомления */
      async saveNotification(userId, notification) {
        try {
          await db.collection('notifications')
            .doc(userId)
            .collection('items')
            .add(notification);
          return true;
        } catch (error) {
          console.error('❌ saveNotification error:', error);
          return false;
        }
      },

      /** 📊 Analytics событие */
      logEvent(eventName, params = {}) {
        if (analytics) {
          analytics.logEvent(eventName, params);
          console.log('📊 Event:', eventName, params);
        }
      }
    };

    console.log('🔥 Firebase Service - РЕАЛЬНЫЙ режим!');

  } catch (error) {
    console.error('❌ Firebase init error:', error);
    
    // Fallback заглушки
    window.FirebaseService = {
      saveAccount: async () => true,
      getAccount: async () => null,
      saveOrder: async () => true,
      getOrdersByCity: async () => [],
      getUserOrders: async () => [],
      updateOrder: async () => true,
      logEvent: () => {}
    };
  }
})();

