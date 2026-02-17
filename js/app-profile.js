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
    };

    AdvancedApp.prototype.loadAndRenderExternalProfile = async function(uid) {
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
            const subscriptions = current && Array.isArray(current.subscriptions) ? current.subscriptions.map(String) : [];
            const isSubscribedToTarget = !!(currentUid && subscriptions.includes(String(uid)));
            const canViewPrivateVideos = isOwn || profile.privateAccount !== true || isSubscribedToTarget;
            const allowAdult = !!(current && current.allowAdultContent === true && current.ageVerified === true);

            // Videos: привязываем по uid (имя может меняться)
            let videos = [];
            if (canViewPrivateVideos && firebaseService.getVideosByUid) {
                videos = await firebaseService.getVideosByUid(uid, { includePrivate: isOwn });
            } else if (canViewPrivateVideos && firebaseService.getVideosByAuthor) {
                videos = await firebaseService.getVideosByAuthor(profile.name);
                if (!isOwn) {
                    videos = (videos || []).filter(v => v.private !== true);
                }
            } else if (canViewPrivateVideos) {
                // fallback: локальный поиск
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

            this.configureProfileActionButtons({
                isOwn,
                targetUid: uid,
                targetName: profile.name,
                targetVerified: !!profile.verified,
                targetProfile: profile
            });

            // Render grid
            const grid = document.getElementById('profile-grid');
            if (!canViewPrivateVideos) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--secondary-text);">
                        <p>Этот профиль приватный. Отправьте заявку на подписку.</p>
                    </div>
                `;
                return;
            }

            if (!videos || videos.length === 0) {
                grid.innerHTML = `
                    <div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--secondary-text);">
                        <p>У пользователя пока нет видео</p>
                    </div>
                `;
                return;
            }

            grid.innerHTML = '';
            const list = Array.isArray(videos) ? videos : [];

            list.forEach(v => {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item';
                gridItem.dataset.id = v.id;
                if (v.firestoreId) gridItem.dataset.firestoreId = v.firestoreId;

                const safeUrl = this.escapeHtml(v.url || '');
                const safePoster = v.thumbnail ? this.escapeHtml(v.thumbnail) : '';
                const posterAttr = safePoster ? ` poster="${safePoster}"` : '';

                gridItem.innerHTML = `
                    <video muted playsinline preload="none" data-src="${safeUrl}"${posterAttr}></video>
                    <div class="grid-overlay">
                        <span>▶ ${v.views || 0}</span>
                    </div>
                `;

                gridItem.addEventListener('click', () => {
                    const startIndex = list.findIndex(x => String(x.id) === String(v.id));
                    this.enterCustomFeedMode(list, { startIndex: startIndex >= 0 ? startIndex : 0, returnViewId: 'profile-view' });
                });

                grid.appendChild(gridItem);
            });

            this.setupProfileGridPreviews(grid);
        } catch (err) {
            console.error(err);
            AdvancedViewRenderer.showToast('Ошибка загрузки профиля', 'error');
        }
    };

    AdvancedApp.prototype.configureProfileActionButtons = function({ isOwn, targetUid = null, targetName = null, targetVerified = false, targetProfile = null } = {}) {
        const editBtn = document.getElementById('edit-profile-btn');
        const addStoryBtn = document.getElementById('add-story-btn');
        const openLiveBtn = document.getElementById('open-live-btn');
        const featureToggles = document.getElementById('profile-feature-toggles');
        const coinsBadge = document.getElementById('profile-coins-badge');
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
            if (addStoryBtn) addStoryBtn.style.display = '';
            if (openLiveBtn) openLiveBtn.style.display = '';
            if (featureToggles) featureToggles.style.display = '';
            if (coinsBadge) coinsBadge.style.display = '';
            if (editBtn) {
                editBtn.style.display = '';
                editBtn.textContent = 'Редактировать';
            }
            return;
        }

        // external profile
        if (addStoryBtn) addStoryBtn.style.display = 'none';
        if (openLiveBtn) openLiveBtn.style.display = 'none';
        if (featureToggles) featureToggles.style.display = 'none';
        if (coinsBadge) coinsBadge.style.display = 'none';
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
        const canManageVerification = !!(this.isCurrentUserAdmin() && targetUid);
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

        const subscriptions = (current && Array.isArray(current.subscriptions)) ? current.subscriptions.map(String) : [];
        const isSubscribed = targetUid ? subscriptions.includes(String(targetUid)) : (targetName ? this.dataService.isSubscribed(targetName) : false);
        const requests = (targetProfile && Array.isArray(targetProfile.followRequests)) ? targetProfile.followRequests.map(String) : [];
        const currentUid = current && current.uid ? String(current.uid) : '';
        const isRequested = !!(targetUid && currentUid && requests.includes(currentUid));
        const isPrivateAccount = !!(targetProfile && targetProfile.privateAccount === true);

        followBtn.textContent = isSubscribed
            ? 'Отписаться'
            : (isRequested ? 'Запрос отправлен' : (isPrivateAccount ? 'Запросить доступ' : 'Подписаться'));

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
                    } else if (isRequested) {
                        await firebaseService.unsubscribe(targetUid);
                        AdvancedViewRenderer.showToast('Заявка отменена', 'info');
                    } else {
                        const result = await firebaseService.subscribe(targetUid);
                        if (result && result.status === 'requested') {
                            AdvancedViewRenderer.showToast('Заявка на подписку отправлена', 'success');
                        } else if (current) {
                            current.subscriptions = Array.isArray(current.subscriptions) ? current.subscriptions : [];
                            if (!current.subscriptions.includes(targetUid)) current.subscriptions.push(targetUid);
                            AdvancedViewRenderer.showToast('Вы подписались', 'success');
                        }
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
    };

    AdvancedApp.prototype.startProfileChat = async function({ targetUid = null, targetName = null } = {}) {
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
    };

})(window);
