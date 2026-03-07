/**
 * Creator Studio module.
 * - Replaces direct "upload view" click from plus-tab with creator action sheet.
 * - Adds TikTok-like full-screen camera experience for upload.
 * - Moves stream start action into plus launcher.
 * - Hides profile share/live entry points (stream now starts from plus launcher).
 */
(function attachCreatorStudioModule(globalObject) {
    'use strict';

    if (!globalObject) return;
    const AppCtor = globalObject.AdvancedApp || (typeof AdvancedApp !== 'undefined' ? AdvancedApp : null);
    if (!AppCtor || !AppCtor.prototype) return;

    const proto = AppCtor.prototype;
    if (proto.__creatorStudioPatched) return;
    proto.__creatorStudioPatched = true;

    const TEXT = {
        launcherTitle: '\u0421\u043e\u0437\u0434\u0430\u0442\u044c',
        launcherVideoTitle: '\u0412\u0438\u0434\u0435\u043e',
        launcherVideoSub: '\u0417\u0430\u043f\u0438\u0441\u0430\u0442\u044c \u0438\u043b\u0438 \u0437\u0430\u0433\u0440\u0443\u0437\u0438\u0442\u044c',
        launcherLiveTitle: '\u042d\u0444\u0438\u0440',
        launcherLiveSub: '\u041d\u0430\u0447\u0430\u0442\u044c \u043f\u0440\u044f\u043c\u043e\u0439 \u044d\u0444\u0438\u0440',
        launcherClose: '\u0417\u0430\u043a\u0440\u044b\u0442\u044c',
        streamStart: '\u0421\u0442\u0430\u0440\u0442 \u044d\u0444\u0438\u0440\u0430...',
        streamDefaultTitle: '\u041f\u0440\u044f\u043c\u043e\u0439 \u044d\u0444\u0438\u0440',
        noCamera: '\u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u043a \u043a\u0430\u043c\u0435\u0440\u0435'
    };

    function isOwnUploadNavClick(event) {
        const target = event && event.target ? event.target : null;
        if (!target || !target.closest) return false;
        return !!target.closest('.nav-item[data-target="upload-view"]');
    }

    function stopTracks(stream) {
        if (!stream || typeof stream.getTracks !== 'function') return;
        stream.getTracks().forEach((track) => {
            try { track.stop(); } catch (_) {}
        });
    }

    function applyTrackZoomMin(stream) {
        if (!stream || typeof stream.getVideoTracks !== 'function') return;
        const track = stream.getVideoTracks()[0];
        if (!track || typeof track.getCapabilities !== 'function' || typeof track.applyConstraints !== 'function') return;
        try {
            const caps = track.getCapabilities() || {};
            if (caps.zoom && Number.isFinite(caps.zoom.min)) {
                track.applyConstraints({ advanced: [{ zoom: caps.zoom.min }] }).catch(() => {});
            }
        } catch (_) {}
    }

    function clamp(value, min, max) {
        const numeric = Number(value);
        if (!Number.isFinite(numeric)) return min;
        return Math.max(min, Math.min(max, numeric));
    }

    proto.ensureCreatorLauncher = function ensureCreatorLauncher() {
        if (this.creatorLauncherSheet) return;
        const root = document.getElementById('app') || document.body;
        if (!root) return;

        let sheet = document.getElementById('creator-launcher-sheet');
        if (!sheet) {
            sheet = document.createElement('div');
            sheet.id = 'creator-launcher-sheet';
            sheet.className = 'creator-launcher-sheet';
            sheet.innerHTML = `
                <div class="creator-launcher-backdrop" data-action="close-launcher"></div>
                <div class="creator-launcher-card">
                    <div class="creator-launcher-head">
                        <div class="creator-launcher-title">${TEXT.launcherTitle}</div>
                        <button type="button" class="creator-launcher-close" data-action="close-launcher" aria-label="${TEXT.launcherClose}">&times;</button>
                    </div>
                    <div class="creator-launcher-actions">
                        <button type="button" class="creator-launcher-btn" data-action="start-video">
                            <span class="creator-launcher-btn-icon">&#x1F3AC;</span>
                            <span class="creator-launcher-btn-text">
                                <span class="creator-launcher-btn-title">${TEXT.launcherVideoTitle}</span>
                                <span class="creator-launcher-btn-sub">${TEXT.launcherVideoSub}</span>
                            </span>
                        </button>
                        <button type="button" class="creator-launcher-btn creator-launcher-btn-live" data-action="start-live">
                            <span class="creator-launcher-btn-icon">&#x1F4E1;</span>
                            <span class="creator-launcher-btn-text">
                                <span class="creator-launcher-btn-title">${TEXT.launcherLiveTitle}</span>
                                <span class="creator-launcher-btn-sub">${TEXT.launcherLiveSub}</span>
                            </span>
                        </button>
                    </div>
                </div>
            `;
            root.appendChild(sheet);
        }

        this.creatorLauncherSheet = sheet;
        if (sheet.dataset.bound === '1') return;
        sheet.dataset.bound = '1';
        sheet.addEventListener('click', async (event) => {
            const actionEl = event.target && event.target.closest ? event.target.closest('[data-action]') : null;
            if (!actionEl) return;
            const action = actionEl.dataset.action || '';
            if (action === 'close-launcher') {
                this.closeCreatorLauncher();
                return;
            }
            if (action === 'start-video') {
                this.closeCreatorLauncher();
                await this.openCreatorStudioCamera();
                return;
            }
            if (action === 'start-live') {
                this.closeCreatorLauncher();
                await this.startLiveFromLauncher();
            }
        });
    };

    proto.openCreatorLauncher = function openCreatorLauncher() {
        this.ensureCreatorLauncher();
        if (!this.creatorLauncherSheet) return;
        this.creatorLauncherSheet.classList.add('open');
    };

    proto.closeCreatorLauncher = function closeCreatorLauncher() {
        if (!this.creatorLauncherSheet) return;
        this.creatorLauncherSheet.classList.remove('open');
    };

    proto.startLiveFromLauncher = async function startLiveFromLauncher() {
        const user = this.dataService && this.dataService.getCurrentUser ? this.dataService.getCurrentUser() : null;
        if (!user) {
            this.navigateTo('auth-view');
            return;
        }

        if (this.liveTitleInput && !String(this.liveTitleInput.value || '').trim()) {
            this.liveTitleInput.value = TEXT.streamDefaultTitle;
        }

        AdvancedViewRenderer.showToast(TEXT.streamStart, 'info');

        if (typeof this.startLiveSession === 'function') {
            await this.startLiveSession();
            return;
        }

        if (typeof this.setFeedSource === 'function') {
            this.navigateTo('feed-view');
            await this.setFeedSource('live', { reload: true });
        }
    };

    proto.ensureCreatorStudioUi = function ensureCreatorStudioUi() {
        const uploadView = document.getElementById('upload-view');
        if (!uploadView) return;
        uploadView.classList.add('creator-upload-view');

        if (this.creatorStudioUiReady) return;
        this.creatorStudioUiReady = true;
        this.creatorFacingMode = 'user';
        this.creatorMaskId = 'none';
        this.creatorCameraStream = null;
        this.creatorFaceDetector = this.creatorFaceDetector || null;
        this.creatorMaskTrackTimer = null;
        this.creatorMaskDetectBusy = false;
        this.creatorMaskFaceBox = null;
        this.creatorMaskNoSupportNotified = false;

        const uploadContainer = uploadView.querySelector('.upload-container');
        const cameraPreview = this.cameraPreview || document.getElementById('camera-preview');
        const cameraVideo = this.cameraVideo || document.getElementById('camera-video');
        const recordBtn = this.recordBtn || document.getElementById('record-btn');
        const uploadArea = document.getElementById('upload-area');
        if (!uploadContainer || !cameraPreview || !cameraVideo || !recordBtn) return;

        uploadContainer.classList.add('creator-studio-shell');
        cameraPreview.classList.add('creator-camera-preview');
        cameraVideo.classList.add('creator-camera-video');
        recordBtn.classList.add('creator-record-btn');
        if (uploadArea) uploadArea.classList.add('creator-upload-area');

        let topBar = document.getElementById('creator-topbar');
        if (!topBar) {
            topBar = document.createElement('div');
            topBar.id = 'creator-topbar';
            topBar.className = 'creator-topbar';
            topBar.innerHTML = `
                <button type="button" class="creator-top-btn" data-action="close-studio">&times;</button>
                <div class="creator-top-title">Reelgram</div>
                <button type="button" class="creator-top-btn" data-action="pick-file">&#x1F4C1;</button>
            `;
            cameraPreview.appendChild(topBar);
        }

        let sideBar = document.getElementById('creator-sidebar');
        if (!sideBar) {
            sideBar = document.createElement('div');
            sideBar.id = 'creator-sidebar';
            sideBar.className = 'creator-sidebar';
            sideBar.innerHTML = `
                <button type="button" class="creator-side-btn" data-action="flip-camera">&#x1F504;</button>
                <button type="button" class="creator-side-btn" data-action="toggle-masks">&#x1F430;</button>
                <button type="button" class="creator-side-btn" data-action="toggle-mirror">&#x1FA9E;</button>
            `;
            cameraPreview.appendChild(sideBar);
        }

        let masksPanel = document.getElementById('creator-masks-panel');
        if (!masksPanel) {
            masksPanel = document.createElement('div');
            masksPanel.id = 'creator-masks-panel';
            masksPanel.className = 'creator-masks-panel';
            masksPanel.innerHTML = `
                <button type="button" class="creator-mask-chip active" data-mask="none">Off</button>
                <button type="button" class="creator-mask-chip" data-mask="bunny">&#x1F430;</button>
                <button type="button" class="creator-mask-chip" data-mask="cat">&#x1F63A;</button>
                <button type="button" class="creator-mask-chip" data-mask="cool">&#x1F576;&#xFE0F;</button>
                <button type="button" class="creator-mask-chip" data-mask="crown">&#x1F451;</button>
            `;
            cameraPreview.appendChild(masksPanel);
        }

        let overlay = document.getElementById('creator-mask-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'creator-mask-overlay';
            overlay.className = 'creator-mask-overlay';
            overlay.style.display = 'none';
            cameraPreview.appendChild(overlay);
        }
        this.creatorMaskOverlay = overlay;

        if (cameraPreview.dataset.creatorBound === '1') return;
        cameraPreview.dataset.creatorBound = '1';

        cameraPreview.addEventListener('click', async (event) => {
            const actionEl = event.target && event.target.closest ? event.target.closest('[data-action]') : null;
            if (!actionEl) return;
            const action = actionEl.dataset.action || '';

            if (action === 'close-studio') {
                this.closeCreatorStudioCamera();
                return;
            }
            if (action === 'pick-file') {
                const fileInput = document.getElementById('video-file-input');
                if (fileInput) fileInput.click();
                return;
            }
            if (action === 'flip-camera') {
                this.creatorFacingMode = this.creatorFacingMode === 'user' ? 'environment' : 'user';
                await this.restartCreatorCamera();
                return;
            }
            if (action === 'toggle-masks') {
                masksPanel.classList.toggle('open');
                return;
            }
            if (action === 'toggle-mirror') {
                cameraVideo.classList.toggle('creator-mirrored');
            }
        });

        masksPanel.addEventListener('click', (event) => {
            const chip = event.target && event.target.closest ? event.target.closest('.creator-mask-chip[data-mask]') : null;
            if (!chip) return;
            const mask = String(chip.dataset.mask || 'none');
            this.setCreatorMask(mask);
            masksPanel.querySelectorAll('.creator-mask-chip').forEach((node) => {
                node.classList.toggle('active', node === chip);
            });
        });
    };

    proto.setCreatorMask = function setCreatorMask(maskId = 'none') {
        this.creatorMaskId = String(maskId || 'none');
        if (!this.creatorMaskOverlay) return;

        if (this.creatorMaskId === 'none') {
            this.creatorMaskOverlay.style.display = 'none';
            this.creatorMaskOverlay.textContent = '';
            this.stopCreatorMaskTracking();
            return;
        }

        const map = {
            bunny: '\uD83D\uDC30',
            cat: '\uD83D\uDE3A',
            cool: '\uD83D\uDD76\uFE0F',
            crown: '\uD83D\uDC51'
        };
        const glyph = map[this.creatorMaskId] || '\u2728';
        this.creatorMaskOverlay.style.display = 'flex';
        this.creatorMaskOverlay.dataset.mask = this.creatorMaskId;
        this.creatorMaskOverlay.textContent = glyph;
        this.startCreatorMaskTracking();
    };

    proto.ensureCreatorFaceDetector = function ensureCreatorFaceDetector() {
        if (this.creatorFaceDetector) return this.creatorFaceDetector;
        if (typeof window === 'undefined' || typeof window.FaceDetector !== 'function') return null;
        try {
            this.creatorFaceDetector = new window.FaceDetector({
                fastMode: true,
                maxDetectedFaces: 1
            });
        } catch (_) {
            this.creatorFaceDetector = null;
        }
        return this.creatorFaceDetector;
    };

    proto.stopCreatorMaskTracking = function stopCreatorMaskTracking() {
        if (this.creatorMaskTrackTimer) {
            clearInterval(this.creatorMaskTrackTimer);
            this.creatorMaskTrackTimer = null;
        }
        this.creatorMaskDetectBusy = false;
        this.creatorMaskFaceBox = null;
    };

    proto.positionCreatorMaskOverlay = function positionCreatorMaskOverlay(faceBox = null) {
        const overlay = this.creatorMaskOverlay;
        const cameraPreview = this.cameraPreview || document.getElementById('camera-preview');
        const cameraVideo = this.cameraVideo || document.getElementById('camera-video');
        if (!overlay || !cameraPreview || !cameraVideo) return;

        const videoRect = cameraVideo.getBoundingClientRect();
        const previewRect = cameraPreview.getBoundingClientRect();
        if (!videoRect.width || !videoRect.height || !previewRect.width || !previewRect.height) return;

        if (!faceBox || !Number.isFinite(faceBox.width) || !Number.isFinite(faceBox.height)) {
            overlay.style.left = '50%';
            overlay.style.top = '20%';
            overlay.style.width = '120px';
            overlay.style.height = '84px';
            overlay.style.setProperty('--mask-offset-y', '0px');
            return;
        }

        const sourceWidth = Number(cameraVideo.videoWidth) || videoRect.width;
        const sourceHeight = Number(cameraVideo.videoHeight) || videoRect.height;

        let centerX = Number(faceBox.x) + (Number(faceBox.width) / 2);
        const centerY = Number(faceBox.y) + (Number(faceBox.height) / 2);
        if (cameraVideo.classList.contains('creator-mirrored')) {
            centerX = sourceWidth - centerX;
        }

        const scaleX = videoRect.width / sourceWidth;
        const scaleY = videoRect.height / sourceHeight;

        const x = (videoRect.left - previewRect.left) + (centerX * scaleX);
        const y = (videoRect.top - previewRect.top) + (centerY * scaleY);
        const width = clamp(faceBox.width * scaleX * 1.1, 90, 230);
        const height = Math.round(width * 0.7);

        overlay.style.left = `${Math.round(x)}px`;
        overlay.style.top = `${Math.round(y)}px`;
        overlay.style.width = `${Math.round(width)}px`;
        overlay.style.height = `${height}px`;

        const offsetMap = {
            bunny: -Math.round(height * 0.78),
            cat: -Math.round(height * 0.72),
            crown: -Math.round(height * 0.82),
            cool: -Math.round(height * 0.18)
        };
        const offsetY = Number.isFinite(offsetMap[this.creatorMaskId]) ? offsetMap[this.creatorMaskId] : -Math.round(height * 0.4);
        overlay.style.setProperty('--mask-offset-y', `${offsetY}px`);
    };

    proto.startCreatorMaskTracking = function startCreatorMaskTracking() {
        this.stopCreatorMaskTracking();

        if (this.creatorMaskId === 'none') return;
        const overlay = this.creatorMaskOverlay;
        const cameraVideo = this.cameraVideo || document.getElementById('camera-video');
        if (!overlay || !cameraVideo) return;

        const detector = this.ensureCreatorFaceDetector();
        if (!detector && !this.creatorMaskNoSupportNotified) {
            this.creatorMaskNoSupportNotified = true;
            AdvancedViewRenderer.showToast('AR tracking is not supported in this browser', 'warning');
        }

        const tick = async () => {
            if (!this.creatorMaskOverlay || this.creatorMaskId === 'none') return;
            if (!detector || cameraVideo.readyState < 2) {
                this.positionCreatorMaskOverlay(this.creatorMaskFaceBox);
                return;
            }
            if (this.creatorMaskDetectBusy) return;

            this.creatorMaskDetectBusy = true;
            try {
                const faces = await detector.detect(cameraVideo);
                if (Array.isArray(faces) && faces[0] && faces[0].boundingBox) {
                    this.creatorMaskFaceBox = faces[0].boundingBox;
                }
                this.positionCreatorMaskOverlay(this.creatorMaskFaceBox);
            } catch (_) {
                this.positionCreatorMaskOverlay(this.creatorMaskFaceBox);
            } finally {
                this.creatorMaskDetectBusy = false;
            }
        };

        tick();
        this.creatorMaskTrackTimer = setInterval(tick, 140);
    };

    proto.openCreatorStudioCamera = async function openCreatorStudioCamera() {
        const user = this.dataService && this.dataService.getCurrentUser ? this.dataService.getCurrentUser() : null;
        if (!user) {
            this.navigateTo('auth-view');
            return;
        }

        this.navigateTo('upload-view');
        this.ensureCreatorStudioUi();
        await this.restartCreatorCamera();

        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) uploadArea.style.display = 'none';
        if (this.cameraPreview) this.cameraPreview.style.display = 'block';
    };

    proto.restartCreatorCamera = async function restartCreatorCamera() {
        const cameraVideo = this.cameraVideo || document.getElementById('camera-video');
        if (!cameraVideo) return;

        if (!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function')) {
            AdvancedViewRenderer.showToast(TEXT.noCamera, 'error');
            return;
        }

        stopTracks(this.creatorCameraStream);
        if (this.cameraStream && this.cameraStream !== this.creatorCameraStream) {
            stopTracks(this.cameraStream);
        }
        this.creatorCameraStream = null;

        const constraints = {
            audio: true,
            video: {
                facingMode: this.creatorFacingMode === 'environment'
                    ? { ideal: 'environment' }
                    : { ideal: 'user' },
                width: { ideal: 1080 },
                height: { ideal: 1920 },
                aspectRatio: { ideal: 9 / 16 }
            }
        };

        try {
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.creatorCameraStream = stream;
            this.cameraStream = stream;
            cameraVideo.srcObject = stream;
            applyTrackZoomMin(stream);
            if (typeof cameraVideo.play === 'function') {
                cameraVideo.play().catch(() => {});
            }
            this.cameraInitialized = true;
            this.startCreatorMaskTracking();
        } catch (error) {
            console.error('[creator-studio] camera start failed:', error);
            AdvancedViewRenderer.showToast(TEXT.noCamera, 'error');
        }
    };

    proto.closeCreatorStudioCamera = function closeCreatorStudioCamera() {
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) uploadArea.style.display = 'flex';
        if (this.cameraPreview) this.cameraPreview.style.display = 'none';
        if (this.state && this.state.isRecording && typeof this.stopRecording === 'function') {
            this.stopRecording();
        }
        this.stopCreatorMaskTracking();
        stopTracks(this.creatorCameraStream);
        this.creatorCameraStream = null;
        this.cameraStream = null;
        if (this.cameraVideo) this.cameraVideo.srcObject = null;
        this.navigateTo('feed-view');
    };

    proto.hideLegacyProfileActionButtons = function hideLegacyProfileActionButtons() {
        const shareBtn = document.getElementById('share-profile-btn');
        if (shareBtn) shareBtn.style.display = 'none';
        const liveBtn = document.getElementById('open-live-btn');
        if (liveBtn) liveBtn.style.display = 'none';
    };

    const ORIGINAL_SETUP_EVENT_LISTENERS = proto.setupEventListeners;
    proto.setupEventListeners = function wrappedSetupEventListeners(...args) {
        const result = ORIGINAL_SETUP_EVENT_LISTENERS.apply(this, args);
        this.ensureCreatorLauncher();
        this.hideLegacyProfileActionButtons();

        if (!this.__creatorUploadInterceptorBound) {
            this.__creatorUploadInterceptorBound = true;
            document.addEventListener('click', (event) => {
                if (!isOwnUploadNavClick(event)) return;
                event.preventDefault();
                event.stopPropagation();
                if (typeof event.stopImmediatePropagation === 'function') {
                    event.stopImmediatePropagation();
                }
                this.openCreatorLauncher();
            }, true);
        }

        const publishBtn = document.getElementById('publish-btn');
        if (publishBtn && publishBtn.dataset.creatorBound !== '1') {
            publishBtn.dataset.creatorBound = '1';
            publishBtn.addEventListener('click', () => {
                // Keep creator mode stable after publish flows.
                setTimeout(() => {
                    this.hideLegacyProfileActionButtons();
                }, 20);
            });
        }

        return result;
    };

    const ORIGINAL_NAVIGATE_TO = proto.navigateTo;
    proto.navigateTo = function wrappedNavigateTo(viewId, ...rest) {
        const currentView = this.state && this.state.activeViewId ? this.state.activeViewId : '';
        if (viewId !== 'upload-view') {
            this.stopCreatorMaskTracking();
        }
        if (currentView === 'upload-view' && viewId !== 'upload-view' && this.creatorCameraStream) {
            this.stopCreatorMaskTracking();
            stopTracks(this.creatorCameraStream);
            this.creatorCameraStream = null;
            this.cameraStream = null;
            if (this.cameraVideo) this.cameraVideo.srcObject = null;
        }
        const result = ORIGINAL_NAVIGATE_TO.call(this, viewId, ...rest);
        this.hideLegacyProfileActionButtons();
        if (viewId !== 'upload-view') {
            this.closeCreatorLauncher();
        }
        return result;
    };

    const ORIGINAL_CONFIGURE_PROFILE_ACTIONS = proto.configureProfileActionButtons;
    if (typeof ORIGINAL_CONFIGURE_PROFILE_ACTIONS === 'function') {
        proto.configureProfileActionButtons = function wrappedConfigureProfileActionButtons(...args) {
            const result = ORIGINAL_CONFIGURE_PROFILE_ACTIONS.apply(this, args);
            this.hideLegacyProfileActionButtons();
            return result;
        };
    }

})(typeof window !== 'undefined' ? window : null);
