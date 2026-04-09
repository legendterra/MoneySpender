self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const payload = event.data ? event.data.json() : {};
  const title = payload.title || "MoneySpender";
  const options = {
    body: payload.body || "Saatnya catat keuangan hari ini.",
    icon: "/icon-512-maskable.png",
    badge: "/icon-192.png",
    data: payload.url || "/dashboard",
    vibrate: [120, 40, 120],
    tag: payload.tag || "moneyspender-reminder",
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destination = event.notification.data || "/dashboard";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(destination);
          return client.focus();
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(destination);
      }

      return undefined;
    }),
  );
});
