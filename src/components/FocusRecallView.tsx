"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Eye, RotateCcw, Shuffle, Volume2 } from "lucide-react";
import { StudyScopeSelector, VocabularyData } from "./StudyScopeSelector";
import { playAudio } from "@/lib/tts-utils";
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
  const [revealed, setRevealed] = useState<string[]>([]);
  const [undo, setUndo] = useState<{
    session: RecallSession;
    revealed: string[];
  } | null>(null);
  const [settings, setSettings] = useState<RecallSettings>(
    defaultRecallSettings,
  );
  const [storageFailed, setStorageFailed] = useState(false);
  const [notice, setNotice] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const boardRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!isActive || session) return;
    let restored: RecallSession | null = null;
    try {
      restored = restoreRecallSession(
        sessionStorage.getItem(storageKey),
        words.map((v) => v.id),
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

  if (!words.length)
    return (
      <p className="p-10 text-center text-slate-500">
        Không có từ vựng trong phạm vi đã chọn.
      </p>
    );
  if (!session)
    return (
      <p className="p-10 text-center text-slate-500">
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
  const roundDone = session.rated.length === session.batch.length;
  const reverse =
    session.settings.direction === "reverse" ||
    (session.settings.direction === "alternate" && session.round % 2 === 0);
  const byId = new Map(words.map((w) => [w.id, w]));
  const rate = (id: string, remembered: boolean) => {
    if (!revealed.includes(id) || session.rated.includes(id)) return;
    setUndo({ session, revealed });
    const next = rateRecall(session, id, remembered);
    setSession(next);
    const entry = next.entries.find((e) => e.id === id)!;
    setNotice(
      entry.streak >= session.settings.target
        ? "Từ đã đạt mục tiêu trong phiên."
        : remembered
          ? `Đã ghi nhận. Lặp lại sau ${session.settings.gap} lượt.`
          : "Đã đưa vào nhóm cần ôn lại ở lượt kế tiếp.",
    );
  };
  const restart = () => {
    if (
      session.entries.some((e) => e.attempts) &&
      !window.confirm("Bắt đầu phiên mới và xóa tiến độ phiên hiện tại?")
    )
      return;
    setSession(
      createRecallSession(
        words.map((w) => w.id),
        settings,
      ),
    );
    setRevealed([]);
    setUndo(null);
    setNotice("Đã bắt đầu phiên mới.");
    setShowSettings(false);
  };
  return (
    <section
      ref={boardRef}
      tabIndex={-1}
      aria-label="Ôn tập theo lượt"
      className="space-y-4 text-slate-700 dark:text-slate-200"
    >
      <div className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-white/95 dark:bg-slate-900 p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap justify-between gap-3">
          <div>
            <h2 className="font-bold text-lg">Nhớ trước, mở sau</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Tự đoán {reverse ? "từ tiếng Nhật" : "nghĩa của từ"}, mở đáp án
              rồi tự đánh giá. Nhớ {session.settings.target} lần liên tiếp để
              đạt trong phiên.
            </p>
          </div>
          <button
            className={control}
            aria-expanded={showSettings}
            onClick={() => setShowSettings(!showSettings)}
          >
            Thiết lập
          </button>
        </div>
        <div
          className="flex flex-wrap gap-x-5 gap-y-2 text-sm"
          aria-live="polite"
        >
          <span className="font-bold text-indigo-600 dark:text-indigo-300">
            Lượt {session.round} · {reverse ? "Việt → Nhật" : "Nhật → Việt"}
          </span>
          <span>
            Đã đạt{" "}
            <strong>
              {mastered.length}/{words.length}
            </strong>
          </span>
          <span>
            Cần ôn lại <strong>{waiting.length}</strong>
          </span>
          <span>
            Chưa học{" "}
            <strong>{session.entries.filter((e) => !e.attempts).length}</strong>
          </span>
        </div>
        <progress
          aria-label="Số từ đạt mục tiêu trong phiên"
          value={mastered.length}
          max={words.length}
          className="w-full h-2 accent-indigo-600"
        />
        {showSettings && (
          <div className="border-t border-slate-200 dark:border-slate-700 pt-4 space-y-3">
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
              Từ chưa nhớ quay lại từ lượt kế tiếp, chuỗi nhớ về 0. Nếu hết từ
              khác, chuyển thẳng đến lượt có từ cần ôn. Thiết lập áp dụng khi
              bắt đầu phiên mới.
            </p>
            <button className={control} onClick={restart}>
              Áp dụng & bắt đầu phiên mới
            </button>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">
          {done
            ? "Hoàn thành phiên ôn tập"
            : `Bảng hiện tại · ${session.rated.length}/${session.batch.length} từ đã đánh giá`}
        </p>
        <button
          className={`${control} inline-flex gap-2 items-center`}
          disabled={!undo}
          onClick={() => {
            if (undo) {
              setSession(undo.session);
              setRevealed(undo.revealed);
              setUndo(null);
              setNotice("Đã hoàn tác đánh giá gần nhất.");
            }
          }}
        >
          <RotateCcw className="w-4 h-4" />
          Hoàn tác
        </button>
      </div>
      {done ? (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 p-8 text-center space-y-3">
          <Check className="w-8 h-8 mx-auto text-emerald-600" />
          <h3 className="font-bold text-xl">Đã nhớ lại đủ {words.length} từ</h3>
          <p className="text-sm">
            Mỗi từ đã đạt {session.settings.target} lần nhớ liên tiếp trong
            phiên. Hãy ôn lại vào ngày khác để kiểm tra trí nhớ lâu dài.
          </p>
          <button className={control} onClick={restart}>
            Ôn lại phiên mới
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {session.batch.map((id, index) => {
            const word = byId.get(id)!;
            const entry = session.entries.find((e) => e.id === id)!;
            const rated = session.rated.includes(id);
            const open = revealed.includes(id);
            return (
              <article
                key={id}
                aria-label={`Ô ôn tập ${index + 1}`}
                className="h-80 min-w-0 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5 flex flex-col gap-3"
              >
                <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>
                    Ô {index + 1} ·{" "}
                    {entry.attempts ? `Đã gặp ${entry.attempts} lần` : "Từ mới"}
                  </span>
                  <span>
                    Nhớ {entry.streak}/{session.settings.target}
                  </span>
                </div>
                {rated ? (
                  <div
                    className="flex-1 flex flex-col items-center justify-center text-center gap-3"
                    role="status"
                  >
                    <Check className="w-6 h-6 text-indigo-500" />
                    <p className="font-semibold">
                      {entry.streak >= session.settings.target
                        ? "Đã đạt trong phiên"
                        : entry.streak
                          ? "Đã nhớ · sẽ kiểm tra lại"
                          : "Chưa nhớ · đã xếp ôn lại"}
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      {entry.streak >= session.settings.target
                        ? "Từ này được cất khỏi các lượt tiếp theo."
                        : `Có thể xuất hiện lại từ lượt ${entry.due}.`}
                    </p>
                  </div>
                ) : (
                  <>
                    <button
                      className="text-left min-h-16 max-h-24 overflow-auto break-words text-xl sm:text-2xl font-bold text-slate-900 dark:text-white rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-indigo-500"
                      onClick={() =>
                        setRevealed((prev) =>
                          prev.includes(id) ? prev : [...prev, id],
                        )
                      }
                      aria-expanded={open}
                    >
                      {reverse ? word.meaning : word.word}
                    </button>
                    <div className="flex-1 min-h-0 overflow-auto break-words">
                      {open ? (
                        <div className="space-y-2">
                          <p className="font-bold text-emerald-700 dark:text-emerald-400">
                            {reverse ? word.word : word.meaning}
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-300">
                            {[word.reading, word.sinoVietnamese]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          {word.example && (
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {word.example}
                            </p>
                          )}
                          <button
                            className="inline-flex items-center gap-2 text-sm min-h-9 text-indigo-600 dark:text-indigo-300"
                            onClick={() => playAudio(word.reading || word.word)}
                          >
                            <Volume2 className="w-4 h-4" />
                            Nghe phát âm
                          </button>
                        </div>
                      ) : (
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                          Dừng một nhịp để tự nhớ trước khi mở đáp án.
                        </p>
                      )}
                    </div>
                    {open ? (
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className={`${control} text-amber-700 dark:text-amber-300`}
                          onClick={() => rate(id, false)}
                        >
                          Chưa nhớ
                        </button>
                        <button
                          className={`${control} text-emerald-700 dark:text-emerald-300`}
                          onClick={() => rate(id, true)}
                        >
                          Nhớ
                        </button>
                      </div>
                    ) : (
                      <button
                        className={`${control} flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-300`}
                        onClick={() => setRevealed((prev) => [...prev, id])}
                      >
                        <Eye className="w-4 h-4" />
                        Mở đáp án
                      </button>
                    )}
                  </>
                )}
              </article>
            );
          })}
        </div>
      )}
      {!done && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Các ô giữ nguyên vị trí. Chỉ trộn từ khi bạn chuyển lượt.
          </p>
          <button
            disabled={!roundDone}
            className={`${control} inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-300`}
            onClick={() => {
              setSession(nextRecallRound(session));
              requestAnimationFrame(() => {
                boardRef.current?.focus({ preventScroll: true });
                boardRef.current?.scrollIntoView({ block: "start" });
              });
              setRevealed([]);
              setUndo(null);
              setNotice("Đã chuyển lượt và trộn các từ đến lượt ôn.");
            }}
          >
            <Shuffle className="w-4 h-4" />
            Trộn & sang lượt tiếp
          </button>
        </div>
      )}
      <p
        role="status"
        className="text-sm min-h-5 text-indigo-600 dark:text-indigo-300"
      >
        {notice}
      </p>
      <details className="rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white dark:bg-slate-900">
        <summary className="cursor-pointer text-sm font-semibold">
          Theo dõi từ trong phiên · {waiting.length} cần ôn lại ·{" "}
          {mastered.length} đã đạt
        </summary>
        <div className="mt-3 max-h-64 overflow-auto space-y-2">
          {session.entries
            .filter((e) => e.attempts)
            .map((e) => (
              <div
                key={e.id}
                className="flex flex-wrap justify-between gap-2 text-sm border-b border-slate-100 dark:border-slate-800 py-2"
              >
                <span className="break-words min-w-0">
                  {byId.get(e.id)?.word}
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {e.streak >= session.settings.target
                    ? "Đã đạt"
                    : `Lặp từ lượt ${e.due}`}{" "}
                  · Nhớ {e.streak}/{session.settings.target} · Quên {e.misses}
                </span>
              </div>
            ))}
          {!session.entries.some((e) => e.attempts) && (
            <p className="text-sm text-slate-500">Chưa có đánh giá.</p>
          )}
        </div>
      </details>
      <p className="text-xs text-slate-500 dark:text-slate-400">
        {storageFailed
          ? "Trình duyệt không cho lưu phiên. Tiến độ hiện chỉ được giữ khi trang còn mở."
          : "Tiến độ lưu trong tab này. Sau khi tải lại, chọn lại cùng phạm vi để tiếp tục. Đây là luyện nhớ trong phiên, chưa phải lịch ôn dài hạn."}
      </p>
    </section>
  );
}
