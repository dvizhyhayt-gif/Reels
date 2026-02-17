# Refactor Roadmap (app.js decomposition)

Goal: reduce risk and complexity by moving feature domains out of `js/app.js`.

## Target module map

- `js/app-core.js`
  - App boot, navigation, global state glue.
- `js/app-feed.js`
  - Feed loading, card events, paging, pull-to-refresh.
- `js/app-profile.js`
  - Deep links, external profile loading, follow/message profile actions.
- `js/app-messages.js`
  - Notifications, chats, realtime subscriptions, typing state, unread/badges.
- `js/app-calls.js`
  - Optional future split for WebRTC call lifecycle and signaling integration.
- `js/app-admin.js`
  - Admin panel actions, user moderation, exports.

## Migration strategy

1. Introduce thin wrappers in `app.js`.
2. Move implementation into one module file.
3. Keep method signatures stable.
4. Run smoke checks after each moved module.
5. Repeat module by module.

## Recommended order

1. Feed (`app-feed.js`)
2. Messages + notifications + calls (`app-messages.js`)
3. Profile deeplinks/actions (`app-profile.js`)
4. Admin (`app-admin.js`)
5. Final cleanup (`app-core.js`)

## Progress

- Done: feed module extraction (`js/app-feed.js`).
- Done: messaging/notifications/calls extraction (`js/app-messages.js`).
- Done: profile deeplinks/actions extraction (`js/app-profile.js`).
- Current: `js/app.js` reduced to ~4.8k lines, with legacy core still inside.
- Next: extract admin panel logic, then split remaining app core.

## Guardrails

- No behavior changes during pure extraction patches.
- Do not mix feature changes with extraction in one commit.
- Keep all old entry points until migration is complete.
