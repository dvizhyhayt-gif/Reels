// Media carousel module.
// Adds:
// - Upload/publish image carousel posts.
// - Carousel rendering in feed cards.
// - Carousel controls/swipe in feed.
(function attachMediaCarouselModule(globalObject) {
    'use strict';

    if (!globalObject) return;

    const AppCtor = globalObject.AdvancedApp || (typeof AdvancedApp !== 'undefined' ? AdvancedApp : null);
    const DataCtor = globalObject.AdvancedDataService || (typeof AdvancedDataService !== 'undefined' ? AdvancedDataService : null);
    const FirebaseCtor = globalObject.FirebaseService || (typeof FirebaseService !== 'undefined' ? FirebaseService : null);
    const ViewRenderer = globalObject.AdvancedViewRenderer || (typeof AdvancedViewRenderer !== 'undefined' ? AdvancedViewRenderer : null);

    if (!AppCtor || !AppCtor.prototype || !DataCtor || !DataCtor.prototype || !ViewRenderer) return;
    if (AppCtor.prototype.__mediaCarouselPatched) return;
    AppCtor.prototype.__mediaCarouselPatched = true;

    const MAX_CAROUSEL_IMAGES = 10;
    const CAROUSEL_ACCEPT = 'image/*,video/mp4,video/webm,video/quicktime';

    function isImageFile(file) {
        return !!(file && typeof file.type === 'string' && file.type.toLowerCase().startsWith('image/'));
    }

    function isVideoFile(file) {
        return !!(file && typeof file.type === 'string' && file.type.toLowerCase().startsWith('video/'));
    }

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function normalizeCarouselItems(items) {
        return asArray(items)
            .map((item) => {
                if (!item) return null;
                if (typeof item === 'string') return { url: item };
                const url = String(item.url || item.src || '').trim();
                if (!url) return null;
                return {
                    url,
                    storagePath: String(item.storagePath || ''),
                    storageProvider: String(item.storageProvider || item.provider || 'firebase'),
                    mime: String(item.mime || item.type || '')
                };
            })
            .filter(Boolean);
    }

    function isCarouselPost(video) {
        if (!video || typeof video !== 'object') return false;
        if (String(video.mediaType || '') === 'carousel') return true;
        return normalizeCarouselItems(video.carouselItems).length > 0;
    }

    function normalizeVideoMediaShape(video) {
        if (!video || typeof video !== 'object') return video;
        const result = { ...video };
        const items = normalizeCarouselItems(result.carouselItems);
        if (items.length > 0) {
            result.mediaType = 'carousel';
            result.carouselItems = items;
            if (!result.url) result.url = items[0].url;
            if (!result.thumbnail) result.thumbnail = items[0].url;
        } else {
            result.mediaType = result.mediaType || 'video';
            result.carouselItems = [];
        }
        return result;
    }

    function readFileAsDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result || ''));
            reader.onerror = () => reject(reader.error || new Error('file-read-failed'));
            reader.readAsDataURL(file);
        });
    }

    if (FirebaseCtor && FirebaseCtor.prototype && !FirebaseCtor.prototype.__mediaCarouselPatched) {
        const firebaseProto = FirebaseCtor.prototype;
        firebaseProto.__mediaCarouselPatched = true;

        firebaseProto.uploadCarousel = async function uploadCarousel(files = [], metadata = {}) {
            const uid = this.getCurrentUid && this.getCurrentUid();
            if (!uid) throw new Error('Authorization required');

            const imageFiles = asArray(files).filter(isImageFile).slice(0, MAX_CAROUSEL_IMAGES);
            if (!imageFiles.length) throw new Error('Select photos for carousel');

            const userProfile = await this.getUserProfile(uid);
            const safeAuthor = (userProfile && userProfile.name) ? userProfile.name : 'user';
            const safeAvatar = this.sanitizeAvatarForPublicPayload(userProfile && userProfile.avatar, safeAuthor);

            const uploadedItems = [];
            for (const file of imageFiles) {
                const uploaded = await this.uploadMedia(file, `videos/${uid}/carousel`, { uid, purpose: 'carousel' });
                uploadedItems.push({
                    url: uploaded.url,
                    storagePath: uploaded.storagePath || '',
                    storageProvider: uploaded.storageProvider || 'firebase',
                    mime: file.type || 'image/jpeg'
                });
            }

            const first = uploadedItems[0];
            const doc = {
                id: Date.now(),
                uid: uid,
                author: safeAuthor,
                avatar: safeAvatar,
                authorVerified: !!(userProfile && userProfile.verified),
                authorPrivate: !!(userProfile && userProfile.privateAccount),
                mediaType: 'carousel',
                carouselItems: uploadedItems,
                url: first.url,
                thumbnail: first.url,
                storagePath: first.storagePath,
                storageProvider: first.storageProvider,
                desc: metadata.desc || '',
                tags: metadata.tags || '',
                hashtags: metadata.tags ? String(metadata.tags).split(' ').filter(t => t.startsWith('#')) : [],
                filter: metadata.filter || 'none',
                likes: 0,
                likedBy: [],
                commentsCount: 0,
                views: 0,
                shares: 0,
                allowComments: metadata.allowComments !== false,
                private: metadata.private === true,
                ageRestricted: metadata.ageRestricted === true,
                videoTemplate: String(metadata.videoTemplate || 'none'),
                coverText: String(metadata.coverText || '').trim().slice(0, 48),
                coverSticker: String(metadata.coverSticker || '').trim().slice(0, 32),
                coverColor: this.normalizeCoverColor(metadata.coverColor),
                isLiked: false,
                timestamp: new Date(),
                updatedAt: new Date()
            };

            const ref = await this.db.collection('videos').add(doc);
            try {
                await this.awardCoins(uid, 5, 'video_published', { videoFirestoreId: ref.id });
            } catch (coinsError) {
                console.warn('[warn] Failed to award coins for carousel publish:', coinsError?.message || coinsError);
            }
            return normalizeVideoMediaShape({ ...doc, firestoreId: ref.id });
        };

        ['getFeed', 'getVideosByAuthor', 'getVideosByUid'].forEach((methodName) => {
            const original = firebaseProto[methodName];
            if (typeof original !== 'function') return;
            firebaseProto[methodName] = async function patchedMediaListMethod(...args) {
                const response = await original.apply(this, args);
                if (!Array.isArray(response)) return response;
                return response.map((item) => normalizeVideoMediaShape(item));
            };
        });

        const originalDeleteVideo = firebaseProto.deleteVideo;
        firebaseProto.deleteVideo = async function patchedDeleteVideo(firestoreId, storagePath, storageProvider = 'firebase') {
            if (!firestoreId || !this.db || !this.db.collection) {
                return originalDeleteVideo.call(this, firestoreId, storagePath, storageProvider);
            }

            const ref = this.db.collection('videos').doc(firestoreId);
            const attachments = new Map();
            const addAttachment = (path, provider) => {
                const safePath = String(path || '').trim();
                if (!safePath || attachments.has(safePath)) return;
                attachments.set(safePath, String(provider || 'firebase'));
            };
            addAttachment(storagePath, storageProvider);

            try {
                const snapshot = await ref.get();
                const data = snapshot && snapshot.exists ? (snapshot.data() || {}) : null;
                if (data) {
                    addAttachment(data.storagePath, data.storageProvider);
                    normalizeCarouselItems(data.carouselItems).forEach((item) => addAttachment(item.storagePath, item.storageProvider));
                }
            } catch (_) {}

            for (const [path, provider] of attachments.entries()) {
                if (!path) continue;
                try {
                    if (provider === 'cloudflare' && typeof this.isExternalMediaEnabled === 'function' && this.isExternalMediaEnabled()) {
                        if (this.mediaStorage && typeof this.mediaStorage.deleteFile === 'function') await this.mediaStorage.deleteFile(path);
                    } else if (this.storage) {
                        await this.storage.ref(path).delete();
                    }
                } catch (error) {
                    console.warn('[warn] Failed to delete attachment:', path, error?.message || error);
                }
            }

            await ref.delete();
            console.log('[ok] Video deleted');
            return true;
        };
    }

    if (!DataCtor.prototype.uploadCarousel) {
        DataCtor.prototype.uploadCarousel = async function uploadCarousel(files = [], metadata = {}) {
            const imageFiles = asArray(files).filter(isImageFile).slice(0, MAX_CAROUSEL_IMAGES);
            if (!imageFiles.length) throw new Error('Select photos for carousel');

            if (typeof firebaseService !== 'undefined'
                && firebaseService
                && typeof firebaseService.isInitialized === 'function'
                && firebaseService.isInitialized()
                && typeof firebaseService.uploadCarousel === 'function') {
                const uploaded = await firebaseService.uploadCarousel(imageFiles, metadata);
                if (uploaded) {
                    this.userVideos.unshift(normalizeVideoMediaShape(uploaded));
                    this.syncFeedCacheWithLocal({ hasMore: true });
                }
                return uploaded;
            }

            const urls = [];
            for (const file of imageFiles) {
                urls.push(await readFileAsDataUrl(file));
            }

            const currentUser = this.getCurrentUser();
            const post = normalizeVideoMediaShape({
                id: Date.now(),
                uid: currentUser && currentUser.uid ? currentUser.uid : null,
                author: currentUser && currentUser.name ? currentUser.name : 'user',
                avatar: currentUser && currentUser.avatar ? currentUser.avatar : 'assets/default-avatar.svg',
                authorVerified: !!(currentUser && currentUser.verified),
                mediaType: 'carousel',
                carouselItems: urls.map((url) => ({ url })),
                url: urls[0],
                thumbnail: urls[0],
                desc: metadata.desc || '',
                tags: metadata.tags || '',
                hashtags: metadata.tags ? String(metadata.tags).split(' ').filter(t => t.startsWith('#')) : [],
                filter: metadata.filter || 'none',
                likes: 0,
                comments: [],
                commentsCount: 0,
                views: 0,
                shares: 0,
                allowComments: metadata.allowComments !== false,
                private: metadata.private === true,
                ageRestricted: metadata.ageRestricted === true,
                videoTemplate: String(metadata.videoTemplate || 'none'),
                coverText: String(metadata.coverText || '').trim().slice(0, 48),
                coverSticker: String(metadata.coverSticker || '').trim().slice(0, 32),
                coverColor: '#1cb8ff',
                timestamp: Date.now(),
                isLiked: false
            });

            this.userVideos.unshift(post);
            this.syncFeedCacheWithLocal({ hasMore: true });
            this.persistVideoCache();
            return post;
        };
    }

    const originalUploadVideo = DataCtor.prototype.uploadVideo;
    if (typeof originalUploadVideo === 'function') {
        DataCtor.prototype.uploadVideo = async function patchedUploadVideo(...args) {
            const uploaded = await originalUploadVideo.apply(this, args);
            return normalizeVideoMediaShape(uploaded);
        };
    }

    const originalGetFeedData = DataCtor.prototype.getFeed;
    if (typeof originalGetFeedData === 'function') {
        DataCtor.prototype.getFeed = async function patchedGetFeed(...args) {
            const response = await originalGetFeedData.apply(this, args);
            if (response && Array.isArray(response.videos)) {
                response.videos = response.videos.map((video) => normalizeVideoMediaShape(video));
            }
            return response;
        };
    }

    const originalCreateVideoCard = ViewRenderer.createVideoCard.bind(ViewRenderer);
    ViewRenderer.createVideoCard = function patchedCreateVideoCard(video, options = {}) {
        const normalizedVideo = normalizeVideoMediaShape(video);
        const card = originalCreateVideoCard(normalizedVideo, options);
        if (!isCarouselPost(normalizedVideo) || !card) return card;

        const items = normalizeCarouselItems(normalizedVideo.carouselItems);
        const imageUrls = items.map((item) => item.url).filter(Boolean);
        if (!imageUrls.length) return card;

        const progress = card.querySelector('.video-progress');
        if (progress) progress.style.display = 'none';

        const videoEl = card.querySelector('video');
        if (videoEl) videoEl.remove();

        card.dataset.mediaType = 'carousel';
        card.dataset.carouselTotal = String(imageUrls.length);

        const stage = document.createElement('div');
        stage.className = 'feed-carousel';
        stage.dataset.index = '0';

        const track = document.createElement('div');
        track.className = 'feed-carousel-track';
        imageUrls.forEach((url, index) => {
            const slide = document.createElement('div');
            slide.className = 'feed-carousel-slide';
            const img = document.createElement('img');
            img.className = 'feed-carousel-image';
            img.src = url;
            img.alt = `slide-${index + 1}`;
            img.loading = index === 0 ? 'eager' : 'lazy';
            slide.appendChild(img);
            track.appendChild(slide);
        });
        stage.appendChild(track);

        if (imageUrls.length > 1) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'feed-carousel-nav feed-carousel-prev';
            prevBtn.type = 'button';
            prevBtn.setAttribute('aria-label', 'Previous photo');
            prevBtn.textContent = '<';

            const nextBtn = document.createElement('button');
            nextBtn.className = 'feed-carousel-nav feed-carousel-next';
            nextBtn.type = 'button';
            nextBtn.setAttribute('aria-label', 'Next photo');
            nextBtn.textContent = '>';

            stage.appendChild(prevBtn);
            stage.appendChild(nextBtn);

            const dots = document.createElement('div');
            dots.className = 'feed-carousel-dots';
            for (let i = 0; i < imageUrls.length; i += 1) {
                const dot = document.createElement('button');
                dot.type = 'button';
                dot.className = `feed-carousel-dot${i === 0 ? ' active' : ''}`;
                dot.dataset.index = String(i);
                dot.setAttribute('aria-label', `Slide ${i + 1}`);
                dots.appendChild(dot);
            }
            stage.appendChild(dots);
        }

        const counter = document.createElement('div');
        counter.className = 'feed-carousel-counter';
        counter.textContent = `1/${imageUrls.length}`;
        stage.appendChild(counter);

        if (progress && progress.parentNode === card) {
            card.insertBefore(stage, progress.nextSibling);
        } else {
            card.insertBefore(stage, card.firstChild || null);
        }

        return card;
    };

    const proto = AppCtor.prototype;

    proto.ensureUploadCarouselPreviewUi = function ensureUploadCarouselPreviewUi() {
        const previewRoot = document.getElementById('upload-preview');
        if (!previewRoot) return null;
        let carouselPreview = document.getElementById('preview-carousel');
        if (carouselPreview) return carouselPreview;

        carouselPreview = document.createElement('div');
        carouselPreview.id = 'preview-carousel';
        carouselPreview.className = 'upload-carousel-preview';
        carouselPreview.style.display = 'none';
        carouselPreview.innerHTML = `
            <div class="upload-carousel-track" id="upload-carousel-track"></div>
            <button type="button" class="upload-carousel-nav upload-carousel-prev" aria-label="Previous photo">&lt;</button>
            <button type="button" class="upload-carousel-nav upload-carousel-next" aria-label="Next photo">&gt;</button>
            <div class="upload-carousel-dots" id="upload-carousel-dots"></div>
            <div class="upload-carousel-counter" id="upload-carousel-counter">1/1</div>
        `;

        previewRoot.appendChild(carouselPreview);
        return carouselPreview;
    };

    proto.hideUploadCarouselPreview = function hideUploadCarouselPreview() {
        const carouselPreview = this.ensureUploadCarouselPreviewUi();
        const previewVideo = document.getElementById('preview-video');
        if (carouselPreview) carouselPreview.style.display = 'none';
        if (previewVideo) previewVideo.style.display = 'block';
    };

    proto.renderUploadCarouselPreview = function renderUploadCarouselPreview(files = []) {
        const images = asArray(files).filter(isImageFile).slice(0, MAX_CAROUSEL_IMAGES);
        if (!images.length) return false;

        this.uploadMediaMode = 'carousel';
        this.uploadCarouselFiles = images;
        this.uploadCarouselIndex = 0;

        const previewRoot = document.getElementById('upload-preview');
        const uploadArea = document.getElementById('upload-area');
        const previewVideo = document.getElementById('preview-video');
        const carouselPreview = this.ensureUploadCarouselPreviewUi();
        if (!previewRoot || !carouselPreview) return false;

        const track = carouselPreview.querySelector('#upload-carousel-track');
        const dots = carouselPreview.querySelector('#upload-carousel-dots');
        const counter = carouselPreview.querySelector('#upload-carousel-counter');
        if (!track || !dots || !counter) return false;

        carouselPreview.querySelectorAll('img[data-object-url]').forEach((img) => {
            const objectUrl = img.dataset.objectUrl;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        });
        track.innerHTML = '';
        dots.innerHTML = '';

        images.forEach((file, index) => {
            const url = URL.createObjectURL(file);
            const slide = document.createElement('div');
            slide.className = 'upload-carousel-slide';
            const img = document.createElement('img');
            img.src = url;
            img.alt = `photo-${index + 1}`;
            img.loading = index === 0 ? 'eager' : 'lazy';
            img.dataset.objectUrl = url;
            slide.appendChild(img);
            track.appendChild(slide);

            const dot = document.createElement('button');
            dot.type = 'button';
            dot.className = `upload-carousel-dot${index === 0 ? ' active' : ''}`;
            dot.dataset.index = String(index);
            dots.appendChild(dot);
        });

        const apply = () => {
            const total = images.length;
            const index = Math.max(0, Math.min(this.uploadCarouselIndex || 0, total - 1));
            this.uploadCarouselIndex = index;
            track.style.transform = `translateX(-${index * 100}%)`;
            dots.querySelectorAll('.upload-carousel-dot').forEach((dot) => {
                dot.classList.toggle('active', Number(dot.dataset.index) === index);
            });
            counter.textContent = `${index + 1}/${total}`;

            const showNav = total > 1;
            const prevBtn = carouselPreview.querySelector('.upload-carousel-prev');
            const nextBtn = carouselPreview.querySelector('.upload-carousel-next');
            if (prevBtn) prevBtn.style.display = showNav ? '' : 'none';
            if (nextBtn) nextBtn.style.display = showNav ? '' : 'none';
        };

        if (carouselPreview.dataset.bound !== '1') {
            carouselPreview.dataset.bound = '1';

            carouselPreview.querySelector('.upload-carousel-prev')?.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.uploadCarouselIndex = Math.max(0, (this.uploadCarouselIndex || 0) - 1);
                apply();
            });

            carouselPreview.querySelector('.upload-carousel-next')?.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                this.uploadCarouselIndex = Math.min((this.uploadCarouselFiles || []).length - 1, (this.uploadCarouselIndex || 0) + 1);
                apply();
            });

            dots.addEventListener('click', (event) => {
                const dot = event.target && event.target.closest ? event.target.closest('.upload-carousel-dot[data-index]') : null;
                if (!dot) return;
                event.preventDefault();
                event.stopPropagation();
                this.uploadCarouselIndex = Number(dot.dataset.index) || 0;
                apply();
            });
        }

        if (previewVideo) previewVideo.style.display = 'none';
        carouselPreview.style.display = 'block';
        previewRoot.style.display = 'block';
        if (uploadArea) uploadArea.style.display = 'none';
        if (this.cameraPreview) this.cameraPreview.style.display = 'none';
        apply();
        return true;
    };

    proto.resetUploadMediaSelection = function resetUploadMediaSelection() {
        this.uploadMediaMode = 'video';
        this.uploadCarouselFiles = [];
        this.uploadCarouselIndex = 0;

        const carouselPreview = this.ensureUploadCarouselPreviewUi();
        if (!carouselPreview) return;

        carouselPreview.querySelectorAll('img[data-object-url]').forEach((img) => {
            const objectUrl = img.dataset.objectUrl;
            if (objectUrl) URL.revokeObjectURL(objectUrl);
        });
        carouselPreview.style.display = 'none';

        const track = carouselPreview.querySelector('#upload-carousel-track');
        const dots = carouselPreview.querySelector('#upload-carousel-dots');
        const counter = carouselPreview.querySelector('#upload-carousel-counter');
        if (track) track.innerHTML = '';
        if (dots) dots.innerHTML = '';
        if (counter) counter.textContent = '1/1';
    };

    proto.handleUploadFilesSelection = function handleUploadFilesSelection(fileList) {
        const files = asArray(fileList).filter(Boolean);
        if (!files.length) return false;

        const imageFiles = files.filter(isImageFile);
        const videoFiles = files.filter(isVideoFile);

        if (imageFiles.length > 0 && videoFiles.length === 0) {
            if (imageFiles.length > MAX_CAROUSEL_IMAGES) {
                AdvancedViewRenderer.showToast(`Carousel: max ${MAX_CAROUSEL_IMAGES} photos`, 'warning');
            }
            this.renderUploadCarouselPreview(imageFiles);
            this.showUploadDraftNote('Photo carousel selected');
            return true;
        }

        if (videoFiles.length > 0) {
            this.resetUploadMediaSelection();
            this.uploadMediaMode = 'video';
            const chosenVideo = videoFiles[0];
            const fileInput = document.getElementById('video-file-input');
            if (fileInput && typeof DataTransfer !== 'undefined') {
                try {
                    const dt = new DataTransfer();
                    dt.items.add(chosenVideo);
                    fileInput.files = dt.files;
                } catch (_) {}
            }
            this.previewVideo(chosenVideo);
            return true;
        }

        AdvancedViewRenderer.showToast('Choose video or photos', 'warning');
        return true;
    };

    proto.publishCarouselPost = async function publishCarouselPost() {
        const files = asArray(this.uploadCarouselFiles).filter(isImageFile).slice(0, MAX_CAROUSEL_IMAGES);
        if (!files.length) {
            AdvancedViewRenderer.showToast('Choose photos for carousel', 'warning');
            return;
        }

        const desc = this.uploadDescInput ? this.uploadDescInput.value.trim() : '';
        if (!desc) {
            AdvancedViewRenderer.showToast('Add description', 'warning');
            return;
        }

        const btn = document.getElementById('publish-btn');
        const btnText = document.getElementById('publish-btn-text');
        if (!btn || !btnText) return;
        const originalText = btnText.textContent;
        btnText.textContent = 'Publishing...';
        btn.disabled = true;

        try {
            const tags = this.uploadTagsInput ? this.uploadTagsInput.value.trim() : '';
            const allowComments = this.allowCommentsInput ? this.allowCommentsInput.checked : true;
            const isPrivate = this.privateVideoInput ? this.privateVideoInput.checked : false;
            const isAgeRestricted = this.ageRestrictedInput ? this.ageRestrictedInput.checked : false;
            const videoTemplate = this.videoTemplateInput ? this.videoTemplateInput.value : 'none';
            const coverText = this.coverTextInput ? this.coverTextInput.value.trim() : '';
            const coverSticker = this.coverStickerInput ? this.coverStickerInput.value : '';
            const coverColor = this.coverColorInput ? this.coverColorInput.value : '#1cb8ff';

            await this.dataService.uploadCarousel(files, {
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

            const fileInput = document.getElementById('video-file-input');
            const uploadArea = document.getElementById('upload-area');
            const uploadPreview = document.getElementById('upload-preview');
            if (fileInput) fileInput.value = '';
            if (uploadPreview) uploadPreview.style.display = 'none';
            if (uploadArea) uploadArea.style.display = 'flex';

            if (this.uploadDescInput) this.uploadDescInput.value = '';
            if (this.uploadTagsInput) this.uploadTagsInput.value = '';
            if (this.allowCommentsInput) this.allowCommentsInput.checked = true;
            if (this.privateVideoInput) this.privateVideoInput.checked = false;
            if (this.ageRestrictedInput) this.ageRestrictedInput.checked = false;
            if (this.videoTemplateInput) this.videoTemplateInput.value = 'none';
            if (this.coverTextInput) this.coverTextInput.value = '';
            if (this.coverStickerInput) this.coverStickerInput.value = '';
            if (this.coverColorInput) this.coverColorInput.value = '#1cb8ff';

            this.state.recordedChunks = [];
            this.state.selectedFilter = 'none';
            document.querySelectorAll('.filter-option').forEach((opt) => {
                opt.classList.toggle('active', opt.dataset.filter === 'none');
            });

            this.resetUploadMediaSelection();
            this.clearUploadDraft({ clearForm: false, showToast: false });
            this.navigateTo('profile-view');
            this.updateProfileUI();
            AdvancedViewRenderer.showToast('Carousel published!', 'success');
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error?.message || 'Carousel publish failed', 'error');
        } finally {
            btnText.textContent = originalText || 'Publish';
            btn.disabled = false;
        }
    };

    proto.bindFeedCarousel = function bindFeedCarousel(item) {
        if (!item || item.dataset.carouselBound === '1') return;
        const stage = item.querySelector('.feed-carousel');
        if (!stage) return;
        const track = stage.querySelector('.feed-carousel-track');
        const slides = stage.querySelectorAll('.feed-carousel-slide');
        if (!track || !slides.length) return;

        item.dataset.carouselBound = '1';
        let index = Math.max(0, Math.min(parseInt(stage.dataset.index || '0', 10) || 0, slides.length - 1));
        let touchStartX = 0;
        let touchStartY = 0;

        const apply = () => {
            track.style.transform = `translateX(-${index * 100}%)`;
            stage.dataset.index = String(index);
            stage.querySelectorAll('.feed-carousel-dot').forEach((dot) => {
                dot.classList.toggle('active', Number(dot.dataset.index) === index);
            });
            const counter = stage.querySelector('.feed-carousel-counter');
            if (counter) counter.textContent = `${index + 1}/${slides.length}`;
        };

        const move = (delta) => {
            const next = Math.max(0, Math.min(index + delta, slides.length - 1));
            if (next === index) return;
            index = next;
            apply();
        };

        stage.querySelector('.feed-carousel-prev')?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            move(-1);
        });

        stage.querySelector('.feed-carousel-next')?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            move(1);
        });

        stage.querySelectorAll('.feed-carousel-dot').forEach((dot) => {
            dot.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const dotIndex = Number(dot.dataset.index);
                if (!Number.isFinite(dotIndex)) return;
                index = Math.max(0, Math.min(dotIndex, slides.length - 1));
                apply();
            });
        });

        stage.addEventListener('touchstart', (event) => {
            if (!event.touches || !event.touches[0]) return;
            touchStartX = event.touches[0].clientX;
            touchStartY = event.touches[0].clientY;
        }, { passive: true });

        stage.addEventListener('touchend', (event) => {
            if (!event.changedTouches || !event.changedTouches[0]) return;
            const dx = event.changedTouches[0].clientX - touchStartX;
            const dy = event.changedTouches[0].clientY - touchStartY;
            if (Math.abs(dx) < 28 || Math.abs(dx) < Math.abs(dy)) return;
            event.stopPropagation();
            if (dx < 0) move(1);
            else move(-1);
        }, { passive: true });

        apply();
    };

    const originalAttachVideoEvents = proto.attachVideoEvents;
    if (typeof originalAttachVideoEvents === 'function') {
        proto.attachVideoEvents = function patchedAttachVideoEvents(...args) {
            const result = originalAttachVideoEvents.apply(this, args);
            if (this.feedContainer) {
                this.feedContainer.querySelectorAll('.video-item[data-media-type="carousel"]').forEach((item) => {
                    this.bindFeedCarousel(item);
                });
            }
            return result;
        };
    }

    const originalPreviewVideo = proto.previewVideo;
    if (typeof originalPreviewVideo === 'function') {
        proto.previewVideo = function patchedPreviewVideo(file, ...rest) {
            this.uploadMediaMode = 'video';
            this.uploadCarouselFiles = [];
            this.uploadCarouselIndex = 0;
            this.hideUploadCarouselPreview();
            return originalPreviewVideo.call(this, file, ...rest);
        };
    }

    const originalSetupUploadEvents = proto.setupUploadEvents;
    if (typeof originalSetupUploadEvents === 'function') {
        proto.setupUploadEvents = function patchedSetupUploadEvents(...args) {
            const result = originalSetupUploadEvents.apply(this, args);

            const uploadArea = document.getElementById('upload-area');
            const fileInput = document.getElementById('video-file-input');
            const publishBtn = document.getElementById('publish-btn');
            if (!uploadArea || !fileInput || !publishBtn) return result;

            this.ensureUploadCarouselPreviewUi();
            if (!this.uploadMediaMode) this.uploadMediaMode = 'video';
            if (!Array.isArray(this.uploadCarouselFiles)) this.uploadCarouselFiles = [];
            if (!Number.isFinite(this.uploadCarouselIndex)) this.uploadCarouselIndex = 0;

            fileInput.accept = CAROUSEL_ACCEPT;
            fileInput.multiple = true;

            if (fileInput.dataset.carouselUploadBound !== '1') {
                fileInput.dataset.carouselUploadBound = '1';

                fileInput.addEventListener('change', (event) => {
                    const handled = this.handleUploadFilesSelection(fileInput.files);
                    if (!handled) return;
                    event.preventDefault();
                    if (typeof event.stopImmediatePropagation === 'function') {
                        event.stopImmediatePropagation();
                    } else {
                        event.stopPropagation();
                    }
                }, true);

                uploadArea.addEventListener('drop', (event) => {
                    const files = event.dataTransfer ? event.dataTransfer.files : null;
                    if (!files || !files.length) return;
                    const handled = this.handleUploadFilesSelection(files);
                    if (!handled) return;
                    event.preventDefault();
                    if (typeof event.stopImmediatePropagation === 'function') {
                        event.stopImmediatePropagation();
                    } else {
                        event.stopPropagation();
                    }
                }, true);
            }

            if (publishBtn.dataset.carouselPublishBound !== '1') {
                publishBtn.dataset.carouselPublishBound = '1';
                publishBtn.addEventListener('click', (event) => {
                    if (this.uploadMediaMode !== 'carousel') return;
                    event.preventDefault();
                    if (typeof event.stopImmediatePropagation === 'function') {
                        event.stopImmediatePropagation();
                    } else {
                        event.stopPropagation();
                    }
                    this.publishCarouselPost();
                }, true);
            }

            return result;
        };
    }

    const originalStartRecording = proto.startRecording;
    if (typeof originalStartRecording === 'function') {
        proto.startRecording = function patchedStartRecording(...args) {
            this.resetUploadMediaSelection();
            this.uploadMediaMode = 'video';
            const fileInput = document.getElementById('video-file-input');
            if (fileInput) fileInput.value = '';
            return originalStartRecording.apply(this, args);
        };
    }

    const originalToggleCamera = proto.toggleCamera;
    if (typeof originalToggleCamera === 'function') {
        proto.toggleCamera = async function patchedToggleCamera(...args) {
            if (this.uploadMediaMode === 'carousel') {
                this.resetUploadMediaSelection();
                const fileInput = document.getElementById('video-file-input');
                if (fileInput) fileInput.value = '';
            }
            return originalToggleCamera.apply(this, args);
        };
    }

    const originalNavigateTo = proto.navigateTo;
    if (typeof originalNavigateTo === 'function') {
        proto.navigateTo = function patchedNavigateTo(viewId, ...rest) {
            if (viewId !== 'upload-view') {
                this.resetUploadMediaSelection();
            }
            return originalNavigateTo.call(this, viewId, ...rest);
        };
    }
})(typeof window !== 'undefined' ? window : globalThis);
