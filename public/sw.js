const CACHE_VERSION = "moneyspender-v3";
const APP_SHELL = [
  "/",
  "/offline",
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
];

function shouldSkipCache(requestUrl) {
  return (
    requestUrl.pathname.startsWith("/api/") ||
    requestUrl.pathname.startsWith("/auth") ||
    ["/dashboard", "/income", "/expenses", "/debts", "/all-transactions", "/settings", "/net-worth"].includes(requestUrl.pathname) ||
    requestUrl.hostname.includes("supabase")
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (shouldSkipCache(requestUrl)) {
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          return response;
        })
        .catch(async () => {
          const cachedPage = await caches.match(event.request);
          return cachedPage || caches.match("/offline");
        }),
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (response.ok && requestUrl.origin === self.location.origin) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        }

        return response;
      });
    }),
  );
});

function readPushPayload(event) {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch {
    return { body: event.data.text() };
  }
}

// Only same-origin paths may be opened from a notification; default /dashboard.
function notificationDestination(url) {
  try {
    const target = new URL(url || "/dashboard", self.location.origin);
    return target.origin === self.location.origin ? target.href : new URL("/dashboard", self.location.origin).href;
  } catch {
    return new URL("/dashboard", self.location.origin).href;
  }
}

self.addEventListener("push", (event) => {
  const payload = readPushPayload(event);
  const title = payload.title || "MoneySpender";
  const options = {
    body: payload.body || "Saatnya catat keuangan hari ini.",
    icon: "/icon-512-maskable.png",
    badge: "/icon-192.png",
    data: { url: payload.url || "/dashboard" },
    vibrate: [120, 40, 120],
    tag: payload.tag || "moneyspender-reminder",
    renotify: Boolean(payload.tag),
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const data = event.notification.data;
  const destination = notificationDestination(typeof data === "string" ? data : data && data.url);

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          return client.focus().then((focused) => (focused && "navigate" in focused ? focused.navigate(destination) : focused));
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(destination);
      }

      return undefined;
    }),
  );
});
