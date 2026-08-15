"use client";

import React, { useState } from "react";
import { createBulkVocabulary } from "@/app/actions/vocabulary";
import { Upload, Copy, CheckCircle, Sparkles, Folder } from "lucide-react";
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

export function BulkImport({ folders, currentFolderId, onSuccess }: BulkImportProps) {
  const [jsonText, setJsonText] = useState("");
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

  const handleImport = async () => {
    if (!jsonText.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập JSON từ vựng." });
      return;
    }
    
    setLoading(true);
    setMessage(null);
    
    const res = await createBulkVocabulary(jsonText, selectedFolderId || undefined);
    setLoading(false);
    
    if (res.success) {
      setMessage({ type: "success", text: `Đã nhập thành công ${res.count} từ vựng!` });
      setJsonText("");
      if (onSuccess) onSuccess();
    } else {
      setMessage({ type: "error", text: res.error || "Lỗi khi import." });
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-5 shadow-xl animate-fadeIn transition-colors">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">Nhập liệu hàng loạt bằng AI (Bulk Import)</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Copy prompt dưới đây, yêu cầu AI tạo từ vựng, rồi dán kết quả JSON vào đây.</p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {/* Nút Copy Prompt */}
        <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
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
            placeholder="Dán mã JSON trả về từ AI vào đây..."
            className="w-full h-32 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-slate-700 dark:text-slate-200 font-mono outline-none custom-scrollbar transition-colors"
          ></textarea>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Folder className="w-4 h-4 text-slate-400 dark:text-slate-400" />
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-700 dark:text-slate-300 outline-none focus:border-indigo-500 transition-colors"
              >
                <option value="">-- Không xếp thư mục --</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{getFolderFullPath(f, folders)}</option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleImport}
              disabled={loading || !jsonText.trim()}
              className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
            >
              <Upload className="w-4 h-4" /> {loading ? "Đang xử lý..." : "Import Ngay"}
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div className={`mt-3 p-2.5 text-xs rounded-lg border ${message.type === 'success' ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-400' : 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30 text-rose-700 dark:text-rose-400'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
