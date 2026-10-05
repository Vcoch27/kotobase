'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { KanjiModal } from './KanjiModal';
import { getBulkKanjiNotes } from '@/app/actions/kanji';
import { extractKanji } from '@/lib/kanji-parser';
import { Sparkles, ChevronDown, ChevronUp, BookOpen, PlusCircle } from 'lucide-react';
import { HighlightMnemonic } from './HighlightMnemonic';

interface KanjiNote {
  character: string;
  hanviet?: string;
  meaning?: string;
  mnemonic?: string;
}

interface VocabularyData {
  id: string;
  word: string;
}

interface KanjiSubsectionProps {
  vocabularies: VocabularyData[];
  /** Key thay đổi khi người dùng chuyển folder → reset state */
  folderKey?: string;
}

const LS_KEY = 'kotobase_cached_kanji_notes';

/** Đọc cache localStorage an toàn */
function readLocalCache(): Record<string, KanjiNote> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

/** Ghi một note vào localStorage */
function writeLocalCache(note: KanjiNote) {
  try {
    const cache = readLocalCache();
    cache[note.character] = { ...cache[note.character], ...note };
    localStorage.setItem(LS_KEY, JSON.stringify(cache));
  } catch {}
}

export function KanjiSubsection({ vocabularies, folderKey }: KanjiSubsectionProps) {
  // ── Trích xuất unique kanji từ danh sách từ vựng ──────────────────────────
  const uniqueKanji = useMemo(() => {
    const set = new Set<string>();
    vocabularies.forEach((v) => {
      extractKanji(v.word).forEach((k) => set.add(k));
    });
    return Array.from(set).sort();
  }, [vocabularies]);

  // ── State ─────────────────────────────────────────────────────────────────
  const [notesMap, setNotesMap] = useState<Record<string, KanjiNote>>({});
  const [loading, setLoading] = useState(false);
  const [showWithNotes, setShowWithNotes] = useState(true);
  const [showWithoutNotes, setShowWithoutNotes] = useState(true);
  const [modalChar, setModalChar] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // ── Fetch bulk notes (tối ưu: 1 server action, cache localStorage) ────────
  useEffect(() => {
    if (uniqueKanji.length === 0) {
      setNotesMap({});
      return;
    }

    // 1. Nạp ngay từ localStorage (không có loading flicker)
    const localCache = readLocalCache();
    const initialMap: Record<string, KanjiNote> = {};
    uniqueKanji.forEach((k) => {
      if (localCache[k]) initialMap[k] = localCache[k];
    });
    if (Object.keys(initialMap).length > 0) setNotesMap(initialMap);

    // 2. Fetch mới nhất từ server (1 batch request)
    let cancelled = false;
    setLoading(true);
    getBulkKanjiNotes(uniqueKanji)
      .then((notes) => {
        if (cancelled) return;
        const map: Record<string, KanjiNote> = {};
        notes.forEach((n) => {
          map[n.id] = {
            character: n.id,
            hanviet: n.hanviet,
            meaning: n.meaning,
            mnemonic: n.mnemonic,
          };
        });
        setNotesMap(map);
        // Đồng bộ ngược lại vào localStorage
        try {
          const cache = readLocalCache();
          notes.forEach((n) => {
            cache[n.id] = {
              character: n.id,
              hanviet: n.hanviet,
              meaning: n.meaning,
              mnemonic: n.mnemonic,
            };
          });
          localStorage.setItem(LS_KEY, JSON.stringify(cache));
        } catch {}
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folderKey, uniqueKanji.join(',')]);

  // ── Phân loại ─────────────────────────────────────────────────────────────
  const withNotes = useMemo(
    () => uniqueKanji.filter((k) => notesMap[k]?.mnemonic || notesMap[k]?.hanviet),
    [uniqueKanji, notesMap]
  );
  const withoutNotes = useMemo(
    () => uniqueKanji.filter((k) => !(notesMap[k]?.mnemonic || notesMap[k]?.hanviet)),
    [uniqueKanji, notesMap]
  );

  // ── Callback khi KanjiModal lưu thành công (optimistic update) ────────────
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    // Sau khi đóng modal → re-read localStorage để lấy note mới nhất
    if (modalChar) {
      const cache = readLocalCache();
      if (cache[modalChar]) {
        setNotesMap((prev) => ({
          ...prev,
          [modalChar]: cache[modalChar],
        }));
      }
    }
  }, [modalChar]);

  const openModal = (char: string) => {
    setModalChar(char);
    setIsModalOpen(true);
  };

  if (uniqueKanji.length === 0) return null;

  return (
    <div className="mt-4 space-y-3 select-none">
      {/* ── HEADER & SEARCH ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 px-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          </span>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Hán tự trong thư mục
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
            {uniqueKanji.length} hán tự
          </span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200/80 dark:border-amber-500/30">
            {withNotes.length} có mẹo
          </span>
          {withoutNotes.length > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              {withoutNotes.length} chưa có
            </span>
          )}
          {loading && (
            <span className="text-[11px] text-slate-400 dark:text-slate-500 animate-pulse ml-1">
              Đang tải…
            </span>
          )}
        </div>
      </div>

      {/* ── LIST 1: CÓ MẸO NHỚ (2 CỘT RESPONSIVE) ── */}
      {withNotes.length > 0 && (
        <div className="rounded-2xl bg-[oklch(var(--color-surface))] shadow-elevation-sm border border-amber-100 dark:border-amber-500/10 overflow-hidden transition-colors duration-300">
          {/* Sub-header */}
          <button
            type="button"
            onClick={() => setShowWithNotes((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-50/60 dark:hover:bg-amber-500/5 transition-colors border-b border-amber-100/60 dark:border-amber-500/10"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                Có mẹo nhớ ({withNotes.length})
              </span>
            </div>
            {showWithNotes ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showWithNotes && (
            <div className="p-2.5 sm:p-3.5 grid grid-cols-1 md:grid-cols-2 gap-2.5 sm:gap-3 bg-slate-50/40 dark:bg-slate-900/20">
              {withNotes.map((char) => {
                const note = notesMap[char];
                return (
                  <button
                    key={char}
                    type="button"
                    onClick={() => openModal(char)}
                    className="w-full text-left flex items-start gap-3 p-3 sm:p-3.5 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/50 hover:bg-amber-50/50 dark:hover:bg-amber-500/10 hover:shadow-md transition-all duration-200 group relative"
                    title={`Bấm để xem chi tiết Hán tự ${char}`}
                  >
                    {/* Kanji nổi bật */}
                    <div className="w-11 h-11 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/15 text-amber-600 dark:text-amber-400 font-bold text-2xl sm:text-3xl shrink-0 group-hover:scale-105 group-hover:bg-amber-100/80 dark:group-hover:bg-amber-500/25 transition-transform border border-amber-200/60 dark:border-amber-500/20 shadow-xs">
                      {char}
                    </div>

                    {/* Thông tin */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {note?.hanviet && (
                          <span className="text-[11px] sm:text-xs font-extrabold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
                            {note.hanviet}
                          </span>
                        )}
                        {note?.meaning && (
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 italic truncate max-w-[130px] sm:max-w-[180px]">
                            • {note.meaning}
                          </span>
                        )}
                      </div>
                      {note?.mnemonic ? (
                        <div className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                          <HighlightMnemonic text={note.mnemonic} />
                        </div>
                      ) : (
                        <div className="text-[11px] text-slate-400 dark:text-slate-500 italic">
                          Chưa có nội dung mẹo
                        </div>
                      )}
                    </div>

                    {/* Mũi tên dẫn hướng */}
                    <span className="text-slate-300 dark:text-slate-600 group-hover:text-amber-500 dark:group-hover:text-amber-400 transition-colors shrink-0 text-xs self-center">
                      ›
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── LIST 2: CHƯA CÓ MẸO NHỚ ── */}
      {withoutNotes.length > 0 && (
        <div className="rounded-2xl bg-[oklch(var(--color-surface))] shadow-elevation-sm border border-slate-100 dark:border-slate-800/40 overflow-hidden transition-colors duration-300">
          {/* Sub-header */}
          <button
            type="button"
            onClick={() => setShowWithoutNotes((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors border-b border-slate-100/60 dark:border-slate-800/40"
          >
            <div className="flex items-center gap-2">
              <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Chưa có mẹo nhớ ({withoutNotes.length})
              </span>
            </div>
            {showWithoutNotes ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showWithoutNotes && (
            <div className="p-3 sm:p-4">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">
                Bấm vào hán tự để xem và thêm mẹo nhớ
              </p>
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                {withoutNotes.map((char) => {
                  const note = notesMap[char];
                  return (
                    <button
                      key={char}
                      type="button"
                      onClick={() => openModal(char)}
                      title={`Thêm mẹo nhớ cho ${char}${note?.hanviet ? ` (${note.hanviet})` : ''}`}
                      className="group flex flex-col items-center justify-center p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/50 hover:bg-amber-50/50 dark:hover:bg-amber-500/10 hover:shadow-sm transition-all active:scale-95"
                    >
                      <span className="text-xl font-bold text-slate-700 dark:text-slate-200 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {char}
                      </span>
                      {note?.hanviet ? (
                        <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-semibold uppercase truncate max-w-full">
                          {note.hanviet.split(',')[0]}
                        </span>
                      ) : (
                        <PlusCircle className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors mt-0.5" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── KANJI MODAL (tái sử dụng component hiện có) ── */}
      <KanjiModal
        character={modalChar}
        isOpen={isModalOpen}
        onClose={handleModalClose}
      />
    </div>
  );
}
