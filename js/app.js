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
            isRecording: false,
            mediaRecorder: null,
            recordedChunks: [],
            selectedFilter: 'none',
            theme: 'dark',
            avatarData: null,
            currentChatId: null,
            currentChatUser: null,
            currentChatUid: null
        };
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
        
        this.init();
    }

    async init() {
        console.log('🚀 Initializing app...');
        this.cacheElements();
        this.setupTheme();
        this.setupEventListeners();
        this.setupNotifications();
        this.setupPullToRefresh();
        this.setupSwipe();
        
        await this.loadFeed(true);
        this.updateProfileUI();
        
        this.setupDeepLinks();
        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('video');
        if (videoId) {
            this.navigateTo('feed-view');
            setTimeout(() => {
                const videoElement = document.querySelector(`[data-id="${videoId}"]`);
                if (videoElement) videoElement.scrollIntoView({ behavior: 'smooth' });
            }, 1000);
        }
    }

    cacheElements() {
        this.feedContainer = document.getElementById('feed-container');
        this.views = document.querySelectorAll('.view');
        this.navItems = document.querySelectorAll('.nav-item');
        this.toast = document.getElementById('toast');
        this.commentsSheet = document.getElementById('comments-sheet');
        this.shareModal = document.getElementById('share-modal');
        this.hamburgerBtn = document.getElementById('hamburger-btn');
        this.menuDropdown = document.getElementById('menu-dropdown');
        this.themeToggleMenu = document.getElementById('theme-toggle-menu');
        this.logoutMenu = document.getElementById('logout-menu');
        this.searchViewInput = document.getElementById('search-view-input');
        this.searchViewClear = document.getElementById('search-view-clear');
        this.searchResults = document.getElementById('search-results');
        this.searchEmpty = document.getElementById('search-empty');
        
        this.notificationsBadge = document.getElementById('notification-badge');
        this.notificationsList = document.getElementById('notifications-list');
        this.notificationTabs = document.querySelectorAll('.notification-tab');
        this.notificationsEmpty = document.getElementById('notifications-empty');
        
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
        this.emojiToggleBtn = document.getElementById('emoji-toggle-btn');
        this.attachFileBtn = document.getElementById('attach-file-btn');
        this.chatFileInput = document.getElementById('chat-file-input');
        this.messageInputArea = document.getElementById('message-input-area');

        this.cameraPreview = document.getElementById('camera-preview');
        this.cameraVideo = document.getElementById('camera-video');
        this.cameraCanvas = document.getElementById('camera-canvas');
        this.recordBtn = document.getElementById('record-btn');
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

    setupEventListeners() {
        this.navItems.forEach(item => {
            item.addEventListener('click', () => {
                const targetId = item.dataset.target;
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
        this.setupMessagesEvents();
        this.setupEditProfileEvents();

        this.feedContainer.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = this.feedContainer;
            if (scrollHeight - scrollTop - clientHeight < 100 && !this.state.loading && this.state.hasMore) {
                this.loadFeed();
            }
        });
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
            if (file) this.previewVideo(file);
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
            }
        });

        document.getElementById('publish-btn').addEventListener('click', async () => {
            const file = fileInput.files[0];
            const desc = document.getElementById('upload-desc').value.trim();
            
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
                    videoBlob = new Blob(this.state.recordedChunks, { type: 'video/webm' });
                } else {
                    videoBlob = file;
                }
                
                const tags = document.getElementById('upload-tags').value.trim();
                const allowComments = document.getElementById('allow-comments').checked;
                const isPrivate = document.getElementById('private-video').checked;
                
                await this.dataService.uploadVideo(videoBlob, {
                    desc,
                    tags,
                    filter: this.state.selectedFilter,
                    allowComments,
                    private: isPrivate
                });
                
                AdvancedViewRenderer.showToast('Видео опубликовано!', 'success');
                
                fileInput.value = '';
                document.getElementById('upload-desc').value = '';
                document.getElementById('upload-tags').value = '';
                document.getElementById('upload-preview').style.display = 'none';
                uploadArea.style.display = 'flex';
                this.state.recordedChunks = [];
                this.state.selectedFilter = 'none';
                
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
        this.state.mediaRecorder = new MediaRecorder(this.cameraStream, { mimeType: 'video/webm;codecs=vp9' });
        
        this.state.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) this.state.recordedChunks.push(event.data);
        };
        
        this.state.mediaRecorder.onstop = () => {
            const blob = new Blob(this.state.recordedChunks, { type: 'video/webm' });
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
            if (diff > 100) {
                await this.loadFeed(true);
                AdvancedViewRenderer.showToast('Лента обновлена', 'success');
            }
            pullIndicator.style.opacity = '0';
            pullIndicator.style.transform = 'translateY(0)';
            pullIndicator.classList.remove('active');
        });
    }

    setupSwipe() {
        let startX = 0, startY = 0, isSwiping = false;
        document.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isSwiping = true;
        });
        document.addEventListener('touchmove', (e) => {
            if (!isSwiping) return;
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const diffX = currentX - startX;
            const diffY = currentY - startY;
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) e.preventDefault();
        });
        document.addEventListener('touchend', () => isSwiping = false);
    }

    async loadFeed(clear = false) {
        if (this.state.loading) return;
        this.state.loading = true;
        
        if (clear) {
            this.state.currentPage = 0;
            this.state.hasMore = true;
            this.feedContainer.innerHTML = '<div class="skeleton-video"></div><div class="skeleton-video"></div><div class="skeleton-video"></div>';
        } else {
            AdvancedViewRenderer.showLoading();
        }
        
        try {
            const { videos, hasMore } = await this.dataService.getFeed(this.state.currentPage);
            
            if (clear) this.feedContainer.innerHTML = '';
            
            videos.forEach(video => {
                const isSubscribed = this.dataService.isSubscribed(video.author);
                const card = AdvancedViewRenderer.createVideoCard(video, {
                    autoplay: this.dataService.settings.autoplay,
                    isSubscribed: isSubscribed
                });
                this.feedContainer.appendChild(card);
                this.dataService.incrementViews(video.id);
            });
            
            this.attachVideoEvents();
            this.setupVideoProgress();
            
            this.state.currentPage++;
            this.state.hasMore = hasMore;
            
            if (clear) {
                const firstVideo = this.feedContainer.querySelector('video');
                if (firstVideo && this.dataService.settings.autoplay) {
                    setTimeout(() => firstVideo.play().catch(console.error), 500);
                }
            }
        } catch (error) {
            console.error('Error loading feed:', error);
            AdvancedViewRenderer.showToast('Ошибка загрузки ленты', 'error');
        } finally {
            this.state.loading = false;
            AdvancedViewRenderer.hideLoading();
        }
    }

    attachVideoEvents() {
        const videoItems = this.feedContainer.querySelectorAll('.video-item');
        
        videoItems.forEach(item => {
            const video = item.querySelector('video');
            const likeBtn = item.querySelector('.like-btn');
            const commentBtn = item.querySelector('.comment-btn');
            const shareBtn = item.querySelector('.share-btn');
            const avatar = item.querySelector('.avatar-container');
            const hashtags = item.querySelectorAll('.hashtag');
            const videoId = item.dataset.id;
            
            item.addEventListener('click', (e) => {
                if (e.target.closest('.action-btn') || e.target.closest('.avatar-container')) return;
                if (video.paused) {
                    video.play();
                    document.querySelectorAll('video').forEach(v => { if (v !== video) v.pause(); });
                } else {
                    video.pause();
                }
            });
            
            likeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (!firebaseService.getCurrentUser()) {
                    this.navigateTo('auth-view');
                    AdvancedViewRenderer.showToast('Войдите, чтобы ставить лайки', 'warning');
                    return;
                }
                const isLiked = firebaseService.toggleLike(parseInt(videoId));
                likeBtn.classList.toggle('liked', isLiked);
                const countSpan = likeBtn.querySelector('.like-count');
                let count = parseInt(countSpan.textContent.replace(/[KM]/g, '')) || 0;
                count = isLiked ? count + 1 : Math.max(0, count - 1);
                countSpan.textContent = AdvancedViewRenderer.formatNumber(count);
                AdvancedViewRenderer.showToast(isLiked ? '❤️ Вам понравилось' : '💔 Лайк удален', isLiked ? 'success' : 'info');
            });
            
            commentBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.openComments(parseInt(videoId));
            });
            
            shareBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.showShareModal(parseInt(videoId));
            });
            
            avatar.addEventListener('click', (e) => {
                e.stopPropagation();
                const currentUser = firebaseService.getCurrentUser();
                const videosAuthor = video.author;
                
                if (currentUser && currentUser.name === videosAuthor) {
                    this.navigateTo('profile-view');
                    return;
                }
                
                if (!currentUser) {
                    this.navigateTo('auth-view');
                    AdvancedViewRenderer.showToast('Войдите, чтобы подписаться', 'warning');
                    return;
                }
                
                const followPlus = avatar.querySelector('.follow-plus');
                if (followPlus.textContent === '+') {
                    firebaseService.subscribe(videosAuthor);
                    followPlus.textContent = '✓';
                    followPlus.style.background = 'var(--accent-secondary)';
                    AdvancedViewRenderer.showToast('Подписка оформлена', 'success');
                } else {
                    firebaseService.unsubscribe(videosAuthor);
                    followPlus.textContent = '+';
                    followPlus.style.background = 'var(--accent-color)';
                    AdvancedViewRenderer.showToast('Подписка отменена', 'info');
                }
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
                video.addEventListener('timeupdate', () => {
                    const progressBar = item.querySelector('.video-progress-bar');
                    if (progressBar) {
                        const percent = (video.currentTime / video.duration) * 100;
                        progressBar.style.width = `${percent}%`;
                    }
                });
                
                video.addEventListener('ended', () => {
                    video.currentTime = 0;
                    video.play();
                });
            }
        });
    }

    setupVideoProgress() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                const video = entry.target.querySelector('video');
                if (!video) return;
                if (entry.isIntersecting && this.dataService.settings.autoplay) {
                    video.play().catch(e => console.log('Autoplay blocked:', e));
                } else {
                    video.pause();
                }
            });
        }, { threshold: 0.6 });
        
        document.querySelectorAll('.video-item').forEach(item => observer.observe(item));
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
        document.querySelectorAll('video').forEach(v => v.pause());
        if (viewId !== 'messages-view') {
            this.teardownChatRealtime();
            this.hideEmojiPicker();
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
                setTimeout(() => {
                    const currentVideo = this.feedContainer.querySelector('.video-item:first-child video');
                    if (currentVideo && this.dataService.settings.autoplay) {
                        currentVideo.play().catch(console.error);
                    }
                }, 300);
            }
            if (viewId === 'upload-view') {
                this.setupCamera();
            }
            if (viewId === 'messages-view') {
                if (this.chatDialog && this.messagesListSection) {
                    this.chatDialog.style.display = 'none';
                    this.messagesListSection.style.display = 'flex';
                }
                this.loadChats();
            }
        }
    }

    openComments(videoId) {
        const video = this.dataService.userVideos.find(v => v.id === videoId);
        if (!video) return;
        
        this.state.activeCommentsVideoId = videoId;
        
        const commentsList = document.getElementById('comments-list');
        const commentCount = document.getElementById('comment-count');
        
        commentCount.textContent = video.comments.length;
        commentsList.innerHTML = AdvancedViewRenderer.renderComments(video.comments);
        
        this.commentsSheet.classList.add('open');
        document.getElementById('comment-input').focus();
    }

    sendComment() {
        const input = document.getElementById('comment-input');
        const text = input.value.trim();
        
        if (!text) return;
        if (!this.dataService.getCurrentUser()) {
            AdvancedViewRenderer.showToast('Войдите, чтобы комментировать', 'warning');
            return;
        }
        
        const comment = this.dataService.addComment(this.state.activeCommentsVideoId, text);
        if (comment) {
            const commentsList = document.getElementById('comments-list');
            const newCommentHTML = `
                <div class="comment-item">
                    <img src="${firebaseService.getCurrentUser().avatar}" class="comment-avatar">
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
            commentCount.textContent = parseInt(commentCount.textContent) + 1;
            
            input.value = '';
            AdvancedViewRenderer.showToast('Комментарий добавлен', 'success');
        }
    }

    showShareModal(videoId) {
        const video = this.dataService.userVideos.find(v => v.id === videoId);
        if (!video) return;
        
        const shareModal = document.getElementById('share-modal');
        shareModal.innerHTML = AdvancedViewRenderer.renderShareOptions(videoId);
        shareModal.classList.add('open');
        
        shareModal.querySelectorAll('.share-option').forEach(option => {
            option.addEventListener('click', () => {
                const action = option.dataset.action;
                const shareUrl = option.dataset.url;
                
                switch(action) {
                    case 'copy':
                        navigator.clipboard.writeText(shareUrl).then(() => AdvancedViewRenderer.showToast('Ссылка скопирована', 'success'));
                        break;
                    case 'whatsapp':
                        window.open(`https://wa.me/?text=${encodeURIComponent(video.desc + ' ' + shareUrl)}`, '_blank');
                        break;
                    case 'telegram':
                        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(video.desc)}`, '_blank');
                        break;
                    case 'twitter':
                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(video.desc)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
                        break;
                }
                shareModal.classList.remove('open');
            });
        });
        
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) shareModal.classList.remove('open');
        });
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
                    const videoElement = document.querySelector(`[data-id="${video.id}"]`);
                    if (videoElement) {
                        videoElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        videoElement.querySelector('video').play();
                    }
                }, 300);
            });
            this.searchResults.appendChild(resultItem);
        });
    }

    updateProfileUI() {
        const userProfile = this.dataService.getUserProfile();
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
        grid.innerHTML = '';
        
        if (userProfile.videos.length === 0) {
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
        } else {
            userProfile.videos.forEach(video => {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item';
                gridItem.innerHTML = `
                    <video src="${video.url}" muted loop></video>
                    <div class="grid-overlay">
                        <div style="display: flex; align-items: center; gap: 5px; font-size: 11px;">
                            <span>❤️ ${AdvancedViewRenderer.formatNumber(video.likes)}</span>
                            <span>💬 ${video.comments.length}</span>
                        </div>
                    </div>
                `;
                
                gridItem.addEventListener('click', () => {
                    this.navigateTo('feed-view');
                    setTimeout(() => {
                        const videoElement = document.querySelector(`[data-id="${video.id}"]`);
                        if (videoElement) {
                            videoElement.scrollIntoView({ behavior: 'smooth' });
                            videoElement.querySelector('video')?.play();
                        }
                    }, 500);
                });
                
                grid.appendChild(gridItem);
            });
        }
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
            this.notificationsBadge.textContent = unreadCount;
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

        document.addEventListener('click', (e) => {
            if (!this.emojiPicker || !this.emojiToggleBtn) return;
            if (!this.emojiPicker.contains(e.target) && !this.emojiToggleBtn.contains(e.target)) {
                this.hideEmojiPicker();
            }
        });

        this.renderEmojiPicker();
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
            const safeText = this.escapeHtml(msg.content || '').replace(/\n/g, '<br>');
            const bodyHtml = msg.type === 'file'
                ? this.renderFileMessageBody(msg)
                : `<div class="message-content">${safeText}</div>`;

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
            });
        });
    }

    toggleEmojiPicker() {
        if (!this.emojiPicker) return;
        const open = this.emojiPicker.style.display !== 'none';
        this.emojiPicker.style.display = open ? 'none' : 'flex';
    }

    hideEmojiPicker() {
        if (this.emojiPicker) this.emojiPicker.style.display = 'none';
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

            // Videos: используем имя автора (в базе видео лежат по author)
            let videos = [];
            if (firebaseService.getVideosByAuthor) {
                videos = await firebaseService.getVideosByAuthor(profile.name);
            } else {
                // fallback: локальный поиск
                videos = this.dataService.userVideos.filter(v => v.author === profile.name);
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

            grid.innerHTML = videos.map(v => `
                <div class="grid-item" data-id="${v.id}">
                    <img src="${v.thumbnail}" alt="Видео">
                    <div class="grid-overlay">
                        <span>в–¶ ${v.views || 0}</span>
                    </div>
                </div>
            `).join('');

            grid.querySelectorAll('.grid-item').forEach(item => {
                item.addEventListener('click', () => {
                    const videoId = item.dataset.id;
                    this.navigateTo('feed-view');
                    setTimeout(() => {
                        const videoElement = document.querySelector(`[data-id="${videoId}"]`);
                        if (videoElement) {
                            videoElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            const vid = videoElement.querySelector('video');
                            if (vid) vid.play();
                        }
                    }, 300);
                });
            });
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
        const canManageVerification = !!(current && current.canVerify === true && targetUid);
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
