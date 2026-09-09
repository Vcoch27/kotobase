"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getKanjiNote, upsertKanjiNote } from "@/app/actions/kanji";
import { X, Save, Sparkles, BookOpen, FileText, Type, Volume2, Wand2 } from "lucide-react";
import { playAudio } from "@/lib/tts-utils";
import { KanjiDetail } from "@/app/api/kanji/lookup/route";
import { HighlightMnemonic } from "./HighlightMnemonic";
import toast from "react-hot-toast";

interface KanjiModalProps {
  character: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function KanjiModal({ character, isOpen, onClose }: KanjiModalProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [mnemonic, setMnemonic] = useState("");
  const [meaning, setMeaning] = useState("");
  const [hanviet, setHanviet] = useState("");
  const [apiDetail, setApiDetail] = useState<KanjiDetail | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen && character) {
      setLoading(true);
      setMessage(null);
      setApiDetail(null);

      Promise.all([
        getKanjiNote(character).catch(() => null),
        fetch(`/api/kanji/lookup?query=${encodeURIComponent(character.trim())}`)
          .then((r) => r.json())
          .catch(() => ({ data: [] })),
      ]).then(([dbRes, apiRes]) => {
        const apiData: KanjiDetail | null =
          apiRes?.data && apiRes.data.length > 0 ? apiRes.data[0] : null;
        setApiDetail(apiData);

        // Nguồn ưu tiên: dữ liệu đã lưu từ DB (getKanjiNote hoặc apiData.savedNote)
        const savedData = dbRes || (apiData?.isSaved ? apiData.savedNote : null);

        if (savedData) {
          const finalHanviet = savedData.hanviet || apiData?.hanviet || "";
          const finalMeaning = savedData.meaning || apiData?.mean || "";
          const finalMnemonic = savedData.mnemonic || "";

          setMnemonic(finalMnemonic);
          setMeaning(finalMeaning);
          setHanviet(finalHanviet);
        } else {
          setMnemonic(apiData?.mnemonic || "");
          setMeaning(apiData?.mean || "");
          setHanviet(apiData?.hanviet || "");
        }
        setLoading(false);
      });
    }
  }, [isOpen, character]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !character || !mounted) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await upsertKanjiNote(character, {
        mnemonic: mnemonic.trim(),
        meaning: meaning.trim(),
        hanviet: hanviet.trim(),
      });
      setSaving(false);
      if (res.success) {
        toast.success("Đã lưu ghi chú Hán tự thành công!");
        setMessage({ type: "success", text: "Đã cập nhật Hán tự thành công!" });
        setTimeout(() => setMessage(null), 3000);
      } else {
        toast.error(res.error || "Lỗi khi lưu!");
        setMessage({ type: "error", text: res.error || "Lỗi khi lưu!" });
      }
    } catch (err: any) {
      setSaving(false);
      toast.error("Lỗi khi kết nối máy chủ để lưu!");
      setMessage({ type: "error", text: "Lỗi kết nối máy chủ!" });
    }
  };

  const fillFromApi = () => {
    if (apiDetail) {
      if (apiDetail.hanviet) setHanviet(apiDetail.hanviet);
      if (apiDetail.mean) setMeaning(apiDetail.mean);
      toast.success("Đã khôi phục nghĩa & âm đọc từ từ điển!");
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn tracking-normal font-sans text-base font-normal text-left leading-normal cursor-default"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-2xl lg:max-w-3xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl text-slate-900 dark:text-slate-100 transition-colors my-auto max-h-[95vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header với hiệu ứng gradient */}
        <div className="relative p-4 sm:p-5 bg-gradient-to-br from-indigo-50 dark:from-indigo-900/60 via-white dark:via-slate-900 to-amber-50 dark:to-amber-900/40 border-b border-slate-200 dark:border-slate-700/60 transition-colors flex-shrink-0">
          <button
            onClick={onClose}
            className="absolute top-3.5 right-3.5 sm:top-4 sm:right-4 p-1.5 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3.5 sm:gap-4 pr-8">
            <div className="flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-black text-3xl sm:text-4xl shadow-md shadow-amber-500/20 border border-amber-300/30 flex-shrink-0">
              {character}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/20 text-[11px] font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> Chi tiết Hán tự
                </span>
                {apiDetail?.jlpt && (
                  <span className="text-[11px] font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                    N{String(apiDetail.jlpt).replace(/^N/i, "")}
                  </span>
                )}
                {apiDetail?.stroke_count && (
                  <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {apiDetail.stroke_count} nét
                  </span>
                )}
                {(mnemonic || apiDetail?.isSaved) && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-500/30">
                    ✓ Đã có ghi chú
                  </span>
                )}
              </div>
              <h2 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Hán tự {character}
                {hanviet && (
                  <span className="text-xs sm:text-sm font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-500/20">
                    {hanviet}
                  </span>
                )}
              </h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-10 text-center text-slate-500 dark:text-slate-400">
            <div className="inline-block w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium">Đang tải thông tin Hán tự từ từ điển...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-4 sm:p-5 space-y-3.5 overflow-y-auto custom-scrollbar flex-1">
            {message && (
              <div
                className={`p-2.5 text-xs rounded-xl border ${
                  message.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Thông tin Tra cứu Từ điển (Onyomi / Kunyomi) - Thanh ngang gọn gàng */}
            {apiDetail && (apiDetail.on_readings.length > 0 || apiDetail.kun_readings.length > 0) && (
              <div className="px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                <div className="flex items-center gap-4 flex-wrap">
                  {apiDetail.on_readings.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-rose-500 uppercase tracking-wider">On:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {apiDetail.on_readings.join("、 ")}
                      </span>
                      <button
                        type="button"
                        onClick={() => playAudio(apiDetail.on_readings[0])}
                        className="p-0.5 text-slate-400 hover:text-rose-500 rounded transition-colors"
                        title="Nghe âm On"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {apiDetail.kun_readings.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Kun:</span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {apiDetail.kun_readings.join("、 ")}
                      </span>
                      <button
                        type="button"
                        onClick={() => playAudio(apiDetail.kun_readings[0].replace(".", ""))}
                        className="p-0.5 text-slate-400 hover:text-indigo-500 rounded transition-colors"
                        title="Nghe âm Kun"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={fillFromApi}
                  className="inline-flex items-center gap-1 text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                >
                  <Wand2 className="w-3 h-3" /> Tự động điền lại
                </button>
              </div>
            )}

            {/* Grid 2 cột: Âm Hán Việt (1/3) & Nghĩa tiếng Việt (2/3) */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <div className="sm:col-span-4">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <Type className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Âm Hán Việt
                </label>
                <input
                  type="text"
                  value={hanviet}
                  onChange={(e) => setHanviet(e.target.value.toUpperCase())}
                  placeholder="VD: KHÁT"
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-bold tracking-wide text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all uppercase"
                />
              </div>

              <div className="sm:col-span-8">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <FileText className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" /> Nghĩa tiếng Việt
                </label>
                <input
                  type="text"
                  value={meaning}
                  onChange={(e) => setMeaning(e.target.value)}
                  placeholder="Nghĩa Hán tự..."
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
                />
              </div>
            </div>

            {/* Mẹo nhớ (Mnemonic) & Hiển thị trực quan song song 2 cột */}
            <div>
              <div className="flex items-center justify-between mb-1.5 flex-wrap gap-1">
                <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <BookOpen className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" /> Mẹo nhớ (Mnemonic)
                </label>
                <div className="flex items-center gap-2 text-[10px] text-slate-500 dark:text-slate-400">
                  <span className="inline-flex items-center gap-1 font-semibold text-indigo-600 dark:text-indigo-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500"></span> Viết hoa đầu: Bộ thủ
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> HOA HẾT: Nghĩa gốc
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex flex-col">
                  <textarea
                    rows={3}
                    value={mnemonic}
                    onChange={(e) => setMnemonic(e.target.value)}
                    placeholder="Ví dụ: cô gái dùng Khăn lau Thực phẩm dính trên trang SỨC..."
                    className="w-full h-full min-h-[86px] px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all leading-relaxed resize-y"
                  />
                </div>

                <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 min-h-[86px] flex flex-col justify-start overflow-y-auto max-h-[140px] custom-scrollbar">
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                    Hiển thị trực quan:
                  </span>
                  <div className="text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                    {mnemonic.trim() ? (
                      <HighlightMnemonic text={mnemonic} />
                    ) : (
                      <span className="text-slate-400 dark:text-slate-500 italic text-xs">
                        Nội dung highlight sẽ xuất hiện trực quan ở đây khi bạn nhập...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200 dark:border-slate-800 flex-shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Đóng
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2 text-xs font-semibold text-slate-900 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 transition-all"
              >
                <Save className="w-4 h-4" /> {saving ? "Đang lưu..." : "Lưu Hán tự"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body
  );
}
