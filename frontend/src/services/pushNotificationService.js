import { messaging } from "../firebase";
import { getToken, onMessage } from "firebase/messaging";
import api from "../shared/utils/api";

const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;
const ENABLE_FCM = true;
const FCM_SW_VERSION = "2026-03-06-1";

async function registerServiceWorker() {
  if (!ENABLE_FCM) return null;
  if ("serviceWorker" in navigator) {
    const registration = await navigator.serviceWorker.register(
      `/firebase-messaging-sw.js?v=${FCM_SW_VERSION}`,
    );
    return registration;
  }
  throw new Error("Service Workers are not supported");
}

async function requestNotificationPermission() {
  if (!ENABLE_FCM) return false;
  if ("Notification" in window) {
    const permission = await Notification.requestPermission();
    return permission === "granted";
  }
  return false;
}

async function getFCMToken() {
  if (!ENABLE_FCM) return null;
  const registration = await registerServiceWorker();
  if (!registration) return null;
  await registration.update();
  const token = await getToken(messaging, {
    vapidKey: VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  return token || null;
}

function getAuthTokenForCurrentContext() {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  if (path.startsWith("/admin")) {
    return localStorage.getItem("admin-token");
  }
  if (path.startsWith("/b2b-vendor")) {
    return (
      localStorage.getItem("b2b-vendor-token") ||
      localStorage.getItem("vendor-token")
    );
  }
  return localStorage.getItem("token");
}

async function registerFCMToken(forceUpdate = false) {
  if (!ENABLE_FCM) return null;
  const savedToken = localStorage.getItem("fcm_token_web");
  if (savedToken && !forceUpdate) {
    return savedToken;
  }
  const hasPermission = await requestNotificationPermission();
  if (!hasPermission) throw new Error("Notification permission not granted");
  const token = await getFCMToken();
  if (!token) throw new Error("Failed to get FCM token");
  try {
    const res = await api.post("/fcm-tokens/save", { token, platform: "web" });
    if (!res?.success)
      throw new Error(res?.message || "Failed to register token with backend");
  } catch (err) {
    throw err;
  }
  localStorage.setItem("fcm_token_web", token);
  return token;
}

function setupForegroundNotificationHandler(handler) {
  if (!ENABLE_FCM) return;
  onMessage(messaging, (payload) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(payload.notification.title, {
        body: payload.notification.body,
        icon: payload.notification.icon || "/favicon.png",
        data: payload.data,
      });
    }
    if (handler) handler(payload);
  });
}

async function initializePushNotifications() {
  if (!ENABLE_FCM) return;
  try {
    await registerServiceWorker();
  } catch {}
}

export {
  initializePushNotifications,
  registerFCMToken,
  setupForegroundNotificationHandler,
  requestNotificationPermission,
};
