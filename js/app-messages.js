// Extracted messaging and notifications logic from js/app.js.
(function attachAppMessagesModule(global) {
    'use strict';

    const AdvancedApp = global.AdvancedApp;
    if (!AdvancedApp || !AdvancedApp.prototype) {
        console.error('[app-messages] AdvancedApp is unavailable.');
        return;
    }

    function getWebRtcCompat() {
        const compat = global.ReelgramWebRTC || {};
        const getPeerConnectionCtor = typeof compat.getPeerConnectionCtor === 'function'
            ? compat.getPeerConnectionCtor.bind(compat)
            : (() => global.RTCPeerConnection || global.webkitRTCPeerConnection || global.mozRTCPeerConnection || null);
        const getIceServers = typeof compat.getIceServers === 'function'
            ? compat.getIceServers.bind(compat)
            : (() => [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }]);
        const toIceCandidate = typeof compat.toIceCandidate === 'function'
            ? compat.toIceCandidate.bind(compat)
            : ((candidate) => candidate);
        const toSessionDescription = typeof compat.toSessionDescription === 'function'
            ? compat.toSessionDescription.bind(compat)
            : ((description) => description);
        const getRecommendedConstraints = typeof compat.getRecommendedConstraints === 'function'
            ? compat.getRecommendedConstraints.bind(compat)
            : (() => ({ video: true, audio: true }));
        const hasTurnServerFor = typeof compat.hasTurnServerFor === 'function'
            ? compat.hasTurnServerFor.bind(compat)
            : (() => false);
        const getSupportErrorMessage = typeof compat.getSupportErrorMessage === 'function'
            ? compat.getSupportErrorMessage.bind(compat)
            : (() => {
                const Ctor = getPeerConnectionCtor();
                return Ctor ? '' : 'WebRTC is unavailable in this browser.';
            });
        const getUserMedia = typeof compat.getUserMedia === 'function'
            ? compat.getUserMedia.bind(compat)
            : async (constraints) => {
                const nav = global.navigator || {};
                if (nav.mediaDevices && typeof nav.mediaDevices.getUserMedia === 'function') {
                    return nav.mediaDevices.getUserMedia(constraints);
                }
                const legacy = nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia;
                if (!legacy) throw new Error('getUserMedia is unavailable');
                return new Promise((resolve, reject) => {
                    legacy.call(nav, constraints, resolve, reject);
                });
            };

        return {
            getPeerConnectionCtor,
            getIceServers,
            toIceCandidate,
            toSessionDescription,
            getRecommendedConstraints,
            hasTurnServerFor,
            getSupportErrorMessage,
            getUserMedia
        };
    }

    function getCallConstraintsQueue(compat) {
        const recommended = compat.getRecommendedConstraints();
        return [
            recommended,
            { video: { facingMode: 'user' }, audio: true },
            { video: true, audio: true },
            { video: { width: { ideal: 320 }, height: { ideal: 480 } }, audio: true },
            { video: false, audio: true }
        ];
    }

    function normalizeMediaError(error, fallbackMessage) {
        const err = error && error.message ? String(error.message) : '';
        if (err) return new Error(err);
        return new Error(fallbackMessage || 'Cannot access camera/microphone.');
    }

    AdvancedApp.prototype.setupNotificationsEvents = function() {
        if (this.notificationTabs && this.notificationTabs.length) {
            this.notificationTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    this.notificationTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const filterType = tab.dataset.tab;
                    this.loadNotifications(filterType);
                });
            });
            this.loadNotifications('all');
            this.updateNotificationBadge();
        }
    };

    AdvancedApp.prototype.loadNotifications = async function(filter = 'all') {
        if (!this.notificationsList || !this.notificationsEmpty) return;

        const perfToken = this.beginPerf('notifications.load', { filter: String(filter || 'all') });
        let perfStatus = 'success';
        let notifications = [];
        try {
            if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.getUserNotifications === 'function') {
                notifications = await firebaseService.getUserNotifications(filter);
            } else {
                notifications = this.dataService.getNotifications(filter);
            }
        } catch (error) {
            perfStatus = 'error';
            console.error('Ошибка загрузки уведомлений:', error);
            notifications = [];
        }
        
        if (notifications.length === 0) {
            this.notificationsList.innerHTML = '';
            this.notificationsEmpty.style.display = 'flex';
            this.updateNotificationBadge();
            this.endPerf(perfToken, {
                status: perfStatus,
                filter: String(filter || 'all'),
                count: 0
            });
            return;
        }

        this.notificationsEmpty.style.display = 'none';
        this.notificationsList.innerHTML = '';

        notifications.forEach(notif => {
            const item = document.createElement('div');
            item.className = `notification-item ${notif.read ? '' : 'unread'}`;

            let icon = '', text = '', userName = '';
            const notifData = notif.data || {};

            if (notif.type === 'like') {
                icon = 'like';
                userName = notifData.fromUser || 'user';
                text = 'поставил(а) лайк вашему видео';
            } else if (notif.type === 'comment') {
                icon = 'comment';
                userName = notifData.fromUser || 'user';
                text = `${notifData.text || 'Новый комментарий'}`;
            } else if (notif.type === 'follow_request') {
                icon = 'comment';
                userName = notifData.fromUser || 'user';
                text = 'отправил(а) заявку на подписку';
            } else if (notif.type === 'follow_approved') {
                icon = 'like';
                userName = notifData.fromUser || 'user';
                text = 'принял(а) вашу заявку на подписку';
            } else if (notif.type === 'follow_rejected') {
                icon = 'comment';
                userName = notifData.fromUser || 'user';
                text = 'отклонил(а) вашу заявку на подписку';
            } else {
                icon = 'comment';
                userName = notifData.fromUser || 'system';
                text = notifData.text || 'Новое уведомление';
            }
            const time = this.formatTime(notif.timestamp);

            const safeUser = this.escapeHtml(userName || 'user');
            const thumb = notifData.videoThumbnail
                ? notifData.videoThumbnail
                : 'https://via.placeholder.com/48x48?text=Video';
            item.innerHTML = `
                <img src="assets/default-avatar.svg" class="notification-avatar">
                <div class="notification-content">
                    <div class="notification-user">@${safeUser}</div>
                    <div class="notification-text">${this.escapeHtml(text)}</div>
                    <div class="notification-time">${time}</div>
                </div>
                <img src="${thumb}" class="notification-badge-item ${icon === 'comment' ? 'comment' : ''}" alt="уведомление">
            `;

            item.addEventListener('click', async () => {
                if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.markNotificationAsRead === 'function') {
                    await firebaseService.markNotificationAsRead(notif.id);
                } else {
                    this.dataService.markNotificationAsRead(notif.id);
                }
                item.classList.remove('unread');
                AdvancedViewRenderer.showToast('Уведомление прочитано', 'info');
                this.updateNotificationBadge();
            });

            this.notificationsList.appendChild(item);
        });

        this.updateNotificationBadge();
        this.endPerf(perfToken, {
            status: perfStatus,
            filter: String(filter || 'all'),
            count: Array.isArray(notifications) ? notifications.length : 0
        });
    };

    AdvancedApp.prototype.updateNotificationBadge = async function() {
        if (!this.notificationsBadge) return;
        const user = this.dataService && this.dataService.getCurrentUser ? this.dataService.getCurrentUser() : null;
        if (!user) {
            this.notificationsBadge.style.display = 'none';
            return;
        }
        let unreadCount = 0;
        try {
            if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.getUserNotifications === 'function') {
                const all = await firebaseService.getUserNotifications('all');
                unreadCount = all.filter(n => !n.read).length;
            } else {
                unreadCount = this.dataService.getUnreadNotificationsCount();
            }
        } catch (error) {
            console.error('Ошибка обновления бейджа уведомлений:', error);
            unreadCount = 0;
        }
        if (unreadCount > 0) {
            this.notificationsBadge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
            this.notificationsBadge.style.display = 'flex';
        } else {
            this.notificationsBadge.style.display = 'none';
        }
    };

    AdvancedApp.prototype.formatTime = function(timestamp) {
        const normalizedTs = this.normalizeTimestampValue(timestamp);
        if (!normalizedTs) return '';
        const now = Date.now();
        const diff = now - normalizedTs;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'только что';
        if (minutes < 60) return `${minutes}м назад`;
        if (hours < 24) return `${hours}ч назад`;
        if (days === 1) return 'вчера';
        return `${days}д назад`;
    };

    AdvancedApp.prototype.normalizeTimestampValue = function(value) {
        if (typeof value === 'number') return value;
        if (value && typeof value.toMillis === 'function') return value.toMillis();
        if (value instanceof Date) return value.getTime();
        return 0;
    };

    AdvancedApp.prototype.formatClockTime = function(timestamp) {
        const normalizedTs = this.normalizeTimestampValue(timestamp);
        if (!normalizedTs) return '';
        return new Date(normalizedTs).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    };

    AdvancedApp.prototype.formatLastSeen = function(online, timestamp) {
        if (online) return 'в сети';
        const normalizedTs = this.normalizeTimestampValue(timestamp);
        if (!normalizedTs) return 'был(а) недавно';
        const diff = Date.now() - normalizedTs;
        const min = Math.floor(diff / 60000);
        if (min < 1) return 'был(а) только что';
        if (min < 60) return `был(а) ${min}м назад`;
        const hours = Math.floor(min / 60);
        if (hours < 24) return `был(а) ${hours}ч назад`;
        return `был(а) ${new Date(normalizedTs).toLocaleDateString('ru-RU')}`;
    };

    AdvancedApp.prototype.setupMessagesEvents = function() {
        if (this.backToListBtn) {
            this.backToListBtn.addEventListener('click', async () => {
                await this.updateTypingStatus(false);
                this.teardownChatRealtime();
                this.hideEmojiPicker();
                this.hideStickerPicker();
                this.chatDialog.style.display = 'none';
                this.chatDialog.style.setProperty('--keyboard-offset', '0px');
                this.messagesListSection.style.display = 'flex';
                this.state.currentChatId = null;
                this.state.currentChatUser = null;
                this.state.currentChatUid = null;
                this.state.currentChatOnline = false;
                this.state.currentChatLastSeen = null;
                await this.loadChats();
            });
        }

        if (this.sendMessageBtn) {
            this.sendMessageBtn.addEventListener('click', () => this.sendMessage());
        }

        if (this.messageInput) {
            this.messageInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
            this.messageInput.addEventListener('input', () => {
                this.onMessageInputChanged();
            });
        }

        if (this.newMessageBtn) {
            this.newMessageBtn.addEventListener('click', async () => {
                const username = prompt('Введите имя пользователя:');
                if (username && username.trim()) {
                    await this.openChat(username.trim());
                }
            });
        }

        if (this.messageSearchInput) {
            this.messageSearchInput.addEventListener('input', () => {
                this.filterChatsBySearch(this.messageSearchInput.value);
            });
        }

        if (this.chatUserTrigger) {
            this.chatUserTrigger.addEventListener('click', () => this.openCurrentChatProfile());
        }

        if (this.emojiToggleBtn) {
            this.emojiToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleEmojiPicker();
            });
        }

        if (this.stickerToggleBtn) {
            this.stickerToggleBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleStickerPicker();
            });
        }

        if (this.attachFileBtn && this.chatFileInput) {
            this.attachFileBtn.addEventListener('click', () => this.chatFileInput.click());
            this.chatFileInput.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    await this.sendFileMessage(file);
                }
                this.chatFileInput.value = '';
            });
        }

        if (this.videoCircleBtn && this.chatVideoCircleInput) {
            this.videoCircleBtn.addEventListener('click', () => this.chatVideoCircleInput.click());
            this.chatVideoCircleInput.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) {
                    await this.sendVideoCircleMessage(file);
                }
                this.chatVideoCircleInput.value = '';
            });
        }

        if (this.videoCallBtn) {
            this.videoCallBtn.addEventListener('click', () => this.startVideoCall());
        }

        this.audioCallBtn = this.audioCallBtn || document.getElementById('audio-call-btn');
        if (this.audioCallBtn) {
            this.audioCallBtn.addEventListener('click', () => this.startVideoCall());
        }

        if (this.callAcceptBtn) {
            this.callAcceptBtn.addEventListener('click', () => this.acceptIncomingVideoCall());
        }

        if (this.callDeclineBtn) {
            this.callDeclineBtn.addEventListener('click', () => {
                const status = this.pendingIncomingCall && !this.activeCall ? 'declined' : 'ended';
                this.endCurrentCall(status);
            });
        }

        document.addEventListener('click', (e) => {
            if (this.emojiPicker && this.emojiToggleBtn
                && !this.emojiPicker.contains(e.target) && !this.emojiToggleBtn.contains(e.target)) {
                this.hideEmojiPicker();
            }
            if (this.stickerPicker && this.stickerToggleBtn
                && !this.stickerPicker.contains(e.target) && !this.stickerToggleBtn.contains(e.target)) {
                this.hideStickerPicker();
            }
        });

        this.renderEmojiPicker();
        this.renderStickerPicker();
        this.setupKeyboardViewportSync();
        if (this.sendMessageBtn) this.sendMessageBtn.disabled = true;
        this.loadChats();
    };

    AdvancedApp.prototype.loadChats = async function() {
        if (!this.chatList || !this.messagesEmpty) return;

        const perfToken = this.beginPerf('chats.load');
        let perfStatus = 'success';
        let chats = [];
        try {
            if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.getChats === 'function') {
                chats = await firebaseService.getChats();
            } else {
                chats = this.dataService.getChats();
            }
        } catch (error) {
            perfStatus = 'error';
            console.error('Ошибка загрузки чатов:', error);
            chats = [];
        }

        if (chats.length === 0) {
            this.chatList.innerHTML = '';
            this.messagesEmpty.style.display = 'flex';
            this.updateMessagesBadge(0);
            this.endPerf(perfToken, {
                status: perfStatus,
                count: 0,
                unread: 0
            });
            return;
        }

        this.messagesEmpty.style.display = 'none';
        this.chatList.innerHTML = '';

        chats.forEach(chat => {
            const chatItem = document.createElement('div');
            chatItem.className = `chat-item ${chat.unread ? 'unread' : ''}`;
            chatItem.dataset.search = `${(chat.otherUser || '').toLowerCase()} ${(chat.lastMessage || '').toLowerCase()}`;

            const statusClass = chat.lastMessageRead
                ? 'read'
                : (chat.lastMessageDelivered ? 'delivered' : 'sent');
            const statusIcon = chat.lastMessageRead
                ? '✓✓'
                : (chat.lastMessageDelivered ? '✓✓' : '✓');
            const preview = this.escapeHtml(chat.lastMessage || 'Сообщений пока нет');
            const previewValue = chat.lastMessage ? preview : '\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0439 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442';
            const displayStatusIcon = chat.lastMessageRead
                ? '&#10003;&#10003;'
                : (chat.lastMessageDelivered ? '&#10003;&#10003;' : '&#10003;');
            const statusPart = chat.lastMessageFromMe
                ? `<span class="chat-last-status ${statusClass}">${displayStatusIcon}</span>`
                : '';
            const unreadBadge = chat.unreadCount > 0
                ? `<span class="chat-unread-count">${chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>`
                : '';
            const avatar = chat.otherAvatar || 'assets/default-avatar.svg';
            const presence = this.formatLastSeen(!!chat.otherOnline, chat.otherLastSeen);
            const onlineDot = chat.otherOnline ? '<span class="chat-online-dot"></span>' : '';
            const safeUser = this.escapeHtml(chat.otherUser || 'user');
            const verifiedBadge = AdvancedViewRenderer.getVerifiedBadge(!!chat.otherVerified);
            chatItem.innerHTML = `
                <div class="chat-avatar-wrap">
                    <img src="${avatar}" class="chat-avatar" alt="${safeUser}">
                    ${onlineDot}
                </div>
                <div class="chat-info">
                    <div class="chat-main-row">
                        <div class="chat-main-userline">
                            <span class="chat-user">${safeUser}</span>
                            ${verifiedBadge}
                        </div>
                        <div class="chat-time">${this.formatTime(chat.lastMessageTime)}</div>
                    </div>
                    <div class="chat-preview-row">
                        <div class="chat-last-message">${statusPart}<span class="chat-last-message-text">${previewValue}</span></div>
                        ${unreadBadge}
                    </div>
                    <div class="chat-presence">${presence}</div>
                </div>
            `;

            chatItem.addEventListener('click', () => {
                this.openChat(chat.otherUser, chat.id, chat.otherUid || null);
            });

            const avatarEl = chatItem.querySelector('.chat-avatar-wrap');
            if (avatarEl) {
                avatarEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (chat.otherUid) {
                        this.openUserProfileByUid(chat.otherUid);
                    } else {
                        this.openChat(chat.otherUser, chat.id, chat.otherUid || null);
                    }
                });
            }

            this.chatList.appendChild(chatItem);
        });

        const unreadTotal = chats.reduce((sum, chat) => sum + (parseInt(chat.unreadCount, 10) || 0), 0);
        this.updateMessagesBadge(unreadTotal);

        this.filterChatsBySearch(this.messageSearchInput ? this.messageSearchInput.value : '');
        this.endPerf(perfToken, {
            status: perfStatus,
            count: Array.isArray(chats) ? chats.length : 0,
            unread: unreadTotal
        });
    };

    AdvancedApp.prototype.openChat = async function(username, chatId = null, targetUid = null) {
        if (!this.messagesContainer || !this.chatDialog || !this.messagesListSection) return;

        const currentUser = this.dataService.getCurrentUser();
        if (!currentUser) {
            this.navigateTo('auth-view');
            return;
        }

        await this.updateTypingStatus(false);
        this.teardownChatRealtime();
        this.hideEmojiPicker();
        this.hideStickerPicker();

        let resolvedTargetUid = targetUid;
        let targetProfile = null;
        if (!resolvedTargetUid && firebaseService && firebaseService.isInitialized()) {
            try {
                targetProfile = await firebaseService.getUserByName(username);
                if (targetProfile && targetProfile.uid) {
                    resolvedTargetUid = targetProfile.uid;
                    username = targetProfile.name || username;
                }
            } catch (error) {
                console.error('Ошибка определения получателя:', error);
            }
        } else if (resolvedTargetUid && firebaseService && firebaseService.isInitialized()) {
            try {
                targetProfile = await firebaseService.getUserProfile(resolvedTargetUid);
                if (targetProfile && targetProfile.name) {
                    username = targetProfile.name;
                }
            } catch (error) {
                console.error('Ошибка определения получателя:', error);
            }
        }

        if (!chatId) {
            if (currentUser.uid && resolvedTargetUid) {
                chatId = [currentUser.uid, resolvedTargetUid].sort().join('_');
            } else {
                chatId = [currentUser.name, username].sort().join('_');
            }
        }

        if (!targetProfile && resolvedTargetUid && firebaseService && firebaseService.isInitialized()) {
            try {
                targetProfile = await firebaseService.getUserProfile(resolvedTargetUid);
            } catch (error) {
                console.error('Ошибка загрузки профиля собеседника:', error);
            }
        }

        if (!targetProfile && typeof this.dataService.getAllUsers === 'function') {
            const localProfile = this.dataService.getAllUsers().find(u => u.name === username);
            if (localProfile) {
                targetProfile = localProfile;
                if (!resolvedTargetUid && localProfile.uid) {
                    resolvedTargetUid = localProfile.uid;
                }
            }
        }

        if (!resolvedTargetUid && chatId && currentUser.uid && chatId.includes('_')) {
            const parts = chatId.split('_');
            if (parts.length === 2 && parts.includes(currentUser.uid)) {
                resolvedTargetUid = parts[0] === currentUser.uid ? parts[1] : parts[0];
            }
        }

        const avatar = targetProfile?.avatar || 'assets/default-avatar.svg';
        const online = !!targetProfile?.online;
        const lastSeen = targetProfile?.lastSeen || targetProfile?.lastActive || targetProfile?.updatedAt || null;

        if (this.chatUserName) this.chatUserName.textContent = `@${username}`;
        if (this.chatUserAvatar) this.chatUserAvatar.src = avatar;
        if (this.chatUserStatus) this.chatUserStatus.textContent = this.formatLastSeen(online, lastSeen);
        if (this.typingText) this.typingText.textContent = `@${username} печатает...`;

        try {
            if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.markIncomingAsDelivered === 'function') {
                await firebaseService.markIncomingAsDelivered(chatId);
            } else if (typeof this.dataService.markChatAsDelivered === 'function') {
                this.dataService.markChatAsDelivered(chatId);
            }
            if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.markChatAsRead === 'function') {
                await firebaseService.markChatAsRead(chatId);
            } else {
                this.dataService.markChatAsRead(chatId);
            }
        } catch (error) {
            console.error('Ошибка отметки сообщений прочитанными:', error);
        }

        this.messagesListSection.style.display = 'none';
        this.chatDialog.style.display = 'flex';
        if (this.messageInput) {
            this.messageInput.focus();
            this.onMessageInputChanged();
        }

        this.state.currentChatId = chatId;
        this.state.currentChatUser = username;
        this.state.currentChatUid = resolvedTargetUid;
        this.state.currentChatAvatar = avatar;
        this.state.currentChatOnline = online;
        this.state.currentChatLastSeen = this.normalizeTimestampValue(lastSeen);
        if (this.videoCallBtn) {
            this.videoCallBtn.style.display = resolvedTargetUid ? '' : 'none';
        }
        if (this.audioCallBtn) {
            this.audioCallBtn.style.display = resolvedTargetUid ? '' : 'none';
        }

        await this.refreshCurrentChatMessages();
        this.subscribeToActiveChat();
        await this.loadChats();
    };

    AdvancedApp.prototype.refreshCurrentChatMessages = async function() {
        if (!this.state.currentChatId) return;
        let messages = [];
        try {
            if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.getChatMessages === 'function') {
                messages = await firebaseService.getChatMessages(this.state.currentChatId);
            } else {
                messages = this.dataService.getChatMessages(this.state.currentChatId);
            }
        } catch (error) {
            console.error('Ошибка загрузки сообщений:', error);
            messages = [];
        }
        this.renderChatMessages(messages);
        setTimeout(() => {
            if (this.messagesContainer) {
                this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            }
        }, 40);
    };

    AdvancedApp.prototype.renderChatMessages = function(messages = []) {
        if (!this.messagesContainer) return;
        const currentUser = this.dataService.getCurrentUser();
        const currentUid = currentUser ? currentUser.uid : null;
        const currentName = currentUser ? currentUser.name : null;

        const sorted = [...messages].sort((a, b) => this.normalizeTimestampValue(a.timestamp) - this.normalizeTimestampValue(b.timestamp));
        this.messagesContainer.innerHTML = '';

        sorted.forEach(msg => {
            const isOwn = (msg.fromUid && currentUid)
                ? msg.fromUid === currentUid
                : msg.fromUser === currentName;

            const msgEl = document.createElement('div');
            msgEl.className = `message ${isOwn ? 'own' : ''}`;

            const formattedTime = this.formatClockTime(msg.timestamp);
            const statusClass = msg.read ? 'read' : (msg.delivered ? 'delivered' : 'sent');
            const statusIcon = msg.read ? '✓✓' : (msg.delivered ? '✓✓' : '✓');
            const statusHtml = isOwn ? `<span class="message-status ${statusClass}">${statusIcon}</span>` : '';
            const bodyHtml = this.renderChatMessageBody(msg);

            msgEl.innerHTML = `
                ${bodyHtml}
                <div class="message-meta">
                    <span>${formattedTime}</span>
                    ${statusHtml}
                </div>
            `;
            this.messagesContainer.appendChild(msgEl);
        });
    };

    AdvancedApp.prototype.renderChatMessageBody = function(message = {}) {
        const msg = message || {};
        if (msg.type === 'file') return this.renderFileMessageBody(msg);
        if (msg.type === 'sticker') return this.renderStickerMessageBody(msg);
        if (msg.type === 'video-circle') return this.renderVideoCircleMessageBody(msg);
        if (msg.type === 'call-event') return this.renderCallEventMessageBody(msg);

        const safeText = this.escapeHtml(msg.content || '').replace(/\n/g, '<br>');
        return `<div class="message-content">${safeText}</div>`;
    };

    AdvancedApp.prototype.getStickerById = function(stickerId = '') {
        const fallback = this.stickerPack[0];
        const key = String(stickerId || '').trim();
        if (!key || !this.stickerPackById || !this.stickerPackById.has(key)) return fallback;
        return this.stickerPackById.get(key);
    };

    AdvancedApp.prototype.renderStickerMessageBody = function(message = {}) {
        const rawSticker = message.sticker || {};
        const preset = this.getStickerById(rawSticker.id);
        const sticker = {
            id: preset?.id || 'party',
            title: rawSticker.title || preset?.title || 'Sticker',
            emoji: rawSticker.emoji || preset?.emoji || '✨',
            style: preset?.style || 'sticker-style-party',
            motion: preset?.motion || 'sticker-motion-pop'
        };

        const safeTitle = this.escapeHtml(sticker.title);
        const safeEmoji = this.escapeHtml(sticker.emoji);
        const safeStyle = this.escapeHtml(sticker.style);
        const safeMotion = this.escapeHtml(sticker.motion);

        return `
            <div class="message-content message-sticker">
                <div class="chat-sticker ${safeStyle}">
                    <span class="chat-sticker-glyph ${safeMotion}">${safeEmoji}</span>
                    <span class="chat-sticker-title">${safeTitle}</span>
                </div>
            </div>
        `;
    };

    AdvancedApp.prototype.renderVideoCircleMessageBody = function(message = {}) {
        const file = message.file || {};
        const safeUrl = file.url ? this.escapeHtml(file.url) : '';
        const safeName = this.escapeHtml(file.name || 'Видеокружок');
        const openLink = safeUrl
            ? `<a class="message-video-circle-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">Открыть</a>`
            : '';
        const video = safeUrl
            ? `<video class="message-video-circle" src="${safeUrl}" playsinline preload="metadata" loop muted controls></video>`
            : `<div class="message-file-icon">🎥</div>`;

        return `
            <div class="message-content message-video-circle-wrap">
                <div class="message-video-circle-frame">
                    ${video}
                    <div class="message-file-size">${safeName}</div>
                    ${openLink}
                </div>
            </div>
        `;
    };

    AdvancedApp.prototype.renderCallEventMessageBody = function(message = {}) {
        const call = message.call || {};
        const modeLabel = call.mode === 'video' ? 'Видеозвонок' : 'Звонок';
        const eventLabel = call.event === 'missed'
            ? 'Пропущен'
            : (call.event === 'declined'
                ? 'Отклонен'
                : (call.event === 'ended' ? 'Завершен' : 'Начат'));
        const text = this.escapeHtml(`${modeLabel}: ${eventLabel}`);
        return `<div class="message-content message-call-event">${text}</div>`;
    };

    AdvancedApp.prototype.renderFileMessageBody = function(message) {
        const file = message.file || {};
        const safeName = this.escapeHtml(file.name || 'Файл');
        const size = this.formatFileSize(file.size || 0);
        const isImage = typeof file.mime === 'string' && file.mime.startsWith('image/');
        const safeUrl = file.url ? this.escapeHtml(file.url) : '';

        const thumb = (isImage && safeUrl)
            ? `<img class="message-file-thumb" src="${safeUrl}" alt="${safeName}">`
            : `<div class="message-file-icon">📎</div>`;

        const link = safeUrl
            ? `<a class="message-file-link" href="${safeUrl}" target="_blank" rel="noopener noreferrer">Открыть файл</a>`
            : '';

        return `
            <div class="message-content">
                <div class="message-file">
                    ${thumb}
                    <div class="message-file-info">
                        <div class="message-file-name">${safeName}</div>
                        <div class="message-file-size">${size}</div>
                        ${link}
                    </div>
                </div>
            </div>
        `;
    };

    AdvancedApp.prototype.formatFileSize = function(size) {
        const bytes = Number(size) || 0;
        if (bytes < 1024) return `${bytes} Б`;
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(1)} КБ`;
        const mb = kb / 1024;
        return `${mb.toFixed(1)} МБ`;
    };

    AdvancedApp.prototype.filterChatsBySearch = function(query = '') {
        if (!this.chatList) return;
        const q = String(query).trim().toLowerCase();
        this.chatList.querySelectorAll('.chat-item').forEach(item => {
            const hay = item.dataset.search || '';
            item.style.display = !q || hay.includes(q) ? '' : 'none';
        });
    };

    AdvancedApp.prototype.renderEmojiPicker = function() {
        if (!this.emojiPicker) return;
        this.emojiPicker.innerHTML = this.emojiList
            .map(emoji => `<button class="emoji-btn" type="button" data-emoji="${emoji}">${emoji}</button>`)
            .join('');
        this.emojiPicker.querySelectorAll('.emoji-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!this.messageInput) return;
                const emoji = btn.dataset.emoji || '';
                this.messageInput.value += emoji;
                this.messageInput.focus();
                this.onMessageInputChanged();
                this.updateTypingStatus(true);
                this.hideStickerPicker();
            });
        });
    };

    AdvancedApp.prototype.renderStickerPicker = function() {
        if (!this.stickerPicker) return;
        this.stickerPicker.innerHTML = this.stickerPack.map(sticker => `
            <button class="sticker-btn ${sticker.style}" type="button" data-sticker-id="${sticker.id}">
                <span class="sticker-btn-glyph ${sticker.motion}">${sticker.emoji}</span>
                <span class="sticker-btn-title">${this.escapeHtml(sticker.title)}</span>
            </button>
        `).join('');

        this.stickerPicker.querySelectorAll('.sticker-btn').forEach(btn => {
            btn.addEventListener('click', async () => {
                const sticker = this.getStickerById(btn.dataset.stickerId || '');
                if (sticker) {
                    await this.sendStickerMessage(sticker);
                }
            });
        });
    };

    AdvancedApp.prototype.toggleEmojiPicker = function() {
        if (!this.emojiPicker) return;
        this.hideStickerPicker();
        const open = this.emojiPicker.style.display !== 'none';
        this.emojiPicker.style.display = open ? 'none' : 'flex';
    };

    AdvancedApp.prototype.hideEmojiPicker = function() {
        if (this.emojiPicker) this.emojiPicker.style.display = 'none';
    };

    AdvancedApp.prototype.toggleStickerPicker = function() {
        if (!this.stickerPicker) return;
        this.hideEmojiPicker();
        const open = this.stickerPicker.style.display !== 'none';
        this.stickerPicker.style.display = open ? 'none' : 'grid';
    };

    AdvancedApp.prototype.hideStickerPicker = function() {
        if (this.stickerPicker) this.stickerPicker.style.display = 'none';
    };

    AdvancedApp.prototype.setupKeyboardViewportSync = function() {
        if (this.keyboardHandlersBound || !window.visualViewport) return;
        this.keyboardHandlersBound = true;

        const syncOffset = () => {
            if (!this.chatDialog) return;
            if (this.chatDialog.style.display === 'none') {
                this.chatDialog.style.setProperty('--keyboard-offset', '0px');
                return;
            }
            const viewport = window.visualViewport;
            const keyboardOffset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
            this.chatDialog.style.setProperty('--keyboard-offset', `${keyboardOffset}px`);
        };

        window.visualViewport.addEventListener('resize', syncOffset);
        window.visualViewport.addEventListener('scroll', syncOffset);
    };

    AdvancedApp.prototype.onMessageInputChanged = function() {
        if (!this.messageInput || !this.sendMessageBtn) return;
        const hasText = this.messageInput.value.trim().length > 0;
        this.sendMessageBtn.disabled = !hasText;

        if (hasText) {
            this.updateTypingStatus(true);
            clearTimeout(this.stopTypingTimeout);
            this.stopTypingTimeout = setTimeout(() => this.updateTypingStatus(false), 1500);
        } else {
            this.updateTypingStatus(false);
        }
    };

    AdvancedApp.prototype.updateTypingStatus = async function(isTyping) {
        if (!this.state.currentChatId) return;
        const currentUser = this.dataService.getCurrentUser();
        if (!currentUser) return;

        const now = Date.now();
        const shouldSkip = (this.lastTypingState === isTyping) && (isTyping ? (now - (this.lastTypingAt || 0) < 1000) : true);
        if (shouldSkip) return;

        this.lastTypingState = isTyping;
        this.lastTypingAt = now;

        try {
            if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.setTypingStatus === 'function') {
                await firebaseService.setTypingStatus(this.state.currentChatId, isTyping);
            } else if (typeof this.dataService.setTypingStatus === 'function') {
                this.dataService.setTypingStatus(this.state.currentChatId, currentUser.name, isTyping);
            }
        } catch (error) {
            console.error('Ошибка обновления typing статуса:', error);
        }
    };

    AdvancedApp.prototype.handleTypingState = function(typingData) {
        if (!this.typingIndicator || !this.chatUserStatus) return;
        const currentUid = firebaseService && firebaseService.getCurrentUid ? firebaseService.getCurrentUid() : null;
        const targetUid = this.state.currentChatUid;
        let isTyping = false;

        if (targetUid && typingData && typingData[targetUid]) {
            const state = typingData[targetUid];
            const updatedAt = this.normalizeTimestampValue(state.updatedAt);
            isTyping = !!state.typing && (Date.now() - updatedAt < 5000);
        } else if (!targetUid && typingData) {
            const targetName = this.state.currentChatUser;
            Object.keys(typingData).forEach(uid => {
                if (uid === currentUid) return;
                const state = typingData[uid];
                const updatedAt = this.normalizeTimestampValue(state.updatedAt);
                if (state.name === targetName && state.typing && (Date.now() - updatedAt < 5000)) {
                    isTyping = true;
                }
            });
        }

        if (isTyping) {
            this.typingIndicator.style.display = 'flex';
            this.chatUserStatus.textContent = '\u043f\u0435\u0447\u0430\u0442\u0430\u0435\u0442...';
        } else {
            this.typingIndicator.style.display = 'none';
            this.chatUserStatus.textContent = this.formatLastSeen(
                !!this.state.currentChatOnline,
                this.state.currentChatLastSeen
            );
        }
    };

    AdvancedApp.prototype.subscribeToActiveChat = function() {
        if (!this.state.currentChatId) return;
        this.teardownChatRealtime();

        if (firebaseService && firebaseService.isInitialized()) {
            if (typeof firebaseService.subscribeToChatMessages === 'function') {
                this.chatMessagesUnsubscribe = firebaseService.subscribeToChatMessages(
                    this.state.currentChatId,
                    async (messages) => {
                        try {
                            this.renderChatMessages(messages);
                            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
                            await firebaseService.markIncomingAsDelivered(this.state.currentChatId);
                            await firebaseService.markChatAsRead(this.state.currentChatId);
                            await this.loadChats();
                        } catch (error) {
                            console.error('Ошибка live-обновления чата:', error);
                        }
                    }
                );
            }

            if (typeof firebaseService.subscribeToTyping === 'function') {
                this.chatTypingUnsubscribe = firebaseService.subscribeToTyping(
                    this.state.currentChatId,
                    (typingData) => this.handleTypingState(typingData)
                );
            }

            if (this.state.currentChatUid && typeof firebaseService.getUserProfile === 'function') {
                this.chatPresenceInterval = setInterval(async () => {
                    try {
                        const profile = await firebaseService.getUserProfile(this.state.currentChatUid);
                        if (!profile) return;
                        this.state.currentChatOnline = !!profile.online;
                        this.state.currentChatLastSeen = this.normalizeTimestampValue(profile.lastSeen || profile.lastActive || profile.updatedAt);
                        const onlineDot = document.getElementById('chat-user-online-dot');
                        if (onlineDot) {
                            onlineDot.classList.toggle('is-online', !!this.state.currentChatOnline);
                        }
                        if (this.typingIndicator && this.typingIndicator.style.display === 'none' && this.chatUserStatus) {
                            this.chatUserStatus.textContent = this.formatLastSeen(
                                this.state.currentChatOnline,
                                this.state.currentChatLastSeen
                            );
                        }
                    } catch (error) {
                        console.error('Ошибка обновления статуса собеседника:', error);
                    }
                }, 10000);
            }
            return;
        }

        this.chatRefreshInterval = setInterval(async () => {
            if (!this.state.currentChatId) return;
            const messages = this.dataService.getChatMessages(this.state.currentChatId);
            this.renderChatMessages(messages);
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            this.dataService.markChatAsDelivered(this.state.currentChatId);
            this.dataService.markChatAsRead(this.state.currentChatId);
            this.handleTypingState(this.dataService.typingState[this.state.currentChatId] || {});
            await this.loadChats();
        }, 1500);
    };

    AdvancedApp.prototype.teardownChatRealtime = function() {
        if (this.chatMessagesUnsubscribe) {
            this.chatMessagesUnsubscribe();
            this.chatMessagesUnsubscribe = null;
        }
        if (this.chatTypingUnsubscribe) {
            this.chatTypingUnsubscribe();
            this.chatTypingUnsubscribe = null;
        }
        if (this.chatRefreshInterval) {
            clearInterval(this.chatRefreshInterval);
            this.chatRefreshInterval = null;
        }
        if (this.chatPresenceInterval) {
            clearInterval(this.chatPresenceInterval);
            this.chatPresenceInterval = null;
        }
        clearTimeout(this.stopTypingTimeout);
        this.stopTypingTimeout = null;
        this.lastTypingState = false;
        this.lastTypingAt = 0;
        if (this.typingIndicator) this.typingIndicator.style.display = 'none';
    };

    AdvancedApp.prototype.openCurrentChatProfile = async function() {
        if (this.state.currentChatUid) {
            await this.openUserProfileByUid(this.state.currentChatUid);
            return;
        }

        if (!this.state.currentChatUser) return;
        if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.getUserByName === 'function') {
            try {
                const profile = await firebaseService.getUserByName(this.state.currentChatUser);
                if (profile && profile.uid) {
                    await this.openUserProfileByUid(profile.uid);
                }
            } catch (error) {
                console.error('Ошибка перехода в профиль собеседника:', error);
            }
        }
    };

    AdvancedApp.prototype.sendMessage = async function() {
        if (!this.messageInput || !this.messagesContainer) return;

        const content = this.messageInput.value.trim();
        if (!content) return;

        const currentUser = this.dataService.getCurrentUser();
        if (!currentUser) {
            this.navigateTo('auth-view');
            return;
        }

        if (!this.state.currentChatId || !this.state.currentChatUser) {
            AdvancedViewRenderer.showToast('Сначала выберите чат', 'warning');
            return;
        }

        const payload = {
            fromUid: currentUser.uid || null,
            toUid: this.state.currentChatUid || null,
            delivered: !!this.state.currentChatOnline
        };

        this.messageInput.value = '';
        this.onMessageInputChanged();
        this.hideEmojiPicker();
        this.hideStickerPicker();
        await this.updateTypingStatus(false);

        try {
            if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.addMessage === 'function') {
                await firebaseService.addMessage(
                    this.state.currentChatId,
                    currentUser.name,
                    this.state.currentChatUser,
                    content,
                    this.state.currentChatUid,
                    { type: 'text' }
                );
            } else {
                this.dataService.addMessage(
                    this.state.currentChatId,
                    currentUser.name,
                    this.state.currentChatUser,
                    content,
                    payload
                );
                await this.refreshCurrentChatMessages();
            }
        } catch (error) {
            console.error('Ошибка отправки сообщения:', error);
            AdvancedViewRenderer.showToast(error.message || 'Ошибка отправки сообщения', 'error');
            return;
        }

        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        await this.loadChats();
    };

    AdvancedApp.prototype.sendFileMessage = async function(file) {
        if (!file) return;
        if (!this.state.currentChatId || !this.state.currentChatUser) {
            AdvancedViewRenderer.showToast('Сначала выберите чат', 'warning');
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            AdvancedViewRenderer.showToast('Файл слишком большой (макс. 25MB)', 'warning');
            return;
        }

        const currentUser = this.dataService.getCurrentUser();
        if (!currentUser) {
            this.navigateTo('auth-view');
            return;
        }

        this.hideEmojiPicker();
        this.hideStickerPicker();
        await this.updateTypingStatus(false);

        try {
            let filePayload = null;
            if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.uploadChatFile === 'function') {
                filePayload = await firebaseService.uploadChatFile(this.state.currentChatId, file);
                await firebaseService.addMessage(
                    this.state.currentChatId,
                    currentUser.name,
                    this.state.currentChatUser,
                    '',
                    this.state.currentChatUid,
                    { type: 'file', file: filePayload }
                );
            } else {
                let localUrl = '';
                const mime = String(file.type || '').toLowerCase();
                if (mime.startsWith('image/')) {
                    localUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
                } else if (mime.startsWith('audio/') || mime.startsWith('video/')) {
                    try {
                        localUrl = URL.createObjectURL(file);
                    } catch (_) {
                        localUrl = '';
                    }
                }
                filePayload = {
                    name: file.name,
                    size: file.size,
                    mime: file.type || 'application/octet-stream',
                    url: localUrl
                };
                this.dataService.addMessage(
                    this.state.currentChatId,
                    currentUser.name,
                    this.state.currentChatUser,
                    '',
                    {
                        fromUid: currentUser.uid || null,
                        toUid: this.state.currentChatUid || null,
                        delivered: !!this.state.currentChatOnline,
                        type: 'file',
                        file: filePayload
                    }
                );
                await this.refreshCurrentChatMessages();
            }
            await this.loadChats();
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        } catch (error) {
            console.error('Ошибка отправки файла:', error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось отправить файл', 'error');
        }
    };

    AdvancedApp.prototype.sendStickerMessage = async function(stickerPreset) {
        if (!stickerPreset) return;
        if (!this.state.currentChatId || !this.state.currentChatUser) {
            AdvancedViewRenderer.showToast('Сначала выберите чат', 'warning');
            return;
        }

        const currentUser = this.dataService.getCurrentUser();
        if (!currentUser) {
            this.navigateTo('auth-view');
            return;
        }

        const stickerPayload = {
            id: stickerPreset.id,
            title: stickerPreset.title,
            emoji: stickerPreset.emoji,
            style: stickerPreset.style,
            motion: stickerPreset.motion
        };

        this.hideEmojiPicker();
        this.hideStickerPicker();
        await this.updateTypingStatus(false);

        const options = {
            fromUid: currentUser.uid || null,
            toUid: this.state.currentChatUid || null,
            delivered: !!this.state.currentChatOnline,
            type: 'sticker',
            sticker: stickerPayload
        };

        try {
            if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.addMessage === 'function') {
                await firebaseService.addMessage(
                    this.state.currentChatId,
                    currentUser.name,
                    this.state.currentChatUser,
                    '',
                    this.state.currentChatUid,
                    options
                );
            } else {
                this.dataService.addMessage(
                    this.state.currentChatId,
                    currentUser.name,
                    this.state.currentChatUser,
                    '',
                    options
                );
                await this.refreshCurrentChatMessages();
            }
            await this.loadChats();
            if (this.messagesContainer) this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        } catch (error) {
            console.error('Ошибка отправки стикера:', error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось отправить стикер', 'error');
        }
    };

    AdvancedApp.prototype.sendVideoCircleMessage = async function(file) {
        if (!file) return;
        if (!this.state.currentChatId || !this.state.currentChatUser) {
            AdvancedViewRenderer.showToast('Сначала выберите чат', 'warning');
            return;
        }
        if (!(file.type || '').startsWith('video/')) {
            AdvancedViewRenderer.showToast('Выберите видеофайл', 'warning');
            return;
        }
        if (file.size > 25 * 1024 * 1024) {
            AdvancedViewRenderer.showToast('Видеокружок слишком большой (макс. 25MB)', 'warning');
            return;
        }

        const currentUser = this.dataService.getCurrentUser();
        if (!currentUser) {
            this.navigateTo('auth-view');
            return;
        }

        this.hideEmojiPicker();
        this.hideStickerPicker();
        await this.updateTypingStatus(false);

        try {
            let filePayload = null;
            if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.uploadChatFile === 'function') {
                filePayload = await firebaseService.uploadChatFile(this.state.currentChatId, file);
                await firebaseService.addMessage(
                    this.state.currentChatId,
                    currentUser.name,
                    this.state.currentChatUser,
                    '',
                    this.state.currentChatUid,
                    { type: 'video-circle', file: filePayload }
                );
            } else {
                filePayload = {
                    name: file.name || 'video-circle.webm',
                    size: file.size || 0,
                    mime: file.type || 'video/webm',
                    url: URL.createObjectURL(file)
                };
                this.dataService.addMessage(
                    this.state.currentChatId,
                    currentUser.name,
                    this.state.currentChatUser,
                    '',
                    {
                        fromUid: currentUser.uid || null,
                        toUid: this.state.currentChatUid || null,
                        delivered: !!this.state.currentChatOnline,
                        type: 'video-circle',
                        file: filePayload
                    }
                );
                await this.refreshCurrentChatMessages();
            }

            await this.loadChats();
            if (this.messagesContainer) this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        } catch (error) {
            console.error('Ошибка отправки видеокружка:', error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось отправить видеокружок', 'error');
        }
    };

    AdvancedApp.prototype.showIncomingCallModal = function(call) {
        if (!this.callModal) return;
        const fromUser = call?.fromUser || 'user';
        this.callModal.style.display = 'flex';
        if (this.callTitle) this.callTitle.textContent = 'Входящий видеозвонок';
        if (this.callPeer) this.callPeer.textContent = `@${fromUser}`;
        if (this.callStatus) this.callStatus.textContent = 'Нажмите "Принять"';
        if (this.callAcceptBtn) this.callAcceptBtn.style.display = '';
        if (this.callDeclineBtn) this.callDeclineBtn.textContent = 'Отклонить';
        if (this.callVideoPlaceholder) {
            this.callVideoPlaceholder.style.display = 'flex';
            this.callVideoPlaceholder.textContent = 'Входящий вызов...';
        }
        if (this.callRemoteVideo) this.callRemoteVideo.srcObject = null;
        if (this.callLocalVideo) this.callLocalVideo.srcObject = null;
    };

    AdvancedApp.prototype.showActiveCallModal = function(call, statusText = 'Подключение...') {
        if (!this.callModal) return;
        const role = this.activeCall?.role || 'caller';
        const peerName = role === 'caller'
            ? (call?.toUser || this.activeCall?.peerName || this.state.currentChatUser || 'user')
            : (call?.fromUser || this.activeCall?.peerName || this.state.currentChatUser || 'user');

        this.callModal.style.display = 'flex';
        if (this.callTitle) this.callTitle.textContent = 'Видеозвонок';
        if (this.callPeer) this.callPeer.textContent = `@${peerName}`;
        if (this.callStatus) this.callStatus.textContent = statusText;
        if (this.callAcceptBtn) this.callAcceptBtn.style.display = 'none';
        if (this.callDeclineBtn) this.callDeclineBtn.textContent = 'Завершить';
        if (this.callVideoPlaceholder) {
            this.callVideoPlaceholder.style.display = 'flex';
            this.callVideoPlaceholder.textContent = 'Ожидание подключения...';
        }
    };

    AdvancedApp.prototype.hideCallModal = function() {
        if (!this.callModal) return;
        this.callModal.style.display = 'none';
    };

    AdvancedApp.prototype.updateCallStatusText = function(text = '') {
        if (this.callStatus) this.callStatus.textContent = text || '';
    };

    AdvancedApp.prototype.getCallStatusText = function(call) {
        const status = String(call?.status || '');
        if (status === 'ringing') return 'Звоним...';
        if (status === 'accepted') return 'Подключение...';
        if (status === 'active') return 'В звонке';
        if (status === 'declined') return 'Вызов отклонен';
        if (status === 'missed') return 'Пропущенный вызов';
        if (status === 'ended') return 'Вызов завершен';
        return 'Подключение...';
    };

    AdvancedApp.prototype.resetCallSession = function() {
        if (this.callDocUnsubscribe) {
            try { this.callDocUnsubscribe(); } catch (_) {}
            this.callDocUnsubscribe = null;
        }
        if (this.callCandidatesUnsubscribe) {
            try { this.callCandidatesUnsubscribe(); } catch (_) {}
            this.callCandidatesUnsubscribe = null;
        }
        if (this.callPeerConnection) {
            try { this.callPeerConnection.close(); } catch (_) {}
            this.callPeerConnection = null;
        }
        if (this.callLocalStream) {
            this.callLocalStream.getTracks().forEach(track => {
                try { track.stop(); } catch (_) {}
            });
            this.callLocalStream = null;
        }
        this.callRemoteStream = null;
        this.callKnownCandidateIds.clear();
        this.pendingCallCandidates = [];
        this.callOfferSent = false;
        this.callAnswerSent = false;
        this.callRemoteDescriptionSet = false;
        this.callStarting = false;
        this.activeCall = null;
        this.pendingIncomingCall = null;
        this.state.activeCallId = null;
        if (this.callLocalVideo) this.callLocalVideo.srcObject = null;
        if (this.callRemoteVideo) this.callRemoteVideo.srcObject = null;
        this.hideCallModal();
    };

    AdvancedApp.prototype.ensureCallLocalMedia = async function() {
        if (this.callLocalStream) return this.callLocalStream;
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
            throw new Error('Ваше устройство не поддерживает видеозвонки');
        }

        const constraintsQueue = getCallConstraintsQueue(getWebRtcCompat());
        let lastError = null;
        for (const constraints of constraintsQueue) {
            try {
                const stream = await getWebRtcCompat().getUserMedia(constraints);
                if (!stream) continue;
                this.callLocalStream = stream;
                if (this.callLocalVideo) {
                    this.callLocalVideo.srcObject = stream;
                    if (typeof this.callLocalVideo.play === 'function') {
                        this.callLocalVideo.play().catch(() => {});
                    }
                }
                return stream;
            } catch (error) {
                lastError = error;
                const code = String(error && error.name ? error.name : '').toLowerCase();
                if (code === 'notallowederror' || code === 'securityerror') break;
            }
        }
        throw normalizeMediaError(lastError, 'Cannot access camera/microphone. Check permissions and HTTPS.');
    };

    AdvancedApp.prototype.ensureCallPeerConnection = function(callId) {
        if (this.callPeerConnection) return this.callPeerConnection;
        if (typeof RTCPeerConnection === 'undefined') {
            throw new Error('WebRTC недоступен в этом браузере');
        }

        const pc = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });
        this.callPeerConnection = pc;
        this.callRemoteStream = new MediaStream();
        if (this.callRemoteVideo) this.callRemoteVideo.srcObject = this.callRemoteStream;

        if (this.callLocalStream) {
            const existingTrackIds = new Set(
                pc.getSenders().map(sender => sender.track && sender.track.id).filter(Boolean)
            );
            this.callLocalStream.getTracks().forEach(track => {
                if (!existingTrackIds.has(track.id)) {
                    pc.addTrack(track, this.callLocalStream);
                }
            });
        }

        pc.ontrack = (event) => {
            const incomingStream = event.streams && event.streams[0];
            if (!incomingStream || !this.callRemoteStream) return;
            incomingStream.getTracks().forEach(track => {
                if (!this.callRemoteStream.getTracks().some(t => t.id === track.id)) {
                    this.callRemoteStream.addTrack(track);
                }
            });
            if (this.callVideoPlaceholder) this.callVideoPlaceholder.style.display = 'none';
        };

        pc.onicecandidate = (event) => {
            if (!event.candidate) return;
            if (!(firebaseService && firebaseService.isInitialized() && typeof firebaseService.addCallCandidate === 'function')) {
                return;
            }
            firebaseService.addCallCandidate(callId, event.candidate).catch((error) => {
                console.error('Ошибка отправки ICE candidate:', error);
            });
        };

        pc.onconnectionstatechange = () => {
            const state = pc.connectionState;
            if (state === 'connected') {
                if (this.activeCall) this.activeCall.connected = true;
                this.updateCallStatusText('В звонке');
                if (this.callVideoPlaceholder) this.callVideoPlaceholder.style.display = 'none';
                return;
            }
            if (state === 'failed') {
                this.updateCallStatusText('Связь потеряна');
                this.endCurrentCall('ended');
                return;
            }
            if (state === 'disconnected') {
                this.updateCallStatusText('Переподключение...');
            }
        };

        return pc;
    };

    AdvancedApp.prototype.flushPendingCallCandidates = async function() {
        if (!this.callPeerConnection || !this.callPeerConnection.remoteDescription) return;
        if (!Array.isArray(this.pendingCallCandidates) || this.pendingCallCandidates.length === 0) return;

        const queue = [...this.pendingCallCandidates];
        this.pendingCallCandidates = [];
        for (const candidate of queue) {
            try {
                const rtcCandidate = getWebRtcCompat().toIceCandidate(candidate);
                if (!rtcCandidate) continue;
                await this.callPeerConnection.addIceCandidate(rtcCandidate);
            } catch (error) {
                console.warn('Не удалось применить ICE candidate:', error);
            }
        }
    };

    AdvancedApp.prototype.subscribeToCurrentCall = function(callId) {
        if (this.callDocUnsubscribe) {
            try { this.callDocUnsubscribe(); } catch (_) {}
            this.callDocUnsubscribe = null;
        }
        if (!(firebaseService && firebaseService.isInitialized() && typeof firebaseService.subscribeToCall === 'function')) return;

        this.callDocUnsubscribe = firebaseService.subscribeToCall(callId, async (call) => {
            await this.handleCallSnapshot(call);
        });
    };

    AdvancedApp.prototype.subscribeToCurrentCallCandidates = function(callId) {
        if (this.callCandidatesUnsubscribe) {
            try { this.callCandidatesUnsubscribe(); } catch (_) {}
            this.callCandidatesUnsubscribe = null;
        }
        if (!(firebaseService && firebaseService.isInitialized() && typeof firebaseService.subscribeToCallCandidates === 'function')) return;

        const currentUid = firebaseService && typeof firebaseService.getCurrentUid === 'function'
            ? firebaseService.getCurrentUid()
            : null;
        this.callKnownCandidateIds.clear();
        this.pendingCallCandidates = [];

        this.callCandidatesUnsubscribe = firebaseService.subscribeToCallCandidates(callId, async (candidates = []) => {
            if (!Array.isArray(candidates) || candidates.length === 0) return;

            for (const row of candidates) {
                if (!row || !row.id || !row.candidate) continue;
                const candidateId = String(row.id);
                if (this.callKnownCandidateIds.has(candidateId)) continue;
                this.callKnownCandidateIds.add(candidateId);

                if (currentUid && row.uid && String(row.uid) === String(currentUid)) continue;
                if (!this.callPeerConnection || !this.callPeerConnection.remoteDescription) {
                    this.pendingCallCandidates.push(row.candidate);
                    continue;
                }

                try {
                    const rtcCandidate = getWebRtcCompat().toIceCandidate(row.candidate);
                    if (!rtcCandidate) continue;
                    await this.callPeerConnection.addIceCandidate(rtcCandidate);
                } catch (error) {
                    console.warn('Не удалось добавить ICE candidate:', error);
                }
            }
        });
    };

    AdvancedApp.prototype.createAndSendOffer = async function(callId) {
        if (!this.callPeerConnection || this.callOfferSent) return;
        const offer = await this.callPeerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: true
        });
        await this.callPeerConnection.setLocalDescription(offer);
        if (firebaseService && typeof firebaseService.updateCall === 'function') {
            await firebaseService.updateCall(callId, {
                offer: { type: offer.type, sdp: offer.sdp },
                status: 'ringing'
            });
        }
        this.callOfferSent = true;
    };

    AdvancedApp.prototype.createAndSendAnswer = async function(call) {
        if (!call || !call.id || !this.callPeerConnection || this.callAnswerSent) return;
        if (!(call.offer && call.offer.sdp)) return;

        const offerDescription = getWebRtcCompat().toSessionDescription(call.offer);
        await this.callPeerConnection.setRemoteDescription(offerDescription);
        this.callRemoteDescriptionSet = true;
        await this.flushPendingCallCandidates();

        const answer = await this.callPeerConnection.createAnswer();
        await this.callPeerConnection.setLocalDescription(answer);
        if (firebaseService && typeof firebaseService.updateCall === 'function') {
            await firebaseService.updateCall(call.id, {
                answer: { type: answer.type, sdp: answer.sdp },
                status: 'active',
                acceptedAt: call.acceptedAt || Date.now()
            });
        }
        this.callAnswerSent = true;
        this.updateCallStatusText('В звонке');
    };

    AdvancedApp.prototype.handleCallSnapshot = async function(call) {
        if (!call) {
            if (this.state.activeCallId) {
                await this.endCurrentCall('ended', { skipRemoteUpdate: true, silent: true, sendEvent: false });
            } else {
                this.resetCallSession();
            }
            return;
        }

        const callId = String(call.id || '');
        if (!callId) return;

        if (this.pendingIncomingCall && String(this.pendingIncomingCall.id) === callId && String(call.status || '') !== 'ringing' && !this.activeCall) {
            this.pendingIncomingCall = null;
            this.hideCallModal();
            return;
        }

        if (!this.state.activeCallId || String(this.state.activeCallId) !== callId) return;

        const status = String(call.status || '');
        if (status === 'declined' || status === 'missed' || status === 'ended' || status === 'cancelled') {
            const toastText = status === 'declined'
                ? 'Звонок отклонен'
                : (status === 'missed' ? 'Пропущенный звонок' : 'Звонок завершен');
            AdvancedViewRenderer.showToast(toastText, 'info');
            await this.endCurrentCall(status, { skipRemoteUpdate: true, silent: true, sendEvent: false });
            return;
        }

        this.updateCallStatusText(this.getCallStatusText(call));

        if (!this.callPeerConnection) return;
        if (this.activeCall?.role === 'caller') {
            if (call.answer && call.answer.sdp && !this.callRemoteDescriptionSet) {
                const answerDescription = getWebRtcCompat().toSessionDescription(call.answer);
                await this.callPeerConnection.setRemoteDescription(answerDescription);
                this.callRemoteDescriptionSet = true;
                await this.flushPendingCallCandidates();
                if (firebaseService && typeof firebaseService.updateCall === 'function' && status !== 'active') {
                    await firebaseService.updateCall(callId, { status: 'active' });
                }
                this.updateCallStatusText('В звонке');
            }
            return;
        }

        if (this.activeCall?.role === 'callee') {
            if (call.offer && call.offer.sdp && !this.callRemoteDescriptionSet) {
                await this.createAndSendAnswer(call);
            }
        }
    };

    AdvancedApp.prototype.startVideoCall = async function() {
        if (this.callStarting) return;
        if (!(firebaseService && firebaseService.isInitialized() && typeof firebaseService.createVideoCall === 'function')) {
            AdvancedViewRenderer.showToast('Звонки доступны после подключения базы', 'warning');
            return;
        }
        if (!this.state.currentChatId || !this.state.currentChatUser || !this.state.currentChatUid) {
            AdvancedViewRenderer.showToast('Откройте чат с пользователем для звонка', 'warning');
            return;
        }
        if (this.activeCall || this.pendingIncomingCall || this.state.activeCallId) {
            AdvancedViewRenderer.showToast('У вас уже есть активный звонок', 'warning');
            return;
        }

        const currentUser = this.dataService.getCurrentUser();
        if (!currentUser) {
            this.navigateTo('auth-view');
            return;
        }

        this.callStarting = true;
        try {
            const call = await firebaseService.createVideoCall({
                chatId: this.state.currentChatId,
                toUid: this.state.currentChatUid,
                toUser: this.state.currentChatUser
            });

            this.activeCall = {
                id: call.id,
                chatId: call.chatId || this.state.currentChatId,
                role: 'caller',
                peerUid: call.toUid || this.state.currentChatUid,
                peerName: call.toUser || this.state.currentChatUser,
                connected: false
            };
            this.state.activeCallId = call.id;

            this.showActiveCallModal(call, 'Звоним...');
            await this.ensureCallLocalMedia();
            this.ensureCallPeerConnection(call.id);
            this.subscribeToCurrentCall(call.id);
            this.subscribeToCurrentCallCandidates(call.id);
            await this.createAndSendOffer(call.id);
            try {
                await this.sendCallEventMessage('started', call.id);
            } catch (eventError) {
                console.warn('Не удалось записать событие звонка:', eventError);
            }
        } catch (error) {
            console.error('Ошибка старта видеозвонка:', error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось начать звонок', 'error');
            await this.endCurrentCall('ended', { skipRemoteUpdate: false, silent: true, sendEvent: false });
        } finally {
            this.callStarting = false;
        }
    };

    AdvancedApp.prototype.acceptIncomingVideoCall = async function() {
        const call = this.pendingIncomingCall;
        if (!call || !call.id || this.callStarting) return;
        if (!(firebaseService && firebaseService.isInitialized() && typeof firebaseService.updateCall === 'function')) {
            AdvancedViewRenderer.showToast('Звонки недоступны', 'warning');
            return;
        }

        this.callStarting = true;
        try {
            this.activeCall = {
                id: call.id,
                chatId: call.chatId || null,
                role: 'callee',
                peerUid: call.fromUid || null,
                peerName: call.fromUser || 'user',
                connected: false
            };
            this.state.activeCallId = call.id;
            this.pendingIncomingCall = null;

            this.showActiveCallModal(call, 'Подключение...');
            await firebaseService.updateCall(call.id, { status: 'accepted', acceptedAt: Date.now() });
            await this.ensureCallLocalMedia();
            this.ensureCallPeerConnection(call.id);
            this.subscribeToCurrentCall(call.id);
            this.subscribeToCurrentCallCandidates(call.id);
            await this.handleCallSnapshot(call);
        } catch (error) {
            console.error('Ошибка принятия звонка:', error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось принять звонок', 'error');
            await this.endCurrentCall('declined', { skipRemoteUpdate: false, silent: true, sendEvent: false });
        } finally {
            this.callStarting = false;
        }
    };

    AdvancedApp.prototype.sendCallEventMessage = async function(event = 'ended', callId = null) {
        const currentUser = this.dataService.getCurrentUser();
        if (!currentUser) return;

        const active = this.activeCall || null;
        const pending = this.pendingIncomingCall || null;
        const chatId = this.state.currentChatId || active?.chatId || pending?.chatId || null;
        const targetUid = this.state.currentChatUid || active?.peerUid || pending?.fromUid || null;
        const targetName = this.state.currentChatUser || active?.peerName || pending?.fromUser || null;
        if (!chatId || !targetName) return;

        const options = {
            fromUid: currentUser.uid || null,
            toUid: targetUid,
            delivered: !!this.state.currentChatOnline,
            type: 'call-event',
            call: {
                mode: 'video',
                event,
                callId: callId || this.state.activeCallId || null
            }
        };

        if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.addMessage === 'function') {
            await firebaseService.addMessage(
                chatId,
                currentUser.name,
                targetName,
                '',
                targetUid,
                options
            );
            return;
        }

        this.dataService.addMessage(
            chatId,
            currentUser.name,
            targetName,
            '',
            options
        );
        await this.refreshCurrentChatMessages();
    };

    // Override call RTC internals with compatibility-aware implementation.
    AdvancedApp.prototype.ensureCallLocalMedia = async function() {
        if (this.callLocalStream) return this.callLocalStream;

        const compat = getWebRtcCompat();
        const supportError = compat.getSupportErrorMessage();
        if (supportError) {
            throw new Error(supportError);
        }

        const constraintsQueue = getCallConstraintsQueue(compat);
        let lastError = null;

        for (const constraints of constraintsQueue) {
            try {
                const stream = await compat.getUserMedia(constraints);
                if (!stream) continue;
                this.callLocalStream = stream;
                if (this.callLocalVideo) {
                    this.callLocalVideo.srcObject = stream;
                    if (typeof this.callLocalVideo.play === 'function') {
                        this.callLocalVideo.play().catch(() => {});
                    }
                }
                return stream;
            } catch (error) {
                lastError = error;
                const code = String(error && error.name ? error.name : '').toLowerCase();
                if (code === 'notallowederror' || code === 'securityerror') break;
            }
        }

        throw normalizeMediaError(lastError, 'Cannot access camera/microphone. Check permissions and HTTPS.');
    };

    AdvancedApp.prototype.ensureCallPeerConnection = function(callId) {
        if (this.callPeerConnection) return this.callPeerConnection;

        const compat = getWebRtcCompat();
        const PeerConnectionCtor = compat.getPeerConnectionCtor();
        if (typeof PeerConnectionCtor !== 'function') {
            throw new Error(compat.getSupportErrorMessage() || 'WebRTC is unavailable in this browser.');
        }

        const configuredIce = compat.getIceServers();
        const safeIceServers = Array.isArray(configuredIce) && configuredIce.length
            ? configuredIce
            : [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];

        if (!this.callWarnedAboutTurn && typeof compat.hasTurnServerFor === 'function' && !compat.hasTurnServerFor(safeIceServers)) {
            this.callWarnedAboutTurn = true;
            console.warn('[rtc] TURN is not configured. Some networks may fail with STUN-only.');
        }

        const pc = new PeerConnectionCtor({ iceServers: safeIceServers });
        this.callPeerConnection = pc;
        this.callRemoteStream = new MediaStream();

        if (this.callRemoteVideo) {
            this.callRemoteVideo.srcObject = this.callRemoteStream;
            if (typeof this.callRemoteVideo.play === 'function') {
                this.callRemoteVideo.play().catch(() => {});
            }
        }

        if (this.callLocalStream) {
            const existingTrackIds = new Set(
                pc.getSenders().map((sender) => sender.track && sender.track.id).filter(Boolean)
            );
            this.callLocalStream.getTracks().forEach((track) => {
                if (!existingTrackIds.has(track.id)) {
                    pc.addTrack(track, this.callLocalStream);
                }
            });
        }

        pc.ontrack = (event) => {
            if (!this.callRemoteStream) {
                this.callRemoteStream = new MediaStream();
                if (this.callRemoteVideo) this.callRemoteVideo.srcObject = this.callRemoteStream;
            }

            const incomingStream = event && event.streams && event.streams[0] ? event.streams[0] : null;
            if (incomingStream) {
                incomingStream.getTracks().forEach((track) => {
                    if (!this.callRemoteStream.getTracks().some((t) => t.id === track.id)) {
                        this.callRemoteStream.addTrack(track);
                    }
                });
            } else if (event && event.track && !this.callRemoteStream.getTracks().some((t) => t.id === event.track.id)) {
                this.callRemoteStream.addTrack(event.track);
            }

            if (this.callRemoteVideo && typeof this.callRemoteVideo.play === 'function') {
                this.callRemoteVideo.play().catch(() => {});
            }
            if (this.callVideoPlaceholder) this.callVideoPlaceholder.style.display = 'none';
        };

        pc.onicecandidate = (event) => {
            if (!event || !event.candidate) return;
            if (!(firebaseService && firebaseService.isInitialized() && typeof firebaseService.addCallCandidate === 'function')) {
                return;
            }
            firebaseService.addCallCandidate(callId, event.candidate).catch((error) => {
                console.error('ICE candidate send failed:', error);
            });
        };

        pc.onconnectionstatechange = () => {
            const state = String(pc.connectionState || '');
            if (state === 'connected') {
                if (this.activeCall) this.activeCall.connected = true;
                this.updateCallStatusText('\u0412 \u0437\u0432\u043e\u043d\u043a\u0435');
                if (this.callVideoPlaceholder) this.callVideoPlaceholder.style.display = 'none';
                return;
            }
            if (state === 'failed') {
                this.updateCallStatusText('\u0421\u0432\u044f\u0437\u044c \u043f\u043e\u0442\u0435\u0440\u044f\u043d\u0430');
                this.endCurrentCall('ended');
                return;
            }
            if (state === 'disconnected') {
                this.updateCallStatusText('\u041f\u0435\u0440\u0435\u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435...');
            }
        };

        pc.oniceconnectionstatechange = () => {
            const iceState = String(pc.iceConnectionState || '').toLowerCase();
            if (iceState === 'failed' && typeof pc.restartIce === 'function' && !pc.__reelgramIceRestarted) {
                pc.__reelgramIceRestarted = true;
                this.updateCallStatusText('\u041f\u0435\u0440\u0435\u043f\u043e\u0434\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u0435...');
                try { pc.restartIce(); } catch (_) {}
            }
        };

        return pc;
    };

    AdvancedApp.prototype.endCurrentCall = async function(status = 'ended', { skipRemoteUpdate = false, silent = false, sendEvent = true } = {}) {
        const currentCallId = this.state.activeCallId
            || this.activeCall?.id
            || this.pendingIncomingCall?.id
            || null;
        if (!currentCallId) {
            this.resetCallSession();
            return;
        }

        const normalizedStatus = String(status || 'ended');
        if (!skipRemoteUpdate && firebaseService && firebaseService.isInitialized() && typeof firebaseService.updateCall === 'function') {
            try {
                await firebaseService.updateCall(currentCallId, {
                    status: normalizedStatus,
                    endedBy: firebaseService.getCurrentUid ? firebaseService.getCurrentUid() : null,
                    endedAt: Date.now()
                });
            } catch (error) {
                console.error('Ошибка завершения звонка:', error);
            }
        }

        if (sendEvent && this.state.currentChatId && this.state.currentChatUser) {
            const eventType = normalizedStatus === 'declined'
                ? 'declined'
                : (normalizedStatus === 'missed' ? 'missed' : 'ended');
            try {
                await this.sendCallEventMessage(eventType, currentCallId);
                await this.loadChats();
            } catch (_) {}
        }

        this.resetCallSession();

        if (!silent) {
            const text = normalizedStatus === 'declined'
                ? 'Звонок отклонен'
                : (normalizedStatus === 'missed' ? 'Пропущенный звонок' : 'Звонок завершен');
            AdvancedViewRenderer.showToast(text, 'info');
        }
    };

    AdvancedApp.prototype.renderChatMessages = function(messages = []) {
        if (!this.messagesContainer) return;
        const currentUser = this.dataService.getCurrentUser();
        const currentUid = currentUser ? currentUser.uid : null;
        const currentName = currentUser ? currentUser.name : null;

        const sorted = [...messages].sort((a, b) => this.normalizeTimestampValue(a.timestamp) - this.normalizeTimestampValue(b.timestamp));
        this.messagesContainer.innerHTML = '';

        sorted.forEach(msg => {
            const isOwn = (msg.fromUid && currentUid)
                ? msg.fromUid === currentUid
                : msg.fromUser === currentName;
            const isVideoCircle = msg.type === 'video-circle';

            const msgEl = document.createElement('div');
            msgEl.className = `message ${isOwn ? 'own' : ''}${isVideoCircle ? ' message-video-note' : ''}`;

            const formattedTime = this.formatClockTime(msg.timestamp);
            const statusClass = msg.read ? 'read' : (msg.delivered ? 'delivered' : 'sent');
            const doubleTick = '&#10003;&#10003;';
            const singleTick = '&#10003;';
            const statusIcon = msg.read ? doubleTick : (msg.delivered ? doubleTick : singleTick);
            const statusHtml = isOwn ? `<span class="message-status ${statusClass}">${statusIcon}</span>` : '';
            const bodyHtml = this.renderChatMessageBody(msg);

            msgEl.innerHTML = `
                ${bodyHtml}
                <div class="message-meta">
                    <span>${formattedTime}</span>
                    ${statusHtml}
                </div>
            `;
            this.messagesContainer.appendChild(msgEl);

            if (isVideoCircle) {
                const trigger = msgEl.querySelector('.message-video-circle-hit');
                const videoEl = msgEl.querySelector('.message-video-circle');
                this.bindChatVideoCircleInteraction(trigger, videoEl);
            }
        });
    };

    AdvancedApp.prototype.renderVideoCircleMessageBody = function(message = {}) {
        const file = message.file || {};
        const safeUrl = file.url ? this.escapeHtml(file.url) : '';
        const video = safeUrl
            ? `<video class="message-video-circle" src="${safeUrl}" playsinline autoplay preload="metadata" loop muted disablepictureinpicture></video>`
            : `<div class="message-video-circle-fallback"><span class="message-video-circle-glyph"></span></div>`;

        return `
            <div class="message-content message-video-circle-wrap">
                <button class="message-video-circle-hit" type="button" aria-label="Open video message">
                    <span class="message-video-circle-progress"></span>
                    ${video}
                    <span class="message-video-circle-overlay">
                        <span class="message-video-circle-glyph"></span>
                    </span>
                </button>
            </div>
        `;
    };

    AdvancedApp.prototype.bindChatVideoCircleInteraction = function(trigger, videoEl) {
        if (!trigger || !videoEl || trigger.dataset.bound === '1') return;

        trigger.dataset.bound = '1';
        videoEl.muted = true;
        videoEl.loop = true;

        const progressEl = trigger.querySelector('.message-video-circle-progress');
        const ensurePlaying = () => {
            const playPromise = videoEl.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        };

        const syncProgress = () => {
            this.updateChatVideoCircleProgress(progressEl, videoEl);
        };

        ensurePlaying();
        videoEl.addEventListener('loadedmetadata', () => {
            ensurePlaying();
            syncProgress();
        });
        videoEl.addEventListener('timeupdate', syncProgress);
        videoEl.addEventListener('ended', syncProgress);

        trigger.addEventListener('click', () => {
            this.openChatVideoCircleViewer(videoEl);
        });
    };

    AdvancedApp.prototype.updateChatVideoCircleProgress = function(progressEl, videoEl) {
        if (!progressEl) return;

        const duration = Number(videoEl && videoEl.duration) || 0;
        const currentTime = Number(videoEl && videoEl.currentTime) || 0;
        const ratio = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
        progressEl.style.setProperty('--progress', `${Math.round(ratio * 360)}deg`);
    };

    AdvancedApp.prototype.ensureChatVideoCircleViewer = function() {
        if (this.chatVideoCircleViewer) return this.chatVideoCircleViewer;

        const root = document.createElement('div');
        root.className = 'video-circle-viewer';
        root.hidden = true;
        root.innerHTML = `
            <div class="video-circle-viewer-backdrop" data-action="close"></div>
            <div class="video-circle-viewer-shell" role="dialog" aria-modal="true" aria-label="Video message viewer">
                <button class="video-circle-viewer-close" type="button" data-action="close" aria-label="Close video message">&times;</button>
                <div class="video-circle-viewer-stage">
                    <span class="video-circle-viewer-progress"></span>
                    <video class="video-circle-viewer-video" playsinline preload="metadata" disablepictureinpicture></video>
                </div>
            </div>
        `;

        document.body.appendChild(root);

        const videoEl = root.querySelector('.video-circle-viewer-video');
        const progressEl = root.querySelector('.video-circle-viewer-progress');

        const handleClose = () => {
            this.closeChatVideoCircleViewer();
        };

        root.addEventListener('click', (event) => {
            if (event.target === root || event.target.closest('[data-action="close"]')) {
                handleClose();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && root.classList.contains('is-visible')) {
                handleClose();
            }
        });

        videoEl.addEventListener('loadedmetadata', () => {
            this.updateChatVideoCircleProgress(progressEl, videoEl);
        });
        videoEl.addEventListener('timeupdate', () => {
            this.updateChatVideoCircleProgress(progressEl, videoEl);
        });
        videoEl.addEventListener('ended', () => {
            this.updateChatVideoCircleProgress(progressEl, videoEl);
        });

        this.chatVideoCircleViewer = {
            root,
            videoEl,
            progressEl,
            activePreview: null,
            closeTimer: null
        };

        return this.chatVideoCircleViewer;
    };

    AdvancedApp.prototype.openChatVideoCircleViewer = function(sourceVideo) {
        if (!sourceVideo) return;

        const sourceUrl = sourceVideo.currentSrc || sourceVideo.src || '';
        if (!sourceUrl) return;

        const viewer = this.ensureChatVideoCircleViewer();
        if (viewer.closeTimer) {
            clearTimeout(viewer.closeTimer);
            viewer.closeTimer = null;
        }

        viewer.activePreview = sourceVideo;
        viewer.root.hidden = false;
        document.body.classList.add('video-circle-viewer-open');

        if (viewer.videoEl.getAttribute('src') !== sourceUrl) {
            viewer.videoEl.setAttribute('src', sourceUrl);
            viewer.videoEl.load();
        }

        viewer.videoEl.muted = false;
        viewer.videoEl.loop = false;

        try {
            viewer.videoEl.currentTime = Number(sourceVideo.currentTime) || 0;
        } catch (_) {}

        this.updateChatVideoCircleProgress(viewer.progressEl, viewer.videoEl);

        sourceVideo.pause();

        requestAnimationFrame(() => {
            viewer.root.classList.add('is-visible');
            const playPromise = viewer.videoEl.play();
            if (playPromise && typeof playPromise.catch === 'function') {
                playPromise.catch(() => {});
            }
        });
    };

    AdvancedApp.prototype.closeChatVideoCircleViewer = function() {
        const viewer = this.chatVideoCircleViewer;
        if (!viewer || viewer.root.hidden) return;

        const activePreview = viewer.activePreview;
        viewer.activePreview = null;
        viewer.root.classList.remove('is-visible');
        document.body.classList.remove('video-circle-viewer-open');

        viewer.closeTimer = setTimeout(() => {
            viewer.videoEl.pause();
            viewer.videoEl.removeAttribute('src');
            viewer.videoEl.load();
            viewer.root.hidden = true;
            this.updateChatVideoCircleProgress(viewer.progressEl, null);

            if (activePreview) {
                const playPromise = activePreview.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(() => {});
                }
            }
        }, 220);
    };

    const originalSetupMessagesEvents = AdvancedApp.prototype.setupMessagesEvents;
    AdvancedApp.prototype.setupMessagesEvents = function() {
        originalSetupMessagesEvents.call(this);
        this.setupChatComposerEnhancements();
    };

    const originalOpenChat = AdvancedApp.prototype.openChat;
    AdvancedApp.prototype.openChat = async function(...args) {
        await originalOpenChat.apply(this, args);

        if (this.chatUserName) {
            this.chatUserName.textContent = String(this.state.currentChatUser || this.chatUserName.textContent || '').replace(/^@+/, '');
        }
        const onlineDot = document.getElementById('chat-user-online-dot');
        if (onlineDot) {
            onlineDot.classList.toggle('is-online', !!this.state.currentChatOnline);
        }
        if (this.typingText) {
            const peerName = String(this.state.currentChatUser || '').replace(/^@+/, '');
            this.typingText.textContent = peerName
                ? `${peerName} \u043f\u0435\u0447\u0430\u0442\u0430\u0435\u0442...`
                : '\u041f\u0435\u0447\u0430\u0442\u0430\u0435\u0442...';
        }

        this.syncChatComposerVisuals();
    };

    AdvancedApp.prototype.formatLastSeen = function(online, timestamp) {
        if (online) return '\u0432 \u0441\u0435\u0442\u0438';

        const normalizedTs = this.normalizeTimestampValue(timestamp);
        if (!normalizedTs) return '\u0431\u044b\u043b(\u0430) \u043d\u0435\u0434\u0430\u0432\u043d\u043e';

        const diff = Date.now() - normalizedTs;
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return '\u0431\u044b\u043b(\u0430) \u0442\u043e\u043b\u044c\u043a\u043e \u0447\u0442\u043e';
        if (minutes < 60) return `\u0431\u044b\u043b(\u0430) ${minutes}\u043c \u043d\u0430\u0437\u0430\u0434`;

        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `\u0431\u044b\u043b(\u0430) ${hours}\u0447 \u043d\u0430\u0437\u0430\u0434`;

        return `\u0431\u044b\u043b(\u0430) ${new Date(normalizedTs).toLocaleDateString('ru-RU')}`;
    };

    AdvancedApp.prototype.setupChatComposerEnhancements = function() {
        if (this.messageInput) {
            this.messageInput.setAttribute('placeholder', '\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435');
        }

        if (this.sendMessageBtn && this.sendMessageBtn.dataset.chatComposerBound !== '1') {
            this.sendMessageBtn.dataset.chatComposerBound = '1';
            this.sendMessageBtn.addEventListener('click', (event) => {
                const hasText = !!(this.messageInput && this.messageInput.value.trim());
                if (hasText) return;

                event.preventDefault();
                event.stopImmediatePropagation();

                if (this.videoCircleBtn) {
                    this.videoCircleBtn.click();
                } else if (this.chatVideoCircleInput) {
                    this.chatVideoCircleInput.click();
                }
            }, true);
        }

        if (this.sendMessageBtn) {
            this.sendMessageBtn.disabled = false;
        }

        this.syncChatComposerVisuals();
    };

    AdvancedApp.prototype.syncChatComposerVisuals = function() {
        const hasText = !!(this.messageInput && this.messageInput.value.trim());

        if (this.messageInputArea) {
            this.messageInputArea.classList.toggle('has-text', hasText);
        }

        if (this.sendMessageBtn) {
            this.sendMessageBtn.disabled = false;
            this.sendMessageBtn.setAttribute(
                'aria-label',
                hasText ? '\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435' : '\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u043a\u0430\u043c\u0435\u0440\u0443'
            );
        }
    };

    AdvancedApp.prototype.onMessageInputChanged = function() {
        if (!this.messageInput) return;

        const hasText = this.messageInput.value.trim().length > 0;
        this.syncChatComposerVisuals();

        if (hasText) {
            this.updateTypingStatus(true);
            clearTimeout(this.stopTypingTimeout);
            this.stopTypingTimeout = setTimeout(() => this.updateTypingStatus(false), 1500);
        } else {
            this.updateTypingStatus(false);
        }
    };

    AdvancedApp.prototype.getChatMessageRenderClass = function(message = {}) {
        const msg = message || {};
        const mime = String(msg.file && msg.file.mime ? msg.file.mime : '').toLowerCase();

        if (msg.type === 'video-circle') return 'message-video-note';
        if (msg.type === 'file' && mime.startsWith('image/')) return 'message-image-note';
        if (msg.type === 'file' && mime.startsWith('audio/')) return 'message-voice-note';
        if (msg.type === 'file') return 'message-file-note';
        if (msg.type === 'sticker') return 'message-sticker-note';
        if (msg.type === 'call-event') return 'message-call-note';
        return 'message-text-note';
    };

    AdvancedApp.prototype.renderChatMessages = function(messages = []) {
        if (!this.messagesContainer) return;

        const currentUser = this.dataService.getCurrentUser();
        const currentUid = currentUser ? currentUser.uid : null;
        const currentName = currentUser ? currentUser.name : null;
        const sorted = [...messages].sort((a, b) => this.normalizeTimestampValue(a.timestamp) - this.normalizeTimestampValue(b.timestamp));

        this.messagesContainer.innerHTML = '';

        sorted.forEach((msg) => {
            const isOwn = (msg.fromUid && currentUid)
                ? msg.fromUid === currentUid
                : msg.fromUser === currentName;
            const renderClass = this.getChatMessageRenderClass(msg);
            const msgEl = document.createElement('div');
            const className = `message ${isOwn ? 'own' : ''} ${renderClass}`.trim().replace(/\s+/g, ' ');

            msgEl.className = className;

            const formattedTime = this.formatClockTime(msg.timestamp);
            const statusClass = msg.read ? 'read' : (msg.delivered ? 'delivered' : 'sent');
            const doubleTick = '&#10003;&#10003;';
            const singleTick = '&#10003;';
            const statusIcon = msg.read ? doubleTick : (msg.delivered ? doubleTick : singleTick);
            const statusHtml = isOwn ? `<span class="message-status ${statusClass}">${statusIcon}</span>` : '';
            const bodyHtml = this.renderChatMessageBody(msg, { isOwn, formattedTime, statusClass, statusIcon });
            const metaMode = this.getChatMessageMetaMode(renderClass, { isOwn });
            const outerMetaHtml = metaMode === 'outside'
                ? `
                    <div class="message-meta">
                        <span>${formattedTime}</span>
                        ${statusHtml}
                    </div>
                `
                : '';

            msgEl.innerHTML = `
                ${bodyHtml}
                ${outerMetaHtml}
            `;

            this.messagesContainer.appendChild(msgEl);

            if (renderClass === 'message-video-note') {
                const trigger = msgEl.querySelector('.message-video-circle-hit');
                const videoEl = msgEl.querySelector('.message-video-circle');
                this.bindChatVideoCircleInteraction(trigger, videoEl);
            }

            if (renderClass === 'message-image-note') {
                this.bindChatImageMessageInteraction(msgEl);
            }

            if (renderClass === 'message-voice-note') {
                this.bindChatVoiceMessageInteraction(msgEl);
            }
        });
    };

    AdvancedApp.prototype.getChatMessageMetaMode = function(renderClass = '', context = {}) {
        if (renderClass === 'message-text-note') return context.isOwn ? 'inside' : 'hidden';
        if (renderClass === 'message-image-note') return 'hidden';
        if (renderClass === 'message-voice-note') return 'hidden';
        return 'outside';
    };

    AdvancedApp.prototype.renderChatMessageBody = function(message = {}, context = {}) {
        const msg = message || {};
        const mime = String(msg.file && msg.file.mime ? msg.file.mime : '').toLowerCase();

        if (msg.type === 'file' && mime.startsWith('image/')) return this.renderImageMessageBody(msg);
        if (msg.type === 'file' && mime.startsWith('audio/')) return this.renderVoiceMessageBody(msg, context);
        if (msg.type === 'file') return this.renderFileMessageBody(msg);
        if (msg.type === 'sticker') return this.renderStickerMessageBody(msg);
        if (msg.type === 'video-circle') return this.renderVideoCircleMessageBody(msg);
        if (msg.type === 'call-event') return this.renderCallEventMessageBody(msg);
        return this.renderTextMessageBody(msg, context);
    };

    AdvancedApp.prototype.renderTextMessageBody = function(message = {}, context = {}) {
        const safeText = this.escapeHtml(message.content || '').replace(/\n/g, '<br>');
        const inlineMeta = context.isOwn
            ? `
                <div class="message-inline-meta">
                    <span class="message-inline-time">${this.escapeHtml(context.formattedTime || '')}</span>
                    <span class="message-inline-status ${this.escapeHtml(context.statusClass || 'sent')}">${context.statusIcon || '&#10003;'}</span>
                </div>
            `
            : '';

        return `
            <div class="message-shell message-text-shell">
                <div class="message-bubble message-text-bubble">${safeText}${inlineMeta}</div>
            </div>
        `;
    };

    AdvancedApp.prototype.renderImageMessageBody = function(message = {}) {
        const file = message.file || {};
        const safeUrl = file.url ? this.escapeHtml(file.url) : '';
        const safeName = this.escapeHtml(file.name || 'photo');

        if (!safeUrl) {
            return this.renderFileMessageBody(message);
        }

        return `
            <div class="message-content image-message-card">
                <button class="image-message-hit" type="button" data-image-url="${safeUrl}" data-image-name="${safeName}" aria-label="\u041e\u0442\u043a\u0440\u044b\u0442\u044c \u0444\u043e\u0442\u043e">
                    <img class="image-message-media" src="${safeUrl}" alt="${safeName}" loading="lazy">
                </button>
            </div>
        `;
    };

    AdvancedApp.prototype.renderVoiceMessageBody = function(message = {}, context = {}) {
        const file = message.file || {};
        const safeUrl = file.url ? this.escapeHtml(file.url) : '';
        const durationText = this.escapeHtml(this.formatVoiceDuration(file.duration || 0));
        const timeText = this.escapeHtml(this.formatClockTime(message.timestamp) || '');
        const statusClass = message.read ? 'read' : (message.delivered ? 'delivered' : 'sent');
        const doubleTick = '&#10003;&#10003;';
        const singleTick = '&#10003;';
        const statusIcon = message.read ? doubleTick : (message.delivered ? doubleTick : singleTick);
        const statusHtml = context.isOwn
            ? `<span class="voice-message-inline-status ${statusClass}">${statusIcon}</span>`
            : '';
        const waveform = this.buildVoiceMessageWaveform((file.name || safeUrl || String(message.timestamp || 'voice')).slice(0, 48));
        const audioHtml = safeUrl
            ? `<audio class="voice-message-audio" src="${safeUrl}" preload="metadata"></audio>`
            : '';

        return `
            <div class="message-shell message-voice-shell">
                <div class="message-bubble voice-message-card">
                    <button class="voice-message-toggle" type="button" aria-label="\u041f\u0440\u043e\u0441\u043b\u0443\u0448\u0430\u0442\u044c \u0433\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0435">
                        <span class="voice-message-toggle-icon"></span>
                    </button>
                    <div class="voice-message-body">
                        <div class="voice-message-wave">${waveform}</div>
                        <div class="voice-message-row">
                            <span class="voice-message-duration">${durationText}</span>
                            <span class="voice-message-row-spacer"></span>
                            <span class="voice-message-time">${timeText}</span>
                            ${statusHtml}
                        </div>
                    </div>
                    ${audioHtml}
                </div>
            </div>
        `;
    };

    AdvancedApp.prototype.buildVoiceMessageWaveform = function(seed = 'voice') {
        const source = String(seed || 'voice');
        const bars = [];

        for (let i = 0; i < 26; i += 1) {
            const code = source.charCodeAt(i % source.length) || 71;
            const height = 8 + ((code + (i * 11)) % 18);
            bars.push(`<span class="voice-message-bar" style="height:${height}px"></span>`);
        }

        return bars.join('');
    };

    AdvancedApp.prototype.formatVoiceDuration = function(seconds) {
        const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0));
        const minutes = Math.floor(totalSeconds / 60);
        const rest = String(totalSeconds % 60).padStart(2, '0');
        return `${minutes}:${rest}`;
    };

    AdvancedApp.prototype.bindChatVoiceMessageInteraction = function(messageEl) {
        if (!messageEl) return;

        const toggle = messageEl.querySelector('.voice-message-toggle');
        const audio = messageEl.querySelector('.voice-message-audio');
        const durationEl = messageEl.querySelector('.voice-message-duration');
        const bars = Array.from(messageEl.querySelectorAll('.voice-message-bar'));

        if (!toggle || !audio || toggle.dataset.bound === '1') return;
        toggle.dataset.bound = '1';

        const sync = () => {
            const duration = Number(audio.duration) || Number(audio.dataset.duration) || 0;
            const currentTime = Number(audio.currentTime) || 0;
            const ratio = duration > 0 ? Math.max(0, Math.min(1, currentTime / duration)) : 0;
            const playedBars = Math.round(bars.length * ratio);
            const displayTime = (!audio.paused && currentTime > 0) ? currentTime : duration;

            if (durationEl) {
                durationEl.textContent = this.formatVoiceDuration(displayTime);
            }

            bars.forEach((bar, index) => {
                bar.classList.toggle('is-played', index < playedBars);
            });

            toggle.classList.toggle('is-playing', !audio.paused);
        };

        audio.addEventListener('loadedmetadata', () => {
            audio.dataset.duration = String(Number(audio.duration) || 0);
            sync();
        });
        audio.addEventListener('timeupdate', sync);
        audio.addEventListener('play', sync);
        audio.addEventListener('pause', sync);
        audio.addEventListener('ended', () => {
            audio.currentTime = 0;
            sync();
        });

        toggle.addEventListener('click', () => {
            if (this.activeVoiceMessageAudio && this.activeVoiceMessageAudio !== audio) {
                const previousAudio = this.activeVoiceMessageAudio;
                previousAudio.pause();
                previousAudio.currentTime = 0;

                const previousRoot = previousAudio.closest('.message-voice-note');
                if (previousRoot) {
                    previousRoot.querySelectorAll('.voice-message-bar').forEach((bar) => bar.classList.remove('is-played'));

                    const previousToggle = previousRoot.querySelector('.voice-message-toggle');
                    if (previousToggle) previousToggle.classList.remove('is-playing');

                    const previousDuration = previousRoot.querySelector('.voice-message-duration');
                    if (previousDuration) {
                        previousDuration.textContent = this.formatVoiceDuration(Number(previousAudio.dataset.duration) || 0);
                    }
                }
            }

            if (audio.paused) {
                this.activeVoiceMessageAudio = audio;
                const playPromise = audio.play();
                if (playPromise && typeof playPromise.catch === 'function') {
                    playPromise.catch(() => {});
                }
            } else {
                audio.pause();
            }

            sync();
        });

        sync();
    };

    AdvancedApp.prototype.bindChatImageMessageInteraction = function(messageEl) {
        if (!messageEl) return;

        const trigger = messageEl.querySelector('.image-message-hit');
        if (!trigger || trigger.dataset.bound === '1') return;

        trigger.dataset.bound = '1';
        trigger.addEventListener('click', () => {
            const src = trigger.dataset.imageUrl || '';
            const name = trigger.dataset.imageName || 'photo';
            this.openChatImageViewer(src, name);
        });
    };

    AdvancedApp.prototype.ensureChatImageViewer = function() {
        if (this.chatImageViewer) return this.chatImageViewer;

        const root = document.createElement('div');
        root.className = 'chat-image-viewer';
        root.hidden = true;
        root.innerHTML = `
            <div class="chat-image-viewer-backdrop" data-action="close"></div>
            <div class="chat-image-viewer-shell" role="dialog" aria-modal="true" aria-label="\u041f\u0440\u043e\u0441\u043c\u043e\u0442\u0440 \u0444\u043e\u0442\u043e">
                <div class="chat-image-viewer-toolbar">
                    <a class="chat-image-viewer-download" href="#" download data-action="download">\u0421\u043a\u0430\u0447\u0430\u0442\u044c</a>
                    <button class="chat-image-viewer-close" type="button" data-action="close" aria-label="\u0417\u0430\u043a\u0440\u044b\u0442\u044c \u0444\u043e\u0442\u043e">\u2715</button>
                </div>
                <div class="chat-image-viewer-stage">
                    <img class="chat-image-viewer-image" alt="\u0424\u043e\u0442\u043e">
                </div>
            </div>
        `;

        document.body.appendChild(root);

        const imageEl = root.querySelector('.chat-image-viewer-image');
        const downloadEl = root.querySelector('.chat-image-viewer-download');

        const closeViewer = () => {
            this.closeChatImageViewer();
        };

        root.addEventListener('click', (event) => {
            if (event.target === root || event.target.closest('[data-action="close"]')) {
                closeViewer();
            }
        });

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && root.classList.contains('is-visible')) {
                closeViewer();
            }
        });

        this.chatImageViewer = {
            root,
            imageEl,
            downloadEl,
            closeTimer: null
        };

        return this.chatImageViewer;
    };

    AdvancedApp.prototype.openChatImageViewer = function(src = '', name = 'photo') {
        const imageSrc = String(src || '').trim();
        if (!imageSrc) return;

        const viewer = this.ensureChatImageViewer();
        if (viewer.closeTimer) {
            clearTimeout(viewer.closeTimer);
            viewer.closeTimer = null;
        }

        viewer.imageEl.setAttribute('src', imageSrc);
        viewer.downloadEl.setAttribute('href', imageSrc);
        viewer.downloadEl.setAttribute('download', String(name || 'photo'));

        viewer.root.hidden = false;
        document.body.classList.add('chat-image-viewer-open');

        requestAnimationFrame(() => {
            viewer.root.classList.add('is-visible');
        });
    };

    AdvancedApp.prototype.closeChatImageViewer = function() {
        const viewer = this.chatImageViewer;
        if (!viewer || viewer.root.hidden) return;

        viewer.root.classList.remove('is-visible');
        document.body.classList.remove('chat-image-viewer-open');

        viewer.closeTimer = setTimeout(() => {
            viewer.imageEl.removeAttribute('src');
            viewer.downloadEl.setAttribute('href', '#');
            viewer.root.hidden = true;
        }, 180);
    };

})(window);

