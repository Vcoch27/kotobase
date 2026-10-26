"use client";

import { useEffect, useRef, useState } from "react";
import { BellRing, Smartphone, Send, Loader2 } from "lucide-react";
import { pushPlatform } from "@/lib/push-validation";

const SAVED_KEY = "kotobase_push_saved";
const actionClass = "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-3 py-2 text-xs font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:cursor-wait disabled:opacity-50";

function applicationKey(key: string): Uint8Array<ArrayBuffer> {
  const text = atob(key.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(text, (character) => character.charCodeAt(0));
}

async function worker() {
  await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });
  let timer: ReturnType<typeof setTimeout>;
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Ứng dụng chưa sẵn sàng. Tải lại trang rồi thử lại.")), 12000);
      }),
    ]);
  } finally { clearTimeout(timer!); }
}

async function pushRequest(action: "subscribe" | "test", subscription: PushSubscription) {
  const response = await fetch("/api/push", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, subscription: subscription.toJSON() }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Không kết nối được thông báo điện thoại.");
}

export function PushNotificationSettings() {
  const [platform, setPlatform] = useState<ReturnType<typeof pushPlatform> | "loading">("loading");
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [config, setConfig] = useState<{ available: boolean; publicKey: string | null } | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    let cancelled = false;
    const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const standalone = window.matchMedia("(display-mode: standalone)").matches ||
      !!(navigator as Navigator & { standalone?: boolean }).standalone;
    const state = pushPlatform({ ios, standalone, secure: window.isSecureContext,
      supported: "serviceWorker" in navigator && "PushManager" in window && "Notification" in window });
    setPlatform(state);
    const refresh = async () => {
      if (state !== "ready") return;
      setPermission(Notification.permission);
      try {
        const registration = await navigator.serviceWorker.getRegistration("/");
        const subscription = await registration?.pushManager.getSubscription();
        if (!cancelled) setEnabled(!!subscription && Notification.permission === "granted" &&
          localStorage.getItem(SAVED_KEY) === subscription.endpoint);
      } catch { /* Storage unavailable: the explicit enable action can recover. */ }
    };
    void refresh();
    window.addEventListener("focus", refresh);
    if (state === "ready") {
      fetch("/api/push", { cache: "no-store" }).then(async (response) => {
        if (!response.ok) throw Error();
        const result = await response.json();
        if (!cancelled) setConfig(result);
      }).catch(() => { if (!cancelled) setMessage("Chưa kiểm tra được kết nối. Đóng rồi mở lại bảng thông báo để thử lại."); });
    }
    return () => { cancelled = true; mounted.current = false; window.removeEventListener("focus", refresh); };
  }, []);

  const enable = async () => {
    if (busy || !config?.available || !config.publicKey) return;
    // Request immediately inside the tap handler; iOS requires user activation.
    const permissionRequest = Notification.permission === "granted"
      ? Promise.resolve<NotificationPermission>("granted") : Notification.requestPermission();
    setBusy(true); setMessage("");
    try {
      const allowed = await permissionRequest;
      if (!mounted.current) return;
      setPermission(allowed);
      if (allowed !== "granted") {
        setMessage(allowed === "denied" ? "Bạn đã chặn thông báo. Hãy mở cài đặt thông báo của KotoBase trên điện thoại để cho phép lại." : "Bạn có thể bật lại bất cứ lúc nào.");
        return;
      }
      const registration = await worker();
      const existing = await registration.pushManager.getSubscription();
      const subscription = existing || await registration.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: applicationKey(config.publicKey),
      });
      await pushRequest("subscribe", subscription);
      try { localStorage.setItem(SAVED_KEY, subscription.endpoint); } catch { /* Server save succeeded. */ }
      if (mounted.current) { setEnabled(true); setMessage("Đã bật trên thiết bị này. Bấm Gửi thử để kiểm tra thông báo trên điện thoại."); }
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : "Không bật được thông báo. Hãy thử lại.");
    } finally { if (mounted.current) setBusy(false); }
  };

  const disable = async () => {
    setBusy(true); setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        const response = await fetch("/api/push", { method: "DELETE",
          headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
        if (!response.ok) throw new Error("Chưa tắt được trên máy chủ. Kiểm tra mạng rồi thử lại.");
        await subscription.unsubscribe();
      }
      try { localStorage.removeItem(SAVED_KEY); } catch { /* Optional local state. */ }
      if (mounted.current) { setEnabled(false); setMessage("Đã tắt thông báo trên thiết bị này."); }
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : "Không tắt được thông báo.");
    } finally { if (mounted.current) setBusy(false); }
  };

  const test = async () => {
    setBusy(true); setMessage("");
    try {
      const registration = await navigator.serviceWorker.getRegistration("/");
      const subscription = await registration?.pushManager.getSubscription();
      if (!subscription) { setEnabled(false); throw new Error("Đăng ký đã mất. Hãy bật lại thông báo."); }
      await pushRequest("test", subscription);
      if (mounted.current) setMessage("Đã gửi yêu cầu thử. Xem Trung tâm thông báo của điện thoại; nếu chưa thấy, kiểm tra quyền thông báo và chế độ Tập trung/Không làm phiền.");
    } catch (error) {
      if (mounted.current) setMessage(error instanceof Error ? error.message : "Không gửi được thông báo thử.");
    } finally { if (mounted.current) setBusy(false); }
  };

  return (
    <section aria-label="Thông báo trên điện thoại" className="rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 text-left dark:border-indigo-500/30 dark:bg-indigo-950/30">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white p-2 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300"><Smartphone size={20} /></div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Thông báo trên điện thoại</h3>
            {enabled && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">Đã bật</span>}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">Nhận cập nhật KotoBase ngay cả khi đóng app. Bật riêng trên từng thiết bị, tắt bất cứ lúc nào.</p>
        </div>
      </div>
      {platform === "install-ios" ? (
        <p className="mt-3 rounded-xl bg-white/80 p-3 text-xs leading-relaxed text-slate-700 dark:bg-slate-900 dark:text-slate-200">Trên iPhone/iPad (iOS 16.4 trở lên): mở KotoBase trong Safari → <strong>Chia sẻ → Thêm vào Màn hình chính</strong>. Mở lại bằng biểu tượng KotoBase rồi bấm <strong>Bật thông báo</strong>.</p>
      ) : platform === "unsupported" ? (
        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">Trình duyệt này chưa hỗ trợ Web Push. Hãy cập nhật hệ điều hành/trình duyệt; trên Android, thử Chrome. Thông báo trong app vẫn hoạt động.</p>
      ) : platform === "ready" ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {enabled ? <>
            <button type="button" disabled={busy} onClick={test} className={`${actionClass} bg-indigo-600 text-white hover:bg-indigo-700`}><Send size={14} />Gửi thử</button>
            <button type="button" disabled={busy} onClick={disable} className={`${actionClass} bg-white text-slate-600 hover:bg-slate-100 dark:bg-slate-900 dark:text-slate-200`}>Tắt trên thiết bị này</button>
          </> : <button type="button" disabled={busy || !config?.available || permission === "denied"} onClick={enable} className={`${actionClass} bg-indigo-600 text-white hover:bg-indigo-700`}>
            {busy ? <Loader2 size={15} className="animate-spin" /> : <BellRing size={15} />}
            Bật thông báo
          </button>}
          {!config && !message && <span className="text-xs text-slate-500">Đang kiểm tra kết nối…</span>}
          {config && !config.available && <span className="text-xs text-slate-600 dark:text-slate-300">Tính năng đang được thiết lập.</span>}
        </div>
      ) : <p className="mt-3 text-xs text-slate-500">Đang kiểm tra thiết bị…</p>}
      {platform === "ready" && permission === "denied" && <p className="mt-2 text-xs leading-relaxed text-amber-700 dark:text-amber-300">Thông báo đang bị chặn. Cho phép lại trong Cài đặt → Thông báo → KotoBase (iPhone), hoặc cài đặt trang web của trình duyệt (Android).</p>}
      <p role="status" aria-live="polite" className="mt-2 text-xs leading-relaxed text-slate-600 empty:hidden dark:text-slate-300">{message}</p>
    </section>
  );
}
