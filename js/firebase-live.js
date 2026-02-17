/**
 * Reelgram Live Module (Firebase layer)
 * Keeps live-stream room logic out of firebase-service.js core file.
 */
(function attachFirebaseLiveModule(globalObject) {
    const ServiceCtor = (typeof FirebaseService !== 'undefined')
        ? FirebaseService
        : (globalObject && globalObject.FirebaseService ? globalObject.FirebaseService : null);
    if (!ServiceCtor || !ServiceCtor.prototype) return;

    const proto = ServiceCtor.prototype;
    if (proto.__reelgramLivePatched) return;
    proto.__reelgramLivePatched = true;

    proto.getLiveReactionPreset = function getLiveReactionPreset(key = '') {
        const normalized = String(key || '').trim().toLowerCase();
        const presets = {
            love: { key: 'love', emoji: '❤️' },
            fire: { key: 'fire', emoji: '🔥' },
            wow: { key: 'wow', emoji: '😮' },
            clap: { key: 'clap', emoji: '👏' },
            party: { key: 'party', emoji: '🎉' },
            like: { key: 'like', emoji: '👍' }
        };
        return presets[normalized] || presets.fire;
    };

    proto.normalizeLiveReactionCounters = function normalizeLiveReactionCounters(source = {}) {
        const row = source && typeof source === 'object' ? source : {};
        const keys = ['love', 'fire', 'wow', 'clap', 'party', 'like'];
        const counters = {};
        keys.forEach((key) => {
            counters[key] = Math.max(0, parseInt(row[key], 10) || 0);
        });
        return counters;
    };

    proto.trimLiveParticipantsSample = function trimLiveParticipantsSample(list = [], limit = 80) {
        const safeLimit = Math.max(1, Math.min(parseInt(limit, 10) || 80, 200));
        if (!Array.isArray(list)) return [];
        return Array.from(new Set(list.map(v => String(v)).filter(Boolean))).slice(0, safeLimit);
    };

    proto.normalizeLiveSessionRecord = function normalizeLiveSessionRecord(data = {}, id = null) {
        const source = data || {};
        const coHosts = Array.isArray(source.coHosts)
            ? Array.from(new Set(source.coHosts.map(v => String(v)).filter(Boolean))).slice(0, 2)
            : [];
        const participants = this.trimLiveParticipantsSample(source.participants || [], 80);
        const rawPinned = source.pinnedMessage && typeof source.pinnedMessage === 'object'
            ? source.pinnedMessage
            : null;
        const pinnedMessage = rawPinned
            ? {
                id: rawPinned.id ? String(rawPinned.id) : null,
                text: String(rawPinned.text || '').trim().slice(0, 240),
                uid: rawPinned.uid ? String(rawPinned.uid) : null,
                user: String(rawPinned.user || 'user').trim().slice(0, 80) || 'user',
                avatar: this.sanitizeAvatarForPublicPayload(rawPinned.avatar, rawPinned.user || 'user'),
                createdAt: this.normalizeTimestamp(rawPinned.createdAt),
                pinnedAt: this.normalizeTimestamp(rawPinned.pinnedAt),
                pinnedByUid: rawPinned.pinnedByUid ? String(rawPinned.pinnedByUid) : null
            }
            : null;

        return {
            id: id || source.id || null,
            ownerUid: source.ownerUid ? String(source.ownerUid) : null,
            ownerName: source.ownerName || source.owner || 'user',
            ownerAvatar: source.ownerAvatar || this.buildUiAvatar(source.ownerName || 'user'),
            title: String(source.title || '').trim() || 'Прямой эфир',
            status: source.status === 'ended' ? 'ended' : 'live',
            coHosts,
            participants,
            viewersCount: Math.max(0, parseInt(source.viewersCount, 10) || participants.length),
            maxCoHosts: Math.max(1, Math.min(2, parseInt(source.maxCoHosts, 10) || 2)),
            pinnedMessage,
            reactionCounters: this.normalizeLiveReactionCounters(source.reactionCounters),
            createdAt: this.normalizeTimestamp(source.createdAt),
            updatedAt: this.normalizeTimestamp(source.updatedAt),
            lastMessageAt: this.normalizeTimestamp(source.lastMessageAt),
            lastReactionAt: this.normalizeTimestamp(source.lastReactionAt),
            endedAt: this.normalizeTimestamp(source.endedAt)
        };
    };

    proto.normalizeLiveMessageRecord = function normalizeLiveMessageRecord(data = {}, id = null) {
        const source = data || {};
        return {
            id: id || source.id || null,
            sessionId: source.sessionId ? String(source.sessionId) : null,
            uid: source.uid ? String(source.uid) : null,
            user: String(source.user || 'user').trim().slice(0, 80) || 'user',
            avatar: this.sanitizeAvatarForPublicPayload(source.avatar, source.user || 'user'),
            text: String(source.text || '').trim().slice(0, 240),
            type: source.type === 'system' ? 'system' : (source.type === 'sticker' ? 'sticker' : 'text'),
            meta: source.meta && typeof source.meta === 'object' ? source.meta : null,
            createdAt: this.normalizeTimestamp(source.createdAt)
        };
    };

    proto.normalizeLiveReactionRecord = function normalizeLiveReactionRecord(data = {}, id = null) {
        const source = data || {};
        const preset = this.getLiveReactionPreset(source.reactionKey || source.key || 'fire');
        return {
            id: id || source.id || null,
            sessionId: source.sessionId ? String(source.sessionId) : null,
            uid: source.uid ? String(source.uid) : null,
            user: String(source.user || 'user').trim().slice(0, 80) || 'user',
            avatar: this.sanitizeAvatarForPublicPayload(source.avatar, source.user || 'user'),
            reactionKey: preset.key,
            emoji: source.emoji || preset.emoji,
            createdAt: this.normalizeTimestamp(source.createdAt)
        };
    };

    proto.getLiveSessionById = async function getLiveSessionById(sessionId) {
        if (!sessionId) return null;
        const snap = await this.db.collection('liveSessions').doc(String(sessionId)).get();
        if (!snap.exists) return null;
        return this.normalizeLiveSessionRecord(snap.data(), snap.id);
    };

    proto.createLiveSession = async function createLiveSession({ title = '' } = {}) {
        const uid = this.getCurrentUid();
        if (!uid) throw new Error('Необходимо авторизироваться');

        const existing = await this.db.collection('liveSessions')
            .where('ownerUid', '==', uid)
            .where('status', '==', 'live')
            .limit(1)
            .get();
        if (!existing.empty) {
            throw new Error('У вас уже идет прямой эфир');
        }

        const ownerProfile = (this.currentUser && this.currentUser.uid === uid)
            ? this.currentUser
            : await this.getUserProfile(uid);
        const ownerName = ownerProfile?.name || 'user';
        const ownerAvatar = this.sanitizeAvatarForPublicPayload(ownerProfile?.avatar, ownerName);
        const now = Date.now();
        const payload = {
            ownerUid: uid,
            ownerName,
            ownerAvatar,
            title: String(title || '').trim().slice(0, 80) || `Эфир @${ownerName}`,
            status: 'live',
            coHosts: [],
            participants: [uid],
            viewersCount: 1,
            maxCoHosts: 2,
            pinnedMessage: null,
            reactionCounters: this.normalizeLiveReactionCounters(),
            createdAt: now,
            updatedAt: now,
            lastMessageAt: 0,
            lastReactionAt: 0,
            endedAt: null
        };

        const ref = await this.db.collection('liveSessions').add(payload);
        await ref.collection('audience').doc(uid).set({
            uid,
            user: ownerName,
            avatar: ownerAvatar,
            role: 'owner',
            joinedAt: now,
            lastSeen: now,
            updatedAt: now
        }, { merge: true });

        try {
            await this.db.collection('users').doc(uid).set({
                'liveStats.started': firebase.firestore.FieldValue.increment(1),
                updatedAt: new Date()
            }, { merge: true });
        } catch (statsError) {
            console.warn('⚠️ Не удалось обновить liveStats.started:', statsError?.message || statsError);
        }

        return this.normalizeLiveSessionRecord(payload, ref.id);
    };

    proto.joinLiveSession = async function joinLiveSession(sessionId, { asCoHost = false } = {}) {
        const uid = this.getCurrentUid();
        if (!uid) throw new Error('Необходимо авторизироваться');
        if (!sessionId) throw new Error('Эфир не найден');

        const viewerProfile = (this.currentUser && this.currentUser.uid === uid)
            ? this.currentUser
            : await this.getUserProfile(uid);
        const viewerName = viewerProfile?.name || 'user';
        const viewerAvatar = this.sanitizeAvatarForPublicPayload(viewerProfile?.avatar, viewerName);

        const ref = this.db.collection('liveSessions').doc(String(sessionId));
        const audienceRef = ref.collection('audience').doc(uid);
        const summary = await this.db.runTransaction(async (transaction) => {
            const snap = await transaction.get(ref);
            if (!snap.exists) throw new Error('Эфир не найден');
            const audienceSnap = await transaction.get(audienceRef);
            const session = this.normalizeLiveSessionRecord(snap.data(), snap.id);
            if (session.status !== 'live') throw new Error('Эфир уже завершен');

            const now = Date.now();
            const wasParticipant = audienceSnap.exists;
            const coHostsSet = new Set(session.coHosts || []);
            if (asCoHost && uid !== session.ownerUid) {
                if (!coHostsSet.has(uid) && coHostsSet.size >= 2) {
                    throw new Error('Слоты co-host заняты');
                }
                coHostsSet.add(uid);
            }
            const role = uid === session.ownerUid
                ? 'owner'
                : (coHostsSet.has(uid) ? 'cohost' : 'viewer');

            let viewersCount = Math.max(0, parseInt(session.viewersCount, 10) || 0);
            if (!wasParticipant) viewersCount += 1;
            viewersCount = Math.max(1, viewersCount);

            const participants = new Set(session.participants || []);
            if (participants.size < 80) participants.add(uid);

            transaction.set(audienceRef, {
                uid,
                user: viewerName,
                avatar: viewerAvatar,
                role,
                joinedAt: audienceSnap.exists ? this.normalizeTimestamp((audienceSnap.data() || {}).joinedAt) || now : now,
                lastSeen: now,
                updatedAt: now
            }, { merge: true });
            transaction.set(ref, {
                participants: this.trimLiveParticipantsSample(Array.from(participants), 80),
                coHosts: Array.from(coHostsSet).slice(0, 2),
                viewersCount,
                updatedAt: now
            }, { merge: true });
            return { wasParticipant };
        });

        if (!summary.wasParticipant) {
            try {
                await this.db.collection('users').doc(uid).set({
                    'liveStats.joined': firebase.firestore.FieldValue.increment(1),
                    updatedAt: new Date()
                }, { merge: true });
            } catch (statsError) {
                console.warn('⚠️ Не удалось обновить liveStats.joined:', statsError?.message || statsError);
            }
        }

        const updated = await ref.get();
        return this.normalizeLiveSessionRecord(updated.data(), updated.id);
    };

    proto.leaveLiveSession = async function leaveLiveSession(sessionId) {
        const uid = this.getCurrentUid();
        if (!uid || !sessionId) return null;

        const ref = this.db.collection('liveSessions').doc(String(sessionId));
        const audienceRef = ref.collection('audience').doc(uid);
        await this.db.runTransaction(async (transaction) => {
            const snap = await transaction.get(ref);
            if (!snap.exists) return;
            const audienceSnap = await transaction.get(audienceRef);
            const session = this.normalizeLiveSessionRecord(snap.data(), snap.id);
            if (session.status !== 'live') {
                if (audienceSnap.exists) transaction.delete(audienceRef);
                return;
            }

            const now = Date.now();
            if (String(session.ownerUid || '') === String(uid)) {
                transaction.set(ref, {
                    status: 'ended',
                    endedAt: now,
                    updatedAt: now,
                    participants: [],
                    coHosts: [],
                    viewersCount: 0
                }, { merge: true });
                return;
            }

            if (audienceSnap.exists) transaction.delete(audienceRef);

            const nextParticipants = (session.participants || []).filter(v => String(v) !== String(uid));
            const nextCoHosts = (session.coHosts || []).filter(v => String(v) !== String(uid));
            let nextViewers = Math.max(0, parseInt(session.viewersCount, 10) || 0);
            if (audienceSnap.exists) nextViewers = Math.max(0, nextViewers - 1);
            nextViewers = Math.max(1, nextViewers);

            transaction.set(ref, {
                participants: this.trimLiveParticipantsSample(nextParticipants, 80),
                coHosts: nextCoHosts,
                viewersCount: nextViewers,
                updatedAt: now
            }, { merge: true });
        });

        const updated = await ref.get();
        return updated.exists ? this.normalizeLiveSessionRecord(updated.data(), updated.id) : null;
    };

    proto.endLiveSession = async function endLiveSession(sessionId) {
        const uid = this.getCurrentUid();
        if (!uid) throw new Error('Необходимо авторизироваться');
        if (!sessionId) throw new Error('Эфир не найден');

        const ref = this.db.collection('liveSessions').doc(String(sessionId));
        const snap = await ref.get();
        if (!snap.exists) throw new Error('Эфир не найден');
        const session = this.normalizeLiveSessionRecord(snap.data(), snap.id);
        const canEnd = String(session.ownerUid || '') === String(uid) || this.isCurrentUserAdmin();
        if (!canEnd) throw new Error('Только владелец может завершить эфир');

        const now = Date.now();
        await ref.set({
            status: 'ended',
            endedAt: now,
            updatedAt: now,
            participants: [],
            coHosts: [],
            viewersCount: 0
        }, { merge: true });

        try {
            let loops = 0;
            while (loops < 6) {
                loops += 1;
                const chunk = await ref.collection('audience').limit(200).get();
                if (chunk.empty) break;
                const batch = this.db.batch();
                chunk.docs.forEach(doc => batch.delete(doc.ref));
                await batch.commit();
                if (chunk.size < 200) break;
            }
        } catch (cleanupError) {
            console.warn('⚠️ Не удалось очистить audience после завершения эфира:', cleanupError?.message || cleanupError);
        }

        const updated = await ref.get();
        return this.normalizeLiveSessionRecord(updated.data(), updated.id);
    };

    proto.updateLiveSessionTitle = async function updateLiveSessionTitle(sessionId, title = '') {
        const uid = this.getCurrentUid();
        if (!uid) throw new Error('Необходимо авторизироваться');
        if (!sessionId) throw new Error('Эфир не найден');

        const safeTitle = String(title || '').trim().slice(0, 80);
        if (!safeTitle) throw new Error('Название не может быть пустым');

        const ref = this.db.collection('liveSessions').doc(String(sessionId));
        const snap = await ref.get();
        if (!snap.exists) throw new Error('Эфир не найден');
        const session = this.normalizeLiveSessionRecord(snap.data(), snap.id);
        const canEdit = String(session.ownerUid || '') === String(uid)
            || (session.coHosts || []).some(v => String(v) === String(uid))
            || this.isCurrentUserAdmin();
        if (!canEdit) throw new Error('Только ведущий может изменить название');

        await ref.set({ title: safeTitle, updatedAt: Date.now() }, { merge: true });
        const updated = await ref.get();
        return this.normalizeLiveSessionRecord(updated.data(), updated.id);
    };

    proto.sendLiveMessage = async function sendLiveMessage(sessionId, text, { type = 'text', meta = null } = {}) {
        const uid = this.getCurrentUid();
        if (!uid) throw new Error('Необходимо авторизироваться');
        if (!sessionId) throw new Error('Эфир не найден');
        const safeText = String(text || '').trim().slice(0, 240);
        if (!safeText) throw new Error('Пустое сообщение');

        const ref = this.db.collection('liveSessions').doc(String(sessionId));
        const snap = await ref.get();
        if (!snap.exists) throw new Error('Эфир не найден');
        const session = this.normalizeLiveSessionRecord(snap.data(), snap.id);
        if (session.status !== 'live') throw new Error('Эфир уже завершен');

        const audienceSnap = await ref.collection('audience').doc(uid).get();
        if (!audienceSnap.exists && String(session.ownerUid || '') !== String(uid)) {
            throw new Error('Сначала войдите в эфир');
        }

        const profile = (this.currentUser && this.currentUser.uid === uid) ? this.currentUser : await this.getUserProfile(uid);
        const userName = profile?.name || 'user';
        const avatar = this.sanitizeAvatarForPublicPayload(profile?.avatar, userName);
        const now = Date.now();
        const payload = {
            sessionId: String(sessionId),
            uid,
            user: userName,
            avatar,
            text: safeText,
            type: type === 'system' ? 'system' : (type === 'sticker' ? 'sticker' : 'text'),
            meta: meta && typeof meta === 'object' ? meta : null,
            createdAt: now
        };
        const msgRef = await ref.collection('messages').add(payload);
        await ref.set({ updatedAt: now, lastMessageAt: now }, { merge: true });
        return this.normalizeLiveMessageRecord(payload, msgRef.id);
    };

    proto.sendLiveReaction = async function sendLiveReaction(sessionId, reactionKey = 'fire') {
        const uid = this.getCurrentUid();
        if (!uid) throw new Error('Необходимо авторизироваться');
        if (!sessionId) throw new Error('Эфир не найден');
        const preset = this.getLiveReactionPreset(reactionKey);

        const ref = this.db.collection('liveSessions').doc(String(sessionId));
        const snap = await ref.get();
        if (!snap.exists) throw new Error('Эфир не найден');
        const session = this.normalizeLiveSessionRecord(snap.data(), snap.id);
        if (session.status !== 'live') throw new Error('Эфир уже завершен');

        const audienceSnap = await ref.collection('audience').doc(uid).get();
        if (!audienceSnap.exists && String(session.ownerUid || '') !== String(uid)) {
            throw new Error('Сначала войдите в эфир');
        }

        const profile = (this.currentUser && this.currentUser.uid === uid) ? this.currentUser : await this.getUserProfile(uid);
        const userName = profile?.name || 'user';
        const avatar = this.sanitizeAvatarForPublicPayload(profile?.avatar, userName);
        const now = Date.now();

        await ref.set({
            [`reactionCounters.${preset.key}`]: firebase.firestore.FieldValue.increment(1),
            updatedAt: now,
            lastReactionAt: now
        }, { merge: true });

        const reaction = {
            sessionId: String(sessionId),
            uid,
            user: userName,
            avatar,
            reactionKey: preset.key,
            emoji: preset.emoji,
            createdAt: now
        };
        const reactionRef = await ref.collection('reactions').add(reaction);
        return this.normalizeLiveReactionRecord(reaction, reactionRef.id);
    };

    proto.pinLiveMessage = async function pinLiveMessage(sessionId, message = {}) {
        const uid = this.getCurrentUid();
        if (!uid || !sessionId) throw new Error('Эфир не найден');
        const safeText = String(message && message.text ? message.text : '').trim().slice(0, 240);
        if (!safeText) throw new Error('Нечего закреплять');

        const ref = this.db.collection('liveSessions').doc(String(sessionId));
        const snap = await ref.get();
        if (!snap.exists) throw new Error('Эфир не найден');
        const session = this.normalizeLiveSessionRecord(snap.data(), snap.id);
        const canPin = String(session.ownerUid || '') === String(uid)
            || (session.coHosts || []).some(v => String(v) === String(uid))
            || this.isCurrentUserAdmin();
        if (!canPin) throw new Error('Только ведущий может закреплять сообщения');

        await ref.set({
            pinnedMessage: {
                id: message.id ? String(message.id) : null,
                uid: message.uid ? String(message.uid) : null,
                user: String(message.user || 'user').trim().slice(0, 80) || 'user',
                avatar: this.sanitizeAvatarForPublicPayload(message.avatar, message.user || 'user'),
                text: safeText,
                createdAt: this.normalizeTimestamp(message.createdAt) || Date.now(),
                pinnedAt: Date.now(),
                pinnedByUid: uid
            },
            updatedAt: Date.now()
        }, { merge: true });
        const updated = await ref.get();
        return this.normalizeLiveSessionRecord(updated.data(), updated.id);
    };

    proto.clearLivePinnedMessage = async function clearLivePinnedMessage(sessionId) {
        const uid = this.getCurrentUid();
        if (!uid || !sessionId) throw new Error('Эфир не найден');
        const ref = this.db.collection('liveSessions').doc(String(sessionId));
        const snap = await ref.get();
        if (!snap.exists) throw new Error('Эфир не найден');
        const session = this.normalizeLiveSessionRecord(snap.data(), snap.id);
        const canPin = String(session.ownerUid || '') === String(uid)
            || (session.coHosts || []).some(v => String(v) === String(uid))
            || this.isCurrentUserAdmin();
        if (!canPin) throw new Error('Только ведущий может снимать закреп');
        await ref.set({ pinnedMessage: null, updatedAt: Date.now() }, { merge: true });
        const updated = await ref.get();
        return this.normalizeLiveSessionRecord(updated.data(), updated.id);
    };

    proto.touchLiveAudience = async function touchLiveAudience(sessionId, { role = 'viewer' } = {}) {
        const uid = this.getCurrentUid();
        if (!uid || !sessionId) return false;
        const profile = (this.currentUser && this.currentUser.uid === uid) ? this.currentUser : await this.getUserProfile(uid);
        const userName = profile?.name || 'user';
        const avatar = this.sanitizeAvatarForPublicPayload(profile?.avatar, userName);
        const now = Date.now();
        await this.db.collection('liveSessions').doc(String(sessionId)).collection('audience').doc(uid).set({
            uid,
            user: userName,
            avatar,
            role: role === 'owner' ? 'owner' : (role === 'cohost' ? 'cohost' : 'viewer'),
            lastSeen: now,
            updatedAt: now
        }, { merge: true });
        return true;
    };

    proto.sendLiveSignal = async function sendLiveSignal(sessionId, { toUid, type, payload = {} } = {}) {
        const fromUid = this.getCurrentUid();
        if (!fromUid) throw new Error('Необходимо авторизироваться');
        if (!sessionId) throw new Error('Эфир не найден');
        const safeToUid = String(toUid || '').trim();
        if (!safeToUid) throw new Error('Получатель сигнала не найден');

        const safeType = String(type || '').trim().toLowerCase();
        if (!safeType) throw new Error('Тип сигнала не указан');

        const now = Date.now();
        const payloadDoc = {
            sessionId: String(sessionId),
            fromUid: String(fromUid),
            toUid: safeToUid,
            type: safeType,
            payload: payload && typeof payload === 'object' ? payload : {},
            createdAt: now
        };
        const ref = await this.db.collection('liveSessions')
            .doc(String(sessionId))
            .collection('signals')
            .add(payloadDoc);
        return { id: ref.id, ...payloadDoc };
    };

    proto.deleteLiveSignal = async function deleteLiveSignal(sessionId, signalId) {
        if (!sessionId || !signalId) return false;
        await this.db.collection('liveSessions')
            .doc(String(sessionId))
            .collection('signals')
            .doc(String(signalId))
            .delete();
        return true;
    };

    proto.subscribeToLiveSignals = function subscribeToLiveSignals(sessionId, toUid, callback) {
        if (!sessionId || !toUid || typeof callback !== 'function') return () => {};
        const safeUid = String(toUid || '');
        return this.db.collection('liveSessions')
            .doc(String(sessionId))
            .collection('signals')
            .where('toUid', '==', safeUid)
            .onSnapshot((snapshot) => {
                const changes = snapshot.docChanges()
                    .filter(change => change.type === 'added')
                    .map((change) => {
                        const data = change.doc.data() || {};
                        return {
                            id: change.doc.id,
                            sessionId: String(data.sessionId || sessionId),
                            fromUid: data.fromUid ? String(data.fromUid) : null,
                            toUid: data.toUid ? String(data.toUid) : safeUid,
                            type: String(data.type || '').trim().toLowerCase(),
                            payload: data.payload && typeof data.payload === 'object' ? data.payload : {},
                            createdAt: this.normalizeTimestamp(data.createdAt)
                        };
                    })
                    .sort((a, b) => a.createdAt - b.createdAt);
                callback(changes);
            }, (error) => {
                console.error('Ошибка подписки на live-сигналы:', error);
            });
    };

    proto.subscribeToLiveSession = function subscribeToLiveSession(sessionId, callback) {
        if (!sessionId || typeof callback !== 'function') return () => {};
        return this.db.collection('liveSessions').doc(String(sessionId)).onSnapshot((doc) => {
            callback(doc.exists ? this.normalizeLiveSessionRecord(doc.data(), doc.id) : null);
        }, (error) => {
            console.error('Ошибка подписки на live-сессию:', error);
        });
    };

    proto.subscribeToLiveMessages = function subscribeToLiveMessages(sessionId, callback, { limit = 120 } = {}) {
        if (!sessionId || typeof callback !== 'function') return () => {};
        const safeLimit = Math.max(20, Math.min(parseInt(limit, 10) || 120, 300));
        return this.db.collection('liveSessions').doc(String(sessionId)).collection('messages')
            .orderBy('createdAt', 'asc')
            .limitToLast(safeLimit)
            .onSnapshot((snapshot) => {
                const rows = snapshot.docs
                    .map(doc => this.normalizeLiveMessageRecord(doc.data(), doc.id))
                    .sort((a, b) => a.createdAt - b.createdAt);
                callback(rows);
            }, (error) => {
                console.error('Ошибка подписки на live-чат:', error);
            });
    };

    proto.subscribeToLiveReactions = function subscribeToLiveReactions(sessionId, callback, { limit = 60 } = {}) {
        if (!sessionId || typeof callback !== 'function') return () => {};
        const safeLimit = Math.max(10, Math.min(parseInt(limit, 10) || 60, 180));
        return this.db.collection('liveSessions').doc(String(sessionId)).collection('reactions')
            .orderBy('createdAt', 'desc')
            .limit(safeLimit)
            .onSnapshot((snapshot) => {
                const rows = snapshot.docs
                    .map(doc => this.normalizeLiveReactionRecord(doc.data(), doc.id))
                    .sort((a, b) => b.createdAt - a.createdAt);
                callback(rows);
            }, (error) => {
                console.error('Ошибка подписки на live-реакции:', error);
            });
    };

    proto.subscribeToLiveAudience = function subscribeToLiveAudience(sessionId, callback, { limit = 24 } = {}) {
        if (!sessionId || typeof callback !== 'function') return () => {};
        const safeLimit = Math.max(5, Math.min(parseInt(limit, 10) || 24, 120));
        return this.db.collection('liveSessions').doc(String(sessionId)).collection('audience')
            .orderBy('lastSeen', 'desc')
            .limit(safeLimit)
            .onSnapshot((snapshot) => {
                const rows = snapshot.docs.map((doc) => {
                    const data = doc.data() || {};
                    return {
                        uid: data.uid ? String(data.uid) : doc.id,
                        user: String(data.user || 'user').trim().slice(0, 80) || 'user',
                        avatar: this.sanitizeAvatarForPublicPayload(data.avatar, data.user || 'user'),
                        role: data.role === 'owner' ? 'owner' : (data.role === 'cohost' ? 'cohost' : 'viewer'),
                        joinedAt: this.normalizeTimestamp(data.joinedAt),
                        lastSeen: this.normalizeTimestamp(data.lastSeen)
                    };
                });
                callback(rows);
            }, (error) => {
                console.error('Ошибка подписки на live-аудиторию:', error);
            });
    };
})(typeof window !== 'undefined' ? window : globalThis);
