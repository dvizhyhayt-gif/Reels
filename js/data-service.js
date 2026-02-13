/**
 * AdvancedDataService
 * Управление данными приложения (видео, пользователи, настройки)
 */
class AdvancedDataService {
    constructor() {
        this.STORAGE_KEY = 'tikclone_advanced_data';
        this.SETTINGS_KEY = 'tikclone_settings';
        
        this.filters = [
            { id: 'none', name: 'Оригинал', css: '' },
            { id: 'vibrant', name: 'Яркий', css: 'contrast(1.2) saturate(1.5)' },
            { id: 'warm', name: 'Теплый', css: 'sepia(0.5) hue-rotate(-30deg)' },
            { id: 'cool', name: 'Холодный', css: 'sepia(0.3) hue-rotate(180deg) brightness(1.1)' },
            { id: 'vintage', name: 'Винтаж', css: 'sepia(0.7) contrast(1.1)' },
            { id: 'bw', name: 'Р§/Р‘', css: 'grayscale(1) contrast(1.2)' }
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
        localStorage.removeItem('tikclone_advanced_auth');
        this.userVideos = [];
        this.settings = {
            theme: 'dark',
            autoplay: true,
            notifications: true,
            videoQuality: 'auto'
        };
        this.notifications = this.getDefaultNotifications();
        this.messages = this.getDefaultMessages();
    }

    getDefaultNotifications() {
        const now = Date.now();
        return [
            {
                id: 1,
                type: 'like',
                data: {
                    fromUser: 'alex_creator',
                    videoThumbnail: 'https://via.placeholder.com/48x48?text=Video'
                },
                timestamp: now - 300000,
                read: false
            },
            {
                id: 2,
                type: 'like',
                data: {
                    fromUser: 'sophia_films',
                    videoThumbnail: 'https://via.placeholder.com/48x48?text=Video'
                },
                timestamp: now - 600000,
                read: false
            },
            {
                id: 3,
                type: 'comment',
                data: {
                    fromUser: 'mike_vibes',
                    text: 'Классное видео! 🔥',
                    videoThumbnail: 'https://via.placeholder.com/48x48?text=Video'
                },
                timestamp: now - 1200000,
                read: false
            }
        ];
    }

    getDefaultMessages() {
        const now = Date.now();
        const currentUser = this.getCurrentUser();
        const userName = currentUser ? currentUser.name : 'user';
        
        return [
            {
                id: 1,
                chatId: ['alex_creator', userName].sort().join('_'),
                fromUser: 'alex_creator',
                toUser: userName,
                content: 'Привет! Твои видео очень крутые!',
                timestamp: now - 1800000,
                read: true
            },
            {
                id: 2,
                chatId: ['alex_creator', userName].sort().join('_'),
                fromUser: userName,
                toUser: 'alex_creator',
                content: 'Спасибо! Твои тоже класс 😊',
                timestamp: now - 1700000,
                read: true
            },
            {
                id: 3,
                chatId: ['sophia_films', userName].sort().join('_'),
                fromUser: 'sophia_films',
                toUser: userName,
                content: 'Давай сделаем колабор?',
                timestamp: now - 600000,
                read: false
            }
        ];
    }

    saveSettings() {
        // Удалено сохранение настроек в localStorage
    }

    async getFeed(page = 0, limit = 5) {
        await new Promise(resolve => setTimeout(resolve, 300));
        
        const start = page * limit;
        const end = start + limit;
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
        
        const userVideos = this.userVideos.filter(v => v.author === user.name);
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
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.userVideos));
                
                resolve(newVideo);
            };
            reader.readAsDataURL(file);
        });
    }

    toggleLike(videoId) {
        const video = this.userVideos.find(v => v.id === videoId);
        if (video) {
            video.isLiked = !video.isLiked;
            video.likes += video.isLiked ? 1 : -1;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.userVideos));
            return video.isLiked;
        }
        return false;
    }

    addComment(videoId, text) {
        const user = this.getCurrentUser();
        const video = this.userVideos.find(v => v.id === videoId);
        
        if (video && user) {
            const comment = {
                user: user.name,
                text,
                time: Date.now(),
                likes: 0
            };
            
            video.comments.push(comment);
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.userVideos));
            return comment;
        }
        return null;
    }

    incrementViews(videoId) {
        const video = this.userVideos.find(v => v.id === videoId);
        if (video) {
            video.views = (video.views || 0) + 1;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.userVideos));
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
        localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(this.notifications));
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
            localStorage.setItem(this.NOTIFICATIONS_KEY, JSON.stringify(this.notifications));
        }
    }

    getUnreadNotificationsCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    // Messages methods
    addMessage(chatId, fromUser, toUser, content) {
        const message = {
            id: Date.now(),
            chatId,
            fromUser,
            toUser,
            content,
            timestamp: Date.now(),
            read: false
        };
        this.messages.push(message);
        localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(this.messages));
        return message;
    }

    getChats() {
        const currentUser = this.getCurrentUser();
        if (!currentUser) return [];

        // Получаем уникальные чаты
        const chatsMap = new Map();
        
        this.messages.forEach(msg => {
            const otherUser = msg.fromUser === currentUser.name ? msg.toUser : msg.fromUser;
            const chatId = [msg.fromUser, msg.toUser].sort().join('_');
            
            if (!chatsMap.has(chatId)) {
                chatsMap.set(chatId, {
                    id: chatId,
                    otherUser,
                    lastMessage: msg.content,
                    lastMessageTime: msg.timestamp,
                    unread: msg.toUser === currentUser.name && !msg.read
                });
            } else {
                const chat = chatsMap.get(chatId);
                if (msg.timestamp > chat.lastMessageTime) {
                    chat.lastMessage = msg.content;
                    chat.lastMessageTime = msg.timestamp;
                }
                if (msg.toUser === currentUser.name && !msg.read) {
                    chat.unread = true;
                }
            }
        });

        // Сортируем по времени последнего сообщения
        return Array.from(chatsMap.values()).sort((a, b) => b.lastMessageTime - a.lastMessageTime);
    }

    getChatMessages(chatId) {
        return this.messages.filter(m => m.chatId === chatId);
    }

    markChatAsRead(chatId) {
        const currentUser = this.getCurrentUser();
        this.messages.forEach(msg => {
            if (msg.chatId === chatId && msg.toUser === currentUser.name) {
                msg.read = true;
            }
        });
        localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(this.messages));
    }

    getUnreadMessagesCount() {
        const currentUser = this.getCurrentUser();
        return this.messages.filter(m => m.toUser === currentUser.name && !m.read).length;
    }
}
