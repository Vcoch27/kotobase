'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, Save, FileCode, CheckCircle, Plus, Trash2, Check, 
  Copy, Sparkles, ClipboardPaste, Eye, AlertCircle, RefreshCw 
} from 'lucide-react';
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
  const [copiedPrompt, setCopiedPrompt] = useState(false);
  const [parsedPreview, setParsedPreview] = useState<any[] | null>(null);
  const [jsonError, setJsonError] = useState<string | null>(null);

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

  // Prompt mẫu để AI gen JSON
  const sentencePromptTemplate = `Hãy đóng vai một chuyên gia giảng dạy tiếng Nhật. Hãy tạo danh sách mẫu câu giao tiếp tiếng Nhật theo chủ đề tôi yêu cầu (hoặc phân tích đoạn văn/danh sách câu tôi cung cấp).

BẮT BUỘC trả về kết quả dưới định dạng JSON thuần túy (Mảng các Object), không bao bọc thêm bất kỳ lời giải thích nào.

Cấu trúc JSON mỗi phần tử bắt buộc:
[
  {
    "japanese": "Câu tiếng Nhật hoàn chỉnh có Kanji (Ví dụ: 先生のおかげで、合格できた。)",
    "meaning": "Dịch nghĩa tiếng Việt tự nhiên, chuẩn xác",
    "vocabularies": [
      { "word": "Từ vựng có trong câu", "reading": "cách đọc Hiragana", "meaning": "nghĩa tiếng Việt" }
    ],
    "grammars": [
      { "grammar": "Cấu trúc ngữ pháp trọng tâm", "meaning": "ý nghĩa / cách dùng của ngữ pháp" }
    ],
    "note": "Ghi chú thêm về sắc thái, hoàn cảnh giao tiếp (nếu có)"
  }
]

Ví dụ mẫu:
[
  {
    "japanese": "先生のおかげで、合格できた。",
    "meaning": "Nhờ có thầy giáo mà tôi đã đỗ.",
    "vocabularies": [
      { "word": "先生", "reading": "せんせい", "meaning": "giáo viên, thầy giáo" },
      { "word": "合格", "reading": "ごうかく", "meaning": "đỗ, trúng tuyển" }
    ],
    "grammars": [
      { "grammar": "おかげで", "meaning": "nhờ có, nhờ vào (kết quả tích cực)" }
    ],
    "note": "Dùng để biểu thị lòng biết ơn"
  }
]`;

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(sentencePromptTemplate);
    setCopiedPrompt(true);
    toast.success("Đã sao chép Prompt AI vào bộ nhớ tạm!");
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handlePasteClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setJsonText(text);
        toast.success("Đã dán dữ liệu từ Clipboard!");
      }
    } catch (err) {
      toast.error("Không thể truy cập Clipboard!");
    }
  };

  const handleFormatJson = () => {
    try {
      if (!jsonText.trim()) return;
      const parsed = JSON.parse(jsonText);
      setJsonText(JSON.stringify(parsed, null, 2));
      toast.success("Đã định dạng JSON chuẩn!");
    } catch (e: any) {
      toast.error("JSON không hợp lệ để định dạng!");
    }
  };

  // Validate JSON realtime
  useEffect(() => {
    if (!jsonText.trim()) {
      setParsedPreview(null);
      setJsonError(null);
      return;
    }
    try {
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        setJsonError("Dữ liệu JSON phải là một mảng [] các mẫu câu");
        setParsedPreview(null);
      } else {
        setJsonError(null);
        setParsedPreview(parsed);
      }
    } catch (err: any) {
      setJsonError("Cú pháp JSON chưa đúng hoặc bị lỗi");
      setParsedPreview(null);
    }
  }, [jsonText]);

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
      const parsed = JSON.parse(jsonText);
      if (!Array.isArray(parsed)) {
        toast.error('JSON phải là một mảng []');
        return;
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fadeIn overflow-y-auto">
      <div 
        className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh] border border-slate-200 dark:border-slate-800 transition-colors"
        onClick={e => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              {mode === 'manual' ? '文' : <FileCode className="w-5 h-5" />}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-white">
                {initialData ? 'Chỉnh sửa Mẫu Câu' : 'Thêm Mẫu Câu Giao Tiếp'}
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {mode === 'manual' ? 'Nhập từng mẫu câu thủ công' : 'Nhập hàng loạt bằng mã JSON từ AI'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TABS */}
        {!initialData && (
          <div className="px-6 pt-3 flex gap-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
            <button
              onClick={() => setMode('manual')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                mode === 'manual' 
                  ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              Thủ công
            </button>
            <button
              onClick={() => setMode('json')}
              className={`px-4 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                mode === 'json' 
                  ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
              }`}
            >
              <FileCode className="w-4 h-4" /> 
              <span>Import JSON</span>
              <span className="px-1.5 py-0.5 text-[10px] bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300 rounded-full font-bold">
                AI Prompt
              </span>
            </button>
          </div>
        )}

        {/* BODY */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-5">
          {/* Chọn thư mục */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <span>Lưu vào Thư mục</span>
              <span className="text-[10px] font-normal text-slate-400">(Tùy chọn)</span>
            </label>
            <select
              value={folderId}
              onChange={(e) => setFolderId(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-700 dark:text-slate-300 outline-none focus:border-emerald-500 transition-colors"
            >
              <option value="">📁 -- Không xếp thư mục (Tất cả) --</option>
              {folders.map(f => (
                <option key={f.id} value={f.id}>📁 {f.name}</option>
              ))}
            </select>
          </div>

          {mode === 'manual' ? (
            <div className="space-y-5 animate-fadeIn">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Câu tiếng Nhật <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={japanese}
                  onChange={e => setJapanese(e.target.value)}
                  placeholder="Ví dụ: 先生のおかげで、合格できた。"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 text-sm font-bold text-slate-800 dark:text-slate-100 outline-none transition-colors"
                  rows={2}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Nghĩa tiếng Việt <span className="text-rose-500">*</span>
                </label>
                <textarea
                  value={meaning}
                  onChange={e => setMeaning(e.target.value)}
                  placeholder="Ví dụ: Nhờ có thầy giáo mà tôi đã đỗ."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 text-sm text-slate-800 dark:text-slate-100 outline-none transition-colors"
                  rows={2}
                />
              </div>

              {/* VOCABULARIES */}
              <div className="space-y-3 bg-indigo-50/40 dark:bg-slate-800/40 p-4 rounded-2xl border border-indigo-100 dark:border-slate-700/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                    Từ vựng trong câu
                  </label>
                  <button 
                    type="button"
                    onClick={addVocab} 
                    className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Thêm từ
                  </button>
                </div>
                {vocabularies.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">Chưa có từ vựng nào được thêm.</p>
                ) : (
                  vocabularies.map((v, i) => (
                    <div key={i} className="flex gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-3 gap-2 flex-1">
                        <input placeholder="Từ (先生)" value={v.word} onChange={e => updateVocab(i, 'word', e.target.value)} className="w-full text-xs p-2 border rounded-lg dark:bg-slate-950 dark:border-slate-800 outline-none focus:border-indigo-500" />
                        <input placeholder="Đọc (せんせい)" value={v.reading} onChange={e => updateVocab(i, 'reading', e.target.value)} className="w-full text-xs p-2 border rounded-lg dark:bg-slate-950 dark:border-slate-800 outline-none focus:border-indigo-500" />
                        <input placeholder="Nghĩa (giáo viên)" value={v.meaning} onChange={e => updateVocab(i, 'meaning', e.target.value)} className="w-full text-xs p-2 border rounded-lg dark:bg-slate-950 dark:border-slate-800 outline-none focus:border-indigo-500" />
                      </div>
                      <button onClick={() => removeVocab(i)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* GRAMMARS */}
              <div className="space-y-3 bg-emerald-50/40 dark:bg-slate-800/40 p-4 rounded-2xl border border-emerald-100 dark:border-slate-700/50">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    Ngữ pháp trong câu
                  </label>
                  <button 
                    type="button"
                    onClick={addGrammar} 
                    className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:hover:bg-emerald-900/60 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    <Plus className="w-3 h-3" /> Thêm cấu trúc
                  </button>
                </div>
                {grammars.length === 0 ? (
                  <p className="text-xs text-slate-400 italic text-center py-2">Chưa có ngữ pháp nào được thêm.</p>
                ) : (
                  grammars.map((g, i) => (
                    <div key={i} className="flex gap-2 items-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-700">
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <input placeholder="Cấu trúc (おかげで)" value={g.grammar} onChange={e => updateGrammar(i, 'grammar', e.target.value)} className="w-full text-xs p-2 border rounded-lg dark:bg-slate-950 dark:border-slate-800 outline-none focus:border-emerald-500" />
                        <input placeholder="Nghĩa (nhờ vào...)" value={g.meaning} onChange={e => updateGrammar(i, 'meaning', e.target.value)} className="w-full text-xs p-2 border rounded-lg dark:bg-slate-950 dark:border-slate-800 outline-none focus:border-emerald-500" />
                      </div>
                      <button onClick={() => removeGrammar(i)} className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">Ghi chú thêm (Không bắt buộc)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Ví dụ: Dùng trong ngữ cảnh trang trọng..."
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-emerald-500 text-sm text-slate-800 dark:text-slate-100 outline-none transition-colors"
                  rows={2}
                />
              </div>

            </div>
          ) : (
            <div className="space-y-4 animate-fadeIn">
              
              {/* KHỐI COPY PROMPT AI */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50/80 to-purple-50/40 dark:from-indigo-950/40 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-800/60 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-500/10 dark:bg-indigo-400/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100">
                        Tạo JSON Mẫu Câu tự động bằng AI
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Sao chép prompt rồi dán vào ChatGPT / Gemini / Claude
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopyPrompt}
                    className={`flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0 ${
                      copiedPrompt
                        ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
                    }`}
                  >
                    {copiedPrompt ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedPrompt ? 'Đã sao chép Prompt!' : 'Copy Prompt AI'}</span>
                  </button>
                </div>

                <div className="bg-white/80 dark:bg-slate-950/80 p-2.5 rounded-xl border border-indigo-100/80 dark:border-indigo-900/40 text-[11px] font-mono text-slate-600 dark:text-slate-400 max-h-24 overflow-y-auto custom-scrollbar leading-relaxed">
                  {sentencePromptTemplate}
                </div>
              </div>

              {/* THANH CÔNG CỤ NHẬP JSON */}
              <div className="flex items-center justify-between pt-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                  <span>Mã JSON Mẫu câu</span>
                  {parsedPreview && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Hợp lệ ({parsedPreview.length} mẫu câu)
                    </span>
                  )}
                  {jsonError && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {jsonError}
                    </span>
                  )}
                </label>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handlePasteClipboard}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                    title="Dán nhanh từ Clipboard"
                  >
                    <ClipboardPaste className="w-3 h-3" /> Dán
                  </button>
                  <button
                    type="button"
                    onClick={handleFormatJson}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-slate-600 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 flex items-center gap-1 transition-colors"
                    title="Định dạng thụt đầu dòng"
                  >
                    <RefreshCw className="w-3 h-3" /> Format
                  </button>
                </div>
              </div>

              {/* Ô NHẬP JSON */}
              <div className="relative">
                <textarea
                  value={jsonText}
                  onChange={e => setJsonText(e.target.value)}
                  placeholder="Dán mã JSON mảng các mẫu câu vào đây..."
                  className={`w-full h-52 px-4 py-3 font-mono text-xs rounded-2xl bg-slate-50 dark:bg-slate-950 border transition-all outline-none custom-scrollbar ${
                    jsonError
                      ? 'border-rose-300 dark:border-rose-800 focus:border-rose-500'
                      : parsedPreview
                      ? 'border-emerald-300 dark:border-emerald-800 focus:border-emerald-500'
                      : 'border-slate-200 dark:border-slate-800 focus:border-indigo-500'
                  }`}
                />
              </div>

              {/* LIVE PREVIEW NHANH */}
              {parsedPreview && parsedPreview.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-indigo-500" />
                      Xem trước ({parsedPreview.length} câu):
                    </span>
                  </div>
                  <div className="max-h-32 overflow-y-auto custom-scrollbar space-y-1.5 pr-1">
                    {parsedPreview.map((item: any, idx: number) => (
                      <div key={idx} className="text-xs p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-800 dark:text-slate-100 truncate">{item.japanese}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{item.meaning}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {Array.isArray(item.vocabularies) && item.vocabularies.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 font-bold">
                              {item.vocabularies.length} từ
                            </span>
                          )}
                          {Array.isArray(item.grammars) && item.grammars.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold">
                              {item.grammars.length} ngữ pháp
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex justify-end items-center gap-3">
          <button 
            onClick={onClose} 
            className="px-5 py-2.5 font-bold text-xs sm:text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 rounded-xl transition-colors"
          >
            Hủy
          </button>
          <button 
            onClick={mode === 'manual' ? handleSaveManual : handleSaveJson} 
            disabled={loading || (mode === 'json' && (!parsedPreview || parsedPreview.length === 0))}
            className={`px-6 py-2.5 font-bold text-xs sm:text-sm text-white rounded-xl shadow-lg transition-all flex items-center gap-2 ${
              mode === 'manual' 
                ? 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/30' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <Save className="w-4 h-4" />
            {loading ? 'Đang lưu...' : mode === 'json' ? `Lưu ${parsedPreview?.length || 0} mẫu câu` : 'Lưu mẫu câu'}
          </button>
        </div>
      </div>
    </div>
  );
}
