"use client";

import React, { useState, useEffect } from "react";
import { X, Save, Volume2, Key, Info } from "lucide-react";
import { TTSSettings, loadTTSSettings, saveTTSSettings, DEFAULT_TTS_SETTINGS, playAudio } from "@/lib/tts-utils";

interface TTSSettingsModalProps {
  onClose: () => void;
}

export function TTSSettingsModal({ onClose }: TTSSettingsModalProps) {
  const [settings, setSettings] = useState<TTSSettings>(DEFAULT_TTS_SETTINGS);

  useEffect(() => {
    setSettings(loadTTSSettings());
  }, []);

  const handleSave = () => {
    saveTTSSettings(settings);
    onClose();
  };

  const handleTestAudio = () => {
    // Lưu tạm thời để playAudio lấy được config hiện tại
    saveTTSSettings(settings);
    playAudio("こんにちは、設定が完了しました。");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">Cài đặt Phát âm</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Cấu hình API Text-to-Speech</p>
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
        <div className="p-6 overflow-y-auto flex-1 space-y-6 custom-scrollbar">
          
          <div className="space-y-3">
            <label className="text-sm font-bold text-slate-700 dark:text-slate-200">Công cụ phát âm (Provider)</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setSettings({ ...settings, provider: "voicevox" })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  settings.provider === "voicevox"
                    ? "border-amber-500 bg-amber-50 dark:bg-amber-500/10"
                    : "border-slate-200 dark:border-slate-700 hover:border-amber-300 dark:hover:border-amber-700"
                }`}
              >
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">Voicevox (Public)</div>
                <div className="text-xs text-slate-500">Miễn phí, an toàn, không giới hạn. Dùng giọng nữ Mei.</div>
              </button>
              
              <button
                onClick={() => setSettings({ ...settings, provider: "elevenlabs" })}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  settings.provider === "elevenlabs"
                    ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10"
                    : "border-slate-200 dark:border-slate-700 hover:border-indigo-300 dark:hover:border-indigo-700"
                }`}
              >
                <div className="font-bold text-slate-800 dark:text-slate-200 mb-1">ElevenLabs</div>
                <div className="text-xs text-slate-500">Chuyên nghiệp, cần API Key, tự fallback khi hết token.</div>
              </button>
            </div>
          </div>

          {settings.provider === "elevenlabs" && (
            <div className="space-y-4 animate-fadeIn p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div className="flex items-start gap-3 text-sm text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 p-3 rounded-xl">
                <Info className="w-5 h-5 shrink-0 mt-0.5" />
                <p>ElevenLabs sẽ tự động chuyển sang dùng Voicevox nếu API Key của bạn hết Token hoặc bị lỗi.</p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center gap-2">
                  <Key className="w-4 h-4 text-slate-400" /> ElevenLabs API Key
                </label>
                <input
                  type="password"
                  value={settings.elevenLabsApiKey}
                  onChange={(e) => setSettings({ ...settings, elevenLabsApiKey: e.target.value })}
                  placeholder="Nhập API Key của bạn (xi-api-key)..."
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  Voice ID (Mã giọng đọc)
                </label>
                <input
                  type="text"
                  value={settings.elevenLabsVoiceId}
                  onChange={(e) => setSettings({ ...settings, elevenLabsVoiceId: e.target.value })}
                  placeholder="VD: EXAVITQu4vr4xnSDxMaL"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all text-sm font-medium font-mono"
                />
                <p className="text-xs text-slate-500">
                  Mặc định: <code className="text-indigo-500">EXAVITQu4vr4xnSDxMaL</code> (Sarah).<br/>
                  <span className="text-amber-600 dark:text-amber-400">Lưu ý: Tài khoản ElevenLabs miễn phí (Free) chỉ dùng được các giọng mặc định (như Sarah). Giọng Library (như giọng bạn chọn) yêu cầu gói trả phí.</span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-3 bg-slate-50 dark:bg-slate-900/50">
          <button
            onClick={handleTestAudio}
            className="px-5 py-2.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <Volume2 className="w-4 h-4" /> Nghe thử
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-8 py-2.5 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-500/25 active:scale-95"
          >
            <Save className="w-4 h-4" /> Lưu cài đặt
          </button>
        </div>
      </div>
    </div>
  );
}
