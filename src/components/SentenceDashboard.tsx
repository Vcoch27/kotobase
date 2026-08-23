'use client';

import React, { useState, useEffect } from 'react';
import { getSentenceFolders, createSentenceFolder } from '@/app/actions/sentence';
import { getSentencesByFolder, deleteSentence } from '@/app/actions/sentence';
import { SentenceFolderTree } from './SentenceFolderTree';
import { SentenceList } from './SentenceList';
import { SentenceFlashcard } from './SentenceFlashcard';
import { SentenceFormModal } from './SentenceFormModal'; 
import { LayoutGrid, Layers, Volume2, Plus, Loader2, Library, ChevronRight, ChevronDown, FileCode, ArrowLeft, FolderPlus } from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';

interface UserInfo {
  uid: string;
  email: string;
  name: string;
  picture?: string;
}

interface SentenceDashboardProps {
  currentUser?: UserInfo | null;
}

export function SentenceDashboard({ currentUser }: SentenceDashboardProps) {
  const [folders, setFolders] = useState<any[]>([]);
  const [sentences, setSentences] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'flashcard' | 'listening'>('list');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingSentence, setEditingSentence] = useState<any | null>(null);
  const [isMobileFolderOpen, setIsMobileFolderOpen] = useState(false);

  // States for folder creation
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const isGoogleUser = !!currentUser?.uid;

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    const res = await createSentenceFolder(newFolderName, selectedFolderId === 'all' ? undefined : selectedFolderId);
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
      const [fData, sData] = await Promise.all([
        getSentenceFolders(),
        getSentencesByFolder(selectedFolderId)
      ]);
      if (fData.success) setFolders(fData.data);
      if (sData.success) setSentences(sData.data);
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

  const handleDeleteSentence = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa mẫu câu này?')) {
      const res = await deleteSentence(id);
      if (res.success) {
        toast.success('Đã xóa mẫu câu');
        fetchData(true);
      } else {
        toast.error('Lỗi khi xóa');
      }
    }
  };

  return (
    <div className="flex-1 max-w-screen-2xl w-full mx-auto px-4 lg:px-6 pt-6 flex flex-col md:flex-row gap-6 pb-20">
      
      {/* LEFT SIDEBAR: Folder Tree */}
      <div className="w-full md:w-64 lg:w-72 shrink-0 space-y-4 md:sticky md:top-20 md:self-start">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl transition-colors duration-300 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto custom-scrollbar">
          
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
            <h2 
              className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 cursor-pointer md:cursor-default flex-1"
              onClick={() => setIsMobileFolderOpen(!isMobileFolderOpen)}
            >
              <Library className="w-5 h-5 text-emerald-500" />
              <span>Thư mục Mẫu câu</span>
              <span className="md:hidden p-1 bg-slate-100 dark:bg-slate-800 rounded-md ml-auto">
                {isMobileFolderOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </span>
            </h2>
            {isGoogleUser && (
              <button
                onClick={() => setShowFolderModal(true)}
                title="Tạo thư mục mới"
                className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-500/20 transition-colors shrink-0 ml-2"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            )}
          </div>
          
          <div className={`${isMobileFolderOpen ? 'block' : 'hidden'} md:block`}>
            <SentenceFolderTree 
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={handleSelectFolder}
              onRefresh={() => fetchData(true)}
            />
          </div>

          {/* Nút quay lại Dashboard */}
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

      {/* RIGHT MAIN CONTENT */}
      <div className="flex-1 flex flex-col gap-6 min-w-0">
        
        {/* ACTION TABS */}
        <div className="flex items-center gap-2 mb-2">
          {isGoogleUser && (
            <button
              onClick={() => { setEditingSentence(null); setShowFormModal(true); }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-bold text-sm shadow-lg shadow-emerald-500/30 transition-all flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4" /> Thêm Mẫu Câu
            </button>
          )}

          <div className="hidden sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl items-center flex-1 justify-center max-w-fit">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> Tổng quan
            </button>
            <button
              onClick={() => setViewMode('flashcard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                viewMode === 'flashcard' 
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Layers className="w-4 h-4" /> Flashcard
            </button>
            <button
              onClick={() => setViewMode('listening')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                viewMode === 'listening' 
                  ? 'bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <Volume2 className="w-4 h-4" /> Chế độ Nghe
            </button>
          </div>
        </div>

        {/* CONTENT AREA */}
        {loading ? (
          <div className="flex items-center justify-center p-20">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
          </div>
        ) : (
          <div className="min-h-[500px]">
            {viewMode === 'list' && (
              <SentenceList 
                sentences={sentences} 
                onEdit={(s) => { setEditingSentence(s); setShowFormModal(true); }}
                onDelete={handleDeleteSentence}
              />
            )}
            {(viewMode === 'flashcard' || viewMode === 'listening') && (
              <SentenceFlashcard 
                sentences={sentences} 
                mode={viewMode === 'flashcard' ? 'normal' : 'listening'}
              />
            )}
          </div>
        )}

      </div>

      {/* Modal Thêm Mẫu Câu */}
      {showFormModal && (
        <SentenceFormModal 
          folders={folders}
          selectedFolderId={selectedFolderId === 'all' ? '' : selectedFolderId}
          initialData={editingSentence}
          onClose={() => { setShowFormModal(false); setEditingSentence(null); }}
          onSuccess={() => fetchData(true)}
        />
      )}

      {/* Modal Tạo Thư Mục */}
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
                className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 outline-none text-sm font-semibold"
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
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-500 hover:bg-indigo-600 disabled:opacity-50 transition-all flex justify-center"
                >
                  {creatingFolder ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Tạo mới'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
