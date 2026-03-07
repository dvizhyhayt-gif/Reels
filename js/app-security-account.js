/**
 * Security account settings module.
 * Adds email/password change controls to the security center.
 */
(function attachSecurityAccountModule(globalObject) {
    'use strict';

    if (!globalObject) return;
    const AppCtor = globalObject.AdvancedApp || (typeof AdvancedApp !== 'undefined' ? AdvancedApp : null);
    if (!AppCtor || !AppCtor.prototype) return;

    const proto = AppCtor.prototype;
    if (proto.__securityAccountPatched) return;
    proto.__securityAccountPatched = true;

    const TEXT = {
        cardTitle: '\u0414\u0430\u043d\u043d\u044b\u0435 \u0430\u043a\u043a\u0430\u0443\u043d\u0442\u0430',
        currentEmail: '\u0422\u0435\u043a\u0443\u0449\u0438\u0439 email',
        newEmail: '\u041d\u043e\u0432\u044b\u0439 email',
        currentPasswordForEmail: '\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u043f\u0430\u0440\u043e\u043b\u044c (\u0434\u043b\u044f email)',
        saveEmail: '\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c email',
        currentPassword: '\u0422\u0435\u043a\u0443\u0449\u0438\u0439 \u043f\u0430\u0440\u043e\u043b\u044c',
        newPassword: '\u041d\u043e\u0432\u044b\u0439 \u043f\u0430\u0440\u043e\u043b\u044c',
        confirmPassword: '\u041f\u043e\u0432\u0442\u043e\u0440\u0438\u0442\u0435 \u043d\u043e\u0432\u044b\u0439 \u043f\u0430\u0440\u043e\u043b\u044c',
        savePassword: '\u0418\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u044c',
        showPasswords: '\u041f\u043e\u043a\u0430\u0437\u0430\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u0438',
        emailPlaceholder: 'new@example.com',
        waitingFirebase: 'Firebase \u0435\u0449\u0435 \u043d\u0435 \u0433\u043e\u0442\u043e\u0432',
        enterNewEmail: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u043e\u0432\u044b\u0439 email',
        emailInvalid: '\u041d\u0435\u0432\u0435\u0440\u043d\u044b\u0439 \u0444\u043e\u0440\u043c\u0430\u0442 email',
        enterCurrentPassword: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u0442\u0435\u043a\u0443\u0449\u0438\u0439 \u043f\u0430\u0440\u043e\u043b\u044c',
        emailSaved: 'Email \u0438\u0437\u043c\u0435\u043d\u0435\u043d. \u041f\u0440\u043e\u0432\u0435\u0440\u044c\u0442\u0435 \u043f\u043e\u0447\u0442\u0443',
        saveProcess: '\u0421\u043e\u0445\u0440\u0430\u043d\u0435\u043d\u0438\u0435...',
        enterNewPassword: '\u0412\u0432\u0435\u0434\u0438\u0442\u0435 \u043d\u043e\u0432\u044b\u0439 \u043f\u0430\u0440\u043e\u043b\u044c',
        passwordTooShort: '\u041d\u043e\u0432\u044b\u0439 \u043f\u0430\u0440\u043e\u043b\u044c \u0434\u043e\u043b\u0436\u0435\u043d \u0431\u044b\u0442\u044c \u043c\u0438\u043d\u0438\u043c\u0443\u043c 6 \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432',
        passwordMismatch: '\u041f\u0430\u0440\u043e\u043b\u0438 \u043d\u0435 \u0441\u043e\u0432\u043f\u0430\u0434\u0430\u044e\u0442',
        passwordSaved: '\u041f\u0430\u0440\u043e\u043b\u044c \u0438\u0437\u043c\u0435\u043d\u0435\u043d'
    };

    function isFirebaseReady() {
        return !!(firebaseService
            && typeof firebaseService.isInitialized === 'function'
            && firebaseService.isInitialized());
    }

    function isEmailValid(email = '') {
        const value = String(email || '').trim();
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    proto.cacheSecurityAccountElements = function cacheSecurityAccountElements() {
        this.securityAccountCard = document.getElementById('security-account-card');
        this.securityEmailCurrentInput = document.getElementById('security-email-current');
        this.securityEmailNewInput = document.getElementById('security-email-new');
        this.securityEmailPasswordInput = document.getElementById('security-email-password');
        this.securityEmailSaveBtn = document.getElementById('security-email-save-btn');
        this.securityPasswordCurrentInput = document.getElementById('security-password-current');
        this.securityPasswordNewInput = document.getElementById('security-password-new');
        this.securityPasswordConfirmInput = document.getElementById('security-password-confirm');
        this.securityPasswordSaveBtn = document.getElementById('security-password-save-btn');
        this.securityShowPasswordsToggle = document.getElementById('security-show-passwords');
    };

    proto.ensureSecurityAccountSection = function ensureSecurityAccountSection() {
        const securityView = document.getElementById('security-view');
        if (!securityView) return;
        const container = securityView.querySelector('.security-view-container');
        if (!container) return;

        let card = document.getElementById('security-account-card');
        if (!card) {
            card = document.createElement('section');
            card.className = 'security-card security-account-card';
            card.id = 'security-account-card';
            card.innerHTML = `
                <h4>${TEXT.cardTitle}</h4>
                <div class="security-account-grid">
                    <label class="security-account-field">
                        <span>${TEXT.currentEmail}</span>
                        <input id="security-email-current" type="email" class="form-input" readonly>
                    </label>
                    <label class="security-account-field">
                        <span>${TEXT.newEmail}</span>
                        <input id="security-email-new" type="email" class="form-input" placeholder="${TEXT.emailPlaceholder}">
                    </label>
                    <label class="security-account-field">
                        <span>${TEXT.currentPasswordForEmail}</span>
                        <input id="security-email-password" type="password" class="form-input" autocomplete="current-password">
                    </label>
                    <button id="security-email-save-btn" class="primary-btn security-account-btn" type="button">${TEXT.saveEmail}</button>
                    <label class="security-account-field">
                        <span>${TEXT.currentPassword}</span>
                        <input id="security-password-current" type="password" class="form-input" autocomplete="current-password">
                    </label>
                    <label class="security-account-field">
                        <span>${TEXT.newPassword}</span>
                        <input id="security-password-new" type="password" class="form-input" autocomplete="new-password">
                    </label>
                    <label class="security-account-field">
                        <span>${TEXT.confirmPassword}</span>
                        <input id="security-password-confirm" type="password" class="form-input" autocomplete="new-password">
                    </label>
                    <button id="security-password-save-btn" class="primary-btn security-account-btn" type="button">${TEXT.savePassword}</button>
                    <label class="security-account-toggle">
                        <input id="security-show-passwords" type="checkbox">
                        <span>${TEXT.showPasswords}</span>
                    </label>
                </div>
            `;

            const sessionCard = container.querySelector('.security-session-list')
                ? container.querySelector('.security-session-list').closest('.security-card')
                : null;
            if (sessionCard && sessionCard.parentNode === container) {
                container.insertBefore(card, sessionCard);
            } else {
                container.appendChild(card);
            }
        }

        this.cacheSecurityAccountElements();
    };

    proto.refreshSecurityAccountSection = function refreshSecurityAccountSection() {
        this.ensureSecurityAccountSection();
        const currentUser = this.dataService && typeof this.dataService.getCurrentUser === 'function'
            ? this.dataService.getCurrentUser()
            : null;
        if (this.securityEmailCurrentInput) {
            this.securityEmailCurrentInput.value = String((currentUser && currentUser.email) || '');
        }
    };

    proto.bindSecurityAccountEvents = function bindSecurityAccountEvents() {
        this.ensureSecurityAccountSection();
        this.cacheSecurityAccountElements();

        if (this.securityShowPasswordsToggle && this.securityShowPasswordsToggle.dataset.bound !== '1') {
            this.securityShowPasswordsToggle.dataset.bound = '1';
            this.securityShowPasswordsToggle.addEventListener('change', () => {
                const isVisible = !!this.securityShowPasswordsToggle.checked;
                const type = isVisible ? 'text' : 'password';
                [
                    this.securityEmailPasswordInput,
                    this.securityPasswordCurrentInput,
                    this.securityPasswordNewInput,
                    this.securityPasswordConfirmInput
                ].forEach((input) => {
                    if (!input) return;
                    input.type = type;
                });
            });
        }

        if (this.securityEmailSaveBtn && this.securityEmailSaveBtn.dataset.bound !== '1') {
            this.securityEmailSaveBtn.dataset.bound = '1';
            this.securityEmailSaveBtn.addEventListener('click', async () => {
                if (!isFirebaseReady()) {
                    AdvancedViewRenderer.showToast(TEXT.waitingFirebase, 'warning');
                    return;
                }
                if (typeof firebaseService.changeCurrentUserEmail !== 'function') {
                    AdvancedViewRenderer.showToast('\u0041\u0050\u0049 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f email \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d', 'warning');
                    return;
                }

                const newEmail = this.securityEmailNewInput ? this.securityEmailNewInput.value.trim() : '';
                const currentPassword = this.securityEmailPasswordInput ? this.securityEmailPasswordInput.value : '';
                if (!newEmail) {
                    AdvancedViewRenderer.showToast(TEXT.enterNewEmail, 'warning');
                    return;
                }
                if (!isEmailValid(newEmail)) {
                    AdvancedViewRenderer.showToast(TEXT.emailInvalid, 'warning');
                    return;
                }
                if (!String(currentPassword || '').trim()) {
                    AdvancedViewRenderer.showToast(TEXT.enterCurrentPassword, 'warning');
                    return;
                }

                const button = this.securityEmailSaveBtn;
                const prevText = button.textContent;
                button.disabled = true;
                button.textContent = TEXT.saveProcess;
                try {
                    await firebaseService.changeCurrentUserEmail(newEmail, currentPassword);
                    if (this.securityEmailNewInput) this.securityEmailNewInput.value = '';
                    if (this.securityEmailPasswordInput) this.securityEmailPasswordInput.value = '';
                    this.refreshSecurityAccountSection();
                    this.updateProfileUI();
                    AdvancedViewRenderer.showToast(TEXT.emailSaved, 'success');
                } catch (error) {
                    AdvancedViewRenderer.showToast(error?.message || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c email', 'error');
                } finally {
                    button.disabled = false;
                    button.textContent = prevText;
                }
            });
        }

        if (this.securityPasswordSaveBtn && this.securityPasswordSaveBtn.dataset.bound !== '1') {
            this.securityPasswordSaveBtn.dataset.bound = '1';
            this.securityPasswordSaveBtn.addEventListener('click', async () => {
                if (!isFirebaseReady()) {
                    AdvancedViewRenderer.showToast(TEXT.waitingFirebase, 'warning');
                    return;
                }
                if (typeof firebaseService.changeCurrentUserPassword !== 'function') {
                    AdvancedViewRenderer.showToast('\u0041\u0050\u0049 \u0438\u0437\u043c\u0435\u043d\u0435\u043d\u0438\u044f \u043f\u0430\u0440\u043e\u043b\u044f \u043d\u0435\u0434\u043e\u0441\u0442\u0443\u043f\u0435\u043d', 'warning');
                    return;
                }

                const currentPassword = this.securityPasswordCurrentInput ? this.securityPasswordCurrentInput.value : '';
                const newPassword = this.securityPasswordNewInput ? this.securityPasswordNewInput.value : '';
                const confirmPassword = this.securityPasswordConfirmInput ? this.securityPasswordConfirmInput.value : '';

                if (!String(currentPassword || '').trim()) {
                    AdvancedViewRenderer.showToast(TEXT.enterCurrentPassword, 'warning');
                    return;
                }
                if (!String(newPassword || '').trim()) {
                    AdvancedViewRenderer.showToast(TEXT.enterNewPassword, 'warning');
                    return;
                }
                if (String(newPassword).length < 6) {
                    AdvancedViewRenderer.showToast(TEXT.passwordTooShort, 'warning');
                    return;
                }
                if (String(newPassword) !== String(confirmPassword)) {
                    AdvancedViewRenderer.showToast(TEXT.passwordMismatch, 'warning');
                    return;
                }

                const button = this.securityPasswordSaveBtn;
                const prevText = button.textContent;
                button.disabled = true;
                button.textContent = TEXT.saveProcess;
                try {
                    await firebaseService.changeCurrentUserPassword(currentPassword, newPassword);
                    if (this.securityPasswordCurrentInput) this.securityPasswordCurrentInput.value = '';
                    if (this.securityPasswordNewInput) this.securityPasswordNewInput.value = '';
                    if (this.securityPasswordConfirmInput) this.securityPasswordConfirmInput.value = '';
                    AdvancedViewRenderer.showToast(TEXT.passwordSaved, 'success');
                } catch (error) {
                    AdvancedViewRenderer.showToast(error?.message || '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u0438\u0437\u043c\u0435\u043d\u0438\u0442\u044c \u043f\u0430\u0440\u043e\u043b\u044c', 'error');
                } finally {
                    button.disabled = false;
                    button.textContent = prevText;
                }
            });
        }
    };

    const ORIGINAL_SETUP_SECURITY_EVENTS = proto.setupSecurityEvents;
    proto.setupSecurityEvents = function wrappedSetupSecurityEvents(...args) {
        const result = ORIGINAL_SETUP_SECURITY_EVENTS.apply(this, args);
        this.ensureSecurityAccountSection();
        this.bindSecurityAccountEvents();
        this.refreshSecurityAccountSection();
        return result;
    };

    const ORIGINAL_LOAD_SECURITY_SESSIONS = proto.loadSecuritySessions;
    proto.loadSecuritySessions = async function wrappedLoadSecuritySessions(...args) {
        const result = await ORIGINAL_LOAD_SECURITY_SESSIONS.apply(this, args);
        this.refreshSecurityAccountSection();
        return result;
    };
})(typeof window !== 'undefined' ? window : null);
