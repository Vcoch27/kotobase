"use client";

import React, { useState, useEffect } from "react";
import { Settings2, X, RotateCcw, Save, Activity, Zap } from "lucide-react";
import { AnkiSettings, loadAnkiSettings, saveAnkiSettings, DEFAULT_ANKI_SETTINGS } from "@/lib/anki-utils";

interface AnkiSettingsModalProps {
  onClose: () => void;
}

export function AnkiSettingsModal({ onClose }: AnkiSettingsModalProps) {
  const [settings, setSettings] = useState<AnkiSettings>(DEFAULT_ANKI_SETTINGS);

  useEffect(() => {
    setSettings(loadAnkiSettings());
  }, []);

  const handleChange = (key: keyof AnkiSettings, value: string | number) => {
    if (typeof value === "string" && (key.includes("Unit") === false)) {
      const num = parseFloat(value);
      setSettings(prev => ({
        ...prev,
        [key]: isNaN(num) ? prev[key] : num
      }));
    } else {
      setSettings(prev => ({
        ...prev,
        [key]: value
      }));
    }
  };

  const handleSave = () => {
    saveAnkiSettings(settings);
    onClose();
  };

  const handleReset = () => {
    setSettings(DEFAULT_ANKI_SETTINGS);
  };

  const UnitSelect = ({ value, onChange }: { value: 'm' | 'h' | 'd', onChange: (val: 'm' | 'h' | 'd') => void }) => (
    <select 
      value={value || 'd'} 
      onChange={e => onChange(e.target.value as 'm' | 'h' | 'd')}
      className="bg-transparent text-xs font-semibold text-slate-500 hover:text-slate-300 outline-none cursor-pointer text-center"
      style={{ WebkitAppearance: 'none', MozAppearance: 'none' }}
    >
      <option value="m" className="bg-slate-900 text-slate-200 font-medium py-1">phút</option>
      <option value="h" className="bg-slate-900 text-slate-200 font-medium py-1">giờ</option>
      <option value="d" className="bg-slate-900 text-slate-200 font-medium py-1">ngày</option>
    </select>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-800 bg-slate-900/50">
          <div>
            <h3 className="text-xl font-black text-slate-100 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-amber-500" /> Cài đặt Thuật toán Anki
            </h3>
            <p className="text-xs font-medium text-slate-500 mt-1">Tuỳ chỉnh mốc thời gian và hệ số lặp lại ngắt quãng.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8 overflow-y-auto max-h-[65vh] custom-scrollbar">
          
          {/* Thẻ Mới */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-amber-500 uppercase tracking-widest">
              <Activity className="w-4 h-4" /> Thời gian Thẻ Mới
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800/80 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all">
                <div>
                  <div className="text-sm font-bold text-slate-200">Nút Khó (Hard)</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-medium">Khoảng thời gian thẻ lặp lại khi chọn Khó</div>
                </div>
                <div className="flex items-center gap-1">
                  <input 
                    type="number" step="0.1" min="0.1" max="1000"
                    value={settings.newCardHardInterval}
                    onChange={(e) => handleChange("newCardHardInterval", e.target.value)}
                    className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                  />
                  <UnitSelect value={settings.newCardHardUnit || 'h'} onChange={(val) => handleChange("newCardHardUnit", val)} />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800/80 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all">
                <div>
                  <div className="text-sm font-bold text-slate-200">Nút Tốt (Good)</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-medium">Khoảng thời gian chuẩn khi bạn đã nhớ</div>
                </div>
                <div className="flex items-center gap-1">
                  <input 
                    type="number" step="0.1" min="0.1" max="1000"
                    value={settings.newCardGoodInterval}
                    onChange={(e) => handleChange("newCardGoodInterval", e.target.value)}
                    className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-emerald-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                  />
                  <UnitSelect value={settings.newCardGoodUnit || 'd'} onChange={(val) => handleChange("newCardGoodUnit", val)} />
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800/80 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all">
                <div>
                  <div className="text-sm font-bold text-slate-200">Nút Dễ (Easy)</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-medium">Bước nhảy thời gian lớn khi từ quá dễ</div>
                </div>
                <div className="flex items-center gap-1">
                  <input 
                    type="number" step="0.1" min="0.1" max="1000"
                    value={settings.newCardEasyInterval}
                    onChange={(e) => handleChange("newCardEasyInterval", e.target.value)}
                    className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-sky-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                  />
                  <UnitSelect value={settings.newCardEasyUnit || 'd'} onChange={(val) => handleChange("newCardEasyUnit", val)} />
                </div>
              </div>
            </div>
          </div>

          {/* Thẻ đang ôn */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-indigo-400 uppercase tracking-widest">
              <Zap className="w-4 h-4" /> Hệ số Thẻ Đang Ôn
            </div>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800/80 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all">
                <div className="pr-4">
                  <div className="text-sm font-bold text-slate-200">Hệ số Khó (Hard Multiplier)</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-medium leading-relaxed">Khi bạn ôn lại một thẻ và chọn Khó, thời gian lặp tiếp theo sẽ được nhân với hệ số này. (Mặc định: 1.2x)</div>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" step="0.1" min="1" max="5"
                    value={settings.hardMultiplier}
                    onChange={(e) => handleChange("hardMultiplier", e.target.value)}
                    className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-rose-400 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 outline-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                  />
                  <span className="text-xs font-semibold text-slate-500 w-8">x</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-800/40 hover:bg-slate-800/80 rounded-2xl border border-slate-700/50 hover:border-slate-600 transition-all">
                <div className="pr-4">
                  <div className="text-sm font-bold text-slate-200">Hệ số thưởng Dễ (Easy Bonus)</div>
                  <div className="text-[10px] text-slate-500 mt-1 font-medium leading-relaxed">Hệ số cộng thêm khi bạn thấy thẻ đang ôn quá Dễ, giúp thẻ xuất hiện ít hơn nữa. (Mặc định: 1.3x)</div>
                </div>
                <div className="flex items-center gap-2">
                  <input 
                    type="number" step="0.1" min="1" max="5"
                    value={settings.easyBonus}
                    onChange={(e) => handleChange("easyBonus", e.target.value)}
                    className="w-16 bg-slate-950 border border-slate-700 rounded-xl px-2 py-1.5 text-center text-sm font-bold text-sky-400 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none [&::-webkit-inner-spin-button]:appearance-none transition-all"
                  />
                  <span className="text-xs font-semibold text-slate-500 w-8">x</span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 bg-slate-900/80 border-t border-slate-800">
          <button 
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-all"
            title="Khôi phục mặc định"
          >
            <RotateCcw className="w-4 h-4" /> Mặc định
          </button>
          <div className="flex items-center gap-3">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 text-xs font-bold text-slate-400 hover:text-white rounded-xl transition-colors"
            >
              Hủy
            </button>
            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
            >
              <Save className="w-4 h-4" /> Lưu Cài đặt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
