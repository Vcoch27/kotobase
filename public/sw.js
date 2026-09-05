// Service Worker KotoBase PWA - v3
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
});

// ── Fetch: chiến lược cache thông minh ──────────────────────────────────────
self.addEventListener("fetch", (event) => {
  // Bỏ qua non-GET và Firebase/API calls
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Bỏ qua Firebase, auth, external APIs
  if (
    url.hostname.includes("firebase") ||
    url.hostname.includes("googleapis") ||
    url.hostname.includes("firebaseio") ||
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
