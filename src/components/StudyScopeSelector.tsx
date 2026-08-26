'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  SlidersHorizontal, Check, Shuffle, Hash, ListFilter, 
  ChevronDown, ChevronUp
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
  const [rangeStart, setRangeStart] = useState(1);
  const [rangeEnd, setRangeEnd] = useState(Math.min(30, allVocabularies.length));
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
        label: `${start} - ${end} (${end - start + 1} từ)`,
      });
      start += CHUNK_SIZE;
      idx++;
    }
    return list;
  }, [total]);

  // Cập nhật phạm vi từ vựng khi thay đổi lựa chọn
  const applyScope = (
    type: ScopeType,
    chunkIdx = selectedChunkIndex,
    randCount = randomCount,
    rStart = rangeStart,
    rEnd = rangeEnd
  ) => {
    setScopeType(type);

    if (type === 'all') {
      onScopeChange(allVocabularies, `Tất cả ${total} từ vựng`);
      return;
    }

    if (type === 'selected' && selectedVocabIds.length > 0) {
      const filtered = allVocabularies.filter(v => selectedVocabIds.includes(v.id));
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
      const s = Math.max(1, Math.min(rStart, total));
      const e = Math.max(s, Math.min(rEnd, total));
      const sliced = allVocabularies.slice(s - 1, e);
      onScopeChange(sliced, `Từ STT ${s} đến ${e} (${sliced.length} từ)`);
      return;
    }

    onScopeChange(allVocabularies, `Tất cả ${total} từ vựng`);
  };

  // Tự động áp dụng scope khi danh sách allVocabularies thay đổi
  useEffect(() => {
    if (selectedVocabIds.length > 0) {
      applyScope('selected');
    } else {
      applyScope('all');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allVocabularies]);

  if (total <= 5 && selectedVocabIds.length === 0) return null;

  const themeClasses = {
    emerald: 'border-emerald-200/80 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
    indigo: 'border-indigo-200/80 dark:border-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-300',
    purple: 'border-purple-200/80 dark:border-purple-500/30 bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300',
    amber: 'border-amber-200/80 dark:border-amber-500/30 bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
  }[modeTheme];

  const activeBtnClasses = {
    emerald: 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30',
    indigo: 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30',
    purple: 'bg-purple-600 text-white shadow-sm shadow-purple-600/30',
    amber: 'bg-amber-600 text-white shadow-sm shadow-amber-600/30',
  }[modeTheme];

  return (
    <div className={`rounded-2xl border ${themeClasses} p-3 sm:p-3.5 transition-all mb-4 shadow-sm backdrop-blur-sm`}>
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="p-1.5 rounded-lg bg-white dark:bg-slate-800 shadow-sm border border-slate-200/60 dark:border-slate-700/60">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Phạm vi học:
          </span>
          <span className="text-xs font-extrabold px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white border border-slate-200/80 dark:border-slate-700 shadow-sm">
            {activeCount} / {total} từ
          </span>
        </div>

        {/* Nút bấm mở rộng/thu gọn tùy chỉnh */}
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700 transition-all shadow-sm"
        >
          <span>{isExpanded ? 'Thu gọn bộ chọn' : 'Đổi số lượng từ'}</span>
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Quick Pills Bar (Luôn hiển thị các tùy chọn phổ biến) */}
      <div className="flex flex-wrap items-center gap-1.5 pt-2.5">
        {/* Nút: Tất cả */}
        <button
          type="button"
          onClick={() => applyScope('all')}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
            scopeType === 'all'
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
            onClick={() => applyScope('selected')}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
              scopeType === 'selected'
                ? activeBtnClasses
                : 'bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
            }`}
          >
            <Check className="w-3.5 h-3.5" />
            <span>Đã chọn ({selectedVocabIds.length})</span>
          </button>
        )}

        {/* Nút: Chunks 30 từ đầu (1-30) */}
        {chunks.length > 0 && (
          <button
            type="button"
            onClick={() => {
              setSelectedChunkIndex(0);
              applyScope('chunk', 0);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              scopeType === 'chunk' && selectedChunkIndex === 0
                ? activeBtnClasses
                : 'bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
            }`}
          >
            30 từ đầu (1-30)
          </button>
        )}

        {/* Nút: Chunks 30 từ tiếp theo (31-60) nếu có */}
        {chunks.length > 1 && (
          <button
            type="button"
            onClick={() => {
              setSelectedChunkIndex(1);
              applyScope('chunk', 1);
            }}
            className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
              scopeType === 'chunk' && selectedChunkIndex === 1
                ? activeBtnClasses
                : 'bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
            }`}
          >
            30 từ tiếp (31-60)
          </button>
        )}

        {/* Nút: Ngẫu nhiên 30 từ */}
        <button
          type="button"
          onClick={() => {
            setRandomCount(30);
            applyScope('random', selectedChunkIndex, 30);
          }}
          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
            scopeType === 'random' && randomCount === 30
              ? activeBtnClasses
              : 'bg-white dark:bg-slate-900/90 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
          }`}
        >
          <Shuffle className="w-3 h-3" />
          <span>Random 30</span>
        </button>
      </div>

      {/* Expanded Custom Panel */}
      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700/60 space-y-3 animate-fadeIn text-xs">
          {/* 1. Chọn theo từng khối Chunk 30 từ */}
          {chunks.length > 0 && (
            <div className="space-y-1.5">
              <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <ListFilter className="w-3.5 h-3.5" />
                <span>Chia theo từng phần (30 từ / đợt học):</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {chunks.map(chunk => (
                  <button
                    key={chunk.index}
                    type="button"
                    onClick={() => {
                      setSelectedChunkIndex(chunk.index);
                      applyScope('chunk', chunk.index);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                      scopeType === 'chunk' && selectedChunkIndex === chunk.index
                        ? activeBtnClasses
                        : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    {chunk.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 2. Chọn ngẫu nhiên số lượng */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Shuffle className="w-3.5 h-3.5" />
              <span>Học ngẫu nhiên số lượng từ:</span>
            </label>
            <div className="flex flex-wrap items-center gap-1.5">
              {[10, 20, 30, 50].filter(n => n <= total).map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setRandomCount(n);
                    applyScope('random', selectedChunkIndex, n);
                  }}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                    scopeType === 'random' && randomCount === n
                      ? activeBtnClasses
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  🎲 {n} từ
                </button>
              ))}
            </div>
          </div>

          {/* 3. Chọn dải STT tùy chỉnh (Custom Range) */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" />
              <span>Nhập dải số thứ tự (STT) tùy chỉnh:</span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500">Từ STT:</span>
              <input
                type="number"
                min={1}
                max={total}
                value={rangeStart}
                onChange={e => setRangeStart(parseInt(e.target.value) || 1)}
                className="w-16 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold outline-none focus:border-indigo-500"
              />
              <span className="text-slate-500">Đến STT:</span>
              <input
                type="number"
                min={rangeStart}
                max={total}
                value={rangeEnd}
                onChange={e => setRangeEnd(parseInt(e.target.value) || rangeStart)}
                className="w-16 px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-center font-bold outline-none focus:border-indigo-500"
              />
              <button
                type="button"
                onClick={() => applyScope('range', selectedChunkIndex, randomCount, rangeStart, rangeEnd)}
                className={`px-3 py-1 rounded-lg font-bold transition-all ${
                  scopeType === 'range' ? activeBtnClasses : 'bg-slate-800 text-white dark:bg-slate-700 hover:bg-slate-700'
                }`}
              >
                Áp dụng dải này
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
