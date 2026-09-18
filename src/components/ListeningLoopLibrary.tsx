"use client";

import { useEffect, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
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

export function ListeningLoopLibrary({ userId, fileId, a, b, duration, canPlay, onSelect, renderPlayer, playerOptions }: {
  userId: string; fileId: string; a: number | null; b: number | null; duration: number;
  canPlay: boolean; onSelect: (loop: ListeningLoop) => void;
  renderPlayer: (loops: ListeningLoop[], saveSelection: () => void, canSave: boolean) => ReactNode;
  playerOptions: ReactNode;
}) {
  const key = `${userId}:${fileId}`;
  const [publicOwner, setPublicOwner] = useState("");
  const [menu, setMenu] = useState(false);
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
    if (loaded) return;
    let alive = true;
    setBusy(true);
    loadOwn(key, fileId, userId, false).then(result => {
      if (!alive) return;
      setBusy(false);
      if (result.success) { setData(result.data); setDirty(drafts.get(key)?.dirty || false); setLoaded(true); }
      else setNotice(result.error);
    }).catch(() => { if (alive) { setBusy(false); setNotice("Chưa tải được bộ đoạn. Hãy thử lại."); } });
    return () => { alive = false; };
  }, [loaded, key, fileId, userId]);

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

  async function save(next = data) {
    setBusy(true); setNotice("");
    const pending = saveListeningLoops(fileId, userId, next);
    saves.set(key, pending);
    try {
      const result = await pending;
      if (result.success) {
        drafts.set(key, { data: result.data, dirty: false, expires: Date.now() + TTL });
        setData(result.data); setDirty(false); setConflict(false);
        setNotice(result.data.shared ? "Đã lưu Public." : "Đã lưu riêng cho tài khoản của bạn.");
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
    } catch { setGroupError("Chưa tải được bộ đoạn Public. Hãy thử lại."); }
    finally { groupReads.delete(cacheKey); setGroupBusy(false); }
  }

  function edit(loop?: ListeningLoop) {
    setEditingId(loop?.id || null); setName(loop?.name || `Đoạn ${data.loops.length + 1}`);
    setStart(loopTime(loop?.start ?? a ?? 0)); setEnd(loopTime(loop?.end ?? b ?? 1));
    setEditor(true); setMenu(false); setNotice("");
  }

  function applyEditor() {
    try {
      const item = { id: editingId || crypto.randomUUID(), name, start: parseLoopTime(start), end: parseLoopTime(end) };
      if (Number.isFinite(duration) && duration > 0 && item.end > duration) throw new Error("Mốc B vượt quá thời lượng bài nghe.");
      const loops = validateLoops(editingId ? data.loops.map(old => old.id === editingId ? item : old) : [...data.loops, item]);
      const next = { ...data, loops };
      change(next); setEditor(false); void save(next);
    } catch (error) { setNotice(error instanceof Error ? error.message : "Mốc thời gian không hợp lệ."); }
  }

  function copy(loops: ListeningLoop[]) {
    if (data.loops.length + loops.length > MAX_LOOPS) { setGroupError(`Mỗi đề tối đa ${MAX_LOOPS} đoạn; hãy bớt đoạn trước khi sao chép.`); return; }
    const next = { ...data, loops: [...data.loops, ...loops.map(loop => ({ ...loop, id: crypto.randomUUID() }))] };
    change(next); setTab("mine"); void save(next);
  }

  const publicSets = groups?.sets.filter(set => set.ownerId !== userId) || [];
  const publicSet = publicSets.find(set => set.ownerId === publicOwner) || publicSets[0];
  const visibleLoops = tab === "mine" ? data.loops : publicSet?.loops || [];
  const activeIndex = visibleLoops.findIndex(item => item.start === a && item.end === b);
  const active = visibleLoops[activeIndex];

  return <>
    {renderPlayer(visibleLoops, () => { setTab("mine"); edit(); }, loaded && !busy && data.loops.length < MAX_LOOPS)}
    <div className="border-t border-text-muted/15 p-3 space-y-2">
      <div className="flex items-center gap-2">
        <select aria-label="Nguồn đoạn nghe" className="min-h-10 rounded-lg bg-transparent text-body-sm font-semibold text-text-muted focus-visible:ring-2" value={tab} onChange={event => { const next = event.target.value as "mine" | "group"; setTab(next); setMenu(false); if (next === "group" && !groups && !groupBusy) void loadGroup(); }}>
          <option value="mine">Của tôi {loaded ? `(${data.loops.length})` : ""}</option><option value="group">Public</option>
        </select>
        {dirty && <button className={`${control} ml-auto text-primary`} disabled={busy || conflict || editor} onClick={() => void save()}>{busy ? "Đang lưu…" : "Lưu nháp"}</button>}
        <button className={`${control} ${dirty ? "" : "ml-auto"}`} aria-label="Tùy chọn nghe và bộ đoạn" title="Âm lượng, tạo/sửa đoạn và Public" aria-expanded={menu} onClick={() => setMenu(!menu)}><MoreHorizontal size={18} /></button>
      </div>
      {tab === "group" && publicSets.length > 0 && <select aria-label="Chọn bộ đoạn Public" className={input} value={publicSet?.ownerId || ""} onChange={event => setPublicOwner(event.target.value)}>{publicSets.map(set => <option key={set.ownerId} value={set.ownerId}>{set.ownerName} · {set.loops.length} đoạn</option>)}</select>}
      {visibleLoops.length > 0 ? <div className="flex items-center gap-1">
        <button className={control} aria-label="Đoạn trước" disabled={!canPlay || activeIndex <= 0} onClick={() => onSelect(visibleLoops[activeIndex - 1])}><ChevronLeft size={18} /></button>
        <select aria-label="Chọn đoạn nghe lặp" className={`${input} min-w-0 flex-1 font-semibold`} value={active?.id || ""} disabled={!canPlay} onChange={event => { const item = visibleLoops.find(item => item.id === event.target.value); if (item) onSelect(item); }}>
          <option value="" disabled>Chọn đoạn · {visibleLoops.length} đoạn</option>
          {visibleLoops.map((item, index) => <option key={item.id} value={item.id}>{index + 1}. {item.name} · {loopTime(item.start).split(".")[0]}–{loopTime(item.end).split(".")[0]}</option>)}
        </select>
        <button className={control} aria-label="Đoạn tiếp theo" disabled={!canPlay || activeIndex >= visibleLoops.length - 1} onClick={() => onSelect(visibleLoops[activeIndex + 1])}><ChevronRight size={18} /></button>
      </div> : <p className="px-1 text-caption text-text-muted">{busy || groupBusy ? "Đang tải đoạn…" : tab === "mine" ? "Bấm biểu tượng kéo để tạo đoạn, hoặc chọn Public để nghe bộ có sẵn." : "Chưa có bộ đoạn Public."}</p>}
      {menu && <div className="rounded-lg bg-bg p-3 space-y-3">
        {playerOptions}
        <div className="flex flex-wrap gap-2">
          <button className={control} disabled={!loaded || busy || data.loops.length >= MAX_LOOPS} onClick={() => { setTab("mine"); edit(); }}>Nhập đoạn thủ công</button>
          {tab === "mine" && active && <>
            <button className={control} disabled={busy} onClick={() => edit(active)}>Sửa đoạn này</button>
            <button className={`${control} text-danger`} disabled={busy} onClick={() => {
              if (!window.confirm(`Xóa “${active.name}” khỏi bộ đã lưu?`)) return;
              const loops = data.loops.filter(item => item.id !== active.id);
              const next = { ...data, loops, shared: data.shared && loops.length > 0 };
              change(next); setEditor(false); setMenu(false); void save(next);
            }}>Xóa đoạn này</button>
          </>}
          {tab === "group" && publicSet && <button className={control} disabled={!loaded || busy} onClick={() => { copy(publicSet.loops); setMenu(false); }}>Sao chép bộ về Của tôi</button>}
          <button className={control} disabled={busy || groupBusy} onClick={() => tab === "mine" ? void refreshOwn() : void loadGroup(null, true)}>Tải bản mới</button>
        </div>
        {tab === "mine" && <>
          <label className="flex items-center gap-2 text-body-sm"><input type="checkbox" checked={data.shared} disabled={!loaded || busy || data.loops.length === 0} onChange={event => { const next = { ...data, shared: event.target.checked }; change(next); void save(next); }} className="h-4 w-4 accent-primary" />Public bộ đoạn này</label>
          <p className="text-caption text-text-muted">Các tài khoản đăng nhập có thể nghe và sao chép. Chỉ bạn sửa bản gốc; tắt Public không xóa bản sao.</p>
        </>}
      </div>}
      {editor && <form className="grid grid-cols-2 gap-2 rounded-lg bg-bg p-3" onSubmit={event => { event.preventDefault(); applyEditor(); }}>
        <label className="col-span-2 text-caption">Tên đoạn<input autoFocus className={`${input} mt-1`} maxLength={80} value={name} onChange={event => setName(event.target.value)} required disabled={busy} /></label>
        <label className="text-caption">A · phút:giây<input className={`${input} mt-1`} value={start} onChange={event => setStart(event.target.value)} required disabled={busy} /></label>
        <label className="text-caption">B · phút:giây<input className={`${input} mt-1`} value={end} onChange={event => setEnd(event.target.value)} required disabled={busy} /></label>
        <div className="col-span-2 flex justify-end gap-2"><button type="button" className={control} onClick={() => setEditor(false)}>Hủy</button><button className={`${control} text-primary`} disabled={busy || conflict}>Lưu đoạn</button></div>
      </form>}
      {tab === "group" && groups?.nextCursor && <button className={control} disabled={groupBusy} onClick={() => void loadGroup(groups.nextCursor)}>Thêm bộ Public</button>}
      {(notice || groupError) && <p role="status" className="px-1 text-caption text-text-muted">{tab === "group" ? groupError || notice : notice}{conflict && <button className={control} disabled={busy} onClick={() => void refreshOwn()}>Tải bản mới (bỏ nháp)</button>}</p>}
    </div>
  </>;
}
