// Profile topbar/account switcher module (my accounts only).
(function attachProfileTopbarModule(global) {
    'use strict';

    const AdvancedApp = global.AdvancedApp;
    if (!AdvancedApp || !AdvancedApp.prototype) {
        console.error('[app-profile-topbar] AdvancedApp is unavailable.');
        return;
    }

    const CONNECTED_ACCOUNTS_KEY = 'reelgram_connected_accounts_v1';
    const DEFAULT_AVATAR = 'assets/default-avatar.svg';
    const MAX_CONNECTED_ACCOUNTS = 6;

    const I18N = {
        accounts: '\u041c\u043e\u0438 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u044b',
        current: '\u0442\u0435\u043a\u0443\u0449\u0438\u0439',
        saved: '\u0441\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u043d\u044b\u0439 \u0430\u043a\u043a\u0430\u0443\u043d\u0442',
        addSecond: '\u0412\u043e\u0439\u0442\u0438 \u0432\u043e \u0432\u0442\u043e\u0440\u043e\u0439 \u0430\u043a\u043a\u0430\u0443\u043d\u0442',
        addAnother: '\u0414\u043e\u0431\u0430\u0432\u0438\u0442\u044c \u0435\u0449\u0435 \u0430\u043a\u043a\u0430\u0443\u043d\u0442',
        switchHint: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043f\u0430\u0440\u043e\u043b\u044c \u0434\u043b\u044f \u043f\u0435\u0440\u0435\u043a\u043b\u044e\u0447\u0435\u043d\u0438\u044f',
        useThis: '\u0412\u044b\u0431\u043e\u0440 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430'
    };

    function normalizeHandle(value) {
        const raw = String(value || '').replace(/\s+/g, ' ').trim();
        return raw.replace(/^@+/, '').trim();
    }

    function normalizeDisplayName(value) {
        const raw = String(value || '').replace(/\s+/g, ' ').trim();
        return raw.replace(/^@+/, '').trim();
    }

    function escapeText(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function sanitizeAvatar(url) {
        const src = String(url || '').trim();
        if (!src || src.includes('ui-avatars.com')) return DEFAULT_AVATAR;
        return src;
    }

    function normalizeAccount(item = {}) {
        return {
            uid: item && item.uid ? String(item.uid) : '',
            email: item && item.email ? String(item.email).trim() : '',
            name: normalizeHandle(item && item.name ? item.name : ''),
            displayName: normalizeDisplayName(item && item.displayName ? item.displayName : ''),
            avatar: sanitizeAvatar(item && item.avatar ? item.avatar : ''),
            lastUsed: Number(item && item.lastUsed) || Date.now()
        };
    }

    function readConnectedAccounts() {
        try {
            const parsed = JSON.parse(localStorage.getItem(CONNECTED_ACCOUNTS_KEY) || '[]');
            if (!Array.isArray(parsed)) return [];
            return parsed
                .map((row) => normalizeAccount(row))
                .filter((row) => row.uid)
                .sort((a, b) => (b.lastUsed || 0) - (a.lastUsed || 0));
        } catch (_) {
            return [];
        }
    }

    function writeConnectedAccounts(items) {
        try {
            const safe = (Array.isArray(items) ? items : [])
                .map((row) => normalizeAccount(row))
                .filter((row) => row.uid)
                .slice(0, MAX_CONNECTED_ACCOUNTS);
            localStorage.setItem(CONNECTED_ACCOUNTS_KEY, JSON.stringify(safe));
        } catch (_) {}
    }

    function upsertConnectedAccount(account = {}) {
        const safe = normalizeAccount(account);
        if (!safe.uid) return readConnectedAccounts();

        const existing = readConnectedAccounts().filter((item) => String(item.uid) !== safe.uid);
        existing.unshift({
            ...safe,
            lastUsed: Date.now()
        });
        writeConnectedAccounts(existing);
        return existing;
    }

    function ensureProfileDisplayNameElement() {
        let node = document.getElementById('profile-display-name');
        let row = document.getElementById('profile-display-name-row');

        if (!node) {
            const avatar = document.getElementById('profile-avatar-img');
            if (!avatar || !avatar.parentNode) return null;

            row = document.createElement('div');
            row.id = 'profile-display-name-row';
            row.className = 'profile-display-name-row';

            node = document.createElement('div');
            node.id = 'profile-display-name';
            node.className = 'profile-display-name';
            node.textContent = 'guest';
            row.appendChild(node);
            avatar.insertAdjacentElement('afterend', row);
        } else if (!row && node.parentElement) {
            row = node.parentElement;
        }

        let badge = document.getElementById('profile-display-verified-badge');
        if (!badge && row) {
            badge = document.createElement('img');
            badge.id = 'profile-display-verified-badge';
            badge.className = 'verified-badge profile-display-verified-badge';
            badge.src = 'assets/verified.png';
            badge.alt = 'верифицирован';
            badge.setAttribute('role', 'button');
            badge.setAttribute('tabindex', '0');
            badge.setAttribute('aria-label', 'Информация о верификации');
            badge.setAttribute('title', 'Верифицированный профиль');
            badge.style.display = 'none';
            row.appendChild(badge);
        } else if (badge && row && badge.parentElement !== row) {
            row.appendChild(badge);
        }

        return node;
    }

    function isProfileDisplayBadgeVisible() {
        const badge = document.getElementById('profile-display-verified-badge');
        if (!badge) return false;
        if (badge.hidden) return false;
        if (badge.style && badge.style.display === 'none') return false;
        if (typeof window.getComputedStyle === 'function') {
            const style = window.getComputedStyle(badge);
            return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
        }
        return true;
    }

    AdvancedApp.prototype.setProfileDisplayName = function(rawName = '', isVerified = false) {
        ensureProfileDisplayNameElement();
        const displayName = normalizeDisplayName(rawName || '');
        const verified = !!isVerified;

        if (typeof this.updateProfileDisplayNameUi === 'function') {
            this.updateProfileDisplayNameUi(displayName || 'guest', verified);
            return;
        }

        const node = document.getElementById('profile-display-name');
        if (node) {
            node.textContent = displayName || 'guest';
            node.classList.toggle('is-verified', verified);
        }

        const badgeEl = document.getElementById('profile-display-verified-badge');
        if (badgeEl) {
            badgeEl.style.display = verified ? 'inline-block' : 'none';
            badgeEl.setAttribute('aria-hidden', verified ? 'false' : 'true');
        }
    };

    AdvancedApp.prototype.rememberCurrentConnectedAccount = function() {
        const current = this.dataService && typeof this.dataService.getCurrentUser === 'function'
            ? this.dataService.getCurrentUser()
            : null;
        if (!current || !current.uid) return [];

        return upsertConnectedAccount({
            uid: current.uid,
            email: current.email || '',
            name: current.name || '',
            displayName: current.displayName || '',
            avatar: current.avatar || ''
        });
    };

    AdvancedApp.prototype.getConnectedAccounts = function() {
        return readConnectedAccounts();
    };

    AdvancedApp.prototype.getConnectedAccountByUid = function(uid) {
        const targetUid = String(uid || '').trim();
        if (!targetUid) return null;
        return this.getConnectedAccounts().find((item) => String(item.uid) === targetUid) || null;
    };

    AdvancedApp.prototype.openAccountSwitchAuth = function(account = null) {
        this.setProfileAccountMenuOpen(false);
        this.navigateTo('auth-view');

        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        if (registerForm) registerForm.style.display = 'none';
        if (loginForm) loginForm.style.display = 'block';

        const loginEmail = document.getElementById('login-email');
        const loginPass = document.getElementById('login-pass');
        if (loginEmail) loginEmail.value = account && account.email ? String(account.email) : '';
        if (loginPass) loginPass.value = '';

        if (loginEmail && typeof loginEmail.focus === 'function') {
            setTimeout(() => loginEmail.focus(), 80);
        }

        if (account && account.name) {
            AdvancedViewRenderer.showToast(`@${account.name}: ${I18N.switchHint}`, 'info');
        }
    };

    AdvancedApp.prototype.ensureProfileTopbar = function() {
        if (this._profileTopbarBound) return;

        const switchBtn = document.getElementById('profile-account-switch-btn');
        const menuEl = document.getElementById('profile-account-menu');
        const accountSwitchMenuBtn = document.getElementById('account-switch-menu');
        if (!menuEl) return;

        this._profileTopbarBound = true;

        if (switchBtn) {
            switchBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                const willOpen = !menuEl.classList.contains('open');
                this.setProfileAccountMenuOpen(willOpen);
            });
        }

        if (accountSwitchMenuBtn && accountSwitchMenuBtn.dataset.bound !== '1') {
            accountSwitchMenuBtn.dataset.bound = '1';
            accountSwitchMenuBtn.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (this.hamburgerBtn) this.hamburgerBtn.classList.remove('active');
                if (this.menuDropdown) this.menuDropdown.classList.remove('active');
                this.renderProfileAccountMenu();
                this.setProfileAccountMenuOpen(true);
            });
        }

        menuEl.addEventListener('click', async (event) => {
            const btn = event.target && event.target.closest ? event.target.closest('.profile-account-item') : null;
            if (!btn) return;

            const action = btn.dataset.action || '';
            const uid = btn.dataset.uid ? String(btn.dataset.uid) : '';
            this.setProfileAccountMenuOpen(false);

            if (action === 'account' && uid) {
                const currentUid = firebaseService && typeof firebaseService.getCurrentUid === 'function'
                    ? String(firebaseService.getCurrentUid() || '')
                    : '';

                if (currentUid && uid === currentUid) {
                    this.state.viewingProfileUid = null;
                    this.navigateTo('profile-view');
                    this.updateProfileUI();
                    return;
                }

                const account = this.getConnectedAccountByUid(uid);
                this.openAccountSwitchAuth(account);
                return;
            }

            if (action === 'add-second' || action === 'add-account') {
                this.openAccountSwitchAuth(null);
            }
        });

        document.addEventListener('click', (event) => {
            if (!menuEl.classList.contains('open')) return;
            if (menuEl.contains(event.target)) return;
            if (switchBtn && switchBtn.contains(event.target)) return;
            this.setProfileAccountMenuOpen(false);
        });
    };

    AdvancedApp.prototype.setProfileAccountMenuOpen = function(open) {
        const switchBtn = document.getElementById('profile-account-switch-btn');
        const menuEl = document.getElementById('profile-account-menu');
        if (!menuEl) return;

        const isOpen = !!open;
        if (switchBtn) {
            switchBtn.classList.toggle('open', isOpen);
            switchBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        }
        menuEl.classList.toggle('open', isOpen);
        menuEl.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    };

    AdvancedApp.prototype.renderProfileAccountMenu = function() {
        const menuEl = document.getElementById('profile-account-menu');
        if (!menuEl) return;

        const currentUser = this.dataService && this.dataService.getCurrentUser
            ? this.dataService.getCurrentUser()
            : null;
        const currentUid = currentUser && currentUser.uid ? String(currentUser.uid) : '';

        if (currentUser && currentUid) {
            this.rememberCurrentConnectedAccount();
        }

        const accounts = this.getConnectedAccounts();
        let html = '';
        html += `<div class="profile-account-menu-title">${I18N.accounts}</div>`;

        if (!accounts.length) {
            html += `
                <button type="button" class="profile-account-item" data-action="add-second">
                    <div class="profile-account-item-main">${I18N.addSecond}</div>
                    <div class="profile-account-item-sub">${I18N.switchHint}</div>
                </button>
            `;
            menuEl.innerHTML = html;
            return;
        }

        accounts.forEach((item) => {
            const isCurrent = currentUid && String(item.uid) === currentUid;
            const subLabel = isCurrent
                ? I18N.current
                : (item.email || I18N.saved);
            html += `
                <button type="button" class="profile-account-item${isCurrent ? ' active' : ''}" data-action="account" data-uid="${escapeText(item.uid)}">
                    <img src="${escapeText(sanitizeAvatar(item.avatar || ''))}" alt="${escapeText(item.name || 'user')}">
                    <div class="profile-account-item-main">@${escapeText(item.name || 'user')}</div>
                    <div class="profile-account-item-sub">${escapeText(subLabel)}</div>
                </button>
            `;
        });

        html += `<div class="profile-account-menu-title">${I18N.useThis}</div>`;
        html += `
            <button type="button" class="profile-account-item" data-action="${accounts.length < 2 ? 'add-second' : 'add-account'}">
                <div class="profile-account-item-main">${accounts.length < 2 ? I18N.addSecond : I18N.addAnother}</div>
                <div class="profile-account-item-sub">${I18N.switchHint}</div>
            </button>
        `;

        menuEl.innerHTML = html;
    };

    AdvancedApp.prototype.syncProfileTopbar = function({ isOwn = true, profileUid = '', profileName = '', profileDisplayName = '', profileVerified = false } = {}) {
        this.ensureProfileTopbar();

        const current = this.dataService && typeof this.dataService.getCurrentUser === 'function'
            ? this.dataService.getCurrentUser()
            : null;
        const currentProfile = this.dataService && typeof this.dataService.getUserProfile === 'function'
            ? this.dataService.getUserProfile()
            : null;
        const profileNameEl = document.getElementById('profile-name');
        const headerHasVerifiedBadge = !!(profileNameEl && profileNameEl.querySelector('.verified-badge'));
        const displayBadgeVisible = isProfileDisplayBadgeVisible();
        const displayName = isOwn
            ? (() => {
                if (current && current.displayName) return current.displayName;
                return current && current.name ? current.name : 'guest';
            })()
            : (profileDisplayName
                || profileName
                || (this.state && this.state.viewingProfileUid ? String(this.state.viewingProfileUid) : 'profile'));
        const verified = isOwn
            ? !!((currentProfile && currentProfile.verified) || (current && current.verified) || profileVerified || headerHasVerifiedBadge || displayBadgeVisible)
            : !!(profileVerified || headerHasVerifiedBadge || displayBadgeVisible);

        this.setProfileDisplayName(displayName, verified);
        this.renderProfileAccountMenu();
    };

    const originalUpdateProfileUI = AdvancedApp.prototype.updateProfileUI;
    if (typeof originalUpdateProfileUI === 'function') {
        AdvancedApp.prototype.updateProfileUI = function(...args) {
            const result = originalUpdateProfileUI.apply(this, args);

            Promise.resolve(result).finally(() => {
                const profileNameEl = document.getElementById('profile-name');
                const profileDisplayNameEl = document.getElementById('profile-display-name');
                const displayBadgeVisible = isProfileDisplayBadgeVisible();
                const current = this.dataService && typeof this.dataService.getCurrentUser === 'function'
                    ? this.dataService.getCurrentUser()
                    : null;
                const currentProfile = this.dataService && typeof this.dataService.getUserProfile === 'function'
                    ? this.dataService.getUserProfile()
                    : null;
                const isOwnProfile = !(this.state && this.state.viewingProfileUid);

                this.syncProfileTopbar({
                    isOwn: isOwnProfile,
                    profileUid: this.state && this.state.viewingProfileUid ? String(this.state.viewingProfileUid) : '',
                    profileName: isOwnProfile && current && current.name
                        ? normalizeHandle(current.name)
                        : (profileNameEl ? normalizeHandle(profileNameEl.textContent || '') : ''),
                    profileDisplayName: isOwnProfile && current && current.displayName
                        ? normalizeDisplayName(current.displayName)
                        : (profileDisplayNameEl ? normalizeDisplayName(profileDisplayNameEl.textContent || '') : ''),
                    profileVerified: isOwnProfile
                        ? !!((currentProfile && currentProfile.verified) || (current && current.verified) || displayBadgeVisible)
                        : !!((profileNameEl && profileNameEl.querySelector('.verified-badge')) || displayBadgeVisible)
                });
            });

            return result;
        };
    }

    const originalLoadAndRenderExternalProfile = AdvancedApp.prototype.loadAndRenderExternalProfile;
    if (typeof originalLoadAndRenderExternalProfile === 'function') {
        AdvancedApp.prototype.loadAndRenderExternalProfile = async function(uid, ...args) {
            const result = await originalLoadAndRenderExternalProfile.call(this, uid, ...args);

            const profileNameEl = document.getElementById('profile-name');
            const profileDisplayNameEl = document.getElementById('profile-display-name');
            const displayBadgeVisible = isProfileDisplayBadgeVisible();
            this.syncProfileTopbar({
                isOwn: false,
                profileUid: uid ? String(uid) : '',
                profileName: profileNameEl ? normalizeHandle(profileNameEl.textContent || '') : '',
                profileDisplayName: profileDisplayNameEl ? normalizeDisplayName(profileDisplayNameEl.textContent || '') : '',
                profileVerified: !!((profileNameEl && profileNameEl.querySelector('.verified-badge')) || displayBadgeVisible)
            });

            return result;
        };
    }

    const originalConfigureProfileActionButtons = AdvancedApp.prototype.configureProfileActionButtons;
    if (typeof originalConfigureProfileActionButtons === 'function') {
        AdvancedApp.prototype.configureProfileActionButtons = function(options = {}) {
            return originalConfigureProfileActionButtons.call(this, options);
        };
    }

    const originalNavigateTo = AdvancedApp.prototype.navigateTo;
    if (typeof originalNavigateTo === 'function') {
        AdvancedApp.prototype.navigateTo = function(viewId, ...args) {
            const result = originalNavigateTo.call(this, viewId, ...args);
            if (viewId !== 'profile-view') {
                this.setProfileAccountMenuOpen(false);
            } else {
                this.syncProfileTopbar({
                    isOwn: !(this.state && this.state.viewingProfileUid),
                    profileUid: this.state && this.state.viewingProfileUid ? String(this.state.viewingProfileUid) : ''
                });
            }
            return result;
        };
    }
})(window);
