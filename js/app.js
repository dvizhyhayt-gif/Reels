/**
 * AdvancedApp
 * Основное приложение - управление состоянием и событиями
 */
class AdvancedApp {
    constructor() {
        this.dataService = new AdvancedDataService();
        this.state = {
            currentVideoId: null,
            activeCommentsVideoId: null,
            currentPage: 0,
            loading: false,
            hasMore: true,
            activeFeedIndex: 0,
            feedSource: 'for-you', // 'for-you' | 'following'
            feedMode: 'global', // 'global' | 'custom' (e.g. opened from profile grid)
            feedReturnViewId: null,
            isRecording: false,
            mediaRecorder: null,
            recordedChunks: [],
            recordedMimeType: 'video/webm',
            selectedFilter: 'none',
            theme: 'dark',
            avatarData: null,
            currentChatId: null,
            currentChatUser: null,
            currentChatUid: null,
            activeCallId: null
        };
        this.uploadDraftKey = 'reelgram_upload_draft_v1';
        this.feedPrefsKey = 'reelgram_feed_prefs_v1';
        this.moderationPrefsKey = 'reelgram_moderation_prefs_v1';
        this.watchProfileKey = 'reelgram_watch_profile_v1';
        this.uploadDraftSaveTimer = null;
        this.uploadDraftNoteTimer = null;
        this.notificationBadgeTimer = null;
        this.watchProfile = { authors: {}, tags: {} };
        this.moderationPrefs = { blockedUsers: [], hiddenAuthors: [] };
        this.onboardingSelection = new Set();
        this.cameraInitialized = false;
        this.cameraInitPromise = null;
        this.recordBtnBound = false;
        this.chatMessagesUnsubscribe = null;
        this.chatTypingUnsubscribe = null;
        this.chatRefreshInterval = null;
        this.chatPresenceInterval = null;
        this.stopTypingTimeout = null;
        this.lastTypingState = false;
        this.lastTypingAt = 0;
        this.keyboardHandlersBound = false;
        this.emojiList = ['😀', '😂', '😍', '😎', '🥳', '🔥', '❤️', '👍', '👏', '🤝', '🤔', '😢', '🙌', '✨', '😅', '🎉'];
        this.stickerPack = [
            { id: 'party', title: 'Party', emoji: '🥳', style: 'sticker-style-party', motion: 'sticker-motion-bounce' },
            { id: 'wow', title: 'Wow', emoji: '🤯', style: 'sticker-style-wow', motion: 'sticker-motion-pop' },
            { id: 'cool', title: 'Cool', emoji: '😎', style: 'sticker-style-cool', motion: 'sticker-motion-wiggle' },
            { id: 'love', title: 'Love', emoji: '😍', style: 'sticker-style-love', motion: 'sticker-motion-pulse' },
            { id: 'fire', title: 'Fire', emoji: '🔥', style: 'sticker-style-fire', motion: 'sticker-motion-pop' },
            { id: 'lol', title: 'Lol', emoji: '😂', style: 'sticker-style-lol', motion: 'sticker-motion-bounce' },
            { id: 'power', title: 'Power', emoji: '💪', style: 'sticker-style-power', motion: 'sticker-motion-pulse' },
            { id: 'hype', title: 'Hype', emoji: '⚡', style: 'sticker-style-hype', motion: 'sticker-motion-wiggle' }
        ];
        this.stickerPackById = new Map(this.stickerPack.map(sticker => [sticker.id, sticker]));

        // Feed video lifecycle / paging
        this.feedVideoObserver = null;
        this.feedIntersectionRatios = new Map();
        this.savedGlobalFeed = null;
        this.customFeed = null;
        this.deletedVideoIds = new Set();
        this.boundFeedItems = new WeakSet();
        this.observedFeedItems = new WeakSet();
        this.profileGridObserver = null;
        this.viewedFeedFirestoreIds = new Set();
        this.feedPaging = {
            touchStartScrollTop: 0,
            touchStartIndex: 0,
            pendingSettle: false,
            settleTimer: null,
            programmaticScroll: false,
            programmaticTimer: null
        };

        // Realtime incoming message UI (badge + toast)
        this.incomingMessagesUnsubscribe = null;
        this.incomingMessagesUid = null;
        this.incomingCallsUnsubscribe = null;
        this.incomingCallsUid = null;
        this.knownIncomingCallIds = new Set();

        // WebRTC call state
        this.pendingIncomingCall = null;
        this.activeCall = null;
        this.callDocUnsubscribe = null;
        this.callCandidatesUnsubscribe = null;
        this.callPeerConnection = null;
        this.callLocalStream = null;
        this.callRemoteStream = null;
        this.callKnownCandidateIds = new Set();
        this.pendingCallCandidates = [];
        this.callOfferSent = false;
        this.callAnswerSent = false;
        this.callRemoteDescriptionSet = false;
        this.callStarting = false;
        this.adminUsers = [];
        this.adminFilteredUsers = [];

        this.init();
    }

    async init() {
        console.log('🚀 Initializing app...');
        this.cacheElements();
        this.setupAppViewportHeight();
        this.setupTheme();
        this.setupEventListeners();
        this.setupNotifications();
        this.setupPullToRefresh();
        this.setupFeedPaging();
        this.setupSwipe();
        this.restoreFeedPreferences();
        this.loadWatchProfile();

        // FirebaseService инициализируется асинхронно в firebase-service.js (через setTimeout).
        // Чтобы лента/профиль после перезагрузки брали данные из Firestore, ждём готовности (с таймаутом).
        if (typeof waitForFirebaseService === 'function') {
            await waitForFirebaseService(5000);
        }

        this.restoreModerationPreferences();
        await this.loadFeed(true);
        this.updateProfileUI();
        this.setupIncomingMessagesWatcher();
        this.setupIncomingCallsWatcher();
        this.updateHamburgerVisibility();
        this.updateAdminMenuVisibility();
        this.scheduleNotificationBadgeRefresh();
        
        this.setupDeepLinks();
        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('video');
        if (videoId) {
            this.navigateTo('feed-view');
            setTimeout(() => {
                this.scrollToFeedVideoById(videoId, { play: true });
            }, 300);
        }
    }

    cacheElements() {
        this.feedContainer = document.getElementById('feed-container');
        this.feedBackBtn = document.getElementById('feed-back-btn');
        this.feedFilterTabs = document.getElementById('feed-filter-tabs');
        this.feedFilterButtons = document.querySelectorAll('.feed-filter-tab');
        this.views = document.querySelectorAll('.view');
        this.navItems = document.querySelectorAll('.nav-item');
        this.toast = document.getElementById('toast');
        this.commentsSheet = document.getElementById('comments-sheet');
        this.shareModal = document.getElementById('share-modal');
        this.hamburgerBtn = document.getElementById('hamburger-btn');
        this.menuDropdown = document.getElementById('menu-dropdown');
        this.themeToggleMenu = document.getElementById('theme-toggle-menu');
        this.adminMenu = document.getElementById('admin-menu');
        this.logoutMenu = document.getElementById('logout-menu');
        this.searchViewInput = document.getElementById('search-view-input');
        this.searchViewClear = document.getElementById('search-view-clear');
        this.searchResults = document.getElementById('search-results');
        this.searchEmpty = document.getElementById('search-empty');
        
        this.messagesBadge = document.getElementById('notification-badge');
        this.notificationsBadge = document.getElementById('social-notification-badge');
        this.notificationsList = document.getElementById('notifications-list');
        this.notificationTabs = document.querySelectorAll('.notification-tab');
        this.notificationsEmpty = document.getElementById('notifications-empty');

        this.userListSheet = document.getElementById('user-list-sheet');
        this.userListTitle = document.getElementById('user-list-title');
        this.userList = document.getElementById('user-list');
        this.closeUserListBtn = document.getElementById('close-user-list');
        
        this.messagesListSection = document.getElementById('messages-list-section');
        this.chatDialog = document.getElementById('chat-dialog');
        this.chatList = document.getElementById('chat-list');
        this.chatHeader = document.getElementById('chat-header');
        this.messagesContainer = document.getElementById('messages-container');
        this.messageInput = document.getElementById('message-input');
        this.sendMessageBtn = document.getElementById('send-message-btn');
        this.backToListBtn = document.getElementById('back-to-list');
        this.newMessageBtn = document.getElementById('new-message-btn');
        this.messageSearchInput = document.getElementById('message-search-input');
        this.messagesEmpty = document.getElementById('messages-empty');
        this.chatUserTrigger = document.getElementById('chat-user-trigger');
        this.chatUserAvatar = document.getElementById('chat-user-avatar');
        this.chatUserName = document.getElementById('chat-user-name');
        this.chatUserStatus = document.getElementById('chat-user-status');
        this.typingIndicator = document.getElementById('typing-indicator');
        this.typingText = document.getElementById('typing-text');
        this.emojiPicker = document.getElementById('emoji-picker');
        this.stickerPicker = document.getElementById('sticker-picker');
        this.emojiToggleBtn = document.getElementById('emoji-toggle-btn');
        this.stickerToggleBtn = document.getElementById('sticker-toggle-btn');
        this.videoCircleBtn = document.getElementById('video-circle-btn');
        this.videoCallBtn = document.getElementById('video-call-btn');
        this.attachFileBtn = document.getElementById('attach-file-btn');
        this.chatVideoCircleInput = document.getElementById('chat-video-circle-input');
        this.chatFileInput = document.getElementById('chat-file-input');
        this.messageInputArea = document.getElementById('message-input-area');
        this.callModal = document.getElementById('call-modal');
        this.callTitle = document.getElementById('call-title');
        this.callPeer = document.getElementById('call-peer');
        this.callStatus = document.getElementById('call-status');
        this.callAcceptBtn = document.getElementById('call-accept-btn');
        this.callDeclineBtn = document.getElementById('call-decline-btn');
        this.callRemoteVideo = document.getElementById('call-remote-video');
        this.callLocalVideo = document.getElementById('call-local-video');
        this.callVideoPlaceholder = document.getElementById('call-video-placeholder');

        this.cameraPreview = document.getElementById('camera-preview');
        this.cameraVideo = document.getElementById('camera-video');
        this.cameraCanvas = document.getElementById('camera-canvas');
        this.recordBtn = document.getElementById('record-btn');

        this.uploadDescInput = document.getElementById('upload-desc');
        this.uploadTagsInput = document.getElementById('upload-tags');
        this.allowCommentsInput = document.getElementById('allow-comments');
        this.privateVideoInput = document.getElementById('private-video');
        this.saveDraftBtn = document.getElementById('save-draft-btn');
        this.clearDraftBtn = document.getElementById('clear-draft-btn');
        this.uploadDraftNote = document.getElementById('upload-draft-note');

        this.onboardingModal = document.getElementById('onboarding-modal');
        this.onboardingChipsContainer = document.getElementById('onboarding-chips');
        this.onboardingSaveBtn = document.getElementById('onboarding-save-btn');
        this.onboardingSkipBtn = document.getElementById('onboarding-skip-btn');

        this.adminBackBtn = document.getElementById('admin-back-btn');
        this.adminRefreshBtn = document.getElementById('admin-refresh-btn');
        this.adminUserSearchInput = document.getElementById('admin-user-search');
        this.adminUsersList = document.getElementById('admin-users-list');
        this.adminExportUserA = document.getElementById('admin-export-user-a');
        this.adminExportUserB = document.getElementById('admin-export-user-b');
        this.adminCaseIdInput = document.getElementById('admin-case-id');
        this.adminRequestedByInput = document.getElementById('admin-requested-by');
        this.adminExportReasonInput = document.getElementById('admin-export-reason');
        this.adminExportChatBtn = document.getElementById('admin-export-chat-btn');
        this.adminLastExport = document.getElementById('admin-last-export');
    }

    setupAppViewportHeight() {
        // Fix "cropped UI" on some mobile browsers where 100vh includes the URL bar.
        let raf = 0;
        const update = () => {
            if (raf) return;
            raf = window.requestAnimationFrame(() => {
                raf = 0;
                const height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
                if (!height || !Number.isFinite(height)) return;
                document.documentElement.style.setProperty('--app-height', `${Math.round(height)}px`);
            });
        };

        update();
        window.addEventListener('resize', update);
        window.addEventListener('orientationchange', update);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', update);
            window.visualViewport.addEventListener('scroll', update);
        }
    }

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    renderUserLabel(name, verified = false) {
        const safeName = this.escapeHtml(name || 'user');
        const badge = AdvancedViewRenderer.getVerifiedBadge(verified);
        return `<span style="display:inline-flex;align-items:center;gap:6px;">@${safeName}${badge}</span>`;
    }

    syncUserMetaInUi(profile) {
        const user = profile || {};
        const uid = user && user.uid ? String(user.uid) : null;
        if (!uid) return;

        const name = typeof user.name === 'string' ? user.name : null;
        const avatar = typeof user.avatar === 'string' ? user.avatar : null;
        const verified = !!user.verified;

        // Update in-memory cache used by feed/comments/search UI.
        if (this.dataService && Array.isArray(this.dataService.userVideos)) {
            this.dataService.userVideos.forEach(v => {
                if (!v || !v.uid) return;
                if (String(v.uid) !== uid) return;
                if (name) v.author = name;
                if (avatar) v.avatar = avatar;
                v.authorVerified = verified;
            });
            if (typeof this.dataService.syncFeedCacheWithLocal === 'function') {
                this.dataService.syncFeedCacheWithLocal();
            }
        }

        // Update currently rendered feed items so name/avatar change is visible instantly.
        if (!this.feedContainer) return;
        const items = this.feedContainer.querySelectorAll(`.video-item[data-uid="${uid}"]`);
        items.forEach(item => {
            if (name) item.dataset.author = name;

            const avatarContainer = item.querySelector('.avatar-container');
            if (avatarContainer) {
                avatarContainer.dataset.uid = uid;
                if (name) avatarContainer.dataset.author = name;
            }

            const avatarImg = item.querySelector('.avatar-container img');
            if (avatarImg) {
                avatarImg.dataset.uid = uid;
                if (avatar) avatarImg.src = avatar;
                if (name) {
                    avatarImg.alt = name;
                    avatarImg.dataset.author = name;
                }
            }

            const usernameEl = item.querySelector('.video-info .username');
            if (usernameEl && name) {
                usernameEl.innerHTML = this.renderUserLabel(name, verified);
            }

            const musicSpan = item.querySelector('.music-row span');
            if (musicSpan && name) {
                musicSpan.textContent = `Оригинальный звук - ${name}`;
            }
        });
    }

    // ==================== НАДЁЖНЫЙ ПЕРЕКЛЮЧАТЕЛЬ ФОРМ ====================
    setupAuthSwitchListeners() {
        console.log('🔄 Переподключаем переключатели форм');
        const switchToReg = document.getElementById('switch-to-reg');
        const switchToLogin = document.getElementById('switch-to-login');

        if (switchToReg) {
            switchToReg.onclick = (e) => {
                if (e && typeof e.preventDefault === 'function') e.preventDefault();
                document.getElementById('login-form').style.display = 'none';
                document.getElementById('register-form').style.display = 'block';
            };
        }
        if (switchToLogin) {
            switchToLogin.onclick = (e) => {
                if (e && typeof e.preventDefault === 'function') e.preventDefault();
                document.getElementById('login-form').style.display = 'block';
                document.getElementById('register-form').style.display = 'none';
            };
        }
    }

    setupTheme() {
        const theme = this.dataService.settings.theme;
        this.state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        
        const themeText = document.getElementById('theme-text');
        themeText.textContent = theme === 'dark' ? 'Светлая тема' : 'Темная тема';
        
        this.hamburgerBtn.addEventListener('click', () => {
            this.hamburgerBtn.classList.toggle('active');
            this.menuDropdown.classList.toggle('active');
        });
        
        document.addEventListener('click', (e) => {
            if (!this.hamburgerBtn.contains(e.target) && !this.menuDropdown.contains(e.target)) {
                this.hamburgerBtn.classList.remove('active');
                this.menuDropdown.classList.remove('active');
            }
        });
        
        this.themeToggleMenu.addEventListener('click', () => {
            const newTheme = this.state.theme === 'dark' ? 'light' : 'dark';
            this.state.theme = newTheme;
            document.documentElement.setAttribute('data-theme', newTheme);
            this.dataService.settings.theme = newTheme;
            this.dataService.saveSettings();
            
            const themeText = document.getElementById('theme-text');
            themeText.textContent = newTheme === 'dark' ? 'Светлая тема' : 'Темная тема';
            
            AdvancedViewRenderer.showToast(`Тема изменена на ${newTheme === 'dark' ? 'темную' : 'светлую'}`, 'success');
            this.hamburgerBtn.classList.remove('active');
            this.menuDropdown.classList.remove('active');
        });
        
        this.logoutMenu.addEventListener('click', async () => {
            if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
                try {
                    const ready = await waitForFirebaseService(5000);
                    if (!ready || !firebaseService || !firebaseService.isInitialized()) {
                        throw new Error('Firebase не готов.');
                    }
                    await firebaseService.logout();
                    AdvancedViewRenderer.showToast('Вы вышли из аккаунта', 'success');
                    this.navigateTo('auth-view');
                } catch (error) {
                    AdvancedViewRenderer.showToast('Ошибка при выходе: ' + error.message, 'error');
                }
            }
        });
    }

    isCurrentUserAdmin() {
        const current = firebaseService && typeof firebaseService.getCurrentUser === 'function'
            ? firebaseService.getCurrentUser()
            : this.dataService.getCurrentUser();
        return !!(current && (current.isAdmin === true || current.canVerify === true));
    }

    updateAdminMenuVisibility() {
        if (!this.adminMenu) return;
        const canAccessAdmin = this.isCurrentUserAdmin();
        this.adminMenu.style.display = canAccessAdmin ? 'flex' : 'none';

        if (!canAccessAdmin && this.state.activeViewId === 'admin-view') {
            this.navigateTo('profile-view');
        }
    }

    setupAdminEvents() {
        if (this.adminMenu && this.adminMenu.dataset.bound !== '1') {
            this.adminMenu.dataset.bound = '1';
            this.adminMenu.addEventListener('click', async () => {
                if (!this.isCurrentUserAdmin()) {
                    AdvancedViewRenderer.showToast('Доступ только для администратора', 'warning');
                    this.updateAdminMenuVisibility();
                    return;
                }

                if (this.hamburgerBtn) this.hamburgerBtn.classList.remove('active');
                if (this.menuDropdown) this.menuDropdown.classList.remove('active');

                this.navigateTo('admin-view');
            });
        }

        if (this.adminBackBtn && this.adminBackBtn.dataset.bound !== '1') {
            this.adminBackBtn.dataset.bound = '1';
            this.adminBackBtn.addEventListener('click', () => {
                this.navigateTo('profile-view');
            });
        }

        if (this.adminRefreshBtn && this.adminRefreshBtn.dataset.bound !== '1') {
            this.adminRefreshBtn.dataset.bound = '1';
            this.adminRefreshBtn.addEventListener('click', async () => {
                await this.loadAdminPanelData({ showToast: true });
            });
        }

        if (this.adminUserSearchInput && this.adminUserSearchInput.dataset.bound !== '1') {
            this.adminUserSearchInput.dataset.bound = '1';
            this.adminUserSearchInput.addEventListener('input', () => {
                this.renderAdminUsersList(this.adminUserSearchInput.value || '');
            });
        }

        if (this.adminExportChatBtn && this.adminExportChatBtn.dataset.bound !== '1') {
            this.adminExportChatBtn.dataset.bound = '1';
            this.adminExportChatBtn.addEventListener('click', async () => {
                await this.exportAdminChatHistory();
            });
        }
    }

    async loadAdminPanelData({ showToast = false } = {}) {
        if (!this.isCurrentUserAdmin()) {
            this.updateAdminMenuVisibility();
            if (this.adminUsersList) {
                this.adminUsersList.innerHTML = '<div class="admin-empty">Требуются права администратора.</div>';
            }
            return;
        }

        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) {
            if (showToast) AdvancedViewRenderer.showToast('Firebase еще не готов', 'warning');
            return;
        }

        try {
            if (this.adminUsersList) {
                this.adminUsersList.innerHTML = '<div class="admin-empty">Загрузка пользователей...</div>';
            }

            let users = [];
            if (typeof firebaseService.getUsersForAdmin === 'function') {
                users = await firebaseService.getUsersForAdmin(500);
            } else if (typeof firebaseService.getAllUsers === 'function') {
                users = await firebaseService.getAllUsers();
            }

            this.adminUsers = Array.isArray(users) ? users : [];
            this.renderAdminUsersList(this.adminUserSearchInput ? this.adminUserSearchInput.value : '');
            this.populateAdminExportUsers();

            if (showToast) {
                AdvancedViewRenderer.showToast(`Загружено пользователей: ${this.adminUsers.length}`, 'success');
            }
        } catch (error) {
            console.error('Admin panel load error:', error);
            this.adminUsers = [];
            if (this.adminUsersList) {
                this.adminUsersList.innerHTML = '<div class="admin-empty">Не удалось загрузить пользователей.</div>';
            }
            if (showToast) {
                AdvancedViewRenderer.showToast(error.message || 'Ошибка админки', 'error');
            }
        }
    }

    renderAdminUsersList(query = '') {
        if (!this.adminUsersList) return;

        const needle = String(query || '').trim().toLowerCase();
        const filtered = this.adminUsers.filter((user) => {
            if (!needle) return true;
            const name = String(user?.name || '').toLowerCase();
            const uid = String(user?.uid || '').toLowerCase();
            const email = String(user?.email || '').toLowerCase();
            return name.includes(needle) || uid.includes(needle) || email.includes(needle);
        });
        this.adminFilteredUsers = filtered;

        this.adminUsersList.innerHTML = '';
        if (!filtered.length) {
            this.adminUsersList.innerHTML = '<div class="admin-empty">Пользователи не найдены.</div>';
            return;
        }

        const currentUid = firebaseService && typeof firebaseService.getCurrentUid === 'function'
            ? firebaseService.getCurrentUid()
            : null;

        filtered.forEach((user) => {
            const row = document.createElement('div');
            row.className = 'admin-user-row';

            const meta = document.createElement('div');
            meta.className = 'admin-user-meta';
            const nameEl = document.createElement('div');
            nameEl.className = 'admin-user-name';
            nameEl.textContent = `@${user?.name || 'user'}`;
            const subEl = document.createElement('div');
            subEl.className = 'admin-user-sub';
            const flags = [];
            if (user?.isAdmin) flags.push('админ');
            if (user?.verified) flags.push('галочка');
            subEl.textContent = `${user?.uid || 'без uid'}${flags.length ? ` • ${flags.join(' • ')}` : ''}`;
            meta.appendChild(nameEl);
            meta.appendChild(subEl);

            const adminBtn = document.createElement('button');
            adminBtn.className = `admin-toggle-btn${user?.isAdmin ? ' is-on' : ''}`;
            adminBtn.textContent = user?.isAdmin ? 'Админ: ВКЛ' : 'Сделать админом';
            if (currentUid && user?.uid === currentUid) {
                adminBtn.disabled = true;
                adminBtn.title = 'Нельзя изменить свою роль';
            }
            adminBtn.addEventListener('click', async () => {
                await this.adminToggleUserAdmin(user);
            });

            const verifyBtn = document.createElement('button');
            verifyBtn.className = `admin-toggle-btn${user?.verified ? ' is-verified' : ''}`;
            verifyBtn.textContent = user?.verified ? 'Галочка: ВКЛ' : 'Выдать галочку';
            verifyBtn.addEventListener('click', async () => {
                await this.adminToggleUserVerification(user);
            });

            row.appendChild(meta);
            row.appendChild(adminBtn);
            row.appendChild(verifyBtn);
            this.adminUsersList.appendChild(row);
        });
    }

    populateAdminExportUsers() {
        if (!this.adminExportUserA || !this.adminExportUserB) return;

        const selectedA = this.adminExportUserA.value || '';
        const selectedB = this.adminExportUserB.value || '';
        const users = Array.isArray(this.adminUsers) ? this.adminUsers : [];

        const fillSelect = (selectEl, selectedValue) => {
            selectEl.innerHTML = '';

            const placeholder = document.createElement('option');
            placeholder.value = '';
            placeholder.textContent = 'Выберите пользователя';
            selectEl.appendChild(placeholder);

            users.forEach((user) => {
                if (!user || !user.uid) return;
                const option = document.createElement('option');
                option.value = user.uid;
                option.textContent = `@${user.name || 'user'} (${String(user.uid).slice(0, 8)})`;
                selectEl.appendChild(option);
            });

            if (selectedValue && users.some(user => user.uid === selectedValue)) {
                selectEl.value = selectedValue;
            }
        };

        fillSelect(this.adminExportUserA, selectedA);
        fillSelect(this.adminExportUserB, selectedB);
    }

    async adminToggleUserAdmin(user) {
        if (!user || !user.uid) return;
        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) return;
        if (typeof firebaseService.setUserAdmin !== 'function') {
            AdvancedViewRenderer.showToast('API роли администратора недоступен', 'warning');
            return;
        }

        try {
            await firebaseService.setUserAdmin(user.uid, !user.isAdmin);
            this.adminUsers = this.adminUsers.map((item) => {
                if (!item || item.uid !== user.uid) return item;
                return { ...item, isAdmin: !user.isAdmin };
            });

            this.updateAdminMenuVisibility();
            this.renderAdminUsersList(this.adminUserSearchInput ? this.adminUserSearchInput.value : '');
            this.populateAdminExportUsers();
            const currentUid = firebaseService && typeof firebaseService.getCurrentUid === 'function'
                ? firebaseService.getCurrentUid()
                : null;
            if (currentUid && user.uid === currentUid) {
                this.updateProfileUI();
            }
            AdvancedViewRenderer.showToast(!user.isAdmin ? 'Права администратора выданы' : 'Права администратора сняты', 'success');
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error.message || 'Не удалось изменить роль администратора', 'error');
        }
    }

    async adminToggleUserVerification(user) {
        if (!user || !user.uid) return;
        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) return;
        if (typeof firebaseService.setUserVerified !== 'function') {
            AdvancedViewRenderer.showToast('API верификации недоступен', 'warning');
            return;
        }

        try {
            await firebaseService.setUserVerified(user.uid, !user.verified);
            this.adminUsers = this.adminUsers.map((item) => {
                if (!item || item.uid !== user.uid) return item;
                return { ...item, verified: !user.verified };
            });

            this.renderAdminUsersList(this.adminUserSearchInput ? this.adminUserSearchInput.value : '');
            const currentUid = firebaseService && typeof firebaseService.getCurrentUid === 'function'
                ? firebaseService.getCurrentUid()
                : null;
            if (currentUid && user.uid === currentUid) {
                this.updateProfileUI();
            }
            AdvancedViewRenderer.showToast(!user.verified ? 'Галочка выдана' : 'Галочка снята', 'success');
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error.message || 'Не удалось изменить верификацию', 'error');
        }
    }

    async exportAdminChatHistory() {
        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) {
            AdvancedViewRenderer.showToast('Firebase еще не готов', 'warning');
            return;
        }
        if (typeof firebaseService.exportChatHistoryForLegalRequest !== 'function') {
            AdvancedViewRenderer.showToast('API выгрузки чата недоступен', 'warning');
            return;
        }

        const uidA = this.adminExportUserA ? this.adminExportUserA.value : '';
        const uidB = this.adminExportUserB ? this.adminExportUserB.value : '';

        if (!uidA || !uidB) {
            AdvancedViewRenderer.showToast('Выберите двух пользователей для выгрузки', 'warning');
            return;
        }
        if (uidA === uidB) {
            AdvancedViewRenderer.showToast('Пользователи должны быть разными', 'warning');
            return;
        }

        const caseId = this.adminCaseIdInput ? this.adminCaseIdInput.value.trim() : '';
        const requestedBy = this.adminRequestedByInput ? this.adminRequestedByInput.value.trim() : '';
        const reason = this.adminExportReasonInput ? this.adminExportReasonInput.value.trim() : '';

        const button = this.adminExportChatBtn;
        const originalText = button ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = 'Выгрузка...';
        }

        try {
            const payload = await firebaseService.exportChatHistoryForLegalRequest({
                uidA,
                uidB,
                caseId,
                requestedBy,
                reason
            });

            const stamp = new Date().toISOString().replace(/[:.]/g, '-');
            const fileName = `reelgram_chat_export_${payload.chatId}_${stamp}.json`;
            this.downloadAdminJson(payload, fileName);

            if (this.adminLastExport) {
                this.adminLastExport.textContent = `Последняя выгрузка: ${new Date().toLocaleString()} (${payload.messageCount} сообщений)`;
            }

            AdvancedViewRenderer.showToast(`Выгрузка завершена (${payload.messageCount} сообщений)`, 'success');
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error.message || 'Не удалось выгрузить чат', 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = originalText;
            }
        }
    }

    downloadAdminJson(data, fileName) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName || `reelgram_export_${Date.now()}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    setupEventListeners() {
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetId = item.dataset.target;

                // If we opened a custom feed (e.g. from profile grid), tapping "Home" should restore global feed.
                if (targetId === 'feed-view' && this.state.feedMode !== 'global') {
                    this.exitCustomFeedMode({ navigateBack: false });
                }

                if (targetId === 'upload-view' && !this.dataService.getCurrentUser()) {
                    this.navigateTo('auth-view');
                    return;
                }
                if (targetId === 'profile-view' && !this.dataService.getCurrentUser()) {
                    this.navigateTo('auth-view');
                    return;
                }
                if (targetId === 'messages-view' && !this.dataService.getCurrentUser()) {
                    this.navigateTo('auth-view');
                    return;
                }
                if (targetId === 'profile-view') {
                    // From bottom navigation we always open own profile, not deep-linked external one
                    this.state.viewingProfileUid = null;
                    if (window.location.hash && window.location.hash.startsWith('#profile-')) {
                        const cleanUrl = `${window.location.pathname}${window.location.search}`;
                        window.history.replaceState(null, '', cleanUrl);
                    }
                }
                if (targetId) this.navigateTo(targetId);
            });
        });

        this.setupAuthEvents();
        this.setupUploadEvents();
        this.setupCommentsEvents();
        this.setupSearchEvents();
        this.setupNotificationsEvents();
        this.setupFeedFilterEvents();
        this.setupOnboardingEvents();
        this.setupMessagesEvents();
        this.setupEditProfileEvents();
        this.setupProfileStatsEvents();
        this.setupUserListSheetEvents();
        this.setupAdminEvents();

        this.feedContainer.addEventListener('scroll', () => {
            if (this.state.feedMode !== 'global') return;
            const { scrollTop, scrollHeight, clientHeight } = this.feedContainer;
            if (scrollHeight - scrollTop - clientHeight < 100 && !this.state.loading && this.state.hasMore) {
                this.loadFeed();
            }
        });

        this.feedBackBtn?.addEventListener('click', () => {
            if (this.state.feedMode === 'custom') {
                this.exitCustomFeedMode({ navigateBack: true });
            }
        });
    }

    setupFeedFilterEvents() {
        if (!this.feedFilterButtons || !this.feedFilterButtons.length) return;

        const switchSource = async (btn) => {
            if (!btn) return;
            const source = btn.dataset.feedSource === 'following' ? 'following' : 'for-you';
            if (source === this.state.feedSource) return;
            await this.setFeedSource(source, { reload: true });
        };

        if (this.feedFilterTabs && this.feedFilterTabs.dataset.bound !== '1') {
            this.feedFilterTabs.dataset.bound = '1';
            this.feedFilterTabs.__lastPointerTs = 0;

            this.feedFilterTabs.addEventListener('pointerup', async (e) => {
                const btn = e.target && e.target.closest ? e.target.closest('.feed-filter-tab') : null;
                if (!btn) return;
                this.feedFilterTabs.__lastPointerTs = Date.now();
                e.preventDefault();
                e.stopPropagation();
                await switchSource(btn);
            });

            this.feedFilterTabs.addEventListener('click', async (e) => {
                const btn = e.target && e.target.closest ? e.target.closest('.feed-filter-tab') : null;
                if (!btn) return;
                if (Date.now() - (this.feedFilterTabs.__lastPointerTs || 0) < 450) {
                    e.preventDefault();
                    return;
                }
                e.preventDefault();
                e.stopPropagation();
                await switchSource(btn);
            });
        }

        this.feedFilterButtons.forEach((btn) => {
            if (!btn) return;
            btn.style.touchAction = 'manipulation';
        });

        this.applyFeedSourceUi();
        this.updateFeedTopControls();
    }

    setupAuthEvents() {
        this.setupAuthSwitchListeners();

        // LOGIN
        document.getElementById('login-btn').addEventListener('click', async () => {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-pass').value.trim();
            
            if (!email || !password) {
                AdvancedViewRenderer.showToast('Заполните все поля', 'warning');
                return;
            }
            
            const btn = document.getElementById('login-btn');
            const btnText = document.getElementById('login-btn-text');
            btnText.textContent = 'Вход...';
            btn.disabled = true;
            
            try {
                const fbReady = await waitForFirebaseService(5000);
                if (!fbReady || !firebaseService || !firebaseService.isInitialized()) {
                    throw new Error('Firebase не готов. Обновите страницу.');
                }
                await firebaseService.login(email, password);
                AdvancedViewRenderer.showToast('Вход через Firebase успешен!', 'success');

                this.navigateTo('feed-view');
                this.updateProfileUI();
                this.restoreModerationPreferences();
                await this.loadFeed(true);
                this.updateNotificationBadge();
            } catch (error) {
                AdvancedViewRenderer.showToast(error.message, 'error');
            } finally {
                btnText.textContent = 'Войти';
                btn.disabled = false;
            }
        });

        // REGISTER
        document.getElementById('register-btn').addEventListener('click', async () => {
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-pass').value.trim();
            const passwordConfirm = document.getElementById('register-pass-confirm').value.trim();
            const userName = document.getElementById('register-username').value.trim();

            if (!email || !password || !passwordConfirm || !userName) {
                AdvancedViewRenderer.showToast('Заполните все поля', 'warning');
                return;
            }
            if (password !== passwordConfirm) {
                AdvancedViewRenderer.showToast('Пароли не совпадают', 'warning');
                return;
            }
            if (password.length < 6) {
                AdvancedViewRenderer.showToast('Пароль должен содержать минимум 6 символов', 'warning');
                return;
            }

            const btn = document.getElementById('register-btn');
            const btnText = document.getElementById('register-btn-text');
            const originalText = btnText.textContent;
            btnText.textContent = 'Регистрация...';
            btn.disabled = true;

            try {
                if (!firebaseService || !firebaseService.isInitialized()) {
                    AdvancedViewRenderer.showToast('Подождите, Firebase загружается...', 'info');
                    const ready = await waitForFirebaseService(8000);
                    if (!ready) {
                        AdvancedViewRenderer.showToast('Firebase не загрузился. Обновите страницу', 'error');
                        return;
                    }
                }

                await firebaseService.register(email, password, userName);
                AdvancedViewRenderer.showToast('🔥 Регистрация через Firebase успешна!', 'success');
                
                document.getElementById('register-form').style.display = 'none';
                document.getElementById('login-form').style.display = 'block';
                document.getElementById('login-email').value = email;
                document.getElementById('login-pass').value = password;
                
                this.navigateTo('feed-view');
                this.updateProfileUI();
                this.restoreModerationPreferences();
                await this.loadFeed(true);
                this.updateNotificationBadge();
                for (let i = 0; i < 20; i += 1) {
                    const current = firebaseService && typeof firebaseService.getCurrentUser === 'function'
                        ? firebaseService.getCurrentUser()
                        : null;
                    if (current && current.uid) break;
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                this.openOnboardingModal({ force: true });
            } catch (error) {
                AdvancedViewRenderer.showToast(error.message || 'Ошибка регистрации', 'error');
            } finally {
                btnText.textContent = originalText;
                btn.disabled = false;
            }
        });
    }

    setupUploadEvents() {
        const uploadArea = document.getElementById('upload-area');
        const fileInput = document.getElementById('video-file-input');
        const cameraToggle = document.getElementById('camera-toggle');
        if (!uploadArea || !fileInput || !cameraToggle) return;
        
        uploadArea.addEventListener('click', () => fileInput.click());
        
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });
        
        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });
        
        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');
            
            const file = e.dataTransfer.files[0];
            if (file && file.type.startsWith('video/')) {
                fileInput.files = e.dataTransfer.files;
                this.previewVideo(file);
            }
        });
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.previewVideo(file);
                this.showUploadDraftNote('Файл выбран. Текст и настройки сохраняются в черновике автоматически.');
            }
        });
        
        cameraToggle.addEventListener('click', async () => this.toggleCamera());
        
        const filterSelector = document.getElementById('filter-selector');
        filterSelector.innerHTML = AdvancedViewRenderer.renderFilterOptions(this.dataService.filters);
        filterSelector.addEventListener('click', (e) => {
            const filterOption = e.target.closest('.filter-option');
            if (filterOption) {
                const filterId = filterOption.dataset.filter;
                this.state.selectedFilter = filterId;
                
                document.querySelectorAll('.filter-option').forEach(opt => opt.classList.remove('active'));
                filterOption.classList.add('active');
                
                const previewVideo = document.getElementById('preview-video');
                if (previewVideo) {
                    const filter = this.dataService.filters.find(f => f.id === filterId);
                    previewVideo.style.filter = filter?.css || '';
                }
                this.scheduleUploadDraftAutosave();
            }
        });

        [this.uploadDescInput, this.uploadTagsInput].forEach((input) => {
            if (!input) return;
            input.addEventListener('input', () => this.scheduleUploadDraftAutosave());
        });
        [this.allowCommentsInput, this.privateVideoInput].forEach((input) => {
            if (!input) return;
            input.addEventListener('change', () => this.scheduleUploadDraftAutosave());
        });
        this.saveDraftBtn?.addEventListener('click', () => {
            this.saveUploadDraft({ manual: true });
        });
        this.clearDraftBtn?.addEventListener('click', () => {
            this.clearUploadDraft({ clearForm: true, showToast: true });
        });
        this.restoreUploadDraft();

        document.getElementById('publish-btn').addEventListener('click', async () => {
            const file = fileInput.files[0];
            const desc = this.uploadDescInput ? this.uploadDescInput.value.trim() : '';
            
            if (!file && !this.state.recordedChunks.length) {
                AdvancedViewRenderer.showToast('Выберите видео или запишите с камеры', 'warning');
                return;
            }
            
            if (!desc) {
                AdvancedViewRenderer.showToast('Добавьте описание', 'warning');
                return;
            }
            
            const btn = document.getElementById('publish-btn');
            const btnText = document.getElementById('publish-btn-text');
            btnText.textContent = 'Публикация...';
            btn.disabled = true;
            
            try {
                let videoBlob;
                if (this.state.recordedChunks.length) {
                    const mime = this.state.recordedMimeType || 'video/webm';
                    const blob = new Blob(this.state.recordedChunks, { type: mime });
                    const ext = mime.includes('mp4') ? 'mp4' : 'webm';
                    try {
                        videoBlob = new File([blob], `recording_${Date.now()}.${ext}`, { type: mime });
                    } catch (_) {
                        videoBlob = blob;
                    }
                } else {
                    videoBlob = file;
                }
                
                const tags = this.uploadTagsInput ? this.uploadTagsInput.value.trim() : '';
                const allowComments = this.allowCommentsInput ? this.allowCommentsInput.checked : true;
                const isPrivate = this.privateVideoInput ? this.privateVideoInput.checked : false;
                
                await this.dataService.uploadVideo(videoBlob, {
                    desc,
                    tags,
                    filter: this.state.selectedFilter,
                    allowComments,
                    private: isPrivate
                });
                
                AdvancedViewRenderer.showToast('Видео опубликовано!', 'success');
                
                fileInput.value = '';
                if (this.uploadDescInput) this.uploadDescInput.value = '';
                if (this.uploadTagsInput) this.uploadTagsInput.value = '';
                if (this.allowCommentsInput) this.allowCommentsInput.checked = true;
                if (this.privateVideoInput) this.privateVideoInput.checked = false;
                document.getElementById('upload-preview').style.display = 'none';
                uploadArea.style.display = 'flex';
                this.state.recordedChunks = [];
                this.state.selectedFilter = 'none';
                document.querySelectorAll('.filter-option').forEach(opt => {
                    opt.classList.toggle('active', opt.dataset.filter === 'none');
                });
                this.clearUploadDraft({ clearForm: false, showToast: false });
                
                this.navigateTo('profile-view');
                this.updateProfileUI();
            } catch (error) {
                AdvancedViewRenderer.showToast(error.message || 'Ошибка при загрузке видео', 'error');
                console.error(error);
            } finally {
                btnText.textContent = 'Опубликовать';
                btn.disabled = false;
            }
        });
    }

    setupCommentsEvents() {
        document.getElementById('close-comments').addEventListener('click', () => {
            this.commentsSheet.classList.remove('open');
        });
        
        document.getElementById('send-comment').addEventListener('click', () => {
            this.sendComment();
        });
        
        document.getElementById('comment-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendComment();
        });
    }

    setupSearchEvents() {
        let searchTimeout;
        
        this.searchViewInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            
            if (query.length > 0) {
                this.searchViewClear.style.display = 'flex';
            } else {
                this.searchViewClear.style.display = 'none';
            }
            
            clearTimeout(searchTimeout);
            if (query.length > 0) {
                searchTimeout = setTimeout(() => {
                    this.performSearch(query);
                }, 300);
            } else {
                this.searchEmpty.style.display = 'flex';
                this.searchResults.style.display = 'flex';
                this.searchResults.innerHTML = '';
            }
        });
        
        this.searchViewClear.addEventListener('click', () => {
            this.searchViewInput.value = '';
            this.searchViewClear.style.display = 'none';
            this.searchEmpty.style.display = 'flex';
            this.searchResults.innerHTML = '';
        });
    }

    setupEditProfileEvents() {
        const editBtn = document.getElementById('edit-profile-btn');
        const closeBtn = document.getElementById('close-edit-profile');
        const cancelBtn = document.getElementById('cancel-edit');
        const saveBtn = document.getElementById('save-profile');
        const avatarPreview = document.getElementById('avatar-preview');
        const avatarFileInput = document.getElementById('avatar-file-input');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                const user = this.dataService.getCurrentUser();
                if (!user) {
                    this.navigateTo('auth-view');
                    return;
                }
                AdvancedViewRenderer.renderEditProfileForm(user);
                this.setupProfileFormListeners();
            });
        }

        if (closeBtn) closeBtn.addEventListener('click', () => AdvancedViewRenderer.closeEditProfileModal());
        if (cancelBtn) cancelBtn.addEventListener('click', () => AdvancedViewRenderer.closeEditProfileModal());

        if (avatarPreview) {
            avatarPreview.addEventListener('click', () => avatarFileInput.click());
        }

        if (avatarFileInput) {
            avatarFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    if (file.size > 5 * 1024 * 1024) {
                        AdvancedViewRenderer.showToast('Изображение слишком большое (макс. 5MB)', 'warning');
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        document.getElementById('avatar-img-large').src = event.target.result;
                        this.state.avatarData = event.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveProfile());
        }
    }

    setupProfileFormListeners() {
        const usernameInput = document.getElementById('edit-username');
        const bioInput = document.getElementById('edit-bio');
        
        if (usernameInput) usernameInput.addEventListener('input', () => AdvancedViewRenderer.updateCharCounters());
        if (bioInput) bioInput.addEventListener('input', () => AdvancedViewRenderer.updateCharCounters());

        document.querySelectorAll('.gender-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    setupProfileStatsEvents() {
        const followingStat = document.getElementById('following-stat');
        const followersStat = document.getElementById('followers-stat');

        if (followingStat && followingStat.dataset.bound !== '1') {
            followingStat.dataset.bound = '1';
            followingStat.addEventListener('click', () => this.openUserListSheet('following'));
        }

        if (followersStat && followersStat.dataset.bound !== '1') {
            followersStat.dataset.bound = '1';
            followersStat.addEventListener('click', () => this.openUserListSheet('followers'));
        }
    }

    setupUserListSheetEvents() {
        if (this.closeUserListBtn && this.closeUserListBtn.dataset.bound !== '1') {
            this.closeUserListBtn.dataset.bound = '1';
            this.closeUserListBtn.addEventListener('click', () => this.closeUserListSheet());
        }

        if (this.userListSheet && this.userListSheet.dataset.bound !== '1') {
            this.userListSheet.dataset.bound = '1';
            this.userListSheet.addEventListener('click', (e) => {
                if (e.target === this.userListSheet) {
                    this.closeUserListSheet();
                }
            });
        }

        if (!this.userListEscBound) {
            this.userListEscBound = true;
            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape') return;
                if (!this.userListSheet || !this.userListSheet.classList.contains('open')) return;
                this.closeUserListSheet();
            });
        }
    }

    closeUserListSheet() {
        if (this.userListSheet) {
            this.userListSheet.classList.remove('open');
        }
    }

    async openUserListSheet(mode = 'following') {
        if (!this.userListSheet || !this.userList || !this.userListTitle) return;

        const normalizedMode = mode === 'followers' ? 'followers' : 'following';
        const currentUid = firebaseService && typeof firebaseService.getCurrentUid === 'function'
            ? firebaseService.getCurrentUid()
            : null;
        const targetUid = this.state.viewingProfileUid || currentUid;

        if (!targetUid) {
            AdvancedViewRenderer.showToast('Сначала войдите в аккаунт', 'warning');
            return;
        }

        this.userListTitle.textContent = normalizedMode === 'followers' ? 'Подписчики' : 'Подписки';
        this.userList.innerHTML = '<div class="user-list-empty">Загрузка...</div>';
        this.userListSheet.classList.add('open');

        const requestId = `${Date.now()}_${Math.random()}`;
        this.userListRequestId = requestId;

        let targetProfile = null;
        try {
            if (firebaseService && firebaseService.isInitialized && firebaseService.isInitialized() && typeof firebaseService.getUserProfile === 'function') {
                targetProfile = await firebaseService.getUserProfile(targetUid);
            } else if (this.dataService && typeof this.dataService.getUserProfile === 'function') {
                targetProfile = this.dataService.getUserProfile();
            }
        } catch (error) {
            console.error('Ошибка загрузки профиля для списка пользователей:', error);
        }

        if (this.userListRequestId !== requestId) return;

        if (!targetProfile) {
            this.userList.innerHTML = '<div class="user-list-empty">Не удалось загрузить список</div>';
            return;
        }

        const source = normalizedMode === 'followers' ? targetProfile.subscribers : targetProfile.subscriptions;
        const ids = Array.isArray(source)
            ? Array.from(new Set(source.map(x => String(x)).filter(Boolean)))
            : [];

        if (ids.length === 0) {
            const emptyText = normalizedMode === 'followers'
                ? 'Подписчиков пока нет'
                : 'Подписок пока нет';
            this.userList.innerHTML = `<div class="user-list-empty">${emptyText}</div>`;
            return;
        }

        const profileMap = new Map();

        if (firebaseService && firebaseService.isInitialized && firebaseService.isInitialized() && typeof firebaseService.getUserProfile === 'function') {
            const chunkSize = 12;
            const chunks = [];
            for (let i = 0; i < ids.length; i += chunkSize) {
                chunks.push(ids.slice(i, i + chunkSize));
            }

            const chunkRequests = chunks.map((chunk) => Promise.all(
                chunk.map(async (identity) => {
                    try {
                        let profile = await firebaseService.getUserProfile(identity);
                        if (!profile && typeof firebaseService.getUserByName === 'function') {
                            profile = await firebaseService.getUserByName(identity);
                        }
                        return { key: String(identity), profile };
                    } catch (_) {
                        return { key: String(identity), profile: null };
                    }
                })
            ));

            const chunkResults = await Promise.all(chunkRequests);
            chunkResults.forEach((group) => {
                (group || []).forEach((result) => {
                    if (result && result.profile) {
                        profileMap.set(String(result.key), result.profile);
                    }
                });
            });
        }

        if (this.dataService && typeof this.dataService.getAllUsers === 'function') {
            const localUsers = this.dataService.getAllUsers();
            if (Array.isArray(localUsers)) {
                ids.forEach((identity) => {
                    if (profileMap.has(identity)) return;
                    const local = localUsers.find((u) => {
                        if (!u) return false;
                        const uid = u.uid ? String(u.uid) : '';
                        const name = u.name ? String(u.name) : '';
                        return uid === identity || name === identity;
                    });
                    if (local) {
                        profileMap.set(identity, local);
                    }
                });
            }
        }

        if (this.userListRequestId !== requestId) return;

        this.userList.innerHTML = '';
        ids.forEach((uid) => {
            const profile = profileMap.get(uid) || null;
            const name = profile && profile.name ? profile.name : 'user';
            const avatar = profile && profile.avatar
                ? profile.avatar
                : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=64`;
            const about = profile && profile.bio
                ? this.escapeHtml(profile.bio)
                : (profile && profile.email ? this.escapeHtml(profile.email) : 'Профиль Reelgram');

            const item = document.createElement('div');
            item.className = 'user-list-item';
            item.innerHTML = `
                <img src="${avatar}" alt="@${this.escapeHtml(name)}" class="user-list-avatar">
                <div class="user-list-meta">
                    <div class="user-list-name">${this.renderUserLabel(name, !!(profile && profile.verified))}</div>
                    <div class="user-list-sub">${about}</div>
                </div>
            `;

            item.addEventListener('click', async () => {
                this.closeUserListSheet();
                if (profile && profile.uid) {
                    await this.openUserProfileByUid(profile.uid);
                    return;
                }
                if (profile && profile.name && firebaseService && typeof firebaseService.getUserByName === 'function') {
                    try {
                        const resolved = await firebaseService.getUserByName(profile.name);
                        if (resolved && resolved.uid) {
                            await this.openUserProfileByUid(resolved.uid);
                            return;
                        }
                    } catch (_) {}
                }
                AdvancedViewRenderer.showToast('Не удалось открыть профиль', 'warning');
            });

            this.userList.appendChild(item);
        });
    }

    async saveProfile() {
        if (!AdvancedViewRenderer.validateProfileForm()) return;

        const saveBtn = document.getElementById('save-profile');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохранение...';

        try {
            const currentProfile = this.dataService.getCurrentUser();
            if (!currentProfile) {
                this.navigateTo('auth-view');
                throw new Error('Нужно войти в аккаунт.');
            }

            const profileData = {
                avatar: this.state.avatarData || currentProfile.avatar,
                name: document.getElementById('edit-username').value.trim(),
                bio: document.getElementById('edit-bio').value.trim(),
                location: document.getElementById('edit-location').value.trim(),
                website: document.getElementById('edit-website').value.trim(),
                interests: document.getElementById('edit-interests').value.trim(),
                gender: AdvancedViewRenderer.getActiveGender()
            };

            const ready = await waitForFirebaseService(5000);
            if (!ready || !firebaseService || !firebaseService.isInitialized()) {
                throw new Error('Firebase не готов.');
            }
            const currentUser = firebaseService.getCurrentUser();
            if (!currentUser || !currentUser.uid) {
                this.navigateTo('auth-view');
                throw new Error('Нужно войти в аккаунт.');
            }
            await firebaseService.updateUserProfile(currentUser.uid, profileData);

            const updatedUser = firebaseService.getCurrentUser && firebaseService.getCurrentUser();
            if (updatedUser && updatedUser.uid) {
                this.syncUserMetaInUi(updatedUser);
            }
            
            this.updateProfileUI();
            AdvancedViewRenderer.closeEditProfileModal();
            AdvancedViewRenderer.showToast('Профиль обновлен успешно!', 'success');
            this.state.avatarData = null;
        } catch (error) {
            AdvancedViewRenderer.showToast('Ошибка при сохранении профиля', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    setupNotifications() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') Notification.requestPermission();
        }
    }

    setupOnboardingEvents() {
        if (this.onboardingChipsContainer && this.onboardingChipsContainer.dataset.bound !== '1') {
            this.onboardingChipsContainer.dataset.bound = '1';
            this.onboardingChipsContainer.addEventListener('click', (e) => {
                const chip = e.target.closest('.onboarding-chip');
                if (!chip) return;
                chip.classList.toggle('active');
            });
        }

        if (this.onboardingSaveBtn && this.onboardingSaveBtn.dataset.bound !== '1') {
            this.onboardingSaveBtn.dataset.bound = '1';
            this.onboardingSaveBtn.addEventListener('click', async () => {
                await this.saveOnboardingInterests();
            });
        }

        if (this.onboardingSkipBtn && this.onboardingSkipBtn.dataset.bound !== '1') {
            this.onboardingSkipBtn.dataset.bound = '1';
            this.onboardingSkipBtn.addEventListener('click', async () => {
                await this.saveOnboardingInterests({ skipped: true });
            });
        }
    }

    restoreFeedPreferences() {
        try {
            const raw = localStorage.getItem(this.feedPrefsKey);
            if (!raw) {
                this.applyFeedSourceUi();
                return;
            }
            const parsed = JSON.parse(raw);
            const source = parsed && parsed.feedSource === 'following' ? 'following' : 'for-you';
            this.state.feedSource = source;
        } catch (_) {}
        this.applyFeedSourceUi();
    }

    persistFeedPreferences() {
        try {
            localStorage.setItem(this.feedPrefsKey, JSON.stringify({
                feedSource: this.state.feedSource === 'following' ? 'following' : 'for-you'
            }));
        } catch (_) {}
    }

    async setFeedSource(source, { reload = true } = {}) {
        const normalized = source === 'following' ? 'following' : 'for-you';
        this.state.feedSource = normalized;
        this.persistFeedPreferences();
        this.applyFeedSourceUi();
        this.updateFeedTopControls();
        if (reload && this.state.feedMode === 'global') {
            await this.loadFeed(true);
        }
    }

    applyFeedSourceUi() {
        if (!this.feedFilterButtons || !this.feedFilterButtons.length) return;
        this.feedFilterButtons.forEach((btn) => {
            const source = btn.dataset.feedSource === 'following' ? 'following' : 'for-you';
            btn.classList.toggle('active', source === this.state.feedSource);
        });
    }

    updateFeedTopControls() {
        const inCustomFeed = this.state.feedMode === 'custom';
        if (this.feedBackBtn) {
            this.feedBackBtn.classList.toggle('hidden', !inCustomFeed);
        }
        if (this.feedFilterTabs) {
            this.feedFilterTabs.classList.toggle('hidden', inCustomFeed);
        }
    }

    renderFeedEmptyState(source = 'for-you') {
        if (!this.feedContainer) return;
        const isFollowing = source === 'following';
        const title = isFollowing ? 'Лента подписок пуста' : 'Пока нет подходящих видео';
        const subtitle = isFollowing
            ? 'Подпишитесь на авторов, чтобы видеть их видео здесь.'
            : 'Смотрите ролики и отмечайте интересное, чтобы алгоритм подстроился.';
        this.feedContainer.innerHTML = `
            <div class="feed-empty-state">
                <h3>${this.escapeHtml(title)}</h3>
                <p>${this.escapeHtml(subtitle)}</p>
            </div>
        `;
    }

    collectInterestTags(value) {
        const raw = Array.isArray(value) ? value.join(' ') : String(value || '');
        if (!raw.trim()) return [];
        const tokens = raw.split(/[\s,;]+/);
        const normalized = tokens
            .map((token) => token.trim().toLowerCase())
            .filter(Boolean)
            .map((token) => {
                let clean = token.replace(/[^#\wа-яё-]/gi, '');
                if (!clean) return '';
                if (!clean.startsWith('#')) clean = `#${clean}`;
                return clean;
            })
            .filter(Boolean);
        return Array.from(new Set(normalized));
    }

    collectVideoHashtags(video) {
        if (!video) return [];
        const fromArray = Array.isArray(video.hashtags) ? video.hashtags : [];
        const joined = `${fromArray.join(' ')} ${video.tags || ''} ${video.desc || ''}`;
        const matched = joined.match(/#[\wа-яё-]+/gi) || [];
        const normalized = matched
            .map(tag => String(tag).trim().toLowerCase())
            .filter(Boolean);
        return Array.from(new Set(normalized));
    }

    stableHash(value) {
        const str = String(value || '');
        let hash = 0;
        for (let i = 0; i < str.length; i += 1) {
            hash = ((hash << 5) - hash) + str.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    scoreVideoForForYou(video, { subscriptionsSet, interestSet } = {}) {
        if (!video) return -Infinity;
        const likes = parseInt(video.likes, 10) || 0;
        const views = parseInt(video.views, 10) || 0;
        const now = Date.now();
        const ts = parseInt(video.timestamp, 10) || now;
        const ageHours = Math.max(0, (now - ts) / 3600000);
        const recency = Math.max(0, 72 - ageHours) * 0.45;
        const popularity = Math.min(32, (likes * 1.5) + (views / 1600));

        const authorUid = video.uid ? String(video.uid) : '';
        const authorAffinityRaw = this.watchProfile?.authors?.[authorUid] || 0;
        const authorAffinity = Math.min(26, authorAffinityRaw * 0.35);

        const tags = this.collectVideoHashtags(video);
        const tagAffinityRaw = tags.reduce((sum, tag) => sum + (this.watchProfile?.tags?.[tag] || 0), 0);
        const tagAffinity = Math.min(32, tagAffinityRaw * 0.45);
        const profileInterestsBoost = interestSet
            ? tags.reduce((sum, tag) => sum + (interestSet.has(tag) ? 10 : 0), 0)
            : 0;

        const followBoost = (subscriptionsSet && authorUid && subscriptionsSet.has(authorUid)) ? 10 : 0;
        const randomBoost = (this.stableHash(video.id || video.firestoreId || authorUid) % 7) / 10;

        return recency + popularity + authorAffinity + tagAffinity + profileInterestsBoost + followBoost + randomBoost;
    }

    prepareGlobalFeedVideos(videos = []) {
        const list = Array.isArray(videos) ? videos.filter(Boolean) : [];
        const withoutMutedAuthors = list.filter((video) => {
            const uid = video && video.uid ? String(video.uid) : null;
            return !this.isAuthorFilteredOut(uid);
        });

        const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        const subscriptionsSet = new Set(
            current && Array.isArray(current.subscriptions)
                ? current.subscriptions.map(v => String(v))
                : []
        );

        if (this.state.feedSource === 'following') {
            return withoutMutedAuthors
                .filter((video) => {
                    const uid = video && video.uid ? String(video.uid) : null;
                    return !!(uid && subscriptionsSet.has(uid));
                })
                .sort((a, b) => (parseInt(b.timestamp, 10) || 0) - (parseInt(a.timestamp, 10) || 0));
        }

        const interestSet = new Set(this.collectInterestTags(current && current.interests ? current.interests : ''));
        return withoutMutedAuthors
            .slice()
            .sort((a, b) => this.scoreVideoForForYou(b, { subscriptionsSet, interestSet }) - this.scoreVideoForForYou(a, { subscriptionsSet, interestSet }));
    }

    loadWatchProfile() {
        try {
            const raw = localStorage.getItem(this.watchProfileKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            const authors = parsed && typeof parsed.authors === 'object' ? parsed.authors : {};
            const tags = parsed && typeof parsed.tags === 'object' ? parsed.tags : {};
            this.watchProfile = {
                authors: this.pruneScoreMap(authors, 120),
                tags: this.pruneScoreMap(tags, 180)
            };
        } catch (_) {}
    }

    saveWatchProfile() {
        try {
            localStorage.setItem(this.watchProfileKey, JSON.stringify(this.watchProfile));
        } catch (_) {}
    }

    pruneScoreMap(source, maxItems = 100) {
        const entries = Object.entries(source || {})
            .map(([key, value]) => [String(key), Number(value) || 0])
            .filter(([key, value]) => key && value > 0)
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxItems);
        return Object.fromEntries(entries);
    }

    startVideoWatchSession(videoEl) {
        if (!videoEl) return;
        if (videoEl.dataset.watchStartAt) return;
        videoEl.dataset.watchStartAt = String(Date.now());
    }

    endVideoWatchSession(item, videoEl) {
        if (!videoEl) return;
        const startedAt = parseInt(videoEl.dataset.watchStartAt || '0', 10);
        if (!startedAt) return;
        delete videoEl.dataset.watchStartAt;
        const seconds = Math.max(0, (Date.now() - startedAt) / 1000);
        if (seconds < 1.5) return;
        this.recordWatchSignal(item, seconds);
    }

    recordWatchSignal(item, seconds = 0) {
        if (!item || seconds <= 0) return;
        const firestoreId = item.dataset ? item.dataset.firestoreId : null;
        const id = item.dataset ? String(item.dataset.id || '') : '';
        const localVideo = (this.dataService && Array.isArray(this.dataService.userVideos))
            ? this.dataService.userVideos.find(v => (firestoreId
                ? String(v.firestoreId || '') === String(firestoreId)
                : String(v.id) === id))
            : null;

        const authorUid = localVideo && localVideo.uid
            ? String(localVideo.uid)
            : (item.dataset && item.dataset.uid ? String(item.dataset.uid) : null);
        if (authorUid) {
            const current = this.watchProfile.authors[authorUid] || 0;
            this.watchProfile.authors[authorUid] = current + seconds;
        }

        let tags = localVideo ? this.collectVideoHashtags(localVideo) : [];
        if (!tags.length) {
            tags = Array.from(item.querySelectorAll('.hashtag'))
                .map(el => String(el.textContent || '').trim().toLowerCase())
                .filter(Boolean);
        }
        tags.forEach((tag) => {
            const current = this.watchProfile.tags[tag] || 0;
            this.watchProfile.tags[tag] = current + seconds;
        });

        this.watchProfile.authors = this.pruneScoreMap(this.watchProfile.authors, 120);
        this.watchProfile.tags = this.pruneScoreMap(this.watchProfile.tags, 180);
        this.saveWatchProfile();
    }

    normalizeUidList(list) {
        if (!Array.isArray(list)) return [];
        return Array.from(new Set(list
            .map(v => String(v || '').trim())
            .filter(Boolean)));
    }

    getModerationStorageKey(uid = 'guest') {
        return `${this.moderationPrefsKey}:${uid}`;
    }

    restoreModerationPreferences() {
        const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        const uid = current && current.uid ? String(current.uid) : 'guest';
        let local = {};
        try {
            const raw = localStorage.getItem(this.getModerationStorageKey(uid));
            local = raw ? JSON.parse(raw) : {};
        } catch (_) {
            local = {};
        }

        const blockedFromProfile = current && Array.isArray(current.blockedUsers) ? current.blockedUsers : null;
        const hiddenFromProfile = current && Array.isArray(current.hiddenAuthors) ? current.hiddenAuthors : null;
        this.moderationPrefs = {
            blockedUsers: this.normalizeUidList(blockedFromProfile || local.blockedUsers || []),
            hiddenAuthors: this.normalizeUidList(hiddenFromProfile || local.hiddenAuthors || [])
        };
    }

    async persistModerationPreferences(nextPrefs = null) {
        const blockedUsers = this.normalizeUidList(
            nextPrefs && nextPrefs.blockedUsers ? nextPrefs.blockedUsers : this.moderationPrefs.blockedUsers
        );
        const hiddenAuthors = this.normalizeUidList(
            nextPrefs && nextPrefs.hiddenAuthors ? nextPrefs.hiddenAuthors : this.moderationPrefs.hiddenAuthors
        );
        this.moderationPrefs = { blockedUsers, hiddenAuthors };

        const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        const uid = current && current.uid ? String(current.uid) : 'guest';
        try {
            localStorage.setItem(this.getModerationStorageKey(uid), JSON.stringify(this.moderationPrefs));
        } catch (_) {}

        if (firebaseService
            && firebaseService.isInitialized
            && firebaseService.isInitialized()
            && uid !== 'guest'
            && typeof firebaseService.updateUserProfile === 'function') {
            try {
                await firebaseService.updateUserProfile(uid, {
                    blockedUsers,
                    hiddenAuthors
                });
            } catch (error) {
                console.warn('⚠️ Не удалось сохранить модерацию в профиле:', error?.message || error);
            }
        }
    }

    isAuthorFilteredOut(uid) {
        if (!uid) return false;
        const normalized = String(uid);
        return this.moderationPrefs.blockedUsers.includes(normalized)
            || this.moderationPrefs.hiddenAuthors.includes(normalized);
    }

    removeAuthorFromCurrentFeed(authorUid) {
        if (!authorUid || !this.feedContainer) return;
        const normalized = String(authorUid);
        const selector = `.video-item[data-uid="${normalized}"]`;
        this.feedContainer.querySelectorAll(selector).forEach((item) => {
            const video = item.querySelector('video');
            if (video) this.unloadVideo(video);
            item.remove();
        });

        if (this.customFeed && Array.isArray(this.customFeed.videos)) {
            this.customFeed.videos = this.customFeed.videos.filter(v => String(v.uid || '') !== normalized);
        }
    }

    async hideAuthorInFeed(video) {
        const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        const authorUid = video && video.uid ? String(video.uid) : null;
        if (!authorUid) {
            AdvancedViewRenderer.showToast('Не удалось определить автора', 'warning');
            return;
        }
        if (current && current.uid && String(current.uid) === authorUid) {
            AdvancedViewRenderer.showToast('Нельзя скрыть собственный аккаунт', 'info');
            return;
        }

        if (!this.moderationPrefs.hiddenAuthors.includes(authorUid)) {
            this.moderationPrefs.hiddenAuthors.push(authorUid);
            await this.persistModerationPreferences();
        }
        this.removeAuthorFromCurrentFeed(authorUid);
        if (this.state.feedMode === 'global' && this.getFeedVideoItems().length === 0) {
            await this.loadFeed(true);
        }
        AdvancedViewRenderer.showToast('Автор скрыт из вашей ленты', 'success');
    }

    async blockAuthorInFeed(video) {
        const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        const currentUid = current && current.uid ? String(current.uid) : null;
        const authorUid = video && video.uid ? String(video.uid) : null;
        if (!authorUid) {
            AdvancedViewRenderer.showToast('Не удалось определить автора', 'warning');
            return;
        }
        if (currentUid && currentUid === authorUid) {
            AdvancedViewRenderer.showToast('Нельзя заблокировать себя', 'info');
            return;
        }

        if (!confirm('Заблокировать автора? Его видео больше не будут показываться.')) return;

        if (!this.moderationPrefs.blockedUsers.includes(authorUid)) {
            this.moderationPrefs.blockedUsers.push(authorUid);
        }
        if (!this.moderationPrefs.hiddenAuthors.includes(authorUid)) {
            this.moderationPrefs.hiddenAuthors.push(authorUid);
        }
        await this.persistModerationPreferences();

        try {
            if (currentUid
                && firebaseService
                && firebaseService.isInitialized
                && firebaseService.isInitialized()
                && typeof firebaseService.unsubscribe === 'function'
                && current
                && Array.isArray(current.subscriptions)
                && current.subscriptions.map(String).includes(authorUid)) {
                await firebaseService.unsubscribe(authorUid);
            }
        } catch (_) {}

        this.removeAuthorFromCurrentFeed(authorUid);
        if (this.state.feedMode === 'global') {
            await this.loadFeed(true);
        }

        if (this.state.viewingProfileUid && String(this.state.viewingProfileUid) === authorUid) {
            this.state.viewingProfileUid = null;
            this.navigateTo('feed-view');
        }
        AdvancedViewRenderer.showToast('Автор заблокирован', 'success');
    }

    async reportVideo(video) {
        if (!video) return;
        const reason = window.prompt('Причина жалобы (необязательно):', 'Неподходящий контент');
        if (reason === null) return;

        const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        const payload = {
            id: Date.now(),
            videoId: video.id || null,
            firestoreId: video.firestoreId || null,
            authorUid: video.uid || null,
            author: video.author || '',
            reporterUid: current && current.uid ? current.uid : null,
            reporterName: current && current.name ? current.name : 'user',
            reason: String(reason || '').trim(),
            createdAt: Date.now()
        };

        try {
            const key = 'reelgram_reports';
            const raw = localStorage.getItem(key);
            const list = raw ? JSON.parse(raw) : [];
            const normalized = Array.isArray(list) ? list : [];
            normalized.unshift(payload);
            localStorage.setItem(key, JSON.stringify(normalized.slice(0, 300)));
        } catch (_) {}

        AdvancedViewRenderer.showToast('Жалоба отправлена', 'success');
    }

    scheduleUploadDraftAutosave() {
        clearTimeout(this.uploadDraftSaveTimer);
        this.uploadDraftSaveTimer = setTimeout(() => {
            this.saveUploadDraft();
        }, 350);
    }

    getUploadDraftSnapshot() {
        const desc = this.uploadDescInput ? this.uploadDescInput.value.trim() : '';
        const tags = this.uploadTagsInput ? this.uploadTagsInput.value.trim() : '';
        const allowComments = this.allowCommentsInput ? this.allowCommentsInput.checked : true;
        const isPrivate = this.privateVideoInput ? this.privateVideoInput.checked : false;
        const filter = this.state.selectedFilter || 'none';

        const hasMeaningfulData = !!(desc || tags || !allowComments || isPrivate || filter !== 'none');
        if (!hasMeaningfulData) return null;

        return {
            desc,
            tags,
            allowComments,
            private: isPrivate,
            filter,
            updatedAt: Date.now()
        };
    }

    saveUploadDraft({ manual = false } = {}) {
        const draft = this.getUploadDraftSnapshot();
        try {
            if (!draft) {
                localStorage.removeItem(this.uploadDraftKey);
                return;
            }
            localStorage.setItem(this.uploadDraftKey, JSON.stringify(draft));
            if (manual) {
                this.showUploadDraftNote('Черновик сохранен');
                AdvancedViewRenderer.showToast('Черновик сохранен', 'success');
            } else {
                this.showUploadDraftNote('Черновик обновлен автоматически');
            }
        } catch (error) {
            if (manual) {
                AdvancedViewRenderer.showToast('Не удалось сохранить черновик', 'error');
            }
            console.error('Ошибка сохранения черновика:', error);
        }
    }

    restoreUploadDraft() {
        if (!this.uploadDescInput || !this.uploadTagsInput) return;
        try {
            const raw = localStorage.getItem(this.uploadDraftKey);
            if (!raw) return;
            const draft = JSON.parse(raw);
            if (!draft || typeof draft !== 'object') return;

            this.uploadDescInput.value = draft.desc || '';
            this.uploadTagsInput.value = draft.tags || '';
            if (this.allowCommentsInput) this.allowCommentsInput.checked = draft.allowComments !== false;
            if (this.privateVideoInput) this.privateVideoInput.checked = draft.private === true;

            const filter = draft.filter || 'none';
            this.state.selectedFilter = filter;
            document.querySelectorAll('.filter-option').forEach((opt) => {
                opt.classList.toggle('active', opt.dataset.filter === filter);
            });
            const previewVideo = document.getElementById('preview-video');
            if (previewVideo) {
                const selected = this.dataService.filters.find(f => f.id === filter);
                previewVideo.style.filter = selected?.css || '';
            }

            this.showUploadDraftNote('Черновик восстановлен');
        } catch (error) {
            console.error('Ошибка восстановления черновика:', error);
        }
    }

    clearUploadDraft({ clearForm = true, showToast = false } = {}) {
        clearTimeout(this.uploadDraftSaveTimer);
        try {
            localStorage.removeItem(this.uploadDraftKey);
        } catch (_) {}

        if (clearForm) {
            if (this.uploadDescInput) this.uploadDescInput.value = '';
            if (this.uploadTagsInput) this.uploadTagsInput.value = '';
            if (this.allowCommentsInput) this.allowCommentsInput.checked = true;
            if (this.privateVideoInput) this.privateVideoInput.checked = false;
            this.state.selectedFilter = 'none';
            document.querySelectorAll('.filter-option').forEach((opt) => {
                opt.classList.toggle('active', opt.dataset.filter === 'none');
            });
            const previewVideo = document.getElementById('preview-video');
            if (previewVideo) previewVideo.style.filter = '';
        }

        if (this.uploadDraftNote) {
            this.uploadDraftNote.style.display = 'none';
            this.uploadDraftNote.textContent = '';
        }
        if (showToast) {
            AdvancedViewRenderer.showToast('Черновик удален', 'info');
        }
    }

    showUploadDraftNote(text = '') {
        if (!this.uploadDraftNote) return;
        this.uploadDraftNote.textContent = text;
        this.uploadDraftNote.style.display = text ? 'block' : 'none';
        clearTimeout(this.uploadDraftNoteTimer);
        if (text) {
            this.uploadDraftNoteTimer = setTimeout(() => {
                if (!this.uploadDraftNote) return;
                this.uploadDraftNote.style.display = 'none';
            }, 2600);
        }
    }

    openOnboardingModal({ force = false } = {}) {
        if (!this.onboardingModal || !this.onboardingChipsContainer) return;
        const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        if (!current) return;

        const onboardingDone = !!current.onboardingCompleted;
        if (!force && onboardingDone) return;

        const selected = new Set(this.collectInterestTags(current.interests || ''));
        this.onboardingChipsContainer.querySelectorAll('.onboarding-chip').forEach((chip) => {
            const tag = String(chip.dataset.interest || '').toLowerCase();
            chip.classList.toggle('active', selected.has(tag));
        });

        this.onboardingModal.style.display = 'flex';
        requestAnimationFrame(() => this.onboardingModal.classList.add('open'));
    }

    closeOnboardingModal() {
        if (!this.onboardingModal) return;
        this.onboardingModal.classList.remove('open');
        setTimeout(() => {
            if (this.onboardingModal) this.onboardingModal.style.display = 'none';
        }, 180);
    }

    getSelectedOnboardingInterests() {
        if (!this.onboardingChipsContainer) return [];
        return Array.from(this.onboardingChipsContainer.querySelectorAll('.onboarding-chip.active'))
            .map(chip => String(chip.dataset.interest || '').trim().toLowerCase())
            .filter(Boolean);
    }

    async saveOnboardingInterests({ skipped = false } = {}) {
        const selected = skipped ? [] : this.getSelectedOnboardingInterests();
        if (!skipped && selected.length === 0) {
            AdvancedViewRenderer.showToast('Выберите хотя бы один интерес или нажмите "Пропустить"', 'warning');
            return;
        }

        const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        if (!current || !current.uid) {
            this.closeOnboardingModal();
            return;
        }

        try {
            if (firebaseService
                && firebaseService.isInitialized
                && firebaseService.isInitialized()
                && typeof firebaseService.updateUserProfile === 'function') {
                await firebaseService.updateUserProfile(current.uid, {
                    interests: selected.join(' '),
                    onboardingCompleted: true
                });
            }
        } catch (error) {
            console.error('Ошибка сохранения onboarding:', error);
            AdvancedViewRenderer.showToast('Не удалось сохранить интересы', 'error');
            return;
        }

        this.closeOnboardingModal();
        this.updateProfileUI();
        await this.loadFeed(true);
        AdvancedViewRenderer.showToast(skipped ? 'Можно настроить интересы позже в профиле' : 'Интересы сохранены', 'success');
    }

    scheduleNotificationBadgeRefresh() {
        if (this.notificationBadgeTimer) {
            clearInterval(this.notificationBadgeTimer);
            this.notificationBadgeTimer = null;
        }
        this.notificationBadgeTimer = setInterval(() => {
            const user = this.dataService && this.dataService.getCurrentUser ? this.dataService.getCurrentUser() : null;
            if (!user) return;
            this.updateNotificationBadge();
        }, 20000);
    }

    async setupCamera() {
        if (this.cameraInitialized && this.cameraStream) return true;
        if (this.cameraInitPromise) return this.cameraInitPromise;

        this.cameraInitPromise = (async () => {
            try {
                this.cameraStream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                    audio: true
                });

                if (this.cameraVideo) {
                    this.cameraVideo.srcObject = this.cameraStream;
                }
                if (this.recordBtn && !this.recordBtnBound) {
                    this.recordBtn.addEventListener('click', () => this.toggleRecording());
                    this.recordBtnBound = true;
                }

                this.cameraInitialized = true;
                return true;
            } catch (error) {
                console.error('Camera access denied:', error);
                const cameraToggle = document.getElementById('camera-toggle');
                if (cameraToggle) cameraToggle.style.display = 'none';
                return false;
            } finally {
                this.cameraInitPromise = null;
            }
        })();

        return this.cameraInitPromise;
    }

    async toggleCamera() {
        const cameraPreview = this.cameraPreview;
        const uploadArea = document.getElementById('upload-area');
        
        if (cameraPreview.style.display === 'none') {
            const ready = await this.setupCamera();
            if (!ready || !this.cameraStream) {
                AdvancedViewRenderer.showToast('Нет доступа к камере', 'error');
                return;
            }
            cameraPreview.style.display = 'block';
            uploadArea.style.display = 'none';
            AdvancedViewRenderer.showToast('Камера включена', 'success');
        } else {
            cameraPreview.style.display = 'none';
            uploadArea.style.display = 'flex';
            this.stopRecording();
        }
    }

    toggleRecording() {
        if (!this.state.isRecording) this.startRecording();
        else this.stopRecording();
    }

    startRecording() {
        if (!this.cameraStream) return;
        this.state.recordedChunks = [];
        this.recordBtn.classList.add('recording');

        // Prefer MP4 on Safari/iOS when available, otherwise WebM.
        const candidates = [
            'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
            'video/mp4',
            'video/webm;codecs=vp9',
            'video/webm;codecs=vp8',
            'video/webm'
        ];
        let selectedMime = '';
        try {
            if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
                selectedMime = candidates.find(t => MediaRecorder.isTypeSupported(t)) || '';
            }
        } catch (_) {
            selectedMime = '';
        }
        this.state.recordedMimeType = selectedMime || 'video/webm';

        if (selectedMime) {
            this.state.mediaRecorder = new MediaRecorder(this.cameraStream, { mimeType: selectedMime });
        } else {
            this.state.mediaRecorder = new MediaRecorder(this.cameraStream);
        }
        
        this.state.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) this.state.recordedChunks.push(event.data);
        };
        
        this.state.mediaRecorder.onstop = () => {
            const blob = new Blob(this.state.recordedChunks, { type: this.state.recordedMimeType || 'video/webm' });
            const url = URL.createObjectURL(blob);
            const previewVideo = document.getElementById('preview-video');
            if (previewVideo) {
                previewVideo.src = url;
                document.getElementById('upload-preview').style.display = 'block';
                this.cameraPreview.style.display = 'none';
            }
        };
        
        this.state.mediaRecorder.start(1000);
        this.state.isRecording = true;
        AdvancedViewRenderer.showToast('Запись началась', 'info');
    }

    stopRecording() {
        if (this.state.mediaRecorder && this.state.isRecording) {
            this.state.mediaRecorder.stop();
            this.recordBtn.classList.remove('recording');
            this.state.isRecording = false;
            AdvancedViewRenderer.showToast('Запись завершена', 'success');
        }
    }

    setupPullToRefresh() {
        const feedContainer = this.feedContainer;
        const pullIndicator = document.getElementById('pull-indicator');
        let startY = 0, pulling = false;

        feedContainer.addEventListener('touchstart', (e) => {
            if (feedContainer.scrollTop === 0) {
                startY = e.touches[0].pageY;
                pulling = true;
            }
        });

        feedContainer.addEventListener('touchmove', (e) => {
            if (!pulling) return;
            const y = e.touches[0].pageY;
            const diff = y - startY;
            if (diff > 0) {
                e.preventDefault();
                pullIndicator.style.opacity = Math.min(1, diff / 100);
                pullIndicator.style.transform = `translateY(${Math.min(50, diff)}px)`;
                if (diff > 100) pullIndicator.classList.add('active');
            }
        });

        feedContainer.addEventListener('touchend', async (e) => {
            if (!pulling) return;
            pulling = false;
            const diff = e.changedTouches[0].pageY - startY;
            if (diff > 100 && this.state.feedMode === 'global') {
                await this.loadFeed(true);
                AdvancedViewRenderer.showToast('Лента обновлена', 'success');
            }
            pullIndicator.style.opacity = '0';
            pullIndicator.style.transform = 'translateY(0)';
            pullIndicator.classList.remove('active');
        });
    }

    setupFeedPaging() {
        const feedContainer = this.feedContainer;
        if (!feedContainer) return;

        // Bind once (loadFeed() is called many times)
        if (feedContainer.dataset.pagingBound === '1') return;
        feedContainer.dataset.pagingBound = '1';

        const paging = this.feedPaging;

        const scheduleSettle = () => {
            if (!paging.pendingSettle || paging.programmaticScroll) return;
            clearTimeout(paging.settleTimer);
            paging.settleTimer = setTimeout(() => {
                paging.pendingSettle = false;

                const items = this.getFeedVideoItems();
                if (!items.length) return;

                const thresholdPx = 30;
                const delta = feedContainer.scrollTop - paging.touchStartScrollTop;
                let targetIndex = paging.touchStartIndex;

                if (delta > thresholdPx) targetIndex = paging.touchStartIndex + 1;
                else if (delta < -thresholdPx) targetIndex = paging.touchStartIndex - 1;

                targetIndex = Math.max(0, Math.min(targetIndex, items.length - 1));
                this.scrollFeedToIndex(targetIndex, 'smooth');
            }, 120);
        };

        feedContainer.addEventListener('touchstart', () => {
            paging.pendingSettle = false;
            clearTimeout(paging.settleTimer);
            paging.touchStartScrollTop = feedContainer.scrollTop;
            paging.touchStartIndex = this.getNearestFeedIndex();
        }, { passive: true });

        feedContainer.addEventListener('touchend', () => {
            paging.pendingSettle = true;
            scheduleSettle();
        }, { passive: true });

        feedContainer.addEventListener('touchcancel', () => {
            paging.pendingSettle = true;
            scheduleSettle();
        }, { passive: true });

        feedContainer.addEventListener('scroll', () => {
            scheduleSettle();
        }, { passive: true });
    }

    resetFeedVideoLifecycle() {
        if (this.feedContainer) {
            this.feedContainer.querySelectorAll('.video-item').forEach((item) => {
                const video = item.querySelector('video');
                this.endVideoWatchSession(item, video);
            });
        }
        if (this.feedVideoObserver) {
            this.feedVideoObserver.disconnect();
            this.feedVideoObserver = null;
        }
        this.feedIntersectionRatios.clear();
        this.observedFeedItems = new WeakSet();
    }

    saveGlobalFeedSnapshot() {
        if (this.savedGlobalFeed || !this.feedContainer) return;

        this.savedGlobalFeed = {
            html: this.feedContainer.innerHTML,
            scrollTop: this.feedContainer.scrollTop,
            currentPage: this.state.currentPage,
            hasMore: this.state.hasMore,
            activeFeedIndex: this.state.activeFeedIndex
        };
    }

    restoreGlobalFeedSnapshot() {
        if (!this.savedGlobalFeed || !this.feedContainer) return false;

        this.resetFeedVideoLifecycle();

        this.feedContainer.innerHTML = this.savedGlobalFeed.html;
        this.feedContainer.scrollTop = this.savedGlobalFeed.scrollTop || 0;

        this.state.currentPage = this.savedGlobalFeed.currentPage || 0;
        this.state.hasMore = this.savedGlobalFeed.hasMore !== false;
        this.state.activeFeedIndex = this.savedGlobalFeed.activeFeedIndex || 0;

        // Remove any videos deleted while we were in a custom feed.
        if (this.deletedVideoIds && this.deletedVideoIds.size) {
            this.deletedVideoIds.forEach((id) => {
                this.feedContainer.querySelectorAll(`.video-item[data-id="${id}"]`).forEach(el => el.remove());
            });
        }

        this.attachVideoEvents();
        this.setupVideoProgress();

        this.savedGlobalFeed = null;
        return true;
    }

    renderFeedVideos(videos = []) {
        if (!this.feedContainer) return;

        this.resetFeedVideoLifecycle();
        this.feedContainer.innerHTML = '';

        const list = Array.isArray(videos) ? videos : [];
        const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        const currentUid = current && current.uid ? String(current.uid) : null;
        const subscriptions = current && Array.isArray(current.subscriptions) ? current.subscriptions.map(String) : [];

        const frag = document.createDocumentFragment();
        list.forEach(video => {
            const authorUid = video && video.uid ? String(video.uid) : null;
            const isOwn = !!(currentUid && authorUid && currentUid === authorUid);
            const isSubscribed = !!(authorUid && !isOwn && subscriptions.includes(authorUid));

            const card = AdvancedViewRenderer.createVideoCard(video, {
                autoplay: this.dataService.settings.autoplay,
                isSubscribed,
                showFollow: !isOwn
            });
            frag.appendChild(card);
        });
        this.feedContainer.appendChild(frag);

        this.attachVideoEvents();
        this.setupVideoProgress();
    }

    enterCustomFeedMode(videos = [], { startIndex = 0, returnViewId = 'profile-view' } = {}) {
        const list = Array.isArray(videos) ? videos : [];
        if (!list.length) return;

        if (this.state.feedMode === 'global') {
            this.saveGlobalFeedSnapshot();
        }

        this.customFeed = { videos: list, returnViewId };
        this.state.feedMode = 'custom';
        this.state.feedReturnViewId = returnViewId;

        this.navigateTo('feed-view');
        this.renderFeedVideos(list);
        this.updateFeedTopControls();

        const safeIndex = Math.max(0, Math.min(parseInt(startIndex, 10) || 0, list.length - 1));
        this.setActiveFeedIndex(safeIndex, {
            scroll: true,
            behavior: 'auto',
            play: this.dataService.settings.autoplay
        });
    }

    exitCustomFeedMode({ navigateBack = true } = {}) {
        if (this.state.feedMode !== 'custom') return;

        const returnView = this.state.feedReturnViewId || 'profile-view';

        this.state.feedMode = 'global';
        this.state.feedReturnViewId = null;
        this.customFeed = null;

        this.updateFeedTopControls();

        // Free resources aggressively without forcing extra loads.
        this.feedContainer?.querySelectorAll('video').forEach(v => {
            try { v.pause(); } catch (_) {}
            v.muted = true;
        });

        const restored = this.restoreGlobalFeedSnapshot();
        if (!restored) {
            this.loadFeed(true).catch(() => {});
        }

        if (navigateBack) {
            this.navigateTo(returnView);
        }
    }

    setupSwipe() {
        let startX = 0, startY = 0, isSwiping = false;
        const target = this.feedContainer || document;

        target.addEventListener('touchstart', (e) => {
            if (!e.touches || !e.touches[0]) return;
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwiping = true;
        }, { passive: true });

        target.addEventListener('touchmove', (e) => {
            if (!isSwiping || !e.touches || !e.touches[0]) return;
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = currentX - startX;
            const diffY = currentY - startY;
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                e.preventDefault();
            }
        }, { passive: false });

        target.addEventListener('touchend', () => { isSwiping = false; }, { passive: true });
    }

    async loadFeed(clear = false) {
        if (this.state.loading) return;
        this.state.loading = true;
        this.updateFeedTopControls();
        
        if (clear) {
            this.state.currentPage = 0;
            this.state.hasMore = true;

            // We are about to replace the feed DOM; drop old observers/ratios to prevent leaks and stale state.
            if (this.feedVideoObserver) {
                this.feedVideoObserver.disconnect();
                this.feedVideoObserver = null;
            }
            this.feedIntersectionRatios.clear();

            this.feedContainer.innerHTML = '<div class="skeleton-video"></div><div class="skeleton-video"></div><div class="skeleton-video"></div>';
        } else {
            AdvancedViewRenderer.showLoading();
        }
        
        try {
            const pageSize = this.state.feedSource === 'following' ? 15 : 8;
            const { videos, hasMore } = await this.dataService.getFeed(this.state.currentPage, pageSize);
            const preparedVideos = this.prepareGlobalFeedVideos(videos);
            
            if (clear) this.feedContainer.innerHTML = '';
            
            const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
            const currentUid = current && current.uid ? String(current.uid) : null;
            const subscriptions = current && Array.isArray(current.subscriptions) ? current.subscriptions.map(String) : [];

            const frag = document.createDocumentFragment();
            preparedVideos.forEach(video => {
                const authorUid = video && video.uid ? String(video.uid) : null;
                const isOwn = !!(currentUid && authorUid && currentUid === authorUid);
                const isSubscribed = !!(authorUid && !isOwn && subscriptions.includes(authorUid));

                const card = AdvancedViewRenderer.createVideoCard(video, {
                    autoplay: this.dataService.settings.autoplay,
                    isSubscribed,
                    showFollow: !isOwn
                });
                frag.appendChild(card);
            });
            if (preparedVideos.length > 0) {
                this.feedContainer.appendChild(frag);
            } else if (clear) {
                this.renderFeedEmptyState(this.state.feedSource);
            }
            
            this.attachVideoEvents();
            this.setupVideoProgress();
            
            this.state.currentPage++;
            this.state.hasMore = hasMore;
            
            if (clear && preparedVideos.length > 0) {
                this.setActiveFeedIndex(0, { play: this.dataService.settings.autoplay });
            } else if (!clear && preparedVideos.length > 0) {
                // Keep the currently active video loaded after appending new items
                this.setActiveFeedIndex(this.state.activeFeedIndex, { play: false });
            }
        } catch (error) {
            console.error('Error loading feed:', error);
            AdvancedViewRenderer.showToast('Ошибка загрузки ленты', 'error');
        } finally {
            this.state.loading = false;
            AdvancedViewRenderer.hideLoading();
        }
    }

    getFeedVideoItems() {
        if (!this.feedContainer) return [];
        return Array.from(this.feedContainer.querySelectorAll('.video-item'));
    }

    getNearestFeedIndex() {
        const items = this.getFeedVideoItems();
        if (!items.length || !this.feedContainer) return 0;

        // Items are full-height, so this is fast and reliable.
        const height = this.feedContainer.clientHeight || 1;
        const index = Math.round(this.feedContainer.scrollTop / height);
        return Math.max(0, Math.min(index, items.length - 1));
    }

    scrollFeedToIndex(index, behavior = 'smooth') {
        const items = this.getFeedVideoItems();
        if (!items.length || !this.feedContainer) return;

        const clamped = Math.max(0, Math.min(parseInt(index, 10) || 0, items.length - 1));
        const target = items[clamped];
        if (!target) return;

        const paging = this.feedPaging;
        paging.pendingSettle = false;
        clearTimeout(paging.settleTimer);
        paging.programmaticScroll = true;
        clearTimeout(paging.programmaticTimer);

        this.feedContainer.scrollTo({ top: target.offsetTop, behavior });

        paging.programmaticTimer = setTimeout(() => {
            paging.programmaticScroll = false;
        }, behavior === 'auto' ? 0 : 450);
    }

    ensureVideoSource(videoEl) {
        if (!videoEl) return;

        const desiredSrc = videoEl.dataset.src;
        if (!desiredSrc) return;

        const currentSrc = videoEl.getAttribute('src');
        if (currentSrc !== desiredSrc) {
            videoEl.setAttribute('src', desiredSrc);
            try { videoEl.load(); } catch (_) {}
        }
    }

    unloadVideo(videoEl) {
        if (!videoEl) return;
        const item = videoEl.closest ? videoEl.closest('.video-item') : null;
        if (item) {
            this.endVideoWatchSession(item, videoEl);
        }

        try { videoEl.pause(); } catch (_) {}
        videoEl.muted = true;

        if (videoEl.getAttribute('src')) {
            videoEl.removeAttribute('src');
            try { videoEl.load(); } catch (_) {}
        }

        try { videoEl.currentTime = 0; } catch (_) {}
    }

    prefetchFeedNeighbors(centerIndex, radius = 1) {
        const items = this.getFeedVideoItems();
        if (!items.length) return;

        const idx = Math.max(0, Math.min(parseInt(centerIndex, 10) || 0, items.length - 1));
        const safeRadius = Math.max(0, parseInt(radius, 10) || 0);

        for (let i = idx - safeRadius; i <= idx + safeRadius; i += 1) {
            if (i < 0 || i >= items.length) continue;
            const item = items[i];
            const video = item.querySelector('video');
            if (!video) continue;

            // Keep immediate neighbors warm so next swipe starts instantly.
            video.preload = i === idx ? 'auto' : 'metadata';
            this.ensureVideoSource(video);
        }
    }

    maybeIncrementActiveVideoView(item) {
        if (!item) return;

        const firestoreId = item.dataset ? item.dataset.firestoreId : null;
        if (!firestoreId) return;
        if (this.viewedFeedFirestoreIds.has(firestoreId)) return;
        this.viewedFeedFirestoreIds.add(firestoreId);

        // Optimistically update local cache (avoid localStorage writes).
        if (this.dataService && Array.isArray(this.dataService.userVideos)) {
            const local = this.dataService.userVideos.find(v => String(v.firestoreId || '') === String(firestoreId));
            if (local) {
                local.views = (parseInt(local.views, 10) || 0) + 1;
            }
        }

        if (firebaseService && firebaseService.isInitialized && firebaseService.isInitialized() && typeof firebaseService.incrementViews === 'function') {
            firebaseService.incrementViews(firestoreId);
        }
    }

    bindGridPreviewVideo(videoEl) {
        if (!videoEl) return;
        if (videoEl.dataset.previewBound === '1') return;
        videoEl.dataset.previewBound = '1';

        videoEl.addEventListener('loadedmetadata', () => {
            // Seek a tiny bit to force a real frame to render (many browsers show black at t=0).
            try {
                const t = 0.1;
                if (Number.isFinite(videoEl.duration) && videoEl.duration > 0) {
                    videoEl.currentTime = Math.min(t, Math.max(0, videoEl.duration - 0.01));
                } else {
                    videoEl.currentTime = t;
                }
            } catch (_) {}
        });

        videoEl.addEventListener('seeked', () => {
            try { videoEl.pause(); } catch (_) {}
        });
    }

    setupProfileGridPreviews(gridEl) {
        if (!gridEl) return;

        if (this.profileGridObserver) {
            this.profileGridObserver.disconnect();
            this.profileGridObserver = null;
        }

        const root = document.getElementById('profile-view') || null;
        this.profileGridObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target.querySelector('video');
                if (!video) return;

                if (entry.isIntersecting) {
                    this.bindGridPreviewVideo(video);
                    this.ensureVideoSource(video);
                    return;
                }

                if (entry.intersectionRatio === 0) {
                    this.unloadVideo(video);
                }
            });
        }, { root, threshold: [0, 0.1] });

        gridEl.querySelectorAll('.grid-item').forEach(item => this.profileGridObserver.observe(item));
    }

    setActiveFeedIndex(index, { play = true, scroll = false, behavior = 'smooth' } = {}) {
        const items = this.getFeedVideoItems();
        if (!items.length) return;

        const clamped = Math.max(0, Math.min(parseInt(index, 10) || 0, items.length - 1));
        const prevIndex = this.state.activeFeedIndex;
        this.state.activeFeedIndex = clamped;
        if (prevIndex !== clamped) {
            const prevItem = items[prevIndex];
            if (prevItem) {
                const prevVideo = prevItem.querySelector('video');
                this.endVideoWatchSession(prevItem, prevVideo);
            }
        }

        if (scroll) {
            this.scrollFeedToIndex(clamped, behavior);
        }

        this.maybeIncrementActiveVideoView(items[clamped]);
        this.prefetchFeedNeighbors(clamped, 1);

        // Only one video should ever be allowed to play with sound.
        items.forEach((item, i) => {
            const video = item.querySelector('video');
            if (!video) return;

            if (i === clamped) {
                this.ensureVideoSource(video);
                video.muted = false;
                if (play && this.dataService?.settings?.autoplay) {
                    video.play().catch(() => {});
                }
                if (!video.paused) {
                    this.startVideoWatchSession(video);
                }
                return;
            }

            // Non-active: always stop sound/playback. Unload only when fully offscreen.
            this.endVideoWatchSession(item, video);
            try { video.pause(); } catch (_) {}
            video.muted = true;

            const ratio = this.feedIntersectionRatios.get(item);
            if (ratio === 0) {
                this.unloadVideo(video);
            }
        });
    }

    setActiveFeedItem(item, opts) {
        const items = this.getFeedVideoItems();
        const index = items.indexOf(item);
        if (index === -1) return;
        this.setActiveFeedIndex(index, opts);
    }

    scrollToFeedVideoById(videoId, { play = true } = {}) {
        if (!this.feedContainer) return false;

        const item = this.feedContainer.querySelector(`.video-item[data-id="${videoId}"]`);
        if (!item) return false;

        const items = this.getFeedVideoItems();
        const index = items.indexOf(item);
        if (index === -1) return false;

        // Scroll + make it active (loads src, pauses others, etc).
        this.setActiveFeedIndex(index, { play: false, scroll: true });

        const video = item.querySelector('video');
        this.ensureVideoSource(video);

        if (play && video) {
            // After the snap/scroll, try to play. (If autoplay is blocked, user can tap.)
            setTimeout(() => video.play().catch(() => {}), 500);
        }

        return true;
    }

    attachVideoEvents() {
        const videoItems = this.feedContainer.querySelectorAll('.video-item');
        
        videoItems.forEach(item => {
            if (this.boundFeedItems.has(item)) return;
            this.boundFeedItems.add(item);

            const video = item.querySelector('video');
            const likeBtn = item.querySelector('.like-btn');
            const commentBtn = item.querySelector('.comment-btn');
            const shareBtn = item.querySelector('.share-btn');
            const avatar = item.querySelector('.avatar-container');
            const hashtags = item.querySelectorAll('.hashtag');
            const videoId = item.dataset.id;
            
            item.addEventListener('click', (e) => {
                if (e.target.closest('.action-btn') || e.target.closest('.avatar-container')) return;
                this.setActiveFeedItem(item, { play: false });
                this.ensureVideoSource(video);
                if (!video) return;

                if (video.paused) video.play().catch(() => {});
                else video.pause();
            });
            
            likeBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!firebaseService.getCurrentUser()) {
                    this.navigateTo('auth-view');
                    AdvancedViewRenderer.showToast('Войдите, чтобы ставить лайки', 'warning');
                    return;
                }

                // Prevent double-taps spamming Firestore.
                if (likeBtn.dataset.busy === '1') return;
                likeBtn.dataset.busy = '1';

                (async () => {
                    const firestoreId = item.dataset.firestoreId || null;
                    const localVideo = (this.dataService && Array.isArray(this.dataService.userVideos))
                        ? this.dataService.userVideos.find(v => firestoreId
                            ? String(v.firestoreId || '') === String(firestoreId)
                            : String(v.id) === String(videoId))
                        : null;

                    try {
                        let isLiked = false;

                        if (firebaseService && firebaseService.isInitialized && firebaseService.isInitialized() && firestoreId) {
                            isLiked = await firebaseService.toggleLike(firestoreId);
                            if (localVideo) {
                                const baseLikes = parseInt(localVideo.likes, 10) || 0;
                                localVideo.likes = baseLikes + (isLiked ? 1 : -1);
                                localVideo.isLiked = !!isLiked;
                                if (typeof this.dataService.syncFeedCacheWithLocal === 'function') {
                                    this.dataService.syncFeedCacheWithLocal();
                                }
                            }
                        } else {
                            isLiked = this.dataService.toggleLike(videoId);
                            if (typeof this.dataService.syncFeedCacheWithLocal === 'function') {
                                this.dataService.syncFeedCacheWithLocal();
                            }
                        }

                        likeBtn.classList.toggle('liked', !!isLiked);

                        const countSpan = likeBtn.querySelector('.like-count');
                        if (countSpan) {
                            let nextLikes = 0;
                            if (localVideo) {
                                nextLikes = Math.max(0, parseInt(localVideo.likes, 10) || 0);
                            } else {
                                const currentLikes = parseInt(countSpan.dataset.count || '0', 10) || 0;
                                nextLikes = Math.max(0, currentLikes + (isLiked ? 1 : -1));
                            }
                            countSpan.dataset.count = String(nextLikes);
                            countSpan.textContent = AdvancedViewRenderer.formatNumber(nextLikes);
                        }

                        AdvancedViewRenderer.showToast(isLiked ? 'Вам понравилось' : 'Лайк удален', isLiked ? 'success' : 'info');
                    } catch (err) {
                        console.error('Ошибка лайка:', err);
                        AdvancedViewRenderer.showToast(err?.message || 'Не удалось поставить лайк', 'error');
                    } finally {
                        likeBtn.dataset.busy = '0';
                    }
                })();
            });
            
            commentBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openComments(videoId);
            });
            
            shareBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showShareModal(videoId);
            });
            
            avatar?.addEventListener('click', (e) => {
                e.stopPropagation();

                const now = Date.now();
                const lastTap = avatar.__lastTapAt || 0;
                avatar.__lastTapAt = now;

                if (avatar.__singleTapTimer) {
                    clearTimeout(avatar.__singleTapTimer);
                    avatar.__singleTapTimer = null;
                }

                const targetUid = avatar.dataset.uid || item.dataset.uid || null;
                const targetName = avatar.dataset.author || item.dataset.author || null;

                // Double tap: open profile
                if (now - lastTap < 350) {
                    if (targetUid) {
                        this.openUserProfileByUid(targetUid);
                    } else if (targetName) {
                        AdvancedViewRenderer.showToast('Не удалось открыть профиль', 'warning');
                    }
                    return;
                }

                // Single tap (delayed): subscribe/unsubscribe (no self-subscribe)
                avatar.__singleTapTimer = setTimeout(async () => {
                    const currentUser = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
                    const currentUid = currentUser && currentUser.uid ? String(currentUser.uid) : null;
                    const authorUid = targetUid ? String(targetUid) : null;

                    if (!currentUser) {
                        this.navigateTo('auth-view');
                        AdvancedViewRenderer.showToast('Войдите, чтобы подписаться', 'warning');
                        return;
                    }
                    if (!authorUid) {
                        AdvancedViewRenderer.showToast('Не удалось определить автора', 'warning');
                        return;
                    }
                    if (currentUid && currentUid === authorUid) {
                        // Self: no subscribe action (use double-tap to open profile)
                        return;
                    }

                    const followPlus = avatar.querySelector('.follow-plus');
                    if (!followPlus) return;

                    const subs = Array.isArray(currentUser.subscriptions) ? currentUser.subscriptions.map(String) : [];
                    const isSubscribed = subs.includes(authorUid);

                    try {
                        if (firebaseService && firebaseService.isInitialized && firebaseService.isInitialized()) {
                            if (isSubscribed) {
                                await firebaseService.unsubscribe(authorUid);
                                followPlus.textContent = '+';
                                followPlus.style.background = 'var(--accent-color)';
                                AdvancedViewRenderer.showToast('Подписка отменена', 'info');
                            } else {
                                await firebaseService.subscribe(authorUid);
                                followPlus.textContent = '✓';
                                followPlus.style.background = 'var(--accent-secondary)';
                                AdvancedViewRenderer.showToast('Подписка оформлена', 'success');
                            }
                        } else {
                            AdvancedViewRenderer.showToast('Подписки доступны после подключения базы', 'warning');
                        }
                    } catch (err) {
                        console.error(err);
                        AdvancedViewRenderer.showToast(err?.message || 'Не удалось изменить подписку', 'error');
                    }
                }, 360);
            });
            
            hashtags.forEach(hashtag => {
                hashtag.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tag = hashtag.textContent;
                    this.navigateTo('search-view');
                    setTimeout(() => {
                        this.searchViewInput.value = tag;
                        this.searchViewClear.style.display = 'flex';
                        this.performSearch(tag);
                    }, 100);
                    AdvancedViewRenderer.showToast(`Поиск по ${tag}`, 'info');
                });
            });
            
            if (video) {
                video.addEventListener('play', () => {
                    this.startVideoWatchSession(video);
                });

                video.addEventListener('pause', () => {
                    this.endVideoWatchSession(item, video);
                });

                video.addEventListener('timeupdate', () => {
                    const progressBar = item.querySelector('.video-progress-bar');
                    if (progressBar) {
                        const percent = (video.currentTime / video.duration) * 100;
                        progressBar.style.width = `${percent}%`;
                    }
                });
                
                video.addEventListener('ended', () => {
                    this.endVideoWatchSession(item, video);
                    video.currentTime = 0;
                    video.play().catch(() => {});
                });
            }
        });
    }

    setupVideoProgress() {
        if (!this.feedContainer) return;

        if (!this.feedVideoObserver) {
            this.feedVideoObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    this.feedIntersectionRatios.set(entry.target, entry.intersectionRatio);

                    const video = entry.target.querySelector('video');
                    if (!video) return;

                    if (entry.intersectionRatio > 0) {
                        // Lazy-load when the item becomes visible at all.
                        this.ensureVideoSource(video);
                    }

                    if (entry.intersectionRatio === 0) {
                        // Fully offscreen: stop and unload so it doesn't keep buffering/playing audio.
                        this.unloadVideo(video);
                        return;
                    }

                    if (entry.intersectionRatio < 0.6) {
                        // Partially visible (during swipe): never allow background audio.
                        try { video.pause(); } catch (_) {}
                        video.muted = true;
                    }
                });

                // Pick the most visible item (>= 60%) as "active" and play only that one.
                let bestItem = null;
                let bestRatio = 0.6;
                for (const [item, ratio] of this.feedIntersectionRatios.entries()) {
                    if (!item || !item.isConnected) continue;
                    if (ratio >= bestRatio) {
                        bestRatio = ratio;
                        bestItem = item;
                    }
                }

                if (bestItem) {
                    this.setActiveFeedItem(bestItem, { play: true });
                }
            }, { root: this.feedContainer, threshold: [0, 0.01, 0.6] });
        }

        // Observe items (WeakSet prevents duplicates, and doesn't break on innerHTML restores).
        this.feedContainer.querySelectorAll('.video-item').forEach(item => {
            if (this.observedFeedItems.has(item)) return;
            this.observedFeedItems.add(item);
            this.feedVideoObserver.observe(item);
        });
    }

    previewVideo(file) {
        if (!file.type.startsWith('video/')) {
            AdvancedViewRenderer.showToast('Выберите видео файл', 'warning');
            return;
        }
        if (file.size > 100 * 1024 * 1024) {
            AdvancedViewRenderer.showToast('Файл слишком большой (макс. 100MB)', 'error');
            return;
        }
        
        const url = URL.createObjectURL(file);
        const previewVideo = document.getElementById('preview-video');
        previewVideo.src = url;
        
        document.getElementById('upload-preview').style.display = 'block';
        document.getElementById('upload-area').style.display = 'none';
        this.cameraPreview.style.display = 'none';
    }

    navigateTo(viewId) {
        if (viewId === 'admin-view' && !this.isCurrentUserAdmin()) {
            AdvancedViewRenderer.showToast('Доступ только для администратора', 'warning');
            viewId = 'profile-view';
        }

        document.querySelectorAll('video').forEach(v => v.pause());
        this.state.activeViewId = viewId;
        if (viewId !== 'messages-view') {
            this.teardownChatRealtime();
            this.hideEmojiPicker();
            this.hideStickerPicker();
            this.updateTypingStatus(false);
            if (this.chatDialog) this.chatDialog.style.setProperty('--keyboard-offset', '0px');
        }
        this.views.forEach(v => v.classList.remove('active'));
        
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
            
            this.navItems.forEach(n => {
                n.classList.toggle('active', n.dataset.target === viewId);
            });
            
            if (viewId === 'auth-view') {
                document.getElementById('login-form').style.display = 'block';
                document.getElementById('register-form').style.display = 'none';
                this.setupAuthSwitchListeners();
            }
            
            if (viewId === 'profile-view') {
                const hash = window.location.hash.replace('#', '');
                const isExternal = hash.startsWith('profile-') && this.state.viewingProfileUid;
                if (!isExternal) {
                    this.state.viewingProfileUid = null;
                    this.updateProfileUI();
                    this.configureProfileActionButtons({ isOwn: true });
                }
            }
            if (viewId === 'feed-view') {
                this.updateFeedTopControls();
                setTimeout(() => {
                    if (this.state.feedMode !== 'global') return;
                    const index = this.getNearestFeedIndex();
                    this.setActiveFeedIndex(index, { play: this.dataService.settings.autoplay });
                }, 50);
            }
            if (viewId === 'upload-view') {
                this.setupCamera();
                this.restoreUploadDraft();
            }
            if (viewId === 'messages-view') {
                if (this.chatDialog && this.messagesListSection) {
                    this.chatDialog.style.display = 'none';
                    this.messagesListSection.style.display = 'flex';
                }
                this.loadChats();
            }
            if (viewId === 'notifications-view') {
                this.loadNotifications('all');
                this.updateNotificationBadge();
            }
            if (viewId === 'admin-view') {
                this.loadAdminPanelData({ showToast: false });
            }
        }

        this.updateHamburgerVisibility();
        this.updateAdminMenuVisibility();
    }

    updateHamburgerVisibility() {
        const body = document.body;
        if (!body) return;

        const currentUid = firebaseService && typeof firebaseService.getCurrentUid === 'function'
            ? firebaseService.getCurrentUid()
            : null;

        const isOwnProfileView = this.state.activeViewId === 'profile-view'
            && !this.state.viewingProfileUid
            && !!currentUid;

        body.classList.toggle('show-profile-menu', !!isOwnProfileView);

        if (!isOwnProfileView) {
            // Ensure menu is closed when hidden
            if (this.hamburgerBtn) this.hamburgerBtn.classList.remove('active');
            if (this.menuDropdown) this.menuDropdown.classList.remove('active');
        }

        this.updateAdminMenuVisibility();
    }

    setupIncomingMessagesWatcher() {
        const uid = firebaseService && typeof firebaseService.getCurrentUid === 'function'
            ? firebaseService.getCurrentUid()
            : null;

        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized() && uid)) {
            if (this.incomingMessagesUnsubscribe) {
                try { this.incomingMessagesUnsubscribe(); } catch (_) {}
            }
            this.incomingMessagesUnsubscribe = null;
            this.incomingMessagesUid = null;
            this.updateMessagesBadge(0);
            return;
        }

        const uidStr = String(uid);
        if (this.incomingMessagesUid === uidStr && this.incomingMessagesUnsubscribe) {
            return;
        }

        if (this.incomingMessagesUnsubscribe) {
            try { this.incomingMessagesUnsubscribe(); } catch (_) {}
        }

        this.incomingMessagesUid = uidStr;

        if (typeof firebaseService.subscribeToIncomingMessages !== 'function') {
            return;
        }

        this.incomingMessagesUnsubscribe = firebaseService.subscribeToIncomingMessages(({ unreadCount = 0, newMessages = [] } = {}) => {
            this.updateMessagesBadge(unreadCount);

            if (!Array.isArray(newMessages) || newMessages.length === 0) return;
            newMessages.forEach((msg) => this.maybeShowIncomingMessageToast(msg));
        });
    }

    setupIncomingCallsWatcher() {
        const uid = firebaseService && typeof firebaseService.getCurrentUid === 'function'
            ? firebaseService.getCurrentUid()
            : null;

        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized() && uid)) {
            if (this.incomingCallsUnsubscribe) {
                try { this.incomingCallsUnsubscribe(); } catch (_) {}
            }
            this.incomingCallsUnsubscribe = null;
            this.incomingCallsUid = null;
            this.knownIncomingCallIds.clear();
            this.resetCallSession();
            return;
        }

        const uidStr = String(uid);
        if (this.incomingCallsUid === uidStr && this.incomingCallsUnsubscribe) {
            return;
        }

        if (this.incomingCallsUnsubscribe) {
            try { this.incomingCallsUnsubscribe(); } catch (_) {}
        }

        this.incomingCallsUid = uidStr;
        this.knownIncomingCallIds.clear();

        if (typeof firebaseService.subscribeToIncomingCalls !== 'function') return;

        this.incomingCallsUnsubscribe = firebaseService.subscribeToIncomingCalls((calls = []) => {
            if (!Array.isArray(calls)) return;

            if (this.pendingIncomingCall && this.pendingIncomingCall.id) {
                const pendingId = String(this.pendingIncomingCall.id);
                const pendingState = calls.find(item => String(item?.id || '') === pendingId);
                if (!pendingState || String(pendingState.status || '') !== 'ringing') {
                    this.pendingIncomingCall = null;
                    if (!this.activeCall) this.hideCallModal();
                }
            }

            if (calls.length === 0) return;

            calls.forEach((call) => {
                if (!call || !call.id) return;
                if (String(call.toUid || '') !== uidStr) return;
                if (String(call.status || '') !== 'ringing') return;

                const callId = String(call.id);
                if (this.knownIncomingCallIds.has(callId)) return;
                this.knownIncomingCallIds.add(callId);

                if (this.activeCall && this.activeCall.id && this.activeCall.id !== callId) {
                    if (typeof firebaseService.updateCall === 'function') {
                        firebaseService.updateCall(callId, {
                            status: 'missed',
                            endedBy: 'busy',
                            endedAt: Date.now()
                        }).catch(() => {});
                    }
                    return;
                }

                this.pendingIncomingCall = call;
                this.showIncomingCallModal(call);
                this.maybeShowIncomingCallToast(call);
            });
        });
    }

    updateMessagesBadge(count) {
        if (!this.messagesBadge) return;

        const n = Math.max(0, parseInt(count, 10) || 0);
        if (n > 0) {
            this.messagesBadge.textContent = n > 99 ? '99+' : String(n);
            this.messagesBadge.style.display = 'flex';
        } else {
            this.messagesBadge.style.display = 'none';
        }
    }

    getMessagePreviewText(message = {}) {
        const msg = message || {};
        if (msg.type === 'file') return `📎 ${msg.file?.name || 'Файл'}`;
        if (msg.type === 'sticker') return '🪄 Стикер';
        if (msg.type === 'video-circle') return '🎥 Видеокружок';
        if (msg.type === 'call-event') return '📹 Видеозвонок';
        return String(msg.content || '').trim();
    }

    maybeShowIncomingMessageToast(message) {
        const msg = message || {};
        const chatId = msg.chatId || null;

        // If user is already inside this chat, don't spam a toast.
        if (this.state.activeViewId === 'messages-view'
            && this.chatDialog
            && this.chatDialog.style.display !== 'none'
            && this.state.currentChatId
            && chatId
            && String(this.state.currentChatId) === String(chatId)) {
            return;
        }

        const fromUser = msg.fromUser || 'user';
        const preview = this.getMessagePreviewText(msg);

        const trimmed = preview.length > 80 ? (preview.slice(0, 77) + '...') : preview;
        const text = `💬 @${fromUser}: ${trimmed || 'сообщение'}`;

        if ('Notification' in window
            && Notification.permission === 'granted'
            && document.visibilityState !== 'visible') {
            try {
                new Notification(`Сообщение от @${fromUser}`, {
                    body: trimmed || 'Новое сообщение',
                    tag: chatId ? `chat-${chatId}` : undefined
                });
            } catch (_) {}
        }

        const toast = document.getElementById('toast');
        if (toast) {
            toast.dataset.chatId = chatId ? String(chatId) : '';
            toast.dataset.chatUid = msg.fromUid ? String(msg.fromUid) : '';
            toast.dataset.chatUser = String(fromUser);

            if (toast.dataset.chatClickBound !== '1') {
                toast.dataset.chatClickBound = '1';
                toast.addEventListener('click', () => {
                    const id = toast.dataset.chatId;
                    const otherUid = toast.dataset.chatUid;
                    const otherUser = toast.dataset.chatUser;
                    if (!id || !otherUser) return;
                    this.navigateTo('messages-view');
                    this.openChat(otherUser, id, otherUid || null);
                });
            }
        }

        AdvancedViewRenderer.showToast(text, 'info');
    }

    maybeShowIncomingCallToast(call) {
        const fromUser = call?.fromUser || 'user';
        const text = `📹 Видеозвонок от @${fromUser}`;
        const toast = document.getElementById('toast');
        if (toast) {
            toast.dataset.chatId = '';
            toast.dataset.chatUid = '';
            toast.dataset.chatUser = '';
        }
        AdvancedViewRenderer.showToast(text, 'info');
    }

    updateFeedCommentCount(videoId, count = 0) {
        if (!this.feedContainer) return;
        const id = String(videoId || '');
        if (!id) return;

        const card = this.feedContainer.querySelector(`.video-item[data-id="${id}"]`);
        if (!card) return;

        const span = card.querySelector('.comment-btn .comment-count')
            || card.querySelector('.comment-btn span');
        if (!span) return;

        const safeCount = Math.max(0, parseInt(count, 10) || 0);
        span.dataset.count = String(safeCount);
        span.textContent = AdvancedViewRenderer.formatNumber(safeCount);
    }

    async openComments(videoId) {
        const id = String(videoId);
        let video = this.dataService.userVideos.find(v => String(v.id) === id);
        if (!video && this.feedContainer) {
            const feedItem = this.feedContainer.querySelector(`.video-item[data-id="${id}"]`);
            if (feedItem) {
                video = {
                    id,
                    firestoreId: feedItem.dataset.firestoreId || null,
                    comments: []
                };
                if (this.dataService && Array.isArray(this.dataService.userVideos)) {
                    this.dataService.userVideos.push(video);
                }
            }
        }
        if (!video) return;
        
        this.state.activeCommentsVideoId = id;
        
        const commentsList = document.getElementById('comments-list');
        const commentCount = document.getElementById('comment-count');
        const comments = Array.isArray(video.comments) ? video.comments : [];
        const initialCount = Number.isFinite(parseInt(video.commentsCount, 10))
            ? (parseInt(video.commentsCount, 10) || 0)
            : comments.length;
        
        commentCount.textContent = String(initialCount);
        commentsList.innerHTML = AdvancedViewRenderer.renderComments(comments);
        this.updateFeedCommentCount(id, initialCount);
        
        this.commentsSheet.classList.add('open');
        document.getElementById('comment-input').focus();

        // Refresh from Firestore (if available) to avoid stale comments in sheet.
        if (video.firestoreId
            && firebaseService
            && typeof firebaseService.isInitialized === 'function'
            && firebaseService.isInitialized()
            && typeof firebaseService.getComments === 'function') {
            try {
                const remoteComments = await firebaseService.getComments(video.firestoreId);
                if (Array.isArray(remoteComments)) {
                    video.comments = remoteComments;
                    video.commentsCount = remoteComments.length;
                    commentCount.textContent = remoteComments.length;
                    commentsList.innerHTML = AdvancedViewRenderer.renderComments(remoteComments);
                    this.updateFeedCommentCount(id, remoteComments.length);
                }
            } catch (error) {
                console.error('Ошибка загрузки комментариев:', error);
            }
        }
    }

    async sendComment() {
        const input = document.getElementById('comment-input');
        const text = input.value.trim();
        
        if (!text) return;
        if (!this.dataService.getCurrentUser()) {
            AdvancedViewRenderer.showToast('Войдите, чтобы комментировать', 'warning');
            return;
        }

        const targetId = String(this.state.activeCommentsVideoId || '');
        let video = this.dataService.userVideos.find(v => String(v.id) === targetId);
        if (!video && this.feedContainer) {
            const feedItem = this.feedContainer.querySelector(`.video-item[data-id="${targetId}"]`);
            if (feedItem) {
                video = {
                    id: targetId,
                    firestoreId: feedItem.dataset.firestoreId || null,
                    comments: []
                };
                if (this.dataService && Array.isArray(this.dataService.userVideos)) {
                    this.dataService.userVideos.push(video);
                }
            }
        }
        if (!video) {
            AdvancedViewRenderer.showToast('Видео для комментария не найдено', 'warning');
            return;
        }

        let comment = null;
        if (video.firestoreId
            && firebaseService
            && typeof firebaseService.isInitialized === 'function'
            && firebaseService.isInitialized()
            && typeof firebaseService.addComment === 'function') {
            try {
                comment = await firebaseService.addComment(video.firestoreId, text);
                video.comments = Array.isArray(video.comments) ? video.comments : [];
                video.comments.push(comment);
                if (typeof this.dataService.syncFeedCacheWithLocal === 'function') {
                    this.dataService.syncFeedCacheWithLocal();
                }
            } catch (error) {
                console.error('Ошибка добавления комментария:', error);
                comment = this.dataService.addComment(targetId, text);
                if (!comment) {
                    AdvancedViewRenderer.showToast('Не удалось отправить комментарий', 'error');
                    return;
                }
                AdvancedViewRenderer.showToast('Сбой сети: комментарий сохранен локально', 'warning');
            }
        } else {
            comment = this.dataService.addComment(targetId, text);
            if (typeof this.dataService.syncFeedCacheWithLocal === 'function') {
                this.dataService.syncFeedCacheWithLocal();
            }
        }

        if (comment) {
            const commentsList = document.getElementById('comments-list');
            const avatar = comment.avatar
                || (firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser()?.avatar : null)
                || this.dataService.getCurrentUser()?.avatar
                || `https://ui-avatars.com/api/?name=${encodeURIComponent(comment.user || 'user')}&background=random&size=32`;
            const newCommentHTML = `
                <div class="comment-item">
                    <img src="${avatar}" class="comment-avatar">
                    <div class="comment-content">
                        <div class="comment-author">
                            @${comment.user}
                            <span class="comment-time">только что</span>
                        </div>
                        <div class="comment-text">${comment.text}</div>
                        <div class="comment-actions">
                            <span class="comment-action">💬 Ответить</span>
                            <span class="comment-action">❤️ 0</span>
                        </div>
                    </div>
                </div>
            `;
            commentsList.insertAdjacentHTML('afterbegin', newCommentHTML);
            
            const commentCount = document.getElementById('comment-count');
            const nextCount = (parseInt(commentCount.textContent, 10) || 0) + 1;
            commentCount.textContent = String(nextCount);
            video.commentsCount = nextCount;
            this.updateFeedCommentCount(targetId, nextCount);
            
            input.value = '';
            AdvancedViewRenderer.showToast('Комментарий добавлен', 'success');
        }
    }

    canCurrentUserDeleteVideo(video) {
        const currentUser = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        if (!currentUser || !video) return false;
        if (currentUser.uid && video.uid) {
            return String(currentUser.uid) === String(video.uid);
        }
        return !!(currentUser.name && video.author && currentUser.name === video.author);
    }

    async deleteVideoWithConfirm(video) {
        if (!video) return false;

        if (!this.canCurrentUserDeleteVideo(video)) {
            AdvancedViewRenderer.showToast('Можно удалять только свои видео', 'warning');
            return false;
        }

        if (!confirm('Удалить это видео?')) return false;

        try {
            if (typeof waitForFirebaseService === 'function') {
                await waitForFirebaseService(5000);
            }

            if (video.firestoreId
                && firebaseService
                && typeof firebaseService.isInitialized === 'function'
                && firebaseService.isInitialized()
                && typeof firebaseService.deleteVideo === 'function') {
                await firebaseService.deleteVideo(video.firestoreId, video.storagePath, video.storageProvider);
            } else if (this.dataService && Array.isArray(this.dataService.userVideos)) {
                // Local fallback
                this.dataService.userVideos = this.dataService.userVideos.filter(v => String(v.id) !== String(video.id));
                try { localStorage.setItem(this.dataService.STORAGE_KEY, JSON.stringify(this.dataService.userVideos)); } catch (_) {}
            }

            this.deletedVideoIds.add(String(video.id));

            if (this.dataService && Array.isArray(this.dataService.userVideos)) {
                this.dataService.userVideos = this.dataService.userVideos.filter(v => String(v.id) !== String(video.id));
                if (typeof this.dataService.syncFeedCacheWithLocal === 'function') {
                    this.dataService.syncFeedCacheWithLocal();
                }
            }

            // Remove from profile grid(s)
            document.querySelectorAll(`.grid-item[data-id=\"${video.id}\"]`).forEach(el => el.remove());

            // Remove from feed (global/custom) if present
            if (this.feedContainer) {
                this.feedContainer.querySelectorAll(`.video-item[data-id=\"${video.id}\"]`).forEach(item => {
                    const vid = item.querySelector('video');
                    if (vid) this.unloadVideo(vid);
                    this.feedIntersectionRatios.delete(item);
                    item.remove();
                });
            }

            // Keep custom feed list in sync if we are in it
            if (this.customFeed && Array.isArray(this.customFeed.videos)) {
                this.customFeed.videos = this.customFeed.videos.filter(v => String(v.id) !== String(video.id));
            }

            // Best-effort: update likes total on own profile
            const currentUser = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
            if (currentUser && (currentUser.uid || currentUser.name)) {
                const likesTotal = (this.dataService.userVideos || [])
                    .filter(v => (currentUser.uid && v.uid) ? (String(v.uid) === String(currentUser.uid)) : (v.author === currentUser.name))
                    .reduce((sum, v) => sum + (parseInt(v.likes, 10) || 0), 0);
                const likesEl = document.getElementById('likes-stat')?.querySelector('.stat-num');
                if (likesEl) likesEl.textContent = AdvancedViewRenderer.formatNumber(likesTotal);
            }

            // Ensure feed keeps a valid active item (and no ghost audio)
            if (this.feedContainer && this.feedContainer.querySelectorAll('.video-item').length) {
                const index = this.getNearestFeedIndex();
                this.setActiveFeedIndex(index, { play: this.dataService.settings.autoplay });
            }

            AdvancedViewRenderer.showToast('Видео удалено', 'success');
            return true;
        } catch (err) {
            console.error(err);
            AdvancedViewRenderer.showToast(err?.message || 'Не удалось удалить видео', 'error');
            return false;
        }
    }

    showShareModal(videoId) {
        const id = String(videoId);
        const video = this.dataService.userVideos.find(v => String(v.id) === id);
        if (!video) return;
        const currentUser = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        const currentUid = currentUser && currentUser.uid ? String(currentUser.uid) : null;
        const authorUid = video && video.uid ? String(video.uid) : null;
        const isOwnAuthor = !!(currentUid && authorUid && currentUid === authorUid);
        
        const shareModal = document.getElementById('share-modal');
        shareModal.innerHTML = AdvancedViewRenderer.renderShareOptions(video.id);
        if (!isOwnAuthor && authorUid) {
            shareModal.insertAdjacentHTML('beforeend', `
                <div class="share-option" data-action="hide-author">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 6a9.77 9.77 0 0 1 9 6 9.77 9.77 0 0 1-9 6 9.77 9.77 0 0 1-9-6 9.77 9.77 0 0 1 9-6m0-2C6.5 4 1.73 7.11 0 12c1.73 4.89 6.5 8 12 8s10.27-3.11 12-8c-1.73-4.89-6.5-8-12-8zm0 5a3 3 0 1 0 3 3 3 3 0 0 0-3-3z"></path>
                    </svg>
                    <span>Скрыть автора</span>
                </div>
                <div class="share-option" data-action="block-author">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm6.36 14.95L7.05 5.64A8 8 0 0 1 18.36 16.95zM5.64 7.05l11.31 11.31A8 8 0 0 1 5.64 7.05z"></path>
                    </svg>
                    <span>Заблокировать</span>
                </div>
                <div class="share-option danger" data-action="report">
                    <svg viewBox="0 0 24 24">
                        <path d="M14.4 6 14 4H5v16h2v-6h5.6l.4 2H21V6z"></path>
                    </svg>
                    <span>Пожаловаться</span>
                </div>
            `);
        }
        if (this.canCurrentUserDeleteVideo(video)) {
            shareModal.insertAdjacentHTML('beforeend', `
                <div class="share-option danger" data-action="delete">
                    <svg viewBox="0 0 24 24">
                        <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2zM4 7h16v2H4V7z"></path>
                    </svg>
                    <span>Удалить</span>
                </div>
            `);
        }
        shareModal.classList.add('open');
        
        shareModal.querySelectorAll('.share-option').forEach(option => {
            option.addEventListener('click', async () => {
                const action = option.dataset.action;
                
                switch(action) {
                    case 'copy':
                        navigator.clipboard.writeText(option.dataset.url || '')
                            .then(() => AdvancedViewRenderer.showToast('Ссылка скопирована', 'success'));
                        break;
                    case 'whatsapp':
                        window.open(`https://wa.me/?text=${encodeURIComponent(video.desc + ' ' + (option.dataset.url || ''))}`, '_blank');
                        break;
                    case 'telegram':
                        window.open(`https://t.me/share/url?url=${encodeURIComponent(option.dataset.url || '')}&text=${encodeURIComponent(video.desc)}`, '_blank');
                        break;
                    case 'twitter':
                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(video.desc)}&url=${encodeURIComponent(option.dataset.url || '')}`, '_blank');
                        break;
                    case 'hide-author':
                        await this.hideAuthorInFeed(video);
                        break;
                    case 'block-author':
                        await this.blockAuthorInFeed(video);
                        break;
                    case 'report':
                        await this.reportVideo(video);
                        break;
                    case 'delete':
                        await this.deleteVideoWithConfirm(video);
                        break;
                }
                shareModal.classList.remove('open');
            });
        });
        
        if (shareModal.dataset.backdropBound !== '1') {
            shareModal.dataset.backdropBound = '1';
            shareModal.addEventListener('click', (e) => {
                if (e.target === shareModal) shareModal.classList.remove('open');
            });
        }
    }

    async performSearch(query) {
        if (!query.trim()) {
            this.searchEmpty.style.display = 'flex';
            this.searchResults.innerHTML = '';
            return;
        }

        const videoResults = this.dataService.searchVideos(query);
        let profileResults = [];
        if (firebaseService && firebaseService.isInitialized()) {
            profileResults = await firebaseService.getAllUsers();
            profileResults = profileResults.filter(u => u.name && u.name.toLowerCase().includes(query.toLowerCase()));
        }
        const verifiedByName = new Map(profileResults.map(u => [u.name, !!u.verified]));

        this.searchResults.innerHTML = '';
        this.searchEmpty.style.display = 'none';

        if (videoResults.length === 0 && profileResults.length === 0) {
            this.searchEmpty.style.display = 'flex';
            this.searchEmpty.innerHTML = `
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
                <p style="color: var(--secondary-text); margin-top: 15px;">Ничего не найдено</p>
            `;
            return;
        }

        profileResults.forEach(profile => {
            const profileItem = document.createElement('div');
            profileItem.className = 'search-result-item profile-result';
            profileItem.innerHTML = `
                <img src="${profile.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.name)}" alt="Аватар" class="search-result-thumbnail">
                <div class="search-result-info">
                    <div class="search-result-author">${this.renderUserLabel(profile.name, !!profile.verified)}</div>
                    <div class="search-result-desc">${profile.bio || ''}</div>
                </div>
            `;
            profileItem.addEventListener('click', () => {
                // Deep-link support + instant navigation
                window.location.hash = `profile-${profile.uid}`;
                this.openUserProfileByUid(profile.uid);
            });
            this.searchResults.appendChild(profileItem);
        });

        videoResults.forEach(video => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            const isAuthorVerified = !!(video.authorVerified || video.verified || verifiedByName.get(video.author));
            resultItem.innerHTML = `
                <img src="${video.thumbnail}" alt="Видео" class="search-result-thumbnail">
                <div class="search-result-info">
                    <div class="search-result-author">${this.renderUserLabel(video.author, isAuthorVerified)}</div>
                    <div class="search-result-desc">${video.desc}</div>
                    <div class="search-result-views">${video.views} просмотров</div>
                </div>
            `;
            resultItem.addEventListener('click', () => {
                this.navigateTo('feed-view');
                setTimeout(() => {
                    this.scrollToFeedVideoById(video.id, { play: true });
                }, 300);
            });
            this.searchResults.appendChild(resultItem);
        });
    }

    updateProfileUI() {
        const userProfile = this.dataService.getUserProfile();
        this.updateAdminMenuVisibility();
        if (!userProfile) {
            document.getElementById('profile-name').textContent = '@guest';
            document.getElementById('profile-avatar-img').src = 'https://ui-avatars.com/api/?name=Guest&background=random&size=150';
            document.getElementById('profile-bio').textContent = '';
            
            document.getElementById('following-stat').querySelector('.stat-num').textContent = '0';
            document.getElementById('followers-stat').querySelector('.stat-num').textContent = '0';
            document.getElementById('likes-stat').querySelector('.stat-num').textContent = '0';
            
            document.getElementById('profile-grid').innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--secondary-text);">
                    <p>Войдите, чтобы увидеть свои видео</p>
                </div>
            `;
            return;
        }
        
        document.getElementById('profile-name').innerHTML = this.renderUserLabel(userProfile.name, !!userProfile.verified);
        document.getElementById('profile-avatar-img').src = userProfile.avatar;
        document.getElementById('profile-bio').textContent = userProfile.bio || '';
        
        if (userProfile.location) {
            document.getElementById('profile-location').style.display = 'block';
            document.getElementById('location-text').textContent = userProfile.location;
        } else {
            document.getElementById('profile-location').style.display = 'none';
        }
        
        if (userProfile.website) {
            document.getElementById('profile-website').style.display = 'block';
            document.getElementById('website-link').textContent = userProfile.website;
            document.getElementById('website-link').href = userProfile.website.startsWith('http') ? userProfile.website : 'https://' + userProfile.website;
        } else {
            document.getElementById('profile-website').style.display = 'none';
        }
        
        if (userProfile.interests) {
            document.getElementById('profile-interests').style.display = 'block';
            document.getElementById('interests-text').textContent = userProfile.interests;
        } else {
            document.getElementById('profile-interests').style.display = 'none';
        }
        
        if (userProfile.gender && userProfile.gender !== 'other') {
            document.getElementById('profile-gender').style.display = 'block';
            const genderLabels = { male: 'Мужчина', female: 'Женщина', other: 'Не указано' };
            document.getElementById('gender-text').textContent = genderLabels[userProfile.gender] || userProfile.gender;
        } else {
            document.getElementById('profile-gender').style.display = 'none';
        }
        
        document.getElementById('following-stat').querySelector('.stat-num').textContent = AdvancedViewRenderer.formatNumber(userProfile.stats.following);
        document.getElementById('followers-stat').querySelector('.stat-num').textContent = AdvancedViewRenderer.formatNumber(userProfile.stats.followers);
        document.getElementById('likes-stat').querySelector('.stat-num').textContent = AdvancedViewRenderer.formatNumber(userProfile.stats.likes);
        
        const grid = document.getElementById('profile-grid');
        const renderGrid = (videos = []) => {
            grid.innerHTML = '';

            const list = Array.isArray(videos) ? videos : [];
            if (list.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--secondary-text);">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="currentColor" style="opacity: 0.5; margin-bottom: 20px;">
                            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z"/>
                        </svg>
                        <h3>Нет видео</h3>
                        <p style="font-size: 14px; margin-top: 10px;">Создайте свое первое видео!</p>
                        <button class="primary-btn" style="margin-top: 20px; width: auto; padding: 10px 20px;" onclick="app.navigateTo('upload-view')">
                            Создать видео
                        </button>
                    </div>
                `;
                return;
            }

            list.forEach(video => {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item';
                gridItem.dataset.id = video.id;
                if (video.firestoreId) gridItem.dataset.firestoreId = video.firestoreId;

                const commentsCount = Number.isFinite(parseInt(video.commentsCount, 10))
                    ? (parseInt(video.commentsCount, 10) || 0)
                    : (Array.isArray(video.comments) ? video.comments.length : 0);
                const safeUrl = this.escapeHtml(video.url || '');
                const safePoster = video.thumbnail ? this.escapeHtml(video.thumbnail) : '';
                const posterAttr = safePoster ? ` poster="${safePoster}"` : '';
                gridItem.innerHTML = `
                    <video muted playsinline preload="none" data-src="${safeUrl}"${posterAttr}></video>
                    <button class="grid-delete-btn" type="button" title="Удалить" aria-label="Удалить видео">
                        <svg viewBox="0 0 24 24">
                            <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2zM4 7h16v2H4V7z"></path>
                        </svg>
                    </button>
                    <div class="grid-overlay">
                        <div style="display: flex; align-items: center; gap: 5px; font-size: 11px;">
                            <span>❤️ ${AdvancedViewRenderer.formatNumber(video.likes || 0)}</span>
                            <span>💬 ${commentsCount}</span>
                        </div>
                    </div>
                `;

                gridItem.querySelector('.grid-delete-btn')?.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const ok = await this.deleteVideoWithConfirm(video);
                    if (ok) {
                        const idx = list.findIndex(v => String(v.id) === String(video.id));
                        if (idx !== -1) list.splice(idx, 1);
                    }
                });

                gridItem.addEventListener('click', (e) => {
                    if (e.target.closest('.grid-delete-btn')) return;
                    const startIndex = list.findIndex(v => String(v.id) === String(video.id));
                    this.enterCustomFeedMode(list, { startIndex: startIndex >= 0 ? startIndex : 0, returnViewId: 'profile-view' });
                });

                grid.appendChild(gridItem);
            });

            this.setupProfileGridPreviews(grid);
        };

        // If Firebase is available, load videos from Firestore so they persist after reload.
        if (typeof firebaseService !== 'undefined'
            && firebaseService
            && typeof firebaseService.isInitialized === 'function'
            && firebaseService.isInitialized()
            && typeof firebaseService.getVideosByUid === 'function'
            && userProfile.uid) {
            grid.innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--secondary-text);">
                    <p>Загрузка видео...</p>
                </div>
            `;
            firebaseService.getVideosByUid(userProfile.uid, { includePrivate: true })
                .then((videos) => {
                    const list = Array.isArray(videos) ? videos : [];

                    // Sync local cache used by comments/share UI.
                    if (this.dataService && Array.isArray(this.dataService.userVideos)) {
                        this.dataService.userVideos = this.dataService.userVideos.filter(v => String(v.uid || '') !== String(userProfile.uid));
                        this.dataService.userVideos.push(...list);
                        if (typeof this.dataService.syncFeedCacheWithLocal === 'function') {
                            this.dataService.syncFeedCacheWithLocal();
                        }
                    }

                    const likesTotal = list.reduce((sum, v) => sum + (parseInt(v.likes, 10) || 0), 0);
                    document.getElementById('likes-stat').querySelector('.stat-num').textContent = AdvancedViewRenderer.formatNumber(likesTotal);
                    renderGrid(list);
                })
                .catch((err) => {
                    console.error('Ошибка загрузки видео профиля:', err);
                    renderGrid(userProfile.videos);
                });
            return;
        }

        // Fallback: render from local cache
        renderGrid(userProfile.videos);
    }

    setupNotificationsEvents() {
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
    }

    async loadNotifications(filter = 'all') {
        if (!this.notificationsList || !this.notificationsEmpty) return;

        let notifications = [];
        try {
            if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.getUserNotifications === 'function') {
                notifications = await firebaseService.getUserNotifications(filter);
            } else {
                notifications = this.dataService.getNotifications(filter);
            }
        } catch (error) {
            console.error('Ошибка загрузки уведомлений:', error);
            notifications = [];
        }
        
        if (notifications.length === 0) {
            this.notificationsList.innerHTML = '';
            this.notificationsEmpty.style.display = 'flex';
            this.updateNotificationBadge();
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
                text = `поставил лайк вашему видео`;
            } else if (notif.type === 'comment') {
                icon = 'comment';
                userName = notifData.fromUser || 'user';
                text = `${notifData.text || 'Новый комментарий'}`;
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
                <img src="${thumb}" class="notification-badge-item ${icon === 'comment' ? 'comment' : ''}" alt="видео">
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
    }

    async updateNotificationBadge() {
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
    }

    formatTime(timestamp) {
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
    }

    normalizeTimestampValue(value) {
        if (typeof value === 'number') return value;
        if (value && typeof value.toMillis === 'function') return value.toMillis();
        if (value instanceof Date) return value.getTime();
        return 0;
    }

    formatClockTime(timestamp) {
        const normalizedTs = this.normalizeTimestampValue(timestamp);
        if (!normalizedTs) return '';
        return new Date(normalizedTs).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
    }

    formatLastSeen(online, timestamp) {
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
    }

    setupMessagesEvents() {
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
    }

    async loadChats() {
        if (!this.chatList || !this.messagesEmpty) return;

        let chats = [];
        try {
            if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.getChats === 'function') {
                chats = await firebaseService.getChats();
            } else {
                chats = this.dataService.getChats();
            }
        } catch (error) {
            console.error('Ошибка загрузки чатов:', error);
            chats = [];
        }

        if (chats.length === 0) {
            this.chatList.innerHTML = '';
            this.messagesEmpty.style.display = 'flex';
            this.updateMessagesBadge(0);
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
    }

    async openChat(username, chatId = null, targetUid = null) {
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
    }

    async refreshCurrentChatMessages() {
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
    }

    renderChatMessages(messages = []) {
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
    }

    renderChatMessageBody(message = {}) {
        const msg = message || {};
        if (msg.type === 'file') return this.renderFileMessageBody(msg);
        if (msg.type === 'sticker') return this.renderStickerMessageBody(msg);
        if (msg.type === 'video-circle') return this.renderVideoCircleMessageBody(msg);
        if (msg.type === 'call-event') return this.renderCallEventMessageBody(msg);

        const safeText = this.escapeHtml(msg.content || '').replace(/\n/g, '<br>');
        return `<div class="message-content">${safeText}</div>`;
    }

    getStickerById(stickerId = '') {
        const fallback = this.stickerPack[0];
        const key = String(stickerId || '').trim();
        if (!key || !this.stickerPackById || !this.stickerPackById.has(key)) return fallback;
        return this.stickerPackById.get(key);
    }

    renderStickerMessageBody(message = {}) {
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
    }

    renderVideoCircleMessageBody(message = {}) {
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
    }

    renderCallEventMessageBody(message = {}) {
        const call = message.call || {};
        const modeLabel = call.mode === 'video' ? 'Видеозвонок' : 'Звонок';
        const eventLabel = call.event === 'missed'
            ? 'Пропущен'
            : (call.event === 'declined'
                ? 'Отклонен'
                : (call.event === 'ended' ? 'Завершен' : 'Начат'));
        const text = this.escapeHtml(`${modeLabel}: ${eventLabel}`);
        return `<div class="message-content message-call-event">${text}</div>`;
    }

    renderFileMessageBody(message) {
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
    }

    formatFileSize(size) {
        const bytes = Number(size) || 0;
        if (bytes < 1024) return `${bytes} Б`;
        const kb = bytes / 1024;
        if (kb < 1024) return `${kb.toFixed(1)} КБ`;
        const mb = kb / 1024;
        return `${mb.toFixed(1)} МБ`;
    }

    filterChatsBySearch(query = '') {
        if (!this.chatList) return;
        const q = String(query).trim().toLowerCase();
        this.chatList.querySelectorAll('.chat-item').forEach(item => {
            const hay = item.dataset.search || '';
            item.style.display = !q || hay.includes(q) ? '' : 'none';
        });
    }

    renderEmojiPicker() {
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
    }

    renderStickerPicker() {
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
    }

    toggleEmojiPicker() {
        if (!this.emojiPicker) return;
        this.hideStickerPicker();
        const open = this.emojiPicker.style.display !== 'none';
        this.emojiPicker.style.display = open ? 'none' : 'flex';
    }

    hideEmojiPicker() {
        if (this.emojiPicker) this.emojiPicker.style.display = 'none';
    }

    toggleStickerPicker() {
        if (!this.stickerPicker) return;
        this.hideEmojiPicker();
        const open = this.stickerPicker.style.display !== 'none';
        this.stickerPicker.style.display = open ? 'none' : 'grid';
    }

    hideStickerPicker() {
        if (this.stickerPicker) this.stickerPicker.style.display = 'none';
    }

    setupKeyboardViewportSync() {
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
    }

    onMessageInputChanged() {
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
    }

    async updateTypingStatus(isTyping) {
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
    }

    handleTypingState(typingData) {
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
    }

    subscribeToActiveChat() {
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
    }

    teardownChatRealtime() {
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
    }

    async openCurrentChatProfile() {
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
    }

    async sendMessage() {
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
    }

    async sendFileMessage(file) {
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
    }

    async sendStickerMessage(stickerPreset) {
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
    }

    async sendVideoCircleMessage(file) {
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
    }

    showIncomingCallModal(call) {
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
    }

    showActiveCallModal(call, statusText = 'Подключение...') {
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
    }

    hideCallModal() {
        if (!this.callModal) return;
        this.callModal.style.display = 'none';
    }

    updateCallStatusText(text = '') {
        if (this.callStatus) this.callStatus.textContent = text || '';
    }

    getCallStatusText(call) {
        const status = String(call?.status || '');
        if (status === 'ringing') return 'Звоним...';
        if (status === 'accepted') return 'Подключение...';
        if (status === 'active') return 'В звонке';
        if (status === 'declined') return 'Вызов отклонен';
        if (status === 'missed') return 'Пропущенный вызов';
        if (status === 'ended') return 'Вызов завершен';
        return 'Подключение...';
    }

    resetCallSession() {
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
    }

    async ensureCallLocalMedia() {
        if (this.callLocalStream) return this.callLocalStream;
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
            throw new Error('Ваше устройство не поддерживает видеозвонки');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        this.callLocalStream = stream;
        if (this.callLocalVideo) this.callLocalVideo.srcObject = stream;
        return stream;
    }

    ensureCallPeerConnection(callId) {
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
    }

    async flushPendingCallCandidates() {
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
    }

    subscribeToCurrentCall(callId) {
        if (this.callDocUnsubscribe) {
            try { this.callDocUnsubscribe(); } catch (_) {}
            this.callDocUnsubscribe = null;
        }
        if (!(firebaseService && firebaseService.isInitialized() && typeof firebaseService.subscribeToCall === 'function')) return;

        this.callDocUnsubscribe = firebaseService.subscribeToCall(callId, async (call) => {
            await this.handleCallSnapshot(call);
        });
    }

    subscribeToCurrentCallCandidates(callId) {
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
    }

    async createAndSendOffer(callId) {
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
    }

    async createAndSendAnswer(call) {
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
    }

    async handleCallSnapshot(call) {
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
    }

    async startVideoCall() {
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
    }

    async acceptIncomingVideoCall() {
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
    }

    async sendCallEventMessage(event = 'ended', callId = null) {
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
    }

    async endCurrentCall(status = 'ended', { skipRemoteUpdate = false, silent = false, sendEvent = true } = {}) {
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
    }

    // ==================== Deep links: external profiles ====================
    setupDeepLinks() {
        window.addEventListener('hashchange', () => this.handleHashRoute());
        this.handleHashRoute();
    }

    handleHashRoute() {
        const hash = window.location.hash.replace('#', '').trim();
        if (!hash) return;

        if (hash.startsWith('profile-')) {
            const uid = hash.slice('profile-'.length);
            const currentUid = firebaseService && firebaseService.getCurrentUid ? firebaseService.getCurrentUid() : null;
            if (uid && currentUid && uid === currentUid) {
                this.state.viewingProfileUid = null;
                const cleanUrl = `${window.location.pathname}${window.location.search}`;
                window.history.replaceState(null, '', cleanUrl);
                this.navigateTo('profile-view');
                this.updateProfileUI();
                return;
            }
            if (uid) this.openUserProfileByUid(uid, { pushHash: false });
        }
    }

    async openUserProfileByUid(uid, { pushHash = true } = {}) {
        if (!uid) return;

        const currentUid = firebaseService && firebaseService.getCurrentUid ? firebaseService.getCurrentUid() : null;
        if (currentUid && uid === currentUid) {
            this.state.viewingProfileUid = null;
            if (window.location.hash && window.location.hash.startsWith('#profile-')) {
                const cleanUrl = `${window.location.pathname}${window.location.search}`;
                window.history.replaceState(null, '', cleanUrl);
            }
            this.navigateTo('profile-view');
            this.updateProfileUI();
            this.configureProfileActionButtons({ isOwn: true });
            return;
        }

        // mark that profile-view is in "external profile" mode
        this.state.viewingProfileUid = uid;

        if (pushHash) window.location.hash = `profile-${uid}`;
        this.navigateTo('profile-view');

        // quick skeleton
        document.getElementById('profile-name').textContent = '@loading...';
        document.getElementById('profile-bio').textContent = '';
        document.getElementById('profile-grid').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--secondary-text);">
                <p>Загрузка профиля...</p>
            </div>
        `;

        await this.loadAndRenderExternalProfile(uid);
    }

    async loadAndRenderExternalProfile(uid) {
        try {
            if (!(firebaseService && firebaseService.isInitialized())) {
                AdvancedViewRenderer.showToast('Профили доступны после подключения базы', 'warning');
                return;
            }

            const profile = await firebaseService.getUserProfile(uid);
            if (!profile || !profile.name) {
                AdvancedViewRenderer.showToast('Профиль не найден', 'warning');
                return;
            }

            const current = firebaseService.getCurrentUser && firebaseService.getCurrentUser();
            const currentUid = current && current.uid;
            const isOwn = !!(currentUid && currentUid === uid);

            // Videos: привязываем по uid (имя может меняться)
            let videos = [];
            if (firebaseService.getVideosByUid) {
                videos = await firebaseService.getVideosByUid(uid, { includePrivate: isOwn });
            } else if (firebaseService.getVideosByAuthor) {
                videos = await firebaseService.getVideosByAuthor(profile.name);
                if (!isOwn) {
                    videos = (videos || []).filter(v => v.private !== true);
                }
            } else {
                // fallback: локальный поиск
                videos = this.dataService.userVideos.filter(v => (v.uid && uid) ? String(v.uid) === String(uid) : v.author === profile.name);
                if (!isOwn) {
                    videos = (videos || []).filter(v => v.private !== true);
                }
            }

            const likesTotal = (videos || []).reduce((sum, v) => sum + (parseInt(v.likes, 10) || 0), 0);
            const followingCount = Array.isArray(profile.subscriptions) ? profile.subscriptions.length : 0;
            const followersCount = Array.isArray(profile.subscribers) ? profile.subscribers.length : 0;

            // Render header
            document.getElementById('profile-name').innerHTML = this.renderUserLabel(profile.name, !!profile.verified);
            document.getElementById('profile-avatar-img').src = profile.avatar || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.name) + '&background=random&size=150');
            document.getElementById('profile-bio').textContent = profile.bio || '';

            // additional info
            const setInfo = (id, value, cb) => {
                const el = document.getElementById(id);
                if (!el) return;
                if (value) {
                    el.style.display = 'block';
                    cb(value);
                } else {
                    el.style.display = 'none';
                }
            };

            setInfo('profile-location', profile.location, (v) => (document.getElementById('location-text').textContent = v));
            setInfo('profile-interests', profile.interests, (v) => (document.getElementById('interests-text').textContent = v));

            setInfo('profile-website', profile.website, (v) => {
                const a = document.getElementById('website-link');
                a.textContent = v;
                a.href = v.startsWith('http') ? v : 'https://' + v;
            });

            setInfo('profile-gender', (profile.gender && profile.gender !== 'other') ? profile.gender : '', (v) => {
                const genderLabels = { male: 'Мужчина', female: 'Женщина', other: 'Не указано' };
                document.getElementById('gender-text').textContent = genderLabels[v] || v;
            });

            document.getElementById('following-stat').querySelector('.stat-num').textContent = followingCount;
            document.getElementById('followers-stat').querySelector('.stat-num').textContent = followersCount;
            document.getElementById('likes-stat').querySelector('.stat-num').textContent = likesTotal;

            this.configureProfileActionButtons({ isOwn, targetUid: uid, targetName: profile.name, targetVerified: !!profile.verified });

            // Render grid
            const grid = document.getElementById('profile-grid');
            if (!videos || videos.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--secondary-text);">
                        <p>У пользователя пока нет видео</p>
                    </div>
                `;
                return;
            }

            grid.innerHTML = '';
            const list = Array.isArray(videos) ? videos : [];

            list.forEach(v => {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item';
                gridItem.dataset.id = v.id;
                if (v.firestoreId) gridItem.dataset.firestoreId = v.firestoreId;

                const safeUrl = this.escapeHtml(v.url || '');
                const safePoster = v.thumbnail ? this.escapeHtml(v.thumbnail) : '';
                const posterAttr = safePoster ? ` poster="${safePoster}"` : '';

                gridItem.innerHTML = `
                    <video muted playsinline preload="none" data-src="${safeUrl}"${posterAttr}></video>
                    <div class="grid-overlay">
                        <span>▶ ${v.views || 0}</span>
                    </div>
                `;

                gridItem.addEventListener('click', () => {
                    const startIndex = list.findIndex(x => String(x.id) === String(v.id));
                    this.enterCustomFeedMode(list, { startIndex: startIndex >= 0 ? startIndex : 0, returnViewId: 'profile-view' });
                });

                grid.appendChild(gridItem);
            });

            this.setupProfileGridPreviews(grid);
        } catch (err) {
            console.error(err);
            AdvancedViewRenderer.showToast('Ошибка загрузки профиля', 'error');
        }
    }

    configureProfileActionButtons({ isOwn, targetUid = null, targetName = null, targetVerified = false } = {}) {
        const editBtn = document.getElementById('edit-profile-btn');
        const shareBtn = document.getElementById('share-profile-btn');
        const row = editBtn ? editBtn.parentElement : null;
        if (!row) return;

        let followBtn = document.getElementById('follow-profile-btn');
        let messageBtn = document.getElementById('message-profile-btn');
        let verifyBtn = document.getElementById('verify-profile-btn');

        // own profile
        if (isOwn) {
            if (followBtn) followBtn.style.display = 'none';
            if (messageBtn) messageBtn.style.display = 'none';
            if (verifyBtn) verifyBtn.style.display = 'none';
            if (editBtn) {
                editBtn.style.display = '';
                editBtn.textContent = 'Редактировать';
            }
            return;
        }

        // external profile
        if (editBtn) editBtn.style.display = 'none';

        if (!followBtn) {
            followBtn = document.createElement('button');
            followBtn.className = 'primary-btn';
            followBtn.id = 'follow-profile-btn';
            followBtn.style.padding = '10px 20px';
            followBtn.style.fontSize = '13px';
            followBtn.style.width = 'auto';
            row.insertBefore(followBtn, shareBtn || null);
        } else {
            followBtn.style.display = '';
        }

        if (!messageBtn) {
            messageBtn = document.createElement('button');
            messageBtn.className = 'primary-btn';
            messageBtn.id = 'message-profile-btn';
            messageBtn.style.padding = '10px 20px';
            messageBtn.style.fontSize = '13px';
            messageBtn.style.width = 'auto';
            messageBtn.style.background = '#333';
            row.insertBefore(messageBtn, shareBtn || null);
        } else {
            messageBtn.style.display = '';
        }

        messageBtn.textContent = 'Написать';
        messageBtn.onclick = async () => {
            await this.startProfileChat({ targetUid, targetName });
        };

        const current = firebaseService && firebaseService.getCurrentUser && firebaseService.getCurrentUser();
        const canManageVerification = !!(this.isCurrentUserAdmin() && targetUid);
        if (canManageVerification) {
            if (!verifyBtn) {
                verifyBtn = document.createElement('button');
                verifyBtn.className = 'primary-btn';
                verifyBtn.id = 'verify-profile-btn';
                verifyBtn.style.padding = '10px 20px';
                verifyBtn.style.fontSize = '13px';
                verifyBtn.style.width = 'auto';
                verifyBtn.style.background = '#1f6feb';
                row.insertBefore(verifyBtn, shareBtn || null);
            } else {
                verifyBtn.style.display = '';
            }

            verifyBtn.textContent = targetVerified ? 'Снять галочку' : 'Выдать галочку';
            verifyBtn.onclick = async () => {
                if (!(firebaseService && firebaseService.isInitialized() && typeof firebaseService.setUserVerified === 'function')) {
                    AdvancedViewRenderer.showToast('Функция верификации недоступна', 'warning');
                    return;
                }

                try {
                    verifyBtn.disabled = true;
                    await firebaseService.setUserVerified(targetUid, !targetVerified);
                    AdvancedViewRenderer.showToast(!targetVerified ? 'Галочка выдана' : 'Галочка снята', 'success');
                    await this.loadAndRenderExternalProfile(targetUid);
                } catch (err) {
                    console.error(err);
                    AdvancedViewRenderer.showToast(err.message || 'Не удалось изменить верификацию', 'error');
                } finally {
                    verifyBtn.disabled = false;
                }
            };
        } else if (verifyBtn) {
            verifyBtn.style.display = 'none';
        }

        const subscriptions = (current && Array.isArray(current.subscriptions)) ? current.subscriptions : [];
        const isSubscribed = targetUid ? subscriptions.includes(targetUid) : (targetName ? this.dataService.isSubscribed(targetName) : false);

        followBtn.textContent = isSubscribed ? 'Отписаться' : 'Подписаться';

        followBtn.onclick = async () => {
            const user = this.dataService.getCurrentUser();
            if (!user) {
                this.navigateTo('auth-view');
                return;
            }

            if (!(firebaseService && firebaseService.isInitialized())) {
                AdvancedViewRenderer.showToast('Подписки доступны после подключения базы', 'warning');
                return;
            }

            try {
                followBtn.disabled = true;

                if (targetUid) {
                    if (isSubscribed) {
                        await firebaseService.unsubscribe(targetUid);
                        // optimistic local update
                        if (current && Array.isArray(current.subscriptions)) {
                            current.subscriptions = current.subscriptions.filter(x => x !== targetUid);
                        }
                        AdvancedViewRenderer.showToast('Вы отписались', 'success');
                    } else {
                        await firebaseService.subscribe(targetUid);
                        if (current) {
                            current.subscriptions = Array.isArray(current.subscriptions) ? current.subscriptions : [];
                            if (!current.subscriptions.includes(targetUid)) current.subscriptions.push(targetUid);
                        }
                        AdvancedViewRenderer.showToast('Вы подписались', 'success');
                    }
                } else if (targetName) {
                    // fallback: local-only subscriptions by name
                    if (isSubscribed) {
                        this.dataService.unsubscribe(targetName);
                        AdvancedViewRenderer.showToast('Вы отписались', 'success');
                    } else {
                        this.dataService.subscribe(targetName);
                        AdvancedViewRenderer.showToast('Вы подписались', 'success');
                    }
                }

                // refresh label + stats
                if (targetUid) await this.loadAndRenderExternalProfile(targetUid);
            } catch (err) {
                console.error(err);
                AdvancedViewRenderer.showToast('Не удалось изменить подписку', 'error');
            } finally {
                followBtn.disabled = false;
            }
        };
    }

    async startProfileChat({ targetUid = null, targetName = null } = {}) {
        const currentUser = this.dataService.getCurrentUser();
        if (!currentUser) {
            this.navigateTo('auth-view');
            return;
        }

        if (!targetName) {
            AdvancedViewRenderer.showToast('Не удалось определить получателя', 'error');
            return;
        }

        if (targetUid && currentUser.uid && targetUid === currentUser.uid) {
            AdvancedViewRenderer.showToast('Нельзя написать самому себе', 'warning');
            return;
        }

        const chatId = (targetUid && currentUser.uid)
            ? [currentUser.uid, targetUid].sort().join('_')
            : null;

        this.navigateTo('messages-view');
        await this.openChat(targetName, chatId, targetUid);
    }

}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AdvancedApp();
});
