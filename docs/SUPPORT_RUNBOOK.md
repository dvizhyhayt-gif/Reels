# Support Runbook

Operational checklist for maintaining Reelgram without regressions.

## 1) Quick health check

Run from project root:

```powershell
powershell -ExecutionPolicy Bypass -File docs/scripts/revision-audit.ps1
```

Check:
- Biggest files.
- JS line count distribution.
- Longest methods in `js/app.js`.

## 2) Runtime performance checks

Open browser console after app load:

```js
window.app.getPerfReport(15)
window.reelgramPerf.getRecentSamples(30)
```

Interpretation:
- High `avgMs` or `maxMs` for `feed.load`, `chats.load`, `stories.load`, `notifications.load` means UI pressure or network/firestore bottleneck.
- High `slowCount` indicates recurring latency, not one-time spikes.

## 3) Release smoke checks (mobile first)

1. Feed scroll + autoplay + like/comment/share.
2. Stories strip + viewer navigation.
3. Messages list + open chat + send text/sticker/file.
4. Profile stats and followers/following list.
5. Admin/security screens (if admin account).

## 4) Safe refactor rules

- Move one subsystem at a time.
- Keep public method names stable while splitting modules.
- Add small wrappers in `app.js` first, then move implementation.
- Re-test after every moved block (do not move everything in one patch).

## 5) Incident checklist

When users report "app is slow":

1. Capture `window.app.getPerfReport(15)`.
2. Capture `window.reelgramPerf.getRecentSamples(30)`.
3. Run `docs/scripts/revision-audit.ps1`.
4. Identify if slowdown is:
   - render-bound (DOM/paint),
   - firestore/network-bound,
   - storage/quota-bound.
5. Patch the narrowest hotspot first.

