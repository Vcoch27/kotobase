"use client";

import React, { useState, useEffect } from "react";
import { Search, Library, FileText, BookOpen, Edit3 } from "lucide-react";
import { getAllKanjiNotes } from "@/app/actions/kanji";
import { VocabularyEditModal } from "./VocabularyEditModal";

interface KanjiNote {
  id: string;
  character: string;
  meaning?: string | null;
  mnemonic?: string | null;
}

interface VocabularyData {
  id: string;
  word: string;
  meaning: string;
  reading?: string | null;
  sinoVietnamese?: string | null;
  example?: string | null;
  note?: string | null;
}

interface KanjiDictionaryViewProps {
  vocabularies: VocabularyData[];
  onRefreshVocab?: () => void;
}

export function KanjiDictionaryView({ vocabularies, onRefreshVocab }: KanjiDictionaryViewProps) {
  const [kanjiNotes, setKanjiNotes] = useState<KanjiNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedKanji, setSelectedKanji] = useState<KanjiNote | null>(null);
  const [editingVocab, setEditingVocab] = useState<VocabularyData | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchKanji = async () => {
      setLoading(true);
      const notes = await getAllKanjiNotes();
      if (isMounted) {
        setKanjiNotes(notes);
        setLoading(false);
      }
    };
    fetchKanji();
    return () => { isMounted = false; };
  }, []);

  // Đóng modal Kanji detail bằng phím Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedKanji && !editingVocab) {
        setSelectedKanji(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedKanji, editingVocab]);

  // Lọc danh sách Hán tự hiển thị dựa theo searchQuery
  const filteredKanji = kanjiNotes.filter((k) => {
    const q = searchQuery.toLowerCase();
    return (
      k.character.includes(q) ||
      (k.meaning && k.meaning.toLowerCase().includes(q)) ||
      (k.mnemonic && k.mnemonic.toLowerCase().includes(q))
    );
  });

  // Tìm các từ vựng chứa Hán tự đang được chọn
  const relatedVocabularies = selectedKanji
    ? vocabularies.filter(v => v.word.includes(selectedKanji.character))
    : [];

  if (loading) {
    return (
      <div className="p-16 text-center text-slate-500 dark:text-slate-400">
        <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-sm font-medium">Đang tải từ điển Hán tự...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn transition-colors">
      {/* Thanh tìm kiếm */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Tra cứu Hán tự</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Có tổng cộng {kanjiNotes.length} Hán tự đã lưu ghi chú</p>
          </div>
        </div>

        <div className="relative w-full max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm theo chữ Hán, nghĩa, hoặc mẹo nhớ..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-slate-700 dark:text-slate-200 outline-none transition-all"
          />
        </div>
      </div>

      {/* Grid danh sách Hán tự */}
      {filteredKanji.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
          <Library className="w-10 h-10 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Không tìm thấy Hán tự nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredKanji.map((kanji) => (
            <div
              key={kanji.id}
              onClick={() => setSelectedKanji(kanji)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all group active:scale-95"
            >
              <span className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:scale-110 transition-transform">
                {kanji.character}
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 text-center truncate w-full">
                {kanji.meaning || "---"}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Modal Chi tiết Hán tự & Từ vựng liên quan */}
      {selectedKanji && (
        <div 
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-900/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedKanji(null)}
        >
          <div 
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header Kanji */}
            <div className="p-6 bg-gradient-to-br from-amber-50 dark:from-amber-500/10 via-white dark:via-slate-900 to-rose-50 dark:to-rose-500/10 border-b border-slate-200 dark:border-slate-800 flex items-start gap-6 relative">
              <div className="flex-shrink-0 w-24 h-24 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-bold text-5xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                {selectedKanji.character}
              </div>
              <div className="flex-1">
                <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Thông tin Hán tự</h3>
                
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">
                      <FileText className="w-3.5 h-3.5" /> NGHĨA
                    </div>
                    <div className="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {selectedKanji.meaning || <span className="text-slate-400 italic font-normal text-sm">Chưa có nghĩa</span>}
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-0.5">
                      <BookOpen className="w-3.5 h-3.5" /> MẸO NHỚ
                    </div>
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                      {selectedKanji.mnemonic || <span className="text-slate-400 italic">Chưa có mẹo nhớ</span>}
                    </div>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setSelectedKanji(null)}
                className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>

            {/* List Từ vựng */}
            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-slate-50 dark:bg-slate-950/30">
              <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center justify-between">
                Từ vựng chứa {selectedKanji.character}
                <span className="text-xs font-medium text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                  {relatedVocabularies.length} từ
                </span>
              </h4>
              
              {relatedVocabularies.length === 0 ? (
                <div className="text-center p-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 text-sm">
                  Chưa có từ vựng nào trong CSDL chứa Hán tự này.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {relatedVocabularies.map(vocab => (
                    <div 
                      key={vocab.id}
                      onClick={() => setEditingVocab(vocab)}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 rounded-xl p-3 cursor-pointer group transition-all hover:shadow-md"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-lg font-black text-slate-800 dark:text-slate-100">{vocab.word}</span>
                        <Edit3 className="w-4 h-4 text-slate-400 group-hover:text-indigo-500 transition-colors opacity-0 group-hover:opacity-100" />
                      </div>
                      <div className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">
                        {vocab.reading || "---"}
                      </div>
                      <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 line-clamp-1">
                        {vocab.meaning}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tái sử dụng VocabularyEditModal */}
      {editingVocab && (
        <VocabularyEditModal 
          vocabulary={editingVocab} 
          onClose={() => setEditingVocab(null)} 
          onSuccess={() => {
            setEditingVocab(null);
            if (onRefreshVocab) onRefreshVocab();
          }} 
        />
      )}
    </div>
  );
}
