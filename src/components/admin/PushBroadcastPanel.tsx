"use client";

import { useState } from "react";
import { BellRing, Send, Loader2 } from "lucide-react";
import { sendSystemPushAction } from "@/app/actions/push";
import type { SystemNotificationItem } from "@/app/actions/notification";

export function PushBroadcastPanel({ notifications, configured }: {
  notifications: SystemNotificationItem[]; configured: boolean;
}) {
  const [selected, setSelected] = useState(notifications[0]?.id || "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState<string[]>([]);
  const item = notifications.find((notification) => notification.id === selected);
  const send = async () => {
    if (!item || busy) return;
    setBusy(true); setMessage("");
    try {
      const result = await sendSystemPushAction(item.id);
      if (!result.success) { setMessage(result.error); return; }
      const counts = result.result;
      setMessage(counts.empty ? "Chưa có thiết bị bật thông báo. Hãy bật trong biểu tượng chuông trên điện thoại rồi gửi thử trước."
        : `Dịch vụ push đã nhận ${counts.accepted} yêu cầu. ${counts.expired} đăng ký hết hạn được xóa; ${counts.failed} yêu cầu chưa gửi được. Điện thoại hiển thị theo quyền và cài đặt của từng người.`);
      if (!counts.empty) setSent((previous) => [...previous, item.id]);
    } catch { setMessage("Mất kết nối khi gửi. Tải lại trang để kiểm tra trước khi thử lại; hệ thống chặn gửi trùng."); }
    finally { setBusy(false); }
  };
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-7">
    <div className="flex items-start gap-3">
      <BellRing className="mt-1 shrink-0 text-indigo-600" size={24} />
      <div><h1 className="text-xl font-bold text-slate-900 dark:text-white">Thông báo đến điện thoại</h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">Gửi một cập nhật đã xuất bản đến những thiết bị tự nguyện bật thông báo. Mỗi thông báo chỉ gửi một lần.</p></div>
    </div>
    {!configured && <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">Khóa Web Push chưa được cấu hình trên máy chủ.</p>}
    <label className="mt-6 block text-sm font-bold text-slate-700 dark:text-slate-200" htmlFor="push-announcement">Chọn thông báo</label>
    <select id="push-announcement" disabled={busy} value={selected} onChange={(event) => { setSelected(event.target.value); setMessage(""); }}
      className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white">
      {!notifications.length && <option value="">Chưa có thông báo đang hoạt động</option>}
      {notifications.map((notification) => <option key={notification.id} value={notification.id}>{notification.title}</option>)}
    </select>
    {item && <div className="mt-4 rounded-xl border border-indigo-100 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/40">
      <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-300">Xem trước trên điện thoại</p>
      <p className="mt-2 font-bold text-slate-900 dark:text-slate-100">{item.title.slice(0, 100)}</p>
      <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{item.summary.slice(0, 300)}</p>
    </div>}
    <button type="button" disabled={busy || !configured || !item || sent.includes(selected)} onClick={send}
      className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50">
      {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
      {busy ? "Đang gửi…" : sent.includes(selected) ? "Đã gửi thông báo này" : "Gửi tới các thiết bị đã bật"}
    </button>
    <p role="status" aria-live="polite" className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{message}</p>
    <p className="mt-5 border-t border-slate-100 pt-4 text-xs leading-relaxed text-slate-500 dark:border-slate-800">Không gửi lại các thông báo cũ khi người dùng mới bật. Thông báo trong app vẫn hoạt động riêng. Để thử riêng thiết bị của bạn, mở chuông → Thông báo trên điện thoại → Gửi thử.</p>
  </section>;
}
