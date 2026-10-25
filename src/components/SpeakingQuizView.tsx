"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Mic,
  MicOff,
  Check,
  ArrowRight,
  SkipForward,
  RotateCcw,
  Volume2,
  Pause,
  Play,
  Eye,
  EyeOff,
  Shuffle,
  Maximize,
  Minimize,
  Info,
  ChevronDown,
  Settings2,
} from "lucide-react";
import { StudyScopeSelector, VocabularyData } from "./StudyScopeSelector";
import { MeaningText, parseMeaning } from "./MeaningText";
import { StudyCardArtwork } from "./StudyCardArtwork";
import { useCustomBg } from "@/hooks/useCustomBg";
import { useSpeechQuiz } from "@/hooks/useSpeechQuiz";
import {
  matchSpokenAnswer,
  compareSpokenVocabulary,
  addReviewWord,
  isShortSpokenVocabulary,
  homophonesFromVocabulary,
  loadSpokenHomophones,
} from "@/lib/speaking-match";
import { bindSpeakingShortcuts } from "@/lib/speaking-shortcuts";
import { playSpeakingSample } from "@/lib/speaking-sample";
import { getWebVolume } from "@/lib/tts-utils";
import { audioFX } from "@/lib/audio-fx";
import { MicrophoneSettingsModal } from "./MicrophoneSettingsModal";

type PromptMode = "word" | "meaning";
type Outcome = "correct" | "skipped" | null;
interface Props {
  vocabularies: VocabularyData[];
  selectedVocabIds?: string[];
  isActive?: boolean;
  onFullscreenChange?: (fullscreen: boolean) => void;
}
const button =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";
const secondary = `${button} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800`;
const primary = `${button} bg-emerald-600 text-white hover:bg-emerald-700`;
function save(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Private browser storage may be unavailable. */
  }
}
function shuffle<T>(items: T[]) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function SpeakingQuizView({
  vocabularies,
  selectedVocabIds = [],
  isActive = true,
  onFullscreenChange,
}: Props) {
  const initialScope = () => {
    const selected = new Set(selectedVocabIds);
    return selected.size
      ? vocabularies.filter((v) => selected.has(v.id))
      : vocabularies;
  };
  const [scoped, setScoped] = useState(initialScope);
  const [queue, setQueue] = useState(initialScope);
  const [index, setIndex] = useState(0);
  const [round, setRound] = useState(0);
  const [mode, setMode] = useState<PromptMode>("word");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [finished, setFinished] = useState(false);
  const [correct, setCorrect] = useState<string[]>([]);
  const [skipped, setSkipped] = useState<VocabularyData[]>([]);
  const [review, setReview] = useState<VocabularyData[]>([]);
  const [showReading, setShowReading] = useState(false);
  const [delay, setDelay] = useState(5);
  const [countdown, setCountdown] = useState(5);
  const [hold, setHold] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [visible, setVisible] = useState(true);
  const [sampleMessage, setSampleMessage] = useState("");
  const [showMicrophoneSettings, setShowMicrophoneSettings] = useState(false);
  const [audioBusy, setAudioBusy] = useState(false);
  const cancelSample = useRef<(() => void) | null>(null);
  const resumeAfterRetry = useRef(false);
  const settled = useRef(false);
  const advancing = useRef(false);
  const customBg = useCustomBg();
  const item = queue[index];
  const questionKey = `${round}:${index}:${item?.id || "empty"}`;
  const [dictionaryWords, setDictionaryWords] = useState<{ key: string; words: string[] }>({ key: "", words: [] });
  const [lastAttempt, setLastAttempt] = useState<{ key: string; alternatives: string[] } | null>(null);
  const homophones = useMemo(() => item ? [
    ...homophonesFromVocabulary(item, vocabularies),
    ...(dictionaryWords.key === questionKey ? dictionaryWords.words : []),
  ] : [], [item, vocabularies, dictionaryWords, questionKey]);
  const reveal = !!outcome;

  const accept = useCallback(() => {
    if (settled.current || !item || !isActive || finished) return;
    settled.current = true;
    setOutcome("correct");
    setCountdown(delay);
    setHold(false);
    setCorrect((prev) => (prev.includes(item.id) ? prev : [...prev, item.id]));
    try {
      audioFX.playCorrect();
    } catch {
      /* Sound must not block answer submission. */
    }
    sample(true);
  }, [item, isActive, finished, delay]);
  const speech = useSpeechQuiz({
    questionKey,
    enabled: isActive && visible && !finished && !outcome && !!item,
    evaluate: (alternatives) =>
      item ? matchSpokenAnswer(alternatives, item, homophones) : null,
    onMatch: accept,
    onAttempt: (attempt) => {
      if (!attempt.matched && item) {
        setLastAttempt({ key: questionKey, alternatives: attempt.alternatives });
        setReview((prev) => addReviewWord(prev, item));
      }
    },
  });
  const listening = [
    "starting",
    "listening",
    "hearing",
    "reconnecting",
  ].includes(speech.status);

  useEffect(() => {
    try {
      const savedMode = localStorage.getItem("kotobase_speaking_mode");
      if (savedMode === "word" || savedMode === "meaning") setMode(savedMode);
      const value = Number(localStorage.getItem("kotobase_quiz_delay"));
      if (value >= 1 && value <= 10) setDelay(value);
    } catch {
      /* Defaults remain usable. */
    }
    const syncDelay = (event: Event) => {
      const value = Number((event as CustomEvent).detail);
      if (value >= 1 && value <= 10) setDelay(value);
    };
    const visibility = () => setVisible(!document.hidden);
    setVisible(!document.hidden);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("kotobase_quiz_delay_change", syncDelay);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("kotobase_quiz_delay_change", syncDelay);
    };
  }, []);

  const restart = useCallback(
    (items: VocabularyData[]) => {
      speech.pause();
      cancelSample.current?.();
      setAudioBusy(false);
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
      settled.current = false;
      advancing.current = false;
      setQueue(items);
      setIndex(0);
      setRound((n) => n + 1);
      setOutcome(null);
      setFinished(false);
      setCorrect([]);
      setSkipped([]);
      setReview([]);
      setShowReading(false);
      setSampleMessage("");
      setHold(false);
    },
    [speech.pause],
  );
  const scopeKey = scoped.map((v) => v.id).join(",");
  useEffect(() => {
    restart(scoped);
  }, [scopeKey, restart]);
  useEffect(() => {
    settled.current = false;
    advancing.current = false;
    setShowReading(false);
    setSampleMessage("");
    if (resumeAfterRetry.current) {
      resumeAfterRetry.current = false;
      speech.start();
    }
  }, [questionKey]);
  useEffect(() => {
    if (!item || !isActive || !visible || finished) return;
    let cancelled = false;
    void loadSpokenHomophones(item).then((words) => {
      if (!cancelled) setDictionaryWords({ key: questionKey, words });
    });
    return () => { cancelled = true; };
  }, [item, questionKey, isActive, visible, finished]);
  // A dictionary reply may arrive after a final ASR result. Recheck only the
  // current question, never a skipped answer, old round or a sample playback.
  useEffect(() => {
    if (!item || !isActive || !visible || finished || outcome || audioBusy || showMicrophoneSettings ||
        lastAttempt?.key !== questionKey || settled.current) return;
    if (matchSpokenAnswer(lastAttempt.alternatives, item, homophones)) {
      if (speech.history.every((attempt) => !!matchSpokenAnswer(attempt.alternatives, item, homophones)))
        setReview((prev) => prev.filter((word) => word.id !== item.id));
      accept();
    }
  }, [homophones, lastAttempt, questionKey, item, isActive, visible, finished, outcome,
      audioBusy, showMicrophoneSettings, speech.history, accept]);
  useEffect(() => {
    if (!isActive) {
      cancelSample.current?.();
      setAudioBusy(false);
      speech.pause("Đã tạm dừng khi rời Quiz.");
      setFullscreen(false);
    }
    return () => {
      cancelSample.current?.();
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    };
  }, [isActive, speech.pause]);
  useEffect(() => {
    onFullscreenChange?.(fullscreen);
  }, [fullscreen, onFullscreenChange]);
  useEffect(() => () => onFullscreenChange?.(false), [onFullscreenChange]);
  useEffect(() => {
    const stopOutput = () => {
      cancelSample.current?.();
      setAudioBusy(false);
      if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    };
    window.addEventListener("kotobase_microphone_test_opened", stopOutput);
    return () =>
      window.removeEventListener("kotobase_microphone_test_opened", stopOutput);
  }, []);
  useEffect(() => {
    if (!visible) {
      cancelSample.current?.();
      setAudioBusy(false);
    }
  }, [visible]);

  const advance = useCallback(() => {
    if (!outcome || advancing.current) return;
    advancing.current = true;
    cancelSample.current?.();
    setAudioBusy(false);
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    if (index >= queue.length - 1) {
      speech.pause("Đã hoàn thành phiên luyện.");
      setFinished(true);
    } else {
      setIndex((n) => n + 1);
      setOutcome(null);
    }
  }, [outcome, index, queue.length, speech.pause]);
  useEffect(() => {
    if (!outcome || finished || hold || audioBusy || !isActive || !visible)
      return;
    if (countdown <= 0) {
      advance();
      return;
    }
    const timer = setTimeout(() => setCountdown((n) => n - 1), 1000);
    return () => clearTimeout(timer);
  }, [
    outcome,
    finished,
    hold,
    audioBusy,
    isActive,
    visible,
    countdown,
    advance,
  ]);

  useEffect(() => {
    if (!isActive || finished) return;
    return bindSpeakingShortcuts(window, {
      canSpeak: () => !outcome && !!item && !settled.current && visible,
      canSkip: () => !outcome && !!item && !settled.current,
      canAdvance: () => !!outcome,
      canSample: () => !!item && visible,
      sample: () => sample(),
      startHeld: () => startListening(true),
      releaseHeld: speech.release,
      skip: () => skip(),
      advance,
      pause: () => {
        speech.pause();
        cancelSample.current?.();
        setAudioBusy(false);
        setFullscreen(false);
      },
    });
  }, [
    isActive,
    finished,
    outcome,
    questionKey,
    visible,
    advance,
    speech.pause,
    speech.release,
    delay,
  ]);

  const skip = () => {
    if (!item || settled.current) return;
    settled.current = true;
    speech.suspend();
    setSkipped((prev) => addReviewWord(prev, item));
    setReview((prev) => addReviewWord(prev, item));
    setOutcome("skipped");
    setHold(false);
    setCountdown(delay);
    sample(true);
  };
  const sample = (automatic = false, thenRetry = false) => {
    if (!item) return;
    cancelSample.current?.();
    if (automatic) speech.suspend();
    else
      speech.pause("Micro đã tắt để nghe mẫu. Bấm tiếp tục khi sẵn sàng nói.");
    if (!automatic) setHold(true);
    setAudioBusy(true);
    cancelSample.current = playSpeakingSample(
      item.reading || item.word,
      {
        status: setSampleMessage,
        done: (error) => {
          setAudioBusy(false);
          setSampleMessage(
            error ||
              "Đã nghe mẫu. Bạn có thể thử lại ngay hoặc tiếp tục phiên.",
          );
          if (error) setShowReading(true);
          if (thenRetry) retryCurrent();
        },
      },
      undefined,
      undefined,
      getWebVolume(),
    );
  };
  const retryCurrent = () => {
    cancelSample.current?.();
    setAudioBusy(false);
    speech.pause();
    settled.current = false;
    advancing.current = false;
    setSkipped((prev) => prev.filter((v) => v.id !== item.id));
    setCorrect((prev) => prev.filter((id) => id !== item.id));
    resumeAfterRetry.current = true;
    setOutcome(null);
    setHold(false);
    setRound((n) => n + 1);
  };
  const startListening = (held = false) => {
    cancelSample.current?.();
    setAudioBusy(false);
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    setSampleMessage("");
    speech.start(held);
  };
  const changeMode = (value: PromptMode) => {
    if (value === mode) return;
    setMode(value);
    save("kotobase_speaking_mode", value);
    restart(scoped);
  };
  const comparisons = item
    ? compareSpokenVocabulary(speech.transcript, item, homophones)
    : [];
  const statusText = (
    {
      idle: "Sẵn sàng luyện nói",
      starting: "Đang mở micro",
      listening: "Đang lắng nghe",
      hearing: "Đã nghe giọng bạn",
      processing: "Đang xử lý lượt nói",
      reconnecting: "Đang nghe tiếp",
      paused: "Micro đã tạm dừng",
      error: "Phiên nghe bị gián đoạn",
      unsupported: "Trình duyệt chưa hỗ trợ",
    } as const
  )[speech.status];

  return (
    <div
      className={
        fullscreen
          ? "fixed inset-0 z-[100] overflow-y-auto bg-slate-50 p-3 pb-24 dark:bg-slate-950 sm:p-8"
          : "pb-20 md:pb-0"
      }
    >
      <div className="mx-auto max-w-4xl space-y-4 text-slate-800 dark:text-slate-100">
        {showMicrophoneSettings && (
          <MicrophoneSettingsModal
            onClose={() => setShowMicrophoneSettings(false)}
          />
        )}
        {!fullscreen && (
          <StudyScopeSelector
            allVocabularies={vocabularies}
            selectedVocabIds={selectedVocabIds}
            activeCount={scoped.length}
            onScopeChange={setScoped}
            modeTheme="emerald"
          />
        )}
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div
              className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 dark:bg-slate-800"
              role="group"
              aria-label="Hướng luyện nói"
            >
              {(
                [
                  { value: "word", label: "Nhìn từ → đọc" },
                  { value: "meaning", label: "Nhìn nghĩa → nói" },
                ] as const
              ).map((option) => (
                <button
                  type="button"
                  key={option.value}
                  aria-pressed={mode === option.value}
                  onClick={() => changeMode(option.value)}
                  className={`${button} px-3 py-2 text-xs sm:text-sm ${mode === option.value ? "bg-white text-emerald-700 shadow-sm dark:bg-slate-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className={`${secondary} p-2.5`}
                aria-label="Cài đặt và kiểm tra micro"
                title="Cài đặt và kiểm tra micro"
                onClick={() => setShowMicrophoneSettings(true)}
              >
                <Settings2 size={16} />
              </button>
              <button
                type="button"
                className={`${secondary} p-2.5`}
                aria-label="Trộn câu và bắt đầu lại"
                title="Trộn câu và bắt đầu lại"
                onClick={() => restart(shuffle(scoped))}
              >
                <Shuffle size={16} />
              </button>
              <button
                type="button"
                className={`${secondary} p-2.5`}
                aria-label="Làm lại từ đầu"
                title="Làm lại từ đầu"
                onClick={() => restart(scoped)}
              >
                <RotateCcw size={16} />
              </button>
              <button
                type="button"
                className={`${secondary} p-2.5`}
                aria-label={fullscreen ? "Thu nhỏ" : "Toàn màn hình"}
                title={fullscreen ? "Thu nhỏ" : "Toàn màn hình"}
                onClick={() => setFullscreen((v) => !v)}
              >
                {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs dark:border-slate-800">
            <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              <Mic size={14} /> Giữ Space để nói · thả để nhận kết quả · Tab bỏ
              qua
            </span>
            <label className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
              Chuyển câu sau{" "}
              <select
                aria-label="Thời gian hiện đáp án"
                value={delay}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  setDelay(value);
                  save("kotobase_quiz_delay", String(value));
                  window.dispatchEvent(
                    new CustomEvent("kotobase_quiz_delay_change", {
                      detail: value,
                    }),
                  );
                }}
                className="rounded-lg border border-slate-200 bg-transparent p-1.5 dark:border-slate-600"
              >
                {Array.from({ length: 10 }, (_, i) => (
                  <option key={i} value={i + 1}>
                    {i + 1}s
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {!queue.length ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center dark:border-slate-700 dark:bg-slate-900">
            <MicOff className="mx-auto mb-3 text-slate-400" />
            <h2 className="font-bold">Chưa có từ để luyện nói</h2>
            <p className="mt-2 text-sm text-slate-500">
              Hãy chọn thư mục hoặc đổi phạm vi học.
            </p>
          </div>
        ) : finished ? (
          <section className="rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm dark:border-emerald-900 dark:bg-slate-900 sm:p-10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
              <Check size={32} />
            </div>
            <p className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Hoàn thành phiên luyện nói
            </p>
            <h2 className="mt-3 text-3xl font-bold">
              Đã nhận đúng {correct.length}/{queue.length} từ
            </h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {review.length
                ? `${review.length} từ từng nhận chưa đúng hoặc bỏ qua đang chờ bạn luyện lại.`
                : "Bạn đã đi hết bộ từ. Hãy thử hướng đề còn lại để luyện phản xạ."}
            </p>
            {!!review.length && (
              <div className="mx-auto mt-5 flex max-w-lg flex-wrap justify-center gap-2">
                {review.map((v) => (
                  <span
                    key={v.id}
                    className="rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200"
                  >
                    {v.word} · {v.reading}
                  </span>
                ))}
              </div>
            )}
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              {!!review.length && (
                <button
                  type="button"
                  className={primary}
                  onClick={() => restart(review)}
                >
                  <Mic size={16} />
                  Luyện lại {review.length} từ chưa vững
                </button>
              )}
              <button
                type="button"
                className={secondary}
                onClick={() => restart(scoped)}
              >
                <RotateCcw size={16} />
                Làm lại toàn bộ
              </button>
            </div>
          </section>
        ) : (
          <>
            <div className="space-y-2 px-1">
              <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>
                  Câu {index + 1} / {queue.length}
                </span>
                <span>
                  <span className="text-emerald-700 dark:text-emerald-400">
                    {correct.length} đúng
                  </span>{" "}
                  · {skipped.length} bỏ qua
                </span>
              </div>
              <div
                role="progressbar"
                aria-label="Tiến độ luyện nói"
                aria-valuenow={index + (outcome ? 1 : 0)}
                aria-valuemin={0}
                aria-valuemax={queue.length}
                className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
              >
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${((index + (outcome ? 1 : 0)) / queue.length) * 100}%`,
                  }}
                />
              </div>
            </div>
            <section
              className={`study-card relative overflow-hidden rounded-3xl border p-5 shadow-lg sm:p-8 ${outcome === "correct" ? "border-emerald-400 dark:border-emerald-700" : "border-slate-200 dark:border-slate-700"}`}
            >
              <StudyCardArtwork
                side={reveal ? "back" : "front"}
                customFrontUrl={customBg.customBg.cardFront?.dataUrl}
                customBackUrl={customBg.customBg.cardBack?.dataUrl}
                cardWash={customBg.washSettings.cardWash}
              />
              <div className="relative">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">
                    {mode === "word"
                      ? "Nhìn từ · đọc thành tiếng"
                      : "Nhìn nghĩa · nói từ tiếng Nhật"}
                  </p>
                  <span className="shrink-0 rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-bold text-slate-500 dark:border-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <div className="flex min-h-40 flex-col items-center justify-center py-8 text-center sm:min-h-48">
                  <h2
                    lang={mode === "word" || reveal ? "ja" : "vi"}
                    translate={mode === "word" || reveal ? "no" : "yes"}
                    className={`max-w-full break-words font-bold leading-snug ${mode === "word" || reveal ? "text-5xl text-amber-600 dark:text-amber-400 sm:text-6xl" : "text-3xl text-slate-800 dark:text-slate-100 sm:text-4xl"}`}
                  >
                    {mode === "word" || reveal
                      ? item.word
                      : parseMeaning(item.meaning).cleanMeaning}
                  </h2>
                  {reveal && (
                    <div className="mt-4 space-y-2">
                      <p
                        lang="ja"
                        translate="no"
                        className="text-2xl font-semibold text-emerald-700 dark:text-emerald-300"
                      >
                        {item.reading}
                      </p>
                      {item.sinoVietnamese && (
                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-300">
                          {item.sinoVietnamese}
                        </p>
                      )}
                      <MeaningText
                        text={item.meaning}
                        className="block text-base text-slate-600 dark:text-slate-300"
                      />
                    </div>
                  )}
                </div>

                {reveal ? (
                  <div className="space-y-4">
                    <div
                      role="status"
                      className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4 ${outcome === "correct" ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200"}`}
                    >
                      <span className="flex items-center gap-2 font-bold">
                        {outcome === "correct" ? (
                          <Check size={20} />
                        ) : (
                          <SkipForward size={20} />
                        )}
                        {outcome === "correct"
                          ? "Đã nhận đúng từ!"
                          : "Đã bỏ qua · cùng xem lại đáp án"}
                      </span>
                      {speech.transcript && (
                        <span
                          lang="ja"
                          translate="no"
                          className="notranslate break-all text-sm"
                        >
                          Máy nghe: {speech.transcript}
                        </span>
                      )}
                    </div>
                    {item.example && (
                      <div className="rounded-xl border border-slate-200/80 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/70">
                        <p className="mb-2 text-xs font-bold uppercase text-slate-500">
                          Ví dụ
                        </p>
                        <p className="whitespace-pre-wrap text-sm leading-relaxed">
                          {item.example}
                        </p>
                      </div>
                    )}
                    {item.note && (
                      <div className="rounded-xl bg-amber-50/80 p-4 text-sm dark:bg-slate-800">
                        <p className="mb-1 font-bold">Ghi chú</p>
                        <p className="whitespace-pre-wrap">{item.note}</p>
                      </div>
                    )}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-4 dark:border-slate-700">
                      <button
                        type="button"
                        className={secondary}
                        onClick={() => sample()}
                      >
                        <Volume2 size={16} />
                        Nghe mẫu <kbd className="text-xs opacity-60">`</kbd>
                      </button>
                      <button
                        type="button"
                        className={secondary}
                        onClick={retryCurrent}
                      >
                        <Mic size={16} />
                        Thử lại ngay
                      </button>
                      <button
                        type="button"
                        className={secondary}
                        onClick={() => sample(false, true)}
                      >
                        <Volume2 size={16} />
                        Nghe & thử lại
                      </button>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className={secondary}
                          aria-pressed={hold}
                          onClick={() => setHold((value) => !value)}
                        >
                          {hold ? <Play size={15} /> : <Pause size={15} />}
                          {hold ? "Tiếp tục đếm" : `Giữ đáp án · ${countdown}s`}
                        </button>
                        <button
                          type="button"
                          className={primary}
                          onClick={advance}
                        >
                          Câu tiếp <ArrowRight size={16} />
                          <span className="hidden text-xs opacity-80 sm:inline">
                            Enter
                          </span>
                        </button>
                      </div>
                    </div>
                    <p className="text-center text-xs text-slate-500 dark:text-slate-400">
                      {audioBusy
                        ? "Đang phát cách đọc; đếm ngược tiếp tục sau khi phát xong."
                        : hold
                          ? "Đang giữ đáp án để bạn đọc kỹ."
                          : `Tự chuyển câu sau ${countdown} giây. Bạn có thể bấm Enter để qua ngay.`}
                    </p>
                    {sampleMessage && (
                      <p
                        role="status"
                        className="text-center text-xs text-slate-500 dark:text-slate-400"
                      >
                        {sampleMessage}
                      </p>
                    )}
                  </div>
                ) : (
                  <>
                    <div
                      className={`rounded-2xl border p-4 sm:p-5 ${speech.status === "error" || speech.status === "unsupported" ? "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40" : "border-slate-200 bg-white/85 dark:border-slate-700 dark:bg-slate-900/90"}`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${listening ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"}`}
                        >
                          {listening ? <Mic size={21} /> : <MicOff size={21} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p role="status" className="text-sm font-bold">
                            {statusText}
                          </p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            {speech.message ||
                              "Bật micro một lần, nói đáp án và tiếp tục luyện qua các câu."}
                          </p>
                        </div>
                        {speech.status === "hearing" && (
                          <span className="flex gap-1" aria-hidden="true">
                            {[1, 2, 3, 4].map((n) => (
                              <span
                                key={n}
                                className="h-6 w-1 rounded-full bg-emerald-500 motion-safe:animate-pulse"
                                style={{
                                  animationDelay: `${n * 120}ms`,
                                  height: `${8 + n * 4}px`,
                                }}
                              />
                            ))}
                          </span>
                        )}
                      </div>
                      {speech.status === "unsupported" ? (
                        <p className="mt-3 text-sm leading-relaxed">
                          Hãy mở KotoBase bằng Chrome trên máy tính hoặc Android
                          qua HTTPS. Bạn vẫn có thể dùng Quiz gõ phím trên trình
                          duyệt này.
                        </p>
                      ) : (
                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className={primary}
                            onClick={
                              listening
                                ? () => speech.pause()
                                : () => startListening()
                            }
                          >
                            {listening ? (
                              <Pause size={16} />
                            ) : (
                              <Mic size={16} />
                            )}
                            {listening
                              ? "Tạm dừng micro"
                              : speech.status === "error"
                                ? "Thử kết nối lại"
                                : "Bật micro / Tiếp tục"}
                          </button>
                          {!!speech.transcript && (
                            <button
                              type="button"
                              className={secondary}
                              onClick={() => startListening()}
                            >
                              <RotateCcw size={15} />
                              Thử lượt mới
                            </button>
                          )}
                        </div>
                      )}
                      <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-700">
                        {isShortSpokenVocabulary(item) && (
                          <p className="mb-3 text-xs text-emerald-700 dark:text-emerald-300">
                            Từ ngắn: chờ mic sẵn sàng rồi nói trọn âm. Có thể
                            nói thêm “です” sau từ để máy nhận rõ hơn; không cần
                            đọc cả câu.
                          </p>
                        )}
                        <div className="flex justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                          <span>
                            Máy đang nhận được
                            <span className="mt-1 block text-[10px] font-normal">
                              Ngôn ngữ yêu cầu: Nhật · ja-JP
                            </span>
                          </span>
                          <span>
                            {speech.languageMismatch
                              ? "Kết quả ngoài chữ Nhật"
                              : speech.interim
                                ? "Kết quả tạm thời"
                                : speech.attempts
                                  ? `Lượt ${speech.attempts}`
                                  : "Chưa có kết quả"}
                          </span>
                        </div>
                        <p
                          lang={speech.languageMismatch ? "und" : "ja"}
                          translate="no"
                          aria-live="polite"
                          aria-atomic="true"
                          className={`notranslate mt-2 min-h-10 break-words text-2xl font-semibold ${speech.transcript ? "text-slate-800 dark:text-slate-100" : "text-slate-400 dark:text-slate-500"}`}
                        >
                          {speech.transcript || "…"}
                        </p>
                        {speech.languageMismatch && (
                          <p
                            role="status"
                            className="mt-2 text-xs text-amber-700 dark:text-amber-300"
                          >
                            Dịch vụ trả kết quả ngoài chữ Nhật; lượt này không
                            tính là bạn đọc sai. Hãy thử lại khi mic sẵn sàng.
                          </p>
                        )}
                        {speech.transcript &&
                          !speech.interim &&
                          !speech.languageMismatch && (
                            <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                              Chưa khớp toàn bộ từ. Cứ nói lại, bạn không cần
                              bấm kết thúc.
                            </p>
                          )}
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          className={secondary}
                          aria-pressed={showReading}
                          onClick={() => setShowReading((v) => !v)}
                        >
                          {showReading ? (
                            <EyeOff size={15} />
                          ) : (
                            <Eye size={15} />
                          )}
                          {showReading ? "Ẩn cách đọc" : "Gợi ý / Đối chiếu"}
                        </button>
                        <button
                          type="button"
                          className={secondary}
                          onClick={() => sample()}
                        >
                          <Volume2 size={16} />
                          Nghe mẫu <kbd className="text-xs opacity-60">`</kbd>
                        </button>
                      </div>
                      <button
                        type="button"
                        className={`${button} text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800`}
                        onClick={skip}
                      >
                        Bỏ qua (Tab) <SkipForward size={16} />
                      </button>
                    </div>
                    {sampleMessage && (
                      <p
                        role="status"
                        className="mt-3 text-sm text-slate-500 dark:text-slate-400"
                      >
                        {sampleMessage}
                      </p>
                    )}
                    {showReading && (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/40">
                        <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
                          Đối chiếu kết quả máy nhận với cả từ vựng và cách đọc
                        </p>
                        <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                          Xanh: ký tự trùng · gạch chân: chưa trùng. Chỉ cần
                          khớp toàn bộ một đáp án là đúng.
                        </p>
                        <div className="mt-3 grid gap-3 sm:grid-cols-2">
                          {comparisons.map((row) => (
                            <div
                              key={row.label}
                              className="rounded-lg border border-amber-200 bg-white/70 p-3 dark:border-amber-900 dark:bg-slate-900/70"
                            >
                              <p className="text-xs font-bold">
                                {row.label}
                                {row.phoneticMatch ? " · Cùng cách đọc, khác Kanji" : row.exact ? " · Khớp toàn bộ" : ""}
                              </p>
                              <p
                                lang="ja"
                                translate="no"
                                className="mt-2 break-words text-xl font-bold"
                              >
                                {row.expected}
                              </p>
                              <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
                                Máy nhận (chuẩn hóa)
                              </p>
                              <p
                                lang="ja"
                                translate="no"
                                className="notranslate mt-1 break-all text-xl"
                              >
                                {row.characters.length
                                  ? row.characters.map((part, i) => (
                                      <span
                                        key={i}
                                        className={
                                          part.matched
                                            ? "text-emerald-700 dark:text-emerald-300"
                                            : "underline decoration-amber-500 decoration-2 underline-offset-4"
                                        }
                                      >
                                        {part.text}
                                      </span>
                                    ))
                                  : "…"}
                              </p>
                            </div>
                          ))}
                        </div>
                        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                          So văn bản giúp bạn thử lại; đây không phải điểm chấm
                          âm hay trọng âm.
                        </p>
                      </div>
                    )}
                    {!!speech.history.length && (
                      <details className="mt-4 rounded-xl border border-slate-200 bg-white/70 p-3 text-sm dark:border-slate-700 dark:bg-slate-900/70">
                        <summary className="cursor-pointer text-xs font-bold text-slate-500 dark:text-slate-400">
                          Các lượt vừa thử ({speech.attempts})
                        </summary>
                        <ol className="mt-3 space-y-2">
                          {speech.history.map((attempt, i) => (
                            <li
                              key={i}
                              className="border-t border-slate-100 pt-2 dark:border-slate-800"
                            >
                              <p
                                lang="ja"
                                translate="no"
                                className="notranslate break-all"
                              >
                                {attempt.text}
                              </p>
                              {attempt.alternatives.length > 1 && (
                                <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-400">
                                  Máy còn đề xuất:{" "}
                                  {attempt.alternatives.slice(1).join(" / ")}
                                </p>
                              )}
                            </li>
                          ))}
                        </ol>
                      </details>
                    )}
                  </>
                )}
              </div>
            </section>
          </>
        )}
        <details className="rounded-xl px-2 py-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
          <summary className="flex cursor-pointer list-none items-center gap-1.5">
            <Info size={14} />
            Cách hoạt động & quyền riêng tư
            <ChevronDown size={12} />
          </summary>
          <p className="mt-2 max-w-2xl">
            Bật micro một lần cho phiên luyện. Nhận đúng toàn bộ từ hoặc cách
            đọc là tự chuyển sang đáp án; sai có thể nói lại nhiều lần. Micro
            dừng khi rời Quiz hoặc ẩn trang. KotoBase không lưu bản ghi âm;
            trình duyệt có thể gửi âm thanh đến dịch vụ nhận dạng của hãng và
            cần mạng. Không cần API key. Nhận dạng từ không đánh giá độ chuẩn
            phát âm hay trọng âm. Giữ Space để nói, thả để nhận nốt kết quả. Tab
            bỏ qua và phát cách đọc; Shift+Tab di chuyển bàn phím. Esc tạm dừng;
            Enter chuyển câu khi đang xem đáp án. Đổi hướng đề hoặc phạm vi sẽ
            bắt đầu phiên mới.
          </p>
        </details>
      </div>
    </div>
  );
}
