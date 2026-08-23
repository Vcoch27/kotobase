'use client';

import React, { useState, useEffect } from 'react';
import { X, Save, FileCode, CheckCircle, Plus, Trash2, Check } from 'lucide-react';
import { createSentence, updateSentence, createBulkSentences } from '@/app/actions/sentence';
import toast from 'react-hot-toast';

interface SentenceFormModalProps {
  folders: any[];
  selectedFolderId: string;
  initialData?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export function SentenceFormModal({ folders, selectedFolderId, initialData, onClose, onSuccess }: SentenceFormModalProps) {
  const [mode, setMode] = useState<'manual' | 'json'>(initialData ? 'manual' : 'manual');
  
  // States for manual form
  const [japanese, setJapanese] = useState(initialData?.japanese || '');
  const [meaning, setMeaning] = useState(initialData?.meaning || '');
  const [note, setNote] = useState(initialData?.note || '');
  const [folderId, setFolderId] = useState(initialData?.folderSentences?.[0]?.folderId || selectedFolderId || '');
  
  const [vocabularies, setVocabularies] = useState<any[]>(
    Array.isArray(initialData?.vocabularies) ? initialData.vocabularies : []
  );
  const [grammars, setGrammars] = useState<any[]>(
    Array.isArray(initialData?.grammars) ? initialData.grammars : []
  );

  // States for JSON
  const [jsonText, setJsonText] = useState('');
  const [loading, setLoading] = useState(false);

  // Thêm từ vựng rỗng
  const addVocab = () => setVocabularies([...vocabularies, { word: '', reading: '', meaning: '' }]);
  const removeVocab = (index: number) => setVocabularies(vocabularies.filter((_, i) => i !== index));
  const updateVocab = (index: number, field: string, value: string) => {
    const newVocabs = [...vocabularies];
    newVocabs[index][field] = value;
    setVocabularies(newVocabs);
  };

  // Thêm ngữ pháp rỗng
  const addGrammar = () => setGrammars([...grammars, { grammar: '', meaning: '' }]);
  const removeGrammar = (index: number) => setGrammars(grammars.filter((_, i) => i !== index));
  const updateGrammar = (index: number, field: string, value: string) => {
    const newGrammars = [...grammars];
    newGrammars[index][field] = value;
    setGrammars(newGrammars);
  };

  const handleSaveManual = async () => {
    if (!japanese.trim() || !meaning.trim()) {
      toast.error('Vui lòng nhập câu tiếng Nhật và nghĩa!');
      return;
    }
    
    // Lọc bỏ các vocab/grammar rỗng
    const validVocabs = vocabularies.filter(v => v.word.trim() || v.meaning.trim());
    const validGrammars = grammars.filter(g => g.grammar.trim() || g.meaning.trim());

    setLoading(true);
    let res;
    if (initialData?.id) {
      res = await updateSentence(initialData.id, {
        japanese,
        meaning,
        vocabularies: validVocabs,
        grammars: validGrammars,
        note,
        folderId: folderId || undefined
      });
    } else {
      res = await createSentence({
        japanese,
        meaning,
        vocabularies: validVocabs,
        grammars: validGrammars,
        note,
        folderId: folderId || undefined
      });
    }

    setLoading(false);
    if (res.success) {
      toast.success(initialData ? 'Đã cập nhật mẫu câu!' : 'Đã thêm mẫu câu mới!');
      onSuccess();
      onClose();
    } else {
      toast.error(res.error || 'Lỗi lưu mẫu câu');
    }
  };

  const handleSaveJson = async () => {
    if (!jsonText.trim()) {
      toast.error('Vui lòng dán JSON');
      return;
    }
    try {
      JSON.parse(jsonText);
    } catch(e) {
      toast.error('JSON không hợp lệ');
      return;
    }

    setLoading(true);
    const res = await createBulkSentences(jsonText, folderId || undefined);
    setLoading(false);
    
    if (res.success) {
      toast.success(`Đã thêm ${res.count} mẫu câu thành công!`);
      onSuccess();
      onClose();
    } else {
      toast.error(res.error || 'Lỗi thêm hàng loạt');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-xl font-bold text-slate-800 dark:text-white">
            {initialData ? 'Sửa Mẫu Câu' : 'Thêm Mẫu Câu Mới'}
          </h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-xl">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS */}
        {!initialData && (
          <div className="px-5 pt-4 flex gap-2 border-b border-slate-100 dark:border-slate-800">
            <button
              onClick={() => setMode('manual')}
              className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${mode === 'manual' ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-transparent text-slate-500'}`}
            >
              Thủ công
            </button>
            <button
              onClick={() => setMode('json')}
              className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-1.5 ${mode === 'json' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-slate-500'}`}
            >
              <FileCode className="w-4 h-4" /> Import JSON
            </button>
          </div>
        )}

        {/* BODY */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* Chọn thư mục */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Lưu vào Thư mục</label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500"
            >
              <option value="">-- Không xếp thư mục (Root) --</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>

          {mode === 'manual' ? (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Câu tiếng Nhật (*)</label>
                <textarea
                  value={japanese}
                  onChange={e => setJapanese(e.target.value)}
                  placeholder="Ví dụ: 先生のおかげで、合格できた."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 text-sm font-bold"
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Nghĩa tiếng Việt (*)</label>
                <textarea
                  value={meaning}
                  onChange={e => setMeaning(e.target.value)}
                  placeholder="Ví dụ: Nhờ có thầy giáo mà tôi đã đỗ."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 text-sm"
                  rows={2}
                />
              </div>

              {/* VOCABULARIES */}
              <div className="space-y-3 bg-indigo-50/50 dark:bg-slate-800/50 p-4 rounded-xl border border-indigo-100 dark:border-slate-700/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider">Từ vựng trong câu</label>
                  <button onClick={addVocab} className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/40 px-2 py-1 rounded-md">
                    <Plus className="w-3 h-3" /> Thêm từ
                  </button>
                </div>
                {vocabularies.map((v, i) => (
                  <div key={i} className="flex gap-2 items-start relative bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-3 gap-2 flex-1">
                      <input placeholder="Từ (先生)" value={v.word} onChange={e => updateVocab(i, 'word', e.target.value)} className="w-full text-xs p-2 border rounded-lg dark:bg-slate-950 dark:border-slate-800" />
                      <input placeholder="Đọc (せんせい)" value={v.reading} onChange={e => updateVocab(i, 'reading', e.target.value)} className="w-full text-xs p-2 border rounded-lg dark:bg-slate-950 dark:border-slate-800" />
                      <input placeholder="Nghĩa (giáo viên)" value={v.meaning} onChange={e => updateVocab(i, 'meaning', e.target.value)} className="w-full text-xs p-2 border rounded-lg dark:bg-slate-950 dark:border-slate-800" />
                    </div>
                    <button onClick={() => removeVocab(i)} className="p-2 text-rose-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* GRAMMARS */}
              <div className="space-y-3 bg-emerald-50/50 dark:bg-slate-800/50 p-4 rounded-xl border border-emerald-100 dark:border-slate-700/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Ngữ pháp trong câu</label>
                  <button onClick={addGrammar} className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/40 px-2 py-1 rounded-md">
                    <Plus className="w-3 h-3" /> Thêm cấu trúc
                  </button>
                </div>
                {grammars.map((g, i) => (
                  <div key={i} className="flex gap-2 items-start relative bg-white dark:bg-slate-900 p-2 rounded-lg border border-slate-200 dark:border-slate-700">
                    <div className="grid grid-cols-2 gap-2 flex-1">
                      <input placeholder="Cấu trúc (おかげで)" value={g.grammar} onChange={e => updateGrammar(i, 'grammar', e.target.value)} className="w-full text-xs p-2 border rounded-lg dark:bg-slate-950 dark:border-slate-800" />
                      <input placeholder="Nghĩa (nhờ vào...)" value={g.meaning} onChange={e => updateGrammar(i, 'meaning', e.target.value)} className="w-full text-xs p-2 border rounded-lg dark:bg-slate-950 dark:border-slate-800" />
                    </div>
                    <button onClick={() => removeGrammar(i)} className="p-2 text-rose-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ghi chú thêm (Không bắt buộc)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-emerald-500 text-sm"
                  rows={2}
                />
              </div>

            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-200 dark:border-indigo-800 text-xs text-indigo-800 dark:text-indigo-300">
                <b>Cấu trúc JSON yêu cầu:</b>
                <pre className="mt-2 text-[10px] bg-white dark:bg-slate-950 p-2 rounded-lg border border-indigo-100 dark:border-indigo-800 overflow-x-auto">
{`[
  {
    "japanese": "先生のおかげで、合格できた.",
    "meaning": "Nhờ có thầy giáo mà tôi đã đỗ.",
    "vocabularies": [
      { "word": "先生", "reading": "せんせい", "meaning": "giáo viên" }
    ],
    "grammars": [
      { "grammar": "おかげで", "meaning": "nhờ vào" }
    ],
    "note": ""
  }
]`}
                </pre>
              </div>
              <textarea
                value={jsonText}
                onChange={e => setJsonText(e.target.value)}
                placeholder="Dán JSON vào đây..."
                className="w-full h-64 px-4 py-3 font-mono text-xs rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none custom-scrollbar"
              ></textarea>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2.5 font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors">
            Hủy
          </button>
          <button 
            onClick={mode === 'manual' ? handleSaveManual : handleSaveJson} 
            disabled={loading}
            className={`px-5 py-2.5 font-bold text-sm text-white rounded-xl shadow-lg transition-all flex items-center gap-2 ${mode === 'manual' ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/30'} disabled:opacity-50`}
          >
            <Save className="w-4 h-4" />
            {loading ? 'Đang lưu...' : 'Lưu lại'}
          </button>
        </div>
      </div>
    </div>
  );
}
