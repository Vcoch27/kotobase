"use client";

import React, { useState, useEffect } from "react";
import { 
  Sparkles, Bot, FileCode, Copy, Check, RotateCcw, Save, Play, 
  CheckCircle, AlertCircle, Info, Sliders, Code, Tag, Loader2, ArrowRight, BookOpen, MessageSquare, ShieldCheck
} from "lucide-react";
import { type PromptConfig, DEFAULT_PROMPTS } from "@/lib/prompt-templates";
import { updateSystemPrompt, resetSystemPrompt } from "@/app/actions/prompt";
import { generateVocabulariesFromRawText, loadGeminiSettings } from "@/lib/gemini-utils";
import toast from "react-hot-toast";

interface PromptManagementPanelProps {
  initialPrompts: Record<string, PromptConfig>;
  currentUserEmail?: string | null;
}

export function PromptManagementPanel({
  initialPrompts,
  currentUserEmail,
}: PromptManagementPanelProps) {
  const [prompts, setPrompts] = useState<Record<string, PromptConfig>>(initialPrompts || DEFAULT_PROMPTS);
  const [activePromptId, setActivePromptId] = useState<string>("vocab_ai_extract");
  const [editContent, setEditContent] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [hasCopied, setHasCopied] = useState(false);

  // Testing Sandbox State
  const [testInput, setTestInput] = useState<string>("1. 逃げる (にげる) : chạy trốn\n2. 抱く (いだく) : ôm ấp ước mơ\n3. 捕まえる : bắt giữ");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const activePrompt = prompts[activePromptId] || DEFAULT_PROMPTS[activePromptId];

  // Sync editor when active prompt changes
  useEffect(() => {
    if (activePrompt) {
      setEditContent(activePrompt.content || activePrompt.defaultContent);
      setTestResult(null);
      setTestError(null);
    }
  }, [activePromptId, prompts]);

  const isModifiedFromDefault = editContent.trim() !== activePrompt?.defaultContent.trim();
  const hasUnsavedChanges = editContent !== (activePrompt?.content || activePrompt?.defaultContent);

  // Handle Save
  const handleSave = async () => {
    if (!editContent.trim()) {
      toast.error("Nội dung prompt không được để trống!");
      return;
    }

    setIsSaving(true);
    try {
      const res = await updateSystemPrompt(activePromptId, editContent);
      if (res.success) {
        toast.success(`Đã lưu prompt "${activePrompt.title}" thành công!`);
        setPrompts((prev) => ({
          ...prev,
          [activePromptId]: {
            ...prev[activePromptId],
            content: editContent,
            updatedAt: new Date().toISOString(),
            updatedBy: currentUserEmail || "admin",
          },
        }));
      } else {
        toast.error(res.error || "Không thể lưu prompt.");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi mạng khi lưu prompt.");
    } finally {
      setIsSaving(false);
    }
  };

  // Handle Reset to Default
  const handleReset = async () => {
    if (!confirm(`Bạn có chắc muốn khôi phục Prompt "${activePrompt.title}" về phiên bản chuẩn mặc định gốc?`)) {
      return;
    }

    setIsResetting(true);
    try {
      const res = await resetSystemPrompt(activePromptId);
      if (res.success && res.defaultContent) {
        toast.success("Đã khôi phục prompt về mặc định gốc!");
        setEditContent(res.defaultContent);
        setPrompts((prev) => ({
          ...prev,
          [activePromptId]: {
            ...prev[activePromptId],
            content: res.defaultContent!,
            updatedAt: new Date().toISOString(),
            updatedBy: `${currentUserEmail || "admin"} (Reset)`,
          },
        }));
      } else {
        toast.error(res.error || "Không thể khôi phục prompt.");
      }
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi khôi phục prompt.");
    } finally {
      setIsResetting(false);
    }
  };

  // Copy current content to clipboard
  const handleCopy = () => {
    navigator.clipboard.writeText(editContent);
    setHasCopied(true);
    toast.success("Đã copy nội dung prompt vào clipboard!");
    setTimeout(() => setHasCopied(false), 2000);
  };

  // Insert Variable Tag into textarea
  const handleInsertVariable = (varName: string) => {
    setEditContent((prev) => {
      if (prev.includes(varName)) {
        toast("Biến này đã có trong prompt!", { icon: "ℹ️" });
        return prev;
      }
      return prev + `\n\n${varName}`;
    });
  };

  // Test Run with Gemini AI
  const handleTestWithGemini = async () => {
    if (!testInput.trim()) {
      toast.error("Vui lòng nhập nội dung mẫu để test!");
      return;
    }

    const geminiSettings = loadGeminiSettings();
    if (!geminiSettings.apiKey || !geminiSettings.apiKey.trim()) {
      toast.error("Chưa cấu hình Gemini API Key trên trình duyệt. Vui lòng vào Cài đặt Gemini AI trên trang chủ trước.");
      return;
    }

    setIsTesting(true);
    setTestError(null);
    setTestResult(null);

    try {
      const res = await generateVocabulariesFromRawText(
        testInput,
        geminiSettings.apiKey,
        geminiSettings.model,
        editContent
      );

      if (res.success && res.data) {
        setTestResult(res.data);
        toast.success(`Gemini AI đã phân tích thành công ${res.data.length} từ vựng!`);
      } else {
        setTestError(res.error || "Không nhận được dữ liệu hợp lệ từ Gemini AI.");
      }
    } catch (err: any) {
      setTestError(err.message || "Lỗi kết nối tới Gemini AI.");
    } finally {
      setIsTesting(false);
    }
  };

  // Group prompts by category
  const promptList = Object.values(prompts);
  const vocabPrompts = promptList.filter((p) => p.category === "vocabulary");
  const otherPrompts = promptList.filter((p) => p.category !== "vocabulary");

  return (
    <div className="space-y-6">
      {/* Overview Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-900 to-indigo-950 p-5 sm:p-6 text-white border border-indigo-500/20 shadow-xl">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                <Sparkles className="w-4 h-4" />
              </span>
              <h1 className="text-lg sm:text-xl font-black tracking-tight">
                Quản lý Prompt Tiện ích & AI
              </h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                Tối ưu Free Tier
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Tùy biến câu lệnh (Prompt) gửi tới Google Gemini AI khi bóc tách từ vựng tự động, 
              hoặc mẫu prompt cung cấp cho người dùng sao chép để dán vào ChatGPT / Claude.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-white/5 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 shrink-0">
            <Info className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Có bộ đệm In-memory: 0 lượt đọc Firestore phát sinh khi học tập</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Left selector, Right editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Prompt Selector (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Section 1: Tiện ích Thêm Từ vựng */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between px-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Bot className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tiện ích Thêm từ vựng (Bulk AI)</span>
              </div>
              <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                Trọng tâm
              </span>
            </div>

            <div className="space-y-1.5">
              {vocabPrompts.map((p) => {
                const isActive = p.id === activePromptId;
                const isCustomized = p.content.trim() !== p.defaultContent.trim();
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePromptId(p.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all border flex flex-col gap-1.5 ${
                      isActive
                        ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-sm"
                        : "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold line-clamp-1 ${isActive ? "text-indigo-700 dark:text-indigo-300" : "text-slate-800 dark:text-slate-200"}`}>
                        {p.title}
                      </span>
                      {isCustomized ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                          Đã sửa
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                          Mặc định
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 2: Tiện ích khác (Mẫu câu, Ngữ pháp) */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3.5 shadow-sm space-y-2">
            <div className="flex items-center justify-between px-1.5 pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <Code className="w-3.5 h-3.5 text-slate-500" />
                <span>Tiện ích Mẫu câu & Ngữ pháp</span>
              </div>
            </div>

            <div className="space-y-1.5">
              {otherPrompts.map((p) => {
                const isActive = p.id === activePromptId;
                const isCustomized = p.content.trim() !== p.defaultContent.trim();
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePromptId(p.id)}
                    className={`w-full text-left p-3 rounded-xl transition-all border flex flex-col gap-1.5 ${
                      isActive
                        ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-700 shadow-sm"
                        : "bg-slate-50/60 dark:bg-slate-950/40 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-bold line-clamp-1 ${isActive ? "text-indigo-700 dark:text-indigo-300" : "text-slate-800 dark:text-slate-200"}`}>
                        {p.title}
                      </span>
                      {isCustomized ? (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
                          Đã sửa
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                          Mặc định
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Prompt Editor & Test Area (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
            {/* Header of Active Prompt */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                    {activePrompt?.title}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
                    {activePrompt?.categoryLabel}
                  </span>
                  {activePrompt?.updatedAt && (
                    <span className="text-[10px] text-slate-400">
                      Cập nhật: {new Date(activePrompt.updatedAt).toLocaleDateString("vi-VN")} bởi {activePrompt.updatedBy || "admin"}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activePrompt?.description}
                </p>
              </div>

              {/* Action Buttons Top */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all shadow-xs"
                  title="Copy nội dung vào bộ nhớ tạm"
                >
                  {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{hasCopied ? "Đã copy!" : "Copy"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isResetting || !isModifiedFromDefault}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 disabled:opacity-40 transition-all shadow-xs"
                  title="Khôi phục về mẫu gốc ban đầu"
                >
                  {isResetting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                  <span>Mặc định</span>
                </button>
              </div>
            </div>

            {/* Dynamic Variables Bar */}
            {activePrompt?.variables && activePrompt.variables.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/80 dark:border-slate-800 text-xs">
                <span className="font-bold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <Tag className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Biến động được hỗ trợ:</span>
                </span>
                {activePrompt.variables.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => handleInsertVariable(v.name)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-800 text-[11px] font-mono font-bold transition-all border border-indigo-200 dark:border-indigo-700/60"
                    title={`Click để chèn vào prompt: ${v.description}`}
                  >
                    <span>+ Chèn {v.name}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Editor Area */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span>Nội dung Prompt (hệ thống sẽ áp dụng ngay khi lưu):</span>
                <span>{editContent.length} ký tự</span>
              </div>
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                rows={14}
                className="w-full p-4 rounded-xl bg-slate-50/80 dark:bg-slate-950 font-mono text-xs sm:text-[13px] text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all custom-scrollbar leading-relaxed"
                placeholder="Nhập nội dung prompt..."
              />
            </div>

            {/* Save & Reset Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                {hasUnsavedChanges ? (
                  <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-bold">
                    <AlertCircle className="w-4 h-4" /> Có thay đổi chưa lưu
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                    <CheckCircle className="w-4 h-4" /> Đang đồng bộ với hệ thống
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || !hasUnsavedChanges}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>Lưu thay đổi Prompt</span>
              </button>
            </div>
          </div>

          {/* Interactive Test Sandbox (Chỉ hiển thị cho prompt trích xuất AI Gemini) */}
          {activePromptId === "vocab_ai_extract" && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                    Thử nghiệm prompt với Gemini AI
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">
                  Kiểm tra chất lượng phản hồi trước khi lưu
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                  Dữ liệu đầu vào mẫu:
                </label>
                <textarea
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  rows={3}
                  className="w-full p-3 rounded-xl bg-slate-50 dark:bg-slate-950 font-mono text-xs text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 outline-none"
                  placeholder="Dán vài từ mẫu để thử nghiệm..."
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleTestWithGemini}
                  disabled={isTesting || !testInput.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 disabled:opacity-40 transition-all shadow-xs"
                >
                  {isTesting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                  <span>Chạy thử nghiệm (Test Prompt)</span>
                </button>
              </div>

              {/* Error Output */}
              {testError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{testError}</span>
                </div>
              )}

              {/* Success Result Preview */}
              {testResult && Array.isArray(testResult) && (
                <div className="space-y-2 animate-fadeIn">
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle className="w-4 h-4" /> Kết quả trích xuất ({testResult.length} từ vựng):
                    </span>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-950 max-h-60 overflow-y-auto divide-y divide-slate-200 dark:divide-slate-800 custom-scrollbar">
                    {testResult.map((item, idx) => (
                      <div key={idx} className="p-2.5 text-xs flex items-start gap-3">
                        <span className="font-mono text-slate-400 font-bold w-5">#{idx + 1}</span>
                        <div className="flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-slate-900 dark:text-white">{item.word}</span>
                            {item.reading && <span className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950 px-1.5 py-0.2 rounded border border-amber-200 dark:border-amber-800 font-mono">{item.reading}</span>}
                            {item.sinoVietnamese && <span className="text-[10px] text-purple-600 bg-purple-50 dark:bg-purple-950 px-1.5 py-0.2 rounded font-bold">{item.sinoVietnamese}</span>}
                          </div>
                          <div className="text-slate-600 dark:text-slate-300">{item.meaning}</div>
                          {item.example && <div className="text-[11px] text-slate-400 italic font-mono">{item.example}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
