'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, Volume2, ExternalLink, ChevronLeft, ChevronRight, 
  BookOpen, Sparkles, AlertCircle, FileText, ListFilter, 
  Search, Copy, Check, Info, Layers, Loader2 
} from 'lucide-react';
import { playAudio } from '@/lib/tts-utils';
import { cn } from '@/lib/cn';
import { GrammarItem, GrammarExample } from '@/lib/grammar-data';
import { GrammarRubyText } from './GrammarRubyText';
import { getGrammarDetail } from '@/app/actions/grammar';
import toast from 'react-hot-toast';

interface GrammarDetailModalProps {
  grammar: GrammarItem | null;
  allGrammars: GrammarItem[];
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (item: GrammarItem) => void;
  onEdit?: (item: GrammarItem) => void;
}

export function GrammarDetailModal({
  grammar,
  allGrammars,
  isOpen,
  onClose,
  onNavigate,
  onEdit,
}: GrammarDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'lesson' | 'summary' | 'examples'>('lesson');
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [playingSentenceIdx, setPlayingSentenceIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [exampleSearch, setExampleSearch] = useState('');
  
  // Full grammar detail with articleBlocks (lazy loaded if needed)
  const [detailGrammar, setDetailGrammar] = useState<GrammarItem | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const modalContentRef = useRef<HTMLDivElement>(null);

  // Cache to avoid refetching during same session
  const detailCache = useRef<Map<string, GrammarItem>>(new Map());

  // Determine current index in allGrammars
  const currentIndex = useMemo(() => {
    if (!grammar) return -1;
    return allGrammars.findIndex(g => g.id === grammar.id);
  }, [grammar, allGrammars]);

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < allGrammars.length - 1;

  // Load full detail if missing articleBlocks
  useEffect(() => {
    if (!grammar) {
      setDetailGrammar(null);
      return;
    }

    // Scroll top whenever switching lesson
    if (modalContentRef.current) {
      modalContentRef.current.scrollTop = 0;
    }

    if (grammar.articleBlocks && grammar.articleBlocks.length > 0) {
      setDetailGrammar(grammar);
      setIsLoadingDetail(false);
      return;
    }

    // Check cache
    if (detailCache.current.has(grammar.id)) {
      setDetailGrammar(detailCache.current.get(grammar.id)!);
      setIsLoadingDetail(false);
      return;
    }

    // Fallback: set initial and load in background if tndg
    setDetailGrammar(grammar);
    if (grammar.id.startsWith('tndg-')) {
      setIsLoadingDetail(true);
      getGrammarDetail(grammar.id)
        .then((res) => {
          if (res.success && res.data) {
            detailCache.current.set(grammar.id, res.data);
            setDetailGrammar(res.data);
          }
        })
        .catch((err) => {
          console.error('Lỗi tải chi tiết ngữ pháp:', err);
        })
        .finally(() => {
          setIsLoadingDetail(false);
        });
    }
  }, [grammar]);

  // Handle keyboard shortcuts (Escape to close, Left/Right arrow to navigate)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && !e.altKey && !e.ctrlKey) {
        // Only if not in input
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
        if (hasPrev) onNavigate(allGrammars[currentIndex - 1]);
      } else if (e.key === 'ArrowRight' && !e.altKey && !e.ctrlKey) {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;
        if (hasNext) onNavigate(allGrammars[currentIndex + 1]);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, hasPrev, hasNext, currentIndex, allGrammars, onNavigate, onClose]);

  if (!isOpen || !grammar) return null;

  const currentItem = detailGrammar || grammar;

  // Extract all examples
  const allExamples = useMemo(() => {
    const list: GrammarExample[] = [];
    if (Array.isArray(currentItem.examples) && currentItem.examples.length > 0) {
      currentItem.examples.forEach(ex => list.push(ex));
    } else if (currentItem.example) {
      list.push({ jpn: currentItem.example, vie: currentItem.exampleMeaning || '', ruby: currentItem.exampleRuby });
    }

    // If still empty, check inside blocks
    if (list.length === 0 && Array.isArray(currentItem.blocks)) {
      currentItem.blocks.forEach(b => {
        if (Array.isArray(b.examples)) {
          b.examples.forEach(ex => list.push(ex));
        }
      });
    }

    return list;
  }, [currentItem]);

  // Filtered examples for Search
  const filteredExamples = useMemo(() => {
    if (!exampleSearch.trim()) return allExamples;
    const q = exampleSearch.trim().toLowerCase();
    return allExamples.filter(ex => 
      ex.jpn.toLowerCase().includes(q) || ex.vie.toLowerCase().includes(q)
    );
  }, [allExamples, exampleSearch]);

  const handlePlayAudio = async (text: string, idx?: number) => {
    if (!text || isPlayingAudio) return;
    setIsPlayingAudio(true);
    if (idx !== undefined) setPlayingSentenceIdx(idx);
    try {
      // Remove regex ruby brackets or wave markers if any
      const clean = text.replace(/～|…/g, '').trim();
      await playAudio(clean);
    } finally {
      setIsPlayingAudio(false);
      setPlayingSentenceIdx(null);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success('Đã sao chép câu vào clipboard!');
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-4xl lg:max-w-5xl h-[94vh] sm:h-[90vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200/80 dark:border-slate-800 flex flex-col overflow-hidden animate-scaleUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. MODAL TOP HEADER */}
        <div className="shrink-0 p-4 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/80 backdrop-blur-sm flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            {/* Left: Navigation and Lesson number */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-200/80 dark:bg-slate-800 rounded-xl p-0.5">
                <button
                  type="button"
                  disabled={!hasPrev}
                  onClick={() => hasPrev && onNavigate(allGrammars[currentIndex - 1])}
                  className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  title="Bài trước (←)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold px-2 text-slate-600 dark:text-slate-400">
                  {currentIndex >= 0 ? `${currentIndex + 1} / ${allGrammars.length}` : ''}
                </span>
                <button
                  type="button"
                  disabled={!hasNext}
                  onClick={() => hasNext && onNavigate(allGrammars[currentIndex + 1])}
                  className="p-1.5 rounded-lg text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 disabled:pointer-events-none transition-all"
                  title="Bài tiếp theo (→)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {currentItem.number && (
                <span className="px-2.5 py-1 rounded-xl text-xs font-black bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-xs">
                  Bài {currentItem.number}
                </span>
              )}

              {currentItem.jlptLevel && (
                <span className="px-2 py-0.5 rounded-lg text-xs font-extrabold bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-700/40">
                  {currentItem.jlptLevel}
                </span>
              )}

              {/* Books badges */}
              {Array.isArray(currentItem.books) && currentItem.books.map((b) => {
                const isSk = b.toLowerCase().includes('shin');
                const isMimi = b.toLowerCase().includes('mimi');
                const isSouma = b.toLowerCase().includes('souma');
                return (
                  <span
                    key={b}
                    className={cn(
                      "hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-bold border",
                      isSk && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40",
                      isMimi && "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/40",
                      isSouma && "bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/40"
                    )}
                  >
                    {isSk ? '📗 Shinkanzen' : isMimi ? '📙 Mimikara' : isSouma ? '📘 Soumatome' : b}
                  </span>
                );
              })}
            </div>

            {/* Right: Actions and Close */}
            <div className="flex items-center gap-1.5 shrink-0">
              {currentItem.sourceUrl && (
                <a
                  href={currentItem.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl text-slate-500 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
                  title="Xem bài gốc nguồn ngoài"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                title="Đóng (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Structure title with audio */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 dark:text-white font-japanese tracking-tight truncate">
                <GrammarRubyText text={currentItem.structure} rubyText={currentItem.structureRuby} />
              </h2>
              {currentItem.title && currentItem.title !== currentItem.structure && (
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 truncate mt-0.5">
                  {currentItem.title}
                </p>
              )}
              {currentItem.tags && currentItem.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {currentItem.tags.map(tag => <span key={tag} className="rounded-lg bg-sky-100 px-2 py-0.5 text-xs font-bold text-sky-800 dark:bg-sky-900/40 dark:text-sky-200">{tag}</span>)}
                </div>
              )}
            </div>

            <button
              type="button"
              disabled={isPlayingAudio}
              onClick={() => handlePlayAudio(currentItem.structure)}
              className="p-2.5 rounded-2xl bg-gradient-to-r from-violet-600 to-purple-600 text-white shadow-md shadow-violet-500/20 hover:from-violet-700 hover:to-purple-700 active:scale-95 transition-all shrink-0 flex items-center gap-2"
              title="Phát âm cấu trúc"
            >
              <Volume2 className={cn("w-4 h-4", isPlayingAudio && "animate-pulse")} />
              <span className="text-xs font-bold hidden sm:inline">Phát âm</span>
            </button>
          </div>

          {/* 2. TABS SELECTOR */}
          <div className="flex items-center gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-800/60 overflow-x-auto scrollbar-hide">
            <button
              type="button"
              onClick={() => setActiveTab('lesson')}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                activeTab === 'lesson'
                  ? "bg-violet-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Bài học chi tiết</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('summary')}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                activeTab === 'summary'
                  ? "bg-violet-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Cấu trúc & Tóm tắt</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('examples')}
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0",
                activeTab === 'examples'
                  ? "bg-violet-600 text-white shadow-xs"
                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              )}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{currentItem.reviewed ? 'Ví dụ đã chọn' : 'Toàn bộ ví dụ'} ({allExamples.length})</span>
            </button>
          </div>
        </div>

        {/* 3. MODAL BODY SCROLLABLE */}
        <div 
          ref={modalContentRef}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 custom-scrollbar bg-slate-50/50 dark:bg-slate-950/40"
        >
          {/* TAB 1: BÀI HỌC CHI TIẾT */}
          {activeTab === 'lesson' && (
            <div className="space-y-6">
              {isLoadingDetail && (
                <div className="flex items-center justify-center p-12 text-violet-600 dark:text-violet-400 gap-3">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-sm font-semibold">Đang tải toàn bộ bài học chi tiết...</span>
                </div>
              )}

              {/* RENDER HTML ARTICLE BLOCKS FROM TIẾNG NHẬT ĐƠN GIẢN */}
              {currentItem.articleBlocks && currentItem.articleBlocks.length > 0 ? (
                <div className="grammar-article space-y-5">
                  {currentItem.articleBlocks.map((block, idx) => {
                    if (!block.html && !block.text) return null;
                    return (
                      <div 
                        key={idx}
                        className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm"
                      >
                        {block.heading && (
                          <div className="flex items-center gap-2 mb-4 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                            <span className="w-2.5 h-2.5 rounded-full bg-violet-600 shrink-0" />
                            <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                              {block.heading}
                            </h3>
                          </div>
                        )}
                        <div 
                          className="article-content-body text-slate-800 dark:text-slate-200 text-sm leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: block.html }}
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* FALLBACK FOR SHINKANZEN / CUSTOM ITEMS WITHOUT ARTICLE BLOCKS */
                <div className="space-y-4">
                  {/* Cấu trúc & Ý nghĩa */}
                  <div className="bg-white dark:bg-slate-900 rounded-3xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                    <h3 className="text-base font-bold text-violet-600 dark:text-violet-400 mb-2 uppercase tracking-wider text-xs">
                      Ý nghĩa chính
                    </h3>
                    <p className="text-base font-semibold text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      <GrammarRubyText text={currentItem.meaning} rubyText={currentItem.meaningRuby} />
                    </p>

                    {currentItem.formation && (
                      <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-xs font-bold text-slate-500 uppercase block mb-1">
                          Cách kết hợp (Formation)
                        </span>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-2xl font-japanese font-medium text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line">
                          <GrammarRubyText text={currentItem.formation} rubyText={currentItem.formationRuby} />
                        </div>
                      </div>
                    )}

                    {currentItem.nuance && (
                      <div className="mt-4 p-3.5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl text-amber-900 dark:text-amber-200 text-sm">
                        <span className="font-bold block mb-1 text-xs uppercase tracking-wider text-amber-700 dark:text-amber-400">
                          Lưu ý & Sắc thái
                        </span>
                        <p className="whitespace-pre-line font-japanese">
                          <GrammarRubyText text={currentItem.nuance} rubyText={currentItem.nuanceRuby} />
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Multi-blocks if available */}
                  {Array.isArray(currentItem.blocks) && currentItem.blocks.map((b, idx) => (
                    <div key={idx} className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
                      <h4 className="text-sm font-bold text-violet-600 dark:text-violet-400 mb-2">
                        {b.heading || `Ý nghĩa ${['①', '②', '③', '④', '⑤'][idx] || `#${idx + 1}`}`}
                      </h4>
                      {b.meaning && (
                        <p className="mb-3 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                          <GrammarRubyText text={b.meaning} rubyText={b.meaningRuby} />
                        </p>
                      )}
                      {b.formation && (
                        <p className="text-xs font-japanese font-medium text-slate-700 dark:text-slate-300 mb-3 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl whitespace-pre-line">
                          <GrammarRubyText text={b.formation} rubyText={b.formationRuby} />
                        </p>
                      )}
                      {b.nuance && (
                        <p className="text-xs text-amber-800 dark:text-amber-300 mb-3 whitespace-pre-line">
                          <GrammarRubyText text={b.nuance} rubyText={b.nuanceRuby} />
                        </p>
                      )}
                      {Array.isArray(b.examples) && b.examples.map((ex, exIdx) => (
                        <div key={exIdx} className="mt-2 p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800">
                          <span className="mb-1 block text-[11px] font-bold text-slate-500 dark:text-slate-400">Ví dụ {exIdx + 1}{ex.editorial ? ' · đã biên tập/bổ sung' : ''}</span>
                          <p className="font-japanese text-sm font-medium text-slate-900 dark:text-slate-100 whitespace-pre-line">
                            <GrammarRubyText text={ex.jpn} rubyText={ex.ruby} />
                          </p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
                            {ex.vie}
                          </p>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CẤU TRÚC & TÓM TẮT */}
          {activeTab === 'summary' && (
            <div className="space-y-5">
              <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
                {/* Structure highlight */}
                <div className="p-4 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 rounded-2xl border border-violet-100 dark:border-violet-900/40">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 block mb-1">
                    Cấu trúc chính
                  </span>
                  <p className="text-2xl font-black font-japanese text-violet-950 dark:text-violet-100">
                    <GrammarRubyText text={currentItem.structure} rubyText={currentItem.structureRuby} />
                  </p>
                </div>

                {/* Formation */}
                {currentItem.formation && (
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
                      Cách kết hợp (Formation)
                    </span>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 font-japanese font-medium text-sm text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                      <GrammarRubyText text={currentItem.formation} rubyText={currentItem.formationRuby} />
                    </div>
                  </div>
                )}

                {/* Meaning */}
                <div className="border-l-4 border-violet-500 pl-4 py-2 bg-violet-50/40 dark:bg-violet-950/20 rounded-r-2xl">
                  <span className="text-xs font-bold uppercase tracking-wider text-violet-600 dark:text-violet-400 block mb-1">
                    Ý nghĩa tiếng Việt
                  </span>
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line">
                    <GrammarRubyText text={currentItem.meaning} rubyText={currentItem.meaningRuby} />
                  </p>
                </div>

                {/* Nuance */}
                {currentItem.nuance && (
                  <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200/80 dark:border-amber-900/40">
                    <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1.5 mb-1.5">
                      <AlertCircle className="w-4 h-4" /> Lưu ý & Sắc thái
                    </span>
                    <p className="text-xs sm:text-sm text-amber-900 dark:text-amber-200/90 leading-relaxed font-japanese whitespace-pre-line">
                      <GrammarRubyText text={currentItem.nuance} rubyText={currentItem.nuanceRuby} />
                    </p>
                  </div>
                )}

                {/* Books info */}
                {Array.isArray(currentItem.books) && currentItem.books.length > 0 && (
                  <div className="pt-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-2">
                      Sách giáo trình bao hàm
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {currentItem.books.map((b) => (
                        <span
                          key={b}
                          className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
                        >
                          📖 {b}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: TOÀN BỘ VÍ DỤ THỰC TẾ */}
          {activeTab === 'examples' && (
            <div className="space-y-4">
              {/* Search within examples */}
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500 pointer-events-none" />
                <input
                  type="text"
                  value={exampleSearch}
                  onChange={(e) => setExampleSearch(e.target.value)}
                  placeholder={`Tìm kiếm trong ${allExamples.length} câu ví dụ...`}
                  className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-sm font-medium transition-all text-slate-800 dark:text-slate-100 shadow-sm"
                />
                {exampleSearch && (
                  <button
                    type="button"
                    onClick={() => setExampleSearch('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* List examples */}
              {filteredExamples.length === 0 ? (
                <div className="p-8 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
                  <p className="text-sm font-medium text-slate-500">
                    Không tìm thấy câu ví dụ nào khớp với &quot;{exampleSearch}&quot;
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredExamples.map((ex, idx) => (
                    <div 
                      key={idx}
                      className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-violet-300 dark:hover:border-violet-600/40 transition-all flex items-start justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400 text-[11px] font-black flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <p className="font-japanese text-sm sm:text-base font-semibold text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-line">
                            <GrammarRubyText text={ex.jpn} rubyText={ex.ruby} />
                          </p>
                        </div>
                        {ex.vie && (
                          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 pl-7 leading-relaxed">
                            {ex.vie}
                          </p>
                        )}
                      </div>

                      {/* Controls: Audio & Copy */}
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <button
                          type="button"
                          onClick={() => handlePlayAudio(ex.jpn, idx)}
                          disabled={isPlayingAudio}
                          className={cn(
                            "p-2 rounded-xl text-slate-400 hover:text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-all active:scale-95",
                            playingSentenceIdx === idx && "text-violet-600 bg-violet-50 dark:bg-violet-950/40 animate-pulse"
                          )}
                          title="Phát âm câu này"
                        >
                          <Volume2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleCopy(ex.jpn, idx)}
                          className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-95"
                          title="Sao chép câu"
                        >
                          {copiedIdx === idx ? (
                            <Check className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 4. MODAL FOOTER NAVIGATION */}
        <div className="shrink-0 p-3.5 sm:px-6 sm:py-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between gap-3">
          <button
            type="button"
            disabled={!hasPrev}
            onClick={() => hasPrev && onNavigate(allGrammars[currentIndex - 1])}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-40 disabled:pointer-events-none transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Bài trước</span>
          </button>

          <span className="text-xs font-semibold text-slate-400 hidden sm:inline">
            Dùng phím mũi tên ← và → để chuyển bài
          </span>

          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => { onClose(); onEdit(currentItem); }}
                className="px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm text-violet-600 hover:bg-violet-50 dark:hover:bg-violet-950/40 transition-colors"
              >
                Chỉnh sửa
              </button>
            )}

            <button
              type="button"
              disabled={!hasNext}
              onClick={() => hasNext && onNavigate(allGrammars[currentIndex + 1])}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:pointer-events-none transition-colors shadow-sm shadow-violet-500/20"
            >
              <span className="hidden sm:inline">Bài tiếp theo</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
