// Extracted profile/deeplink logic from js/app.js.
(function attachAppProfileModule(global) {
    'use strict';

    const AdvancedApp = global.AdvancedApp;
    if (!AdvancedApp || !AdvancedApp.prototype) {
        console.error('[app-profile] AdvancedApp is unavailable.');
        return;
    }

    AdvancedApp.prototype.setupDeepLinks = function() {
        window.addEventListener('hashchange', () => this.handleHashRoute());
        this.handleHashRoute();
    };

    AdvancedApp.prototype.handleHashRoute = function() {
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
    };

    AdvancedApp.prototype.openUserProfileByUid = async function(uid, { pushHash = true } = {}) {
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
        if (typeof this.setProfileViewMode === 'function') {
            this.setProfileViewMode('external');
        }

        if (pushHash) window.location.hash = `profile-${uid}`;
        this.navigateTo('profile-view');

        // quick skeleton
        document.getElementById('profile-name').textContent = '@\u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0430...';
        if (typeof this.updateProfileDisplayNameUi === 'function') {
            this.updateProfileDisplayNameUi('\u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0430...', false);
        }
        if (typeof this.setProfileTopHandle === 'function') {
            this.setProfileTopHandle('\u0437\u0430\u0433\u0440\u0443\u0437\u043a\u0430...');
        }
        document.getElementById('profile-bio').textContent = '';
        this.profileViewContext = {
            isOwn: false,
            profileUid: uid,
            baseVideos: [],
            loading: true
        };
        if (typeof this.applyProfileMediaTabsVisibility === 'function') {
            this.applyProfileMediaTabsVisibility({ isOwn: false });
        }
        if (typeof this.setProfileGridTab === 'function') {
            this.setProfileGridTab('videos', { rerender: false });
        }
        document.getElementById('profile-grid').innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--secondary-text);">
                <p>\u0417\u0430\u0433\u0440\u0443\u0437\u043a\u0430 \u043f\u0440\u043e\u0444\u0438\u043b\u044f...</p>
            </div>
        `;

        await this.loadAndRenderExternalProfile(uid);
    };

    AdvancedApp.prototype.loadAndRenderExternalProfile = async function(uid) {
        try {
            if (!(firebaseService && firebaseService.isInitialized())) {
                AdvancedViewRenderer.showToast('РџСЂРѕС„РёР»Рё РґРѕСЃС‚СѓРїРЅС‹ РїРѕСЃР»Рµ РїРѕРґРєР»СЋС‡РµРЅРёСЏ Р±Р°Р·С‹', 'warning');
                return;
            }

            const profile = await firebaseService.getUserProfile(uid);
            if (!profile || !profile.name) {
                AdvancedViewRenderer.showToast('РџСЂРѕС„РёР»СЊ РЅРµ РЅР°Р№РґРµРЅ', 'warning');
                return;
            }

            const current = firebaseService.getCurrentUser && firebaseService.getCurrentUser();
            const currentUid = current && current.uid;
            const isOwn = !!(currentUid && currentUid === uid);
            const subscriptions = current && Array.isArray(current.subscriptions) ? current.subscriptions.map(String) : [];
            const isSubscribedToTarget = !!(currentUid && subscriptions.includes(String(uid)));
            const canViewPrivateVideos = isOwn || profile.privateAccount !== true || isSubscribedToTarget;
            const allowAdult = !!(current && current.allowAdultContent === true && current.ageVerified === true);

            // Videos: РїСЂРёРІСЏР·С‹РІР°РµРј РїРѕ uid (РёРјСЏ РјРѕР¶РµС‚ РјРµРЅСЏС‚СЊСЃСЏ)
            let videos = [];
            if (canViewPrivateVideos && firebaseService.getVideosByUid) {
                videos = await firebaseService.getVideosByUid(uid, { includePrivate: isOwn });
            } else if (canViewPrivateVideos && firebaseService.getVideosByAuthor) {
                videos = await firebaseService.getVideosByAuthor(profile.name);
                if (!isOwn) {
                    videos = (videos || []).filter(v => v.private !== true);
                }
            } else if (canViewPrivateVideos) {
                // fallback: Р»РѕРєР°Р»СЊРЅС‹Р№ РїРѕРёСЃРє
                videos = this.dataService.userVideos.filter(v => (v.uid && uid) ? String(v.uid) === String(uid) : v.author === profile.name);
                if (!isOwn) {
                    videos = (videos || []).filter(v => v.private !== true);
                }
            }

            if (!isOwn && !allowAdult) {
                videos = (videos || []).filter(v => v.ageRestricted !== true);
            }

            const likesTotal = (videos || []).reduce((sum, v) => sum + (parseInt(v.likes, 10) || 0), 0);
            const followingCount = Array.isArray(profile.subscriptions) ? profile.subscriptions.length : 0;
            const followersCount = Array.isArray(profile.subscribers) ? profile.subscribers.length : 0;
            if (typeof this.setProfileViewMode === 'function') {
                this.setProfileViewMode(isOwn ? 'own' : 'external');
            }

            // Render header
            document.getElementById('profile-name').innerHTML = this.renderUserLabel(profile.name, !!profile.verified);
            document.getElementById('profile-avatar-img').src = profile.avatar || ('https://ui-avatars.com/api/?name=' + encodeURIComponent(profile.name) + '&background=random&size=150');
            const profileDisplayName = String(profile.displayName || profile.name || 'user').replace(/^@+/, '').trim() || 'user';
            if (typeof this.updateProfileDisplayNameUi === 'function') {
                this.updateProfileDisplayNameUi(profileDisplayName, !!profile.verified);
            } else {
                const displayNameEl = document.getElementById('profile-display-name');
                if (displayNameEl) {
                    displayNameEl.textContent = profileDisplayName;
                }
            }
            if (typeof this.setProfileTopHandle === 'function') {
                this.setProfileTopHandle(profile.name || profileDisplayName);
            }
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
                const genderLabels = { male: 'РњСѓР¶С‡РёРЅР°', female: 'Р–РµРЅС‰РёРЅР°', other: 'РќРµ СѓРєР°Р·Р°РЅРѕ' };
                document.getElementById('gender-text').textContent = genderLabels[v] || v;
            });

            document.getElementById('following-stat').querySelector('.stat-num').textContent = AdvancedViewRenderer.formatNumber(followingCount);
            document.getElementById('followers-stat').querySelector('.stat-num').textContent = AdvancedViewRenderer.formatNumber(followersCount);
            document.getElementById('likes-stat').querySelector('.stat-num').textContent = AdvancedViewRenderer.formatNumber(likesTotal);

            this.configureProfileActionButtons({
                isOwn,
                targetUid: uid,
                targetName: profile.name,
                targetVerified: !!profile.verified,
                targetProfile: profile
            });

            this.profileViewContext = {
                isOwn: !!isOwn,
                profileUid: uid,
                baseVideos: Array.isArray(videos) ? videos : [],
                loading: false
            };
            if (typeof this.applyProfileMediaTabsVisibility === 'function') {
                this.applyProfileMediaTabsVisibility({ isOwn: !!isOwn });
            }
            if (typeof this.setProfileGridTab === 'function') {
                this.setProfileGridTab('videos', { rerender: false });
            }

            const grid = document.getElementById('profile-grid');
            if (!canViewPrivateVideos) {
                if (typeof this.renderProfileGridMessage === 'function') {
                    this.renderProfileGridMessage(grid, 'Этот профиль приватный. Отправьте заявку на подписку.');
                } else {
                    grid.innerHTML = `
                        <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--secondary-text);">
                            <p>Этот профиль приватный. Отправьте заявку на подписку.</p>
                        </div>
                    `;
                }
                return;
            }

            if (typeof this.renderActiveProfileGrid === 'function') {
                this.renderActiveProfileGrid();
            }
        } catch (err) {
            console.error(err);
            AdvancedViewRenderer.showToast('РћС€РёР±РєР° Р·Р°РіСЂСѓР·РєРё РїСЂРѕС„РёР»СЏ', 'error');
        }
    };

    AdvancedApp.prototype.configureProfileActionButtons = function({ isOwn, targetUid = null, targetName = null } = {}) {
        const editBtn = document.getElementById('edit-profile-btn');
        const addStoryBtn = document.getElementById('add-story-btn');
        const openLiveBtn = document.getElementById('open-live-btn');
        const featureToggles = document.getElementById('profile-feature-toggles');
        const shareBtn = document.getElementById('share-profile-btn');
        const row = editBtn ? editBtn.parentElement : null;
        if (!row) return;
        row.dataset.profileActions = isOwn ? 'own' : 'external';

        let followBtn = document.getElementById('follow-profile-btn');
        let messageBtn = document.getElementById('message-profile-btn');
        let verifyBtn = document.getElementById('verify-profile-btn');
        const avatarStatus = document.querySelector('#profile-view .profile-avatar-status');

        // own profile
        if (isOwn) {
            row.classList.add('profile-actions-own');
            row.classList.remove('profile-actions-external');
            if (followBtn) followBtn.style.display = 'none';
            if (messageBtn) messageBtn.style.display = 'none';
            if (verifyBtn) verifyBtn.style.display = 'none';
            if (addStoryBtn) addStoryBtn.style.display = 'none';
            if (openLiveBtn) openLiveBtn.style.display = 'none';
            if (featureToggles) featureToggles.style.display = 'none';
            if (avatarStatus) avatarStatus.style.display = '';
            if (editBtn) {
                editBtn.style.display = '';
                editBtn.textContent = '\u0420\u0435\u0434\u0430\u043a\u0442\u0438\u0440\u043e\u0432\u0430\u0442\u044c';
            }
            if (shareBtn) {
                shareBtn.style.display = '';
                shareBtn.textContent = '\u041f\u043e\u0434\u0435\u043b\u0438\u0442\u044c\u0441\u044f';
            }
            return;
        }

        // external profile
        row.classList.remove('profile-actions-own');
        row.classList.add('profile-actions-external');
        if (addStoryBtn) addStoryBtn.style.display = 'none';
        if (openLiveBtn) openLiveBtn.style.display = 'none';
        if (featureToggles) featureToggles.style.display = 'none';
        if (editBtn) editBtn.style.display = 'none';
        if (shareBtn) shareBtn.style.display = 'none';
        if (avatarStatus) avatarStatus.style.display = '';

        if (!followBtn) {
            followBtn = document.createElement('button');
            followBtn.className = 'primary-btn profile-action-btn';
            followBtn.id = 'follow-profile-btn';
            row.insertBefore(followBtn, shareBtn || null);
        } else {
            followBtn.style.display = '';
        }

        if (!messageBtn) {
            messageBtn = document.createElement('button');
            messageBtn.className = 'primary-btn profile-action-btn profile-action-message';
            messageBtn.id = 'message-profile-btn';
            row.insertBefore(messageBtn, shareBtn || null);
        } else {
            messageBtn.style.display = '';
        }

        messageBtn.textContent = '\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435';
        messageBtn.onclick = async () => {
            await this.startProfileChat({ targetUid, targetName });
        };

        const current = firebaseService && firebaseService.getCurrentUser && firebaseService.getCurrentUser();
        if (verifyBtn) verifyBtn.style.display = 'none';

        const subscriptions = (current && Array.isArray(current.subscriptions)) ? current.subscriptions.map(String) : [];
        const isSubscribed = targetUid ? subscriptions.includes(String(targetUid)) : (targetName ? this.dataService.isSubscribed(targetName) : false);

        followBtn.textContent = isSubscribed
            ? '\u041e\u0442\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f'
            : '\u041f\u043e\u0434\u043f\u0438\u0441\u0430\u0442\u044c\u0441\u044f';

        followBtn.onclick = async () => {
            const user = this.dataService.getCurrentUser();
            if (!user) {
                this.navigateTo('auth-view');
                return;
            }

            if (!(firebaseService && firebaseService.isInitialized())) {
                AdvancedViewRenderer.showToast('РџРѕРґРїРёСЃРєРё РґРѕСЃС‚СѓРїРЅС‹ РїРѕСЃР»Рµ РїРѕРґРєР»СЋС‡РµРЅРёСЏ Р±Р°Р·С‹', 'warning');
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
                        AdvancedViewRenderer.showToast('Р’С‹ РѕС‚РїРёСЃР°Р»РёСЃСЊ', 'success');
                    } else {
                        const result = await firebaseService.subscribe(targetUid);
                        if (result && result.status === 'requested') {
                            AdvancedViewRenderer.showToast('Р—Р°СЏРІРєР° РЅР° РїРѕРґРїРёСЃРєСѓ РѕС‚РїСЂР°РІР»РµРЅР°', 'success');
                        } else if (current) {
                            current.subscriptions = Array.isArray(current.subscriptions) ? current.subscriptions : [];
                            if (!current.subscriptions.includes(targetUid)) current.subscriptions.push(targetUid);
                            AdvancedViewRenderer.showToast('Р’С‹ РїРѕРґРїРёСЃР°Р»РёСЃСЊ', 'success');
                        }
                    }
                } else if (targetName) {
                    // fallback: local-only subscriptions by name
                    if (isSubscribed) {
                        this.dataService.unsubscribe(targetName);
                        AdvancedViewRenderer.showToast('Р’С‹ РѕС‚РїРёСЃР°Р»РёСЃСЊ', 'success');
                    } else {
                        this.dataService.subscribe(targetName);
                        AdvancedViewRenderer.showToast('Р’С‹ РїРѕРґРїРёСЃР°Р»РёСЃСЊ', 'success');
                    }
                }

                // refresh label + stats
                if (targetUid) await this.loadAndRenderExternalProfile(targetUid);
            } catch (err) {
                console.error(err);
                AdvancedViewRenderer.showToast('РќРµ СѓРґР°Р»РѕСЃСЊ РёР·РјРµРЅРёС‚СЊ РїРѕРґРїРёСЃРєСѓ', 'error');
            } finally {
                followBtn.disabled = false;
            }
        };
    };

    AdvancedApp.prototype.startProfileChat = async function({ targetUid = null, targetName = null } = {}) {
        const currentUser = this.dataService.getCurrentUser();
        if (!currentUser) {
            this.navigateTo('auth-view');
            return;
        }

        if (!targetName) {
            AdvancedViewRenderer.showToast('РќРµ СѓРґР°Р»РѕСЃСЊ РѕРїСЂРµРґРµР»РёС‚СЊ РїРѕР»СѓС‡Р°С‚РµР»СЏ', 'error');
            return;
        }

        if (targetUid && currentUser.uid && targetUid === currentUser.uid) {
            AdvancedViewRenderer.showToast('РќРµР»СЊР·СЏ РЅР°РїРёСЃР°С‚СЊ СЃР°РјРѕРјСѓ СЃРµР±Рµ', 'warning');
            return;
        }

        const chatId = (targetUid && currentUser.uid)
            ? [currentUser.uid, targetUid].sort().join('_')
            : null;

        this.navigateTo('messages-view');
        await this.openChat(targetName, chatId, targetUid);
    };

})(window);


