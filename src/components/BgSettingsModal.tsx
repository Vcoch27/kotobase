import React, { useRef } from 'react';
import { createPortal } from 'react-dom';
import { Image as ImageIcon, Upload, Trash2, X, Monitor, CreditCard, RotateCcw } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCustomBg } from '@/hooks/useCustomBg';
import { BgKey } from '@/lib/bg-storage';

interface BgSettingsModalProps {
  onClose: () => void;
}

export function BgSettingsModal({ onClose }: BgSettingsModalProps) {
  const { dashboard, cardFront, cardBack, saveBg, deleteBg, isLoaded } = useCustomBg();
  const fileInputRefs = {
    dashboard: useRef<HTMLInputElement>(null),
    cardFront: useRef<HTMLInputElement>(null),
    cardBack: useRef<HTMLInputElement>(null),
  };

  const handleEscape = React.useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
  }, [onClose]);

  React.useEffect(() => {
    window.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [handleEscape]);

  const handleUploadClick = (key: BgKey) => {
    fileInputRefs[key].current?.click();
  };

  const handleFileChange = async (key: BgKey, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Vui lòng chọn một file ảnh.');
      return;
    }

    try {
      const loadingToast = toast.loading('Đang xử lý ảnh...');
      await saveBg(key, file);
      toast.dismiss(loadingToast);
      toast.success('Đã cập nhật ảnh nền thành công!');
    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Có lỗi xảy ra khi lưu ảnh.');
    } finally {
      if (e.target) e.target.value = ''; // Reset input
    }
  };

  const handleDelete = async (key: BgKey) => {
    try {
      await deleteBg(key);
      toast.success('Đã xoá ảnh nền tuỳ chỉnh.');
    } catch (error) {
      toast.error('Có lỗi xảy ra khi xoá ảnh.');
    }
  };

  if (!isLoaded) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-700 animate-fadeIn scale-in">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-6 h-6 text-indigo-500" />
            Tuỳ chỉnh ảnh nền
          </h2>
          <button 
            onClick={onClose}
            className="p-2 -mr-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          
          {/* Dashboard */}
          <section>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
              <Monitor className="w-5 h-5 text-indigo-400" />
              Nền tổng quát (Dashboard)
            </h3>
            <div className="flex items-start gap-6">
              <div className="w-40 h-24 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/50 shrink-0 relative flex items-center justify-center">
                {dashboard ? (
                  <img src={dashboard.dataUrl} alt="Dashboard preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-slate-400 font-medium px-2 text-center">sakura-landscape.webp (mặc định)</span>
                )}
              </div>
              <div className="space-y-3">
                <input 
                  type="file" 
                  ref={fileInputRefs.dashboard} 
                  accept="image/jpeg,image/png,image/webp,image/jpg" 
                  className="hidden" 
                  onChange={(e) => handleFileChange('dashboard', e)} 
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUploadClick('dashboard')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Tải ảnh lên
                  </button>
                  {dashboard && (
                    <button 
                      onClick={() => handleDelete('dashboard')}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Xoá
                    </button>
                  )}
                </div>
                {dashboard && <p className="text-xs text-slate-500">Đang dùng: {dashboard.fileName}</p>}
              </div>
            </div>
          </section>

          {/* Card Front */}
          <section>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
              <CreditCard className="w-5 h-5 text-emerald-400" />
              Mặt trước thẻ (Card Front)
            </h3>
            <div className="flex items-start gap-6">
              <div className="w-32 h-40 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/50 shrink-0 relative flex items-center justify-center">
                {cardFront ? (
                  <img src={cardFront.dataUrl} alt="Card front preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-slate-400 font-medium px-2 text-center">flashcard-frog.webp (mặc định)</span>
                )}
              </div>
              <div className="space-y-3">
                <input 
                  type="file" 
                  ref={fileInputRefs.cardFront} 
                  accept="image/jpeg,image/png,image/webp,image/jpg" 
                  className="hidden" 
                  onChange={(e) => handleFileChange('cardFront', e)} 
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUploadClick('cardFront')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Tải ảnh lên
                  </button>
                  {cardFront && (
                    <button 
                      onClick={() => handleDelete('cardFront')}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Xoá
                    </button>
                  )}
                </div>
                {cardFront && <p className="text-xs text-slate-500">Đang dùng: {cardFront.fileName}</p>}
              </div>
            </div>
          </section>

          {/* Card Back */}
          <section>
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 mb-4">
              <RotateCcw className="w-5 h-5 text-violet-400" />
              Mặt sau thẻ (Card Back)
            </h3>
            <div className="flex items-start gap-6">
              <div className="w-32 h-40 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-50 dark:bg-slate-800/50 shrink-0 relative flex items-center justify-center">
                {cardBack ? (
                  <img src={cardBack.dataUrl} alt="Card back preview" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xs text-slate-400 font-medium px-2 text-center">quiz-frog.webp (mặc định)</span>
                )}
              </div>
              <div className="space-y-3">
                <input 
                  type="file" 
                  ref={fileInputRefs.cardBack} 
                  accept="image/jpeg,image/png,image/webp,image/jpg" 
                  className="hidden" 
                  onChange={(e) => handleFileChange('cardBack', e)} 
                />
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleUploadClick('cardBack')}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors"
                  >
                    <Upload className="w-4 h-4" /> Tải ảnh lên
                  </button>
                  {cardBack && (
                    <button 
                      onClick={() => handleDelete('cardBack')}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-sm font-semibold rounded-xl flex items-center gap-2 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Xoá
                    </button>
                  )}
                </div>
                {cardBack && <p className="text-xs text-slate-500">Đang dùng: {cardBack.fileName}</p>}
              </div>
            </div>
          </section>

        </div>

        {/* Footer info */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 rounded-b-3xl border-t border-slate-100 dark:border-slate-800">
          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            ℹ️ Ảnh được lưu trên trình duyệt của bạn qua IndexedDB. Dung lượng tối đa: 5MB/ảnh.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
