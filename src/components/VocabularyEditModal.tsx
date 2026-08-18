'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, FileEdit, BookOpen, Volume2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { localDB } from '@/lib/db';
import { syncManager } from '@/lib/sync-manager';
import { getFolderFullPath } from '@/lib/folder-utils';
import { playAudio } from '@/lib/tts-utils';

export interface VocabularyEditItem {
  id: string;
  word: string;
  meaning: string;
  reading?: string | null;
  sinoVietnamese?: string | null;
  example?: string | null;
  note?: string | null;
  folderVocabularies?: any[];
}

interface VocabularyEditModalProps {
  vocabulary: any;
  folders: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function VocabularyEditModal({
  vocabulary,
  folders,
  onClose,
  onSuccess,
}: VocabularyEditModalProps) {
  const [formData, setFormData] = useState({
    word: vocabulary.word || '',
    meaning: vocabulary.meaning || '',
    reading: vocabulary.reading || '',
    sinoVietnamese: vocabulary.sinoVietnamese || '',
    example: vocabulary.example || '',
    note: vocabulary.note || '',
  });

  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!formData.word.trim() || !formData.meaning.trim()) {
      toast.error('Từ vựng và Nghĩa là bắt buộc!');
      return;
    }

    setIsSaving(true);
    try {
      await localDB.saveVocabulary({
        ...vocabulary,
        ...formData,
        id: vocabulary.id,
      });
      syncManager.notifyDataChanged();
      toast.success('Lưu từ vựng thành công!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error('Có lỗi xảy ra khi lưu.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fadeIn">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden transition-colors duration-300">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div>
            <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FileEdit className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Từ vựng
            </h3>
            <div className="flex flex-col gap-1 mt-1.5">
              <p className="text-xs font-medium text-slate-500">
                Cập nhật thông tin chi tiết cho flashcard.
              </p>
              {vocabulary.folderVocabularies && vocabulary.folderVocabularies.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {vocabulary.folderVocabularies.map((f: any) => (
                    <span
                      key={f.folderId}
                      className="text-[10px] font-bold bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full"
                    >
                      📁 {getFolderFullPath(f.folder, folders)}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-full w-fit">
                  📁 Không thuộc thư mục nào
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-500/10 rounded-xl transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[65vh] custom-scrollbar">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Từ vựng (Word) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="word"
                value={formData.word}
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none transition-all"
                placeholder="VD: 食べる"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Cách đọc (Reading)
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="reading"
                  value={formData.reading}
                  onChange={handleChange}
                  className="w-full pl-3.5 pr-10 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 text-sm font-semibold text-slate-800 dark:text-amber-400 outline-none transition-all"
                  placeholder="VD: たべる"
                />
                <button
                  type="button"
                  onClick={() => playAudio(formData.reading || formData.word)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-indigo-500 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                  title="Phát âm thanh"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Nghĩa (Meaning) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="meaning"
              value={formData.meaning}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm font-semibold text-slate-800 dark:text-emerald-400 outline-none transition-all"
              placeholder="VD: Ăn"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Hán Việt (Sino-Vietnamese)
            </label>
            <input
              type="text"
              name="sinoVietnamese"
              value={formData.sinoVietnamese}
              onChange={handleChange}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-semibold text-slate-800 dark:text-indigo-300 uppercase outline-none transition-all"
              placeholder="VD: THỰC"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-600 dark:text-slate-300">
              Ví dụ (Example)
            </label>
            <textarea
              name="example"
              value={formData.example}
              onChange={handleChange}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm text-slate-700 dark:text-slate-300 outline-none transition-all resize-none"
              placeholder="VD: ご飯を食べる。 (Ăn cơm.)"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" /> {isSaving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>
    </div>
  );
}
