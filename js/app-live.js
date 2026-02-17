/**
 * Reelgram Live Module (UI layer)
 * Keeps live-stream UI/room logic out of app.js core file.
 */
(function attachAppLiveModule(globalObject) {
    const AppCtor = globalObject && globalObject.AdvancedApp ? globalObject.AdvancedApp : null;
    if (!AppCtor || !AppCtor.prototype) return;

    const proto = AppCtor.prototype;
    if (proto.__reelgramLiveUiPatched) return;
    proto.__reelgramLiveUiPatched = true;

    const ORIGINAL = {
        ensureEnhancedUiScaffold: proto.ensureEnhancedUiScaffold,
        cacheElements: proto.cacheElements
    };

    function isFirebaseLiveReady() {
        return !!(
            firebaseService
            && typeof firebaseService.isInitialized === 'function'
            && firebaseService.isInitialized()
            && typeof firebaseService.listLiveSessions === 'function'
            && typeof firebaseService.joinLiveSession === 'function'
        );
    }

    function getCurrentUid() {
        if (!(firebaseService && typeof firebaseService.getCurrentUid === 'function')) return '';
        return String(firebaseService.getCurrentUid() || '');
    }

    function getCurrentUser() {
        if (!(firebaseService && typeof firebaseService.getCurrentUser === 'function')) return null;
        return firebaseService.getCurrentUser();
    }

    function getWebRtcCompat() {
        return globalObject.ReelgramWebRTC || {
            getPeerConnectionCtor: () => globalObject.RTCPeerConnection || globalObject.webkitRTCPeerConnection || globalObject.mozRTCPeerConnection || null,
            getIceServers: () => [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
            toSessionDescription: (description) => description,
            toIceCandidate: (candidate) => candidate,
            getSupportErrorMessage: () => '',
            getRecommendedConstraints: () => ({ video: true, audio: true }),
            getUserMedia: async (constraints) => {
                const nav = globalObject.navigator || {};
                if (nav.mediaDevices && typeof nav.mediaDevices.getUserMedia === 'function') {
                    return nav.mediaDevices.getUserMedia(constraints);
                }
                const legacy = nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia;
                if (!legacy) throw new Error('getUserMedia is unavailable');
                return new Promise((resolve, reject) => {
                    legacy.call(nav, constraints, resolve, reject);
                });
            }
        };
    }

    function getLiveConstraintsQueue() {
        const compat = getWebRtcCompat();
        const preferred = typeof compat.getRecommendedConstraints === 'function'
            ? compat.getRecommendedConstraints()
            : { video: true, audio: true };
        return [
            preferred,
            { video: { facingMode: 'user' }, audio: true },
            { video: true, audio: true },
            { video: { width: { ideal: 480 }, height: { ideal: 854 } }, audio: true },
            { video: false, audio: true }
        ];
    }

    proto.ensureEnhancedUiScaffold = function patchedEnsureEnhancedUiScaffold() {
        if (typeof ORIGINAL.ensureEnhancedUiScaffold === 'function') {
            ORIGINAL.ensureEnhancedUiScaffold.call(this);
        }

        const appRoot = document.getElementById('app');
        if (!appRoot) return;

        if (!document.getElementById('live-room-modal')) {
            const modal = document.createElement('div');
            modal.id = 'live-room-modal';
            modal.className = 'live-room-modal';
            modal.innerHTML = `
                <div class="live-room-shell">
                    <div class="live-room-top">
                        <button type="button" class="live-room-top-btn" id="live-room-close">Назад</button>
                        <div class="live-room-host">
                            <img class="live-room-owner-avatar" id="live-room-owner-avatar" src="https://ui-avatars.com/api/?name=Live&background=random&size=72" alt="@owner">
                            <div class="live-room-host-text">
                                <div class="live-room-title" id="live-room-title">Прямой эфир</div>
                                <div class="live-room-subtitle" id="live-room-subtitle">@user</div>
                            </div>
                        </div>
                        <button type="button" class="live-room-leave-btn" id="live-room-leave">Выйти</button>
                    </div>

                    <div class="live-room-stage">
                        <video id="live-room-main-video" class="live-room-main-video" autoplay playsinline muted></video>
                        <div class="live-room-video-overlay"></div>
                        <div class="live-room-video-placeholder" id="live-room-video-placeholder">Ожидание видеопотока...</div>
                        <button type="button" class="live-room-unmute-btn" id="live-room-unmute-btn" style="display:none;">Включить звук</button>
                        <span class="live-room-stage-badge">LIVE</span>
                        <h3 class="live-room-stage-title" id="live-room-stage-title">Подключение к эфиру...</h3>
                        <p class="live-room-stage-sub" id="live-room-stage-sub">Ожидание данных комнаты</p>
                        <button type="button" class="live-room-edit-title-btn" id="live-room-edit-title" style="display:none;">Изменить название</button>
                        <div class="live-room-reaction-total" id="live-room-reaction-total"></div>
                        <div class="live-room-reaction-layer" id="live-room-reaction-layer"></div>
                    </div>

                    <div class="live-room-pinned" id="live-room-pinned" style="display:none;">
                        <span class="live-room-pinned-label">Закреп:</span>
                        <span class="live-room-pinned-text" id="live-room-pinned-text"></span>
                        <button type="button" class="live-room-pin-clear-btn" id="live-room-pin-clear" style="display:none;">Снять</button>
                    </div>

                    <div class="live-room-audience" id="live-room-audience"></div>
                    <div class="live-room-chat" id="live-room-chat"></div>

                    <div class="live-room-bottom">
                        <div class="live-room-reactions-row" id="live-room-reaction-row">
                            <button type="button" class="live-room-reaction-btn" data-reaction="love">❤️</button>
                            <button type="button" class="live-room-reaction-btn" data-reaction="fire">🔥</button>
                            <button type="button" class="live-room-reaction-btn" data-reaction="wow">😮</button>
                            <button type="button" class="live-room-reaction-btn" data-reaction="clap">👏</button>
                            <button type="button" class="live-room-reaction-btn" data-reaction="party">🎉</button>
                            <button type="button" class="live-room-reaction-btn" data-reaction="like">👍</button>
                        </div>
                        <div class="live-room-input-row">
                            <input id="live-room-input" type="text" maxlength="240" placeholder="Написать в чат эфира...">
                            <button type="button" class="primary-btn" id="live-room-send">Отправить</button>
                        </div>
                    </div>
                </div>
            `;
            appRoot.appendChild(modal);
        }
    };

    proto.cacheElements = function patchedCacheElements() {
        if (typeof ORIGINAL.cacheElements === 'function') {
            ORIGINAL.cacheElements.call(this);
        }

        this.liveRoomModal = document.getElementById('live-room-modal');
        this.liveRoomCloseBtn = document.getElementById('live-room-close');
        this.liveRoomLeaveBtn = document.getElementById('live-room-leave');
        this.liveRoomOwnerAvatar = document.getElementById('live-room-owner-avatar');
        this.liveRoomTitle = document.getElementById('live-room-title');
        this.liveRoomSubtitle = document.getElementById('live-room-subtitle');
        this.liveRoomStageTitle = document.getElementById('live-room-stage-title');
        this.liveRoomStageSub = document.getElementById('live-room-stage-sub');
        this.liveRoomMainVideo = document.getElementById('live-room-main-video');
        this.liveRoomVideoPlaceholder = document.getElementById('live-room-video-placeholder');
        this.liveRoomUnmuteBtn = document.getElementById('live-room-unmute-btn');
        this.liveRoomEditTitleBtn = document.getElementById('live-room-edit-title');
        this.liveRoomReactionTotal = document.getElementById('live-room-reaction-total');
        this.liveRoomReactionLayer = document.getElementById('live-room-reaction-layer');
        this.liveRoomPinned = document.getElementById('live-room-pinned');
        this.liveRoomPinnedText = document.getElementById('live-room-pinned-text');
        this.liveRoomPinClearBtn = document.getElementById('live-room-pin-clear');
        this.liveRoomAudience = document.getElementById('live-room-audience');
        this.liveRoomChat = document.getElementById('live-room-chat');
        this.liveRoomReactionRow = document.getElementById('live-room-reaction-row');
        this.liveRoomInput = document.getElementById('live-room-input');
        this.liveRoomSendBtn = document.getElementById('live-room-send');

        this.liveRoomState = this.liveRoomState || {
            sessionId: null,
            session: null,
            role: 'viewer',
            messages: [],
            audience: [],
            seenReactionIds: new Set(),
            sessionUnsub: null,
            messagesUnsub: null,
            reactionsUnsub: null,
            audienceUnsub: null,
            presenceTimer: null
        };
        this.liveRoomRtc = this.liveRoomRtc || {
            signalUnsub: null,
            localStream: null,
            remoteStream: null,
            peers: new Map(),
            pendingCandidates: new Map(),
            announcedOwnerJoin: false
        };
    };

    proto.getActiveLiveRole = function getActiveLiveRole() {
        const session = this.liveRoomState && this.liveRoomState.session ? this.liveRoomState.session : null;
        const uid = getCurrentUid();
        if (!session || !uid) return 'viewer';
        if (String(session.ownerUid || '') === uid) return 'owner';
        if (Array.isArray(session.coHosts) && session.coHosts.some(v => String(v) === uid)) return 'cohost';
        return 'viewer';
    };

    proto.resetLiveRoomSubscriptions = function resetLiveRoomSubscriptions() {
        const state = this.liveRoomState || {};
        ['sessionUnsub', 'messagesUnsub', 'reactionsUnsub', 'audienceUnsub'].forEach((key) => {
            if (typeof state[key] === 'function') {
                try { state[key](); } catch (_) {}
            }
            state[key] = null;
        });
        if (state.presenceTimer) {
            clearInterval(state.presenceTimer);
            state.presenceTimer = null;
        }
        if (typeof this.resetLiveRtc === 'function') {
            this.resetLiveRtc();
        }
    };

    proto.setupLiveEvents = function setupLiveEvents() {
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

        if (this.liveRoomCloseBtn && this.liveRoomCloseBtn.dataset.bound !== '1') {
            this.liveRoomCloseBtn.dataset.bound = '1';
            this.liveRoomCloseBtn.addEventListener('click', () => this.closeLiveRoom({ leaveSession: true }));
        }
        if (this.liveRoomLeaveBtn && this.liveRoomLeaveBtn.dataset.bound !== '1') {
            this.liveRoomLeaveBtn.dataset.bound = '1';
            this.liveRoomLeaveBtn.addEventListener('click', () => this.handleLiveRoomLeaveAction());
        }
        if (this.liveRoomSendBtn && this.liveRoomSendBtn.dataset.bound !== '1') {
            this.liveRoomSendBtn.dataset.bound = '1';
            this.liveRoomSendBtn.addEventListener('click', () => this.sendLiveRoomMessage());
        }
        if (this.liveRoomUnmuteBtn && this.liveRoomUnmuteBtn.dataset.bound !== '1') {
            this.liveRoomUnmuteBtn.dataset.bound = '1';
            this.liveRoomUnmuteBtn.addEventListener('click', () => this.unmuteLiveRoomVideo());
        }
        if (this.liveRoomInput && this.liveRoomInput.dataset.bound !== '1') {
            this.liveRoomInput.dataset.bound = '1';
            this.liveRoomInput.addEventListener('keydown', (e) => {
                if (e.key !== 'Enter' || e.shiftKey) return;
                e.preventDefault();
                this.sendLiveRoomMessage();
            });
        }
        if (this.liveRoomReactionRow && this.liveRoomReactionRow.dataset.bound !== '1') {
            this.liveRoomReactionRow.dataset.bound = '1';
            this.liveRoomReactionRow.addEventListener('click', (e) => {
                const btn = e.target && e.target.closest ? e.target.closest('.live-room-reaction-btn') : null;
                if (!btn) return;
                const reaction = String(btn.dataset.reaction || '').trim().toLowerCase();
                if (!reaction) return;
                this.sendLiveRoomReaction(reaction);
            });
        }
        if (this.liveRoomEditTitleBtn && this.liveRoomEditTitleBtn.dataset.bound !== '1') {
            this.liveRoomEditTitleBtn.dataset.bound = '1';
            this.liveRoomEditTitleBtn.addEventListener('click', () => this.editActiveLiveTitle());
        }
        if (this.liveRoomPinClearBtn && this.liveRoomPinClearBtn.dataset.bound !== '1') {
            this.liveRoomPinClearBtn.dataset.bound = '1';
            this.liveRoomPinClearBtn.addEventListener('click', () => this.clearActiveLivePin());
        }
        if (this.liveRoomChat && this.liveRoomChat.dataset.bound !== '1') {
            this.liveRoomChat.dataset.bound = '1';
            this.liveRoomChat.addEventListener('click', (e) => {
                const pinBtn = e.target && e.target.closest ? e.target.closest('[data-live-pin-id]') : null;
                if (!pinBtn) return;
                const messageId = String(pinBtn.dataset.livePinId || '');
                if (!messageId) return;
                this.pinActiveLiveMessage(messageId);
            });
        }
        if (this.liveRoomModal && this.liveRoomModal.dataset.bound !== '1') {
            this.liveRoomModal.dataset.bound = '1';
            this.liveRoomModal.addEventListener('click', (e) => {
                if (e.target === this.liveRoomModal) {
                    this.closeLiveRoom({ leaveSession: true });
                }
            });
        }

        this.ensureLiveSessionsWatcher();
        this.refreshLiveSessions({ silent: true });
    };

    proto.ensureLiveSessionsWatcher = function ensureLiveSessionsWatcher() {
        if (this.liveSessionsUnsubscribe) return;
        if (!(isFirebaseLiveReady() && typeof firebaseService.subscribeToLiveSessions === 'function')) return;
        this.liveSessionsUnsubscribe = firebaseService.subscribeToLiveSessions((sessions) => {
            this.liveSessions = Array.isArray(sessions) ? sessions : [];
            this.renderLiveSessionsStrip();
            this.renderLiveSheetList();
        }, { limit: 30 });
    };

    proto.refreshLiveSessions = async function refreshLiveSessions({ silent = false } = {}) {
        if (!isFirebaseLiveReady()) {
            this.liveSessions = [];
            this.renderLiveSessionsStrip();
            this.renderLiveSheetList();
            if (!silent) AdvancedViewRenderer.showToast('Live доступен после подключения базы', 'warning');
            return;
        }

        try {
            const sessions = await firebaseService.listLiveSessions(30);
            this.liveSessions = Array.isArray(sessions) ? sessions : [];
            this.renderLiveSessionsStrip();
            this.renderLiveSheetList();
        } catch (error) {
            console.error('Ошибка обновления эфиров:', error);
            if (!silent) AdvancedViewRenderer.showToast(error?.message || 'Не удалось обновить эфиры', 'error');
        }
    };

    proto.renderLiveSessionsStrip = function renderLiveSessionsStrip() {
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
    };

    proto.renderLiveFeedList = function renderLiveFeedList() {
        if (!this.feedContainer) return;
        const sessions = Array.isArray(this.liveSessions) ? this.liveSessions : [];
        const currentUid = getCurrentUid();

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
            if (this.state.feedSource === 'live' && this.state.feedMode === 'global') this.renderLiveFeedList();
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
                    const openRoomBtn = document.createElement('button');
                    openRoomBtn.type = 'button';
                    openRoomBtn.className = 'secondary-btn';
                    openRoomBtn.textContent = 'Открыть';
                    openRoomBtn.addEventListener('click', () => this.openLiveRoom(session.id, { skipJoin: true }));
                    actions.appendChild(openRoomBtn);

                    const endBtn = document.createElement('button');
                    endBtn.type = 'button';
                    endBtn.className = 'secondary-btn';
                    endBtn.textContent = 'Завершить';
                    endBtn.addEventListener('click', async () => {
                        try {
                            await firebaseService.endLiveSession(session.id);
                            AdvancedViewRenderer.showToast('Эфир завершен', 'success');
                            await this.refreshLiveSessions({ silent: true });
                            this.renderLiveFeedList();
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
    };

    proto.renderLiveSheetList = function renderLiveSheetList() {
        if (!this.liveSheetList) return;
        const sessions = Array.isArray(this.liveSessions) ? this.liveSessions : [];
        const currentUid = getCurrentUid();
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
                    const openBtn = document.createElement('button');
                    openBtn.type = 'button';
                    openBtn.className = 'secondary-btn';
                    openBtn.textContent = 'Открыть';
                    openBtn.addEventListener('click', () => this.openLiveRoom(session.id, { skipJoin: true }));
                    actions.appendChild(openBtn);
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
    };

    proto.getLiveIceServers = function getLiveIceServers() {
        const compat = getWebRtcCompat();
        const iceServers = typeof compat.getIceServers === 'function' ? compat.getIceServers() : [];
        if (Array.isArray(iceServers) && iceServers.length) {
            return iceServers;
        }
        return [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
    };

    proto.resetLiveRtc = function resetLiveRtc() {
        const rtc = this.liveRoomRtc || {};
        if (typeof rtc.signalUnsub === 'function') {
            try { rtc.signalUnsub(); } catch (_) {}
            rtc.signalUnsub = null;
        }
        if (rtc.peers && typeof rtc.peers.forEach === 'function') {
            rtc.peers.forEach((pc) => {
                try { pc.close(); } catch (_) {}
            });
        }
        rtc.peers = new Map();
        rtc.pendingCandidates = new Map();
        rtc.announcedOwnerJoin = false;
        if (rtc.remoteStream) {
            rtc.remoteStream.getTracks().forEach((track) => {
                try { track.stop(); } catch (_) {}
            });
        }
        rtc.remoteStream = null;
        const role = this.liveRoomState && this.liveRoomState.role ? this.liveRoomState.role : 'viewer';
        if (rtc.localStream && role === 'owner') {
            rtc.localStream.getTracks().forEach((track) => {
                try { track.stop(); } catch (_) {}
            });
            rtc.localStream = null;
        }
        this.liveRoomRtc = rtc;
        if (this.liveRoomMainVideo) {
            this.liveRoomMainVideo.srcObject = null;
        }
        if (this.liveRoomVideoPlaceholder) {
            this.liveRoomVideoPlaceholder.style.display = '';
            this.liveRoomVideoPlaceholder.textContent = 'Ожидание видеопотока...';
        }
        if (this.liveRoomUnmuteBtn) {
            this.liveRoomUnmuteBtn.style.display = 'none';
        }
    };

    proto.sendLiveSignalTo = async function sendLiveSignalTo(toUid, type, payload = {}) {
        const sessionId = this.liveRoomState && this.liveRoomState.sessionId ? String(this.liveRoomState.sessionId) : '';
        if (!sessionId || !toUid) return;
        if (!(firebaseService && typeof firebaseService.sendLiveSignal === 'function')) return;
        await firebaseService.sendLiveSignal(sessionId, {
            toUid: String(toUid),
            type: String(type || '').trim(),
            payload: payload && typeof payload === 'object' ? payload : {}
        });
    };

    proto.createLivePeerConnection = function createLivePeerConnection(peerUid) {
        const safePeerUid = String(peerUid || '');
        if (!safePeerUid) return null;
        const rtc = this.liveRoomRtc;
        if (rtc.peers.has(safePeerUid)) return rtc.peers.get(safePeerUid);

        const compat = getWebRtcCompat();
        const PeerConnectionCtor = typeof compat.getPeerConnectionCtor === 'function'
            ? compat.getPeerConnectionCtor()
            : null;
        if (typeof PeerConnectionCtor !== 'function') {
            return null;
        }
        const pc = new PeerConnectionCtor({ iceServers: this.getLiveIceServers() });
        rtc.peers.set(safePeerUid, pc);

        pc.onicecandidate = (event) => {
            const candidate = event && event.candidate ? event.candidate : null;
            if (!candidate) return;
            this.sendLiveSignalTo(safePeerUid, 'candidate', {
                candidate: candidate.toJSON ? candidate.toJSON() : candidate
            }).catch((error) => {
                console.warn('live candidate send failed:', error?.message || error);
            });
        };

        pc.onconnectionstatechange = () => {
            const state = String(pc.connectionState || '');
            if (state === 'failed' || state === 'disconnected' || state === 'closed') {
                try { pc.close(); } catch (_) {}
                rtc.peers.delete(safePeerUid);
            }
        };

        pc.ontrack = (event) => {
            const stream = event && event.streams && event.streams[0] ? event.streams[0] : null;
            if (stream) {
                rtc.remoteStream = stream;
            } else {
                if (!rtc.remoteStream) rtc.remoteStream = new MediaStream();
                if (event && event.track && !rtc.remoteStream.getTracks().some((t) => t.id === event.track.id)) {
                    rtc.remoteStream.addTrack(event.track);
                }
            }
            if (this.liveRoomMainVideo) {
                this.liveRoomMainVideo.srcObject = rtc.remoteStream;
                this.liveRoomMainVideo.muted = true;
                this.liveRoomMainVideo.play().catch(() => {});
            }
            if (this.liveRoomVideoPlaceholder) {
                this.liveRoomVideoPlaceholder.style.display = 'none';
            }
            if (this.liveRoomUnmuteBtn && this.liveRoomState.role !== 'owner') {
                this.liveRoomUnmuteBtn.style.display = '';
            }
        };

        return pc;
    };

    proto.flushLiveCandidates = async function flushLiveCandidates(peerUid) {
        const safePeerUid = String(peerUid || '');
        const rtc = this.liveRoomRtc;
        const pc = rtc.peers.get(safePeerUid);
        if (!pc || !pc.remoteDescription) return;
        const queue = rtc.pendingCandidates.get(safePeerUid) || [];
        if (!queue.length) return;
        rtc.pendingCandidates.set(safePeerUid, []);
        for (const row of queue) {
            try {
                const candidate = getWebRtcCompat().toIceCandidate(row);
                if (!candidate) continue;
                await pc.addIceCandidate(candidate);
            } catch (_) {}
        }
    };

    proto.addLiveCandidateOrQueue = async function addLiveCandidateOrQueue(peerUid, candidate) {
        const safePeerUid = String(peerUid || '');
        if (!safePeerUid || !candidate) return;
        const rtc = this.liveRoomRtc;
        const pc = rtc.peers.get(safePeerUid);
        if (!pc) {
            const queueMissingPc = rtc.pendingCandidates.get(safePeerUid) || [];
            queueMissingPc.push(candidate);
            rtc.pendingCandidates.set(safePeerUid, queueMissingPc);
            return;
        }
        if (!pc.remoteDescription) {
            const queue = rtc.pendingCandidates.get(safePeerUid) || [];
            queue.push(candidate);
            rtc.pendingCandidates.set(safePeerUid, queue);
            return;
        }
        try {
            const safeCandidate = getWebRtcCompat().toIceCandidate(candidate);
            if (!safeCandidate) return;
            await pc.addIceCandidate(safeCandidate);
        } catch (_) {}
    };

    proto.ensureLiveLocalStream = async function ensureLiveLocalStream() {
        const rtc = this.liveRoomRtc;
        if (rtc.localStream) return rtc.localStream;
        const compat = getWebRtcCompat();
        const supportError = typeof compat.getSupportErrorMessage === 'function'
            ? compat.getSupportErrorMessage()
            : '';
        if (supportError) {
            throw new Error(supportError);
        }

        const queue = getLiveConstraintsQueue();
        let lastError = null;

        for (const constraints of queue) {
            try {
                const stream = await compat.getUserMedia(constraints);
                if (!stream) continue;
                rtc.localStream = stream;
                return stream;
            } catch (error) {
                lastError = error;
                const code = String(error && error.name ? error.name : '').toLowerCase();
                if (code === 'notallowederror' || code === 'securityerror') break;
            }
        }

        throw (lastError || new Error('Cannot access media devices.'));
    };

    proto.unmuteLiveRoomVideo = function unmuteLiveRoomVideo() {
        if (!this.liveRoomMainVideo) return;
        this.liveRoomMainVideo.muted = false;
        this.liveRoomMainVideo.play().catch(() => {});
        if (this.liveRoomUnmuteBtn) this.liveRoomUnmuteBtn.style.display = 'none';
    };

    proto.setupLiveSignalListener = function setupLiveSignalListener() {
        const session = this.liveRoomState && this.liveRoomState.session ? this.liveRoomState.session : null;
        const sessionId = this.liveRoomState && this.liveRoomState.sessionId ? this.liveRoomState.sessionId : null;
        const uid = getCurrentUid();
        if (!session || !sessionId || !uid) return;
        if (!(firebaseService && typeof firebaseService.subscribeToLiveSignals === 'function')) return;
        if (this.liveRoomRtc.signalUnsub) return;

        this.liveRoomRtc.signalUnsub = firebaseService.subscribeToLiveSignals(sessionId, uid, async (signals) => {
            const rows = Array.isArray(signals) ? signals : [];
            for (const signal of rows) {
                try {
                    await this.handleLiveSignal(signal);
                } catch (signalError) {
                    console.warn('live signal handling failed:', signalError?.message || signalError);
                } finally {
                    if (firebaseService && typeof firebaseService.deleteLiveSignal === 'function' && signal && signal.id) {
                        firebaseService.deleteLiveSignal(sessionId, signal.id).catch(() => {});
                    }
                }
            }
        });
    };

    proto.handleLiveSignal = async function handleLiveSignal(signal) {
        const row = signal && typeof signal === 'object' ? signal : null;
        if (!row) return;
        const session = this.liveRoomState && this.liveRoomState.session ? this.liveRoomState.session : null;
        const myUid = getCurrentUid();
        if (!session || !myUid) return;
        const type = String(row.type || '').trim().toLowerCase();
        const fromUid = String(row.fromUid || '');
        const payload = row.payload && typeof row.payload === 'object' ? row.payload : {};

        if (this.liveRoomState.role === 'owner') {
            if (type === 'viewer-join' && fromUid && fromUid !== myUid) {
                const pc = this.createLivePeerConnection(fromUid);
                if (!pc) return;
                const stream = await this.ensureLiveLocalStream();
                stream.getTracks().forEach((track) => {
                    if (!pc.getSenders().some((sender) => sender.track && sender.track.id === track.id)) {
                        pc.addTrack(track, stream);
                    }
                });
                const offer = await pc.createOffer({
                    offerToReceiveAudio: false,
                    offerToReceiveVideo: false
                });
                await pc.setLocalDescription(offer);
                await this.sendLiveSignalTo(fromUid, 'offer', {
                    sdp: offer.sdp,
                    type: offer.type
                });
                return;
            }
            if (type === 'answer' && fromUid && payload && payload.sdp) {
                const pc = this.createLivePeerConnection(fromUid);
                if (!pc) return;
                if (pc.signalingState !== 'stable') {
                    const answerDescription = getWebRtcCompat().toSessionDescription({
                        type: 'answer',
                        sdp: payload.sdp
                    });
                    await pc.setRemoteDescription(answerDescription);
                    await this.flushLiveCandidates(fromUid);
                }
                return;
            }
            if (type === 'candidate' && fromUid && payload && payload.candidate) {
                await this.addLiveCandidateOrQueue(fromUid, payload.candidate);
                return;
            }
            return;
        }

        // viewer flow
        const ownerUid = String(session.ownerUid || '');
        if (!ownerUid || fromUid !== ownerUid) return;

        if (type === 'offer' && payload && payload.sdp) {
            const pc = this.createLivePeerConnection(ownerUid);
            if (!pc) return;
            const offerDescription = getWebRtcCompat().toSessionDescription({
                type: 'offer',
                sdp: payload.sdp
            });
            await pc.setRemoteDescription(offerDescription);
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await this.sendLiveSignalTo(ownerUid, 'answer', {
                sdp: answer.sdp,
                type: answer.type
            });
            await this.flushLiveCandidates(ownerUid);
            return;
        }
        if (type === 'candidate' && payload && payload.candidate) {
            await this.addLiveCandidateOrQueue(ownerUid, payload.candidate);
        }
    };

    proto.ensureLiveVideoModeForSession = async function ensureLiveVideoModeForSession() {
        const session = this.liveRoomState && this.liveRoomState.session ? this.liveRoomState.session : null;
        if (!session) return;
        if (typeof RTCPeerConnection !== 'function') {
            if (this.liveRoomVideoPlaceholder) {
                this.liveRoomVideoPlaceholder.style.display = '';
                this.liveRoomVideoPlaceholder.textContent = 'Ваш браузер не поддерживает WebRTC';
            }
            return;
        }
        this.setupLiveSignalListener();

        const myUid = getCurrentUid();
        const ownerUid = String(session.ownerUid || '');
        if (!myUid || !ownerUid) return;

        if (String(myUid) === ownerUid) {
            try {
                const stream = await this.ensureLiveLocalStream();
                if (this.liveRoomMainVideo) {
                    this.liveRoomMainVideo.srcObject = stream;
                    this.liveRoomMainVideo.muted = true;
                    this.liveRoomMainVideo.play().catch(() => {});
                }
                if (this.liveRoomVideoPlaceholder) {
                    this.liveRoomVideoPlaceholder.style.display = 'none';
                }
                if (this.liveRoomUnmuteBtn) {
                    this.liveRoomUnmuteBtn.style.display = 'none';
                }
            } catch (mediaError) {
                if (this.liveRoomVideoPlaceholder) {
                    this.liveRoomVideoPlaceholder.style.display = '';
                    this.liveRoomVideoPlaceholder.textContent = 'Нет доступа к камере/микрофону';
                }
                AdvancedViewRenderer.showToast(mediaError?.message || 'Не удалось включить камеру', 'error');
            }
            return;
        }

        const rtc = this.liveRoomRtc;
        if (!rtc.announcedOwnerJoin) {
            rtc.announcedOwnerJoin = true;
            await this.sendLiveSignalTo(ownerUid, 'viewer-join', { wantVideo: true });
        }
        if (this.liveRoomMainVideo) {
            this.liveRoomMainVideo.muted = true;
        }
        if (this.liveRoomUnmuteBtn) {
            this.liveRoomUnmuteBtn.style.display = 'none';
        }
    };

    proto.openLiveSheet = function openLiveSheet() {
        if (!this.liveSheet) return;
        this.liveSheet.classList.add('open');
        this.refreshLiveSessions({ silent: true });
    };

    proto.closeLiveSheet = function closeLiveSheet() {
        if (!this.liveSheet) return;
        this.liveSheet.classList.remove('open');
    };

    proto.startLiveSession = async function startLiveSession() {
        const current = getCurrentUser();
        if (!current || !current.uid) {
            this.navigateTo('auth-view');
            return;
        }
        if (!isFirebaseLiveReady() || typeof firebaseService.createLiveSession !== 'function') {
            AdvancedViewRenderer.showToast('Live недоступен без подключения базы', 'warning');
            return;
        }

        const title = this.liveTitleInput ? this.liveTitleInput.value.trim() : '';
        try {
            const session = await firebaseService.createLiveSession({ title });
            this.state.activeLiveSessionId = session && session.id ? session.id : null;
            if (this.liveTitleInput) this.liveTitleInput.value = '';
            this.closeLiveSheet();
            await this.refreshLiveSessions({ silent: true });
            await this.openLiveRoom(this.state.activeLiveSessionId, { skipJoin: true });
            AdvancedViewRenderer.showToast('Эфир запущен', 'success');
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось запустить эфир', 'error');
        }
    };

    proto.joinLiveSession = async function joinLiveSession(sessionId, { asCoHost = false } = {}) {
        const current = getCurrentUser();
        if (!current || !current.uid) {
            this.navigateTo('auth-view');
            return;
        }
        if (!isFirebaseLiveReady()) {
            AdvancedViewRenderer.showToast('Live недоступен без подключения базы', 'warning');
            return;
        }

        try {
            const session = await firebaseService.joinLiveSession(sessionId, { asCoHost });
            this.state.activeLiveSessionId = session && session.id ? session.id : null;
            this.closeLiveSheet();
            await this.openLiveRoom(this.state.activeLiveSessionId, { skipJoin: true });
            await this.refreshLiveSessions({ silent: true });
            AdvancedViewRenderer.showToast(asCoHost ? 'Вы присоединились как co-host' : 'Вы вошли в эфир', 'success');
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось войти в эфир', 'error');
        }
    };

    proto.openLiveRoom = async function openLiveRoom(sessionId, { skipJoin = false } = {}) {
        const current = getCurrentUser();
        if (!current || !current.uid) {
            this.navigateTo('auth-view');
            return;
        }
        if (!sessionId) return;
        if (!(isFirebaseLiveReady()
            && typeof firebaseService.subscribeToLiveSession === 'function'
            && typeof firebaseService.subscribeToLiveMessages === 'function'
            && typeof firebaseService.subscribeToLiveReactions === 'function'
            && typeof firebaseService.subscribeToLiveAudience === 'function'
            && typeof firebaseService.subscribeToLiveSignals === 'function'
            && typeof firebaseService.sendLiveSignal === 'function')) {
            AdvancedViewRenderer.showToast('Live-модуль не готов', 'warning');
            return;
        }

        if (!skipJoin) {
            try {
                await firebaseService.joinLiveSession(sessionId, { asCoHost: false });
            } catch (joinError) {
                AdvancedViewRenderer.showToast(joinError?.message || 'Не удалось войти в эфир', 'error');
                return;
            }
        }

        this.resetLiveRoomSubscriptions();
        this.liveRoomState.sessionId = String(sessionId);
        this.liveRoomState.session = null;
        this.liveRoomState.messages = [];
        this.liveRoomState.audience = [];
        this.liveRoomState.seenReactionIds = new Set();
        this.state.activeLiveSessionId = String(sessionId);

        if (this.liveRoomModal) {
            this.liveRoomModal.classList.add('open');
            document.body.classList.add('live-room-open');
        }
        if (this.liveRoomMainVideo) {
            this.liveRoomMainVideo.srcObject = null;
            this.liveRoomMainVideo.muted = true;
        }
        if (this.liveRoomVideoPlaceholder) {
            this.liveRoomVideoPlaceholder.style.display = '';
            this.liveRoomVideoPlaceholder.textContent = 'Подключение к видеопотоку...';
        }
        if (this.liveRoomUnmuteBtn) {
            this.liveRoomUnmuteBtn.style.display = 'none';
        }
        if (this.liveRoomChat) {
            this.liveRoomChat.innerHTML = '<div class="live-room-chat-empty">Подключаем чат эфира...</div>';
        }
        if (this.liveRoomAudience) {
            this.liveRoomAudience.innerHTML = '<div class="live-room-audience-empty">Обновляем зрителей...</div>';
        }

        const sessionCallback = (session) => this.handleLiveRoomSessionUpdate(session);
        const messagesCallback = (messages) => {
            this.liveRoomState.messages = Array.isArray(messages) ? messages : [];
            this.renderLiveRoomMessages();
        };
        const reactionsCallback = (reactions) => this.applyLiveRoomReactions(reactions);
        const audienceCallback = (audience) => {
            this.liveRoomState.audience = Array.isArray(audience) ? audience : [];
            this.renderLiveRoomAudience();
        };

        this.liveRoomState.sessionUnsub = firebaseService.subscribeToLiveSession(sessionId, sessionCallback);
        this.liveRoomState.messagesUnsub = firebaseService.subscribeToLiveMessages(sessionId, messagesCallback, { limit: 140 });
        this.liveRoomState.reactionsUnsub = firebaseService.subscribeToLiveReactions(sessionId, reactionsCallback, { limit: 120 });
        this.liveRoomState.audienceUnsub = firebaseService.subscribeToLiveAudience(sessionId, audienceCallback, { limit: 36 });

        const touchPresence = async () => {
            if (!this.liveRoomState || !this.liveRoomState.sessionId) return;
            try {
                await firebaseService.touchLiveAudience(this.liveRoomState.sessionId, { role: this.getActiveLiveRole() });
            } catch (_) {}
        };
        touchPresence();
        this.liveRoomState.presenceTimer = setInterval(touchPresence, 20000);
    };

    proto.handleLiveRoomSessionUpdate = function handleLiveRoomSessionUpdate(session) {
        if (!session || session.status !== 'live') {
            this.closeLiveRoom({ leaveSession: false });
            this.refreshLiveSessions({ silent: true });
            AdvancedViewRenderer.showToast('Эфир завершен', 'warning');
            return;
        }

        this.liveRoomState.session = session;
        this.liveRoomState.role = this.getActiveLiveRole();

        if (this.liveRoomTitle) this.liveRoomTitle.textContent = session.title || 'Прямой эфир';
        if (this.liveRoomStageTitle) this.liveRoomStageTitle.textContent = session.title || 'Прямой эфир';
        if (this.liveRoomSubtitle) this.liveRoomSubtitle.textContent = `@${session.ownerName || 'user'}`;
        if (this.liveRoomStageSub) {
            const coHostsCount = Array.isArray(session.coHosts) ? session.coHosts.length : 0;
            this.liveRoomStageSub.textContent = `Зрителей: ${AdvancedViewRenderer.formatNumber(session.viewersCount || 0)} · co-host: ${coHostsCount}/2`;
        }
        if (this.liveRoomOwnerAvatar) {
            this.liveRoomOwnerAvatar.src = session.ownerAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(session.ownerName || 'user')}&background=random&size=72`;
        }
        if (this.liveRoomLeaveBtn) {
            this.liveRoomLeaveBtn.textContent = this.liveRoomState.role === 'owner' ? 'Завершить' : 'Выйти';
        }
        if (this.liveRoomEditTitleBtn) {
            this.liveRoomEditTitleBtn.style.display = (this.liveRoomState.role === 'owner' || this.liveRoomState.role === 'cohost') ? '' : 'none';
        }
        this.renderLiveRoomPinned();
        this.renderLiveRoomAudience();
        this.renderLiveReactionTotal();
        this.ensureLiveVideoModeForSession();
    };

    proto.renderLiveReactionTotal = function renderLiveReactionTotal() {
        if (!this.liveRoomReactionTotal) return;
        const counters = (this.liveRoomState && this.liveRoomState.session && this.liveRoomState.session.reactionCounters)
            ? this.liveRoomState.session.reactionCounters
            : {};
        const total = ['love', 'fire', 'wow', 'clap', 'party', 'like']
            .reduce((sum, key) => sum + (parseInt(counters[key], 10) || 0), 0);
        this.liveRoomReactionTotal.textContent = total > 0
            ? `Реакций: ${AdvancedViewRenderer.formatNumber(total)}`
            : '';
    };

    proto.renderLiveRoomPinned = function renderLiveRoomPinned() {
        if (!this.liveRoomPinned || !this.liveRoomPinnedText) return;
        const pinned = this.liveRoomState && this.liveRoomState.session ? this.liveRoomState.session.pinnedMessage : null;
        if (!pinned || !pinned.text) {
            this.liveRoomPinned.style.display = 'none';
            this.liveRoomPinnedText.textContent = '';
            return;
        }
        this.liveRoomPinned.style.display = 'flex';
        this.liveRoomPinnedText.textContent = `@${pinned.user || 'user'}: ${pinned.text}`;
        if (this.liveRoomPinClearBtn) {
            const canClear = this.liveRoomState.role === 'owner' || this.liveRoomState.role === 'cohost';
            this.liveRoomPinClearBtn.style.display = canClear ? '' : 'none';
        }
    };

    proto.renderLiveRoomAudience = function renderLiveRoomAudience() {
        if (!this.liveRoomAudience) return;
        const audience = Array.isArray(this.liveRoomState.audience) ? this.liveRoomState.audience : [];
        const session = this.liveRoomState.session || null;
        const viewersCount = session ? (parseInt(session.viewersCount, 10) || audience.length) : audience.length;
        if (!audience.length) {
            this.liveRoomAudience.innerHTML = `<div class="live-room-audience-empty">Зрителей: ${AdvancedViewRenderer.formatNumber(viewersCount)}</div>`;
            return;
        }

        const top = audience.slice(0, 8).map((row) => {
            const roleLabel = row.role === 'owner' ? 'ведущий' : (row.role === 'cohost' ? 'co-host' : 'зритель');
            const avatar = this.escapeHtml(row.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.user || 'user')}&background=random&size=48`);
            return `
                <div class="live-room-audience-chip">
                    <img src="${avatar}" alt="@${this.escapeHtml(row.user || 'user')}">
                    <span>@${this.escapeHtml(row.user || 'user')}</span>
                    <em>${roleLabel}</em>
                </div>
            `;
        }).join('');

        this.liveRoomAudience.innerHTML = `
            <div class="live-room-audience-head">Зрителей: ${AdvancedViewRenderer.formatNumber(viewersCount)}</div>
            <div class="live-room-audience-list">${top}</div>
        `;
    };

    proto.renderLiveRoomMessages = function renderLiveRoomMessages() {
        if (!this.liveRoomChat) return;
        const rows = Array.isArray(this.liveRoomState.messages) ? this.liveRoomState.messages : [];
        const myUid = getCurrentUid();
        const canPin = this.liveRoomState.role === 'owner' || this.liveRoomState.role === 'cohost';
        if (!rows.length) {
            this.liveRoomChat.innerHTML = '<div class="live-room-chat-empty">Чат пуст. Напишите первое сообщение.</div>';
            return;
        }

        this.liveRoomChat.innerHTML = rows.map((row) => {
            const own = !!(myUid && String(row.uid || '') === myUid);
            const avatar = this.escapeHtml(row.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.user || 'user')}&background=random&size=40`);
            const system = row.type === 'system';
            const pinAction = canPin && !system && row.text
                ? `<button type="button" class="live-room-pin-btn" data-live-pin-id="${this.escapeHtml(row.id || '')}">Закрепить</button>`
                : '';
            return `
                <div class="live-room-chat-row${own ? ' own' : ''}${system ? ' system' : ''}">
                    <img class="live-room-chat-avatar" src="${avatar}" alt="@${this.escapeHtml(row.user || 'user')}">
                    <div class="live-room-chat-bubble">
                        <div class="live-room-chat-meta">
                            <strong>@${this.escapeHtml(row.user || 'user')}</strong>
                            <span>${this.formatLiveMessageTime(row.createdAt)}</span>
                        </div>
                        <div class="live-room-chat-text">${this.escapeHtml(row.text || '')}</div>
                        ${pinAction}
                    </div>
                </div>
            `;
        }).join('');
        this.liveRoomChat.scrollTop = this.liveRoomChat.scrollHeight;
    };

    proto.formatLiveMessageTime = function formatLiveMessageTime(timestamp) {
        const value = parseInt(timestamp, 10) || 0;
        if (!value) return '--:--';
        const d = new Date(value);
        return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    };

    proto.applyLiveRoomReactions = function applyLiveRoomReactions(reactions = []) {
        const rows = Array.isArray(reactions) ? reactions : [];
        if (!rows.length) return;
        const seen = this.liveRoomState.seenReactionIds || new Set();
        const now = Date.now();
        rows.forEach((row) => {
            const rid = String(row.id || '');
            if (!rid || seen.has(rid)) return;
            seen.add(rid);
            if (now - (parseInt(row.createdAt, 10) || 0) <= 18000) {
                this.animateLiveReaction(row.emoji || '🔥');
            }
        });
        if (seen.size > 1200) {
            const fresh = new Set();
            rows.slice(0, 300).forEach((row) => {
                if (row && row.id) fresh.add(String(row.id));
            });
            this.liveRoomState.seenReactionIds = fresh;
        } else {
            this.liveRoomState.seenReactionIds = seen;
        }
    };

    proto.animateLiveReaction = function animateLiveReaction(emoji = '🔥') {
        if (!this.liveRoomReactionLayer) return;
        const bubble = document.createElement('span');
        bubble.className = 'live-room-reaction-float';
        bubble.textContent = emoji;
        bubble.style.left = `${12 + Math.random() * 76}%`;
        bubble.style.animationDelay = `${Math.random() * 0.12}s`;
        this.liveRoomReactionLayer.appendChild(bubble);
        setTimeout(() => {
            if (bubble && bubble.parentNode) bubble.parentNode.removeChild(bubble);
        }, 1800);
    };

    proto.sendLiveRoomMessage = async function sendLiveRoomMessage() {
        const sessionId = this.liveRoomState && this.liveRoomState.sessionId ? this.liveRoomState.sessionId : null;
        if (!sessionId || !this.liveRoomInput) return;
        const text = this.liveRoomInput.value.trim();
        if (!text) return;
        this.liveRoomInput.value = '';
        try {
            await firebaseService.sendLiveMessage(sessionId, text, { type: 'text' });
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось отправить сообщение', 'error');
        }
    };

    proto.sendLiveRoomReaction = async function sendLiveRoomReaction(reactionKey = 'fire') {
        const sessionId = this.liveRoomState && this.liveRoomState.sessionId ? this.liveRoomState.sessionId : null;
        if (!sessionId) return;
        const preset = (firebaseService && typeof firebaseService.getLiveReactionPreset === 'function')
            ? firebaseService.getLiveReactionPreset(reactionKey)
            : { emoji: '🔥' };
        this.animateLiveReaction(preset.emoji || '🔥');
        try {
            await firebaseService.sendLiveReaction(sessionId, reactionKey);
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось отправить реакцию', 'error');
        }
    };

    proto.pinActiveLiveMessage = async function pinActiveLiveMessage(messageId) {
        const sessionId = this.liveRoomState && this.liveRoomState.sessionId ? this.liveRoomState.sessionId : null;
        if (!sessionId || !messageId) return;
        if (!(this.liveRoomState.role === 'owner' || this.liveRoomState.role === 'cohost')) return;
        const row = (this.liveRoomState.messages || []).find((m) => String(m.id || '') === String(messageId));
        if (!row) return;
        try {
            await firebaseService.pinLiveMessage(sessionId, row);
            AdvancedViewRenderer.showToast('Сообщение закреплено', 'success');
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось закрепить сообщение', 'error');
        }
    };

    proto.clearActiveLivePin = async function clearActiveLivePin() {
        const sessionId = this.liveRoomState && this.liveRoomState.sessionId ? this.liveRoomState.sessionId : null;
        if (!sessionId) return;
        if (!(this.liveRoomState.role === 'owner' || this.liveRoomState.role === 'cohost')) return;
        try {
            await firebaseService.clearLivePinnedMessage(sessionId);
            AdvancedViewRenderer.showToast('Закреп снят', 'success');
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось снять закреп', 'error');
        }
    };

    proto.editActiveLiveTitle = async function editActiveLiveTitle() {
        const sessionId = this.liveRoomState && this.liveRoomState.sessionId ? this.liveRoomState.sessionId : null;
        const session = this.liveRoomState && this.liveRoomState.session ? this.liveRoomState.session : null;
        if (!sessionId || !session) return;
        if (!(this.liveRoomState.role === 'owner' || this.liveRoomState.role === 'cohost')) return;
        const value = window.prompt('Новое название эфира', session.title || '');
        if (value === null) return;
        const nextTitle = String(value || '').trim();
        if (!nextTitle) return;
        try {
            await firebaseService.updateLiveSessionTitle(sessionId, nextTitle);
            AdvancedViewRenderer.showToast('Название обновлено', 'success');
        } catch (error) {
            console.error(error);
            AdvancedViewRenderer.showToast(error?.message || 'Не удалось обновить название', 'error');
        }
    };

    proto.handleLiveRoomLeaveAction = async function handleLiveRoomLeaveAction() {
        const session = this.liveRoomState && this.liveRoomState.session ? this.liveRoomState.session : null;
        const sessionId = this.liveRoomState && this.liveRoomState.sessionId ? this.liveRoomState.sessionId : null;
        if (!session || !sessionId) {
            this.closeLiveRoom({ leaveSession: false });
            return;
        }

        if (this.liveRoomState.role === 'owner') {
            const ok = window.confirm('Завершить эфир для всех зрителей?');
            if (!ok) return;
            try {
                await firebaseService.endLiveSession(sessionId);
                AdvancedViewRenderer.showToast('Эфир завершен', 'success');
            } catch (error) {
                console.error(error);
                AdvancedViewRenderer.showToast(error?.message || 'Не удалось завершить эфир', 'error');
                return;
            }
            await this.closeLiveRoom({ leaveSession: false });
            await this.refreshLiveSessions({ silent: true });
            return;
        }

        await this.closeLiveRoom({ leaveSession: true });
    };

    proto.closeLiveRoom = async function closeLiveRoom({ leaveSession = true } = {}) {
        const sessionId = this.liveRoomState && this.liveRoomState.sessionId ? this.liveRoomState.sessionId : null;
        this.resetLiveRoomSubscriptions();

        if (this.liveRoomModal) this.liveRoomModal.classList.remove('open');
        document.body.classList.remove('live-room-open');
        this.state.activeLiveSessionId = null;

        this.liveRoomState.sessionId = null;
        this.liveRoomState.session = null;
        this.liveRoomState.role = 'viewer';
        this.liveRoomState.messages = [];
        this.liveRoomState.audience = [];
        this.liveRoomState.seenReactionIds = new Set();

        if (leaveSession && sessionId && isFirebaseLiveReady() && typeof firebaseService.leaveLiveSession === 'function') {
            try {
                await firebaseService.leaveLiveSession(sessionId);
            } catch (_) {}
        }

        await this.refreshLiveSessions({ silent: true });
    };

    // Override with compatibility-aware support checks.
    proto.ensureLiveVideoModeForSession = async function ensureLiveVideoModeForSession() {
        const session = this.liveRoomState && this.liveRoomState.session ? this.liveRoomState.session : null;
        if (!session) return;

        const compat = getWebRtcCompat();
        const supportError = typeof compat.getSupportErrorMessage === 'function'
            ? compat.getSupportErrorMessage()
            : '';
        const peerCtor = typeof compat.getPeerConnectionCtor === 'function'
            ? compat.getPeerConnectionCtor()
            : null;

        if (supportError || typeof peerCtor !== 'function') {
            if (this.liveRoomVideoPlaceholder) {
                this.liveRoomVideoPlaceholder.style.display = '';
                this.liveRoomVideoPlaceholder.textContent = supportError || '\u0412\u0430\u0448 \u0431\u0440\u0430\u0443\u0437\u0435\u0440 \u043d\u0435 \u043f\u043e\u0434\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0435\u0442 WebRTC';
            }
            return;
        }

        this.setupLiveSignalListener();

        const myUid = getCurrentUid();
        const ownerUid = String(session.ownerUid || '');
        if (!myUid || !ownerUid) return;

        if (String(myUid) === ownerUid) {
            try {
                const stream = await this.ensureLiveLocalStream();
                if (this.liveRoomMainVideo) {
                    this.liveRoomMainVideo.srcObject = stream;
                    this.liveRoomMainVideo.muted = true;
                    this.liveRoomMainVideo.play().catch(() => {});
                }
                if (this.liveRoomVideoPlaceholder) {
                    this.liveRoomVideoPlaceholder.style.display = 'none';
                }
                if (this.liveRoomUnmuteBtn) {
                    this.liveRoomUnmuteBtn.style.display = 'none';
                }
            } catch (mediaError) {
                if (this.liveRoomVideoPlaceholder) {
                    this.liveRoomVideoPlaceholder.style.display = '';
                    this.liveRoomVideoPlaceholder.textContent = mediaError?.message || '\u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u043a \u043a\u0430\u043c\u0435\u0440\u0435/\u043c\u0438\u043a\u0440\u043e\u0444\u043e\u043d\u0443';
                }
                AdvancedViewRenderer.showToast(mediaError?.message || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0432\u043a\u043b\u044e\u0447\u0438\u0442\u044c \u043a\u0430\u043c\u0435\u0440\u0443/\u043c\u0438\u043a\u0440\u043e\u0444\u043e\u043d', 'error');
            }
            return;
        }

        const rtc = this.liveRoomRtc;
        if (!rtc.announcedOwnerJoin) {
            rtc.announcedOwnerJoin = true;
            await this.sendLiveSignalTo(ownerUid, 'viewer-join', { wantVideo: true });
        }
        if (this.liveRoomMainVideo) {
            this.liveRoomMainVideo.muted = true;
        }
        if (this.liveRoomUnmuteBtn) {
            this.liveRoomUnmuteBtn.style.display = 'none';
        }
    };
})(typeof window !== 'undefined' ? window : globalThis);
