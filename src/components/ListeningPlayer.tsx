"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize, Scissors, X, Pause, Play, Repeat2, Volume2, VolumeX } from "lucide-react";
import { ListeningSelect } from "./ListeningSelect";
import { ListeningLoopLibrary } from "./ListeningLoopLibrary";
import type { ListeningLoop } from "@/lib/listening-loops";

function timeLabel(time: number) {
  return `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, "0")}`;
}

// Parent keys by Drive file ID so changing exams disposes playback and loop state.
export function ListeningPlayer({ driveFileId, label, userId }: { driveFileId: string; label: string; userId: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const frame = useRef<HTMLElement>(null);
  const resume = useRef<{ time: number; play: boolean } | null>(null);
  const [buffering, setBuffering] = useState(false);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cutting, setCutting] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);
  const [preview, setPreview] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [a, setA] = useState<number | null>(null);
  const [b, setB] = useState<number | null>(null);
  const [loop, setLoop] = useState(false);
  const [message, setMessage] = useState("");
  const [speed, setSpeed] = useState("1");
  const [duration, setDuration] = useState(0);
  const fileUrl = `https://drive.google.com/file/d/${driveFileId}`;
  const source = `/api/listening/${encodeURIComponent(driveFileId)}`;
  const control = "rounded-lg bg-surface-raised px-3 py-2 min-h-10 text-body-sm font-semibold hover:bg-accent-muted focus-visible:outline-none focus-visible:ring-2 disabled:opacity-50 disabled:cursor-not-allowed";

  useEffect(() => {
    if (preview) return;
    const current = video.current;
    if (current) { current.src = source; current.load(); }
    return () => { current?.pause(); current?.removeAttribute("src"); current?.load(); };
  }, [source, attempt, preview]);

  useEffect(() => {
    if (ready || preview || error) return;
    const timer = window.setTimeout(() => setMessage("Drive đang phản hồi chậm. Bạn có thể tải lại hoặc chờ thêm."), 25000);
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
    setLoop(false); setA(null); setB(null); setReady(false); setError(false); setCutting(false);
    setSpeed("1"); setPosition(0); setDuration(0); setPlaying(false); setMessage("");
  }

  function retry() {
    resume.current = { time: video.current?.currentTime || position, play: playing };
    setError(false); setReady(false); setBuffering(true); setMessage(""); setAttempt(n => n + 1);
  }

  async function play() {
    try { await video.current?.play(); }
    catch { setLoop(false); setMessage("Chưa phát được. Bấm Phát hoặc mở chế độ Drive trong menu ⋯."); }
  }

  function markA() {
    if (!video.current) return;
    setA(video.current.currentTime); setB(null); setLoop(false);
    setMessage("");
  }

  function markB() {
    if (!video.current || a === null) return;
    const end = video.current.currentTime;
    if (end - a < 1) { setMessage("B cần nằm sau A ít nhất 1 giây."); return; }
    setB(end); setLoop(true); video.current.currentTime = a; void play(); setMessage("");
  }

  function toggleLoop() {
    if (!video.current || a === null || b === null) return;
    if (loop) { setLoop(false); return; }
    video.current.currentTime = a; setLoop(true); void play();
  }

  function selectSavedLoop(item: ListeningLoop) {
    if (!video.current || !ready || preview) return;
    if (item.end > video.current.duration) { setMessage("Đoạn này vượt thời lượng video. Hãy sửa mốc B trong bộ của bạn."); return; }
    setA(item.start); setB(item.end); setLoop(true);
    video.current.currentTime = item.start;
    setCutting(false); setMessage(""); void play();
  }

  function seek(value: number) {
    if (!video.current) return;
    video.current.currentTime = value; setPosition(value);
    if (a !== null && b !== null && (value < a || value >= b)) setLoop(false);
  }

  return <section ref={frame} aria-label={`Trình nghe đề ${label}`} className="overflow-hidden rounded-xl bg-surface shadow-elevation-sm">
    {preview ? <iframe src={`${fileUrl}/preview`} title={`Google Drive · đề N3 ${label}`} className="aspect-video w-full bg-bg" allow="autoplay; fullscreen" allowFullScreen /> :
      <video key={`${driveFileId}-${attempt}`} ref={video} playsInline preload="metadata"
        aria-label={`Đề nghe N3 ${label}`} className="aspect-video max-h-[45vh] w-full bg-black object-contain"
        onClick={() => playing ? video.current?.pause() : void play()}
        onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)}
        onTimeUpdate={() => setPosition(video.current?.currentTime || 0)}
        onVolumeChange={() => setMuted(!!video.current?.muted)}
        onWaiting={() => setBuffering(true)} onSeeking={() => setBuffering(true)}
        onPlaying={() => { setBuffering(false); setMessage(""); }} onSeeked={() => setBuffering(false)}
        onLoadedMetadata={() => {
          const current = video.current;
          setReady(true); setError(false); setBuffering(false); setMessage(""); setDuration(current?.duration || 0);
          if (current) {
            current.playbackRate = Number(speed); current.muted = muted;
            if (resume.current) { current.currentTime = Math.min(resume.current.time, current.duration); const shouldPlay = resume.current.play; resume.current = null; if (shouldPlay) void play(); }
          }
        }}
        onError={() => { setError(true); setReady(false); setBuffering(false); }}
        onEnded={() => { if (loop && a !== null && video.current) { video.current.currentTime = a; void play(); } }}
      />}
    <ListeningLoopLibrary userId={userId} fileId={driveFileId} a={a} b={b} duration={duration} canPlay={ready && !preview} onSelect={selectSavedLoop} renderPlayer={(segments, saveSelection, canSave) => <div className="px-3 pt-2 pb-1 space-y-1">
      {!preview && <>
        <div className="relative flex h-7 items-center">
          <div className="pointer-events-none absolute inset-x-0 h-2 overflow-hidden rounded-full bg-surface-raised">
            <div className="absolute h-full bg-text-muted/30" style={{ width: `${duration ? position / duration * 100 : 0}%` }} />
            {segments.map(item => <span key={item.id} className="absolute h-full bg-primary/30" style={{ left: `${duration ? item.start / duration * 100 : 0}%`, width: `${duration ? (item.end - item.start) / duration * 100 : 0}%` }} />)}
            {a !== null && duration > 0 && <span className="absolute h-full bg-primary" style={{ left: `${a / duration * 100}%`, width: `${b !== null ? (b - a) / duration * 100 : 0.3}%` }} />}
          </div>
          <input type="range" min={0} max={duration || 1} step={0.1} value={position} disabled={!ready} onChange={event => seek(Number(event.target.value))} aria-label="Tua bài nghe" aria-valuetext={`${timeLabel(position)} trên ${timeLabel(duration)}`} className="listening-seek relative z-10 w-full cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary" />
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <button className={`${control} text-primary`} disabled={!ready} aria-label={playing ? "Tạm dừng" : "Phát"} onClick={() => playing ? video.current?.pause() : void play()}>{playing ? <Pause size={19} /> : <Play size={19} />}</button>
          <span className="mr-auto text-caption tabular-nums text-text-muted">{timeLabel(position)} / {timeLabel(duration)}</span>
          <button className={`${control} ${loop ? "text-primary bg-accent-muted" : ""}`} aria-label={loop ? "Tắt lặp A–B" : "Bật lặp A–B"} title="Lặp A–B" disabled={!ready || b === null} onClick={toggleLoop} aria-pressed={loop}><Repeat2 size={18} /></button>
          <ListeningSelect label="Tốc độ phát" className="w-20" value={speed} disabled={!ready} options={["0.75", "1", "1.25", "1.5"].map(value => ({ value, label: `${value}×` }))} onChange={value => { setSpeed(value); if (video.current) video.current.playbackRate = Number(value); }} />
          <button className={`${control} ${cutting ? "text-primary bg-accent-muted" : ""}`} disabled={!ready} title="Tạo đoạn lặp" aria-label="Tạo đoạn lặp" aria-pressed={cutting} onClick={() => { setCutting(!cutting); if (!cutting) markA(); }}><Scissors size={18} /></button>
        </div>
        {cutting && <div className="flex flex-wrap items-center gap-2 rounded-lg bg-bg p-2">
          <button className={`${control} ${a !== null && b === null ? "text-primary bg-accent-muted" : ""}`} disabled={!ready} onClick={a === null || b !== null ? markA : markB}>{a === null || b !== null ? "Đặt A" : "Đặt B"}</button>
          <span className="min-w-0 text-caption text-text-muted tabular-nums">{a === null ? "Đánh dấu đầu → cuối đoạn cần lặp" : `${timeLabel(a)} → ${b === null ? "Đặt B ở cuối câu" : timeLabel(b)}`}</span>
          <button className={`${control} ml-auto text-primary`} disabled={!canSave || b === null} onClick={() => { saveSelection(); setCutting(false); }}>Lưu đoạn</button>
          <button className={control} aria-label="Đóng công cụ cắt đoạn" onClick={() => setCutting(false)}><X size={16} /></button>
        </div>}
      </>}
      {(message || error || !ready || preview || buffering) && <p role="status" className="py-1 text-caption text-text-muted">{preview ? "Chế độ Drive không hỗ trợ lặp A–B." : error ? "Kết nối video bị gián đoạn. Tải lại để tiếp tục tại vị trí đang nghe." : !ready ? "Đang tải video…" : buffering ? "Đang tải đoạn nghe…" : message}</p>}
      {(error || (!ready && message)) && <button className={control} onClick={retry}>Tải lại tại {timeLabel(position)}</button>}
    </div>} playerOptions={<div className="flex flex-wrap items-center gap-2 rounded-lg bg-bg p-2">
        {!preview && <>
          <button className={control} aria-label={muted ? "Bật tiếng" : "Tắt tiếng"} onClick={() => { if (video.current) video.current.muted = !muted; }}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
          <input type="range" min="0" max="1" step="0.05" defaultValue="1" aria-label="Âm lượng" className="w-20 accent-primary" onChange={event => { if (video.current) { video.current.volume = Number(event.target.value); video.current.muted = false; } }} />
          <button className={control} aria-label="Toàn màn hình" onClick={() => { if (document.fullscreenElement) void document.exitFullscreen(); else void frame.current?.requestFullscreen().catch(() => setMessage("Thiết bị chưa hỗ trợ toàn màn hình.")); }}><Maximize size={18} /></button>
          {a !== null && <button className={control} onClick={() => { setA(null); setB(null); setLoop(false); setMessage(""); }}>Bỏ mốc A–B</button>}
        </>}
        <button className={control} onClick={() => { reset(); setPreview(!preview);  }}>{preview ? "Trình phát A–B" : "Chế độ Drive"}</button>
        <a className={control} href={`${fileUrl}/view`} target="_blank" rel="noreferrer">Mở file Drive ↗</a>
        {error && <button className={control} onClick={retry}>Thử tải lại</button>}
      </div>} />
  </section>;
}
