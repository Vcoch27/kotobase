"use client";

import { useEffect, useRef, useState } from "react";
import { ExternalLink, Repeat2 } from "lucide-react";

function timeLabel(time: number) {
  return `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;
}

// Parent keys by Drive file ID so changing exams disposes playback and loop state.
export function ListeningPlayer({ driveFileId, label }: { driveFileId: string; label: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [preview, setPreview] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);
  const [loop, setLoop] = useState(false);
  const [message, setMessage] = useState("");
  const [speed, setSpeed] = useState("1");
  const fileUrl = `https://drive.google.com/file/d/${driveFileId}`;
  const source = `/api/listening/${encodeURIComponent(driveFileId)}`;
  const control = "rounded-lg bg-surface-raised px-4 py-3 text-body-sm font-semibold hover:bg-accent-muted focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

  useEffect(() => {
    if (preview) return;
    const current = video.current;
    if (current) { current.src = source; current.load(); }
    return () => { current?.pause(); current?.removeAttribute("src"); current?.load(); };
  }, [source, attempt, preview]);

  useEffect(() => {
    if (ready || preview || error) return;
    const timer = window.setTimeout(() => setError(true), 25000);
    return () => clearTimeout(timer);
  }, [ready, preview, error, attempt]);

  useEffect(() => {
    if (!loop || a === null || b === null || !ready || preview) return;
    const timer = window.setInterval(() => {
      const current = video.current;
      if (current && !current.paused && current.currentTime >= b) current.currentTime = a;
    }, 100);
    return () => clearInterval(timer);
  }, [loop, a, b, ready, preview]);

  function reset() {
    setLoop(false); setA(null); setB(null); setReady(false); setError(false);
    setSpeed("1"); setMessage("");
  }

  async function play() {
    try { await video.current?.play(); }
    catch { setLoop(false); setMessage("Chưa phát được. Bấm phát trên video hoặc dùng chế độ xem Drive."); }
  }

  function markA() {
    if (!video.current) return;
    setA(video.current.currentTime); setB(null); setLoop(false);
    setMessage("Đã đặt A. Phát đến hết câu rồi đặt B (cách A ít nhất 1 giây).");
  }

  function markB() {
    if (!video.current || a === null) return;
    const end = video.current.currentTime;
    if (end - a < 1) { setMessage("B cần nằm sau A ít nhất 1 giây."); return; }
    setB(end); setLoop(false); setMessage("Đã đặt đoạn. Bấm Lặp A–B để nghe lại.");
  }

  function toggleLoop() {
    if (!video.current || a === null || b === null) return;
    if (loop) { setLoop(false); return; }
    video.current.currentTime = a; setLoop(true); void play();
  }

  return <section aria-label={`Trình nghe đề ${label}`} className="space-y-4">
    {preview ? <>
      <iframe key={driveFileId} src={`${fileUrl}/preview`} title={`Google Drive · đề N3 ${label}`}
        className="aspect-video min-h-52 w-full rounded-xl bg-surface-raised" allow="autoplay; fullscreen" allowFullScreen />
      <p className="text-body-sm text-text-muted">Chế độ xem Drive: dùng nút phát trong khung. Lặp A–B chỉ có ở trình phát trực tiếp.</p>
      <button className={control} onClick={() => { reset(); setPreview(false); }}>Thử trình phát trực tiếp</button>
    </> : <>
      <video key={`${driveFileId}-${attempt}`} ref={video} controls playsInline preload="metadata"
        aria-label={`Đề nghe N3 ${label}`} className="aspect-video min-h-52 w-full rounded-xl bg-surface-raised"
        onLoadedMetadata={() => { setReady(true); setError(false); }}
        onError={() => { setError(true); setReady(false); setLoop(false); }}
        onEnded={() => { if (loop && a !== null && video.current) { video.current.currentTime = a; void play(); } }}
      />
      {!ready && !error && <p role="status" className="text-body-sm text-text-muted">Đang tải video từ Google Drive…</p>}
      {error && <div role="alert" className="space-y-3 rounded-xl bg-accent-muted p-4 text-body-sm">
        <p>Chưa tải được video trực tiếp. Drive có thể đang giới hạn truy cập hoặc kết nối chậm. Thử lại, dùng chế độ xem Drive hoặc mở file bên dưới.</p>
        <button className={control} onClick={() => { reset(); setAttempt(n => n + 1); }}>Thử lại</button>
      </div>}
      <div className="flex flex-wrap items-center gap-2">
        <button className={control} disabled={!ready} onClick={markA}>Đặt A {a !== null && timeLabel(a)}</button>
        <button className={control} disabled={!ready || a === null} onClick={markB}>Đặt B {b !== null && timeLabel(b)}</button>
        <button className={`${control} inline-flex items-center gap-2 ${loop ? "bg-accent-muted text-primary" : ""}`} disabled={!ready || b === null} onClick={toggleLoop} aria-pressed={loop}><Repeat2 size={16} />{loop ? "Dừng lặp" : "Lặp A–B"}</button>
        <button className={control} disabled={a === null} onClick={() => { setLoop(false); setA(null); setB(null); setMessage("Đã xóa đoạn lặp."); }}>Xóa đoạn</button>
        <label className="flex items-center gap-2 text-body-sm">Tốc độ
          <select className={control} value={speed} disabled={!ready} onChange={event => {
            setSpeed(event.target.value);
            if (video.current) video.current.playbackRate = Number(event.target.value);
          }}>
            {["0.75", "1", "1.25", "1.5"].map(value => <option key={value} value={value}>{value}×</option>)}
          </select>
        </label>
      </div>
      <p role="status" className="text-body-sm text-text-muted">{message || "Phát video, đặt A ở đầu câu và B ở cuối câu. Đổi đề sẽ xóa đoạn lặp."}</p>
      <button className={control} onClick={() => { reset(); setPreview(true); }}>Dùng chế độ xem Drive</button>
    </>}
    <a href={`${fileUrl}/view`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-body-sm font-semibold text-primary rounded-lg focus-visible:ring-2"><ExternalLink size={16} />Mở đề {label} trên Google Drive</a>
  </section>;
}
