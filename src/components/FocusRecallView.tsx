"use client";

import React, { useState } from "react";
import { ClickableKanjiString } from "./ClickableKanjiString";
import { Eye, EyeOff, Folder as FolderIcon, Trash2, HelpCircle } from "lucide-react";
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

interface FocusRecallViewProps {
  vocabularies: VocabularyData[];
  onRefresh?: () => void;
}

export function FocusRecallView({ vocabularies, onRefresh }: FocusRecallViewProps) {
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const toggleAll = (reveal: boolean) => {
    const nextState: Record<string, boolean> = {};
    vocabularies.forEach((item) => {
      nextState[item.id] = reveal;
    });
    setExpandedIds(nextState);
  };

  const handleDelete = async (id: string, word: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm(`Bạn có chắc muốn xóa từ "${word}" không?`)) {
      const res = await deleteVocabulary(id);
      if (res.success && onRefresh) {
        onRefresh();
      }
    }
  };

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, vocabId: string) => {
    e.dataTransfer.setData("vocabId", vocabId);
    e.dataTransfer.effectAllowed = "move";
  };

  if (vocabularies.length === 0) {
    return (
      <div className="p-12 text-center bg-slate-900/60 rounded-2xl border border-slate-800 text-slate-400">
        <HelpCircle className="w-10 h-10 mx-auto mb-3 text-slate-600" />
        <p className="text-base font-semibold text-slate-300">Không có dữ liệu ôn tập</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Control Bar: Quick Reveal / Hide All */}
      <div className="flex items-center justify-between px-2">
        <span className="text-xs text-slate-400 font-medium">
          Chế độ Ôn tập & Ghi nhớ ({vocabularies.length} từ)
        </span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleAll(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            <Eye className="w-3.5 h-3.5 text-indigo-400" /> Hiển thị tất cả
          </button>
          <button
            onClick={() => toggleAll(false)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition-colors"
          >
            <EyeOff className="w-3.5 h-3.5 text-rose-400" /> Ẩn tất cả (Focus)
          </button>
        </div>
      </div>

      {/* Accordion / Flashcard Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {vocabularies.map((item) => {
          const isExpanded = !!expandedIds[item.id];

          return (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              onClick={() => toggleExpand(item.id)}
              className={`group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 cursor-grab active:cursor-grabbing ${
                isExpanded
                  ? "bg-slate-900 border-indigo-500/50 shadow-xl shadow-indigo-950/40"
                  : "bg-slate-900/90 border-slate-800 hover:border-slate-700 hover:bg-slate-900"
              }`}
              title="Kéo thả Card này vào Thư mục ở cột trái để di chuyển"
            >
              {/* Card Header: Chỉ hiển thị Từ vựng (Word) ban đầu */}
              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-2xl font-black text-white tracking-wide">
                    <ClickableKanjiString text={item.word} />
                  </div>
                  {!isExpanded && (
                    <span className="text-xs text-slate-500 italic flex items-center gap-1">
                      <HelpCircle className="w-3.5 h-3.5" /> Bấm để mở đáp án
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => handleDelete(item.id, item.word, e)}
                    className="p-1.5 text-slate-600 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div
                    className={`p-2 rounded-xl border transition-all ${
                      isExpanded
                        ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}
                  >
                    {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </div>
                </div>
              </div>

              {/* Reveal Section khi bấm Expand */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-3 border-t border-slate-800/80 bg-slate-950/40 space-y-3 animate-fadeIn">
                  {/* Reading & Sino-Vietnamese */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {item.reading && (
                      <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 text-xs font-semibold border border-amber-500/20">
                        {item.reading}
                      </span>
                    )}
                    {item.sinoVietnamese && (
                      <span className="text-xs font-bold text-indigo-400 uppercase">
                        {item.sinoVietnamese}
                      </span>
                    )}
                  </div>

                  {/* Meaning */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 block uppercase">Nghĩa tiếng Việt</span>
                    <p className="text-base font-bold text-emerald-400 mt-0.5">{item.meaning}</p>
                  </div>

                  {/* Example */}
                  {item.example && (
                    <div className="text-xs text-slate-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800">
                      <strong className="text-slate-400 block mb-0.5">Ví dụ:</strong>
                      <p className="italic text-slate-300">{item.example}</p>
                    </div>
                  )}

                  {/* Folders */}
                  <div className="flex items-center justify-between pt-1 text-xs text-slate-400">
                    <div className="flex flex-wrap gap-1 ml-auto">
                      {item.folderVocabularies?.map((fv) => (
                        <span
                          key={fv.folderId}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300"
                        >
                          <FolderIcon className="w-2.5 h-2.5 text-indigo-400" /> {fv.folder.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
