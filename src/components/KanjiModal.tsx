"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getKanjiNote, upsertKanjiNote } from "@/app/actions/kanji";
import { X, Save, Sparkles, BookOpen, FileText, Type, Volume2, Wand2 } from "lucide-react";
import { playAudio } from "@/lib/tts-utils";
import { KanjiDetail } from "@/app/api/kanji/lookup/route";

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
        getKanjiNote(character),
        fetch(`/api/kanji/lookup?query=${encodeURIComponent(character)}`).then(r => r.json()).catch(() => ({ data: [] }))
      ]).then(([dbRes, apiRes]) => {
        const apiData: KanjiDetail | null = (apiRes?.data && apiRes.data.length > 0) ? apiRes.data[0] : null;
        setApiDetail(apiData);

        if (dbRes) {
          let finalHanviet = dbRes.hanviet || "";
          let finalMeaning = dbRes.meaning || "";

          // Tự động hoán đổi/sửa lại nếu âm Hán Việt bị lưu nhầm vào trường meaning trước đó
          if (finalMeaning && apiData?.hanviet && finalMeaning.toUpperCase() === apiData.hanviet) {
            finalHanviet = apiData.hanviet;
            finalMeaning = apiData.mean || "";
          } else {
            if (!finalHanviet && apiData?.hanviet) finalHanviet = apiData.hanviet;
            if (!finalMeaning && apiData?.mean) finalMeaning = apiData.mean;
          }

          setMnemonic(dbRes.mnemonic || "");
          setMeaning(finalMeaning);
          setHanviet(finalHanviet);
        } else {
          setMnemonic("");
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
    const res = await upsertKanjiNote(character, {
      mnemonic,
      meaning,
      hanviet,
    });
    setSaving(false);
    if (res.success) {
      setMessage({ type: "success", text: "Đã cập nhật Hán tự thành công!" });
      setTimeout(() => setMessage(null), 3000);
    } else {
      setMessage({ type: "error", text: res.error || "Lỗi khi lưu!" });
    }
  };

  const fillFromApi = () => {
    if (apiDetail) {
      if (apiDetail.hanviet) setHanviet(apiDetail.hanviet);
      if (apiDetail.mean) setMeaning(apiDetail.mean);
    }
  };

  return createPortal(
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fadeIn tracking-normal font-sans text-base font-normal text-left leading-normal cursor-default"
      onClick={onClose}
    >
      <div 
        className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700/80 shadow-2xl text-slate-900 dark:text-slate-100 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header với hiệu ứng gradient */}
        <div className="relative p-6 bg-gradient-to-br from-indigo-50 dark:from-indigo-900/60 via-white dark:via-slate-900 to-purple-50 dark:to-purple-900/40 border-b border-slate-200 dark:border-slate-700/60 transition-colors">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-5">
            <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 text-white font-black text-4xl shadow-lg shadow-amber-500/20 border border-amber-300/30">
              {character}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap mb-1">
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-500/20 text-xs font-semibold uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5" /> Chi tiết Hán tự
                </span>
                {apiDetail?.jlpt && (
                  <span className="text-xs font-bold uppercase px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                    N{String(apiDetail.jlpt).replace(/^N/i, "")}
                  </span>
                )}
                {apiDetail?.stroke_count && (
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                    {apiDetail.stroke_count} nét
                  </span>
                )}
              </div>
              <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Hán tự {character}
                {hanviet && (
                  <span className="text-sm font-black text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-500/20">
                    {hanviet}
                  </span>
                )}
              </h2>
            </div>
          </div>
        </div>

        {/* Content Body */}
        {loading ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <div className="inline-block w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mb-3"></div>
            <p className="text-sm font-medium">Đang tải thông tin Hán tự từ từ điển...</p>
          </div>
        ) : (
          <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
            {message && (
              <div
                className={`p-3 text-xs rounded-xl border ${
                  message.type === "success"
                    ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
                    : "bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400"
                }`}
              >
                {message.text}
              </div>
            )}

            {/* Thông tin Tra cứu Từ điển (Onyomi / Kunyomi) */}
            {apiDetail && (apiDetail.on_readings.length > 0 || apiDetail.kun_readings.length > 0) && (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs">
                <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-[11px] font-bold uppercase">
                  <span>Thông tin từ điển Hán Việt</span>
                  <button
                    type="button"
                    onClick={fillFromApi}
                    className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-semibold"
                  >
                    <Wand2 className="w-3 h-3" /> Tự động điền lại
                  </button>
                </div>

                {apiDetail.on_readings.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-rose-500 uppercase">On:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {apiDetail.on_readings.join("、 ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => playAudio(apiDetail.on_readings[0])}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded transition-colors"
                      title="Nghe âm On"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {apiDetail.kun_readings.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase">Kun:</span>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {apiDetail.kun_readings.join("、 ")}
                    </span>
                    <button
                      type="button"
                      onClick={() => playAudio(apiDetail.kun_readings[0].replace(".", ""))}
                      className="p-1 text-slate-400 hover:text-indigo-500 rounded transition-colors"
                      title="Nghe âm Kun"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Hanviet / Âm Hán Việt */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <Type className="w-4 h-4 text-indigo-500 dark:text-indigo-400" /> Âm Hán Việt (Ví dụ: QUẢNG)
              </label>
              <input
                type="text"
                value={hanviet}
                onChange={(e) => setHanviet(e.target.value.toUpperCase())}
                placeholder="Nhập Âm Hán Việt..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-bold tracking-wide text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all uppercase"
              />
            </div>

            {/* Meaning / Nghĩa */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <FileText className="w-4 h-4 text-emerald-500 dark:text-emerald-400" /> Nghĩa tiếng Việt
              </label>
              <input
                type="text"
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="Nghĩa Hán tự..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
              />
            </div>

            {/* Mnemonic / Mẹo nhớ */}
            <div>
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                <BookOpen className="w-4 h-4 text-amber-500 dark:text-amber-400" /> Mẹo nhớ (Mnemonic)
              </label>
              <input
                type="text"
                value={mnemonic}
                onChange={(e) => setMnemonic(e.target.value)}
                placeholder="Ví dụ: Miệng (口) mở ra gọi điện thoại..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
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
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold text-slate-900 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 transition-all"
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
