"use client";

import { useEffect, useState } from "react";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";
import { getMyListeningLoops, getSharedListeningLoops, saveListeningLoops } from "@/app/actions/listening-loops";
import { emptyLoopSet, loopTime, parseLoopTime, validateLoops, MAX_LOOPS, type ListeningLoop, type LoopSet, type SharedLoopPage } from "@/lib/listening-loops";

type Draft = { data: LoopSet; dirty: boolean; expires: number };
// Memory only, partitioned by account + exam. No Firestore listeners or polling.
const drafts = new Map<string, Draft>();
const reads = new Map<string, Promise<Awaited<ReturnType<typeof getMyListeningLoops>>>>();
const saves = new Map<string, Promise<Awaited<ReturnType<typeof saveListeningLoops>>>>();
const groupPages = new Map<string, { data: SharedLoopPage; expires: number }>();
const groupReads = new Map<string, Promise<Awaited<ReturnType<typeof getSharedListeningLoops>>>>();
const TTL = 5 * 60 * 1000;

export function hasUnsavedListeningLoops(userId: string) {
  return [...drafts.entries()].some(([key, value]) => key.startsWith(`${userId}:`) && value.dirty);
}

async function loadOwn(key: string, file: string, uid: string, refresh: boolean) {
  await saves.get(key);
  const cached = drafts.get(key);
  if (!refresh && cached && (cached.dirty || cached.expires > Date.now())) return { success: true as const, data: cached.data };
  let pending = reads.get(key);
  if (!pending) {
    pending = getMyListeningLoops(file, uid, refresh);
    reads.set(key, pending);
  }
  try {
    const result = await pending;
    if (result.success) drafts.set(key, { data: result.data, dirty: false, expires: Date.now() + TTL });
    return result;
  } finally { reads.delete(key); }
}

export function ListeningLoopLibrary({ userId, fileId, a, b, duration, canPlay, onSelect }: {
  userId: string; fileId: string; a: number | null; b: number | null; duration: number;
  canPlay: boolean; onSelect: (loop: ListeningLoop) => void;
}) {
  const key = `${userId}:${fileId}`;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"mine" | "group">("mine");
  const [data, setData] = useState<LoopSet>(drafts.get(key)?.data || emptyLoopSet());
  const [dirty, setDirty] = useState(drafts.get(key)?.dirty || false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [editor, setEditor] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [groups, setGroups] = useState<SharedLoopPage | null>(null);
  const [groupBusy, setGroupBusy] = useState(false);
  const [groupError, setGroupError] = useState("");
  const control = "inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-surface-raised px-3 py-2 text-body-sm font-semibold hover:bg-accent-muted focus-visible:ring-2 disabled:opacity-50";
  const input = "w-full rounded-lg bg-surface-raised px-3 py-2 text-body-sm text-text-primary focus-visible:outline-none focus-visible:ring-2";

  useEffect(() => {
    if (!open || loaded) return;
    let alive = true;
    setBusy(true);
    loadOwn(key, fileId, userId, false).then(result => {
      if (!alive) return;
      setBusy(false);
      if (result.success) { setData(result.data); setDirty(drafts.get(key)?.dirty || false); setLoaded(true); }
      else setNotice(result.error);
    }).catch(() => { if (alive) { setBusy(false); setNotice("Chưa tải được bộ đoạn. Hãy thử lại."); } });
    return () => { alive = false; };
  }, [open, loaded, key, fileId, userId]);

  function change(next: LoopSet) {
    if (next.loops.length === 0) next = { ...next, shared: false };
    setData(next); setDirty(true); setNotice("");
    drafts.set(key, { data: next, dirty: true, expires: Date.now() + TTL });
  }

  async function refreshOwn() {
    if (dirty && !window.confirm("Tải bản đã lưu và bỏ nháp của đề này?")) return;
    setBusy(true); setNotice("");
    try {
      const result = await loadOwn(key, fileId, userId, true);
      if (result.success) { setData(result.data); setDirty(false); setLoaded(true); setConflict(false); setEditor(false); }
      else setNotice(result.error);
    } catch { setNotice("Chưa tải được. Nháp của bạn vẫn còn."); }
    finally { setBusy(false); }
  }

  async function save() {
    setBusy(true); setNotice("");
    const pending = saveListeningLoops(fileId, userId, data);
    saves.set(key, pending);
    try {
      const result = await pending;
      if (result.success) {
        drafts.set(key, { data: result.data, dirty: false, expires: Date.now() + TTL });
        setData(result.data); setDirty(false); setConflict(false);
        setNotice(result.data.shared ? "Đã lưu và chia sẻ với nhóm." : "Đã lưu riêng cho tài khoản của bạn.");
        for (const cacheKey of groupPages.keys()) if (cacheKey.includes(`:${fileId}:`)) groupPages.delete(cacheKey);
        setGroups(null);
      } else { setNotice(result.error); setConflict(result.conflict); }
    } catch { setNotice("Chưa lưu được. Nháp vẫn còn; hãy thử lại."); }
    finally { saves.delete(key); setBusy(false); }
  }

  async function loadGroup(cursor: string | null = null, refresh = false) {
    setGroupBusy(true); setGroupError("");
    if (refresh) {
      for (const cachedKey of groupPages.keys()) if (cachedKey.startsWith(`${key}:`)) groupPages.delete(cachedKey);
    }
    const cacheKey = `${key}:${cursor || "first"}`;
    try {
      const cached = groupPages.get(cacheKey);
      let page: SharedLoopPage;
      if (!refresh && cached && cached.expires > Date.now()) page = cached.data;
      else {
        let pending = groupReads.get(cacheKey);
        if (!pending) { pending = getSharedListeningLoops(fileId, userId, cursor, refresh); groupReads.set(cacheKey, pending); }
        const result = await pending;
        if (!result.success) { setGroupError(result.error); return; }
        page = result.data;
        groupPages.set(cacheKey, { data: page, expires: Date.now() + TTL });
      }
      setGroups(previous => ({ ...page, sets: cursor && previous ? [...previous.sets, ...page.sets.filter(item => !previous.sets.some(old => old.ownerId === item.ownerId))] : page.sets }));
    } catch { setGroupError("Chưa tải được bộ đoạn của nhóm. Hãy thử lại."); }
    finally { groupReads.delete(cacheKey); setGroupBusy(false); }
  }

  function edit(loop?: ListeningLoop) {
    setEditingId(loop?.id || null); setName(loop?.name || `Đoạn ${data.loops.length + 1}`);
    setStart(loopTime(loop?.start ?? a ?? 0)); setEnd(loopTime(loop?.end ?? b ?? 1));
    setEditor(true); setNotice("");
  }

  function applyEditor() {
    try {
      const item = { id: editingId || crypto.randomUUID(), name, start: parseLoopTime(start), end: parseLoopTime(end) };
      if (Number.isFinite(duration) && duration > 0 && item.end > duration) throw new Error("Mốc B vượt quá thời lượng bài nghe.");
      const loops = validateLoops(editingId ? data.loops.map(old => old.id === editingId ? item : old) : [...data.loops, item]);
      change({ ...data, loops }); setEditor(false);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Mốc thời gian không hợp lệ."); }
  }

  function copy(loops: ListeningLoop[]) {
    if (data.loops.length + loops.length > MAX_LOOPS) { setGroupError(`Mỗi đề tối đa ${MAX_LOOPS} đoạn; hãy bớt đoạn trước khi sao chép.`); return; }
    change({ ...data, loops: [...data.loops, ...loops.map(loop => ({ ...loop, id: crypto.randomUUID() }))] });
    setTab("mine"); setNotice("Đã thêm vào nháp của bạn. Bấm Lưu thay đổi để lưu vào tài khoản.");
  }

  return <div className="rounded-xl bg-surface p-4 shadow-elevation-sm">
    <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="flex min-h-10 w-full items-center justify-between gap-3 rounded-lg text-left font-semibold focus-visible:ring-2">
      <span>Đoạn đã lưu {dirty && <span className="text-body-sm text-text-muted">· Có nháp</span>}</span><span aria-hidden="true">{open ? "−" : "+"}</span>
    </button>
    {open && <div className="mt-3 space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button className={`${control} ${tab === "mine" ? "bg-accent-muted" : ""}`} aria-pressed={tab === "mine"} onClick={() => setTab("mine")}>Của tôi{loaded ? ` (${data.loops.length})` : ""}</button>
        <button className={`${control} ${tab === "group" ? "bg-accent-muted" : ""}`} aria-pressed={tab === "group"} onClick={() => { setTab("group"); if (!groups && !groupBusy) void loadGroup(); }}>Nhóm</button>
        <button className={`${control} ml-auto`} disabled={busy || groupBusy} onClick={() => tab === "mine" ? void refreshOwn() : void loadGroup(null, true)} aria-label="Tải bản mới"><RefreshCw size={16} /></button>
      </div>
      {tab === "mine" ? <>
        {!loaded && <p role="status" className="text-body-sm text-text-muted">{busy ? "Đang tải bộ đoạn…" : "Chưa tải được. Bấm nút tải bản mới để thử lại."}</p>}
        {loaded && <>
          <div className="flex flex-wrap items-center gap-2">
            <button className={control} disabled={busy || data.loops.length >= MAX_LOOPS} onClick={() => edit()}><Plus size={16} />{a !== null && b !== null ? "Thêm đoạn A–B" : "Thêm đoạn"}</button>
            <button className={`${control} bg-accent-muted`} disabled={busy || !dirty || conflict || editor} onClick={() => void save()}><Save size={16} />{busy ? "Đang lưu…" : "Lưu thay đổi"}</button>
          </div>
          {editor && <form className="grid gap-3 rounded-xl bg-bg p-3 sm:grid-cols-2" onSubmit={event => { event.preventDefault(); applyEditor(); }}>
            <label className="text-body-sm sm:col-span-2">Tên đoạn<input className={`${input} mt-1`} maxLength={80} value={name} onChange={event => setName(event.target.value)} required disabled={busy} /></label>
            <label className="text-body-sm">A · phút:giây<input className={`${input} mt-1`} value={start} onChange={event => setStart(event.target.value)} placeholder="02:15" required disabled={busy} /></label>
            <label className="text-body-sm">B · phút:giây<input className={`${input} mt-1`} value={end} onChange={event => setEnd(event.target.value)} placeholder="02:35" required disabled={busy} /></label>
            <div className="flex gap-2 sm:col-span-2"><button className={control} disabled={busy}>{editingId ? "Áp dụng sửa" : "Thêm vào bộ"}</button><button type="button" className={control} onClick={() => setEditor(false)}>Hủy</button></div>
          </form>}
          {data.loops.length === 0 && <p className="text-body-sm text-text-muted">Chưa có đoạn nào. Đặt A–B trên video rồi thêm đoạn, hoặc nhập mốc thời gian.</p>}
          <div className="max-h-72 space-y-2 overflow-y-auto p-1">
            {data.loops.map(item => <div key={item.id} className={`flex items-center gap-2 rounded-lg p-2 ${a === item.start && b === item.end ? "bg-accent-muted" : "bg-bg"}`}>
              <button className="min-w-0 flex-1 rounded-lg p-2 text-left focus-visible:ring-2 disabled:opacity-50" disabled={!canPlay} onClick={() => onSelect(item)} aria-pressed={a === item.start && b === item.end} aria-label={`Nghe lặp ${item.name}`}><span className="block truncate text-body-sm font-semibold">{item.name}</span><span className="text-caption text-text-muted">{loopTime(item.start)} → {loopTime(item.end)}</span></button>
              <button className={control} disabled={busy} onClick={() => edit(item)} aria-label={`Sửa ${item.name}`}>Sửa</button>
              <button className={control} disabled={busy} aria-label={`Xóa ${item.name}`} onClick={() => { change({ ...data, loops: data.loops.filter(loop => loop.id !== item.id) }); if (editingId === item.id) setEditor(false); }}><Trash2 size={16} /></button>
            </div>)}
          </div>
          <label className="flex items-center gap-3 text-body-sm"><input type="checkbox" checked={data.shared} disabled={busy || data.loops.length === 0} onChange={event => change({ ...data, shared: event.target.checked })} className="h-4 w-4 accent-primary focus-visible:ring-2" />Chia sẻ bộ đoạn với nhóm</label>
          <p className="text-caption text-text-muted">Áp dụng khi bấm Lưu. Nhóm gồm các tài khoản đăng nhập KotoBase; mọi người xem hoặc sao chép, chỉ bạn sửa bộ gốc. Tắt chia sẻ không xóa các bản người khác đã sao chép.</p>
        </>}
        {notice && <p role="status" className="text-body-sm text-primary">{notice}{conflict && <button className={`${control} mt-2`} onClick={() => void refreshOwn()}>Tải bản mới (bỏ nháp)</button>}</p>}
        {dirty && <p className="text-caption text-text-muted">Nháp chưa lưu vào tài khoản. Chuyển bài trong phiên này vẫn giữ nháp.</p>}
      </> : <>
        <p className="text-body-sm text-text-muted">Chọn đoạn để nghe ngay, hoặc sao chép cả bộ về Của tôi. Bấm tải bản mới để xem thay đổi gần đây.</p>
        {groups?.sets.filter(set => set.ownerId !== userId).map(set => <details key={set.ownerId} className="rounded-lg bg-bg p-3">
          <summary className="cursor-pointer rounded-lg text-body-sm font-semibold focus-visible:ring-2">{set.ownerName} · {set.loops.length} đoạn</summary>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {set.loops.map(item => <button key={item.id} className={`${control} w-full justify-between text-left ${a === item.start && b === item.end ? "bg-accent-muted" : ""}`} disabled={!canPlay} aria-pressed={a === item.start && b === item.end} onClick={() => onSelect(item)}><span className="min-w-0 truncate">{item.name}</span><span className="shrink-0 text-caption text-text-muted">{loopTime(item.start)}–{loopTime(item.end)}</span></button>)}
          </div>
          <button className={`${control} mt-3`} disabled={!loaded || busy} onClick={() => copy(set.loops)}>Sao chép vào của tôi</button>
        </details>)}
        {groups && !groups.sets.some(set => set.ownerId !== userId) && !groupBusy && <p className="text-body-sm text-text-muted">Chưa có bộ đoạn của người khác trong trang này.</p>}
        {groups?.nextCursor && <button className={control} disabled={groupBusy} onClick={() => void loadGroup(groups.nextCursor)}>Xem thêm</button>}
        {groupBusy && <p role="status" className="text-body-sm text-text-muted">Đang tải bộ đoạn của nhóm…</p>}
        {groupError && <p role="alert" className="text-body-sm text-danger">{groupError}</p>}
      </>}
    </div>}
  </div>;
}
