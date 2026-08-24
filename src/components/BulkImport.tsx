"use client";

import React, { useState, useEffect } from "react";
import { createBulkVocabulary } from "@/app/actions/vocabulary";
import { 
  Upload, Copy, CheckCircle, Sparkles, Folder, ArrowRight, ArrowLeft, Check, 
  AlertCircle, Bot, FileCode, Key, ExternalLink, Loader2, RefreshCw, Cpu, Settings2,
  ChevronDown, ChevronUp
} from "lucide-react";
import { getFolderFullPath } from "@/lib/folder-utils";
import { FolderSelector } from "./FolderSelector";
import { 
  loadGeminiSettings, saveGeminiSettings, generateVocabulariesFromRawText, 
  GeminiSettings, AVAILABLE_GEMINI_MODELS 
} from "@/lib/gemini-utils";

interface FolderItem {
  id: string;
  name: string;
  parentId?: string | null;
}

interface BulkImportProps {
  folders: FolderItem[];
  currentFolderId?: string;
  onSuccess?: () => void;
  onOpenGeminiSettings?: () => void;
}

interface ParsedVocabItem {
  word: string;
  meaning: string;
  reading?: string | null;
  sinoVietnamese?: string | null;
  example?: string | null;
  note?: string | null;
}

export function BulkImport({ folders, currentFolderId, onSuccess, onOpenGeminiSettings }: BulkImportProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [step, setStep] = useState<"input" | "preview">("input");
  const [inputMode, setInputMode] = useState<"ai" | "json">("ai");
  const [rawText, setRawText] = useState("");
  const [jsonText, setJsonText] = useState("");
  const [previewList, setPreviewList] = useState<ParsedVocabItem[]>([]);
  const [selectedFolderIds, setSelectedFolderIds] = useState<string[]>(
    currentFolderId && currentFolderId !== "all" ? [currentFolderId] : []
  );
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [geminiConfig, setGeminiConfig] = useState<GeminiSettings>({ apiKey: "", model: "gemini-3.6-flash" });

  useEffect(() => {
    setGeminiConfig(loadGeminiSettings());
  }, []);

  // Lắng nghe khi focus trở lại để cập nhật nếu vừa lưu key
  useEffect(() => {
    const handleFocus = () => {
      setGeminiConfig(loadGeminiSettings());
    };
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, []);

  useEffect(() => {
    if (currentFolderId && currentFolderId !== "all") {
      setSelectedFolderIds([currentFolderId]);
    } else {
      setSelectedFolderIds([]);
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

  // Bước 1A: Xử lý bằng Gemini AI từ văn bản thô
  const handleProcessWithAI = async () => {
    if (!rawText.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập văn bản hoặc danh sách từ vựng cần AI phân tích." });
      return;
    }

    const currentSettings = loadGeminiSettings();
    if (!currentSettings.apiKey || !currentSettings.apiKey.trim()) {
      setMessage({ 
        type: "error", 
        text: "Bạn chưa cài đặt Gemini API Key. Vui lòng bấm vào 'Cài đặt Gemini AI' để thêm API Key miễn phí." 
      });
      return;
    }

    setAiLoading(true);
    setMessage(null);

    const res = await generateVocabulariesFromRawText(
      rawText,
      currentSettings.apiKey,
      currentSettings.model
    );

    setAiLoading(false);

    if (res.success && res.data && res.data.length > 0) {
      setPreviewList(res.data);
      setMessage(null);
      setStep("preview");
    } else {
      setMessage({ type: "error", text: res.error || "Không thể phân tích từ vựng bằng AI. Vui lòng thử lại." });
    }
  };

  // Bước 1B: Phân tích JSON thủ công
  const handleProceedToPreviewJSON = () => {
    if (!jsonText.trim()) {
      setMessage({ type: "error", text: "Vui lòng nhập mã JSON từ vựng." });
      return;
    }

    try {
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
        setMessage({ type: "error", text: "Không tìm thấy từ vựng hợp lệ nào trong JSON." });
        return;
      }

      setPreviewList(validItems);
      setMessage(null);
      setStep("preview");
    } catch (err: any) {
      console.error("Lỗi parse JSON:", err);
      setMessage({ 
        type: "error", 
        text: `Cú pháp JSON không hợp lệ! Vui lòng kiểm tra lại (${err.message}).` 
      });
    }
  };

  // Bước 2: Xác nhận thêm toàn bộ từ vựng vào DB
  const handleConfirmImport = async () => {
    setLoading(true);
    setMessage(null);
    
    const res = await createBulkVocabulary(JSON.stringify(previewList), selectedFolderIds);
    setLoading(false);
    
    if (res.success) {
      setMessage({ type: "success", text: `🎉 Đã thêm thành công ${res.count} từ vựng vào kho dữ liệu!` });
      setRawText("");
      setJsonText("");
      setPreviewList([]);
      setStep("input");
      if (onSuccess) onSuccess();
    } else {
      setMessage({ type: "error", text: res.error || "Lỗi khi lưu từ vựng vào cơ sở dữ liệu." });
    }
  };

  const targetFolders = folders.filter(f => selectedFolderIds.includes(f.id));
  const hasApiKey = !!geminiConfig.apiKey?.trim();

  return (
    <div className="bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-500/30 rounded-2xl p-5 shadow-xl animate-fadeIn transition-colors mb-6">
      {/* Header Panel / Collapsible Toggle */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between cursor-pointer select-none transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20 shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 flex-wrap">
              <span>Nhập liệu hàng loạt (Bulk AI)</span>
              {hasApiKey && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/20 px-2 py-0.5 rounded-full">
                  Gemini AI Active
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {step === "input" 
                ? "Dán danh sách từ vựng thô để AI tự động phân tích hoặc dán JSON có sẵn." 
                : `Xem trước ${previewList.length} từ vựng chuẩn bị thêm`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Step indicator */}
          <div className="hidden sm:flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
            <span className={step === "input" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400"}>1. Nhập liệu</span>
            <span>→</span>
            <span className={step === "preview" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-400"}>2. Xem trước & Lưu</span>
          </div>

          <button 
            type="button"
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-100 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 animate-fadeIn">
          {step === "input" ? (
            /* ================= BƯỚC 1: NHẬP LIỆU ================= */
            <div className="flex flex-col gap-4 animate-fadeIn">
              {/* Tabs chuyển đổi giữa AI và JSON */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 dark:bg-slate-950 rounded-xl w-fit border border-slate-200 dark:border-slate-800 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setInputMode("ai");
                    setMessage(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    inputMode === "ai"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                  }`}
                >
                  <Bot className="w-3.5 h-3.5" />
                  <span>🤖 Tự động bằng Gemini AI</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setInputMode("json");
                    setMessage(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition-all ${
                    inputMode === "json"
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>📋 Dán JSON thủ công</span>
                </button>
              </div>

              {inputMode === "ai" ? (
                /* --- Chế độ 1: Tự động bằng Gemini AI --- */
                <div className="space-y-4 animate-fadeIn">
                  {!hasApiKey && (
                    <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
                        <Key className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>Bạn chưa thêm Gemini API Key để dùng tính năng AI tự động.</span>
                      </div>
                      {onOpenGeminiSettings && (
                        <button
                          type="button"
                          onClick={onOpenGeminiSettings}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg shadow-sm whitespace-nowrap text-xs"
                        >
                          Cài đặt API Key
                        </button>
                      )}
                    </div>
                  )}

                  {/* Thanh chọn nhanh Model linh hoạt khi bị giới hạn Quota */}
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950/60 p-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Cpu className="w-4 h-4 text-indigo-500 shrink-0" />
                      <span className="font-bold text-slate-700 dark:text-slate-300">Model AI:</span>
                      <select
                        value={geminiConfig.model || "gemini-3.6-flash"}
                        onChange={(e) => {
                          const newModel = e.target.value;
                          const newSettings = { ...geminiConfig, model: newModel };
                          setGeminiConfig(newSettings);
                          saveGeminiSettings(newSettings);
                        }}
                        className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 outline-none focus:border-indigo-500 cursor-pointer shadow-sm"
                      >
                        {AVAILABLE_GEMINI_MODELS.map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} {m.badge ? `(${m.badge})` : ''}
                          </option>
                        ))}
                        {!AVAILABLE_GEMINI_MODELS.some(m => m.id === geminiConfig.model) && geminiConfig.model && (
                          <option value={geminiConfig.model}>{geminiConfig.model} (Custom)</option>
                        )}
                      </select>
                    </div>

                    {onOpenGeminiSettings && (
                      <button
                        type="button"
                        onClick={onOpenGeminiSettings}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold ml-auto"
                      >
                        <Settings2 className="w-3.5 h-3.5" />
                        <span>Tùy chỉnh model khác</span>
                      </button>
                    )}
                  </div>

                  <textarea
                    value={rawText}
                    onChange={(e) => setRawText(e.target.value)}
                    placeholder="Dán bất kỳ văn bản, ghi chú hoặc danh sách từ vựng nào vào đây...
Ví dụ:
1. 逃げる (にげる) : chạy trốn
2. 捕まえる : bắt giữ
3. 抱く (いだく) : ôm ấp ước mơ
(AI sẽ tự động tìm từ vựng, Hiragana, Hán Việt, Nghĩa và đặt câu ví dụ Nhật - Việt chuẩn xác)"
                    className="w-full h-36 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-slate-700 dark:text-slate-200 outline-none custom-scrollbar transition-colors leading-relaxed"
                  ></textarea>

                  {/* Bộ chọn thư mục phân lớp thông minh (FolderSelector) */}
                  <FolderSelector
                    folders={folders}
                    selectedFolderIds={selectedFolderIds}
                    onChange={setSelectedFolderIds}
                    multiple={true}
                  />

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleProcessWithAI}
                      disabled={aiLoading || !rawText.trim()}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-600 hover:to-indigo-700 rounded-xl disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20 active:scale-95 shrink-0"
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Gemini AI đang phân tích...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" />
                          <span>AI Phân tích & Tạo từ vựng →</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                /* --- Chế độ 2: Dán JSON thủ công --- */
                <div className="space-y-4 animate-fadeIn">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950/50 p-3 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                      Copy Prompt chuẩn để dán vào ChatGPT/Claude:
                    </span>
                    <button
                      type="button"
                      onClick={copyPrompt}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase rounded-lg bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-500 text-white shadow-sm transition-all whitespace-nowrap"
                    >
                      {copied ? <CheckCircle className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? "Đã copy!" : "Copy Prompt"}
                    </button>
                  </div>

                  <textarea
                    value={jsonText}
                    onChange={(e) => setJsonText(e.target.value)}
                    placeholder="Dán mã JSON trả về từ AI vào đây... (ví dụ: [ { 'word': '...', 'meaning': '...' } ])"
                    className="w-full h-36 px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-xs text-slate-700 dark:text-slate-200 font-mono outline-none custom-scrollbar transition-colors"
                  ></textarea>

                  {/* Bộ chọn thư mục phân lớp thông minh (FolderSelector) */}
                  <FolderSelector
                    folders={folders}
                    selectedFolderIds={selectedFolderIds}
                    onChange={setSelectedFolderIds}
                    multiple={true}
                  />

                  <div className="flex justify-end pt-1">
                    <button
                      type="button"
                      onClick={handleProceedToPreviewJSON}
                      disabled={!jsonText.trim()}
                      className="flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20 active:scale-95 shrink-0"
                    >
                      <span>Tiếp tục kiểm tra</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ================= BƯỚC 2: XEM TRƯỚC (PREVIEW) ================= */
            <div className="flex flex-col gap-4 animate-fadeIn">
              {/* Thông tin tóm tắt */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-emerald-50 dark:bg-emerald-950/30 p-3.5 rounded-xl border border-emerald-200 dark:border-emerald-800/60 text-xs">
                <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold">
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Tìm thấy {previewList.length} từ vựng hợp lệ</span>
                </div>
                <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400 flex-wrap">
                  <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>Đích đến:</span>
                  {targetFolders.length === 0 ? (
                    <strong className="text-slate-800 dark:text-slate-200">Không xếp thư mục (Root)</strong>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {targetFolders.map(f => (
                        <span key={f.id} className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                          {getFolderFullPath(f, folders)}
                        </span>
                      ))}
                    </div>
                  )}
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
                  type="button"
                  onClick={() => {
                    setStep("input");
                    setMessage(null);
                  }}
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-all disabled:opacity-50"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay lại chỉnh sửa
                </button>

                <button
                  type="button"
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
      )}
    </div>
  );
}

