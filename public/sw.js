// MAJR push service worker
self.addEventListener("install", (e) => {
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = { title: "MAJR", body: "Você tem uma nova atualização." };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch (_) {}

  const { title, body, url, tag, icon } = payload;
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      tag: tag || "majr-notification",
      icon: icon || "/icon-192.png",
      badge: "/icon-192.png",
      data: { url: url || "/dashboard" },
      vibrate: [120, 60, 120],
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ("focus" in w) {
          w.navigate(url).catch(() => {});
          return w.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    }),
  );
});
