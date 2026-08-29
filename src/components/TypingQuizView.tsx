"use client";

import React, { useState, useEffect, useRef } from "react";
import { HelpCircle, CheckCircle2, XCircle, SkipForward, Info, RotateCcw, Shuffle } from "lucide-react";
import { ClickableKanjiString } from "./ClickableKanjiString";
import { StudyScopeSelector } from "./StudyScopeSelector";

interface VocabularyData {
  id: string;
  word: string;
  meaning: string;
  reading?: string | null;
  sinoVietnamese?: string | null;
  example?: string | null;
}

interface TypingQuizViewProps {
  vocabularies: VocabularyData[];
  selectedVocabIds?: string[];
}

type QuizType = 1 | 2; // 1: Xem Tá»« -> GÃµ CÃ¡ch Ä‘á»c, 2: Xem NghÄ©a -> GÃµ Tá»«/CÃ¡ch Ä‘á»c

interface QuizItem extends VocabularyData {
  quizType: QuizType;
}

// HÃ m xÃ¡o trá»™n máº£ng Fisher-Yates
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// LÃ m sáº¡ch chuá»—i trÆ°á»›c khi so sÃ¡nh
function cleanString(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "");
}

export function TypingQuizView({ vocabularies, selectedVocabIds = [] }: TypingQuizViewProps) {
  const [scopedVocabs, setScopedVocabs] = useState<VocabularyData[]>(vocabularies);
  const [quizList, setQuizList] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<"none" | "correct" | "wrong">("none");
  const [showHint, setShowHint] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [quizMode, setQuizMode] = useState<"mix" | "type1" | "type2">("mix");
  const [isShuffled, setIsShuffled] = useState(false);
  
  // Danh sÃ¡ch tá»« lÃ m Ä‘Ãºng vÃ  tá»« Ä‘Ã£ báº¥m bá» qua
  const [skippedList, setSkippedList] = useState<QuizItem[]>([]);
  const [correctList, setCorrectList] = useState<QuizItem[]>([]);
  
  // Ref cho Ã´ input Ä‘á»ƒ tá»± Ä‘á»™ng focus
  const inputRef = useRef<HTMLInputElement>(null);

  const vocabIdsStr = vocabularies.map(v => v.id).join(',');

  useEffect(() => {
    setScopedVocabs(vocabularies);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vocabIdsStr]);

  const buildQuizList = (list: VocabularyData[], mode: "mix" | "type1" | "type2"): QuizItem[] => {
    return list.map(v => {
      let qType: QuizType = 1;
      if (mode === "mix") {
        qType = (Math.random() > 0.5 ? 1 : 2) as QuizType;
      } else if (mode === "type1") {
        qType = 1;
      } else if (mode === "type2") {
        qType = 2;
      }
      return { ...v, quizType: qType };
    });
  };

  // Khá»Ÿi táº¡o quiz khi scopedVocabs hoáº·c quizMode thay Ä‘á»•i
  useEffect(() => {
    startNewQuiz(scopedVocabs, false);
    setIsShuffled(false);
  }, [scopedVocabs, quizMode]);

  const startNewQuiz = (customVocabs?: VocabularyData[], forceShuffle?: boolean) => {
    const sourceList = customVocabs && customVocabs.length > 0 ? customVocabs : scopedVocabs;
    
    if (sourceList.length === 0) {
      setQuizList([]);
      setIsFinished(false);
      setSkippedList([]);
      setCorrectList([]);
      return;
    }
    
    const shouldShuffle = forceShuffle !== undefined ? forceShuffle : isShuffled;
    const orderedSource = shouldShuffle ? shuffleArray(sourceList) : [...sourceList];
    const items = buildQuizList(orderedSource, quizMode);
    
    setQuizList(items);
    setCurrentIndex(0);
    setUserInput("");
    setFeedback("none");
    setShowHint(false);
    setIsFinished(false);
    setSkippedList([]);
    setCorrectList([]);
    
    // Tá»± Ä‘á»™ng focus sau má»™t chÃºt
    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const toggleShuffle = () => {
    const nextShuffled = !isShuffled;
    setIsShuffled(nextShuffled);

    if (nextShuffled) {
      setQuizList(shuffleArray(quizList));
    } else {
      setQuizList(buildQuizList(scopedVocabs, quizMode));
    }

    setCurrentIndex(0);
    setUserInput("");
    setFeedback("none");
    setShowHint(false);
    setIsFinished(false);
    setSkippedList([]);
    setCorrectList([]);

    setTimeout(() => {
      inputRef.current?.focus();
    }, 100);
  };

  const handleCheck = () => {
    if (!userInput.trim() || feedback === "correct") return;

    const currentItem = quizList[currentIndex];
    const userStr = cleanString(userInput);
    const expectedWord = cleanString(currentItem.word);
    const expectedReading = currentItem.reading ? cleanString(currentItem.reading) : expectedWord;

    let isCorrect = false;

    if (currentItem.quizType === 1) {
      // Dáº¡ng 1: Kiá»ƒm tra cÃ¡ch Ä‘á»c
      // Æ¯u tiÃªn so sÃ¡nh vá»›i reading, náº¿u nháº­p Kanji (word) cÅ©ng chÃ¢m chÆ°á»›c Ä‘Ãºng
      if (userStr === expectedReading || userStr === expectedWord) {
        isCorrect = true;
      }
    } else {
      // Dáº¡ng 2: Kiá»ƒm tra tá»« vá»±ng
      // GÃµ Kanji hoáº·c Hiragana Ä‘á»u Ä‘Æ°á»£c
      if (userStr === expectedWord || userStr === expectedReading) {
        isCorrect = true;
      }
    }

    if (isCorrect) {
      setFeedback("correct");
      // LÆ°u vÃ o danh sÃ¡ch Ä‘Ãºng náº¿u chÆ°a cÃ³
      setCorrectList(prev => prev.some(item => item.id === currentItem.id) ? prev : [...prev, currentItem]);
      // Äá»£i 1 giÃ¢y rá»“i chuyá»ƒn cÃ¢u tiáº¿p theo
      setTimeout(() => {
        moveToNext();
      }, 1000);
    } else {
      setFeedback("wrong");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (feedback === "wrong") {
        // Náº¿u Ä‘ang sai, báº¥m Enter Ä‘á»ƒ xÃ³a Ä‘i gÃµ láº¡i nhanh
        setUserInput("");
        setFeedback("none");
      } else {
        handleCheck();
      }
    }
  };

  const handleSkip = () => {
    const currentItem = quizList[currentIndex];
    if (currentItem) {
      // LÆ°u vÃ o danh sÃ¡ch bá» qua náº¿u chÆ°a cÃ³
      setSkippedList(prev => prev.some(item => item.id === currentItem.id) ? prev : [...prev, currentItem]);
    }
    setFeedback("none");
    moveToNext();
  };

  const moveToNext = () => {
    if (currentIndex < quizList.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setUserInput("");
      setFeedback("none");
      setShowHint(false);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      setIsFinished(true);
    }
  };

  if (vocabularies.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
        <HelpCircle className="w-10 h-10 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
        <p className="text-base font-semibold text-slate-700 dark:text-slate-300">KhÃ´ng cÃ³ tá»« vá»±ng Ä‘á»ƒ kiá»ƒm tra</p>
      </div>
    );
  }

  if (isFinished) {
    const totalCount = quizList.length;
    const correctCount = correctList.length;
    const skippedCount = skippedList.length;

    return (
      <div className="max-w-4xl mx-auto w-full space-y-8 animate-fadeIn">
        {/* Card Tá»•ng káº¿t Káº¿t quáº£ */}
        <div className="p-8 md:p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl transition-colors">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-2">
            Káº¿t quáº£ kiá»ƒm tra
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Báº¡n Ä‘Ã£ hoÃ n thÃ nh lÆ°á»£t kiá»ƒm tra vá»›i {totalCount} tá»« vá»±ng.
          </p>

          {/* Thá»‘ng kÃª tá»‰ lá»‡ */}
          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                ChÃ­nh xÃ¡c
              </span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {correctCount} / {totalCount}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
                ÄÃ£ bá» qua
              </span>
              <span className="text-2xl font-black text-amber-700 dark:text-amber-300">
                {skippedCount} / {totalCount}
              </span>
            </div>
          </div>

          {/* NÃºt hÃ nh Ä‘á»™ng */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {skippedCount > 0 && (
              <button 
                onClick={() => setScopedVocabs(skippedList)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-sm"
              >
                <RotateCcw className="w-4 h-4" /> Chá»‰ Ã´n láº¡i {skippedCount} tá»« Ä‘Ã£ bá» qua
              </button>
            )}
            <button 
              onClick={() => {
                setScopedVocabs(vocabularies);
                startNewQuiz(vocabularies);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/30 active:scale-95 text-sm"
            >
              <Shuffle className="w-4 h-4" /> Kiá»ƒm tra láº¡i toÃ n bá»™ danh sÃ¡ch
            </button>
          </div>
        </div>

        {/* Danh sÃ¡ch cÃ¡c tá»« bá»‹ bá» qua (Báº£ng phong cÃ¡ch Tá»•ng quan) */}
        {skippedCount > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                Danh sÃ¡ch tá»« cáº§n ghi nhá»› thÃªm ({skippedCount})
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Báº¥m vÃ o HÃ¡n tá»± Ä‘á»ƒ xem máº¹o nhá»›
              </span>
            </div>

            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3.5 px-4">Tá»« vá»±ng</th>
                    <th className="py-3.5 px-4">CÃ¡ch Ä‘á»c / HÃ¡n Viá»‡t</th>
                    <th className="py-3.5 px-4">NghÄ©a tiáº¿ng Viá»‡t</th>
                    <th className="py-3.5 px-4">VÃ­ dá»¥</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm text-slate-700 dark:text-slate-200">
                  {skippedList.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 align-top font-black text-lg text-slate-900 dark:text-white">
                        <ClickableKanjiString text={item.word} />
                      </td>
                      <td className="py-3.5 px-4 align-top space-y-1">
                        {item.reading && (
                          <span className="inline-block text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-500/20 mr-2">
                            {item.reading}
                          </span>
                        )}
                        {item.sinoVietnamese && (
                          <span className="inline-block text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase">
                            {item.sinoVietnamese}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 align-top font-bold text-emerald-600 dark:text-emerald-400">
                        {item.meaning}
                      </td>
                      <td className="py-3.5 px-4 align-top text-xs italic text-slate-600 dark:text-slate-400 max-w-xs">
                        {item.example || "---"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  const currentItem = quizList[currentIndex];
  if (!currentItem) return null;

  const progressPercentage = ((currentIndex + 1) / quizList.length) * 100;

  return (
    <div className="max-w-3xl mx-auto w-full space-y-4">
      {/* Bá»™ chá»n linh hoáº¡t pháº¡m vi há»c (Study Scope Selector) */}
      <StudyScopeSelector
        allVocabularies={vocabularies}
        selectedVocabIds={selectedVocabIds}
        onScopeChange={(scoped) => {
          setScopedVocabs(scoped);
        }}
        activeCount={quizList.length}
        modeTheme="purple"
      />

      {/* Thanh Tiáº¿n Ä‘á»™ vÃ  CÃ i Ä‘áº·t */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm transition-colors">
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tiáº¿n Ä‘á»™ kiá»ƒm tra</span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{currentIndex + 1} / {quizList.length}</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500 ease-out" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Quiz Actions & Settings */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Quiz Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => setQuizMode("mix")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${quizMode === "mix" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-600" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              Ngáº«u nhiÃªn
            </button>
            <button 
              onClick={() => setQuizMode("type1")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${quizMode === "type1" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-600" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              Chá»‰ Dáº¡ng 1
            </button>
            <button 
              onClick={() => setQuizMode("type2")}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${quizMode === "type2" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-600" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              Chá»‰ Dáº¡ng 2
            </button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button 
              onClick={toggleShuffle}
              title={isShuffled ? "Táº¯t trá»™n cÃ¢u há»i (Vá» thá»© tá»± ban Ä‘áº§u)" : "Trá»™n cÃ¢u há»i ngáº«u nhiÃªn (Shuffle)"}
              className={`p-1.5 rounded-lg transition-all ${
                isShuffled
                  ? "text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-500/20 border border-amber-300 dark:border-amber-500/40 shadow-sm"
                  : "text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700"
              }`}
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                startNewQuiz(undefined, false);
                setIsShuffled(false);
              }}
              title="LÃ m láº¡i tá»« Ä‘áº§u"
              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Card CÃ¢u há»i */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden transition-colors">
        
        {/* NhÃ£n Dáº¡ng cÃ¢u há»i */}
        <div className="absolute top-0 left-0 right-0 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 px-6 py-2.5 flex items-center justify-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {currentItem.quizType === 1 ? "Dáº¡ng 1: NhÃ¬n chá»¯, nháº­p cÃ¡ch Ä‘á»c" : "Dáº¡ng 2: NhÃ¬n nghÄ©a, dá»‹ch sang tiáº¿ng Nháº­t"}
          </span>
        </div>

        <div className="mt-10 text-center flex flex-col items-center min-h-[160px] justify-center">
          {currentItem.quizType === 1 ? (
            <>
              {/* Dáº NG 1: HIá»‚N THá»Š Tá»ª Vá»°NG */}
              <div className="text-4xl md:text-5xl font-black text-slate-800 dark:text-white tracking-wide mb-6 drop-shadow-sm">
                <ClickableKanjiString text={currentItem.word} />
              </div>
              
              {currentItem.sinoVietnamese ? (
                showHint ? (
                  <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest px-4 py-1.5 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg animate-fadeIn border border-indigo-100 dark:border-indigo-500/20">
                    {currentItem.sinoVietnamese}
                  </div>
                ) : (
                  <button 
                    onClick={() => setShowHint(true)}
                    className="text-xs font-semibold text-slate-400 hover:text-indigo-500 hover:underline transition-colors px-3 py-1"
                  >
                    Hiá»ƒn thá»‹ gá»£i Ã½ Ã‚m HÃ¡n Viá»‡t
                  </button>
                )
              ) : null}
            </>
          ) : (
            <>
              {/* Dáº NG 2: HIá»‚N THá»Š NGHÄ¨A */}
              <div className="text-2xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-6 max-w-xl mx-auto leading-tight">
                {currentItem.meaning}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 italic">
                (GÃµ Hiragana hoáº·c Kanji tÆ°Æ¡ng á»©ng)
              </div>
            </>
          )}
        </div>
      </div>

      {/* Khu vá»±c Nháº­p liá»‡u */}
      <div className="space-y-4">
        <div className="relative max-w-2xl mx-auto">
          <input
            ref={inputRef}
            type="text"
            value={userInput}
            onChange={(e) => {
              setUserInput(e.target.value);
              if (feedback === "wrong") setFeedback("none");
            }}
            onKeyDown={handleKeyDown}
            disabled={feedback === "correct"}
            placeholder="Nháº­p cÃ¢u tráº£ lá»i vÃ o Ä‘Ã¢y..."
            className={`w-full px-6 py-5 text-xl font-medium rounded-2xl border-2 outline-none transition-all shadow-lg text-center ${
              feedback === "correct" 
                ? "bg-emerald-50 border-emerald-500 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400"
                : feedback === "wrong"
                ? "bg-rose-50 border-rose-500 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400 animate-shake"
                : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-500 text-slate-800 dark:text-slate-100 focus:ring-4 focus:ring-indigo-500/20"
            }`}
          />
          
          {feedback === "correct" && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-emerald-500 animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
          )}
          {feedback === "wrong" && (
            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-rose-500">
              <XCircle className="w-8 h-8" />
            </div>
          )}
        </div>

        {feedback === "wrong" && (
          <div className="text-center text-rose-500 dark:text-rose-400 font-medium text-sm animate-fadeIn">
            ChÆ°a chÃ­nh xÃ¡c! Vui lÃ²ng thá»­ láº¡i. (Hoáº·c báº¥m Enter Ä‘á»ƒ xÃ³a nhanh)
          </div>
        )}

        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={handleSkip}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
          >
            <SkipForward className="w-4 h-4" /> Bá» qua
          </button>
          
          <button
            onClick={handleCheck}
            disabled={!userInput.trim() || feedback === "correct"}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:dark:bg-slate-800 text-white font-bold transition-all shadow-md shadow-indigo-500/20 text-sm"
          >
            Kiá»ƒm tra
          </button>
        </div>
      </div>
    </div>
  );
}

