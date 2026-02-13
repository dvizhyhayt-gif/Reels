/**
 * Firebase Service
 * Управление всеми операциями с Firebase (Auth, Firestore, Storage)
 */
class FirebaseService {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.storage = firebase.storage();
        this.currentUser = null;
        this.setupAuthListener();
    }

    // ===================== AUTHENTICATION =====================

    setupAuthListener() {
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('✅ Пользователь залогинен:', user.uid);
                this.currentUser = await this.getUserProfile(user.uid);
                if (window.app) {
                    window.app.updateProfileUI();
                }
            } else {
                console.log('❌ Пользователь вышел');
                this.currentUser = null;
            }
        });
    }

    async register(email, password, userName) {
        try {
            // Проверяем уникальность имени профиля
            const existing = await this.getUserByName(userName);
    if (existing) {
        throw new Error('Имя профиля уже занято');
    }
    const { user } = await this.auth.createUserWithEmailAndPassword(email, password);
    const userProfile = {
        uid: user.uid,
        email,
        name: userName,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=0D8ABC&color=fff&size=150`,
                avatar_local: null,
                bio: '',
                location: '',
                website: '',
                interests: '',
                gender: 'other',
                verified: false,
                subscriptions: [],
                subscribers: [],
                createdAt: new Date(),
                updatedAt: new Date()
            };
            await this.db.collection('users').doc(user.uid).set(userProfile);
            console.log('✅ Регистрация успешна:', user.uid);
            return { success: true, user: userProfile, uid: user.uid };
        } catch (error) {
            console.error('❌ Ошибка регистрации:', error.message);
            if (error.message === 'Имя профиля уже занято') {
                throw error;
            }
            throw new Error(this.getFirebaseErrorMessage(error.code));
        }
    }

    async login(email, password) {
        try {
            const { user } = await this.auth.signInWithEmailAndPassword(email, password);
            const userProfile = await this.getUserProfile(user.uid);
            console.log('✅ Логин успешен:', user.uid);
            return { success: true, user: userProfile, uid: user.uid };
        } catch (error) {
            console.error('❌ Ошибка логина:', error.message);
            throw new Error(this.getFirebaseErrorMessage(error.code));
        }
    }

    async logout() {
        try {
            await this.auth.signOut();
            this.currentUser = null;
            console.log('✅ Вы вышли из аккаунта');
            return true;
        } catch (error) {
            console.error('❌ Ошибка выхода:', error.message);
            throw error;
        }
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getCurrentUid() {
        return this.auth.currentUser?.uid || null;
    }

    // ===================== USER PROFILE =====================

    async getUserProfile(uid) {
        try {
            const doc = await this.db.collection('users').doc(uid).get();
            if (doc.exists) {
                return { ...doc.data(), uid };
            }
            return null;
        } catch (error) {
            console.error('❌ Ошибка получения профиля:', error);
            return null;
        }
    }

    async updateUserProfile(uid, updates) {
        try {
            await this.db.collection('users').doc(uid).update({
                ...updates,
                updatedAt: new Date()
            });
            this.currentUser = await this.getUserProfile(uid);
            console.log('✅ Профиль обновлен');
            return true;
        } catch (error) {
            console.error('❌ Ошибка обновления профиля:', error);
            throw error;
        }
    }

    async getUserByName(userName) {
        try {
            const querySnapshot = await this.db.collection('users')
                .where('name', '==', userName)
                .limit(1)
                .get();
            
            if (querySnapshot.empty) return null;
            return { ...querySnapshot.docs[0].data(), uid: querySnapshot.docs[0].id };
        } catch (error) {
            console.error('❌ Ошибка поиска пользователя:', error);
            return null;
        }
    }

    async getAllUsers() {
        try {
            const snapshot = await this.db.collection('users').get();
            return snapshot.docs.map(doc => ({ ...doc.data(), uid: doc.id }));
        } catch (error) {
            console.error('❌ Ошибка получения пользователей:', error);
            return [];
        }
    }

    // ===================== VIDEOS =====================

    async uploadVideo(file, metadata) {
        const uid = this.getCurrentUid();
        if (!uid) throw new Error('Необходимо авторизироваться');

        try {
            // Создаем уникальное имя файла
            const fileName = `videos/${uid}/${Date.now()}_${file.name}`;
            
            // Загружаем видео в Storage
            const uploadTask = this.storage.ref(fileName).put(file);
            
            // Ждем загрузки
            const snapshot = await uploadTask;
            
            // Получаем URL видео
            const videoUrl = await snapshot.ref.getDownloadURL();
            
            // Получаем данные пользователя
            const userProfile = await this.getUserProfile(uid);

            // Создаем документ видео в Firestore
            const videoDoc = {
                id: Date.now(),
                uid: uid,
                author: userProfile.name,
                avatar: userProfile.avatar,
                url: videoUrl,
                storagePath: fileName,
                desc: metadata.desc || '',
                tags: metadata.tags || '',
                hashtags: metadata.tags ? metadata.tags.split(' ').filter(t => t.startsWith('#')) : [],
                filter: metadata.filter || 'none',
                likes: 0,
                likedBy: [], // UIDs людей, которые лайкнули
                comments: [],
                views: 0,
                shares: 0,
                allowComments: metadata.allowComments !== false,
                private: metadata.private === true,
                isLiked: false,
                timestamp: new Date(),
                updatedAt: new Date()
            };

            // Сохраняем видео в Firestore
            const videoRef = await this.db.collection('videos').add(videoDoc);
            
            console.log('✅ Видео загруженно:', videoRef.id);
            return { ...videoDoc, firestoreId: videoRef.id };
        } catch (error) {
            console.error('❌ Ошибка загрузки видео:', error);
            throw error;
        }
    }

    async getFeed(limit = 10) {
        const uid = this.getCurrentUid();
        
        try {
            let query = this.db.collection('videos')
                .where('private', '==', false)
                .orderBy('timestamp', 'desc')
                .limit(limit);

            const snapshot = await query.get();
            const videos = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    ...data,
                    firestoreId: doc.id,
                    isLiked: uid ? data.likedBy?.includes(uid) : false
                };
            });

            console.log('✅ Лента загружена:', videos.length, 'видео');
            return videos;
        } catch (error) {
            console.error('❌ Ошибка загрузки ленты:', error);
            return [];
        }
    }

    async getVideosByAuthor(authorName) {
        try {
            const snapshot = await this.db.collection('videos')
                .where('author', '==', authorName)
                .orderBy('timestamp', 'desc')
                .get();

            return snapshot.docs.map(doc => ({
                ...doc.data(),
                firestoreId: doc.id
            }));
        } catch (error) {
            console.error('❌ Ошибка получения видео автора:', error);
            return [];
        }
    }

    async deleteVideo(firestoreId, storagePath) {
        const uid = this.getCurrentUid();
        
        try {
            // Удаляем видео из Storage
            await this.storage.ref(storagePath).delete();
            
            // Удаляем документ из Firestore
            await this.db.collection('videos').doc(firestoreId).delete();
            
            console.log('✅ Видео удалено');
            return true;
        } catch (error) {
            console.error('❌ Ошибка удаления видео:', error);
            throw error;
        }
    }

    async incrementViews(firestoreId) {
        try {
            await this.db.collection('videos').doc(firestoreId).update({
                views: firebase.firestore.FieldValue.increment(1)
            });
        } catch (error) {
            console.error('❌ Ошибка увеличения просмотров:', error);
        }
    }

    // ===================== LIKES =====================

    async toggleLike(firestoreId) {
        const uid = this.getCurrentUid();
        if (!uid) throw new Error('Необходимо авторизироваться');

        try {
            const videoRef = this.db.collection('videos').doc(firestoreId);
            const videoDoc = await videoRef.get();
            const video = videoDoc.data();

            const likedBy = video.likedBy || [];
            const isLiked = likedBy.includes(uid);

            if (isLiked) {
                // Удаляем лайк
                await videoRef.update({
                    likedBy: firebase.firestore.FieldValue.arrayRemove(uid),
                    likes: firebase.firestore.FieldValue.increment(-1)
                });
                console.log('💔 Лайк удален');
                return false;
            } else {
                // Добавляем лайк
                await videoRef.update({
                    likedBy: firebase.firestore.FieldValue.arrayUnion(uid),
                    likes: firebase.firestore.FieldValue.increment(1)
                });
                console.log('❤️ Лайк добавлен');
                return true;
            }
        } catch (error) {
            console.error('❌ Ошибка при лайке:', error);
            throw error;
        }
    }

    async getLikesCount(firestoreId) {
        try {
            const doc = await this.db.collection('videos').doc(firestoreId).get();
            return doc.data()?.likes || 0;
        } catch (error) {
            console.error('❌ Ошибка получения количества лайков:', error);
            return 0;
        }
    }

    // ===================== COMMENTS =====================

    async addComment(firestoreId, text) {
        const uid = this.getCurrentUid();
        if (!uid) throw new Error('Необходимо авторизироваться');

        try {
            const userProfile = await this.getUserProfile(uid);
            const comment = {
                uid: uid,
                user: userProfile.name,
                avatar: userProfile.avatar,
                text,
                likes: 0,
                time: new Date(),
                likedBy: []
            };

            await this.db.collection('videos').doc(firestoreId).update({
                comments: firebase.firestore.FieldValue.arrayUnion(comment)
            });

            console.log('✅ Комментарий добавлен');
            return comment;
        } catch (error) {
            console.error('❌ Ошибка добавления комментария:', error);
            throw error;
        }
    }

    async deleteComment(firestoreId, commentText) {
        try {
            const videoRef = this.db.collection('videos').doc(firestoreId);
            const videoDoc = await videoRef.get();
            const video = videoDoc.data();

            const updatedComments = video.comments.filter(c => c.text !== commentText);

            await videoRef.update({
                comments: updatedComments
            });

            console.log('✅ Комментарий удален');
            return true;
        } catch (error) {
            console.error('❌ Ошибка удаления комментария:', error);
            throw error;
        }
    }

    async getComments(firestoreId) {
        try {
            const doc = await this.db.collection('videos').doc(firestoreId).get();
            return doc.data()?.comments || [];
        } catch (error) {
            console.error('❌ Ошибка получения комментариев:', error);
            return [];
        }
    }

    // ===================== SUBSCRIPTIONS =====================

    async subscribe(targetUid) {
        const currentUid = this.getCurrentUid();
        if (!currentUid) throw new Error('Необходимо авторизироваться');
        if (currentUid === targetUid) throw new Error('Нельзя подписаться на себя');

        try {
            const currentUserRef = this.db.collection('users').doc(currentUid);
            const targetUserRef = this.db.collection('users').doc(targetUid);

            // Добавляем в подписки текущего пользователя
            await currentUserRef.update({
                subscriptions: firebase.firestore.FieldValue.arrayUnion(targetUid)
            });

            // Добавляем в подписчиков целевого пользователя
            await targetUserRef.update({
                subscribers: firebase.firestore.FieldValue.arrayUnion(currentUid)
            });

            console.log('✅ Подписка добавлена');
            return true;
        } catch (error) {
            console.error('❌ Ошибка подписки:', error);
            throw error;
        }
    }

    async unsubscribe(targetUid) {
        const currentUid = this.getCurrentUid();
        if (!currentUid) throw new Error('Необходимо авторизироваться');

        try {
            const currentUserRef = this.db.collection('users').doc(currentUid);
            const targetUserRef = this.db.collection('users').doc(targetUid);

            // Удаляем из подписок текущего пользователя
            await currentUserRef.update({
                subscriptions: firebase.firestore.FieldValue.arrayRemove(targetUid)
            });

            // Удаляем из подписчиков целевого пользователя
            await targetUserRef.update({
                subscribers: firebase.firestore.FieldValue.arrayRemove(currentUid)
            });

            console.log('✅ Подписка удалена');
            return true;
        } catch (error) {
            console.error('❌ Ошибка отписки:', error);
            throw error;
        }
    }

    async isSubscribed(targetUid) {
        const currentUid = this.getCurrentUid();
        if (!currentUid) return false;

        try {
            const doc = await this.db.collection('users').doc(currentUid).get();
            const subscriptions = doc.data()?.subscriptions || [];
            return subscriptions.includes(targetUid);
        } catch (error) {
            console.error('❌ Ошибка проверки подписки:', error);
            return false;
        }
    }

    // ===================== NOTIFICATIONS =====================

    async addNotification(targetUid, type, data) {
        try {
            const notification = {
                id: Date.now(),
                type,
                data,
                timestamp: new Date(),
                read: false
            };

            await this.db.collection('users').doc(targetUid).update({
                notifications: firebase.firestore.FieldValue.arrayUnion(notification)
            });

            return notification;
        } catch (error) {
            console.error('❌ Ошибка добавления уведомления:', error);
            throw error;
        }
    }

    // ===================== HELPERS =====================

    getFirebaseErrorMessage(code) {
        const errors = {
            'auth/email-already-in-use': 'Этот Email уже используется',
            'auth/invalid-email': 'Неверный Email адрес',
            'auth/weak-password': 'Пароль слишком слабый (минимум 6 символов)',
            'auth/user-not-found': 'Пользователь не найден',
            'auth/wrong-password': 'Неверный пароль',
            'auth/too-many-requests': 'Слишком много попыток входа. Попробуйте позже',
            'auth/network-request-failed': 'Ошибка сети. Проверьте интернет'
        };

        return errors[code] || 'Произошла ошибка: ' + code;
    }

    // Проверка доступности Firebase
    isInitialized() {
        return !!firebase?.app?.();
    }
}

// Инициализируем Firebase Service когда будет ready
let firebaseService = null;
let firebaseReady = false;

async function initializeFirebaseService() {
    return new Promise((resolve) => {
        console.log('🔥 [DEBUG] Начало инициализации FirebaseService...');
        
        // Проверяем, что Firebase SDK загружен
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase SDK не найден (firebase undefined)');
            resolve(false);
            return;
        }
        console.log('✅ [DEBUG] Firebase SDK загружен');
        
        // Проверяем, что приложение Firebase инициализировано (это должно быть в firebase-config.js)
        try {
            const app = firebase.app();
            console.log('✅ [DEBUG] Firebase App инициализировано:', app.name);
            
            if (!app) {
                console.error('❌ Firebase App вернул null');
                resolve(false);
                return;
            }
        } catch (error) {
            console.error('❌ Firebase App ошибка:', error.message);
            console.error('❌ Убедись, что firebase-config.js содержит firebase.initializeApp()');
            resolve(false);
            return;
        }
        
        // Если все проверки пройдены - создаем FirebaseService
        try {
            console.log('🔥 [DEBUG] Создаю новый FirebaseService...');
            firebaseService = new FirebaseService();
            firebaseReady = true;
            console.log('✅ Firebase Service инициализирован успешно!');
            resolve(true);
        } catch (error) {
            console.error('❌ Ошибка создания Firebase Service:', error.message);
            console.error('❌ Stack:', error.stack);
            resolve(false);
        }
    });
}

// Функция для ожидания готовности Firebase
async function waitForFirebaseService(timeout = 5000) {
    const startTime = Date.now();
    console.log('⏳ Ожидаю инициализацию Firebase (timeout: ' + timeout + 'ms)...');
    
    while (Date.now() - startTime < timeout) {
        if (firebaseService && firebaseReady) {
            console.log('✅ Firebase Service готов!');
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.error('❌ Firebase не инициализирован (' + Math.round((Date.now() - startTime) / 1000) + ' сек)');
    return false;
}

// Начинаем инициализацию после небольшой задержки (даем время на загрузку всех скриптов)
console.log('🔥 firebase-service.js загружен, инициализация запланирована');
setTimeout(() => {
    console.log('🔥 [DEBUG] Проверяю firebase через 200ms...');
    if (typeof firebase !== 'undefined') {
        console.log('🔥 Начинаю инициализацию Firebase Service...');
        initializeFirebaseService();
    } else {
        console.error('❌ Firebase SDK все еще не найден!');
        // Пробуем еще раз через 500ms
        setTimeout(() => {
            if (typeof firebase !== 'undefined') {
                console.log('🔥 Firebase SDK появился, повторная попытка инициализации...');
                initializeFirebaseService();
            } else {
                console.error('❌ Firebase SDK так и не загрузился!');
            }
        }, 500);
    }
}, 200);

