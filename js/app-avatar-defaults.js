/**
 * Avatar defaults module.
 * Replaces letter-based ui-avatars with a single standard avatar image.
 */
(function attachAvatarDefaults(globalObject) {
    'use strict';

    if (!globalObject || typeof document === 'undefined') return;

    const DEFAULT_AVATAR_URL = 'assets/default-avatar.svg';
    const UI_AVATAR_PATTERN = /^https?:\/\/ui-avatars\.com\/api\//i;

    function isUiAvatarUrl(value = '') {
        return UI_AVATAR_PATTERN.test(String(value || '').trim());
    }

    function normalizeAvatarUrl(value = '') {
        const raw = String(value || '').trim();
        if (!raw) return DEFAULT_AVATAR_URL;
        if (isUiAvatarUrl(raw)) return DEFAULT_AVATAR_URL;
        return raw;
    }

    function isAvatarElement(img) {
        if (!img) return false;
        const className = String(img.className || '').toLowerCase();
        const id = String(img.id || '').toLowerCase();
        const alt = String(img.getAttribute('alt') || '').toLowerCase();
        if (className.includes('avatar')) return true;
        if (id.includes('avatar')) return true;
        if (alt.startsWith('@')) return true;
        if (img.closest && img.closest('.avatar-container, .chat-user-info, .profile-header, .story-chip, .live-room-host')) return true;
        return false;
    }

    function applyImageFallback(img) {
        if (!(img instanceof HTMLImageElement)) return;

        const currentSrc = String(img.getAttribute('src') || '').trim();
        const shouldReplace = isUiAvatarUrl(currentSrc) || (isAvatarElement(img) && !currentSrc);
        if (shouldReplace && currentSrc !== DEFAULT_AVATAR_URL) {
            img.setAttribute('src', DEFAULT_AVATAR_URL);
        }

        if (img.dataset.avatarFallbackBound !== '1') {
            img.dataset.avatarFallbackBound = '1';
            img.addEventListener('error', () => {
                if (!isAvatarElement(img)) return;
                if (img.getAttribute('src') !== DEFAULT_AVATAR_URL) {
                    img.setAttribute('src', DEFAULT_AVATAR_URL);
                }
            });
        }
    }

    function scanImages(root = document) {
        const scope = root && root.querySelectorAll ? root : document;
        scope.querySelectorAll('img').forEach((img) => applyImageFallback(img));
    }

    function observeImages() {
        if (typeof MutationObserver === 'undefined') return;

        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement) {
                    applyImageFallback(mutation.target);
                    return;
                }
                if (mutation.type !== 'childList' || !mutation.addedNodes || !mutation.addedNodes.length) return;
                mutation.addedNodes.forEach((node) => {
                    if (!node || node.nodeType !== 1) return;
                    if (node instanceof HTMLImageElement) {
                        applyImageFallback(node);
                        return;
                    }
                    if (node.querySelectorAll) {
                        node.querySelectorAll('img').forEach((img) => applyImageFallback(img));
                    }
                });
            });
        });

        observer.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['src']
        });
    }

    function patchFirebaseService() {
        const service = (typeof firebaseService !== 'undefined' && firebaseService)
            ? firebaseService
            : globalObject.firebaseService;
        if (!service) return;

        if (typeof service.buildUiAvatar === 'function' && service.__avatarBuildPatched !== true) {
            service.__avatarBuildPatched = true;
            service.buildUiAvatar = function patchedBuildUiAvatar() {
                return DEFAULT_AVATAR_URL;
            };
        }

        if (typeof service.normalizeUserRecord === 'function' && service.__avatarNormalizeRecordPatched !== true) {
            service.__avatarNormalizeRecordPatched = true;
            const originalNormalizeUserRecord = service.normalizeUserRecord.bind(service);
            service.normalizeUserRecord = function patchedNormalizeUserRecord(...args) {
                const record = originalNormalizeUserRecord(...args);
                if (record && typeof record === 'object') {
                    record.avatar = normalizeAvatarUrl(record.avatar);
                }
                return record;
            };
        }

        if (typeof service.sanitizeAvatarForPublicPayload === 'function' && service.__avatarSanitizePatched !== true) {
            service.__avatarSanitizePatched = true;
            const originalSanitize = service.sanitizeAvatarForPublicPayload.bind(service);
            service.sanitizeAvatarForPublicPayload = function patchedSanitize(...args) {
                const value = originalSanitize(...args);
                return normalizeAvatarUrl(value);
            };
        }

        if (service.currentUser && typeof service.currentUser === 'object') {
            service.currentUser.avatar = normalizeAvatarUrl(service.currentUser.avatar);
        }
    }

    function patchDataServiceCtor() {
        const DataCtor = globalObject.AdvancedDataService || (typeof AdvancedDataService !== 'undefined' ? AdvancedDataService : null);
        if (!DataCtor || !DataCtor.prototype || DataCtor.prototype.__avatarDefaultPatched) return;
        DataCtor.prototype.__avatarDefaultPatched = true;

        if (typeof DataCtor.prototype.getAvatarForUser === 'function') {
            const originalGetAvatarForUser = DataCtor.prototype.getAvatarForUser;
            DataCtor.prototype.getAvatarForUser = function patchedGetAvatarForUser(...args) {
                const value = originalGetAvatarForUser.apply(this, args);
                return normalizeAvatarUrl(value);
            };
        }
    }

    function patchViewRenderer() {
        const renderer = globalObject.AdvancedViewRenderer || (typeof AdvancedViewRenderer !== 'undefined' ? AdvancedViewRenderer : null);
        if (!renderer || renderer.__avatarPatched === true) return;
        renderer.__avatarPatched = true;

        if (typeof renderer.createVideoCard === 'function') {
            const originalCreateVideoCard = renderer.createVideoCard.bind(renderer);
            renderer.createVideoCard = function patchedCreateVideoCard(video = {}, options = {}) {
                const prepared = (video && typeof video === 'object')
                    ? { ...video, avatar: normalizeAvatarUrl(video.avatar) }
                    : video;
                const card = originalCreateVideoCard(prepared, options);
                if (card && card.querySelectorAll) {
                    card.querySelectorAll('img').forEach((img) => applyImageFallback(img));
                }
                return card;
            };
        }

        if (typeof renderer.renderComments === 'function') {
            const originalRenderComments = renderer.renderComments.bind(renderer);
            renderer.renderComments = function patchedRenderComments(comments = []) {
                const html = originalRenderComments(comments);
                return String(html || '').replace(/https?:\/\/ui-avatars\.com\/api\/\?[^"'\s)]+/gi, DEFAULT_AVATAR_URL);
            };
        }
    }

    function patchAppCtor() {
        const AppCtor = globalObject.AdvancedApp || (typeof AdvancedApp !== 'undefined' ? AdvancedApp : null);
        if (!AppCtor || !AppCtor.prototype || AppCtor.prototype.__avatarDefaultsPatched) return;
        AppCtor.prototype.__avatarDefaultsPatched = true;

        const proto = AppCtor.prototype;
        proto.normalizeAvatarUrl = function appNormalizeAvatarUrl(value = '') {
            return normalizeAvatarUrl(value);
        };

        const wrapWithScan = (methodName) => {
            if (typeof proto[methodName] !== 'function') return;
            const mark = `__avatarWrap_${methodName}`;
            if (proto[mark]) return;
            proto[mark] = true;

            const original = proto[methodName];
            proto[methodName] = function wrappedAvatarMethod(...args) {
                const result = original.apply(this, args);
                if (result && typeof result.then === 'function') {
                    return result.finally(() => scanImages(document));
                }
                scanImages(document);
                return result;
            };
        };

        wrapWithScan('updateProfileUI');
        wrapWithScan('loadChats');
        wrapWithScan('loadFeed');
        wrapWithScan('loadStories');
        wrapWithScan('renderLiveFeedList');
        wrapWithScan('renderLiveSessionsStrip');
        wrapWithScan('renderLiveSessionsSheet');
    }

    function bootstrapAvatarDefaults() {
        globalObject.REELGRAM_DEFAULT_AVATAR = DEFAULT_AVATAR_URL;

        patchFirebaseService();
        patchDataServiceCtor();
        patchViewRenderer();
        patchAppCtor();

        scanImages(document);
        observeImages();

        // Retry once after app init and async auth hydration.
        setTimeout(() => {
            patchFirebaseService();
            patchViewRenderer();
            patchAppCtor();
            scanImages(document);
        }, 800);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', bootstrapAvatarDefaults, { once: true });
    } else {
        bootstrapAvatarDefaults();
    }
})(typeof window !== 'undefined' ? window : null);
