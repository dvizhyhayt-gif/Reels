/**
 * Ads integration module.
 * Adds TikTok-like sponsored overlay/CTA to some feed cards.
 */
(function attachAdsModule(globalObject) {
    'use strict';

    if (!globalObject) return;
    const AppCtor = globalObject.AdvancedApp || (typeof AdvancedApp !== 'undefined' ? AdvancedApp : null);
    if (!AppCtor || !AppCtor.prototype) return;

    const proto = AppCtor.prototype;
    if (proto.__adsIntegrationPatched) return;
    proto.__adsIntegrationPatched = true;

    const CAMPAIGNS = [
        {
            id: 'ad-pulse',
            brand: 'Pulse X',
            title: 'Pulse X',
            subtitle: 'Energy for creators',
            cta: 'Learn More',
            url: 'https://example.com/pulsex'
        },
        {
            id: 'ad-lens',
            brand: 'LensGo',
            title: 'LensGo Cam',
            subtitle: 'Ultra-wide mobile lens',
            cta: 'Shop',
            url: 'https://example.com/lensgo'
        },
        {
            id: 'ad-sound',
            brand: 'BeatFlow',
            title: 'BeatFlow Pro',
            subtitle: 'Music toolkit for shorts',
            cta: 'Try Free',
            url: 'https://example.com/beatflow'
        }
    ];

    function canDecorateCard(card) {
        if (!card) return false;
        if (card.dataset.adDecorated === '1') return false;
        if (card.dataset.uid && firebaseService && typeof firebaseService.getCurrentUid === 'function') {
            const currentUid = String(firebaseService.getCurrentUid() || '');
            if (currentUid && String(card.dataset.uid) === currentUid) return false;
        }
        return true;
    }

    proto.ensureFeedAdsInteractionBinding = function ensureFeedAdsInteractionBinding() {
        if (!this.feedContainer || this.feedContainer.dataset.adsBound === '1') return;
        this.feedContainer.dataset.adsBound = '1';

        this.feedContainer.addEventListener('click', (event) => {
            const btn = event.target && event.target.closest ? event.target.closest('.sponsored-cta[data-ad-url]') : null;
            if (!btn) return;
            event.preventDefault();
            event.stopPropagation();

            const url = String(btn.dataset.adUrl || '').trim();
            const adId = String(btn.dataset.adId || '').trim();
            if (url) {
                try {
                    window.open(url, '_blank', 'noopener,noreferrer');
                } catch (_) {}
            }

            if (!this.state) this.state = {};
            if (!this.state.adClicks) this.state.adClicks = {};
            this.state.adClicks[adId] = (parseInt(this.state.adClicks[adId], 10) || 0) + 1;
            AdvancedViewRenderer.showToast('Sponsored', 'info');
        });
    };

    proto.decorateFeedWithSponsoredPosts = function decorateFeedWithSponsoredPosts() {
        if (!this.feedContainer) return;
        if (this.state && this.state.feedSource === 'live') return;

        this.ensureFeedAdsInteractionBinding();

        const cards = Array.from(this.feedContainer.querySelectorAll('.video-item'));
        if (!cards.length) return;

        cards.forEach((card, index) => {
            if (!canDecorateCard(card)) return;

            // Roughly every 6th card.
            if ((index + 1) % 6 !== 0) return;

            const campaign = CAMPAIGNS[Math.floor(index / 6) % CAMPAIGNS.length];
            if (!campaign) return;

            const info = card.querySelector('.video-info');
            if (!info) return;

            const box = document.createElement('div');
            box.className = 'sponsored-box';
            box.innerHTML = `
                <div class="sponsored-chip">Sponsored</div>
                <div class="sponsored-brand">${this.escapeHtml(campaign.title)}</div>
                <div class="sponsored-sub">${this.escapeHtml(campaign.subtitle)}</div>
                <button type="button"
                        class="sponsored-cta"
                        data-ad-id="${this.escapeHtml(campaign.id)}"
                        data-ad-url="${this.escapeHtml(campaign.url)}">
                    ${this.escapeHtml(campaign.cta)}
                </button>
            `;

            info.appendChild(box);
            card.classList.add('sponsored-post');
            card.dataset.adDecorated = '1';
            card.dataset.adId = campaign.id;
        });
    };

    const ORIGINAL_LOAD_FEED = proto.loadFeed;
    if (typeof ORIGINAL_LOAD_FEED === 'function') {
        proto.loadFeed = async function wrappedLoadFeed(...args) {
            const result = await ORIGINAL_LOAD_FEED.apply(this, args);
            try {
                this.decorateFeedWithSponsoredPosts();
            } catch (error) {
                console.warn('[ads] decorate after load failed:', error?.message || error);
            }
            return result;
        };
    }

    const ORIGINAL_RENDER_FEED_VIDEOS = proto.renderFeedVideos;
    if (typeof ORIGINAL_RENDER_FEED_VIDEOS === 'function') {
        proto.renderFeedVideos = function wrappedRenderFeedVideos(...args) {
            const result = ORIGINAL_RENDER_FEED_VIDEOS.apply(this, args);
            try {
                this.decorateFeedWithSponsoredPosts();
            } catch (error) {
                console.warn('[ads] decorate after render failed:', error?.message || error);
            }
            return result;
        };
    }
})(typeof window !== 'undefined' ? window : null);

