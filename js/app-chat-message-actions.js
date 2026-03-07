/**
 * Chat message actions module.
 * Adds edit/delete for own messages with Firebase + local fallback.
 */
(function attachChatMessageActionsModule(globalObject) {
    'use strict';

    if (!globalObject) return;

    const AppCtor = globalObject.AdvancedApp || (typeof AdvancedApp !== 'undefined' ? AdvancedApp : null);
    const DataCtor = globalObject.AdvancedDataService || (typeof AdvancedDataService !== 'undefined' ? AdvancedDataService : null);
    const FirebaseCtor = globalObject.FirebaseService || (typeof FirebaseService !== 'undefined' ? FirebaseService : null);
    const ViewRenderer = globalObject.AdvancedViewRenderer || (typeof AdvancedViewRenderer !== 'undefined' ? AdvancedViewRenderer : null);

    if (!AppCtor || !AppCtor.prototype || !ViewRenderer) return;
    const appProto = AppCtor.prototype;
    if (appProto.__chatMessageActionsPatched) return;
    appProto.__chatMessageActionsPatched = true;

    const TEXT = {
        deleted: 'Message deleted',
        edited: 'edited',
        empty: 'Message cannot be empty',
        updated: 'Message updated',
        deletedToast: 'Message deleted',
        updateFailed: 'Failed to update message',
        deleteFailed: 'Failed to delete message',
        editPrompt: 'Edit message',
        confirmDelete: 'Delete this message?'
    };

    function asMs(value) {
        if (typeof value === 'number') return value;
        if (value && typeof value.toMillis === 'function') return value.toMillis();
        if (value instanceof Date) return value.getTime();
        return 0;
    }

    function getCurrentIdentity(dataService) {
        const current = dataService && typeof dataService.getCurrentUser === 'function'
            ? dataService.getCurrentUser()
            : null;
        return {
            uid: current && current.uid ? String(current.uid) : '',
            name: current && current.name ? String(current.name) : ''
        };
    }

    function canManageMessage(dataService, message) {
        if (!message) return false;
        const identity = getCurrentIdentity(dataService);
        if (!identity.uid && !identity.name) return false;
        if (message.deleted === true) return false;

        const fromUid = message.fromUid ? String(message.fromUid) : '';
        const fromUser = message.fromUser ? String(message.fromUser) : '';

        if (identity.uid && fromUid) return identity.uid === fromUid;
        return !!(identity.name && fromUser && identity.name === fromUser);
    }

    if (DataCtor && DataCtor.prototype) {
        const dataProto = DataCtor.prototype;

        if (typeof dataProto.editMessage !== 'function') {
            dataProto.editMessage = function editMessage(chatId, messageId, newContent) {
                const safeChatId = String(chatId || '').trim();
                const safeMessageId = String(messageId || '').trim();
                const nextText = String(newContent || '').trim();
                if (!safeChatId || !safeMessageId) throw new Error('Message not found');
                if (!nextText) throw new Error(TEXT.empty);

                const index = this.messages.findIndex((row) => {
                    if (!row) return false;
                    return String(row.chatId || '') === safeChatId
                        && String(row.id || '') === safeMessageId;
                });
                if (index < 0) throw new Error('Message not found');

                const target = this.messages[index];
                if (!canManageMessage(this, target)) {
                    throw new Error('No rights to edit this message');
                }
                if (String(target.type || 'text') !== 'text') {
                    throw new Error('Only text messages can be edited');
                }

                const now = Date.now();
                this.messages[index] = {
                    ...target,
                    content: nextText,
                    edited: true,
                    editedAt: now,
                    updatedAt: now
                };
                return { ...this.messages[index] };
            };
        }

        if (typeof dataProto.deleteMessage !== 'function') {
            dataProto.deleteMessage = function deleteMessage(chatId, messageId) {
                const safeChatId = String(chatId || '').trim();
                const safeMessageId = String(messageId || '').trim();
                if (!safeChatId || !safeMessageId) throw new Error('Message not found');

                const index = this.messages.findIndex((row) => {
                    if (!row) return false;
                    return String(row.chatId || '') === safeChatId
                        && String(row.id || '') === safeMessageId;
                });
                if (index < 0) throw new Error('Message not found');

                const target = this.messages[index];
                if (!canManageMessage(this, target)) {
                    throw new Error('No rights to delete this message');
                }

                const now = Date.now();
                this.messages[index] = {
                    ...target,
                    content: '',
                    file: null,
                    sticker: null,
                    call: null,
                    deleted: true,
                    deletedAt: now,
                    edited: false,
                    editedAt: null,
                    updatedAt: now
                };
                return { ...this.messages[index] };
            };
        }

        if (!dataProto.__messagePreviewDeletedPatched && typeof dataProto.getMessagePreviewText === 'function') {
            dataProto.__messagePreviewDeletedPatched = true;
            const originalPreview = dataProto.getMessagePreviewText;
            dataProto.getMessagePreviewText = function patchedMessagePreview(message = {}, ...rest) {
                if (message && message.deleted === true) return TEXT.deleted;
                return originalPreview.call(this, message, ...rest);
            };
        }
    }

    if (FirebaseCtor && FirebaseCtor.prototype) {
        const firebaseProto = FirebaseCtor.prototype;

        if (typeof firebaseProto.editMessage !== 'function') {
            firebaseProto.editMessage = async function editMessage(chatId, messageId, newContent) {
                const currentUid = this.getCurrentUid ? this.getCurrentUid() : null;
                if (!currentUid) throw new Error('Authorization required');

                const safeChatId = String(chatId || '').trim();
                const safeMessageId = String(messageId || '').trim();
                const nextText = String(newContent || '').trim();

                if (!safeChatId || !safeMessageId) throw new Error('Message not found');
                if (!nextText) throw new Error(TEXT.empty);

                const ref = this.db.collection('messages').doc(safeMessageId);
                const snapshot = await ref.get();
                if (!snapshot.exists) throw new Error('Message not found');

                const message = snapshot.data() || {};
                const fromUid = message.fromUid ? String(message.fromUid) : '';
                if (!fromUid || fromUid !== String(currentUid)) {
                    throw new Error('No rights to edit this message');
                }
                if (String(message.chatId || '') !== safeChatId) {
                    throw new Error('Message/chat mismatch');
                }
                if (message.deleted === true) {
                    throw new Error('Message already deleted');
                }
                if (String(message.type || 'text') !== 'text') {
                    throw new Error('Only text messages can be edited');
                }

                const now = Date.now();
                await ref.set({
                    content: nextText,
                    edited: true,
                    editedAt: now,
                    updatedAt: now
                }, { merge: true });

                return {
                    id: snapshot.id,
                    ...message,
                    content: nextText,
                    edited: true,
                    editedAt: now,
                    updatedAt: now
                };
            };
        }

        if (typeof firebaseProto.deleteMessage !== 'function') {
            firebaseProto.deleteMessage = async function deleteMessage(chatId, messageId) {
                const currentUid = this.getCurrentUid ? this.getCurrentUid() : null;
                if (!currentUid) throw new Error('Authorization required');

                const safeChatId = String(chatId || '').trim();
                const safeMessageId = String(messageId || '').trim();

                if (!safeChatId || !safeMessageId) throw new Error('Message not found');

                const ref = this.db.collection('messages').doc(safeMessageId);
                const snapshot = await ref.get();
                if (!snapshot.exists) throw new Error('Message not found');

                const message = snapshot.data() || {};
                const fromUid = message.fromUid ? String(message.fromUid) : '';
                if (!fromUid || fromUid !== String(currentUid)) {
                    throw new Error('No rights to delete this message');
                }
                if (String(message.chatId || '') !== safeChatId) {
                    throw new Error('Message/chat mismatch');
                }

                const now = Date.now();
                await ref.set({
                    content: '',
                    file: null,
                    sticker: null,
                    call: null,
                    deleted: true,
                    deletedAt: now,
                    edited: false,
                    editedAt: null,
                    updatedAt: now
                }, { merge: true });

                return {
                    id: snapshot.id,
                    ...message,
                    content: '',
                    deleted: true,
                    deletedAt: now
                };
            };
        }

        if (!firebaseProto.__messagePreviewDeletedPatched && typeof firebaseProto.getMessagePreviewText === 'function') {
            firebaseProto.__messagePreviewDeletedPatched = true;
            const originalPreview = firebaseProto.getMessagePreviewText;
            firebaseProto.getMessagePreviewText = function patchedMessagePreview(message = {}, ...rest) {
                if (message && message.deleted === true) return TEXT.deleted;
                return originalPreview.call(this, message, ...rest);
            };
        }
    }

    appProto.canManageChatMessage = function canManageChatMessage(message) {
        return canManageMessage(this.dataService, message);
    };

    appProto.getChatMessageById = function getChatMessageById(messageId) {
        const id = String(messageId || '').trim();
        if (!id) return null;
        const map = this.state && this.state.chatMessageMap ? this.state.chatMessageMap : {};
        return map && map[id] ? map[id] : null;
    };

    const originalRenderBody = appProto.renderChatMessageBody;
    if (typeof originalRenderBody === 'function') {
        appProto.renderChatMessageBody = function patchedRenderChatMessageBody(message = {}, ...rest) {
            if (message && message.deleted === true) {
                return `<div class="message-content message-deleted">${this.escapeHtml(TEXT.deleted)}</div>`;
            }
            return originalRenderBody.call(this, message, ...rest);
        };
    }

    appProto.decorateChatMessagesWithActions = function decorateChatMessagesWithActions(messages = []) {
        if (!this.messagesContainer) return;

        const current = this.dataService && typeof this.dataService.getCurrentUser === 'function'
            ? this.dataService.getCurrentUser()
            : null;
        const currentUid = current && current.uid ? String(current.uid) : '';
        const currentName = current && current.name ? String(current.name) : '';

        const sorted = [...messages].sort((a, b) => asMs(a && a.timestamp) - asMs(b && b.timestamp));
        const nodes = Array.from(this.messagesContainer.querySelectorAll('.message'));

        if (!this.state) this.state = {};
        this.state.chatMessageMap = {};

        nodes.forEach((node, index) => {
            const msg = sorted[index];
            if (!node || !msg) return;

            const rawId = msg.id != null ? String(msg.id) : `msg_${index}`;
            this.state.chatMessageMap[rawId] = msg;
            node.dataset.messageId = rawId;

            node.querySelectorAll('.message-actions').forEach((el) => el.remove());

            const meta = node.querySelector('.message-meta');
            if (meta) {
                const prev = meta.querySelector('.message-edited');
                if (prev) prev.remove();

                if (msg.edited === true && msg.deleted !== true) {
                    const badge = document.createElement('span');
                    badge.className = 'message-edited';
                    badge.textContent = `(${TEXT.edited})`;
                    meta.insertBefore(badge, meta.firstChild || null);
                }
            }

            const isOwn = (msg.fromUid && currentUid)
                ? String(msg.fromUid) === currentUid
                : String(msg.fromUser || '') === currentName;

            if (!isOwn || msg.deleted === true) return;

            const canEdit = String(msg.type || 'text') === 'text';
            const controls = document.createElement('div');
            controls.className = 'message-actions';
            controls.innerHTML = `
                <button type="button" class="message-actions-trigger" aria-label="message actions">...</button>
                <div class="message-actions-menu">
                    ${canEdit ? '<button type="button" data-action="edit-message">Edit</button>' : ''}
                    <button type="button" data-action="delete-message">Delete</button>
                </div>
            `;
            node.appendChild(controls);
        });

        this.ensureChatMessageActionsEvents();
    };

    appProto.ensureChatMessageActionsEvents = function ensureChatMessageActionsEvents() {
        if (!this.messagesContainer || this.messagesContainer.dataset.messageActionsBound === '1') return;
        this.messagesContainer.dataset.messageActionsBound = '1';

        const closeAll = () => {
            this.messagesContainer.querySelectorAll('.message-actions.open').forEach((node) => {
                node.classList.remove('open');
            });
        };

        this.messagesContainer.addEventListener('click', async (event) => {
            const trigger = event.target && event.target.closest
                ? event.target.closest('.message-actions-trigger')
                : null;
            if (trigger) {
                event.preventDefault();
                event.stopPropagation();
                const holder = trigger.closest('.message-actions');
                if (!holder) return;
                const shouldOpen = !holder.classList.contains('open');
                closeAll();
                if (shouldOpen) holder.classList.add('open');
                return;
            }

            const actionBtn = event.target && event.target.closest
                ? event.target.closest('.message-actions-menu [data-action]')
                : null;
            if (!actionBtn) return;

            event.preventDefault();
            event.stopPropagation();

            const messageNode = actionBtn.closest('.message');
            const messageId = messageNode ? String(messageNode.dataset.messageId || '') : '';
            if (!messageId) return;

            const action = String(actionBtn.dataset.action || '');
            closeAll();

            if (action === 'edit-message') {
                await this.editOwnChatMessage(messageId);
            } else if (action === 'delete-message') {
                await this.deleteOwnChatMessage(messageId);
            }
        });

        document.addEventListener('click', (event) => {
            if (!this.messagesContainer) return;
            const inMenu = event.target && event.target.closest
                ? event.target.closest('.message-actions')
                : null;
            if (!inMenu) closeAll();
        });
    };

    appProto.editOwnChatMessage = async function editOwnChatMessage(messageId) {
        const message = this.getChatMessageById(messageId);
        if (!message || !this.canManageChatMessage(message)) return;
        if (String(message.type || 'text') !== 'text') return;
        if (!this.state || !this.state.currentChatId) return;

        const currentText = String(message.content || '').trim();
        const nextTextRaw = globalObject.prompt(TEXT.editPrompt, currentText);
        if (nextTextRaw === null) return;

        const nextText = String(nextTextRaw || '').trim();
        if (!nextText) {
            ViewRenderer.showToast(TEXT.empty, 'warning');
            return;
        }
        if (nextText === currentText) return;

        try {
            if (typeof firebaseService !== 'undefined'
                && firebaseService
                && typeof firebaseService.isInitialized === 'function'
                && firebaseService.isInitialized()
                && typeof firebaseService.editMessage === 'function') {
                await firebaseService.editMessage(this.state.currentChatId, messageId, nextText);
            } else if (this.dataService && typeof this.dataService.editMessage === 'function') {
                this.dataService.editMessage(this.state.currentChatId, messageId, nextText);
            } else {
                throw new Error(TEXT.updateFailed);
            }

            await this.refreshCurrentChatMessages();
            await this.loadChats();
            ViewRenderer.showToast(TEXT.updated, 'success');
        } catch (error) {
            console.error('[chat-actions] edit failed:', error);
            ViewRenderer.showToast(error && error.message ? error.message : TEXT.updateFailed, 'error');
        }
    };

    appProto.deleteOwnChatMessage = async function deleteOwnChatMessage(messageId) {
        const message = this.getChatMessageById(messageId);
        if (!message || !this.canManageChatMessage(message)) return;
        if (!this.state || !this.state.currentChatId) return;

        const ok = globalObject.confirm(TEXT.confirmDelete);
        if (!ok) return;

        try {
            if (typeof firebaseService !== 'undefined'
                && firebaseService
                && typeof firebaseService.isInitialized === 'function'
                && firebaseService.isInitialized()
                && typeof firebaseService.deleteMessage === 'function') {
                await firebaseService.deleteMessage(this.state.currentChatId, messageId);
            } else if (this.dataService && typeof this.dataService.deleteMessage === 'function') {
                this.dataService.deleteMessage(this.state.currentChatId, messageId);
            } else {
                throw new Error(TEXT.deleteFailed);
            }

            await this.refreshCurrentChatMessages();
            await this.loadChats();
            ViewRenderer.showToast(TEXT.deletedToast, 'success');
        } catch (error) {
            console.error('[chat-actions] delete failed:', error);
            ViewRenderer.showToast(error && error.message ? error.message : TEXT.deleteFailed, 'error');
        }
    };

    const originalRenderMessages = appProto.renderChatMessages;
    if (typeof originalRenderMessages === 'function') {
        appProto.renderChatMessages = function patchedRenderChatMessages(messages = [], ...rest) {
            const result = originalRenderMessages.call(this, messages, ...rest);
            try {
                this.decorateChatMessagesWithActions(messages);
            } catch (error) {
                console.warn('[chat-actions] decorate failed:', error && error.message ? error.message : error);
            }
            return result;
        };
    }
})(typeof window !== 'undefined' ? window : null);
