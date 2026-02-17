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
            storySeen: 'reelgram_story_seen_v1',
            seasonTheme: 'reelgram_season_theme_v1'
        }),
        ui: Object.freeze({
            emojiList: Object.freeze([
                '😀', '😂', '😍', '😎', '🥳', '🔥', '❤️', '👍',
                '👏', '🤝', '🤔', '😢', '🙌', '✨', '😅', '🎉'
            ]),
            stickerPack: Object.freeze([
                Object.freeze({ id: 'party', title: 'Party', emoji: '🥳', style: 'sticker-style-party', motion: 'sticker-motion-bounce' }),
                Object.freeze({ id: 'wow', title: 'Wow', emoji: '🤯', style: 'sticker-style-wow', motion: 'sticker-motion-pop' }),
                Object.freeze({ id: 'cool', title: 'Cool', emoji: '😎', style: 'sticker-style-cool', motion: 'sticker-motion-wiggle' }),
                Object.freeze({ id: 'love', title: 'Love', emoji: '😍', style: 'sticker-style-love', motion: 'sticker-motion-pulse' }),
                Object.freeze({ id: 'fire', title: 'Fire', emoji: '🔥', style: 'sticker-style-fire', motion: 'sticker-motion-pop' }),
                Object.freeze({ id: 'lol', title: 'Lol', emoji: '😂', style: 'sticker-style-lol', motion: 'sticker-motion-bounce' }),
                Object.freeze({ id: 'power', title: 'Power', emoji: '💪', style: 'sticker-style-power', motion: 'sticker-motion-pulse' }),
                Object.freeze({ id: 'hype', title: 'Hype', emoji: '⚡', style: 'sticker-style-hype', motion: 'sticker-motion-wiggle' })
            ]),
            giftAmounts: Object.freeze([10, 25, 50, 100, 250, 500])
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
