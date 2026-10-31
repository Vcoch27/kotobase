"use client";
// Temporary localhost-only route. No real sound, microphone or production reads.
import { useEffect, useRef, useState } from "react";
import { QuizView } from "@/components/QuizView";
import { FlashcardView } from "@/components/FlashcardView";
const words = [
  { id: "qa-strong", word: "強み", reading: "つよみ", meaning: "Điểm mạnh, thế mạnh <<tsuyomi>>", example: "私の強みは語学です。\nĐiểm mạnh của tôi là ngoại ngữ." },
  { id: "qa-reflect", word: "反省", reading: "はんせい", meaning: "Nhìn lại, tự kiểm điểm" },
  { id: "qa-coffee", word: "コーヒー", reading: "コーヒー", meaning: "Cà phê" },
  { id: "qa-weak", word: "弱み", reading: "よわみ", meaning: "Điểm yếu" },
];
export default function ListeningQuizPreview() {
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("quiz");
  const [active, setActive] = useState(true);
  const [request, setRequest] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [single, setSingle] = useState(false);
  const [lastText, setLastText] = useState("");
  const last = useRef<SpeechSynthesisUtterance | null>(null);
  const holdAudio = useRef(false);
  const denyAudio = useRef(false);
  useEffect(() => {
    const original = Object.getOwnPropertyDescriptor(window, "speechSynthesis");
    const OriginalUtterance = window.SpeechSynthesisUtterance;
    const previous = localStorage.getItem("koto_tts_settings");
    const previousDelay = localStorage.getItem("kotobase_quiz_delay");
    const previousVolume = localStorage.getItem("kotobase_web_volume");
    const previousSfx = localStorage.getItem("kotobase_sfx_volume");
    localStorage.setItem("koto_tts_settings", JSON.stringify({ provider: "browser" }));
    localStorage.setItem("kotobase_quiz_delay", "10");
    localStorage.setItem("kotobase_web_volume", "1");
    localStorage.setItem("kotobase_sfx_volume", "0");
    let timer: ReturnType<typeof setTimeout>;
    Object.defineProperty(window, "SpeechSynthesisUtterance", { configurable: true, value: class { constructor(public text: string) {} } });
    Object.defineProperty(window, "speechSynthesis", { configurable: true, value: {
      getVoices: () => [{ lang: "ja-JP" }], addEventListener() {}, removeEventListener() {},
      cancel() { clearTimeout(timer); last.current = null; },
      speak(utterance: SpeechSynthesisUtterance) {
        last.current = utterance; setLastText(utterance.text);
        if (denyAudio.current) { utterance.onerror?.({} as SpeechSynthesisErrorEvent); return; }
        utterance.onstart?.({} as SpeechSynthesisEvent);
        if (!holdAudio.current) timer = setTimeout(() => utterance.onend?.({} as SpeechSynthesisEvent), 300);
      },
    } });
    setReady(true);
    return () => {
      clearTimeout(timer);
      if (original) Object.defineProperty(window, "speechSynthesis", original);
      else Reflect.deleteProperty(window, "speechSynthesis");
      window.SpeechSynthesisUtterance = OriginalUtterance;
      for (const [key, value] of [["koto_tts_settings", previous], ["kotobase_quiz_delay", previousDelay], ["kotobase_web_volume", previousVolume], ["kotobase_sfx_volume", previousSfx]])
        if (value === null) localStorage.removeItem(key!); else localStorage.setItem(key!, value!);
    };
  }, []);
  const source = single ? words.slice(0, 1) : words;
  return <main className="min-h-screen bg-slate-50 p-4 text-slate-900 dark:bg-slate-950 dark:text-white">
    <div className="mx-auto mb-4 flex max-w-4xl flex-wrap gap-3 text-xs">
      <strong>LOCAL QA · âm thanh giả · không Firestore</strong>
      <button onClick={() => setView("flashcard")}>Mở Flashcard mẫu</button>
      <button onClick={() => setView("quiz")}>Mở Quiz mẫu</button>
      <button onClick={() => setSelected(source.slice(0, 2).map((word) => word.id))}>Chọn 2 từ mẫu</button>
      <button onClick={() => { setSingle((value) => !value); setSelected([]); setRequest((value) => value + 1); }}>Đổi bộ 1 / 4 từ</button>
      <button onClick={() => setActive((value) => !value)}>Đổi active</button>
      <button onClick={() => document.documentElement.classList.toggle("dark")}>Dark theme</button>
      <label><input type="checkbox" onChange={(event) => { holdAudio.current = event.target.checked; }} />Giữ audio chưa kết thúc</label>
      <label><input type="checkbox" onChange={(event) => { denyAudio.current = event.target.checked; }} />Lỗi audio</label>
      <button onClick={() => last.current?.onend?.({} as SpeechSynthesisEvent)}>Mock audio end</button>
    </div>
    {ready && (view === "quiz" ? <QuizView key={single ? "single" : "all"} vocabularies={source} selectedVocabIds={selected} requestedListening={request} isActive={active} />
      : <FlashcardView vocabularies={source} selectedVocabIds={selected} onOpenListeningQuiz={(ids) => { setSelected(ids); setRequest((value) => value + 1); setView("quiz"); }} isActive={active} />)}
    <p className="mx-auto mt-5 max-w-4xl text-xs">QA đã phát (chỉ mô phỏng): {lastText} · Scope: {selected.join(",") || "all"}</p>
  </main>;
}
