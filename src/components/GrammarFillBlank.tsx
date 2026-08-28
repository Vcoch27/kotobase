'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, RefreshCw, CheckCircle, XCircle } from 'lucide-react';

interface GrammarItem {
  id: string;
  structure: string;
  meaning: string;
  example?: string;
  exampleMeaning?: string;
  jlptLevel?: string;
}

export function GrammarFillBlank({ grammars }: { grammars: GrammarItem[] }) {
  const [currentItem, setCurrentItem] = useState<GrammarItem | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [status, setStatus] = useState<'idle' | 'correct' | 'wrong'>('idle');
  const [score, setScore] = useState({ correct: 0, total: 0 });

  useEffect(() => {
    pickRandom();
  }, [grammars]);

  const pickRandom = () => {
    if (grammars.length === 0) return;
    const random = grammars[Math.floor(Math.random() * grammars.length)];
    setCurrentItem(random);
    setInputVal('');
    setStatus('idle');
  };

  const getMaskedExample = (example: string, structure: string) => {
    if (!example || !structure) return example;
    // Simple replace first occurrence of structure in example
    return example.replace(structure, '_____');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentItem || status !== 'idle') return;

    if (inputVal.trim() === currentItem.structure) {
      setStatus('correct');
      setScore(s => ({ correct: s.correct + 1, total: s.total + 1 }));
    } else {
      setStatus('wrong');
      setScore(s => ({ ...s, total: s.total + 1 }));
    }
  };

  if (grammars.length === 0) {
    return <div className="p-10 text-center">Chưa có dữ liệu</div>;
  }

  if (!currentItem) return null;

  const masked = currentItem.example ? getMaskedExample(currentItem.example, currentItem.structure) : null;
  const isFallback = !currentItem.example || masked === currentItem.example;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6 px-4">
        <h3 className="font-bold text-slate-700 dark:text-slate-300">Điền từ (BunPro Style)</h3>
        <div className="font-bold bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400 px-3 py-1 rounded-lg">
          {score.correct} / {score.total}
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="mb-8">
          {isFallback ? (
            <div className="text-center space-y-2">
              <p className="text-lg font-bold text-slate-600 dark:text-slate-300">Viết cấu trúc có ý nghĩa sau:</p>
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{currentItem.meaning}</p>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-3xl font-japanese font-bold text-slate-800 dark:text-slate-100 leading-relaxed">
                {masked}
              </p>
              {currentItem.exampleMeaning && (
                <p className="text-sm text-slate-500 dark:text-slate-400">{currentItem.exampleMeaning}</p>
              )}
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="relative">
          <input
            type="text"
            value={inputVal}
            onChange={e => setInputVal(e.target.value)}
            disabled={status !== 'idle'}
            placeholder="Gõ đáp án tiếng Nhật..."
            className={`w-full text-center text-xl font-japanese font-bold px-6 py-4 rounded-2xl outline-none transition-all border-2 ${
              status === 'correct' ? 'bg-emerald-50 border-emerald-500 text-emerald-700' :
              status === 'wrong' ? 'bg-rose-50 border-rose-500 text-rose-700' :
              'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:border-violet-500'
            }`}
            autoFocus
          />
          {status === 'idle' && (
            <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 p-2 bg-violet-500 text-white rounded-xl hover:bg-violet-600">
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </form>

        {status !== 'idle' && (
          <div className="mt-8 animate-slideUp text-center space-y-6">
            {status === 'correct' ? (
              <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold text-lg">
                <CheckCircle className="w-6 h-6" /> Chính xác!
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-rose-600 font-bold text-lg">
                  <XCircle className="w-6 h-6" /> Sai rồi!
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  Đáp án đúng: <span className="font-bold text-xl text-violet-600 font-japanese">{currentItem.structure}</span>
                </div>
              </div>
            )}
            
            <button 
              onClick={pickRandom}
              className="px-6 py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors inline-flex items-center gap-2"
            >
              Tiếp tục <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
        
        {status === 'idle' && (
          <div className="mt-6 flex justify-between items-center px-2">
            <button 
              type="button"
              onClick={pickRandom}
              className="text-sm font-semibold text-slate-400 hover:text-slate-600 flex items-center gap-1"
            >
              <RefreshCw className="w-4 h-4" /> Bỏ qua
            </button>
            <div className="text-xs font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-lg">
              Gợi ý: {currentItem.jlptLevel || 'Ngữ pháp'} - {currentItem.meaning}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
