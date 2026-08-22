"use client";

import React, { useState } from "react";
import { createBulkVocabulary } from "@/app/actions/vocabulary";
import { Upload, Copy, CheckCircle, Sparkles, Folder, ArrowRight, ArrowLeft, Check, AlertCircle } from "lucide-react";
import { getFolderFullPath } from "@/lib/folder-utils";

interface FolderItem {
  id: string;
  name: string;
}

interface BulkImportProps {
  folders: FolderItem[];
  currentFolderId?: string;
  onSuccess?: () => void;
}

interface ParsedVocabItem {
  word: string;
  meaning: string;
  reading?: string | null;
  sinoVietnamese?: string | null;
  example?: string | null;
  note?: string | null;
}

export function BulkImport({ folders, currentFolderId, onSuccess }: BulkImportProps) {
  const [step, setStep] = useState<"input" | "preview">("input");
  const [jsonText, setJsonText] = useState("");
  const [previewList, setPreviewList] = useState<ParsedVocabItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>(
    currentFolderId && currentFolderId !== "all" ? currentFolderId : ""
  );
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  React.useEffect(() => {
    if (currentFolderId && currentFolderId !== "all") {
      setSelectedFolderId(currentFolderId);
    } else {
      setSelectedFolderId("");
    }
  }, [currentFolderId]);

  const promptText = `Hãy đóng vai một chuyên gia tiếng Nhật. Trả lời bằng định dạng JSON chuẩn (mảng các object). Hãy tạo cho tôi danh sách từ vựng tiếng Nhật.
Mỗi từ vựng phải tuân theo cấu trúc sau:
{
  "word": "từ vựng (bắt buộc)",
  "meaning": "nghĩa tiếng Việt (bắt buộc)",
  "reading": "cách đọc Hiragana",
  "sinoVietnamese": "âm Hán Việt",
  "example": "ví dụ câu (tiếng Nhật - tiếng Việt)"
}
Ví dụ:
[
  {
    "word": "逃げる",
    "meaning": "chạy trốn",
    "reading": "にげる",
    "sinoVietnamese": "ĐÀO",
    "example": "犯人は海外に逃げた。(Thủ phạm đã trốn ra nước ngoài.)"
  }
]`;

  const copyPrompt = () => {
    navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Bước 1: Phân tích JSON và chuyển sang màn hình Preview
  const handleProceedToPreview = () => {
    if (!jsonText.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập JSON từ vựng." });
      return;
    }

    try {
      // Làm sạch chuỗi JSON nếu có dính markdown code block ```json ... ```
      let cleanedJson = jsonText.trim();
      if (cleanedJson.startsWith("```")) {
        cleanedJson = cleanedJson.replace(/^```(json)?\n?/, "").replace(/```$/, "").trim();
      }

      const dataList = JSON.parse(cleanedJson);
      if (!Array.isArray(dataList)) {
        setMessage({ type: "error", text: "Dữ liệu JSON phải là một mảng danh sách [ { ... }, { ... } ]." });
        return;
      }

      const validItems: ParsedVocabItem[] = dataList.filter((item: any) => item && item.word && item.meaning);

      if (validItems.length === 0) {
        setMessage({ type: "error", text: "Không tìm thấy từ vựng hợp lệ nào trong JSON (mỗi từ cần có ít nhất trường 'word' và 'meaning')." });
        return;
      }

      setPreviewList(validItems);
      setMessage(null);
      setStep("preview");
    } catch (err: any) {
      console.error("Lỗi parse JSON:", err);
      setMessage({ 
        type: "error", 
        text: `Cú pháp JSON không hợp lệ! Vui lòng kiểm tra lại dấu ngoặc, dấu phẩy (${err.message}).` 
      });
    }
  };

  // Bước 2: Xác nhận thêm toàn bộ từ vựng vào DB
  const handleConfirmImport = async () => {
    setLoading(true);
    setMessage(null);
    
    // Gửi chuỗi JSON của previewList đã được làm sạch
    const res = await createBulkVocabulary(JSON.stringify(previewList), selectedFolderId || undefined);
    setLoading(false);
    
    if (res.success) {
      setMessage({ type: "success", text: `🎉 Đã thêm thành công ${res.count} từ vựng vào kho dữ liệu!` });
      setJsonText("");
      setPreviewList([]);
      setStep("input");
      if (onSuccess) onSuccess();
    } else {
      setMessage({ type: "error", text: res.error || "Lỗi khi lưu từ vựng vào cơ sở dữ liệu." });
    }
  };

  const targetFolderName = selectedFolderId
    ? getFolderFullPath(folders.find(f => f.id === selectedFolderId) || { name: 'Thư mục đã chọn' }, folders)
    : "Không xếp thư mục (Root)";

  return (
    <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-5 shadow-xl animate-fadeIn transition-colors">
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Nhập liệu hàng loạt bằng AI (Bulk Import)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {step === "input" 
                ? "Dán kết quả JSON từ AI vào đây để kiểm tra trước khi thêm." 
                : `Xem trước ${previewList.length} từ vựng chuẩn bị thêm vào "${targetFolderName}"`}
            </p>
          </div>
        </div>

        {/* Step indicator badge */}
        <div className="flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
          <span className={step === "input" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}>1. Nhập JSON</span>
          <span>→</span>
          <span className={step === "preview" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>2. Xem trước & Lưu</span>
        </div>
      </div>

      {step === "input" ? (
        /* ================= BƯỚC 1: NHẬP LIỆU ================= */
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Nút Copy Prompt */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
              Copy Prompt này để yêu cầu ChatGPT/Claude tạo danh sách từ vựng chuẩn JSON:
            </span>
            <button
              onClick={copyPrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase rounded-lg bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-500 dark:hover:bg-indigo-400 text-white shadow-sm transition-all whitespace-nowrap"
            >
              {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Đã copy!" : "Copy Prompt"}
            </button>
          </div>

          {/* Khung nhập JSON và chọn Folder */}
          <div className="space-y-3">
            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              placeholder="Dán mã JSON trả về từ AI vào đây... (ví dụ: [ { 'word': '...', 'meaning': '...' } ])"
              className="w-full h-36 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-slate-700 dark:text-slate-200 font-mono outline-none custom-scrollbar transition-colors"
            ></textarea>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1">
                <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">-- Không xếp thư mục (Root) --</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>{getFolderFullPath(f, folders)}</option>
                  ))}
                </select>
              </div>
              
              <button
                onClick={handleProceedToPreview}
                disabled={!jsonText.trim()}
                className="flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
              >
                <span>Tiếp tục kiểm tra</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ================= BƯỚC 2: XEM TRƯỚC (PREVIEW) ================= */
        <div className="flex flex-col gap-4 animate-fadeIn">
          {/* Thông tin tóm tắt */}
          <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs">
            <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
              <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Tìm thấy {previewList.length} từ vựng hợp lệ</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
              <Folder className="w-3.5 h-3.5 text-amber-500" />
              <span>Đích đến: <strong className="text-slate-800 dark:text-slate-200">{targetFolderName}</strong></span>
            </div>
          </div>

          {/* Danh sách cuộn xem trước */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/40 max-h-72 overflow-y-auto custom-scrollbar">
            <div className="divide-y divide-slate-200/80 dark:divide-slate-800/80">
              {previewList.map((item, idx) => (
                <div key={idx} className="p-3 hover:bg-white dark:hover:bg-slate-900/60 transition-colors flex items-start gap-3 text-xs">
                  <span className="font-mono font-bold text-[11px] text-slate-400 dark:text-slate-500 w-6 shrink-0 pt-0.5">
                    #{idx + 1}
                  </span>
                  
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {item.word}
                      </span>
                      {item.reading && (
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/10 px-2 py-0.2 rounded border border-amber-300 dark:border-amber-500/20">
                          {item.reading}
                        </span>
                      )}
                      {item.sinoVietnamese && (
                        <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider bg-indigo-50 dark:bg-indigo-500/10 px-1.5 py-0.2 rounded border border-indigo-200 dark:border-indigo-500/20">
                          {item.sinoVietnamese}
                        </span>
                      )}
                    </div>

                    <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {item.meaning}
                    </div>

                    {item.example && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                        <strong className="not-italic text-slate-700 dark:text-slate-300">VD:</strong> {item.example}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Nút hành động */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              onClick={() => {
                setStep("input");
                setMessage(null);
              }}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all disabled:opacity-50"
            >
              <ArrowLeft className="w-4 h-4" /> Quay lại sửa JSON
            </button>

            <button
              onClick={handleConfirmImport}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              {loading ? "Đang lưu vào dữ liệu..." : `Xác nhận thêm ${previewList.length} từ vựng`}
            </button>
          </div>
        </div>
      )}

      {message && (
        <div className={`mt-3 p-3 text-xs rounded-xl border flex items-start gap-2 animate-fadeIn ${
          message.type === 'success' 
            ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400 font-medium' 
            : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400 font-medium'
        }`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 shrink-0 text-emerald-500" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />}
          <span>{message.text}</span>
        </div>
      )}
    </div>
  );
}

