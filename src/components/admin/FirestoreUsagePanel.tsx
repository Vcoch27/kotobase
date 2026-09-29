"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, ArrowUpRight, Database, Plus, Trash2 } from "lucide-react";

const PROJECT_ID = "kotobase-42cdc";
const DAILY_READ_LIMIT = 50_000;
const STORAGE_KEY = "kotobase-admin-firestore-usage-v1";
type ReadSource = { name: string; reads: number };
type Snapshot = { pacificDay: string; usedReads: number | null; sources: ReadSource[]; savedAt: string };

const pacificParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles", year: "numeric", month: "2-digit",
    day: "2-digit", hour: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
};

const pacificDay = (date: Date) => {
  const p = pacificParts(date);
  return `${p.year}-${p.month}-${p.day}`;
};

const nextPacificReset = (now: Date) => {
  const currentDay = pacificDay(now);
  const start = Math.floor(now.getTime() / 3_600_000) * 3_600_000;
  for (let hour = 1; hour <= 27; hour++) {
    const candidate = new Date(start + hour * 3_600_000);
    if (pacificDay(candidate) !== currentDay && pacificParts(candidate).hour === "00") return candidate;
  }
  return new Date(start + 24 * 3_600_000);
};

const format = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

export function FirestoreUsagePanel() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [sourceReads, setSourceReads] = useState("");

  useEffect(() => {
    setNow(new Date());
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") as Snapshot | null;
      if (saved?.pacificDay === pacificDay(new Date()) && Array.isArray(saved.sources)) setSnapshot(saved);
    } catch { /* A damaged browser snapshot must not break the admin page. */ }
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const today = now ? pacificDay(now) : "";
  const current = snapshot?.pacificDay === today ? snapshot : null;
  const usedReads = current?.usedReads ?? null;
  const remaining = usedReads === null ? null : Math.max(0, DAILY_READ_LIMIT - usedReads);
  const percent = usedReads === null ? 0 : Math.min(100, usedReads / DAILY_READ_LIMIT * 100);
  const sources = useMemo(() => [...(current?.sources || [])].sort((a, b) => b.reads - a.reads), [current]);
  const maxSourceReads = sources[0]?.reads || 1;

  const save = (next: Snapshot) => {
    setSnapshot(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* Private browsing may block storage. */ }
  };

  const updateReads = (value: string) => {
    const parsed = value === "" ? null : Math.max(0, Math.floor(Number(value)));
    if (parsed !== null && !Number.isFinite(parsed)) return;
    save({ pacificDay: today, usedReads: parsed, sources: sources, savedAt: new Date().toISOString() });
  };

  const addSource = () => {
    const name = sourceName.trim();
    const reads = Math.floor(Number(sourceReads));
    if (!name || !Number.isFinite(reads) || reads < 0 || sourceReads === "") return;
    save({ pacificDay: today, usedReads, sources: [...sources.filter((s) => s.name !== name), { name, reads }], savedAt: new Date().toISOString() });
    setSourceName("");
    setSourceReads("");
  };

  const resetAt = now ? nextPacificReset(now) : null;
  const minutesLeft = resetAt && now ? Math.max(0, Math.ceil((resetAt.getTime() - now.getTime()) / 60_000)) : null;

  return (
    <section className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 sm:p-6 shadow-xs space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400"><Activity className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-wide">Firestore · Spark</span></div>
          <h2 className="mt-1 text-lg font-bold">Ngân sách lượt đọc</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">Số liệu nhập từ Firebase Console, lưu trên trình duyệt này. Không phải đồng bộ trực tiếp.</p>
          {current?.savedAt && <p className="mt-1 text-xs text-slate-400">Cập nhật lần cuối: {new Date(current.savedAt).toLocaleString("vi-VN")}</p>}
        </div>
        <a className="inline-flex items-center gap-1 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 px-3 py-2 text-xs font-semibold text-indigo-700 dark:text-indigo-300" href={`https://console.firebase.google.com/project/${PROJECT_ID}/firestore/usage`} target="_blank" rel="noreferrer">Mở Firebase Usage <ArrowUpRight className="h-4 w-4" /></a>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
          <p className="text-xs text-slate-500">Đã dùng hôm nay</p>
          <p className="mt-1 text-2xl font-bold">{usedReads === null ? "Chưa nhập" : format(usedReads)}</p>
          <label className="mt-3 block text-xs text-slate-500" htmlFor="firestore-used-reads">Cập nhật từ Firebase Usage</label>
          <input id="firestore-used-reads" type="number" min="0" step="1" value={usedReads ?? ""} onChange={(event) => updateReads(event.target.value)} placeholder="Ví dụ: 3400" className="mt-1 w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
          <p className="text-xs text-slate-500">Còn lại trong mức miễn phí</p>
          <p className={`mt-1 text-2xl font-bold ${remaining !== null && remaining < 10_000 ? "text-rose-600" : "text-emerald-600"}`}>{remaining === null ? "—" : format(remaining)}</p>
          <p className="mt-3 text-xs text-slate-500">Giới hạn: {format(DAILY_READ_LIMIT)} lượt đọc/ngày</p>
        </div>
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4">
          <p className="text-xs text-slate-500">Đặt lại hạn mức</p>
          <p className="mt-1 text-lg font-bold">{resetAt?.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" }) || "—"}</p>
          <p className="mt-3 text-xs text-slate-500">Khoảng nửa đêm Pacific · {minutesLeft === null ? "—" : `còn ${Math.floor(minutesLeft / 60)} giờ ${minutesLeft % 60} phút`}</p>
        </div>
      </div>
      <div>
        <div className="h-3 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className={`h-full rounded-full transition-all ${percent >= 90 ? "bg-rose-500" : percent >= 70 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${percent}%` }} /></div>
        <p className="mt-1 text-right text-xs text-slate-500">{usedReads === null ? "Nhập số đã dùng để xem tỷ lệ" : `${percent.toFixed(1)}% mức miễn phí`}</p>
      </div>

      <div className="border-t border-slate-100 dark:border-slate-800 pt-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><h3 className="flex items-center gap-2 text-sm font-bold"><Database className="h-4 w-4" /> Truy vấn tốn đọc nhất</h3><p className="mt-1 text-xs text-slate-500">Chọn database (default) → Query Insights, lấy “Read operations” của cùng khoảng thời gian; số liệu có thể trễ 1–2 giờ. Usage Insights cho biết collection nào dùng nhiều nhất.</p></div>
          <a className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 inline-flex items-center gap-1" href={`https://console.cloud.google.com/firestore/databases?project=${PROJECT_ID}`} target="_blank" rel="noreferrer">Mở Query Insights <ArrowUpRight className="h-4 w-4" /></a>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input aria-label="Tên truy vấn hoặc collection" value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="Ví dụ: /kanji_notes" className="min-w-0 flex-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
          <input aria-label="Số lượt đọc" type="number" min="0" value={sourceReads} onChange={(event) => setSourceReads(event.target.value)} placeholder="Lượt đọc" className="w-full sm:w-32 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm" />
          <button type="button" onClick={addSource} className="inline-flex items-center justify-center gap-1 rounded-lg bg-indigo-600 px-3 py-2 text-sm font-semibold text-white"><Plus className="h-4 w-4" /> Thêm</button>
        </div>
        {sources.length === 0 ? <p className="mt-4 text-sm text-slate-500">Chưa có số liệu truy vấn cho ngày này.</p> : (
          <div className="mt-4 space-y-3">{sources.map((source) => <div key={source.name} className="flex items-center gap-3"><div className="min-w-0 flex-1"><div className="mb-1 flex justify-between gap-2 text-xs"><span className="truncate font-semibold" title={source.name}>{source.name}</span><span className="shrink-0 tabular-nums">{format(source.reads)}</span></div><div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"><div className="h-full rounded-full bg-indigo-500" style={{ width: `${source.reads / maxSourceReads * 100}%` }} /></div></div><button type="button" aria-label={`Xóa ${source.name}`} onClick={() => save({ pacificDay: today, usedReads, sources: sources.filter((item) => item.name !== source.name), savedAt: new Date().toISOString() })} className="text-slate-400 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div>)}</div>
        )}
      </div>
    </section>
  );
}
