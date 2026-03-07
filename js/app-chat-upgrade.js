/**
 * Chat Upgrade module.
 * - Voice messages (hold to record).
 * - Better video-circle recorder modal.
 * - Modern emoji picker (emoji-picker-element) with graceful fallback.
 */
(function attachChatUpgradeModule(globalObject) {
    'use strict';

    if (!globalObject) return;
    const AppCtor = globalObject.AdvancedApp || (typeof AdvancedApp !== 'undefined' ? AdvancedApp : null);
    if (!AppCtor || !AppCtor.prototype) return;

    const proto = AppCtor.prototype;
    if (proto.__chatUpgradePatched) return;
    proto.__chatUpgradePatched = true;

    const TEXT = {
        voiceLabel: '\u0413\u043e\u043b\u043e\u0441',
        voiceHoldHint: '\u0423\u0434\u0435\u0440\u0436\u0438\u0432\u0430\u0439 \u0434\u043b\u044f \u0437\u0430\u043f\u0438\u0441\u0438',
        noChat: '\u0421\u043d\u0430\u0447\u0430\u043b\u0430 \u0432\u044b\u0431\u0435\u0440\u0438\u0442\u0435 \u0447\u0430\u0442',
        noMic: '\u041d\u0435 \u0434\u0430\u043d \u0434\u043e\u0441\u0442\u0443\u043f \u043a \u043c\u0438\u043a\u0440\u043e\u0444\u043e\u043d\u0443',
        voiceTooShort: '\u0413\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0435 \u0441\u043b\u0438\u0448\u043a\u043e\u043c \u043a\u043e\u0440\u043e\u0442\u043a\u043e\u0435',
        voiceSent: '\u0413\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0435 \u043e\u0442\u043f\u0440\u0430\u0432\u043b\u0435\u043d\u043e',
        circleTitle: '\u0412\u0438\u0434\u0435\u043e\u043a\u0440\u0443\u0436\u043e\u043a',
        circleStart: '\u0421\u0442\u0430\u0440\u0442',
        circleStop: '\u0421\u0442\u043e\u043f',
        circleClose: '\u0417\u0430\u043a\u0440\u044b\u0442\u044c',
        circleGallery: '\u0418\u0437 \u0433\u0430\u043b\u0435\u0440\u0435\u0438',
        circleNoCamera: '\u041d\u0435\u0442 \u0434\u043e\u0441\u0442\u0443\u043f\u0430 \u043a \u043a\u0430\u043c\u0435\u0440\u0435',
        voicePreview: '\ud83c\udfa4 \u0413\u043e\u043b\u043e\u0441\u043e\u0432\u043e\u0435',
        circlePreview: '\ud83c\udfa5 \u0412\u0438\u0434\u0435\u043e\u043a\u0440\u0443\u0436\u043e\u043a'
    };

    function stopTracks(stream) {
        if (!stream || typeof stream.getTracks !== 'function') return;
        stream.getTracks().forEach((track) => {
            try { track.stop(); } catch (_) {}
        });
    }

    function chooseSupportedMime(candidates, fallback = '') {
        const list = Array.isArray(candidates) ? candidates : [];
        if (typeof MediaRecorder === 'undefined') return fallback;
        if (typeof MediaRecorder.isTypeSupported !== 'function') return fallback;
        for (let i = 0; i < list.length; i += 1) {
            const mime = list[i];
            try {
                if (MediaRecorder.isTypeSupported(mime)) return mime;
            } catch (_) {}
        }
        return fallback;
    }

    function makeFileFromBlob(blob, fileName, mimeType) {
        try {
            return new File([blob], fileName, { type: mimeType || blob.type || 'application/octet-stream' });
        } catch (_) {
            blob.name = fileName;
            return blob;
        }
    }

    function formatMs(ms) {
        const value = Math.max(0, parseInt(ms, 10) || 0);
        const totalSec = Math.round(value / 1000);
        const minutes = Math.floor(totalSec / 60);
        const seconds = totalSec % 60;
        return `${minutes}:${String(seconds).padStart(2, '0')}`;
    }

    proto.syncVoiceRecordingUi = function syncVoiceRecordingUi({ isRecording = false, elapsedMs = 0 } = {}) {
        if (this.messageInput) {
            if (!this.messageInput.dataset.defaultPlaceholder) {
                this.messageInput.dataset.defaultPlaceholder = this.messageInput.getAttribute('placeholder') || 'Сообщение';
            }
            this.messageInput.disabled = !!isRecording;
            this.messageInput.placeholder = isRecording
                ? `● ${formatMs(elapsedMs)}`
                : this.messageInput.dataset.defaultPlaceholder;
        }

        if (this.messageInputArea) {
            this.messageInputArea.classList.toggle('is-recording', !!isRecording);
        }

        if (this.voiceMessageBtn) {
            this.voiceMessageBtn.classList.toggle('is-recording', !!isRecording);
            this.voiceMessageBtn.setAttribute('aria-label', isRecording ? 'Идёт запись' : TEXT.voiceLabel);
            this.voiceMessageBtn.title = isRecording
                ? `Запись ${formatMs(elapsedMs)}`
                : TEXT.voiceHoldHint;
        }

        const controls = [this.sendMessageBtn, this.attachFileBtn, this.stickerToggleBtn];
        controls.forEach((control) => {
            if (!control) return;
            control.disabled = !!isRecording;
        });
    };

    proto.ensureVoiceButton = function ensureVoiceButton() {
        if (!this.messageInputArea || !this.sendMessageBtn) return;
        let btn = document.getElementById('voice-message-btn');
        if (!btn) {
            btn = document.createElement('button');
            btn.id = 'voice-message-btn';
            btn.type = 'button';
            btn.className = 'message-tool-btn voice-message-btn';
            btn.setAttribute('aria-label', TEXT.voiceLabel);
            btn.title = TEXT.voiceHoldHint;
            btn.innerHTML = `
                <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 14a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.92V21h2v-3.08A7 7 0 0 0 19 11h-2z"/>
                </svg>
            `;
            this.messageInputArea.insertBefore(btn, this.sendMessageBtn);
        }
        this.voiceMessageBtn = btn;
    };

    proto.ensureModernEmojiPicker = function ensureModernEmojiPicker() {
        if (!this.emojiPicker || this.emojiPicker.dataset.modernReady === '1') return;
        const canUseModern = !!globalObject.customElements && !!globalObject.customElements.get('emoji-picker');
        if (!canUseModern) {
            if (globalObject.customElements && typeof globalObject.customElements.whenDefined === 'function') {
                globalObject.customElements.whenDefined('emoji-picker')
                    .then(() => {
                        if (this.emojiPicker && this.emojiPicker.dataset.modernReady !== '1') {
                            this.ensureModernEmojiPicker();
                        }
                    })
                    .catch(() => {});
            }
            return;
        }

        this.emojiPicker.innerHTML = '';
        const picker = document.createElement('emoji-picker');
        picker.className = 'modern-emoji-picker';
        picker.setAttribute('locale', 'ru');
        picker.setAttribute('theme', 'dark');
        picker.setAttribute('preview-position', 'none');
        picker.setAttribute('search-position', 'sticky');
        this.emojiPicker.appendChild(picker);

        picker.addEventListener('emoji-click', (event) => {
            const emoji = event && event.detail && event.detail.unicode ? event.detail.unicode : '';
            if (!emoji || !this.messageInput) return;
            this.messageInput.value += emoji;
            this.messageInput.focus();
            this.onMessageInputChanged();
        });

        this.emojiPicker.dataset.modernReady = '1';
        this.emojiPicker.classList.add('modern-emoji-host');
    };

    proto.ensureVideoCircleRecorderUi = function ensureVideoCircleRecorderUi() {
        if (this.videoCircleRecorderModal) return;
        let modal = document.getElementById('video-circle-recorder-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'video-circle-recorder-modal';
            modal.className = 'video-circle-recorder-modal';
            modal.innerHTML = `
                <div class="video-circle-recorder-backdrop" data-action="close"></div>
                <div class="video-circle-recorder-card">
                    <div class="video-circle-recorder-head">
                        <div class="video-circle-recorder-title">${TEXT.circleTitle}</div>
                        <button type="button" class="video-circle-head-btn" data-action="close">${TEXT.circleClose}</button>
                    </div>
                    <div class="video-circle-recorder-stage">
                        <video id="video-circle-recorder-preview" playsinline autoplay muted></video>
                        <div class="video-circle-recorder-timer" id="video-circle-recorder-timer">0:00</div>
                    </div>
                    <div class="video-circle-recorder-actions">
                        <button type="button" class="video-circle-action-btn neutral" data-action="gallery">${TEXT.circleGallery}</button>
                        <button type="button" class="video-circle-action-btn primary" data-action="toggle-record">${TEXT.circleStart}</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }

        this.videoCircleRecorderModal = modal;
        this.videoCircleRecorderPreview = modal.querySelector('#video-circle-recorder-preview');
        this.videoCircleRecorderTimer = modal.querySelector('#video-circle-recorder-timer');
        this.videoCircleRecorderRecordBtn = modal.querySelector('[data-action="toggle-record"]');

        if (modal.dataset.bound === '1') return;
        modal.dataset.bound = '1';
        modal.addEventListener('click', async (event) => {
            const actionEl = event.target && event.target.closest ? event.target.closest('[data-action]') : null;
            if (!actionEl) return;
            const action = actionEl.dataset.action || '';
            if (action === 'close') {
                await this.closeVideoCircleRecorder();
                return;
            }
            if (action === 'gallery') {
                await this.closeVideoCircleRecorder();
                if (this.chatVideoCircleInput) this.chatVideoCircleInput.click();
                return;
            }
            if (action === 'toggle-record') {
                if (this.videoCircleRecording) {
                    await this.stopVideoCircleRecording({ send: true });
                } else {
                    await this.startVideoCircleRecording();
                }
            }
        });
    };

    proto.openVideoCircleRecorder = async function openVideoCircleRecorder() {
        if (!this.state.currentChatId || !this.state.currentChatUser) {
            AdvancedViewRenderer.showToast(TEXT.noChat, 'warning');
            return;
        }
        this.ensureVideoCircleRecorderUi();
        if (!this.videoCircleRecorderModal || !this.videoCircleRecorderPreview) return;

        this.videoCircleRecorderModal.classList.add('open');

        try {
            this.videoCircleRecorderStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'user' },
                    width: { ideal: 720 },
                    height: { ideal: 720 },
                    aspectRatio: { ideal: 1 }
                },
                audio: true
            });
            this.videoCircleRecorderPreview.srcObject = this.videoCircleRecorderStream;
            if (typeof this.videoCircleRecorderPreview.play === 'function') {
                this.videoCircleRecorderPreview.play().catch(() => {});
            }
        } catch (error) {
            console.error('[chat-upgrade] circle camera failed:', error);
            AdvancedViewRenderer.showToast(TEXT.circleNoCamera, 'error');
            await this.closeVideoCircleRecorder();
            if (this.chatVideoCircleInput) {
                this.chatVideoCircleInput.click();
            }
        }
    };

    proto.closeVideoCircleRecorder = async function closeVideoCircleRecorder() {
        if (this.videoCircleRecording) {
            await this.stopVideoCircleRecording({ send: false });
        }
        if (this.videoCircleRecorderModal) {
            this.videoCircleRecorderModal.classList.remove('open');
        }
        stopTracks(this.videoCircleRecorderStream);
        this.videoCircleRecorderStream = null;
        if (this.videoCircleRecorderPreview) {
            this.videoCircleRecorderPreview.srcObject = null;
        }
        if (this.videoCircleRecorderTimer) {
            this.videoCircleRecorderTimer.textContent = '0:00';
        }
    };

    proto.startVideoCircleRecording = async function startVideoCircleRecording() {
        if (!this.videoCircleRecorderStream) {
            await this.openVideoCircleRecorder();
        }
        if (!this.videoCircleRecorderStream) return;
        if (this.videoCircleRecording) return;

        const mime = chooseSupportedMime([
            'video/webm;codecs=vp9,opus',
            'video/webm;codecs=vp8,opus',
            'video/webm',
            'video/mp4'
        ], 'video/webm');

        const chunks = [];
        this.videoCircleRecording = true;
        this.videoCircleRecordingStartedAt = Date.now();
        if (this.videoCircleRecorderRecordBtn) {
            this.videoCircleRecorderRecordBtn.textContent = TEXT.circleStop;
            this.videoCircleRecorderRecordBtn.classList.add('is-recording');
        }

        if (this.videoCircleRecorderTimer) {
            this.videoCircleRecorderTimer.classList.add('is-recording');
        }

        const recorder = mime
            ? new MediaRecorder(this.videoCircleRecorderStream, { mimeType: mime })
            : new MediaRecorder(this.videoCircleRecorderStream);
        this.videoCircleMediaRecorder = recorder;

        recorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) chunks.push(event.data);
        };

        recorder.onstop = async () => {
            const durationMs = Math.max(0, Date.now() - (this.videoCircleRecordingStartedAt || Date.now()));
            if (this.videoCircleRecorderRecordBtn) {
                this.videoCircleRecorderRecordBtn.textContent = TEXT.circleStart;
                this.videoCircleRecorderRecordBtn.classList.remove('is-recording');
            }
            if (this.videoCircleRecorderTimer) {
                this.videoCircleRecorderTimer.classList.remove('is-recording');
            }

            const blob = new Blob(chunks, { type: mime || 'video/webm' });
            if (this.videoCircleSendOnStop && blob.size > 1024) {
                const file = makeFileFromBlob(blob, `circle_${Date.now()}.${(mime || 'video/webm').includes('mp4') ? 'mp4' : 'webm'}`, mime || 'video/webm');
                await this.sendVideoCircleMessage(file);
            }
            this.videoCircleSendOnStop = false;
            this.videoCircleRecording = false;

            if (durationMs > 0 && this.videoCircleRecorderTimer) {
                this.videoCircleRecorderTimer.textContent = formatMs(durationMs);
            }
        };

        recorder.start(250);
        this.videoCircleTimerTick && clearInterval(this.videoCircleTimerTick);
        this.videoCircleTimerTick = setInterval(() => {
            const elapsed = Date.now() - (this.videoCircleRecordingStartedAt || Date.now());
            if (this.videoCircleRecorderTimer) this.videoCircleRecorderTimer.textContent = formatMs(elapsed);
            if (elapsed >= 60000) {
                this.stopVideoCircleRecording({ send: true }).catch(() => {});
            }
        }, 250);
    };

    proto.stopVideoCircleRecording = async function stopVideoCircleRecording({ send = true } = {}) {
        if (!this.videoCircleMediaRecorder || !this.videoCircleRecording) return;
        this.videoCircleSendOnStop = !!send;
        clearInterval(this.videoCircleTimerTick);
        this.videoCircleTimerTick = null;
        try {
            this.videoCircleMediaRecorder.stop();
        } catch (_) {
            this.videoCircleRecording = false;
        }
    };

    proto.startVoiceRecording = async function startVoiceRecording() {
        if (this.voiceRecording) return;
        if (!this.state.currentChatId || !this.state.currentChatUser) {
            AdvancedViewRenderer.showToast(TEXT.noChat, 'warning');
            return;
        }
        if (this.messageInput && this.messageInput.value.trim()) return;
        if (!(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function')) {
            AdvancedViewRenderer.showToast(TEXT.noMic, 'error');
            return;
        }

        try {
            this.hideEmojiPicker();
            this.hideStickerPicker();
            await this.updateTypingStatus(false);

            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                },
                video: false
            });

            const mime = chooseSupportedMime([
                'audio/webm;codecs=opus',
                'audio/webm',
                'audio/mp4',
                'audio/ogg;codecs=opus'
            ], 'audio/webm');
            const chunks = [];
            const recorder = mime
                ? new MediaRecorder(stream, { mimeType: mime })
                : new MediaRecorder(stream);

            this.voiceRecording = true;
            this.voiceRecordingCancelled = false;
            this.voiceRecordingStartedAt = Date.now();
            this.voiceMediaStream = stream;
            this.voiceMediaRecorder = recorder;
            this.syncVoiceRecordingUi({ isRecording: true, elapsedMs: 0 });

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) chunks.push(event.data);
            };

            recorder.onstop = async () => {
                const durationMs = Date.now() - (this.voiceRecordingStartedAt || Date.now());
                stopTracks(this.voiceMediaStream);
                this.voiceMediaStream = null;
                this.voiceMediaRecorder = null;
                this.voiceRecording = false;
                this.voiceHoldArmed = false;
                this.voiceHoldCancelled = false;
                this.voiceHoldPointerId = null;
                clearInterval(this.voiceRecordTick);
                this.voiceRecordTick = null;
                this.syncVoiceRecordingUi({ isRecording: false });

                if (this.voiceRecordingCancelled) return;
                if (durationMs < 500) {
                    AdvancedViewRenderer.showToast(TEXT.voiceTooShort, 'warning');
                    return;
                }

                const blob = new Blob(chunks, { type: mime || 'audio/webm' });
                await this.sendVoiceMessageBlob(blob, durationMs);
            };

            recorder.start(200);
            this.voiceRecordTick && clearInterval(this.voiceRecordTick);
            this.voiceRecordTick = setInterval(() => {
                if (!this.messageInput || !this.voiceRecording) return;
                const elapsed = Date.now() - (this.voiceRecordingStartedAt || Date.now());
                this.syncVoiceRecordingUi({ isRecording: true, elapsedMs: elapsed });
                if (elapsed >= 120000) {
                    this.stopVoiceRecording({ cancel: false }).catch(() => {});
                }
            }, 250);
        } catch (error) {
            console.error('[chat-upgrade] voice recording failed:', error);
            clearInterval(this.voiceRecordTick);
            this.voiceRecordTick = null;
            stopTracks(this.voiceMediaStream);
            this.voiceMediaStream = null;
            this.voiceMediaRecorder = null;
            this.voiceRecording = false;
            this.voiceHoldArmed = false;
            this.voiceHoldCancelled = false;
            this.voiceHoldPointerId = null;
            this.syncVoiceRecordingUi({ isRecording: false });
            AdvancedViewRenderer.showToast(TEXT.noMic, 'error');
        }
    };

    proto.stopVoiceRecording = async function stopVoiceRecording({ cancel = false } = {}) {
        if (!this.voiceMediaRecorder || !this.voiceRecording) return;
        this.voiceRecordingCancelled = !!cancel;
        try {
            this.voiceMediaRecorder.stop();
        } catch (_) {
            stopTracks(this.voiceMediaStream);
            this.voiceMediaStream = null;
            this.voiceMediaRecorder = null;
            this.voiceRecording = false;
            this.voiceHoldArmed = false;
            this.voiceHoldCancelled = false;
            this.voiceHoldPointerId = null;
            clearInterval(this.voiceRecordTick);
            this.voiceRecordTick = null;
            this.syncVoiceRecordingUi({ isRecording: false });
        }
    };

    proto.sendVoiceMessageBlob = async function sendVoiceMessageBlob(blob, durationMs = 0) {
        if (!blob || blob.size <= 0) return;
        if (!this.state.currentChatId || !this.state.currentChatUser) return;

        const currentUser = this.dataService.getCurrentUser();
        if (!currentUser) {
            this.navigateTo('auth-view');
            return;
        }

        try {
            const mime = blob.type || 'audio/webm';
            const ext = mime.includes('mp4') ? 'm4a' : (mime.includes('ogg') ? 'ogg' : 'webm');
            const file = makeFileFromBlob(blob, `voice_${Date.now()}.${ext}`, mime);
            const durationSeconds = Math.max(1, Math.round((parseInt(durationMs, 10) || 0) / 1000));

            let filePayload = null;
            if (firebaseService && firebaseService.isInitialized() && typeof firebaseService.uploadChatFile === 'function') {
                filePayload = await firebaseService.uploadChatFile(this.state.currentChatId, file);
                filePayload.mime = filePayload.mime || mime;
                filePayload.name = filePayload.name || file.name || 'voice.webm';
                filePayload.size = filePayload.size || file.size || 0;
                filePayload.durationMs = durationMs;
                filePayload.duration = durationSeconds;
                await firebaseService.addMessage(
                    this.state.currentChatId,
                    currentUser.name,
                    this.state.currentChatUser,
                    '',
                    this.state.currentChatUid,
                    { type: 'file', file: filePayload }
                );
            } else {
                filePayload = {
                    name: file.name || 'voice.webm',
                    size: file.size || 0,
                    mime: mime,
                    url: URL.createObjectURL(file),
                    durationMs,
                    duration: durationSeconds
                };
                this.dataService.addMessage(
                    this.state.currentChatId,
                    currentUser.name,
                    this.state.currentChatUser,
                    '',
                    {
                        fromUid: currentUser.uid || null,
                        toUid: this.state.currentChatUid || null,
                        delivered: !!this.state.currentChatOnline,
                        type: 'file',
                        file: filePayload
                    }
                );
                await this.refreshCurrentChatMessages();
            }

            await this.loadChats();
            if (this.messagesContainer) this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
            AdvancedViewRenderer.showToast(TEXT.voiceSent, 'success');
        } catch (error) {
            console.error('[chat-upgrade] send voice failed:', error);
            AdvancedViewRenderer.showToast(error?.message || 'Voice send failed', 'error');
        }
    };

    const ORIGINAL_SETUP_MESSAGES_EVENTS = proto.setupMessagesEvents;
    proto.setupMessagesEvents = function wrappedSetupMessagesEvents(...args) {
        const result = ORIGINAL_SETUP_MESSAGES_EVENTS.apply(this, args);

        this.ensureVoiceButton();
        this.ensureModernEmojiPicker();
        this.ensureVideoCircleRecorderUi();

        if (this.voiceMessageBtn && this.voiceMessageBtn.dataset.bound !== '1') {
            this.voiceMessageBtn.dataset.bound = '1';
            this.voiceMessageBtn.addEventListener('pointerdown', async (event) => {
                event.preventDefault();
                this.voiceHoldArmed = true;
                this.voiceHoldCancelled = false;
                this.voiceHoldPointerId = typeof event.pointerId === 'number' ? event.pointerId : null;
                if (typeof this.voiceMessageBtn.setPointerCapture === 'function' && typeof event.pointerId === 'number') {
                    try {
                        this.voiceMessageBtn.setPointerCapture(event.pointerId);
                    } catch (_) {}
                }
                await this.startVoiceRecording();
                if (!this.voiceHoldArmed && this.voiceRecording) {
                    await this.stopVoiceRecording({ cancel: !!this.voiceHoldCancelled });
                }
            });
            this.voiceMessageBtn.addEventListener('pointerup', async (event) => {
                event.preventDefault();
                if (this.voiceHoldPointerId !== null && event.pointerId !== this.voiceHoldPointerId) return;
                this.voiceHoldArmed = false;
                this.voiceHoldCancelled = false;
                this.voiceHoldPointerId = null;
                if (typeof this.voiceMessageBtn.releasePointerCapture === 'function' && typeof event.pointerId === 'number') {
                    try {
                        this.voiceMessageBtn.releasePointerCapture(event.pointerId);
                    } catch (_) {}
                }
                await this.stopVoiceRecording({ cancel: false });
            });
            this.voiceMessageBtn.addEventListener('pointercancel', async (event) => {
                event.preventDefault();
                if (this.voiceHoldPointerId !== null && event.pointerId !== this.voiceHoldPointerId) return;
                this.voiceHoldArmed = false;
                this.voiceHoldCancelled = true;
                this.voiceHoldPointerId = null;
                await this.stopVoiceRecording({ cancel: true });
            });
            this.voiceMessageBtn.addEventListener('contextmenu', (event) => event.preventDefault());
        }

        if (this.videoCircleBtn && this.videoCircleBtn.dataset.upgradeBound !== '1') {
            this.videoCircleBtn.dataset.upgradeBound = '1';
            this.videoCircleBtn.addEventListener('click', async (event) => {
                event.preventDefault();
                event.stopPropagation();
                if (typeof event.stopImmediatePropagation === 'function') {
                    event.stopImmediatePropagation();
                }
                await this.openVideoCircleRecorder();
            }, true);
        }

        return result;
    };

    const ORIGINAL_GET_PREVIEW = proto.getMessagePreviewText;
    proto.getMessagePreviewText = function wrappedGetPreview(message = {}) {
        const msg = message || {};
        if (msg.type === 'voice') return TEXT.voicePreview;
        if (msg.type === 'video-circle') return TEXT.circlePreview;
        return ORIGINAL_GET_PREVIEW.call(this, message);
    };

    const DataCtor = globalObject.AdvancedDataService || (typeof AdvancedDataService !== 'undefined' ? AdvancedDataService : null);
    if (DataCtor && DataCtor.prototype && typeof DataCtor.prototype.getMessagePreviewText === 'function') {
        const ORIGINAL_DATA_PREVIEW = DataCtor.prototype.getMessagePreviewText;
        DataCtor.prototype.getMessagePreviewText = function wrappedDataPreview(message = {}) {
            const msg = message || {};
            if (msg.type === 'voice') return TEXT.voicePreview;
            if (msg.type === 'video-circle') return TEXT.circlePreview;
            return ORIGINAL_DATA_PREVIEW.call(this, message);
        };
    }

    const ORIGINAL_NAVIGATE_TO = proto.navigateTo;
    proto.navigateTo = function wrappedNavigateTo(viewId, ...rest) {
        if (viewId !== 'messages-view') {
            this.voiceHoldArmed = false;
            this.voiceHoldCancelled = false;
            this.voiceHoldPointerId = null;
            if (this.voiceRecording) {
                this.stopVoiceRecording({ cancel: true }).catch(() => {});
            }
            if (this.videoCircleRecording) {
                this.stopVideoCircleRecording({ send: false }).catch(() => {});
            }
            this.closeVideoCircleRecorder().catch(() => {});
        }
        return ORIGINAL_NAVIGATE_TO.call(this, viewId, ...rest);
    };
})(typeof window !== 'undefined' ? window : null);
