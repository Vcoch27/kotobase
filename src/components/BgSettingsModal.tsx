"use client";

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Image as ImageIcon, 
  Upload, 
  Trash2, 
  X, 
  Monitor, 
  CreditCard, 
  RotateCcw, 
  Sparkles, 
  Check, 
  SlidersHorizontal, 
  ShieldCheck,
  Headphones
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCustomBg } from '@/hooks/useCustomBg';
import { BgKey } from '@/lib/bg-storage';

interface BgSettingsModalProps {
  onClose: () => void;
}

export function BgSettingsModal({ onClose }: BgSettingsModalProps) {
  const { 
    dashboard, 
    cardFront, 
    cardBack, 
    washSettings, 
    saveBg, 
    deleteBg, 
    updateWashSettings, 
    isLoaded 
  } = useCustomBg();

  const [activeTab, setActiveTab] = useState<BgKey>('cardFront');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  useEffect(() => {
    window.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [handleEscape]);

  const currentBgData = activeTab === 'dashboard' 
    ? dashboard 
    : activeTab === 'cardFront' 
    ? cardFront 
    : cardBack;

  const currentWash = activeTab === 'dashboard' 
    ? (washSettings?.dashboardWash ?? 75) 
    : (washSettings?.cardWash ?? 65);

  const handleFileProcess = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn một file ảnh (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Dung lượng ảnh tối đa là 5MB.');
      return;
    }

    try {
      setIsProcessing(true);
      const loadingToast = toast.loading('Đang tối ưu & lưu ảnh...');
      await saveBg(activeTab, file);
      toast.dismiss(loadingToast);
      toast.success(`Đã cập nhật ảnh ${getTabLabel(activeTab)} thành công!`);
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Lỗi khi lưu ảnh nền.');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFileProcess(file);
  };

  const handleDelete = async () => {
    try {
      setIsProcessing(true);
      await deleteBg(activeTab);
      toast.success(`Đã khôi phục ảnh mặc định cho ${getTabLabel(activeTab)}.`);
    } catch {
      toast.error('Có lỗi xảy ra khi xoá ảnh.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWashChange = (val: number) => {
    if (activeTab === 'dashboard') {
      updateWashSettings({ dashboardWash: val });
    } else {
      updateWashSettings({ cardWash: val });
    }
  };

  function getTabLabel(key: BgKey) {
    switch (key) {
      case 'dashboard': return 'Nền ứng dụng';
      case 'cardFront': return 'Mặt trước (Thẻ & Quiz)';
      case 'cardBack': return 'Mặt sau (Thẻ & Quiz)';
    }
  }

  if (!isLoaded) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6 pt-6 sm:pt-10 pb-6 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-md transition-opacity animate-fadeIn"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div 
        className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden border border-slate-200/80 dark:border-slate-800 flex flex-col animate-fadeIn scale-in my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - đệm trên và đệm trong rộng rãi, chỉn chu */}
        <div className="flex items-center justify-between px-6 sm:px-8 py-5 sm:py-6 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-amber-500/20 shrink-0">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                Tuỳ chỉnh ảnh nền
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                  Cá nhân
                </span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Thay đổi ảnh nền và độ tán trắng để học tập thoải mái nhất
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selector Buttons */}
        <div className="px-6 sm:px-8 pt-4 pb-2 shrink-0 bg-slate-50/60 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/80">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-200/70 dark:bg-slate-800/80 rounded-2xl">
            {/* Tab 1: Dashboard */}
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Monitor className="w-4 h-4 shrink-0" />
              <span className="truncate">Nền ứng dụng</span>
              {dashboard && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Đang dùng ảnh tuỳ chỉnh" />
              )}
            </button>

            {/* Tab 2: Card Front */}
            <button
              onClick={() => setActiveTab('cardFront')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'cardFront'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <CreditCard className="w-4 h-4 shrink-0" />
              <span className="truncate">Mặt trước (Thẻ & Quiz)</span>
              {cardFront && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Đang dùng ảnh tuỳ chỉnh" />
              )}
            </button>

            {/* Tab 3: Card Back */}
            <button
              onClick={() => setActiveTab('cardBack')}
              className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'cardBack'
                  ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span className="truncate">Mặt sau (Thẻ & Quiz)</span>
              {cardBack && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Đang dùng ảnh tuỳ chỉnh" />
              )}
            </button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1 custom-scrollbar">

          {/* Hidden File Input */}
          <input 
            type="file" 
            ref={fileInputRef} 
            accept="image/jpeg,image/png,image/webp,image/jpg" 
            className="hidden" 
            onChange={handleFileChange} 
          />

          {/* Interactive Live Preview Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700 dark:text-slate-300">
              <span className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Bản xem trước thực tế (Live Preview)
              </span>
              <span className="text-[11px] font-medium text-slate-400">
                {currentBgData ? '✓ Ảnh tải lên riêng' : 'Mặc định hệ thống'}
              </span>
            </div>

            {/* Drag & Drop Preview Canvas */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative rounded-2xl overflow-hidden border-2 cursor-pointer transition-all duration-200 group select-none shadow-md ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/40 ring-4 ring-indigo-500/20' 
                  : 'border-slate-200 dark:border-slate-700/80 hover:border-indigo-400 dark:hover:border-indigo-500 bg-slate-100 dark:bg-slate-800/40'
              }`}
              style={{
                aspectRatio: activeTab === 'dashboard' ? '16 / 8' : '16 / 10',
                minHeight: '210px',
              }}
              title="Nhấn hoặc thả ảnh vào đây để tải lên"
            >
              {/* Background Layer: Custom or Default */}
              <div 
                className="absolute inset-0 bg-cover bg-center transition-all duration-300"
                style={{
                  backgroundImage: currentBgData 
                    ? `url(${currentBgData.dataUrl})` 
                    : activeTab === 'dashboard'
                    ? "url('/images/study/sakura-landscape.webp')"
                    : activeTab === 'cardFront'
                    ? "url('/images/study/flashcard-frog.webp')"
                    : "url('/images/study/quiz-frog.webp')",
                }}
              />

              {/* White-Wash Overlay (Tán trắng) - Thay đổi tức thì theo thanh trượt */}
              <div 
                className="absolute inset-0 bg-white dark:bg-slate-950 transition-opacity duration-150 pointer-events-none"
                style={{ opacity: currentWash / 100 }}
              />

              {/* Realistic Mockup Elements Floating on Top */}
              {activeTab === 'dashboard' ? (
                /* Mini Dashboard UI Mockup */
                <div className="absolute inset-0 p-3.5 flex flex-col justify-between pointer-events-none">
                  {/* Top Bar Mockup */}
                  <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur shadow-xs border border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex items-center gap-1.5">
                      <div className="w-4 h-4 rounded-md bg-amber-500" />
                      <span className="text-[11px] font-black text-slate-800 dark:text-slate-100">KotoBase</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-12 h-3 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="w-5 h-5 rounded-full bg-indigo-500/20" />
                    </div>
                  </div>

                  {/* Center Content Mockup */}
                  <div className="flex gap-2.5 items-stretch flex-1 my-2">
                    {/* Mini Sidebar */}
                    <div className="w-20 rounded-xl bg-white/80 dark:bg-slate-900/80 backdrop-blur p-2 border border-slate-200/40 dark:border-slate-700/40 space-y-1.5 hidden sm:block">
                      <div className="w-12 h-2.5 rounded bg-amber-500/40" />
                      <div className="w-14 h-2 rounded bg-slate-200 dark:bg-slate-700" />
                      <div className="w-10 h-2 rounded bg-slate-200 dark:bg-slate-700" />
                    </div>
                    {/* Mini Card Area */}
                    <div className="flex-1 rounded-xl bg-white/85 dark:bg-slate-900/85 backdrop-blur p-3 border border-slate-200/50 dark:border-slate-700/50 flex flex-col items-center justify-center text-center">
                      <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-serif">読書</div>
                      <div className="text-[10px] text-slate-600 dark:text-slate-300 font-bold mt-0.5">どくしょ • Đọc sách</div>
                    </div>
                  </div>

                  {/* Bottom hint */}
                  <div className="text-[10px] text-center font-bold text-slate-600 dark:text-slate-300 bg-white/70 dark:bg-slate-900/70 backdrop-blur py-0.5 rounded-lg border border-slate-200/30">
                    Phủ trắng {currentWash}% • Ảnh rõ nét không bị nhòe mờ
                  </div>
                </div>
              ) : activeTab === 'cardFront' ? (
                /* Mini Flashcard Front Mockup */
                <div className="absolute inset-0 p-4 flex flex-col items-center justify-between text-center pointer-events-none">
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Bấm để lật thẻ
                    </span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      N3 • Từ vựng
                    </span>
                  </div>

                  {/* Word Display */}
                  <div className="my-auto py-1">
                    <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white font-serif tracking-wide drop-shadow-xs">
                      読書
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                      ĐỘC THƯ
                    </div>
                  </div>

                  {/* Sample Mnemonic Bubble */}
                  <div className="w-full max-w-sm px-3 py-1.5 rounded-xl bg-amber-50/90 dark:bg-amber-950/60 border border-amber-300/60 dark:border-amber-500/30 text-left text-[11px] leading-tight text-slate-800 dark:text-slate-200 shadow-xs">
                    <span className="font-bold text-amber-700 dark:text-amber-400">✨ Mẹo nhớ: </span>
                    Người <span className="font-bold text-indigo-600 dark:text-indigo-400">Bán</span> Nói to từng chữ khi <span className="font-extrabold text-rose-600 dark:text-rose-400">ĐỌC</span> cuốn sách...
                  </div>
                </div>
              ) : (
                /* Mini Flashcard Back Mockup */
                <div className="absolute inset-0 p-4 flex flex-col items-center justify-between text-center pointer-events-none">
                  <div className="w-full flex items-center justify-between">
                    <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                      <Check className="w-3 h-3" /> Đáp án & Ngữ cảnh
                    </span>
                    <span className="text-[9px] font-bold text-slate-400">
                      どくしょ
                    </span>
                  </div>

                  {/* Meaning & Details */}
                  <div className="my-auto py-1 space-y-1">
                    <div className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                      Đọc sách (Việc đọc sách)
                    </div>
                    <div className="text-[11px] text-slate-600 dark:text-slate-300 italic max-w-xs mx-auto">
                      "趣味は読書です。" (Sở thích của tôi là đọc sách)
                    </div>
                  </div>

                  {/* Rating simulation */}
                  <div className="flex gap-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600">Ôn lại</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600">Đã thuộc</span>
                  </div>
                </div>
              )}

              {/* Hover Overlay with Action Hint */}
              <div className="absolute inset-0 bg-indigo-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 backdrop-blur-xs">
                <span className="px-3.5 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-bold shadow-lg flex items-center gap-1.5 transform group-hover:scale-105 transition-transform">
                  <Upload className="w-3.5 h-3.5 text-indigo-600" />
                  Bấm để chọn ảnh mới (hoặc kéo thả vào đây)
                </span>
              </div>
            </div>
          </div>

          {/* Wash Intensity / Tán Trắng Slider */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-indigo-500" />
                {activeTab === 'dashboard' ? 'Độ phủ trắng nền tổng quát:' : 'Độ tán trắng thẻ học & Quiz:'}
              </label>
              <span className="text-xs font-black font-mono px-2 py-0.5 rounded-md bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                {currentWash}%
              </span>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-3 gap-2">
              {(activeTab === 'dashboard' 
                ? [{ label: 'Trong trẻo (55%)', val: 55 }, { label: 'Hài hoà (75%)', val: 75 }, { label: 'Tối đa (88%)', val: 88 }]
                : [{ label: 'Dịu nhẹ (45%)', val: 45 }, { label: 'Vừa phải (65%)', val: 65 }, { label: 'Sáng rõ (80%)', val: 80 }]
              ).map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => handleWashChange(preset.val)}
                  className={`py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center ${
                    currentWash === preset.val
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Fine Slider */}
            <div className="pt-1">
              <input 
                type="range" 
                min="30" 
                max="95" 
                step="1"
                value={currentWash}
                onChange={(e) => handleWashChange(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1 font-medium">
                <span>30% (Thấy rõ ảnh)</span>
                <span>Khuyên dùng: 65% - 75%</span>
                <span>95% (Chữ cực nét)</span>
              </div>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2">
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm shadow-indigo-600/20 active:scale-95 disabled:opacity-50 transition-all"
              >
                <Upload className="w-4 h-4" />
                <span>{currentBgData ? 'Thay ảnh khác' : 'Tải ảnh từ máy'}</span>
              </button>

              {currentBgData && (
                <button 
                  type="button"
                  onClick={handleDelete}
                  disabled={isProcessing}
                  className="px-3.5 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-600 dark:text-rose-400 hover:border-rose-200 text-xs font-bold rounded-xl flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 active:scale-95 transition-all"
                  title="Khôi phục ảnh gốc của ứng dụng"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Mặc định</span>
                </button>
              )}
            </div>

            {/* Current file info */}
            {currentBgData && (
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate max-w-[200px]" title={currentBgData.fileName}>
                Tệp: {currentBgData.fileName}
              </span>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/80 rounded-b-3xl border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Lưu an toàn qua IndexedDB • Cập nhật tức thì không cần tải lại</span>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-xl transition-colors"
          >
            Xong
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
