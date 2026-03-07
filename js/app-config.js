/**
 * Reelgram App Config
 * Shared config/constants extracted from app.js to keep the main file smaller.
 */
(function attachReelgramConfig(globalObject) {
    const config = {
        storageKeys: Object.freeze({
            uploadDraft: 'reelgram_upload_draft_v1',
            feedPrefs: 'reelgram_feed_prefs_v1',
            moderationPrefs: 'reelgram_moderation_prefs_v1',
            watchProfile: 'reelgram_watch_profile_v1',
            storySeen: 'reelgram_story_seen_v1'
        }),
        ui: Object.freeze({
            emojiList: Object.freeze([
                '😀', '😂', '😍', '😋', '🥳', '🔥', '❤️', '👍',
                '👏', '🤝', '🤔', '😢', '🙌', '✨', '😅', '🎉'
            ]),
            stickerPack: Object.freeze([
                Object.freeze({ id: 'party', title: '\u041f\u0430\u0442\u0438', emoji: '🥳', style: 'sticker-style-party', motion: 'sticker-motion-bounce' }),
                Object.freeze({ id: 'wow', title: '\u0412\u0430\u0443', emoji: '🤯', style: 'sticker-style-wow', motion: 'sticker-motion-pop' }),
                Object.freeze({ id: 'cool', title: '\u041a\u0440\u0443\u0442\u043e', emoji: '😋', style: 'sticker-style-cool', motion: 'sticker-motion-wiggle' }),
                Object.freeze({ id: 'love', title: '\u041b\u044e\u0431\u043e\u0432\u044c', emoji: '😍', style: 'sticker-style-love', motion: 'sticker-motion-pulse' }),
                Object.freeze({ id: 'fire', title: '\u041e\u0433\u043e\u043d\u044c', emoji: '🔥', style: 'sticker-style-fire', motion: 'sticker-motion-pop' }),
                Object.freeze({ id: 'lol', title: '\u0421\u043c\u0435\u0445', emoji: '😂', style: 'sticker-style-lol', motion: 'sticker-motion-bounce' }),
                Object.freeze({ id: 'power', title: '\u0421\u0438\u043b\u0430', emoji: '💪', style: 'sticker-style-power', motion: 'sticker-motion-pulse' }),
                Object.freeze({ id: 'hype', title: '\u0425\u0430\u0439\u043f', emoji: '⚡', style: 'sticker-style-hype', motion: 'sticker-motion-wiggle' })
            ])
        }),
        perf: Object.freeze({
            defaultWarnMs: 900,
            warnThresholdByLabel: Object.freeze({
                'feed.load': 1500,
                'stories.load': 1200,
                'notifications.load': 1000,
                'chats.load': 2500
            }),
            maxSamples: 200
        }),
        webrtc: Object.freeze({
            // You can override in runtime:
            // window.REELGRAM_WEBRTC_ICE_SERVERS = [{ urls: 'turn:turn.example.com:3478', username: 'user', credential: 'pass' }]
            iceServers: Object.freeze([
                Object.freeze({
                    urls: Object.freeze([
                        'stun:stun.l.google.com:19302',
                        'stun:stun1.l.google.com:19302',
                        'stun:stun2.l.google.com:19302',
                        'stun:stun3.l.google.com:19302',
                        'stun:stun4.l.google.com:19302'
                    ])
                })
            ])
        })
    };

    globalObject.ReelgramAppConfig = Object.freeze(config);
})(typeof window !== 'undefined' ? window : globalThis);
