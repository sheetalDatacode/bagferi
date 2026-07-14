importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js",
);

const ENABLE_FCM = true;

if (ENABLE_FCM) {
  try {
    // Keep service worker syntax broadly compatible for older browser engines.
    var runtimeConfig = self.__FIREBASE_CONFIG__ || null;
    var firebaseConfig = runtimeConfig || { messagingSenderId: "237174767048" };
    if (firebaseConfig.apiKey && firebaseConfig.projectId) {
      firebase.initializeApp(firebaseConfig);
      var messaging = firebase.messaging();
      messaging.onBackgroundMessage(function (payload) {
        var notificationData = payload && payload.notification ? payload.notification : {};
        var notificationTitle = notificationData.title || "Notification";
        var notificationOptions = {
          body: notificationData.body || "",
          icon: notificationData.icon || "/favicon.png",
          data: payload ? payload.data : null,
          requireInteraction: true,
        };
        self.registration.showNotification(notificationTitle, notificationOptions);
      });
    }
  } catch (e) {
    console.warn("[FCM SW] Init failed:", (e && e.message) || e);
  }

  self.addEventListener("notificationclick", function (event) {
    event.notification.close();
    var data = event.notification ? event.notification.data : null;
    var urlToOpen = (data && data.link) || "/";
    event.waitUntil(
      clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then(function (clientList) {
          for (var i = 0; i < clientList.length; i += 1) {
            var client = clientList[i];
            if (client.url === urlToOpen && "focus" in client) {
              return client.focus();
            }
          }
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        }),
    );
  });
}
