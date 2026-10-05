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
      {/* ── HEADER ── */}
      <div className="flex items-center gap-2 px-1">
        <span className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200/80 dark:border-amber-500/20">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
        </span>
        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
          Hán tự trong thư mục
        </span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          {uniqueKanji.length} hán tự
        </span>
        {loading && (
          <span className="text-[11px] text-slate-400 dark:text-slate-500 animate-pulse ml-1">
            Đang tải…
          </span>
        )}
      </div>

      {/* ── LIST 1: CÓ MẸO NHỚ ── */}
      {withNotes.length > 0 && (
        <div className="rounded-2xl bg-[oklch(var(--color-surface))] shadow-elevation-sm border border-amber-100 dark:border-amber-500/10 overflow-hidden transition-colors duration-300">
          {/* Sub-header */}
          <button
            type="button"
            onClick={() => setShowWithNotes((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-amber-50/60 dark:hover:bg-amber-500/5 transition-colors"
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
            <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {withNotes.map((char) => {
                const note = notesMap[char];
                return (
                  <button
                    key={char}
                    type="button"
                    onClick={() => openModal(char)}
                    className="w-full text-left flex items-start gap-3 px-4 py-3 hover:bg-amber-50/40 dark:hover:bg-amber-500/5 transition-colors group"
                    title={`Bấm để xem chi tiết Hán tự ${char}`}
                  >
                    {/* Kanji to */}
                    <span className="text-2xl font-bold text-amber-600 dark:text-amber-400 leading-none shrink-0 pt-0.5 group-hover:scale-110 transition-transform">
                      {char}
                    </span>
                    {/* Thông tin */}
                    <div className="flex-1 min-w-0 space-y-0.5">
                      {note?.hanviet && (
                        <div className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider truncate">
                          {note.hanviet}
                        </div>
                      )}
                      {note?.mnemonic && (
                        <div className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-2">
                          <HighlightMnemonic text={note.mnemonic} />
                        </div>
                      )}
                    </div>
                    {/* Arrow hint */}
                    <span className="text-[10px] text-slate-300 dark:text-slate-600 group-hover:text-amber-400 transition-colors shrink-0 self-center">
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
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
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
            <div className="px-4 pb-4 pt-1">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mb-3">
                Bấm vào hán tự để thêm mẹo nhớ
              </p>
              <div className="flex flex-wrap gap-2">
                {withoutNotes.map((char) => (
                  <button
                    key={char}
                    type="button"
                    onClick={() => openModal(char)}
                    title={`Thêm mẹo nhớ cho ${char}`}
                    className="group relative flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-50 dark:hover:bg-amber-500/10 hover:border-amber-300 dark:hover:border-amber-500/40 border border-slate-200 dark:border-slate-700 transition-all active:scale-95"
                  >
                    <span className="text-lg font-bold text-slate-600 dark:text-slate-300 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                      {char}
                    </span>
                    <PlusCircle className="w-3 h-3 text-slate-300 dark:text-slate-600 group-hover:text-amber-500 transition-colors" />
                  </button>
                ))}
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
