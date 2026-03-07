/**
 * AdvancedDataService
 * Управление данными приложения (видео, пользователи, настройки)
 */
class AdvancedDataService {
    constructor() {
        this.STORAGE_KEY = 'reelgram_advanced_data';
        this.SETTINGS_KEY = 'reelgram_settings';
        this.feedCacheTtlMs = 15000;
        
        this.filters = [
            { id: 'none', name: 'Оригинал', css: '' },
            { id: 'vibrant', name: 'Яркий', css: 'contrast(1.2) saturate(1.5)' },
            { id: 'warm', name: 'Теплый', css: 'sepia(0.5) hue-rotate(-30deg)' },
            { id: 'cool', name: 'Холодный', css: 'sepia(0.3) hue-rotate(180deg) brightness(1.1)' },
            { id: 'vintage', name: 'Винтаж', css: 'sepia(0.7) contrast(1.1)' },
            { id: 'bw', name: 'Ч/Б', css: 'grayscale(1) contrast(1.2)' }
        ];

        this.videoFilters = [
            { id: 'none', name: 'Оригинал', class: '' },
            { id: 'filter-1', name: 'Яркий', class: 'filter-1' },
            { id: 'filter-2', name: 'Теплый', class: 'filter-2' },
            { id: 'filter-3', name: 'Холодный', class: 'filter-3' },
            { id: 'filter-4', name: 'Винтаж', class: 'filter-4' }
        ];

        this.init();
    }

    init() {
        // Удалено всё, что связано с localStorage
        localStorage.removeItem('reelgram_advanced_auth');
        this.userVideos = [];
        this.settings = {
            theme: 'dark',
            autoplay: true,
            notifications: true,
            videoQuality: 'auto'
        };
        this.notifications = this.getDefaultNotifications();
        this.messages = this.getDefaultMessages();
        this.userPresence = {};
        this.typingState = {};
        this.disableVideoCachePersistence = false;
        this.feedCache = {
            fetchedAt: 0,
            fetchedCount: 0,
            hasMore: true
        };
    }

    getDefaultNotifications() {
        return [];
    }

    getDefaultMessages() {
        return [];
    }

    saveSettings() {
        // Удалено сохранение настроек в localStorage
    }

    persistVideoCache() {
        if (this.disableVideoCachePersistence) return;
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.userVideos));
        } catch (error) {
            this.disableVideoCachePersistence = true;
            // On some devices localStorage quota is tiny. Keep app working without hard failure.
            console.warn('⚠️ Не удалось сохранить кэш видео в localStorage:', error?.message || error);
        }
    }

    invalidateFeedCache() {
        this.feedCache = {
            fetchedAt: 0,
            fetchedCount: 0,
            hasMore: true
        };
    }

    syncFeedCacheWithLocal({ hasMore = null } = {}) {
        this.feedCache.fetchedAt = Date.now();
        this.feedCache.fetchedCount = Array.isArray(this.userVideos) ? this.userVideos.length : 0;
        if (typeof hasMore === 'boolean') {
            this.feedCache.hasMore = hasMore;
        }
    }

    rememberFetchedFeed(videos, requestedLimit) {
        const list = Array.isArray(videos) ? videos : [];
        this.userVideos = list;
        this.feedCache = {
            fetchedAt: Date.now(),
            fetchedCount: list.length,
            // If we got fewer items than requested, we're likely at the end.
            hasMore: list.length >= Math.max(1, parseInt(requestedLimit, 10) || 0)
        };
    }

    async getFeed(page = 0, limit = 5) {
        const start = page * limit;
        const end = start + limit;

        // Firebase source-of-truth: fetch videos from Firestore so they persist after reload.
        try {
            if (typeof firebaseService !== 'undefined'
                && firebaseService
                && typeof firebaseService.isInitialized === 'function'
                && firebaseService.isInitialized()
                && typeof firebaseService.getFeed === 'function') {
                // Without cursor pagination we still need top-N requests.
                // Cache recent fetches so infinite scroll doesn't refetch from zero on every page.
                const requiredCount = end + 1;
                const cachedCount = this.feedCache?.fetchedCount || 0;
                const cacheAge = Date.now() - (this.feedCache?.fetchedAt || 0);
                const cacheFresh = cacheAge >= 0 && cacheAge < this.feedCacheTtlMs;
                const hasEnoughCached = this.userVideos.length >= requiredCount;

                if (!(cacheFresh && hasEnoughCached)) {
                    const fetchLimit = Math.max(requiredCount, cachedCount + 24, limit * 3, 24);
                    const feedVideos = await firebaseService.getFeed(fetchLimit);
                    this.rememberFetchedFeed(feedVideos, fetchLimit);
                }

                const hasMore = this.userVideos.length > end || !!this.feedCache.hasMore;
                return {
                    videos: this.userVideos.slice(start, end),
                    hasMore,
                    total: this.userVideos.length
                };
            }
        } catch (error) {
            console.error('Ошибка загрузки ленты из Firebase:', error);
        }

        // Local fallback
        await new Promise(resolve => setTimeout(resolve, 300));

        const allVideos = [...this.userVideos];
        allVideos.sort((a, b) => b.timestamp - a.timestamp);

        return {
            videos: allVideos.slice(start, end),
            hasMore: end < allVideos.length,
            total: allVideos.length
        };
    }

    getUserProfile(userName = null) {
        const user = userName ? 
            this.getAllUsers().find(u => u.name === userName) : 
            this.getCurrentUser();
        
        if (!user) return null;
        
        const userUid = user.uid ? String(user.uid) : null;
        const userVideos = this.userVideos.filter(v => {
            if (userUid && v && v.uid) {
                return String(v.uid) === userUid;
            }
            return v && v.author === user.name;
        });
        const totalLikes = userVideos.reduce((sum, v) => sum + v.likes, 0);
        
        return {
            ...user,
            videos: userVideos,
            stats: {
                following: (user.subscriptions || []).length,
                followers: (user.subscribers || []).length,
                likes: totalLikes,
                videos: userVideos.length
            }
        };
    }

    getAllUsers() {
        // Собираем всех уникальных пользователей из видео и текущего пользователя
        const users = new Map();
        
        // Добавляем текущего пользователя
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            users.set(currentUser.name, currentUser);
        }
        
        // Добавляем авторов видео
        this.userVideos.forEach(video => {
            if (!users.has(video.author)) {
                users.set(video.author, {
                    name: video.author,
                    avatar: video.avatar,
                    email: 'user@example.com',
                    bio: 'Пользователь',
                    subscriptions: [],
                    subscribers: []
                });
            }
        });
        
        return Array.from(users.values());
    }

    subscribe(authorName) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;
        
        // Не позволяем подписаться на себя
        if (currentUser.name === authorName) return false;
        
        // Проверяем, не подписаны ли уже
        if (!currentUser.subscriptions) {
            currentUser.subscriptions = [];
        }
        
        if (currentUser.subscriptions.includes(authorName)) {
            return false;
        }
        
        currentUser.subscriptions.push(authorName);
        
        // Добавляем текущего пользователя в подписчики автора
        const allUsers = this.getAllUsers();
        const author = allUsers.find(u => u.name === authorName);
        if (author) {
            if (!author.subscribers) {
                author.subscribers = [];
            }
            if (!author.subscribers.includes(currentUser.name)) {
                author.subscribers.push(currentUser.name);
            }
        }
        return true;
    }

    unsubscribe(authorName) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;
        
        if (!currentUser.subscriptions) {
            currentUser.subscriptions = [];
        }
        
        const index = currentUser.subscriptions.indexOf(authorName);
        if (index > -1) {
            currentUser.subscriptions.splice(index, 1);
        }
        
        // Удалено сохранение подписки в localStorage
        return true;
    }

    isSubscribed(authorName) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return false;
        
        return (currentUser.subscriptions || []).includes(authorName);
    }

    getCurrentUser() {
        if (typeof firebaseService !== 'undefined' && firebaseService && firebaseService.isInitialized()) {
            return firebaseService.getCurrentUser();
        }
        return null;
    }

    async login(email, password) {
        if (!(typeof firebaseService !== 'undefined' && firebaseService && firebaseService.isInitialized())) {
            throw new Error('Firebase не инициализирован');
        }
        return firebaseService.login(email, password);
    }

    async logout() {
        if (!(typeof firebaseService !== 'undefined' && firebaseService && firebaseService.isInitialized())) {
            throw new Error('Firebase не инициализирован');
        }
        return firebaseService.logout();
    }

    async uploadVideo(file, metadata) {
        if (typeof firebaseService !== 'undefined' && firebaseService && firebaseService.isInitialized()) {
            const uploaded = await firebaseService.uploadVideo(file, metadata);
            // UI (лента/профиль) сейчас читает из this.userVideos, поэтому синхронизируем локальный кэш.
            if (uploaded) {
                this.userVideos.unshift(uploaded);
                this.syncFeedCacheWithLocal({ hasMore: true });
            }
            return uploaded;
        }

        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const videoData = e.target.result;
                
                const newVideo = {
                    id: Date.now(),
                    url: videoData,
                    author: this.getCurrentUser().name,
                    avatar: this.getCurrentUser().avatar,
                    authorVerified: !!this.getCurrentUser().verified,
                    desc: metadata.desc,
                    likes: 0,
                    comments: [],
                    views: 0,
                    shares: 0,
                    filter: metadata.filter || 'none',
                    hashtags: metadata.tags ? metadata.tags.split(' ').filter(t => t.startsWith('#')) : [],
                    isLiked: false,
                    timestamp: Date.now(),
                    ...metadata
                };
                
                this.userVideos.unshift(newVideo);
                this.syncFeedCacheWithLocal({ hasMore: true });
                this.persistVideoCache();
                
                resolve(newVideo);
            };
            reader.readAsDataURL(file);
        });
    }

    toggleLike(videoId) {
        const targetId = String(videoId);
        const video = this.userVideos.find(v => String(v.id) === targetId);
        if (video) {
            video.isLiked = !video.isLiked;
            video.likes += video.isLiked ? 1 : -1;
            video.likes = Math.max(0, parseInt(video.likes, 10) || 0);
            this.syncFeedCacheWithLocal();
            this.persistVideoCache();
            return video.isLiked;
        }
        return false;
    }

    addComment(videoId, text) {
        const user = this.getCurrentUser();
        const targetId = String(videoId);
        const video = this.userVideos.find(v => String(v.id) === targetId);
        
        if (video && user) {
            const comment = {
                user: user.name,
                text,
                time: Date.now(),
                likes: 0
            };
            
            video.comments = Array.isArray(video.comments) ? video.comments : [];
            video.comments.push(comment);
            video.commentsCount = (parseInt(video.commentsCount, 10) || 0) + 1;
            this.syncFeedCacheWithLocal();
            this.persistVideoCache();
            return comment;
        }
        return null;
    }

    incrementViews(videoId) {
        const targetId = String(videoId);
        const video = this.userVideos.find(v => String(v.id) === targetId);
        if (video) {
            video.views = (video.views || 0) + 1;
            this.persistVideoCache();
        }
    }

    searchVideos(query) {
        const searchTerm = query.toLowerCase();
        return this.userVideos.filter(video => 
            video.desc.toLowerCase().includes(searchTerm) ||
            video.author.toLowerCase().includes(searchTerm) ||
            video.hashtags.some(tag => tag.toLowerCase().includes(searchTerm))
        );
    }

    getFilteredVideos(filter) {
        return this.userVideos.filter(video => 
            filter === 'all' || video.filter === filter
        );
    }

    async updateUserProfile(profileData) {
        const user = this.getCurrentUser();
        if (!user) return null;

        if (!(typeof firebaseService !== 'undefined' && firebaseService && firebaseService.isInitialized())) {
            throw new Error('Firebase не инициализирован');
        }

        await firebaseService.updateUserProfile(user.uid, profileData);
        return firebaseService.getCurrentUser();
    }

    getUserSettings() {
        const user = this.getCurrentUser();
        if (!user) return null;
        return {
            name: user.name,
            email: user.email,
            avatar: user.avatar,
            bio: user.bio || '',
            location: user.location || '',
            website: user.website || '',
            interests: user.interests || '',
            gender: user.gender || 'other',
            verified: user.verified || false
        };
    }

    // Notifications methods
    addNotification(type, data) {
        const notification = {
            id: Date.now(),
            type, // 'like', 'comment'
            data,
            timestamp: Date.now(),
            read: false
        };
        this.notifications.unshift(notification);
        return notification;
    }

    getNotifications(filter = 'all') {
        if (filter === 'all') return this.notifications;
        return this.notifications.filter(n => n.type === filter);
    }

    markNotificationAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
        }
    }

    getUnreadNotificationsCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    // Messages methods
    normalizeTimestamp(value) {
        if (typeof value === 'number') return value;
        if (value && typeof value.toMillis === 'function') return value.toMillis();
        if (value instanceof Date) return value.getTime();
        return Date.now();
    }

    getMessagePreviewText(message = {}) {
        const msg = message || {};
        if (msg.type === 'file') return `📎 ${msg.file?.name || 'Файл'}`;
        if (msg.type === 'sticker') return '🪄 Стикер';
        if (msg.type === 'video-circle') return '🎥 Видеокружок';
        if (msg.type === 'call-event') return '📹 Видеозвонок';
        return String(msg.content || '');
    }

    addMessage(chatId, fromUser, toUser, content, options = {}) {
        const text = (content || '').trim();
        const messageType = typeof options.type === 'string'
            ? options.type
            : (options.file ? 'file' : 'text');
        if (messageType === 'text' && !text) throw new Error('Пустое сообщение');

        const timestamp = Date.now();
        const message = {
            id: Date.now(),
            chatId,
            fromUser: fromUser || 'user',
            toUser: toUser || 'user',
            fromUid: options.fromUid || null,
            toUid: options.toUid || null,
            content: text,
            type: messageType,
            file: options.file || null,
            sticker: options.sticker || null,
            call: options.call || null,
            timestamp,
            delivered: !!options.delivered,
            deliveredAt: options.delivered ? timestamp : null,
            read: !!options.read,
            readAt: options.read ? timestamp : null
        };
        this.messages.push(message);
        return message;
    }

    getChats() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return [];

        // Получаем уникальные чаты
        const chatsMap = new Map();
        
        this.messages.forEach(msg => {
            const isFromCurrent = msg.fromUid && currentUser.uid
                ? msg.fromUid === currentUser.uid
                : msg.fromUser === currentUser.name;
            const otherUser = isFromCurrent ? msg.toUser : msg.fromUser;
            const otherUid = isFromCurrent ? (msg.toUid || null) : (msg.fromUid || null);
            const chatId = msg.chatId || [msg.fromUser, msg.toUser].sort().join('_');
            const timestamp = this.normalizeTimestamp(msg.timestamp);
            const previewText = this.getMessagePreviewText(msg);
            
            if (!chatsMap.has(chatId)) {
                const presence = this.getUserPresence(otherUid, otherUser);
                chatsMap.set(chatId, {
                    id: chatId,
                    otherUser,
                    otherUid,
                    otherAvatar: this.getAvatarForUser(otherUser),
                    otherOnline: presence.online,
                    otherLastSeen: presence.lastSeen,
                    otherVerified: false,
                    lastMessage: previewText,
                    lastMessageTime: timestamp,
                    lastMessageType: msg.type || 'text',
                    unread: msg.toUser === currentUser.name && !msg.read,
                    unreadCount: msg.toUser === currentUser.name && !msg.read ? 1 : 0,
                    lastMessageFromMe: isFromCurrent,
                    lastMessageDelivered: !!msg.delivered,
                    lastMessageRead: !!msg.read
                });
            } else {
                const chat = chatsMap.get(chatId);
                if (timestamp > chat.lastMessageTime) {
                    chat.lastMessage = previewText;
                    chat.lastMessageTime = timestamp;
                    chat.lastMessageType = msg.type || 'text';
                    chat.lastMessageFromMe = isFromCurrent;
                    chat.lastMessageDelivered = !!msg.delivered;
                    chat.lastMessageRead = !!msg.read;
                }
                if (msg.toUser === currentUser.name && !msg.read) {
                    chat.unread = true;
                    chat.unreadCount += 1;
                }
            }
        });

        // Сортируем по времени последнего сообщения
        return Array.from(chatsMap.values()).sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    }

    getChatMessages(chatId) {
        return this.messages
            .filter(m => m.chatId === chatId)
            .map(m => ({
                ...m,
                timestamp: this.normalizeTimestamp(m.timestamp),
                delivered: !!m.delivered,
                read: !!m.read,
                type: m.type || 'text',
                file: m.file || null,
                sticker: m.sticker || null,
                call: m.call || null
            }))
            .sort((a, b) => a.timestamp - b.timestamp);
    }

    markChatAsRead(chatId) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return 0;
        let updated = 0;
        this.messages.forEach(msg => {
            if (msg.chatId === chatId && msg.toUser === currentUser.name) {
                msg.delivered = true;
                msg.deliveredAt = msg.deliveredAt || Date.now();
                msg.read = true;
                msg.readAt = Date.now();
                updated += 1;
            }
        });
        return updated;
    }

    markChatAsDelivered(chatId) {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return 0;
        let updated = 0;
        this.messages.forEach(msg => {
            if (msg.chatId === chatId && msg.toUser === currentUser.name && !msg.read && !msg.delivered) {
                msg.delivered = true;
                msg.deliveredAt = Date.now();
                updated += 1;
            }
        });
        return updated;
    }

    getUnreadMessagesCount() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return 0;
        return this.messages.filter(m => m.toUser === currentUser.name && !m.read).length;
    }

    getAvatarForUser(userName) {
        const user = this.getAllUsers().find(u => u.name === userName);
        if (user && user.avatar) return user.avatar;
        return 'assets/default-avatar.svg';
    }

    setTypingStatus(chatId, userName, isTyping) {
        if (!chatId || !userName) return;
        if (!this.typingState[chatId]) this.typingState[chatId] = {};
        this.typingState[chatId][userName] = {
            typing: !!isTyping,
            updatedAt: Date.now()
        };
    }

    getTypingStatus(chatId, userName) {
        if (!chatId || !userName) return false;
        const state = this.typingState[chatId]?.[userName];
        if (!state || !state.typing) return false;
        return Date.now() - (state.updatedAt || 0) < 5000;
    }

    setUserPresence(userName, online = false) {
        if (!userName) return;
        const prev = this.userPresence[userName] || {};
        this.userPresence[userName] = {
            ...prev,
            online: !!online,
            lastSeen: online ? (prev.lastSeen || Date.now()) : Date.now()
        };
    }

    getUserPresence(uid = null, userName = null) {
        const key = userName || uid;
        if (!key) return { online: false, lastSeen: null };
        const presence = this.userPresence[key];
        return {
            online: !!presence?.online,
            lastSeen: presence?.lastSeen || null
        };
    }
}
