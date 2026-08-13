"use client";

import React from "react";
import { ClickableKanjiString } from "./ClickableKanjiString";
import { Trash2, Folder as FolderIcon, BookOpen } from "lucide-react";
import { deleteVocabulary } from "@/app/actions/vocabulary";

interface VocabularyData {
  id: string;
  word: string;
  meaning: string;
  reading?: string | null;
  sinoVietnamese?: string | null;
  example?: string | null;
  folderVocabularies?: any[];
}

interface OverviewViewProps {
  vocabularies: VocabularyData[];
  onRefresh?: () => void;
}

export function OverviewView({ vocabularies, onRefresh }: OverviewViewProps) {
  const handleDelete = async (id: string, word: string) => {
    if (confirm(`Bạn có chắc chắn muốn xóa từ "${word}" không?`)) {
      const res = await deleteVocabulary(id);
      if (res.success && onRefresh) {
        onRefresh();
      }
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, vocabId: string) => {
    e.dataTransfer.setData("vocabId", vocabId);
    e.dataTransfer.effectAllowed = "move";
  };

  if (vocabularies.length === 0) {
    return (
      <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400">
        <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-600" />
        <p className="text-base font-semibold text-slate-300">Chưa có từ vựng nào</p>
        <p className="text-xs text-slate-500 mt-1">Sử dụng Quick Add ở trên để thêm từ mới vào kho dữ liệu</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl">
      <table className="w-full text-left border-collapse min-w-[800px]">
        <thead>
          <tr className="bg-slate-950/80 text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-800">
            <th className="py-4 px-5">Từ vựng (Word)</th>
            <th className="py-4 px-4">Cách đọc / Hán Việt</th>
            <th className="py-4 px-5">Nghĩa (Meaning)</th>
            <th className="py-4 px-5">Ví dụ (Example)</th>
            <th className="py-4 px-4">Thư mục</th>
            <th className="py-4 px-4 text-right">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
          {vocabularies.map((item) => (
            <tr 
              key={item.id} 
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              className="hover:bg-slate-800/40 transition-colors group cursor-grab active:cursor-grabbing"
              title="Kéo thả dòng này vào Thư mục ở cột trái để di chuyển"
            >
              {/* Word & Interactive Kanji */}
              <td className="py-4 px-5 align-top">
                <div className="text-xl font-extrabold text-white tracking-wide">
                  <ClickableKanjiString text={item.word} />
                </div>
              </td>

              {/* Reading & Sino-Vietnamese */}
              <td className="py-4 px-4 align-top space-y-1">
                {item.reading && (
                  <span className="block text-xs font-medium text-amber-300/90 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
                    {item.reading}
                  </span>
                )}
                {item.sinoVietnamese && (
                  <span className="block text-xs font-semibold text-indigo-300 uppercase tracking-wide">
                    {item.sinoVietnamese}
                  </span>
                )}
              </td>

              {/* Meaning */}
              <td className="py-4 px-5 align-top font-semibold text-emerald-400">
                {item.meaning}
              </td>

              {/* Example */}
              <td className="py-4 px-5 align-top text-xs space-y-2 max-w-xs">
                {item.example ? (
                  <p className="text-slate-400 italic">
                    <strong className="text-slate-300 not-italic">VD:</strong> {item.example}
                  </p>
                ) : (
                  <span className="text-slate-600 italic">---</span>
                )}
              </td>

              {/* Folders */}
              <td className="py-4 px-4 align-top">
                <div className="flex flex-wrap gap-1">
                  {item.folderVocabularies && item.folderVocabularies.length > 0 ? (
                    item.folderVocabularies.map((fv) => (
                      <span
                        key={fv.folderId}
                        className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700"
                      >
                        <FolderIcon className="w-3 h-3 text-indigo-400" /> {fv.folder.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-600 italic">Chưa xếp thư mục</span>
                  )}
                </div>
              </td>

              {/* Actions */}
              <td className="py-4 px-4 align-top text-right">
                <button
                  onClick={() => handleDelete(item.id, item.word)}
                  title="Xóa từ vựng"
                  className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
