'use client';

import React, { useState } from 'react';
import { Pencil, Trash2, BookOpen, Volume2, ExternalLink, ChevronDown, ChevronUp, Sparkles, HelpCircle } from 'lucide-react';
import { playAudio } from '@/lib/tts-utils';
import { cn } from '@/lib/cn';

export interface GrammarExample {
  jpn: string;
  vie: string;
}

export interface GrammarBlock {
  blockNumber: number;
  formation: string;
  meaning: string;
  nuance?: string;
  examples: GrammarExample[];
}

export interface GrammarItem {
  id: string;
  number?: number;
  title?: string;
  structure: string;
  formation?: string;
  meaning: string;
  nuance?: string;
  example?: string;
  exampleMeaning?: string;
  examples?: GrammarExample[];
  blocks?: GrammarBlock[];
  jlptLevel?: string;
  usageContext?: string;
  sourceUrl?: string;
}

interface GrammarListProps {
  grammars: GrammarItem[];
  onEdit: (g: GrammarItem) => void;
  onDelete: (id: string) => void;
}

const contextIcons: Record<string, string> = {
  conversation: '🗣️ Giao tiếp',
  writing: '📝 Văn viết',
  business: '💼 Công việc',
  anime: '📺 Phim/Anime'
};

export function GrammarList({ grammars, onEdit, onDelete }: GrammarListProps) {
  if (grammars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
        <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">Chưa có ngữ pháp nào</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Hãy chọn thư mục khác hoặc thêm ngữ pháp mới.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {grammars.map((g) => (
        <GrammarCard key={g.id} grammar={g} onEdit={onEdit} onDelete={onDelete} />
      ))}
    </div>
  );
}

function GrammarCard({
  grammar: g,
  onEdit,
  onDelete,
}: {
  grammar: GrammarItem;
  onEdit: (g: GrammarItem) => void;
  onDelete: (id: string) => void;
}) {
  const hasMultipleBlocks = g.blocks && g.blocks.length > 1;
  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Active block or fallback
  const activeBlock = hasMultipleBlocks && g.blocks ? g.blocks[activeBlockIndex] : null;

  const currentMeaning = activeBlock?.meaning || g.meaning;
  const currentFormation = activeBlock?.formation || g.formation;
  const currentNuance = activeBlock?.nuance || g.nuance;
  const currentExamples = activeBlock?.examples && activeBlock.examples.length > 0
    ? activeBlock.examples
    : (g.examples && g.examples.length > 0
      ? g.examples
      : (g.example ? [{ jpn: g.example, vie: g.exampleMeaning || '' }] : []));

  const handlePlayAudio = async (text: string) => {
    if (!text || isPlayingAudio) return;
    setIsPlayingAudio(true);
    try {
      await playAudio(text);
    } finally {
      setIsPlayingAudio(false);
    }
  };

  return (
    <div className="group flex flex-col bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/90 dark:border-slate-800 shadow-sm hover:shadow-lg hover:border-violet-300 dark:hover:border-violet-500/50 transition-all duration-300">
      {/* 1. Header Card: Badges, Actions, Audio */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
          {/* Badge số bài */}
          {g.number && (
            <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-xs">
              Bài {g.number}
            </span>
          )}

          {/* Badge JLPT */}
          {g.jlptLevel && (
            <span className="px-2 py-0.5 rounded-lg text-[11px] font-extrabold bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/40">
              {g.jlptLevel}
            </span>
          )}

          {/* Context tags */}
          {g.usageContext && g.usageContext.split(',').map((ctx) => {
            const trimmed = ctx.trim();
            return (
              <span
                key={trimmed}
                className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
              >
                {contextIcons[trimmed] || trimmed}
              </span>
            );
          })}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 shrink-0">
          {g.sourceUrl && (
            <a
              href={g.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-500/10 transition-colors"
              title="Xem bài gốc trên vnjpclub"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}

          <button
            type="button"
            onClick={() => onEdit(g)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
            title="Sửa ngữ pháp"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onDelete(g.id)}
            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
            title="Xóa ngữ pháp"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. Cấu trúc ngữ pháp chính + Loa phát âm */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-japanese tracking-tight">
          {g.structure}
        </h3>

        <button
          type="button"
          onClick={() => handlePlayAudio(g.structure.replace(/～|…/g, ''))}
          className="p-2 rounded-xl bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/50 dark:hover:bg-violet-900/60 text-violet-600 dark:text-violet-300 transition-all active:scale-95 shrink-0"
          title="Nghe phát âm cấu trúc"
        >
          <Volume2 className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Tab chuyển đổi ý nghĩa nếu bài có nhiều block (Ý nghĩa ①, ②) */}
      {hasMultipleBlocks && g.blocks && (
        <div className="flex items-center gap-1.5 mb-3 overflow-x-auto pb-1 scrollbar-hide">
          {g.blocks.map((block, idx) => (
            <button
              key={block.blockNumber}
              type="button"
              onClick={() => setActiveBlockIndex(idx)}
              className={cn(
                "px-2.5 py-1 rounded-xl text-xs font-bold transition-all shrink-0",
                activeBlockIndex === idx
                  ? "bg-violet-600 text-white shadow-xs"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
              )}
            >
              Ý nghĩa {['①', '②', '③', '④', '⑤'][idx] || `#${idx + 1}`}
            </button>
          ))}
        </div>
      )}

      {/* 4. Ý nghĩa tiếng Việt */}
      <div className="mb-3.5 border-l-4 border-violet-500 pl-3.5 py-1.5 bg-violet-50/50 dark:bg-violet-950/20 rounded-r-2xl">
        <p className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 mb-0.5">
          Ý nghĩa:
        </p>
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
          {currentMeaning}
        </p>
      </div>

      {/* 5. Cách kết hợp (Formation) */}
      {currentFormation && (
        <div className="mb-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
          <span className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block mb-1">
            Cách kết hợp:
          </span>
          <p className="text-xs font-japanese font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
            {currentFormation}
          </p>
        </div>
      )}

      {/* 6. Sắc thái & Chú ý (Nuance) */}
      {currentNuance && (
        <div className="mb-3 bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-200/60 dark:border-amber-900/30 text-amber-900 dark:text-amber-200/90 text-xs">
          <span className="font-extrabold block mb-0.5 text-[11px] uppercase tracking-wider text-amber-700 dark:text-amber-400">
            Lưu ý & Sắc thái:
          </span>
          <p className="leading-relaxed whitespace-pre-line text-xs font-japanese">
            {currentNuance}
          </p>
        </div>
      )}

      {/* 7. Danh sách Ví dụ thực tế */}
      {currentExamples.length > 0 && (
        <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Ví dụ thực tế ({currentExamples.length})
            </span>

            {currentExamples.length > 1 && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-1"
              >
                {isExpanded ? (
                  <>
                    <span>Thu gọn</span>
                    <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    <span>Xem thêm {currentExamples.length - 1} ví dụ</span>
                    <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            )}
          </div>

          {/* Ví dụ đầu tiên luôn hiển thị */}
          <div className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-japanese font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                {currentExamples[0].jpn}
              </p>
              <button
                type="button"
                onClick={() => handlePlayAudio(currentExamples[0].jpn)}
                className="p-1 rounded-lg text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 shrink-0"
                title="Nghe câu ví dụ"
              >
                <Volume2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {currentExamples[0].vie && (
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                {currentExamples[0].vie}
              </p>
            )}
          </div>

          {/* Các ví dụ còn lại khi mở rộng */}
          {isExpanded && currentExamples.slice(1).map((ex, idx) => (
            <div
              key={idx}
              className="bg-slate-50 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 animate-fadeIn"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-japanese font-medium text-slate-900 dark:text-slate-100 leading-relaxed">
                  {ex.jpn}
                </p>
                <button
                  type="button"
                  onClick={() => handlePlayAudio(ex.jpn)}
                  className="p-1 rounded-lg text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 shrink-0"
                  title="Nghe câu ví dụ"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {ex.vie && (
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                  {ex.vie}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
