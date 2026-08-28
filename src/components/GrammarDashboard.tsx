'use client';

import React, { useState, useEffect } from 'react';
import { getGrammarFolders, createGrammarFolder } from '@/app/actions/grammar';
import { getGrammarsByFolder, deleteGrammar } from '@/app/actions/grammar';
import { GrammarFolderTree } from './GrammarFolderTree';
import { GrammarList } from './GrammarList';
import { GrammarFlashcard } from './GrammarFlashcard';
import { GrammarFillBlank } from './GrammarFillBlank';
import { GrammarFormModal } from './GrammarFormModal'; 
import { LayoutGrid, Layers, Plus, Loader2, ChevronRight, ChevronDown, ArrowLeft, FolderPlus, BookOpen, PenTool, Database } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface UserInfo {
  uid: string;
  email: string;
  name: string;
  picture?: string;
}

interface GrammarDashboardProps {
  currentUser?: UserInfo | null;
}

export function GrammarDashboard({ currentUser }: GrammarDashboardProps) {
  const [folders, setFolders] = useState<any[]>([]);
  const [grammars, setGrammars] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'flashcard' | 'fillblank'>('list');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingGrammar, setEditingGrammar] = useState<any | null>(null);
  const [isMobileFolderOpen, setIsMobileFolderOpen] = useState(false);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importing, setImporting] = useState(false);

  const isGoogleUser = !!currentUser?.uid;

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    const res = await createGrammarFolder(newFolderName, selectedFolderId === 'all' ? undefined : selectedFolderId);
    setCreatingFolder(false);
    if (res.success) {
      toast.success("Đã tạo thư mục!");
      setNewFolderName("");
      setShowFolderModal(false);
      fetchData(true);
    } else {
      toast.error(res.error || "Lỗi tạo thư mục");
    }
  };

  const fetchData = async (isBackground = false) => {
    if (!isBackground) setLoading(true);
    try {
      const [fData, gData] = await Promise.all([
        getGrammarFolders(),
        getGrammarsByFolder(selectedFolderId)
      ]);
      if (fData.success && Array.isArray(fData.data)) setFolders(fData.data);
      if (gData.success && Array.isArray(gData.data)) setGrammars(gData.data);
    } catch (err) {
      toast.error('Lỗi khi tải dữ liệu');
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [selectedFolderId]);

  const handleSelectFolder = (id: string) => {
    setSelectedFolderId(id);
    setViewMode('list');
    if (window.innerWidth < 768) {
      setIsMobileFolderOpen(false);
    }
  };

  const handleDeleteGrammar = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa ngữ pháp này?')) {
      const res = await deleteGrammar(id);
      if (res.success) {
        toast.success('Đã xóa ngữ pháp');
        fetchData(true);
      } else {
        toast.error('Lỗi khi xóa');
      }
    }
  };

  const handleImportJson = async () => {
    if (!importJsonText.trim()) return;
    setImporting(true);
    const res = await import("@/app/actions/grammar").then(m => m.createBulkGrammars(importJsonText, selectedFolderId === 'all' ? undefined : selectedFolderId));
    setImporting(false);
    if (res.success) {
      toast.success(`Đã import thành công ${res.count} điểm ngữ pháp!`);
      setImportJsonText("");
      setShowImportModal(false);
      fetchData(true);
    } else {
      toast.error(res.error || "Lỗi import JSON");
    }
  };

  return (
    <div className="flex-1 max-w-screen-2xl w-full mx-auto px-4 lg:px-6 pt-6 flex flex-col md:flex-row gap-6 pb-20">
      
      <div className="w-full md:w-64 lg:w-72 shrink-0 space-y-4 md:sticky md:top-20 md:self-start">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl transition-colors duration-300 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto custom-scrollbar">
          
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 
              className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer md:cursor-default flex-1"
              onClick={() => setIsMobileFolderOpen(!isMobileFolderOpen)}
            >
              <BookOpen className="w-5 h-5 text-violet-500" />
              <span>Thư mục Ngữ pháp</span>
              <span className="md:hidden p-1 bg-slate-100 dark:bg-slate-800 rounded-md ml-auto">
                {isMobileFolderOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            </h2>
            {isGoogleUser && (
              <button
                onClick={() => setShowFolderModal(true)}
                title="Tạo thư mục mới"
                className="p-1.5 rounded-lg bg-violet-100 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 hover:bg-violet-200 dark:hover:bg-violet-500/20 transition-colors shrink-0 ml-2"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className={`${isMobileFolderOpen ? 'block' : 'hidden'} md:block`}>
            <GrammarFolderTree 
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={handleSelectFolder}
              onRefresh={() => fetchData(true)}
            />
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
            <Link 
              href="/"
              className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Trở về Từ vựng</span>
            </Link>
          </div>

        </div>
      </div>

      <div className="flex-1 flex flex-col gap-6 min-w-0">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {isGoogleUser && (
            <>
              <button
                onClick={() => { setEditingGrammar(null); setShowFormModal(true); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-500/30 transition-all flex-1 sm:flex-none"
              >
                <Plus className="w-4 h-4" /> Thêm Ngữ pháp
              </button>
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-sm transition-all flex-1 sm:flex-none border border-slate-200 dark:border-slate-700"
              >
                <Database className="w-4 h-4" /> Import JSON
              </button>
            </>
          )}

          <div className="hidden sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl items-center flex-1 sm:flex-none justify-center">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Danh sách
            </button>
            <button
              onClick={() => setViewMode('flashcard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                viewMode === 'flashcard' 
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" /> Flashcard
            </button>
            <button
              onClick={() => setViewMode('fillblank')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                viewMode === 'fillblank' 
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <PenTool className="w-4 h-4" /> Điền từ
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
          </div>
        ) : (
          <div className="min-h-[500px]">
            {viewMode === 'list' && (
              <GrammarList 
                grammars={grammars} 
                onEdit={(g) => { setEditingGrammar(g); setShowFormModal(true); }}
                onDelete={handleDeleteGrammar}
              />
            )}
            {viewMode === 'flashcard' && (
              <GrammarFlashcard grammars={grammars} />
            )}
            {viewMode === 'fillblank' && (
              <GrammarFillBlank grammars={grammars} />
            )}
          </div>
        )}
      </div>

      {showFormModal && (
        <GrammarFormModal 
          folders={folders}
          selectedFolderId={selectedFolderId === 'all' ? '' : selectedFolderId}
          initialData={editingGrammar}
          onClose={() => { setShowFormModal(false); setEditingGrammar(null); }}
          onSuccess={() => fetchData(true)}
        />
      )}

      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-slideUp border border-slate-100 dark:border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg">Tạo thư mục mới</h3>
            </div>
            <div className="p-5 space-y-4">
              <input
                type="text"
                value={newFolderName}
                onChange={e => setNewFolderName(e.target.value)}
                placeholder="Nhập tên thư mục..."
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-violet-500 outline-none text-sm font-semibold"
                autoFocus
                onKeyDown={e => {
                  if (e.key === 'Enter' && !creatingFolder) handleCreateFolder();
                }}
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFolderModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition-colors"
                >
                  Hủy
                </button>
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim() || creatingFolder}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-violet-500 hover:bg-violet-600 disabled:opacity-50 transition-colors"
                >
                  {creatingFolder ? 'Đang tạo...' : 'Tạo mới'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Import JSON */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-slideUp border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg flex items-center gap-2">
                <Database className="w-5 h-5 text-violet-500" />
                Import Ngữ Pháp hàng loạt (JSON)
              </h3>
              <button 
                onClick={() => setShowImportModal(false)}
                className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors text-slate-500"
              >
                <ChevronDown className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
                <p className="font-bold mb-2">Định dạng JSON yêu cầu (Array of Objects):</p>
                <pre className="bg-white/60 dark:bg-slate-900/60 p-3 rounded-lg overflow-x-auto text-xs font-mono">
{`[
  {
    "structure": "〜によって",
    "formation": "N + によって",
    "meaning": "Do/Vì...",
    "nuance": "Dùng trong văn viết, trang trọng",
    "example": "不景気の影響により...",
    "exampleMeaning": "Do ảnh hưởng suy thoái...",
    "jlptLevel": "N4",
    "usageContext": "writing,business"
  }
]`}
                </pre>
              </div>

              <textarea
                value={importJsonText}
                onChange={e => setImportJsonText(e.target.value)}
                placeholder="Dán mảng JSON vào đây..."
                className="w-full h-64 px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-violet-500 outline-none font-mono text-sm resize-none custom-scrollbar"
              />
            </div>

            <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3 bg-slate-50/50 dark:bg-slate-900">
              <button
                onClick={() => setShowImportModal(false)}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-slate-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={handleImportJson}
                disabled={!importJsonText.trim() || importing}
                className="flex-[2] px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2 shadow-lg shadow-violet-500/20"
              >
                {importing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                {importing ? 'Đang Import...' : 'Bắt đầu Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
