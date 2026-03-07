/**
 * AdvancedApp
 * РћСЃРЅРѕРІРЅРѕРµ РїСЂРёР»РѕР¶РµРЅРёРµ - СѓРїСЂР°РІР»РµРЅРёРµ СЃРѕСЃС‚РѕСЏРЅРёРµРј Рё СЃРѕР±С‹С‚РёСЏРјРё
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
            avatarFile: null,
            currentChatId: null,
            currentChatUser: null,
            currentChatUid: null,
            currentChatVerified: false,
            activeCallId: null,
            activeLiveSessionId: null,
            profileGridTab: 'videos' // 'videos' | 'saved' | 'liked' | 'drafts'
        };
        this.uploadDraftKey = storageKeys.uploadDraft || 'reelgram_upload_draft_v1';
        this.savedVideosKey = storageKeys.savedVideos || 'reelgram_saved_videos_v1';
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
            : ['рџЂ', 'рџ‚', 'рџЌ', 'рџ‹', 'рџҐі', 'рџ”Ґ', 'вќ¤пёЏ', 'рџ‘Ќ', 'рџ‘Џ', 'рџ¤ќ', 'рџ¤”', 'рџў', 'рџ™Њ', 'вњЁ', 'рџ…', 'рџЋ‰'];
        this.stickerPack = Array.isArray(uiConfig.stickerPack) && uiConfig.stickerPack.length
            ? uiConfig.stickerPack.map(sticker => ({ ...sticker }))
            : [
                { id: 'party', title: 'РџР°С‚Рё', emoji: 'рџҐі', style: 'sticker-style-party', motion: 'sticker-motion-bounce' },
                { id: 'wow', title: 'Р’Р°Сѓ', emoji: 'рџ¤Ї', style: 'sticker-style-wow', motion: 'sticker-motion-pop' },
                { id: 'cool', title: 'РљСЂСѓС‚Рѕ', emoji: 'рџ‹', style: 'sticker-style-cool', motion: 'sticker-motion-wiggle' },
                { id: 'love', title: 'Р›СЋР±РѕРІСЊ', emoji: 'рџЌ', style: 'sticker-style-love', motion: 'sticker-motion-pulse' },
                { id: 'fire', title: 'РћРіРѕРЅСЊ', emoji: 'рџ”Ґ', style: 'sticker-style-fire', motion: 'sticker-motion-pop' },
                { id: 'lol', title: 'РЎРјРµС…', emoji: 'рџ‚', style: 'sticker-style-lol', motion: 'sticker-motion-bounce' },
                { id: 'power', title: 'РЎРёР»Р°', emoji: 'рџ’Є', style: 'sticker-style-power', motion: 'sticker-motion-pulse' },
                { id: 'hype', title: 'РҐР°Р№Рї', emoji: 'вљЎ', style: 'sticker-style-hype', motion: 'sticker-motion-wiggle' }
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
        this.profileViewContext = {
            isOwn: true,
            profileUid: null,
            baseVideos: [],
            loading: false
        };
        this.profileLikedRequestToken = 0;
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
        this.storyAutoplayElapsed = 0;
        this.storyAutoplayRaf = null;
        this.storyAutoplayPaused = false;
        this.storyProgressSegments = [];
        this.storyPressState = null;
        this.storyViewerSurface = null;
        this.storyViewerProgressTrack = null;
        this.activeStoryVideoEl = null;
        this.activeStoryContext = null;
        this.storyArchiveCache = {};
        this.profileStoryCollectionsRequestId = 0;
        this.storyArchiveSheetRequestId = 0;
        this.profileAvatarPressState = null;
        this.profileAvatarPreviewEscapeBound = false;
        this.profileAvatarPreviewModal = null;
        this.profileAvatarPreviewImage = null;
        this.profileAvatarPreviewTitle = null;
        this.profileAvatarPreviewHandle = null;
        this.profileAvatarPreviewCloseBtn = null;
        this.liveSessions = [];
        this.liveSessionsUnsubscribe = null;
        this.firebaseRecoveryTimer = null;

        this.init();
    }

    async init() {
        console.log('рџљЂ Initializing app...');
        this.ensureEnhancedUiScaffold();
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

        // FirebaseService РёРЅРёС†РёР°Р»РёР·РёСЂСѓРµС‚СЃСЏ Р°СЃРёРЅС…СЂРѕРЅРЅРѕ РІ firebase-service.js (С‡РµСЂРµР· setTimeout).
        // Р§С‚РѕР±С‹ Р»РµРЅС‚Р°/РїСЂРѕС„РёР»СЊ РїРѕСЃР»Рµ РїРµСЂРµР·Р°РіСЂСѓР·РєРё Р±СЂР°Р»Рё РґР°РЅРЅС‹Рµ РёР· Firestore, Р¶РґС‘Рј РіРѕС‚РѕРІРЅРѕСЃС‚Рё (СЃ С‚Р°Р№РјР°СѓС‚РѕРј).
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
                    console.warn('вљ пёЏ РќРµ СѓРґР°Р»РѕСЃСЊ РІРѕСЃСЃС‚Р°РЅРѕРІРёС‚СЊ СЃРѕСЃС‚РѕСЏРЅРёРµ РїРѕСЃР»Рµ РїРѕРґРєР»СЋС‡РµРЅРёСЏ Firebase:', error?.message || error);
                }
                return;
            }

            if (attempts >= safeMaxAttempts) {
                console.warn('вљ пёЏ Firebase РЅРµ РёРЅРёС†РёР°Р»РёР·РёСЂРѕРІР°РЅ, recovery РѕСЃС‚Р°РЅРѕРІР»РµРЅ');
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
        this.accountSwitchMenu = document.getElementById('account-switch-menu');
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
        this.audioCallBtn = document.getElementById('audio-call-btn');
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

        this.profilePrivateToggle = document.getElementById('profile-private-account-toggle');
        this.profileAdultToggle = document.getElementById('profile-adult-feed-toggle');
        this.profileFollowRequestsBtn = document.getElementById('profile-follow-requests-btn');
        this.profileRequestsMenu = document.getElementById('profile-requests-menu');
        this.profileRequestsMenuText = document.getElementById('profile-requests-menu-text');
        this.profileBackBtn = document.getElementById('profile-back-btn');
        this.openLiveBtn = document.getElementById('open-live-btn');
        this.profileSearchBtn = document.getElementById('profile-search-btn');
        this.profileMediaTabs = document.getElementById('profile-media-tabs');
        this.profileMediaTabButtons = this.profileMediaTabs
            ? Array.from(this.profileMediaTabs.querySelectorAll('[data-profile-tab]'))
            : [];

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
        this.storyViewerProgressTrack = document.getElementById('story-viewer-progress-track');
        this.storyViewerProgressFill = document.getElementById('story-viewer-progress-fill');
        if (!this.storyViewerProgressTrack && this.storyViewerProgressFill && this.storyViewerProgressFill.parentNode) {
            this.storyViewerProgressTrack = this.storyViewerProgressFill.parentNode;
        }
        this.storyViewerOwnerActions = document.getElementById('story-viewer-owner-actions');
        this.storyViewerHighlightBtn = document.getElementById('story-viewer-highlight-btn');
        this.storyViewerDeleteBtn = document.getElementById('story-viewer-delete-btn');
        this.storyViewerReplyBar = document.getElementById('story-viewer-reply-bar');
        this.storyViewerReplyInput = document.getElementById('story-viewer-reply-input');
        this.storyViewerReplySendBtn = document.getElementById('story-viewer-reply-send');
        this.storyViewerCloseBtn = document.getElementById('story-viewer-close');
        this.storyViewerPrevBtn = document.getElementById('story-viewer-prev');
        this.storyViewerNextBtn = document.getElementById('story-viewer-next');
        this.storyViewerSurface = this.storyViewerModal && this.storyViewerModal.querySelector
            ? this.storyViewerModal.querySelector('.story-viewer-surface')
            : null;
        this.storyArchiveSheet = document.getElementById('story-archive-sheet');
        this.storyArchiveSheetTitle = document.getElementById('story-archive-sheet-title');
        this.storyArchiveSheetSubtitle = document.getElementById('story-archive-sheet-subtitle');
        this.storyArchiveSheetList = document.getElementById('story-archive-sheet-list');
        this.storyArchiveSheetCloseBtn = document.getElementById('story-archive-sheet-close');
        this.addStoryBtn = document.getElementById('add-story-btn');
        this.storyFileInput = document.getElementById('story-file-input');
        this.profileHighlightsSection = document.getElementById('profile-highlights-section');
        this.profileHighlightsList = document.getElementById('profile-highlights-list');
        this.profileHighlightsEmpty = document.getElementById('profile-highlights-empty');
        this.profileStoryArchiveBtn = document.getElementById('profile-story-archive-btn');
        this.profileAvatarWrap = document.querySelector('#profile-view .profile-avatar-wrap');
        this.profileAvatarImg = document.getElementById('profile-avatar-img');
        this.profileAvatarPreviewModal = document.getElementById('profile-avatar-preview-modal');
        this.profileAvatarPreviewImage = document.getElementById('profile-avatar-preview-image');
        this.profileAvatarPreviewTitle = document.getElementById('profile-avatar-preview-title');
        this.profileAvatarPreviewHandle = document.getElementById('profile-avatar-preview-handle');
        this.profileAvatarPreviewCloseBtn = document.getElementById('profile-avatar-preview-close');

        this.securityMenu = document.getElementById('security-menu');
        this.securityView = document.getElementById('security-view');
        this.securityBackBtn = document.getElementById('security-back-btn');
        this.securityRefreshBtn = document.getElementById('security-refresh-btn');
        this.securityLogoutOthersBtn = document.getElementById('security-logout-others-btn');
        this.securityCurrentDevice = document.getElementById('security-current-device');
        this.securitySessionList = document.getElementById('security-session-list');
        this.securitySessionCount = document.getElementById('security-session-count');
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
                strip.innerHTML = '<div class="stories-loading">Р—Р°РіСЂСѓР·РєР° РёСЃС‚РѕСЂРёР№...</div>';
                const tabs = document.getElementById('feed-filter-tabs');
                if (tabs && tabs.parentNode === feedView) {
                    feedView.insertBefore(strip, tabs);
                } else {
                    feedView.insertBefore(strip, feedView.firstChild);
                }
            }

            // Legacy live strip removed: live sessions are available via top tab "Р­С„РёСЂС‹".
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
                addStoryBtn.textContent = 'РСЃС‚РѕСЂРёСЏ';
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
                openLiveBtn.textContent = 'Р­С„РёСЂ';
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
        }

        const menuDropdown = document.getElementById('menu-dropdown');
        if (menuDropdown) {
            if (!document.getElementById('profile-requests-menu')) {
                const requestsItem = document.createElement('div');
                requestsItem.className = 'menu-item is-hidden-default';
                requestsItem.id = 'profile-requests-menu';
                requestsItem.innerHTML = `
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 3c4.97 0 9 3.58 9 8 0 4.42-4.03 8-9 8a10.6 10.6 0 0 1-3.73-.67L3 21l1.49-3.58A7.2 7.2 0 0 1 3 11c0-4.42 4.03-8 9-8zm0 2c-3.86 0-7 2.69-7 6 0 1.7.85 3.24 2.22 4.33l.58.46-.84 2 2.43-1.24.49.18c.71.26 1.4.39 2.12.39 3.86 0 7-2.69 7-6s-3.14-6-7-6zm-3 5h6v2H9v-2zm0 3h4v2H9v-2z"/>
                    </svg>
                    <span id="profile-requests-menu-text">\u0417\u0430\u044f\u0432\u043a\u0438: 0</span>
                `;
                const securityMenu = document.getElementById('security-menu');
                const adminMenu = document.getElementById('admin-menu');
                const logoutMenu = document.getElementById('logout-menu');
                if (securityMenu && securityMenu.parentNode === menuDropdown) {
                    securityMenu.insertAdjacentElement('beforebegin', requestsItem);
                } else if (adminMenu && adminMenu.parentNode === menuDropdown) {
                    adminMenu.insertAdjacentElement('beforebegin', requestsItem);
                } else if (logoutMenu && logoutMenu.parentNode === menuDropdown) {
                    logoutMenu.insertAdjacentElement('beforebegin', requestsItem);
                } else {
                    menuDropdown.appendChild(requestsItem);
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
                    <span>\u0411\u0435\u0437\u043e\u043f\u0430\u0441\u043d\u043e\u0441\u0442\u044c</span>
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
                        <button class="security-back-btn" id="security-back-btn" type="button" aria-label="РќР°Р·Р°Рґ РІ РїСЂРѕС„РёР»СЊ">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"></path>
                            </svg>
                            <span>РџСЂРѕС„РёР»СЊ</span>
                        </button>
                        <h3>Р¦РµРЅС‚СЂ Р±РµР·РѕРїР°СЃРЅРѕСЃС‚Рё</h3>
                        <button class="security-refresh-btn" id="security-refresh-btn" type="button">РћР±РЅРѕРІРёС‚СЊ</button>
                    </div>
                    <section class="security-card">
                        <h4>РўРµРєСѓС‰РµРµ СѓСЃС‚СЂРѕР№СЃС‚РІРѕ</h4>
                        <div class="security-current-device" id="security-current-device">Р—Р°РіСЂСѓР·РєР°...</div>
                        <button class="primary-btn" id="security-logout-others-btn" type="button">Р’С‹Р№С‚Рё СЃ РґСЂСѓРіРёС… СѓСЃС‚СЂРѕР№СЃС‚РІ</button>
                    </section>
                    <section class="security-card">
                        <div class="security-card-head">
                            <h4>РЎРµР°РЅСЃС‹ Рё СѓСЃС‚СЂРѕР№СЃС‚РІР°</h4>
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
                    <div class="story-viewer-progress-track" id="story-viewer-progress-track"></div>
                    <button class="story-viewer-close" id="story-viewer-close" type="button" aria-label="Close story">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M18 6L6 18"></path>
                            <path d="M6 6l12 12"></path>
                        </svg>
                    </button>
                    <div class="story-viewer-meta">
                        <div class="story-viewer-meta-main">
                            <img id="story-viewer-avatar" class="story-viewer-avatar" src="assets/default-avatar.svg" alt="@user">
                            <div class="story-viewer-meta-text">
                                <div class="story-viewer-author" id="story-viewer-author">@user</div>
                                <div class="story-viewer-time" id="story-viewer-time">\u0442\u043e\u043b\u044c\u043a\u043e \u0447\u0442\u043e</div>
                            </div>
                        </div>
                        <div class="story-viewer-meta-actions is-hidden-default" id="story-viewer-owner-actions" data-no-story-nav="1">
                            <button class="story-viewer-action-btn" id="story-viewer-highlight-btn" type="button">\u0412 \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0435</button>
                            <button class="story-viewer-action-btn danger" id="story-viewer-delete-btn" type="button">\u0423\u0434\u0430\u043b\u0438\u0442\u044c</button>
                        </div>
                    </div>
                    <div class="story-viewer-stage" id="story-viewer-stage"></div>
                    <div class="story-viewer-reply-bar is-hidden-default" id="story-viewer-reply-bar" data-no-story-nav="1">
                        <input
                            type="text"
                            class="story-viewer-reply-input"
                            id="story-viewer-reply-input"
                            maxlength="240"
                            placeholder="\u041e\u0442\u0432\u0435\u0442\u0438\u0442\u044c \u043d\u0430 \u0438\u0441\u0442\u043e\u0440\u0438\u044e"
                        >
                        <button class="story-viewer-reply-send" id="story-viewer-reply-send" type="button">\u041e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c</button>
                    </div>
                    <button class="story-nav-btn prev" id="story-viewer-prev" type="button" aria-label="Previous story">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M15 18l-6-6 6-6"></path>
                        </svg>
                    </button>
                    <button class="story-nav-btn next" id="story-viewer-next" type="button" aria-label="Next story">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M9 18l6-6-6-6"></path>
                        </svg>
                    </button>
                </div>
            `;
            appRoot.appendChild(storyModal);
        }

        if (!document.getElementById('story-archive-sheet')) {
            const archiveSheet = document.createElement('div');
            archiveSheet.id = 'story-archive-sheet';
            archiveSheet.className = 'story-archive-sheet';
            archiveSheet.innerHTML = `
                <div class="story-archive-sheet-backdrop" data-close-story-archive="1"></div>
                <div class="story-archive-sheet-panel">
                    <div class="story-archive-sheet-handle" aria-hidden="true"></div>
                    <div class="story-archive-sheet-header">
                        <div class="story-archive-sheet-heading">
                            <div class="story-archive-sheet-title" id="story-archive-sheet-title">\u0410\u0440\u0445\u0438\u0432 \u0438\u0441\u0442\u043e\u0440\u0438\u0439</div>
                            <div class="story-archive-sheet-subtitle" id="story-archive-sheet-subtitle">\u0412\u0441\u0435 \u0432\u0430\u0448\u0438 \u0438\u0441\u0442\u043e\u0440\u0438\u0438</div>
                        </div>
                        <button class="story-archive-sheet-close" id="story-archive-sheet-close" type="button" aria-label="\u0417\u0430\u043a\u0440\u044b\u0442\u044c">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                                <path d="M18 6L6 18"></path>
                                <path d="M6 6l12 12"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="story-archive-sheet-list" id="story-archive-sheet-list"></div>
                </div>
            `;
            appRoot.appendChild(archiveSheet);
        }

        if (!document.getElementById('profile-avatar-preview-modal')) {
            const avatarPreviewModal = document.createElement('div');
            avatarPreviewModal.id = 'profile-avatar-preview-modal';
            avatarPreviewModal.className = 'profile-avatar-preview-modal';
            avatarPreviewModal.innerHTML = `
                <div class="profile-avatar-preview-backdrop" data-close-avatar-preview="1"></div>
                <div class="profile-avatar-preview-card" role="dialog" aria-modal="true" aria-labelledby="profile-avatar-preview-title">
                    <button class="profile-avatar-preview-close" id="profile-avatar-preview-close" type="button" aria-label="Закрыть" data-close-avatar-preview="1">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M18 6L6 18"></path>
                            <path d="M6 6l12 12"></path>
                        </svg>
                    </button>
                    <div class="profile-avatar-preview-frame">
                        <img id="profile-avatar-preview-image" src="assets/default-avatar.svg" alt="Фото профиля">
                    </div>
                    <div class="profile-avatar-preview-meta">
                        <div class="profile-avatar-preview-title" id="profile-avatar-preview-title">Профиль</div>
                        <div class="profile-avatar-preview-handle" id="profile-avatar-preview-handle">@user</div>
                    </div>
                </div>
            `;
            appRoot.appendChild(avatarPreviewModal);
        }

        if (!document.getElementById('live-sheet')) {
            const liveSheet = document.createElement('div');
            liveSheet.id = 'live-sheet';
            liveSheet.className = 'bottom-sheet';
            liveSheet.innerHTML = `
                <div class="sheet-header">
                    <h4>РџСЂСЏРјС‹Рµ СЌС„РёСЂС‹</h4>
                    <button class="close-sheet" id="close-live-sheet">вњ•</button>
                </div>
                <div class="live-sheet-content">
                    <div class="live-create-row">
                        <input type="text" id="live-title-input" class="form-input" placeholder="РќР°Р·РІР°РЅРёРµ СЌС„РёСЂР°" maxlength="80">
                        <button type="button" class="primary-btn" id="live-start-btn">РЎС‚Р°СЂС‚</button>
                    </div>
                    <button type="button" class="secondary-btn live-refresh-btn" id="live-refresh-btn">РћР±РЅРѕРІРёС‚СЊ СЃРїРёСЃРѕРє</button>
                    <div class="live-sheet-list" id="live-sheet-list">
                        <div class="live-sessions-empty">РЎРµР№С‡Р°СЃ РЅРµС‚ Р°РєС‚РёРІРЅС‹С… СЌС„РёСЂРѕРІ</div>
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

    escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    setElementHidden(target, hidden = true) {
        const element = typeof target === 'string' ? document.getElementById(target) : target;
        if (!element || !element.classList) return null;
        element.classList.toggle('is-hidden-default', !!hidden);
        return element;
    }

    isElementHidden(target) {
        const element = typeof target === 'string' ? document.getElementById(target) : target;
        if (!element || !element.classList) return true;
        return element.classList.contains('is-hidden-default');
    }

    setAuthFormMode(mode = 'login') {
        this.setElementHidden('login-form', mode !== 'login');
        this.setElementHidden('register-form', mode !== 'register');
    }

    setSearchEmptyMessage(message = 'Начните печатать для поиска') {
        if (!this.searchEmpty) return;
        this.searchEmpty.innerHTML = `
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.5">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
            </svg>
            <p class="search-empty-text">${this.escapeHtml(message)}</p>
        `;
    }

    renderUserLabel(name, verified = false) {
        const safeName = this.escapeHtml(name || 'user');
        const badge = AdvancedViewRenderer.getVerifiedBadge(verified);
        return `<span style="display:inline-flex;align-items:center;gap:6px;">@${safeName}${badge}</span>`;
    }

    updateProfileDisplayNameUi(rawName = '', isVerified = false) {
        const nameEl = document.getElementById('profile-display-name');
        if (nameEl) {
            const normalized = String(rawName || '').replace(/^@+/, '').trim();
            nameEl.textContent = normalized || 'guest';
            nameEl.classList.toggle('is-verified', !!isVerified);
        }

        const badgeEl = document.getElementById('profile-display-verified-badge');
        if (badgeEl) {
            badgeEl.style.display = isVerified ? 'inline-block' : 'none';
            badgeEl.setAttribute('aria-hidden', isVerified ? 'false' : 'true');
        }
    }

    setProfileTopHandle(rawName = '') {
        const handleEl = document.getElementById('profile-top-handle');
        if (!handleEl) return;
        const normalized = String(rawName || '').replace(/^@+/, '').trim();
        handleEl.textContent = normalized || 'guest';
    }

    setProfileViewMode(mode = 'guest') {
        const profileView = document.getElementById('profile-view');
        if (!profileView) return;
        profileView.dataset.profileMode = mode || 'guest';
    }

    getCurrentProfileIdentity() {
        const current = (typeof firebaseService !== 'undefined'
            && firebaseService
            && typeof firebaseService.getCurrentUser === 'function')
            ? firebaseService.getCurrentUser()
            : (this.dataService && typeof this.dataService.getCurrentUser === 'function'
                ? this.dataService.getCurrentUser()
                : null);
        const profileUid = this.state && this.state.viewingProfileUid
            ? String(this.state.viewingProfileUid)
            : (current && current.uid ? String(current.uid) : '');
        const handleSource = this.state && this.state.viewingProfileUid
            ? (document.getElementById('profile-name')?.textContent || '')
            : ((current && current.name) || (document.getElementById('profile-name')?.textContent || ''));
        const handle = String(handleSource || '').replace(/^@+/, '').trim() || 'user';
        const displayName = String(document.getElementById('profile-display-name')?.textContent || '').trim() || handle;
        return { profileUid, handle, displayName };
    }

    getCurrentProfileStoryGroup(profileUid = '') {
        const targetUid = String(profileUid || '').trim();
        if (!targetUid) return null;
        return (Array.isArray(this.storiesByAuthor) ? this.storiesByAuthor : [])
            .find((group) => String(group && group.uid ? group.uid : '') === targetUid) || null;
    }

    getCurrentUidSafe() {
        if (typeof firebaseService !== 'undefined'
            && firebaseService
            && typeof firebaseService.getCurrentUid === 'function') {
            return firebaseService.getCurrentUid();
        }

        const current = this.dataService && typeof this.dataService.getCurrentUser === 'function'
            ? this.dataService.getCurrentUser()
            : null;
        return current && current.uid ? String(current.uid) : null;
    }

    resetProfileStoryCollectionsUi() {
        if (this.profileHighlightsList) {
            this.profileHighlightsList.innerHTML = '';
        }
        if (this.profileHighlightsEmpty) {
            this.profileHighlightsEmpty.textContent = '';
            this.setElementHidden(this.profileHighlightsEmpty, true);
        }
        if (this.profileStoryArchiveBtn) {
            this.setElementHidden(this.profileStoryArchiveBtn, true);
        }
        if (this.profileHighlightsSection) {
            this.setElementHidden(this.profileHighlightsSection, true);
            this.profileHighlightsSection.dataset.profileUid = '';
        }
    }

    async getStoryArchive(uid, { force = false, limit = 60 } = {}) {
        const targetUid = String(uid || '').trim();
        if (!targetUid) return [];

        if (!force && Array.isArray(this.storyArchiveCache[targetUid])) {
            return this.storyArchiveCache[targetUid].slice();
        }

        if (!(firebaseService
            && typeof firebaseService.isInitialized === 'function'
            && firebaseService.isInitialized()
            && typeof firebaseService.getUserStoryArchive === 'function')) {
            return [];
        }

        const archive = await firebaseService.getUserStoryArchive(targetUid, limit);
        this.storyArchiveCache[targetUid] = Array.isArray(archive) ? archive.slice() : [];
        return this.storyArchiveCache[targetUid].slice();
    }

    invalidateStoryArchive(uid = '') {
        const targetUid = String(uid || '').trim();
        if (!targetUid) return;
        delete this.storyArchiveCache[targetUid];
    }

    buildStoryPreviewMedia(story = {}, { className = '', muted = false } = {}) {
        const safeUrl = this.escapeHtml(story.mediaUrl || '');
        if (!safeUrl) {
            return `<div class="${className} is-fallback">\u0418\u0441\u0442\u043e\u0440\u0438\u044f</div>`;
        }

        const mime = String(story.mediaMime || '').toLowerCase();
        if (mime.startsWith('video/')) {
            return `<video class="${className}" src="${safeUrl}" preload="metadata" playsinline ${muted ? 'muted' : ''}></video>`;
        }

        return `<img class="${className}" src="${safeUrl}" alt="\u0418\u0441\u0442\u043e\u0440\u0438\u044f" loading="lazy">`;
    }

    renderProfileHighlights(highlights = [], { isOwn = false, profileUid = '' } = {}) {
        if (!this.profileHighlightsSection || !this.profileHighlightsList) return;

        const list = Array.isArray(highlights) ? highlights.filter(Boolean) : [];
        this.profileHighlightsSection.dataset.profileUid = String(profileUid || '');
        this.profileHighlightsSection.dataset.isOwn = isOwn ? '1' : '0';
        this.profileHighlightsList.innerHTML = '';

        if (this.profileStoryArchiveBtn) {
            this.setElementHidden(this.profileStoryArchiveBtn, !isOwn);
        }

        if (!list.length) {
            if (isOwn) {
                if (this.profileHighlightsEmpty) {
                    this.profileHighlightsEmpty.textContent = '\u0410\u0440\u0445\u0438\u0432 \u0438\u0441\u0442\u043e\u0440\u0438\u0439 \u0433\u043e\u0442\u043e\u0432. \u0414\u043e\u0431\u0430\u0432\u043b\u044f\u0439\u0442\u0435 \u043b\u0443\u0447\u0448\u0438\u0435 \u0438\u0441\u0442\u043e\u0440\u0438\u0438 \u0432 \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0435.';
                    this.setElementHidden(this.profileHighlightsEmpty, false);
                }
                this.setElementHidden(this.profileHighlightsSection, false);
                return;
            }

            if (this.profileHighlightsEmpty) {
                this.setElementHidden(this.profileHighlightsEmpty, true);
            }
            this.setElementHidden(this.profileHighlightsSection, true);
            return;
        }

        const fragment = document.createDocumentFragment();
        list.forEach((story) => {
            const chip = document.createElement('button');
            chip.type = 'button';
            chip.className = 'profile-highlight-chip';
            chip.dataset.storyId = String(story.id || '');
            chip.innerHTML = `
                <span class="profile-highlight-thumb">
                    ${this.buildStoryPreviewMedia(story, { className: 'profile-highlight-media', muted: true })}
                </span>
                <span class="profile-highlight-label">${this.escapeHtml(String(story.caption || '\u0418\u0441\u0442\u043e\u0440\u0438\u044f').slice(0, 24))}</span>
            `;
            fragment.appendChild(chip);
        });

        this.profileHighlightsList.appendChild(fragment);
        if (this.profileHighlightsEmpty) {
            this.setElementHidden(this.profileHighlightsEmpty, true);
        }
        this.setElementHidden(this.profileHighlightsSection, false);
    }

    async refreshProfileStoryCollections({ force = false, profileUid = null, isOwn = null } = {}) {
        const resolvedUid = String(profileUid || this.getCurrentProfileIdentity().profileUid || '').trim();
        const resolvedOwn = typeof isOwn === 'boolean'
            ? isOwn
            : !!(this.profileViewContext && this.profileViewContext.isOwn && String(this.profileViewContext.profileUid || '') === resolvedUid);

        if (!resolvedUid) {
            this.resetProfileStoryCollectionsUi();
            return;
        }

        this.profileStoryCollectionsRequestId = (this.profileStoryCollectionsRequestId || 0) + 1;
        const requestId = this.profileStoryCollectionsRequestId;

        let archive = [];
        try {
            archive = await this.getStoryArchive(resolvedUid, { force, limit: 80 });
        } catch (error) {
            console.error('\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0430\u0440\u0445\u0438\u0432\u0430 \u0438\u0441\u0442\u043e\u0440\u0438\u0439:', error);
            archive = [];
        }

        if (this.profileStoryCollectionsRequestId !== requestId) return;

        const highlights = archive
            .filter((story) => story && story.highlighted === true)
            .sort((a, b) => {
                const left = parseInt(a.highlightedAt || a.createdAt, 10) || 0;
                const right = parseInt(b.highlightedAt || b.createdAt, 10) || 0;
                return right - left;
            })
            .slice(0, 12);

        this.renderProfileHighlights(highlights, {
            isOwn: resolvedOwn,
            profileUid: resolvedUid
        });
    }

    syncProfileAvatarStoryState({ clear = false } = {}) {
        const avatarWrap = this.profileAvatarWrap || document.querySelector('#profile-view .profile-avatar-wrap');
        const avatarImg = this.profileAvatarImg || document.getElementById('profile-avatar-img');
        if (!avatarWrap || !avatarImg) return;

        const identity = clear
            ? { profileUid: '', handle: 'user', displayName: 'Профиль' }
            : this.getCurrentProfileIdentity();
        const storyGroup = !clear ? this.getCurrentProfileStoryGroup(identity.profileUid) : null;
        const activeStories = Array.isArray(storyGroup && storyGroup.stories) ? storyGroup.stories : [];
        const hasStory = activeStories.length > 0;
        const hasUnseen = hasStory && activeStories.some((story) => !this.hasStorySeen(story && story.id ? story.id : ''));
        const previewSrc = clear ? '' : (avatarImg.currentSrc || avatarImg.src || '');

        avatarWrap.classList.toggle('has-story', hasStory);
        avatarWrap.classList.toggle('has-unseen-story', hasUnseen);
        avatarWrap.classList.toggle('has-seen-story', hasStory && !hasUnseen);
        avatarWrap.dataset.storyUid = hasStory ? identity.profileUid : '';
        avatarWrap.dataset.profileHandle = identity.handle || 'user';
        avatarWrap.dataset.profileDisplayName = identity.displayName || identity.handle || 'Профиль';
        avatarWrap.dataset.previewSrc = previewSrc;
        avatarWrap.dataset.canPreview = previewSrc ? '1' : '0';
        avatarWrap.dataset.suppressClick = '0';
        avatarWrap.tabIndex = hasStory ? 0 : -1;
        avatarWrap.setAttribute('role', hasStory ? 'button' : 'img');
        avatarWrap.setAttribute(
            'aria-label',
            hasStory
                ? `Открыть историю ${identity.displayName || identity.handle || 'профиля'}`
                : 'Фото профиля'
        );
    }

    ensureProfileAvatarPreviewModal() {
        if (!this.profileAvatarPreviewModal) {
            this.profileAvatarPreviewModal = document.getElementById('profile-avatar-preview-modal');
            this.profileAvatarPreviewImage = document.getElementById('profile-avatar-preview-image');
            this.profileAvatarPreviewTitle = document.getElementById('profile-avatar-preview-title');
            this.profileAvatarPreviewHandle = document.getElementById('profile-avatar-preview-handle');
            this.profileAvatarPreviewCloseBtn = document.getElementById('profile-avatar-preview-close');
        }

        const modal = this.profileAvatarPreviewModal;
        if (!modal) return null;

        if (modal.dataset.bound !== '1') {
            modal.dataset.bound = '1';
            modal.addEventListener('click', (event) => {
                const shouldClose = event.target === modal
                    || (event.target && event.target.closest
                        ? event.target.closest('[data-close-avatar-preview="1"]')
                        : null);
                if (shouldClose) {
                    this.closeProfileAvatarPreview();
                }
            });
        }

        if (!this.profileAvatarPreviewEscapeBound) {
            this.profileAvatarPreviewEscapeBound = true;
            document.addEventListener('keydown', (event) => {
                if (event.key !== 'Escape') return;
                if (!this.profileAvatarPreviewModal || !this.profileAvatarPreviewModal.classList.contains('open')) return;
                this.closeProfileAvatarPreview();
            });
        }

        return modal;
    }

    openProfileAvatarPreview() {
        const avatarWrap = this.profileAvatarWrap || document.querySelector('#profile-view .profile-avatar-wrap');
        const modal = this.ensureProfileAvatarPreviewModal();
        if (!avatarWrap || !modal) return;

        const src = String(avatarWrap.dataset.previewSrc || this.profileAvatarImg?.currentSrc || this.profileAvatarImg?.src || '').trim();
        if (!src) return;

        const title = String(avatarWrap.dataset.profileDisplayName || 'Профиль').trim() || 'Профиль';
        const handle = String(avatarWrap.dataset.profileHandle || '').replace(/^@+/, '').trim();

        if (this.profileAvatarPreviewImage) {
            this.profileAvatarPreviewImage.src = src;
            this.profileAvatarPreviewImage.alt = title;
        }
        if (this.profileAvatarPreviewTitle) {
            this.profileAvatarPreviewTitle.textContent = title;
        }
        if (this.profileAvatarPreviewHandle) {
            this.profileAvatarPreviewHandle.textContent = handle ? `@${handle}` : '';
        }

        modal.classList.add('open');
        document.body.classList.add('profile-avatar-preview-open');
    }

    closeProfileAvatarPreview() {
        const modal = this.profileAvatarPreviewModal || document.getElementById('profile-avatar-preview-modal');
        if (!modal) return;
        modal.classList.remove('open');
        document.body.classList.remove('profile-avatar-preview-open');
    }

    renderProfileGridPlaceholders(gridEl) {
        if (!gridEl) return;
        const isOwn = !!(this.profileViewContext && this.profileViewContext.isOwn);
        const tones = ['cool', 'warm', 'violet', 'neutral', 'cool', 'warm'];
        gridEl.innerHTML = tones.map((tone, index) => `
            <div class="profile-grid-placeholder${isOwn && index === 0 ? ' is-upload' : ''}" ${isOwn && index === 0 ? 'data-action="upload"' : ''} data-tone="${tone}">
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M8 6.5v11l9-5.5-9-5.5z" fill="currentColor"/>
                </svg>
                <span class="profile-grid-placeholder-badge">${isOwn && index === 0 ? 'Новый ролик' : 'Видео'}</span>
            </div>
        `).join('');

        const uploadPlaceholder = gridEl.querySelector('.profile-grid-placeholder[data-action="upload"]');
        if (uploadPlaceholder) {
            const openUpload = () => this.navigateTo('upload-view');
            uploadPlaceholder.addEventListener('click', openUpload);
            uploadPlaceholder.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                openUpload();
            });
            uploadPlaceholder.tabIndex = 0;
            uploadPlaceholder.setAttribute('role', 'button');
            uploadPlaceholder.setAttribute('aria-label', 'Загрузить новое видео');
        }
    }

    getVideoStorageId(video) {
        if (!video || typeof video !== 'object') return '';
        const firestoreId = String(video.firestoreId || '').trim();
        if (firestoreId) return `f:${firestoreId}`;
        const videoId = String(video.id || '').trim();
        if (videoId) return `i:${videoId}`;
        return '';
    }

    getSavedVideosStorageKey() {
        const current = (typeof firebaseService !== 'undefined' && firebaseService && firebaseService.getCurrentUser)
            ? firebaseService.getCurrentUser()
            : null;
        const uid = current && current.uid ? String(current.uid) : 'guest';
        return `${this.savedVideosKey}_${uid}`;
    }

    readSavedVideosStorage() {
        try {
            const raw = localStorage.getItem(this.getSavedVideosStorageKey());
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            if (!Array.isArray(parsed)) return [];
            return parsed.filter((entry) => entry && typeof entry === 'object' && typeof entry.key === 'string');
        } catch (_) {
            return [];
        }
    }

    writeSavedVideosStorage(entries = []) {
        try {
            const safeEntries = Array.isArray(entries)
                ? entries.filter((entry) => entry && typeof entry === 'object' && typeof entry.key === 'string')
                : [];
            localStorage.setItem(this.getSavedVideosStorageKey(), JSON.stringify(safeEntries.slice(0, 400)));
        } catch (_) {}
    }

    createProfileVideoSnapshot(video) {
        if (!video || typeof video !== 'object') return null;
        return {
            id: video.id || Date.now(),
            firestoreId: video.firestoreId || null,
            uid: video.uid || null,
            author: video.author || 'user',
            avatar: video.avatar || 'assets/default-avatar.svg',
            authorVerified: !!video.authorVerified,
            url: video.url || '',
            thumbnail: video.thumbnail || '',
            desc: video.desc || '',
            likes: parseInt(video.likes, 10) || 0,
            commentsCount: Number.isFinite(parseInt(video.commentsCount, 10))
                ? (parseInt(video.commentsCount, 10) || 0)
                : (Array.isArray(video.comments) ? video.comments.length : 0),
            views: parseInt(video.views, 10) || 0,
            shares: parseInt(video.shares, 10) || 0,
            tags: video.tags || '',
            hashtags: Array.isArray(video.hashtags) ? [...video.hashtags] : [],
            filter: video.filter || 'none',
            mediaType: video.mediaType || 'video',
            carouselItems: Array.isArray(video.carouselItems) ? [...video.carouselItems] : [],
            private: video.private === true,
            ageRestricted: video.ageRestricted === true,
            videoTemplate: typeof video.videoTemplate === 'string' ? video.videoTemplate : 'none',
            coverText: typeof video.coverText === 'string' ? video.coverText : '',
            coverSticker: typeof video.coverSticker === 'string' ? video.coverSticker : '',
            coverColor: typeof video.coverColor === 'string' ? video.coverColor : '#1cb8ff',
            timestamp: Number.isFinite(parseInt(video.timestamp, 10)) ? (parseInt(video.timestamp, 10) || Date.now()) : Date.now()
        };
    }

    isVideoSaved(video) {
        const key = this.getVideoStorageId(video);
        if (!key) return false;
        return this.readSavedVideosStorage().some((entry) => entry.key === key);
    }

    toggleSaveVideo(video) {
        const key = this.getVideoStorageId(video);
        if (!key) return false;

        const entries = this.readSavedVideosStorage();
        const index = entries.findIndex((entry) => entry.key === key);
        let saved = false;

        if (index >= 0) {
            entries.splice(index, 1);
            saved = false;
            AdvancedViewRenderer.showToast('Удалено из сохраненных', 'info');
        } else {
            const snapshot = this.createProfileVideoSnapshot(video);
            if (!snapshot) return false;
            entries.unshift({
                key,
                savedAt: Date.now(),
                video: snapshot
            });
            saved = true;
            AdvancedViewRenderer.showToast('Сохранено', 'success');
        }

        this.writeSavedVideosStorage(entries);

        if (this.state.activeViewId === 'profile-view' && this.state.profileGridTab === 'saved') {
            this.renderActiveProfileGrid();
        }
        return saved;
    }

    getSavedProfileVideos() {
        const entries = this.readSavedVideosStorage();
        if (!entries.length) return [];

        const localFeed = Array.isArray(this.dataService?.userVideos) ? this.dataService.userVideos : [];
        const freshByKey = new Map();
        localFeed.forEach((video) => {
            const key = this.getVideoStorageId(video);
            if (key) freshByKey.set(key, video);
        });

        return entries
            .map((entry) => {
                const fresh = freshByKey.get(entry.key);
                const fallback = entry.video && typeof entry.video === 'object' ? entry.video : null;
                const merged = fresh
                    ? this.createProfileVideoSnapshot(fresh)
                    : (fallback ? { ...fallback } : null);
                if (!merged) return null;
                merged.__savedAt = Number.isFinite(parseInt(entry.savedAt, 10)) ? (parseInt(entry.savedAt, 10) || 0) : 0;
                return merged;
            })
            .filter(Boolean)
            .sort((a, b) => (b.__savedAt || 0) - (a.__savedAt || 0));
    }

    getDraftProfileVideos() {
        try {
            const raw = localStorage.getItem(this.uploadDraftKey);
            if (!raw) return [];
            const draft = JSON.parse(raw);
            if (!draft || typeof draft !== 'object') return [];
            const updatedAt = Number.isFinite(parseInt(draft.updatedAt, 10))
                ? (parseInt(draft.updatedAt, 10) || Date.now())
                : Date.now();

            return [{
                id: `draft-${updatedAt}`,
                desc: String(draft.desc || '').trim(),
                tags: String(draft.tags || '').trim(),
                timestamp: updatedAt,
                __tabType: 'draft'
            }];
        } catch (_) {
            return [];
        }
    }

    async getLikedProfileVideos() {
        const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        const uid = current && current.uid ? String(current.uid) : '';

        if (uid
            && firebaseService
            && firebaseService.isInitialized
            && firebaseService.isInitialized()
            && typeof firebaseService.getLikedVideosByUid === 'function') {
            try {
                const liked = await firebaseService.getLikedVideosByUid(uid, { limit: 150 });
                if (Array.isArray(liked)) {
                    return liked;
                }
            } catch (error) {
                console.warn('Не удалось загрузить лайкнутые видео из Firestore:', error?.message || error);
            }
        }

        const fallback = Array.isArray(this.dataService?.userVideos)
            ? this.dataService.userVideos.filter((video) => !!(video && video.isLiked))
            : [];

        return fallback.sort((a, b) => (parseInt(b.timestamp, 10) || 0) - (parseInt(a.timestamp, 10) || 0));
    }

    setProfileGridTab(tab = 'videos', { rerender = true } = {}) {
        const normalized = ['videos', 'saved', 'liked', 'drafts'].includes(tab) ? tab : 'videos';
        this.state.profileGridTab = normalized;

        if (!this.profileMediaTabButtons || !this.profileMediaTabButtons.length) {
            const tabsRoot = document.getElementById('profile-media-tabs');
            this.profileMediaTabButtons = tabsRoot
                ? Array.from(tabsRoot.querySelectorAll('[data-profile-tab]'))
                : [];
        }

        this.profileMediaTabButtons.forEach((btn) => {
            const active = btn.dataset.profileTab === normalized;
            btn.classList.toggle('active', active);
            btn.setAttribute('aria-selected', active ? 'true' : 'false');
        });

        if (rerender) {
            this.renderActiveProfileGrid();
        }
    }

    applyProfileMediaTabsVisibility({ isOwn = true } = {}) {
        const tabsRoot = document.getElementById('profile-media-tabs');
        if (!tabsRoot) return;

        if (!this.profileMediaTabButtons || !this.profileMediaTabButtons.length) {
            this.profileMediaTabButtons = Array.from(tabsRoot.querySelectorAll('[data-profile-tab]'));
        }

        tabsRoot.style.display = isOwn ? 'grid' : 'none';
        tabsRoot.setAttribute('aria-hidden', isOwn ? 'false' : 'true');
        const allowed = isOwn ? new Set(['videos', 'saved', 'liked', 'drafts']) : new Set(['videos']);
        this.profileMediaTabButtons.forEach((btn) => {
            const key = btn.dataset.profileTab;
            const visible = allowed.has(key);
            btn.style.display = visible ? '' : 'none';
            btn.disabled = !visible;
        });

        if (!allowed.has(this.state.profileGridTab)) {
            this.state.profileGridTab = 'videos';
        }
        this.setProfileGridTab(this.state.profileGridTab, { rerender: false });
    }

    renderProfileGridMessage(gridEl, text = '') {
        if (!gridEl) return;
        const safeText = this.escapeHtml(text || '');
        gridEl.innerHTML = `
            <div class="profile-grid-empty" style="grid-column: 1 / -1;">
                <p>${safeText}</p>
            </div>
        `;
    }

    formatProfileDraftTime(timestamp) {
        const value = parseInt(timestamp, 10) || Date.now();
        try {
            return new Date(value).toLocaleString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch (_) {
            return '';
        }
    }

    renderProfileVideoGrid(videos = [], { allowDelete = false, usePlaceholders = false, emptyText = 'Пока пусто' } = {}) {
        const grid = document.getElementById('profile-grid');
        if (!grid) return;

        const list = Array.isArray(videos) ? videos : [];
        if (!list.length) {
            if (usePlaceholders) {
                this.renderProfileGridPlaceholders(grid);
            } else {
                this.renderProfileGridMessage(grid, emptyText);
            }
            return;
        }

        grid.innerHTML = '';

        list.forEach((video) => {
            const gridItem = document.createElement('div');
            gridItem.className = 'grid-item';

            const isDraft = !!(video && video.__tabType === 'draft');
            if (!isDraft) {
                gridItem.dataset.id = video.id;
                if (video.firestoreId) gridItem.dataset.firestoreId = video.firestoreId;
            } else {
                gridItem.classList.add('profile-draft-item');
            }

            const commentsCount = Number.isFinite(parseInt(video?.commentsCount, 10))
                ? (parseInt(video.commentsCount, 10) || 0)
                : (Array.isArray(video?.comments) ? video.comments.length : 0);

            const safeUrl = this.escapeHtml(video?.url || '');
            const safePoster = this.escapeHtml(video?.thumbnail || '');
            const posterAttr = safePoster ? ` poster="${safePoster}"` : '';
            const carouselItems = Array.isArray(video?.carouselItems) ? video.carouselItems : [];
            const isCarousel = !isDraft && (String(video?.mediaType || '') === 'carousel' || carouselItems.length > 0);
            const carouselThumb = carouselItems[0] && carouselItems[0].url
                ? this.escapeHtml(carouselItems[0].url)
                : (safePoster || safeUrl);
            const mediaHtml = isDraft
                ? `<div class="profile-draft-media">
                        <div class="profile-draft-title">Черновик</div>
                        <div class="profile-draft-subtitle">${this.escapeHtml(video?.desc || 'Нажмите, чтобы продолжить редактирование')}</div>
                   </div>`
                : (isCarousel
                    ? `<img src="${carouselThumb}" alt="карусель" loading="lazy">`
                    : (safeUrl
                        ? `<video muted playsinline preload="none" data-src="${safeUrl}"${posterAttr}></video>`
                        : (safePoster
                            ? `<img src="${safePoster}" alt="превью" loading="lazy">`
                            : `<div class="profile-grid-media-fallback">Нет превью</div>`)));

            const overlayContent = isDraft
                ? `<div style="display: flex; align-items: center; justify-content: space-between; gap: 6px; font-size: 11px;">
                        <span>Черновик</span>
                        <span>${this.escapeHtml(this.formatProfileDraftTime(video?.timestamp))}</span>
                   </div>`
                : `<div style="display: flex; align-items: center; gap: 8px; font-size: 11px;">
                        <span>Лайки ${AdvancedViewRenderer.formatNumber(parseInt(video?.likes, 10) || 0)}</span>
                        <span>Комм. ${AdvancedViewRenderer.formatNumber(commentsCount)}</span>
                   </div>`;

            const canDelete = !!(allowDelete && !isDraft && this.canCurrentUserDeleteVideo(video));
            gridItem.innerHTML = `
                ${mediaHtml}
                ${canDelete ? `
                    <button class="grid-delete-btn" type="button" title="Удалить" aria-label="Удалить видео">
                        <svg viewBox="0 0 24 24">
                            <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2zM4 7h16v2H4V7z"></path>
                        </svg>
                    </button>
                ` : ''}
                <div class="grid-overlay">
                    ${overlayContent}
                </div>
            `;

            gridItem.querySelector('.grid-delete-btn')?.addEventListener('click', async (event) => {
                event.stopPropagation();
                const ok = await this.deleteVideoWithConfirm(video);
                if (!ok) return;

                const idx = list.findIndex((v) => this.getVideoStorageId(v) === this.getVideoStorageId(video));
                if (idx !== -1) list.splice(idx, 1);
                if (list.length === 0) {
                    this.renderActiveProfileGrid();
                } else {
                    gridItem.remove();
                }
            });

            gridItem.addEventListener('click', () => {
                if (isDraft) {
                    this.navigateTo('upload-view');
                    this.restoreUploadDraft();
                    AdvancedViewRenderer.showToast('Открыт черновик', 'info');
                    return;
                }

                const playableList = list.filter((item) => !!(item && item.__tabType !== 'draft'));
                const targetKey = this.getVideoStorageId(video);
                const startIndex = playableList.findIndex((item) => this.getVideoStorageId(item) === targetKey);
                if (startIndex < 0) return;
                this.enterCustomFeedMode(playableList, { startIndex, returnViewId: 'profile-view' });
            });

            grid.appendChild(gridItem);
        });

        this.setupProfileGridPreviews(grid);
    }

    async renderActiveProfileGrid() {
        const grid = document.getElementById('profile-grid');
        if (!grid) return;

        const tab = this.state.profileGridTab || 'videos';
        const context = this.profileViewContext || {};
        const isOwn = !!context.isOwn;

        if (!isOwn && tab !== 'videos') {
            this.renderProfileGridMessage(grid, 'Этот раздел доступен только владельцу профиля');
            return;
        }

        if (tab === 'videos') {
            if (context.loading) {
                this.renderProfileGridMessage(grid, 'Загрузка видео...');
                return;
            }
            const emptyText = isOwn ? 'У вас пока нет публикаций' : 'У пользователя пока нет видео';
            this.renderProfileVideoGrid(context.baseVideos || [], {
                allowDelete: isOwn,
                usePlaceholders: isOwn,
                emptyText
            });
            return;
        }

        if (tab === 'saved') {
            this.renderProfileVideoGrid(this.getSavedProfileVideos(), {
                allowDelete: false,
                usePlaceholders: false,
                emptyText: 'Сохраненных видео пока нет'
            });
            return;
        }

        if (tab === 'drafts') {
            this.renderProfileVideoGrid(this.getDraftProfileVideos(), {
                allowDelete: false,
                usePlaceholders: false,
                emptyText: 'Черновиков пока нет'
            });
            return;
        }

        if (tab === 'liked') {
            const requestToken = ++this.profileLikedRequestToken;
            this.renderProfileGridMessage(grid, 'Загрузка лайкнутых...');
            const likedVideos = await this.getLikedProfileVideos();
            if (requestToken !== this.profileLikedRequestToken) return;
            if (this.state.profileGridTab !== 'liked') return;
            this.renderProfileVideoGrid(likedVideos, {
                allowDelete: false,
                usePlaceholders: false,
                emptyText: 'Лайкнутых видео пока нет'
            });
            return;
        }

        this.renderProfileGridMessage(grid, 'Раздел пока недоступен');
    }

    setupVerifiedBadgeInteractions() {
        if (this._verifiedBadgeHandlersBound) return;
        this._verifiedBadgeHandlersBound = true;

        const tryOpenFromBadge = (badge, event) => {
            if (!badge || !badge.classList || !badge.classList.contains('verified-badge')) return;
            if (badge.closest('.verified-info-header')) return;
            if (event) {
                event.preventDefault();
                event.stopPropagation();
                if (typeof event.stopImmediatePropagation === 'function') {
                    event.stopImmediatePropagation();
                }
            }
            this.animateVerifiedBadge(badge);
            this.openVerifiedInfoModal(badge);
        };

        document.addEventListener('click', (event) => {
            const badge = event.target && event.target.closest
                ? event.target.closest('.verified-badge')
                : null;
            if (!badge) return;
            tryOpenFromBadge(badge, event);
        }, true);

        document.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            const active = document.activeElement;
            if (!active || !active.classList || !active.classList.contains('verified-badge')) return;
            tryOpenFromBadge(active, event);
        });
    }

    animateVerifiedBadge(badge) {
        if (!badge || !badge.classList) return;
        badge.classList.remove('verified-badge-spin-pop');
        void badge.offsetWidth;
        badge.classList.add('verified-badge-spin-pop');
        setTimeout(() => {
            badge.classList.remove('verified-badge-spin-pop');
        }, 650);
    }

    ensureVerifiedInfoModal() {
        if (this.verifiedInfoModal && document.body.contains(this.verifiedInfoModal)) {
            return this.verifiedInfoModal;
        }

        const modal = document.createElement('div');
        modal.id = 'verified-info-modal';
        modal.className = 'verified-info-modal';
        modal.setAttribute('aria-hidden', 'true');
        modal.innerHTML = `
            <div class="verified-info-backdrop" data-close-verified="1"></div>
            <div class="verified-info-card" role="dialog" aria-modal="true" aria-labelledby="verified-info-title">
                <button type="button" class="verified-info-close" data-close-verified="1" aria-label="Закрыть">✕</button>
                <div class="verified-info-header">
                    <img class="verified-info-icon" src="assets/verified.png" alt="">
                    <h3 id="verified-info-title">Верифицированный пользователь</h3>
                </div>
                <p class="verified-info-text">
                    Этот значок подтверждает подлинность аккаунта. Платформа проверила, что профиль принадлежит
                    известной личности, бренду или публичному проекту.
                </p>
                <ul class="verified-info-list">
                    <li>Личность или бренд подтверждены.</li>
                    <li>Риск подделки профиля снижен.</li>
                    <li>Проверка периодически обновляется.</li>
                </ul>
                <p class="verified-info-note">
                    Верификация подтверждает подлинность, но не является гарантией качества или одобрения контента.
                </p>
            </div>
        `;

        modal.addEventListener('click', (event) => {
            const closeTarget = event.target && event.target.closest
                ? event.target.closest('[data-close-verified="1"]')
                : null;
            if (!closeTarget) return;
            event.preventDefault();
            this.closeVerifiedInfoModal();
        });

        if (!this._verifiedInfoEscapeBound) {
            this._verifiedInfoEscapeBound = true;
            document.addEventListener('keydown', (event) => {
                if (event.key !== 'Escape') return;
                if (!this.verifiedInfoModal || !this.verifiedInfoModal.classList.contains('open')) return;
                this.closeVerifiedInfoModal();
            });
        }

        document.body.appendChild(modal);
        this.verifiedInfoModal = modal;
        return modal;
    }

    openVerifiedInfoModal(triggerBadge = null) {
        const modal = this.ensureVerifiedInfoModal();
        if (!modal) return;

        this.verifiedInfoLastTrigger = triggerBadge || null;
        modal.classList.add('open');
        modal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('verified-info-open');

        const closeBtn = modal.querySelector('.verified-info-close');
        if (closeBtn && typeof closeBtn.focus === 'function') {
            setTimeout(() => closeBtn.focus(), 20);
        }
    }

    closeVerifiedInfoModal() {
        const modal = this.verifiedInfoModal || document.getElementById('verified-info-modal');
        if (!modal) return;
        if (!modal.classList.contains('open')) return;

        modal.classList.remove('open');
        modal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('verified-info-open');

        const trigger = this.verifiedInfoLastTrigger;
        if (trigger && typeof trigger.focus === 'function') {
            trigger.focus();
        }
        this.verifiedInfoLastTrigger = null;
    }

    syncUserMetaInUi(profile) {
        const user = profile || {};
        const uid = user && user.uid ? String(user.uid) : null;
        if (!uid) return;

        const name = typeof user.name === 'string' ? user.name : null;
        const displayName = typeof user.displayName === 'string' ? user.displayName : null;
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

        // Keep stories strip and active story queue in sync with profile edits.
        if (Array.isArray(this.storiesByAuthor)) {
            this.storiesByAuthor = this.storiesByAuthor.map((group) => {
                if (!group || String(group.uid || '') !== uid) return group;
                const nextGroup = { ...group };
                if (name) nextGroup.author = name;
                if (displayName) nextGroup.displayName = displayName;
                if (avatar) nextGroup.avatar = avatar;
                if (Array.isArray(nextGroup.stories)) {
                    nextGroup.stories = nextGroup.stories.map((story) => {
                        if (!story) return story;
                        return {
                            ...story,
                            author: name || story.author,
                            displayName: displayName || story.displayName || story.author,
                            avatar: avatar || story.avatar
                        };
                    });
                }
                return nextGroup;
            });
            this.renderStoriesStrip();
        }

        if (Array.isArray(this.activeStoryQueue) && this.activeStoryQueue.length) {
            this.activeStoryQueue = this.activeStoryQueue.map((story) => {
                if (!story || String(story.uid || '') !== uid) return story;
                return {
                    ...story,
                    author: name || story.author,
                    displayName: displayName || story.displayName || story.author,
                    avatar: avatar || story.avatar
                };
            });
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
                musicSpan.textContent = `РћСЂРёРіРёРЅР°Р»СЊРЅС‹Р№ Р·РІСѓРє - ${name}`;
            }
        });
    }

    // ==================== РќРђР”РЃР–РќР«Р™ РџР•Р Р•РљР›Р®Р§РђРўР•Р›Р¬ Р¤РћР Рњ ====================
    setupAuthSwitchListeners() {
        console.log('рџ”„ РџРµСЂРµРїРѕРґРєР»СЋС‡Р°РµРј РїРµСЂРµРєР»СЋС‡Р°С‚РµР»Рё С„РѕСЂРј');
        const switchToReg = document.getElementById('switch-to-reg');
        const switchToLogin = document.getElementById('switch-to-login');

        if (switchToReg) {
            switchToReg.onclick = (e) => {
                if (e && typeof e.preventDefault === 'function') e.preventDefault();
                this.setAuthFormMode('register');
            };
        }
        if (switchToLogin) {
            switchToLogin.onclick = (e) => {
                if (e && typeof e.preventDefault === 'function') e.preventDefault();
                this.setAuthFormMode('login');
            };
        }
    }

    setupTheme() {
        const theme = this.dataService.settings.theme;
        this.state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        
        const themeText = document.getElementById('theme-text');
        themeText.textContent = theme === 'dark'
            ? '\u0421\u0432\u0435\u0442\u043b\u0430\u044f \u0442\u0435\u043c\u0430'
            : '\u0422\u0435\u043c\u043d\u0430\u044f \u0442\u0435\u043c\u0430';
        
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
            themeText.textContent = newTheme === 'dark'
                ? '\u0421\u0432\u0435\u0442\u043b\u0430\u044f \u0442\u0435\u043c\u0430'
                : '\u0422\u0435\u043c\u043d\u0430\u044f \u0442\u0435\u043c\u0430';
            
            AdvancedViewRenderer.showToast(
                `\u0422\u0435\u043c\u0430 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0430: ${newTheme === 'dark' ? '\u0442\u0435\u043c\u043d\u0430\u044f' : '\u0441\u0432\u0435\u0442\u043b\u0430\u044f'}`,
                'success'
            );
            this.hamburgerBtn.classList.remove('active');
            this.menuDropdown.classList.remove('active');
        });
        
        this.logoutMenu.addEventListener('click', async () => {
            if (confirm('\u0412\u044b \u0443\u0432\u0435\u0440\u0435\u043d\u044b, \u0447\u0442\u043e \u0445\u043e\u0442\u0438\u0442\u0435 \u0432\u044b\u0439\u0442\u0438 \u0438\u0437 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430?')) {
                try {
                    const ready = await waitForFirebaseService(5000);
                    if (!ready || !firebaseService || !firebaseService.isInitialized()) {
                        throw new Error('Firebase \u043d\u0435 \u0433\u043e\u0442\u043e\u0432.');
                    }
                    await firebaseService.logout();
                    AdvancedViewRenderer.showToast('\u0412\u044b \u0432\u044b\u0448\u043b\u0438 \u0438\u0437 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430', 'success');
                    this.navigateTo('auth-view');
                } catch (error) {
                    AdvancedViewRenderer.showToast('\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0432\u044b\u0445\u043e\u0434\u0435: ' + error.message, 'error');
                }
            }
        });
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
                    AdvancedViewRenderer.showToast('Firebase РµС‰Рµ РЅРµ РіРѕС‚РѕРІ', 'warning');
                    return;
                }
                if (typeof firebaseService.revokeOtherSessions !== 'function') {
                    AdvancedViewRenderer.showToast('API СѓРїСЂР°РІР»РµРЅРёСЏ СЃРµСЃСЃРёСЏРјРё РЅРµРґРѕСЃС‚СѓРїРµРЅ', 'warning');
                    return;
                }

                const ok = confirm('Р—Р°РІРµСЂС€РёС‚СЊ РІСЃРµ РґСЂСѓРіРёРµ СЃРµР°РЅСЃС‹ РЅР° СѓСЃС‚СЂРѕР№СЃС‚РІР°С…?');
                if (!ok) return;

                const btn = this.securityLogoutOthersBtn;
                const prev = btn.textContent;
                btn.disabled = true;
                btn.textContent = 'Р—Р°РІРµСЂС€Р°РµРј...';
                try {
                    const revoked = await firebaseService.revokeOtherSessions();
                    await this.loadSecuritySessions({ showToast: false });
                    AdvancedViewRenderer.showToast(
                        revoked > 0 ? `Р—Р°РІРµСЂС€РµРЅРѕ СЃРµР°РЅСЃРѕРІ: ${revoked}` : 'Р”СЂСѓРіРёС… Р°РєС‚РёРІРЅС‹С… СЃРµР°РЅСЃРѕРІ РЅРµ РЅР°Р№РґРµРЅРѕ',
                        'success'
                    );
                } catch (error) {
                    console.error(error);
                    AdvancedViewRenderer.showToast(error?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РІРµСЂС€РёС‚СЊ СЃРµР°РЅСЃС‹', 'error');
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
                    AdvancedViewRenderer.showToast('РЎРµР°РЅСЃ Р·Р°РІРµСЂС€РµРЅ', 'success');
                } catch (error) {
                    console.error(error);
                    AdvancedViewRenderer.showToast(error?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РІРµСЂС€РёС‚СЊ СЃРµР°РЅСЃ', 'error');
                } finally {
                    revokeBtn.disabled = false;
                }
            });
        }
    }

    formatRelativeTime(timestamp) {
        const normalized = this.normalizeTimestampValue(timestamp);
        if (!normalized) return 'С‚РѕР»СЊРєРѕ С‡С‚Рѕ';

        const diff = Date.now() - normalized;
        if (diff < 60 * 1000) return 'С‚РѕР»СЊРєРѕ С‡С‚Рѕ';
        if (diff < 60 * 60 * 1000) return `${Math.floor(diff / (60 * 1000))} РјРёРЅ РЅР°Р·Р°Рґ`;
        if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / (60 * 60 * 1000))} С‡ РЅР°Р·Р°Рґ`;
        if (diff < 7 * 24 * 60 * 60 * 1000) return `${Math.floor(diff / (24 * 60 * 60 * 1000))} РґРЅ РЅР°Р·Р°Рґ`;
        return new Date(normalized).toLocaleDateString('ru-RU');
    }

    async loadSecuritySessions({ showToast = false } = {}) {
        if (!this.securitySessionList || !this.securityCurrentDevice) return;

        const currentUser = this.dataService.getCurrentUser();
        if (!currentUser) {
            this.securityCurrentDevice.textContent = 'РЎРЅР°С‡Р°Р»Р° РІРѕР№РґРёС‚Рµ РІ Р°РєРєР°СѓРЅС‚';
            this.securitySessionList.innerHTML = '<div class="security-empty">РќРµС‚ Р°РєС‚РёРІРЅРѕРіРѕ Р°РєРєР°СѓРЅС‚Р°</div>';
            if (this.securitySessionCount) this.securitySessionCount.textContent = '0';
            return;
        }

        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) {
            this.securityCurrentDevice.textContent = 'РћР¶РёРґР°РЅРёРµ РїРѕРґРєР»СЋС‡РµРЅРёСЏ Firebase...';
            this.securitySessionList.innerHTML = '<div class="security-empty">РЎРїРёСЃРѕРє СЃРµР°РЅСЃРѕРІ РІСЂРµРјРµРЅРЅРѕ РЅРµРґРѕСЃС‚СѓРїРµРЅ</div>';
            if (this.securitySessionCount) this.securitySessionCount.textContent = '0';
            return;
        }
        if (typeof firebaseService.getUserSessions !== 'function') {
            this.securitySessionList.innerHTML = '<div class="security-empty">API СЃРµР°РЅСЃРѕРІ РЅРµРґРѕСЃС‚СѓРїРµРЅ</div>';
            if (this.securitySessionCount) this.securitySessionCount.textContent = '0';
            return;
        }

        this.securitySessionList.innerHTML = '<div class="security-empty">Р—Р°РіСЂСѓР·РєР° СѓСЃС‚СЂРѕР№СЃС‚РІ...</div>';

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
                    <div class="security-device-title">${this.escapeHtml(current.deviceName || 'РўРµРєСѓС‰РµРµ СѓСЃС‚СЂРѕР№СЃС‚РІРѕ')}</div>
                    <div class="security-device-sub">${this.escapeHtml(current.platform || 'РџР»Р°С‚С„РѕСЂРјР° РЅРµ РѕРїСЂРµРґРµР»РµРЅР°')} вЂў ${this.escapeHtml(lastActiveText)}</div>
                `;
            } else {
                this.securityCurrentDevice.textContent = 'РЈСЃС‚СЂРѕР№СЃС‚РІРѕ РЅРµ РѕРїСЂРµРґРµР»РµРЅРѕ';
            }

            this.securitySessionList.innerHTML = '';
            if (!list.length) {
                this.securitySessionList.innerHTML = '<div class="security-empty">РЎРµР°РЅСЃС‹ РЅРµ РЅР°Р№РґРµРЅС‹</div>';
                if (showToast) AdvancedViewRenderer.showToast('РЎРµР°РЅСЃС‹ РЅРµ РЅР°Р№РґРµРЅС‹', 'info');
                return;
            }

            list.forEach((row) => {
                const item = document.createElement('div');
                item.className = `security-session-row${row.isCurrent ? ' is-current' : ''}`;
                const activeText = row.online ? 'РІ СЃРµС‚Рё' : `Р°РєС‚РёРІРЅРѕСЃС‚СЊ ${this.formatRelativeTime(row.lastActive || row.updatedAt)}`;
                const pill = row.isCurrent
                    ? '<span class="security-session-pill">РўРµРєСѓС‰РёР№</span>'
                    : `<button type="button" class="security-session-revoke" data-session-id="${this.escapeHtml(String(row.sessionId || ''))}">Р—Р°РІРµСЂС€РёС‚СЊ</button>`;

                item.innerHTML = `
                    <div class="security-session-main">
                        <div class="security-session-title">${this.escapeHtml(row.deviceName || 'РЈСЃС‚СЂРѕР№СЃС‚РІРѕ')}</div>
                        <div class="security-session-sub">${this.escapeHtml(activeText)}</div>
                    </div>
                    ${pill}
                `;
                this.securitySessionList.appendChild(item);
            });

            if (showToast) {
                AdvancedViewRenderer.showToast(`РЎРµР°РЅСЃРѕРІ Р·Р°РіСЂСѓР¶РµРЅРѕ: ${list.length}`, 'success');
            }
        } catch (error) {
            console.error('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё СЃРµР°РЅСЃРѕРІ Р±РµР·РѕРїР°СЃРЅРѕСЃС‚Рё:', error);
            this.securitySessionList.innerHTML = '<div class="security-empty">РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ СЃРµР°РЅСЃС‹</div>';
            if (showToast) {
                AdvancedViewRenderer.showToast(error?.message || 'РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё СЃРµР°РЅСЃРѕРІ', 'error');
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

        if (this.profileHighlightsList && this.profileHighlightsList.dataset.bound !== '1') {
            this.profileHighlightsList.dataset.bound = '1';
            this.profileHighlightsList.addEventListener('click', async (event) => {
                const chip = event.target && event.target.closest
                    ? event.target.closest('.profile-highlight-chip[data-story-id]')
                    : null;
                if (!chip) return;
                const storyId = String(chip.dataset.storyId || '').trim();
                const profileUid = this.profileHighlightsSection
                    ? String(this.profileHighlightsSection.dataset.profileUid || '').trim()
                    : '';
                if (!storyId || !profileUid) return;
                await this.openProfileHighlightStory(profileUid, storyId);
            });
        }

        if (this.profileStoryArchiveBtn && this.profileStoryArchiveBtn.dataset.bound !== '1') {
            this.profileStoryArchiveBtn.dataset.bound = '1';
            this.profileStoryArchiveBtn.addEventListener('click', async () => {
                const identity = this.getCurrentProfileIdentity();
                const profileUid = String(identity.profileUid || '').trim();
                if (!profileUid) return;
                await this.openStoryArchiveSheet(profileUid, { force: true });
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

        if (this.storyViewerHighlightBtn && this.storyViewerHighlightBtn.dataset.bound !== '1') {
            this.storyViewerHighlightBtn.dataset.bound = '1';
            this.storyViewerHighlightBtn.addEventListener('click', async () => {
                await this.toggleCurrentStoryHighlight();
            });
        }

        if (this.storyViewerDeleteBtn && this.storyViewerDeleteBtn.dataset.bound !== '1') {
            this.storyViewerDeleteBtn.dataset.bound = '1';
            this.storyViewerDeleteBtn.addEventListener('click', async () => {
                await this.deleteCurrentStory();
            });
        }

        if (this.storyViewerReplySendBtn && this.storyViewerReplySendBtn.dataset.bound !== '1') {
            this.storyViewerReplySendBtn.dataset.bound = '1';
            this.storyViewerReplySendBtn.addEventListener('click', async () => {
                await this.sendStoryReplyFromViewer();
            });
        }

        if (this.storyViewerReplyInput && this.storyViewerReplyInput.dataset.bound !== '1') {
            this.storyViewerReplyInput.dataset.bound = '1';
            this.storyViewerReplyInput.addEventListener('keydown', async (event) => {
                if (event.key !== 'Enter') return;
                event.preventDefault();
                await this.sendStoryReplyFromViewer();
            });
            this.storyViewerReplyInput.addEventListener('focus', () => this.pauseStoryAutoplay());
            this.storyViewerReplyInput.addEventListener('blur', () => {
                if (this.storyViewerModal && this.storyViewerModal.classList.contains('open')) {
                    this.resumeStoryAutoplay();
                }
            });
        }

        if (this.storyArchiveSheet && this.storyArchiveSheet.dataset.bound !== '1') {
            this.storyArchiveSheet.dataset.bound = '1';
            this.storyArchiveSheet.addEventListener('click', async (event) => {
                const closeTrigger = event.target && event.target.closest
                    ? event.target.closest('[data-close-story-archive="1"], #story-archive-sheet-close')
                    : null;
                if (closeTrigger || event.target === this.storyArchiveSheet) {
                    this.closeStoryArchiveSheet();
                    return;
                }

                const item = event.target && event.target.closest
                    ? event.target.closest('.story-archive-item[data-story-id]')
                    : null;
                if (!item) return;
                const storyId = String(item.dataset.storyId || '').trim();
                const profileUid = String(item.dataset.storyUid || '').trim();
                if (!storyId || !profileUid) return;
                this.closeStoryArchiveSheet();
                await this.openStoryArchive(profileUid, { startStoryId: storyId, force: true });
            });
        }

        if (this.storyViewerStage && this.storyViewerStage.dataset.bound !== '1') {
            this.storyViewerStage.dataset.bound = '1';
            const isInteractiveTarget = (target) => {
                if (!target || !target.closest) return false;
                return !!target.closest('button, a, input, textarea, [data-no-story-nav="1"]');
            };
            const finishPress = (event) => {
                const press = this.storyPressState;
                if (!press) return;
                if (event && typeof event.pointerId === 'number' && press.pointerId !== event.pointerId) return;
                this.storyPressState = null;
                this.resumeStoryAutoplay();

                if (!event || press.moved) return;
                const elapsed = Date.now() - press.startedAt;
                if (elapsed > 260) return;
                const rect = this.storyViewerStage.getBoundingClientRect();
                if (!rect || !rect.width) return;
                const ratio = (event.clientX - rect.left) / rect.width;
                if (ratio <= 0.36) {
                    this.stepStory(-1);
                } else if (ratio >= 0.64) {
                    this.stepStory(1);
                }
            };

            this.storyViewerStage.addEventListener('pointerdown', (event) => {
                if (!this.storyViewerModal || !this.storyViewerModal.classList.contains('open')) return;
                if (event.pointerType === 'mouse' && event.button !== 0) return;
                if (isInteractiveTarget(event.target)) return;
                this.storyPressState = {
                    pointerId: event.pointerId,
                    x: event.clientX,
                    y: event.clientY,
                    startedAt: Date.now(),
                    moved: false
                };
                this.pauseStoryAutoplay();
            });

            this.storyViewerStage.addEventListener('pointermove', (event) => {
                const press = this.storyPressState;
                if (!press || press.pointerId !== event.pointerId) return;
                if (Math.abs(event.clientX - press.x) > 10 || Math.abs(event.clientY - press.y) > 10) {
                    press.moved = true;
                }
            });

            this.storyViewerStage.addEventListener('pointerup', finishPress);
            this.storyViewerStage.addEventListener('pointercancel', finishPress);
            this.storyViewerStage.addEventListener('pointerleave', finishPress);
            this.storyViewerStage.addEventListener('contextmenu', (event) => event.preventDefault());
        }

        if (!this.storyViewerKeyBound) {
            this.storyViewerKeyBound = true;
            document.addEventListener('keydown', (e) => {
                if (this.storyArchiveSheet && this.storyArchiveSheet.classList.contains('open') && e.key === 'Escape') {
                    this.closeStoryArchiveSheet();
                    return;
                }
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
                displayName: latest.displayName || latest.author || 'user',
                avatar: latest.avatar || 'assets/default-avatar.svg',
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
            this.storiesStrip.innerHTML = '<div class="stories-empty">Р’РѕР№РґРёС‚Рµ, С‡С‚РѕР±С‹ РїСѓР±Р»РёРєРѕРІР°С‚СЊ РёСЃС‚РѕСЂРёРё</div>';
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
                    <img src="${this.escapeHtml(current.avatar || 'assets/default-avatar.svg')}" alt="@${this.escapeHtml(current.name || 'you')}" class="story-avatar">
                    <span class="story-add-plus">+</span>
                </span>
                <span class="story-name">${this.escapeHtml('\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c')}</span>
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
                <span class="story-name">${this.escapeHtml(group.displayName || group.author || 'user')}</span>
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
            console.error('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РёСЃС‚РѕСЂРёР№:', error);
            if (!silent) {
                AdvancedViewRenderer.showToast(error?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РёСЃС‚РѕСЂРёРё', 'error');
            }
        }

        this.storiesByAuthor = this.groupStoriesByAuthor(stories);
        this.renderStoriesStrip();
        this.syncProfileAvatarStoryState();
        this.refreshProfileStoryCollections().catch(() => {});
        this.endPerf(perfToken, {
            status: perfStatus,
            totalStories: Array.isArray(stories) ? stories.length : 0,
            authors: Array.isArray(this.storiesByAuthor) ? this.storiesByAuthor.length : 0
        });
    }

    getActiveStory() {
        if (!Array.isArray(this.activeStoryQueue) || this.activeStoryIndex < 0) return null;
        return this.activeStoryQueue[this.activeStoryIndex] || null;
    }

    updateStoryViewerChrome(story = {}) {
        const currentUid = this.getCurrentUidSafe();
        const storyUid = String(story && story.uid ? story.uid : '').trim();
        const isOwnStory = !!(currentUid && storyUid && currentUid === storyUid);
        const canReply = !!(currentUid && storyUid && currentUid !== storyUid);

        if (this.storyViewerOwnerActions) {
            this.setElementHidden(this.storyViewerOwnerActions, !isOwnStory);
        }
        if (this.storyViewerHighlightBtn) {
            this.storyViewerHighlightBtn.textContent = story && story.highlighted
                ? '\u0423\u0431\u0440\u0430\u0442\u044c'
                : '\u0412 \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0435';
        }
        if (this.storyViewerDeleteBtn) {
            this.storyViewerDeleteBtn.disabled = !isOwnStory;
        }

        if (this.storyViewerReplyBar) {
            this.setElementHidden(this.storyViewerReplyBar, !canReply);
        }
        if (this.storyViewerReplyInput) {
            this.storyViewerReplyInput.placeholder = canReply
                ? `\u041e\u0442\u0432\u0435\u0442\u0438\u0442\u044c @${String(story.author || 'user').replace(/^@+/, '').trim() || 'user'}`
                : '\u041e\u0442\u0432\u0435\u0442 \u043d\u0430 \u0438\u0441\u0442\u043e\u0440\u0438\u044e';
        }

        if (this.storyViewerSurface) {
            this.storyViewerSurface.classList.toggle('has-owner-actions', isOwnStory);
            this.storyViewerSurface.classList.toggle('has-reply-bar', canReply);
        }
    }

    async openProfileHighlightStory(profileUid, storyId) {
        await this.openStoryArchive(profileUid, {
            startStoryId: storyId,
            highlightedOnly: true
        });
    }

    async openStoryArchive(profileUid, { startStoryId = '', force = false, highlightedOnly = false } = {}) {
        const targetUid = String(profileUid || '').trim();
        if (!targetUid) return;

        const archive = await this.getStoryArchive(targetUid, {
            force,
            limit: 80
        });
        const filtered = archive
            .filter((story) => highlightedOnly ? story && story.highlighted : true)
            .sort((a, b) => {
                if (highlightedOnly) {
                    const left = parseInt(a.highlightedAt || a.createdAt, 10) || 0;
                    const right = parseInt(b.highlightedAt || b.createdAt, 10) || 0;
                    return right - left;
                }
                return (parseInt(b.createdAt, 10) || 0) - (parseInt(a.createdAt, 10) || 0);
            });
        if (!filtered.length) {
            AdvancedViewRenderer.showToast(
                highlightedOnly
                    ? '\u0412 \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u043c \u043f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442\u043e'
                    : '\u0410\u0440\u0445\u0438\u0432 \u0438\u0441\u0442\u043e\u0440\u0438\u0439 \u043f\u043e\u043a\u0430 \u043f\u0443\u0441\u0442',
                'info'
            );
            return;
        }

        const targetId = String(startStoryId || '').trim();
        const startIndex = targetId
            ? Math.max(0, filtered.findIndex((story) => String(story && story.id ? story.id : '') === targetId))
            : 0;

        this.openStoryQueue(filtered, startIndex, {
            source: highlightedOnly ? 'highlights' : 'archive',
            ownerUid: targetUid
        });
    }

    renderStoryArchiveSheet(stories = [], { profileUid = '', isOwn = false } = {}) {
        if (!this.storyArchiveSheetList) return;

        const list = Array.isArray(stories) ? stories.filter(Boolean) : [];
        this.storyArchiveSheet.dataset.profileUid = String(profileUid || '');
        this.storyArchiveSheet.dataset.isOwn = isOwn ? '1' : '0';

        if (!list.length) {
            this.storyArchiveSheetList.innerHTML = `
                <div class="story-archive-empty">
                    <div class="story-archive-empty-title">\u0418\u0441\u0442\u043e\u0440\u0438\u0439 \u043f\u043e\u043a\u0430 \u043d\u0435\u0442</div>
                    <div class="story-archive-empty-text">\u041e\u043f\u0443\u0431\u043b\u0438\u043a\u0443\u0439\u0442\u0435 \u0438\u0441\u0442\u043e\u0440\u0438\u044e, \u0438 \u043e\u043d\u0430 \u043f\u043e\u044f\u0432\u0438\u0442\u0441\u044f \u0437\u0434\u0435\u0441\u044c.</div>
                </div>
            `;
            return;
        }

        this.storyArchiveSheetList.innerHTML = list.map((story) => {
            const statusBadges = [];
            if (story.highlighted) statusBadges.push('<span class="story-archive-badge">\u0410\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0435</span>');
            if (story.active) statusBadges.push('<span class="story-archive-badge is-live">\u0410\u043a\u0442\u0438\u0432\u043d\u0430</span>');
            return `
                <button class="story-archive-item" type="button" data-story-id="${this.escapeHtml(String(story.id || ''))}" data-story-uid="${this.escapeHtml(String(story.uid || profileUid || ''))}">
                    <span class="story-archive-item-thumb">
                        ${this.buildStoryPreviewMedia(story, { className: 'story-archive-item-media', muted: true })}
                    </span>
                    <span class="story-archive-item-body">
                        <span class="story-archive-item-title">${this.escapeHtml(String(story.caption || '\u0418\u0441\u0442\u043e\u0440\u0438\u044f').slice(0, 44))}</span>
                        <span class="story-archive-item-time">${this.escapeHtml(this.formatRelativeTime(story.createdAt))}</span>
                        <span class="story-archive-item-badges">${statusBadges.join('')}</span>
                    </span>
                </button>
            `;
        }).join('');
    }

    async openStoryArchiveSheet(profileUid, { force = false } = {}) {
        if (!this.storyArchiveSheet) return;

        const targetUid = String(profileUid || '').trim();
        const currentUid = this.getCurrentUidSafe();
        if (!targetUid || !currentUid || currentUid !== targetUid) return;

        this.storyArchiveSheet.classList.add('open');
        document.body.classList.add('story-archive-open');
        this.storyArchiveSheetRequestId = (this.storyArchiveSheetRequestId || 0) + 1;
        const requestId = this.storyArchiveSheetRequestId;

        if (this.storyArchiveSheetTitle) {
            this.storyArchiveSheetTitle.textContent = '\u0410\u0440\u0445\u0438\u0432 \u0438\u0441\u0442\u043e\u0440\u0438\u0439';
        }
        if (this.storyArchiveSheetSubtitle) {
            this.storyArchiveSheetSubtitle.textContent = '\u0412\u0441\u0435 \u0432\u0430\u0448\u0438 \u0438\u0441\u0442\u043e\u0440\u0438\u0438 \u0438 \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0435';
        }
        if (this.storyArchiveSheetList) {
            this.storyArchiveSheetList.innerHTML = '<div class="story-archive-loading">\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u0430\u0440\u0445\u0438\u0432\u0430...</div>';
        }

        let archive = [];
        try {
            archive = await this.getStoryArchive(targetUid, { force, limit: 80 });
        } catch (error) {
            console.error('\u041e\u0448\u0438\u0431\u043a\u0430 \u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0438 \u0430\u0440\u0445\u0438\u0432\u0430 \u0438\u0441\u0442\u043e\u0440\u0438\u0439:', error);
            archive = [];
        }

        if (this.storyArchiveSheetRequestId !== requestId) return;
        this.renderStoryArchiveSheet(archive, {
            profileUid: targetUid,
            isOwn: true
        });
    }

    closeStoryArchiveSheet() {
        if (!this.storyArchiveSheet) return;
        this.storyArchiveSheet.classList.remove('open');
        document.body.classList.remove('story-archive-open');
    }

    syncStoryQueueAfterMutation({ removedStoryId = '', replaceStory = null } = {}) {
        const removedId = String(removedStoryId || '').trim();
        if (!Array.isArray(this.activeStoryQueue) || !this.activeStoryQueue.length) return;

        if (removedId) {
            const nextQueue = this.activeStoryQueue.filter((story) => String(story && story.id ? story.id : '') !== removedId);
            if (!nextQueue.length) {
                this.closeStoryViewer();
                return;
            }

            this.activeStoryQueue = nextQueue;
            if (this.activeStoryIndex >= nextQueue.length) {
                this.activeStoryIndex = nextQueue.length - 1;
            }
            this.renderStoryProgressSegments();
            this.renderActiveStory();
            return;
        }

        if (replaceStory) {
            this.activeStoryQueue[this.activeStoryIndex] = replaceStory;
            this.updateStoryViewerChrome(replaceStory);
        }
    }

    async toggleCurrentStoryHighlight() {
        const story = this.getActiveStory();
        const currentUid = this.getCurrentUidSafe();
        if (!story || !currentUid || String(story.uid || '') !== currentUid) return;

        if (!(firebaseService
            && typeof firebaseService.isInitialized === 'function'
            && firebaseService.isInitialized()
            && typeof firebaseService.setStoryHighlight === 'function')) {
            AdvancedViewRenderer.showToast('\u0410\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0435 \u043f\u043e\u043a\u0430 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e', 'warning');
            return;
        }

        const nextValue = !story.highlighted;
        try {
            const updatedStory = await firebaseService.setStoryHighlight(story.id, nextValue);
            this.invalidateStoryArchive(currentUid);
            await this.refreshProfileStoryCollections({
                force: true,
                profileUid: currentUid,
                isOwn: true
            });

            if (this.activeStoryContext && this.activeStoryContext.source === 'highlights' && !nextValue) {
                this.syncStoryQueueAfterMutation({ removedStoryId: story.id });
            } else {
                this.syncStoryQueueAfterMutation({
                    replaceStory: {
                        ...story,
                        ...updatedStory,
                        highlighted: nextValue
                    }
                });
            }

            AdvancedViewRenderer.showToast(
                nextValue
                    ? '\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0434\u043e\u0431\u0430\u0432\u043b\u0435\u043d\u0430 \u0432 \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0435'
                    : '\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0443\u0431\u0440\u0430\u043d\u0430 \u0438\u0437 \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0433\u043e',
                'success'
            );
        } catch (error) {
            console.error('\u041e\u0448\u0438\u0431\u043a\u0430 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0433\u043e:', error);
            AdvancedViewRenderer.showToast(error?.message || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0431\u043d\u043e\u0432\u0438\u0442\u044c \u0430\u043a\u0442\u0443\u0430\u043b\u044c\u043d\u043e\u0435', 'error');
        }
    }

    async deleteCurrentStory() {
        const story = this.getActiveStory();
        const currentUid = this.getCurrentUidSafe();
        if (!story || !currentUid || String(story.uid || '') !== currentUid) return;
        if (!window.confirm('\u0423\u0434\u0430\u043b\u0438\u0442\u044c \u044d\u0442\u0443 \u0438\u0441\u0442\u043e\u0440\u0438\u044e?')) return;

        if (!(firebaseService
            && typeof firebaseService.isInitialized === 'function'
            && firebaseService.isInitialized()
            && typeof firebaseService.deleteStory === 'function')) {
            AdvancedViewRenderer.showToast('\u0423\u0434\u0430\u043b\u0435\u043d\u0438\u0435 \u0438\u0441\u0442\u043e\u0440\u0438\u0439 \u043f\u043e\u043a\u0430 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u043e', 'warning');
            return;
        }

        try {
            await firebaseService.deleteStory(story.id);
            this.invalidateStoryArchive(currentUid);
            this.syncStoryQueueAfterMutation({ removedStoryId: story.id });
            await this.loadStories({ silent: true });
            await this.refreshProfileStoryCollections({
                force: true,
                profileUid: currentUid,
                isOwn: true
            });
            AdvancedViewRenderer.showToast('\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u0443\u0434\u0430\u043b\u0435\u043d\u0430', 'success');
        } catch (error) {
            console.error('\u041e\u0448\u0438\u0431\u043a\u0430 \u0443\u0434\u0430\u043b\u0435\u043d\u0438\u044f \u0438\u0441\u0442\u043e\u0440\u0438\u0438:', error);
            AdvancedViewRenderer.showToast(error?.message || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0443\u0434\u0430\u043b\u0438\u0442\u044c \u0438\u0441\u0442\u043e\u0440\u0438\u044e', 'error');
        }
    }

    async sendStoryReplyFromViewer() {
        const story = this.getActiveStory();
        if (!story) return;

        const text = String(this.storyViewerReplyInput && this.storyViewerReplyInput.value
            ? this.storyViewerReplyInput.value
            : '').trim();
        if (!text) {
            AdvancedViewRenderer.showToast('\u041d\u0430\u043f\u0438\u0448\u0438\u0442\u0435 \u043e\u0442\u0432\u0435\u0442', 'warning');
            return;
        }

        const currentUser = this.dataService.getCurrentUser();
        if (!currentUser) {
            this.navigateTo('auth-view');
            return;
        }

        const currentUid = currentUser.uid ? String(currentUser.uid) : null;
        const targetUid = String(story.uid || '').trim();
        const targetName = String(story.author || 'user').replace(/^@+/, '').trim() || 'user';
        if (!targetUid || !currentUid || targetUid === currentUid) return;

        const chatId = currentUid && targetUid
            ? [currentUid, targetUid].sort().join('_')
            : [currentUser.name || 'user', targetName].sort().join('_');

        const options = {
            fromUid: currentUid,
            toUid: targetUid,
            delivered: !!(this.state.currentChatUid && String(this.state.currentChatUid) === targetUid && this.state.currentChatOnline),
            type: 'story-reply',
            storyReply: {
                storyId: String(story.id || ''),
                authorUid: targetUid,
                authorName: targetName,
                mediaUrl: String(story.mediaUrl || ''),
                mediaMime: String(story.mediaMime || ''),
                caption: String(story.caption || '').slice(0, 180),
                createdAt: parseInt(story.createdAt, 10) || Date.now()
            }
        };

        try {
            if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.addMessage === 'function') {
                await firebaseService.addMessage(
                    chatId,
                    currentUser.name || 'user',
                    targetName,
                    text,
                    targetUid,
                    options
                );
            } else {
                this.dataService.addMessage(
                    chatId,
                    currentUser.name || 'user',
                    targetName,
                    text,
                    options
                );
            }

            if (this.storyViewerReplyInput) {
                this.storyViewerReplyInput.value = '';
                this.storyViewerReplyInput.blur();
            }
            if (this.state.currentChatId && String(this.state.currentChatId) === String(chatId)) {
                await this.refreshCurrentChatMessages();
            }
            await this.loadChats();
            AdvancedViewRenderer.showToast('\u041e\u0442\u0432\u0435\u0442 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d \u0432 \u043b\u0438\u0447\u043a\u0443', 'success');
        } catch (error) {
            console.error('\u041e\u0448\u0438\u0431\u043a\u0430 \u043e\u0442\u0432\u0435\u0442\u0430 \u043d\u0430 \u0438\u0441\u0442\u043e\u0440\u0438\u044e:', error);
            AdvancedViewRenderer.showToast(error?.message || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u043e\u0442\u0432\u0435\u0442', 'error');
        }
    }

    openStoryGroup(uid) {
        const targetUid = String(uid || '').trim();
        if (!targetUid) return;
        const group = (this.storiesByAuthor || []).find(item => String(item.uid || '') === targetUid);
        if (!group || !Array.isArray(group.stories) || group.stories.length === 0) return;

        const firstUnseen = group.stories.findIndex(story => !this.hasStorySeen(story.id));
        const startIndex = firstUnseen >= 0 ? firstUnseen : Math.max(group.stories.length - 1, 0);
        this.openStoryQueue(group.stories, startIndex, {
            source: 'active',
            ownerUid: targetUid
        });
    }

    openStoryQueue(queue = [], startIndex = 0, options = {}) {
        const list = Array.isArray(queue) ? queue.filter(Boolean) : [];
        if (!list.length || !this.storyViewerModal) return;

        const safeIndex = Math.max(0, Math.min(parseInt(startIndex, 10) || 0, list.length - 1));
        this.activeStoryQueue = list;
        this.activeStoryIndex = safeIndex;
        this.activeStoryContext = {
            source: options.source || 'active',
            ownerUid: String(options.ownerUid || list[safeIndex]?.uid || '').trim(),
            isHighlights: options.source === 'highlights'
        };
        if (this.storyViewerReplyInput) {
            this.storyViewerReplyInput.value = '';
            this.storyViewerReplyInput.blur();
        }
        this.storyViewerModal.classList.add('open');
        document.body.classList.add('story-viewer-open');
        this.renderStoryProgressSegments();
        this.renderActiveStory();
    }

    renderStoryProgressSegments() {
        const track = this.storyViewerProgressTrack;
        if (!track) return;

        const queueLength = Array.isArray(this.activeStoryQueue) ? this.activeStoryQueue.length : 0;
        const count = Math.max(1, queueLength);
        const fragment = document.createDocumentFragment();
        this.storyProgressSegments = [];

        for (let i = 0; i < count; i += 1) {
            const segment = document.createElement('div');
            segment.className = 'story-viewer-progress-segment';
            const fill = document.createElement('div');
            fill.className = 'story-viewer-progress-fill';
            fill.style.width = '0%';
            segment.appendChild(fill);
            fragment.appendChild(segment);
            this.storyProgressSegments.push(fill);
        }

        track.innerHTML = '';
        track.appendChild(fragment);
        this.storyViewerProgressFill = this.storyProgressSegments[0] || null;
        this.updateStoryProgressUi(0);
    }

    updateStoryProgressUi(activeProgress = 0) {
        const progress = Math.max(0, Math.min(1, Number(activeProgress) || 0));
        if (!Array.isArray(this.storyProgressSegments) || !this.storyProgressSegments.length) {
            if (this.storyViewerProgressFill) {
                this.storyViewerProgressFill.style.width = `${Math.round(progress * 100)}%`;
            }
            return;
        }

        const activeIndex = Math.max(0, parseInt(this.activeStoryIndex, 10) || 0);
        this.storyProgressSegments.forEach((fill, index) => {
            if (!fill) return;
            let width = 0;
            if (index < activeIndex) width = 100;
            else if (index === activeIndex) width = Math.round(progress * 100);
            fill.style.width = `${width}%`;
        });
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
        const avatar = story.avatar || 'assets/default-avatar.svg';
        if (this.storyViewerAuthor) this.storyViewerAuthor.textContent = `@${author}`;
        if (this.storyViewerAvatar) this.storyViewerAvatar.src = avatar;
        if (this.storyViewerTime) this.storyViewerTime.textContent = this.formatRelativeTime(story.createdAt);
        this.updateStoryProgressUi(0);
        this.updateStoryViewerChrome(story);

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
            img.alt = `Story @${author}`;
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
        this.clearStoryAutoplay({ pauseVideo: false, resetState: true });
        const safeDuration = Math.max(1200, parseInt(durationMs, 10) || 5000);
        this.storyAutoplayDuration = safeDuration;
        this.storyAutoplayElapsed = 0;
        this.storyAutoplayStartedAt = Date.now();
        this.storyAutoplayPaused = false;
        if (this.storyViewerSurface) this.storyViewerSurface.classList.remove('story-paused');

        const tick = () => {
            if (this.storyAutoplayPaused) return;
            const elapsed = this.storyAutoplayElapsed + (Date.now() - this.storyAutoplayStartedAt);
            const progress = Math.max(0, Math.min(1, elapsed / this.storyAutoplayDuration));
            this.updateStoryProgressUi(progress);
            if (progress < 1) {
                this.storyAutoplayRaf = window.requestAnimationFrame(tick);
            }
        };
        this.updateStoryProgressUi(0);
        this.storyAutoplayRaf = window.requestAnimationFrame(tick);
        this.storyAutoplayTimer = setTimeout(() => this.stepStory(1), safeDuration + 40);
    }

    pauseStoryAutoplay() {
        if (this.storyAutoplayPaused) return;
        if (!Array.isArray(this.activeStoryQueue) || !this.activeStoryQueue.length) return;

        this.storyAutoplayElapsed = Math.min(
            this.storyAutoplayDuration,
            this.storyAutoplayElapsed + Math.max(0, Date.now() - (this.storyAutoplayStartedAt || Date.now()))
        );
        this.storyAutoplayPaused = true;
        if (this.storyViewerSurface) this.storyViewerSurface.classList.add('story-paused');

        if (this.storyAutoplayTimer) {
            clearTimeout(this.storyAutoplayTimer);
            this.storyAutoplayTimer = null;
        }
        if (this.storyAutoplayRaf) {
            cancelAnimationFrame(this.storyAutoplayRaf);
            this.storyAutoplayRaf = null;
        }
        if (this.activeStoryVideoEl) {
            try { this.activeStoryVideoEl.pause(); } catch (_) {}
        }
    }

    resumeStoryAutoplay() {
        if (!this.storyAutoplayPaused) return;
        if (!Array.isArray(this.activeStoryQueue) || !this.activeStoryQueue.length) return;

        const remaining = Math.max(0, this.storyAutoplayDuration - this.storyAutoplayElapsed);
        if (remaining <= 40) {
            this.stepStory(1);
            return;
        }

        this.storyAutoplayPaused = false;
        this.storyAutoplayStartedAt = Date.now();
        if (this.storyViewerSurface) this.storyViewerSurface.classList.remove('story-paused');

        if (this.activeStoryVideoEl) {
            this.activeStoryVideoEl.play().catch(() => {});
        }

        const tick = () => {
            if (this.storyAutoplayPaused) return;
            const elapsed = this.storyAutoplayElapsed + (Date.now() - this.storyAutoplayStartedAt);
            const progress = Math.max(0, Math.min(1, elapsed / this.storyAutoplayDuration));
            this.updateStoryProgressUi(progress);
            if (progress < 1) {
                this.storyAutoplayRaf = window.requestAnimationFrame(tick);
            }
        };
        this.storyAutoplayRaf = window.requestAnimationFrame(tick);
        this.storyAutoplayTimer = setTimeout(() => this.stepStory(1), remaining + 40);
    }

    clearStoryAutoplay({ pauseVideo = true, resetState = false } = {}) {
        if (this.storyAutoplayTimer) {
            clearTimeout(this.storyAutoplayTimer);
            this.storyAutoplayTimer = null;
        }
        if (this.storyAutoplayRaf) {
            cancelAnimationFrame(this.storyAutoplayRaf);
            this.storyAutoplayRaf = null;
        }
        if (pauseVideo && this.activeStoryVideoEl) {
            try {
                this.activeStoryVideoEl.pause();
            } catch (_) {}
        }
        if (resetState) {
            this.storyAutoplayElapsed = 0;
            this.storyAutoplayStartedAt = 0;
            this.storyAutoplayPaused = false;
            if (this.storyViewerSurface) this.storyViewerSurface.classList.remove('story-paused');
        }
        if (pauseVideo) {
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
        this.clearStoryAutoplay({ pauseVideo: true, resetState: true });
        this.storyPressState = null;
        this.activeStoryQueue = [];
        this.activeStoryIndex = -1;
        this.activeStoryContext = null;
        this.storyProgressSegments = [];
        if (this.storyViewerStage) this.storyViewerStage.innerHTML = '';
        if (this.storyViewerProgressTrack) this.storyViewerProgressTrack.innerHTML = '';
        if (this.storyViewerSurface) {
            this.storyViewerSurface.classList.remove('has-owner-actions', 'has-reply-bar');
        }
        if (this.storyViewerReplyInput) {
            this.storyViewerReplyInput.value = '';
        }
        if (this.storyViewerReplyBar) {
            this.setElementHidden(this.storyViewerReplyBar, true);
        }
        if (this.storyViewerOwnerActions) {
            this.setElementHidden(this.storyViewerOwnerActions, true);
        }
    }

    async uploadStoryFromFile(file) {
        if (!file) return;
        const mime = String(file.type || '').toLowerCase();
        if (!(mime.startsWith('image/') || mime.startsWith('video/'))) {
            AdvancedViewRenderer.showToast('\u041f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u044e\u0442\u0441\u044f \u0442\u043e\u043b\u044c\u043a\u043e \u0444\u043e\u0442\u043e \u0438 \u0432\u0438\u0434\u0435\u043e', 'warning');
            return;
        }
        if ((file.size || 0) > 20 * 1024 * 1024) {
            AdvancedViewRenderer.showToast('\u0424\u0430\u0439\u043b \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u0431\u043e\u043b\u044c\u0448\u043e\u0439 (\u043c\u0430\u043a\u0441. 20MB)', 'warning');
            return;
        }

        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) {
            AdvancedViewRenderer.showToast('Firebase \u0435\u0449\u0435 \u043d\u0435 \u0433\u043e\u0442\u043e\u0432', 'warning');
            return;
        }
        if (typeof firebaseService.uploadStory !== 'function') {
            AdvancedViewRenderer.showToast('\u041f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u044f \u0438\u0441\u0442\u043e\u0440\u0438\u0439 \u043f\u043e\u043a\u0430 \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u043d\u0430', 'warning');
            return;
        }

        const caption = prompt('\u041f\u043e\u0434\u043f\u0438\u0441\u044c \u043a \u0438\u0441\u0442\u043e\u0440\u0438\u0438 (\u043d\u0435\u043e\u0431\u044f\u0437\u0430\u0442\u0435\u043b\u044c\u043d\u043e):', '') || '';
        const button = this.addStoryBtn;
        const prevText = button ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = '\u041f\u0443\u0431\u043b\u0438\u043a\u0443\u0435\u043c...';
        }

        try {
            await firebaseService.uploadStory(file, { caption: String(caption || '').trim() });
            const currentUid = this.getCurrentUidSafe();
            if (currentUid) {
                this.invalidateStoryArchive(currentUid);
            }
            await this.loadStories({ silent: true });
            await this.refreshProfileStoryCollections({
                force: true,
                profileUid: currentUid,
                isOwn: true
            });
            AdvancedViewRenderer.showToast('\u0418\u0441\u0442\u043e\u0440\u0438\u044f \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u043d\u0430', 'success');
        } catch (error) {
            console.error('\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0443\u0431\u043b\u0438\u043a\u0430\u0446\u0438\u0438 \u0438\u0441\u0442\u043e\u0440\u0438\u0438:', error);
            AdvancedViewRenderer.showToast(
                error?.message || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u043f\u0443\u0431\u043b\u0438\u043a\u043e\u0432\u0430\u0442\u044c \u0438\u0441\u0442\u043e\u0440\u0438\u044e',
                'error'
            );
        } finally {
            if (button) {
                button.disabled = false;
                button.textContent = prevText || '\u0418\u0441\u0442\u043e\u0440\u0438\u044f';
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
        this.setElementHidden(this.adminMenu, !canAccessAdmin);

        if (!canAccessAdmin && this.state.activeViewId === 'admin-view') {
            this.navigateTo('profile-view');
        }
    }

    setupAdminEvents() {
        if (this.adminMenu && this.adminMenu.dataset.bound !== '1') {
            this.adminMenu.dataset.bound = '1';
            this.adminMenu.addEventListener('click', async () => {
                if (!this.isCurrentUserAdmin()) {
                    AdvancedViewRenderer.showToast('Р”РѕСЃС‚СѓРї С‚РѕР»СЊРєРѕ РґР»СЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°', 'warning');
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
                this.adminUsersList.innerHTML = '<div class="admin-empty">РўСЂРµР±СѓСЋС‚СЃСЏ РїСЂР°РІР° Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°.</div>';
            }
            return;
        }

        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) {
            if (showToast) AdvancedViewRenderer.showToast('Firebase РµС‰Рµ РЅРµ РіРѕС‚РѕРІ', 'warning');
            return;
        }

        try {
            if (this.adminUsersList) {
                this.adminUsersList.innerHTML = '<div class="admin-empty">Р—Р°РіСЂСѓР·РєР° РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№...</div>';
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
                AdvancedViewRenderer.showToast(`Р—Р°РіСЂСѓР¶РµРЅРѕ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№: ${this.adminUsers.length}`, 'success');
            }
        } catch (error) {
            console.error('Admin panel load error:', error);
            this.adminUsers = [];
            if (this.adminUsersList) {
                this.adminUsersList.innerHTML = '<div class="admin-empty">РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№.</div>';
            }
            if (showToast) {
                AdvancedViewRenderer.showToast(error.message || 'РћС€РёР±РєР° Р°РґРјРёРЅРєРё', 'error');
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
            this.adminUsersList.innerHTML = '<div class="admin-empty">РџРѕР»СЊР·РѕРІР°С‚РµР»Рё РЅРµ РЅР°Р№РґРµРЅС‹.</div>';
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
            if (user?.isAdmin) flags.push('Р°РґРјРёРЅ');
            if (user?.verified) flags.push('РіР°Р»РѕС‡РєР°');
            subEl.textContent = `${user?.uid || 'Р±РµР· uid'}${flags.length ? ` вЂў ${flags.join(' вЂў ')}` : ''}`;
            meta.appendChild(nameEl);
            meta.appendChild(subEl);

            const adminBtn = document.createElement('button');
            adminBtn.className = `admin-toggle-btn${user?.isAdmin ? ' is-on' : ''}`;
            adminBtn.textContent = user?.isAdmin ? 'РђРґРјРёРЅ: Р’РљР›' : 'РЎРґРµР»Р°С‚СЊ Р°РґРјРёРЅРѕРј';
            if (currentUid && user?.uid === currentUid) {
                adminBtn.disabled = true;
                adminBtn.title = 'РќРµР»СЊР·СЏ РёР·РјРµРЅРёС‚СЊ СЃРІРѕСЋ СЂРѕР»СЊ';
            }
            adminBtn.addEventListener('click', async () => {
                await this.adminToggleUserAdmin(user);
            });

            const verifyBtn = document.createElement('button');
            verifyBtn.className = `admin-toggle-btn${user?.verified ? ' is-verified' : ''}`;
            verifyBtn.textContent = user?.verified ? 'Р“Р°Р»РѕС‡РєР°: Р’РљР›' : 'Р’С‹РґР°С‚СЊ РіР°Р»РѕС‡РєСѓ';
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
            placeholder.textContent = 'Р’С‹Р±РµСЂРёС‚Рµ РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ';
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
            AdvancedViewRenderer.showToast('API СЂРѕР»Рё Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РЅРµРґРѕСЃС‚СѓРїРµРЅ', 'warning');
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
            AdvancedViewRenderer.showToast(!user.isAdmin ? 'РџСЂР°РІР° Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° РІС‹РґР°РЅС‹' : 'РџСЂР°РІР° Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР° СЃРЅСЏС‚С‹', 'success');
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РёР·РјРµРЅРёС‚СЊ СЂРѕР»СЊ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°', 'error');
        }
    }

    async adminToggleUserVerification(user) {
        if (!user || !user.uid) return;
        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) return;
        if (typeof firebaseService.setUserVerified !== 'function') {
            AdvancedViewRenderer.showToast('API РІРµСЂРёС„РёРєР°С†РёРё РЅРµРґРѕСЃС‚СѓРїРµРЅ', 'warning');
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
            AdvancedViewRenderer.showToast(!user.verified ? 'Р“Р°Р»РѕС‡РєР° РІС‹РґР°РЅР°' : 'Р“Р°Р»РѕС‡РєР° СЃРЅСЏС‚Р°', 'success');
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РёР·РјРµРЅРёС‚СЊ РІРµСЂРёС„РёРєР°С†РёСЋ', 'error');
        }
    }

    async exportAdminChatHistory() {
        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized())) {
            AdvancedViewRenderer.showToast('Firebase РµС‰Рµ РЅРµ РіРѕС‚РѕРІ', 'warning');
            return;
        }
        if (typeof firebaseService.exportChatHistoryForLegalRequest !== 'function') {
            AdvancedViewRenderer.showToast('API РІС‹РіСЂСѓР·РєРё С‡Р°С‚Р° РЅРµРґРѕСЃС‚СѓРїРµРЅ', 'warning');
            return;
        }

        const uidA = this.adminExportUserA ? this.adminExportUserA.value : '';
        const uidB = this.adminExportUserB ? this.adminExportUserB.value : '';

        if (!uidA || !uidB) {
            AdvancedViewRenderer.showToast('Р’С‹Р±РµСЂРёС‚Рµ РґРІСѓС… РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№ РґР»СЏ РІС‹РіСЂСѓР·РєРё', 'warning');
            return;
        }
        if (uidA === uidB) {
            AdvancedViewRenderer.showToast('РџРѕР»СЊР·РѕРІР°С‚РµР»Рё РґРѕР»Р¶РЅС‹ Р±С‹С‚СЊ СЂР°Р·РЅС‹РјРё', 'warning');
            return;
        }

        const caseId = this.adminCaseIdInput ? this.adminCaseIdInput.value.trim() : '';
        const requestedBy = this.adminRequestedByInput ? this.adminRequestedByInput.value.trim() : '';
        const reason = this.adminExportReasonInput ? this.adminExportReasonInput.value.trim() : '';

        const button = this.adminExportChatBtn;
        const originalText = button ? button.textContent : '';
        if (button) {
            button.disabled = true;
            button.textContent = 'Р’С‹РіСЂСѓР·РєР°...';
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
                this.adminLastExport.textContent = `РџРѕСЃР»РµРґРЅСЏСЏ РІС‹РіСЂСѓР·РєР°: ${new Date().toLocaleString()} (${payload.messageCount} СЃРѕРѕР±С‰РµРЅРёР№)`;
            }

            AdvancedViewRenderer.showToast(`Р’С‹РіСЂСѓР·РєР° Р·Р°РІРµСЂС€РµРЅР° (${payload.messageCount} СЃРѕРѕР±С‰РµРЅРёР№)`, 'success');
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РІС‹РіСЂСѓР·РёС‚СЊ С‡Р°С‚', 'error');
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
        this.setupProfileHeaderEvents();
        this.setupUserListSheetEvents();
        this.setupStoriesEvents();
        this.setupLiveEvents();
        this.setupSecurityEvents();
        this.setupAdminEvents();
        this.setupVerifiedBadgeInteractions();

        this.profileBackBtn?.addEventListener('click', () => {
            if (this.state.feedMode === 'custom') {
                this.exitCustomFeedMode({ navigateBack: true });
                return;
            }

            this.state.viewingProfileUid = null;
            if (window.location.hash && window.location.hash.startsWith('#profile-')) {
                const cleanUrl = `${window.location.pathname}${window.location.search}`;
                window.history.replaceState(null, '', cleanUrl);
            }
            this.navigateTo('feed-view');
        });

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
        const registerBirthDateInput = document.getElementById('register-birth-date');

        if (registerBirthDateInput) {
            const now = new Date();
            const maxDate = now.toISOString().slice(0, 10);
            registerBirthDateInput.min = '1900-01-01';
            registerBirthDateInput.max = maxDate;
        }

        const calculateAgeYears = (dateValue) => {
            if (!dateValue) return null;
            const birthDate = new Date(dateValue);
            if (Number.isNaN(birthDate.getTime())) return null;

            const now = new Date();
            let age = now.getFullYear() - birthDate.getFullYear();
            const monthDiff = now.getMonth() - birthDate.getMonth();
            const dayDiff = now.getDate() - birthDate.getDate();
            if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
                age -= 1;
            }
            return age;
        };

        // LOGIN
        document.getElementById('login-btn').addEventListener('click', async () => {
            const email = document.getElementById('login-email').value.trim();
            const password = document.getElementById('login-pass').value.trim();
            
            if (!email || !password) {
                AdvancedViewRenderer.showToast('Р—Р°РїРѕР»РЅРёС‚Рµ РІСЃРµ РїРѕР»СЏ', 'warning');
                return;
            }
            
            const btn = document.getElementById('login-btn');
            const btnText = document.getElementById('login-btn-text');
            btnText.textContent = 'Р’С…РѕРґ...';
            btn.disabled = true;
            
            try {
                const fbReady = await waitForFirebaseService(5000);
                if (!fbReady || !firebaseService || !firebaseService.isInitialized()) {
                    throw new Error('Firebase РЅРµ РіРѕС‚РѕРІ. РћР±РЅРѕРІРёС‚Рµ СЃС‚СЂР°РЅРёС†Сѓ.');
                }
                await firebaseService.login(email, password);
                AdvancedViewRenderer.showToast('Р’С…РѕРґ С‡РµСЂРµР· Firebase СѓСЃРїРµС€РµРЅ!', 'success');

                this.navigateTo('feed-view');
                this.updateProfileUI();
                this.restoreModerationPreferences();
                await this.loadFeed(true);
                await this.loadStories({ silent: true });
                this.updateNotificationBadge();
            } catch (error) {
                AdvancedViewRenderer.showToast(error.message, 'error');
            } finally {
                btnText.textContent = 'Р’РѕР№С‚Рё';
                btn.disabled = false;
            }
        });

        // REGISTER
        document.getElementById('register-btn').addEventListener('click', async () => {
            const email = document.getElementById('register-email').value.trim();
            const password = document.getElementById('register-pass').value.trim();
            const passwordConfirm = document.getElementById('register-pass-confirm').value.trim();
            const userName = document.getElementById('register-username').value.trim();
            const displayNameInput = document.getElementById('register-display-name');
            const displayName = displayNameInput ? displayNameInput.value.trim() : '';
            const birthDate = registerBirthDateInput ? registerBirthDateInput.value.trim() : '';

            if (!email || !password || !passwordConfirm || !userName || !birthDate) {
                AdvancedViewRenderer.showToast('Р—Р°РїРѕР»РЅРёС‚Рµ РІСЃРµ РїРѕР»СЏ', 'warning');
                return;
            }

            const ageYears = calculateAgeYears(birthDate);
            if (ageYears === null) {
                AdvancedViewRenderer.showToast('Укажите корректную дату рождения', 'warning');
                return;
            }
            if (ageYears < 13) {
                AdvancedViewRenderer.showToast('Регистрация доступна с 13 лет', 'warning');
                return;
            }

            if (password !== passwordConfirm) {
                AdvancedViewRenderer.showToast('РџР°СЂРѕР»Рё РЅРµ СЃРѕРІРїР°РґР°СЋС‚', 'warning');
                return;
            }
            if (password.length < 6) {
                AdvancedViewRenderer.showToast('РџР°СЂРѕР»СЊ РґРѕР»Р¶РµРЅ СЃРѕРґРµСЂР¶Р°С‚СЊ РјРёРЅРёРјСѓРј 6 СЃРёРјРІРѕР»РѕРІ', 'warning');
                return;
            }

            const btn = document.getElementById('register-btn');
            const btnText = document.getElementById('register-btn-text');
            const originalText = btnText.textContent;
            btnText.textContent = 'Р РµРіРёСЃС‚СЂР°С†РёСЏ...';
            btn.disabled = true;

            try {
                if (!firebaseService || !firebaseService.isInitialized()) {
                    AdvancedViewRenderer.showToast('РџРѕРґРѕР¶РґРёС‚Рµ, Firebase Р·Р°РіСЂСѓР¶Р°РµС‚СЃСЏ...', 'info');
                    const ready = await waitForFirebaseService(8000);
                    if (!ready) {
                        AdvancedViewRenderer.showToast('Firebase РЅРµ Р·Р°РіСЂСѓР·РёР»СЃСЏ. РћР±РЅРѕРІРёС‚Рµ СЃС‚СЂР°РЅРёС†Сѓ', 'error');
                        return;
                    }
                }

                await firebaseService.register(email, password, userName, displayName, {
                    birthDate,
                    ageYears,
                    ageVerified: ageYears >= 18
                });
                AdvancedViewRenderer.showToast('рџ”Ґ Р РµРіРёСЃС‚СЂР°С†РёСЏ С‡РµСЂРµР· Firebase СѓСЃРїРµС€РЅР°!', 'success');
                
                this.setAuthFormMode('login');
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
                AdvancedViewRenderer.showToast(error.message || 'РћС€РёР±РєР° СЂРµРіРёСЃС‚СЂР°С†РёРё', 'error');
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
                this.showUploadDraftNote('Р¤Р°Р№Р» РІС‹Р±СЂР°РЅ. РўРµРєСЃС‚ Рё РЅР°СЃС‚СЂРѕР№РєРё СЃРѕС…СЂР°РЅСЏСЋС‚СЃСЏ РІ С‡РµСЂРЅРѕРІРёРєРµ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё.');
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
                AdvancedViewRenderer.showToast('Р’С‹Р±РµСЂРёС‚Рµ РІРёРґРµРѕ РёР»Рё Р·Р°РїРёС€РёС‚Рµ СЃ РєР°РјРµСЂС‹', 'warning');
                return;
            }
            
            if (!desc) {
                AdvancedViewRenderer.showToast('Р”РѕР±Р°РІСЊС‚Рµ РѕРїРёСЃР°РЅРёРµ', 'warning');
                return;
            }
            
            const btn = document.getElementById('publish-btn');
            const btnText = document.getElementById('publish-btn-text');
            btnText.textContent = 'РџСѓР±Р»РёРєР°С†РёСЏ...';
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
                
                AdvancedViewRenderer.showToast('Р’РёРґРµРѕ РѕРїСѓР±Р»РёРєРѕРІР°РЅРѕ!', 'success');
                
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
                AdvancedViewRenderer.showToast(error.message || 'РћС€РёР±РєР° РїСЂРё Р·Р°РіСЂСѓР·РєРµ РІРёРґРµРѕ', 'error');
                console.error(error);
            } finally {
                btnText.textContent = 'РћРїСѓР±Р»РёРєРѕРІР°С‚СЊ';
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
                this.setSearchEmptyMessage('Начните печатать для поиска');
                this.setElementHidden(this.searchEmpty, false);
                this.searchResults.style.display = 'flex';
                this.searchResults.innerHTML = '';
            }
        });
        
        this.searchViewClear.addEventListener('click', () => {
            this.searchViewInput.value = '';
            this.searchViewClear.style.display = 'none';
            this.setSearchEmptyMessage('Начните печатать для поиска');
            this.setElementHidden(this.searchEmpty, false);
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
                this.state.avatarData = null;
                this.state.avatarFile = null;
                AdvancedViewRenderer.renderEditProfileForm(user);
                this.setupProfileFormListeners();
            });
        }

        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.state.avatarData = null;
                this.state.avatarFile = null;
                AdvancedViewRenderer.closeEditProfileModal();
            });
        }
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.state.avatarData = null;
                this.state.avatarFile = null;
                AdvancedViewRenderer.closeEditProfileModal();
            });
        }

        if (avatarPreview) {
            avatarPreview.addEventListener('click', () => avatarFileInput.click());
        }

        if (avatarFileInput) {
            avatarFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    if (file.size > 5 * 1024 * 1024) {
                        AdvancedViewRenderer.showToast('РР·РѕР±СЂР°Р¶РµРЅРёРµ СЃР»РёС€РєРѕРј Р±РѕР»СЊС€РѕРµ (РјР°РєСЃ. 5MB)', 'warning');
                        return;
                    }
                    this.state.avatarFile = file;
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

    setupProfileHeaderEvents() {
        if (this.profileSearchBtn && this.profileSearchBtn.dataset.bound !== '1') {
            this.profileSearchBtn.dataset.bound = '1';
            this.profileSearchBtn.addEventListener('click', () => {
                this.navigateTo('search-view');
            });
        }

        if (this.profileAvatarWrap && this.profileAvatarWrap.dataset.bound !== '1') {
            this.profileAvatarWrap.dataset.bound = '1';

            const cancelAvatarPress = ({ suppressClick = false } = {}) => {
                const press = this.profileAvatarPressState;
                if (press && press.timer) {
                    clearTimeout(press.timer);
                }
                if (suppressClick && this.profileAvatarWrap) {
                    this.profileAvatarWrap.dataset.suppressClick = '1';
                }
                this.profileAvatarPressState = null;
            };

            this.profileAvatarWrap.addEventListener('pointerdown', (event) => {
                if (event.button && event.button !== 0) return;
                if (!this.profileAvatarWrap || this.profileAvatarWrap.dataset.canPreview !== '1') return;
                if (event.pointerType && event.pointerType !== 'touch' && event.pointerType !== 'pen') return;

                cancelAvatarPress();
                this.profileAvatarPressState = {
                    x: event.clientX,
                    y: event.clientY,
                    longPressTriggered: false,
                    timer: window.setTimeout(() => {
                        if (!this.profileAvatarPressState) return;
                        this.profileAvatarPressState.longPressTriggered = true;
                        if (this.profileAvatarWrap) {
                            this.profileAvatarWrap.dataset.suppressClick = '1';
                        }
                        this.openProfileAvatarPreview();
                    }, 420)
                };
            });

            this.profileAvatarWrap.addEventListener('pointermove', (event) => {
                const press = this.profileAvatarPressState;
                if (!press) return;
                const distanceX = Math.abs((event.clientX || 0) - press.x);
                const distanceY = Math.abs((event.clientY || 0) - press.y);
                if (distanceX > 8 || distanceY > 8) {
                    cancelAvatarPress();
                }
            });

            this.profileAvatarWrap.addEventListener('pointerup', () => {
                cancelAvatarPress({
                    suppressClick: !!(this.profileAvatarPressState && this.profileAvatarPressState.longPressTriggered)
                });
            });
            this.profileAvatarWrap.addEventListener('pointercancel', () => cancelAvatarPress());
            this.profileAvatarWrap.addEventListener('pointerleave', () => cancelAvatarPress());

            this.profileAvatarWrap.addEventListener('click', (event) => {
                if (!this.profileAvatarWrap) return;
                if (this.profileAvatarWrap.dataset.suppressClick === '1') {
                    this.profileAvatarWrap.dataset.suppressClick = '0';
                    event.preventDefault();
                    event.stopPropagation();
                    return;
                }

                const storyUid = String(this.profileAvatarWrap.dataset.storyUid || '').trim();
                if (!storyUid) return;
                event.preventDefault();
                this.openStoryGroup(storyUid);
            });

            this.profileAvatarWrap.addEventListener('contextmenu', (event) => {
                if (!this.profileAvatarWrap || this.profileAvatarWrap.dataset.canPreview !== '1') return;
                event.preventDefault();
                this.openProfileAvatarPreview();
            });

            this.profileAvatarWrap.addEventListener('keydown', (event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                const storyUid = this.profileAvatarWrap ? String(this.profileAvatarWrap.dataset.storyUid || '').trim() : '';
                if (!storyUid) return;
                event.preventDefault();
                this.openStoryGroup(storyUid);
            });
        }

        this.ensureProfileAvatarPreviewModal();

        if (this.profileMediaTabs && this.profileMediaTabs.dataset.bound !== '1') {
            this.profileMediaTabs.dataset.bound = '1';
            this.profileMediaTabs.addEventListener('click', (event) => {
                const btn = event.target && event.target.closest
                    ? event.target.closest('[data-profile-tab]')
                    : null;
                if (!btn || btn.disabled) return;
                const tab = btn.dataset.profileTab || 'videos';
                this.setProfileGridTab(tab, { rerender: true });
            });
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
                    AdvancedViewRenderer.showToast('РџСЂРѕС„РёР»СЊ РЅРµРґРѕСЃС‚СѓРїРµРЅ Р±РµР· РїРѕРґРєР»СЋС‡РµРЅРёСЏ Р±Р°Р·С‹', 'warning');
                    return;
                }

                try {
                    await firebaseService.updateUserProfile(current.uid, {
                        privateAccount: checked
                    });
                    AdvancedViewRenderer.showToast(checked ? 'Р’РєР»СЋС‡РµРЅ РїСЂРёРІР°С‚РЅС‹Р№ Р°РєРєР°СѓРЅС‚' : 'РџСЂРѕС„РёР»СЊ СЃРЅРѕРІР° РїСѓР±Р»РёС‡РЅС‹Р№', 'success');
                    this.updateProfileUI();
                    if (this.state.feedMode === 'global') {
                        await this.loadFeed(true);
                    }
                } catch (error) {
                    console.error(error);
                    this.profilePrivateToggle.checked = !checked;
                    AdvancedViewRenderer.showToast(error?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РёР·РјРµРЅРёС‚СЊ РїСЂРёРІР°С‚РЅРѕСЃС‚СЊ', 'error');
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
                    AdvancedViewRenderer.showToast('РџСЂРѕС„РёР»СЊ РЅРµРґРѕСЃС‚СѓРїРµРЅ Р±РµР· РїРѕРґРєР»СЋС‡РµРЅРёСЏ Р±Р°Р·С‹', 'warning');
                    return;
                }

                let ageVerified = !!current.ageVerified;
                if (checked && !ageVerified) {
                    const confirmed = window.confirm('РџРѕРґС‚РІРµСЂРґРёС‚Рµ, С‡С‚Рѕ РІР°Рј РёСЃРїРѕР»РЅРёР»РѕСЃСЊ 18 Р»РµС‚.');
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
                    AdvancedViewRenderer.showToast(checked ? 'РљРѕРЅС‚РµРЅС‚ 18+ РІРєР»СЋС‡РµРЅ' : 'РљРѕРЅС‚РµРЅС‚ 18+ СЃРєСЂС‹С‚', 'success');
                    this.updateProfileUI();
                    if (this.state.feedMode === 'global') {
                        await this.loadFeed(true);
                    }
                } catch (error) {
                    console.error(error);
                    this.profileAdultToggle.checked = !checked;
                    AdvancedViewRenderer.showToast(error?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ 18+ СЂРµР¶РёРј', 'error');
                }
            });
        }

        const requestsTrigger = this.profileRequestsMenu || this.profileFollowRequestsBtn;
        if (requestsTrigger && requestsTrigger.dataset.bound !== '1') {
            requestsTrigger.dataset.bound = '1';
            requestsTrigger.addEventListener('click', () => {
                if (this.hamburgerBtn) this.hamburgerBtn.classList.remove('active');
                if (this.menuDropdown) this.menuDropdown.classList.remove('active');
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
                AdvancedViewRenderer.showToast('Live РґРѕСЃС‚СѓРїРµРЅ РїРѕСЃР»Рµ РїРѕРґРєР»СЋС‡РµРЅРёСЏ Р±Р°Р·С‹', 'warning');
            }
            return;
        }

        try {
            const sessions = await firebaseService.listLiveSessions(30);
            this.liveSessions = Array.isArray(sessions) ? sessions : [];
            this.renderLiveSessionsStrip();
            this.renderLiveSheetList();
        } catch (error) {
            console.error('РћС€РёР±РєР° РѕР±РЅРѕРІР»РµРЅРёСЏ live-СЃРµСЃСЃРёР№:', error);
            if (!silent) {
                AdvancedViewRenderer.showToast(error?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕР±РЅРѕРІРёС‚СЊ СЌС„РёСЂС‹', 'error');
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
            this.liveSessionsList.innerHTML = '<div class="live-sessions-empty">РЎРµР№С‡Р°СЃ РЅРµС‚ Р°РєС‚РёРІРЅС‹С… СЌС„РёСЂРѕРІ</div>';
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
                <div class="live-feed-title">РџСЂСЏРјС‹Рµ СЌС„РёСЂС‹</div>
                <div class="live-feed-head-actions">
                    <button type="button" class="secondary-btn live-feed-refresh">РћР±РЅРѕРІРёС‚СЊ</button>
                    <button type="button" class="primary-btn live-feed-open">РњРѕРё СЌС„РёСЂС‹</button>
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
                    <h3>РЎРµР№С‡Р°СЃ РЅРµС‚ Р°РєС‚РёРІРЅС‹С… СЌС„РёСЂРѕРІ</h3>
                    <p>РќР°Р¶РјРёС‚Рµ "РњРѕРё СЌС„РёСЂС‹", С‡С‚РѕР±С‹ Р·Р°РїСѓСЃС‚РёС‚СЊ С‚СЂР°РЅСЃР»СЏС†РёСЋ.</p>
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
            const avatar = this.escapeHtml(session.ownerAvatar || 'assets/default-avatar.svg');

            row.innerHTML = `
                <div class="live-feed-meta">
                    <img class="live-feed-avatar" src="${avatar}" alt="@${this.escapeHtml(session.ownerName || 'user')}">
                    <div class="live-feed-text">
                        <div class="live-feed-row-title">${this.escapeHtml(session.title || 'РџСЂСЏРјРѕР№ СЌС„РёСЂ')}</div>
                        <div class="live-feed-row-sub">@${this.escapeHtml(session.ownerName || 'user')} В· Р·СЂРёС‚РµР»РµР№: ${AdvancedViewRenderer.formatNumber(session.viewersCount || 0)} В· co-host: ${coHostsCount}/2</div>
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
                    endBtn.textContent = 'Р—Р°РІРµСЂС€РёС‚СЊ';
                    endBtn.addEventListener('click', async () => {
                        try {
                            await firebaseService.endLiveSession(session.id);
                            AdvancedViewRenderer.showToast('Р­С„РёСЂ Р·Р°РІРµСЂС€РµРЅ', 'success');
                            await this.refreshLiveSessions({ silent: true });
                            if (this.state.feedSource === 'live' && this.state.feedMode === 'global') {
                                this.renderLiveFeedList();
                            }
                        } catch (error) {
                            console.error(error);
                            AdvancedViewRenderer.showToast(error?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РІРµСЂС€РёС‚СЊ СЌС„РёСЂ', 'error');
                        }
                    });
                    actions.appendChild(endBtn);
                } else {
                    const joinBtn = document.createElement('button');
                    joinBtn.type = 'button';
                    joinBtn.className = 'secondary-btn';
                    joinBtn.textContent = 'Р’РѕР№С‚Рё';
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
            this.liveSheetList.innerHTML = '<div class="live-sessions-empty">РЎРµР№С‡Р°СЃ РЅРµС‚ Р°РєС‚РёРІРЅС‹С… СЌС„РёСЂРѕРІ</div>';
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
                    <div class="live-sheet-title">${this.escapeHtml(session.title || 'РџСЂСЏРјРѕР№ СЌС„РёСЂ')}</div>
                    <div class="live-sheet-sub">@${this.escapeHtml(session.ownerName || 'user')} В· Р·СЂРёС‚РµР»РµР№: ${AdvancedViewRenderer.formatNumber(session.viewersCount || 0)} В· co-host: ${coHostsCount}/2</div>
                </div>
                <div class="live-sheet-actions"></div>
            `;

            const actions = row.querySelector('.live-sheet-actions');
            if (actions) {
                if (isOwner) {
                    const endBtn = document.createElement('button');
                    endBtn.type = 'button';
                    endBtn.className = 'secondary-btn';
                    endBtn.textContent = 'Р—Р°РІРµСЂС€РёС‚СЊ';
                    endBtn.addEventListener('click', async () => {
                        try {
                            await firebaseService.endLiveSession(session.id);
                            AdvancedViewRenderer.showToast('Р­С„РёСЂ Р·Р°РІРµСЂС€РµРЅ', 'success');
                            await this.refreshLiveSessions({ silent: true });
                        } catch (error) {
                            console.error(error);
                            AdvancedViewRenderer.showToast(error?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РІРµСЂС€РёС‚СЊ СЌС„РёСЂ', 'error');
                        }
                    });
                    actions.appendChild(endBtn);
                } else {
                    const joinBtn = document.createElement('button');
                    joinBtn.type = 'button';
                    joinBtn.className = 'secondary-btn';
                    joinBtn.textContent = 'Р’РѕР№С‚Рё';
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
            AdvancedViewRenderer.showToast('Live РЅРµРґРѕСЃС‚СѓРїРµРЅ Р±РµР· РїРѕРґРєР»СЋС‡РµРЅРёСЏ Р±Р°Р·С‹', 'warning');
            return;
        }

        const title = this.liveTitleInput ? this.liveTitleInput.value.trim() : '';
        try {
            await firebaseService.createLiveSession({ title });
            if (this.liveTitleInput) this.liveTitleInput.value = '';
            AdvancedViewRenderer.showToast('Р­С„РёСЂ Р·Р°РїСѓС‰РµРЅ', 'success');
            await this.refreshLiveSessions({ silent: true });
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РїСѓСЃС‚РёС‚СЊ СЌС„РёСЂ', 'error');
        }
    }

    async joinLiveSession(sessionId, { asCoHost = false } = {}) {
        const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        if (!current || !current.uid) {
            this.navigateTo('auth-view');
            return;
        }
        if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized() && typeof firebaseService.joinLiveSession === 'function')) {
            AdvancedViewRenderer.showToast('Live РЅРµРґРѕСЃС‚СѓРїРµРЅ Р±РµР· РїРѕРґРєР»СЋС‡РµРЅРёСЏ Р±Р°Р·С‹', 'warning');
            return;
        }

        try {
            const session = await firebaseService.joinLiveSession(sessionId, { asCoHost });
            this.state.activeLiveSessionId = session && session.id ? session.id : null;
            AdvancedViewRenderer.showToast(asCoHost ? 'Р’С‹ РїСЂРёСЃРѕРµРґРёРЅРёР»РёСЃСЊ РєР°Рє co-host' : 'Р’С‹ РІРѕС€Р»Рё РІ СЌС„РёСЂ', 'success');
            await this.refreshLiveSessions({ silent: true });
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РІРѕР№С‚Рё РІ СЌС„РёСЂ', 'error');
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
            AdvancedViewRenderer.showToast('РЎРЅР°С‡Р°Р»Р° РІРѕР№РґРёС‚Рµ РІ Р°РєРєР°СѓРЅС‚', 'warning');
            return;
        }

        if (normalizedMode === 'requests' && String(targetUid) !== String(currentUid)) {
            AdvancedViewRenderer.showToast('Р—Р°СЏРІРєРё РґРѕСЃС‚СѓРїРЅС‹ С‚РѕР»СЊРєРѕ РІ РІР°С€РµРј РїСЂРѕС„РёР»Рµ', 'warning');
            return;
        }

        this.userListTitle.textContent = normalizedMode === 'followers'
            ? 'РџРѕРґРїРёСЃС‡РёРєРё'
            : (normalizedMode === 'requests' ? 'Р—Р°СЏРІРєРё' : 'РџРѕРґРїРёСЃРєРё');
        this.userList.innerHTML = '<div class="user-list-empty">Р—Р°РіСЂСѓР·РєР°...</div>';
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
            console.error('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РїСЂРѕС„РёР»СЏ РґР»СЏ СЃРїРёСЃРєР° РїРѕР»СЊР·РѕРІР°С‚РµР»РµР№:', error);
        }

        if (this.userListRequestId !== requestId) return;

        if (!targetProfile) {
            this.userList.innerHTML = '<div class="user-list-empty">РќРµ СѓРґР°Р»РѕСЃСЊ Р·Р°РіСЂСѓР·РёС‚СЊ СЃРїРёСЃРѕРє</div>';
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
                ? 'РџРѕРґРїРёСЃС‡РёРєРѕРІ РїРѕРєР° РЅРµС‚'
                : (normalizedMode === 'requests' ? 'РќРѕРІС‹С… Р·Р°СЏРІРѕРє РЅРµС‚' : 'РџРѕРґРїРёСЃРѕРє РїРѕРєР° РЅРµС‚');
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
                : 'assets/default-avatar.svg';
            const about = profile && profile.bio
                ? this.escapeHtml(profile.bio)
                : (profile && profile.email ? this.escapeHtml(profile.email) : 'РџСЂРѕС„РёР»СЊ Reelgram');

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
                    <button type="button" class="secondary-btn user-list-approve">РџСЂРёРЅСЏС‚СЊ</button>
                    <button type="button" class="secondary-btn user-list-reject">РћС‚РєР»РѕРЅРёС‚СЊ</button>
                `;

                actions.querySelector('.user-list-approve')?.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized() && typeof firebaseService.approveFollowRequest === 'function')) {
                        AdvancedViewRenderer.showToast('Р¤СѓРЅРєС†РёСЏ Р·Р°СЏРІРѕРє РЅРµРґРѕСЃС‚СѓРїРЅР°', 'warning');
                        return;
                    }
                    try {
                        await firebaseService.approveFollowRequest(uid);
                        item.remove();
                        AdvancedViewRenderer.showToast('Р—Р°СЏРІРєР° РїСЂРёРЅСЏС‚Р°', 'success');
                        const left = this.userList.querySelectorAll('.user-list-item').length;
                        if (!left) {
                            this.userList.innerHTML = '<div class="user-list-empty">РќРѕРІС‹С… Р·Р°СЏРІРѕРє РЅРµС‚</div>';
                        }
                        this.updateProfileUI();
                    } catch (error) {
                        console.error(error);
                        AdvancedViewRenderer.showToast(error?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РїСЂРёРЅСЏС‚СЊ Р·Р°СЏРІРєСѓ', 'error');
                    }
                });

                actions.querySelector('.user-list-reject')?.addEventListener('click', async (event) => {
                    event.stopPropagation();
                    if (!(firebaseService && firebaseService.isInitialized && firebaseService.isInitialized() && typeof firebaseService.rejectFollowRequest === 'function')) {
                        AdvancedViewRenderer.showToast('Р¤СѓРЅРєС†РёСЏ Р·Р°СЏРІРѕРє РЅРµРґРѕСЃС‚СѓРїРЅР°', 'warning');
                        return;
                    }
                    try {
                        await firebaseService.rejectFollowRequest(uid);
                        item.remove();
                        AdvancedViewRenderer.showToast('Р—Р°СЏРІРєР° РѕС‚РєР»РѕРЅРµРЅР°', 'info');
                        const left = this.userList.querySelectorAll('.user-list-item').length;
                        if (!left) {
                            this.userList.innerHTML = '<div class="user-list-empty">РќРѕРІС‹С… Р·Р°СЏРІРѕРє РЅРµС‚</div>';
                        }
                        this.updateProfileUI();
                    } catch (error) {
                        console.error(error);
                        AdvancedViewRenderer.showToast(error?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєР»РѕРЅРёС‚СЊ Р·Р°СЏРІРєСѓ', 'error');
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
                AdvancedViewRenderer.showToast('РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ РїСЂРѕС„РёР»СЊ', 'warning');
            });

            this.userList.appendChild(item);
        });
    }

    async saveProfile() {
        if (!AdvancedViewRenderer.validateProfileForm()) return;

        const saveBtn = document.getElementById('save-profile');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = '\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435...';

        try {
            const currentProfile = this.dataService.getCurrentUser();
            if (!currentProfile) {
                this.navigateTo('auth-view');
                throw new Error('\u041d\u0443\u0436\u043d\u043e \u0432\u043e\u0439\u0442\u0438 \u0432 \u0430\u043a\u043a\u0430\u0443\u043d\u0442.');
            }

            const ready = await waitForFirebaseService(5000);
            if (!ready || !firebaseService || !firebaseService.isInitialized()) {
                throw new Error('Firebase \u043d\u0435 \u0433\u043e\u0442\u043e\u0432.');
            }
            const currentUser = firebaseService.getCurrentUser();
            if (!currentUser || !currentUser.uid) {
                this.navigateTo('auth-view');
                throw new Error('\u041d\u0443\u0436\u043d\u043e \u0432\u043e\u0439\u0442\u0438 \u0432 \u0430\u043a\u043a\u0430\u0443\u043d\u0442.');
            }

            let nextAvatar = currentProfile.avatar || 'assets/default-avatar.svg';
            if (this.state.avatarFile && typeof firebaseService.uploadMedia === 'function') {
                const uploaded = await firebaseService.uploadMedia(this.state.avatarFile, `avatars/${currentUser.uid}`, {
                    uid: currentUser.uid,
                    purpose: 'avatar'
                });
                if (uploaded && uploaded.url) {
                    nextAvatar = uploaded.url;
                }
            } else if (typeof nextAvatar === 'string'
                && nextAvatar.startsWith('data:')
                && typeof firebaseService.uploadMedia === 'function') {
                try {
                    const response = await fetch(nextAvatar);
                    const blob = await response.blob();
                    const ext = blob.type && blob.type.includes('png') ? 'png' : 'jpg';
                    const file = new File([blob], `avatar.${ext}`, { type: blob.type || 'image/jpeg' });
                    const uploaded = await firebaseService.uploadMedia(file, `avatars/${currentUser.uid}`, {
                        uid: currentUser.uid,
                        purpose: 'avatar-migrate'
                    });
                    if (uploaded && uploaded.url) {
                        nextAvatar = uploaded.url;
                    }
                } catch (migrateError) {
                    console.warn('avatar migrate failed:', migrateError);
                }
            } else if (typeof this.state.avatarData === 'string' && this.state.avatarData.startsWith('http')) {
                nextAvatar = this.state.avatarData;
            }

            const profileData = {
                avatar: nextAvatar,
                name: document.getElementById('edit-username').value.trim(),
                bio: document.getElementById('edit-bio').value.trim(),
                location: document.getElementById('edit-location').value.trim(),
                website: document.getElementById('edit-website').value.trim(),
                interests: document.getElementById('edit-interests').value.trim(),
                gender: AdvancedViewRenderer.getActiveGender()
            };

            await firebaseService.updateUserProfile(currentUser.uid, profileData);

            const updatedUser = firebaseService.getCurrentUser && firebaseService.getCurrentUser();
            if (updatedUser && updatedUser.uid) {
                this.syncUserMetaInUi(updatedUser);
            }
            
            this.updateProfileUI();
            AdvancedViewRenderer.closeEditProfileModal();
            AdvancedViewRenderer.showToast('\u041f\u0440\u043e\u0444\u0438\u043b\u044c \u043e\u0431\u043d\u043e\u0432\u043b\u0435\u043d', 'success');
            this.state.avatarData = null;
            this.state.avatarFile = null;
        } catch (error) {
            AdvancedViewRenderer.showToast('\u041e\u0448\u0438\u0431\u043a\u0430 \u043f\u0440\u0438 \u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0438 \u043f\u0440\u043e\u0444\u0438\u043b\u044f', 'error');
        } finally {
            this.state.avatarFile = null;
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
    }

    renderFeedEmptyState(source = 'for-you') {
        if (!this.feedContainer) return;
        const isFollowing = source === 'following';
        const isLive = source === 'live';
        const title = isLive
            ? 'РЎРµР№С‡Р°СЃ РЅРµС‚ Р°РєС‚РёРІРЅС‹С… СЌС„РёСЂРѕРІ'
            : (isFollowing ? 'Р›РµРЅС‚Р° РїРѕРґРїРёСЃРѕРє РїСѓСЃС‚Р°' : 'РџРѕРєР° РЅРµС‚ РїРѕРґС…РѕРґСЏС‰РёС… РІРёРґРµРѕ');
        const subtitle = isLive
            ? 'Р—Р°РїСѓСЃС‚РёС‚Рµ СЃРІРѕР№ СЌС„РёСЂ РёР»Рё Р·Р°Р№РґРёС‚Рµ РїРѕР·Р¶Рµ.'
            : (isFollowing
                ? 'РџРѕРґРїРёС€РёС‚РµСЃСЊ РЅР° Р°РІС‚РѕСЂРѕРІ, С‡С‚РѕР±С‹ РІРёРґРµС‚СЊ РёС… РІРёРґРµРѕ Р·РґРµСЃСЊ.'
                : 'РЎРјРѕС‚СЂРёС‚Рµ СЂРѕР»РёРєРё Рё РѕС‚РјРµС‡Р°Р№С‚Рµ РёРЅС‚РµСЂРµСЃРЅРѕРµ, С‡С‚РѕР±С‹ Р°Р»РіРѕСЂРёС‚Рј РїРѕРґСЃС‚СЂРѕРёР»СЃСЏ.');
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
                let clean = token.replace(/[^#\wР°-СЏС‘-]/gi, '');
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
        const matched = joined.match(/#[\wР°-СЏС‘-]+/gi) || [];
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
                console.warn('вљ пёЏ РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РјРѕРґРµСЂР°С†РёСЋ РІ РїСЂРѕС„РёР»Рµ:', error?.message || error);
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
            AdvancedViewRenderer.showToast('РќРµ СѓРґР°Р»РѕСЃСЊ РѕРїСЂРµРґРµР»РёС‚СЊ Р°РІС‚РѕСЂР°', 'warning');
            return;
        }
        if (current && current.uid && String(current.uid) === authorUid) {
            AdvancedViewRenderer.showToast('РќРµР»СЊР·СЏ СЃРєСЂС‹С‚СЊ СЃРѕР±СЃС‚РІРµРЅРЅС‹Р№ Р°РєРєР°СѓРЅС‚', 'info');
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
        AdvancedViewRenderer.showToast('РђРІС‚РѕСЂ СЃРєСЂС‹С‚ РёР· РІР°С€РµР№ Р»РµРЅС‚С‹', 'success');
    }

    async blockAuthorInFeed(video) {
        const current = firebaseService && firebaseService.getCurrentUser ? firebaseService.getCurrentUser() : null;
        const currentUid = current && current.uid ? String(current.uid) : null;
        const authorUid = video && video.uid ? String(video.uid) : null;
        if (!authorUid) {
            AdvancedViewRenderer.showToast('РќРµ СѓРґР°Р»РѕСЃСЊ РѕРїСЂРµРґРµР»РёС‚СЊ Р°РІС‚РѕСЂР°', 'warning');
            return;
        }
        if (currentUid && currentUid === authorUid) {
            AdvancedViewRenderer.showToast('РќРµР»СЊР·СЏ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°С‚СЊ СЃРµР±СЏ', 'info');
            return;
        }

        if (!confirm('Р—Р°Р±Р»РѕРєРёСЂРѕРІР°С‚СЊ Р°РІС‚РѕСЂР°? Р•РіРѕ РІРёРґРµРѕ Р±РѕР»СЊС€Рµ РЅРµ Р±СѓРґСѓС‚ РїРѕРєР°Р·С‹РІР°С‚СЊСЃСЏ.')) return;

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
        AdvancedViewRenderer.showToast('РђРІС‚РѕСЂ Р·Р°Р±Р»РѕРєРёСЂРѕРІР°РЅ', 'success');
    }

    async reportVideo(video) {
        if (!video) return;
        const reason = window.prompt('РџСЂРёС‡РёРЅР° Р¶Р°Р»РѕР±С‹ (РЅРµРѕР±СЏР·Р°С‚РµР»СЊРЅРѕ):', 'РќРµРїРѕРґС…РѕРґСЏС‰РёР№ РєРѕРЅС‚РµРЅС‚');
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

        AdvancedViewRenderer.showToast('Р–Р°Р»РѕР±Р° РѕС‚РїСЂР°РІР»РµРЅР°', 'success');
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
                this.showUploadDraftNote('Р§РµСЂРЅРѕРІРёРє СЃРѕС…СЂР°РЅРµРЅ');
                AdvancedViewRenderer.showToast('Р§РµСЂРЅРѕРІРёРє СЃРѕС…СЂР°РЅРµРЅ', 'success');
            } else {
                this.showUploadDraftNote('Р§РµСЂРЅРѕРІРёРє РѕР±РЅРѕРІР»РµРЅ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё');
            }
            if (this.state.activeViewId === 'profile-view' && this.state.profileGridTab === 'drafts') {
                this.renderActiveProfileGrid();
            }
        } catch (error) {
            if (manual) {
                AdvancedViewRenderer.showToast('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ С‡РµСЂРЅРѕРІРёРє', 'error');
            }
            console.error('РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ С‡РµСЂРЅРѕРІРёРєР°:', error);
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

            this.showUploadDraftNote('Р§РµСЂРЅРѕРІРёРє РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅ');
        } catch (error) {
            console.error('РћС€РёР±РєР° РІРѕСЃСЃС‚Р°РЅРѕРІР»РµРЅРёСЏ С‡РµСЂРЅРѕРІРёРєР°:', error);
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
            this.setElementHidden(this.uploadDraftNote, true);
            this.uploadDraftNote.textContent = '';
        }
        if (this.state.activeViewId === 'profile-view' && this.state.profileGridTab === 'drafts') {
            this.renderActiveProfileGrid();
        }
        if (showToast) {
            AdvancedViewRenderer.showToast('Р§РµСЂРЅРѕРІРёРє СѓРґР°Р»РµРЅ', 'info');
        }
    }

    showUploadDraftNote(text = '') {
        if (!this.uploadDraftNote) return;
        this.uploadDraftNote.textContent = text;
        this.setElementHidden(this.uploadDraftNote, !text);
        clearTimeout(this.uploadDraftNoteTimer);
        if (text) {
            this.uploadDraftNoteTimer = setTimeout(() => {
                if (!this.uploadDraftNote) return;
                this.setElementHidden(this.uploadDraftNote, true);
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
            AdvancedViewRenderer.showToast('Р’С‹Р±РµСЂРёС‚Рµ С…РѕС‚СЏ Р±С‹ РѕРґРёРЅ РёРЅС‚РµСЂРµСЃ РёР»Рё РЅР°Р¶РјРёС‚Рµ "РџСЂРѕРїСѓСЃС‚РёС‚СЊ"', 'warning');
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
            console.error('РћС€РёР±РєР° СЃРѕС…СЂР°РЅРµРЅРёСЏ onboarding:', error);
            AdvancedViewRenderer.showToast('РќРµ СѓРґР°Р»РѕСЃСЊ СЃРѕС…СЂР°РЅРёС‚СЊ РёРЅС‚РµСЂРµСЃС‹', 'error');
            return;
        }

        this.closeOnboardingModal();
        this.updateProfileUI();
        await this.loadFeed(true);
        AdvancedViewRenderer.showToast(skipped ? 'РњРѕР¶РЅРѕ РЅР°СЃС‚СЂРѕРёС‚СЊ РёРЅС‚РµСЂРµСЃС‹ РїРѕР·Р¶Рµ РІ РїСЂРѕС„РёР»Рµ' : 'РРЅС‚РµСЂРµСЃС‹ СЃРѕС…СЂР°РЅРµРЅС‹', 'success');
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
                AdvancedViewRenderer.showToast('РќРµС‚ РґРѕСЃС‚СѓРїР° Рє РєР°РјРµСЂРµ', 'error');
                return;
            }
            cameraPreview.style.display = 'block';
            uploadArea.style.display = 'none';
            AdvancedViewRenderer.showToast('РљР°РјРµСЂР° РІРєР»СЋС‡РµРЅР°', 'success');
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
        AdvancedViewRenderer.showToast('Р—Р°РїРёСЃСЊ РЅР°С‡Р°Р»Р°СЃСЊ', 'info');
    }

    stopRecording() {
        if (this.state.mediaRecorder && this.state.isRecording) {
            this.state.mediaRecorder.stop();
            this.recordBtn.classList.remove('recording');
            this.state.isRecording = false;
            AdvancedViewRenderer.showToast('Р—Р°РїРёСЃСЊ Р·Р°РІРµСЂС€РµРЅР°', 'success');
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
                    AdvancedViewRenderer.showToast('Р’РѕР№РґРёС‚Рµ, С‡С‚РѕР±С‹ СЃС‚Р°РІРёС‚СЊ Р»Р°Р№РєРё', 'warning');
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
                        const likeIcon = likeBtn.querySelector('.action-icon');
                        if (likeIcon) {
                            const defaultIcon = likeBtn.dataset.iconDefault || 'assets/feed-like.svg';
                            const activeIcon = likeBtn.dataset.iconActive || 'assets/feed-like-active.svg';
                            likeIcon.src = isLiked ? activeIcon : defaultIcon;
                        }

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

                        AdvancedViewRenderer.showToast(isLiked ? 'Р’Р°Рј РїРѕРЅСЂР°РІРёР»РѕСЃСЊ' : 'Р›Р°Р№Рє СѓРґР°Р»РµРЅ', isLiked ? 'success' : 'info');
                    } catch (err) {
                        console.error('РћС€РёР±РєР° Р»Р°Р№РєР°:', err);
                        AdvancedViewRenderer.showToast(err?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РїРѕСЃС‚Р°РІРёС‚СЊ Р»Р°Р№Рє', 'error');
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
                        AdvancedViewRenderer.showToast('РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РєСЂС‹С‚СЊ РїСЂРѕС„РёР»СЊ', 'warning');
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
                        AdvancedViewRenderer.showToast('Р’РѕР№РґРёС‚Рµ, С‡С‚РѕР±С‹ РїРѕРґРїРёСЃР°С‚СЊСЃСЏ', 'warning');
                        return;
                    }
                    if (!authorUid) {
                        AdvancedViewRenderer.showToast('РќРµ СѓРґР°Р»РѕСЃСЊ РѕРїСЂРµРґРµР»РёС‚СЊ Р°РІС‚РѕСЂР°', 'warning');
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
                                AdvancedViewRenderer.showToast('РџРѕРґРїРёСЃРєР° РѕС‚РјРµРЅРµРЅР°', 'info');
                            } else if (hasPendingRequest) {
                                await firebaseService.unsubscribe(authorUid);
                                followPlus.textContent = '+';
                                followPlus.style.background = 'var(--accent-color)';
                                AdvancedViewRenderer.showToast('Р—Р°СЏРІРєР° РЅР° РїРѕРґРїРёСЃРєСѓ РѕС‚РјРµРЅРµРЅР°', 'info');
                            } else {
                                const result = await firebaseService.subscribe(authorUid);
                                if (result && result.status === 'requested') {
                                    followPlus.textContent = 'вЂ¦';
                                    followPlus.style.background = 'rgba(126, 148, 182, 0.95)';
                                    AdvancedViewRenderer.showToast('Р—Р°СЏРІРєР° РЅР° РїРѕРґРїРёСЃРєСѓ РѕС‚РїСЂР°РІР»РµРЅР°', 'success');
                                } else {
                                    followPlus.textContent = 'вњ“';
                                    followPlus.style.background = 'var(--accent-secondary)';
                                    AdvancedViewRenderer.showToast('РџРѕРґРїРёСЃРєР° РѕС„РѕСЂРјР»РµРЅР°', 'success');
                                }
                            }
                        } else {
                            AdvancedViewRenderer.showToast('РџРѕРґРїРёСЃРєРё РґРѕСЃС‚СѓРїРЅС‹ РїРѕСЃР»Рµ РїРѕРґРєР»СЋС‡РµРЅРёСЏ Р±Р°Р·С‹', 'warning');
                        }
                    } catch (err) {
                        console.error(err);
                        AdvancedViewRenderer.showToast(err?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ РёР·РјРµРЅРёС‚СЊ РїРѕРґРїРёСЃРєСѓ', 'error');
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
                    AdvancedViewRenderer.showToast(`РџРѕРёСЃРє РїРѕ ${tag}`, 'info');
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
            AdvancedViewRenderer.showToast('Р’С‹Р±РµСЂРёС‚Рµ РІРёРґРµРѕ С„Р°Р№Р»', 'warning');
            return;
        }
        if (file.size > 100 * 1024 * 1024) {
            AdvancedViewRenderer.showToast('Р¤Р°Р№Р» СЃР»РёС€РєРѕРј Р±РѕР»СЊС€РѕР№ (РјР°РєСЃ. 100MB)', 'error');
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
            AdvancedViewRenderer.showToast('Р”РѕСЃС‚СѓРї С‚РѕР»СЊРєРѕ РґР»СЏ Р°РґРјРёРЅРёСЃС‚СЂР°С‚РѕСЂР°', 'warning');
            viewId = 'profile-view';
        }

        document.querySelectorAll('video').forEach(v => v.pause());
        if (viewId !== 'feed-view') this.closeStoryViewer();
        if (viewId !== 'profile-view') this.closeProfileAvatarPreview();
        this.state.activeViewId = viewId;
        if (viewId !== 'messages-view') {
            this.teardownChatRealtime();
            this.hideEmojiPicker();
            this.hideStickerPicker();
            this.updateTypingStatus(false);
            if (this.chatDialog) this.chatDialog.style.setProperty('--keyboard-offset', '0px');
            if (typeof this.setMessagesPanelMode === 'function') this.setMessagesPanelMode('list');
        }
        this.views.forEach(v => v.classList.remove('active'));
        
        const targetView = document.getElementById(viewId);
        if (targetView) {
            targetView.classList.add('active');
            
            this.navItems.forEach(n => {
                n.classList.toggle('active', n.dataset.target === viewId);
            });
            
            if (viewId === 'auth-view') {
                this.setAuthFormMode('login');
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
                if (typeof this.setMessagesPanelMode === 'function') this.setMessagesPanelMode('list');
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
        if (this.accountSwitchMenu) {
            this.setElementHidden(this.accountSwitchMenu, !isOwnProfileView);
        }

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
            this.setElementHidden(this.messagesBadge, false);
        } else {
            this.setElementHidden(this.messagesBadge, true);
        }
    }

    getMessagePreviewText(message = {}) {
        const msg = message || {};
        const mime = String(msg.file?.mime || '').toLowerCase();
        if (msg.type === 'voice' || (msg.type === 'file' && mime.startsWith('audio/'))) return '🎤 Голосовое';
        if (msg.type === 'file') return `рџ“Ћ ${msg.file?.name || 'Р¤Р°Р№Р»'}`;
        if (msg.type === 'sticker') return 'рџЄ„ РЎС‚РёРєРµСЂ';
        if (msg.type === 'video-circle') return 'рџЋҐ Р’РёРґРµРѕРєСЂСѓР¶РѕРє';
        if (msg.type === 'call-event') return 'рџ“№ Р’РёРґРµРѕР·РІРѕРЅРѕРє';
        if (msg.type === 'story-reply') return '↪ История';
        return String(msg.content || '').trim();
    }

    maybeShowIncomingMessageToast(message) {
        const msg = message || {};
        const chatId = msg.chatId || null;

        // If user is already inside this chat, don't spam a toast.
        if (this.state.activeViewId === 'messages-view'
            && typeof this.isMessagesChatOpen === 'function'
            && this.isMessagesChatOpen()
            && this.state.currentChatId
            && chatId
            && String(this.state.currentChatId) === String(chatId)) {
            return;
        }

        const fromUser = msg.fromUser || 'user';
        const preview = this.getMessagePreviewText(msg);

        const trimmed = preview.length > 80 ? (preview.slice(0, 77) + '...') : preview;
        const text = `рџ’¬ @${fromUser}: ${trimmed || 'СЃРѕРѕР±С‰РµРЅРёРµ'}`;

        if ('Notification' in window
            && Notification.permission === 'granted'
            && document.visibilityState !== 'visible') {
            try {
                new Notification(`РЎРѕРѕР±С‰РµРЅРёРµ РѕС‚ @${fromUser}`, {
                    body: trimmed || 'РќРѕРІРѕРµ СЃРѕРѕР±С‰РµРЅРёРµ',
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
        const text = `рџ“№ Р’РёРґРµРѕР·РІРѕРЅРѕРє РѕС‚ @${fromUser}`;
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
                console.error('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РєРѕРјРјРµРЅС‚Р°СЂРёРµРІ:', error);
            }
        }
    }

    async sendComment() {
        const input = document.getElementById('comment-input');
        const text = input.value.trim();
        
        if (!text) return;
        if (!this.dataService.getCurrentUser()) {
            AdvancedViewRenderer.showToast('Р’РѕР№РґРёС‚Рµ, С‡С‚РѕР±С‹ РєРѕРјРјРµРЅС‚РёСЂРѕРІР°С‚СЊ', 'warning');
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
            AdvancedViewRenderer.showToast('Р’РёРґРµРѕ РґР»СЏ РєРѕРјРјРµРЅС‚Р°СЂРёСЏ РЅРµ РЅР°Р№РґРµРЅРѕ', 'warning');
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
                console.error('РћС€РёР±РєР° РґРѕР±Р°РІР»РµРЅРёСЏ РєРѕРјРјРµРЅС‚Р°СЂРёСЏ:', error);
                comment = this.dataService.addComment(targetId, text);
                if (!comment) {
                    AdvancedViewRenderer.showToast('РќРµ СѓРґР°Р»РѕСЃСЊ РѕС‚РїСЂР°РІРёС‚СЊ РєРѕРјРјРµРЅС‚Р°СЂРёР№', 'error');
                    return;
                }
                AdvancedViewRenderer.showToast('РЎР±РѕР№ СЃРµС‚Рё: РєРѕРјРјРµРЅС‚Р°СЂРёР№ СЃРѕС…СЂР°РЅРµРЅ Р»РѕРєР°Р»СЊРЅРѕ', 'warning');
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
                || 'assets/default-avatar.svg';
            const newCommentHTML = `
                <div class="comment-item">
                    <img src="${avatar}" class="comment-avatar">
                    <div class="comment-content">
                        <div class="comment-author">
                            @${comment.user}
                            <span class="comment-time">С‚РѕР»СЊРєРѕ С‡С‚Рѕ</span>
                        </div>
                        <div class="comment-text">${comment.text}</div>
                        <div class="comment-actions">
                            <span class="comment-action">рџ’¬ РћС‚РІРµС‚РёС‚СЊ</span>
                            <span class="comment-action">вќ¤пёЏ 0</span>
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
            AdvancedViewRenderer.showToast('РљРѕРјРјРµРЅС‚Р°СЂРёР№ РґРѕР±Р°РІР»РµРЅ', 'success');
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
            AdvancedViewRenderer.showToast('РњРѕР¶РЅРѕ СѓРґР°Р»СЏС‚СЊ С‚РѕР»СЊРєРѕ СЃРІРѕРё РІРёРґРµРѕ', 'warning');
            return false;
        }

        if (!confirm('РЈРґР°Р»РёС‚СЊ СЌС‚Рѕ РІРёРґРµРѕ?')) return false;

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

            const deletedKey = this.getVideoStorageId(video);
            if (deletedKey) {
                const savedEntries = this.readSavedVideosStorage();
                const nextEntries = savedEntries.filter((entry) => entry.key !== deletedKey);
                if (nextEntries.length !== savedEntries.length) {
                    this.writeSavedVideosStorage(nextEntries);
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

            if (this.state.activeViewId === 'profile-view') {
                this.renderActiveProfileGrid();
            }

            AdvancedViewRenderer.showToast('Р’РёРґРµРѕ СѓРґР°Р»РµРЅРѕ', 'success');
            return true;
        } catch (err) {
            console.error(err);
            AdvancedViewRenderer.showToast(err?.message || 'РќРµ СѓРґР°Р»РѕСЃСЊ СѓРґР°Р»РёС‚СЊ РІРёРґРµРѕ', 'error');
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
        if (currentUid) {
            const savedLabel = this.isVideoSaved(video) ? 'Удалить из сохраненных' : 'Сохранить';
            shareModal.insertAdjacentHTML('afterbegin', `
                <div class="share-option" data-action="save">
                    <svg viewBox="0 0 24 24">
                        <path d="M6 3h12a2 2 0 0 1 2 2v16l-8-4-8 4V5a2 2 0 0 1 2-2z"></path>
                    </svg>
                    <span>${savedLabel}</span>
                </div>
            `);
        }
        if (!isOwnAuthor && authorUid) {
            shareModal.insertAdjacentHTML('beforeend', `
                <div class="share-option" data-action="hide-author">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 6a9.77 9.77 0 0 1 9 6 9.77 9.77 0 0 1-9 6 9.77 9.77 0 0 1-9-6 9.77 9.77 0 0 1 9-6m0-2C6.5 4 1.73 7.11 0 12c1.73 4.89 6.5 8 12 8s10.27-3.11 12-8c-1.73-4.89-6.5-8-12-8zm0 5a3 3 0 1 0 3 3 3 3 0 0 0-3-3z"></path>
                    </svg>
                    <span>РЎРєСЂС‹С‚СЊ Р°РІС‚РѕСЂР°</span>
                </div>
                <div class="share-option" data-action="block-author">
                    <svg viewBox="0 0 24 24">
                        <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm6.36 14.95L7.05 5.64A8 8 0 0 1 18.36 16.95zM5.64 7.05l11.31 11.31A8 8 0 0 1 5.64 7.05z"></path>
                    </svg>
                    <span>Р—Р°Р±Р»РѕРєРёСЂРѕРІР°С‚СЊ</span>
                </div>
                <div class="share-option danger" data-action="report">
                    <svg viewBox="0 0 24 24">
                        <path d="M14.4 6 14 4H5v16h2v-6h5.6l.4 2H21V6z"></path>
                    </svg>
                    <span>РџРѕР¶Р°Р»РѕРІР°С‚СЊСЃСЏ</span>
                </div>
            `);
        }
        if (this.canCurrentUserDeleteVideo(video)) {
            shareModal.insertAdjacentHTML('beforeend', `
                <div class="share-option danger" data-action="delete">
                    <svg viewBox="0 0 24 24">
                        <path d="M6 7h12l-1 14H7L6 7zm3-3h6l1 2H8l1-2zM4 7h16v2H4V7z"></path>
                    </svg>
                    <span>РЈРґР°Р»РёС‚СЊ</span>
                </div>
            `);
        }
        shareModal.classList.add('open');
        
        shareModal.querySelectorAll('.share-option').forEach(option => {
            option.addEventListener('click', async () => {
                const action = option.dataset.action;
                
                switch(action) {
                    case 'save':
                        this.toggleSaveVideo(video);
                        break;
                    case 'copy':
                        navigator.clipboard.writeText(option.dataset.url || '')
                            .then(() => AdvancedViewRenderer.showToast('РЎСЃС‹Р»РєР° СЃРєРѕРїРёСЂРѕРІР°РЅР°', 'success'));
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
            this.setSearchEmptyMessage('Начните печатать для поиска');
            this.setElementHidden(this.searchEmpty, false);
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
        this.setElementHidden(this.searchEmpty, true);

        if (videoResults.length === 0 && profileResults.length === 0) {
            this.setSearchEmptyMessage('Ничего не найдено');
            this.setElementHidden(this.searchEmpty, false);
            return;
        }

        profileResults.forEach(profile => {
            const profileItem = document.createElement('div');
            profileItem.className = 'search-result-item profile-result';
            profileItem.innerHTML = `
                <img src="${profile.avatar || 'assets/default-avatar.svg'}" alt="avatar" class="search-result-thumbnail">
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
                <img src="${video.thumbnail}" alt="Р’РёРґРµРѕ" class="search-result-thumbnail">
                <div class="search-result-info">
                    <div class="search-result-author">${this.renderUserLabel(video.author, isAuthorVerified)}</div>
                    <div class="search-result-desc">${video.desc}</div>
                    <div class="search-result-views">${video.views} РїСЂРѕСЃРјРѕС‚СЂРѕРІ</div>
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
        const editBtn = document.getElementById('edit-profile-btn');
        const shareBtn = document.getElementById('share-profile-btn');
        const followBtn = document.getElementById('follow-profile-btn');
        const messageBtn = document.getElementById('message-profile-btn');
        const avatarStatus = document.querySelector('#profile-view .profile-avatar-status');
        this.updateAdminMenuVisibility();
        if (!userProfile) {
            this.setProfileViewMode('guest');
            if (addStoryBtn) addStoryBtn.style.display = 'none';
            if (this.openLiveBtn) this.openLiveBtn.style.display = 'none';
            if (editBtn) editBtn.style.display = 'none';
            if (shareBtn) shareBtn.style.display = 'none';
            if (followBtn) followBtn.style.display = 'none';
            if (messageBtn) messageBtn.style.display = 'none';
            if (avatarStatus) avatarStatus.style.display = 'none';
            document.getElementById('profile-name').textContent = '@guest';
            document.getElementById('profile-avatar-img').src = 'assets/default-avatar.svg';
            this.updateProfileDisplayNameUi('guest', false);
            this.setProfileTopHandle('guest');
            document.getElementById('profile-bio').textContent = '';
            
            document.getElementById('following-stat').querySelector('.stat-num').textContent = '0';
            document.getElementById('followers-stat').querySelector('.stat-num').textContent = '0';
            document.getElementById('likes-stat').querySelector('.stat-num').textContent = '0';
            if (this.profilePrivateToggle) this.profilePrivateToggle.checked = false;
            if (this.profileAdultToggle) this.profileAdultToggle.checked = false;
            if (this.profileFollowRequestsBtn) this.profileFollowRequestsBtn.textContent = '\u0417\u0430\u044f\u0432\u043a\u0438: 0';
            this.setElementHidden(this.profileRequestsMenu, true);
            if (this.profileRequestsMenuText) this.profileRequestsMenuText.textContent = '\u0417\u0430\u044f\u0432\u043a\u0438: 0';

            this.profileViewContext = {
                isOwn: false,
                profileUid: null,
                baseVideos: [],
                loading: false
            };
            this.applyProfileMediaTabsVisibility({ isOwn: false });
            this.setProfileGridTab('videos', { rerender: false });
            this.syncProfileAvatarStoryState({ clear: true });
            this.resetProfileStoryCollectionsUi();
            this.renderProfileGridMessage(document.getElementById('profile-grid'), 'Войдите, чтобы увидеть свой профиль');
            return;
        }
        if (addStoryBtn) addStoryBtn.style.display = 'none';
        if (this.openLiveBtn) this.openLiveBtn.style.display = 'none';
        this.setProfileViewMode('own');
        
        document.getElementById('profile-name').innerHTML = this.renderUserLabel(userProfile.name, !!userProfile.verified);
        document.getElementById('profile-avatar-img').src = userProfile.avatar || 'assets/default-avatar.svg';
        const ownDisplayName = String(userProfile.displayName || userProfile.name || 'user').replace(/^@+/, '').trim() || 'user';
        this.updateProfileDisplayNameUi(ownDisplayName, !!userProfile.verified);
        this.setProfileTopHandle(userProfile.name || ownDisplayName);
        document.getElementById('profile-bio').textContent = userProfile.bio || '';
        if (this.profilePrivateToggle) {
            this.profilePrivateToggle.checked = userProfile.privateAccount === true;
        }
        if (this.profileAdultToggle) {
            this.profileAdultToggle.checked = userProfile.allowAdultContent === true;
        }
        const requestsCount = Array.isArray(userProfile.followRequests) ? userProfile.followRequests.length : 0;
        if (this.profileFollowRequestsBtn) {
            this.profileFollowRequestsBtn.textContent = `\u0417\u0430\u044f\u0432\u043a\u0438: ${requestsCount}`;
        }
        this.setElementHidden(this.profileRequestsMenu, false);
        if (this.profileRequestsMenuText) this.profileRequestsMenuText.textContent = `\u0417\u0430\u044f\u0432\u043a\u0438: ${requestsCount}`;
        
        if (userProfile.location) {
            this.setElementHidden('profile-location', false);
            document.getElementById('location-text').textContent = userProfile.location;
        } else {
            this.setElementHidden('profile-location', true);
        }
        
        if (userProfile.website) {
            this.setElementHidden('profile-website', false);
            document.getElementById('website-link').textContent = userProfile.website;
            document.getElementById('website-link').href = userProfile.website.startsWith('http') ? userProfile.website : 'https://' + userProfile.website;
        } else {
            this.setElementHidden('profile-website', true);
        }
        
        if (userProfile.interests) {
            this.setElementHidden('profile-interests', false);
            document.getElementById('interests-text').textContent = userProfile.interests;
        } else {
            this.setElementHidden('profile-interests', true);
        }
        
        if (userProfile.gender && userProfile.gender !== 'other') {
            this.setElementHidden('profile-gender', false);
            const genderLabels = { male: 'РњСѓР¶С‡РёРЅР°', female: 'Р–РµРЅС‰РёРЅР°', other: 'РќРµ СѓРєР°Р·Р°РЅРѕ' };
            document.getElementById('gender-text').textContent = genderLabels[userProfile.gender] || userProfile.gender;
        } else {
            this.setElementHidden('profile-gender', true);
        }
        
        document.getElementById('following-stat').querySelector('.stat-num').textContent = AdvancedViewRenderer.formatNumber(userProfile.stats.following);
        document.getElementById('followers-stat').querySelector('.stat-num').textContent = AdvancedViewRenderer.formatNumber(userProfile.stats.followers);
        document.getElementById('likes-stat').querySelector('.stat-num').textContent = AdvancedViewRenderer.formatNumber(userProfile.stats.likes);

        this.profileViewContext = {
            isOwn: true,
            profileUid: userProfile.uid || null,
            baseVideos: Array.isArray(userProfile.videos) ? userProfile.videos : [],
            loading: false
        };
        this.applyProfileMediaTabsVisibility({ isOwn: true });
        this.setProfileGridTab(this.state.profileGridTab || 'videos', { rerender: false });
        this.syncProfileAvatarStoryState();
        this.refreshProfileStoryCollections({
            profileUid: userProfile.uid || null,
            isOwn: true
        }).catch(() => {});

        // If Firebase is available, load videos from Firestore so they persist after reload.
        if (typeof firebaseService !== 'undefined'
            && firebaseService
            && typeof firebaseService.isInitialized === 'function'
            && firebaseService.isInitialized()
            && typeof firebaseService.getVideosByUid === 'function'
            && userProfile.uid) {
            this.profileViewContext.loading = true;
            this.renderActiveProfileGrid();
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
                    this.profileViewContext.baseVideos = list;
                    this.profileViewContext.loading = false;
                    this.renderActiveProfileGrid();
                })
                .catch((err) => {
                    console.error('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РІРёРґРµРѕ РїСЂРѕС„РёР»СЏ:', err);
                    this.profileViewContext.baseVideos = Array.isArray(userProfile.videos) ? userProfile.videos : [];
                    this.profileViewContext.loading = false;
                    this.renderActiveProfileGrid();
                });
            return;
        }

        // Fallback: render from local cache
        this.profileViewContext.baseVideos = Array.isArray(userProfile.videos) ? userProfile.videos : [];
        this.profileViewContext.loading = false;
        this.renderActiveProfileGrid();
    }

    // Messaging and notifications logic moved to js/app-messages.js.

    // Profile deeplinks/actions logic moved to js/app-profile.js.

}

// Expose constructor for extracted feature modules (e.g. js/app-feed.js).
if (typeof window !== 'undefined') {
    window.AdvancedApp = AdvancedApp;
}

// РРЅРёС†РёР°Р»РёР·Р°С†РёСЏ
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AdvancedApp();
});


