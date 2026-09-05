// Service Worker KotoBase PWA
const CACHE_NAME = "kotobase-cache-v1";
const STATIC_ASSETS = [
  "/",
  "/logo.png",
  "/manifest.json",
  "/grammar",
  "/sentences",
  "/kanji",
  "/download"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("Service worker cache pre-fetch warning:", err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Bỏ qua các request POST, PUT, DELETE hoặc các API không phải GET
  if (event.request.method !== "GET") return;

  // Bỏ qua các request firebase auth hoặc server actions
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/auth")) return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Nếu fetch thành công và response hợp lệ, clone vào cache
        if (response && response.status === 200 && response.type === "basic") {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      })
      .catch(async () => {
        // Mất mạng: Phục vụ từ Cache nếu có
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        // Nếu là chuyển trang HTML và không có trong cache, fallback về trang chủ
        if (event.request.headers.get("accept")?.includes("text/html")) {
          return caches.match("/");
        }
        return new Response("Bạn đang Offline và tài nguyên này chưa được lưu sẵn.", {
          status: 503,
          statusText: "Service Unavailable",
          headers: new Headers({ "Content-Type": "text/plain; charset=utf-8" })
        });
      })
  );
});
