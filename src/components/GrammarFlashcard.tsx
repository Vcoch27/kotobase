'use client';

import React, { useState } from 'react';
import { Volume2, ArrowRight, ArrowLeft } from 'lucide-react';

interface GrammarItem {
  id: string;
  structure: string;
  formation?: string;
  meaning: string;
  nuance?: string;
  example?: string;
  exampleMeaning?: string;
  jlptLevel?: string;
}

interface GrammarFlashcardProps {
  grammars: GrammarItem[];
}

export function GrammarFlashcard({ grammars }: GrammarFlashcardProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [stats, setStats] = useState({ known: 0, review: 0 });

  if (grammars.length === 0) {
    return (
      <div className="text-center p-10 bg-white dark:bg-slate-900 rounded-2xl">
        <p className="text-slate-500">Không có dữ liệu ngữ pháp để học.</p>
      </div>
    );
  }

  if (showResult) {
    return (
      <div className="text-center p-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">Kết quả Ôn Tập</h2>
        <div className="flex justify-center gap-8 mb-8">
          <div className="text-center">
            <div className="text-4xl font-black text-emerald-500 mb-2">{stats.known}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Đã thuộc</div>
          </div>
          <div className="text-center">
            <div className="text-4xl font-black text-amber-500 mb-2">{stats.review}</div>
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Cần ôn lại</div>
          </div>
        </div>
        <button 
          onClick={() => {
            setCurrentIndex(0);
            setIsFlipped(false);
            setShowResult(false);
            setStats({ known: 0, review: 0 });
          }}
          className="px-6 py-3 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-bold transition-all shadow-lg"
        >
          Học lại từ đầu
        </button>
      </div>
    );
  }

  const current = grammars[currentIndex];
  const progress = ((currentIndex) / grammars.length) * 100;

  const nextCard = (isKnown: boolean) => {
    if (isKnown) setStats(s => ({ ...s, known: s.known + 1 }));
    else setStats(s => ({ ...s, review: s.review + 1 }));

    if (currentIndex < grammars.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      setShowResult(true);
    }
  };

  const playAudio = (text: string) => {
    // Basic TTS fallback
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'ja-JP';
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  return (
    <div className="max-w-xl mx-auto flex flex-col items-center">
      <div className="w-full mb-6">
        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2">
          <span>Tiến độ</span>
          <span>{currentIndex + 1} / {grammars.length}</span>
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-violet-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div 
        className={`w-full min-h-[350px] cursor-pointer perspective-1000 ${isFlipped ? '[&>div]:rotate-y-180' : ''}`}
        onClick={() => !isFlipped && setIsFlipped(true)}
      >
        <div className="relative w-full h-full transition-transform duration-500 preserve-3d">
          
          {/* MẶT TRƯỚC */}
          <div className="absolute inset-0 backface-hidden bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col items-center justify-center p-8">
            {current.jlptLevel && (
              <span className="absolute top-4 right-4 px-3 py-1 bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 font-bold rounded-lg text-sm">
                {current.jlptLevel}
              </span>
            )}
            <h2 className="text-4xl md:text-5xl font-bold font-japanese text-center mb-4 text-slate-800 dark:text-slate-100">
              {current.structure}
            </h2>
            <p className="text-sm font-semibold text-slate-400 mt-6 animate-pulse">
              Chạm để lật thẻ
            </p>
          </div>

          {/* MẶT SAU */}
          <div className="absolute inset-0 backface-hidden rotate-y-180 bg-white dark:bg-slate-900 rounded-3xl border-2 border-violet-200 dark:border-violet-500/30 shadow-xl flex flex-col p-6 md:p-8 overflow-y-auto custom-scrollbar">
            <h3 className="text-2xl font-bold font-japanese text-violet-600 dark:text-violet-400 mb-2 text-center">
              {current.structure}
            </h3>
            
            <div className="text-lg font-semibold text-center text-slate-700 dark:text-slate-200 mb-4 pb-4 border-b border-slate-100 dark:border-slate-800">
              {current.meaning}
            </div>

            <div className="space-y-4 flex-1">
              {current.formation && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Cách chia</div>
                  <div className="font-japanese text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">{current.formation}</div>
                </div>
              )}
              
              {current.nuance && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Chú ý</div>
                  <div className="text-sm text-slate-600 dark:text-slate-300">{current.nuance}</div>
                </div>
              )}

              {current.example && (
                <div>
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>Ví dụ</span>
                    <button 
                      onClick={(e) => { e.stopPropagation(); playAudio(current.example || ''); }}
                      className="p-1.5 rounded-lg bg-violet-100 text-violet-600 hover:bg-violet-200 transition-colors"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">
                    <p className="font-japanese text-slate-800 dark:text-slate-100 mb-1">{current.example}</p>
                    {current.exampleMeaning && (
                      <p className="text-sm text-slate-500 dark:text-slate-400">{current.exampleMeaning}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {isFlipped && (
        <div className="flex gap-4 mt-8 w-full max-w-sm animate-slideUp">
          <button 
            onClick={() => nextCard(false)}
            className="flex-1 py-3.5 rounded-2xl bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold hover:bg-amber-200 dark:hover:bg-amber-500/30 transition-colors border border-amber-200 dark:border-amber-500/20 flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" /> Ôn lại
          </button>
          <button 
            onClick={() => nextCard(true)}
            className="flex-1 py-3.5 rounded-2xl bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold hover:bg-emerald-200 dark:hover:bg-emerald-500/30 transition-colors border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center gap-2"
          >
            Đã thuộc <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
