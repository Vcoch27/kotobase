// Service Worker KotoBase PWA - v4 (Web Push; reuse the existing offline cache).
const CACHE_NAME = "kotobase-cache-v3";

// Các route HTML cần pre-cache (app shell)
const APP_SHELL = [
  "/",
  "/logo.png",
  "/manifest.json",
];

// ── Install: pre-cache app shell ─────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(APP_SHELL).catch((err) => {
        console.warn("[SW] Pre-cache warning:", err);
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: xóa cache cũ ───────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log("[SW] Deleting old cache:", name);
            return caches.delete(name);
          })
      );
    })
  );
  self.clients.claim();
  // Remove protected pages saved by earlier versions, including their '/' alias.
  event.waitUntil(caches.open(CACHE_NAME).then(async (cache) => {
    const requests = await cache.keys();
    await Promise.all(requests.filter((request) => {
      const path = new URL(request.url).pathname;
      return path === "/" || path === "/listening" || path.startsWith("/listening/") || path.startsWith("/api/listening/");
    }).map((request) => cache.delete(request)));
  }));
});

// ── Fetch: chiến lược cache thông minh ──────────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Bỏ qua non-GET và Firebase/API calls
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Always let the server verify the current session. Never serve these from cache.
  if (url.pathname === "/listening" || url.pathname.startsWith("/listening/") || url.pathname.startsWith("/api/listening/")) {
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }

  // Bỏ qua Firebase, auth, external APIs
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("firebaseio") ||
    url.pathname === "/api/push" ||
    url.pathname.startsWith("/api/auth") ||
    url.pathname.startsWith("/_next/image")
  ) {
    return;
  }

  // ── Chiến lược 1: Cache-first cho _next/static/ (immutable, content-hashed) ──
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(event.request).then((cached) => {
        if (cached) return cached;
        return fetch(event.request).then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        });
      })
    );
    return;
  }

  // ── Chiến lược 2: Network-first + cache fallback cho tất cả còn lại ─────────
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache response hợp lệ (same-origin hoặc basic)
        if (response && (response.status === 200 || response.type === 'opaque')) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone);
            // Nếu là trang web HTML (hoặc điều hướng), luôn lưu một bản vào key "/"
            if (event.request.mode === "navigate" || event.request.headers.get("accept")?.includes("text/html")) {
              cache.put("/", response.clone());
            }
          });
        }
        return response;
      })
      .catch(async () => {
        // Mất mạng: phục vụ từ cache
        const cached = await caches.match(event.request);
        if (cached) return cached;

        // Fallback HTML: trả về trang chủ đã cache khi mở app offline
        if (event.request.mode === "navigate" || event.request.headers.get("accept")?.includes("text/html")) {
          const root = await caches.match("/");
          if (root) return root;
          const login = await caches.match("/login");
          if (login) return login;
        }

        return new Response("Offline - Tài nguyên chưa được lưu.", {
          status: 503,
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        });
      })
  );
});

// A push must always produce a visible notification, including while the app is open.
// Safari can revoke permission for silent push; never fetch Firestore in this handler.
self.addEventListener("push", (event) => {
  let payload = {};
  try { payload = event.data?.json() || {}; } catch { /* Show a safe fallback. */ }
  const title = typeof payload.title === "string" ? payload.title.slice(0, 100) : "KotoBase";
  const body = typeof payload.body === "string" ? payload.body.slice(0, 300) : "Có cập nhật mới trong KotoBase.";
  const id = typeof payload.id === "string" ? payload.id.slice(0, 160) : "update";
  event.waitUntil(self.registration.showNotification(title || "KotoBase", {
    body, icon: "/logo.png", badge: "/logo.png", tag: `kotobase-${id}`,
    data: { url: pushTarget(payload.url) },
  }));
});

function pushTarget(value) {
  if (typeof value !== "string" || (!value.startsWith("/") && !value.startsWith(self.location.origin + "/")) || value.startsWith("//") || /[\\\u0000-\u0020]/.test(value))
    return self.location.origin + "/";
  try {
    const url = new URL(value, self.location.origin);
    return url.origin === self.location.origin ? url.href : self.location.origin + "/";
  } catch { return self.location.origin + "/"; }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = pushTarget(event.notification.data?.url);
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin && "focus" in client) {
        try {
          const navigated = await client.navigate(url);
          if (navigated) return navigated.focus();
        } catch { /* A closing tab must not prevent opening the notification. */ }
      }
    }
    return self.clients.openWindow(url);
  })());
});
