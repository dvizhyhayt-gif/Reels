(function attachAdsCabinetModule(globalObject) {
    'use strict';

    if (!globalObject) return;

    const AppCtor = globalObject.AdvancedApp || (typeof AdvancedApp !== 'undefined' ? AdvancedApp : null);
    const FirebaseCtor = globalObject.FirebaseService || (typeof FirebaseService !== 'undefined' ? FirebaseService : null);
    const ViewRenderer = globalObject.AdvancedViewRenderer || (typeof AdvancedViewRenderer !== 'undefined' ? AdvancedViewRenderer : null);
    if (!AppCtor || !AppCtor.prototype) return;

    const proto = AppCtor.prototype;
    if (proto.__adsCabinetPatched) return;
    proto.__adsCabinetPatched = true;

    const LOCAL_ADS_KEY = 'reelgram_ads_cabinet_v1';
    const CAMPAIGN_POOL_TTL = 60 * 1000;

    const FALLBACK_CAMPAIGNS = [
        { id: 'ad-pulse', ownerUid: 'fallback', ownerName: 'reelgram', brand: 'Pulse X', title: 'Pulse X', subtitle: 'Energy for creators', cta: 'Learn More', url: 'https://example.com/pulsex', targetFeed: 'for-you', dailyBudget: 50, status: 'active', impressions: 0, clicks: 0, opens: 0, createdAt: Date.now(), updatedAt: Date.now(), deleted: false },
        { id: 'ad-lens', ownerUid: 'fallback', ownerName: 'reelgram', brand: 'LensGo', title: 'LensGo Cam', subtitle: 'Ultra-wide mobile lens', cta: 'Shop', url: 'https://example.com/lensgo', targetFeed: 'for-you', dailyBudget: 40, status: 'active', impressions: 0, clicks: 0, opens: 0, createdAt: Date.now(), updatedAt: Date.now(), deleted: false },
        { id: 'ad-sound', ownerUid: 'fallback', ownerName: 'reelgram', brand: 'BeatFlow', title: 'BeatFlow Pro', subtitle: 'Music toolkit for shorts', cta: 'Try Free', url: 'https://example.com/beatflow', targetFeed: 'following', dailyBudget: 30, status: 'active', impressions: 0, clicks: 0, opens: 0, createdAt: Date.now(), updatedAt: Date.now(), deleted: false }
    ];

    const safeText = (value, max = 120) => String(value || '').trim().slice(0, Math.max(1, max));
    const safeUrl = (value) => {
        const raw = String(value || '').trim();
        if (!raw) return '';
        if (/^https?:\/\//i.test(raw)) return raw;
        return `https://${raw}`;
    };
    const toInt = (value, fallback = 0) => {
        const parsed = parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : fallback;
    };
    const nowMs = () => Date.now();
    const dayKey = (ts) => {
        try { return new Date(ts).toISOString().slice(0, 10); } catch (_) { return new Date().toISOString().slice(0, 10); }
    };

    function normalizeCampaignShape(row = {}) {
        const impressions = Math.max(0, toInt(row.impressions, 0));
        const clicks = Math.max(0, toInt(row.clicks, 0));
        const opens = Math.max(0, toInt(row.opens, 0));
        return {
            id: row.id ? String(row.id) : '',
            ownerUid: row.ownerUid ? String(row.ownerUid) : '',
            ownerName: safeText(row.ownerName || 'user', 80),
            brand: safeText(row.brand || row.title || 'Brand', 60),
            title: safeText(row.title || 'Campaign', 80),
            subtitle: safeText(row.subtitle || '', 120),
            cta: safeText(row.cta || 'Open', 24),
            url: safeUrl(row.url),
            targetFeed: ['for-you', 'following', 'all'].includes(String(row.targetFeed || 'for-you')) ? String(row.targetFeed || 'for-you') : 'for-you',
            dailyBudget: Math.max(0, toInt(row.dailyBudget, 0)),
            status: ['draft', 'active', 'paused', 'archived'].includes(String(row.status || 'draft')) ? String(row.status || 'draft') : 'draft',
            impressions,
            clicks,
            opens,
            ctr: impressions > 0 ? (clicks / impressions) : 0,
            createdAt: Math.max(0, toInt(row.createdAt, nowMs())),
            updatedAt: Math.max(0, toInt(row.updatedAt, nowMs())),
            deleted: row.deleted === true,
            deletedAt: row.deletedAt ? toInt(row.deletedAt, 0) : 0
        };
    }

    const formatCompactNumber = (value) => {
        const num = Math.max(0, Number(value) || 0);
        if (ViewRenderer && typeof ViewRenderer.formatNumber === 'function') return ViewRenderer.formatNumber(num);
        return String(Math.round(num));
    };

    function canDecorateCard(card) {
        if (!card || card.dataset.adDecorated === '1') return false;
        const currentUid = (typeof firebaseService !== 'undefined' && firebaseService && typeof firebaseService.getCurrentUid === 'function')
            ? String(firebaseService.getCurrentUid() || '')
            : '';
        if (card.dataset.uid && currentUid && String(card.dataset.uid) === currentUid) return false;
        return true;
    }

    if (FirebaseCtor && FirebaseCtor.prototype && !FirebaseCtor.prototype.__adsCabinetServicePatched) {
        const firebaseProto = FirebaseCtor.prototype;
        firebaseProto.__adsCabinetServicePatched = true;

        firebaseProto.normalizeAdCampaignRecord = function normalizeAdCampaignRecord(data = {}, id = '') {
            return normalizeCampaignShape({ id, ...data });
        };

        firebaseProto.createAdCampaign = async function createAdCampaign(payload = {}) {
            const ownerUid = this.getCurrentUid ? this.getCurrentUid() : null;
            if (!ownerUid) throw new Error('Authorization required');
            const profile = await this.getUserProfile(ownerUid);
            const now = nowMs();
            const campaign = normalizeCampaignShape({
                ownerUid: String(ownerUid),
                ownerName: profile && profile.name ? profile.name : 'user',
                brand: safeText(payload.brand, 60),
                title: safeText(payload.title, 80),
                subtitle: safeText(payload.subtitle, 120),
                cta: safeText(payload.cta || 'Open', 24),
                url: safeUrl(payload.url),
                targetFeed: safeText(payload.targetFeed || 'for-you', 20),
                dailyBudget: Math.max(0, toInt(payload.dailyBudget, 0)),
                status: safeText(payload.status || 'active', 20),
                impressions: 0,
                clicks: 0,
                opens: 0,
                createdAt: now,
                updatedAt: now,
                deleted: false,
                deletedAt: 0
            });
            if (!campaign.brand || !campaign.title || !campaign.url) throw new Error('Fill brand, title and url');
            const ref = await this.db.collection('adCampaigns').add(campaign);
            return this.normalizeAdCampaignRecord(campaign, ref.id);
        };

        firebaseProto.getOwnerAdCampaigns = async function getOwnerAdCampaigns(ownerUid = '', limit = 120) {
            const uid = String(ownerUid || this.getCurrentUid() || '').trim();
            if (!uid) return [];
            const snap = await this.db.collection('adCampaigns').where('ownerUid', '==', uid).limit(Math.max(1, Math.min(toInt(limit, 120), 400))).get();
            return snap.docs.map((doc) => this.normalizeAdCampaignRecord(doc.data() || {}, doc.id)).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
        };

        firebaseProto.getActiveAdCampaigns = async function getActiveAdCampaigns(limit = 30) {
            const safeLimit = Math.max(1, Math.min(toInt(limit, 30), 100));
            const snap = await this.db.collection('adCampaigns').where('status', '==', 'active').limit(safeLimit * 2).get();
            return snap.docs
                .map((doc) => this.normalizeAdCampaignRecord(doc.data() || {}, doc.id))
                .filter((row) => row.status === 'active' && row.deleted !== true && !!row.url)
                .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
                .slice(0, safeLimit);
        };

        firebaseProto.updateAdCampaign = async function updateAdCampaign(campaignId, patch = {}) {
            const id = String(campaignId || '').trim();
            if (!id) throw new Error('Campaign not found');
            const currentUid = this.getCurrentUid ? this.getCurrentUid() : null;
            if (!currentUid) throw new Error('Authorization required');

            const ref = this.db.collection('adCampaigns').doc(id);
            const snapshot = await ref.get();
            if (!snapshot.exists) throw new Error('Campaign not found');

            const existing = this.normalizeAdCampaignRecord(snapshot.data() || {}, snapshot.id);
            const canManage = String(existing.ownerUid || '') === String(currentUid)
                || (typeof this.isCurrentUserAdmin === 'function' && this.isCurrentUserAdmin());
            if (!canManage) throw new Error('No rights to update campaign');

            const safePatch = { updatedAt: nowMs() };
            if (patch.brand != null) safePatch.brand = safeText(patch.brand, 60);
            if (patch.title != null) safePatch.title = safeText(patch.title, 80);
            if (patch.subtitle != null) safePatch.subtitle = safeText(patch.subtitle, 120);
            if (patch.cta != null) safePatch.cta = safeText(patch.cta, 24);
            if (patch.url != null) safePatch.url = safeUrl(patch.url);
            if (patch.targetFeed != null) {
                const target = safeText(patch.targetFeed, 20);
                safePatch.targetFeed = ['for-you', 'following', 'all'].includes(target) ? target : 'for-you';
            }
            if (patch.dailyBudget != null) safePatch.dailyBudget = Math.max(0, toInt(patch.dailyBudget, 0));
            if (patch.status != null) {
                const status = safeText(patch.status, 20);
                safePatch.status = ['draft', 'active', 'paused', 'archived'].includes(status) ? status : existing.status;
            }
            if (patch.deleted === true) {
                safePatch.deleted = true;
                safePatch.deletedAt = nowMs();
            }

            await ref.set(safePatch, { merge: true });
            return this.normalizeAdCampaignRecord({ ...existing, ...safePatch }, id);
        };

        firebaseProto.deleteAdCampaign = async function deleteAdCampaign(campaignId) {
            return this.updateAdCampaign(campaignId, { status: 'archived', deleted: true });
        };
        firebaseProto.recordAdEvent = async function recordAdEvent(campaignId, type = 'impression', meta = {}) {
            const id = String(campaignId || '').trim();
            if (!id) return false;

            const eventType = ['impression', 'click', 'open'].includes(String(type || '')) ? String(type) : 'impression';
            let ownerUid = safeText(meta.ownerUid || '', 80);
            let campaign = null;
            if (!ownerUid) {
                const campaignSnapshot = await this.db.collection('adCampaigns').doc(id).get();
                if (!campaignSnapshot.exists) return false;
                campaign = this.normalizeAdCampaignRecord(campaignSnapshot.data() || {}, campaignSnapshot.id);
                ownerUid = campaign.ownerUid;
            }

            const now = nowMs();
            const eventPayload = {
                campaignId: id,
                ownerUid: ownerUid || null,
                type: eventType,
                viewerUid: this.getCurrentUid ? (this.getCurrentUid() || null) : null,
                feedSource: safeText(meta.feedSource || '', 20),
                videoId: safeText(meta.videoId || '', 80),
                dayKey: dayKey(now),
                timestamp: now,
                createdAt: now
            };

            await this.db.collection('adEvents').add(eventPayload);

            const increment = (typeof firebase !== 'undefined' && firebase && firebase.firestore && firebase.firestore.FieldValue && typeof firebase.firestore.FieldValue.increment === 'function')
                ? firebase.firestore.FieldValue.increment
                : null;

            const patch = { updatedAt: now };
            if (increment) {
                if (eventType === 'impression') patch.impressions = increment(1);
                if (eventType === 'click') patch.clicks = increment(1);
                if (eventType === 'open') patch.opens = increment(1);
                await this.db.collection('adCampaigns').doc(id).set(patch, { merge: true });
            } else if (campaign) {
                patch.impressions = campaign.impressions + (eventType === 'impression' ? 1 : 0);
                patch.clicks = campaign.clicks + (eventType === 'click' ? 1 : 0);
                patch.opens = campaign.opens + (eventType === 'open' ? 1 : 0);
                await this.db.collection('adCampaigns').doc(id).set(patch, { merge: true });
            }

            return true;
        };

        firebaseProto.getAdCampaignAnalytics = async function getAdCampaignAnalytics({ ownerUid = '', days = 14 } = {}) {
            const uid = String(ownerUid || this.getCurrentUid() || '').trim();
            if (!uid) return { days: 14, from: nowMs(), to: nowMs(), totals: { campaigns: 0, impressions: 0, clicks: 0, opens: 0, ctr: 0 }, campaigns: [] };

            const safeDays = Math.max(1, Math.min(toInt(days, 14), 90));
            const sinceTs = nowMs() - (safeDays * 24 * 60 * 60 * 1000);
            const campaigns = await this.getOwnerAdCampaigns(uid, 300);

            const byId = new Map();
            campaigns.forEach((item) => byId.set(item.id, { ...item, daily: {} }));

            const eventSnap = await this.db.collection('adEvents').where('ownerUid', '==', uid).limit(3000).get();
            eventSnap.forEach((doc) => {
                const row = doc.data() || {};
                const ts = toInt(row.timestamp, 0);
                if (!ts || ts < sinceTs) return;
                const campaignId = String(row.campaignId || '').trim();
                if (!campaignId || !byId.has(campaignId)) return;

                const target = byId.get(campaignId);
                const key = safeText(row.dayKey || dayKey(ts), 16);
                if (!target.daily[key]) target.daily[key] = { impressions: 0, clicks: 0, opens: 0 };

                if (row.type === 'impression') target.daily[key].impressions += 1;
                if (row.type === 'click') target.daily[key].clicks += 1;
                if (row.type === 'open') target.daily[key].opens += 1;
            });

            const list = Array.from(byId.values()).map((item) => {
                const daily = Object.keys(item.daily).sort().map((key) => ({ dayKey: key, ...item.daily[key] }));
                return { ...item, ctr: item.impressions > 0 ? (item.clicks / item.impressions) : 0, daily };
            });

            const totals = list.reduce((acc, item) => {
                acc.campaigns += 1;
                acc.impressions += Math.max(0, toInt(item.impressions, 0));
                acc.clicks += Math.max(0, toInt(item.clicks, 0));
                acc.opens += Math.max(0, toInt(item.opens, 0));
                return acc;
            }, { campaigns: 0, impressions: 0, clicks: 0, opens: 0, ctr: 0 });
            totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) : 0;

            return { days: safeDays, from: sinceTs, to: nowMs(), totals, campaigns: list };
        };
    }

    proto.ensureAdsCabinetScaffold = function ensureAdsCabinetScaffold() {
        const menuDropdown = document.getElementById('menu-dropdown');
        if (menuDropdown && !document.getElementById('ads-cabinet-menu')) {
            const item = document.createElement('div');
            item.className = 'menu-item';
            item.id = 'ads-cabinet-menu';
            item.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M3 5h18v2H3V5zm2 4h14v10H5V9zm3 2v6h2v-6H8zm4 1v5h2v-5h-2z"></path></svg><span>Ads Cabinet</span>';
            const logoutItem = document.getElementById('logout-menu');
            if (logoutItem && logoutItem.parentNode === menuDropdown) menuDropdown.insertBefore(item, logoutItem);
            else menuDropdown.appendChild(item);
        }

        const appRoot = document.getElementById('app');
        if (appRoot && !document.getElementById('ads-cabinet-view')) {
            const view = document.createElement('div');
            view.id = 'ads-cabinet-view';
            view.className = 'view';
            view.innerHTML = `
                <div class="ads-cabinet-container">
                    <div class="ads-cabinet-header">
                        <button class="ads-cabinet-back" id="ads-cabinet-back-btn" type="button">Profile</button>
                        <h3>Ads Cabinet</h3>
                        <button class="ads-cabinet-refresh" id="ads-cabinet-refresh-btn" type="button">Refresh</button>
                    </div>
                    <section class="ads-cabinet-card">
                        <h4>Create Campaign</h4>
                        <div class="ads-form-grid">
                            <label>Brand<input id="ads-brand-input" type="text" maxlength="60" placeholder="Brand name"></label>
                            <label>Title<input id="ads-title-input" type="text" maxlength="80" placeholder="Campaign title"></label>
                            <label>Subtitle<input id="ads-subtitle-input" type="text" maxlength="120" placeholder="Optional subtitle"></label>
                            <label>CTA<input id="ads-cta-input" type="text" maxlength="24" placeholder="Open"></label>
                            <label>URL<input id="ads-url-input" type="text" maxlength="300" placeholder="https://example.com"></label>
                            <label>Daily Budget<input id="ads-daily-budget-input" type="number" min="0" max="100000" step="1" value="25"></label>
                            <label>Target Feed<select id="ads-target-feed-input"><option value="for-you">For You</option><option value="following">Following</option><option value="all">All</option></select></label>
                        </div>
                        <button class="primary-btn" id="ads-cabinet-create-btn" type="button">Create Campaign</button>
                    </section>
                    <section class="ads-cabinet-card"><div class="ads-card-head"><h4>Your Campaigns</h4></div><div class="ads-campaign-list" id="ads-campaign-list"></div></section>
                    <section class="ads-cabinet-card"><div class="ads-card-head"><h4>Analytics (14 days)</h4></div><div class="ads-analytics-summary" id="ads-analytics-summary"></div><div class="ads-analytics-list" id="ads-analytics-list"></div></section>
                </div>
            `;
            const adminView = document.getElementById('admin-view');
            if (adminView && adminView.parentNode === appRoot) appRoot.insertBefore(view, adminView);
            else appRoot.appendChild(view);
        }

        this.cacheAdsCabinetElements();
    };

    proto.cacheAdsCabinetElements = function cacheAdsCabinetElements() {
        this.adsCabinetMenu = document.getElementById('ads-cabinet-menu');
        this.adsCabinetView = document.getElementById('ads-cabinet-view');
        this.adsCabinetBackBtn = document.getElementById('ads-cabinet-back-btn');
        this.adsCabinetRefreshBtn = document.getElementById('ads-cabinet-refresh-btn');
        this.adsCabinetCreateBtn = document.getElementById('ads-cabinet-create-btn');
        this.adsBrandInput = document.getElementById('ads-brand-input');
        this.adsTitleInput = document.getElementById('ads-title-input');
        this.adsSubtitleInput = document.getElementById('ads-subtitle-input');
        this.adsCtaInput = document.getElementById('ads-cta-input');
        this.adsUrlInput = document.getElementById('ads-url-input');
        this.adsBudgetInput = document.getElementById('ads-daily-budget-input');
        this.adsTargetFeedInput = document.getElementById('ads-target-feed-input');
        this.adsCampaignList = document.getElementById('ads-campaign-list');
        this.adsAnalyticsSummary = document.getElementById('ads-analytics-summary');
        this.adsAnalyticsList = document.getElementById('ads-analytics-list');
    };

    proto.updateAdsCabinetMenuVisibility = function updateAdsCabinetMenuVisibility() {
        this.cacheAdsCabinetElements();
        const user = this.dataService && typeof this.dataService.getCurrentUser === 'function' ? this.dataService.getCurrentUser() : null;
        if (this.adsCabinetMenu) this.adsCabinetMenu.style.display = user ? 'flex' : 'none';
        if (!user && this.state && this.state.activeViewId === 'ads-cabinet-view') this.navigateTo('auth-view');
    };

    proto.getLocalAdsStore = function getLocalAdsStore() {
        if (!this.state) this.state = {};
        if (this.state.localAdsStore) return this.state.localAdsStore;
        let parsed = null;
        try {
            const raw = localStorage.getItem(LOCAL_ADS_KEY);
            if (raw) parsed = JSON.parse(raw);
        } catch (_) {}
        this.state.localAdsStore = {
            campaigns: Array.isArray(parsed && parsed.campaigns) ? parsed.campaigns.map((item) => normalizeCampaignShape(item)) : [],
            events: Array.isArray(parsed && parsed.events) ? parsed.events : []
        };
        return this.state.localAdsStore;
    };

    proto.saveLocalAdsStore = function saveLocalAdsStore() {
        try { localStorage.setItem(LOCAL_ADS_KEY, JSON.stringify(this.getLocalAdsStore())); } catch (_) {}
    };

    proto.getAdsOwnerKey = function getAdsOwnerKey() {
        const user = this.dataService && typeof this.dataService.getCurrentUser === 'function' ? this.dataService.getCurrentUser() : null;
        if (!user) return '';
        return String(user.uid || user.name || '').trim();
    };

    proto.localCreateCampaign = function localCreateCampaign(payload = {}) {
        const ownerKey = this.getAdsOwnerKey();
        if (!ownerKey) throw new Error('Authorization required');
        const user = this.dataService.getCurrentUser();
        const campaign = normalizeCampaignShape({
            id: `local_${nowMs().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
            ownerUid: ownerKey,
            ownerName: user && user.name ? user.name : 'user',
            brand: payload.brand,
            title: payload.title,
            subtitle: payload.subtitle,
            cta: payload.cta,
            url: payload.url,
            targetFeed: payload.targetFeed,
            dailyBudget: payload.dailyBudget,
            status: payload.status || 'active',
            impressions: 0,
            clicks: 0,
            opens: 0,
            createdAt: nowMs(),
            updatedAt: nowMs(),
            deleted: false
        });
        const store = this.getLocalAdsStore();
        store.campaigns.unshift(campaign);
        this.saveLocalAdsStore();
        return campaign;
    };

    proto.localGetOwnerCampaigns = function localGetOwnerCampaigns(ownerKey = '') {
        const key = String(ownerKey || this.getAdsOwnerKey() || '').trim();
        if (!key) return [];
        const store = this.getLocalAdsStore();
        return store.campaigns
            .filter((item) => String(item.ownerUid || '') === key)
            .map((item) => normalizeCampaignShape(item))
            .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    };

    proto.localUpdateCampaign = function localUpdateCampaign(campaignId, patch = {}) {
        const id = String(campaignId || '').trim();
        if (!id) throw new Error('Campaign not found');
        const ownerKey = this.getAdsOwnerKey();
        const store = this.getLocalAdsStore();
        const index = store.campaigns.findIndex((item) => String(item.id || '') === id);
        if (index < 0) throw new Error('Campaign not found');
        const current = normalizeCampaignShape(store.campaigns[index]);
        if (String(current.ownerUid || '') !== ownerKey) throw new Error('No rights to update campaign');
        store.campaigns[index] = normalizeCampaignShape({ ...current, ...patch, updatedAt: nowMs() });
        this.saveLocalAdsStore();
        return store.campaigns[index];
    };

    proto.localDeleteCampaign = function localDeleteCampaign(campaignId) {
        return this.localUpdateCampaign(campaignId, { status: 'archived', deleted: true, deletedAt: nowMs() });
    };

    proto.localRecordAdEvent = function localRecordAdEvent(campaignId, type = 'impression', meta = {}) {
        const id = String(campaignId || '').trim();
        if (!id) return false;
        const eventType = ['impression', 'click', 'open'].includes(String(type || '')) ? String(type) : 'impression';
        const store = this.getLocalAdsStore();
        store.events.push({
            id: `evt_${nowMs().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
            campaignId: id,
            ownerUid: safeText(meta.ownerUid || '', 80),
            type: eventType,
            dayKey: dayKey(nowMs()),
            timestamp: nowMs(),
            feedSource: safeText(meta.feedSource || '', 20),
            videoId: safeText(meta.videoId || '', 80)
        });
        const idx = store.campaigns.findIndex((item) => String(item.id || '') === id);
        if (idx >= 0) {
            const row = normalizeCampaignShape(store.campaigns[idx]);
            if (eventType === 'impression') row.impressions += 1;
            if (eventType === 'click') row.clicks += 1;
            if (eventType === 'open') row.opens += 1;
            row.updatedAt = nowMs();
            store.campaigns[idx] = row;
        }
        this.saveLocalAdsStore();
        return true;
    };

    proto.localGetAnalytics = function localGetAnalytics(days = 14) {
        const ownerKey = this.getAdsOwnerKey();
        const safeDays = Math.max(1, Math.min(toInt(days, 14), 90));
        const sinceTs = nowMs() - (safeDays * 24 * 60 * 60 * 1000);
        const campaigns = this.localGetOwnerCampaigns(ownerKey);
        const byId = new Map();
        campaigns.forEach((item) => byId.set(item.id, { ...item, daily: {} }));

        const store = this.getLocalAdsStore();
        store.events.forEach((event) => {
            if (!event) return;
            const campaignId = String(event.campaignId || '').trim();
            const ts = toInt(event.timestamp, 0);
            if (!campaignId || !byId.has(campaignId) || ts < sinceTs) return;
            const target = byId.get(campaignId);
            const key = safeText(event.dayKey || dayKey(ts), 16);
            if (!target.daily[key]) target.daily[key] = { impressions: 0, clicks: 0, opens: 0 };
            if (event.type === 'impression') target.daily[key].impressions += 1;
            if (event.type === 'click') target.daily[key].clicks += 1;
            if (event.type === 'open') target.daily[key].opens += 1;
        });

        const list = Array.from(byId.values()).map((item) => ({
            ...item,
            ctr: item.impressions > 0 ? (item.clicks / item.impressions) : 0,
            daily: Object.keys(item.daily).sort().map((key) => ({ dayKey: key, ...item.daily[key] }))
        }));

        const totals = list.reduce((acc, item) => {
            acc.campaigns += 1;
            acc.impressions += Math.max(0, toInt(item.impressions, 0));
            acc.clicks += Math.max(0, toInt(item.clicks, 0));
            acc.opens += Math.max(0, toInt(item.opens, 0));
            return acc;
        }, { campaigns: 0, impressions: 0, clicks: 0, opens: 0, ctr: 0 });
        totals.ctr = totals.impressions > 0 ? (totals.clicks / totals.impressions) : 0;

        return { days: safeDays, from: sinceTs, to: nowMs(), totals, campaigns: list };
    };

    proto.collectCampaignDraftFromForm = function collectCampaignDraftFromForm() {
        return {
            brand: safeText(this.adsBrandInput ? this.adsBrandInput.value : '', 60),
            title: safeText(this.adsTitleInput ? this.adsTitleInput.value : '', 80),
            subtitle: safeText(this.adsSubtitleInput ? this.adsSubtitleInput.value : '', 120),
            cta: safeText(this.adsCtaInput ? this.adsCtaInput.value : 'Open', 24) || 'Open',
            url: safeUrl(this.adsUrlInput ? this.adsUrlInput.value : ''),
            dailyBudget: Math.max(0, toInt(this.adsBudgetInput ? this.adsBudgetInput.value : 0, 0)),
            targetFeed: safeText(this.adsTargetFeedInput ? this.adsTargetFeedInput.value : 'for-you', 20) || 'for-you',
            status: 'active'
        };
    };

    proto.createCampaignFromCabinet = async function createCampaignFromCabinet() {
        const draft = this.collectCampaignDraftFromForm();
        if (!draft.brand || !draft.title || !draft.url) {
            ViewRenderer.showToast('Fill brand, title and url', 'warning');
            return;
        }

        const btn = this.adsCabinetCreateBtn;
        const prevText = btn ? btn.textContent : '';
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Creating...';
        }

        try {
            if (typeof firebaseService !== 'undefined' && firebaseService && typeof firebaseService.isInitialized === 'function' && firebaseService.isInitialized() && typeof firebaseService.createAdCampaign === 'function') {
                await firebaseService.createAdCampaign(draft);
            } else {
                this.localCreateCampaign(draft);
            }

            if (this.adsSubtitleInput) this.adsSubtitleInput.value = '';
            if (this.adsUrlInput) this.adsUrlInput.value = '';

            await this.loadAdsCabinetData({ showToast: false });
            await this.refreshAdCampaignPool({ silent: true, force: true });
            ViewRenderer.showToast('Campaign created', 'success');
        } catch (error) {
            console.error('[ads-cabinet] create failed:', error);
            ViewRenderer.showToast(error && error.message ? error.message : 'Failed to create campaign', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = prevText || 'Create Campaign';
            }
        }
    };

    proto.fetchOwnerCampaigns = async function fetchOwnerCampaigns() {
        const ownerKey = this.getAdsOwnerKey();
        if (!ownerKey) return [];
        if (typeof firebaseService !== 'undefined' && firebaseService && typeof firebaseService.isInitialized === 'function' && firebaseService.isInitialized() && typeof firebaseService.getOwnerAdCampaigns === 'function') {
            return firebaseService.getOwnerAdCampaigns(ownerKey, 300);
        }
        return this.localGetOwnerCampaigns(ownerKey);
    };

    proto.fetchCampaignAnalytics = async function fetchCampaignAnalytics(days = 14) {
        const ownerKey = this.getAdsOwnerKey();
        if (!ownerKey) return { days, from: nowMs(), to: nowMs(), totals: { campaigns: 0, impressions: 0, clicks: 0, opens: 0, ctr: 0 }, campaigns: [] };
        if (typeof firebaseService !== 'undefined' && firebaseService && typeof firebaseService.isInitialized === 'function' && firebaseService.isInitialized() && typeof firebaseService.getAdCampaignAnalytics === 'function') {
            return firebaseService.getAdCampaignAnalytics({ ownerUid: ownerKey, days });
        }
        return this.localGetAnalytics(days);
    };

    proto.renderAdsCampaignList = function renderAdsCampaignList(campaigns = []) {
        if (!this.adsCampaignList) return;
        const list = Array.isArray(campaigns) ? campaigns : [];
        if (!list.length) {
            this.adsCampaignList.innerHTML = '<div class="ads-empty">No campaigns yet.</div>';
            return;
        }

        this.adsCampaignList.innerHTML = '';
        list.forEach((item) => {
            const campaign = normalizeCampaignShape(item);
            if (campaign.deleted === true) return;
            const ctr = `${(campaign.ctr * 100).toFixed(2)}%`;
            const row = document.createElement('div');
            row.className = 'ads-campaign-row';
            row.dataset.campaignId = campaign.id;
            row.innerHTML = `
                <div class="ads-campaign-main">
                    <div class="ads-campaign-title">${this.escapeHtml(campaign.title)}</div>
                    <div class="ads-campaign-sub">${this.escapeHtml(campaign.brand)} | ${this.escapeHtml(campaign.status)} | ${this.escapeHtml(campaign.targetFeed)}</div>
                    <div class="ads-campaign-metrics">Impr ${formatCompactNumber(campaign.impressions)} | Click ${formatCompactNumber(campaign.clicks)} | Open ${formatCompactNumber(campaign.opens)} | CTR ${ctr}</div>
                </div>
                <div class="ads-campaign-actions">
                    <button type="button" data-action="toggle-status">${campaign.status === 'active' ? 'Pause' : 'Activate'}</button>
                    <button type="button" class="danger" data-action="archive">Archive</button>
                </div>
            `;
            this.adsCampaignList.appendChild(row);
        });
    };

    proto.renderAdsAnalytics = function renderAdsAnalytics(payload = null) {
        if (!this.adsAnalyticsSummary || !this.adsAnalyticsList) return;

        const analytics = payload || { totals: { campaigns: 0, impressions: 0, clicks: 0, opens: 0, ctr: 0 }, campaigns: [] };
        const totals = analytics.totals || { campaigns: 0, impressions: 0, clicks: 0, opens: 0, ctr: 0 };
        this.adsAnalyticsSummary.innerHTML = `
            <div class="ads-metric-card"><span>Campaigns</span><strong>${formatCompactNumber(totals.campaigns)}</strong></div>
            <div class="ads-metric-card"><span>Impressions</span><strong>${formatCompactNumber(totals.impressions)}</strong></div>
            <div class="ads-metric-card"><span>Clicks</span><strong>${formatCompactNumber(totals.clicks)}</strong></div>
            <div class="ads-metric-card"><span>Opens</span><strong>${formatCompactNumber(totals.opens)}</strong></div>
            <div class="ads-metric-card"><span>CTR</span><strong>${((totals.ctr || 0) * 100).toFixed(2)}%</strong></div>
        `;

        const list = Array.isArray(analytics.campaigns) ? analytics.campaigns : [];
        if (!list.length) {
            this.adsAnalyticsList.innerHTML = '<div class="ads-empty">No analytics data yet.</div>';
            return;
        }

        this.adsAnalyticsList.innerHTML = list.map((item) => `
            <div class="ads-analytics-row">
                <div class="ads-analytics-title">${this.escapeHtml(item.title || 'Campaign')}</div>
                <div class="ads-analytics-line">Impr ${formatCompactNumber(item.impressions)} | Click ${formatCompactNumber(item.clicks)} | Open ${formatCompactNumber(item.opens)} | CTR ${(((item.ctr || 0) * 100)).toFixed(2)}%</div>
            </div>
        `).join('');
    };

    proto.loadAdsCabinetData = async function loadAdsCabinetData({ showToast = false } = {}) {
        this.cacheAdsCabinetElements();
        const user = this.dataService && typeof this.dataService.getCurrentUser === 'function' ? this.dataService.getCurrentUser() : null;
        if (!user) {
            if (this.adsCampaignList) this.adsCampaignList.innerHTML = '<div class="ads-empty">Authorization required.</div>';
            if (this.adsAnalyticsSummary) this.adsAnalyticsSummary.innerHTML = '';
            if (this.adsAnalyticsList) this.adsAnalyticsList.innerHTML = '';
            return;
        }

        if (this.adsCampaignList) this.adsCampaignList.innerHTML = '<div class="ads-empty">Loading campaigns...</div>';
        if (this.adsAnalyticsList) this.adsAnalyticsList.innerHTML = '<div class="ads-empty">Loading analytics...</div>';

        try {
            const [campaigns, analytics] = await Promise.all([this.fetchOwnerCampaigns(), this.fetchCampaignAnalytics(14)]);
            this.state.adsCabinetCampaigns = (Array.isArray(campaigns) ? campaigns : []).map((item) => normalizeCampaignShape(item));
            this.renderAdsCampaignList(this.state.adsCabinetCampaigns);
            this.renderAdsAnalytics(analytics);
            if (showToast) ViewRenderer.showToast(`Campaigns loaded: ${this.state.adsCabinetCampaigns.length}`, 'success');
        } catch (error) {
            console.error('[ads-cabinet] load failed:', error);
            if (this.adsCampaignList) this.adsCampaignList.innerHTML = '<div class="ads-empty">Failed to load campaigns.</div>';
            if (this.adsAnalyticsList) this.adsAnalyticsList.innerHTML = '<div class="ads-empty">Failed to load analytics.</div>';
            if (showToast) ViewRenderer.showToast(error && error.message ? error.message : 'Ads cabinet load error', 'error');
        }
    };

    proto.toggleCampaignStatusFromCabinet = async function toggleCampaignStatusFromCabinet(campaignId) {
        const id = String(campaignId || '').trim();
        if (!id) return;
        const campaigns = Array.isArray(this.state && this.state.adsCabinetCampaigns) ? this.state.adsCabinetCampaigns : [];
        const target = campaigns.find((item) => String(item.id || '') === id);
        if (!target) return;
        const nextStatus = target.status === 'active' ? 'paused' : 'active';

        try {
            if (typeof firebaseService !== 'undefined' && firebaseService && typeof firebaseService.isInitialized === 'function' && firebaseService.isInitialized() && typeof firebaseService.updateAdCampaign === 'function') {
                await firebaseService.updateAdCampaign(id, { status: nextStatus });
            } else {
                this.localUpdateCampaign(id, { status: nextStatus });
            }
            await this.loadAdsCabinetData({ showToast: false });
            await this.refreshAdCampaignPool({ silent: true, force: true });
            ViewRenderer.showToast(`Campaign ${nextStatus}`, 'success');
        } catch (error) {
            console.error('[ads-cabinet] toggle failed:', error);
            ViewRenderer.showToast(error && error.message ? error.message : 'Failed to change campaign status', 'error');
        }
    };

    proto.archiveCampaignFromCabinet = async function archiveCampaignFromCabinet(campaignId) {
        const id = String(campaignId || '').trim();
        if (!id) return;

        try {
            if (typeof firebaseService !== 'undefined' && firebaseService && typeof firebaseService.isInitialized === 'function' && firebaseService.isInitialized() && typeof firebaseService.deleteAdCampaign === 'function') {
                await firebaseService.deleteAdCampaign(id);
            } else {
                this.localDeleteCampaign(id);
            }
            await this.loadAdsCabinetData({ showToast: false });
            await this.refreshAdCampaignPool({ silent: true, force: true });
            ViewRenderer.showToast('Campaign archived', 'success');
        } catch (error) {
            console.error('[ads-cabinet] archive failed:', error);
            ViewRenderer.showToast(error && error.message ? error.message : 'Failed to archive campaign', 'error');
        }
    };

    proto.setupAdsCabinetEvents = function setupAdsCabinetEvents() {
        this.cacheAdsCabinetElements();

        if (this.adsCabinetMenu && this.adsCabinetMenu.dataset.bound !== '1') {
            this.adsCabinetMenu.dataset.bound = '1';
            this.adsCabinetMenu.addEventListener('click', () => {
                const user = this.dataService && typeof this.dataService.getCurrentUser === 'function' ? this.dataService.getCurrentUser() : null;
                if (!user) {
                    this.navigateTo('auth-view');
                    return;
                }

                if (this.hamburgerBtn) this.hamburgerBtn.classList.remove('active');
                if (this.menuDropdown) this.menuDropdown.classList.remove('active');
                this.navigateTo('ads-cabinet-view');
            });
        }

        if (this.adsCabinetBackBtn && this.adsCabinetBackBtn.dataset.bound !== '1') {
            this.adsCabinetBackBtn.dataset.bound = '1';
            this.adsCabinetBackBtn.addEventListener('click', () => this.navigateTo('profile-view'));
        }

        if (this.adsCabinetRefreshBtn && this.adsCabinetRefreshBtn.dataset.bound !== '1') {
            this.adsCabinetRefreshBtn.dataset.bound = '1';
            this.adsCabinetRefreshBtn.addEventListener('click', async () => {
                await this.loadAdsCabinetData({ showToast: true });
            });
        }

        if (this.adsCabinetCreateBtn && this.adsCabinetCreateBtn.dataset.bound !== '1') {
            this.adsCabinetCreateBtn.dataset.bound = '1';
            this.adsCabinetCreateBtn.addEventListener('click', async () => {
                await this.createCampaignFromCabinet();
            });
        }

        if (this.adsCampaignList && this.adsCampaignList.dataset.bound !== '1') {
            this.adsCampaignList.dataset.bound = '1';
            this.adsCampaignList.addEventListener('click', async (event) => {
                const button = event.target && event.target.closest ? event.target.closest('button[data-action]') : null;
                if (!button) return;

                const row = button.closest('.ads-campaign-row');
                const campaignId = row ? String(row.dataset.campaignId || '') : '';
                if (!campaignId) return;

                const action = String(button.dataset.action || '');
                if (action === 'toggle-status') {
                    await this.toggleCampaignStatusFromCabinet(campaignId);
                } else if (action === 'archive') {
                    await this.archiveCampaignFromCabinet(campaignId);
                }
            });
        }
    };

    proto.refreshAdCampaignPool = async function refreshAdCampaignPool({ silent = true, force = false } = {}) {
        if (!this.state) this.state = {};
        const age = nowMs() - toInt(this.state.adCampaignPoolFetchedAt, 0);
        if (!force && age >= 0 && age < CAMPAIGN_POOL_TTL && Array.isArray(this.state.adCampaignPool) && this.state.adCampaignPool.length) {
            return this.state.adCampaignPool;
        }

        try {
            let pool = [];
            if (typeof firebaseService !== 'undefined' && firebaseService && typeof firebaseService.isInitialized === 'function' && firebaseService.isInitialized() && typeof firebaseService.getActiveAdCampaigns === 'function') {
                pool = await firebaseService.getActiveAdCampaigns(40);
            } else {
                const ownerCampaigns = this.localGetOwnerCampaigns(this.getAdsOwnerKey());
                pool = ownerCampaigns.filter((item) => item.status === 'active' && item.deleted !== true);
            }

            if (!Array.isArray(pool) || !pool.length) pool = FALLBACK_CAMPAIGNS.map((item) => normalizeCampaignShape(item));
            this.state.adCampaignPool = pool.map((item) => normalizeCampaignShape(item));
            this.state.adCampaignPoolFetchedAt = nowMs();
            return this.state.adCampaignPool;
        } catch (error) {
            console.warn('[ads] campaign pool refresh failed:', error && error.message ? error.message : error);
            this.state.adCampaignPool = FALLBACK_CAMPAIGNS.map((item) => normalizeCampaignShape(item));
            this.state.adCampaignPoolFetchedAt = nowMs();
            if (!silent) ViewRenderer.showToast('Campaign pool fallback enabled', 'warning');
            return this.state.adCampaignPool;
        }
    };

    proto.pickCampaignForCard = function pickCampaignForCard(index, pool) {
        const list = Array.isArray(pool) ? pool : [];
        if (!list.length) return null;
        const slot = Math.floor(index / 6);
        return normalizeCampaignShape(list[slot % list.length]);
    };

    proto.recordAdCampaignEvent = async function recordAdCampaignEvent(campaign = {}, type = 'impression', meta = {}) {
        const row = normalizeCampaignShape(campaign);
        if (!row.id) return false;

        if (!this.state) this.state = {};
        if (!this.state.recordedAdImpressions) this.state.recordedAdImpressions = {};
        if (type === 'impression') {
            const key = `${row.id}:${safeText(meta.videoId || meta.cardKey || '', 80)}`;
            if (key && this.state.recordedAdImpressions[key]) return false;
            if (key) this.state.recordedAdImpressions[key] = true;
        }

        const payload = {
            ownerUid: row.ownerUid,
            feedSource: safeText(meta.feedSource || (this.state && this.state.feedSource) || 'for-you', 20),
            videoId: safeText(meta.videoId || '', 80)
        };

        try {
            if (typeof firebaseService !== 'undefined' && firebaseService && typeof firebaseService.isInitialized === 'function' && firebaseService.isInitialized() && typeof firebaseService.recordAdEvent === 'function') {
                await firebaseService.recordAdEvent(row.id, type, payload);
            } else {
                this.localRecordAdEvent(row.id, type, payload);
            }
            return true;
        } catch (error) {
            console.warn('[ads] event failed:', error && error.message ? error.message : error);
            return false;
        }
    };

    proto.ensureFeedAdsInteractionBinding = function ensureFeedAdsInteractionBinding() {
        if (!this.feedContainer || this.feedContainer.dataset.adsBound === '2') return;
        this.feedContainer.dataset.adsBound = '2';

        this.feedContainer.addEventListener('click', (event) => {
            const button = event.target && event.target.closest ? event.target.closest('.sponsored-cta[data-ad-id][data-ad-url]') : null;
            if (!button) return;

            event.preventDefault();
            event.stopPropagation();

            const url = safeUrl(button.dataset.adUrl || '');
            const adId = safeText(button.dataset.adId || '', 120);
            const ownerUid = safeText(button.dataset.adOwnerUid || '', 120);
            const card = button.closest('.video-item');
            const videoId = card ? safeText(card.dataset.id || card.dataset.firestoreId || '', 120) : '';

            const campaign = { id: adId, ownerUid };
            this.recordAdCampaignEvent(campaign, 'click', { videoId, feedSource: this.state ? this.state.feedSource : 'for-you' });
            if (url) {
                try { window.open(url, '_blank', 'noopener,noreferrer'); } catch (_) {}
            }
            this.recordAdCampaignEvent(campaign, 'open', { videoId, feedSource: this.state ? this.state.feedSource : 'for-you' });
        });
    };

    proto.decorateFeedWithSponsoredPosts = function decorateFeedWithSponsoredPosts() {
        if (!this.feedContainer) return;
        if (this.state && this.state.feedSource === 'live') return;

        this.ensureFeedAdsInteractionBinding();
        const cards = Array.from(this.feedContainer.querySelectorAll('.video-item'));
        if (!cards.length) return;

        const pool = Array.isArray(this.state && this.state.adCampaignPool) && this.state.adCampaignPool.length ? this.state.adCampaignPool : FALLBACK_CAMPAIGNS;

        if (!this.state) this.state = {};
        if (!this.state.adCampaignPoolLoading && (!Array.isArray(this.state.adCampaignPool) || !this.state.adCampaignPool.length || (nowMs() - toInt(this.state.adCampaignPoolFetchedAt, 0) > CAMPAIGN_POOL_TTL))) {
            this.state.adCampaignPoolLoading = true;
            this.refreshAdCampaignPool({ silent: true, force: true })
                .then(() => this.decorateFeedWithSponsoredPosts())
                .catch(() => {})
                .finally(() => { this.state.adCampaignPoolLoading = false; });
        }

        cards.forEach((card, index) => {
            if (!canDecorateCard(card)) return;
            if ((index + 1) % 6 !== 0) return;

            const campaign = this.pickCampaignForCard(index, pool);
            if (!campaign || !campaign.id || !campaign.url || campaign.status !== 'active') return;

            const source = this.state && this.state.feedSource ? String(this.state.feedSource) : 'for-you';
            if (campaign.targetFeed !== 'all' && campaign.targetFeed !== source) return;

            const info = card.querySelector('.video-info');
            if (!info) return;

            const box = document.createElement('div');
            box.className = 'sponsored-box';
            box.innerHTML = `
                <div class="sponsored-chip">Sponsored</div>
                <div class="sponsored-brand">${this.escapeHtml(campaign.title)}</div>
                <div class="sponsored-sub">${this.escapeHtml(campaign.subtitle)}</div>
                <button type="button" class="sponsored-cta" data-ad-id="${this.escapeHtml(campaign.id)}" data-ad-owner-uid="${this.escapeHtml(campaign.ownerUid || '')}" data-ad-url="${this.escapeHtml(campaign.url)}">${this.escapeHtml(campaign.cta || 'Open')}</button>
            `;

            info.appendChild(box);
            card.classList.add('sponsored-post');
            card.dataset.adDecorated = '1';
            card.dataset.adId = campaign.id;

            const cardKey = `${card.dataset.id || card.dataset.firestoreId || index}`;
            this.recordAdCampaignEvent(campaign, 'impression', {
                cardKey,
                videoId: safeText(card.dataset.id || card.dataset.firestoreId || '', 120),
                feedSource: source
            });
        });
    };

    const originalInit = proto.init;
    if (typeof originalInit === 'function') {
        proto.init = async function patchedInit(...args) {
            this.ensureAdsCabinetScaffold();
            const result = await originalInit.apply(this, args);
            this.setupAdsCabinetEvents();
            this.updateAdsCabinetMenuVisibility();
            this.refreshAdCampaignPool({ silent: true, force: true }).catch(() => {});
            return result;
        };
    }

    const originalNavigateTo = proto.navigateTo;
    if (typeof originalNavigateTo === 'function') {
        proto.navigateTo = function patchedNavigateTo(viewId, ...rest) {
            const result = originalNavigateTo.call(this, viewId, ...rest);
            if (viewId === 'ads-cabinet-view') {
                this.loadAdsCabinetData({ showToast: false }).catch((error) => {
                    console.warn('[ads-cabinet] open view load failed:', error && error.message ? error.message : error);
                });
            }
            return result;
        };
    }

    const originalUpdateProfileUi = proto.updateProfileUI;
    if (typeof originalUpdateProfileUi === 'function') {
        proto.updateProfileUI = function patchedUpdateProfileUI(...args) {
            const result = originalUpdateProfileUi.apply(this, args);
            this.updateAdsCabinetMenuVisibility();
            return result;
        };
    }
})(typeof window !== 'undefined' ? window : null);
