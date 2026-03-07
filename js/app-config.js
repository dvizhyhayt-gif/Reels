/**
 * Reelgram App Config
 * Shared config/constants extracted from app.js to keep the main file smaller.
 */
(function attachReelgramConfig(globalObject) {
    const cp = (...points) => String.fromCodePoint(...points);

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
                cp(0x1F970), cp(0x1F979), cp(0x1F62D), cp(0x1F602), cp(0x1F60F), cp(0x1F92D),
                cp(0x1F60E), cp(0x1F973), cp(0x1F525), cp(0x2728), cp(0x1F485), cp(0x1F451),
                cp(0x1F480), cp(0x1F4AF), cp(0x1F3C6), cp(0x2615), cp(0x1F4A5), cp(0x1F44F),
                cp(0x1F60D), cp(0x1F64C), cp(0x1F44D), cp(0x1F91D), cp(0x1F92F), cp(0x1F92A),
                cp(0x26A1), cp(0x2764, 0xFE0F), cp(0x1F389), cp(0x1F60C), cp(0x1F4AB)
            ]),
            stickerPack: Object.freeze([
                Object.freeze({ id: 'party', title: 'PARTY', emoji: cp(0x1F973), style: 'sticker-style-party', motion: 'sticker-motion-bounce' }),
                Object.freeze({ id: 'slay', title: 'SLAY', emoji: cp(0x1F485), style: 'sticker-style-slay', motion: 'sticker-motion-sway' }),
                Object.freeze({ id: 'aura', title: 'AURA', emoji: cp(0x2728), style: 'sticker-style-aura', motion: 'sticker-motion-glow' }),
                Object.freeze({ id: 'mood', title: 'MOOD', emoji: cp(0x1F60E), style: 'sticker-style-mood', motion: 'sticker-motion-drift' }),
                Object.freeze({ id: 'love', title: 'LOVE', emoji: cp(0x1F60D), style: 'sticker-style-love', motion: 'sticker-motion-pulse' }),
                Object.freeze({ id: 'fire', title: 'FIRE', emoji: cp(0x1F525), style: 'sticker-style-fire', motion: 'sticker-motion-pop' }),
                Object.freeze({ id: 'icon', title: 'ICON', emoji: cp(0x1F451), style: 'sticker-style-icon', motion: 'sticker-motion-sway' }),
                Object.freeze({ id: 'tea', title: 'TEA', emoji: cp(0x2615), style: 'sticker-style-tea', motion: 'sticker-motion-drift' }),
                Object.freeze({ id: 'rizz', title: 'RIZZ', emoji: cp(0x1F60F), style: 'sticker-style-rizz', motion: 'sticker-motion-wiggle' }),
                Object.freeze({ id: 'dead', title: 'DEAD', emoji: cp(0x1F480), style: 'sticker-style-dead', motion: 'sticker-motion-shake' }),
                Object.freeze({ id: 'cry', title: 'CRY', emoji: cp(0x1F62D), style: 'sticker-style-cry', motion: 'sticker-motion-drift' }),
                Object.freeze({ id: 'omg', title: 'OMG', emoji: cp(0x1F92F), style: 'sticker-style-wow', motion: 'sticker-motion-pop' }),
                Object.freeze({ id: 'lol', title: 'LOL', emoji: cp(0x1F602), style: 'sticker-style-lol', motion: 'sticker-motion-bounce' }),
                Object.freeze({ id: 'flex', title: 'FLEX', emoji: cp(0x1F4AA), style: 'sticker-style-flex', motion: 'sticker-motion-pulse' }),
                Object.freeze({ id: 'hype', title: 'HYPE', emoji: cp(0x26A1), style: 'sticker-style-hype', motion: 'sticker-motion-wiggle' }),
                Object.freeze({ id: 'win', title: 'W', emoji: cp(0x1F3C6), style: 'sticker-style-win', motion: 'sticker-motion-glow' }),
                Object.freeze({ id: 'delulu', title: 'DELULU', emoji: cp(0x1F92A), style: 'sticker-style-delulu', motion: 'sticker-motion-sway' }),
                Object.freeze({ id: 'boss', title: 'BOSS', emoji: cp(0x1F4A5), style: 'sticker-style-boss', motion: 'sticker-motion-shake' })
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
