"use client";

import React, { useState, useEffect } from "react";
import { Settings2, X, RotateCcw, Save } from "lucide-react";
import { AnkiSettings, loadAnkiSettings, saveAnkiSettings, DEFAULT_ANKI_SETTINGS } from "@/lib/anki-utils";

interface AnkiSettingsModalProps {
  onClose: () => void;
}

export function AnkiSettingsModal({ onClose }: AnkiSettingsModalProps) {
  const [settings, setSettings] = useState<AnkiSettings>(DEFAULT_ANKI_SETTINGS);

  useEffect(() => {
    setSettings(loadAnkiSettings());
  }, []);

  const handleChange = (key: keyof AnkiSettings, value: string) => {
    const num = parseFloat(value);
    setSettings(prev => ({
      ...prev,
      [key]: isNaN(num) ? prev[key] : num
    }));
  };

  const handleSave = () => {
    saveAnkiSettings(settings);
    onClose();
  };

  const handleReset = () => {
    setSettings(DEFAULT_ANKI_SETTINGS);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl flex flex-col gap-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <h3 className="text-lg font-black text-slate-100 flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-amber-500" /> Cài đặt Anki
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto max-h-[60vh] custom-scrollbar pr-2">
          {/* Thẻ Mới */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Thời gian Thẻ mới</h4>
            
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1 flex justify-between">
                <span>Nút Khó (Hard)</span>
                <span className="text-rose-400">{settings.newCardHardInterval} ngày</span>
              </label>
              <input 
                type="number" step="0.1" min="0.1" max="10"
                value={settings.newCardHardInterval}
                onChange={(e) => handleChange("newCardHardInterval", e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 text-sm outline-none text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1 flex justify-between">
                <span>Nút Tốt (Good)</span>
                <span className="text-emerald-400">{settings.newCardGoodInterval} ngày</span>
              </label>
              <input 
                type="number" step="0.5" min="0.5" max="30"
                value={settings.newCardGoodInterval}
                onChange={(e) => handleChange("newCardGoodInterval", e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 text-sm outline-none text-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1 flex justify-between">
                <span>Nút Dễ (Easy)</span>
                <span className="text-sky-400">{settings.newCardEasyInterval} ngày</span>
              </label>
              <input 
                type="number" step="1" min="1" max="30"
                value={settings.newCardEasyInterval}
                onChange={(e) => handleChange("newCardEasyInterval", e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 text-sm outline-none text-white"
              />
            </div>
          </div>

          <div className="w-full h-px bg-slate-800 my-2"></div>

          {/* Thẻ đang ôn */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hệ số Thẻ Đang ôn</h4>
            
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1 flex justify-between">
                <span>Hệ số Khó (Hard Multiplier)</span>
                <span className="text-rose-400">{settings.hardMultiplier}x</span>
              </label>
              <input 
                type="number" step="0.1" min="1" max="3"
                value={settings.hardMultiplier}
                onChange={(e) => handleChange("hardMultiplier", e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 text-sm outline-none text-white"
              />
              <p className="text-[10px] text-slate-500 mt-1">Hệ số nhân thời gian khi bạn bấm nút Khó (mặc định 1.2)</p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1 flex justify-between">
                <span>Hệ số thưởng Dễ (Easy Bonus)</span>
                <span className="text-sky-400">{settings.easyBonus}x</span>
              </label>
              <input 
                type="number" step="0.1" min="1" max="3"
                value={settings.easyBonus}
                onChange={(e) => handleChange("easyBonus", e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800 border border-slate-700 focus:border-amber-500 text-sm outline-none text-white"
              />
              <p className="text-[10px] text-slate-500 mt-1">Hệ số cộng thêm khi bạn bấm nút Dễ (mặc định 1.3)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button 
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Mặc định
          </button>
          <div className="flex items-center gap-2">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-200"
            >
              Hủy
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-slate-900 bg-amber-500 hover:bg-amber-400 rounded-xl transition-all"
            >
              <Save className="w-3.5 h-3.5" /> Lưu Cài đặt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
