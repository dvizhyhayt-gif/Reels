/**
 * WebRTC compatibility and runtime ICE config helpers.
 */
(function attachWebRtcCompat(globalObject) {
    'use strict';

    if (!globalObject) return;
    if (globalObject.ReelgramWebRTC) return;

    const DEFAULT_ICE_SERVERS = [
        { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }
    ];

    function safeJsonParse(value) {
        try {
            return JSON.parse(value);
        } catch (_) {
            return null;
        }
    }

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function normalizeIceServer(row) {
        if (!row || typeof row !== 'object') return null;
        const out = {};
        const urls = row.urls || row.url;
        if (Array.isArray(urls)) {
            out.urls = urls.map(v => String(v || '').trim()).filter(Boolean);
        } else if (typeof urls === 'string') {
            const safe = String(urls).trim();
            if (safe) out.urls = [safe];
        }
        if (!out.urls || !out.urls.length) return null;

        if (row.username != null) out.username = String(row.username);
        if (row.credential != null) out.credential = String(row.credential);
        if (row.credentialType != null) out.credentialType = String(row.credentialType);
        return out;
    }

    function resolveConfiguredIceServers() {
        const runtime = globalObject.REELGRAM_WEBRTC_ICE_SERVERS;
        let runtimeRows = [];
        if (typeof runtime === 'string') {
            const parsed = safeJsonParse(runtime);
            runtimeRows = asArray(parsed);
        } else {
            runtimeRows = asArray(runtime);
        }

        const configRows = asArray(
            globalObject.ReelgramAppConfig
            && globalObject.ReelgramAppConfig.webrtc
            && globalObject.ReelgramAppConfig.webrtc.iceServers
        );

        const rows = runtimeRows.length ? runtimeRows : configRows;
        const normalized = rows.map(normalizeIceServer).filter(Boolean);
        return normalized.length ? normalized : DEFAULT_ICE_SERVERS;
    }

    function hasTurnServer(iceServers) {
        return asArray(iceServers).some((server) => {
            const urls = Array.isArray(server.urls) ? server.urls : [server.urls];
            return urls.some((url) => /^turns?:/i.test(String(url || '').trim()));
        });
    }

    function getPeerConnectionCtor() {
        return globalObject.RTCPeerConnection
            || globalObject.webkitRTCPeerConnection
            || globalObject.mozRTCPeerConnection
            || null;
    }

    function getSessionDescriptionCtor() {
        return globalObject.RTCSessionDescription
            || globalObject.webkitRTCSessionDescription
            || globalObject.mozRTCSessionDescription
            || null;
    }

    function getIceCandidateCtor() {
        return globalObject.RTCIceCandidate
            || globalObject.webkitRTCIceCandidate
            || globalObject.mozRTCIceCandidate
            || null;
    }

    function toSessionDescription(desc) {
        const Ctor = getSessionDescriptionCtor();
        if (!desc) return null;
        return Ctor ? new Ctor(desc) : desc;
    }

    function toIceCandidate(candidate) {
        const Ctor = getIceCandidateCtor();
        if (!candidate) return null;
        return Ctor ? new Ctor(candidate) : candidate;
    }

    function getLegacyGetUserMedia() {
        const nav = globalObject.navigator || {};
        return nav.getUserMedia || nav.webkitGetUserMedia || nav.mozGetUserMedia || null;
    }

    async function getUserMedia(constraints) {
        const nav = globalObject.navigator || {};
        if (nav.mediaDevices && typeof nav.mediaDevices.getUserMedia === 'function') {
            return nav.mediaDevices.getUserMedia(constraints);
        }
        const legacy = getLegacyGetUserMedia();
        if (!legacy) {
            throw new Error('getUserMedia is unavailable');
        }
        return new Promise((resolve, reject) => {
            legacy.call(nav, constraints, resolve, reject);
        });
    }

    function isSecureContextLike() {
        if (globalObject.isSecureContext) return true;
        const locationObj = globalObject.location || {};
        const protocol = String(locationObj.protocol || '').toLowerCase();
        const hostname = String(locationObj.hostname || '').toLowerCase();
        return protocol === 'https:' || hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
    }

    function getSupportErrorMessage() {
        const peerCtor = getPeerConnectionCtor();
        if (!peerCtor) return 'WebRTC is not supported in this browser.';
        if (!isSecureContextLike()) return 'WebRTC requires HTTPS (or localhost).';
        const nav = globalObject.navigator || {};
        const hasModern = !!(nav.mediaDevices && typeof nav.mediaDevices.getUserMedia === 'function');
        const hasLegacy = !!getLegacyGetUserMedia();
        if (!hasModern && !hasLegacy) return 'Camera/Microphone API is unavailable in this browser.';
        return '';
    }

    function getRecommendedConstraints() {
        return {
            video: {
                facingMode: 'user',
                width: { ideal: 640 },
                height: { ideal: 960 },
                frameRate: { ideal: 24, max: 30 }
            },
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            }
        };
    }

    globalObject.ReelgramWebRTC = {
        getPeerConnectionCtor,
        getSessionDescriptionCtor,
        getIceCandidateCtor,
        toSessionDescription,
        toIceCandidate,
        getUserMedia,
        getSupportErrorMessage,
        getRecommendedConstraints,
        isSecureContextLike,
        getIceServers: resolveConfiguredIceServers,
        hasTurnServer: () => hasTurnServer(resolveConfiguredIceServers()),
        hasTurnServerFor: hasTurnServer
    };
})(typeof window !== 'undefined' ? window : globalThis);

