# Firebase Migration Runbook

This file is the operational handoff for moving the project to a different Firebase/Firestore project without breaking the frontend.

Use this when:
- you are moving from one Firebase project to another
- you are cloning the app for a new client
- you are rotating storage/backends before production launch

## What Is Bound To Firebase Right Now

The frontend is wired directly to Firebase v8 SDKs from `index.html`.

Load order in `index.html`:
1. `firebase-app.js`
2. `firebase-auth.js`
3. `firebase-firestore.js`
4. `firebase-storage.js`
5. `js/firebase-config.js`
6. `js/media-storage-service.js`
7. `js/firebase-service.js`

Primary integration files:
- `js/firebase-config.js`
- `js/firebase-service.js`
- `js/data-service.js`
- `js/app.js`
- `index.html`

Cloudflare media worker config is separate from Firebase config and currently lives in:
- `js/firebase-config.js`
- `wrangler.jsonc`

## Current Firebase Resources Used By The App

Main Firestore collections used by `js/firebase-service.js`:
- `users`
- `videos`
- `stories`
- `messages`
- `chatTyping`
- `calls`
- `liveSessions`
- `coinTransactions`
- `userSessions`
- `adminAuditLogs`

Subcollections currently used:
- `videos/{videoId}/comments`
- `stories/{storyId}/views`
- `calls/{callId}/candidates`

Firebase features used:
- Authentication: Email/Password
- Firestore: primary app database
- Storage: optional; app can fall back to external media storage

External media path currently supported:
- Cloudflare Worker upload/delete endpoints
- Cloudflare R2 bucket via `wrangler.jsonc`

## Step 1: Create The New Firebase Project

In Firebase Console:
1. Create the new project.
2. Add a Web App.
3. Enable Authentication:
   - Sign-in method: `Email/Password`
4. Enable Firestore Database.
5. Enable Storage only if you want to use Firebase Storage instead of external media storage.

Collect these values from Project Settings:
- `apiKey`
- `authDomain`
- `projectId`
- `storageBucket`
- `messagingSenderId`
- `appId`

## Step 2: Replace Frontend Firebase Config

Open `js/firebase-config.js`.

Replace the `firebaseConfig` object values:

```js
const firebaseConfig = {
    apiKey: 'NEW_API_KEY',
    authDomain: 'new-project.firebaseapp.com',
    projectId: 'new-project-id',
    storageBucket: 'new-project.appspot.com',
    messagingSenderId: 'NEW_SENDER_ID',
    appId: 'NEW_APP_ID'
};
```

Do not change:
- the wrapper function
- the `REELGRAM_FIREBASE_CONFIG` export on `window`
- the `experimentalForceLongPolling` Firestore setting unless you have tested browser compatibility

## Step 3: Decide Where Media Will Live

There are two media paths in this project:

1. Firebase Storage
2. External media storage via Cloudflare Worker / R2

### If You Keep Cloudflare Media

Update `window.CLOUDFLARE_MEDIA_CONFIG` in `js/firebase-config.js`:
- `uploadEndpoint`
- `deleteEndpoint`
- `authToken` if your worker validates a token
- `folderPrefix`

Update `wrangler.jsonc`:
- `name`
- `r2_buckets[0].bucket_name`
- `vars.CORS_ORIGINS`

### If You Move To Firebase Storage Only

You can leave `CLOUDFLARE_MEDIA_CONFIG.enabled = false` and confirm the upload flows still use Firebase Storage where required.

Before switching this, test:
- feed video upload
- story upload
- chat file upload

## Step 4: Recreate Firestore Structure

This app does not require pre-created collections, but your rules must allow the app to create and update them.

Minimum documents the app expects:

### `users/{uid}`

Important fields:
- `uid`
- `email`
- `name`
- `nameLower`
- `displayName`
- `avatar`
- `bio`
- `subscriptions`
- `subscribers`
- `followRequests`
- `privateAccount`
- `verified`
- `isAdmin`
- `notifications`
- `online`
- `lastSeen`
- `lastActive`

### `videos/{videoId}`

Important fields:
- `uid`
- `author`
- `avatar`
- `url`
- `desc`
- `likes`
- `likedBy`
- `views`
- `timestamp`

### `messages/{messageId}`

Important fields:
- `chatId`
- `participants`
- `fromUid`
- `toUid`
- `fromUser`
- `toUser`
- `content`
- `type`
- `timestamp`
- `delivered`
- `read`

Optional nested payloads:
- `file`
- `sticker`
- `call`

### `chatTyping/{chatId}`

Document stores typing states by user id.

### `calls/{callId}`

Used for WebRTC signaling plus nested `candidates`.

## Step 5: Review Security Rules Before Production

Do not ship with broad test rules.

At minimum:
1. Restrict writes to authenticated users.
2. Restrict profile edits to document owners.
3. Restrict message writes to chat participants.
4. Restrict call signaling writes to the two participants.
5. Restrict admin-only collections such as audit logs.

If you are preparing the project for client delivery or a fund audit, create a separate rules review before launch.

## Step 6: Validate Runtime Flows After Migration

Test this exact sequence:

1. Register a new user
2. Log out
3. Log back in
4. Edit profile
5. Upload a feed video
6. Upload a story
7. Open chat
8. Send:
   - text
   - image
   - audio file
   - video circle
9. Open another user profile and follow/unfollow
10. Verify notifications and unread counters
11. Start and end a video call

If any of these fail, inspect:
- browser console
- Network tab
- Firestore rules rejection messages
- Firebase Auth provider configuration

## Step 7: Clean Data When Cloning For Another Client

If you are cloning the product for a new customer, replace or reset:
- production Firebase keys in `js/firebase-config.js`
- Cloudflare worker endpoints in `js/firebase-config.js`
- R2 bucket name in `wrangler.jsonc`
- old seeded media in `assets/` if it contains client-branded content
- any hardcoded project names (`kazreels`, `Reelgram`) that should be rebranded

## What A Developer Usually Needs To Change

The typical transfer checklist is:

1. `js/firebase-config.js`
   Replace Firebase credentials and media endpoints.

2. `wrangler.jsonc`
   Replace worker name, bucket name, and allowed origins.

3. `index.html`
   Keep script order intact. Only change SDK versions if you test the full app.

4. `js/firebase-service.js`
   Change only if:
   - collection names are being renamed
   - rules or document schema change
   - media provider behavior changes

## If You Rename Collections

These are the high-risk search targets in `js/firebase-service.js`:
- `collection('users')`
- `collection('videos')`
- `collection('stories')`
- `collection('messages')`
- `collection('chatTyping')`
- `collection('calls')`
- `collection('liveSessions')`
- `collection('coinTransactions')`
- `collection('userSessions')`
- `collection('adminAuditLogs')`

If you rename even one collection, update every direct string reference in that file in the same pass.

## Recommended Migration Process

For a safe transfer:

1. Clone the repo
2. Replace Firebase and media config
3. Point to a staging Firebase project first
4. Run full manual smoke test
5. Only then switch to the final production Firebase project

Do not point the raw working branch at a client production Firebase project before staging validation.

## Notes For Future Cleanup

This project still mixes:
- Firebase-backed runtime data
- local fallback data in `js/data-service.js`
- external media storage config in `js/firebase-config.js`

For a cleaner long-term architecture, move config into:
- one env-driven config file
- one backend/provider abstraction layer
- one deployment document per environment
