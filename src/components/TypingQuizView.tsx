"use client";

import React, { useState, useEffect, useRef } from "react";
import { HelpCircle, CheckCircle2, XCircle, SkipForward, Info, RotateCcw } from "lucide-react";
import { ClickableKanjiString } from "./ClickableKanjiString";

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
}

type QuizType = 1 | 2; // 1: Xem Từ -> Gõ Cách đọc, 2: Xem Nghĩa -> Gõ Từ/Cách đọc

interface QuizItem extends VocabularyData {
  quizType: QuizType;
}

// Hàm xáo trộn mảng Fisher-Yates
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Làm sạch chuỗi trước khi so sánh
function cleanString(str: string): string {
  return str.toLowerCase().replace(/\s+/g, "");
}

export function TypingQuizView({ vocabularies }: TypingQuizViewProps) {
  const [quizList, setQuizList] = useState<QuizItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [feedback, setFeedback] = useState<"none" | "correct" | "wrong">("none");
  const [showHint, setShowHint] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const [quizMode, setQuizMode] = useState<"mix" | "type1" | "type2">("mix");
  
  // Ref cho ô input để tự động focus
  const inputRef = useRef<HTMLInputElement>(null);

  // Khởi tạo quiz khi vocabularies hoặc quizMode thay đổi
  useEffect(() => {
    startNewQuiz();
  }, [vocabularies, quizMode]);

  const startNewQuiz = () => {
    if (vocabularies.length === 0) {
      setQuizList([]);
      setIsFinished(false);
      return;
    }
    
    // Tạo danh sách câu hỏi: xáo trộn và gán ngẫu nhiên dạng 1 hoặc 2
    const shuffled = shuffleArray(vocabularies).map(v => {
      let qType: QuizType = 1;
      if (quizMode === "mix") {
        qType = (Math.random() > 0.5 ? 1 : 2) as QuizType;
      } else if (quizMode === "type1") {
        qType = 1;
      } else if (quizMode === "type2") {
        qType = 2;
      }
      return { ...v, quizType: qType };
    });
    
    setQuizList(shuffled);
    setCurrentIndex(0);
    setUserInput("");
    setFeedback("none");
    setShowHint(false);
    setIsFinished(false);
    
    // Tự động focus sau một chút
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
      // Dạng 1: Kiểm tra cách đọc
      // Ưu tiên so sánh với reading, nếu nhập Kanji (word) cũng châm chước đúng
      if (userStr === expectedReading || userStr === expectedWord) {
        isCorrect = true;
      }
    } else {
      // Dạng 2: Kiểm tra từ vựng
      // Gõ Kanji hoặc Hiragana đều được
      if (userStr === expectedWord || userStr === expectedReading) {
        isCorrect = true;
      }
    }

    if (isCorrect) {
      setFeedback("correct");
      // Đợi 1 giây rồi chuyển câu tiếp theo
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
        // Nếu đang sai, bấm Enter để xóa đi gõ lại nhanh
        setUserInput("");
        setFeedback("none");
      } else {
        handleCheck();
      }
    }
  };

  const handleSkip = () => {
    setFeedback("none"); // Tránh hiện nhấp nháy xanh
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
        <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Không có từ vựng để kiểm tra</p>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="p-16 text-center bg-white dark:bg-slate-900/80 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-2xl mx-auto mt-8">
        <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-slate-800 dark:text-white mb-2">Hoàn thành xuất sắc!</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8">Bạn đã kiểm tra hết {quizList.length} từ vựng trong danh sách này.</p>
        <button 
          onClick={startNewQuiz}
          className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/30"
        >
          <RotateCcw className="w-5 h-5" /> Kiểm tra lại lần nữa
        </button>
      </div>
    );
  }

  const currentItem = quizList[currentIndex];
  if (!currentItem) return null;

  const progressPercentage = ((currentIndex) / quizList.length) * 100;

  return (
    <div className="max-w-3xl mx-auto w-full space-y-6">
      {/* Thanh Tiến độ và Cài đặt */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-sm transition-colors">
        <div className="flex-1 w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tiến độ kiểm tra</span>
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{currentIndex + 1} / {quizList.length}</span>
          </div>
          <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500 ease-out" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>

        {/* Quiz Mode Selector */}
        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
          <button 
            onClick={() => setQuizMode("mix")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${quizMode === "mix" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-600" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            Ngẫu nhiên
          </button>
          <button 
            onClick={() => setQuizMode("type1")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${quizMode === "type1" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-600" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            Chỉ Dạng 1
          </button>
          <button 
            onClick={() => setQuizMode("type2")}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${quizMode === "type2" ? "bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-600" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
          >
            Chỉ Dạng 2
          </button>
        </div>
      </div>

      {/* Card Câu hỏi */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 md:p-12 shadow-2xl relative overflow-hidden transition-colors">
        
        {/* Nhãn Dạng câu hỏi */}
        <div className="absolute top-0 left-0 right-0 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 px-6 py-2.5 flex items-center justify-center gap-2">
          <Info className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            {currentItem.quizType === 1 ? "Dạng 1: Nhìn chữ, nhập cách đọc" : "Dạng 2: Nhìn nghĩa, dịch sang tiếng Nhật"}
          </span>
        </div>

        <div className="mt-10 text-center flex flex-col items-center min-h-[160px] justify-center">
          {currentItem.quizType === 1 ? (
            <>
              {/* DẠNG 1: HIỂN THỊ TỪ VỰNG */}
              <div className="text-5xl md:text-7xl font-black text-slate-800 dark:text-white tracking-widest mb-6 drop-shadow-sm">
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
                    Hiển thị gợi ý Âm Hán Việt
                  </button>
                )
              ) : null}
            </>
          ) : (
            <>
              {/* DẠNG 2: HIỂN THỊ NGHĨA */}
              <div className="text-2xl md:text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-6 max-w-xl mx-auto leading-tight">
                {currentItem.meaning}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400 italic">
                (Gõ Hiragana hoặc Kanji tương ứng)
              </div>
            </>
          )}
        </div>
      </div>

      {/* Khu vực Nhập liệu */}
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
            placeholder="Nhập câu trả lời vào đây..."
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
            Chưa chính xác! Vui lòng thử lại. (Hoặc bấm Enter để xóa nhanh)
          </div>
        )}

        <div className="flex justify-center gap-4 mt-6">
          <button
            onClick={handleSkip}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-sm"
          >
            <SkipForward className="w-4 h-4" /> Bỏ qua
          </button>
          
          <button
            onClick={handleCheck}
            disabled={!userInput.trim() || feedback === "correct"}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-300 disabled:dark:bg-slate-800 text-white font-bold transition-all shadow-md shadow-indigo-500/20 text-sm"
          >
            Kiểm tra
          </button>
        </div>
      </div>
    </div>
  );
}
