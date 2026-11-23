const CACHE_VERSION = "moneyspender-v4";
const OFFLINE_URL = "/offline";
const APP_SHELL = [
  OFFLINE_URL,
  "/manifest.webmanifest",
  "/apple-touch-icon.png",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-512-maskable.png",
];
const QUEUE_SYNC_TAG = "moneyspender-offline-queue";

// Private, per-account pages are never cached (shared devices); offline they fall back to /offline.
const PRIVATE_PREFIXES = [
  "/dashboard",
  "/history",
  "/wallets",
  "/debts",
  "/budget",
  "/reports",
  "/settings",
  "/onboarding",
  "/reset-password",
  "/income",
  "/expenses",
  "/all-transactions",
  "/net-worth",
];

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

function shouldSkipCache(request, requestUrl) {
  return (
    requestUrl.origin !== self.location.origin ||
    requestUrl.pathname.startsWith("/api/") ||
    requestUrl.pathname.startsWith("/auth") ||
    // React Server Component payloads change with every write: always network.
    requestUrl.searchParams.has("_rsc") ||
    request.headers.get("RSC") === "1" ||
    isPrivatePath(requestUrl.pathname)
  );
}

function isStaticAsset(requestUrl) {
  return (
    requestUrl.pathname.startsWith("/_next/static/") ||
    /\.(?:png|svg|ico|webp|woff2?)$/.test(requestUrl.pathname) ||
    requestUrl.pathname === "/manifest.webmanifest"
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

  if (event.request.mode === "navigate") {
    const cacheable = !shouldSkipCache(event.request, requestUrl);
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (cacheable && response.ok && !response.redirected) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
          }
          return response;
        })
        .catch(async () => {
          const cachedPage = cacheable ? await caches.match(event.request) : undefined;
          return cachedPage || (await caches.match(OFFLINE_URL)) || Response.error();
        }),
    );
    return;
  }

  if (shouldSkipCache(event.request, requestUrl) || !isStaticAsset(requestUrl)) {
    return;
  }

  // Hashed build assets and icons: cache first.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(event.request, copy));
        }

        return response;
      });
    }),
  );
});

// Offline entries live in the page's localStorage, so the worker only wakes the
// open app and asks it to send the queue (Background Sync where supported).
self.addEventListener("sync", (event) => {
  if (event.tag !== QUEUE_SYNC_TAG) return;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) client.postMessage({ type: "flush-offline-queue" });
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
