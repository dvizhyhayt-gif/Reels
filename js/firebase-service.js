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
        this.authReady = false;
        this.authReadyResolve = null;
        this.authReadyPromise = new Promise((resolve) => {
            this.authReadyResolve = resolve;
        });
        this.sessionStorageKey = 'reelgram_session_id_v1';
        this.cachedSessionId = null;
        this.sessionStartedAt = null;
        this.setupAuthListener();
    }

    // ===================== AUTHENTICATION =====================

    setupAuthListener() {
        this.auth.onAuthStateChanged(async (user) => {
            try {
                if (user) {
                    console.log('✅ Пользователь залогинен:', user.uid);
                    let profile = null;
                    try {
                        profile = await this.getUserProfile(user.uid);
                    } catch (profileError) {
                        console.error('❌ Не удалось загрузить профиль пользователя, используется fallback:', profileError?.message || profileError);
                    }
                    this.currentUser = profile || this.buildFallbackProfileFromAuth(user);
                    await this.updatePresence(true);
                    try {
                        await this.touchCurrentSession({ online: true, forceCreate: true });
                    } catch (sessionError) {
                        console.warn('⚠️ Не удалось обновить сессию устройства:', sessionError?.message || sessionError);
                    }
                    await this.markIncomingAsDelivered();
                    if (window.app) {
                        window.app.updateProfileUI();
                        if (typeof window.app.loadStories === 'function') {
                            window.app.loadStories({ silent: true });
                        }
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
                        if (typeof window.app.updateAdminMenuVisibility === 'function') {
                            window.app.updateAdminMenuVisibility();
                        }
                        if (typeof window.app.restoreModerationPreferences === 'function') {
                            window.app.restoreModerationPreferences();
                        }
                        if (typeof window.app.updateNotificationBadge === 'function') {
                            window.app.updateNotificationBadge();
                        }
                        if (typeof window.app.loadFeed === 'function' && window.app.state && window.app.state.feedMode === 'global') {
                            window.app.loadFeed(true).catch((feedError) => {
                                console.warn('⚠️ Не удалось обновить ленту после авторизации:', feedError?.message || feedError);
                            });
                        }
                    }
                } else {
                    console.log('❌ Пользователь вышел');
                    this.currentUser = null;
                    if (window.app) {
                        if (typeof window.app.loadStories === 'function') {
                            window.app.loadStories({ silent: true });
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
                        if (typeof window.app.updateAdminMenuVisibility === 'function') {
                            window.app.updateAdminMenuVisibility();
                        }
                        if (typeof window.app.restoreModerationPreferences === 'function') {
                            window.app.restoreModerationPreferences();
                        }
                        if (typeof window.app.updateNotificationBadge === 'function') {
                            window.app.updateNotificationBadge();
                        }
                        if (typeof window.app.loadFeed === 'function' && window.app.state && window.app.state.feedMode === 'global') {
                            window.app.loadFeed(true).catch((feedError) => {
                                console.warn('⚠️ Не удалось обновить ленту после выхода:', feedError?.message || feedError);
                            });
                        }
                    }
                }
            } catch (authStateError) {
                console.error('❌ Ошибка обработки auth state:', authStateError);
            } finally {
                this.markAuthReady();
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

    markAuthReady() {
        if (this.authReady) return;
        this.authReady = true;
        if (typeof this.authReadyResolve === 'function') {
            this.authReadyResolve(true);
        }
        this.authReadyResolve = null;
    }

    async waitForAuthReady(timeout = 7000) {
        if (this.authReady) return true;
        const safeTimeout = Math.max(0, parseInt(timeout, 10) || 0);
        if (safeTimeout === 0) {
            await this.authReadyPromise;
            return true;
        }

        const result = await Promise.race([
            this.authReadyPromise.then(() => true),
            new Promise(resolve => setTimeout(() => resolve(false), safeTimeout))
        ]);
        return !!result;
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
                isAdmin: false,
                subscriptions: [],
                subscribers: [],
                followRequests: [],
                privateAccount: false,
                coins: 100,
                allowAdultContent: false,
                ageVerified: false,
                liveStats: {
                    started: 0,
                    joined: 0
                },
                blockedUsers: [],
                hiddenAuthors: [],
                notifications: [],
                giftsSentTotal: 0,
                giftsReceivedTotal: 0,
                giftsSentCount: 0,
                giftsReceivedCount: 0,
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

    buildFallbackProfileFromAuth(authUser = null) {
        const email = authUser && typeof authUser.email === 'string' ? authUser.email : '';
        const displayName = authUser && typeof authUser.displayName === 'string' ? authUser.displayName.trim() : '';
        const emailName = email && email.includes('@') ? email.split('@')[0] : '';
        const name = displayName || emailName || 'user';
        return {
            uid: authUser && authUser.uid ? String(authUser.uid) : null,
            email,
            name,
            avatar: this.buildUiAvatar(name),
            bio: '',
            location: '',
            website: '',
            interests: '',
            verified: false,
            isAdmin: false,
            subscriptions: [],
            subscribers: [],
            followRequests: [],
            privateAccount: false,
            allowAdultContent: false,
            ageVerified: false,
            coins: 0,
            liveStats: { started: 0, joined: 0 },
            notifications: [],
            online: false,
            lastSeen: Date.now(),
            lastActive: Date.now()
        };
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

    normalizeUserRecord(data = {}, uid = null) {
        const source = data || {};
        return {
            ...source,
            uid: uid || source.uid || null,
            interests: typeof source.interests === 'string' ? source.interests : '',
            onboardingCompleted: source.onboardingCompleted === true,
            subscriptions: Array.isArray(source.subscriptions) ? source.subscriptions : [],
            subscribers: Array.isArray(source.subscribers) ? source.subscribers : [],
            followRequests: Array.isArray(source.followRequests) ? source.followRequests.map(v => String(v)) : [],
            blockedUsers: Array.isArray(source.blockedUsers) ? source.blockedUsers : [],
            hiddenAuthors: Array.isArray(source.hiddenAuthors) ? source.hiddenAuthors : [],
            notifications: Array.isArray(source.notifications) ? source.notifications : [],
            online: !!source.online,
            verified: !!source.verified,
            canVerify: source.canVerify === true,
            isAdmin: source.isAdmin === true,
            privateAccount: source.privateAccount === true,
            coins: Math.max(0, parseInt(source.coins, 10) || 0),
            allowAdultContent: source.allowAdultContent === true,
            ageVerified: source.ageVerified === true,
            liveStats: {
                started: Math.max(0, parseInt(source?.liveStats?.started, 10) || 0),
                joined: Math.max(0, parseInt(source?.liveStats?.joined, 10) || 0)
            },
            giftsSentTotal: Math.max(0, parseInt(source.giftsSentTotal, 10) || 0),
            giftsReceivedTotal: Math.max(0, parseInt(source.giftsReceivedTotal, 10) || 0),
            giftsSentCount: Math.max(0, parseInt(source.giftsSentCount, 10) || 0),
            giftsReceivedCount: Math.max(0, parseInt(source.giftsReceivedCount, 10) || 0),
            lastSeen: this.normalizeTimestamp(source.lastSeen),
            lastActive: this.normalizeTimestamp(source.lastActive)
        };
    }

    isCurrentUserAdmin(user = null) {
        const current = user || this.getCurrentUser();
        return !!(current && (current.isAdmin === true || current.canVerify === true));
    }

    requireAdminAccess(actionLabel = 'действию') {
        if (!this.isCurrentUserAdmin()) {
            throw new Error(`Доступ к ${actionLabel} разрешен только администратору`);
        }
    }

    isAdultContentAllowed(user = null) {
        const target = user || this.getCurrentUser();
        return !!(target && target.allowAdultContent === true && target.ageVerified === true);
    }

    normalizeCoverColor(value) {
        const raw = String(value || '').trim();
        if (/^#[0-9a-fA-F]{6}$/.test(raw)) return raw.toLowerCase();
        return '#1cb8ff';
    }

    // ===================== USER PROFILE =====================

    async getUserProfile(uid) {
        try {
            const doc = await this.db.collection('users').doc(uid).get();
            if (doc.exists) {
                return this.normalizeUserRecord(doc.data(), uid);
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
            try {
                await this.touchCurrentSession({ online: !!isOnline });
            } catch (sessionError) {
                console.warn('⚠️ Не удалось обновить сессию при обновлении presence:', sessionError?.message || sessionError);
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
            const incoming = (updates && typeof updates === 'object') ? updates : {};
            const allowedProfileKeys = new Set([
                'name',
                'avatar',
                'avatar_local',
                'bio',
                'location',
                'website',
                'interests',
                'gender',
                'onboardingCompleted',
                'privateAccount',
                'allowAdultContent',
                'ageVerified',
                'blockedUsers',
                'hiddenAuthors'
            ]);
            const safeUpdates = {};
            Object.keys(incoming).forEach((key) => {
                if (!allowedProfileKeys.has(key)) return;
                safeUpdates[key] = incoming[key];
            });

            if (safeUpdates.blockedUsers && !Array.isArray(safeUpdates.blockedUsers)) {
                safeUpdates.blockedUsers = [];
            }
            if (safeUpdates.hiddenAuthors && !Array.isArray(safeUpdates.hiddenAuthors)) {
                safeUpdates.hiddenAuthors = [];
            }

            if (typeof safeUpdates.name === 'string' && safeUpdates.name.trim()) {
                const normalizedName = safeUpdates.name.trim();
                const existing = await this.getUserByName(normalizedName);
                if (existing && existing.uid !== uid) {
                    throw new Error('Имя профиля уже занято');
                }
                safeUpdates.name = normalizedName;
            }

            await this.db.collection('users').doc(uid).update({
                ...safeUpdates,
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
                    || !!before.verified !== !!after.verified
                    || !!before.privateAccount !== !!after.privateAccount)
            );

            if (shouldSyncVideos) {
                try {
                    const safeAvatar = this.sanitizeAvatarForPublicPayload(after.avatar, after.name || 'user');
                    await this.syncUserVideosAuthorMeta(uid, {
                        author: after.name,
                        avatar: safeAvatar,
                        authorVerified: !!after.verified,
                        authorPrivate: !!after.privateAccount
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

    async syncUserVideosAuthorMeta(uid, { author = null, avatar = null, authorVerified = null, authorPrivate = null } = {}) {
        if (!uid) return 0;

        const payload = { updatedAt: new Date() };
        if (typeof author === 'string' && author.trim()) payload.author = author.trim();
        if (typeof avatar === 'string' && avatar.trim()) payload.avatar = avatar.trim();
        if (typeof authorVerified === 'boolean') payload.authorVerified = authorVerified;
        if (typeof authorPrivate === 'boolean') payload.authorPrivate = authorPrivate;

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
        this.requireAdminAccess('управлению верификацией');
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

            await this.logAdminAction('set_user_verified', {
                targetUid,
                verified: verifiedValue
            });

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
            return this.normalizeUserRecord(querySnapshot.docs[0].data(), querySnapshot.docs[0].id);
        } catch (error) {
            console.error('❌ Ошибка поиска пользователя:', error);
            return null;
        }
    }

    async getAllUsers() {
        try {
            const snapshot = await this.db.collection('users').get();
            return snapshot.docs.map(doc => this.normalizeUserRecord(doc.data(), doc.id));
        } catch (error) {
            console.error('❌ Ошибка получения пользователей:', error);
            return [];
        }
    }

    async getUsersForAdmin(limit = 300) {
        this.requireAdminAccess('получению списка пользователей');
        const safeLimit = Math.max(1, Math.min(Number(limit) || 300, 1000));

        try {
            const snapshot = await this.db.collection('users').limit(safeLimit).get();
            const users = snapshot.docs.map(doc => this.normalizeUserRecord(doc.data(), doc.id));
            users.sort((a, b) => {
                const aTime = this.normalizeTimestamp(a.createdAt || a.updatedAt || 0);
                const bTime = this.normalizeTimestamp(b.createdAt || b.updatedAt || 0);
                return bTime - aTime;
            });
            return users;
        } catch (error) {
            console.error('Ошибка загрузки списка пользователей для админки:', error);
            return [];
        }
    }

    async setUserAdmin(targetUid, isAdmin) {
        this.requireAdminAccess('управлению ролями администратора');
        const current = this.getCurrentUser();
        if (!targetUid) throw new Error('Не указан пользователь');

        const value = isAdmin === true;
        if (current && current.uid === targetUid && !value) {
            throw new Error('Нельзя снять права администратора у самого себя');
        }

        await this.db.collection('users').doc(targetUid).set({
            isAdmin: value,
            updatedAt: new Date()
        }, { merge: true });

        if (this.currentUser && this.currentUser.uid === targetUid) {
            this.currentUser = {
                ...this.currentUser,
                isAdmin: value
            };
        }

        await this.logAdminAction('set_user_admin', {
            targetUid,
            isAdmin: value
        });

        return true;
    }

    async logAdminAction(action, payload = {}) {
        if (!action) return false;
        const current = this.getCurrentUser();
        if (!this.isCurrentUserAdmin(current)) return false;

        const now = Date.now();
        await this.db.collection('adminAuditLogs').add({
            action: String(action),
            payload: payload || {},
            adminUid: current?.uid || null,
            adminName: current?.name || null,
            adminEmail: current?.email || null,
            timestamp: now,
            createdAt: new Date()
        });
        return true;
    }

    async exportChatHistoryForLegalRequest({ uidA, uidB, caseId = '', requestedBy = '', reason = '' } = {}) {
        this.requireAdminAccess('выгрузке чата');

        const firstUid = String(uidA || '').trim();
        const secondUid = String(uidB || '').trim();
        if (!firstUid || !secondUid) throw new Error('Выберите двух пользователей');
        if (firstUid === secondUid) throw new Error('Пользователи должны быть разными');

        const chatId = this.buildChatId(firstUid, secondUid);
        if (!chatId) throw new Error('Не удалось сформировать ID чата');

        const [profileA, profileB, chatSnapshot, participantSnapshot] = await Promise.all([
            this.getUserProfile(firstUid),
            this.getUserProfile(secondUid),
            this.db.collection('messages').where('chatId', '==', chatId).get(),
            this.db.collection('messages').where('participants', 'array-contains', firstUid).get()
        ]);

        const messageDocs = new Map();
        chatSnapshot.docs.forEach((doc) => {
            messageDocs.set(doc.id, doc);
        });
        participantSnapshot.docs.forEach((doc) => {
            if (messageDocs.has(doc.id)) return;
            const data = doc.data() || {};
            const participants = Array.isArray(data.participants) ? data.participants.map(x => String(x)) : [];
            if (!participants.includes(secondUid)) return;
            const docChatId = typeof data.chatId === 'string' ? data.chatId : '';
            if (docChatId && docChatId !== chatId) return;
            messageDocs.set(doc.id, doc);
        });

        const messages = Array.from(messageDocs.values())
            .map((doc) => {
                const data = doc.data() || {};
                const ts = this.normalizeTimestamp(data.timestamp);
                const deliveredAt = this.normalizeTimestamp(data.deliveredAt);
                const readAt = this.normalizeTimestamp(data.readAt);

                return {
                    id: doc.id,
                    chatId: data.chatId || chatId,
                    fromUid: data.fromUid || null,
                    fromUser: data.fromUser || null,
                    toUid: data.toUid || null,
                    toUser: data.toUser || null,
                    content: typeof data.content === 'string' ? data.content : '',
                    type: data.type || 'text',
                    file: data.file || null,
                    sticker: data.sticker || null,
                    call: data.call || null,
                    delivered: !!data.delivered,
                    deliveredAt: deliveredAt || null,
                    deliveredAtIso: deliveredAt ? new Date(deliveredAt).toISOString() : null,
                    read: !!data.read,
                    readAt: readAt || null,
                    readAtIso: readAt ? new Date(readAt).toISOString() : null,
                    timestamp: ts || 0,
                    timestampIso: ts ? new Date(ts).toISOString() : null
                };
            })
            .sort((a, b) => a.timestamp - b.timestamp);

        const exportedAt = Date.now();
        const admin = this.getCurrentUser() || {};
        const exportPayload = {
            exportedAt,
            exportedAtIso: new Date(exportedAt).toISOString(),
            exportedBy: {
                uid: admin.uid || null,
                name: admin.name || null,
                email: admin.email || null
            },
            legalRequest: {
                caseId: String(caseId || '').trim(),
                requestedBy: String(requestedBy || '').trim(),
                reason: String(reason || '').trim()
            },
            chatId,
            participants: [
                {
                    uid: firstUid,
                    name: profileA?.name || null,
                    email: profileA?.email || null
                },
                {
                    uid: secondUid,
                    name: profileB?.name || null,
                    email: profileB?.email || null
                }
            ],
            messageCount: messages.length,
            messages
        };

        await this.logAdminAction('export_chat_history', {
            chatId,
            uidA: firstUid,
            uidB: secondUid,
            caseId: exportPayload.legalRequest.caseId || null,
            requestedBy: exportPayload.legalRequest.requestedBy || null,
            reason: exportPayload.legalRequest.reason || null,
            messageCount: messages.length
        });

        return exportPayload;
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
                authorPrivate: !!userProfile.privateAccount,
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
                ageRestricted: metadata.ageRestricted === true,
                videoTemplate: String(metadata.videoTemplate || 'none'),
                coverText: String(metadata.coverText || '').trim().slice(0, 48),
                coverSticker: String(metadata.coverSticker || '').trim().slice(0, 32),
                coverColor: this.normalizeCoverColor(metadata.coverColor),
                isLiked: false,
                timestamp: new Date(),
                updatedAt: new Date()
            };

            // Сохраняем видео в Firestore
            const videoRef = await this.db.collection('videos').add(videoDoc);

            try {
                await this.awardCoins(uid, 5, 'video_published', {
                    videoFirestoreId: videoRef.id
                });
            } catch (coinsError) {
                console.warn('⚠️ Не удалось начислить монеты за публикацию видео:', coinsError?.message || coinsError);
            }
             
            console.log('✅ Видео загруженно:', videoRef.id);
            return { ...videoDoc, firestoreId: videoRef.id };
        } catch (error) {
            console.error('❌ Ошибка загрузки видео:', error);
            throw error;
        }
    }

    async getFeed(limit = 10) {
        const uid = this.getCurrentUid();
        const allowAdultContent = this.isAdultContentAllowed(this.currentUser);
        const currentUid = uid ? String(uid) : null;
        const viewerSubscriptions = new Set(
            this.currentUser && Array.isArray(this.currentUser.subscriptions)
                ? this.currentUser.subscriptions.map(v => String(v))
                : []
        );
        
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
                    isLiked: uid ? data.likedBy?.includes(uid) : false,
                    authorPrivate: data.authorPrivate === true,
                    ageRestricted: data.ageRestricted === true,
                    videoTemplate: typeof data.videoTemplate === 'string' ? data.videoTemplate : 'none',
                    coverText: typeof data.coverText === 'string' ? data.coverText : '',
                    coverSticker: typeof data.coverSticker === 'string' ? data.coverSticker : '',
                    coverColor: this.normalizeCoverColor(data.coverColor)
                };
            };
            const canViewVideo = (video) => {
                if (!video) return false;
                if (!allowAdultContent && video.ageRestricted === true) return false;
                if (video.authorPrivate !== true) return true;
                const authorUid = video.uid ? String(video.uid) : '';
                if (!authorUid) return false;
                if (currentUid && currentUid === authorUid) return true;
                return viewerSubscriptions.has(authorUid);
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
                return videos.filter(canViewVideo);
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
                    .filter(canViewVideo)
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
                    isLiked: uid ? Array.isArray(data.likedBy) && data.likedBy.includes(uid) : false,
                    authorPrivate: data.authorPrivate === true,
                    ageRestricted: data.ageRestricted === true,
                    videoTemplate: typeof data.videoTemplate === 'string' ? data.videoTemplate : 'none',
                    coverText: typeof data.coverText === 'string' ? data.coverText : '',
                    coverSticker: typeof data.coverSticker === 'string' ? data.coverSticker : '',
                    coverColor: this.normalizeCoverColor(data.coverColor)
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
            const isOwn = !!(currentUid && String(currentUid) === String(uid));
            const allowAdultContent = this.isAdultContentAllowed(this.currentUser);
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
                    isLiked: currentUid ? Array.isArray(data.likedBy) && data.likedBy.includes(currentUid) : false,
                    authorPrivate: data.authorPrivate === true,
                    ageRestricted: data.ageRestricted === true,
                    videoTemplate: typeof data.videoTemplate === 'string' ? data.videoTemplate : 'none',
                    coverText: typeof data.coverText === 'string' ? data.coverText : '',
                    coverSticker: typeof data.coverSticker === 'string' ? data.coverSticker : '',
                    coverColor: this.normalizeCoverColor(data.coverColor)
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
            if (!isOwn && !allowAdultContent) {
                videos = videos.filter(v => v.ageRestricted !== true);
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
                        await this.awardCoins(authorUid, 1, 'video_like_received', {
                            videoFirestoreId: firestoreId,
                            fromUid: uid
                        });
                    } catch (notifError) {
                        console.warn('⚠️ Не удалось отправить уведомление/монеты за лайк:', notifError?.message || notifError);
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
                    await this.awardCoins(authorUid, 2, 'video_comment_received', {
                        videoFirestoreId: firestoreId,
                        fromUid: uid
                    });
                }
            } catch (notifError) {
                console.warn('⚠️ Не удалось отправить уведомление/монеты за комментарий:', notifError?.message || notifError);
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

    // ===================== STORIES (24H) =====================

    async uploadStory(file, { caption = '' } = {}) {
        const uid = this.getCurrentUid();
        if (!uid) throw new Error('Необходимо авторизироваться');
        if (!file) throw new Error('Файл истории не выбран');

        const mime = String(file.type || '').toLowerCase();
        const isImage = mime.startsWith('image/');
        const isVideo = mime.startsWith('video/');
        if (!isImage && !isVideo) {
            throw new Error('Для истории поддерживаются только фото и видео');
        }
        if ((file.size || 0) > 20 * 1024 * 1024) {
            throw new Error('Файл истории слишком большой (макс. 20MB)');
        }

        const profile = await this.getUserProfile(uid);
        const author = profile?.name || 'user';
        const avatar = this.sanitizeAvatarForPublicPayload(profile?.avatar, author);
        const uploaded = await this.uploadMedia(file, `stories/${uid}`, {
            uid,
            purpose: 'story'
        });

        const now = Date.now();
        const storyDoc = {
            uid,
            author,
            avatar,
            mediaUrl: uploaded.url,
            mediaMime: file.type || '',
            mediaName: file.name || 'story',
            storagePath: uploaded.storagePath,
            storageProvider: uploaded.storageProvider,
            caption: String(caption || '').trim().slice(0, 180),
            createdAt: now,
            expiresAt: now + (24 * 60 * 60 * 1000),
            viewsCount: 0,
            active: true,
            updatedAt: now
        };

        const ref = await this.db.collection('stories').add(storyDoc);
        return { id: ref.id, ...storyDoc };
    }

    async getActiveStories(limit = 60) {
        const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 60, 200));
        const now = Date.now();

        const mapStoryDoc = (doc) => {
            const data = doc.data() || {};
            return {
                id: doc.id,
                ...data,
                createdAt: this.normalizeTimestamp(data.createdAt),
                expiresAt: this.normalizeTimestamp(data.expiresAt),
                viewsCount: Math.max(0, parseInt(data.viewsCount, 10) || 0)
            };
        };

        try {
            let stories = [];
            try {
                const snapshot = await this.db.collection('stories')
                    .where('expiresAt', '>', now)
                    .orderBy('expiresAt', 'asc')
                    .limit(safeLimit)
                    .get();
                stories = snapshot.docs.map(mapStoryDoc);
            } catch (indexError) {
                console.warn('⚠️ getActiveStories(): query with where+orderBy failed, using fallback query:', indexError?.message || indexError);
                const fallbackLimit = Math.max(safeLimit * 3, safeLimit);
                const snapshot = await this.db.collection('stories')
                    .orderBy('createdAt', 'desc')
                    .limit(fallbackLimit)
                    .get();
                stories = snapshot.docs
                    .map(mapStoryDoc)
                    .filter(story => (parseInt(story.expiresAt, 10) || 0) > now)
                    .slice(0, safeLimit);
            }

            return stories
                .filter(story => !!(story && story.uid && story.mediaUrl))
                .sort((a, b) => (parseInt(a.createdAt, 10) || 0) - (parseInt(b.createdAt, 10) || 0));
        } catch (error) {
            console.error('❌ Ошибка загрузки активных историй:', error);
            return [];
        }
    }

    async markStorySeen(storyId) {
        const uid = this.getCurrentUid();
        if (!uid || !storyId) return false;

        try {
            const storyRef = this.db.collection('stories').doc(String(storyId));
            const viewRef = storyRef.collection('views').doc(uid);
            const viewDoc = await viewRef.get();
            if (viewDoc.exists) return false;

            const now = Date.now();
            const batch = this.db.batch();
            batch.set(viewRef, {
                uid,
                seenAt: now,
                createdAt: now
            });
            batch.set(storyRef, {
                viewsCount: firebase.firestore.FieldValue.increment(1),
                updatedAt: now
            }, { merge: true });
            await batch.commit();
            return true;
        } catch (error) {
            console.error('❌ Ошибка отметки просмотра истории:', error);
            return false;
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

    // ===================== COINS =====================

    async changeCoins(uid, delta, reason = 'manual', meta = {}) {
        const safeUid = uid ? String(uid) : '';
        if (!safeUid) throw new Error('Пользователь не найден');
        const safeDelta = parseInt(delta, 10) || 0;

        const userRef = this.db.collection('users').doc(safeUid);
        const txRef = this.db.collection('coinTransactions').doc();

        const summary = await this.db.runTransaction(async (transaction) => {
            const snap = await transaction.get(userRef);
            if (!snap.exists) throw new Error('Профиль пользователя не найден');

            const data = snap.data() || {};
            const previous = Math.max(0, parseInt(data.coins, 10) || 0);
            const next = Math.max(0, previous + safeDelta);
            const applied = next - previous;
            if (applied === 0) {
                return { previous, next, applied };
            }

            const now = Date.now();
            transaction.set(userRef, {
                coins: next,
                updatedAt: new Date()
            }, { merge: true });
            transaction.set(txRef, {
                uid: safeUid,
                delta: applied,
                reason: String(reason || 'manual'),
                meta: meta && typeof meta === 'object' ? meta : {},
                timestamp: now,
                createdAt: now
            });

            return { previous, next, applied };
        });

        if (this.currentUser && String(this.currentUser.uid || '') === safeUid) {
            this.currentUser.coins = summary.next;
        }

        return {
            uid: safeUid,
            previous: summary.previous,
            coins: summary.next,
            delta: summary.applied,
            reason: String(reason || 'manual')
        };
    }

    async awardCoins(uid, amount = 1, reason = 'award', meta = {}) {
        const safeAmount = Math.max(1, parseInt(amount, 10) || 0);
        return this.changeCoins(uid, safeAmount, reason, meta);
    }

    async spendCoins(uid, amount = 1, reason = 'spend', meta = {}) {
        const safeUid = uid ? String(uid) : '';
        if (!safeUid) throw new Error('Пользователь не найден');
        const safeAmount = Math.max(1, parseInt(amount, 10) || 0);

        const userRef = this.db.collection('users').doc(safeUid);
        const txRef = this.db.collection('coinTransactions').doc();

        const summary = await this.db.runTransaction(async (transaction) => {
            const snap = await transaction.get(userRef);
            if (!snap.exists) throw new Error('Профиль пользователя не найден');

            const data = snap.data() || {};
            const previous = Math.max(0, parseInt(data.coins, 10) || 0);
            if (previous < safeAmount) {
                throw new Error('Недостаточно монет');
            }
            const next = previous - safeAmount;
            const now = Date.now();

            transaction.set(userRef, {
                coins: next,
                updatedAt: new Date()
            }, { merge: true });
            transaction.set(txRef, {
                uid: safeUid,
                delta: -safeAmount,
                reason: String(reason || 'spend'),
                meta: meta && typeof meta === 'object' ? meta : {},
                timestamp: now,
                createdAt: now
            });

            return { previous, next };
        });

        if (this.currentUser && String(this.currentUser.uid || '') === safeUid) {
            this.currentUser.coins = summary.next;
        }

        return {
            uid: safeUid,
            previous: summary.previous,
            coins: summary.next,
            delta: -safeAmount,
            reason: String(reason || 'spend')
        };
    }

    // ===================== LIVE SESSIONS =====================

    normalizeLiveSessionRecord(data = {}, id = null) {
        const source = data || {};
        const coHosts = Array.isArray(source.coHosts)
            ? Array.from(new Set(source.coHosts.map(v => String(v)).filter(Boolean))).slice(0, 2)
            : [];
        const participants = Array.isArray(source.participants)
            ? Array.from(new Set(source.participants.map(v => String(v)).filter(Boolean)))
            : [];
        return {
            id: id || source.id || null,
            ownerUid: source.ownerUid ? String(source.ownerUid) : null,
            ownerName: source.ownerName || source.owner || 'user',
            ownerAvatar: source.ownerAvatar || this.buildUiAvatar(source.ownerName || 'user'),
            title: String(source.title || '').trim() || 'Прямой эфир',
            status: source.status === 'ended' ? 'ended' : 'live',
            coHosts,
            participants,
            viewersCount: Math.max(0, parseInt(source.viewersCount, 10) || participants.length),
            maxCoHosts: Math.max(1, Math.min(2, parseInt(source.maxCoHosts, 10) || 2)),
            createdAt: this.normalizeTimestamp(source.createdAt),
            updatedAt: this.normalizeTimestamp(source.updatedAt),
            endedAt: this.normalizeTimestamp(source.endedAt)
        };
    }

    async createLiveSession({ title = '' } = {}) {
        const uid = this.getCurrentUid();
        if (!uid) throw new Error('Необходимо авторизироваться');

        const existing = await this.db.collection('liveSessions')
            .where('ownerUid', '==', uid)
            .where('status', '==', 'live')
            .limit(1)
            .get();
        if (!existing.empty) {
            throw new Error('У вас уже идет прямой эфир');
        }

        const ownerProfile = (this.currentUser && this.currentUser.uid === uid)
            ? this.currentUser
            : await this.getUserProfile(uid);
        const ownerName = ownerProfile?.name || 'user';
        const ownerAvatar = this.sanitizeAvatarForPublicPayload(ownerProfile?.avatar, ownerName);
        const safeTitle = String(title || '').trim().slice(0, 80) || `Эфир @${ownerName}`;
        const now = Date.now();
        const payload = {
            ownerUid: uid,
            ownerName,
            ownerAvatar,
            title: safeTitle,
            status: 'live',
            coHosts: [],
            participants: [uid],
            viewersCount: 1,
            maxCoHosts: 2,
            createdAt: now,
            updatedAt: now,
            endedAt: null
        };

        const ref = await this.db.collection('liveSessions').add(payload);

        try {
            await this.db.collection('users').doc(uid).set({
                'liveStats.started': firebase.firestore.FieldValue.increment(1),
                updatedAt: new Date()
            }, { merge: true });
            if (this.currentUser && this.currentUser.uid === uid) {
                const stats = this.currentUser.liveStats || {};
                this.currentUser.liveStats = {
                    ...stats,
                    started: (parseInt(stats.started, 10) || 0) + 1
                };
            }
        } catch (statsError) {
            console.warn('⚠️ Не удалось обновить liveStats.started:', statsError?.message || statsError);
        }

        return this.normalizeLiveSessionRecord(payload, ref.id);
    }

    async listLiveSessions(limit = 20) {
        const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 80));
        try {
            let sessions = [];
            try {
                const snapshot = await this.db.collection('liveSessions')
                    .where('status', '==', 'live')
                    .orderBy('createdAt', 'desc')
                    .limit(safeLimit)
                    .get();
                sessions = snapshot.docs.map(doc => this.normalizeLiveSessionRecord(doc.data(), doc.id));
            } catch (indexError) {
                console.warn('⚠️ listLiveSessions(): fallback query:', indexError?.message || indexError);
                const snapshot = await this.db.collection('liveSessions')
                    .orderBy('createdAt', 'desc')
                    .limit(Math.max(safeLimit * 3, 24))
                    .get();
                sessions = snapshot.docs
                    .map(doc => this.normalizeLiveSessionRecord(doc.data(), doc.id))
                    .filter(session => session.status === 'live')
                    .slice(0, safeLimit);
            }
            return sessions;
        } catch (error) {
            console.error('❌ Ошибка загрузки live-сессий:', error);
            return [];
        }
    }

    async joinLiveSession(sessionId, { asCoHost = false } = {}) {
        const uid = this.getCurrentUid();
        if (!uid) throw new Error('Необходимо авторизироваться');
        if (!sessionId) throw new Error('Эфир не найден');

        const ref = this.db.collection('liveSessions').doc(String(sessionId));
        const summary = await this.db.runTransaction(async (transaction) => {
            const snap = await transaction.get(ref);
            if (!snap.exists) throw new Error('Эфир не найден');

            const session = this.normalizeLiveSessionRecord(snap.data(), snap.id);
            if (session.status !== 'live') throw new Error('Эфир уже завершен');

            const participantsSet = new Set(session.participants || []);
            const wasParticipant = participantsSet.has(uid);
            participantsSet.add(uid);

            const coHostsSet = new Set(session.coHosts || []);
            if (asCoHost && uid !== session.ownerUid) {
                if (!coHostsSet.has(uid) && coHostsSet.size >= 2) {
                    throw new Error('Слоты со-ведущих заняты');
                }
                coHostsSet.add(uid);
            }

            const nextParticipants = Array.from(participantsSet);
            const nextCoHosts = Array.from(coHostsSet).slice(0, 2);
            transaction.set(ref, {
                participants: nextParticipants,
                coHosts: nextCoHosts,
                viewersCount: nextParticipants.length,
                updatedAt: Date.now()
            }, { merge: true });

            return {
                ownerUid: session.ownerUid,
                wasParticipant,
                joinedAsCoHost: nextCoHosts.includes(uid)
            };
        });

        if (!summary.wasParticipant) {
            try {
                await this.db.collection('users').doc(uid).set({
                    'liveStats.joined': firebase.firestore.FieldValue.increment(1),
                    updatedAt: new Date()
                }, { merge: true });
                if (this.currentUser && this.currentUser.uid === uid) {
                    const stats = this.currentUser.liveStats || {};
                    this.currentUser.liveStats = {
                        ...stats,
                        joined: (parseInt(stats.joined, 10) || 0) + 1
                    };
                }
            } catch (statsError) {
                console.warn('⚠️ Не удалось обновить liveStats.joined:', statsError?.message || statsError);
            }
        }

        const updated = await ref.get();
        return this.normalizeLiveSessionRecord(updated.data(), updated.id);
    }

    async leaveLiveSession(sessionId) {
        const uid = this.getCurrentUid();
        if (!uid) throw new Error('Необходимо авторизироваться');
        if (!sessionId) throw new Error('Эфир не найден');

        const ref = this.db.collection('liveSessions').doc(String(sessionId));
        await this.db.runTransaction(async (transaction) => {
            const snap = await transaction.get(ref);
            if (!snap.exists) return;
            const session = this.normalizeLiveSessionRecord(snap.data(), snap.id);
            if (session.status !== 'live') return;

            if (session.ownerUid === uid) {
                transaction.set(ref, {
                    status: 'ended',
                    endedAt: Date.now(),
                    updatedAt: Date.now(),
                    participants: [],
                    coHosts: [],
                    viewersCount: 0
                }, { merge: true });
                return;
            }

            const nextParticipants = (session.participants || []).filter(v => String(v) !== String(uid));
            const nextCoHosts = (session.coHosts || []).filter(v => String(v) !== String(uid));
            transaction.set(ref, {
                participants: nextParticipants,
                coHosts: nextCoHosts,
                viewersCount: nextParticipants.length,
                updatedAt: Date.now()
            }, { merge: true });
        });

        const updated = await ref.get();
        return updated.exists ? this.normalizeLiveSessionRecord(updated.data(), updated.id) : null;
    }

    async endLiveSession(sessionId) {
        const uid = this.getCurrentUid();
        if (!uid) throw new Error('Необходимо авторизироваться');
        if (!sessionId) throw new Error('Эфир не найден');

        const ref = this.db.collection('liveSessions').doc(String(sessionId));
        const snap = await ref.get();
        if (!snap.exists) throw new Error('Эфир не найден');
        const session = this.normalizeLiveSessionRecord(snap.data(), snap.id);
        const canEnd = String(session.ownerUid || '') === String(uid) || this.isCurrentUserAdmin();
        if (!canEnd) throw new Error('Только владелец может завершить эфир');

        await ref.set({
            status: 'ended',
            endedAt: Date.now(),
            updatedAt: Date.now(),
            participants: [],
            coHosts: [],
            viewersCount: 0
        }, { merge: true });

        const updated = await ref.get();
        return this.normalizeLiveSessionRecord(updated.data(), updated.id);
    }

    subscribeToLiveSessions(callback, { limit = 20 } = {}) {
        if (typeof callback !== 'function') return () => {};
        const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 20, 80));

        return this.db.collection('liveSessions')
            .orderBy('createdAt', 'desc')
            .limit(safeLimit)
            .onSnapshot((snapshot) => {
                const sessions = snapshot.docs
                    .map(doc => this.normalizeLiveSessionRecord(doc.data(), doc.id))
                    .filter(session => session.status === 'live');
                callback(sessions);
            }, (error) => {
                console.error('Ошибка подписки на live-сессии:', error);
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
            const [currentSnap, targetSnap] = await Promise.all([
                currentUserRef.get(),
                targetUserRef.get()
            ]);
            if (!currentSnap.exists) throw new Error('Текущий профиль не найден');
            if (!targetSnap.exists) throw new Error('Пользователь не найден');

            const currentData = this.normalizeUserRecord(currentSnap.data(), currentUid);
            const targetData = this.normalizeUserRecord(targetSnap.data(), targetUid);

            if (Array.isArray(currentData.subscriptions) && currentData.subscriptions.includes(targetUid)) {
                return { status: 'already_subscribed' };
            }

            const targetSubscribers = Array.isArray(targetData.subscribers) ? targetData.subscribers.map(String) : [];
            const targetRequests = Array.isArray(targetData.followRequests) ? targetData.followRequests.map(String) : [];
            const targetIsPrivate = targetData.privateAccount === true;
            const alreadyApproved = targetSubscribers.includes(String(currentUid));

            if (targetIsPrivate && !alreadyApproved) {
                if (!targetRequests.includes(String(currentUid))) {
                    await targetUserRef.set({
                        followRequests: firebase.firestore.FieldValue.arrayUnion(String(currentUid)),
                        updatedAt: new Date()
                    }, { merge: true });

                    try {
                        const actor = this.currentUser || await this.getUserProfile(currentUid);
                        await this.addNotification(targetUid, 'follow_request', {
                            fromUid: currentUid,
                            fromUser: actor?.name || 'user'
                        });
                    } catch (notifError) {
                        console.warn('⚠️ Не удалось отправить уведомление о заявке на подписку:', notifError?.message || notifError);
                    }
                }
                return { status: 'requested' };
            }

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
            return { status: 'subscribed' };
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

            // Если была заявка в приватный аккаунт, тоже удаляем.
            await targetUserRef.set({
                followRequests: firebase.firestore.FieldValue.arrayRemove(String(currentUid)),
                updatedAt: new Date()
            }, { merge: true });

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

    async requestFollow(targetUid) {
        return this.subscribe(targetUid);
    }

    async approveFollowRequest(requestUid) {
        const currentUid = this.getCurrentUid();
        if (!currentUid) throw new Error('Необходимо авторизироваться');
        if (!requestUid) throw new Error('Пользователь не найден');
        if (String(requestUid) === String(currentUid)) throw new Error('Нельзя одобрить заявку самого себя');

        const currentRef = this.db.collection('users').doc(currentUid);
        const requestRef = this.db.collection('users').doc(String(requestUid));
        const [currentSnap, requestSnap] = await Promise.all([
            currentRef.get(),
            requestRef.get()
        ]);
        if (!currentSnap.exists) throw new Error('Ваш профиль не найден');
        if (!requestSnap.exists) throw new Error('Профиль подписчика не найден');

        const currentData = this.normalizeUserRecord(currentSnap.data(), currentUid);
        const requests = Array.isArray(currentData.followRequests) ? currentData.followRequests.map(String) : [];
        if (!requests.includes(String(requestUid))) return false;

        const batch = this.db.batch();
        batch.set(currentRef, {
            followRequests: firebase.firestore.FieldValue.arrayRemove(String(requestUid)),
            subscribers: firebase.firestore.FieldValue.arrayUnion(String(requestUid)),
            updatedAt: new Date()
        }, { merge: true });
        batch.set(requestRef, {
            subscriptions: firebase.firestore.FieldValue.arrayUnion(String(currentUid)),
            updatedAt: new Date()
        }, { merge: true });
        await batch.commit();

        if (this.currentUser && this.currentUser.uid === currentUid) {
            this.currentUser.followRequests = Array.isArray(this.currentUser.followRequests)
                ? this.currentUser.followRequests.filter(v => String(v) !== String(requestUid))
                : [];
        }

        try {
            const actor = this.currentUser || await this.getUserProfile(currentUid);
            await this.addNotification(String(requestUid), 'follow_approved', {
                fromUid: currentUid,
                fromUser: actor?.name || 'user'
            });
        } catch (notifError) {
            console.warn('⚠️ Не удалось отправить уведомление о принятии заявки:', notifError?.message || notifError);
        }

        return true;
    }

    async rejectFollowRequest(requestUid) {
        const currentUid = this.getCurrentUid();
        if (!currentUid) throw new Error('Необходимо авторизироваться');
        if (!requestUid) throw new Error('Пользователь не найден');

        await this.db.collection('users').doc(currentUid).set({
            followRequests: firebase.firestore.FieldValue.arrayRemove(String(requestUid)),
            updatedAt: new Date()
        }, { merge: true });

        if (this.currentUser && this.currentUser.uid === currentUid) {
            this.currentUser.followRequests = Array.isArray(this.currentUser.followRequests)
                ? this.currentUser.followRequests.filter(v => String(v) !== String(requestUid))
                : [];
        }

        try {
            const actor = this.currentUser || await this.getUserProfile(currentUid);
            await this.addNotification(String(requestUid), 'follow_rejected', {
                fromUid: currentUid,
                fromUser: actor?.name || 'user'
            });
        } catch (notifError) {
            console.warn('⚠️ Не удалось отправить уведомление об отклонении заявки:', notifError?.message || notifError);
        }

        return true;
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

    // ===================== GIFTS / DONATIONS =====================

    async sendGift({
        toUid,
        toUser = '',
        amount = 50,
        message = '',
        sourceVideoId = null,
        sourceVideoFirestoreId = null,
        context = 'video'
    } = {}) {
        const fromUid = this.getCurrentUid();
        if (!fromUid) throw new Error('Необходимо авторизироваться');
        if (!toUid) throw new Error('Получатель не найден');
        if (String(fromUid) === String(toUid)) {
            throw new Error('Нельзя отправить подарок самому себе');
        }

        const safeAmount = Math.max(1, Math.min(100000, parseInt(amount, 10) || 0));
        if (!safeAmount) throw new Error('Некорректная сумма подарка');

        const safeMessage = String(message || '').trim().slice(0, 160);
        const now = Date.now();
        const fromProfile = this.currentUser && this.currentUser.uid === fromUid
            ? this.currentUser
            : await this.getUserProfile(fromUid);
        const targetProfile = await this.getUserProfile(toUid);

        const payload = {
            fromUid,
            fromUser: fromProfile?.name || 'user',
            toUid: String(toUid),
            toUser: targetProfile?.name || String(toUser || 'user'),
            amount: safeAmount,
            message: safeMessage,
            context: String(context || 'video'),
            sourceVideoId: sourceVideoId || null,
            sourceVideoFirestoreId: sourceVideoFirestoreId || null,
            timestamp: now,
            createdAt: now
        };

        const giftRef = await this.db.collection('gifts').add(payload);

        const senderRef = this.db.collection('users').doc(fromUid);
        const targetRef = this.db.collection('users').doc(String(toUid));
        const batch = this.db.batch();
        batch.set(senderRef, {
            giftsSentTotal: firebase.firestore.FieldValue.increment(safeAmount),
            giftsSentCount: firebase.firestore.FieldValue.increment(1),
            updatedAt: new Date()
        }, { merge: true });
        batch.set(targetRef, {
            giftsReceivedTotal: firebase.firestore.FieldValue.increment(safeAmount),
            giftsReceivedCount: firebase.firestore.FieldValue.increment(1),
            updatedAt: new Date()
        }, { merge: true });
        await batch.commit();

        if (this.currentUser && this.currentUser.uid === fromUid) {
            this.currentUser.giftsSentTotal = (parseInt(this.currentUser.giftsSentTotal, 10) || 0) + safeAmount;
            this.currentUser.giftsSentCount = (parseInt(this.currentUser.giftsSentCount, 10) || 0) + 1;
        }

        try {
            await this.addNotification(String(toUid), 'gift', {
                fromUid,
                fromUser: fromProfile?.name || 'user',
                amount: safeAmount,
                message: safeMessage,
                context: payload.context,
                videoId: sourceVideoId || null
            });
        } catch (notifError) {
            console.warn('⚠️ Не удалось отправить уведомление о подарке:', notifError?.message || notifError);
        }

        return { id: giftRef.id, ...payload };
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

    // ===================== SECURITY SESSIONS =====================

    generateSessionId() {
        const random = Math.random().toString(36).slice(2, 10);
        return `sess_${Date.now().toString(36)}_${random}`;
    }

    getCurrentSessionId({ createIfMissing = true } = {}) {
        if (this.cachedSessionId) return this.cachedSessionId;

        let stored = null;
        try {
            const raw = localStorage.getItem(this.sessionStorageKey);
            if (raw) {
                if (raw.trim().startsWith('{')) {
                    const parsed = JSON.parse(raw);
                    stored = parsed && parsed.id ? parsed : null;
                } else {
                    stored = { id: String(raw), startedAt: Date.now() };
                }
            }
        } catch (_) {}

        if (stored && stored.id) {
            this.cachedSessionId = String(stored.id);
            this.sessionStartedAt = parseInt(stored.startedAt, 10) || Date.now();
            return this.cachedSessionId;
        }

        if (!createIfMissing) return null;

        this.cachedSessionId = this.generateSessionId();
        this.sessionStartedAt = Date.now();
        try {
            localStorage.setItem(this.sessionStorageKey, JSON.stringify({
                id: this.cachedSessionId,
                startedAt: this.sessionStartedAt
            }));
        } catch (_) {}
        return this.cachedSessionId;
    }

    buildDeviceInfo() {
        const ua = (typeof navigator !== 'undefined' && navigator.userAgent) ? navigator.userAgent : '';
        const platform = (typeof navigator !== 'undefined' && navigator.platform) ? navigator.platform : '';
        const language = (typeof navigator !== 'undefined' && navigator.language) ? navigator.language : '';

        let browser = 'Браузер';
        if (/edg/i.test(ua)) browser = 'Edge';
        else if (/opr|opera/i.test(ua)) browser = 'Opera';
        else if (/chrome/i.test(ua)) browser = 'Chrome';
        else if (/firefox/i.test(ua)) browser = 'Firefox';
        else if (/safari/i.test(ua)) browser = 'Safari';

        let os = 'Неизвестная ОС';
        if (/android/i.test(ua)) os = 'Android';
        else if (/iphone|ipad|ipod/i.test(ua)) os = 'iOS';
        else if (/windows nt/i.test(ua)) os = 'Windows';
        else if (/mac os x/i.test(ua)) os = 'macOS';
        else if (/linux/i.test(ua)) os = 'Linux';

        const deviceType = /mobile|iphone|android/i.test(ua) ? 'Телефон' : 'ПК';
        return {
            userAgent: ua,
            platform,
            language,
            deviceName: `${deviceType}: ${browser} • ${os}`
        };
    }

    async touchCurrentSession({ online = true, forceCreate = false } = {}) {
        const uid = this.getCurrentUid();
        if (!uid) return null;

        const sessionId = this.getCurrentSessionId({ createIfMissing: true });
        if (!sessionId) return null;

        const now = Date.now();
        const device = this.buildDeviceInfo();
        const docId = `${uid}_${sessionId}`;
        const payload = {
            uid,
            sessionId,
            online: !!online,
            revoked: false,
            deviceName: device.deviceName,
            platform: device.platform || '',
            language: device.language || '',
            userAgent: device.userAgent || '',
            createdAt: this.sessionStartedAt || now,
            lastActive: now,
            updatedAt: now
        };
        if (!online) payload.lastSeen = now;
        if (forceCreate) payload.createdAt = this.sessionStartedAt || now;

        await this.db.collection('userSessions').doc(docId).set(payload, { merge: true });
        return { id: docId, ...payload };
    }

    async getUserSessions(limit = 40) {
        const uid = this.getCurrentUid();
        if (!uid) return [];

        const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 40, 200));
        const currentSessionId = this.getCurrentSessionId({ createIfMissing: true });
        const mapDoc = (doc) => {
            const data = doc.data() || {};
            const sessionId = data.sessionId || String(doc.id || '').replace(`${uid}_`, '');
            const lastActive = this.normalizeTimestamp(data.lastActive || data.updatedAt || data.createdAt);
            return {
                id: doc.id,
                ...data,
                sessionId,
                createdAt: this.normalizeTimestamp(data.createdAt),
                updatedAt: this.normalizeTimestamp(data.updatedAt),
                lastActive,
                lastSeen: this.normalizeTimestamp(data.lastSeen),
                isCurrent: !!(currentSessionId && sessionId && String(currentSessionId) === String(sessionId))
            };
        };

        try {
            let sessions = [];
            try {
                const snapshot = await this.db.collection('userSessions')
                    .where('uid', '==', uid)
                    .orderBy('lastActive', 'desc')
                    .limit(safeLimit)
                    .get();
                sessions = snapshot.docs.map(mapDoc);
            } catch (indexError) {
                console.warn('⚠️ getUserSessions(): query with where+orderBy failed, using fallback query:', indexError?.message || indexError);
                const snapshot = await this.db.collection('userSessions')
                    .where('uid', '==', uid)
                    .limit(Math.max(safeLimit * 2, safeLimit))
                    .get();
                sessions = snapshot.docs.map(mapDoc);
            }

            sessions.sort((a, b) => (parseInt(b.lastActive, 10) || 0) - (parseInt(a.lastActive, 10) || 0));
            return sessions.slice(0, safeLimit);
        } catch (error) {
            console.error('❌ Ошибка загрузки сессий пользователя:', error);
            return [];
        }
    }

    async revokeSession(sessionId) {
        const uid = this.getCurrentUid();
        if (!uid || !sessionId) throw new Error('Сессия не найдена');

        const currentSessionId = this.getCurrentSessionId({ createIfMissing: true });
        if (currentSessionId && String(currentSessionId) === String(sessionId)) {
            throw new Error('Текущую сессию нельзя завершить здесь');
        }

        const docId = `${uid}_${sessionId}`;
        await this.db.collection('userSessions').doc(docId).set({
            online: false,
            revoked: true,
            revokedAt: Date.now(),
            updatedAt: Date.now()
        }, { merge: true });
        return true;
    }

    async revokeOtherSessions() {
        const uid = this.getCurrentUid();
        if (!uid) throw new Error('Необходимо авторизироваться');

        const currentSessionId = this.getCurrentSessionId({ createIfMissing: true });
        const sessions = await this.getUserSessions(200);
        const targets = sessions.filter(row => String(row.sessionId || '') !== String(currentSessionId || ''));
        if (!targets.length) return 0;

        let updated = 0;
        let batch = this.db.batch();
        let ops = 0;
        const now = Date.now();

        for (const row of targets) {
            if (!row || !row.id) continue;
            batch.set(this.db.collection('userSessions').doc(row.id), {
                online: false,
                revoked: true,
                revokedAt: now,
                updatedAt: now
            }, { merge: true });
            updated += 1;
            ops += 1;

            if (ops >= 400) {
                await batch.commit();
                batch = this.db.batch();
                ops = 0;
            }
        }

        if (ops > 0) {
            await batch.commit();
        }

        return updated;
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
            if (window.app && typeof window.app.handleFirebaseReady === 'function') {
                window.app.handleFirebaseReady({ forceReloadFeed: true }).catch((readyError) => {
                    console.warn('⚠️ Не удалось синхронизировать UI после инициализации Firebase:', readyError?.message || readyError);
                });
            }
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





