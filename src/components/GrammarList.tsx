'use client';

import React, { useState } from 'react';
import { Pencil, Trash2, BookOpen, Volume2, ExternalLink, ChevronDown, ChevronUp, Sparkles, HelpCircle, FileText } from 'lucide-react';
import { playAudio } from '@/lib/tts-utils';
import { cn } from '@/lib/cn';
import { GrammarItem, GrammarBlock, GrammarExample } from '@/lib/grammar-data';
import { GrammarRubyText } from './GrammarRubyText';
import { getGrammarStudyDay } from '@/lib/grammar-study-plan';

export type { GrammarItem, GrammarBlock, GrammarExample };

interface GrammarListProps {
  grammars: GrammarItem[];
  presentation?: 'compact' | 'cards';
  onEdit: (g: GrammarItem) => void;
  onDelete: (id: string) => void;
  onOpenDetail?: (g: GrammarItem) => void;
}

const contextIcons: Record<string, string> = {
  conversation: '🗣️ Giao tiếp',
  writing: '📝 Văn viết',
  business: '💼 Công việc',
  anime: '📺 Phim/Anime'
};

export function GrammarList({ grammars, presentation = 'compact', onEdit, onDelete, onOpenDetail }: GrammarListProps) {
  if (grammars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
        <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">Chưa có ngữ pháp nào</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Hãy chọn thư mục khác hoặc thêm ngữ pháp mới.</p>
      </div>
    );
  }

  if (presentation === 'compact') {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="hidden sm:grid grid-cols-[5rem_minmax(0,1.1fr)_minmax(0,1.6fr)_5rem] gap-4 border-b border-slate-200 bg-slate-50 px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-400">
          <span>Bài</span><span>Cấu trúc</span><span>Ý nghĩa</span><span>Nguồn</span>
        </div>
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {grammars.map(g => {
            const day = getGrammarStudyDay(g);
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => onOpenDetail?.(g)}
                className="grid w-full grid-cols-[3.5rem_minmax(0,1fr)] gap-x-3 gap-y-1 px-4 py-3 text-left transition-colors hover:bg-violet-50/60 focus-visible:bg-violet-50 focus-visible:outline-2 focus-visible:outline-violet-500 sm:grid-cols-[5rem_minmax(0,1.1fr)_minmax(0,1.6fr)_5rem] sm:items-center sm:gap-4 sm:px-5 dark:hover:bg-violet-950/20"
                aria-label={`Xem chi tiết bài ${g.number ?? ''}: ${g.structure}`}
              >
                <span className="text-xs font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                  {g.number ? `#${g.number}` : '—'}
                </span>
                <span className="min-w-0 font-japanese text-base font-semibold text-slate-900 dark:text-slate-100">
                  <GrammarRubyText text={g.structure} rubyText={g.structureRuby} />
                </span>
                <span className="col-start-2 min-w-0 truncate text-sm text-slate-600 sm:col-start-3 dark:text-slate-300" title={g.meaning}>
                  {g.meaning?.split('\n')[0] || 'Chưa có ý nghĩa'}
                </span>
                <span className="col-start-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 sm:col-start-4 sm:flex-col sm:items-start dark:text-slate-400">
                  <span>{g.id.startsWith('tndg-') ? 'Tổng hợp' : g.folderIds?.includes('E9rOfmF2wzKlWWbpWcFY') ? 'Shin Kanzen' : 'Cá nhân'}</span>
                  {day && <span className="rounded-md bg-violet-100 px-1.5 py-0.5 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300">Ngày {day}</span>}
                  {g.tags?.map(tag => <span key={tag} className="rounded-md bg-sky-100 px-1.5 py-0.5 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">{tag}</span>)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      {grammars.map((g) => (
        <GrammarCard 
          key={g.id} 
          grammar={g} 
          onEdit={onEdit} 
          onDelete={onDelete} 
          onOpenDetail={onOpenDetail} 
        />
      ))}
    </div>
  );
}

function GrammarCard({
  grammar: g,
  onEdit,
  onDelete,
  onOpenDetail,
}: {
  grammar: GrammarItem;
  onEdit: (g: GrammarItem) => void;
  onDelete: (id: string) => void;
  onOpenDetail?: (g: GrammarItem) => void;
}) {
  const hasMultipleBlocks = g.blocks && g.blocks.length > 1;
  const [activeBlockIndex, setActiveBlockIndex] = useState<number>(0);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Active block or fallback
  const activeBlock = hasMultipleBlocks && g.blocks ? g.blocks[activeBlockIndex] : null;

  const currentMeaning = activeBlock?.meaning || g.meaning;
  const currentFormation = activeBlock?.formation || g.formation;
  const currentFormationRuby = activeBlock?.formation ? activeBlock.formationRuby : g.formationRuby;
  const currentNuance = activeBlock?.nuance || g.nuance;
  const currentNuanceRuby = activeBlock?.nuance ? activeBlock.nuanceRuby : g.nuanceRuby;
  const currentMeaningRuby = activeBlock?.meaning ? activeBlock.meaningRuby : g.meaningRuby;
  const currentExamples = activeBlock?.examples && activeBlock.examples.length > 0
    ? activeBlock.examples
    : (g.examples && g.examples.length > 0
      ? g.examples
      : (g.example ? [{ jpn: g.example, vie: g.exampleMeaning || '', ruby: g.exampleRuby }] : []));

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
      {/* 1. Header Card: Badges, Books, Actions */}
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

          {/* Book badges */}
          {Array.isArray(g.books) && g.books.map((b) => {
            const isSk = b.toLowerCase().includes('shin');
            const isMimi = b.toLowerCase().includes('mimi');
            const isSouma = b.toLowerCase().includes('souma');
            return (
              <span
                key={b}
                className={cn(
                  "px-2 py-0.5 rounded-lg text-[10px] font-bold border",
                  isSk && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
                  isMimi && "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40",
                  isSouma && "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40"
                )}
              >
                {isSk ? '📗 Shinkanzen' : isMimi ? '📙 Mimikara' : isSouma ? '📘 Soumatome' : b}
              </span>
            );
          })}

          {/* Context tags */}
          {g.tags?.map(tag => <span key={tag} className="rounded-lg bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">{tag}</span>)}
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
              title="Xem bài gốc nguồn ngoài"
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
        <h3 
          onClick={() => onOpenDetail && onOpenDetail(g)}
          className={cn(
            "text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-japanese tracking-tight",
            onOpenDetail && "cursor-pointer hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
          )}
          title={onOpenDetail ? "Bấm để xem chi tiết bài học" : undefined}
        >
          <GrammarRubyText text={g.structure} rubyText={g.structureRuby} />
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
              {block.heading || `Ý nghĩa ${['①', '②', '③', '④', '⑤'][idx] || `#${idx + 1}`}`}
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
          <GrammarRubyText text={currentMeaning} rubyText={currentMeaningRuby} />
        </p>
      </div>

      {/* 5. Cách kết hợp (Formation) */}
      {currentFormation && (
        <div className="mb-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl border border-slate-200/60 dark:border-slate-800/80">
          <span className="text-[11px] font-extrabold uppercase text-slate-500 dark:text-slate-400 block mb-1">
            Cách kết hợp:
          </span>
          <p className="text-xs font-japanese font-medium text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
            <GrammarRubyText text={currentFormation} rubyText={currentFormationRuby} />
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
            <GrammarRubyText text={currentNuance} rubyText={currentNuanceRuby} />
          </p>
        </div>
      )}

      {/* 7. Danh sách Ví dụ thực tế */}
      {currentExamples.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
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
                <GrammarRubyText text={currentExamples[0].jpn} rubyText={currentExamples[0].ruby} />
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
                  <GrammarRubyText text={ex.jpn} rubyText={ex.ruby} />
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

      {/* 8. Bottom Action Bar: Examples count & Xem chi tiết */}
      <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
          {(g.totalExamplesCount && g.totalExamplesCount > 0) 
            ? `${g.totalExamplesCount} câu ví dụ` 
            : `${currentExamples.length} câu ví dụ`}
        </span>

        {onOpenDetail && (
          <button
            type="button"
            onClick={() => onOpenDetail(g)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 dark:bg-violet-950/40 dark:text-violet-300 dark:hover:bg-violet-900/50 transition-all border border-violet-200/60 dark:border-violet-800/40 active:scale-95 shadow-2xs"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Xem chi tiết</span>
          </button>
        )}
      </div>
    </div>
  );
}
