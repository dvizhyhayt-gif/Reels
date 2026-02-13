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
            avatarData: null
        };
        
        this.init();
        // Переключение между формами логина и регистрации
        
    }

    async init() {
        console.log('🚀 Initializing app...');
        this.cacheElements();
        console.log('✅ Elements cached');
        this.setupTheme();
        console.log('✅ Theme setup');
        this.setupEventListeners();
        console.log('✅ Event listeners setup');
        this.setupNotifications();
        console.log('✅ Notifications setup');
        await this.setupCamera();
        console.log('✅ Camera setup');
        this.setupPullToRefresh();
        this.setupSwipe();
        
        await this.loadFeed(true);
        this.updateProfileUI();
        
        const urlParams = new URLSearchParams(window.location.search);
        const videoId = urlParams.get('video');
        if (videoId) {
            this.navigateTo('feed-view');
            setTimeout(() => {
                const videoElement = document.querySelector(`[data-id="${videoId}"]`);
                if (videoElement) {
                    videoElement.scrollIntoView({ behavior: 'smooth' });
                }
            }, 1000);
        }
    }

    cacheElements() {
        console.log('🔍 Caching elements...');
        this.feedContainer = document.getElementById('feed-container');
        this.views = document.querySelectorAll('.view');
        this.navItems = document.querySelectorAll('.nav-item');
        console.log(`  ✓ Views: ${this.views.length}, Nav items: ${this.navItems.length}`);
        
        this.toast = document.getElementById('toast');
        this.commentsSheet = document.getElementById('comments-sheet');
        this.shareModal = document.getElementById('share-modal');
        this.quickFab = document.getElementById('quick-fab');
        this.hamburgerBtn = document.getElementById('hamburger-btn');
        this.menuDropdown = document.getElementById('menu-dropdown');
        this.themeToggleMenu = document.getElementById('theme-toggle-menu');
        this.logoutMenu = document.getElementById('logout-menu');
        this.searchViewInput = document.getElementById('search-view-input');
        this.searchViewClear = document.getElementById('search-view-clear');
        this.searchResults = document.getElementById('search-results');
        this.searchEmpty = document.getElementById('search-empty');
        
        // Notifications
        this.notificationsBadge = document.getElementById('notification-badge');
        this.notificationsList = document.getElementById('notifications-list');
        this.notificationTabs = document.querySelectorAll('.notification-tab');
        this.notificationsEmpty = document.getElementById('notifications-empty');
        console.log(`  ✓ Notifications: tabs=${this.notificationTabs.length}, badge=${!!this.notificationsBadge}`);
        
        // Messages
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
        console.log(`  ✓ Messages: chatList=${!!this.chatList}, messagesListSection=${!!this.messagesListSection}`);
    }

    setupTheme() {
        const theme = this.dataService.settings.theme;
        this.state.theme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        
        // Set initial theme text
        const themeText = document.getElementById('theme-text');
        themeText.textContent = theme === 'dark' ? 'Светлая тема' : 'Темная тема';
        
        // Hamburger menu toggle
        this.hamburgerBtn.addEventListener('click', () => {
            this.hamburgerBtn.classList.toggle('active');
            this.menuDropdown.classList.toggle('active');
        });
        
        // Close menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.hamburgerBtn.contains(e.target) && !this.menuDropdown.contains(e.target)) {
                this.hamburgerBtn.classList.remove('active');
                this.menuDropdown.classList.remove('active');
            }
        });
        
        // Theme toggle in menu
        this.themeToggleMenu.addEventListener('click', () => {
            const newTheme = this.state.theme === 'dark' ? 'light' : 'dark';
            this.state.theme = newTheme;
            document.documentElement.setAttribute('data-theme', newTheme);
            this.dataService.settings.theme = newTheme;
            this.dataService.saveSettings();
            
            // Update menu text
            const themeText = document.getElementById('theme-text');
            themeText.textContent = newTheme === 'dark' ? 'Светлая тема' : 'Темная тема';
            
            AdvancedViewRenderer.showToast(`Тема изменена на ${newTheme === 'dark' ? 'темную' : 'светлую'}`, 'success');
            
            // Close menu
            this.hamburgerBtn.classList.remove('active');
            this.menuDropdown.classList.remove('active');
        });
        
        // Logout
        this.logoutMenu.addEventListener('click', async () => {
            if (confirm('Вы уверены, что хотите выйти из аккаунта?')) {
                try {
                    // Используем dataService для logout
                    await this.dataService.logout();
                    AdvancedViewRenderer.showToast('Вы вышли из аккаунта', 'success');
                    
                    this.navigateTo('auth-view');
                    this.hamburgerBtn.classList.remove('active');
                    this.menuDropdown.classList.remove('active');
                } catch (error) {
                    AdvancedViewRenderer.showToast('Ошибка при выходе: ' + error.message, 'error');
                }
            }
        });
    }

    setupEventListeners() {
        // Navigation
        console.log('📍 Setting up nav items, count:', this.navItems?.length || 0);
        if (this.navItems && this.navItems.length > 0) {
            this.navItems.forEach((item, index) => {
                console.log(`  Nav item ${index}: data-target="${item.dataset.target}"`);
                item.addEventListener('click', (e) => {
                    const targetId = item.dataset.target;
                    console.log(`🖱️ Nav click detected: ${targetId}`);
                    
                if (targetId === 'upload-view' && !this.dataService.getCurrentUser()) {
                        this.navigateTo('auth-view');
                        AdvancedViewRenderer.showToast('Сначала войдите в аккаунт', 'warning');
                        return;
                    }
                    
                    if (targetId === 'profile-view' && !this.dataService.getCurrentUser()) {
                        this.navigateTo('auth-view');
                        return;
                    }
                    
                    if (targetId === 'search-view') {
                        this.navigateTo('search-view');
                        setTimeout(() => this.searchViewInput.focus(), 100);
                        return;
                    }
                    
                    if (targetId) this.navigateTo(targetId);
                });
            });
        } else {
            console.warn('⚠️ No nav items found!');
        }

        // Auth Events
        this.setupAuthEvents();
        
        // Upload Events
        this.setupUploadEvents();
        
        // Comments Events
        this.setupCommentsEvents();
        
        // Search Events
        this.setupSearchEvents();
        
        // Notifications Events
        this.setupNotificationsEvents();
        
        // Messages Events
        this.setupMessagesEvents();
        
        // FAB Events
        this.setupFABEvents();
        
        // Edit Profile Events
        this.setupEditProfileEvents();
        
        // Infinite scroll
        this.feedContainer.addEventListener('scroll', () => {
            const { scrollTop, scrollHeight, clientHeight } = this.feedContainer;
            if (scrollHeight - scrollTop - clientHeight < 100 && !this.state.loading && this.state.hasMore) {
                this.loadFeed();
            }
        });
    }

    setupEditProfileEvents() {
        const editBtn = document.getElementById('edit-profile-btn');
        const closeBtn = document.getElementById('close-edit-profile');
        const cancelBtn = document.getElementById('cancel-edit');
        const saveBtn = document.getElementById('save-profile');
        const avatarPreview = document.getElementById('avatar-preview');
        const avatarFileInput = document.getElementById('avatar-file-input');

        // Открыть редактор
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

        // Закрыть редактор
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                AdvancedViewRenderer.closeEditProfileModal();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                AdvancedViewRenderer.closeEditProfileModal();
            });
        }

        // Загрузка аватара
        if (avatarPreview) {
            avatarPreview.addEventListener('click', () => {
                avatarFileInput.click();
            });
        }

        if (avatarFileInput) {
            avatarFileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file && file.type.startsWith('image/')) {
                    if (file.size > 5 * 1024 * 1024) { // 5MB limit
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

        // Сохранить профиль
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveProfile();
            });
        }
    }

    setupProfileFormListeners() {
        const usernameInput = document.getElementById('edit-username');
        const bioInput = document.getElementById('edit-bio');
        
        if (usernameInput) {
            usernameInput.addEventListener('input', () => {
                AdvancedViewRenderer.updateCharCounters();
            });
        }
        
        if (bioInput) {
            bioInput.addEventListener('input', () => {
                AdvancedViewRenderer.updateCharCounters();
            });
        }

        // Gender buttons
        document.querySelectorAll('.gender-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.gender-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            });
        });
    }

    async saveProfile() {
        if (!AdvancedViewRenderer.validateProfileForm()) {
            return;
        }

        const saveBtn = document.getElementById('save-profile');
        const originalText = saveBtn.textContent;
        saveBtn.disabled = true;
        saveBtn.textContent = 'Сохранение...';

        try {
            const profileData = {
                avatar: this.state.avatarData || this.dataService.getCurrentUser().avatar,
                name: document.getElementById('edit-username').value.trim(),
                bio: document.getElementById('edit-bio').value.trim(),
                location: document.getElementById('edit-location').value.trim(),
                website: document.getElementById('edit-website').value.trim(),
                interests: document.getElementById('edit-interests').value.trim(),
                gender: AdvancedViewRenderer.getActiveGender()
            };

            // Имитация задержки на сохранение
            await new Promise(resolve => setTimeout(resolve, 600));

            const updatedUser = this.dataService.updateUserProfile(profileData);
            
            // Обновляем UI профиля
            this.updateProfileUI();
            
            AdvancedViewRenderer.closeEditProfileModal();
            AdvancedViewRenderer.showToast('✅ Профиль обновлен успешно!', 'success');

            // Очищаем сохранённый аватар
            this.state.avatarData = null;
        } catch (error) {
            AdvancedViewRenderer.showToast('Ошибка при сохранении', 'error');
            console.error(error);
        } finally {
            saveBtn.disabled = false;
            saveBtn.textContent = originalText;
        }
    }

    setupAuthEvents() {
        // Переключение между логином и регистрацией
        document.getElementById('switch-to-reg').addEventListener('click', () => {
            document.getElementById('login-form').style.display = 'none';
            document.getElementById('register-form').style.display = 'block';
        });

        document.getElementById('switch-to-login').addEventListener('click', () => {
            document.getElementById('login-form').style.display = 'block';
            document.getElementById('register-form').style.display = 'none';
            // Очищаем поля
            document.getElementById('login-email').value = '';
            document.getElementById('login-pass').value = '';
        });

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
                // Ждем инициализации Firebase
                const fbReady = await waitForFirebaseService(5000);
                
                if (fbReady && firebaseService && firebaseService.isInitialized()) {
                    const result = await this.dataService.login(email, password);
                    AdvancedViewRenderer.showToast('🔥 Вход через Firebase успешен!', 'success');
                } else {
                    // Fallback на локальное хранилище
                    await this.dataService.login(email, password);
                    AdvancedViewRenderer.showToast('Вход выполнен успешно!', 'success');
                }
                
                this.navigateTo('feed-view');
                this.updateProfileUI();
                
                // Очищаем форму
                document.getElementById('login-email').value = '';
                document.getElementById('login-pass').value = '';
            } catch (error) {
                AdvancedViewRenderer.showToast(error.message, 'error');
                console.error('Ошибка логина:', error);
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
            btnText.textContent = 'Регистрация...';
            btn.disabled = true;

            try {
                // Ждем инициализации Firebase
                const fbReady = await waitForFirebaseService(5000);
                if (fbReady && firebaseService && firebaseService.isInitialized()) {
                    const result = await firebaseService.register(email, password, userName);
                    AdvancedViewRenderer.showToast('🔥 Регистрация через Firebase успешна!', 'success');
                } else {
                    AdvancedViewRenderer.showToast('Firebase недоступен', 'error');
                    return;
                }
                this.navigateTo('feed-view');
                this.updateProfileUI();
                document.getElementById('login-form').style.display = 'block';
                document.getElementById('register-form').style.display = 'none';
                document.getElementById('login-email').value = '';
                document.getElementById('login-pass').value = '';
                document.getElementById('register-email').value = '';
                document.getElementById('register-pass').value = '';
                document.getElementById('register-pass-confirm').value = '';
                document.getElementById('register-username').value = '';
            } catch (error) {
                AdvancedViewRenderer.showToast(error.message, 'error');
                console.error('Ошибка регистрации:', error);
            } finally {
                btnText.textContent = 'Зарегистрироваться';
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
        
        cameraToggle.addEventListener('click', () => this.toggleCamera());
        
        // Filters
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

        // Publish
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
                AdvancedViewRenderer.showToast('Ошибка при загрузке видео', 'error');
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
            
            // Show/hide clear button
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

    setupFABEvents() {
        this.quickFab.addEventListener('click', () => {
            AdvancedViewRenderer.showToast('Быстрые действия доступны', 'info');
        });
    }

    setupNotifications() {
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission();
            }
        }
    }

    async setupCamera() {
        this.cameraPreview = document.getElementById('camera-preview');
        this.cameraVideo = document.getElementById('camera-video');
        this.cameraCanvas = document.getElementById('camera-canvas');
        this.recordBtn = document.getElementById('record-btn');
        
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
                audio: true
            });
            
            this.cameraVideo.srcObject = this.cameraStream;
            
            this.recordBtn.addEventListener('click', () => this.toggleRecording());
        } catch (error) {
            console.error('Camera access denied:', error);
            document.getElementById('camera-toggle').style.display = 'none';
        }
    }

    toggleCamera() {
        const cameraPreview = this.cameraPreview;
        const uploadArea = document.getElementById('upload-area');
        
        if (cameraPreview.style.display === 'none') {
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
        if (!this.state.isRecording) {
            this.startRecording();
        } else {
            this.stopRecording();
        }
    }

    startRecording() {
        if (!this.cameraStream) return;
        
        this.state.recordedChunks = [];
        this.recordBtn.classList.add('recording');
        
        this.state.mediaRecorder = new MediaRecorder(this.cameraStream, {
            mimeType: 'video/webm;codecs=vp9'
        });
        
        this.state.mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                this.state.recordedChunks.push(event.data);
            }
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
        let startY = 0;
        let pulling = false;

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
                
                if (diff > 100) {
                    pullIndicator.classList.add('active');
                }
            }
        });

        feedContainer.addEventListener('touchend', async (e) => {
            if (!pulling) return;
            
            pulling = false;
            const y = e.changedTouches[0].pageY;
            const diff = y - startY;
            
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
        let startX = 0;
        let startY = 0;
        let isSwiping = false;

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
            
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 50) {
                e.preventDefault();
            }
        });

        document.addEventListener('touchend', () => {
            isSwiping = false;
        });
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
            
            if (clear) {
                this.feedContainer.innerHTML = '';
            }
            
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
                    document.querySelectorAll('video').forEach(v => {
                        if (v !== video) v.pause();
                    });
                } else {
                    video.pause();
                }
            });
            
            likeBtn.addEventListener('click', async (e) => {
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
                
                // Если это свой профиль - переходим на профиль
                if (currentUser && currentUser.name === videosAuthor) {
                    this.navigateTo('profile-view');
                    AdvancedViewRenderer.showToast('Вашего профиль', 'info');
                    return;
                }
                
                // Проверка - не позволять подписаться без входа
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
                    video.play().catch(e => {
                        console.log('Autoplay blocked:', e);
                    });
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
        console.log(`🔀 Navigating to: ${viewId}`);
        document.querySelectorAll('video').forEach(v => v.pause());
        
        this.views.forEach(v => v.classList.remove('active'));
        
        const targetView = document.getElementById(viewId);
        if (targetView) {
            console.log(`✨ View found and activating: ${viewId}`);
            targetView.classList.add('active');
            
            this.navItems.forEach(n => {
                if (n.dataset.target === viewId) {
                    n.classList.add('active');
                } else {
                    n.classList.remove('active');
                }
            });
            
            if (viewId === 'profile-view') {
                this.updateProfileUI();
            } else if (viewId === 'feed-view') {
                setTimeout(() => {
                    const currentVideo = this.feedContainer.querySelector('.video-item:first-child video');
                    if (currentVideo && this.dataService.settings.autoplay) {
                        currentVideo.play().catch(console.error);
                    }
                }, 300);
            }
        } else {
            console.error(`❌ View not found: ${viewId}`);
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

    showShareModal(videoId, title = '', url = '') {
        if (!url) {
            const video = firebaseService.userVideos.find(v => v.id === videoId);
            if (!video) return;
            title = video.desc;
            url = `${window.location.origin}?video=${videoId}`;
        }
        
        const shareModal = document.getElementById('share-modal');
        shareModal.innerHTML = AdvancedViewRenderer.renderShareOptions(videoId);
        shareModal.classList.add('open');
        
        shareModal.querySelectorAll('.share-option').forEach(option => {
            option.addEventListener('click', () => {
                const action = option.dataset.action;
                const shareUrl = option.dataset.url;
                
                switch(action) {
                    case 'copy':
                        navigator.clipboard.writeText(shareUrl)
                            .then(() => AdvancedViewRenderer.showToast('Ссылка скопирована', 'success'))
                            .catch(() => AdvancedViewRenderer.showToast('Ошибка копирования', 'error'));
                        break;
                    case 'whatsapp':
                        window.open(`https://wa.me/?text=${encodeURIComponent(title + ' ' + shareUrl)}`, '_blank');
                        break;
                    case 'telegram':
                        window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(title)}`, '_blank');
                        break;
                    case 'twitter':
                        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
                        break;
                }
                
                shareModal.classList.remove('open');
            });
        });
        
        shareModal.addEventListener('click', (e) => {
            if (e.target === shareModal) {
                shareModal.classList.remove('open');
            }
        });
    }

    async performSearch(query) {
        if (!query.trim()) {
            this.searchEmpty.style.display = 'flex';
            this.searchResults.innerHTML = '';
            return;
        }

        // Поиск видео
        const videoResults = this.dataService.searchVideos(query);
        // Поиск профилей
        let profileResults = [];
        if (firebaseService && firebaseService.isInitialized()) {
            profileResults = await firebaseService.getAllUsers();
            profileResults = profileResults.filter(u => u.name && u.name.toLowerCase().includes(query.toLowerCase()));
        }

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

        // Сначала профили
        profileResults.forEach(profile => {
            const profileItem = document.createElement('div');
            profileItem.className = 'search-result-item profile-result';
            profileItem.innerHTML = `
                <img src="${profile.avatar || 'https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.name)}" alt="Аватар" class="search-result-thumbnail">
                <div class="search-result-info">
                    <div class="search-result-author">@${profile.name}</div>
                    <div class="search-result-desc">${profile.bio || ''}</div>
                </div>
            `;
            profileItem.addEventListener('click', () => {
                // Переход на профиль
                window.location.hash = `profile-${profile.uid}`;
            });
            this.searchResults.appendChild(profileItem);
        });

        // Затем видео
        videoResults.forEach(video => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.innerHTML = `
                <img src="${video.thumbnail}" alt="Видео" class="search-result-thumbnail">
                <div class="search-result-info">
                    <div class="search-result-author">@${video.author}</div>
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
        
        document.getElementById('profile-name').textContent = `@${userProfile.name}`;
        document.getElementById('profile-avatar-img').src = userProfile.avatar;
        document.getElementById('profile-bio').textContent = userProfile.bio || '';
        
        // Обновляем дополнительную информацию профиля
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
        
        document.getElementById('following-stat').querySelector('.stat-num').textContent = 
            AdvancedViewRenderer.formatNumber(userProfile.stats.following);
        document.getElementById('followers-stat').querySelector('.stat-num').textContent = 
            AdvancedViewRenderer.formatNumber(userProfile.stats.followers);
        document.getElementById('likes-stat').querySelector('.stat-num').textContent = 
            AdvancedViewRenderer.formatNumber(userProfile.stats.likes);
        
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

    setupFABEvents() {
        this.quickFab.addEventListener('click', () => {
            AdvancedViewRenderer.showToast('Быстрые действия доступны', 'info');
        });
    }

    setupNotificationsEvents() {
        // Notification tabs
        if (this.notificationTabs && this.notificationTabs.length) {
            this.notificationTabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    this.notificationTabs.forEach(t => t.classList.remove('active'));
                    tab.classList.add('active');
                    const filterType = tab.dataset.tab;
                    this.loadNotifications(filterType);
                });
            });

            // Load initial notifications
            this.loadNotifications('all');
        }
    }

    loadNotifications(filter = 'all') {
        if (!this.notificationsList || !this.notificationsEmpty) return;
        
        const notifications = this.dataService.getNotifications(filter);
        
        if (notifications.length === 0) {
            this.notificationsList.innerHTML = '';
            this.notificationsEmpty.style.display = 'flex';
            return;
        }

        this.notificationsEmpty.style.display = 'none';
        this.notificationsList.innerHTML = '';

        notifications.forEach(notif => {
            const item = document.createElement('div');
            item.className = `notification-item ${notif.read ? '' : 'unread'}`;

            let icon = '';
            let text = '';
            let userName = '';

            if (notif.type === 'like') {
                icon = 'like';
                userName = notif.data.fromUser;
                text = `поставил лайк вашему видео`;
            } else if (notif.type === 'comment') {
                icon = 'comment';
                userName = notif.data.fromUser;
                text = `${notif.data.text}`;
            }

            const time = this.formatTime(notif.timestamp);

            item.innerHTML = `
                <img src="https://ui-avatars.com/api/?name=${userName}&background=random&size=48" class="notification-avatar">
                <div class="notification-content">
                    <div class="notification-user">@${userName}</div>
                    <div class="notification-text">${text}</div>
                    <div class="notification-time">${time}</div>
                </div>
                <img src="${notif.data.videoThumbnail}" class="notification-badge-item ${icon === 'comment' ? 'comment' : ''}" alt="видео">
            `;

            item.addEventListener('click', () => {
                this.dataService.markNotificationAsRead(notif.id);
                item.classList.remove('unread');
                AdvancedViewRenderer.showToast('Уведомление прочитано', 'info');
            });

            this.notificationsList.appendChild(item);
        });

        this.updateNotificationBadge();
    }

    updateNotificationBadge() {
        const unreadCount = this.dataService.getUnreadNotificationsCount();
        if (unreadCount > 0) {
            this.notificationsBadge.textContent = unreadCount;
            this.notificationsBadge.style.display = 'flex';
        } else {
            this.notificationsBadge.style.display = 'none';
        }
    }

    formatTime(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
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

    setupMessagesEvents() {
        // Back button
        if (this.backToListBtn) {
            this.backToListBtn.addEventListener('click', () => {
                this.chatDialog.style.display = 'none';
                this.messagesListSection.style.display = 'flex';
            });
        }

        // Send message
        if (this.sendMessageBtn) {
            this.sendMessageBtn.addEventListener('click', () => {
                this.sendMessage();
            });
        }

        if (this.messageInput) {
            this.messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.sendMessage();
                }
            });
        }

        // New message button
        if (this.newMessageBtn) {
            this.newMessageBtn.addEventListener('click', () => {
                const username = prompt('Введите имя пользователя:');
                if (username) {
                    this.openChat(username);
                }
            });
        }

        // Load chats
        this.loadChats();
    }

    loadChats() {
        if (!this.chatList || !this.messagesEmpty) return;
        
        const chats = this.dataService.getChats();

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

            const lastMsg = chat.lastMessage.substring(0, 30) + (chat.lastMessage.length > 30 ? '...' : '');

            chatItem.innerHTML = `
                <img src="https://ui-avatars.com/api/?name=${chat.otherUser}&background=random&size=48" class="chat-avatar">
                <div class="chat-info">
                    <div class="chat-user">@${chat.otherUser}</div>
                    <div class="chat-last-message">${lastMsg}</div>
                </div>
                <div class="chat-time">${this.formatTime(chat.lastMessageTime)}</div>
            `;

            chatItem.addEventListener('click', () => {
                this.openChat(chat.otherUser, chat.id);
            });

            this.chatList.appendChild(chatItem);
        });
    }

    openChat(username, chatId = null) {
        if (!this.messagesContainer || !this.chatDialog || !this.messagesListSection) return;
        
        if (!chatId) {
            const currentUser = this.dataService.getCurrentUser();
            if (!currentUser) {
                this.navigateTo('auth-view');
                return;
            }
            chatId = [currentUser.name, username].sort().join('_');
        }

        // Update chat header
        const userNameEl = document.getElementById('chat-user-name');
        const userAvatarEl = document.getElementById('chat-user-avatar');
        if (userNameEl) userNameEl.textContent = `@${username}`;
        if (userAvatarEl) userAvatarEl.src = `https://ui-avatars.com/api/?name=${username}&background=random&size=40`;

        // Load messages
        const messages = this.dataService.getChatMessages(chatId).sort((a, b) => a.timestamp - b.timestamp);
        this.messagesContainer.innerHTML = '';

        const currentUser = this.dataService.getCurrentUser();

        messages.forEach(msg => {
            const msgEl = document.createElement('div');
            msgEl.className = `message ${msg.fromUser === currentUser.name ? 'own' : ''}`;

            const time = new Date(msg.timestamp).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

            msgEl.innerHTML = `
                <span class="message-time">${time}</span>
                <div class="message-content">${msg.content}</div>
            `;

            this.messagesContainer.appendChild(msgEl);
        });

        // Mark as read
        this.dataService.markChatAsRead(chatId);

        // Show chat dialog
        this.messagesListSection.style.display = 'none';
        this.chatDialog.style.display = 'flex';
        this.messageInput.focus();

        // Store current chat
        this.state.currentChatId = chatId;
        this.state.currentChatUser = username;

        // Scroll to bottom
        setTimeout(() => {
            this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
        }, 100);
    }

    sendMessage() {
        if (!this.messageInput || !this.messagesContainer) return;
        
        const content = this.messageInput.value.trim();
        if (!content) return;

        const currentUser = firebaseService.getCurrentUser();
        if (!currentUser) {
            this.navigateTo('auth-view');
            return;
        }

        const message = firebaseService.addMessage(
            this.state.currentChatId,
            currentUser.name,
            this.state.currentChatUser,
            content
        );

        // Add to UI
        const msgEl = document.createElement('div');
        msgEl.className = 'message own';
        const time = new Date().toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

        msgEl.innerHTML = `
            <span class="message-time">${time}</span>
            <div class="message-content">${content}</div>
        `;

        this.messagesContainer.appendChild(msgEl);
        this.messageInput.value = '';

        // Scroll to bottom
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

        // Reload chats list
        this.loadChats();
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new AdvancedApp();
});

// PWA Support
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    });
}

// Add to home screen prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    setTimeout(() => {
        if (deferredPrompt) {
            AdvancedViewRenderer.showToast('Установите TikClone на свой телефон', 'info');
        }
    }, 5000);
});

// Handle offline/online status
window.addEventListener('online', () => {
    AdvancedViewRenderer.showToast('Соединение восстановлено', 'success');
});

window.addEventListener('offline', () => {
    AdvancedViewRenderer.showToast('Нет соединения с интернетом', 'warning');
});
