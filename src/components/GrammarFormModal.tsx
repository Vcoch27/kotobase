'use client';

import React, { useState, useEffect } from 'react';
import { createGrammar, updateGrammar } from '@/app/actions/grammar';
import toast from 'react-hot-toast';
import { Loader2, X, BookOpen, CheckCircle } from 'lucide-react';

interface GrammarFolderItem {
  id: string;
  name: string;
  parentId: string | null;
}

interface GrammarFormModalProps {
  folders: GrammarFolderItem[];
  selectedFolderId: string;
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

const JLPT_LEVELS = ["N5", "N4", "N3", "N2", "N1"];
const USAGE_CONTEXTS = [
  { value: "conversation", label: "🗣️ Giao tiếp (Conversation)" },
  { value: "writing", label: "📝 Viết (Writing)" },
  { value: "business", label: "💼 Công sở (Business)" },
  { value: "anime", label: "📺 Anime/Manga" }
];

export function GrammarFormModal({
  folders,
  selectedFolderId,
  initialData,
  onClose,
  onSuccess,
}: GrammarFormModalProps) {
  const [formData, setFormData] = useState({
    structure: '',
    formation: '',
    meaning: '',
    nuance: '',
    example: '',
    exampleMeaning: '',
    jlptLevel: '',
    usageContext: [] as string[],
    folderId: selectedFolderId || '',
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        structure: initialData.structure || '',
        formation: initialData.formation || '',
        meaning: initialData.meaning || '',
        nuance: initialData.nuance || '',
        example: initialData.example || '',
        exampleMeaning: initialData.exampleMeaning || '',
        jlptLevel: initialData.jlptLevel || '',
        usageContext: initialData.usageContext ? initialData.usageContext.split(',').filter(Boolean) : [],
        folderId: initialData.folderIds?.[0] || selectedFolderId || '',
      });
    } else if (selectedFolderId) {
      setFormData(prev => ({ ...prev, folderId: selectedFolderId }));
    }
  }, [initialData, selectedFolderId]);

  const toggleUsageContext = (val: string) => {
    setFormData(prev => ({
      ...prev,
      usageContext: prev.usageContext.includes(val) 
        ? prev.usageContext.filter(v => v !== val)
        : [...prev.usageContext, val]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.structure.trim() || !formData.meaning.trim()) {
      toast.error('Vui lòng nhập cấu trúc và ý nghĩa!');
      return;
    }

    setLoading(true);
    try {
      const dataToSubmit = {
        structure: formData.structure.trim(),
        formation: formData.formation.trim(),
        meaning: formData.meaning.trim(),
        nuance: formData.nuance.trim(),
        example: formData.example.trim(),
        exampleMeaning: formData.exampleMeaning.trim(),
        jlptLevel: formData.jlptLevel,
        usageContext: formData.usageContext.join(','),
        folderIds: formData.folderId ? [formData.folderId] : [],
      };

      let res;
      if (initialData?.id) {
        res = await updateGrammar(initialData.id, dataToSubmit);
      } else {
        res = await createGrammar(dataToSubmit);
      }

      if (res.success) {
        toast.success(initialData ? 'Đã cập nhật ngữ pháp!' : 'Đã thêm ngữ pháp mới!');
        onSuccess();
        onClose();
      } else {
        toast.error(res.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      toast.error('Lỗi kết nối server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-slideUp border border-slate-100 dark:border-slate-800 my-8"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-lg text-slate-800 dark:text-slate-100">
                {initialData ? 'Sửa Ngữ pháp' : 'Thêm Ngữ pháp mới'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Điền thông tin chi tiết</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                Cấu trúc (Structure) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.structure}
                onChange={e => setFormData({ ...formData, structure: e.target.value })}
                placeholder="VD: 〜によって"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm font-japanese outline-none transition-all"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                Cách chia (Formation)
              </label>
              <input
                type="text"
                value={formData.formation}
                onChange={e => setFormData({ ...formData, formation: e.target.value })}
                placeholder="VD: N + によって"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm font-japanese outline-none transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              Ý nghĩa tiếng Việt <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.meaning}
              onChange={e => setFormData({ ...formData, meaning: e.target.value })}
              placeholder="VD: Do/Vì... (nguyên nhân)"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm font-semibold outline-none transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              Sắc thái / Chú ý (Nuance)
            </label>
            <textarea
              value={formData.nuance}
              onChange={e => setFormData({ ...formData, nuance: e.target.value })}
              placeholder="Ghi chú thêm về cách dùng, phân biệt với các cấu trúc khác..."
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm outline-none transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                Câu ví dụ (Example)
              </label>
              <textarea
                value={formData.example}
                onChange={e => setFormData({ ...formData, example: e.target.value })}
                placeholder="Ví dụ bằng tiếng Nhật"
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm font-japanese outline-none transition-all resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                Nghĩa câu ví dụ
              </label>
              <textarea
                value={formData.exampleMeaning}
                onChange={e => setFormData({ ...formData, exampleMeaning: e.target.value })}
                placeholder="Dịch nghĩa tiếng Việt"
                rows={3}
                className="w-full px-4 py-2.5 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-violet-500 focus:ring-1 focus:ring-violet-500 text-sm outline-none transition-all resize-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Cấp độ JLPT</label>
              <select
                value={formData.jlptLevel}
                onChange={e => setFormData({ ...formData, jlptLevel: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-violet-500 outline-none text-sm font-semibold"
              >
                <option value="">-- Chọn --</option>
                {JLPT_LEVELS.map(lvl => (
                  <option key={lvl} value={lvl}>{lvl}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Thư mục lưu</label>
              <select
                value={formData.folderId}
                onChange={e => setFormData({ ...formData, folderId: e.target.value })}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-violet-500 outline-none text-sm font-semibold"
              >
                <option value="">-- Không phân loại --</option>
                {folders.map(f => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ngữ cảnh sử dụng (Usage Context)</label>
            <div className="flex flex-wrap gap-2">
              {USAGE_CONTEXTS.map(ctx => {
                const isSelected = formData.usageContext.includes(ctx.value);
                return (
                  <button
                    key={ctx.value}
                    type="button"
                    onClick={() => toggleUsageContext(ctx.value)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                      isSelected 
                        ? 'bg-violet-100 dark:bg-violet-500/20 border-violet-300 dark:border-violet-500/50 text-violet-700 dark:text-violet-300'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-violet-200'
                    }`}
                  >
                    {ctx.label}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="pt-4 flex gap-3 sticky bottom-0 bg-white dark:bg-slate-900 py-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={loading || !formData.structure.trim() || !formData.meaning.trim()}
              className="flex-1 px-4 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 transition-all flex justify-center items-center gap-2 shadow-lg shadow-violet-500/20"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CheckCircle className="w-5 h-5" />}
              {initialData ? 'Lưu Thay Đổi' : 'Tạo Ngữ Pháp'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
