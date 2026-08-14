"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ClickableKanjiString } from "./ClickableKanjiString";
import { 
  RotateCcw, Shuffle, ArrowLeft, ArrowRight, X, Check, 
  Rotate3D, GraduationCap, LayoutList, RefreshCcw, BrainCircuit, Undo2
} from "lucide-react";
import { 
  AnkiRating, AnkiCardData, DEFAULT_ANKI_DATA, 
  calculateNextReview, loadAnkiProgress, saveAnkiProgress, formatInterval 
} from "@/lib/anki-utils";

interface VocabularyData {
  id: string;
  word: string;
  meaning: string;
  reading?: string | null;
  sinoVietnamese?: string | null;
  example?: string | null;
}

interface FlashcardViewProps {
  vocabularies: VocabularyData[];
}

type StudyMode = "normal" | "progress" | "anki";

// Fisher-Yates Shuffle
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export function FlashcardView({ vocabularies }: FlashcardViewProps) {
  const [mode, setMode] = useState<StudyMode>("normal");
  const [deck, setDeck] = useState<VocabularyData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Progress tracking
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [unknownIds, setUnknownIds] = useState<Set<string>>(new Set());

  // Anki tracking
  const [ankiProgress, setAnkiProgress] = useState<Record<string, AnkiCardData>>({});
  const [ankiStats, setAnkiStats] = useState({ new: 0, due: 0 });
  const [ankiHistory, setAnkiHistory] = useState<Record<string, AnkiCardData>[]>([]);

  // Initialization
  useEffect(() => {
    if (vocabularies.length > 0) {
      if (mode === "anki") {
        const progress = loadAnkiProgress();
        setAnkiProgress(progress);
        
        const now = Date.now();
        const ankiDeck = vocabularies.filter(v => {
          const p = progress[v.id];
          if (!p) return true; // New card
          if (p.nextReview <= now) return true; // Due card
          return false;
        });
        
        setDeck(ankiDeck);
        // Calculate stats
        let newCount = 0;
        let dueCount = 0;
        ankiDeck.forEach(v => {
          if (!progress[v.id]) newCount++;
          else dueCount++;
        });
        setAnkiStats({ new: newCount, due: dueCount });
      } else {
        setDeck(vocabularies);
      }
      
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsFinished(false);
      setKnownIds(new Set());
      setUnknownIds(new Set());
    } else {
      setDeck([]);
    }
  }, [vocabularies, mode]);

  // Actions
  const flipCard = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      setIsFlipped(false);
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
        setIsTransitioning(false);
      }, 150);
    } else {
      setIsFinished(true);
    }
  }, [currentIndex, deck.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentIndex]);

  const handleProgress = useCallback((isKnown: boolean) => {
    const currentVocab = deck[currentIndex];
    if (isKnown) {
      setKnownIds((prev) => new Set(prev).add(currentVocab.id));
      setUnknownIds((prev) => {
        const next = new Set(prev);
        next.delete(currentVocab.id);
        return next;
      });
    } else {
      setUnknownIds((prev) => new Set(prev).add(currentVocab.id));
      setKnownIds((prev) => {
        const next = new Set(prev);
        next.delete(currentVocab.id);
        return next;
      });
    }
    handleNext();
  }, [currentIndex, deck, handleNext]);

  const handleAnkiRate = useCallback((rating: AnkiRating) => {
    const currentVocab = deck[currentIndex];
    if (!currentVocab) return;
    
    // Lưu lịch sử trước khi thay đổi
    setAnkiHistory(prev => [...prev, ankiProgress]);
    
    const currentProgress = ankiProgress[currentVocab.id] || { ...DEFAULT_ANKI_DATA };
    const newProgressData = calculateNextReview(rating, currentProgress);
    
    const newAnkiProgress = {
      ...ankiProgress,
      [currentVocab.id]: newProgressData
    };
    
    setAnkiProgress(newAnkiProgress);
    saveAnkiProgress(newAnkiProgress);
    
    handleNext();
  }, [currentIndex, deck, ankiProgress, handleNext]);

  const handleUndo = useCallback(() => {
    if (isFinished) {
      setIsFinished(false);
      // Revert Anki history for the last card
      if (mode === "anki" && ankiHistory.length > 0) {
        const prevProgress = ankiHistory[ankiHistory.length - 1];
        setAnkiProgress(prevProgress);
        saveAnkiProgress(prevProgress);
        setAnkiHistory(prev => prev.slice(0, -1));
      }
      return;
    }
    
    if (currentIndex > 0) {
      // Revert Anki history for the current card we are stepping back TO
      if (mode === "anki" && ankiHistory.length > 0) {
        const prevProgress = ankiHistory[ankiHistory.length - 1];
        setAnkiProgress(prevProgress);
        saveAnkiProgress(prevProgress);
        setAnkiHistory(prev => prev.slice(0, -1));
      }
      
      setIsFlipped(false);
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentIndex((prev) => prev - 1);
        setIsTransitioning(false);
      }, 150);
    }
  }, [currentIndex, mode, ankiHistory, isFinished]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (isFinished || deck.length === 0) return;

      switch (e.key) {
        case " ":
        case "Spacebar":
        case "ArrowUp":
        case "ArrowDown":
          e.preventDefault();
          flipCard();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (mode === "normal") handleNext();
          else if (mode === "progress") handleProgress(true);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (mode === "normal") handlePrev();
          else if (mode === "progress") handleProgress(false);
          break;
        case "1":
          if (mode === "anki" && isFlipped) { e.preventDefault(); handleAnkiRate("again"); }
          break;
        case "2":
          if (mode === "anki" && isFlipped) { e.preventDefault(); handleAnkiRate("hard"); }
          break;
        case "3":
          if (mode === "anki" && isFlipped) { e.preventDefault(); handleAnkiRate("good"); }
          break;
        case "4":
          if (mode === "anki" && isFlipped) { e.preventDefault(); handleAnkiRate("easy"); }
          break;
        case "Backspace":
          e.preventDefault();
          handleUndo();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFinished, deck.length, mode, handleNext, handlePrev, handleProgress, handleAnkiRate, handleUndo, flipCard, isFlipped]);

  // Restart Logic
  const restartAll = () => {
    setDeck(vocabularies); // Normal mode behavior
    // If anki mode, it should ideally re-fetch from local storage.
    if (mode === "anki") {
      const progress = loadAnkiProgress();
      setAnkiProgress(progress);
      
      const now = Date.now();
      const ankiDeck = vocabularies.filter(v => {
        const p = progress[v.id];
        if (!p) return true;
        if (p.nextReview <= now) return true;
        return false;
      });
      setDeck(ankiDeck);
    }
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
    setKnownIds(new Set());
    setUnknownIds(new Set());
  };

  const shuffleAll = () => {
    setDeck(prev => shuffleArray(prev));
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
  };

  const studyUnknowns = () => {
    const unknowns = vocabularies.filter(v => unknownIds.has(v.id));
    setDeck(shuffleArray(unknowns));
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
    // Giữ nguyên knownIds nhưng reset unknownIds cho lượt này
    setUnknownIds(new Set());
  };

  if (vocabularies.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
        <GraduationCap className="w-10 h-10 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
        <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Không có dữ liệu Flashcard</p>
        <p className="text-xs text-slate-500 mt-1">Hãy thêm từ vựng vào thư mục này để bắt đầu học.</p>
      </div>
    );
  }

  if (mode === "anki" && deck.length === 0) {
    return (
      <div className="p-16 text-center bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 animate-fadeIn transition-colors">
        <BrainCircuit className="w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] text-emerald-500 dark:text-emerald-400" />
        <p className="text-xl font-bold text-slate-800 dark:text-slate-100">Bạn đã ôn xong cho hiện tại!</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Không còn thẻ nào đến hạn trong thư mục này. Hãy quay lại sau nhé.</p>
        <button 
          onClick={() => setMode("normal")}
          className="mt-6 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-all"
        >
          Trở về Mode Bình thường
        </button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-8 shadow-2xl animate-fadeIn text-center transition-colors">
        <GraduationCap className="w-16 h-16 mx-auto mb-4 text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]" />
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">Đã hoàn thành!</h2>
        
        {mode === "anki" ? (
          <p className="text-slate-500 dark:text-slate-400 mb-8">Bạn đã ôn xong toàn bộ thẻ đến hạn hôm nay.</p>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 mb-8">Bạn đã đi qua hết {deck.length} thẻ trong danh sách này.</p>
        )}
        
        {mode === "progress" && (
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{knownIds.size}</div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Đã thuộc</div>
            </div>
            <div className="w-px bg-slate-200 dark:bg-slate-800"></div>
            <div className="text-center">
              <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{unknownIds.size}</div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">Chưa nhớ</div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          {mode === "progress" && unknownIds.size > 0 && (
            <button 
              onClick={studyUnknowns}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all"
            >
              <RefreshCcw className="w-5 h-5" /> Tiếp tục học các từ chưa nhớ ({unknownIds.size})
            </button>
          )}
          {mode !== "anki" && (
            <button 
              onClick={restartAll}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all"
            >
              <RotateCcw className="w-5 h-5" /> Bắt đầu lại từ đầu
            </button>
          )}
        </div>
      </div>
    );
  }

  const currentVocab = deck[currentIndex];
  
  if (!currentVocab) {
    return null;
  }

  const progressPercent = ((currentIndex) / deck.length) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 animate-fadeIn">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-2xl shadow-lg transition-colors">
        <div className="flex items-center bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setMode("normal")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === "normal"
                ? "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <LayoutList className="w-4 h-4" /> Bình thường
          </button>
          <button
            onClick={() => setMode("progress")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === "progress"
                ? "bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-400 shadow border border-indigo-200 dark:border-indigo-500/20"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Tiến độ
          </button>
          <button
            onClick={() => setMode("anki")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === "anki"
                ? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 shadow border border-rose-200 dark:border-rose-500/20"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <BrainCircuit className="w-4 h-4" /> Anki (SRS)
          </button>
        </div>

        <div className="flex items-center gap-2">
          {mode !== "normal" && (
            <button 
              onClick={handleUndo} 
              disabled={currentIndex === 0 && !isFinished}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all disabled:opacity-30 disabled:hover:text-slate-400 disabled:hover:bg-transparent" 
              title="Quay lại (Undo) - Phím Backspace"
            >
              <Undo2 className="w-5 h-5" />
            </button>
          )}
          {mode !== "anki" && (
            <button onClick={shuffleAll} className="p-2 text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 rounded-lg transition-all" title="Trộn thẻ (Shuffle)">
              <Shuffle className="w-5 h-5" />
            </button>
          )}
          <button onClick={restartAll} className="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all" title="Bắt đầu lại / Refresh">
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full">
        <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 px-1">
          <span>{currentIndex + 1} / {deck.length}</span>
          {mode === "progress" && (
            <span className="flex gap-4">
              <span className="text-emerald-600 dark:text-emerald-400">Thuộc: {knownIds.size}</span>
              <span className="text-rose-600 dark:text-rose-400">Chưa: {unknownIds.size}</span>
            </span>
          )}
          {mode === "anki" && (
            <span className="flex gap-4">
              <span className="text-sky-600 dark:text-sky-400">Mới: {ankiStats.new}</span>
              <span className="text-rose-600 dark:text-rose-400">Đến hạn: {ankiStats.due}</span>
            </span>
          )}
        </div>
        <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-300 ease-out rounded-full" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Flashcard 3D Container */}
      <div 
        key={currentVocab.id}
        className={`relative w-full aspect-[4/3] md:aspect-[16/9] perspective-1000 cursor-pointer ${
          isTransitioning ? "animate-fadeOut" : "animate-fadeIn"
        }`} 
        onClick={flipCard}
      >
        <div 
          className={`w-full h-full relative transition-transform duration-500 transform-style-3d shadow-2xl rounded-3xl ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* Front */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-3xl flex flex-col items-center justify-center p-8 text-center transition-colors">
            <span className="absolute top-6 left-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Rotate3D className="w-4 h-4" /> Bấm để lật
            </span>
            <div className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-wide" onClick={(e) => e.stopPropagation()}>
              <ClickableKanjiString text={currentVocab.word} />
            </div>
            {currentVocab.sinoVietnamese && (
              <div className="mt-8 text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">
                {currentVocab.sinoVietnamese}
              </div>
            )}
          </div>

          {/* Back */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl flex flex-col items-center justify-center p-8 text-center rotate-y-180 transition-colors">
            <span className="absolute top-6 left-6 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Rotate3D className="w-4 h-4" /> Bấm để lật
            </span>
            
            {currentVocab.reading && (
              <div className="text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                {currentVocab.reading}
              </div>
            )}
            
            <div className="text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-6">
              {currentVocab.meaning}
            </div>

            {currentVocab.example && (
              <div className="mt-4 p-4 bg-white/50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 w-full max-w-lg">
                <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Ví dụ minh họa</span>
                <p className="text-base text-slate-700 dark:text-slate-300 italic">{currentVocab.example}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls Footer */}
      <div className="flex items-center justify-center gap-4 mt-2">
        {mode === "anki" ? (
          <div className="w-full max-w-xl mx-auto flex items-center gap-2 md:gap-4">
            {!isFlipped ? (
               <div className="w-full text-center text-slate-500 dark:text-slate-400 text-sm font-semibold h-16 flex items-center justify-center">
                  Bấm lật thẻ hoặc [Space] để hiện kết quả
               </div>
            ) : (() => {
              const p = ankiProgress[currentVocab.id] || { ...DEFAULT_ANKI_DATA };
              const tAgain = calculateNextReview("again", p);
              const tHard = calculateNextReview("hard", p);
              const tGood = calculateNextReview("good", p);
              const tEasy = calculateNextReview("easy", p);

              return (
                <>
                  <button onClick={() => handleAnkiRate("again")} className="flex-1 py-3 rounded-2xl font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent border-b-4 border-b-rose-500 text-slate-900 dark:text-white flex flex-col items-center gap-1 active:translate-y-1 active:border-b transition-all shadow-sm">
                    <span className="text-rose-600 dark:text-rose-400 text-[10px] uppercase tracking-wider">Lại (1)</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{formatInterval(tAgain.interval)}</span>
                  </button>
                  <button onClick={() => handleAnkiRate("hard")} className="flex-1 py-3 rounded-2xl font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent border-b-4 border-b-amber-500 text-slate-900 dark:text-white flex flex-col items-center gap-1 active:translate-y-1 active:border-b transition-all shadow-sm">
                    <span className="text-amber-600 dark:text-amber-400 text-[10px] uppercase tracking-wider">Khó (2)</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{formatInterval(tHard.interval)}</span>
                  </button>
                  <button onClick={() => handleAnkiRate("good")} className="flex-1 py-3 rounded-2xl font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent border-b-4 border-b-emerald-500 text-slate-900 dark:text-white flex flex-col items-center gap-1 active:translate-y-1 active:border-b transition-all shadow-sm">
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] uppercase tracking-wider">Tốt (3)</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{formatInterval(tGood.interval)}</span>
                  </button>
                  <button onClick={() => handleAnkiRate("easy")} className="flex-1 py-3 rounded-2xl font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent border-b-4 border-b-sky-500 text-slate-900 dark:text-white flex flex-col items-center gap-1 active:translate-y-1 active:border-b transition-all shadow-sm">
                    <span className="text-sky-600 dark:text-sky-400 text-[10px] uppercase tracking-wider">Dễ (4)</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{formatInterval(tEasy.interval)}</span>
                  </button>
                </>
              )
            })()}
          </div>
        ) : mode === "normal" ? (
          <>
            <button 
              onClick={handlePrev} 
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 md:px-6 py-3 rounded-2xl font-bold transition-all disabled:opacity-30 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white hover:bg-slate-50 dark:bg-transparent dark:hover:bg-slate-800 border border-slate-200 dark:border-transparent hover:border-slate-300 dark:hover:border-slate-700 shadow-sm dark:shadow-none"
            >
              <ArrowLeft className="w-5 h-5" /> Trước <span className="hidden sm:inline">(Left)</span>
            </button>
            <button 
              onClick={handleNext}
              className="flex items-center gap-2 px-6 md:px-8 py-3 rounded-2xl font-bold transition-all text-white dark:text-slate-900 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-400 dark:hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              Tiếp theo <span className="hidden sm:inline">(Right)</span> <ArrowRight className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => handleProgress(false)}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 active:scale-95 w-40 justify-center shadow-sm"
            >
              <X className="w-6 h-6" /> Chưa (Left)
            </button>
            <button 
              onClick={() => handleProgress(true)}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all text-white dark:text-emerald-900 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-400 dark:hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 active:scale-95 w-40 justify-center"
            >
              <Check className="w-6 h-6" /> Đã thuộc (Right)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
