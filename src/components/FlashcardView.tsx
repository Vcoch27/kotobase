"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { ClickableKanjiString } from "./ClickableKanjiString";
import { 
  RotateCcw, Shuffle, ArrowLeft, ArrowRight, X, Check, 
  Rotate3D, GraduationCap, LayoutList, RefreshCcw, BrainCircuit, Undo2, Eye, EyeOff, Volume2, Headphones
} from "lucide-react";
import { playAudio } from "@/lib/tts-utils";
import { 
  AnkiRating, AnkiCardData, DEFAULT_ANKI_DATA, 
  calculateNextReview, loadAnkiProgress, saveAnkiProgress, formatInterval 
} from "@/lib/anki-utils";
import { StudyScopeSelector } from "./StudyScopeSelector";

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
  selectedVocabIds?: string[];
}

type StudyMode = "normal" | "progress" | "anki" | "listening";

// Fisher-Yates Shuffle
const shuffleArray = <T,>(array: T[]): T[] => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
};

export function FlashcardView({ vocabularies, selectedVocabIds = [] }: FlashcardViewProps) {
  const [scopedVocabs, setScopedVocabs] = useState<VocabularyData[]>(vocabularies);
  const [mode, setMode] = useState<StudyMode>("normal");
  const [deck, setDeck] = useState<VocabularyData[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showSino, setShowSino] = useState(true);
  const [isShuffled, setIsShuffled] = useState(false);

  const vocabIdsStr = vocabularies.map(v => v.id).join(',');

  useEffect(() => {
    setScopedVocabs(vocabularies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocabIdsStr]);

  // Listening mode states
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const autoPlayedRef = useRef<Set<number>>(new Set()); // Track which card indexes have been auto-played

  // Swipe tracking
  const [touchStart, setTouchStart] = useState<{x: number, y: number} | null>(null);
  const [touchEnd, setTouchEnd] = useState<{x: number, y: number} | null>(null);

  // Progress tracking
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [unknownIds, setUnknownIds] = useState<Set<string>>(new Set());

  // Anki tracking
  const [ankiProgress, setAnkiProgress] = useState<Record<string, AnkiCardData>>({});
  const [ankiStats, setAnkiStats] = useState({ new: 0, due: 0 });
  const [ankiHistory, setAnkiHistory] = useState<Record<string, AnkiCardData>[]>([]);

  // Initialization
  useEffect(() => {
    if (scopedVocabs.length > 0) {
      if (mode === "anki") {
        const progress = loadAnkiProgress();
        setAnkiProgress(progress);
        
        const now = Date.now();
        const ankiDeck = scopedVocabs.filter(v => {
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
        setDeck(scopedVocabs);
      }
      
      setCurrentIndex(0);
      setIsFlipped(false);
      setIsFinished(false);
      setIsShuffled(false);
      setKnownIds(new Set());
      setUnknownIds(new Set());
    } else {
      setDeck([]);
      setIsShuffled(false);
    }
  }, [scopedVocabs, mode]);

  // Auto-play audio khi á»Ÿ cháº¿ Ä‘á»™ Nghe & chuyá»ƒn sang tháº» má»›i
  useEffect(() => {
    if (mode !== "listening") return;
    if (isFinished || deck.length === 0) return;
    const currentVocab = deck[currentIndex];
    if (!currentVocab) return;
    // Chá»‰ auto-play náº¿u tháº» nÃ y chÆ°a Ä‘Æ°á»£c play láº§n nÃ o trong session hiá»‡n táº¡i
    if (autoPlayedRef.current.has(currentIndex)) return;
    
    autoPlayedRef.current.add(currentIndex);
    setIsPlayingAudio(true);
    const textToPlay = currentVocab.reading || currentVocab.word;
    // ThÃªm delay nhá» Ä‘á»ƒ animation tháº» má»›i cÃ³ thá»i gian load
    const timer = setTimeout(() => {
      playAudio(textToPlay);
      // Reset tráº¡ng thÃ¡i playing sau 3 giÃ¢y (Æ°á»›c lÆ°á»£ng)
      setTimeout(() => setIsPlayingAudio(false), 3000);
    }, 400);
    return () => clearTimeout(timer);
  }, [mode, currentIndex, deck, isFinished]);

  // Reset autoPlayed ref khi Ä‘á»•i mode hoáº·c restart
  useEffect(() => {
    autoPlayedRef.current = new Set();
    setIsPlayingAudio(false);
  }, [mode, deck]);

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
    
    // LÆ°u lá»‹ch sá»­ trÆ°á»›c khi thay Ä‘á»•i
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

  // Swipe Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd({ x: e.targetTouches[0].clientX, y: e.targetTouches[0].clientY });
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const deltaX = touchStart.x - touchEnd.x;
    const deltaY = touchStart.y - touchEnd.y;
    const threshold = 50; // minimum distance to be considered a swipe

    // Chá»‰ tÃ­nh lÃ  vuá»‘t ngang náº¿u khoáº£ng cÃ¡ch ngang lá»›n hÆ¡n khoáº£ng cÃ¡ch dá»c vÃ  vÆ°á»£t ngÆ°á»¡ng
    if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        // Swipe Left (Sang trÃ¡i) -> Tiáº¿p theo
        if (mode === "normal" || mode === "listening") handleNext();
        else if (mode === "progress") handleProgress(false);
      } else {
        // Swipe Right (Sang pháº£i) -> Quay láº¡i
        if (mode === "normal" || mode === "listening") handlePrev();
        else if (mode === "progress") handleProgress(true);
      }
    }
    setTouchStart(null);
    setTouchEnd(null);
  };

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
          else if (mode === "listening" && isFlipped) handleNext();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (mode === "normal") handlePrev();
          else if (mode === "progress") handleProgress(false);
          else if (mode === "listening" && !isFlipped) flipCard();
          break;
        case "h":
        case "H":
          e.preventDefault();
          setShowSino(prev => !prev);
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
        case "v":
        case "V":
          e.preventDefault();
          const card = deck[currentIndex];
          if (!card) break;
          
          if (mode === "listening") {
            // Cháº¿ Ä‘á»™ Nghe: Chá»‰ phÃ¡t Ã¢m tá»« vá»±ng (khÃ´ng phÃ¡t vÃ­ dá»¥) + kÃ­ch hoáº¡t hiá»‡u á»©ng sÃ³ng Ã¢m
            const textToPlayKey = card.reading || card.word;
            setIsPlayingAudio(true);
            playAudio(textToPlayKey);
            setTimeout(() => setIsPlayingAudio(false), 3000);
          } else {
            // CÃ¡c cháº¿ Ä‘á»™ khÃ¡c: PhÃ¡t tá»« vá»±ng + vÃ­ dá»¥ (náº¿u cÃ³)
            const exampleTextKey = card.example ? card.example.replace(/[\(ï¼ˆ].*?[\)ï¼‰]/g, '').trim() : '';
            const textToPlayKey = exampleTextKey 
              ? `${card.reading || card.word}ã€‚ â€¦â€¦ ${exampleTextKey}`
              : (card.reading || card.word);
            playAudio(textToPlayKey);
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFinished, deck, currentIndex, mode, handleNext, handlePrev, handleProgress, handleAnkiRate, handleUndo, flipCard, isFlipped]);

  // Restart Logic
  const restartAll = () => {
    setScopedVocabs(vocabularies);
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
    setIsShuffled(false);
    setKnownIds(new Set());
    setUnknownIds(new Set());
  };

  const toggleShuffle = () => {
    if (!isShuffled) {
      setDeck(shuffleArray(deck));
      setIsShuffled(true);
    } else {
      if (mode === "anki") {
        const progress = loadAnkiProgress();
        const now = Date.now();
        const ankiDeck = scopedVocabs.filter(v => {
          const p = progress[v.id];
          if (!p) return true;
          if (p.nextReview <= now) return true;
          return false;
        });
        setDeck(ankiDeck);
      } else {
        setDeck(scopedVocabs);
      }
      setIsShuffled(false);
    }
    setCurrentIndex(0);
    setIsFlipped(false);
    setIsFinished(false);
  };

  const studyUnknowns = () => {
    const unknowns = vocabularies.filter(v => unknownIds.has(v.id));
    setScopedVocabs(unknowns);
  };

  if (vocabularies.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
        <GraduationCap className="w-10 h-10 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
        <p className="text-base font-semibold text-slate-700 dark:text-slate-300">KhÃ´ng cÃ³ dá»¯ liá»‡u Flashcard</p>
        <p className="text-xs text-slate-500 mt-1">HÃ£y thÃªm tá»« vá»±ng vÃ o thÆ° má»¥c nÃ y Ä‘á»ƒ báº¯t Ä‘áº§u há»c.</p>
      </div>
    );
  }

  if (mode === "anki" && deck.length === 0) {
    return (
      <div className="p-16 text-center bg-white dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800 text-emerald-600 dark:text-emerald-400 animate-fadeIn transition-colors">
        <BrainCircuit className="w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)] text-emerald-500 dark:text-emerald-400" />
        <p className="text-xl font-bold text-slate-800 dark:text-slate-100">Báº¡n Ä‘Ã£ Ã´n xong cho hiá»‡n táº¡i!</p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">KhÃ´ng cÃ²n tháº» nÃ o Ä‘áº¿n háº¡n trong thÆ° má»¥c nÃ y. HÃ£y quay láº¡i sau nhÃ©.</p>
        <button 
          onClick={() => setMode("normal")}
          className="mt-6 px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-semibold transition-all"
        >
          Trá»Ÿ vá» Mode BÃ¬nh thÆ°á»ng
        </button>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl p-8 shadow-2xl animate-fadeIn text-center transition-colors">
        <GraduationCap className="w-16 h-16 mx-auto mb-4 text-emerald-500 dark:text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]" />
        <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-2">ÄÃ£ hoÃ n thÃ nh!</h2>
        
        {mode === "anki" ? (
          <p className="text-slate-500 dark:text-slate-400 mb-8">Báº¡n Ä‘Ã£ Ã´n xong toÃ n bá»™ tháº» Ä‘áº¿n háº¡n hÃ´m nay.</p>
        ) : (
          <p className="text-slate-500 dark:text-slate-400 mb-8">Báº¡n Ä‘Ã£ Ä‘i qua háº¿t {deck.length} tháº» trong danh sÃ¡ch nÃ y.</p>
        )}
        
        {mode === "progress" && (
          <div className="flex justify-center gap-8 mb-8">
            <div className="text-center">
              <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{knownIds.size}</div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">ÄÃ£ thuá»™c</div>
            </div>
            <div className="w-px bg-slate-200 dark:bg-slate-800"></div>
            <div className="text-center">
              <div className="text-3xl font-black text-rose-600 dark:text-rose-400">{unknownIds.size}</div>
              <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-1">ChÆ°a nhá»›</div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3 max-w-sm mx-auto">
          {mode === "progress" && unknownIds.size > 0 && (
            <button 
              onClick={studyUnknowns}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all"
            >
              <RefreshCcw className="w-5 h-5" /> Tiáº¿p tá»¥c há»c cÃ¡c tá»« chÆ°a nhá»› ({unknownIds.size})
            </button>
          )}
          {mode !== "anki" && (
            <button 
              onClick={restartAll}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold transition-all"
            >
              <RotateCcw className="w-5 h-5" /> Báº¯t Ä‘áº§u láº¡i tá»« Ä‘áº§u
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
    <div className="w-full max-w-3xl mx-auto flex flex-col gap-4 animate-fadeIn">
      {/* Bá»™ chá»n linh hoáº¡t pháº¡m vi há»c (Study Scope Selector) */}
      <StudyScopeSelector
        allVocabularies={vocabularies}
        selectedVocabIds={selectedVocabIds}
        onScopeChange={(scoped) => {
          setScopedVocabs(scoped);
        }}
        activeCount={deck.length}
        modeTheme="emerald"
      />

      {/* Top Controls Bar */}
      <div className="flex flex-col gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 sm:p-3 rounded-2xl shadow-lg transition-colors">
        {/* Mode buttons - scroll ngang trÃªn mobile */}
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto scrollbar-hide">
          <button
            onClick={() => setMode("normal")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              mode === "normal"
                ? "bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 shadow"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <LayoutList className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden xs:inline sm:inline">BÃ¬nh thÆ°á»ng</span>
            <span className="xs:hidden sm:hidden">BÃ¬nh thÆ°á»ng</span>
          </button>
          <button
            onClick={() => setMode("progress")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              mode === "progress"
                ? "bg-indigo-100 dark:bg-indigo-600/20 text-indigo-700 dark:text-indigo-400 shadow border border-indigo-200 dark:border-indigo-500/20"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 flex-shrink-0" /> Tiáº¿n Ä‘á»™
          </button>
          <button
            onClick={() => setMode("anki")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              mode === "anki"
                ? "bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400 shadow border border-rose-200 dark:border-rose-500/20"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <BrainCircuit className="w-3.5 h-3.5 flex-shrink-0" /> Anki (SRS)
          </button>
          <button
            onClick={() => setMode("listening")}
            className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex-shrink-0 ${
              mode === "listening"
                ? "bg-violet-100 dark:bg-violet-500/20 text-violet-700 dark:text-violet-400 shadow border border-violet-200 dark:border-violet-500/20"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Headphones className="w-3.5 h-3.5 flex-shrink-0" /> Nghe
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-1">
          <button 
            onClick={() => setShowSino(prev => !prev)} 
            className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all" 
            title={showSino ? "áº¨n Ã¢m HÃ¡n Viá»‡t" : "Hiá»‡n Ã¢m HÃ¡n Viá»‡t"}
          >
            {showSino ? <Eye className="w-4 h-4 sm:w-5 sm:h-5" /> : <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />}
          </button>
          
          {mode !== "normal" && (
            <button 
              onClick={handleUndo} 
              disabled={currentIndex === 0 && !isFinished}
              className="p-2 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-all disabled:opacity-30" 
              title="Quay láº¡i"
            >
              <Undo2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
          {mode !== "anki" && (
            <button 
              onClick={toggleShuffle} 
              className={`p-2 rounded-lg transition-all ${
                isShuffled
                  ? "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40"
                  : "text-slate-400 dark:text-slate-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10"
              }`} 
              title={isShuffled ? "Táº¯t trá»™n tháº»" : "Trá»™n ngáº«u nhiÃªn"}
            >
              <Shuffle className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
          )}
          <button onClick={restartAll} className="p-2 text-slate-400 dark:text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 rounded-lg transition-all" title="Báº¯t Ä‘áº§u láº¡i">
            <RotateCcw className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full">
        <div className="flex justify-between text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 px-1">
          <span>{currentIndex + 1} / {deck.length}</span>
          {mode === "progress" && (
            <span className="flex gap-4">
              <span className="text-emerald-600 dark:text-emerald-400">Thuá»™c: {knownIds.size}</span>
              <span className="text-rose-600 dark:text-rose-400">ChÆ°a: {unknownIds.size}</span>
            </span>
          )}
          {mode === "anki" && (
            <span className="flex gap-4">
              <span className="text-sky-600 dark:text-sky-400">Má»›i: {ankiStats.new}</span>
              <span className="text-rose-600 dark:text-rose-400">Äáº¿n háº¡n: {ankiStats.due}</span>
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
        className={`relative w-full perspective-1000 cursor-pointer select-none touch-pan-y ${
          isTransitioning ? "animate-fadeOut" : "animate-fadeIn"
        }`}
        style={{ aspectRatio: '4/3' }}
        onClick={flipCard}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div 
          className="w-full h-full relative transform-style-3d shadow-2xl rounded-3xl"
          style={{ 
            transition: 'transform 0.5s',
            WebkitTransition: '-webkit-transform 0.5s',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            WebkitTransform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          {mode === "listening" ? (
            /* Listening Mode Front: Chá»‰ hiá»‡n Ã¢m thanh */
            <div 
              className={`absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-violet-50 to-slate-50 dark:from-violet-950/40 dark:to-slate-950 border border-violet-200 dark:border-violet-700/40 rounded-3xl flex flex-col items-center justify-center p-4 sm:p-8 text-center transition-all duration-300 ${
                isFlipped ? "opacity-0 pointer-events-none invisible" : "opacity-100 pointer-events-auto visible"
              }`}
              style={{ 
                backfaceVisibility: 'hidden', 
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg) translateZ(1px)',
                WebkitTransform: 'rotateY(0deg) translateZ(1px)'
              }}
            >
              <span className="absolute top-3 left-3 sm:top-6 sm:left-6 text-[10px] sm:text-xs font-bold text-violet-400 dark:text-violet-500 uppercase tracking-wider flex items-center gap-1">
                <Headphones className="w-3 h-3 sm:w-4 sm:h-4" /> Cháº¿ Ä‘á»™ Nghe â€” Báº¥m Ä‘á»ƒ láº­t
              </span>
              
              {/* VÃ²ng sÃ³ng Ã¢m thanh pulsing */}
              <div className="relative flex items-center justify-center mb-4 sm:mb-6">
                {/* Pulse rings - chá»‰ animate khi Ä‘ang á»Ÿ máº·t trÆ°á»›c Ä‘á»ƒ trÃ¡nh tÃ¡ch GPU layer khi láº­t */}
                {!isFlipped && isPlayingAudio && (
                  <>
                    <div className="absolute w-28 h-28 sm:w-32 sm:h-32 rounded-full border-2 border-violet-400/30 dark:border-violet-500/20 animate-ping" style={{ animationDuration: '1.2s' }}></div>
                    <div className="absolute w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-violet-400/40 dark:border-violet-500/30 animate-ping" style={{ animationDuration: '1.5s' }}></div>
                  </>
                )}
                
                {/* NÃºt play trung tÃ¢m */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const textToPlay = currentVocab.reading || currentVocab.word;
                    setIsPlayingAudio(true);
                    playAudio(textToPlay);
                    setTimeout(() => setIsPlayingAudio(false), 3000);
                  }}
                  className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-95 ${
                    isPlayingAudio
                      ? 'bg-violet-500 dark:bg-violet-600 shadow-violet-500/40 scale-110'
                      : 'bg-white dark:bg-slate-800 border-2 border-violet-300 dark:border-violet-600 hover:border-violet-500 hover:scale-105 shadow-violet-200 dark:shadow-violet-900/50'
                  }`}
                  title="PhÃ¡t Ã¢m (nháº¥n láº¡i Ä‘á»ƒ nghe)"
                >
                  <Volume2 className={`w-7 h-7 sm:w-8 sm:h-8 ${isPlayingAudio ? 'text-white' : 'text-violet-500 dark:text-violet-400'}`} />
                </button>
              </div>

              <p className="text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400 max-w-xs px-2 text-center">
                {isPlayingAudio ? "Äang phÃ¡t Ã¢m thanh..." : "Nháº¥n nÃºt Ä‘á»ƒ nghe láº¡i â€¢ Báº¥m tháº» Ä‘á»ƒ xem Ä‘Ã¡p Ã¡n"}
              </p>
            </div>
          ) : (
            /* Normal / Progress / Anki Front: Hiá»ƒn thá»‹ tá»« vá»±ng */
            <div 
              className={`absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border border-slate-200 dark:border-slate-700/80 rounded-3xl flex flex-col items-center justify-center p-6 sm:p-8 text-center transition-all duration-300 ${
                isFlipped ? "opacity-0 pointer-events-none invisible" : "opacity-100 pointer-events-auto visible"
              }`}
              style={{ 
                backfaceVisibility: 'hidden', 
                WebkitBackfaceVisibility: 'hidden',
                transform: 'rotateY(0deg) translateZ(1px)',
                WebkitTransform: 'rotateY(0deg) translateZ(1px)'
              }}
            >
              <span className="absolute top-3 left-3 sm:top-6 sm:left-6 text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
                <Rotate3D className="w-3 h-3 sm:w-4 sm:h-4" /> Báº¥m Ä‘á»ƒ láº­t
              </span>
              <div className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-wide" onClick={(e) => e.stopPropagation()}>
                <ClickableKanjiString text={currentVocab.word} />
              </div>
              {currentVocab.sinoVietnamese && showSino && (
                <div className="mt-4 sm:mt-8 text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] animate-fadeIn">
                  {currentVocab.sinoVietnamese}
                </div>
              )}
            </div>
          )}

          {/* Back */}
          <div 
            className={`absolute inset-0 w-full h-full backface-hidden bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700/80 rounded-3xl flex flex-col items-center justify-center p-4 sm:p-8 text-center transition-all duration-300 ${
              !isFlipped ? "opacity-0 pointer-events-none invisible" : "opacity-100 pointer-events-auto visible"
            }`}
            style={{ 
              backfaceVisibility: 'hidden', 
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg) translateZ(1px)',
              WebkitTransform: 'rotateY(180deg) translateZ(1px)',
            }}
          >
            <span className="absolute top-3 left-3 sm:top-6 sm:left-6 text-[10px] sm:text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Rotate3D className="w-4 h-4" /> Báº¥m Ä‘á»ƒ láº­t
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                const exampleTextBtn = currentVocab.example ? currentVocab.example.replace(/[\(ï¼ˆ].*?[\)ï¼‰]/g, '').trim() : '';
                const textToPlayBtn = exampleTextBtn 
                  ? `${currentVocab.reading || currentVocab.word}ã€‚ â€¦â€¦ ${exampleTextBtn}`
                  : (currentVocab.reading || currentVocab.word);
                playAudio(textToPlayBtn);
              }}
              className="absolute top-2 right-2 sm:top-4 sm:right-4 p-2 sm:p-3 rounded-xl text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-colors"
              title="PhÃ¡t Ã¢m thanh"
            >
              <Volume2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>
            
            {/* Náº¿u lÃ  cháº¿ Ä‘á»™ Nghe (Listening Mode): Cáº§n hiá»ƒn thá»‹ Ä‘áº§y Ä‘á»§ Tá»« vá»±ng gá»‘c + HÃ¡n Viá»‡t vÃ¬ máº·t trÆ°á»›c chÆ°a cÃ³ */}
            {mode === "listening" ? (
              <>
                {/* Tá»« vá»±ng gá»‘c (Kanji) */}
                <div 
                  className="text-3xl sm:text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-wide mb-1" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <ClickableKanjiString text={currentVocab.word} />
                </div>

                {/* Ã‚m HÃ¡n Viá»‡t */}
                {currentVocab.sinoVietnamese && showSino && (
                  <div className="text-xs sm:text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em] mb-2 animate-fadeIn">
                    {currentVocab.sinoVietnamese}
                  </div>
                )}

                {/* CÃ¡ch Ä‘á»c Hiragana/Katakana */}
                {currentVocab.reading && currentVocab.reading !== currentVocab.word && (
                  <div className="text-base sm:text-lg md:text-xl font-bold text-amber-600 dark:text-amber-400 mb-2">
                    {currentVocab.reading}
                  </div>
                )}
                
                {/* NghÄ©a */}
                <div className="text-xl sm:text-2xl md:text-4xl font-black text-emerald-600 dark:text-emerald-400 mb-3 sm:mb-5 leading-tight">
                  {currentVocab.meaning}
                </div>
              </>
            ) : (
              /* CÃ¡c cháº¿ Ä‘á»™ thÃ´ng thÆ°á»ng (Máº·t trÆ°á»›c Ä‘Ã£ cÃ³ chá»¯ gá»‘c) */
              <>
                {currentVocab.reading && (
                  <div className="text-lg sm:text-xl md:text-2xl font-bold text-amber-600 dark:text-amber-400 mb-1 sm:mb-2">
                    {currentVocab.reading}
                  </div>
                )}
                
                <div className="text-2xl sm:text-3xl md:text-5xl font-black text-slate-900 dark:text-white mb-3 sm:mb-6 leading-tight">
                  {currentVocab.meaning}
                </div>
              </>
            )}

            {/* VÃ­ dá»¥ minh há»a */}
            {currentVocab.example && (
              <div className="p-3 sm:p-4 bg-white/50 dark:bg-slate-950/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 w-full max-w-lg">
                <span className="block text-[10px] sm:text-xs font-bold text-slate-500 uppercase mb-1">VÃ­ dá»¥ minh há»a</span>
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-300 italic leading-relaxed">{currentVocab.example}</p>
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
                  Báº¥m láº­t tháº» hoáº·c [Space] Ä‘á»ƒ hiá»‡n káº¿t quáº£
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
                    <span className="text-rose-600 dark:text-rose-400 text-[10px] uppercase tracking-wider">Láº¡i (1)</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{formatInterval(tAgain.interval)}</span>
                  </button>
                  <button onClick={() => handleAnkiRate("hard")} className="flex-1 py-3 rounded-2xl font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent border-b-4 border-b-amber-500 text-slate-900 dark:text-white flex flex-col items-center gap-1 active:translate-y-1 active:border-b transition-all shadow-sm">
                    <span className="text-amber-600 dark:text-amber-400 text-[10px] uppercase tracking-wider">KhÃ³ (2)</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{formatInterval(tHard.interval)}</span>
                  </button>
                  <button onClick={() => handleAnkiRate("good")} className="flex-1 py-3 rounded-2xl font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent border-b-4 border-b-emerald-500 text-slate-900 dark:text-white flex flex-col items-center gap-1 active:translate-y-1 active:border-b transition-all shadow-sm">
                    <span className="text-emerald-600 dark:text-emerald-400 text-[10px] uppercase tracking-wider">Tá»‘t (3)</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{formatInterval(tGood.interval)}</span>
                  </button>
                  <button onClick={() => handleAnkiRate("easy")} className="flex-1 py-3 rounded-2xl font-bold bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent border-b-4 border-b-sky-500 text-slate-900 dark:text-white flex flex-col items-center gap-1 active:translate-y-1 active:border-b transition-all shadow-sm">
                    <span className="text-sky-600 dark:text-sky-400 text-[10px] uppercase tracking-wider">Dá»… (4)</span>
                    <span className="text-sm text-slate-600 dark:text-slate-300">{formatInterval(tEasy.interval)}</span>
                  </button>
                </>
              )
            })()}
          </div>
        ) : mode === "listening" ? (
          /* Listening Mode controls */
          <div className="flex items-center gap-4">
            {!isFlipped ? (
              <button
                onClick={flipCard}
                className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all text-white bg-violet-500 hover:bg-violet-600 shadow-lg shadow-violet-500/20 active:scale-95"
              >
                <Rotate3D className="w-5 h-5" /> Láº­t xem Ä‘Ã¡p Ã¡n (Space)
              </button>
            ) : (
              <>
                <button
                  onClick={flipCard}
                  className="flex items-center gap-2 px-4 py-3 rounded-2xl font-bold transition-all text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-slate-300 shadow-sm"
                >
                  <Rotate3D className="w-5 h-5" /> Xem láº¡i Ã¢m thanh
                </button>
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-8 py-3 rounded-2xl font-bold transition-all text-white bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-500/20 active:scale-95"
                >
                  Tiáº¿p theo <ArrowRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        ) : mode === "normal" ? (
          <>
            <button 
              onClick={handlePrev} 
              disabled={currentIndex === 0}
              className="flex items-center gap-2 px-4 md:px-6 py-3 rounded-2xl font-bold transition-all disabled:opacity-30 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white hover:bg-slate-50 dark:bg-transparent dark:hover:bg-slate-800 border border-slate-200 dark:border-transparent hover:border-slate-300 dark:hover:border-slate-700 shadow-sm dark:shadow-none"
            >
              <ArrowLeft className="w-5 h-5" /> TrÆ°á»›c <span className="hidden sm:inline">(Left)</span>
            </button>
            <button 
              onClick={handleNext}
              className="flex items-center gap-2 px-6 md:px-8 py-3 rounded-2xl font-bold transition-all text-white dark:text-slate-900 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-400 dark:hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 active:scale-95"
            >
              Tiáº¿p theo <span className="hidden sm:inline">(Right)</span> <ArrowRight className="w-5 h-5" />
            </button>
          </>
        ) : (
          <>
            <button 
              onClick={() => handleProgress(false)}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all text-rose-600 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 hover:bg-rose-100 dark:hover:bg-rose-500/20 border border-rose-200 dark:border-rose-500/30 active:scale-95 w-40 justify-center shadow-sm"
            >
              <X className="w-6 h-6" /> ChÆ°a (Left)
            </button>
            <button 
              onClick={() => handleProgress(true)}
              className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold transition-all text-white dark:text-emerald-900 bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-400 dark:hover:bg-emerald-300 shadow-lg shadow-emerald-500/20 active:scale-95 w-40 justify-center"
            >
              <Check className="w-6 h-6" /> ÄÃ£ thuá»™c (Right)
            </button>
          </>
        )}
      </div>
    </div>
  );
}


