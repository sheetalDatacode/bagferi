import admin from 'firebase-admin';
import fs from 'fs';

// Global toggle to enable/disable Firebase Admin usage on backend
// Now enabled so push notifications can be sent
const ENABLE_FCM = true;

let initialized = false;

function initFirebaseAdmin() {
  if (!ENABLE_FCM) {
    return;
  }
  if (initialized) return;
  const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
  const configJson = process.env.FIREBASE_CONFIG;
  const serviceAccountInline = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (serviceAccountInline) {
    const parsed = JSON.parse(serviceAccountInline);
    if (parsed.private_key && typeof parsed.private_key === 'string') {
      parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(parsed)
    });
    initialized = true;
    return;
  }
  if (configJson) {
    const creds = JSON.parse(configJson);
    if (creds.private_key && typeof creds.private_key === 'string') {
      creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(creds)
    });
    initialized = true;
    return;
  }
  if (serviceAccountPath && fs.existsSync(serviceAccountPath)) {
    const creds = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    if (creds.private_key && typeof creds.private_key === 'string') {
      creds.private_key = creds.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(creds)
    });
    initialized = true;
    return;
  }
  admin.initializeApp();
  initialized = true;
}

export async function sendPushNotification(tokens, payload) {
  if (!ENABLE_FCM) {
    return { success: false, message: 'Firebase push notifications are disabled' };
  }
  initFirebaseAdmin();
  const message = {
    notification: {
      title: payload.title,
      body: payload.body
    },
    data: payload.data || {},
    tokens
  };
  const response = await admin.messaging().sendEachForMulticast(message);
  return response;
}
