// Extracted messaging and notifications logic from js/app.js.
(function attachAppMessagesModule(global) {
    'use strict';

    const AdvancedApp = global.AdvancedApp;
    if (!AdvancedApp || !AdvancedApp.prototype) {
        console.error('[app-messages] AdvancedApp is unavailable.');
        return;
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
            } else if (notif.type === 'gift') {
                icon = 'gift';
                userName = notifData.fromUser || 'user';
                const amount = Math.max(0, parseInt(notifData.amount, 10) || 0);
                text = amount ? `отправил(а) подарок ${amount} ₽` : 'отправил(а) подарок';
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
                <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(userName || 'user')}&background=random&size=48" class="notification-avatar">
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
            const statusPart = chat.lastMessageFromMe
                ? `<span class="chat-last-status ${statusClass}">${statusIcon}</span>`
                : '';
            const unreadBadge = chat.unreadCount > 0
                ? `<span class="chat-unread-count">${chat.unreadCount > 99 ? '99+' : chat.unreadCount}</span>`
                : '';
            const avatar = chat.otherAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(chat.otherUser || 'user')}&background=random&size=64`;
            const presence = this.formatLastSeen(!!chat.otherOnline, chat.otherLastSeen);
            const onlineDot = chat.otherOnline ? '<span class="chat-online-dot"></span>' : '';
            const safeUser = this.escapeHtml(chat.otherUser || 'user');
            const verifiedBadge = chat.otherVerified ? '<span style="color:#46a4ff; font-size:12px;">✓</span>' : '';
            chatItem.innerHTML = `
                <div class="chat-avatar-wrap">
                    <img src="${avatar}" class="chat-avatar" alt="@${safeUser}">
                    ${onlineDot}
                </div>
                <div class="chat-info">
                    <div class="chat-main-row">
                        <div class="chat-user">@${safeUser} ${verifiedBadge}</div>
                        <div class="chat-presence">${presence}</div>
                    </div>
                    <div class="chat-preview-row">
                        <div class="chat-last-message">${statusPart}${preview}</div>
                        <div class="chat-time">${this.formatTime(chat.lastMessageTime)}</div>
                        ${unreadBadge}
                    </div>
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

        const avatar = targetProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&size=64`;
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
            this.chatUserStatus.textContent = 'печатает...';
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
                if ((file.type || '').startsWith('image/')) {
                    localUrl = await new Promise((resolve, reject) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target.result);
                        reader.onerror = reject;
                        reader.readAsDataURL(file);
                    });
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

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        this.callLocalStream = stream;
        if (this.callLocalVideo) this.callLocalVideo.srcObject = stream;
        return stream;
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
                await this.callPeerConnection.addIceCandidate(new RTCIceCandidate(candidate));
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
                    await this.callPeerConnection.addIceCandidate(new RTCIceCandidate(row.candidate));
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

        await this.callPeerConnection.setRemoteDescription(new RTCSessionDescription(call.offer));
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
                await this.callPeerConnection.setRemoteDescription(new RTCSessionDescription(call.answer));
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

})(window);

