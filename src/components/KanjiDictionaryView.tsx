"use client";

import React, { useState, useEffect } from "react";
import { Search, Library, FileText, BookOpen, Edit3, Loader2, Type, Volume2, Wand2, X } from "lucide-react";
import { getAllKanjiNotes, upsertKanjiNote } from "@/app/actions/kanji";
import { getVocabulariesByKanji } from "@/app/actions/vocabulary";
import { VocabularyEditModal } from "./VocabularyEditModal";
import { KanjiLookupResults } from "./KanjiLookupResults";
import { playAudio } from "@/lib/tts-utils";
import { KanjiDetail } from "@/app/api/kanji/lookup/route";
import toast from "react-hot-toast";

interface KanjiNote {
  id: string;
  character: string;
  hanviet?: string | null;
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
  folderVocabularies?: { folderId: string; folder: { id: string; name: string } }[];
}

interface KanjiDictionaryViewProps {
  vocabularies: VocabularyData[];
  folders: any[];
  onRefreshVocab?: () => void;
}

export function KanjiDictionaryView({ vocabularies, folders, onRefreshVocab }: KanjiDictionaryViewProps) {
  const [kanjiNotes, setKanjiNotes] = useState<KanjiNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [selectedKanji, setSelectedKanji] = useState<KanjiNote | null>(null);
  const [apiDetail, setApiDetail] = useState<KanjiDetail | null>(null);
  const [editingVocab, setEditingVocab] = useState<VocabularyData | null>(null);
  const [relatedVocabularies, setRelatedVocabularies] = useState<VocabularyData[]>([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  
  // Trạng thái edit Kanji
  const [isEditingKanji, setIsEditingKanji] = useState(false);
  const [editKanjiForm, setEditKanjiForm] = useState({ hanviet: "", meaning: "", mnemonic: "" });
  const [savingKanji, setSavingKanji] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchKanji = async () => {
      setLoading(true);
      try {
        const notes = await getAllKanjiNotes();
        if (isMounted) {
          setKanjiNotes(Array.isArray(notes) ? notes : []);
          setLoading(false);
        }
      } catch (err) {
        console.error("Lỗi tải danh sách Hán tự:", err);
        if (isMounted) {
          setKanjiNotes([]);
          setLoading(false);
        }
      }
    };
    fetchKanji();
    return () => { isMounted = false; };
  }, []);

  // Khi chọn Kanji, lấy danh sách từ vựng từ server & thông tin từ điển
  useEffect(() => {
    let isMounted = true;
    if (selectedKanji) {
      setLoadingRelated(true);
      setApiDetail(null);

      // 1. Tải từ vựng liên quan
      getVocabulariesByKanji(selectedKanji.character)
        .then(vocabs => {
          if (isMounted) {
            setRelatedVocabularies(Array.isArray(vocabs) ? vocabs : []);
            setLoadingRelated(false);
          }
        })
        .catch(err => {
          console.error("Lỗi tải từ vựng liên quan:", err);
          if (isMounted) {
            setRelatedVocabularies([]);
            setLoadingRelated(false);
          }
        });

      // 2. Tải thông tin từ điển chi tiết (JLPT, On/Kun, nghĩa chuẩn)
      fetch(`/api/kanji/lookup?query=${encodeURIComponent(selectedKanji.character)}`)
        .then(r => r.json())
        .then(res => {
          if (isMounted && res.data && res.data.length > 0) {
            setApiDetail(res.data[0]);
          }
        })
        .catch(err => console.error("Lỗi tải thông tin API Kanji:", err));
    } else {
      setRelatedVocabularies([]);
      setApiDetail(null);
    }
    return () => { isMounted = false; };
  }, [selectedKanji]);

  // Đóng modal Kanji detail bằng phím Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedKanji && !editingVocab && !isEditingKanji) {
        setSelectedKanji(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedKanji, editingVocab, isEditingKanji]);

  // Xử lý lưu Hán tự
  const handleSaveKanji = async () => {
    if (!selectedKanji) return;
    setSavingKanji(true);
    const res = await upsertKanjiNote(selectedKanji.character, {
      hanviet: editKanjiForm.hanviet.trim(),
      meaning: editKanjiForm.meaning.trim(),
      mnemonic: editKanjiForm.mnemonic.trim(),
    });
    setSavingKanji(false);
    
    if (res.success && res.data) {
      // Cập nhật lại UI local
      const updatedKanji = { ...selectedKanji, hanviet: res.data.hanviet, meaning: res.data.meaning, mnemonic: res.data.mnemonic };
      setSelectedKanji(updatedKanji);
      setKanjiNotes(prev => prev.map(k => k.id === updatedKanji.id ? updatedKanji : k));
      setIsEditingKanji(false);
    } else if (!res.success) {
      toast.error(res.error || "Có lỗi xảy ra khi lưu!");
    }
  };

  // Lọc danh sách Hán tự hiển thị dựa theo searchQuery
  const filteredKanji = (kanjiNotes || []).filter((k) => {
    const q = searchQuery.toLowerCase();
    return (
      k?.character?.includes(q) ||
      (k?.hanviet && k.hanviet.toLowerCase().includes(q)) ||
      (k?.meaning && k.meaning.toLowerCase().includes(q)) ||
      (k?.mnemonic && k.mnemonic.toLowerCase().includes(q))
    );
  });

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
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            <Library className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">Tra cứu Hán tự</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Có tổng cộng {(kanjiNotes || []).length} Hán tự đã lưu ghi chú</p>
          </div>
        </div>

        <div className="relative w-full max-w-none sm:max-w-sm">
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
      {(filteredKanji || []).length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
          <Library className="w-10 h-10 mx-auto mb-3 text-slate-400 dark:text-slate-600" />
          <p className="text-base font-semibold text-slate-700 dark:text-slate-300">Không tìm thấy Hán tự nào</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {(filteredKanji || []).map((kanji) => (
            <div
              key={kanji.id}
              onClick={() => setSelectedKanji(kanji)}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all group active:scale-95"
            >
              <span className="text-4xl font-bold text-slate-800 dark:text-slate-100 mb-2 group-hover:scale-110 transition-transform">
                {kanji.character}
              </span>
              <span className="text-sm font-black text-rose-600 dark:text-rose-400 text-center truncate w-full uppercase tracking-wider">
                {kanji.hanviet || (kanji.meaning && kanji.meaning.length <= 6 ? kanji.meaning.toUpperCase() : "---")}
              </span>
              {kanji.meaning && kanji.hanviet && (
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 text-center truncate w-full mt-0.5">
                  {kanji.meaning}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Tra cứu Từ điển Hán tự Mở rộng (Kanji Dictionary) */}
      <KanjiLookupResults
        searchQuery={searchQuery}
        existingKanjiChars={new Set((kanjiNotes || []).map(k => k.character))}
        onSaveSuccess={async (newNote) => {
          if (newNote) {
            setKanjiNotes(prev => {
              const existing = prev.findIndex(k => k.character === newNote.character);
              if (existing >= 0) {
                const next = [...prev];
                next[existing] = { ...next[existing], ...newNote };
                return next;
              }
              return [newNote, ...prev];
            });
          }
          if (onRefreshVocab) onRefreshVocab();
        }}
      />

      {/* Modal Chi tiết Hán tự & Từ vựng liên quan */}
      {selectedKanji && (
        <div 
          className="fixed inset-0 z-40 flex items-center justify-center p-4 bg-transparent animate-fadeIn"
          onClick={() => setSelectedKanji(null)}
        >
          <div 
            className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Đóng */}
            <div className="absolute top-4 right-4 z-20">
              <button 
                onClick={() => {
                  setSelectedKanji(null);
                  setIsEditingKanji(false);
                }}
                className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 backdrop-blur-sm rounded-full transition-colors shadow-sm"
              >
                ✕
              </button>
            </div>

            {/* Nội dung cuộn được toàn bộ */}
            <div className="overflow-y-auto custom-scrollbar flex-1 flex flex-col">
              {/* Header Kanji */}
              <div className="p-4 sm:p-6 bg-gradient-to-br from-amber-50 dark:from-amber-500/10 via-white dark:via-slate-900 to-rose-50 dark:to-rose-500/10 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center sm:items-start gap-4 sm:gap-6 relative">
                <div className="flex-shrink-0 flex flex-col items-center">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-bold text-4xl sm:text-5xl flex items-center justify-center shadow-lg shadow-amber-500/30">
                    {selectedKanji.character}
                  </div>
                  {apiDetail?.stroke_count && (
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-2">
                      {apiDetail.stroke_count} nét
                    </span>
                  )}
                </div>

                <div className="flex-1 w-full min-w-0 pr-8">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Thông tin Hán tự
                      </span>
                      {apiDetail?.jlpt && (
                        <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                          N{String(apiDetail.jlpt).replace(/^N/i, "")}
                        </span>
                      )}
                    </div>

                    {isEditingKanji && apiDetail && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditKanjiForm({
                            hanviet: apiDetail.hanviet || editKanjiForm.hanviet,
                            meaning: apiDetail.mean || editKanjiForm.meaning,
                            mnemonic: editKanjiForm.mnemonic
                          });
                        }}
                        className="inline-flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-bold"
                      >
                        <Wand2 className="w-3.5 h-3.5" /> Điền từ điển
                      </button>
                    )}
                  </div>
                  
                  {isEditingKanji ? (
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1">
                          <Type className="w-3.5 h-3.5" /> ÂM HÁN VIỆT
                        </div>
                        <input
                          type="text"
                          value={editKanjiForm.hanviet}
                          onChange={(e) => setEditKanjiForm(prev => ({ ...prev, hanviet: e.target.value.toUpperCase() }))}
                          className="w-full px-3 py-1.5 rounded-lg text-sm font-bold bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-100 uppercase"
                          placeholder="Ví dụ: QUẢNG"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                          <FileText className="w-3.5 h-3.5" /> NGHĨA
                        </div>
                        <input
                          type="text"
                          value={editKanjiForm.meaning}
                          onChange={(e) => setEditKanjiForm(prev => ({ ...prev, meaning: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-100"
                          placeholder="Nhập nghĩa..."
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-1">
                          <BookOpen className="w-3.5 h-3.5" /> MẸO NHỚ
                        </div>
                        <textarea
                          value={editKanjiForm.mnemonic}
                          onChange={(e) => setEditKanjiForm(prev => ({ ...prev, mnemonic: e.target.value }))}
                          className="w-full px-3 py-1.5 rounded-lg text-sm bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-100 min-h-[60px]"
                          placeholder="Nhập mẹo nhớ..."
                        />
                      </div>
                      <div className="flex items-center justify-end gap-2 pt-1">
                        <button 
                          onClick={() => setIsEditingKanji(false)}
                          className="text-xs px-3 py-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 font-medium"
                        >
                          Hủy
                        </button>
                        <button 
                          onClick={handleSaveKanji}
                          disabled={savingKanji}
                          className="text-xs px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg disabled:opacity-50 transition-colors shadow-md shadow-indigo-500/20"
                        >
                          {savingKanji ? "Đang lưu..." : "Lưu thay đổi"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 cursor-pointer group" onClick={() => {
                      let defaultHanviet = selectedKanji.hanviet || "";
                      let defaultMeaning = selectedKanji.meaning || "";
                      
                      if (defaultMeaning && apiDetail?.hanviet && defaultMeaning.toUpperCase() === apiDetail.hanviet) {
                        defaultHanviet = apiDetail.hanviet;
                        defaultMeaning = apiDetail.mean || "";
                      } else {
                        if (!defaultHanviet && apiDetail?.hanviet) defaultHanviet = apiDetail.hanviet;
                        if (!defaultMeaning && apiDetail?.mean) defaultMeaning = apiDetail.mean;
                      }
                      
                      setEditKanjiForm({ hanviet: defaultHanviet, meaning: defaultMeaning, mnemonic: selectedKanji.mnemonic || "" });
                      setIsEditingKanji(true);
                    }}>
                      <div className="p-2 -mx-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors relative">
                        <Edit3 className="w-3.5 h-3.5 absolute top-2 right-2 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-0.5">
                          <Type className="w-3.5 h-3.5" /> ÂM HÁN VIỆT
                        </div>
                        <div className="text-xl font-black tracking-wider text-rose-600 dark:text-rose-400 uppercase mb-2">
                          {selectedKanji.hanviet || apiDetail?.hanviet || <span className="text-slate-400 italic font-normal text-sm lowercase">Nhấn để thêm âm Hán Việt...</span>}
                        </div>

                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 mb-0.5">
                          <FileText className="w-3.5 h-3.5" /> NGHĨA
                        </div>
                        <div className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3">
                          {selectedKanji.meaning || apiDetail?.mean || <span className="text-slate-400 italic font-normal text-sm">Nhấn để thêm nghĩa...</span>}
                        </div>

                        {/* On / Kun từ điển */}
                        {apiDetail && (apiDetail.on_readings.length > 0 || apiDetail.kun_readings.length > 0) && (
                          <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 mb-3 space-y-1.5 text-xs">
                            {apiDetail.on_readings.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-rose-500 uppercase">On:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {apiDetail.on_readings.join("、 ")}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playAudio(apiDetail.on_readings[0]);
                                  }}
                                  className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                                  title="Nghe âm On"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                            {apiDetail.kun_readings.length > 0 && (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[10px] font-bold text-indigo-500 uppercase">Kun:</span>
                                <span className="font-semibold text-slate-800 dark:text-slate-200">
                                  {apiDetail.kun_readings.join("、 ")}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    playAudio(apiDetail.kun_readings[0].replace(".", ""));
                                  }}
                                  className="p-1 text-slate-400 hover:text-indigo-500 rounded transition-colors"
                                  title="Nghe âm Kun"
                                >
                                  <Volume2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400 mb-0.5 mt-2">
                          <BookOpen className="w-3.5 h-3.5" /> MẸO NHỚ
                        </div>
                        <div className="text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
                          {selectedKanji.mnemonic || <span className="text-slate-400 italic">Nhấn để thêm mẹo nhớ...</span>}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* List Từ vựng */}
              <div className="p-6 flex-1 bg-slate-50 dark:bg-slate-950/30">
                <h4 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center justify-between">
                  Từ vựng chứa {selectedKanji.character}
                  {!loadingRelated && (
                    <span className="text-xs font-medium text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                      {(relatedVocabularies || []).length} từ
                    </span>
                  )}
                </h4>
                
                {loadingRelated ? (sName="text-xs font-medium text-slate-500 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {(relatedVocabularies || []).length} từ
                  </span>
                )}
              </h4>
              
              {loadingRelated ? (
                <div className="text-center p-8 text-slate-500 flex flex-col items-center">
                  <Loader2 className="w-6 h-6 animate-spin mb-2 text-indigo-500" />
                  <span className="text-xs">Đang tìm từ vựng trong CSDL...</span>
                </div>
              ) : (relatedVocabularies || []).length === 0 ? (
                <div className="text-center p-8 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 text-sm">
                  Chưa có từ vựng nào trong CSDL chứa Hán tự này.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {(relatedVocabularies || []).map(vocab => (
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
          folders={folders}
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
