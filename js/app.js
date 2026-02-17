/**
 * AdvancedApp
 * Основное приложение - управление состоянием и событиями
 */
class AdvancedApp {
    constructor() {
        this.dataService = new AdvancedDataService();
        this.appConfig = (typeof window !== 'undefined' && window.ReelgramAppConfig)
            ? window.ReelgramAppConfig
            : {};
        const storageKeys = this.appConfig.storageKeys || {};
        const uiConfig = this.appConfig.ui || {};

        this.state = {
            currentVideoId: null,
            activeCommentsVideoId: null,
            currentPage: 0,
            loading: false,
            hasMore: true,
            activeFeedIndex: 0,
            feedSource: 'for-you', // 'for-you' | 'following' | 'live'
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
            activeCallId: null,
            activeLiveSessionId: null
        };
        this.uploadDraftKey = storageKeys.uploadDraft || 'reelgram_upload_draft_v1';
        this.feedPrefsKey = storageKeys.feedPrefs || 'reelgram_feed_prefs_v1';
        this.moderationPrefsKey = storageKeys.moderationPrefs || 'reelgram_moderation_prefs_v1';
        this.watchProfileKey = storageKeys.watchProfile || 'reelgram_watch_profile_v1';
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
        this.emojiList = Array.isArray(uiConfig.emojiList) && uiConfig.emojiList.length
            ? [...uiConfig.emojiList]
            : ['😀', '😂', '😍', '😎', '🥳', '🔥', '❤️', '👍', '👏', '🤝', '🤔', '😢', '🙌', '✨', '😅', '🎉'];
        this.stickerPack = Array.isArray(uiConfig.stickerPack) && uiConfig.stickerPack.length
            ? uiConfig.stickerPack.map(sticker => ({ ...sticker }))
            : [
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
        this.perf = (typeof window !== 'undefined' && window.reelgramPerf) ? window.reelgramPerf : null;
        this.adminUsers = [];
        this.adminFilteredUsers = [];
        this.storySeenStorageKey = storageKeys.storySeen || 'reelgram_story_seen_v1';
        this.storySeenMap = this.restoreStorySeenMap();
        this.storiesByAuthor = [];
        this.activeStoryQueue = [];
        this.activeStoryIndex = -1;
        this.storyAutoplayTimer = null;
        this.storyAutoplayStartedAt = 0;
        this.storyAutoplayDuration = 5000;
        this.storyAutoplayRaf = null;
        this.activeStoryVideoEl = null;
        this.giftAmounts = Array.isArray(uiConfig.giftAmounts) && uiConfig.giftAmounts.length
            ? uiConfig.giftAmounts.map(value => Math.max(1, parseInt(value, 10) || 0)).filter(Boolean)
            : [10, 25, 50, 100, 250, 500];
        this.selectedGiftAmount = 50;
        this.pendingGiftContext = null;
        this.seasonThemePrefsKey = storageKeys.seasonTheme || 'reelgram_season_theme_v1';
        this.seasonThemeEnabled = true;
        this.activeSeasonMeta = null;
        this.liveSessions = [];
        this.liveSessionsUnsubscribe = null;
        this.firebaseRecoveryTimer = null;

        this.init();
    }

    async init() {
        console.log('🚀 Initializing app...');
        this.ensureEnhancedUiScaffold();
        this.cacheElements();
        this.setupAppViewportHeight();
        this.restoreSeasonThemePrefs();
        this.applySeasonTheme();
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
        let firebaseReadyNow = false;
        if (typeof waitForFirebaseService === 'function') {
            firebaseReadyNow = await waitForFirebaseService(12000);
        }

        let authReadyNow = true;
        if (firebaseReadyNow
            && firebaseService
            && typeof firebaseService.isInitialized === 'function'
            && firebaseService.isInitialized()
            && typeof firebaseService.waitForAuthReady === 'function') {
            authReadyNow = await firebaseService.waitForAuthReady(8000);
        }

        if (!firebaseReadyNow || !authReadyNow) {
            this.scheduleFirebaseRecovery();
        }

        this.restoreModerationPreferences();
        await this.loadFeed(true);
        await this.loadStories({ silent: true });
        this.ensureLiveSessionsWatcher();
        await this.refreshLiveSessions({ silent: true });
        this.updateProfileUI();
        this.setupIncomingMessagesWatcher();
        this.setupIncomingCallsWatcher();
        this.updateHamburgerVisibility();
        this.updateAdminMenuVisibility();
        this.refreshSeasonBanner();
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

    async handleFirebaseReady({ forceReloadFeed = true } = {}) {
        const ready = !!(firebaseService
            && typeof firebaseService.isInitialized === 'function'
            && firebaseService.isInitialized());
        if (!ready) return false;

        if (typeof firebaseService.waitForAuthReady === 'function') {
            await firebaseService.waitForAuthReady(8000);
        }

        this.updateProfileUI();
        this.updateHamburgerVisibility();
        this.updateAdminMenuVisibility();
        this.setupIncomingMessagesWatcher();
        this.setupIncomingCallsWatcher();

        if (forceReloadFeed && this.state.feedMode === 'global') {
            await this.loadFeed(true);
        }
        if (typeof this.loadStories === 'function') {
            await this.loadStories({ silent: true });
        }
        return true;
    }

    scheduleFirebaseRecovery(maxAttempts = 45, delayMs = 1000) {
        if (this.firebaseRecoveryTimer) return;

        let attempts = 0;
        const safeDelay = Math.max(250, parseInt(delayMs, 10) || 1000);
        const safeMaxAttempts = Math.max(3, parseInt(maxAttempts, 10) || 45);

        const retry = async () => {
            this.firebaseRecoveryTimer = null;
            attempts += 1;

            const ready = !!(firebaseService
                && typeof firebaseService.isInitialized === 'function'
                && firebaseService.isInitialized());

            if (ready) {
                try {
                    await this.handleFirebaseReady({ forceReloadFeed: true });
                } catch (error) {
                    console.warn('⚠️ Не удалось восстановить состояние после подключения Firebase:', error?.message || error);
                }
                return;
            }

            if (attempts >= safeMaxAttempts) {
                console.warn('⚠️ Firebase не инициализирован, recovery остановлен');
                return;
            }

            this.firebaseRecoveryTimer = setTimeout(retry, safeDelay);
        };

        this.firebaseRecoveryTimer = setTimeout(retry, safeDelay);
    }

    beginPerf(label, meta = null) {
        if (!this.perf || typeof this.perf.start !== 'function') return null;
        try {
            return this.perf.start(label, meta);
        } catch (_) {
            return null;
        }
    }

    endPerf(token, meta = null) {
        if (!token || !this.perf || typeof this.perf.end !== 'function') return null;
        try {
            return this.perf.end(token, meta);
        } catch (_) {
            return null;
        }
    }

    getPerfReport(limit = 15) {
        if (!this.perf || typeof this.perf.getReport !== 'function') return [];
        try {
            return this.perf.getReport(limit);
        } catch (_) {
            return [];
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
        this.ageRestrictedInput = document.getElementById('age-restricted');
        this.videoTemplateInput = document.getElementById('video-template');
        this.coverTextInput = document.getElementById('cover-text');
        this.coverStickerInput = document.getElementById('cover-sticker');
        this.coverColorInput = document.getElementById('cover-color');
        this.saveDraftBtn = document.getElementById('save-draft-btn');
        this.clearDraftBtn = document.getElementById('clear-draft-btn');
        this.uploadDraftNote = document.getElementById('upload-draft-note');

        this.profileCoinsBadge = document.getElementById('profile-coins-badge');
        this.profilePrivateToggle = document.getElementById('profile-private-account-toggle');
        this.profileAdultToggle = document.getElementById('profile-adult-feed-toggle');
        this.profileFollowRequestsBtn = document.getElementById('profile-follow-requests-btn');
        this.openLiveBtn = document.getElementById('open-live-btn');

        this.liveSessionsStrip = document.getElementById('live-sessions-strip');
        this.liveSessionsList = document.getElementById('live-sessions-list');
        this.liveOpenBtn = document.getElementById('live-open-btn');
        this.liveSheet = document.getElementById('live-sheet');
        this.liveSheetClose = document.getElementById('close-live-sheet');
        this.liveSheetList = document.getElementById('live-sheet-list');
        this.liveTitleInput = document.getElementById('live-title-input');
        this.liveStartBtn = document.getElementById('live-start-btn');
        this.liveRefreshBtn = document.getElementById('live-refresh-btn');

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

        this.storiesStrip = document.getElementById('stories-strip');
        this.storyViewerModal = document.getElementById('story-viewer-modal');
        this.storyViewerStage = document.getElementById('story-viewer-stage');
        this.storyViewerAuthor = document.getElementById('story-viewer-author');
        this.storyViewerTime = document.getElementById('story-viewer-time');
        this.storyViewerAvatar = document.getElementById('story-viewer-avatar');
        this.storyViewerProgressFill = document.getElementById('story-viewer-progress-fill');
        this.storyViewerCloseBtn = document.getElementById('story-viewer-close');
        this.storyViewerPrevBtn = document.getElementById('story-viewer-prev');
        this.storyViewerNextBtn = document.getElementById('story-viewer-next');
        this.addStoryBtn = document.getElementById('add-story-btn');
        this.storyFileInput = document.getElementById('story-file-input');

        this.giftSheet = document.getElementById('gift-sheet');
        this.giftTargetLabel = document.getElementById('gift-target-label');
        this.giftAmountGrid = document.getElementById('gift-amount-grid');
        this.giftMessageInput = document.getElementById('gift-message-input');
        this.giftSendBtn = document.getElementById('gift-send-btn');
        this.giftCloseBtn = document.getElementById('gift-close-btn');

        this.securityMenu = document.getElementById('security-menu');
        this.securityView = document.getElementById('security-view');
        this.securityBackBtn = document.getElementById('security-back-btn');
        this.securityRefreshBtn = document.getElementById('security-refresh-btn');
        this.securityLogoutOthersBtn = document.getElementById('security-logout-others-btn');
        this.securityCurrentDevice = document.getElementById('security-current-device');
        this.securitySessionList = document.getElementById('security-session-list');
        this.securitySessionCount = document.getElementById('security-session-count');
        this.seasonThemeMenu = document.getElementById('season-theme-menu');
        this.seasonThemeText = document.getElementById('season-theme-text');
        this.seasonalBanner = document.getElementById('seasonal-banner');
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

    ensureEnhancedUiScaffold() {
        const appRoot = document.getElementById('app');
        if (!appRoot) return;

        const feedView = document.getElementById('feed-view');
        if (feedView) {
            if (!document.getElementById('stories-strip')) {
                const strip = document.createElement('div');
                strip.id = 'stories-strip';
                strip.className = 'stories-strip';
                strip.innerHTML = '<div class="stories-loading">Загрузка историй...</div>';
                const tabs = document.getElementById('feed-filter-tabs');
                if (tabs && tabs.parentNode === feedView) {
                    feedView.insertBefore(strip, tabs);
                } else {
                    feedView.insertBefore(strip, feedView.firstChild);
                }
            }

            if (!document.getElementById('seasonal-banner')) {
                const banner = document.createElement('div');
                banner.id = 'seasonal-banner';
                banner.className = 'seasonal-banner hidden';
                banner.setAttribute('role', 'status');
                const stories = document.getElementById('stories-strip');
                if (stories && stories.parentNode === feedView && stories.nextSibling) {
                    feedView.insertBefore(banner, stories.nextSibling);
                } else if (stories && stories.parentNode === feedView) {
                    feedView.appendChild(banner);
                } else {
                    feedView.insertBefore(banner, feedView.firstChild);
                }
            }

            // Legacy live strip removed: live sessions are available via top tab "Эфиры".
            const legacyLiveStrip = document.getElementById('live-sessions-strip');
            if (legacyLiveStrip && legacyLiveStrip.parentNode) {
                legacyLiveStrip.parentNode.removeChild(legacyLiveStrip);
            }
        }

        const profileHeader = document.querySelector('#profile-view .profile-header');
        if (profileHeader) {
            let actionsRow = profileHeader.querySelector('.profile-header-actions');
            if (!actionsRow) {
                actionsRow = Array.from(profileHeader.children).find((el) => {
                    if (!el || !el.style) return false;
                    return String(el.style.display || '').includes('flex')
                        && String(el.style.justifyContent || '').includes('center');
                });
                if (actionsRow) actionsRow.classList.add('profile-header-actions');
            }

            if (actionsRow && !document.getElementById('add-story-btn')) {
                const addStoryBtn = document.createElement('button');
                addStoryBtn.className = 'primary-btn';
                addStoryBtn.id = 'add-story-btn';
                addStoryBtn.type = 'button';
                addStoryBtn.textContent = 'История';
                addStoryBtn.style.padding = '10px 20px';
                addStoryBtn.style.fontSize = '13px';
                addStoryBtn.style.width = 'auto';
                addStoryBtn.style.background = 'linear-gradient(135deg, var(--accent-secondary), var(--accent-primary))';
                actionsRow.insertBefore(addStoryBtn, actionsRow.firstChild || null);
            }

            if (actionsRow && !document.getElementById('open-live-btn')) {
                const openLiveBtn = document.createElement('button');
                openLiveBtn.className = 'primary-btn';
                openLiveBtn.id = 'open-live-btn';
                openLiveBtn.type = 'button';
                openLiveBtn.textContent = 'Эфир';
                openLiveBtn.style.padding = '10px 20px';
                openLiveBtn.style.fontSize = '13px';
                openLiveBtn.style.width = 'auto';
                openLiveBtn.style.background = 'linear-gradient(135deg, #ff3d5a, #ff8a1f)';
                actionsRow.insertBefore(openLiveBtn, actionsRow.firstChild || null);
            }

            if (!document.getElementById('story-file-input')) {
                const fileInput = document.createElement('input');
                fileInput.id = 'story-file-input';
                fileInput.type = 'file';
                fileInput.accept = 'image/*,video/*';
                fileInput.style.display = 'none';
                profileHeader.appendChild(fileInput);
            }

            if (!document.getElementById('profile-coins-badge')) {
                const coinsBadge = document.createElement('div');
                coinsBadge.id = 'profile-coins-badge';
                coinsBadge.className = 'profile-coins-badge';
                coinsBadge.textContent = 'Монеты: 0';
                profileHeader.appendChild(coinsBadge);
            }

            if (!document.getElementById('profile-feature-toggles')) {
                const toggles = document.createElement('div');
                toggles.id = 'profile-feature-toggles';
                toggles.className = 'profile-feature-toggles';
                toggles.innerHTML = `
                    <label class="profile-toggle-item" for="profile-private-account-toggle">
                        <input type="checkbox" id="profile-private-account-toggle">
                        <span>Приватный аккаунт</span>
                    </label>
                    <label class="profile-toggle-item" for="profile-adult-feed-toggle">
                        <input type="checkbox" id="profile-adult-feed-toggle">
                        <span>Показывать 18+</span>
                    </label>
                    <button type="button" class="secondary-btn profile-requests-btn" id="profile-follow-requests-btn">Заявки: 0</button>
                `;
                profileHeader.appendChild(toggles);
            }
        }

        const menuDropdown = document.getElementById('menu-dropdown');
        if (menuDropdown) {
            if (!document.getElementById('season-theme-menu')) {
                const seasonalItem = document.createElement('div');
                seasonalItem.className = 'menu-item';
                seasonalItem.id = 'season-theme-menu';
                seasonalItem.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3a9 9 0 0 0 0 18 9 9 0 0 0 0-18zm0 2a7 7 0 0 1 5.66 11.12A6 6 0 0 0 7.88 6.34 6.96 6.96 0 0 1 12 5z"/>
                    </svg>
                    <span id="season-theme-text">Сезонная тема: ВКЛ</span>
                `;
                const themeItem = document.getElementById('theme-toggle-menu');
                if (themeItem && themeItem.parentNode === menuDropdown) {
                    themeItem.insertAdjacentElement('afterend', seasonalItem);
                } else {
                    menuDropdown.insertBefore(seasonalItem, menuDropdown.firstChild || null);
                }
            }

            if (!document.getElementById('security-menu')) {
                const securityItem = document.createElement('div');
                securityItem.className = 'menu-item';
                securityItem.id = 'security-menu';
                securityItem.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2l7 4v6c0 5-3.4 9.74-7 11-3.6-1.26-7-6-7-11V6l7-4zm0 6a3 3 0 0 0-3 3v1H8a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-4a1 1 0 0 0-1-1h-1v-1a3 3 0 0 0-3-3zm-1 4v-1a1 1 0 1 1 2 0v1h-2z"/>
                    </svg>
                    <span>Безопасность</span>
                `;
                const adminMenu = document.getElementById('admin-menu');
                if (adminMenu && adminMenu.parentNode === menuDropdown) {
                    adminMenu.insertAdjacentElement('beforebegin', securityItem);
                } else {
                    menuDropdown.appendChild(securityItem);
                }
            }
        }

        if (!document.getElementById('security-view')) {
            const securityView = document.createElement('div');
            securityView.id = 'security-view';
            securityView.className = 'view';
            securityView.innerHTML = `
                <div class="security-view-container">
                    <div class="security-header">
                        <button class="security-back-btn" id="security-back-btn" type="button" aria-label="Назад в профиль">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
                            </svg>
                            <span>Профиль</span>
                        </button>
                        <h3>Центр безопасности</h3>
                        <button class="security-refresh-btn" id="security-refresh-btn" type="button">Обновить</button>
                    </div>
                    <section class="security-card">
                        <h4>Текущее устройство</h4>
                        <div class="security-current-device" id="security-current-device">Загрузка...</div>
                        <button class="primary-btn" id="security-logout-others-btn" type="button">Выйти с других устройств</button>
                    </section>
                    <section class="security-card">
                        <div class="security-card-head">
                            <h4>Сеансы и устройства</h4>
                            <span id="security-session-count">0</span>
                        </div>
                        <div class="security-session-list" id="security-session-list"></div>
                    </section>
                </div>
            `;

            const adminView = document.getElementById('admin-view');
            const bottomNav = appRoot.querySelector('.bottom-nav');
            if (adminView && adminView.parentNode === appRoot) {
                appRoot.insertBefore(securityView, adminView);
            } else if (bottomNav && bottomNav.parentNode === appRoot) {
                appRoot.insertBefore(securityView, bottomNav);
            } else {
                appRoot.appendChild(securityView);
            }
        }

        if (!document.getElementById('story-viewer-modal')) {
            const storyModal = document.createElement('div');
            storyModal.id = 'story-viewer-modal';
            storyModal.className = 'story-viewer-modal';
            storyModal.innerHTML = `
                <div class="story-viewer-surface">
                    <div class="story-viewer-progress-track">
                        <div class="story-viewer-progress-fill" id="story-viewer-progress-fill"></div>
                    </div>
                    <button class="story-viewer-close" id="story-viewer-close" type="button" aria-label="Закрыть историю">×</button>
                    <div class="story-viewer-meta">
                        <img id="story-viewer-avatar" class="story-viewer-avatar" src="https://ui-avatars.com/api/?name=User&background=random&size=64" alt="@user">
                        <div class="story-viewer-meta-text">
                            <div class="story-viewer-author" id="story-viewer-author">@user</div>
                            <div class="story-viewer-time" id="story-viewer-time">только что</div>
                        </div>
                    </div>
                    <div class="story-viewer-stage" id="story-viewer-stage"></div>
                    <button class="story-nav-btn prev" id="story-viewer-prev" type="button" aria-label="Предыдущая история">‹</button>
                    <button class="story-nav-btn next" id="story-viewer-next" type="button" aria-label="Следующая история">›</button>
                </div>
            `;
            appRoot.appendChild(storyModal);
        }

        if (!document.getElementById('gift-sheet')) {
            const giftSheet = document.createElement('div');
            giftSheet.id = 'gift-sheet';
            giftSheet.className = 'gift-sheet';
            giftSheet.innerHTML = `
                <div class="gift-sheet-panel">
                    <div class="gift-sheet-header">
                        <h4>Отправить подарок</h4>
                        <button id="gift-close-btn" type="button" class="gift-close-btn" aria-label="Закрыть">×</button>
                    </div>
                    <div class="gift-target" id="gift-target-label">Автор</div>
                    <div class="gift-amount-grid" id="gift-amount-grid"></div>
                    <label class="gift-message-label" for="gift-message-input">Сообщение (необязательно)</label>
                    <input id="gift-message-input" type="text" maxlength="160" placeholder="Например: Спасибо за крутое видео!">
                    <button class="primary-btn" id="gift-send-btn" type="button">Отправить подарок</button>
                </div>
            `;
            appRoot.appendChild(giftSheet);
        }

        if (!document.getElementById('live-sheet')) {
            const liveSheet = document.createElement('div');
            liveSheet.id = 'live-sheet';
            liveSheet.className = 'bottom-sheet';
            liveSheet.innerHTML = `
                <div class="sheet-header">
                    <h4>Прямые эфиры</h4>
                    <button class="close-sheet" id="close-live-sheet">✕</button>
                </div>
                <div class="live-sheet-content">
                    <div class="live-create-row">
                        <input type="text" id="live-title-input" class="form-input" placeholder="Название эфира" maxlength="80">
                        <button type="button" class="primary-btn" id="live-start-btn">Старт</button>
                    </div>
                    <button type="button" class="secondary-btn live-refresh-btn" id="live-refresh-btn">Обновить список</button>
                    <div class="live-sheet-list" id="live-sheet-list">
                        <div class="live-sessions-empty">Сейчас нет активных эфиров</div>
                    </div>
                </div>
            `;
            appRoot.appendChild(liveSheet);
        }
    }

    restoreStorySeenMap() {
        try {
            const raw = localStorage.getItem(this.storySeenStorageKey);
            if (!raw) return {};
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return {};
            const clean = {};
            Object.keys(parsed).forEach((key) => {
                const value = parseInt(parsed[key], 10);
                if (key && value > 0) clean[key] = value;
            });
            return clean;
        } catch (_) {
            return {};
        }
    }

    persistStorySeenMap() {
        try {
            localStorage.setItem(this.storySeenStorageKey, JSON.stringify(this.storySeenMap || {}));
        } catch (_) {}
    }

    markStorySeenLocal(storyId) {
        const id = String(storyId || '').trim();
        if (!id) return;
        this.storySeenMap = this.storySeenMap || {};
        this.storySeenMap[id] = Date.now();
        this.persistStorySeenMap();
    }

    hasStorySeen(storyId) {
        const id = String(storyId || '').trim();
        if (!id) return false;
        return !!(this.storySeenMap && this.storySeenMap[id]);
    }

    restoreSeasonThemePrefs() {
        try {
            const raw = localStorage.getItem(this.seasonThemePrefsKey);
            if (!raw) return;
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed.enabled === 'boolean') {
                this.seasonThemeEnabled = parsed.enabled;
            }
        } catch (_) {}
    }

    persistSeasonThemePrefs() {
        try {
            localStorage.setItem(this.seasonThemePrefsKey, JSON.stringify({
                enabled: this.seasonThemeEnabled !== false
            }));
        } catch (_) {}
    }

    detectActiveSeason() {
        const now = new Date();
        const month = now.getMonth();

        if (month === 11 || month === 0 || month === 1) {
            return {
                id: 'winter',
                title: 'Зимний сезон',
                banner: '❄️ Зимний режим включен',
                subtitle: 'Теплые акценты и праздничное настроение'
            };
        }
        if (month >= 2 && month <= 4) {
            return {
                id: 'spring',
                title: 'Весенний сезон',
                banner: '🌿 Весенний режим включен',
                subtitle: 'Свежая палитра и легкий контраст'
            };
        }
        if (month >= 5 && month <= 7) {
            return {
                id: 'summer',
                title: 'Летний сезон',
                banner: '☀️ Летний режим включен',
                subtitle: 'Яркие оттенки и теплые акценты'
            };
        }
        return {
            id: 'autumn',
            title: 'Осенний сезон',
            banner: '🍂 Осенний режим включен',
            subtitle: 'Глубокие тона и мягкая атмосфера'
        };
    }

    applySeasonTheme() {
        const body = document.body;
        if (!body) return;

        this.activeSeasonMeta = this.detectActiveSeason();
        if (this.seasonThemeEnabled) {
            body.dataset.seasonTheme = this.activeSeasonMeta.id;
        } else {
            delete body.dataset.seasonTheme;
        }
        this.refreshSeasonBanner();
        this.updateSeasonMenuText();
    }

    updateSeasonMenuText() {
        const textNode = document.getElementById('season-theme-text');
        if (!textNode) return;
        textNode.textContent = `Сезонная тема: ${this.seasonThemeEnabled ? 'ВКЛ' : 'ВЫКЛ'}`;
    }

    refreshSeasonBanner() {
        const banner = document.getElementById('seasonal-banner');
        if (!banner) return;
        if (!this.seasonThemeEnabled || !this.activeSeasonMeta) {
            banner.classList.add('hidden');
            banner.textContent = '';
            return;
        }
        banner.classList.remove('hidden');
        banner.innerHTML = `
            <span class="seasonal-banner-title">${this.escapeHtml(this.activeSeasonMeta.banner || '')}</span>
            <span class="seasonal-banner-sub">${this.escapeHtml(this.activeSeasonMeta.subtitle || '')}</span>
        `;
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

    setupSeasonThemeEvents() {
        if (!this.seasonThemeMenu || this.seasonThemeMenu.dataset.bound === '1') {
            this.updateSeasonMenuText();
            return;
        }

        this.seasonThemeMenu.dataset.bound = '1';
        this.seasonThemeMenu.addEventListener('click', () => {
            this.seasonThemeEnabled = !this.seasonThemeEnabled;
            this.persistSeasonThemePrefs();
            this.applySeasonTheme();
            AdvancedViewRenderer.showToast(
                this.seasonThemeEnabled ? 'Сезонная тема включена' : 'Сезонная тема выключена',
                'info'
            );
        });
        this.updateSeasonMenuText();
    }

    setupSecurityEvents() {
        if (this.securityMenu && this.securityMenu.dataset.bound !== '1') {
            this.securityMenu.dataset.bound = '1';
            this.securityMenu.addEventListener('click', () => {
                const currentUser = this.dataService.getCurrentUser();
                if (!currentUser) {
                    this.navigateTo('auth-view');
                    return;
                }

                if (this.hamburgerBtn) this.hamburgerBtn.classList.remove('active');
                if (this.menuDropdown) this.menuDropdown.classList.remove('active');
                this.navigateTo('security-view');
            });
        }

        if (this.securityBackBtn && this.securityBackBtn.dataset.bound !== '1') {
            this.securityBackBtn.dataset.bound = '1';
            this.securityBackBtn.addEventListener('click', () => {
                this.navigateTo('profile-view');
            });
        }

        if (this.securityRefreshBtn && this.securityRefreshBtn.dataset.bound !== '1') {
            this.securityRefreshBtn.dataset.bound = '1';
            this.securityRefreshBtn.addEventListener('click', async () => {
                await this.loadSecuritySessions({ showToast: true });
            });
        }

        if (this.securityLogoutOthersBtn && this.securityLogoutOthersBtn.dataset.bound !== '1') {
            this.securityLogoutOthersBtn.dataset.bound = '1';
            this.securityLogoutOthersBtn.addEventListener('click', async () => {
                if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) {
                    AdvancedViewRenderer.showToast('Firebase еще не готов', 'warning');
                    return;
                }
                if (typeof firebaseService.revokeOtherSessions !== 'function') {
                    AdvancedViewRenderer.showToast('API управления сессиями недоступен', 'warning');
                    return;
                }

                const ok = confirm('Завершить все другие сеансы на устройствах?');
                if (!ok) return;

                const btn = this.securityLogoutOthersBtn;
                const prev = btn.textContent;
                btn.disabled = true;
                btn.textContent = 'Завершаем...';
                try {
                    const revoked = await firebaseService.revokeOtherSessions();
                    await this.loadSecuritySessions({ showToast: false });
                    AdvancedViewRenderer.showToast(
                        revoked > 0 ? `Завершено сеансов: ${revoked}` : 'Других активных сеансов не найдено',
                        'success'
                    );
                } catch (error) {
                    console.error(error);
                    AdvancedViewRenderer.showToast(error?.message || 'Не удалось завершить сеансы', 'error');
                } finally {
                    btn.disabled = false;
                    btn.textContent = prev;
                }
            });
        }

        if (this.securitySessionList && this.securitySessionList.dataset.bound !== '1') {
            this.securitySessionList.dataset.bound = '1';
            this.securitySessionList.addEventListener('click', async (e) => {
                const revokeBtn = e.target && e.target.closest
                    ? e.target.closest('.security-session-revoke')
                    : null;
                if (!revokeBtn) return;

                const sessionId = revokeBtn.dataset.sessionId || '';
                if (!sessionId) return;
                if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) return;
                if (typeof firebaseService.revokeSession !== 'function') return;

                revokeBtn.disabled = true;
                try {
                    await firebaseService.revokeSession(sessionId);
                    await this.loadSecuritySessions({ showToast: false });
                    AdvancedViewRenderer.showToast('Сеанс завершен', 'success');
                } catch (error) {
                    console.error(error);
                    AdvancedViewRenderer.showToast(error?.message || 'Не удалось завершить сеанс', 'error');
                } finally {
                    revokeBtn.disabled = false;
                }
            });
        }
    }

    formatRelativeTime(timestamp) {
        const normalized = this.normalizeTimestampValue(timestamp);
        if (!normalized) return 'только что';

        const diff = Date.now() - normalized;
        if (diff < 60 * 1000) return 'только что';
        if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} мин назад`;
        if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} ч назад`;
        if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))} дн назад`;
        return new Date(normalized).toLocaleDateString('ru-RU');
    }

    async loadSecuritySessions({ showToast = false } = {}) {
        if (!this.securitySessionList || !this.securityCurrentDevice) return;

        const currentUser = this.dataService.getCurrentUser();
        if (!currentUser) {
            this.securityCurrentDevice.textContent = 'Сначала войдите в аккаунт';
            this.securitySessionList.innerHTML = '<div class="security-empty">Нет активного аккаунта</div>';
            if (this.securitySessionCount) this.securitySessionCount.textContent = '0';
            return;
        }

        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) {
            this.securityCurrentDevice.textContent = 'Ожидание подключения Firebase...';
            this.securitySessionList.innerHTML = '<div class="security-empty">Список сеансов временно недоступен</div>';
            if (this.securitySessionCount) this.securitySessionCount.textContent = '0';
            return;
        }
        if (typeof firebaseService.getUserSessions !== 'function') {
            this.securitySessionList.innerHTML = '<div class="security-empty">API сеансов недоступен</div>';
            if (this.securitySessionCount) this.securitySessionCount.textContent = '0';
            return;
        }

        this.securitySessionList.innerHTML = '<div class="security-empty">Загрузка устройств...</div>';

        try {
            const sessions = await firebaseService.getUserSessions(80);
            const list = Array.isArray(sessions) ? sessions : [];
            if (this.securitySessionCount) {
                this.securitySessionCount.textContent = String(list.length);
            }

            const current = list.find(row => row.isCurrent) || list[0] || null;
            if (current) {
                const lastActiveText = this.formatRelativeTime(current.lastActive || current.updatedAt || current.createdAt);
                this.securityCurrentDevice.innerHTML = `
                    <div class="security-device-title">${this.escapeHtml(current.deviceName || 'Текущее устройство')}</div>
                    <div class="security-device-sub">${this.escapeHtml(current.platform || 'Платформа не определена')} • ${this.escapeHtml(lastActiveText)}</div>
                `;
            } else {
                this.securityCurrentDevice.textContent = 'Устройство не определено';
            }

            this.securitySessionList.innerHTML = '';
            if (!list.length) {
                this.securitySessionList.innerHTML = '<div class="security-empty">Сеансы не найдены</div>';
                if (showToast) AdvancedViewRenderer.showToast('Сеансы не найдены', 'info');
                return;
            }

            list.forEach((row) => {
                const item = document.createElement('div');
                item.className = `security-session-row${row.isCurrent ? ' is-current' : ''}`;
                const activeText = row.online ? 'в сети' : `активность ${this.formatRelativeTime(row.lastActive || row.updatedAt)}`;
                const pill = row.isCurrent
                    ? '<span class="security-session-pill">Текущий</span>'
                    : `<button type="button" class="security-session-revoke" data-session-id="${this.escapeHtml(String(row.sessionId || ''))}">Завершить</button>`;

                item.innerHTML = `
                    <div class="security-session-main">
                        <div class="security-session-title">${this.escapeHtml(row.deviceName || 'Устройство')}</div>
                        <div class="security-session-sub">${this.escapeHtml(activeText)}</div>
                    </div>
                    ${pill}
                `;
                this.securitySessionList.appendChild(item);
            });

            if (showToast) {
                AdvancedViewRenderer.showToast(`Сеансов загружено: ${list.length}`, 'success');
            }
        } catch (error) {
            console.error('Ошибка загрузки сеансов безопасности:', error);
            this.securitySessionList.innerHTML = '<div class="security-empty">Не удалось загрузить сеансы</div>';
            if (showToast) {
                AdvancedViewRenderer.showToast(error?.message || 'Ошибка загрузки сеансов', 'error');
            }
        }
    }

    setupStoriesEvents() {
        if (this.addStoryBtn && this.addStoryBtn.dataset.bound !== '1') {
            this.addStoryBtn.dataset.bound = '1';
            this.addStoryBtn.addEventListener('click', () => {
                const current = this.dataService.getCurrentUser();
                if (!current) {
                    this.navigateTo('auth-view');
                    return;
                }
                this.storyFileInput?.click();
            });
        }

        if (this.storyFileInput && this.storyFileInput.dataset.bound !== '1') {
            this.storyFileInput.dataset.bound = '1';
            this.storyFileInput.addEventListener('change', async (e) => {
                const file = e.target.files && e.target.files[0];
                if (file) await this.uploadStoryFromFile(file);
                this.storyFileInput.value = '';
            });
        }

        if (this.storiesStrip && this.storiesStrip.dataset.bound !== '1') {
            this.storiesStrip.dataset.bound = '1';
            this.storiesStrip.addEventListener('click', (e) => {
                const addBtn = e.target && e.target.closest ? e.target.closest('.story-add-btn') : null;
                if (addBtn) {
                    const current = this.dataService.getCurrentUser();
                    if (!current) {
                        this.navigateTo('auth-view');
                        return;
                    }
                    this.storyFileInput?.click();
                    return;
                }

                const chip = e.target && e.target.closest ? e.target.closest('.story-chip[data-uid]') : null;
                if (!chip) return;
                const uid = chip.dataset.uid || '';
                if (!uid) return;
                this.openStoryGroup(uid);
            });
        }

        if (this.storyViewerCloseBtn && this.storyViewerCloseBtn.dataset.bound !== '1') {
            this.storyViewerCloseBtn.dataset.bound = '1';
            this.storyViewerCloseBtn.addEventListener('click', () => this.closeStoryViewer());
        }
        if (this.storyViewerPrevBtn && this.storyViewerPrevBtn.dataset.bound !== '1') {
            this.storyViewerPrevBtn.dataset.bound = '1';
            this.storyViewerPrevBtn.addEventListener('click', () => this.stepStory(-1));
        }
        if (this.storyViewerNextBtn && this.storyViewerNextBtn.dataset.bound !== '1') {
            this.storyViewerNextBtn.dataset.bound = '1';
            this.storyViewerNextBtn.addEventListener('click', () => this.stepStory(1));
        }
        if (this.storyViewerModal && this.storyViewerModal.dataset.bound !== '1') {
            this.storyViewerModal.dataset.bound = '1';
            this.storyViewerModal.addEventListener('click', (e) => {
                if (e.target === this.storyViewerModal) {
                    this.closeStoryViewer();
                }
            });
        }

        if (!this.storyViewerKeyBound) {
            this.storyViewerKeyBound = true;
            document.addEventListener('keydown', (e) => {
                if (!this.storyViewerModal || !this.storyViewerModal.classList.contains('open')) return;
                if (e.key === 'Escape') {
                    this.closeStoryViewer();
                    return;
                }
                if (e.key === 'ArrowRight') {
                    this.stepStory(1);
                } else if (e.key === 'ArrowLeft') {
                    this.stepStory(-1);
                }
            });
        }
    }

    groupStoriesByAuthor(stories = []) {
        const list = Array.isArray(stories) ? stories : [];
        const map = new Map();

        list.forEach((story) => {
            const uid = story && story.uid ? String(story.uid) : '';
            if (!uid) return;
            const createdAt = parseInt(story.createdAt, 10) || 0;
            const expiresAt = parseInt(story.expiresAt, 10) || 0;
            if (expiresAt && expiresAt <= Date.now()) return;

            const prepared = {
                ...story,
                uid,
                createdAt,
                expiresAt
            };
            if (!map.has(uid)) map.set(uid, []);
            map.get(uid).push(prepared);
        });

        const groups = Array.from(map.entries()).map(([uid, items]) => {
            const storiesForAuthor = (items || [])
                .slice()
                .sort((a, b) => (parseInt(a.createdAt, 10) || 0) - (parseInt(b.createdAt, 10) || 0));
            const latest = storiesForAuthor[storiesForAuthor.length - 1] || {};
            return {
                uid,
                author: latest.author || 'user',
                avatar: latest.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(latest.author || 'user')}&background=random&size=72`,
                stories: storiesForAuthor,
                latestCreatedAt: parseInt(latest.createdAt, 10) || 0,
                hasUnseen: storiesForAuthor.some(story => !this.hasStorySeen(story.id))
            };
        });

        return groups.sort((a, b) => (parseInt(b.latestCreatedAt, 10) || 0) - (parseInt(a.latestCreatedAt, 10) || 0));
    }

    renderStoriesStrip() {
        if (!this.storiesStrip) return;

        const feedView = document.getElementById('feed-view');
        const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        const currentUid = current && current.uid ? String(current.uid) : null;
        const groups = Array.isArray(this.storiesByAuthor) ? this.storiesByAuthor : [];

        this.storiesStrip.innerHTML = '';
        if (!groups.length && !currentUid) {
            this.storiesStrip.innerHTML = '<div class="stories-empty">Войдите, чтобы публиковать истории</div>';
            if (feedView) feedView.classList.remove('has-stories');
            return;
        }

        const frag = document.createDocumentFragment();

        if (currentUid) {
            const addBtn = document.createElement('button');
            addBtn.className = 'story-chip story-add-btn';
            addBtn.type = 'button';
            addBtn.innerHTML = `
                <span class="story-avatar-ring">
                    <img src="${this.escapeHtml(current.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(current.name || 'you')}&background=random&size=72`)}" alt="@${this.escapeHtml(current.name || 'you')}" class="story-avatar">
                    <span class="story-add-plus">+</span>
                </span>
                <span class="story-name">Добавить</span>
            `;
            frag.appendChild(addBtn);
        }

        groups.forEach((group) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = `story-chip ${group.hasUnseen ? 'unseen' : 'seen'}${currentUid && group.uid === currentUid ? ' own' : ''}`;
            chip.dataset.uid = group.uid;
            chip.innerHTML = `
                <span class="story-avatar-ring">
                    <img src="${this.escapeHtml(group.avatar)}" alt="@${this.escapeHtml(group.author || 'user')}" class="story-avatar">
                </span>
                <span class="story-name">${this.escapeHtml(group.author || 'user')}</span>
            `;
            frag.appendChild(chip);
        });

        this.storiesStrip.appendChild(frag);
        if (feedView) feedView.classList.toggle('has-stories', true);
    }

    async loadStories({ silent = false } = {}) {
        if (!this.storiesStrip) return;

        const perfToken = this.beginPerf('stories.load', { silent: !!silent });
        let perfStatus = 'success';
        let stories = [];
        try {
            if (firebaseService
                && firebaseService.isInitialized
                && firebaseService.isInitialized()
                && typeof firebaseService.getActiveStories === 'function') {
                stories = await firebaseService.getActiveStories(80);
            }
        } catch (error) {
            perfStatus = 'error';
            console.error('Ошибка загрузки историй:', error);
            if (!silent) {
                AdvancedViewRenderer.showToast(error?.message || 'Не удалось загрузить истории', 'error');
            }
        }

        this.storiesByAuthor = this.groupStoriesByAuthor(stories);
        this.renderStoriesStrip();
        this.endPerf(perfToken, {
            status: perfStatus,
            totalStories: Array.isArray(stories) ? stories.length : 0,
            authors: Array.isArray(this.storiesByAuthor) ? this.storiesByAuthor.length : 0
        });
    }

    openStoryGroup(uid) {
        const targetUid = String(uid || '').trim();
        if (!targetUid) return;
        const group = (this.storiesByAuthor || []).find(item => String(item.uid || '') === targetUid);
        if (!group || !Array.isArray(group.stories) || group.stories.length === 0) return;

        const firstUnseen = group.stories.findIndex(story => !this.hasStorySeen(story.id));
        const startIndex = firstUnseen >= 0 ? firstUnseen : Math.max(group.stories.length - 1, 0);
        this.openStoryQueue(group.stories, startIndex);
    }

    openStoryQueue(queue = [], startIndex = 0) {
        const list = Array.isArray(queue) ? queue.filter(Boolean) : [];
        if (!list.length || !this.storyViewerModal) return;

        this.activeStoryQueue = list;
        const safeIndex = Math.max(0, Math.min(parseInt(startIndex, 10) || 0, list.length - 1));
        this.activeStoryIndex = safeIndex;
        this.storyViewerModal.classList.add('open');
        document.body.classList.add('story-viewer-open');
        this.renderActiveStory();
    }

    renderActiveStory() {
        if (!this.storyViewerStage) return;
        if (!Array.isArray(this.activeStoryQueue) || !this.activeStoryQueue.length) {
            this.closeStoryViewer();
            return;
        }

        const story = this.activeStoryQueue[this.activeStoryIndex];
        if (!story) {
            this.closeStoryViewer();
            return;
        }

        this.clearStoryAutoplay();
        this.storyViewerStage.innerHTML = '';

        const author = story.author || 'user';
        const avatar = story.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(author)}&background=random&size=72`;
        if (this.storyViewerAuthor) this.storyViewerAuthor.textContent = `@${author}`;
        if (this.storyViewerAvatar) this.storyViewerAvatar.src = avatar;
        if (this.storyViewerTime) this.storyViewerTime.textContent = this.formatRelativeTime(story.createdAt);

        const mime = String(story.mediaMime || '').toLowerCase();
        const isVideo = mime.startsWith('video/');
        if (isVideo) {
            const video = document.createElement('video');
            video.className = 'story-media story-media-video';
            video.src = story.mediaUrl || '';
            video.autoplay = true;
            video.muted = true;
            video.loop = false;
            video.playsInline = true;
            video.setAttribute('playsinline', 'playsinline');

            video.addEventListener('loadedmetadata', () => {
                const duration = Number.isFinite(video.duration)
                    ? Math.min(15000, Math.max(3000, Math.round(video.duration * 1000)))
                    : 7000;
                this.startStoryAutoplay(duration);
            });
            video.addEventListener('error', () => {
                this.startStoryAutoplay(5000);
            });
            video.addEventListener('ended', () => {
                this.stepStory(1);
            });

            this.storyViewerStage.appendChild(video);
            this.activeStoryVideoEl = video;
            video.play().catch(() => {
                this.startStoryAutoplay(7000);
            });
        } else {
            const img = document.createElement('img');
            img.className = 'story-media story-media-image';
            img.src = story.mediaUrl || '';
            img.alt = `История @${author}`;
            this.storyViewerStage.appendChild(img);
            this.startStoryAutoplay(5000);
        }

        if (story.caption) {
            const caption = document.createElement('div');
            caption.className = 'story-caption';
            caption.textContent = String(story.caption);
            this.storyViewerStage.appendChild(caption);
        }

        this.markStorySeenLocal(story.id);
        this.renderStoriesStrip();
        if (firebaseService && typeof firebaseService.markStorySeen === 'function') {
            firebaseService.markStorySeen(story.id).catch(() => {});
        }
    }

    startStoryAutoplay(durationMs = 5000) {
        this.clearStoryAutoplay();
        const safeDuration = Math.max(1200, parseInt(durationMs, 10) || 5000);
        this.storyAutoplayDuration = safeDuration;
        this.storyAutoplayStartedAt = Date.now();

        if (this.storyViewerProgressFill) {
            this.storyViewerProgressFill.style.width = '0%';
            const tick = () => {
                const elapsed = Date.now() - this.storyAutoplayStartedAt;
                const progress = Math.max(0, Math.min(1, elapsed / this.storyAutoplayDuration));
                if (this.storyViewerProgressFill) {
                    this.storyViewerProgressFill.style.width = `${Math.round(progress * 100)}%`;
                }
                if (progress < 1) {
                    this.storyAutoplayRaf = window.requestAnimationFrame(tick);
                }
            };
            this.storyAutoplayRaf = window.requestAnimationFrame(tick);
        }

        this.storyAutoplayTimer = setTimeout(() => {
            this.stepStory(1);
        }, safeDuration + 40);
    }

    clearStoryAutoplay() {
        if (this.storyAutoplayTimer) {
            clearTimeout(this.storyAutoplayTimer);
            this.storyAutoplayTimer = null;
        }
        if (this.storyAutoplayRaf) {
            cancelAnimationFrame(this.storyAutoplayRaf);
            this.storyAutoplayRaf = null;
        }
        if (this.activeStoryVideoEl) {
            try {
                this.activeStoryVideoEl.pause();
            } catch (_) {}
            this.activeStoryVideoEl = null;
        }
    }

    stepStory(direction = 1) {
        const list = Array.isArray(this.activeStoryQueue) ? this.activeStoryQueue : [];
        if (!list.length) {
            this.closeStoryViewer();
            return;
        }

        const next = this.activeStoryIndex + (direction < 0 ? -1 : 1);
        if (next < 0 || next >= list.length) {
            this.closeStoryViewer();
            return;
        }
        this.activeStoryIndex = next;
        this.renderActiveStory();
    }

    closeStoryViewer() {
        if (this.storyViewerModal) {
            this.storyViewerModal.classList.remove('open');
        }
        document.body.classList.remove('story-viewer-open');
        this.clearStoryAutoplay();
        this.activeStoryQueue = [];
        this.activeStoryIndex = -1;
        if (this.storyViewerStage) this.storyViewerStage.innerHTML = '';
        if (this.storyViewerProgressFill) this.storyViewerProgressFill.style.width = '0%';
    }

    async uploadStoryFromFile(file) {
        if (!file) return;
        const mime = String(file.type || '').toLowerCase();
        if (!(mime.startsWith('image/') || mime.startsWith('video/'))) {
            AdvancedViewRenderer.showToast('Поддерживаются только фото и видео', 'warning');
            return;
        }
        if ((file.size || 0) > 20 * 1024 * 1024) {
            AdvancedViewRenderer.showToast('Файл слишком большой (макс. 20MB)', 'warning');
            return;
        }

        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) {
            AdvancedViewRenderer.showToast('Firebase еще не готов', 'warning');
            return;
        }
        if (typeof firebaseService.uploadStory !== 'function') {
            AdvancedViewRenderer.showToast('Публикация историй пока недоступна', 'warning');
            return;
        }

        const caption = prompt('Подпись к истории (необязательно):', '') || '';
        const button = this.addStoryBtn;
        const prevText = button ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = 'Публикуем...';
        }

        try {
            await firebaseService.uploadStory(file, { caption: String(caption || '').trim() });
            await this.loadStories({ silent: true });
            AdvancedViewRenderer.showToast('История опубликована', 'success');
        } catch (error) {
            console.error('Ошибка публикации истории:', error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось опубликовать историю', 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = prevText || 'История';
            }
        }
    }

    setupGiftEvents() {
        this.renderGiftAmountButtons();
        this.setSelectedGiftAmount(this.selectedGiftAmount || this.giftAmounts[0]);

        if (this.giftAmountGrid && this.giftAmountGrid.dataset.bound !== '1') {
            this.giftAmountGrid.dataset.bound = '1';
            this.giftAmountGrid.addEventListener('click', (e) => {
                const btn = e.target && e.target.closest ? e.target.closest('.gift-amount-btn') : null;
                if (!btn) return;
                const amount = parseInt(btn.dataset.amount, 10) || 0;
                this.setSelectedGiftAmount(amount);
            });
        }

        if (this.giftCloseBtn && this.giftCloseBtn.dataset.bound !== '1') {
            this.giftCloseBtn.dataset.bound = '1';
            this.giftCloseBtn.addEventListener('click', () => this.hideGiftSheet());
        }

        if (this.giftSheet && this.giftSheet.dataset.bound !== '1') {
            this.giftSheet.dataset.bound = '1';
            this.giftSheet.addEventListener('click', (e) => {
                if (e.target === this.giftSheet) {
                    this.hideGiftSheet();
                }
            });
        }

        if (this.giftSendBtn && this.giftSendBtn.dataset.bound !== '1') {
            this.giftSendBtn.dataset.bound = '1';
            this.giftSendBtn.addEventListener('click', async () => {
                await this.sendGiftFromSheet();
            });
        }
    }

    renderGiftAmountButtons() {
        if (!this.giftAmountGrid) return;
        this.giftAmountGrid.innerHTML = '';
        const amounts = Array.isArray(this.giftAmounts) ? this.giftAmounts : [];
        amounts.forEach((amount) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'gift-amount-btn';
            btn.dataset.amount = String(amount);
            btn.textContent = `${amount} ₽`;
            this.giftAmountGrid.appendChild(btn);
        });
    }

    setSelectedGiftAmount(amount) {
        const normalized = Math.max(1, parseInt(amount, 10) || 0);
        if (!normalized) return;
        this.selectedGiftAmount = normalized;
        if (!this.giftAmountGrid) return;
        this.giftAmountGrid.querySelectorAll('.gift-amount-btn').forEach((btn) => {
            const value = parseInt(btn.dataset.amount || '0', 10) || 0;
            btn.classList.toggle('active', value === normalized);
        });
    }

    showGiftSheet(videoId, fallback = null) {
        if (!this.giftSheet) return;

        const current = this.dataService.getCurrentUser();
        if (!current) {
            this.navigateTo('auth-view');
            return;
        }

        const id = String(videoId || '').trim();
        const localVideo = (this.dataService && Array.isArray(this.dataService.userVideos))
            ? this.dataService.userVideos.find((row) => String(row.id || '') === id)
            : null;

        const toUid = (localVideo && localVideo.uid)
            ? String(localVideo.uid)
            : (fallback && fallback.authorUid ? String(fallback.authorUid) : '');
        const toUser = (localVideo && localVideo.author)
            ? String(localVideo.author)
            : (fallback && fallback.author ? String(fallback.author) : 'author');
        const firestoreId = (localVideo && localVideo.firestoreId)
            ? String(localVideo.firestoreId)
            : (fallback && fallback.firestoreId ? String(fallback.firestoreId) : null);

        if (!toUid) {
            AdvancedViewRenderer.showToast('Не удалось определить автора', 'warning');
            return;
        }
        if (current.uid && String(current.uid) === String(toUid)) {
            AdvancedViewRenderer.showToast('Нельзя отправить подарок себе', 'warning');
            return;
        }

        this.pendingGiftContext = {
            videoId: id || null,
            firestoreId: firestoreId || null,
            toUid: String(toUid),
            toUser: String(toUser || 'author')
        };

        if (this.giftTargetLabel) {
            this.giftTargetLabel.textContent = `@${this.pendingGiftContext.toUser}`;
        }
        if (this.giftMessageInput) this.giftMessageInput.value = '';
        this.setSelectedGiftAmount(this.selectedGiftAmount || this.giftAmounts[0]);
        this.giftSheet.classList.add('open');
        document.body.classList.add('gift-sheet-open');
    }

    hideGiftSheet() {
        if (this.giftSheet) this.giftSheet.classList.remove('open');
        document.body.classList.remove('gift-sheet-open');
        if (this.giftMessageInput) this.giftMessageInput.value = '';
        this.pendingGiftContext = null;
    }

    async sendGiftFromSheet() {
        if (!this.pendingGiftContext) return;
        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) {
            AdvancedViewRenderer.showToast('Firebase еще не готов', 'warning');
            return;
        }
        if (typeof firebaseService.sendGift !== 'function') {
            AdvancedViewRenderer.showToast('Отправка подарков пока недоступна', 'warning');
            return;
        }

        const button = this.giftSendBtn;
        const prevText = button ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = 'Отправляем...';
        }

        try {
            const message = this.giftMessageInput ? this.giftMessageInput.value.trim() : '';
            const payload = {
                toUid: this.pendingGiftContext.toUid,
                toUser: this.pendingGiftContext.toUser,
                amount: this.selectedGiftAmount,
                message,
                sourceVideoId: this.pendingGiftContext.videoId,
                sourceVideoFirestoreId: this.pendingGiftContext.firestoreId,
                context: 'video'
            };
            await firebaseService.sendGift(payload);
            this.hideGiftSheet();
            AdvancedViewRenderer.showToast(`Подарок ${this.selectedGiftAmount} ₽ отправлен`, 'success');
        } catch (error) {
            console.error('Ошибка отправки подарка:', error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось отправить подарок', 'error');
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = prevText || 'Отправить подарок';
            }
        }
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
        this.setupProfileFeatureEvents();
        this.setupUserListSheetEvents();
        this.setupStoriesEvents();
        this.setupLiveEvents();
        this.setupGiftEvents();
        this.setupSecurityEvents();
        this.setupSeasonThemeEvents();
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
            const rawSource = btn.dataset.feedSource;
            const source = rawSource === 'following'
                ? 'following'
                : (rawSource === 'live' ? 'live' : 'for-you');
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
                await this.loadStories({ silent: true });
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
                await this.loadStories({ silent: true });
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
        [this.allowCommentsInput, this.privateVideoInput, this.ageRestrictedInput, this.videoTemplateInput, this.coverStickerInput, this.coverColorInput].forEach((input) => {
            if (!input) return;
            input.addEventListener('change', () => this.scheduleUploadDraftAutosave());
        });
        if (this.coverTextInput) {
            this.coverTextInput.addEventListener('input', () => this.scheduleUploadDraftAutosave());
        }
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
                const isAgeRestricted = this.ageRestrictedInput ? this.ageRestrictedInput.checked : false;
                const videoTemplate = this.videoTemplateInput ? this.videoTemplateInput.value : 'none';
                const coverText = this.coverTextInput ? this.coverTextInput.value.trim() : '';
                const coverSticker = this.coverStickerInput ? this.coverStickerInput.value : '';
                const coverColor = this.coverColorInput ? this.coverColorInput.value : '#1cb8ff';
                
                await this.dataService.uploadVideo(videoBlob, {
                    desc,
                    tags,
                    filter: this.state.selectedFilter,
                    allowComments,
                    private: isPrivate,
                    ageRestricted: isAgeRestricted,
                    videoTemplate,
                    coverText,
                    coverSticker,
                    coverColor
                });
                
                AdvancedViewRenderer.showToast('Видео опубликовано!', 'success');
                
                fileInput.value = '';
                if (this.uploadDescInput) this.uploadDescInput.value = '';
                if (this.uploadTagsInput) this.uploadTagsInput.value = '';
                if (this.allowCommentsInput) this.allowCommentsInput.checked = true;
                if (this.privateVideoInput) this.privateVideoInput.checked = false;
                if (this.ageRestrictedInput) this.ageRestrictedInput.checked = false;
                if (this.videoTemplateInput) this.videoTemplateInput.value = 'none';
                if (this.coverTextInput) this.coverTextInput.value = '';
                if (this.coverStickerInput) this.coverStickerInput.value = '';
                if (this.coverColorInput) this.coverColorInput.value = '#1cb8ff';
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

    setupProfileFeatureEvents() {
        if (this.profilePrivateToggle && this.profilePrivateToggle.dataset.bound !== '1') {
            this.profilePrivateToggle.dataset.bound = '1';
            this.profilePrivateToggle.addEventListener('change', async () => {
                const checked = !!this.profilePrivateToggle.checked;
                const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
                if (!current || !current.uid) {
                    this.profilePrivateToggle.checked = false;
                    this.navigateTo('auth-view');
                    return;
                }
                if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) {
                    this.profilePrivateToggle.checked = !checked;
                    AdvancedViewRenderer.showToast('Профиль недоступен без подключения базы', 'warning');
                    return;
                }

                try {
                    await firebaseService.updateUserProfile(current.uid, {
                        privateAccount: checked
                    });
                    AdvancedViewRenderer.showToast(checked ? 'Включен приватный аккаунт' : 'Профиль снова публичный', 'success');
                    this.updateProfileUI();
                    if (this.state.feedMode === 'global') {
                        await this.loadFeed(true);
                    }
                } catch (error) {
                    console.error(error);
                    this.profilePrivateToggle.checked = !checked;
                    AdvancedViewRenderer.showToast(error?.message || 'Не удалось изменить приватность', 'error');
                }
            });
        }

        if (this.profileAdultToggle && this.profileAdultToggle.dataset.bound !== '1') {
            this.profileAdultToggle.dataset.bound = '1';
            this.profileAdultToggle.addEventListener('change', async () => {
                const checked = !!this.profileAdultToggle.checked;
                const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
                if (!current || !current.uid) {
                    this.profileAdultToggle.checked = false;
                    this.navigateTo('auth-view');
                    return;
                }
                if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) {
                    this.profileAdultToggle.checked = !checked;
                    AdvancedViewRenderer.showToast('Профиль недоступен без подключения базы', 'warning');
                    return;
                }

                let ageVerified = !!current.ageVerified;
                if (checked && !ageVerified) {
                    const confirmed = window.confirm('Подтвердите, что вам исполнилось 18 лет.');
                    if (!confirmed) {
                        this.profileAdultToggle.checked = false;
                        return;
                    }
                    ageVerified = true;
                }

                try {
                    await firebaseService.updateUserProfile(current.uid, {
                        allowAdultContent: checked,
                        ageVerified
                    });
                    AdvancedViewRenderer.showToast(checked ? 'Контент 18+ включен' : 'Контент 18+ скрыт', 'success');
                    this.updateProfileUI();
                    if (this.state.feedMode === 'global') {
                        await this.loadFeed(true);
                    }
                } catch (error) {
                    console.error(error);
                    this.profileAdultToggle.checked = !checked;
                    AdvancedViewRenderer.showToast(error?.message || 'Не удалось обновить 18+ режим', 'error');
                }
            });
        }

        if (this.profileFollowRequestsBtn && this.profileFollowRequestsBtn.dataset.bound !== '1') {
            this.profileFollowRequestsBtn.dataset.bound = '1';
            this.profileFollowRequestsBtn.addEventListener('click', () => {
                this.openUserListSheet('requests');
            });
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

    setupLiveEvents() {
        if (this.liveOpenBtn && this.liveOpenBtn.dataset.bound !== '1') {
            this.liveOpenBtn.dataset.bound = '1';
            this.liveOpenBtn.addEventListener('click', () => this.openLiveSheet());
        }

        if (this.openLiveBtn && this.openLiveBtn.dataset.bound !== '1') {
            this.openLiveBtn.dataset.bound = '1';
            this.openLiveBtn.addEventListener('click', () => this.openLiveSheet());
        }

        if (this.liveSheetClose && this.liveSheetClose.dataset.bound !== '1') {
            this.liveSheetClose.dataset.bound = '1';
            this.liveSheetClose.addEventListener('click', () => this.closeLiveSheet());
        }

        if (this.liveRefreshBtn && this.liveRefreshBtn.dataset.bound !== '1') {
            this.liveRefreshBtn.dataset.bound = '1';
            this.liveRefreshBtn.addEventListener('click', () => this.refreshLiveSessions());
        }

        if (this.liveStartBtn && this.liveStartBtn.dataset.bound !== '1') {
            this.liveStartBtn.dataset.bound = '1';
            this.liveStartBtn.addEventListener('click', () => this.startLiveSession());
        }

        this.ensureLiveSessionsWatcher();
        this.refreshLiveSessions({ silent: true });
    }

    ensureLiveSessionsWatcher() {
        if (this.liveSessionsUnsubscribe) return;
        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized() && typeof firebaseService.subscribeToLiveSessions === 'function')) {
            return;
        }
        this.liveSessionsUnsubscribe = firebaseService.subscribeToLiveSessions((sessions) => {
            this.liveSessions = Array.isArray(sessions) ? sessions : [];
            this.renderLiveSessionsStrip();
            this.renderLiveSheetList();
        }, { limit: 30 });
    }

    async refreshLiveSessions({ silent = false } = {}) {
        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized() && typeof firebaseService.listLiveSessions === 'function')) {
            this.liveSessions = [];
            this.renderLiveSessionsStrip();
            this.renderLiveSheetList();
            if (!silent) {
                AdvancedViewRenderer.showToast('Live доступен после подключения базы', 'warning');
            }
            return;
        }

        try {
            const sessions = await firebaseService.listLiveSessions(30);
            this.liveSessions = Array.isArray(sessions) ? sessions : [];
            this.renderLiveSessionsStrip();
            this.renderLiveSheetList();
        } catch (error) {
            console.error('Ошибка обновления live-сессий:', error);
            if (!silent) {
                AdvancedViewRenderer.showToast(error?.message || 'Не удалось обновить эфиры', 'error');
            }
        }
    }

    renderLiveSessionsStrip() {
        if (this.state.feedMode === 'global' && this.state.feedSource === 'live') {
            this.renderLiveFeedList();
        }
        if (!this.liveSessionsList) return;
        const sessions = Array.isArray(this.liveSessions) ? this.liveSessions.slice(0, 8) : [];
        if (!sessions.length) {
            this.liveSessionsList.innerHTML = '<div class="live-sessions-empty">Сейчас нет активных эфиров</div>';
            return;
        }

        this.liveSessionsList.innerHTML = '';
        sessions.forEach((session) => {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'live-session-chip';
            item.innerHTML = `
                <span class="live-dot"></span>
                <span class="live-author">@${this.escapeHtml(session.ownerName || 'user')}</span>
                <span class="live-count">${AdvancedViewRenderer.formatNumber(session.viewersCount || 0)}</span>
            `;
            item.addEventListener('click', () => this.joinLiveSession(session.id, { asCoHost: false }));
            this.liveSessionsList.appendChild(item);
        });
    }

    renderLiveFeedList() {
        if (!this.feedContainer) return;
        const sessions = Array.isArray(this.liveSessions) ? this.liveSessions : [];
        const currentUid = firebaseService && firebaseService.getCurrentUid ? String(firebaseService.getCurrentUid() || '') : '';

        if (typeof this.resetFeedVideoLifecycle === 'function') {
            this.resetFeedVideoLifecycle();
        }
        this.feedContainer.innerHTML = '';

        const root = document.createElement('div');
        root.className = 'live-feed-root';
        root.innerHTML = `
            <div class="live-feed-head">
                <div class="live-feed-title">Прямые эфиры</div>
                <div class="live-feed-head-actions">
                    <button type="button" class="secondary-btn live-feed-refresh">Обновить</button>
                    <button type="button" class="primary-btn live-feed-open">Мои эфиры</button>
                </div>
            </div>
            <div class="live-feed-list"></div>
        `;

        const refreshBtn = root.querySelector('.live-feed-refresh');
        refreshBtn?.addEventListener('click', async () => {
            await this.refreshLiveSessions();
            if (this.state.feedSource === 'live' && this.state.feedMode === 'global') {
                this.renderLiveFeedList();
            }
        });

        const openBtn = root.querySelector('.live-feed-open');
        openBtn?.addEventListener('click', () => this.openLiveSheet());

        const listEl = root.querySelector('.live-feed-list');
        if (!listEl) {
            this.feedContainer.appendChild(root);
            return;
        }

        if (!sessions.length) {
            listEl.innerHTML = `
                <div class="live-feed-empty">
                    <h3>Сейчас нет активных эфиров</h3>
                    <p>Нажмите "Мои эфиры", чтобы запустить трансляцию.</p>
                </div>
            `;
            this.feedContainer.appendChild(root);
            return;
        }

        sessions.forEach((session) => {
            const row = document.createElement('div');
            row.className = 'live-feed-row';

            const isOwner = !!(currentUid && String(session.ownerUid || '') === currentUid);
            const canJoinAsCoHost = !isOwner && Array.isArray(session.coHosts) && session.coHosts.length < 2;
            const coHostsCount = Array.isArray(session.coHosts) ? session.coHosts.length : 0;
            const avatar = this.escapeHtml(session.ownerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.ownerName || 'user')}&background=random&size=72`);

            row.innerHTML = `
                <div class="live-feed-meta">
                    <img class="live-feed-avatar" src="${avatar}" alt="@${this.escapeHtml(session.ownerName || 'user')}">
                    <div class="live-feed-text">
                        <div class="live-feed-row-title">${this.escapeHtml(session.title || 'Прямой эфир')}</div>
                        <div class="live-feed-row-sub">@${this.escapeHtml(session.ownerName || 'user')} · зрителей: ${AdvancedViewRenderer.formatNumber(session.viewersCount || 0)} · co-host: ${coHostsCount}/2</div>
                    </div>
                </div>
                <div class="live-feed-actions"></div>
            `;

            const actions = row.querySelector('.live-feed-actions');
            if (actions) {
                if (isOwner) {
                    const endBtn = document.createElement('button');
                    endBtn.type = 'button';
                    endBtn.className = 'secondary-btn';
                    endBtn.textContent = 'Завершить';
                    endBtn.addEventListener('click', async () => {
                        try {
                            await firebaseService.endLiveSession(session.id);
                            AdvancedViewRenderer.showToast('Эфир завершен', 'success');
                            await this.refreshLiveSessions({ silent: true });
                            if (this.state.feedSource === 'live' && this.state.feedMode === 'global') {
                                this.renderLiveFeedList();
                            }
                        } catch (error) {
                            console.error(error);
                            AdvancedViewRenderer.showToast(error?.message || 'Не удалось завершить эфир', 'error');
                        }
                    });
                    actions.appendChild(endBtn);
                } else {
                    const joinBtn = document.createElement('button');
                    joinBtn.type = 'button';
                    joinBtn.className = 'secondary-btn';
                    joinBtn.textContent = 'Войти';
                    joinBtn.addEventListener('click', () => this.joinLiveSession(session.id, { asCoHost: false }));
                    actions.appendChild(joinBtn);

                    const coHostBtn = document.createElement('button');
                    coHostBtn.type = 'button';
                    coHostBtn.className = 'secondary-btn';
                    coHostBtn.textContent = 'Co-host';
                    coHostBtn.disabled = !canJoinAsCoHost;
                    coHostBtn.addEventListener('click', () => this.joinLiveSession(session.id, { asCoHost: true }));
                    actions.appendChild(coHostBtn);
                }
            }

            listEl.appendChild(row);
        });

        this.feedContainer.appendChild(root);
    }

    renderLiveSheetList() {
        if (!this.liveSheetList) return;
        const sessions = Array.isArray(this.liveSessions) ? this.liveSessions : [];
        const currentUid = firebaseService && firebaseService.getCurrentUid ? String(firebaseService.getCurrentUid() || '') : '';

        if (!sessions.length) {
            this.liveSheetList.innerHTML = '<div class="live-sessions-empty">Сейчас нет активных эфиров</div>';
            return;
        }

        this.liveSheetList.innerHTML = '';
        sessions.forEach((session) => {
            const row = document.createElement('div');
            row.className = 'live-sheet-row';
            const isOwner = !!(currentUid && String(session.ownerUid || '') === currentUid);
            const canJoinAsCoHost = !isOwner && Array.isArray(session.coHosts) && session.coHosts.length < 2;
            const coHostsCount = Array.isArray(session.coHosts) ? session.coHosts.length : 0;

            row.innerHTML = `
                <div class="live-sheet-meta">
                    <div class="live-sheet-title">${this.escapeHtml(session.title || 'Прямой эфир')}</div>
                    <div class="live-sheet-sub">@${this.escapeHtml(session.ownerName || 'user')} · зрителей: ${AdvancedViewRenderer.formatNumber(session.viewersCount || 0)} · co-host: ${coHostsCount}/2</div>
                </div>
                <div class="live-sheet-actions"></div>
            `;

            const actions = row.querySelector('.live-sheet-actions');
            if (actions) {
                if (isOwner) {
                    const endBtn = document.createElement('button');
                    endBtn.type = 'button';
                    endBtn.className = 'secondary-btn';
                    endBtn.textContent = 'Завершить';
                    endBtn.addEventListener('click', async () => {
                        try {
                            await firebaseService.endLiveSession(session.id);
                            AdvancedViewRenderer.showToast('Эфир завершен', 'success');
                            await this.refreshLiveSessions({ silent: true });
                        } catch (error) {
                            console.error(error);
                            AdvancedViewRenderer.showToast(error?.message || 'Не удалось завершить эфир', 'error');
                        }
                    });
                    actions.appendChild(endBtn);
                } else {
                    const joinBtn = document.createElement('button');
                    joinBtn.type = 'button';
                    joinBtn.className = 'secondary-btn';
                    joinBtn.textContent = 'Войти';
                    joinBtn.addEventListener('click', () => this.joinLiveSession(session.id, { asCoHost: false }));
                    actions.appendChild(joinBtn);

                    const coHostBtn = document.createElement('button');
                    coHostBtn.type = 'button';
                    coHostBtn.className = 'secondary-btn';
                    coHostBtn.textContent = 'Co-host';
                    coHostBtn.disabled = !canJoinAsCoHost;
                    coHostBtn.addEventListener('click', () => this.joinLiveSession(session.id, { asCoHost: true }));
                    actions.appendChild(coHostBtn);
                }
            }

            this.liveSheetList.appendChild(row);
        });
    }

    openLiveSheet() {
        if (!this.liveSheet) return;
        this.liveSheet.classList.add('open');
        this.refreshLiveSessions({ silent: true });
    }

    closeLiveSheet() {
        if (!this.liveSheet) return;
        this.liveSheet.classList.remove('open');
    }

    async startLiveSession() {
        const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        if (!current || !current.uid) {
            this.navigateTo('auth-view');
            return;
        }
        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized() && typeof firebaseService.createLiveSession === 'function')) {
            AdvancedViewRenderer.showToast('Live недоступен без подключения базы', 'warning');
            return;
        }

        const title = this.liveTitleInput ? this.liveTitleInput.value.trim() : '';
        try {
            await firebaseService.createLiveSession({ title });
            if (this.liveTitleInput) this.liveTitleInput.value = '';
            AdvancedViewRenderer.showToast('Эфир запущен', 'success');
            await this.refreshLiveSessions({ silent: true });
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось запустить эфир', 'error');
        }
    }

    async joinLiveSession(sessionId, { asCoHost = false } = {}) {
        const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        if (!current || !current.uid) {
            this.navigateTo('auth-view');
            return;
        }
        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized() && typeof firebaseService.joinLiveSession === 'function')) {
            AdvancedViewRenderer.showToast('Live недоступен без подключения базы', 'warning');
            return;
        }

        try {
            const session = await firebaseService.joinLiveSession(sessionId, { asCoHost });
            this.state.activeLiveSessionId = session && session.id ? session.id : null;
            AdvancedViewRenderer.showToast(asCoHost ? 'Вы присоединились как co-host' : 'Вы вошли в эфир', 'success');
            await this.refreshLiveSessions({ silent: true });
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось войти в эфир', 'error');
        }
    }

    async openUserListSheet(mode = 'following') {
        if (!this.userListSheet || !this.userList || !this.userListTitle) return;

        const normalizedMode = mode === 'followers'
            ? 'followers'
            : (mode === 'requests' ? 'requests' : 'following');
        const currentUid = firebaseService && typeof firebaseService.getCurrentUid === 'function'
            ? firebaseService.getCurrentUid()
            : null;
        const targetUid = this.state.viewingProfileUid || currentUid;

        if (!targetUid) {
            AdvancedViewRenderer.showToast('Сначала войдите в аккаунт', 'warning');
            return;
        }

        if (normalizedMode === 'requests' && String(targetUid) !== String(currentUid)) {
            AdvancedViewRenderer.showToast('Заявки доступны только в вашем профиле', 'warning');
            return;
        }

        this.userListTitle.textContent = normalizedMode === 'followers'
            ? 'Подписчики'
            : (normalizedMode === 'requests' ? 'Заявки' : 'Подписки');
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

        const source = normalizedMode === 'followers'
            ? targetProfile.subscribers
            : (normalizedMode === 'requests' ? targetProfile.followRequests : targetProfile.subscriptions);
        const ids = Array.isArray(source)
            ? Array.from(new Set(source.map(x => String(x)).filter(Boolean)))
            : [];

        if (ids.length === 0) {
            const emptyText = normalizedMode === 'followers'
                ? 'Подписчиков пока нет'
                : (normalizedMode === 'requests' ? 'Новых заявок нет' : 'Подписок пока нет');
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

            if (normalizedMode === 'requests') {
                const actions = document.createElement('div');
                actions.className = 'user-list-actions';
                actions.innerHTML = `
                    <button type="button" class="secondary-btn user-list-approve">Принять</button>
                    <button type="button" class="secondary-btn user-list-reject">Отклонить</button>
                `;

                actions.querySelector('.user-list-approve')?.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized() && typeof firebaseService.approveFollowRequest === 'function')) {
                        AdvancedViewRenderer.showToast('Функция заявок недоступна', 'warning');
                        return;
                    }
                    try {
                        await firebaseService.approveFollowRequest(uid);
                        item.remove();
                        AdvancedViewRenderer.showToast('Заявка принята', 'success');
                        const left = this.userList.querySelectorAll('.user-list-item').length;
                        if (!left) {
                            this.userList.innerHTML = '<div class="user-list-empty">Новых заявок нет</div>';
                        }
                        this.updateProfileUI();
                    } catch (error) {
                        console.error(error);
                        AdvancedViewRenderer.showToast(error?.message || 'Не удалось принять заявку', 'error');
                    }
                });

                actions.querySelector('.user-list-reject')?.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized() && typeof firebaseService.rejectFollowRequest === 'function')) {
                        AdvancedViewRenderer.showToast('Функция заявок недоступна', 'warning');
                        return;
                    }
                    try {
                        await firebaseService.rejectFollowRequest(uid);
                        item.remove();
                        AdvancedViewRenderer.showToast('Заявка отклонена', 'info');
                        const left = this.userList.querySelectorAll('.user-list-item').length;
                        if (!left) {
                            this.userList.innerHTML = '<div class="user-list-empty">Новых заявок нет</div>';
                        }
                        this.updateProfileUI();
                    } catch (error) {
                        console.error(error);
                        AdvancedViewRenderer.showToast(error?.message || 'Не удалось отклонить заявку', 'error');
                    }
                });

                item.appendChild(actions);
            }

            item.addEventListener('click', async () => {
                if (normalizedMode === 'requests') return;
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
            const source = parsed && parsed.feedSource === 'following'
                ? 'following'
                : (parsed && parsed.feedSource === 'live' ? 'live' : 'for-you');
            this.state.feedSource = source;
        } catch (_) {}
        this.applyFeedSourceUi();
    }

    persistFeedPreferences() {
        try {
            localStorage.setItem(this.feedPrefsKey, JSON.stringify({
                feedSource: this.state.feedSource === 'following'
                    ? 'following'
                    : (this.state.feedSource === 'live' ? 'live' : 'for-you')
            }));
        } catch (_) {}
    }

    async setFeedSource(source, { reload = true } = {}) {
        const normalized = source === 'following'
            ? 'following'
            : (source === 'live' ? 'live' : 'for-you');
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
            const rawSource = btn.dataset.feedSource;
            const source = rawSource === 'following'
                ? 'following'
                : (rawSource === 'live' ? 'live' : 'for-you');
            btn.classList.toggle('active', source === this.state.feedSource);
        });
    }

    updateFeedTopControls() {
        const inCustomFeed = this.state.feedMode === 'custom';
        const inLiveSource = this.state.feedSource === 'live' && !inCustomFeed;
        if (this.feedBackBtn) {
            this.feedBackBtn.classList.toggle('hidden', !inCustomFeed);
        }
        if (this.feedFilterTabs) {
            this.feedFilterTabs.classList.toggle('hidden', inCustomFeed);
        }
        if (this.storiesStrip) {
            this.storiesStrip.classList.toggle('hidden', inCustomFeed || inLiveSource);
        }
        if (this.seasonalBanner) {
            const shouldShowSeasonal = this.seasonThemeEnabled && !!this.activeSeasonMeta && !inCustomFeed && !inLiveSource;
            this.seasonalBanner.classList.toggle('hidden', !shouldShowSeasonal);
        }
    }

    renderFeedEmptyState(source = 'for-you') {
        if (!this.feedContainer) return;
        const isFollowing = source === 'following';
        const isLive = source === 'live';
        const title = isLive
            ? 'Сейчас нет активных эфиров'
            : (isFollowing ? 'Лента подписок пуста' : 'Пока нет подходящих видео');
        const subtitle = isLive
            ? 'Запустите свой эфир или зайдите позже.'
            : (isFollowing
                ? 'Подпишитесь на авторов, чтобы видеть их видео здесь.'
                : 'Смотрите ролики и отмечайте интересное, чтобы алгоритм подстроился.');
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
        const currentUid = current && current.uid ? String(current.uid) : null;
        const allowAdult = !!(current && current.allowAdultContent === true && current.ageVerified === true);

        const visibleVideos = withoutMutedAuthors.filter((video) => {
            if (!video) return false;

            if (!allowAdult && video.ageRestricted === true) {
                return false;
            }

            if (video.authorPrivate === true) {
                const authorUid = video.uid ? String(video.uid) : null;
                if (!authorUid) return false;
                if (currentUid && currentUid === authorUid) return true;
                return subscriptionsSet.has(authorUid);
            }

            return true;
        });

        if (this.state.feedSource === 'following') {
            return visibleVideos
                .filter((video) => {
                    const uid = video && video.uid ? String(video.uid) : null;
                    return !!(uid && subscriptionsSet.has(uid));
                })
                .sort((a, b) => (parseInt(b.timestamp, 10) || 0) - (parseInt(a.timestamp, 10) || 0));
        }

        const interestSet = new Set(this.collectInterestTags(current && current.interests ? current.interests : ''));
        return visibleVideos
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
        const ageRestricted = this.ageRestrictedInput ? this.ageRestrictedInput.checked : false;
        const videoTemplate = this.videoTemplateInput ? this.videoTemplateInput.value : 'none';
        const coverText = this.coverTextInput ? this.coverTextInput.value.trim() : '';
        const coverSticker = this.coverStickerInput ? this.coverStickerInput.value : '';
        const coverColor = this.coverColorInput ? this.coverColorInput.value : '#1cb8ff';
        const filter = this.state.selectedFilter || 'none';

        const hasMeaningfulData = !!(
            desc
            || tags
            || !allowComments
            || isPrivate
            || ageRestricted
            || filter !== 'none'
            || videoTemplate !== 'none'
            || coverText
            || coverSticker
            || String(coverColor || '').toLowerCase() !== '#1cb8ff'
        );
        if (!hasMeaningfulData) return null;

        return {
            desc,
            tags,
            allowComments,
            private: isPrivate,
            ageRestricted,
            videoTemplate,
            coverText,
            coverSticker,
            coverColor,
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
            if (this.ageRestrictedInput) this.ageRestrictedInput.checked = draft.ageRestricted === true;
            if (this.videoTemplateInput) this.videoTemplateInput.value = draft.videoTemplate || 'none';
            if (this.coverTextInput) this.coverTextInput.value = draft.coverText || '';
            if (this.coverStickerInput) this.coverStickerInput.value = draft.coverSticker || '';
            if (this.coverColorInput) this.coverColorInput.value = draft.coverColor || '#1cb8ff';

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
            if (this.ageRestrictedInput) this.ageRestrictedInput.checked = false;
            if (this.videoTemplateInput) this.videoTemplateInput.value = 'none';
            if (this.coverTextInput) this.coverTextInput.value = '';
            if (this.coverStickerInput) this.coverStickerInput.value = '';
            if (this.coverColorInput) this.coverColorInput.value = '#1cb8ff';
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

    // Feed core methods were extracted to js/app-feed.js

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
            const giftBtn = item.querySelector('.gift-btn');
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

            giftBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showGiftSheet(videoId, {
                    authorUid: item.dataset.uid || null,
                    author: item.dataset.author || null,
                    firestoreId: item.dataset.firestoreId || null
                });
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
                    let hasPendingRequest = false;

                    try {
                        if (firebaseService && firebaseService.isInitialized && firebaseService.isInitialized()) {
                            if (!isSubscribed && typeof firebaseService.getUserProfile === 'function') {
                                const targetProfile = await firebaseService.getUserProfile(authorUid);
                                const requests = Array.isArray(targetProfile?.followRequests)
                                    ? targetProfile.followRequests.map(String)
                                    : [];
                                hasPendingRequest = requests.includes(String(currentUid));
                            }

                            if (isSubscribed) {
                                await firebaseService.unsubscribe(authorUid);
                                followPlus.textContent = '+';
                                followPlus.style.background = 'var(--accent-color)';
                                AdvancedViewRenderer.showToast('Подписка отменена', 'info');
                            } else if (hasPendingRequest) {
                                await firebaseService.unsubscribe(authorUid);
                                followPlus.textContent = '+';
                                followPlus.style.background = 'var(--accent-color)';
                                AdvancedViewRenderer.showToast('Заявка на подписку отменена', 'info');
                            } else {
                                const result = await firebaseService.subscribe(authorUid);
                                if (result && result.status === 'requested') {
                                    followPlus.textContent = '…';
                                    followPlus.style.background = 'rgba(126, 148, 182, 0.95)';
                                    AdvancedViewRenderer.showToast('Заявка на подписку отправлена', 'success');
                                } else {
                                    followPlus.textContent = '✓';
                                    followPlus.style.background = 'var(--accent-secondary)';
                                    AdvancedViewRenderer.showToast('Подписка оформлена', 'success');
                                }
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
        if (viewId !== 'feed-view') this.hideGiftSheet();
        if (viewId !== 'feed-view') this.closeStoryViewer();
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
            if (viewId === 'security-view') {
                this.loadSecuritySessions({ showToast: false });
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
        const addStoryBtn = document.getElementById('add-story-btn');
        this.updateAdminMenuVisibility();
        if (!userProfile) {
            if (addStoryBtn) addStoryBtn.style.display = 'none';
            if (this.openLiveBtn) this.openLiveBtn.style.display = 'none';
            document.getElementById('profile-name').textContent = '@guest';
            document.getElementById('profile-avatar-img').src = 'https://ui-avatars.com/api/?name=Guest&background=random&size=150';
            document.getElementById('profile-bio').textContent = '';
            
            document.getElementById('following-stat').querySelector('.stat-num').textContent = '0';
            document.getElementById('followers-stat').querySelector('.stat-num').textContent = '0';
            document.getElementById('likes-stat').querySelector('.stat-num').textContent = '0';
            if (this.profileCoinsBadge) this.profileCoinsBadge.textContent = 'Монеты: 0';
            if (this.profilePrivateToggle) this.profilePrivateToggle.checked = false;
            if (this.profileAdultToggle) this.profileAdultToggle.checked = false;
            if (this.profileFollowRequestsBtn) this.profileFollowRequestsBtn.textContent = 'Заявки: 0';
            
            document.getElementById('profile-grid').innerHTML = `
                <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--secondary-text);">
                    <p>Войдите, чтобы увидеть свои видео</p>
                </div>
            `;
            return;
        }
        if (addStoryBtn) addStoryBtn.style.display = '';
        if (this.openLiveBtn) this.openLiveBtn.style.display = '';
        
        document.getElementById('profile-name').innerHTML = this.renderUserLabel(userProfile.name, !!userProfile.verified);
        document.getElementById('profile-avatar-img').src = userProfile.avatar;
        document.getElementById('profile-bio').textContent = userProfile.bio || '';
        if (this.profileCoinsBadge) {
            this.profileCoinsBadge.textContent = `Монеты: ${AdvancedViewRenderer.formatNumber(parseInt(userProfile.coins, 10) || 0)}`;
        }
        if (this.profilePrivateToggle) {
            this.profilePrivateToggle.checked = userProfile.privateAccount === true;
        }
        if (this.profileAdultToggle) {
            this.profileAdultToggle.checked = userProfile.allowAdultContent === true;
        }
        if (this.profileFollowRequestsBtn) {
            const requestsCount = Array.isArray(userProfile.followRequests) ? userProfile.followRequests.length : 0;
            this.profileFollowRequestsBtn.textContent = `Заявки: ${requestsCount}`;
        }
        
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

    // Messaging and notifications logic moved to js/app-messages.js.

    // Profile deeplinks/actions logic moved to js/app-profile.js.

}

// Expose constructor for extracted feature modules (e.g. js/app-feed.js).
if (typeof window !== 'undefined') {
    window.AdvancedApp = AdvancedApp;
}

// Инициализация
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AdvancedApp();
});
