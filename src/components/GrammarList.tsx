'use client';

import React from 'react';
import { Pencil, Trash2, BookOpen } from 'lucide-react';

interface GrammarItem {
  id: string;
  structure: string;
  formation?: string;
  meaning: string;
  nuance?: string;
  example?: string;
  exampleMeaning?: string;
  jlptLevel?: string;
  usageContext?: string;
}

interface GrammarListProps {
  grammars: GrammarItem[];
  onEdit: (g: GrammarItem) => void;
  onDelete: (id: string) => void;
}

const contextIcons: Record<string, string> = {
  conversation: '🗣️',
  writing: '📝',
  business: '💼',
  anime: '📺'
};

export function GrammarList({ grammars, onEdit, onDelete }: GrammarListProps) {
  if (grammars.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 border-dashed">
        <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
        <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">Chưa có ngữ pháp nào</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">Hãy thêm ngữ pháp mới để bắt đầu học.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {grammars.map((g) => (
        <div 
          key={g.id} 
          className="group flex flex-col bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-violet-300 dark:hover:border-violet-500/50 transition-all animate-fadeIn"
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex flex-wrap gap-2 items-center">
              {g.jlptLevel && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-100 dark:bg-violet-500/20 text-violet-600 dark:text-violet-400">
                  {g.jlptLevel}
                </span>
              )}
              {g.usageContext && g.usageContext.split(',').map(ctx => (
                <span key={ctx} className="text-sm" title={ctx}>
                  {contextIcons[ctx] || ''}
                </span>
              ))}
            </div>
            
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button 
                onClick={() => onEdit(g)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                title="Sửa"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button 
                onClick={() => onDelete(g.id)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                title="Xóa"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          <h3 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 font-japanese mb-2">
            {g.structure}
          </h3>
          
          <div className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3 border-l-2 border-violet-500 pl-3 py-0.5">
            {g.meaning}
          </div>

          {g.formation && (
            <div className="text-xs text-slate-500 dark:text-slate-400 font-japanese mb-2 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-lg inline-block">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Cách chia:</span> {g.formation}
            </div>
          )}

          {g.nuance && (
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-3 italic">
              <span className="font-semibold not-italic">Chú ý:</span> {g.nuance}
            </div>
          )}

          {g.example && (
            <div className="mt-auto pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-sm font-japanese text-slate-700 dark:text-slate-200 mb-1">
                {g.example}
              </p>
              {g.exampleMeaning && (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {g.exampleMeaning}
                </p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
