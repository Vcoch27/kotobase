'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Volume2, ArrowRight, ArrowLeft, RefreshCw, Layers } from 'lucide-react';
import { playAudio as playTTSAudio } from '@/lib/tts-utils';

interface Vocab { word: string; reading?: string; meaning: string; }
interface Grammar { grammar: string; meaning: string; }

interface SentenceItem {
  id: string;
  japanese: string;
  meaning: string;
  vocabularies: Vocab[] | any;
  grammars: Grammar[] | any;
  note: string | null;
}

interface SentenceFlashcardProps {
  sentences: SentenceItem[];
  mode: 'normal' | 'listening';
}

// ─────────────────────────────────────────────────────────────────
// Hàm highlight từ vựng/ngữ pháp trong câu tiếng Nhật
// Sort theo độ dài giảm dần để tránh match thiếu (e.g. "飲ん" trước "飲")
// ─────────────────────────────────────────────────────────────────
function buildHighlightTokens(sentence: string, vocabs: Vocab[], grammars: Grammar[]) {
  const tokens: Array<{ text: string; type: 'vocab' | 'grammar' | 'none' }> = [];
  const vocabWords = vocabs.map(v => v.word).filter(Boolean).sort((a, b) => b.length - a.length);
  const grammarWords = grammars.map(g => g.grammar).filter(Boolean).sort((a, b) => b.length - a.length);
  let remaining = sentence;

  while (remaining.length > 0) {
    let matched = false;

    for (const g of grammarWords) {
      if (remaining.startsWith(g)) {
        tokens.push({ text: g, type: 'grammar' });
        remaining = remaining.slice(g.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    for (const v of vocabWords) {
      if (remaining.startsWith(v)) {
        tokens.push({ text: v, type: 'vocab' });
        remaining = remaining.slice(v.length);
        matched = true;
        break;
      }
    }
    if (matched) continue;

    const last = tokens[tokens.length - 1];
    if (last && last.type === 'none') {
      last.text += remaining[0];
    } else {
      tokens.push({ text: remaining[0], type: 'none' });
    }
    remaining = remaining.slice(1);
  }

  return tokens;
}

export function SentenceFlashcard({ sentences, mode }: SentenceFlashcardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(null);
  const [touchEnd, setTouchEnd] = useState<{ x: number; y: number } | null>(null);
  const autoPlayedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsTransitioning(false);
    autoPlayedRef.current = new Set();
    setIsPlayingAudio(false);
  }, [sentences, mode]);

  const currentCard = sentences[currentIndex];
  const vocabs: Vocab[] = Array.isArray(currentCard?.vocabularies) ? currentCard.vocabularies : [];
  const grammars: Grammar[] = Array.isArray(currentCard?.grammars) ? currentCard.grammars : [];

  // ── Actions ──────────────────────────────────────────────────────
  const flipCard = useCallback(() => setIsFlipped(prev => !prev), []);

  const handleNext = useCallback(() => {
    if (currentIndex < sentences.length - 1) {
      setIsFlipped(false);
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(p => p + 1);
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentIndex, sentences.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex(p => p - 1);
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentIndex]);

  const playAudio = useCallback(async () => {
    if (!currentCard) return;
    setIsPlayingAudio(true);
    try {
      await playTTSAudio(currentCard.japanese);
    } finally {
      setTimeout(() => setIsPlayingAudio(false), 2500);
    }
  }, [currentCard]);

  // Auto-play khi Chế độ Nghe
  useEffect(() => {
    if (mode !== 'listening' || !currentCard) return;
    if (autoPlayedRef.current.has(currentIndex)) return;
    autoPlayedRef.current.add(currentIndex);
    const timer = setTimeout(async () => {
      setIsPlayingAudio(true);
      try {
        await playTTSAudio(currentCard.japanese);
      } finally {
        setTimeout(() => setIsPlayingAudio(false), 2500);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [mode, currentIndex, currentCard]);

  // ── Keyboard ─────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (sentences.length === 0) return;
      switch (e.key) {
        case ' ':
        case 'ArrowUp':
        case 'ArrowDown':
          e.preventDefault(); flipCard(); break;
        case 'ArrowRight':
        case 'Enter':
          e.preventDefault(); handleNext(); break;
        case 'ArrowLeft':
          e.preventDefault(); handlePrev(); break;
        case 'v':
        case 'V':
          e.preventDefault(); playAudio(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flipCard, handleNext, handlePrev, playAudio, sentences.length]);

  // ── Swipe ────────────────────────────────────────────────────────
  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.targetTouches[0];
    setTouchStart({ x: t.clientX, y: t.clientY });
    setTouchEnd({ x: t.clientX, y: t.clientY });
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const dx = touchStart.x - touchEnd.x;
    const dy = touchStart.y - touchEnd.y;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx > 0) handleNext(); else handlePrev();
    }
    setTouchStart(null); setTouchEnd(null);
  };

  // ── Render ───────────────────────────────────────────────────────
  if (sentences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-slate-400 dark:text-slate-500 gap-3">
        <Layers className="w-12 h-12 opacity-30" />
        <p className="text-sm font-medium">Không có mẫu câu để học.</p>
      </div>
    );
  }

  const highlightTokens = currentCard ? buildHighlightTokens(currentCard.japanese, vocabs, grammars) : [];

  return (
    <div className="flex flex-col items-center w-full max-w-3xl mx-auto animate-fadeIn">

      {/* ─ Progress bar ─ */}
      <div className="mb-5 flex justify-between w-full items-center gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full tabular-nums shrink-0">
            {currentIndex + 1} / {sentences.length}
          </span>
          <div className="hidden sm:flex items-center gap-0.5 overflow-hidden flex-1">
            {sentences.slice(0, 40).map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all duration-300 flex-1 ${
                i === currentIndex ? 'bg-indigo-500' : i < currentIndex ? 'bg-indigo-300 dark:bg-indigo-700' : 'bg-slate-200 dark:bg-slate-700'
              }`} />
            ))}
          </div>
        </div>
        <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full shrink-0 ${
          mode === 'listening'
            ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400'
        }`}>
          {mode === 'listening' ? <Volume2 className="w-3.5 h-3.5" /> : <Layers className="w-3.5 h-3.5" />}
          {mode === 'listening' ? 'Chế độ Nghe' : 'Bình thường'}
        </div>
      </div>

      {/* ─ Card ─ */}
      <div
        className="relative w-full cursor-pointer select-none"
        style={{ perspective: '1200px', minHeight: '340px' }}
        onClick={flipCard}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className={`relative w-full transition-all duration-500 ${isTransitioning ? 'opacity-0 scale-[0.97]' : 'opacity-100 scale-100'}`}
          style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)', minHeight: '340px' }}
        >

          {/* ─ Mặt trước ─ */}
          <div
            className="absolute inset-0 rounded-3xl border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-900 shadow-lg flex flex-col items-center justify-center p-6 md:p-10 gap-4"
            style={{ backfaceVisibility: 'hidden', minHeight: '340px' }}
          >
            {mode === 'listening' ? (
              <div className="text-center space-y-5">
                <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto transition-all duration-300 ${
                  isPlayingAudio ? 'bg-amber-100 dark:bg-amber-500/20 scale-110 shadow-lg shadow-amber-500/20' : 'bg-slate-100 dark:bg-slate-800'
                }`}>
                  <Volume2 className={`w-9 h-9 transition-colors ${isPlayingAudio ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
                </div>
                <p className="text-sm text-slate-400 dark:text-slate-500">
                  {isPlayingAudio ? 'Đang phát âm...' : 'Nhấn [V] hoặc nút loa để nghe câu'}
                </p>
              </div>
            ) : (
              <>
                {/* Câu có highlight */}
                <div className="text-center leading-loose text-2xl md:text-[28px] font-bold text-slate-800 dark:text-slate-100 tracking-wide">
                  {highlightTokens.map((token, i) =>
                    token.type === 'vocab' ? (
                      <span key={i} className="text-indigo-500 dark:text-indigo-400 underline underline-offset-4 decoration-2 decoration-indigo-300 dark:decoration-indigo-600/60">
                        {token.text}
                      </span>
                    ) : token.type === 'grammar' ? (
                      <span key={i} className="text-emerald-500 dark:text-emerald-400 underline underline-offset-4 decoration-2 decoration-emerald-300 dark:decoration-emerald-600/60">
                        {token.text}
                      </span>
                    ) : (
                      <span key={i}>{token.text}</span>
                    )
                  )}
                </div>
                {/* Legend */}
                {(vocabs.length > 0 || grammars.length > 0) && (
                  <div className="flex items-center gap-2 mt-1">
                    {vocabs.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" /> Từ vựng
                      </span>
                    )}
                    {grammars.length > 0 && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Ngữ pháp
                      </span>
                    )}
                  </div>
                )}
              </>
            )}
            <p className="absolute bottom-4 text-[10px] text-slate-300 dark:text-slate-600 tracking-widest uppercase">
              Nhấn để lật • Vuốt để đổi thẻ
            </p>
          </div>

          {/* ─ Mặt sau ─ */}
          <div
            className="absolute inset-0 rounded-3xl border border-indigo-100 dark:border-slate-700/60 bg-gradient-to-br from-white to-indigo-50/40 dark:from-slate-800 dark:to-indigo-900/10 shadow-lg overflow-y-auto custom-scrollbar"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', minHeight: '340px' }}
          >
            <div className="p-6 md:p-8 flex flex-col gap-4 min-h-full justify-center">

              {/* Câu tiếng Nhật (chế độ Nghe) */}
              {mode === 'listening' && (
                <div className="text-center text-xl font-bold text-slate-800 dark:text-slate-100 leading-loose border-b border-slate-200 dark:border-slate-700 pb-4">
                  {currentCard.japanese}
                </div>
              )}

              {/* Nghĩa */}
              <div className="text-center">
                <p className="text-lg md:text-xl font-semibold text-indigo-600 dark:text-indigo-400 leading-relaxed">
                  {currentCard.meaning}
                </p>
              </div>

              {/* 2 cột: Từ vựng + Ngữ pháp */}
              {(vocabs.length > 0 || grammars.length > 0) && (
                <div className={`grid gap-3 ${vocabs.length > 0 && grammars.length > 0 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-sm mx-auto w-full'}`}>

                  {vocabs.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-indigo-100 dark:border-indigo-500/20 shadow-sm">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-indigo-100 dark:border-indigo-500/20">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 shrink-0" />
                        <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">Từ vựng</span>
                      </div>
                      <ul className="space-y-2">
                        {vocabs.map((v, i) => (
                          <li key={i} className="text-sm leading-snug">
                            <span className="font-bold text-slate-800 dark:text-slate-100">{v.word}</span>
                            {v.reading && <span className="text-[11px] text-indigo-500 dark:text-indigo-400 ml-1">({v.reading})</span>}
                            <span className="text-slate-500 dark:text-slate-400 text-[12px] ml-1">— {v.meaning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {grammars.length > 0 && (
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-500/20 shadow-sm">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-emerald-100 dark:border-emerald-500/20">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest">Ngữ pháp</span>
                      </div>
                      <ul className="space-y-2">
                        {grammars.map((g, i) => (
                          <li key={i} className="text-sm leading-snug">
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{g.grammar}</span>
                            <span className="text-slate-500 dark:text-slate-400 text-[12px] ml-1">— {g.meaning}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                </div>
              )}

              {currentCard.note && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 italic bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2">
                  💡 {currentCard.note}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ─ Controls ─ */}
      <div className="mt-7 flex items-center justify-center gap-3">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          title="Thẻ trước [←]"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        <button
          onClick={playAudio}
          className={`px-5 py-3.5 rounded-2xl text-white font-bold text-sm flex items-center gap-2 transition-all shadow-lg ${
            isPlayingAudio ? 'bg-amber-500 shadow-amber-500/30 scale-105' : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/30 hover:scale-105'
          }`}
          title="Phát âm [V]"
        >
          <Volume2 className={`w-5 h-5 ${isPlayingAudio ? 'animate-pulse' : ''}`} />
          <span className="hidden sm:inline">Nghe câu</span>
        </button>

        <button
          onClick={flipCard}
          className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          title="Lật thẻ [Space]"
        >
          <RefreshCw className="w-5 h-5" />
        </button>

        <button
          onClick={handleNext}
          disabled={currentIndex === sentences.length - 1}
          className="p-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-500 disabled:opacity-30 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          title="Thẻ tiếp theo [→]"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
      </div>

      <p className="mt-4 text-[10px] text-slate-300 dark:text-slate-600 font-mono tracking-wider text-center">
        [Space] Lật • [V] Nghe • [←] [→] Đổi thẻ • Vuốt trên mobile
      </p>
    </div>
  );
}
