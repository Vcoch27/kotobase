"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, Headphones, Maximize, Minimize, RotateCcw, Volume2, SkipForward, Pause, Play, Shuffle } from "lucide-react";
import { StudyScopeSelector } from "./StudyScopeSelector";
import { MeaningText } from "./MeaningText";
import { StudyCardArtwork } from "./StudyCardArtwork";
import { useCustomBg } from "@/hooks/useCustomBg";
import { audioFX } from "@/lib/audio-fx";
import { playAudio, stopVocabularyAudio, getWebVolume } from "@/lib/tts-utils";
import { ListeningAudioPlayer, type ListeningAudioState } from "@/lib/listening-audio";
import {
  buildMeaningQuestion, gradeListeningAttempt, listeningReviewReason, shuffleListening,
  type ListeningWord, type ListeningResult,
} from "@/lib/listening-quiz";

interface Props {
  vocabularies: ListeningWord[];
  selectedVocabIds?: string[];
  isActive?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
}
type Stage = "dictation" | "meaning" | "result";
const button = "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-600 disabled:cursor-not-allowed disabled:opacity-50";
const primary = `${button} bg-violet-600 text-white hover:bg-violet-700`;
const secondary = `${button} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`;

export function ListeningQuizView({ vocabularies, selectedVocabIds = [], isActive = true, onFullscreenChange }: Props) {
  const initialScope = () => selectedVocabIds.length
    ? vocabularies.filter((word) => selectedVocabIds.includes(word.id)) : vocabularies;
  const [scoped, setScoped] = useState(initialScope);
  const [queue, setQueue] = useState(initialScope);
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(0);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const [stage, setStage] = useState<Stage>("dictation");
  const [typed, setTyped] = useState("");
  const [meaningId, setMeaningId] = useState<string | null>(null);
  const [freeMeaning, setFreeMeaning] = useState("");
  const [confidence, setConfidence] = useState<boolean | null>(null);
  const [question, setQuestion] = useState(() => buildMeaningQuestion(initialScope()[0] || { id: "", word: "", meaning: "" }, vocabularies));
  const [results, setResults] = useState<ListeningResult[]>([]);
  const [result, setResult] = useState<ListeningResult | null>(null);
  const [hold, setHold] = useState(false);
  const [delay, setDelay] = useState(5);
  const [countdown, setCountdown] = useState(5);
  const [fullscreen, setFullscreen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [audio, setAudio] = useState<ListeningAudioState>({ status: "idle", hasHeard: false, message: "" });
  const [audioWarning, setAudioWarning] = useState("");
  const player = useRef<ListeningAudioPlayer | null>(null);
  const settled = useRef(false);
  const composing = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const customBg = useCustomBg();
  const item = queue[index];
  const key = `${round}:${index}:${item?.id || "empty"}`;
  const scopeKey = scoped.map((word) => `${word.id}:${word.word}:${word.reading}:${word.meaning}`).join("\n");
  const audioBusy = audio.status === "loading" || audio.status === "playing";
  const promptText = (item?.reading || item?.word || "").split(/[/／;；、\n]+/)[0];

  useEffect(() => {
    const controller = new ListeningAudioPlayer(
      (text, callbacks) => playAudio(text, undefined, callbacks), stopVocabularyAudio, setAudio,
    );
    player.current = controller;
    const visibility = () => { setVisible(!document.hidden); if (document.hidden) controller.cancel(); };
    const pagehide = () => controller.cancel();
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pagehide);
    return () => {
      controller.dispose(); player.current = null;
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pagehide);
    };
  }, []);
  useEffect(() => {
    try {
      const saved = Number(localStorage.getItem("kotobase_quiz_delay"));
      if (saved >= 1 && saved <= 10) setDelay(saved);
    } catch { /* Defaults work when device storage is unavailable. */ }
    const sync = (event: Event) => {
      const value = Number((event as CustomEvent).detail);
      if (value >= 1 && value <= 10) setDelay(value);
    };
    window.addEventListener("kotobase_quiz_delay_change", sync);
    return () => window.removeEventListener("kotobase_quiz_delay_change", sync);
  }, []);
  const restart = useCallback((words: ListeningWord[]) => {
    player.current?.reset(); settled.current = false;
    setQueue(words); setIndex(0); setRound((value) => value + 1);
    setStarted(false); setFinished(false); setStage("dictation"); setResults([]); setResult(null);
    setTyped(""); setMeaningId(null); setConfidence(null); setFreeMeaning(""); setAudioWarning("");
  }, []);
  useEffect(() => { restart(scoped); }, [scopeKey, restart]);
  useEffect(() => {
    settled.current = false; composing.current = false;
    player.current?.reset(); setStage("dictation"); setTyped(""); setMeaningId(null);
    setConfidence(null); setFreeMeaning(""); setResult(null); setHold(false); setAudioWarning("");
    if (item) setQuestion(buildMeaningQuestion(item, vocabularies));
  }, [key]);
  const listen = useCallback((rate = 1) => {
    if (!isActive || !visible || !promptText || finished) return;
    if (getWebVolume() <= 0) { setAudioWarning("Âm lượng phát âm đang bằng 0. Tăng âm lượng phát âm rồi bấm nghe lại."); return; }
    setAudioWarning(""); player.current?.play(promptText, rate);
  }, [isActive, visible, promptText, finished]);
  useEffect(() => {
    if (!isActive) { player.current?.cancel(); setFullscreen(false); return; }
    if (!started || finished || !visible) return;
    listen();
    // Replaying on tab focus is explicit; don't surprise the user with audio.
  }, [key, started, isActive]);
  useEffect(() => { onFullscreenChange?.(fullscreen); }, [fullscreen, onFullscreenChange]);
  useEffect(() => () => onFullscreenChange?.(false), [onFullscreenChange]);
  useEffect(() => {
    if (started && stage === "dictation" && audio.hasHeard && !finished && isActive) input.current?.focus();
  }, [started, stage, audio.hasHeard, key, finished, isActive]);

  const finish = (skipped = false, unknownMeaning = false) => {
    if (!item || settled.current || !started || finished) return;
    if (!skipped && (stage !== "meaning" || (!unknownMeaning && (
        (question.correctId && (!meaningId || confidence === null)) ||
        (!question.correctId && !freeMeaning.trim()))))) return;
    settled.current = true; player.current?.cancel();
    const graded = gradeListeningAttempt({ word: item, pool: vocabularies, question, typed,
      meaningId: unknownMeaning ? null : meaningId, confident: !unknownMeaning && confidence === true,
      skipped, freeMeaning: unknownMeaning ? "Chưa nhớ nghĩa" : freeMeaning });
    setResult(graded); setResults((previous) => [...previous, graded]);
    setStage("result"); setCountdown(delay); setHold(!graded.mastered);
    try { if (graded.mastered) audioFX.playCorrect(); else audioFX.playWrong(); } catch { /* Optional feedback. */ }
  };
  const commitDictation = (unknown = false) => {
    if ((!unknown && !typed.trim()) || !audio.hasHeard || stage !== "dictation" || composing.current || !started) return;
    if (unknown) setTyped("");
    player.current?.cancel(); setStage("meaning");
  };
  const advance = useCallback(() => {
    if (stage !== "result" || !settled.current) return;
    settled.current = false; player.current?.reset();
    if (index === queue.length - 1) setFinished(true);
    else setIndex((value) => value + 1);
  }, [stage, index, queue.length]);
  useEffect(() => {
    if (stage !== "result" || finished || hold || audioBusy || !isActive || !visible) return;
    if (countdown <= 0) { advance(); return; }
    const timer = setTimeout(() => setCountdown((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [stage, finished, hold, audioBusy, isActive, visible, countdown, advance]);
  useEffect(() => {
    if (!isActive || !started || finished) return;
    const handle = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.isComposing || event.keyCode === 229 || composing.current || event.ctrlKey || event.altKey || event.metaKey || event.repeat ||
          (target?.closest("input") && target !== input.current) ||
          target?.closest('[role="dialog"],select,textarea,[contenteditable="true"]')) return;
      if (event.key === "Tab" && !event.shiftKey && stage !== "result") { event.preventDefault(); finish(true); }
      else if ((event.code === "Backquote" || event.key === "`") && !event.shiftKey) { event.preventDefault(); listen(); }
      else if (event.key === "Enter" && !target?.closest("button,a,summary")) {
        event.preventDefault();
        if (stage === "dictation") commitDictation();
        else if (stage === "meaning") finish();
        else advance();
      }
      else if (/^[1-4]$/.test(event.key) && stage === "meaning" && !target?.closest("input")) {
        const choice = question.choices[Number(event.key) - 1];
        if (choice) { event.preventDefault(); setMeaningId(choice.id); }
      }
    };
    window.addEventListener("keydown", handle);
    return () => window.removeEventListener("keydown", handle);
  });

  const review = results.filter((entry) => !entry.mastered);
  const mastered = results.filter((entry) => entry.mastered).length;
  const progress = index + (stage === "result" ? 1 : 0);
  return <div data-listening-quiz className={fullscreen ? "fixed inset-0 z-[100] overflow-y-auto bg-slate-50 p-3 pb-24 dark:bg-slate-950 sm:p-8" : "pb-20 md:pb-0"}>
    <div className="mx-auto max-w-4xl space-y-4 text-slate-800 dark:text-slate-100">
      {!fullscreen && <StudyScopeSelector allVocabularies={vocabularies} selectedVocabIds={selectedVocabIds} activeCount={scoped.length} onScopeChange={setScoped} modeTheme="purple" />}
      <div className="rounded-2xl border border-violet-100 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-bold text-violet-700 dark:text-violet-300"><Headphones size={19} />Nghe → Gõ → Hiểu nghĩa</div>
          <div className="flex gap-2">
            <button type="button" className={secondary} aria-label="Trộn bộ nghe và bắt đầu lại" onClick={() => restart(shuffleListening(scoped))}><Shuffle size={16} /></button>
            <button type="button" className={secondary} aria-label="Làm lại bộ nghe" onClick={() => restart(scoped)}><RotateCcw size={16} /></button>
            <button type="button" className={secondary} aria-label={fullscreen ? "Thu nhỏ" : "Toàn màn hình"} onClick={() => setFullscreen((value) => !value)}>{fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}</button>
          </div>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">Chốt cả chữ Nhật và nghĩa rồi mới xem đáp án. Đúng nhưng chưa chắc vẫn luyện lại. Phím ` nghe lại · Tab bỏ qua · Enter xác nhận/chuyển câu.</p>
      </div>
      {!queue.length ? <div className="rounded-3xl bg-white p-8 text-center dark:bg-slate-900">Chưa có từ để luyện nghe. Hãy đổi phạm vi học.</div>
      : finished ? <section className="rounded-3xl border border-violet-200 bg-white p-6 dark:border-violet-900 dark:bg-slate-900 sm:p-10">
        <p className="text-xs font-bold uppercase tracking-widest text-violet-600">Kết quả bộ nghe</p>
        <h2 className="mt-3 text-3xl font-bold">{mastered}/{queue.length} từ vững cả hai bước</h2>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-sm">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><strong className="block text-xl">{results.filter((entry) => entry.dictationCorrect).length}</strong>Nghe/gõ đúng</div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800"><strong className="block text-xl">{results.filter((entry) => entry.meaningCorrect === true).length}</strong>Chọn nghĩa đúng</div>
          <div className="rounded-xl bg-violet-50 p-3 dark:bg-violet-950"><strong className="block text-xl">{review.length}</strong>Cần luyện lại</div>
        </div>
        <p className="mt-4 text-sm leading-relaxed text-slate-500">Đây là kiểm tra nhớ lại trong phiên, không khẳng định đã hiểu chắc chắn 100%. Hãy thử lại các từ còn phân vân trước khi xem đáp án lần nữa.</p>
        {!!review.length && <ul className="mt-5 space-y-2">{review.map((entry) => <li key={entry.word.id} className="rounded-xl border border-amber-100 p-3 text-sm dark:border-amber-900"><strong lang="ja" translate="no">{entry.word.word}</strong><span className="ml-3 text-amber-700 dark:text-amber-300">{listeningReviewReason(entry)}</span></li>)}</ul>}
        <div className="mt-6 flex flex-wrap gap-3">
          {!!review.length && <button type="button" className={primary} onClick={() => restart(review.map((entry) => entry.word))}><RotateCcw size={16} />Luyện lại {review.length} từ chưa vững</button>}
          <button type="button" className={secondary} onClick={() => restart(scoped)}>Làm lại cả bộ</button>
        </div>
      </section> : !started ? <section className="rounded-3xl border border-violet-200 bg-white p-6 text-center shadow-sm dark:border-violet-900 dark:bg-slate-900 sm:p-12">
        <Headphones size={42} className="mx-auto text-violet-500" />
        <h2 className="mt-4 text-2xl font-bold">Nghe được từ, hiểu được nghĩa</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-slate-500">Nghe tiếng Nhật và gõ lại bằng kana hoặc Kanji. Sau đó chọn nghĩa và tự đánh giá mức chắc chắn. Chữ Nhật, nghĩa đúng và ví dụ chỉ hiện khi bạn đã chốt cả hai bước.</p>
        <button type="button" className={`${primary} mt-6`} onClick={() => setStarted(true)}><Play size={17} />Bắt đầu {queue.length} từ</button>
        <p className="mt-3 text-xs text-slate-500">Dùng giọng đọc và âm lượng phát âm bạn đã cài đặt.</p>
      </section> : <>
        <div className="flex justify-between px-1 text-xs font-semibold text-slate-500"><span>Câu {index + 1}/{queue.length}</span><span>{mastered} vững · {review.length} cần luyện lại</span></div>
        <div role="progressbar" aria-label="Tiến độ nghe và hiểu" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={queue.length} className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full bg-violet-500 transition-all" style={{ width: `${progress / queue.length * 100}%` }} /></div>
        <section className={`study-card relative overflow-hidden rounded-3xl border p-5 shadow-sm sm:p-8 ${result?.mastered ? "border-emerald-300" : "border-violet-200 dark:border-violet-900"}`}>
          <StudyCardArtwork side={stage === "result" ? "back" : "front"} customFrontUrl={customBg.cardFront?.dataUrl} customBackUrl={customBg.cardBack?.dataUrl} cardWash={customBg.washSettings?.cardWash} />
          <div className="relative z-10">
            <ol aria-label="Các bước luyện nghe" className="mb-6 flex gap-2 text-xs font-bold">
              {[["dictation", "1 · Nghe & gõ"], ["meaning", "2 · Hiểu nghĩa"], ["result", "3 · Đối chiếu"]].map(([value, label]) => <li key={value} aria-current={stage === value ? "step" : undefined} className={`rounded-full px-3 py-2 ${stage === value ? "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-100" : "text-slate-400"}`}>{label}</li>)}
            </ol>
            <div className="mb-5 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => listen()} className={primary}><Volume2 size={18} />{audioBusy ? "Phát lại" : "Nghe lại"}<kbd className="opacity-70">`</kbd></button>
              <button type="button" onClick={() => listen(0.75)} className={secondary}>Nghe chậm</button>
              {audioBusy && <button type="button" onClick={() => player.current?.cancel()} className={secondary} aria-label="Dừng âm thanh"><Pause size={16} /></button>}
            </div>
            <p role="status" className={`mb-5 text-xs leading-relaxed ${audio.status === "error" || audioWarning ? "text-amber-700 dark:text-amber-300" : "text-slate-500 dark:text-slate-400"}`}>{audioWarning || audio.message}</p>
            {stage === "dictation" ? <>
              <h2 className="text-xl font-bold">Bạn vừa nghe từ gì?</h2>
              <p className="mt-2 text-sm text-slate-500">Gõ kana hoặc Kanji. Kết quả chưa được bật mí ở bước này.</p>
              <label htmlFor="listening-dictation" className="mt-6 block text-xs font-bold text-slate-500">Tiếng Nhật bạn nghe được</label>
              <input id="listening-dictation" ref={input} value={typed} onChange={(event) => setTyped(event.target.value)} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; }} lang="ja" translate="no" autoComplete="off" autoCorrect="off" spellCheck={false} disabled={!audio.hasHeard} className="notranslate mt-2 min-h-14 w-full rounded-xl border-2 border-slate-200 bg-white/80 px-4 py-3 text-2xl outline-none focus:border-violet-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900/80" placeholder={audio.hasHeard ? "Nhập tiếng Nhật…" : "Nghe xong để bắt đầu gõ…"} />
              <div className="mt-4 flex flex-wrap gap-2"><button type="button" className={primary} disabled={!audio.hasHeard || !typed.trim()} onClick={() => commitDictation()}>Chốt phần gõ · Sang nghĩa<ArrowRight size={16} /></button>
                <button type="button" className={secondary} disabled={!audio.hasHeard} onClick={() => commitDictation(true)}>Chưa nghe ra từ · Thử phần nghĩa</button></div>
            </> : stage === "meaning" ? <>
              <h2 className="text-xl font-bold">Từ bạn nghe có nghĩa gì?</h2>
              <p className="mt-2 text-sm text-slate-500">Phần gõ đã chốt. Hãy chọn theo nghĩa bạn nhớ từ âm thanh; chữ Nhật và đáp án vẫn đang ẩn.</p>
              {question.correctId ? <>
                <div role="group" aria-label="Chọn nghĩa tiếng Việt" className="mt-5 grid gap-3 sm:grid-cols-2">{question.choices.map((choice, position) => <button key={choice.id} type="button" aria-pressed={meaningId === choice.id} onClick={() => setMeaningId(choice.id)} className={`flex min-h-20 items-start gap-3 rounded-xl border-2 p-4 text-left text-sm leading-relaxed transition-colors ${meaningId === choice.id ? "border-violet-500 bg-violet-50 dark:bg-violet-950" : "border-slate-200 bg-white/80 hover:border-violet-300 dark:border-slate-700 dark:bg-slate-900/80"}`}><span className="text-xs font-bold text-violet-500">{position + 1}</span><span>{choice.label}</span></button>)}</div>
                <fieldset className="mt-6"><legend className="text-xs font-bold text-slate-500">Bạn chắc đến mức nào?</legend><div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" aria-pressed={confidence === true} className={confidence === true ? primary : secondary} onClick={() => setConfidence(true)}><Check size={16} />Chắc nghĩa này</button>
                  <button type="button" aria-pressed={confidence === false} className={confidence === false ? primary : secondary} onClick={() => setConfidence(false)}>Còn phân vân / đang đoán</button>
                </div></fieldset>
              </> : <>
                <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-800 dark:bg-amber-950 dark:text-amber-200">Bộ từ chưa có đủ nghĩa khác nhau để tạo phương án đáng tin cậy. Viết nghĩa bạn nhớ trước khi xem đáp án; phần này sẽ được ghi là chưa kiểm chứng, không tính là đã hiểu chắc.</p>
                <label className="mt-4 block text-sm font-bold" htmlFor="listening-free-meaning">Nghĩa bạn nhớ</label><textarea id="listening-free-meaning" value={freeMeaning} onChange={(event) => setFreeMeaning(event.target.value)} rows={3} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900" />
              </>}
              <div className="mt-5 flex flex-wrap gap-2"><button type="button" className={primary} disabled={question.correctId ? !meaningId || confidence === null : !freeMeaning.trim()} onClick={() => finish()}>Chốt nghĩa · Xem kết quả<ArrowRight size={16} /></button>
                <button type="button" className={secondary} onClick={() => finish(false, true)}>Chưa nhớ nghĩa</button></div>
            </> : result && <>
              <div role="status" className={`mb-5 rounded-xl p-4 text-sm font-bold ${result.mastered ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"}`}>{listeningReviewReason(result)}</div>
              <h2 lang="ja" translate="no" className="notranslate text-4xl font-bold text-amber-600">{item.word}</h2>
              <p lang="ja" translate="no" className="notranslate mt-3 text-2xl font-semibold text-emerald-700 dark:text-emerald-300">{item.reading}</p>
              <div className="mt-3 text-lg"><MeaningText text={item.meaning} /></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70"><p className="text-xs font-bold text-slate-500">Nghe / Gõ · {result.dictationCorrect ? "Đúng cách đọc" : "Cần luyện lại"}</p><p lang="ja" translate="no" className="notranslate mt-2 break-words text-lg">{result.typed || "Chưa nhập"}</p></div>
                <div className="rounded-xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70"><p className="text-xs font-bold text-slate-500">Hiểu nghĩa · {result.meaningCorrect === null ? "Chưa kiểm chứng" : result.meaningCorrect ? "Đúng" : "Cần luyện lại"}</p><p className="mt-2 text-sm">{result.selectedMeaning || "Chưa chọn"}</p><p className="mt-2 text-xs text-slate-500">{result.confident ? "Bạn đã chọn: Chắc nghĩa này" : "Chưa xác nhận chắc nghĩa"}</p></div>
              </div>
              {item.example && <p className="mt-4 whitespace-pre-wrap rounded-xl border border-slate-200 bg-white/70 p-4 text-sm leading-relaxed dark:border-slate-700 dark:bg-slate-900/70">{item.example}</p>}
              <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={() => setHold((value) => !value)} className={secondary}>{hold ? <Play size={16} /> : <Pause size={16} />}{hold ? "Tiếp tục đếm" : `Giữ đáp án · ${countdown}s`}</button><button type="button" className={primary} onClick={advance}>{index === queue.length - 1 ? "Xem tổng kết" : "Câu tiếp"}<ArrowRight size={16} /><kbd>Enter</kbd></button></div>
              {!result.mastered && <p className="mt-3 text-xs text-slate-500">Đang giữ đáp án để bạn đối chiếu. Từ này sẽ có trong lượt luyện lại cuối bộ.</p>}
            </>}
            {stage !== "result" && <div className="mt-6 border-t border-slate-200 pt-4 text-right dark:border-slate-700"><button type="button" className={secondary} onClick={() => finish(true)}>Bỏ qua · Xem đáp án<SkipForward size={16} /><kbd>Tab</kbd></button></div>}
          </div>
        </section>
      </>}
    </div>
  </div>;
}
