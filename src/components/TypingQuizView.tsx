"use client";

import React, { useState, useEffect, useRef } from "react";
import { HelpCircle, CheckCircle2, XCircle, SkipForward, Info, RotateCcw, Shuffle } from "lucide-react";
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
  
  // Danh sách từ làm đúng và từ đã bấm bỏ qua
  const [skippedList, setSkippedList] = useState<QuizItem[]>([]);
  const [correctList, setCorrectList] = useState<QuizItem[]>([]);
  
  // Ref cho ô input để tự động focus
  const inputRef = useRef<HTMLInputElement>(null);

  // Khởi tạo quiz khi vocabularies hoặc quizMode thay đổi
  useEffect(() => {
    startNewQuiz();
  }, [vocabularies, quizMode]);

  const startNewQuiz = (customVocabs?: VocabularyData[]) => {
    const sourceList = customVocabs && customVocabs.length > 0 ? customVocabs : vocabularies;
    
    if (sourceList.length === 0) {
      setQuizList([]);
      setIsFinished(false);
      setSkippedList([]);
      setCorrectList([]);
      return;
    }
    
    // Tạo danh sách câu hỏi: xáo trộn và gán ngẫu nhiên dạng 1 hoặc 2
    const shuffled = shuffleArray(sourceList).map(v => {
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
    setSkippedList([]);
    setCorrectList([]);
    
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
      // Lưu vào danh sách đúng nếu chưa có
      setCorrectList(prev => prev.some(item => item.id === currentItem.id) ? prev : [...prev, currentItem]);
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
    const currentItem = quizList[currentIndex];
    if (currentItem) {
      // Lưu vào danh sách bỏ qua nếu chưa có
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
        <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Không có từ vựng để kiểm tra</p>
      </div>
    );
  }

  if (isFinished) {
    const totalCount = quizList.length;
    const correctCount = correctList.length;
    const skippedCount = skippedList.length;

    return (
      <div className="max-w-4xl mx-auto w-full space-y-8 animate-fadeIn">
        {/* Card Tổng kết Kết quả */}
        <div className="p-8 md:p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl transition-colors">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-black text-slate-800 dark:text-white mb-2">
            Kết quả kiểm tra
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
            Bạn đã hoàn thành lượt kiểm tra với {totalCount} từ vựng.
          </p>

          {/* Thống kê tỉ lệ */}
          <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto mb-8">
            <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
                Chính xác
              </span>
              <span className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                {correctCount} / {totalCount}
              </span>
            </div>
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block mb-1">
                Đã bỏ qua
              </span>
              <span className="text-2xl font-black text-amber-700 dark:text-amber-300">
                {skippedCount} / {totalCount}
              </span>
            </div>
          </div>

          {/* Nút hành động */}
          <div className="flex flex-wrap items-center justify-center gap-4">
            {skippedCount > 0 && (
              <button 
                onClick={() => startNewQuiz(skippedList)}
                className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-sm"
              >
                <RotateCcw className="w-4 h-4" /> Chỉ ôn lại {skippedCount} từ đã bỏ qua
              </button>
            )}
            <button 
              onClick={() => startNewQuiz()}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/30 active:scale-95 text-sm"
            >
              <Shuffle className="w-4 h-4" /> Kiểm tra lại toàn bộ danh sách
            </button>
          </div>
        </div>

        {/* Danh sách các từ bị bỏ qua (Bảng phong cách Tổng quan) */}
        {skippedCount > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                Danh sách từ cần ghi nhớ thêm ({skippedCount})
              </h3>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Bấm vào Hán tự để xem mẹo nhớ
              </span>
            </div>

            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-lg">
              <table className="w-full text-left border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
                    <th className="py-3.5 px-4">Từ vựng</th>
                    <th className="py-3.5 px-4">Cách đọc / Hán Việt</th>
                    <th className="py-3.5 px-4">Nghĩa tiếng Việt</th>
                    <th className="py-3.5 px-4">Ví dụ</th>
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

        {/* Quiz Actions & Settings */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {/* Quiz Mode Selector */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
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

          {/* Action Buttons */}
          <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/50 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
            <button 
              onClick={() => startNewQuiz()}
              title="Xáo trộn lại từ đầu"
              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                setCurrentIndex(0);
                setUserInput("");
                setFeedback("none");
                setShowHint(false);
                setIsFinished(false);
                setTimeout(() => inputRef.current?.focus(), 100);
              }}
              title="Làm lại từ đầu (Giữ nguyên thứ tự)"
              className="p-1.5 text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
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
