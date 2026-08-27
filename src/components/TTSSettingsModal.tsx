"use client";

import React, { useState, useEffect } from "react";
import { 
  X, Save, Volume2, Key, Info, Check, Monitor, Sparkles, 
  User, Smile, Gauge, Sliders, RotateCcw 
} from "lucide-react";
import { 
  TTSSettings, loadTTSSettings, saveTTSSettings, 
  DEFAULT_TTS_SETTINGS, playAudio,
  KOTOBASE_VOICE_OPTIONS, KOTOBASE_STYLE_OPTIONS
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

              {/* 1. Chọn giọng đọc */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-rose-500" /> Chọn giọng đọc (Voice Model)
                </label>
                <select
                  value={settings.kotobaseVoiceName || "JVNV-F1 - Giọng nữ 1 (Chuẩn, trong trẻo, tự nhiên)"}
                  onChange={(e) => setSettings({ ...settings, kotobaseVoiceName: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-rose-500 outline-none text-xs font-semibold cursor-pointer"
                >
                  {KOTOBASE_VOICE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Grid 2 cột: Cảm xúc & Tốc độ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Biểu cảm cảm xúc */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Smile className="w-3.5 h-3.5 text-rose-500" /> Biểu cảm cảm xúc
                  </label>
                  <select
                    value={settings.kotobaseStyle || "Neutral"}
                    onChange={(e) => setSettings({ ...settings, kotobaseStyle: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-rose-500 outline-none text-xs font-semibold cursor-pointer"
                  >
                    {KOTOBASE_STYLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Tốc độ đọc */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                      <Gauge className="w-3.5 h-3.5 text-rose-500" /> Tốc độ đọc
                    </label>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">
                        {(settings.kotobaseSpeed ?? 1.0).toFixed(1)}x
                      </span>
                      {(settings.kotobaseSpeed ?? 1.0) !== 1.0 && (
                        <button
                          type="button"
                          onClick={() => setSettings({ ...settings, kotobaseSpeed: 1.0 })}
                          title="Khôi phục mặc định"
                          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={settings.kotobaseSpeed ?? 1.0}
                    onChange={(e) => setSettings({ ...settings, kotobaseSpeed: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500 mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>0.5x (Chậm)</span>
                    <span>1.0x</span>
                    <span>2.0x (Nhanh)</span>
                  </div>
                </div>
              </div>

              {/* 3. Cường độ cảm xúc */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-rose-500" /> Cường độ cảm xúc (Style Weight)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300">
                      {(settings.kotobaseStyleWeight ?? 1.0).toFixed(1)}
                    </span>
                    {(settings.kotobaseStyleWeight ?? 1.0) !== 1.0 && (
                      <button
                        type="button"
                        onClick={() => setSettings({ ...settings, kotobaseStyleWeight: 1.0 })}
                        title="Khôi phục mặc định"
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="2.0"
                  step="0.1"
                  value={settings.kotobaseStyleWeight ?? 1.0}
                  onChange={(e) => setSettings({ ...settings, kotobaseStyleWeight: parseFloat(e.target.value) })}
                  className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500 mt-2"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>0.0 (Nhẹ nhàng / Ít biểu cảm)</span>
                  <span>1.0</span>
                  <span>2.0 (Biểu cảm rõ rệt)</span>
                </div>
              </div>

              {/* 4. Hugging Face Access Token */}
              <div className="space-y-1.5 pt-2 border-t border-rose-100 dark:border-slate-700/80">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-400" /> Hugging Face Access Token (Khuyên dùng để tránh giới hạn)
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
