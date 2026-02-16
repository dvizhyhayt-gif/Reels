/**
 * Firebase Service
 * Управление всеми операциями с Firebase (Auth, Firestore, Storage)
 */
class FirebaseService {
    constructor() {
        this.auth = firebase.auth();
        this.db = firebase.firestore();
        this.storage = null;
        try {
            this.storage = firebase.storage();
        } catch (error) {
            console.warn('⚠️ Firebase Storage недоступен:', error.message);
        }
        this.mediaStorage = (typeof mediaStorageService !== 'undefined' && mediaStorageService)
            ? mediaStorageService
            : null;
        this.currentUser = null;
        this.setupAuthListener();
    }

    // ===================== AUTHENTICATION =====================

    setupAuthListener() {
        this.auth.onAuthStateChanged(async (user) => {
            if (user) {
                console.log('✅ Пользователь залогинен:', user.uid);
                this.currentUser = await this.getUserProfile(user.uid);
                await this.updatePresence(true);
                await this.markIncomingAsDelivered();
                if (window.app) {
                    window.app.updateProfileUI();
                    if (typeof window.app.loadChats === 'function') {
                        window.app.loadChats();
                    }
                    if (typeof window.app.setupIncomingMessagesWatcher === 'function') {
                        window.app.setupIncomingMessagesWatcher();
                    }
                    if (typeof window.app.setupIncomingCallsWatcher === 'function') {
                        window.app.setupIncomingCallsWatcher();
                    }
                    if (typeof window.app.updateHamburgerVisibility === 'function') {
                        window.app.updateHamburgerVisibility();
                    }
                    if (typeof window.app.restoreModerationPreferences === 'function') {
                        window.app.restoreModerationPreferences();
                    }
                    if (typeof window.app.updateNotificationBadge === 'function') {
                        window.app.updateNotificationBadge();
                    }
                }
            } else {
                console.log('❌ Пользователь вышел');
                this.currentUser = null;
                if (window.app) {
                    if (typeof window.app.setupIncomingMessagesWatcher === 'function') {
                        window.app.setupIncomingMessagesWatcher();
                    }
                    if (typeof window.app.setupIncomingCallsWatcher === 'function') {
                        window.app.setupIncomingCallsWatcher();
                    }
                    if (typeof window.app.updateHamburgerVisibility === 'function') {
                        window.app.updateHamburgerVisibility();
                    }
                    if (typeof window.app.restoreModerationPreferences === 'function') {
                        window.app.restoreModerationPreferences();
                    }
                    if (typeof window.app.updateNotificationBadge === 'function') {
                        window.app.updateNotificationBadge();
                    }
                }
            }
        });

        document.addEventListener('visibilitychange', () => {
            const uid = this.getCurrentUid();
            if (!uid) return;
            if (document.visibilityState === 'visible') {
                this.updatePresence(true);
                this.markIncomingAsDelivered();
            } else {
                this.updatePresence(false);
            }
        });

        window.addEventListener('beforeunload', () => {
            const uid = this.getCurrentUid();
            if (!uid) return;
            this.updatePresence(false);
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
                onboardingCompleted: false,
                gender: 'other',
                verified: false,
                canVerify: false,
                subscriptions: [],
                subscribers: [],
                blockedUsers: [],
                hiddenAuthors: [],
                notifications: [],
                online: false,
                lastSeen: Date.now(),
                lastActive: Date.now(),
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
            if (!userProfile) {
                await this.auth.signOut();
                throw new Error('Профиль пользователя не найден. Зарегистрируйтесь снова.');
            }
            this.currentUser = userProfile;
            await this.updatePresence(true);
            console.log('Вход выполнен успешно:', user.uid);
            return { success: true, user: userProfile, uid: user.uid };
        } catch (error) {
            console.error('Ошибка входа:', error.message);
            if (error.message === 'Профиль пользователя не найден. Зарегистрируйтесь снова.') {
                throw error;
            }
            throw new Error(this.getFirebaseErrorMessage(error.code));
        }
    }

    async logout() {
        try {
            await this.updatePresence(false);
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

    buildUiAvatar(name = 'user') {
        return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'user')}&background=random&size=64`;
    }

    sanitizeAvatarForPublicPayload(avatarValue, fallbackName = 'user') {
        const raw = (typeof avatarValue === 'string') ? avatarValue.trim() : '';
        if (!raw) return this.buildUiAvatar(fallbackName);
        // Prevent oversized public payload fields (comments/videos) from base64 avatars.
        if (raw.startsWith('data:') || raw.length > 4096) {
            return this.buildUiAvatar(fallbackName);
        }
        return raw;
    }

    getMessagePreviewText(message = {}) {
        const msg = message || {};
        if (msg.type === 'file') return `📎 ${msg.file?.name || 'Файл'}`;
        if (msg.type === 'sticker') return '🪄 Стикер';
        if (msg.type === 'video-circle') return '🎥 Видеокружок';
        if (msg.type === 'call-event') return '📹 Видеозвонок';
        return String(msg.content || '');
    }

    // ===================== USER PROFILE =====================

    async getUserProfile(uid) {
        try {
            const doc = await this.db.collection('users').doc(uid).get();
            if (doc.exists) {
                const data = doc.data();
                return {
                    ...data,
                    uid,
                    interests: typeof data.interests === 'string' ? data.interests : '',
                    onboardingCompleted: data.onboardingCompleted === true,
                    subscriptions: Array.isArray(data.subscriptions) ? data.subscriptions : [],
                    subscribers: Array.isArray(data.subscribers) ? data.subscribers : [],
                    blockedUsers: Array.isArray(data.blockedUsers) ? data.blockedUsers : [],
                    hiddenAuthors: Array.isArray(data.hiddenAuthors) ? data.hiddenAuthors : [],
                    notifications: Array.isArray(data.notifications) ? data.notifications : [],
                    online: !!data.online,
                    lastSeen: this.normalizeTimestamp(data.lastSeen),
                    lastActive: this.normalizeTimestamp(data.lastActive)
                };
            }
            return null;
        } catch (error) {
            console.error('❌ Ошибка получения профиля:', error);
            return null;
        }
    }

    async updatePresence(isOnline) {
        const uid = this.getCurrentUid();
        if (!uid) return false;

        const now = Date.now();
        const payload = {
            online: !!isOnline,
            lastActive: now,
            updatedAt: new Date()
        };

        if (!isOnline) {
            payload.lastSeen = now;
        }

        try {
            await this.db.collection('users').doc(uid).set(payload, { merge: true });
            if (this.currentUser && this.currentUser.uid === uid) {
                this.currentUser = {
                    ...this.currentUser,
                    ...payload,
                    lastSeen: payload.lastSeen ?? this.currentUser.lastSeen
                };
            }
            return true;
        } catch (error) {
            console.error('❌ Ошибка обновления presence:', error);
            return false;
        }
    }

    async updateUserProfile(uid, updates) {
        try {
            const before = await this.getUserProfile(uid);

            if (updates && typeof updates.name === 'string' && updates.name.trim()) {
                const normalizedName = updates.name.trim();
                const existing = await this.getUserByName(normalizedName);
                if (existing && existing.uid !== uid) {
                    throw new Error('Имя профиля уже занято');
                }
                updates.name = normalizedName;
            }

            await this.db.collection('users').doc(uid).update({
                ...updates,
                updatedAt: new Date()
            });
            this.currentUser = await this.getUserProfile(uid);

            // Keep authored videos consistent across the app (feed/profile/search).
            // We store author name/avatar in each video doc for fast rendering, so sync it when profile changes.
            const after = this.currentUser;
            const shouldSyncVideos = !!(
                before
                && after
                && (before.name !== after.name
                    || before.avatar !== after.avatar
                    || !!before.verified !== !!after.verified)
            );

            if (shouldSyncVideos) {
                try {
                    const safeAvatar = this.sanitizeAvatarForPublicPayload(after.avatar, after.name || 'user');
                    await this.syncUserVideosAuthorMeta(uid, {
                        author: after.name,
                        avatar: safeAvatar,
                        authorVerified: !!after.verified
                    });
                } catch (syncError) {
                    console.warn('⚠️ Не удалось синхронизировать видео после обновления профиля:', syncError?.message || syncError);
                }
            }

            console.log('Профиль обновлен');
            return true;
        } catch (error) {
            console.error('Ошибка обновления профиля:', error);
            throw error;
        }
    }

    async syncUserVideosAuthorMeta(uid, { author = null, avatar = null, authorVerified = null } = {}) {
        if (!uid) return 0;

        const payload = { updatedAt: new Date() };
        if (typeof author === 'string' && author.trim()) payload.author = author.trim();
        if (typeof avatar === 'string' && avatar.trim()) payload.avatar = avatar.trim();
        if (typeof authorVerified === 'boolean') payload.authorVerified = authorVerified;

        try {
            const snapshot = await this.db.collection('videos')
                .where('uid', '==', uid)
                .get();

            if (snapshot.empty) return 0;

            let updated = 0;
            let batch = this.db.batch();
            let ops = 0;

            for (const doc of snapshot.docs) {
                batch.update(doc.ref, payload);
                updated += 1;
                ops += 1;

                // Firestore batch hard limit is 500; keep a safety margin.
                if (ops >= 450) {
                    await batch.commit();
                    batch = this.db.batch();
                    ops = 0;
                }
            }

            if (ops > 0) {
                await batch.commit();
            }

            return updated;
        } catch (error) {
            console.error('❌ Ошибка синхронизации видео автора:', error);
            throw error;
        }
    }

    async setUserVerified(targetUid, verified) {
        const current = this.getCurrentUser();
        if (!current || current.canVerify !== true) {
            throw new Error('Недостаточно прав для выдачи галочки');
        }
        if (!targetUid) {
            throw new Error('Не указан пользователь');
        }

        const verifiedValue = !!verified;

        try {
            await this.db.collection('users').doc(targetUid).update({
                verified: verifiedValue,
                updatedAt: new Date()
            });

            // Синхронизируем статус галочки в опубликованных видео автора.
            const videosSnapshot = await this.db.collection('videos')
                .where('uid', '==', targetUid)
                .get();

            if (!videosSnapshot.empty) {
                const batch = this.db.batch();
                videosSnapshot.forEach(doc => {
                    batch.update(doc.ref, {
                        authorVerified: verifiedValue,
                        updatedAt: new Date()
                    });
                });
                await batch.commit();
            }

            if (this.currentUser && this.currentUser.uid === targetUid) {
                this.currentUser.verified = verifiedValue;
            }

            return true;
        } catch (error) {
            console.error('❌ Ошибка обновления верификации:', error);
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
            const userProfile = await this.getUserProfile(uid);
            const safeAuthor = (userProfile && userProfile.name) ? userProfile.name : 'user';
            const safeAvatar = this.sanitizeAvatarForPublicPayload(userProfile && userProfile.avatar, safeAuthor);
            const uploaded = await this.uploadMedia(file, `videos/${uid}`, {
                uid,
                purpose: 'video'
            });

            // Создаем документ видео в Firestore
            const videoDoc = {
                id: Date.now(),
                uid: uid,
                author: safeAuthor,
                avatar: safeAvatar,
                authorVerified: !!userProfile.verified,
                url: uploaded.url,
                storagePath: uploaded.storagePath,
                storageProvider: uploaded.storageProvider,
                desc: metadata.desc || '',
                tags: metadata.tags || '',
                hashtags: metadata.tags ? metadata.tags.split(' ').filter(t => t.startsWith('#')) : [],
                filter: metadata.filter || 'none',
                likes: 0,
                likedBy: [], // UIDs людей, которые лайкнули
                commentsCount: 0,
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
            const mapVideoDoc = (doc) => {
                const data = doc.data() || {};
                const commentsCount = Number.isFinite(parseInt(data.commentsCount, 10))
                    ? (parseInt(data.commentsCount, 10) || 0)
                    : (Array.isArray(data.comments) ? data.comments.length : 0);
                return {
                    ...data,
                    comments: [], // comments are loaded lazily from subcollection
                    commentsCount,
                    // Firestore возвращает Timestamp, UI ждёт number (ms)
                    timestamp: this.normalizeTimestamp(data.timestamp),
                    firestoreId: doc.id,
                    isLiked: uid ? data.likedBy?.includes(uid) : false
                };
            };

            try {
                // Оптимальный вариант (может требовать composite index)
                const snapshot = await this.db.collection('videos')
                    .where('private', '==', false)
                    .orderBy('timestamp', 'desc')
                    .limit(limit)
                    .get();

                const videos = snapshot.docs.map(mapVideoDoc);
                console.log('✅ Лента загружена:', videos.length, 'видео');
                return videos;
            } catch (indexError) {
                // Fallback без where+orderBy (чтобы не упираться в отсутствие индекса)
                console.warn('⚠️ getFeed(): query with where+orderBy failed, using fallback query:', indexError?.message || indexError);

                const fallbackLimit = Math.max(limit * 3, limit);
                const snapshot = await this.db.collection('videos')
                    .orderBy('timestamp', 'desc')
                    .limit(fallbackLimit)
                    .get();

                const videos = snapshot.docs
                    .map(mapVideoDoc)
                    .filter(v => v.private !== true)
                    .slice(0, limit);

                console.log('✅ Лента загружена (fallback):', videos.length, 'видео');
                return videos;
            }
        } catch (error) {
            console.error('❌ Ошибка загрузки ленты:', error);
            return [];
        }
    }

    async getVideosByAuthor(authorName) {
        try {
            const uid = this.getCurrentUid();
            const mapVideoDoc = (doc) => {
                const data = doc.data() || {};
                const commentsCount = Number.isFinite(parseInt(data.commentsCount, 10))
                    ? (parseInt(data.commentsCount, 10) || 0)
                    : (Array.isArray(data.comments) ? data.comments.length : 0);
                return {
                    ...data,
                    comments: [],
                    commentsCount,
                    timestamp: this.normalizeTimestamp(data.timestamp),
                    firestoreId: doc.id,
                    isLiked: uid ? Array.isArray(data.likedBy) && data.likedBy.includes(uid) : false
                };
            };

            let snapshot;
            try {
                snapshot = await this.db.collection('videos')
                    .where('author', '==', authorName)
                    .orderBy('timestamp', 'desc')
                    .get();
            } catch (indexError) {
                console.warn('⚠️ getVideosByAuthor(): query with where+orderBy failed, using fallback query:', indexError?.message || indexError);
                snapshot = await this.db.collection('videos')
                    .where('author', '==', authorName)
                    .get();
            }

            const videos = snapshot.docs.map(mapVideoDoc);
            videos.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            return videos;
        } catch (error) {
            console.error('❌ Ошибка получения видео автора:', error);
            return [];
        }
    }

    async getVideosByUid(uid, { includePrivate = false } = {}) {
        if (!uid) return [];
        try {
            const currentUid = this.getCurrentUid();
            const mapVideoDoc = (doc) => {
                const data = doc.data() || {};
                const commentsCount = Number.isFinite(parseInt(data.commentsCount, 10))
                    ? (parseInt(data.commentsCount, 10) || 0)
                    : (Array.isArray(data.comments) ? data.comments.length : 0);
                return {
                    ...data,
                    comments: [],
                    commentsCount,
                    timestamp: this.normalizeTimestamp(data.timestamp),
                    firestoreId: doc.id,
                    isLiked: currentUid ? Array.isArray(data.likedBy) && data.likedBy.includes(currentUid) : false
                };
            };

            let snapshot;
            try {
                snapshot = await this.db.collection('videos')
                    .where('uid', '==', uid)
                    .orderBy('timestamp', 'desc')
                    .get();
            } catch (indexError) {
                console.warn('⚠️ getVideosByUid(): query with where+orderBy failed, using fallback query:', indexError?.message || indexError);
                snapshot = await this.db.collection('videos')
                    .where('uid', '==', uid)
                    .get();
            }

            let videos = snapshot.docs.map(mapVideoDoc);
            videos.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            if (!includePrivate) {
                videos = videos.filter(v => v.private !== true);
            }
            return videos;
        } catch (error) {
            console.error('❌ Ошибка получения видео по uid:', error);
            return [];
        }
    }

    async deleteVideo(firestoreId, storagePath, storageProvider = 'firebase') {
        try {
            if (storagePath) {
                if (storageProvider === 'cloudflare' && this.isExternalMediaEnabled()) {
                    await this.mediaStorage.deleteFile(storagePath);
                } else if (this.storage) {
                    await this.storage.ref(storagePath).delete();
                }
            }
            
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

                const authorUid = video && video.uid ? String(video.uid) : null;
                if (authorUid && authorUid !== String(uid)) {
                    try {
                        const actor = this.currentUser || await this.getUserProfile(uid);
                        await this.addNotification(authorUid, 'like', {
                            fromUid: uid,
                            fromUser: actor?.name || 'user',
                            videoId: video?.id || firestoreId,
                            videoThumbnail: video?.thumbnail || ''
                        });
                    } catch (notifError) {
                        console.warn('⚠️ Не удалось отправить уведомление о лайке:', notifError?.message || notifError);
                    }
                }

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
            const safeUser = (userProfile && userProfile.name) ? String(userProfile.name) : 'user';
            const safeAvatar = this.sanitizeAvatarForPublicPayload(userProfile && userProfile.avatar, safeUser);
            const safeText = String(text || '').trim();
            if (!safeText) throw new Error('Пустой комментарий');
            const now = Date.now();
            const comment = {
                uid: uid,
                user: safeUser,
                avatar: safeAvatar,
                text: safeText,
                likes: 0,
                likedBy: [],
                time: now,
                createdAt: new Date()
            };

            const commentRef = await this.db.collection('videos')
                .doc(firestoreId)
                .collection('comments')
                .add(comment);

            // Keep a lightweight counter on video doc (best effort).
            try {
                await this.db.collection('videos').doc(firestoreId).update({
                    commentsCount: firebase.firestore.FieldValue.increment(1),
                    updatedAt: new Date()
                });
            } catch (counterError) {
                console.warn('⚠️ Не удалось обновить commentsCount:', counterError?.message || counterError);
            }

            try {
                const videoDoc = await this.db.collection('videos').doc(firestoreId).get();
                const video = videoDoc.exists ? videoDoc.data() : null;
                const authorUid = video && video.uid ? String(video.uid) : null;
                if (authorUid && authorUid !== String(uid)) {
                    await this.addNotification(authorUid, 'comment', {
                        fromUid: uid,
                        fromUser: userProfile?.name || 'user',
                        videoId: video?.id || firestoreId,
                        videoThumbnail: video?.thumbnail || '',
                        text: safeText.length > 90 ? `${safeText.slice(0, 87)}...` : safeText
                    });
                }
            } catch (notifError) {
                console.warn('⚠️ Не удалось отправить уведомление о комментарии:', notifError?.message || notifError);
            }

            console.log('✅ Комментарий добавлен');
            return { ...comment, id: commentRef.id };
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
            const commentsRef = this.db.collection('videos').doc(firestoreId).collection('comments');
            let snapshot = null;

            try {
                snapshot = await commentsRef
                    .orderBy('createdAt', 'desc')
                    .limit(300)
                    .get();
            } catch (_) {
                // If index/orderBy is unavailable, read without order and sort in memory.
                snapshot = await commentsRef.limit(300).get();
            }

            if (snapshot && !snapshot.empty) {
                const comments = snapshot.docs.map((doc) => {
                    const data = doc.data() || {};
                    const timeValue = this.normalizeTimestamp(data.time || data.createdAt || data.timestamp);
                    return {
                        ...data,
                        id: doc.id,
                        time: timeValue || Date.now()
                    };
                });
                comments.sort((a, b) => (parseInt(b.time, 10) || 0) - (parseInt(a.time, 10) || 0));
                return comments;
            }

            // Legacy fallback: old comments array stored directly in the video document.
            const doc = await this.db.collection('videos').doc(firestoreId).get();
            const legacy = Array.isArray(doc.data()?.comments) ? doc.data().comments : [];
            return legacy
                .map((c) => ({
                    ...c,
                    time: this.normalizeTimestamp(c.time || c.createdAt || c.timestamp) || Date.now()
                }))
                .sort((a, b) => (parseInt(b.time, 10) || 0) - (parseInt(a.time, 10) || 0));
        } catch (error) {
            console.error('❌ Ошибка получения комментариев:', error);
            return [];
        }
    }

    // ===================== MESSAGES =====================

    buildChatId(uidA, uidB) {
        if (!uidA || !uidB) return null;
        return [uidA, uidB].sort().join('_');
    }

    normalizeTimestamp(value) {
        if (typeof value === 'number') return value;
        if (value && typeof value.toMillis === 'function') return value.toMillis();
        if (value instanceof Date) return value.getTime();
        return 0;
    }

    isExternalMediaEnabled() {
        return !!(this.mediaStorage && typeof this.mediaStorage.isEnabled === 'function' && this.mediaStorage.isEnabled());
    }

    async uploadMedia(file, folder, metadata = {}) {
        if (this.isExternalMediaEnabled()) {
            const result = await this.mediaStorage.uploadFile(file, { folder, metadata });
            return {
                url: result.url,
                storagePath: result.key || result.url,
                storageProvider: result.provider || 'cloudflare'
            };
        }

        if (!this.storage) {
            throw new Error('Media storage не настроен: Firebase Storage недоступен и Cloudflare не подключен');
        }

        const safeName = String(file.name || 'file').replace(/[^\w.\-]+/g, '_');
        const filePath = `${folder}/${Date.now()}_${safeName}`;
        const uploadTask = await this.storage.ref(filePath).put(file);
        const url = await uploadTask.ref.getDownloadURL();
        return {
            url,
            storagePath: filePath,
            storageProvider: 'firebase'
        };
    }

    async uploadChatFile(chatId, file) {
        const currentUid = this.getCurrentUid();
        if (!currentUid) throw new Error('Необходимо авторизироваться');
        if (!file) throw new Error('Файл не выбран');

        const targetChat = chatId || currentUid;
        const uploaded = await this.uploadMedia(file, `chat-files/${targetChat}`, {
            uid: currentUid,
            chatId: targetChat,
            purpose: 'chat-file'
        });

        return {
            name: file.name || 'file',
            size: file.size || 0,
            mime: file.type || 'application/octet-stream',
            url: uploaded.url,
            storagePath: uploaded.storagePath,
            storageProvider: uploaded.storageProvider
        };
    }

    async addMessage(chatId, fromUser, toUser, content, toUid = null, options = {}) {
        const currentUid = this.getCurrentUid();
        if (!currentUid) throw new Error('Необходимо авторизироваться');

        const text = (content || '').trim();
        const messageType = typeof options.type === 'string'
            ? options.type
            : (options.file ? 'file' : 'text');
        if (messageType === 'text' && !text) throw new Error('Пустое сообщение');

        try {
            const senderProfile = await this.getUserProfile(currentUid);
            const senderName = senderProfile?.name || fromUser || 'user';

            let targetUid = toUid;
            let targetName = (toUser || '').trim();

            if (!targetUid && targetName) {
                const targetProfileByName = await this.getUserByName(targetName);
                if (targetProfileByName) {
                    targetUid = targetProfileByName.uid;
                    targetName = targetProfileByName.name || targetName;
                }
            }

            if (!targetUid) {
                throw new Error('Получатель не найден');
            }
            if (targetUid === currentUid) {
                throw new Error('Нельзя отправить сообщение самому себе');
            }

            if (!targetName) {
                const targetProfile = await this.getUserProfile(targetUid);
                targetName = targetProfile?.name || 'user';
            }

            const targetProfile = await this.getUserProfile(targetUid);
            const delivered = !!targetProfile?.online;
            const now = Date.now();

            const normalizedChatId = chatId || this.buildChatId(currentUid, targetUid);
            if (!normalizedChatId) {
                throw new Error('Не удалось создать чат');
            }

            const message = {
                chatId: normalizedChatId,
                participants: [currentUid, targetUid],
                fromUid: currentUid,
                fromUser: senderName,
                toUid: targetUid,
                toUser: targetName,
                content: text,
                type: messageType,
                file: options.file || null,
                sticker: options.sticker || null,
                call: options.call || null,
                timestamp: now,
                delivered,
                deliveredAt: delivered ? now : null,
                read: false,
                readAt: null
            };

            const ref = await this.db.collection('messages').add(message);
            return { id: ref.id, ...message };
        } catch (error) {
            console.error('❌ Ошибка отправки сообщения:', error);
            throw error;
        }
    }

    async getChatMessages(chatId) {
        const currentUid = this.getCurrentUid();
        if (!currentUid || !chatId) return [];

        try {
            const snapshot = await this.db.collection('messages')
                .where('chatId', '==', chatId)
                .get();

            return snapshot.docs
                .map(doc => {
                    const data = doc.data();
                    return {
                        id: doc.id,
                        ...data,
                        timestamp: this.normalizeTimestamp(data.timestamp),
                        delivered: !!data.delivered,
                        read: !!data.read,
                        type: data.type || 'text',
                        file: data.file || null,
                        sticker: data.sticker || null,
                        call: data.call || null
                    };
                })
                .sort((a, b) => a.timestamp - b.timestamp);
        } catch (error) {
            console.error('❌ Ошибка загрузки сообщений чата:', error);
            return [];
        }
    }

    async getChats() {
        const currentUid = this.getCurrentUid();
        if (!currentUid) return [];

        try {
            await this.markIncomingAsDelivered();
            const snapshot = await this.db.collection('messages')
                .where('participants', 'array-contains', currentUid)
                .get();

            const chatsMap = new Map();

            snapshot.forEach(doc => {
                const msg = doc.data();
                const timestamp = this.normalizeTimestamp(msg.timestamp);
                const chatId = msg.chatId || this.buildChatId(msg.fromUid, msg.toUid);
                if (!chatId) return;

                const isFromCurrent = msg.fromUid === currentUid;
                const otherUid = isFromCurrent ? msg.toUid : msg.fromUid;
                const otherUser = isFromCurrent ? msg.toUser : msg.fromUser;
                const previewText = this.getMessagePreviewText(msg);
                const unreadCurrent = msg.toUid === currentUid && !msg.read;

                if (!chatsMap.has(chatId)) {
                    chatsMap.set(chatId, {
                        id: chatId,
                        otherUid: otherUid || null,
                        otherUser: otherUser || 'user',
                        otherAvatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(otherUser || 'user')}&background=random&size=64`,
                        otherOnline: false,
                        otherLastSeen: null,
                        otherVerified: false,
                        lastMessage: previewText,
                        lastMessageTime: timestamp,
                        lastMessageType: msg.type || 'text',
                        unread: unreadCurrent,
                        unreadCount: unreadCurrent ? 1 : 0,
                        lastMessageFromMe: isFromCurrent,
                        lastMessageDelivered: !!msg.delivered,
                        lastMessageRead: !!msg.read
                    });
                    return;
                }

                const chat = chatsMap.get(chatId);
                if (timestamp > chat.lastMessageTime) {
                    chat.lastMessage = previewText;
                    chat.lastMessageTime = timestamp;
                    chat.lastMessageType = msg.type || 'text';
                    chat.lastMessageFromMe = isFromCurrent;
                    chat.lastMessageDelivered = !!msg.delivered;
                    chat.lastMessageRead = !!msg.read;
                }
                if (unreadCurrent) {
                    chat.unread = true;
                    chat.unreadCount += 1;
                }
            });

            const chats = Array.from(chatsMap.values()).sort((a, b) => b.lastMessageTime - a.lastMessageTime);
            const uniqueUids = Array.from(new Set(chats.map(c => c.otherUid).filter(Boolean)));
            const profiles = await Promise.all(uniqueUids.map(uid => this.getUserProfile(uid)));
            const profileMap = new Map();
            profiles.forEach(profile => {
                if (profile && profile.uid) profileMap.set(profile.uid, profile);
            });

            chats.forEach(chat => {
                const profile = profileMap.get(chat.otherUid);
                if (!profile) return;
                chat.otherUser = profile.name || chat.otherUser;
                chat.otherAvatar = profile.avatar || chat.otherAvatar;
                chat.otherOnline = !!profile.online;
                chat.otherLastSeen = this.normalizeTimestamp(profile.lastSeen || profile.lastActive || profile.updatedAt);
                chat.otherVerified = !!profile.verified;
            });

            return chats;
        } catch (error) {
            console.error('❌ Ошибка загрузки чатов:', error);
            return [];
        }
    }

    async markIncomingAsDelivered(chatId = null) {
        const currentUid = this.getCurrentUid();
        if (!currentUid) return 0;

        try {
            const snapshot = await this.db.collection('messages')
                .where('toUid', '==', currentUid)
                .get();

            let updatesCount = 0;
            const batch = this.db.batch();
            const now = Date.now();

            snapshot.forEach(doc => {
                const data = doc.data();
                if (chatId && data.chatId !== chatId) return;
                if (!data.read && !data.delivered) {
                    batch.update(doc.ref, { delivered: true, deliveredAt: now });
                    updatesCount += 1;
                }
            });

            if (updatesCount > 0) {
                await batch.commit();
            }
            return updatesCount;
        } catch (error) {
            console.error('❌ Ошибка отметки сообщений как доставленных:', error);
            return 0;
        }
    }

    async markChatAsRead(chatId) {
        const currentUid = this.getCurrentUid();
        if (!currentUid || !chatId) return 0;

        try {
            const snapshot = await this.db.collection('messages')
                .where('chatId', '==', chatId)
                .get();

            let updatesCount = 0;
            const batch = this.db.batch();

            snapshot.forEach(doc => {
                const data = doc.data();
                if (data.toUid === currentUid && !data.read) {
                    const now = Date.now();
                    batch.update(doc.ref, {
                        delivered: true,
                        deliveredAt: data.deliveredAt || now,
                        read: true,
                        readAt: now
                    });
                    updatesCount += 1;
                }
            });

            if (updatesCount > 0) {
                await batch.commit();
            }

            return updatesCount;
        } catch (error) {
            console.error('❌ Ошибка отметки сообщений как прочитанных:', error);
            return 0;
        }
    }

    async setTypingStatus(chatId, isTyping) {
        const currentUid = this.getCurrentUid();
        if (!currentUid || !chatId) return false;

        try {
            const profile = await this.getUserProfile(currentUid);
            const ref = this.db.collection('chatTyping').doc(chatId);
            await ref.set({
                [currentUid]: {
                    typing: !!isTyping,
                    uid: currentUid,
                    name: profile?.name || 'user',
                    updatedAt: Date.now()
                }
            }, { merge: true });
            return true;
        } catch (error) {
            console.error('❌ Ошибка typing статуса:', error);
            return false;
        }
    }

    subscribeToChatMessages(chatId, callback) {
        const currentUid = this.getCurrentUid();
        if (!currentUid || !chatId || typeof callback !== 'function') return () => {};

        return this.db.collection('messages')
            .where('chatId', '==', chatId)
            .onSnapshot((snapshot) => {
                const messages = snapshot.docs
                    .map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            timestamp: this.normalizeTimestamp(data.timestamp),
                            delivered: !!data.delivered,
                            read: !!data.read,
                            type: data.type || 'text',
                            file: data.file || null,
                            sticker: data.sticker || null,
                            call: data.call || null
                        };
                    })
                    .sort((a, b) => a.timestamp - b.timestamp);
                callback(messages);
            }, (error) => {
                console.error('❌ Ошибка подписки на сообщения:', error);
            });
    }

    subscribeToIncomingMessages(callback) {
        const currentUid = this.getCurrentUid();
        if (!currentUid || typeof callback !== 'function') return () => {};

        let initialized = false;
        const seenIds = new Set();

        return this.db.collection('messages')
            .where('toUid', '==', currentUid)
            .onSnapshot((snapshot) => {
                let unreadCount = 0;
                snapshot.docs.forEach(doc => {
                    const data = doc.data() || {};
                    if (!data.read) unreadCount += 1;
                });

                if (!initialized) {
                    snapshot.docs.forEach(doc => seenIds.add(doc.id));
                    initialized = true;
                    callback({ unreadCount, newMessages: [] });
                    return;
                }

                const newMessages = [];
                snapshot.docChanges().forEach(change => {
                    if (change.type !== 'added') return;
                    if (seenIds.has(change.doc.id)) return;
                    seenIds.add(change.doc.id);

                    const data = change.doc.data() || {};
                    if (data.read) return;

                    newMessages.push({
                        id: change.doc.id,
                        ...data,
                        timestamp: this.normalizeTimestamp(data.timestamp),
                        delivered: !!data.delivered,
                        read: !!data.read,
                        type: data.type || 'text',
                        file: data.file || null,
                        sticker: data.sticker || null,
                        call: data.call || null
                    });
                });

                callback({ unreadCount, newMessages });
            }, (error) => {
                console.error('Ошибка подписки на входящие сообщения:', error);
            });
    }

    subscribeToTyping(chatId, callback) {
        const currentUid = this.getCurrentUid();
        if (!currentUid || !chatId || typeof callback !== 'function') return () => {};

        return this.db.collection('chatTyping')
            .doc(chatId)
            .onSnapshot((doc) => {
                callback(doc.exists ? doc.data() : {});
            }, (error) => {
                console.error('❌ Ошибка подписки на typing:', error);
            });
    }

    async createVideoCall({ chatId, toUid, toUser = '' } = {}) {
        const currentUid = this.getCurrentUid();
        if (!currentUid) throw new Error('Необходимо авторизоваться');
        if (!toUid) throw new Error('Получатель не найден');
        if (toUid === currentUid) throw new Error('Нельзя звонить самому себе');

        const fromProfile = await this.getUserProfile(currentUid);
        const fromUser = fromProfile?.name || 'user';
        const targetProfile = await this.getUserProfile(toUid);
        const targetName = (toUser || '').trim() || targetProfile?.name || 'user';
        const normalizedChatId = chatId || this.buildChatId(currentUid, toUid);
        if (!normalizedChatId) throw new Error('Не удалось создать чат');

        const now = Date.now();
        const payload = {
            chatId: normalizedChatId,
            fromUid: currentUid,
            fromUser,
            toUid,
            toUser: targetName,
            mode: 'video',
            status: 'ringing',
            createdAt: now,
            updatedAt: now,
            acceptedAt: null,
            endedAt: null,
            endedBy: null,
            offer: null,
            answer: null
        };

        const ref = await this.db.collection('calls').add(payload);
        return { id: ref.id, ...payload };
    }

    async updateCall(callId, patch = {}) {
        if (!callId) return false;
        const payload = { ...patch, updatedAt: Date.now() };
        await this.db.collection('calls').doc(callId).set(payload, { merge: true });
        return true;
    }

    subscribeToIncomingCalls(callback) {
        const currentUid = this.getCurrentUid();
        if (!currentUid || typeof callback !== 'function') return () => {};

        return this.db.collection('calls')
            .where('toUid', '==', currentUid)
            .onSnapshot((snapshot) => {
                const calls = snapshot.docs
                    .map(doc => {
                        const data = doc.data() || {};
                        return {
                            id: doc.id,
                            ...data,
                            createdAt: this.normalizeTimestamp(data.createdAt),
                            updatedAt: this.normalizeTimestamp(data.updatedAt),
                            acceptedAt: this.normalizeTimestamp(data.acceptedAt),
                            endedAt: this.normalizeTimestamp(data.endedAt)
                        };
                    })
                    .sort((a, b) => b.createdAt - a.createdAt);
                callback(calls);
            }, (error) => {
                console.error('Ошибка подписки на входящие звонки:', error);
            });
    }

    subscribeToCall(callId, callback) {
        if (!callId || typeof callback !== 'function') return () => {};
        return this.db.collection('calls').doc(callId).onSnapshot((doc) => {
            if (!doc.exists) {
                callback(null);
                return;
            }
            const data = doc.data() || {};
            callback({
                id: doc.id,
                ...data,
                createdAt: this.normalizeTimestamp(data.createdAt),
                updatedAt: this.normalizeTimestamp(data.updatedAt),
                acceptedAt: this.normalizeTimestamp(data.acceptedAt),
                endedAt: this.normalizeTimestamp(data.endedAt)
            });
        }, (error) => {
            console.error('Ошибка подписки на звонок:', error);
        });
    }

    async addCallCandidate(callId, candidate) {
        const uid = this.getCurrentUid();
        if (!uid || !callId || !candidate) return null;

        const payload = {
            uid,
            candidate: candidate?.toJSON ? candidate.toJSON() : candidate,
            createdAt: Date.now()
        };
        const ref = await this.db.collection('calls')
            .doc(callId)
            .collection('candidates')
            .add(payload);
        return { id: ref.id, ...payload };
    }

    subscribeToCallCandidates(callId, callback) {
        if (!callId || typeof callback !== 'function') return () => {};

        return this.db.collection('calls')
            .doc(callId)
            .collection('candidates')
            .onSnapshot((snapshot) => {
                const candidates = snapshot.docChanges()
                    .filter(change => change.type === 'added')
                    .map(change => {
                        const data = change.doc.data() || {};
                        return {
                            id: change.doc.id,
                            uid: data.uid || null,
                            candidate: data.candidate || null,
                            createdAt: this.normalizeTimestamp(data.createdAt)
                        };
                    });
                callback(candidates);
            }, (error) => {
                console.error('Ошибка подписки на ICE candidates:', error);
            });
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

            if (this.currentUser && this.currentUser.uid === currentUid) {
                this.currentUser.subscriptions = Array.isArray(this.currentUser.subscriptions) ? this.currentUser.subscriptions : [];
                if (!this.currentUser.subscriptions.includes(targetUid)) {
                    this.currentUser.subscriptions.push(targetUid);
                }
            }

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

            if (this.currentUser && this.currentUser.uid === currentUid) {
                this.currentUser.subscriptions = Array.isArray(this.currentUser.subscriptions) ? this.currentUser.subscriptions : [];
                this.currentUser.subscriptions = this.currentUser.subscriptions.filter(x => x !== targetUid);
            }

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

    async getUserNotifications(filter = 'all') {
        const uid = this.getCurrentUid();
        if (!uid) return [];

        const profile = await this.getUserProfile(uid);
        const list = Array.isArray(profile?.notifications) ? profile.notifications : [];
        const normalized = list
            .map(notif => ({
                ...notif,
                timestamp: this.normalizeTimestamp(notif.timestamp)
            }))
            .sort((a, b) => b.timestamp - a.timestamp);

        if (this.currentUser && this.currentUser.uid === uid) {
            this.currentUser.notifications = normalized;
        }

        if (filter === 'all') return normalized;
        return normalized.filter(n => n.type === filter);
    }

    async markNotificationAsRead(notificationId) {
        const uid = this.getCurrentUid();
        if (!uid || !notificationId) return false;

        const profile = await this.getUserProfile(uid);
        const list = Array.isArray(profile?.notifications) ? profile.notifications : [];
        let changed = false;
        const updatedList = list.map(notif => {
            if (notif.id === notificationId && !notif.read) {
                changed = true;
                return { ...notif, read: true };
            }
            return notif;
        });

        if (!changed) return false;

        await this.db.collection('users').doc(uid).update({
            notifications: updatedList,
            updatedAt: new Date()
        });

        if (this.currentUser && this.currentUser.uid === uid) {
            this.currentUser.notifications = updatedList.map(notif => ({
                ...notif,
                timestamp: this.normalizeTimestamp(notif.timestamp)
            }));
        }

        return true;
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


