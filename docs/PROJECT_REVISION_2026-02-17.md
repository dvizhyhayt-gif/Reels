# Project Revision - 2026-02-17

This document records the current technical state and the refactor plan.

## 1) Current snapshot

- `js/app.js`: ~4827 lines, ~216 KB.
- `js/firebase-service.js`: ~2337 lines, ~93 KB.
- `js/app-messages.js`: ~1733 lines, ~75 KB.
- `js/app-profile.js`: ~370 lines, ~17 KB.
- `js/data-service.js`: ~643 lines.
- `js/view-renderer.js`: ~338 lines.
- Main bottleneck is still `js/app.js` (orchestration + remaining domains).

### Long methods in `app.js` (latest audit)

- `attachVideoEvents` (~224 lines)
- `ensureEnhancedUiScaffold` (~197 lines)
- `updateProfileUI` (~185 lines)
- `openUserListSheet` (~148 lines)

## 2) What was added in this revision

- Extracted app-level constants/config:
  - `js/app-config.js`
- Added runtime performance monitor:
  - `js/perf-monitor.js`
- Connected both scripts in `index.html` before `js/app.js`.
- Added perf instrumentation in critical async flows:
  - `loadFeed`
  - `loadStories`
  - `loadNotifications`
  - `loadChats`
- Added audit script:
  - `docs/scripts/revision-audit.ps1`

### Phase 2 (started): feed extraction

- Added `js/app-feed.js` and moved feed core methods there:
  - pull-to-refresh / paging / swipe
  - feed load pipeline
  - global/custom feed snapshot helpers
  - feed indexing/source helpers
- Connected `js/app-feed.js` in `index.html` after `js/app.js`.
- `js/app.js` reduced (from ~7290 to ~6900 lines at audit time).

### Phase 3 (completed): messages/notifications/calls extraction

- Added `js/app-messages.js` and moved:
  - notifications tab/badge logic
  - chats list/dialog logic
  - typing/presence realtime sync
  - call modal/signaling handlers
- Connected `js/app-messages.js` in `index.html` after `js/app.js`.

### Phase 4 (completed): profile deeplink/actions extraction

- Added `js/app-profile.js` and moved:
  - hash deeplink routing to external profile
  - external profile loading/render glue
  - follow/profile action controls
  - start chat from profile
- Connected `js/app-profile.js` in `index.html`.

## 3) Why this matters

- Config split removes hardcoded constants from `app.js` and makes updates safer.
- Perf monitor gives objective numbers before each refactor/release.
- Audit script creates a repeatable project health check.

## 4) Hotspots to split next (priority)

1. Admin subsystem from `app.js` into `js/app-admin.js`.
2. Upload/search/onboarding/security flows split into dedicated modules.
3. Keep extracting remaining long methods in `js/app.js` (`attachVideoEvents`, `ensureEnhancedUiScaffold`, `updateProfileUI`).
4. Keep `app.js` as orchestration only (init + navigation + shared glue).

## 5) Success criteria for next phase

- `js/app.js` reduced below 3500 lines.
- No single method above 180 lines.
- Each feature module has one responsibility.
- Existing UX behavior remains unchanged.
