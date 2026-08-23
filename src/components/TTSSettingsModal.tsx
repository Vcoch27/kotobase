"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Volume2, Key, Info, Sparkles, Check, Gauge } from "lucide-react";
import { 
  TTSSettings, loadTTSSettings, saveTTSSettings, 
  DEFAULT_TTS_SETTINGS, playAudio, JAPANESE_EDGE_VOICES 
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              
              {/* Option 1: Microsoft Edge TTS (Recommended) */}
              <button
                type="button"
                onClick={() => setSettings({ ...settings, provider: "edge" })}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all relative flex flex-col justify-between ${
                  settings.provider === "edge"
                    ? "border-emerald-500 bg-emerald-50/70 dark:bg-emerald-500/10 shadow-sm shadow-emerald-500/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-800 bg-slate-50/50 dark:bg-slate-900/50"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs sm:text-sm text-slate-800 dark:text-slate-100 flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-emerald-500" /> Edge TTS
                    </span>
                    {settings.provider === "edge" && <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />}
                  </div>
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                    Khuyên dùng
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-snug pt-1">
                    Miễn phí 100%, chuẩn NHK, giọng Azure Neural cực tự nhiên.
                  </p>
                </div>
              </button>

              {/* Option 2: Voicevox */}
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
                    Giọng Mei (Anime), miễn phí, đôi khi độ trễ cao hơn.
                  </p>
                </div>
              </button>
              
              {/* Option 3: ElevenLabs */}
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
                    Chuyên nghiệp, chất lượng cao, tự fallback khi hết token.
                  </p>
                </div>
              </button>

            </div>
          </div>

          {/* Config Detail for Edge TTS */}
          {settings.provider === "edge" && (
            <div className="space-y-4 animate-fadeIn p-4 sm:p-5 rounded-2xl bg-emerald-50/40 dark:bg-slate-800/50 border border-emerald-100 dark:border-slate-700/60">
              
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-between">
                  <span>Giọng đọc Tiếng Nhật (Azure Neural Voice)</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {JAPANESE_EDGE_VOICES.map((v) => {
                    const isSelected = settings.edgeVoice === v.id;
                    return (
                      <button
                        type="button"
                        key={v.id}
                        onClick={() => setSettings({ ...settings, edgeVoice: v.id })}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          isSelected
                            ? "bg-white dark:bg-slate-900 border-emerald-500 shadow-sm ring-1 ring-emerald-500"
                            : "bg-white/60 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800 hover:border-emerald-300"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-0.5">
                          <span className={`text-xs font-bold ${isSelected ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-200'}`}>
                            {v.name}
                          </span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                          {v.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tốc độ đọc */}
              <div className="space-y-2 pt-2 border-t border-emerald-100 dark:border-slate-700/60">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Tốc độ đọc (Speech Speed)</span>
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { label: "Chậm (-15%)", value: "-15%" },
                    { label: "Vừa (-5%)", value: "-5%" },
                    { label: "Tự nhiên (0%)", value: "0%" },
                    { label: "Nhanh (+10%)", value: "+10%" },
                  ].map((rate) => (
                    <button
                      type="button"
                      key={rate.value}
                      onClick={() => setSettings({ ...settings, edgeRate: rate.value })}
                      className={`py-2 px-1 rounded-xl text-xs font-bold border text-center transition-all ${
                        settings.edgeRate === rate.value
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:border-emerald-300"
                      }`}
                    >
                      {rate.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* Config Detail for ElevenLabs */}
          {settings.provider === "elevenlabs" && (
            <div className="space-y-4 animate-fadeIn p-5 rounded-2xl bg-indigo-50/40 dark:bg-slate-800/50 border border-indigo-100 dark:border-slate-700">
              <div className="flex items-start gap-3 text-xs text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-xl">
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-indigo-500" />
                <p>Hệ thống sẽ tự động chuyển sang Edge TTS nếu API Key của bạn hết Token hoặc gặp lỗi kết nối.</p>
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

          {/* Config Detail for Voicevox */}
          {settings.provider === "voicevox" && (
            <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-slate-800/50 border border-amber-100 dark:border-slate-700 text-xs text-amber-800 dark:text-amber-300 space-y-1 animate-fadeIn">
              <p className="font-bold">Đang sử dụng Voicevox Public Engine</p>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Sử dụng giọng Mei. Không cần cấu hình gì thêm.
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
