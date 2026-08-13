"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ClickableKanjiString } from "./ClickableKanjiString";
import { 
  RotateCcw, Shuffle, ArrowLeft, ArrowRight, X, Check, 
  Rotate3D, GraduationCap, LayoutList, RefreshCcw 
} from "lucide-react";

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

type StudyMode = "normal" | "progress";

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

  // Progress tracking
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [unknownIds, setUnknownIds] = useState<Set<string>>(new Set());

  // Initialization
  useEffect(() => {
    if (vocabularies.length > 0) {
      setDeck(vocabularies);
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsFinished(false);
      setKnownIds(new Set());
      setUnknownIds(new Set());
    } else {
      setDeck([]);
    }
  }, [vocabularies]);

  // Actions
  const flipCard = useCallback(() => {
    setIsFlipped((prev) => !prev);
  }, []);

  const handleNext = useCallback(() => {
    if (currentIndex < deck.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((prev) => prev + 1), 150);
    } else {
      setIsFinished(true);
    }
  }, [currentIndex, deck.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex((prev) => prev - 1), 150);
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
          else handleProgress(true);
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (mode === "normal") handlePrev();
          else handleProgress(false);
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFinished, deck.length, mode, handleNext, handlePrev, handleProgress, flipCard]);

  // Restart Logic
  const restartAll = () => {
    setDeck(vocabularies);
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
    setKnownIds(new Set());
    setUnknownIds(new Set());
  };

  const shuffleAll = () => {
    setDeck(shuffleArray(vocabularies));
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
    setKnownIds(new Set());
    setUnknownIds(new Set());
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
      <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400">
        <GraduationCap className="w-10 h-10 mx-auto mb-3 text-slate-600" />
        <p className="text-base font-semibold text-slate-300">Không có dữ liệu Flashcard</p>
        <p className="text-xs text-slate-500 mt-1">Hãy thêm từ vựng vào thư mục này để bắt đầu học.</p>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-slate-900 border border-slate-700/80 rounded-3xl p-8 shadow-2xl animate-fadeIn text-center">
        <GraduationCap className="w-16 h-16 mx-auto mb-4 text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]" />
        <h2 className="text-2xl font-black text-white mb-2">Đã hoàn thành!</h2>
        <p className="text-slate-400 mb-8">Bạn đã đi qua hết {deck.length} thẻ trong danh sách này.</p>
        
        {mode === "progress" && (
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-3xl font-black text-emerald-400">{knownIds.size}</div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Đã thuộc</div>
            </div>
            <div className="w-px bg-slate-800"></div>
            <div className="text-center">
              <div className="text-3xl font-black text-rose-400">{unknownIds.size}</div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mt-1">Chưa nhớ</div>
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
          <button 
            onClick={restartAll}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl font-bold transition-all"
          >
            <RotateCcw className="w-5 h-5" /> Bắt đầu lại từ đầu
          </button>
        </div>
      </div>
    );
  }

  const currentVocab = deck[currentIndex];
  
  // Safe guard trong trường hợp state deck đang được cập nhật
  if (!currentVocab) {
    return null;
  }

  const progressPercent = ((currentIndex) / deck.length) * 100;

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-6 animate-fadeIn">
      {/* Top Controls Bar */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-2xl shadow-lg">
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setMode("normal")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === "normal"
                ? "bg-slate-800 text-slate-200 shadow"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <LayoutList className="w-4 h-4" /> Bình thường
          </button>
          <button
            onClick={() => setMode("progress")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              mode === "progress"
                ? "bg-indigo-600/20 text-indigo-400 shadow border border-indigo-500/20"
                : "text-slate-500 hover:text-slate-300"
            }`}
          >
            <GraduationCap className="w-4 h-4" /> Tiến độ (Ghi nhớ)
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={shuffleAll} className="p-2 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg transition-all" title="Trộn thẻ (Shuffle)">
            <Shuffle className="w-5 h-5" />
          </button>
          <button onClick={restartAll} className="p-2 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all" title="Bắt đầu lại">
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full">
        <div className="flex justify-between text-xs font-bold text-slate-400 mb-2 px-1">
          <span>{currentIndex + 1} / {deck.length}</span>
          {mode === "progress" && (
            <span className="flex gap-4">
              <span className="text-emerald-400">Thuộc: {knownIds.size}</span>
              <span className="text-rose-400">Chưa: {unknownIds.size}</span>
            </span>
          )}
        </div>
        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-indigo-500 transition-all duration-300 ease-out rounded-full" 
            style={{ width: `${progressPercent}%` }}
          ></div>
        </div>
      </div>

      {/* Flashcard 3D Container */}
      <div className="relative w-full aspect-[4/3] md:aspect-[16/9] perspective-1000 cursor-pointer" onClick={flipCard}>
        <div 
          className={`w-full h-full relative transition-transform duration-500 transform-style-3d shadow-2xl rounded-3xl ${
            isFlipped ? "rotate-y-180" : ""
          }`}
        >
          {/* Front */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl flex flex-col items-center justify-center p-8 text-center">
            <span className="absolute top-6 left-6 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Rotate3D className="w-4 h-4" /> Bấm để lật
            </span>
            <div className="text-5xl md:text-7xl font-black text-white tracking-wider" onClick={(e) => e.stopPropagation()}>
              <ClickableKanjiString text={currentVocab.word} />
            </div>
            {currentVocab.sinoVietnamese && (
              <div className="mt-8 text-sm font-semibold text-slate-500 uppercase tracking-[0.3em]">
                {currentVocab.sinoVietnamese}
              </div>
            )}
          </div>

          {/* Back */}
          <div className="absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl flex flex-col items-center justify-center p-8 text-center rotate-y-180">
            <span className="absolute top-6 left-6 text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Rotate3D className="w-4 h-4" /> Bấm để lật
            </span>
            
            {currentVocab.reading && (
              <div className="text-xl md:text-2xl font-bold text-amber-400 mb-2">
                {currentVocab.reading}
              </div>
            )}
            
            <div className="text-3xl md:text-5xl font-black text-white mb-6">
              {currentVocab.meaning}
            </div>

            {currentVocab.example && (
              <div className="mt-4 p-4 bg-slate-950/50 rounded-2xl border border-slate-700/50 w-full max-w-lg">
                <span className="block text-xs font-bold text-slate-500 uppercase mb-1">Ví dụ minh họa</span>
                <p className="text-base text-slate-300 italic">{currentVocab.example}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Controls Footer */}
      <div className="flex items-center justify-center gap-4 mt-2">
        {mode === "normal" ? (
          <>
            <button 
              onClick={handlePrev} 
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl font-bold transition-all disabled:opacity-30 text-slate-400 hover:text-white hover:bg-slate-800 border border-transparent hover:border-slate-700"
            >
              <ArrowLeft className="w-5 h-5" /> Trước (Left)
            </button>
            <button 
              onClick={handleNext}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all text-slate-900 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              Tiếp theo (Right) <ArrowRight className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => handleProgress(false)}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 active:scale-95 w-40 justify-center"
            >
              <X className="w-6 h-6" /> Chưa (Left)
            </button>
            <button 
              onClick={() => handleProgress(true)}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all text-emerald-900 bg-emerald-400 hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 active:scale-95 w-40 justify-center"
            >
              <Check className="w-6 h-6" /> Đã thuộc (Right)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
