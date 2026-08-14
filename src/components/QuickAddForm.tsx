"use client";

import React, { useState, useEffect, useRef } from "react";
import { createVocabulary } from "@/app/actions/vocabulary";
import { Plus, AlertTriangle, Sparkles, Folder, Check, ChevronDown, ChevronUp } from "lucide-react";
import { getFolderFullPath } from "@/lib/folder-utils";

interface FolderItem {
  id: string;
  name: string;
}

interface QuickAddFormProps {
  folders: FolderItem[];
  onSuccess?: () => void;
}

export function QuickAddForm({ folders, onSuccess }: QuickAddFormProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [reading, setReading] = useState("");
  const [sinoVietnamese, setSinoVietnamese] = useState("");
  const [example, setExample] = useState("");
  const [note, setNote] = useState("");
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>([]);

  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(false);
  const [duplicateInfo, setDuplicateInfo] = useState<{
    exists: boolean;
    vocab?: any;
    kanjiNotes?: any[];
  } | null>(null);

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-check duplication khi người dùng gõ từ vựng
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!word.trim()) {
      setDuplicateInfo(null);
      setChecking(false);
      return;
    }

    setChecking(true);
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/vocabulary/check-duplicate?word=${encodeURIComponent(word.trim())}`);
        const data = await res.json();
        if (data.exists || (data.kanjiNotes && data.kanjiNotes.length > 0)) {
          setDuplicateInfo({
            exists: data.exists,
            vocab: data.duplicateVocab,
            kanjiNotes: data.kanjiNotes,
          });
        } else {
          setDuplicateInfo(null);
        }
      } catch (err) {
        console.error("Lỗi kiểm tra trùng từ:", err);
      } finally {
        setChecking(false);
      }
    }, 350);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [word]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!word.trim() || !meaning.trim()) return;

    setLoading(true);
    const res = await createVocabulary({
      word,
      meaning,
      reading,
      sinoVietnamese,
      example,
      note,
      folderIds: selectedFolderIds,
    });
    setLoading(false);

    if (res.success) {
      // Reset form
      setWord("");
      setMeaning("");
      setReading("");
      setSinoVietnamese("");
      setExample("");
      setNote("");
      setDuplicateInfo(null);
      if (onSuccess) onSuccess();
    } else {
      alert(res.error || "Không thể thêm từ vựng!");
    }
  };

  const toggleFolderSelect = (folderId: string) => {
    setSelectedFolderIds((prev) =>
      prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]
    );
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl mb-6 transition-all duration-300">
      {/* Header bar / Quick Toggle */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-100 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Thêm nhanh Từ vựng (Quick Add)</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Tự động phát hiện trùng lặp & kiểm tra Kanji thông minh</p>
          </div>
        </div>
        <button className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>

      {/* Form Content */}
      {isExpanded && (
        <form onSubmit={handleSubmit} className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4 animate-fadeIn">
          {/* Cảnh báo trùng lặp tức thì (Non-blocking Alert Popup) */}
          {checking && (
            <div className="p-3 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700/50 flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-amber-500 dark:border-amber-400 border-t-transparent rounded-full animate-spin"></span>
              Đang kiểm tra từ trùng lặp & dữ liệu Kanji...
            </div>
          )}

          {duplicateInfo?.exists && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/30 text-amber-800 dark:text-amber-200 text-xs space-y-2 animate-bounce-short shadow-lg">
              <div className="flex items-center gap-2 font-bold text-amber-600 dark:text-amber-400 text-sm">
                <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 shrink-0" />
                ⚠️ Từ này đã tồn tại trong hệ thống!
              </div>
              <div className="bg-white/60 dark:bg-slate-950/60 p-3 rounded-lg border border-amber-200/50 dark:border-amber-500/20 space-y-1 text-slate-700 dark:text-slate-300">
                <p>
                  <strong className="text-amber-600 dark:text-amber-300">Từ gốc:</strong> {duplicateInfo.vocab.word}{" "}
                  {duplicateInfo.vocab.reading && `(${duplicateInfo.vocab.reading})`}
                </p>
                <p>
                  <strong className="text-amber-600 dark:text-amber-300">Nghĩa hiện tại:</strong> {duplicateInfo.vocab.meaning}
                </p>
              </div>
            </div>
          )}

          {duplicateInfo?.kanjiNotes && duplicateInfo.kanjiNotes.length > 0 && (
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-200 dark:border-indigo-500/30 text-xs text-indigo-800 dark:text-indigo-200 space-y-1.5">
              <span className="font-semibold text-indigo-600 dark:text-indigo-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" /> Tìm thấy ghi chú Hán tự có sẵn:
              </span>
              <div className="flex flex-wrap gap-2 pt-1">
                {duplicateInfo.kanjiNotes.map((kn) => (
                  <span
                    key={kn.id}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-indigo-950/80 border border-indigo-200 dark:border-indigo-500/40 text-slate-700 dark:text-slate-200"
                  >
                    <strong className="text-indigo-600 dark:text-indigo-400">{kn.character}:</strong> {kn.mnemonic || "Đã lưu"}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Input Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Word (Bắt buộc) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Từ vựng (Word) <span className="text-rose-500 dark:text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={word}
                onChange={(e) => setWord(e.target.value)}
                placeholder="Nhập từ (VD: 呼吸, 勉強)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
              />
            </div>

            {/* Meaning (Bắt buộc) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Nghĩa của từ (Meaning) <span className="text-rose-500 dark:text-rose-400">*</span>
              </label>
              <input
                type="text"
                required
                value={meaning}
                onChange={(e) => setMeaning(e.target.value)}
                placeholder="Nhập nghĩa (VD: Hô hấp, hít thở)..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
              />
            </div>

            {/* Reading */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Cách đọc (Furigana/Reading)</label>
              <input
                type="text"
                value={reading}
                onChange={(e) => setReading(e.target.value)}
                placeholder="VD: こきゅう..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
              />
            </div>

            {/* Sino-Vietnamese */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Âm Hán Việt</label>
              <input
                type="text"
                value={sinoVietnamese}
                onChange={(e) => setSinoVietnamese(e.target.value)}
                placeholder="VD: HÔ HẤP..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Example */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Ví dụ minh họa (Example)</label>
            <textarea
              rows={2}
              value={example}
              onChange={(e) => setExample(e.target.value)}
              placeholder="VD: 深呼吸をする (Hít thở sâu)..."
              className="w-full px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none transition-all"
            />
          </div>

          {/* Folder Tag Selection */}
          {folders.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" /> Chọn Thư mục (Playlist/Tag)
              </label>
              <div className="flex flex-wrap gap-2">
                {folders.map((f) => {
                  const selected = selectedFolderIds.includes(f.id);
                  return (
                    <button
                      type="button"
                      key={f.id}
                      onClick={() => toggleFolderSelect(f.id)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${
                        selected
                          ? "bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30"
                          : "bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800"
                      }`}
                    >
                      {selected && <Check className="w-3.5 h-3.5" />} {getFolderFullPath(f, folders)}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setWord("");
                setMeaning("");
                setReading("");
                setSinoVietnamese("");
                setExample("");
                setNote("");
                setDuplicateInfo(null);
              }}
              className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Hủy / Xóa trắng
            </button>
            <button
              type="submit"
              disabled={loading || !word.trim() || !meaning.trim()}
              className="inline-flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-slate-900 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 disabled:opacity-50 transition-all"
            >
              <Plus className="w-4 h-4" /> {loading ? "Đang lưu..." : "Thêm từ vựng mới"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
