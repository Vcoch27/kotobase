"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Headphones, Keyboard, Pause, Play, Repeat2, RotateCcw, Settings2, SkipBack, SkipForward, Volume2 } from "lucide-react";
import rawLessons from "@/data/choukai-lessons.json";
import { compareJapanese, plainJapanese, type Cue, type Lesson, type DiffPart } from "@/lib/choukai";

const lessons = rawLessons as Lesson[];
type Mode = "listen" | "dictation";
type Result = ReturnType<typeof compareJapanese>;

function clock(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00.00";
  const centiseconds = Math.round(seconds * 100);
  const minutes = Math.floor(centiseconds / 6000);
  const remainder = centiseconds % 6000;
  return `${minutes}:${String(Math.floor(remainder / 100)).padStart(2, "0")}.${String(remainder % 100).padStart(2, "0")}`;
}

function Japanese({ text, furigana }: { text: string; furigana: boolean }) {
  if (!furigana) return <>{plainJapanese(text)}</>;
  const pieces = text.split(/([一-龯々ヶヵ]+\([ぁ-んァ-ンー]+\))/g);
  return <>{pieces.map((piece, index) => {
    const match = /^([一-龯々ヶヵ]+)\(([ぁ-んァ-ンー]+)\)$/.exec(piece);
    return match ? <ruby key={index}>{match[1]}<rt>{match[2]}</rt></ruby> : <span key={index}>{piece}</span>;
  })}</>;
}

function DiffLine({ parts }: { parts: DiffPart[] }) {
  return <span className="choukai-diff-line">{parts.map((part, index) => <span key={index} className={`choukai-diff-${part.kind}`}>{part.value}</span>)}</span>;
}

export function ChoukaiStudio() {
  const [lessonId, setLessonId] = useState(lessons[0].id);
  const [mode, setMode] = useState<Mode>("listen");
  const [furigana, setFurigana] = useState(true);
  const [translation, setTranslation] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [audioError, setAudioError] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [repeatIndex, setRepeatIndex] = useState(0);
  const [dictationIndex, setDictationIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [completed, setCompleted] = useState<Record<string, number[]>>({});
  const audio = useRef<HTMLAudioElement>(null);
  const cuesViewport = useRef<HTMLDivElement>(null);
  const activeRow = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const lesson = lessons.find(item => item.id === lessonId) || lessons[0];
  const cue = lesson.cues[dictationIndex];
  const cueEnd = cue.end;
  const activeIndex = useMemo(() => {
    for (let i = lesson.cues.length - 1; i >= 0; i--) {
      if (position >= lesson.cues[i].start && position < lesson.cues[i].end) return i;
    }
    return -1;
  }, [lesson.cues, position]);
  const nearestIndex = useMemo(() => {
    for (let i = lesson.cues.length - 1; i >= 0; i--) if (position >= lesson.cues[i].start) return i;
    return 0;
  }, [lesson.cues, position]);
  const done = completed[lesson.id] || [];

  useEffect(() => {
    try { setCompleted(JSON.parse(localStorage.getItem("choukai-progress-v2") || "{}")); } catch { /* fresh start */ }
  }, []);

  useEffect(() => {
    if (mode !== "listen") return;
    const frame = requestAnimationFrame(() => {
      const viewport = cuesViewport.current;
      const row = activeRow.current;
      if (!viewport || !row) return;
      const previous = row.previousElementSibling as HTMLElement | null;
      const secondRowTop = (previous?.getBoundingClientRect().height || 0) + 2;
      const offset = row.getBoundingClientRect().top - viewport.getBoundingClientRect().top - secondRowTop;
      if (Math.abs(offset) > 3) viewport.scrollTop += offset;
    });
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, lessonId, mode, playing, furigana, translation]);

  const play = useCallback(async () => {
    if (!audio.current) return;
    try { await audio.current.play(); setAudioError(false); } catch { setAudioError(true); }
  }, []);

  const seek = useCallback((time: number) => {
    const el = audio.current;
    if (!el) return;
    el.currentTime = Math.max(0, Math.min(time, Number.isFinite(el.duration) ? el.duration : time));
    setPosition(el.currentTime);
  }, []);

  const replayCue = useCallback(() => {
    seek(cue.start);
    void play();
  }, [cue.start, play, seek]);

  const selectCue = useCallback((index: number, startPlayback = true) => {
    const next = Math.max(0, Math.min(index, lesson.cues.length - 1));
    audio.current?.pause();
    setDictationIndex(next); setTyped(""); setResult(null); setAttempts(0);
    window.setTimeout(() => {
      seek(lesson.cues[next].start);
      if (startPlayback) void play();
      if (mode === "dictation") input.current?.focus();
    }, 0);
  }, [lesson.cues, mode, play, seek]);

  function changeLesson(id: string) {
    audio.current?.pause(); setLessonId(id); setPosition(0); setDuration(0);
    setPlaying(false); setAudioError(false); setDictationIndex(0); setTyped("");
    setResult(null); setAttempts(0); setRepeat(false); setRepeatIndex(0);
  }

  function changeMode(next: Mode) {
    audio.current?.pause(); setMode(next); setPlaying(false); setResult(null); setTyped("");
    setAttempts(0); setRepeat(false);
    if (next === "dictation") { setDictationIndex(nearestIndex); seek(lesson.cues[nearestIndex].start); }
  }

  function submit() {
    if (!typed.trim() || result) return;
    const next = compareJapanese(typed, cue.ja);
    setResult(next); setAttempts(value => value + 1);
    if (next.correct) {
      setCompleted(previous => {
        const updated = { ...previous, [lesson.id]: Array.from(new Set([...(previous[lesson.id] || []), dictationIndex])) };
        localStorage.setItem("choukai-progress-v2", JSON.stringify(updated));
        return updated;
      });
    }
    window.setTimeout(() => input.current?.focus(), 0);
  }

  function retry() { setResult(null); seek(cue.start); void play(); input.current?.focus(); }

  useEffect(() => {
    if (mode !== "dictation" || !playing) return;
    let frame = 0;
    const tick = () => {
      const el = audio.current;
      if (!el || el.paused) return;
      if (el.currentTime >= cueEnd - 0.025) {
        el.pause();
        el.currentTime = cueEnd;
        setPosition(cueEnd);
        return;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [cueEnd, mode, playing]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (mode === "dictation" && event.altKey && !event.ctrlKey && !event.metaKey && event.code === "KeyR") {
        event.preventDefault();
        if (!event.repeat && !event.isComposing) replayCue();
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, button, a, [contenteditable=true]")) return;
      if (event.code === "Space") {
        event.preventDefault();
        if (audio.current?.paused) {
          if (mode === "dictation" && position >= cueEnd - 0.1) seek(cue.start);
          void play();
        } else audio.current?.pause();
      } else if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault(); seek((audio.current?.currentTime || 0) + (event.key === "ArrowLeft" ? -5 : 5));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [cue.start, cueEnd, mode, play, position, replayCue, seek]);

  function onTimeUpdate() {
    const el = audio.current;
    if (!el) return;
    setPosition(el.currentTime);
    if (mode === "dictation" && !el.paused && el.currentTime >= cueEnd - 0.025 && cueEnd > cue.start) {
      el.pause(); el.currentTime = cueEnd;
    } else if (mode === "listen" && repeat) {
      const start = lesson.cues[repeatIndex].start;
      const end = lesson.cues[repeatIndex].end;
      if (!el.paused && el.currentTime >= end - 0.025 && end > start) el.currentTime = start;
    }
  }

  return <main className="choukai-page">
    <div className="choukai-shell">
      <header className="choukai-header">
        <div><Link href="/" className="choukai-back"><ArrowLeft size={16} /> KotoBase</Link><div className="choukai-eyebrow">LISTENING STUDIO · 日本語</div><h1>Chōkai <span>聴解</span></h1><p>Nghe kỹ từng câu. Hiểu ngữ cảnh. Gõ lại điều bạn nghe.</p></div>
        <div className="choukai-header-mark"><Headphones size={34} strokeWidth={1.5} /></div>
      </header>

      <div className="choukai-layout">
        <aside className="choukai-library" aria-label="Danh sách bài nghe">
          <div className="choukai-panel-title"><span>Thư viện bài nghe</span><span>08 bài</span></div>
          {(["TNCS", "TNCN"] as const).map(group => <div className="choukai-group" key={group}>
            <div className="choukai-group-title">{group === "TNCS" ? "TNCS · Giao tiếp" : "TNCN · Công việc"}</div>
            {lessons.filter(item => item.group === group).map(item => <button key={item.id} type="button" onClick={() => changeLesson(item.id)} className={`choukai-lesson ${lesson.id === item.id ? "is-active" : ""}`} aria-current={lesson.id === item.id ? "page" : undefined}>
              <span className="choukai-lesson-icon"><Volume2 size={16} /></span><span><strong>{item.title}</strong><small>{item.cues.length} câu · {item.filename}</small></span><ChevronRight size={15} className="choukai-lesson-chevron" />
            </button>)}
          </div>)}
        </aside>

        <div className="choukai-workspace">
          <section className="choukai-player" aria-label="Trình phát audio">
            <div className="choukai-player-top"><div><span className="choukai-kicker">ĐANG HỌC · {lesson.group}</span><h2>{lesson.title}</h2><p>{lesson.filename}</p></div><span className="choukai-cue-count">{lesson.cues.length} câu</span></div>
            <audio ref={audio} key={lesson.id} src={lesson.audio} preload="metadata" onLoadedMetadata={() => { setDuration(audio.current?.duration || 0); if (audio.current) audio.current.playbackRate = speed; }} onTimeUpdate={onTimeUpdate} onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} onError={() => setAudioError(true)} onEnded={() => setPlaying(false)} />
            <div className="choukai-progress"><input type="range" min="0" max={duration || 1} step="0.05" value={Math.min(position, duration || 1)} onChange={event => seek(Number(event.target.value))} aria-label="Vị trí audio" /><div><span>{clock(position)}</span><span>{clock(duration)}</span></div></div>
            <div className="choukai-controls"><button type="button" title="Tua lùi 5 giây (←)" aria-label="Tua lùi 5 giây" onClick={() => seek(position - 5)}><SkipBack size={20} /></button><button type="button" className="choukai-play" aria-label={playing ? "Tạm dừng" : "Phát audio"} onClick={() => { if (playing) audio.current?.pause(); else { if (mode === "dictation" && position >= cueEnd - 0.1) seek(cue.start); void play(); } }}>{playing ? <Pause fill="currentColor" size={22} /> : <Play fill="currentColor" size={22} />}</button><button type="button" title="Tua tới 5 giây (→)" aria-label="Tua tới 5 giây" onClick={() => seek(position + 5)}><SkipForward size={20} /></button><span className="choukai-control-spacer" /><label className="choukai-speed">Tốc độ <select value={speed} onChange={event => { const value = Number(event.target.value); setSpeed(value); if (audio.current) audio.current.playbackRate = value; }} aria-label="Tốc độ phát">{[0.75, 0.9, 1, 1.25, 1.5, 2].map(value => <option key={value} value={value}>{value}×</option>)}</select></label></div>
            {audioError && <p role="alert" className="choukai-error">Không tải được audio. Hãy thử tải lại trang hoặc mở <a href={lesson.audio} target="_blank" rel="noreferrer">file nghe</a>.</p>}
            <div className="choukai-shortcuts"><Keyboard size={15} /> <kbd>Space</kbd> phát / dừng <kbd>←</kbd><kbd>→</kbd> tua 5 giây {mode === "dictation" && <><kbd>Alt + R</kbd> nghe lại câu</>}</div>
          </section>

          <div className="choukai-mode-tabs" role="tablist" aria-label="Chế độ học"><button type="button" role="tab" aria-selected={mode === "listen"} className={mode === "listen" ? "is-active" : ""} onClick={() => changeMode("listen")}><Headphones size={18} /> Nghe & theo dõi</button><button type="button" role="tab" aria-selected={mode === "dictation"} className={mode === "dictation" ? "is-active" : ""} onClick={() => changeMode("dictation")}><Keyboard size={18} /> Nghe & gõ lại</button></div>

          {mode === "listen" ? <section className="choukai-script" aria-label="Script đồng bộ"><div className="choukai-section-head"><div><span className="choukai-kicker">SCRIPT ĐỒNG BỘ</span><h2>Đoạn hội thoại</h2></div><div className="choukai-toggles"><button type="button" aria-pressed={furigana} onClick={() => setFurigana(!furigana)} className={furigana ? "is-on" : ""}>振 Furigana</button><button type="button" aria-pressed={translation} onClick={() => setTranslation(!translation)} className={translation ? "is-on" : ""}>Việt Song ngữ</button><button type="button" aria-pressed={repeat} onClick={() => { setRepeatIndex(nearestIndex); setRepeat(!repeat); }} className={repeat ? "is-on" : ""} title="Lặp câu hiện tại"><Repeat2 size={15} /> Lặp câu</button></div></div>
            {lesson.note && <p className="choukai-note">{lesson.note}</p>}
            <div ref={cuesViewport} className="choukai-cues">{lesson.cues.map((item, index) => <button key={index} ref={index === activeIndex ? activeRow : undefined} type="button" className={`choukai-cue ${index === activeIndex ? "is-current" : ""}`} onClick={() => { setRepeatIndex(index); seek(item.start); void play(); }}><span className="choukai-cue-time">{clock(item.start)}{index === activeIndex && playing ? <span className="choukai-sound-dot" /> : null}</span><span className="choukai-cue-content"><small>{item.speaker}</small><span className="choukai-ja" lang="ja"><Japanese text={item.ja} furigana={furigana} /></span>{translation && <span className="choukai-vi">{item.vi}</span>}</span></button>)}</div>
          </section> : <section className="choukai-dictation" aria-label="Luyện gõ từng câu"><div className="choukai-section-head"><div><span className="choukai-kicker">LUYỆN NGHE CHỦ ĐỘNG</span><h2>Nghe và gõ lại</h2></div><span className="choukai-dictation-count">{dictationIndex + 1} / {lesson.cues.length}</span></div>
            <div className="choukai-dictation-progress"><span style={{ width: `${done.length / lesson.cues.length * 100}%` }} /></div><p className="choukai-dictation-hint">Audio tự dừng sau khi câu kết thúc. Gõ tiếng Nhật bạn nghe được rồi nhấn Enter để kiểm tra; nếu đúng, nhấn Enter thêm lần nữa để sang câu tiếp theo. Dấu câu và khoảng trắng không tính vào điểm.</p>
            <div className="choukai-prompt"><div className="choukai-prompt-top"><span><span className="choukai-prompt-number">{String(dictationIndex + 1).padStart(2, "0")}</span> {cue.speaker} · {clock(cue.start)}–{clock(cueEnd)}</span>{done.includes(dictationIndex) && <span className="choukai-done"><Check size={14} /> Đã đúng</span>}</div><div className="choukai-prompt-main"><button type="button" className="choukai-replay" onClick={replayCue} aria-label="Nghe lại câu"><Volume2 size={21} /> Nghe câu này</button><span>Alt + R để nghe lại khi đang gõ</span></div></div>
            <label className="choukai-input-label" htmlFor="choukai-answer">Bạn nghe được gì?</label><textarea id="choukai-answer" ref={input} lang="ja" value={typed} onChange={event => { setTyped(event.target.value); if (result) setResult(null); }} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); if (result) { if (result.correct && dictationIndex < lesson.cues.length - 1) selectCue(dictationIndex + 1); else if (!result.correct) retry(); } else submit(); } }} placeholder="Gõ câu tiếng Nhật ở đây…" spellCheck={false} rows={3} />
            <div className="choukai-answer-actions"><button type="button" className="choukai-secondary" onClick={retry}><RotateCcw size={16} /> Nghe lại và sửa</button><button type="button" className="choukai-primary" disabled={!typed.trim() || !!result} onClick={submit}>Kiểm tra <span>Enter</span><ArrowRight size={17} /></button></div>
            {result && <div className="choukai-result" role="status"><div className="choukai-result-heading"><strong>{result.correct ? "Chính xác!" : result.score >= 75 ? "Rất gần rồi" : "Hãy nghe lại và thử tiếp"}</strong><span className={result.correct ? "is-perfect" : ""}>{result.score}%</span></div><p>Lần thử {attempts} · So sánh theo từng ký tự; màu cam là phần cần sửa, dấu câu không tính.</p><div className="choukai-comparison"><div><small>BẠN ĐÃ GÕ</small><DiffLine parts={result.inputParts} /></div><div><small>ĐÁP ÁN</small><DiffLine parts={result.answerParts} /></div></div><p className="choukai-result-vi">Nghĩa: {cue.vi}</p><div className="choukai-result-bottom"><span>{result.correct ? dictationIndex === lesson.cues.length - 1 ? "Bạn đã hoàn thành bài nghe này." : "Đúng rồi! Nhấn Enter thêm lần nữa khi sẵn sàng sang câu tiếp theo." : "Bạn có thể nghe lại, sửa và kiểm tra thêm lần nữa."}</span><button type="button" onClick={() => selectCue(dictationIndex + 1)} disabled={dictationIndex === lesson.cues.length - 1}>Câu tiếp theo <ArrowRight size={16} /></button></div></div>}
            <div className="choukai-dictation-nav"><button type="button" onClick={() => selectCue(dictationIndex - 1, false)} disabled={dictationIndex === 0}><ArrowLeft size={16} /> Câu trước</button><span>{done.length}/{lesson.cues.length} câu đúng</span><button type="button" onClick={() => selectCue(dictationIndex + 1, false)} disabled={dictationIndex === lesson.cues.length - 1}>Câu sau <ArrowRight size={16} /></button></div>
          </section>}
          <div className="choukai-source"><Settings2 size={15} /> Mốc thời gian được căn theo audio; nội dung đã hiệu chỉnh từ script gốc. <a href={lesson.source} target="_blank" rel="noreferrer">Xem tài liệu gốc ↗</a></div>
        </div>
      </div>
    </div>
  </main>;
}
