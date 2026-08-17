"use client";

import React, { useState, useEffect, useRef } from "react";
import { Library, Volume2, Plus, Check, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";
import { playAudio } from "@/lib/tts-utils";
import { upsertKanjiNote } from "@/app/actions/kanji";
import { KanjiDetail } from "@/app/api/kanji/lookup/route";

interface KanjiLookupResultsProps {
  searchQuery: string;
  existingKanjiChars: Set<string>;
  onSaveSuccess?: () => void;
}

export function KanjiLookupResults({ searchQuery, existingKanjiChars, onSaveSuccess }: KanjiLookupResultsProps) {
  const [results, setResults] = useState<KanjiDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingChar, setSavingChar] = useState<string | null>(null);
  const [localSavedChars, setLocalSavedChars] = useState<Set<string>>(new Set());
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
        const res = await fetch(`/api/kanji/lookup?query=${encodeURIComponent(searchQuery.trim())}`);
        const data = await res.json();
        setResults(Array.isArray(data.data) ? data.data : []);
      } catch (error) {
        console.error("Lỗi khi tra cứu Kanji:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 450);

    return () => {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    };
  }, [searchQuery]);

  const handleQuickSave = async (item: KanjiDetail) => {
    setSavingChar(item.kanji);
    const meaningText = item.mean || item.meanings.slice(0, 3).join(", ");
    
    const res = await upsertKanjiNote(item.kanji, {
      hanviet: item.hanviet || "",
      meaning: meaningText,
    });

    setSavingChar(null);
    if (res.success) {
      toast.success("Đã lưu Hán tự vào kho!");
      setLocalSavedChars(prev => new Set(prev).add(item.kanji));
      if (onSaveSuccess) onSaveSuccess();
    } else {
      toast.error("Không thể lưu Hán tự vào kho!");
    }
  };

  const getJlptBadgeColor = (jlptVal?: string | number) => {
    if (!jlptVal) return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
    const str = String(jlptVal).toUpperCase();
    if (str.includes("5")) return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/30";
    if (str.includes("4")) return "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border-teal-300 dark:border-teal-500/30";
    if (str.includes("3")) return "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300 border-sky-300 dark:border-sky-500/30";
    if (str.includes("2")) return "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-300 border-indigo-300 dark:border-indigo-500/30";
    if (str.includes("1")) return "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300 border-rose-300 dark:border-rose-500/30";
    return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700";
  };

  if (!searchQuery.trim()) return null;

  return (
    <div className="mt-8 space-y-4 animate-fadeIn">
      {/* Header khu vực Tra cứu Kanji mở rộng */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400">
            <Library className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              Từ điển Hán tự & Hán Việt Mở rộng
              <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                Hán Việt / Mazii
              </span>
            </h3>
          </div>
        </div>
        {loading ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <div className="w-3.5 h-3.5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            Đang tra Hán tự...
          </div>
        ) : (
          <span className="text-xs text-slate-400">
            {results.length > 0 ? `Tìm thấy ${results.length} Hán tự` : "Không có kết quả"}
          </span>
        )}
      </div>

      {/* Danh sách thẻ Kanji */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2].map(i => (
            <div key={i} className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse flex gap-4">
              <div className="w-20 h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl"></div>
              <div className="flex-1 space-y-2">
                <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-1/3"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
                <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="p-8 text-center bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
          Không tìm thấy Hán tự nào tương ứng với "{searchQuery}".
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((item) => {
            const isAlreadySaved = existingKanjiChars.has(item.kanji) || localSavedChars.has(item.kanji);
            const isSaving = savingChar === item.kanji;
            const primaryAudioText = (item.on_readings[0] || item.kun_readings[0] || item.kanji).replace(".", "");

            return (
              <div 
                key={item.kanji}
                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 dark:hover:border-amber-500/50 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-start gap-4">
                    {/* Kanji Character Box */}
                    <div className="flex-shrink-0 flex flex-col items-center">
                      <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-black text-4xl flex items-center justify-center shadow-lg shadow-amber-500/25">
                        {item.kanji}
                      </div>
                      {item.stroke_count && (
                        <span className="text-[10px] font-semibold text-slate-400 mt-1.5">
                          {item.stroke_count} nét
                        </span>
                      )}
                    </div>

                    {/* Kanji Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {item.jlpt && (
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border ${getJlptBadgeColor(item.jlpt)}`}>
                              N{String(item.jlpt).replace(/^N/i, "")}
                            </span>
                          )}
                          {item.hanviet && (
                            <span className="text-sm font-black text-rose-600 dark:text-rose-400 tracking-wider uppercase bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-500/20">
                              {item.hanviet}
                            </span>
                          )}
                        </div>

                        {/* Nút lưu vào kho */}
                        <button
                          onClick={() => handleQuickSave(item)}
                          disabled={isAlreadySaved || isSaving}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm ${
                            isAlreadySaved
                              ? "bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30"
                              : "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-amber-500/20 active:scale-95"
                          }`}
                          title="Lưu vào kho Hán tự cá nhân"
                        >
                          {isSaving ? (
                            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          ) : isAlreadySaved ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Đã có trong kho
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" /> Lưu vào kho
                            </>
                          )}
                        </button>
                      </div>

                      {/* Nghĩa tiếng Việt */}
                      <div className="mb-2">
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block line-clamp-2">
                          Nghĩa: {item.mean || item.meanings.join(", ")}
                        </span>
                      </div>

                      {/* On / Kun Readings */}
                      <div className="space-y-1 text-xs">
                        {item.on_readings.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-rose-500 dark:text-rose-400 uppercase">On:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {item.on_readings.join("、 ")}
                            </span>
                          </div>
                        )}
                        {item.kun_readings.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase">Kun:</span>
                            <span className="font-semibold text-slate-700 dark:text-slate-200">
                              {item.kun_readings.join("、 ")}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer link & Audio */}
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <button
                    onClick={() => playAudio(primaryAudioText)}
                    className="inline-flex items-center gap-1 hover:text-amber-500 transition-colors font-medium"
                  >
                    <Volume2 className="w-3.5 h-3.5" /> Nghe phát âm
                  </button>
                  <a 
                    href={`https://jisho.org/search/${encodeURIComponent(item.kanji)}%20%23kanji`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 hover:text-amber-500 transition-colors"
                  >
                    Xem nét viết trên Jisho <ExternalLink className="w-3 h-3" />
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
