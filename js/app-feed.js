/**
 * AdvancedApp feed module.
 * Extracted from app.js to keep the main class smaller and easier to maintain.
 */
(function attachFeedModule(globalObject) {
    if (!globalObject) return;
    const AppCtor = globalObject.AdvancedApp || (typeof AdvancedApp !== 'undefined' ? AdvancedApp : null);
    if (!AppCtor || !AppCtor.prototype) return;

    const proto = AppCtor.prototype;

    proto.setupPullToRefresh = function() {
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
    };

    proto.setupFeedPaging = function() {
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
    };

    proto.resetFeedVideoLifecycle = function() {
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
    };

    proto.saveGlobalFeedSnapshot = function() {
        if (this.savedGlobalFeed || !this.feedContainer) return;

        this.savedGlobalFeed = {
            html: this.feedContainer.innerHTML,
            scrollTop: this.feedContainer.scrollTop,
            currentPage: this.state.currentPage,
            hasMore: this.state.hasMore,
            activeFeedIndex: this.state.activeFeedIndex
        };
    };

    proto.restoreGlobalFeedSnapshot = function() {
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
    };

    proto.renderFeedVideos = function(videos = []) {
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
    };

    proto.enterCustomFeedMode = function(videos = [], { startIndex = 0, returnViewId = 'profile-view' } = {}) {
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
    };

    proto.exitCustomFeedMode = function({ navigateBack = true } = {}) {
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
    };

    proto.setupSwipe = function() {
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
    };

    proto.loadFeed = async function(clear = false) {
        if (this.state.loading) return;
        const perfToken = this.beginPerf('feed.load', {
            clear: !!clear,
            source: this.state.feedSource,
            mode: this.state.feedMode
        });
        let perfStatus = 'success';
        let perfCount = 0;

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
            if (this.state.feedSource === 'live') {
                if (typeof this.stopLiveFeedPreview === 'function') {
                    this.stopLiveFeedPreview({ keepObserver: false });
                }
                this.state.currentPage = 0;
                this.state.hasMore = false;

                if (this.feedVideoObserver) {
                    this.feedVideoObserver.disconnect();
                    this.feedVideoObserver = null;
                }
                this.feedIntersectionRatios.clear();

                this.feedContainer.innerHTML = '';
                if (typeof this.refreshLiveSessions === 'function') {
                    await this.refreshLiveSessions({ silent: true });
                }
                if (typeof this.renderLiveFeedList === 'function') {
                    this.renderLiveFeedList();
                } else {
                    this.renderFeedEmptyState('live');
                }
                perfCount = Array.isArray(this.liveSessions) ? this.liveSessions.length : 0;
            } else {
                if (typeof this.stopLiveFeedPreview === 'function') {
                    this.stopLiveFeedPreview({ keepObserver: false });
                }
                const pageSize = this.state.feedSource === 'following' ? 15 : 8;
                const { videos, hasMore } = await this.dataService.getFeed(this.state.currentPage, pageSize);
                const preparedVideos = this.prepareGlobalFeedVideos(videos);
                perfCount = Array.isArray(preparedVideos) ? preparedVideos.length : 0;

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

                if (clear) {
                    this.loadStories({ silent: true }).catch(() => {});
                    this.refreshSeasonBanner();
                }
            }
        } catch (error) {
            perfStatus = 'error';
            console.error('Error loading feed:', error);
            AdvancedViewRenderer.showToast('Ошибка загрузки ленты', 'error');
        } finally {
            this.state.loading = false;
            AdvancedViewRenderer.hideLoading();
            this.endPerf(perfToken, {
                status: perfStatus,
                renderedCount: perfCount,
                page: this.state.currentPage,
                hasMore: !!this.state.hasMore
            });
        }
    };

    proto.getFeedVideoItems = function() {
        if (!this.feedContainer) return [];
        return Array.from(this.feedContainer.querySelectorAll('.video-item'));
    };

    proto.getNearestFeedIndex = function() {
        const items = this.getFeedVideoItems();
        if (!items.length || !this.feedContainer) return 0;

        // Items are full-height, so this is fast and reliable.
        const height = this.feedContainer.clientHeight || 1;
        const index = Math.round(this.feedContainer.scrollTop / height);
        return Math.max(0, Math.min(index, items.length - 1));
    };

    proto.scrollFeedToIndex = function(index, behavior = 'smooth') {
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
    };

    proto.ensureVideoSource = function(videoEl) {
        if (!videoEl) return;

        const desiredSrc = videoEl.dataset.src;
        if (!desiredSrc) return;

        const currentSrc = videoEl.getAttribute('src');
        if (currentSrc !== desiredSrc) {
            videoEl.setAttribute('src', desiredSrc);
            try { videoEl.load(); } catch (_) {}
        }
    };
})(typeof window !== 'undefined' ? window : globalThis);
