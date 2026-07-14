import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging";

// Global toggle to enable/disable Firebase usage on web
// Now enabled so FCM works again
const ENABLE_FCM = true;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// When disabled, we don't even initialize the Firebase app
const app = ENABLE_FCM ? initializeApp(firebaseConfig) : null;
const messaging = ENABLE_FCM && app ? getMessaging(app) : null;

export { app, messaging, ENABLE_FCM };
