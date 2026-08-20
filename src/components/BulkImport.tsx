"use client";

import React, { useState } from "react";
import { localDB } from "@/lib/db";
import { syncManager } from "@/lib/sync-manager";
import { 
  Upload, Copy, CheckCircle, Sparkles, Folder, 
  Bot, Wand2, Loader2, Trash2, Check, RefreshCw, AlertCircle
} from "lucide-react";
import { getFolderFullPath } from "@/lib/folder-utils";
import toast from "react-hot-toast";

interface FolderItem {
  id: string;
  name: string;
}

interface GeneratedVocabItem {
  word: string;
  meaning: string;
  reading?: string;
  sinoVietnamese?: string;
  example?: string;
  exampleMeaning?: string;
}

interface BulkImportProps {
  folders: FolderItem[];
  currentFolderId?: string;
  onSuccess?: () => void;
}

export function BulkImport({ folders, currentFolderId, onSuccess }: BulkImportProps) {
  const [activeTab, setActiveTab] = useState<"ai" | "json">("ai");
  const [aiPrompt, setAiPrompt] = useState("");
  const [vocabCount, setVocabCount] = useState<number>(20);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewList, setPreviewList] = useState<GeneratedVocabItem[]>([]);
  
  const [jsonText, setJsonText] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    currentFolderId && currentFolderId !== "all" && currentFolderId !== "unassigned" ? currentFolderId : ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (currentFolderId && currentFolderId !== "all" && currentFolderId !== "unassigned") {
      setSelectedFolderId(currentFolderId);
    } else {
      setSelectedFolderId("");
    }
  }, [currentFolderId]);

  // Prompt mẫu để người dùng copy nếu dùng ChatGPT Web
  const promptTemplate = `Hãy đóng vai một chuyên gia tiếng Nhật. Trả lời bằng định dạng JSON chuẩn (mảng các object). Hãy tạo cho tôi danh sách từ vựng tiếng Nhật.
Mỗi từ vựng phải tuân theo cấu trúc sau:
[
  {
    "word": "từ vựng Kanji/Kana (bắt buộc)",
    "meaning": "nghĩa tiếng Việt (bắt buộc)",
    "reading": "cách đọc Hiragana",
    "sinoVietnamese": "âm Hán Việt viết HOA",
    "example": "câu ví dụ tiếng Nhật",
    "exampleMeaning": "nghĩa câu ví dụ"
  }
]`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(promptTemplate);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Đã copy Prompt mẫu!");
  };

  // Tạo từ vựng tự động bằng AI qua Reverse GPT API
  const handleGenerateAI = async () => {
    if (!aiPrompt.trim()) {
      toast.error("Vui lòng nhập yêu cầu hoặc danh sách từ thô!");
      return;
    }

    setIsGenerating(true);
    setPreviewList([]);

    try {
      const res = await fetch("/api/ai/generate-vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          count: vocabCount,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Không thể tạo từ vựng bằng AI.");
      }

      setPreviewList(data.data || []);
      toast.success(`AI đã tạo thành công ${data.count} từ vựng! Hãy xem lại trước khi lưu.`);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Lỗi kết nối máy chủ AI!");
    } finally {
      setIsGenerating(false);
    }
  };

  // Xóa bớt 1 từ khỏi danh sách xem trước
  const handleRemovePreviewItem = (index: number) => {
    setPreviewList((prev) => prev.filter((_, i) => i !== index));
  };

  // Lưu danh sách từ AI vào LocalDB
  const handleSavePreview = async () => {
    if (previewList.length === 0) return;

    setIsSaving(true);
    try {
      const count = await localDB.saveBulkVocabularies(previewList, selectedFolderId || undefined);
      syncManager.notifyDataChanged();

      toast.success(`Đã lưu thành công ${count} từ vựng vào kho bài học!`);
      setPreviewList([]);
      setAiPrompt("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error("Không thể lưu từ vựng vào cơ sở dữ liệu!");
    } finally {
      setIsSaving(false);
    }
  };

  // Nhập dữ liệu thủ công từ JSON
  const handleImportJson = async () => {
    if (!jsonText.trim()) {
      toast.error("Vui lòng dán mã JSON từ vựng.");
      return;
    }

    setIsSaving(true);
    try {
      let parsed = JSON.parse(jsonText.trim());
      if (!Array.isArray(parsed)) {
        if (typeof parsed === "object" && parsed !== null) {
          const possibleArr = Object.values(parsed).find((v) => Array.isArray(v));
          if (possibleArr) {
            parsed = possibleArr as any[];
          } else {
            parsed = [parsed];
          }
        } else {
          throw new Error("Dữ liệu JSON phải là một mảng danh sách từ vựng.");
        }
      }

      const count = await localDB.saveBulkVocabularies(parsed, selectedFolderId || undefined);
      syncManager.notifyDataChanged();

      toast.success(`Đã nhập thành công ${count} từ vựng vào kho!`);
      setJsonText("");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Định dạng JSON không hợp lệ.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-5 shadow-xl animate-fadeIn transition-colors">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              Tạo & Nhập Từ Vựng Hàng Loạt
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                Free AI
              </span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tự động hóa bằng AI (Reverse GPT) hoặc dán mã JSON bài học
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab("ai")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "ai"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" /> Tạo bằng AI
          </button>
          <button
            onClick={() => setActiveTab("json")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === "json"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            <Upload className="w-3.5 h-3.5" /> Dán JSON
          </button>
        </div>
      </div>

      {/* Target Folder Selector */}
      <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <Folder className="w-4 h-4 text-amber-500 shrink-0" />
          <span>Lưu vào bài học / thư mục:</span>
        </div>
        <select
          value={selectedFolderId}
          onChange={(e) => setSelectedFolderId(e.target.value)}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-800 dark:text-slate-200 outline-none focus:border-indigo-500 max-w-full sm:max-w-xs cursor-pointer"
        >
          <option value="">-- Chưa phân loại (Lưu ở ngoài) --</option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              {getFolderFullPath(f, folders)}
            </option>
          ))}
        </select>
      </div>

      {/* TAB 1: AI GENERATION */}
      {activeTab === "ai" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Nhập yêu cầu hoặc dán danh sách từ thô / đoạn văn:
              </label>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <span>Số lượng gợi ý:</span>
                <select
                  value={vocabCount}
                  onChange={(e) => setVocabCount(parseInt(e.target.value, 10))}
                  className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md px-2 py-0.5 text-xs font-bold text-indigo-600 dark:text-indigo-400 outline-none cursor-pointer"
                >
                  <option value={10}>10 từ</option>
                  <option value={20}>20 từ</option>
                  <option value={30}>30 từ</option>
                  <option value={50}>50 từ</option>
                </select>
              </div>
            </div>

            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="VD 1: 30 từ vựng N3 chủ đề Du lịch và Khách sạn&#10;VD 2: Tổng hợp từ vựng bài 15 Minna no Nihongo&#10;VD 3: Dán danh sách thô: 食べる, 飲む, 散歩する, 約束..."
              className="w-full h-28 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-xs text-slate-800 dark:text-slate-100 outline-none custom-scrollbar transition-all"
            ></textarea>
          </div>

          <div className="flex items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-indigo-500" />
              Sử dụng mô hình GPT-4o Free Engine, tự động điền Hiragana & Hán Việt chuẩn
            </div>

            <button
              onClick={handleGenerateAI}
              disabled={isGenerating || !aiPrompt.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Đang phân tích & tạo...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4" />
                  Tạo từ vựng bằng AI
                </>
              )}
            </button>
          </div>

          {/* AI PREVIEW LIST TABLE */}
          {previewList.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 animate-fadeIn">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Kết quả AI vừa tạo ({previewList.length} từ vựng):
                  </span>
                  <span className="text-[10px] text-slate-400">Kiểm tra lại trước khi lưu</span>
                </div>
                <button
                  onClick={handleSavePreview}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  {isSaving ? "Đang lưu..." : `Lưu tất cả ${previewList.length} từ vào bài học`}
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto custom-scrollbar border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 dark:bg-slate-950/80 sticky top-0 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-2.5">Từ vựng</th>
                      <th className="p-2.5">Cách đọc</th>
                      <th className="p-2.5">Hán Việt</th>
                      <th className="p-2.5">Nghĩa tiếng Việt</th>
                      <th className="p-2.5">Ví dụ</th>
                      <th className="p-2.5 w-10 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
                    {previewList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-2.5 font-bold text-indigo-600 dark:text-indigo-400 font-japanese text-sm">
                          {item.word}
                        </td>
                        <td className="p-2.5 text-slate-600 dark:text-slate-300 font-japanese">
                          {item.reading || "-"}
                        </td>
                        <td className="p-2.5 font-semibold text-rose-600 dark:text-rose-400">
                          {item.sinoVietnamese || "-"}
                        </td>
                        <td className="p-2.5 font-medium text-slate-800 dark:text-slate-200">
                          {item.meaning}
                        </td>
                        <td className="p-2.5 text-slate-500 dark:text-slate-400 text-[11px]">
                          {item.example ? (
                            <div>
                              <div>{item.example}</div>
                              {item.exampleMeaning && <div className="text-slate-400 italic">{item.exampleMeaning}</div>}
                            </div>
                          ) : (
                            "-"
                          )}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            onClick={() => handleRemovePreviewItem(idx)}
                            className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                            title="Xóa từ này khỏi danh sách lưu"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MANUAL JSON IMPORT */}
      {activeTab === "json" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Copy Prompt mẫu để yêu cầu ChatGPT Web/Claude tạo danh sách từ vựng chuẩn JSON:
            </span>
            <button
              onClick={copyPrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm transition-all whitespace-nowrap cursor-pointer"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Đã copy!" : "Copy Prompt"}
            </button>
          </div>

          <div className="space-y-3">
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="Dán mã JSON trả về từ AI vào đây (ví dụ: [{ &quot;word&quot;: &quot;食べる&quot;, &quot;meaning&quot;: &quot;ăn&quot; }])..."
              className="w-full h-32 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-xs text-slate-700 dark:text-slate-200 font-mono outline-none custom-scrollbar transition-colors"
            ></textarea>

            <div className="flex justify-end">
              <button
                onClick={handleImportJson}
                disabled={isSaving || !jsonText.trim()}
                className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
              >
                <Upload className="w-4 h-4" /> {isSaving ? "Đang xử lý..." : "Import Ngay"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
