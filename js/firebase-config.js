/**
 * Firebase bootstrap for the frontend.
 *
 * Keep this file limited to:
 * 1. Runtime config values
 * 2. Optional external media storage config
 * 3. One-time Firebase app initialization
 *
 * Business logic belongs in `js/firebase-service.js`.
 */

(function initFirebaseBootstrap(global) {
    'use strict';

    const firebaseConfig = {
        apiKey: 'AIzaSyCIn6UKRIPdaKFuCBZUUW0GYR4fG4eQ9gQ',
        authDomain: 'kazreels.firebaseapp.com',
        projectId: 'kazreels',
        storageBucket: 'kazreels.appspot.com',
        messagingSenderId: '849520714213',
        appId: '1:849520714213:web:54975013c201e75a110f0c'
    };

    // External media storage remains configurable independently from Firebase.
    global.CLOUDFLARE_MEDIA_CONFIG = {
        enabled: true,
        provider: 'cloudflare',
        uploadEndpoint: 'https://kazreels.dvizhyhayt.workers.dev/upload',
        deleteEndpoint: 'https://kazreels.dvizhyhayt.workers.dev/delete',
        authToken: '',
        folderPrefix: 'kazreels'
    };

    global.REELGRAM_FIREBASE_CONFIG = firebaseConfig;

    if (typeof global.firebase === 'undefined') {
        console.error('[firebase-config] Firebase SDK is not loaded before firebase-config.js.');
        return;
    }

    try {
        if (!global.firebase.apps || global.firebase.apps.length === 0) {
            global.firebase.initializeApp(firebaseConfig);
        }

        const db = global.firebase.firestore();
        db.settings({
            experimentalForceLongPolling: true
        });

        try {
            global.firebase.storage();
        } catch (storageError) {
            console.warn('[firebase-config] Firebase Storage is unavailable. Falling back to external media storage if configured.');
        }
    } catch (error) {
        if (error && error.code === 'app/duplicate-app') {
            return;
        }

        console.error('[firebase-config] Firebase initialization failed:', error);
    }
})(window);
