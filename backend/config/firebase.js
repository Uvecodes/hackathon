const admin = require('firebase-admin');
const path = require('path');

// Support two ways to supply the service account:
//
//  1. FIREBASE_SERVICE_ACCOUNT_JSON  — entire JSON pasted as a single env-var string
//     (preferred for cloud deployments like Render where no filesystem is available)
//
//  2. FIREBASE_KEY_PATH  — path to a local .json file
//     (used for local development)

let serviceAccount = null;

if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
  try {
    serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  } catch (err) {
    console.error('WARNING: FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON —', err.message);
  }
} else if (process.env.FIREBASE_KEY_PATH) {
  try {
    serviceAccount = require(path.resolve(process.env.FIREBASE_KEY_PATH));
  } catch (err) {
    console.error(`WARNING: Cannot load Firebase key from ${process.env.FIREBASE_KEY_PATH}`);
  }
} else {
  console.warn('WARNING: No Firebase credentials set. Firebase routes will return 503 until configured.');
}

// Initialize Firebase Admin SDK (graceful — server keeps running if this fails)
let db = null;
let auth = null;
let storage = null;

if (serviceAccount) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✓ Firebase Admin SDK initialized');
    db = admin.firestore();
    auth = admin.auth();
    storage = admin.storage();
  } catch (err) {
    console.error('WARNING: Failed to initialize Firebase Admin SDK —', err.message);
  }
}

// Export Firestore, Auth, and Storage (null when Firebase is not configured)
module.exports = { db, auth, storage, admin };
