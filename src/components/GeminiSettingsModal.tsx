"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, Key, ExternalLink, CheckCircle2, AlertCircle, Loader2, Save, Cpu } from "lucide-react";
import { 
  GeminiSettings, loadGeminiSettings, saveGeminiSettings, DEFAULT_GEMINI_SETTINGS, 
  generateVocabulariesFromRawText, AVAILABLE_GEMINI_MODELS 
} from "@/lib/gemini-utils";
import toast from "react-hot-toast";

interface GeminiSettingsModalProps {
  onClose: () => void;
}

export function GeminiSettingsModal({ onClose }: GeminiSettingsModalProps) {
  const [settings, setSettings] = useState<GeminiSettings>(DEFAULT_GEMINI_SETTINGS);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; text: string } | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [customModelInput, setCustomModelInput] = useState("");

  useEffect(() => {
    const loaded = loadGeminiSettings();
    setSettings(loaded);
    // Nếu model không nằm trong danh sách preset thì đưa vào custom input
    const isPreset = AVAILABLE_GEMINI_MODELS.some(m => m.id === loaded.model);
    if (!isPreset && loaded.model) {
      setCustomModelInput(loaded.model);
    }
  }, []);

  const handleSave = () => {
    const finalModel = customModelInput.trim() || settings.model || "gemini-3.6-flash";
    const newSettings = { ...settings, model: finalModel };
    saveGeminiSettings(newSettings);
    toast.success(`Đã lưu cấu hình với Model: ${finalModel}!`);
    onClose();
  };

  const handleTestConnection = async () => {
    if (!settings.apiKey.trim()) {
      setTestResult({ success: false, text: "Vui lòng nhập API Key trước khi kiểm tra." });
      return;
    }

    const testModel = customModelInput.trim() || settings.model || "gemini-3.6-flash";
    setTesting(true);
    setTestResult(null);

    const res = await generateVocabulariesFromRawText(
      "勉強 (học tập)",
      settings.apiKey,
      testModel
    );

    setTesting(false);
    if (res.success) {
      setTestResult({
        success: true,
        text: `Kết nối thành công! Model "${testModel}" hoạt động hoàn hảo và sẵn sàng sử dụng.`
      });
    } else {
      setTestResult({
        success: false,
        text: res.error || "Không thể kết nối tới Gemini API."
      });
    }
  };

  const isCurrentModelCustom = !!customModelInput.trim() && !AVAILABLE_GEMINI_MODELS.some(m => m.id === customModelInput.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-tr from-amber-500 to-indigo-600 text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Cài đặt Gemini AI</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Tùy chọn Model linh hoạt & Không giới hạn</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
          {/* Hướng dẫn lấy key */}
          <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200/80 dark:border-indigo-800/60 text-xs space-y-2">
            <div className="font-bold text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Sử dụng Gemini API Key cá nhân (Hoàn toàn Miễn phí)</span>
            </div>
            <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
              API Key được lưu trực tiếp trên trình duyệt của bạn (Local Storage), hoàn toàn bảo mật và không gửi về máy chủ trung gian.
            </p>
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400 hover:underline pt-1"
            >
              <span>Lấy API Key miễn phí tại Google AI Studio</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Ô nhập API Key */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Key className="w-4 h-4 text-slate-400" /> Google Gemini API Key
              </span>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline"
              >
                {showKey ? "Ẩn Key" : "Hiện Key"}
              </button>
            </label>
            <input
              type={showKey ? "text" : "password"}
              value={settings.apiKey}
              onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
              placeholder="AIzaSy..."
              className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-slate-800 dark:text-slate-100 font-mono outline-none transition-all"
            />
          </div>

          {/* Chọn Model Linh Hoạt */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-500" /> Chọn Mô hình AI (Model)
              </label>
              <span className="text-[11px] text-slate-400">Tự do đổi model khi chạm limit</span>
            </div>

            {/* Danh sách Preset Models */}
            <div className="grid grid-cols-1 gap-2 max-h-56 overflow-y-auto pr-1 custom-scrollbar">
              {AVAILABLE_GEMINI_MODELS.map((m) => {
                const isSelected = !customModelInput.trim() && settings.model === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setCustomModelInput("");
                      setSettings({ ...settings, model: m.id });
                    }}
                    className={`p-3 rounded-xl border text-left transition-all flex items-start justify-between gap-3 ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-50/80 dark:bg-indigo-500/15 shadow-sm"
                        : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/50 hover:border-indigo-300 dark:hover:border-slate-700"
                    }`}
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-black ${isSelected ? "text-indigo-600 dark:text-indigo-400" : "text-slate-800 dark:text-slate-200"}`}>
                          {m.name}
                        </span>
                        <code className="text-[10px] text-slate-400 font-mono">({m.id})</code>
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {m.description}
                      </div>
                    </div>

                    {m.badge && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${m.badgeColor || "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300"}`}>
                        {m.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Ô nhập Custom Model ID */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-400">
                Hoặc nhập Model ID tùy chỉnh (Custom Model ID):
              </label>
              <input
                type="text"
                value={customModelInput}
                onChange={(e) => {
                  setCustomModelInput(e.target.value);
                  if (e.target.value.trim()) {
                    setSettings({ ...settings, model: e.target.value.trim() });
                  }
                }}
                placeholder="ví dụ: gemini-2.5-flash, gemini-3.5-flash..."
                className={`w-full px-3.5 py-2 rounded-xl text-xs font-mono outline-none border transition-all ${
                  isCurrentModelCustom
                    ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                    : "border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950/60 text-slate-700 dark:text-slate-200"
                }`}
              />
            </div>
          </div>

          {/* Nút Test Connection */}
          <div className="pt-1">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !settings.apiKey.trim()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {testing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                  <span>Đang kiểm tra kết nối API...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  <span>Kiểm tra kết nối API Key</span>
                </>
              )}
            </button>
          </div>

          {/* Kết quả test */}
          {testResult && (
            <div className={`p-3 rounded-xl border flex items-start gap-2.5 text-xs animate-fadeIn ${
              testResult.success 
                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300" 
                : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300"
            }`}>
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed font-medium">{testResult.text}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Save className="w-4 h-4" />
            <span>Lưu cài đặt</span>
          </button>
        </div>
      </div>
    </div>
  );
}
