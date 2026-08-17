"use client";

import React, { useState, useEffect, useRef } from "react";
import { BookOpen, Volume2, Plus, Check, Globe, Sparkles, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { playAudio } from "@/lib/tts-utils";
import { createVocabulary } from "@/app/actions/vocabulary";

interface JishoJapanese {
  word?: string;
  reading?: string;
}

interface JishoSense {
  english_definitions: string[];
  parts_of_speech: string[];
  tags: string[];
  antonyms?: string[];
  see_also?: string[];
}

export interface JishoResult {
  slug: string;
  is_common?: boolean;
  jlpt?: string[];
  japanese: JishoJapanese[];
  senses: JishoSense[];
}

interface JishoSearchResultsProps {
  searchQuery: string;
  currentFolderId?: string;
  onAddedSuccess?: () => void;
}

export function JishoSearchResults({ searchQuery, currentFolderId, onAddedSuccess }: JishoSearchResultsProps) {
  const [results, setResults] = useState<JishoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [addingSlug, setAddingSlug] = useState<string | null>(null);
  const [addedSlugs, setAddedSlugs] = useState<Set<string>>(new Set());
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!searchQuery || !searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/jisho?keyword=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        setResults(Array.isArray(data.data) ? data.data.slice(0, 10) : []); // Lấy 10 kết quả chuẩn nhất
      } catch (error) {
        console.error("Lỗi khi tìm kiếm Jisho:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  const handleQuickAdd = async (item: JishoResult) => {
    const mainJapanese = item.japanese[0] || {};
    const wordText = mainJapanese.word || mainJapanese.reading || item.slug;
    const readingText = mainJapanese.reading || "";
    
    // Gom các nét nghĩa chính
    const meaningText = item.senses
      .slice(0, 3)
      .map(s => s.english_definitions.join(", "))
      .filter(Boolean)
      .join(" | ");

    setAddingSlug(item.slug);

    const folderIds = currentFolderId && currentFolderId !== "all" ? [currentFolderId] : [];
    const res = await createVocabulary({
      word: wordText,
      reading: readingText,
      meaning: meaningText || "Từ điển Jisho",
      folderIds,
    });

    setAddingSlug(null);
    if (res.success) {
      setAddedSlugs(prev => new Set(prev).add(item.slug));
      toast.success("Đã lưu từ vựng vào kho!");
      if (onAddedSuccess) onAddedSuccess();
    } else {
      toast.error(res.error || "Không thể lưu từ vựng vào kho!");
    }
  };

  const getJlptBadgeColor = (jlptTag: string) => {
    const level = jlptTag.toLowerCase();
    if (level.includes("n5")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30";
    if (level.includes("n4")) return "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border-teal-300 dark:border-teal-500/30";
    if (level.includes("n3")) return "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border-sky-300 dark:border-sky-500/30";
    if (level.includes("n2")) return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/30";
    if (level.includes("n1")) return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-300 dark:border-rose-500/30";
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  };

  if (!searchQuery.trim()) return null;

  return (
    <div className="mt-8 space-y-4 animate-fadeIn">
      {/* Header khu vực Tra cứu Jisho */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-sky-100 dark:bg-sky-500/20 text-sky-600 dark:text-sky-400">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Tra cứu Từ điển Jisho Trực tuyến
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                Jisho.org API
              </span>
            </h3>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="w-3.5 h-3.5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
            Đang tra từ điển...
          </div>
        ) : (
          <span className="text-xs text-slate-400">
            {results.length > 0 ? `Tìm thấy ${results.length} kết quả liên quan` : "Không có kết quả"}
          </span>
        )}
      </div>

      {/* Danh sách kết quả Jisho */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse space-y-3">
              <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
              <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          Không tìm thấy từ nào khớp với từ khóa "{searchQuery}" trên từ điển Jisho.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((item, idx) => {
            const mainJapanese = item.japanese[0] || {};
            const wordDisplay = mainJapanese.word || mainJapanese.reading || item.slug;
            const readingDisplay = mainJapanese.word ? mainJapanese.reading : null;
            const isAdded = addedSlugs.has(item.slug);
            const isAdding = addingSlug === item.slug;

            return (
              <div 
                key={`${item.slug}-${idx}`}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-sky-300 dark:hover:border-sky-500/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Top Bar: Badges & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center flex-wrap gap-1.5">
                      {item.is_common && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300 border border-amber-300 dark:border-amber-500/30">
                          Common
                        </span>
                      )}
                      {(item.jlpt || []).map(jlpt => (
                        <span 
                          key={jlpt}
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getJlptBadgeColor(jlpt)}`}
                        >
                          {jlpt.replace("jlpt-", "")}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Nút phát âm thanh */}
                      <button
                        onClick={() => playAudio(readingDisplay || wordDisplay)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-sky-600 dark:hover:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-500/10 transition-colors"
                        title="Nghe phát âm"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>

                      {/* Nút Thêm vào Kotobase */}
                      <button
                        onClick={() => handleQuickAdd(item)}
                        disabled={isAdded || isAdding}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                          isAdded
                            ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                            : "bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white shadow-sky-500/20 active:scale-95"
                        }`}
                        title="Lưu từ này vào kho Kotobase"
                      >
                        {isAdding ? (
                          <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : isAdded ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Đã lưu
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" /> Thêm vào kho
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Word & Reading */}
                  <div className="mb-3">
                    {readingDisplay && (
                      <span className="block text-xs font-bold text-amber-600 dark:text-amber-400 tracking-wide mb-0.5">
                        {readingDisplay}
                      </span>
                    )}
                    <h4 className="text-2xl font-black text-slate-900 dark:text-white tracking-wide">
                      {wordDisplay}
                    </h4>
                  </div>

                  {/* Senses / Definitions */}
                  <div className="space-y-2 text-xs">
                    {item.senses.slice(0, 3).map((sense, sIdx) => (
                      <div key={sIdx} className="space-y-1">
                        {sense.parts_of_speech && sense.parts_of_speech.length > 0 && (
                          <span className="text-[10px] font-semibold text-indigo-500 dark:text-indigo-400 block italic">
                            [{sense.parts_of_speech.join(", ")}]
                          </span>
                        )}
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                          <span className="text-slate-400 font-bold mr-1.5">{sIdx + 1}.</span>
                          {sense.english_definitions.join("; ")}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer link to Jisho */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Nguồn: JMdict / Jisho.org</span>
                  <a 
                    href={`https://jisho.org/search/${encodeURIComponent(wordDisplay)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-sky-500 transition-colors"
                  >
                    Xem trên Jisho <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
