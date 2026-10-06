"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, RotateCcw, Shuffle, Volume2 } from "lucide-react";
import { StudyScopeSelector, VocabularyData } from "./StudyScopeSelector";
import { playAudio } from "@/lib/tts-utils";
import { MeaningText } from "./MeaningText";
import {
  createRecallSession,
  defaultRecallSettings,
  nextRecallRound,
  rateRecall,
  restoreRecallSession,
  RecallSession,
  RecallSettings,
} from "@/lib/recall-session";

interface FocusRecallViewProps {
  vocabularies: VocabularyData[];
  selectedVocabIds?: string[];
  onRefresh?: () => void;
  isActive?: boolean;
  folderKey?: string;
  searchQuery?: string;
  sortOrder?: string;
  userKey?: string;
}
const control =
  "min-h-10 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm font-semibold disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500";

export function FocusRecallView({
  vocabularies,
  selectedVocabIds = [],
  isActive = true,
  folderKey,
  userKey = "guest",
}: FocusRecallViewProps) {
  const [scopeIds, setScopeIds] = useState<string[]>(() =>
    selectedVocabIds.length ? selectedVocabIds : vocabularies.map((v) => v.id),
  );
  const onScopeChange = useCallback(
    (words: VocabularyData[]) => setScopeIds(words.map((v) => v.id)),
    [],
  );
  const words = useMemo(() => {
    const selected = new Set(scopeIds);
    return vocabularies.filter((v) => selected.has(v.id));
  }, [vocabularies, scopeIds]);
  // Remount only when membership changes: edits/sorting must not reset the learning session.
  const identity = JSON.stringify([
    userKey,
    folderKey,
    words.map((v) => v.id).sort(),
  ]);
  return (
    <div className="space-y-4">
      <StudyScopeSelector
        allVocabularies={vocabularies}
        selectedVocabIds={selectedVocabIds}
        onScopeChange={onScopeChange}
        activeCount={words.length}
        modeTheme="indigo"
      />
      <RecallBoard
        key={identity}
        words={words}
        storageKey={`kotobase:recall:v1:${identity}`}
        isActive={isActive}
      />
    </div>
  );
}

function RecallBoard({
  words,
  storageKey,
  isActive,
}: {
  words: VocabularyData[];
  storageKey: string;
  isActive: boolean;
}) {
  const [session, setSession] = useState<RecallSession | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [undo, setUndo] = useState<{
    session: RecallSession;
    activeId: string | null;
  } | null>(null);
  const [settings, setSettings] = useState<RecallSettings>(
    defaultRecallSettings,
  );
  const [keyboard, setKeyboard] = useState(true);
  const [storageFailed, setStorageFailed] = useState(false);
  const [notice, setNotice] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const boardRef = useRef<HTMLElement>(null);
  const promptRefs = useRef(new Map<string, HTMLButtonElement>());
  // Block a second rating before React commits the first keyboard/mouse event.
  const ratingLock = useRef(false);
  useEffect(() => {
    ratingLock.current = false;
  }, [session]);
  useEffect(() => {
    if (!isActive || session) return;
    let restored: RecallSession | null = null;
    try {
      restored = restoreRecallSession(
        sessionStorage.getItem(storageKey),
        words.map((v) => v.id),
      );
      setKeyboard(
        sessionStorage.getItem("kotobase:recall:keyboard") !== "false",
      );
    } catch {
      setStorageFailed(true);
    }
    const initial = restored || createRecallSession(words.map((v) => v.id));
    setSession(initial);
    setSettings(initial.settings);
  }, [isActive, session, storageKey, words]);
  useEffect(() => {
    if (!session) return;
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(session));
    } catch {
      setStorageFailed(true);
    }
  }, [session, storageKey]);

  const focusPrompt = (id: string | null) =>
    requestAnimationFrame(() => {
      const target = id ? promptRefs.current.get(id) : boardRef.current;
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({ block: "nearest" });
    });
  const reveal = (id: string) => {
    setSelectedId(id);
    setActiveId(id);
    focusPrompt(id);
  };
  const rate = (id: string, remembered: boolean) => {
    if (
      !session ||
      activeId !== id ||
      session.rated.includes(id) ||
      ratingLock.current
    )
      return;
    ratingLock.current = true;
    setUndo({ session, activeId });
    const next = rateRecall(session, id, remembered);
    setSession(next);
    const nextId =
      next.batch.find((candidate) => !next.rated.includes(candidate)) || null;
    // Focus the next prompt while keeping its answer concealed for retrieval.
    setActiveId(null);
    setSelectedId(nextId);
    focusPrompt(keyboard ? nextId : null);
    const entry = next.entries.find((e) => e.id === id)!;
    setNotice(
      entry.streak >= session.settings.target
        ? "Đã đạt trong phiên."
        : remembered
          ? `Đã nhớ · lặp sau ${session.settings.gap} lượt.`
          : "Chưa nhớ · ôn lại từ lượt kế tiếp.",
    );
  };
  const advance = () => {
    if (
      !session ||
      session.batch.some((id) => !session.rated.includes(id)) ||
      session.entries.every((e) => e.streak >= session.settings.target)
    )
      return;
    const next = nextRecallRound(session);
    setSession(next);
    setSelectedId(next.batch[0] || null);
    setActiveId(null);
    setUndo(null);
    setNotice("Đã chuyển lượt. Nhấn Enter để mở từ đầu tiên, ↑ ↓ để chọn từ.");
    focusPrompt(keyboard ? next.batch[0] || null : null);
  };
  // Entering the mode or a new round starts at a concealed prompt, without a mouse.
  useEffect(() => {
    if (!isActive || !keyboard || !session) return;
    const first =
      session.batch.find((id) => !session.rated.includes(id)) || null;
    setSelectedId(first);
    setActiveId(null);
    focusPrompt(first);
    // Ratings keep their own next-word focus; only mode/round changes initialize it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, keyboard, session?.round]);
  useEffect(() => {
    if (!isActive || !keyboard || !session || showSettings) return;
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.defaultPrevented ||
        event.repeat ||
        event.isComposing ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.shiftKey
      )
        return;
      if (
        !(target instanceof HTMLElement) ||
        !boardRef.current?.contains(target)
      )
        return;
      if (
        target.closest(
          'input, textarea, select, [contenteditable="true"], [role="dialog"]',
        )
      )
        return;
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        const remaining = session.batch.filter(
          (id) => !session.rated.includes(id),
        );
        if (!remaining.length) return;
        event.preventDefault();
        const index = remaining.indexOf(selectedId || "");
        const nextIndex =
          index < 0
            ? 0
            : (index +
                (event.key === "ArrowDown" ? 1 : -1) +
                remaining.length) %
              remaining.length;
        const nextId = remaining[nextIndex];
        setActiveId(null);
        setSelectedId(nextId);
        focusPrompt(nextId);
      } else if (
        (event.key === "ArrowLeft" || event.key === "ArrowRight") &&
        activeId &&
        !session.rated.includes(activeId)
      ) {
        event.preventDefault();
        rate(activeId, event.key === "ArrowRight");
      } else if (
        event.key === "Enter" &&
        (target === boardRef.current ||
          target.closest('button[aria-keyshortcuts="Enter"]')) &&
        session.batch.length > 0 &&
        session.batch.every((id) => session.rated.includes(id)) &&
        session.entries.some((e) => e.streak < session.settings.target)
      ) {
        event.preventDefault();
        advance();
      } else if (
        event.key === "Enter" &&
        selectedId &&
        (target === boardRef.current ||
          target.closest("[data-recall-prompt]")) &&
        !session.rated.includes(selectedId)
      ) {
        event.preventDefault();
        reveal(selectedId);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  });

  if (!words.length)
    return (
      <p className="p-8 text-center text-slate-500">
        Không có từ vựng trong phạm vi đã chọn.
      </p>
    );
  if (!session)
    return (
      <p className="p-8 text-center text-slate-500">
        Đang chuẩn bị phiên ôn tập…
      </p>
    );
  const mastered = session.entries.filter(
    (e) => e.streak >= session.settings.target,
  );
  const waiting = session.entries.filter(
    (e) => e.attempts > 0 && e.streak < session.settings.target,
  );
  const done = mastered.length === words.length;
  const roundDone = session.batch.every((id) => session.rated.includes(id));
  const reverse =
    session.settings.direction === "reverse" ||
    (session.settings.direction === "alternate" && session.round % 2 === 0);
  const byId = new Map(words.map((w) => [w.id, w]));
  const restart = () => {
    if (
      session.entries.some((e) => e.attempts) &&
      !window.confirm("Bắt đầu phiên mới và xóa tiến độ phiên hiện tại?")
    )
      return;
    const next = createRecallSession(
      words.map((w) => w.id),
      settings,
    );
    setSession(next);
    setActiveId(null);
    setSelectedId(next.batch[0] || null);
    focusPrompt(keyboard ? next.batch[0] || null : null);
    setUndo(null);
    setNotice("Đã bắt đầu phiên mới.");
    setShowSettings(false);
  };
  return (
    <section
      ref={boardRef}
      tabIndex={-1}
      aria-label="Ôn tập theo lượt"
      className="space-y-3 text-slate-700 dark:text-slate-200 focus:outline-none"
    >
      <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900 px-4 py-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div
            className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
            aria-live="polite"
          >
            <h2 className="font-bold text-indigo-600 dark:text-indigo-300">
              Lượt {session.round} · {reverse ? "Việt → Nhật" : "Nhật → Việt"}
            </h2>
            <span>
              Đã đạt{" "}
              <strong>
                {mastered.length}/{words.length}
              </strong>
            </span>
            <span className="text-slate-500 dark:text-slate-400">
              Ôn lại {waiting.length} · Còn{" "}
              {session.batch.length - session.rated.length} từ trong lượt
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className={`${control} inline-flex items-center gap-1.5`}
              disabled={!undo}
              onClick={() => {
                if (!undo) return;
                setSession(undo.session);
                setActiveId(undo.activeId);
                setSelectedId(undo.activeId);
                focusPrompt(undo.activeId);
                setUndo(null);
                setNotice("Đã hoàn tác.");
              }}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Hoàn tác
            </button>
            <button
              className={control}
              aria-expanded={showSettings}
              onClick={() => setShowSettings(!showSettings)}
            >
              Thiết lập
            </button>
          </div>
        </div>
        <div
          role="progressbar"
          aria-label="Số từ đạt mục tiêu trong phiên"
          aria-valuenow={mastered.length}
          aria-valuemin={0}
          aria-valuemax={words.length}
          className="h-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
        >
          <div
            className="h-full rounded-full bg-indigo-500"
            style={{ width: `${(mastered.length / words.length) * 100}%` }}
          />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
          <span>
            Bấm từ hoặc Enter để mở đáp án · Nhớ {session.settings.target} lần
            liên tiếp để đạt
          </span>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={keyboard}
              onChange={(e) => {
                setKeyboard(e.target.checked);
                try {
                  sessionStorage.setItem(
                    "kotobase:recall:keyboard",
                    String(e.target.checked),
                  );
                } catch {
                  setStorageFailed(true);
                }
              }}
              className="accent-indigo-600"
            />
            Bàn phím: ↑ ↓ chọn từ · Enter mở / sang lượt · ← chưa nhớ · → nhớ
          </label>
        </div>
        {showSettings && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-3">
            <div className="grid sm:grid-cols-3 gap-3">
              <label className="text-sm space-y-1">
                <span className="block">Số lần nhớ liên tiếp</span>
                <select
                  className={`${control} w-full`}
                  value={settings.target}
                  onChange={(e) =>
                    setSettings({ ...settings, target: Number(e.target.value) })
                  }
                >
                  {[2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n} lần
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm space-y-1">
                <span className="block">Từ đã nhớ xuất hiện lại sau</span>
                <select
                  className={`${control} w-full`}
                  value={settings.gap}
                  onChange={(e) =>
                    setSettings({ ...settings, gap: Number(e.target.value) })
                  }
                >
                  {[1, 2, 3].map((n) => (
                    <option key={n} value={n}>
                      {n} lượt
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm space-y-1">
                <span className="block">Chiều gợi nhớ</span>
                <select
                  className={`${control} w-full`}
                  value={settings.direction}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      direction: e.target.value as RecallSettings["direction"],
                    })
                  }
                >
                  <option value="forward">Nhật → Việt</option>
                  <option value="reverse">Việt → Nhật</option>
                  <option value="alternate">Đảo chiều mỗi lượt</option>
                </select>
              </label>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Chưa nhớ: chuỗi về 0, ôn lại từ lượt kế tiếp. Thiết lập lặp áp
              dụng cho phiên mới. Bật bàn phím: sau đánh giá, chọn từ tiếp theo;
              nhấn Enter để mở đáp án.
            </p>
            <button className={control} onClick={restart}>
              Áp dụng & bắt đầu phiên mới
            </button>
          </div>
        )}
      </div>
      {done ? (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-6 text-center space-y-3">
          <Check className="w-7 h-7 mx-auto text-emerald-600" />
          <h3 className="font-bold text-xl">Đã nhớ lại đủ {words.length} từ</h3>
          <p className="text-sm">
            Mỗi từ đạt {session.settings.target} lần nhớ liên tiếp. Hãy ôn lại
            vào ngày khác để kiểm tra trí nhớ lâu dài.
          </p>
          <button className={control} onClick={restart}>
            Ôn lại phiên mới
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 items-start gap-3">
            {session.batch
              .filter((id) => !session.rated.includes(id))
              .map((id) => {
                const word = byId.get(id)!;
                const entry = session.entries.find((e) => e.id === id)!;
                const open = activeId === id;
                const selected = keyboard && selectedId === id;
                return (
                  <article
                    key={id}
                    aria-label={`Ôn tập ${word.word}`}
                    className={`min-w-0 self-start rounded-2xl border ${open ? "md:col-span-2" : ""} ${selected ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20" : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"}`}
                  >
                    <div className="flex items-start gap-3 px-4 py-3">
                      <button
                        ref={(element) => {
                          if (element) promptRefs.current.set(id, element);
                          else promptRefs.current.delete(id);
                        }}
                        data-recall-prompt={id}
                        onFocus={() => {
                          setSelectedId(id);
                          if (activeId !== id) setActiveId(null);
                        }}
                        className="flex-1 min-w-0 text-left break-words rounded-lg outline-none focus:outline-none select-none cursor-pointer caret-transparent"
                        aria-expanded={open}
                        aria-controls={`recall-answer-${id}`}
                        onClick={() => reveal(id)}
                      >
                        <span className="block text-xl sm:text-2xl leading-relaxed font-bold text-slate-900 dark:text-white">
                          {reverse ? <MeaningText text={word.meaning} hideTip={true} /> : word.word}
                        </span>
                        {!open && (
                          <span className="text-xs text-slate-400 dark:text-slate-500">
                            {selected
                              ? "Đang chọn · Enter để mở"
                              : "Bấm để mở đáp án"}
                          </span>
                        )}
                      </button>
                      <span className="shrink-0 pt-1 text-xs text-slate-400 dark:text-slate-500">
                        {entry.streak}/{session.settings.target}
                      </span>
                    </div>
                    {open && (
                      <div
                        id={`recall-answer-${id}`}
                        className="border-t border-slate-100 dark:border-slate-800 px-4 py-3 space-y-3 break-words"
                      >
                        <div className="flex items-start gap-2">
                          <div className="flex-1 min-w-0 font-semibold text-emerald-700 dark:text-emerald-400">
                            {reverse ? word.word : <MeaningText text={word.meaning} size="md" />}
                          </div>

                          <button
                            aria-label={`Nghe phát âm ${word.word}`}
                            title="Nghe phát âm"
                            className="shrink-0 rounded-lg p-2 text-indigo-600 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                            onClick={() => playAudio(word.reading || word.word)}
                          >
                            <Volume2 className="w-4 h-4" />
                          </button>
                        </div>
                        {(word.reading || word.sinoVietnamese) && (
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {[word.reading, word.sinoVietnamese]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        )}
                        {word.example && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-500 dark:text-slate-400">
                            {word.example}
                          </p>
                        )}
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            className={`${control} text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/20`}
                            aria-keyshortcuts={
                              keyboard ? "ArrowLeft" : undefined
                            }
                            onClick={() => rate(id, false)}
                          >
                            {keyboard && <span aria-hidden="true">← </span>}Chưa
                            nhớ
                          </button>
                          <button
                            className={`${control} text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/20`}
                            aria-keyshortcuts={
                              keyboard ? "ArrowRight" : undefined
                            }
                            onClick={() => rate(id, true)}
                          >
                            {keyboard && <span aria-hidden="true">→ </span>}Nhớ
                          </button>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
          </div>
          {roundDone && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-indigo-50 dark:bg-indigo-950/30 p-4">
              <p className="text-sm font-semibold">
                Đã đánh giá hết {session.batch.length} từ trong lượt.
              </p>
              <button
                className={`${control} inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-300`}
                aria-keyshortcuts={keyboard ? "Enter" : undefined}
                onClick={advance}
              >
                <Shuffle className="w-4 h-4" />
                Sang lượt tiếp{" "}
                {keyboard && <kbd className="text-xs opacity-70">Enter</kbd>}
              </button>
            </div>
          )}
        </>
      )}
      <p role="status" aria-live="polite" className="sr-only">
        {notice}
      </p>
      <details className="text-xs text-slate-500 dark:text-slate-400">
        <summary className="cursor-pointer py-2">
          Tiến độ phiên · {waiting.length} cần ôn lại · {mastered.length} đã đạt
        </summary>
        <div className="mt-1 space-y-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-3">
          {session.entries
            .filter((e) => e.attempts)
            .map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap justify-between gap-2 border-b border-slate-100 dark:border-slate-800 py-1"
              >
                <span className="break-words min-w-0">
                  {byId.get(e.id)?.word}
                </span>
                <span>
                  {e.streak >= session.settings.target
                    ? "Đã đạt"
                    : `Lặp từ lượt ${e.due}`}{" "}
                  · Nhớ {e.streak}/{session.settings.target} · Quên {e.misses}
                </span>
              </div>
            ))}
          {!session.entries.some((e) => e.attempts) && <p>Chưa có đánh giá.</p>}
          <p>
            {storageFailed
              ? "Không thể lưu phiên trong trình duyệt này."
              : "Phiên lưu trong tab này. Tải lại rồi chọn cùng phạm vi để tiếp tục."}
          </p>
        </div>
      </details>
    </section>
  );
}
