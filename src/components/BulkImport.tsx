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
  onSuccess?: () => void;
}

export function BulkImport({ folders, onSuccess }: BulkImportProps) {
  const [jsonText, setJsonText] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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
    <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 shadow-xl animate-fadeIn">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          <Sparkles className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-100">Nhập liệu hàng loạt bằng AI (Bulk Import)</h3>
          <p className="text-xs text-slate-400">Copy prompt dưới đây, yêu cầu AI tạo từ vựng, rồi dán kết quả JSON vào đây.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cột trái: Prompt mẫu */}
        <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 relative">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 block">Prompt gợi ý cho ChatGPT / Claude:</span>
          <p className="text-xs text-slate-300 whitespace-pre-wrap font-mono leading-relaxed opacity-80 h-32 overflow-y-auto custom-scrollbar">
            {promptText}
          </p>
          <button
            onClick={copyPrompt}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-bold uppercase rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white shadow-md transition-all"
          >
            {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Đã copy!" : "Copy Prompt"}
          </button>
        </div>

        {/* Cột phải: Khung nhập JSON và chọn Folder */}
        <div className="space-y-3">
          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder="Dán mã JSON trả về từ AI vào đây..."
            className="w-full h-24 px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-slate-200 font-mono outline-none custom-scrollbar"
          ></textarea>

          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Folder className="w-4 h-4 text-slate-400" />
              <select
                value={selectedFolderId}
                onChange={(e) => setSelectedFolderId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-300 outline-none focus:border-indigo-500"
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
        <div className={`mt-3 p-2.5 text-xs rounded-lg border ${message.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'}`}>
          {message.text}
        </div>
      )}
    </div>
  );
}
