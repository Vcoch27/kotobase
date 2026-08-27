"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Volume2, Key, Info, Check, Monitor, Sparkles } from "lucide-react";
import { 
  TTSSettings, loadTTSSettings, saveTTSSettings, 
  DEFAULT_TTS_SETTINGS, playAudio 
} from "@/lib/tts-utils";

interface TTSSettingsModalProps {
  onClose: () => void;
}

export function TTSSettingsModal({ onClose }: TTSSettingsModalProps) {
  const [settings, setSettings] = useState<TTSSettings>(DEFAULT_TTS_SETTINGS);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    setSettings(loadTTSSettings());
  }, []);

  const handleSave = () => {
    saveTTSSettings(settings);
    onClose();
  };

  const handleTestAudio = async () => {
    setIsTesting(true);
    try {
      await playAudio("こんにちは！日本語の学習を始めましょう。", settings);
    } finally {
      setTimeout(() => setIsTesting(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div 
        className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] border border-slate-200 dark:border-slate-800 transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 shadow-sm">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">Cài đặt Phát âm Tiếng Nhật</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Chọn công cụ đọc và điều chỉnh giọng phát âm</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          
          {/* Provider Selection */}
          <div className="space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Công cụ phát âm (Provider)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              
              {/* Option 0: KotoBase AI */}
              <button
                type="button"
                onClick={() => setSettings({ ...settings, provider: "kotobase-ai" })}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  settings.provider === "kotobase-ai"
                    ? "border-rose-500 bg-rose-50/70 dark:bg-rose-500/10 shadow-sm shadow-rose-500/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-rose-300 dark:hover:border-rose-800 bg-slate-50/50 dark:bg-slate-900/50"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      KotoBase AI
                    </span>
                    {settings.provider === "kotobase-ai" && <Check className="w-4 h-4 text-rose-600 dark:text-rose-400" />}
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">
                      Khuyên dùng
                    </span>
                    <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300">
                      Độc quyền
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug pt-1">
                    Giọng đọc AI siêu tự nhiên, đa cảm xúc (Style-Bert-VITS2).
                  </p>
                </div>
              </button>

              {/* Option 1: Voicevox */}
              <button
                type="button"
                onClick={() => setSettings({ ...settings, provider: "voicevox" })}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  settings.provider === "voicevox"
                    ? "border-amber-500 bg-amber-50/70 dark:bg-amber-500/10 shadow-sm shadow-amber-500/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-amber-300 dark:hover:border-amber-800 bg-slate-50/50 dark:bg-slate-900/50"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                      Voicevox
                    </span>
                    {settings.provider === "voicevox" && <Check className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                  </div>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                    Public Server
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug pt-1">
                    Giọng Mei (Anime), tự nhiên, miễn phí.
                  </p>
                </div>
              </button>

              {/* Option 2: ElevenLabs */}
              <button
                type="button"
                onClick={() => setSettings({ ...settings, provider: "elevenlabs" })}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  settings.provider === "elevenlabs"
                    ? "border-indigo-500 bg-indigo-50/70 dark:bg-indigo-500/10 shadow-sm shadow-indigo-500/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-800 bg-slate-50/50 dark:bg-slate-900/50"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100">
                      ElevenLabs
                    </span>
                    {settings.provider === "elevenlabs" && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                  </div>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300">
                    Cần API Key
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug pt-1">
                    Chuyên nghiệp, AI cao cấp, ngữ điệu thực tế.
                  </p>
                </div>
              </button>

              {/* Option 3: Browser Default */}
              <button
                type="button"
                onClick={() => setSettings({ ...settings, provider: "browser" })}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  settings.provider === "browser"
                    ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-500/10 shadow-sm shadow-emerald-500/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 bg-slate-50/50 dark:bg-slate-900/50"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      <Monitor className="w-3.5 h-3.5" /> Thiết bị
                    </span>
                    {settings.provider === "browser" && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    Offline 100%
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug pt-1">
                    Giọng mặc định, không cần internet.
                  </p>
                </div>
              </button>

            </div>
          </div>

          {/* Config Detail for ElevenLabs */}
          {settings.provider === "elevenlabs" && (
            <div className="space-y-4 animate-fadeIn p-5 rounded-2xl bg-indigo-50/40 dark:bg-slate-800/50 border border-indigo-100 dark:border-slate-700">
              <div className="flex items-start gap-3 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-xl">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
                <p>Hệ thống sẽ tự động chuyển sang Voicevox hoặc giọng thiết bị nếu API Key hết Token hoặc gặp lỗi.</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" /> ElevenLabs API Key
                </label>
                <input
                  type="password"
                  value={settings.elevenLabsApiKey}
                  onChange={(e) => setSettings({ ...settings, elevenLabsApiKey: e.target.value })}
                  placeholder="Nhập API Key của bạn (xi-api-key)..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-indigo-500 outline-none text-xs font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200">
                  Voice ID (Mã giọng đọc)
                </label>
                <input
                  type="text"
                  value={settings.elevenLabsVoiceId}
                  onChange={(e) => setSettings({ ...settings, elevenLabsVoiceId: e.target.value })}
                  placeholder="VD: EXAVITQu4vr4xnSDxMaL"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-indigo-500 outline-none text-xs font-mono font-medium"
                />
                <p className="text-[11px] text-slate-500">
                  Mặc định: <code className="text-indigo-500">EXAVITQu4vr4xnSDxMaL</code> (Sarah).
                </p>
              </div>
            </div>
          )}

          {/* Config Detail for KotoBase AI */}
          {settings.provider === "kotobase-ai" && (
            <div className="space-y-4 animate-fadeIn p-5 rounded-2xl bg-rose-50/40 dark:bg-slate-800/50 border border-rose-100 dark:border-slate-700">
              <div className="flex items-start gap-3 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-xl">
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
                <div>
                  <p className="font-bold mb-0.5">KotoBase AI (Style-Bert-VITS2)</p>
                  <p>Mặc định bạn đang chạy trên ZeroGPU ẩn danh. Nếu gặp lỗi quá tải (Exceeded runs limit), hãy nhập Token Hugging Face cá nhân để dùng miễn phí không giới hạn!</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" /> Hugging Face Access Token (Tuỳ chọn)
                </label>
                <input
                  type="password"
                  value={settings.hfToken || ""}
                  onChange={(e) => setSettings({ ...settings, hfToken: e.target.value })}
                  placeholder="VD: hf_xxxxxxxxxxxxxxxxxxxxxx..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-rose-500 outline-none text-xs font-medium"
                />
                <p className="text-[11px] text-slate-500">
                  Lấy token miễn phí tại: <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="text-rose-500 hover:underline">huggingface.co/settings/tokens</a> (Quyền Read là đủ).
                </p>
              </div>
            </div>
          )}

          {/* Config Detail for Voicevox */}
          {settings.provider === "voicevox" && (
            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-700 text-xs text-amber-800 dark:text-amber-300 space-y-1 animate-fadeIn">
              <p className="font-bold">Đang sử dụng Voicevox Public Engine</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sử dụng giọng Mei (Anime). Miễn phí 100%, không cần cài đặt API Key.
              </p>
            </div>
          )}

          {/* Config Detail for Browser */}
          {settings.provider === "browser" && (
            <div className="p-4 rounded-2xl bg-emerald-50/50 dark:bg-slate-800/50 border border-emerald-100 dark:border-slate-700 text-xs text-emerald-800 dark:text-emerald-300 space-y-1 animate-fadeIn">
              <p className="font-bold">Đang sử dụng Giọng đọc mặc định của máy</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sử dụng bộ tổng hợp giọng nói Web Speech API của trình duyệt/hệ điều hành. Hoạt động offline 100%, phản hồi tức thì.
              </p>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 sm:p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center gap-3 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            type="button"
            onClick={handleTestAudio}
            disabled={isTesting}
            className="px-4 sm:px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <Volume2 className={`w-4 h-4 text-indigo-500 ${isTesting ? 'animate-pulse' : ''}`} />
            <span>{isTesting ? 'Đang phát...' : 'Nghe thử'}</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-6 sm:px-8 py-2.5 rounded-xl font-bold text-xs sm:text-sm text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
          >
            <Save className="w-4 h-4" /> Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  );
}
