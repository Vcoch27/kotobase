"use client";
// Copied to a temporary localhost route only. Never deployed.
import { useEffect, useState } from "react";
import { NotificationDrawer } from "@/components/NotificationDrawer";

export default function PushPreview() {
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(true);
  const [stats, setStats] = useState("");
  useEffect(() => {
    const originalFetch = window.fetch;
    const originalNotification = Object.getOwnPropertyDescriptor(window, "Notification");
    const originalWorker = Object.getOwnPropertyDescriptor(navigator, "serviceWorker");
    const originalUA = Object.getOwnPropertyDescriptor(navigator, "userAgent");
    const originalStandalone = Object.getOwnPropertyDescriptor(navigator, "standalone");
    const originalManager = Object.getOwnPropertyDescriptor(window, "PushManager");
    const mode = new URLSearchParams(window.location.search).get("platform") || "android";
    let subscription: PushSubscription | null = null;
    let registrations = 0, tests = 0, prompts = 0;
    const update = () => setStats(`permission prompts=${prompts}; registrations=${registrations}; self-tests=${tests}`);
    const notification = class {
      static permission: NotificationPermission = mode === "denied" ? "denied" : "default";
      static async requestPermission() { prompts++; this.permission = "granted"; update(); return "granted"; }
    };
    Object.defineProperty(window, "Notification", { configurable: true, value: notification });
    Object.defineProperty(window, "PushManager", { configurable: true, value: class {} });
    Object.defineProperty(navigator, "userAgent", { configurable: true, value: mode.startsWith("ios") ? "iPhone Safari" : "Android Chrome" });
    Object.defineProperty(navigator, "standalone", { configurable: true, value: mode === "ios-installed" });
    const registration = { pushManager: {
      getSubscription: async () => subscription,
      async subscribe() {
        const object = { endpoint: "https://web.push.apple.com/qa-only",
          toJSON() { return { endpoint: this.endpoint, keys: { p256dh: "qa-only", auth: "qa-only" } }; },
          async unsubscribe() { subscription = null; return true; } };
        subscription = object as unknown as PushSubscription;
        return subscription;
      },
    } };
    Object.defineProperty(navigator, "serviceWorker", { configurable: true, value: {
      register: async () => registration, ready: Promise.resolve(registration), getRegistration: async () => registration,
    } });
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input) === "/api/push") {
        if (!init?.method) return Response.json({ available: true, publicKey: "BAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" });
        const body = JSON.parse(String(init?.body || "{}"));
        if (mode === "offline") return Response.json({ error: "Mất kết nối giả lập. Thử lại khi có mạng." }, { status: 503 });
        if (body.action === "subscribe") registrations++;
        if (body.action === "test") tests++;
        update();
        return Response.json({ success: true });
      }
      return originalFetch(input, init);
    }) as typeof fetch;
    update(); setReady(true);
    const restore = (object: object, key: string, descriptor?: PropertyDescriptor) => {
      if (descriptor) Object.defineProperty(object, key, descriptor);
      else Reflect.deleteProperty(object, key);
    };
    return () => {
      window.fetch = originalFetch;
      restore(window, "Notification", originalNotification);
      restore(window, "PushManager", originalManager);
      restore(navigator, "serviceWorker", originalWorker);
      restore(navigator, "userAgent", originalUA);
      restore(navigator, "standalone", originalStandalone);
    };
  }, []);
  return <main className="min-h-screen bg-slate-100 p-6 dark:bg-slate-950">
    <h1 className="text-xl font-bold dark:text-white">Push QA · dữ liệu mô phỏng</h1>
    <p className="my-4 text-sm text-slate-600 dark:text-slate-300">Không xin quyền thật, không gửi push thật, không đọc Firestore.</p>
    <p role="status" className="text-xs text-slate-500">{stats}</p>
    <nav className="my-4 flex flex-wrap gap-3 text-sm text-indigo-600">
      <a href="?platform=android">Android</a><a href="?platform=ios">iPhone chưa cài</a><a href="?platform=ios-installed">iPhone đã cài</a><a href="?platform=denied">Đã chặn</a><a href="?platform=offline">Lỗi mạng</a>
    </nav>
    <button type="button" className="rounded-xl bg-indigo-600 p-3 text-white" onClick={() => setOpen(true)}>Mở thông báo</button>
    {ready && <NotificationDrawer isOpen={open} onClose={() => setOpen(false)} notifications={[{
      id: "qa-update", title: "Luyện nói và kiểm tra micro", summary: "Học phát âm ngay trong KotoBase.", content: "Nội dung thông báo mô phỏng.",
      type: "feature", createdAt: "2026-10-26T00:00:00Z", isActive: true,
    }]} readIds={new Set()} onMarkAsRead={() => {}} onMarkAllAsRead={() => {}} isLoggedIn />}
  </main>;
}
