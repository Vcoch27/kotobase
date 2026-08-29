'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  SlidersHorizontal,
  Check,
  Shuffle,
  Hash,
  ListFilter,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export interface VocabularyData {
  id: string;
  word: string;
  meaning: string;
  reading?: string | null;
  sinoVietnamese?: string | null;
  example?: string | null;
  note?: string | null;
  folderVocabularies?: any[];
}

export type ScopeType = 'all' | 'chunk' | 'random' | 'range' | 'selected';

interface StudyScopeSelectorProps {
  allVocabularies: VocabularyData[];
  selectedVocabIds?: string[];
  onScopeChange: (scopedVocabs: VocabularyData[], scopeDescription: string) => void;
  activeCount: number;
  modeTheme?: 'amber' | 'indigo' | 'emerald' | 'purple';
}

export function StudyScopeSelector({
  allVocabularies,
  selectedVocabIds = [],
  onScopeChange,
  activeCount,
  modeTheme = 'emerald',
}: StudyScopeSelectorProps) {
  const [scopeType, setScopeType] = useState<ScopeType>(
    selectedVocabIds.length > 0 ? 'selected' : 'all'
  );
  const [selectedChunkIndex, setSelectedChunkIndex] = useState(0);
  const [randomCount, setRandomCount] = useState(30);
  const [rangeStartStr, setRangeStartStr] = useState('1');
  const [rangeEndStr, setRangeEndStr] = useState(
    String(Math.min(30, allVocabularies.length || 30))
  );
  const [isExpanded, setIsExpanded] = useState(false);

  const total = allVocabularies.length;
  const CHUNK_SIZE = 30;

  // Tính các khối chunk 30 từ (1-30, 31-60, 61-90,...)
  const chunks = useMemo(() => {
    const list: { index: number; start: number; end: number; label: string }[] = [];
    if (total <= CHUNK_SIZE) return list;

    let start = 1;
    let idx = 0;
    while (start <= total) {
      const end = Math.min(start + CHUNK_SIZE - 1, total);
      list.push({
        index: idx,
        start,
        end,
        label: `${start} - ${end}`,
      });
      start += CHUNK_SIZE;
      idx++;
    }
    return list;
  }, [total]);

  // Tính số lượng từ trong dải nhập STT hiện tại
  const currentRangeCount = useMemo(() => {
    const s = parseInt(rangeStartStr, 10);
    const e = parseInt(rangeEndStr, 10);
    if (isNaN(s) || isNaN(e) || s < 1 || e < s) return 0;
    const clampedS = Math.min(s, total);
    const clampedE = Math.min(e, total);
    return Math.max(0, clampedE - clampedS + 1);
  }, [rangeStartStr, rangeEndStr, total]);

  // Cập nhật phạm vi từ vựng khi thay đổi lựa chọn
  const applyScope = (
    type: ScopeType,
    chunkIdx = selectedChunkIndex,
    randCount = randomCount,
    customStart?: number,
    customEnd?: number
  ) => {
    setScopeType(type);

    if (type === 'all') {
      onScopeChange(allVocabularies, `Tất cả ${total} từ vựng`);
      return;
    }

    if (type === 'selected' && selectedVocabIds.length > 0) {
      const filtered = allVocabularies.filter((v) => selectedVocabIds.includes(v.id));
      onScopeChange(filtered, `${filtered.length} từ đã chọn ở Bảng`);
      return;
    }

    if (type === 'chunk' && chunks.length > 0) {
      const chunk = chunks[chunkIdx] || chunks[0];
      const sliced = allVocabularies.slice(chunk.start - 1, chunk.end);
      onScopeChange(sliced, `Từ STT ${chunk.start} đến ${chunk.end} (${sliced.length} từ)`);
      return;
    }

    if (type === 'random') {
      const count = Math.min(randCount, total);
      const shuffled = [...allVocabularies].sort(() => 0.5 - Math.random());
      const sliced = shuffled.slice(0, count);
      onScopeChange(sliced, `🎲 Ngẫu nhiên ${sliced.length} từ`);
      return;
    }

    if (type === 'range') {
      const rawS = customStart !== undefined ? customStart : parseInt(rangeStartStr, 10);
      const rawE = customEnd !== undefined ? customEnd : parseInt(rangeEndStr, 10);

      const s = Math.max(1, Math.min(isNaN(rawS) ? 1 : rawS, total));
      const e = Math.max(s, Math.min(isNaN(rawE) ? s : rawE, total));

      setRangeStartStr(String(s));
      setRangeEndStr(String(e));

      const sliced = allVocabularies.slice(s - 1, e);
      onScopeChange(sliced, `Từ STT ${s} đến ${e} (${sliced.length} từ)`);
      return;
    }

    onScopeChange(allVocabularies, `Tất cả ${total} từ vựng`);
  };

  const vocabIdsStr = allVocabularies.map(v => v.id).join(',');
  const selectedVocabIdsStr = selectedVocabIds.join(',');

  // Tự động áp dụng scope khi danh sách allVocabularies thay đổi
  useEffect(() => {
    if (selectedVocabIds.length > 0) {
      applyScope('selected');
    } else {
      applyScope('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocabIdsStr, selectedVocabIdsStr]);

  if (total <= 5 && selectedVocabIds.length === 0) return null;

  const themeClasses = {
    emerald:
      'border-emerald-200/80 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
    indigo:
      'border-indigo-200/80 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300',
    purple:
      'border-purple-200/80 dark:border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300',
    amber:
      'border-amber-200/80 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
  }[modeTheme];

  const activeBtnClasses = {
    emerald: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30',
    indigo: 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30',
    purple: 'bg-purple-600 text-white shadow-sm shadow-purple-600/30',
    amber: 'bg-amber-600 text-white shadow-sm shadow-amber-600/30',
  }[modeTheme];

  return (
    <div
      className={`rounded-2xl border ${themeClasses} p-2.5 sm:p-3 transition-all mb-4 shadow-sm backdrop-blur-sm space-y-2`}
    >
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700/60">
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">Phạm vi học:</span>
          <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-700 shadow-sm">
            {activeCount} / {total} từ
          </span>
        </div>

        {/* Quick Pills Bar (Nút nhanh) */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {/* Nút: Tất cả */}
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              applyScope('all');
            }}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
              scopeType === 'all' && !isExpanded
                ? activeBtnClasses
                : 'bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
            }`}
          >
            Tất cả ({total})
          </button>

          {/* Nút: Các từ đã chọn ở Mode 1 (nếu có) */}
          {selectedVocabIds.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                applyScope('selected');
              }}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 ${
                scopeType === 'selected' && !isExpanded
                  ? activeBtnClasses
                  : 'bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
              }`}
            >
              <Check className="w-3.5 h-3.5" />
              <span>Đã chọn ({selectedVocabIds.length})</span>
            </button>
          )}

          {/* Nút: 30 từ đầu (chỉ hiện khi > 30 từ) */}
          {chunks.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setIsExpanded(false);
                setSelectedChunkIndex(0);
                applyScope('chunk', 0);
              }}
              className={`px-2.5 py-1 rounded-xl font-bold transition-all ${
                scopeType === 'chunk' && selectedChunkIndex === 0 && !isExpanded
                  ? activeBtnClasses
                  : 'bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
              }`}
            >
              30 từ đầu
            </button>
          )}

          {/* Nút: Ngẫu nhiên 30 từ */}
          <button
            type="button"
            onClick={() => {
              setIsExpanded(false);
              setRandomCount(30);
              applyScope('random', selectedChunkIndex, 30);
            }}
            className={`px-2.5 py-1 rounded-xl font-bold transition-all flex items-center gap-1 ${
              scopeType === 'random' && randomCount === 30 && !isExpanded
                ? activeBtnClasses
                : 'bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
            }`}
          >
            <Shuffle className="w-3 h-3" />
            <span>Random 30</span>
          </button>

          {/* Nút bấm mở rộng/thu gọn Dải STT & Khối tùy chỉnh */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-1 font-bold px-2.5 py-1 rounded-xl border transition-all shadow-sm ${
              isExpanded ||
              scopeType === 'range' ||
              (scopeType === 'chunk' && selectedChunkIndex > 0)
                ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20'
                : 'bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200/80 dark:border-slate-700'
            }`}
          >
            <Hash className="w-3 h-3" />
            <span>Dải STT / Đợt học {isExpanded ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>

      {/* Expanded Custom Panel (Dải STT & Chia khối theo đợt) */}
      {isExpanded && (
        <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-2 animate-fadeIn text-xs">
          {/* 1. Nhập Dải STT tùy chỉnh (Cho phép xóa tự do, gõ 31, 65 thoải mái) */}
          <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700/80 shadow-sm">
            <span className="font-bold text-slate-700 dark:text-slate-300">Từ STT:</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={rangeStartStr}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) setRangeStartStr(val);
              }}
              onKeyDown={(e) => e.key === 'Enter' && applyScope('range')}
              placeholder="1"
              className="w-16 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-center font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
            />
            <span className="font-bold text-slate-700 dark:text-slate-300">Đến STT:</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={rangeEndStr}
              onChange={(e) => {
                const val = e.target.value;
                if (/^\d*$/.test(val)) setRangeEndStr(val);
              }}
              onKeyDown={(e) => e.key === 'Enter' && applyScope('range')}
              placeholder={String(total)}
              className="w-16 px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-center font-bold text-slate-900 dark:text-white outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={() => applyScope('range')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                scopeType === 'range'
                  ? activeBtnClasses
                  : 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm'
              }`}
            >
              Áp dụng {currentRangeCount > 0 ? `(${currentRangeCount} từ)` : ''}
            </button>
          </div>

          {/* 2. Chọn nhanh theo từng khối đợt 30 từ nếu danh sách dài */}
          {chunks.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="font-semibold text-slate-500 dark:text-slate-400 text-[11px]">
                Học theo từng đợt:
              </span>
              {chunks.map((chunk) => (
                <button
                  key={chunk.index}
                  type="button"
                  onClick={() => {
                    setSelectedChunkIndex(chunk.index);
                    setRangeStartStr(String(chunk.start));
                    setRangeEndStr(String(chunk.end));
                    applyScope('chunk', chunk.index);
                  }}
                  className={`px-2 py-0.5 rounded-lg text-xs font-semibold transition-all ${
                    scopeType === 'chunk' && selectedChunkIndex === chunk.index
                      ? activeBtnClasses
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {chunk.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
