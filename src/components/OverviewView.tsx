"use client";

import React, { useState, useEffect } from "react";
import { ClickableKanjiString } from "./ClickableKanjiString";
import { Trash2, Folder as FolderIcon, BookOpen, Edit3, ChevronLeft, ChevronRight } from "lucide-react";
import { deleteVocabulary } from "@/app/actions/vocabulary";
import { VocabularyEditModal } from "./VocabularyEditModal";
import { getFolderFullPath } from "@/lib/folder-utils";

interface VocabularyData {
  id: string;
  word: string;
  meaning: string;
  reading?: string | null;
  sinoVietnamese?: string | null;
  example?: string | null;
  note?: string | null;
  folderVocabularies?: any[];
}

interface OverviewViewProps {
  vocabularies: VocabularyData[];
  folders: any[];
  onRefresh?: () => void;
}

export function OverviewView({ vocabularies, folders, onRefresh }: OverviewViewProps) {
  const [editingVocab, setEditingVocab] = useState<VocabularyData | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 30;

  useEffect(() => {
    setCurrentPage(1);
  }, [vocabularies]);

  const [localVocabs, setLocalVocabs] = useState<any[]>([]);

  useEffect(() => {
    setLocalVocabs(vocabularies);
  }, [vocabularies]);

  const totalPages = Math.ceil(localVocabs.length / ITEMS_PER_PAGE);
  const paginatedVocabularies = localVocabs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  const handleDelete = async (e: React.MouseEvent, id: string, word: string) => {
    e.stopPropagation();
    if (confirm(`Bạn có chắc chắn muốn xóa từ "${word}" không?`)) {
      // Optimistic delete
      setLocalVocabs(prev => prev.filter(v => v.id !== id));
      
      const res = await deleteVocabulary(id);
      if (res.success && onRefresh) {
        onRefresh();
      } else {
        setLocalVocabs(vocabularies); // Rollback
        alert("Lỗi khi xóa từ vựng!");
      }
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLTableRowElement>, vocabId: string) => {
    e.dataTransfer.setData("vocabId", vocabId);
    e.dataTransfer.effectAllowed = "move";
  };

  if (vocabularies.length === 0) {
    return (
      <div className="p-12 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 transition-colors duration-300">
        <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
        <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Chưa có từ vựng nào</p>
        <p className="text-xs text-slate-500 mt-1">Sử dụng Quick Add ở trên để thêm từ mới vào kho dữ liệu</p>
      </div>
    );
  }

  return (
    <>
      <div className="w-full overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-xl transition-colors duration-300">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
              <th className="py-4 px-5">Từ vựng (Word)</th>
              <th className="py-4 px-4">Cách đọc / Hán Việt</th>
              <th className="py-4 px-5">Nghĩa (Meaning)</th>
              <th className="py-4 px-5">Ví dụ (Example)</th>
              <th className="py-4 px-4">Thư mục</th>
              <th className="py-4 px-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 text-sm text-slate-700 dark:text-slate-200 transition-colors duration-300">
            {paginatedVocabularies.map((item) => (
              <tr 
                key={item.id} 
                draggable
                onDragStart={(e) => handleDragStart(e, item.id)}
                onClick={() => setEditingVocab(item)}
                className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group cursor-pointer"
                title="Bấm để xem và sửa chi tiết"
              >
                {/* Word & Interactive Kanji */}
                <td className="py-4 px-5 align-top">
                  <div className="text-xl font-extrabold text-slate-900 dark:text-white tracking-wide flex items-center gap-2">
                    <ClickableKanjiString text={item.word} />
                    <Edit3 className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </td>

                {/* Reading & Sino-Vietnamese */}
                <td className="py-4 px-4 align-top space-y-1">
                  {item.reading && (
                    <span className="block text-xs font-medium text-amber-700 dark:text-amber-300/90 bg-amber-100 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-500/20 w-fit">
                      {item.reading}
                    </span>
                  )}
                  {item.sinoVietnamese && (
                    <span className="block text-xs font-semibold text-indigo-600 dark:text-indigo-300 uppercase tracking-wide">
                      {item.sinoVietnamese}
                    </span>
                  )}
                </td>

                {/* Meaning */}
                <td className="py-4 px-5 align-top font-semibold text-emerald-600 dark:text-emerald-400">
                  {item.meaning}
                </td>

                {/* Example */}
                <td className="py-4 px-5 align-top text-xs space-y-2 max-w-xs">
                  {item.example ? (
                    <p className="text-slate-600 dark:text-slate-400 italic">
                      <strong className="text-slate-800 dark:text-slate-300 not-italic">VD:</strong> {item.example}
                    </p>
                  ) : (
                    <span className="text-slate-400 dark:text-slate-600 italic">---</span>
                  )}
                </td>

                {/* Folders */}
                <td className="py-4 px-4 align-top">
                  <div className="flex flex-wrap gap-1">
                    {item.folderVocabularies && item.folderVocabularies.length > 0 ? (
                      item.folderVocabularies.map((fv) => (
                        <span
                          key={fv.folderId}
                          className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap"
                        >
                          <FolderIcon className="w-3 h-3 text-indigo-500 dark:text-indigo-400" /> {getFolderFullPath(fv.folder, folders)}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 dark:text-slate-600 italic">Chưa xếp thư mục</span>
                    )}
                  </div>
                </td>

                {/* Actions */}
                <td className="py-4 px-4 align-top text-right">
                  <button
                    onClick={(e) => handleDelete(e, item.id, item.word)}
                    title="Xóa từ vựng"
                    className="p-2 text-slate-400 dark:text-slate-500 hover:text-rose-500 dark:hover:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-2xl mt-4 shadow-sm transition-colors duration-300">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Hiển thị <span className="font-bold text-slate-700 dark:text-slate-200">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> - <span className="font-bold text-slate-700 dark:text-slate-200">{Math.min(currentPage * ITEMS_PER_PAGE, vocabularies.length)}</span> trên <span className="font-bold text-slate-700 dark:text-slate-200">{vocabularies.length}</span> từ vựng
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-sm font-bold text-slate-700 dark:text-slate-200 px-2">
              {currentPage} / {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {editingVocab && (
        <VocabularyEditModal 
          vocabulary={editingVocab}
          folders={folders}
          onClose={() => setEditingVocab(null)} 
          onSuccess={() => {
            setEditingVocab(null);
            if (onRefresh) onRefresh();
          }} 
        />
      )}
    </>
  );
}
