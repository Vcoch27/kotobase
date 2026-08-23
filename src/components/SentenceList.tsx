'use client';

import React, { useState, useEffect } from 'react';
import { Pencil, Trash2, Volume2, Plus, Loader2 } from 'lucide-react';

interface SentenceItem {
  id: string;
  japanese: string;
  meaning: string;
  vocabularies: any; // { word, reading, meaning }
  grammars: any; // { grammar, meaning }
  note: string | null;
}

interface SentenceListProps {
  sentences: SentenceItem[];
  onEdit: (s: SentenceItem) => void;
  onDelete: (id: string) => void;
}

export function SentenceList({ sentences, onEdit, onDelete }: SentenceListProps) {
  if (sentences.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-slate-400 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800">
        <p>Thư mục trống. Hãy thêm mẫu câu mới!</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sentences.map((sentence) => (
        <div key={sentence.id} className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1 space-y-2">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">{sentence.japanese}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-400">{sentence.meaning}</p>
              
              {/* Vocabularies */}
              {Array.isArray(sentence.vocabularies) && sentence.vocabularies.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Từ vựng</div>
                  <div className="flex flex-wrap gap-2">
                    {sentence.vocabularies.map((v: any, i: number) => (
                      <span key={i} className="px-2 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded text-xs">
                        <b>{v.word}</b> {v.reading ? `(${v.reading})` : ''} - {v.meaning}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Grammars */}
              {Array.isArray(sentence.grammars) && sentence.grammars.length > 0 && (
                <div className="mt-3 space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Ngữ pháp</div>
                  <div className="flex flex-wrap gap-2">
                    {sentence.grammars.map((g: any, i: number) => (
                      <span key={i} className="px-2 py-1 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded text-xs">
                        <b>{g.grammar}</b> - {g.meaning}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {sentence.note && (
                <div className="mt-2 text-xs italic text-slate-500">Ghi chú: {sentence.note}</div>
              )}
            </div>
            
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => {
                 const u = new SpeechSynthesisUtterance(sentence.japanese);
                 u.lang = 'ja-JP';
                 window.speechSynthesis.speak(u);
              }} className="p-2 text-slate-400 hover:text-indigo-500 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <Volume2 className="w-4 h-4" />
              </button>
              <button onClick={() => onEdit(sentence)} className="p-2 text-slate-400 hover:text-blue-500 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={() => onDelete(sentence.id)} className="p-2 text-slate-400 hover:text-rose-500 bg-slate-100 dark:bg-slate-800 rounded-xl">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
