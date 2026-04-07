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
          createdAt: userData.createdAt || new Date().toISOString(),
          updatedAt: userData.updatedAt || new Date().toISOString()
        };
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

      window.FirebaseService = {
        async registerUser(phone, password, name, role, city, code, delivery_type = null) {
          try {
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
            const now = new Date().toISOString();
            const account = toAccountShape({
              id: accountId,
              phone: cleanPhone,
              phoneNormalized,
              role,
              name: name || (role === "customer" ? "Новый заказчик" : "Новый исполнитель"),
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
              createdAt: now,
              updatedAt: now
            });

            await db.collection(USERS_COLLECTION).doc(accountId).set({
              ...account,
              passwordHash
            });

            return { success: true, uid: accountId, account };
          } catch (error) {
            console.error("Ошибка регистрации:", error);
            throw error;
          }
        },

        async loginUser(phone, password) {
          try {
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
                updatedAt: new Date().toISOString()
              }, { merge: true });
            }

            return { success: true, uid: userRecord.id, account: normalizedAccount };
          } catch (error) {
            console.error("Ошибка входа:", error);
            throw error;
          }
        },

        async logoutUser() {
          return { success: true };
        },

        async getCurrentUser() {
          return null;
        },

        async saveOrder(orderData) {
          try {
            const orderId = String(orderData?.id || "").trim();
            if (!orderId) {
              throw new Error("Order ID is required");
            }

            await db.collection(ORDERS_COLLECTION).doc(orderId).set({
              ...orderData,
              id: orderId,
              updatedAt: new Date().toISOString(),
              createdAt: orderData.createdAt || new Date().toISOString()
            }, { merge: true });

            return { success: true, orderId };
          } catch (error) {
            console.error("Ошибка сохранения заказа:", error);
            throw error;
          }
        },

        async getOrdersByCity(city) {
          try {
            const snapshot = await db
              .collection(ORDERS_COLLECTION)
              .where("city", "==", city)
              .limit(50)
              .get();

            return snapshot.docs
              .map((doc) => ({ id: doc.id, ...doc.data() }))
              .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          } catch (error) {
            console.error("Ошибка получения заказов:", error);
            return [];
          }
        },

        async getUserOrders(userId) {
          try {
            const snapshot = await db
              .collection(ORDERS_COLLECTION)
              .where("ownerId", "==", userId)
              .limit(100)
              .get();

            return snapshot.docs
              .map((doc) => ({ id: doc.id, ...doc.data() }))
              .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
          } catch (error) {
            console.error("Ошибка получения заказов пользователя:", error);
            return [];
          }
        },

        async updateOrder(orderId, updates) {
          try {
            await db.collection(ORDERS_COLLECTION).doc(orderId).set({
              ...updates,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            return { success: true };
          } catch (error) {
            console.error("Ошибка обновления заказа:", error);
            throw error;
          }
        },

        async deleteOrder(orderId) {
          try {
            await db.collection(ORDERS_COLLECTION).doc(orderId).delete();
            return { success: true };
          } catch (error) {
            console.error("Ошибка удаления заказа:", error);
            throw error;
          }
        },

        async getOrder(orderId) {
          try {
            const doc = await db.collection(ORDERS_COLLECTION).doc(orderId).get();
            return doc.exists ? { id: doc.id, ...doc.data() } : null;
          } catch (error) {
            console.error("Ошибка получения заказа:", error);
            return null;
          }
        },

        async addBid(orderId, bidData) {
          try {
            const bidId = Date.now().toString();
            await db.collection(ORDERS_COLLECTION).doc(orderId).collection("bids").doc(bidId).set({
              ...bidData,
              id: bidId,
              createdAt: new Date().toISOString()
            });
            return { success: true, bidId };
          } catch (error) {
            console.error("Ошибка добавления ставки:", error);
            throw error;
          }
        },

        async getBids(orderId) {
          try {
            const snapshot = await db.collection(ORDERS_COLLECTION).doc(orderId).collection("bids").get();
            return snapshot.docs.map((doc) => doc.data());
          } catch (error) {
            console.error("Ошибка получения ставок:", error);
            return [];
          }
        },

        async addChatMessage(orderId, message) {
          try {
            const msgId = Date.now().toString();
            await db.collection(ORDERS_COLLECTION).doc(orderId).collection("chat").doc(msgId).set({
              ...message,
              id: msgId,
              timestamp: new Date().toISOString()
            });
            return { success: true };
          } catch (error) {
            console.error("Ошибка отправки сообщения:", error);
            throw error;
          }
        },

        async getOrderChat(orderId) {
          try {
            const snapshot = await db.collection(ORDERS_COLLECTION).doc(orderId).collection("chat").limit(100).get();
            return snapshot.docs.map((doc) => doc.data());
          } catch (error) {
            console.error("Ошибка получения чата:", error);
            return [];
          }
        },

        async saveNotification(userId, notification) {
          try {
            const notifId = Date.now().toString();
            await db.collection("notifications").doc(notifId).set({
              ...notification,
              userId,
              id: notifId,
              read: false,
              createdAt: new Date().toISOString()
            });
            return { success: true };
          } catch (error) {
            console.error("Ошибка сохранения уведомления:", error);
            throw error;
          }
        },

        async getUserNotifications(userId) {
          try {
            const snapshot = await db.collection("notifications").where("userId", "==", userId).limit(50).get();
            return snapshot.docs.map((doc) => doc.data());
          } catch (error) {
            console.error("Ошибка получения уведомлений:", error);
            return [];
          }
        },

        async markNotificationRead(notifId) {
          try {
            await db.collection("notifications").doc(notifId).update({ read: true });
            return { success: true };
          } catch (error) {
            console.error("Ошибка отметки уведомления:", error);
            throw error;
          }
        },

        async getUser(userId) {
          try {
            const doc = await db.collection(USERS_COLLECTION).doc(userId).get();
            return doc.exists ? toAccountShape({ id: doc.id, ...doc.data() }) : null;
          } catch (error) {
            console.error("Ошибка получения пользователя:", error);
            return null;
          }
        },

        async updateUser(userId, updates) {
          try {
            await db.collection(USERS_COLLECTION).doc(userId).set({
              ...updates,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            return { success: true };
          } catch (error) {
            console.error("Ошибка обновления пользователя:", error);
            throw error;
          }
        },

        async saveAccount(accountData) {
          try {
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
              updatedAt: new Date().toISOString()
            }, { merge: true });

            return { success: true, account };
          } catch (error) {
            console.error("Ошибка сохранения аккаунта:", error);
            throw error;
          }
        },

        async addUserRating(userId, rating) {
          try {
            const doc = await db.collection(USERS_COLLECTION).doc(userId).get();
            const userData = doc.data() || {};
            const jobsDone = Number(userData.jobsDone ?? 0);
            const currentRating = Number(userData.rating ?? 0);
            const newRating = (currentRating * jobsDone + Number(rating || 0)) / (jobsDone + 1);

            await db.collection(USERS_COLLECTION).doc(userId).update({
              rating: newRating,
              jobsDone: jobsDone + 1,
              updatedAt: new Date().toISOString()
            });
            return { success: true };
          } catch (error) {
            console.error("Ошибка добавления рейтинга:", error);
            throw error;
          }
        },

        async addReview(reviewData) {
          try {
            const reviewId = Date.now().toString();
            await db.collection("reviews").doc(reviewId).set({
              ...reviewData,
              id: reviewId,
              createdAt: new Date().toISOString()
            });
            return { success: true, reviewId };
          } catch (error) {
            console.error("Ошибка добавления отзыва:", error);
            throw error;
          }
        },

        async getUserReviews(userId) {
          try {
            const snapshot = await db.collection("reviews").where("toUserId", "==", userId).limit(50).get();
            return snapshot.docs.map((doc) => doc.data());
          } catch (error) {
            console.error("Ошибка получения отзывов:", error);
            return [];
          }
        },

        async logEvent(eventName, eventData = {}) {
          try {
            const eventId = Date.now().toString();
            await db.collection("events").doc(eventId).set({
              name: eventName,
              data: eventData,
              timestamp: new Date().toISOString()
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
