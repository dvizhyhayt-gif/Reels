// Firebase Service - auth + Firestore storage

(() => {
  const USERS_COLLECTION = "users";
  const ORDERS_COLLECTION = "orders";
  const COUNTERS_COLLECTION = "meta";
  const COUNTERS_DOC_ID = "counters";
  const DEFAULT_CITY = "Алматы";
  const DEFAULT_CODE = "1234";
  const START_ACCOUNT_ID = 100000;

  function initFirebase() {
    if (!window.firebase || !window.APP_FIREBASE_CONFIG) {
      console.error("Firebase SDK или конфиг не загружены");
      return;
    }

    try {
      const app = firebase.apps && firebase.apps.length
        ? firebase.app()
        : firebase.initializeApp(window.APP_FIREBASE_CONFIG);
      const db = app.firestore ? app.firestore() : firebase.firestore();

      function nowIso() {
        return new Date().toISOString();
      }

      function normalizePhone(phone) {
        return String(phone || "").replace(/\D/g, "");
      }

      async function hashPassword(password) {
        const source = String(password || "");
        if (!window.crypto?.subtle || !window.TextEncoder) {
          return source;
        }

        const bytes = new TextEncoder().encode(source);
        const digest = await window.crypto.subtle.digest("SHA-256", bytes);
        return Array.from(new Uint8Array(digest))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");
      }

      function toAccountShape(userData = {}) {
        return {
          id: String(userData.id || ""),
          phone: userData.phone || "",
          phoneNormalized: userData.phoneNormalized || normalizePhone(userData.phone || ""),
          role: userData.role || "executor",
          name: userData.name || "Новый пользователь",
          city: userData.city || DEFAULT_CITY,
          about: userData.about || "",
          avatar: userData.avatar || "",
          verificationStatus: userData.verificationStatus || "none",
          balance: Number(userData.balance ?? 1250),
          debt: Number(userData.debt ?? 0),
          firstGraceUsed: Boolean(userData.firstGraceUsed),
          jobsDone: Number(userData.jobsDone ?? 0),
          rating: Number(userData.rating ?? 0),
          responseTime: userData.responseTime || "",
          delivery_type: userData.role === "executor" ? (userData.delivery_type || "foot") : null,
          demoReady: Boolean(userData.demoReady),
          isOnline: Boolean(userData.isOnline),
          isBlocked: Boolean(userData.isBlocked),
          usedPromoCodes: Array.isArray(userData.usedPromoCodes) ? userData.usedPromoCodes : [],
          promoHistory: Array.isArray(userData.promoHistory) ? userData.promoHistory : [],
          walletHistory: Array.isArray(userData.walletHistory) ? userData.walletHistory : [],
          createdAt: userData.createdAt || nowIso(),
          updatedAt: userData.updatedAt || nowIso()
        };
      }

      function toOrderShape(orderData = {}) {
        const city = orderData.city || DEFAULT_CITY;
        const fromAddress = orderData.fromAddress || orderData.pickupAddress || `Центр ${city}`;
        const explicitToAddress = orderData.toAddress || orderData.dropoffAddress || "";
        const legacyAddress = orderData.address || "";
        const toAddress = explicitToAddress || (legacyAddress && legacyAddress !== fromAddress ? legacyAddress : "");
        return {
          id: String(orderData.id || "").trim(),
          title: orderData.title || "",
          fromAddress,
          toAddress,
          address: legacyAddress || toAddress || fromAddress,
          city,
          when: orderData.when || "",
          budget: Number(orderData.budget ?? 0),
          taskKind: orderData.taskKind || "",
          senderPhone: orderData.senderPhone || orderData.sender_phone || "",
          recipientPhone: orderData.recipientPhone || orderData.recipient_phone || "",
          payment: orderData.payment || "Kaspi",
          category: orderData.category || "",
          urgent: Boolean(orderData.urgent || orderData.express),
          express: Boolean(orderData.express || orderData.urgent),
          photo: orderData.photo || "",
          status: orderData.status || "open",
          description: orderData.description || "",
          requirements: orderData.requirements || "",
          ownerId: String(orderData.ownerId || ""),
          ownerName: orderData.ownerName || "",
          ownerVerified: Boolean(orderData.ownerVerified),
          assigneeId: String(orderData.assigneeId || ""),
          assigneeName: orderData.assigneeName || "",
          assigneePhone: orderData.assigneePhone || orderData.assignee_phone || "",
          finalPrice: Number(orderData.finalPrice ?? orderData.budget ?? 0),
          stage: orderData.stage || (orderData.status === "done" ? "delivered" : orderData.status === "assigned" ? "accepted" : "new"),
          bids: Array.isArray(orderData.bids) ? orderData.bids : [],
          chat: Array.isArray(orderData.chat) ? orderData.chat : [],
          complaints: Array.isArray(orderData.complaints) ? orderData.complaints : [],
          reviewedBy: Array.isArray(orderData.reviewedBy) ? orderData.reviewedBy : [],
          completedAt: orderData.completedAt || "",
          commissionSettled: Boolean(orderData.commissionSettled),
          createdAt: orderData.createdAt || nowIso(),
          updatedAt: orderData.updatedAt || nowIso()
        };
      }

      function sortOrders(orders) {
        return orders.slice().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
      }

      async function findUserByPhone(phone) {
        const phoneNormalized = normalizePhone(phone);
        if (!phoneNormalized) {
          return null;
        }

        let snapshot = await db
          .collection(USERS_COLLECTION)
          .where("phoneNormalized", "==", phoneNormalized)
          .limit(1)
          .get();

        if (snapshot.empty) {
          snapshot = await db
            .collection(USERS_COLLECTION)
            .where("phone", "==", String(phone || "").trim())
            .limit(1)
            .get();
        }

        if (snapshot.empty) {
          return null;
        }

        const userDoc = snapshot.docs[0];
        return { id: userDoc.id, data: userDoc.data() };
      }

      async function getNextAccountId() {
        const counterRef = db.collection(COUNTERS_COLLECTION).doc(COUNTERS_DOC_ID);

        return db.runTransaction(async (transaction) => {
          const snapshot = await transaction.get(counterRef);
          const lastAccountId = Number(snapshot.data()?.lastAccountId ?? START_ACCOUNT_ID - 1);
          const nextAccountId = String(lastAccountId + 1);

          transaction.set(counterRef, { lastAccountId: Number(nextAccountId) }, { merge: true });
          return nextAccountId;
        });
      }

      async function getOrderDoc(orderId) {
        const snapshot = await db.collection(ORDERS_COLLECTION).doc(orderId).get();
        if (!snapshot.exists) {
          return null;
        }
        return toOrderShape({ id: snapshot.id, ...snapshot.data() });
      }

      window.FirebaseService = {
        async registerUser(phone, password, name, role, city, code, delivery_type = null) {
          const cleanPhone = String(phone || "").trim();
          const phoneNormalized = normalizePhone(cleanPhone);
          const cleanPassword = String(password || "");

          if (String(code || "").trim() !== DEFAULT_CODE) {
            throw new Error("Неверный код. Пока используйте 1234.");
          }
          if (!phoneNormalized) {
            throw new Error("Введите телефон");
          }
          if (cleanPassword.length < 4) {
            throw new Error("Пароль должен быть минимум 4 символа");
          }

          const existingUser = await findUserByPhone(cleanPhone);
          if (existingUser) {
            throw new Error("Аккаунт с таким телефоном уже существует");
          }

          const accountId = await getNextAccountId();
          const passwordHash = await hashPassword(cleanPassword);
          const now = nowIso();
          const account = toAccountShape({
            id: accountId,
            phone: cleanPhone,
            phoneNormalized,
            role,
            name: name || (role === "support" ? "Сотрудник поддержки" : role === "customer" ? "Новый заказчик" : "Новый исполнитель"),
            city: city || DEFAULT_CITY,
            about: "",
            avatar: "",
            verificationStatus: "none",
            balance: 1250,
            debt: 0,
            firstGraceUsed: false,
            jobsDone: 0,
            rating: 0,
            responseTime: "",
            delivery_type: role === "executor" ? (delivery_type || "foot") : null,
            demoReady: false,
            isOnline: false,
            isBlocked: false,
            usedPromoCodes: [],
            promoHistory: [],
            walletHistory: [],
            createdAt: now,
            updatedAt: now
          });

          await db.collection(USERS_COLLECTION).doc(accountId).set({
            ...account,
            passwordHash
          });

          return { success: true, uid: accountId, account };
        },

        async loginUser(phone, password) {
          const cleanPassword = String(password || "");
          if (cleanPassword.length < 4) {
            throw new Error("Введите пароль минимум из 4 символов");
          }

          const userRecord = await findUserByPhone(phone);
          if (!userRecord) {
            throw new Error("Пользователь не найден");
          }

          const passwordHash = await hashPassword(cleanPassword);
          const userData = userRecord.data || {};
          const matchesHash = Boolean(userData.passwordHash) && userData.passwordHash === passwordHash;
          const matchesLegacyPassword = Boolean(userData.password) && userData.password === cleanPassword;

          if (!matchesHash && !matchesLegacyPassword) {
            throw new Error("Неверный пароль");
          }

          const normalizedAccount = toAccountShape({
            ...userData,
            id: userRecord.id
          });

          if (matchesLegacyPassword || !userData.phoneNormalized) {
            await db.collection(USERS_COLLECTION).doc(userRecord.id).set({
              passwordHash,
              phoneNormalized: normalizedAccount.phoneNormalized,
              password: firebase.firestore.FieldValue.delete(),
              updatedAt: nowIso()
            }, { merge: true });
          }

          return { success: true, uid: userRecord.id, account: normalizedAccount };
        },

        async logoutUser() {
          return { success: true };
        },

        async getCurrentUser() {
          return null;
        },

        async saveOrder(orderData) {
          const orderId = String(orderData?.id || "").trim();
          if (!orderId) {
            throw new Error("Order ID is required");
          }

          const order = toOrderShape({
            ...orderData,
            id: orderId
          });

          await db.collection(ORDERS_COLLECTION).doc(orderId).set({
            ...order,
            updatedAt: nowIso(),
            createdAt: order.createdAt || nowIso()
          }, { merge: true });

          return { success: true, orderId, order };
        },

        async getOrdersByCity(city) {
          const snapshot = await db
            .collection(ORDERS_COLLECTION)
            .where("city", "==", city)
            .limit(100)
            .get();

          return sortOrders(snapshot.docs.map((doc) => toOrderShape({ id: doc.id, ...doc.data() })));
        },

        subscribeOrdersByCity(city, onNext, onError) {
          try {
            return db
              .collection(ORDERS_COLLECTION)
              .where("city", "==", city)
              .limit(100)
              .onSnapshot((snapshot) => {
                const orders = sortOrders(snapshot.docs.map((doc) => toOrderShape({ id: doc.id, ...doc.data() })));
                if (typeof onNext === "function") {
                  onNext(orders);
                }
              }, (error) => {
                console.error("Ошибка realtime подписки заказов:", error);
                if (typeof onError === "function") {
                  onError(error);
                }
              });
          } catch (error) {
            console.error("Ошибка запуска realtime подписки:", error);
            if (typeof onError === "function") {
              onError(error);
            }
            return () => {};
          }
        },

        async getUserOrders(userId) {
          const snapshot = await db
            .collection(ORDERS_COLLECTION)
            .where("ownerId", "==", userId)
            .limit(100)
            .get();

          return sortOrders(snapshot.docs.map((doc) => toOrderShape({ id: doc.id, ...doc.data() })));
        },

        async updateOrder(orderId, updates) {
          await db.collection(ORDERS_COLLECTION).doc(orderId).set({
            ...updates,
            updatedAt: nowIso()
          }, { merge: true });
          return { success: true };
        },

        async deleteOrder(orderId) {
          await db.collection(ORDERS_COLLECTION).doc(orderId).delete();
          return { success: true };
        },

        async getOrder(orderId) {
          return getOrderDoc(orderId);
        },

        async takeOrder(orderId, executorData) {
          const orderRef = db.collection(ORDERS_COLLECTION).doc(orderId);

          const order = await db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(orderRef);
            if (!snapshot.exists) {
              throw new Error("Заказ не найден");
            }

            const currentOrder = toOrderShape({ id: snapshot.id, ...snapshot.data() });
            if (currentOrder.status !== "open") {
              throw new Error("Этот заказ уже недоступен");
            }

            const now = nowIso();
            const nextOrder = {
              ...currentOrder,
              status: "assigned",
              stage: "accepted",
              assigneeId: String(executorData?.id || ""),
              assigneeName: executorData?.name || "",
              assigneePhone: executorData?.phone || "",
              finalPrice: Number(currentOrder.finalPrice || currentOrder.budget || 0),
              updatedAt: now,
              chat: [
                ...currentOrder.chat,
                {
                  id: `MSG-${Date.now()}`,
                  senderId: "system",
                  senderName: "TRAINTUP",
                  role: "system",
                  text: `${executorData?.name || "Исполнитель"} взял заказ в работу.`,
                  createdAt: now
                }
              ]
            };

            transaction.set(orderRef, nextOrder, { merge: true });
            return nextOrder;
          });

          return { success: true, order };
        },

        async submitBid(orderId, bidData) {
          const orderRef = db.collection(ORDERS_COLLECTION).doc(orderId);

          const order = await db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(orderRef);
            if (!snapshot.exists) {
              throw new Error("Заказ не найден");
            }

            const currentOrder = toOrderShape({ id: snapshot.id, ...snapshot.data() });
            if (currentOrder.status !== "open") {
              throw new Error("Откликнуться можно только на открытый заказ");
            }

            const now = nowIso();
            const nextBid = {
              id: String(bidData?.id || `BID-${Date.now()}`),
              userId: String(bidData?.userId || ""),
              userName: bidData?.userName || "",
              userPhone: bidData?.userPhone || "",
              price: Number(bidData?.price || 0),
              note: bidData?.note || "",
              createdAt: bidData?.createdAt || now
            };
            const bidText = nextBid.note ? `Предлагаю ${nextBid.price} ₸. ${nextBid.note}` : `Предлагаю ${nextBid.price} ₸.`;

            const nextOrder = {
              ...currentOrder,
              bids: [...currentOrder.bids, nextBid],
              chat: [
                ...currentOrder.chat,
                {
                  id: `MSG-${Date.now()}`,
                  senderId: nextBid.userId,
                  senderName: nextBid.userName,
                  role: "executor",
                  text: bidText,
                  createdAt: now
                }
              ],
              updatedAt: now
            };

            transaction.set(orderRef, nextOrder, { merge: true });
            return nextOrder;
          });

          return { success: true, order };
        },

        async acceptBid(orderId, bidId) {
          const orderRef = db.collection(ORDERS_COLLECTION).doc(orderId);

          const order = await db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(orderRef);
            if (!snapshot.exists) {
              throw new Error("Заказ не найден");
            }

            const currentOrder = toOrderShape({ id: snapshot.id, ...snapshot.data() });
            const bid = currentOrder.bids.find((item) => item.id === bidId);
            if (!bid) {
              throw new Error("Отклик не найден");
            }

            const now = nowIso();
            const nextOrder = {
              ...currentOrder,
              status: "assigned",
              stage: "accepted",
              assigneeId: String(bid.userId || ""),
              assigneeName: bid.userName || "",
              assigneePhone: bid.userPhone || "",
              finalPrice: Number(bid.price || currentOrder.budget || 0),
              updatedAt: now,
              chat: [
                ...currentOrder.chat,
                {
                  id: `MSG-${Date.now()}`,
                  senderId: "system",
                  senderName: "TRAINTUP",
                  role: "system",
                  text: `Заказчик принял предложение ${bid.userName} на ${bid.price} ₸.`,
                  createdAt: now
                }
              ]
            };

            transaction.set(orderRef, nextOrder, { merge: true });
            return nextOrder;
          });

          return { success: true, order };
        },

        async completeOrder(orderId) {
          const orderRef = db.collection(ORDERS_COLLECTION).doc(orderId);

          const order = await db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(orderRef);
            if (!snapshot.exists) {
              throw new Error("Заказ не найден");
            }

            const currentOrder = toOrderShape({ id: snapshot.id, ...snapshot.data() });
            if (currentOrder.status === "done") {
              return currentOrder;
            }

            const now = nowIso();
            const nextOrder = {
              ...currentOrder,
              status: "done",
              stage: "delivered",
              completedAt: now,
              updatedAt: now,
              chat: [
                ...currentOrder.chat,
                {
                  id: `MSG-${Date.now()}`,
                  senderId: "system",
                  senderName: "TRAINTUP",
                  role: "system",
                  text: "Заказ отмечен как выполненный.",
                  createdAt: now
                }
              ]
            };

            transaction.set(orderRef, nextOrder, { merge: true });
            return nextOrder;
          });

          return { success: true, order };
        },

        async appendOrderMessage(orderId, message) {
          const orderRef = db.collection(ORDERS_COLLECTION).doc(orderId);

          const order = await db.runTransaction(async (transaction) => {
            const snapshot = await transaction.get(orderRef);
            if (!snapshot.exists) {
              throw new Error("Заказ не найден");
            }

            const currentOrder = toOrderShape({ id: snapshot.id, ...snapshot.data() });
            const now = nowIso();
            const nextMessage = {
              id: String(message?.id || `MSG-${Date.now()}`),
              senderId: String(message?.senderId || ""),
              senderName: message?.senderName || "",
              role: message?.role || "system",
              text: message?.text || "",
              createdAt: message?.createdAt || now
            };

            const nextOrder = {
              ...currentOrder,
              chat: [...currentOrder.chat, nextMessage],
              updatedAt: now
            };

            transaction.set(orderRef, nextOrder, { merge: true });
            return nextOrder;
          });

          return { success: true, order };
        },

        async addBid(orderId, bidData) {
          return this.submitBid(orderId, bidData);
        },

        async getBids(orderId) {
          const order = await getOrderDoc(orderId);
          return order?.bids || [];
        },

        async addChatMessage(orderId, message) {
          return this.appendOrderMessage(orderId, message);
        },

        async getOrderChat(orderId) {
          const order = await getOrderDoc(orderId);
          return order?.chat || [];
        },

        async saveNotification(userId, notification) {
          const notifId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          await db.collection("notifications").doc(notifId).set({
            ...notification,
            userId,
            id: notifId,
            read: false,
            createdAt: nowIso()
          });
          return { success: true };
        },

        subscribeUserNotifications(userId, onNext, onError) {
          try {
            return db.collection("notifications")
              .where("userId", "==", userId)
              .limit(100)
              .onSnapshot((snapshot) => {
                const notifications = snapshot.docs
                  .map((doc) => ({ id: doc.id, ...doc.data() }))
                  .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));

                if (typeof onNext === "function") {
                  onNext(notifications);
                }
              }, (error) => {
                console.error("Ошибка realtime подписки уведомлений:", error);
                if (typeof onError === "function") {
                  onError(error);
                }
              });
          } catch (error) {
            console.error("Ошибка запуска realtime уведомлений:", error);
            if (typeof onError === "function") {
              onError(error);
            }
            return () => {};
          }
        },

        async getUserNotifications(userId) {
          const snapshot = await db.collection("notifications").where("userId", "==", userId).limit(50).get();
          return snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
        },

        async markNotificationRead(notifId) {
          await db.collection("notifications").doc(notifId).update({ read: true });
          return { success: true };
        },

        async getSupportUsers() {
          const snapshot = await db.collection(USERS_COLLECTION).where("role", "==", "support").limit(50).get();
          return snapshot.docs.map((doc) => toAccountShape({ id: doc.id, ...doc.data() }));
        },

        async saveSupportTicket(ticketData = {}) {
          const ticketId = String(ticketData.id || `SUP-${Date.now()}`);
          await db.collection("support_tickets").doc(ticketId).set({
            ...ticketData,
            id: ticketId,
            status: ticketData.status || "open",
            createdAt: ticketData.createdAt || nowIso(),
            updatedAt: nowIso()
          }, { merge: true });
          return { success: true, ticketId };
        },

        async getUser(userId) {
          const doc = await db.collection(USERS_COLLECTION).doc(userId).get();
          return doc.exists ? toAccountShape({ id: doc.id, ...doc.data() }) : null;
        },

        async updateUser(userId, updates) {
          await db.collection(USERS_COLLECTION).doc(userId).set({
            ...updates,
            updatedAt: nowIso()
          }, { merge: true });
          return { success: true };
        },

        async saveAccount(accountData) {
          const userId = String(accountData?.id || "").trim();
          if (!userId) {
            throw new Error("User ID is required");
          }

          const account = toAccountShape({
            ...accountData,
            id: userId
          });

          await db.collection(USERS_COLLECTION).doc(userId).set({
            ...account,
            updatedAt: nowIso()
          }, { merge: true });

          return { success: true, account };
        },

        async addUserRating(userId, rating) {
          const doc = await db.collection(USERS_COLLECTION).doc(userId).get();
          const userData = doc.data() || {};
          const jobsDone = Number(userData.jobsDone ?? 0);
          const currentRating = Number(userData.rating ?? 0);
          const nextRating = (currentRating * jobsDone + Number(rating || 0)) / (jobsDone + 1);

          await db.collection(USERS_COLLECTION).doc(userId).update({
            rating: nextRating,
            jobsDone: jobsDone + 1,
            updatedAt: nowIso()
          });
          return { success: true };
        },

        async addReview(reviewData) {
          const reviewId = Date.now().toString();
          await db.collection("reviews").doc(reviewId).set({
            ...reviewData,
            id: reviewId,
            createdAt: nowIso()
          });
          return { success: true, reviewId };
        },

        async getUserReviews(userId) {
          const snapshot = await db.collection("reviews").where("toUserId", "==", userId).limit(50).get();
          return snapshot.docs.map((doc) => doc.data());
        },

        async getAdminStories() {
          const snapshot = await db.collection("admin_stories").where("active", "==", true).limit(20).get();
          return snapshot.docs
            .map((doc) => ({ id: doc.id, ...doc.data() }))
            .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
        },

        async getAdminPromoCodes() {
          const snapshot = await db.collection("promo_codes").where("active", "==", true).limit(50).get();
          const promoCodes = {};
          snapshot.docs.forEach((doc) => {
            const data = doc.data() || {};
            promoCodes[String(data.code || doc.id).toUpperCase()] = {
              amount: Number(data.amount ?? 0),
              label: data.label || "Промобонус",
              active: data.active !== false,
              roles: Array.isArray(data.roles) ? data.roles : [],
              expiresAt: data.expiresAt || ""
            };
          });
          return promoCodes;
        },

        async logEvent(eventName, eventData = {}) {
          try {
            const eventId = Date.now().toString();
            await db.collection("events").doc(eventId).set({
              name: eventName,
              data: eventData,
              timestamp: nowIso()
            });
            return { success: true };
          } catch (error) {
            console.error("Ошибка логирования события:", error);
            return { success: false };
          }
        }
      };

      console.info("Firebase Service инициализирован");
    } catch (error) {
      console.error("Ошибка инициализации Firebase:", error);
    }
  }

  setTimeout(initFirebase, 100);
})();
