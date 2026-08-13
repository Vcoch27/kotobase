"use client";

import React, { useState, useEffect } from "react";
import { QuickAddForm } from "./QuickAddForm";
import { BulkImport } from "./BulkImport";
import { OverviewView } from "./OverviewView";
import { FocusRecallView } from "./FocusRecallView";
import { FlashcardView } from "./FlashcardView";
import { FolderTree } from "./FolderTree";
import { getVocabularies } from "@/app/actions/vocabulary";
import { getFolders, createFolder } from "@/app/actions/folder";
import { LayoutGrid, Eye, Search, FolderPlus, Layers } from "lucide-react";
import { getFolderFullPath } from "@/lib/folder-utils";

export function Dashboard() {
  const [viewMode, setViewMode] = useState<"overview" | "focus" | "flashcard">("overview");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [vocabularies, setVocabularies] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal tạo thư mục mới
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string>("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    const [vocabData, folderData] = await Promise.all([
      getVocabularies(selectedFolderId, searchQuery),
      getFolders(),
    ]);
    setVocabularies(vocabData);
    setFolders(folderData);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [selectedFolderId, searchQuery]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    const res = await createFolder(newFolderName, newFolderParentId || undefined);
    setCreatingFolder(false);
    if (res.success) {
      setNewFolderName("");
      setNewFolderParentId("");
      setShowFolderModal(false);
      fetchData();
    } else {
      alert(res.error || "Không thể tạo thư mục!");
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans antialiased pb-20 flex flex-col">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-indigo-600 flex items-center justify-center text-white font-extrabold text-xl shadow-lg shadow-amber-500/20">
              言
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight text-white flex items-center gap-2">
                KotoBase <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">Japanese</span>
              </h1>
            </div>
          </div>

          <div className="flex-1 max-w-xl hidden md:block px-8">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm từ vựng, âm đọc, nghĩa..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 focus:border-amber-500 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout (2 Columns) */}
      <main className="flex-1 max-w-screen-2xl w-full mx-auto px-4 lg:px-6 pt-6 flex flex-col md:flex-row gap-6">
        
        {/* LEFT SIDEBAR: Folder Tree */}
        <div className="w-full md:w-64 lg:w-72 shrink-0 space-y-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <h2 className="text-sm font-bold text-slate-200">Quản lý Thư mục</h2>
              <button
                onClick={() => setShowFolderModal(true)}
                title="Tạo thư mục mới"
                className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 transition-colors"
              >
                <FolderPlus className="w-4 h-4" />
              </button>
            </div>
            
            <FolderTree 
              folders={folders} 
              selectedFolderId={selectedFolderId} 
              onSelectFolder={setSelectedFolderId}
              onRefresh={fetchData} 
            />
          </div>
        </div>

        {/* RIGHT MAIN CONTENT */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Action Tabs: Quick Add & Bulk Import */}
          <div className="flex items-center gap-2 mb-2">
            <button
              onClick={() => setShowBulkImport(false)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!showBulkImport ? 'bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-900'}`}
            >
              Thêm Nhanh (Quick Add)
            </button>
            <button
              onClick={() => setShowBulkImport(true)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${showBulkImport ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-500 hover:bg-slate-900'}`}
            >
              Thêm Hàng Loạt (Bulk AI)
            </button>
          </div>

          {showBulkImport ? (
            <BulkImport folders={folders} onSuccess={fetchData} />
          ) : (
            <QuickAddForm folders={folders} onSuccess={fetchData} />
          )}

          {/* View Modes & Vocabularies */}
          <div className="bg-slate-900/60 p-3 rounded-2xl border border-slate-800 flex items-center justify-end overflow-x-auto custom-scrollbar">
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 whitespace-nowrap">
              <button
                onClick={() => setViewMode("overview")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "overview"
                    ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" /> Mode 1: Tổng quan
              </button>
              <button
                onClick={() => setViewMode("focus")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "focus"
                    ? "bg-gradient-to-r from-indigo-500 to-indigo-600 text-white shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Eye className="w-3.5 h-3.5" /> Mode 2: Ôn tập (Focus)
              </button>
              <button
                onClick={() => setViewMode("flashcard")}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === "flashcard"
                    ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 shadow-md"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900"
                }`}
              >
                <Layers className="w-3.5 h-3.5" /> Mode 3: Flashcard
              </button>
            </div>
          </div>

          <div className="pb-10">
            {loading ? (
              <div className="p-16 text-center text-slate-400">
                <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm font-medium">Đang tải dữ liệu từ vựng...</p>
              </div>
            ) : viewMode === "overview" ? (
              <OverviewView vocabularies={vocabularies} onRefresh={fetchData} />
            ) : viewMode === "focus" ? (
              <FocusRecallView vocabularies={vocabularies} onRefresh={fetchData} />
            ) : (
              <FlashcardView vocabularies={vocabularies} />
            )}
          </div>
        </div>
      </main>

      {/* Modal Tạo Thư Mục */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-400" /> Tạo Thư mục mới
            </h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tên thư mục</label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="VD: N3 Kanji, Bài 1 Minna..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-indigo-500 text-sm text-slate-100 placeholder-slate-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Thuộc thư mục cha (Optional)</label>
                <select
                  value={newFolderParentId}
                  onChange={(e) => setNewFolderParentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800 border border-slate-700 focus:border-indigo-500 text-sm text-slate-100 outline-none"
                >
                  <option value="">-- Không có (Root) --</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>{getFolderFullPath(f, folders)}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl disabled:opacity-50"
                >
                  {creatingFolder ? "Đang tạo..." : "Tạo thư mục"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
