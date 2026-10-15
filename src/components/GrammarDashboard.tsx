'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getGrammarFolders, createGrammarFolder } from '@/app/actions/grammar';
import { getGrammarsByFolder, deleteGrammar } from '@/app/actions/grammar';
import { GrammarFolderTree } from './GrammarFolderTree';
import { GrammarList } from './GrammarList';
import { GrammarFlashcard } from './GrammarFlashcard';
import { GrammarFillBlank } from './GrammarFillBlank';
import { GrammarFormModal } from './GrammarFormModal'; 
import { GrammarDetailModal } from './GrammarDetailModal';
import { 
  LayoutGrid, List, Layers, Plus, Loader2, ChevronRight, ChevronDown,
  ArrowLeft, FolderPlus, BookOpen, PenTool, Database, Search, X, 
  RotateCw, Sparkles, Filter 
} from 'lucide-react';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { cn } from '@/lib/cn';
import { GrammarItem } from '@/lib/grammar-data';
import { getGrammarStudyDay, grammarStudyDays } from '@/lib/grammar-study-plan';

interface UserInfo {
  uid: string;
  email: string;
  name: string;
  picture?: string;
}

interface GrammarDashboardProps {
  currentUser?: UserInfo | null;
}

const CACHE_TTL_MS = 15 * 60 * 1000; // 15 phút (tối ưu hóa 100% lượt đọc Firestore)
const CACHE_KEY_PREFIX = 'kotobase_grammar_v6_';

function getLocalCache(key: string) {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(CACHE_KEY_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > CACHE_TTL_MS) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setLocalCache(key: string, data: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify({ data, timestamp: Date.now() }));
  } catch {
    // Quota exceeded
  }
}

function clearLocalGrammarCache() {
  if (typeof window === 'undefined') return;
  try {
    Object.keys(localStorage).forEach((k) => {
      if (k.startsWith('kotobase_grammar_')) {
        localStorage.removeItem(k);
      }
    });
  } catch {}
}

export function GrammarDashboard({ currentUser }: GrammarDashboardProps) {
  const [folders, setFolders] = useState<any[]>([]);
  const [grammars, setGrammars] = useState<GrammarItem[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'flashcard' | 'fillblank'>('list');
  const [listPresentation, setListPresentation] = useState<'compact' | 'cards'>('compact');
  const [selectedStudyDay, setSelectedStudyDay] = useState<number | null>(null);
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingGrammar, setEditingGrammar] = useState<any | null>(null);
  const [isMobileFolderOpen, setIsMobileFolderOpen] = useState(false);

  // Detail Modal State
  const [selectedDetailGrammar, setSelectedDetailGrammar] = useState<GrammarItem | null>(null);

  // Book filter state
  const [selectedBook, setSelectedBook] = useState<'all' | 'shinkanzen' | 'mimikara' | 'soumatome'>('all');

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState("");
  const [importing, setImporting] = useState(false);

  const [searchQuery, setSearchQuery] = useState("");
  const isGoogleUser = !!currentUser?.uid;

  // Book item counts
  const bookCounts = useMemo(() => {
    let sk = 0, mimi = 0, souma = 0;
    grammars.forEach(g => {
      if (Array.isArray(g.books)) {
        if (g.books.some((b: string) => b.toLowerCase().includes('shin'))) sk++;
        if (g.books.some((b: string) => b.toLowerCase().includes('mimi'))) mimi++;
        if (g.books.some((b: string) => b.toLowerCase().includes('souma'))) souma++;
      }
    });
    return { sk, mimi, souma, total: grammars.length };
  }, [grammars]);

  // Sort grammars
  const sortedGrammars = useMemo(() => {
    return [...grammars].sort((a, b) => {
      if (a.number != null && b.number != null) {
        return a.number - b.number;
      }
      if (a.number != null) return -1;
      if (b.number != null) return 1;
      return (a.structure || '').localeCompare(b.structure || '');
    });
  }, [grammars]);

  const studyDayCounts = useMemo(() => {
    const counts = new Map<number, number>();
    sortedGrammars.forEach(grammar => {
      const day = getGrammarStudyDay(grammar);
      if (day) counts.set(day, (counts.get(day) || 0) + 1);
    });
    return counts;
  }, [sortedGrammars]);

  // Filter grammars by Search & Book
  const filteredGrammars = useMemo(() => {
    let list = sortedGrammars;

    // 1. Filter by Book
    if (selectedBook !== 'all') {
      list = list.filter(g => {
        if (!Array.isArray(g.books) || g.books.length === 0) return false;
        if (selectedBook === 'shinkanzen') {
          return g.books.some(b => b.toLowerCase().includes('shin'));
        }
        if (selectedBook === 'mimikara') {
          return g.books.some(b => b.toLowerCase().includes('mimi'));
        }
        if (selectedBook === 'soumatome') {
          return g.books.some(b => b.toLowerCase().includes('souma'));
        }
        return true;
      });
    }

    if (selectedStudyDay !== null) {
      list = list.filter(grammar => getGrammarStudyDay(grammar) === selectedStudyDay);
    }

    // 2. Filter by Search Query
    if (!searchQuery.trim()) return list;

    const q = searchQuery.trim().toLowerCase();
    const cleanNum = q.replace(/^(bài|bai|#|\s)+/i, '').trim();
    const searchNum = parseInt(cleanNum, 10);

    return list.filter(g => {
      // Match lesson number
      if (!isNaN(searchNum) && g.number === searchNum) return true;
      if (g.number && String(g.number).includes(q)) return true;

      // Match structure
      if (g.structure && g.structure.toLowerCase().includes(q)) return true;
      // Match title
      if (g.title && g.title.toLowerCase().includes(q)) return true;
      // Match meaning
      if (g.meaning && g.meaning.toLowerCase().includes(q)) return true;
      // Match formation
      if (g.formation && g.formation.toLowerCase().includes(q)) return true;
      // Match nuance
      if (g.nuance && g.nuance.toLowerCase().includes(q)) return true;

      // Match blocks
      if (Array.isArray(g.blocks)) {
        const matchBlock = g.blocks.some((b: any) =>
          (b.meaning && b.meaning.toLowerCase().includes(q)) ||
          (b.formation && b.formation.toLowerCase().includes(q)) ||
          (b.nuance && b.nuance.toLowerCase().includes(q))
        );
        if (matchBlock) return true;
      }

      // Match examples
      if (Array.isArray(g.examples)) {
        const matchEx = g.examples.some((ex: any) =>
          (ex.jpn && ex.jpn.toLowerCase().includes(q)) ||
          (ex.vie && ex.vie.toLowerCase().includes(q))
        );
        if (matchEx) return true;
      }

      return false;
    });
  }, [sortedGrammars, selectedBook, selectedStudyDay, searchQuery]);

  const fetchData = useCallback(async (isBackground = false, forceRefresh = false) => {
    const foldersCacheKey = 'kotobase_grammar_folders';
    const grammarsCacheKey = `kotobase_grammar_items_${selectedFolderId}`;

    // Fast-path: Check localStorage cache first
    if (!forceRefresh) {
      const cachedFolders = getLocalCache(foldersCacheKey);
      const cachedGrammars = getLocalCache(grammarsCacheKey);

      // Kiểm tra tính toàn vẹn của cache:
      // - Nếu là 'all' thì phải có >= 350 bài (100 Shin Kanzen + 308 TNDG = 408 bài)
      // - Nếu là 'tndg-n3' thì phải có >= 300 bài
      const isComplete = cachedFolders && cachedGrammars && Array.isArray(cachedGrammars) &&
        (selectedFolderId === 'all' 
          ? cachedGrammars.length >= 350 
          : (selectedFolderId === 'tndg-n3' ? cachedGrammars.length >= 300 : true));

      if (isComplete) {
        setFolders(cachedFolders);
        setGrammars(cachedGrammars);
        setLoading(false);
        return; // Cache hit: 0 Firestore reads!
      }
    }

    if (!isBackground) setLoading(true);
    if (forceRefresh) setIsRefreshing(true);

    try {
      const [fData, gData] = await Promise.all([
        getGrammarFolders(),
        getGrammarsByFolder(selectedFolderId)
      ]);

      if (fData.success && Array.isArray(fData.data)) {
        setFolders(fData.data);
        setLocalCache(foldersCacheKey, fData.data);
      }
      if (gData.success && Array.isArray(gData.data)) {
        setGrammars(gData.data);
        setLocalCache(grammarsCacheKey, gData.data);
      }
    } catch (err) {
      toast.error('Lỗi khi tải dữ liệu ngữ pháp');
    } finally {
      if (!isBackground) setLoading(false);
      if (forceRefresh) setIsRefreshing(false);
    }
  }, [selectedFolderId]);

  useEffect(() => {
    // Dọn dẹp các cache cũ không tương thích
    try {
      Object.keys(localStorage).forEach((k) => {
        if (k.startsWith('kotobase_grammar_') && !k.startsWith(CACHE_KEY_PREFIX)) {
          localStorage.removeItem(k);
        }
      });
    } catch {}
    fetchData();
  }, [fetchData]);

  const handleSelectFolder = (id: string) => {
    setSelectedFolderId(id);
    setSelectedStudyDay(null);
    setViewMode('list');
    if (window.innerWidth < 768) {
      setIsMobileFolderOpen(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    setCreatingFolder(true);
    const res = await createGrammarFolder(newFolderName, selectedFolderId === 'all' ? undefined : selectedFolderId);
    setCreatingFolder(false);
    if (res.success) {
      toast.success("Đã tạo thư mục!");
      setNewFolderName("");
      setShowFolderModal(false);
      clearLocalGrammarCache();
      fetchData(true, true);
    } else {
      toast.error(res.error || "Lỗi tạo thư mục");
    }
  };

  const handleDeleteGrammar = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa ngữ pháp này?')) {
      const res = await deleteGrammar(id);
      if (res.success) {
        toast.success('Đã xóa ngữ pháp');
        clearLocalGrammarCache();
        fetchData(true, true);
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
      clearLocalGrammarCache();
      fetchData(true, true);
    } else {
      toast.error(res.error || "Lỗi import JSON");
    }
  };

  return (
    <div className="flex-1 max-w-screen-2xl w-full mx-auto px-4 lg:px-6 pt-6 flex flex-col md:flex-row gap-6 pb-20">
      
      {/* 1. SIDEBAR THƯ MỤC */}
      <div className="w-full md:w-64 lg:w-72 shrink-0 space-y-4 md:sticky md:top-20 md:self-start">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xl transition-colors duration-300 md:h-[calc(100vh-6rem)] md:max-h-[calc(100vh-6rem)] flex flex-col overflow-hidden">
          
          <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-slate-100 dark:border-slate-800 shrink-0">
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
          
          <div className={`${isMobileFolderOpen ? 'flex' : 'hidden'} md:flex flex-1 min-h-0 flex-col overflow-hidden`}>
            <GrammarFolderTree 
              folders={folders}
              selectedFolderId={selectedFolderId}
              onSelectFolder={handleSelectFolder}
              onRefresh={() => { clearLocalGrammarCache(); fetchData(true, true); }}
            />
          </div>

          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 shrink-0">
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

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col gap-5 min-w-0">
        
        {/* TOP ACTION BAR */}
        <div className="flex items-center gap-2 flex-wrap">
          {isGoogleUser && (
            <>
              <button
                onClick={() => { setEditingGrammar(null); setShowFormModal(true); }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white rounded-xl font-bold text-sm shadow-lg shadow-violet-500/30 transition-all flex-1 sm:flex-none active:scale-95"
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

          {/* VIEW MODES: LIST / FLASHCARD / FILLBLANK */}
          <div className="hidden sm:flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl items-center flex-1 sm:flex-none justify-center">
            <button
              onClick={() => setViewMode('list')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all",
                viewMode === 'list' 
                  ? 'bg-white dark:bg-slate-900 text-violet-600 dark:text-violet-400 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <List className="w-4 h-4" /> Ngữ pháp
            </button>
            <button
              onClick={() => setViewMode('flashcard')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all",
                viewMode === 'flashcard' 
                  ? 'bg-white dark:bg-slate-900 text-purple-600 dark:text-purple-400 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <Layers className="w-4 h-4" /> Flashcard
            </button>
            <button
              onClick={() => setViewMode('fillblank')}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all",
                viewMode === 'fillblank' 
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-xs' 
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
              )}
            >
              <PenTool className="w-4 h-4" /> Điền từ
            </button>
          </div>
        </div>

        {/* BOOK FILTER TABS (SHINKANZEN / MIMIKARA / SOUMATOME) */}
        {bookCounts.total > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 flex items-center gap-1 mr-1 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Giáo trình:
            </span>

            <button
              type="button"
              onClick={() => setSelectedBook('all')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border",
                selectedBook === 'all'
                  ? "bg-violet-600 text-white border-violet-600 shadow-xs"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800"
              )}
            >
              <span>Tất cả</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-black/10 dark:bg-white/10">
                {bookCounts.total}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedBook('shinkanzen')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border",
                selectedBook === 'shinkanzen'
                  ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                  : "bg-emerald-50/60 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border-emerald-200/60 dark:border-emerald-800/40"
              )}
            >
              <span>📗 Shinkanzen Master</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-emerald-200/70 dark:bg-emerald-800/60">
                {bookCounts.sk}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedBook('mimikara')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border",
                selectedBook === 'mimikara'
                  ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                  : "bg-amber-50/60 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border-amber-200/60 dark:border-amber-800/40"
              )}
            >
              <span>📙 Mimikara Oboeru</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-amber-200/70 dark:bg-amber-800/60">
                {bookCounts.mimi}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedBook('soumatome')}
              className={cn(
                "px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 border",
                selectedBook === 'soumatome'
                  ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                  : "bg-blue-50/60 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/40 border-blue-200/60 dark:border-blue-800/40"
              )}
            >
              <span>📘 Soumatome</span>
              <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-blue-200/70 dark:bg-blue-800/60">
                {bookCounts.souma}
              </span>
            </button>
          </div>
        )}

        {/* Optional study plan built from the book's table of contents. */}
        <div className="flex flex-col gap-2 rounded-2xl border border-violet-200 bg-violet-50/60 p-3 sm:flex-row sm:items-center dark:border-violet-900/50 dark:bg-violet-950/20">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-violet-900 dark:text-violet-200">Học theo 38 ngày · Shin Kanzen N3</p>
            <p className="text-xs text-violet-700/80 dark:text-violet-300/80">Chọn ngày để tập trung vào các bài đã ghép từ hai thư mục. Các ngày chưa có bài vẫn xem được trong sách.</p>
          </div>
          <select
            aria-label="Chọn ngày học ngữ pháp"
            value={selectedStudyDay ?? ''}
            onChange={event => {
              const day = event.target.value ? Number(event.target.value) : null;
              setSelectedStudyDay(day);
              if (day !== null) {
                setSelectedFolderId('all');
                setSelectedBook('all');
                setSearchQuery('');
                setViewMode('list');
              }
            }}
            className="w-full rounded-xl border border-violet-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:w-72 dark:border-violet-800 dark:bg-slate-900 dark:text-slate-100"
          >
            <option value="">Tất cả ngày · không lọc</option>
            {grammarStudyDays.map(day => (
              <option key={day.day} value={day.day}>
                {`Ngày ${day.day} · ${day.title} (${studyDayCounts.get(day.day) || 0})`}
              </option>
            ))}
          </select>
          <a
            href="https://drive.google.com/file/d/1zWuU4D2Ow2LSHLdKJeUHNac_9HArdjLz/view"
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 rounded-xl px-3 py-2 text-center text-xs font-bold text-violet-700 hover:bg-violet-100 focus-visible:outline-2 focus-visible:outline-violet-500 dark:text-violet-300 dark:hover:bg-violet-900/30"
          >
            Mở sách ↗
          </a>
        </div>

        {selectedStudyDay && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
            <span className="rounded-lg bg-white px-2.5 py-1.5 font-bold dark:bg-slate-900">{grammarStudyDays[selectedStudyDay - 1].part}</span>
            <span>{grammarStudyDays[selectedStudyDay - 1].title}</span>
            <span>· trang sách {grammarStudyDays[selectedStudyDay - 1].bookPage}</span>
            <button type="button" onClick={() => setSelectedStudyDay(null)} className="ml-auto font-bold text-violet-700 underline underline-offset-2 dark:text-violet-300">Bỏ lọc ngày</button>
          </div>
        )}

        {/* SEARCH BAR & COUNTER */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-2.5 sm:px-4 sm:py-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm theo bài (vd: 1, 25), cấu trúc, ý nghĩa, ví dụ..."
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none text-sm transition-all text-slate-800 dark:text-slate-100 placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0 px-1">
            <span className="px-2.5 py-1 rounded-lg bg-violet-50 dark:bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-100 dark:border-violet-500/20">
              {searchQuery || selectedBook !== 'all' || selectedStudyDay !== null
                ? `${filteredGrammars.length} / ${sortedGrammars.length} ngữ pháp` 
                : `${sortedGrammars.length} ngữ pháp`}
            </span>

            {/* Sync / Refresh button */}
            <button
              type="button"
              onClick={() => { clearLocalGrammarCache(); fetchData(true, true); }}
              disabled={isRefreshing}
              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Làm mới dữ liệu từ server"
            >
              <RotateCw className={cn("w-4 h-4", isRefreshing && "animate-spin text-violet-600")} />
            </button>
          </div>
        </div>

        {/* VIEW AREA */}
        {viewMode === 'list' && (
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-slate-500 dark:text-slate-400">{listPresentation === 'compact' ? 'Một dòng mỗi bài, bấm để xem chi tiết.' : 'Thẻ đầy đủ với ý nghĩa và ví dụ.'}</span>
            <div className="inline-flex shrink-0 rounded-xl border border-slate-200 bg-white p-1 dark:border-slate-800 dark:bg-slate-900" role="group" aria-label="Kiểu hiển thị ngữ pháp">
              <button type="button" onClick={() => setListPresentation('compact')} aria-pressed={listPresentation === 'compact'} className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold', listPresentation === 'compact' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800')}><List className="h-3.5 w-3.5" /> Danh sách</button>
              <button type="button" onClick={() => setListPresentation('cards')} aria-pressed={listPresentation === 'cards'} className={cn('flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-bold', listPresentation === 'cards' ? 'bg-violet-600 text-white' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800')}><LayoutGrid className="h-3.5 w-3.5" /> Thẻ</button>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
            <span className="text-xs font-semibold text-slate-400">Đang tải danh sách ngữ pháp...</span>
          </div>
        ) : (
          <div className="min-h-[500px]">
            {viewMode === 'list' && (
              filteredGrammars.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed">
                  <Search className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
                  <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Không tìm thấy ngữ pháp phù hợp
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                    {selectedStudyDay && !searchQuery ? 'Hai thư mục hiện chưa có bài được xác nhận cho ngày này. Bạn có thể mở sách để học theo mục lục.' : searchQuery ? `Không có ngữ pháp nào khớp với "${searchQuery}"` : 'Thư mục hoặc giáo trình này chưa có bài nào.'}
                  </p>
                  {(searchQuery || selectedBook !== 'all' || selectedStudyDay !== null) && (
                    <button
                      onClick={() => { setSearchQuery(''); setSelectedBook('all'); setSelectedStudyDay(null); }}
                      className="px-4 py-2 bg-violet-100 hover:bg-violet-200 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300 font-bold rounded-xl text-xs transition-colors"
                    >
                      Xóa bộ lọc
                    </button>
                  )}
                </div>
              ) : (
                <GrammarList 
                  grammars={filteredGrammars} 
                  presentation={listPresentation}
                  onEdit={(g) => { setEditingGrammar(g); setShowFormModal(true); }}
                  onDelete={handleDeleteGrammar}
                  onOpenDetail={(g) => setSelectedDetailGrammar(g)}
                />
              )
            )}
            {viewMode === 'flashcard' && (
              <GrammarFlashcard grammars={filteredGrammars} />
            )}
            {viewMode === 'fillblank' && (
              <GrammarFillBlank grammars={filteredGrammars} />
            )}
          </div>
        )}
      </div>

      {/* POPUP XEM CHI TIẾT NGỮ PHÁP (GRAMMAR DETAIL MODAL) */}
      {selectedDetailGrammar && (
        <GrammarDetailModal
          grammar={selectedDetailGrammar}
          allGrammars={filteredGrammars}
          isOpen={!!selectedDetailGrammar}
          onClose={() => setSelectedDetailGrammar(null)}
          onNavigate={(item) => setSelectedDetailGrammar(item)}
          onEdit={(g) => {
            setSelectedDetailGrammar(null);
            setEditingGrammar(g);
            setShowFormModal(true);
          }}
        />
      )}

      {/* FORM MODAL THÊM / SỬA */}
      {showFormModal && (
        <GrammarFormModal 
          folders={folders}
          selectedFolderId={selectedFolderId === 'all' ? '' : selectedFolderId}
          initialData={editingGrammar}
          onClose={() => { setShowFormModal(false); setEditingGrammar(null); }}
          onSuccess={() => { clearLocalGrammarCache(); fetchData(true, true); }}
        />
      )}

      {/* MODAL TẠO THƯ MỤC */}
      {showFolderModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
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

      {/* MODAL IMPORT JSON */}
      {showImportModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))] bg-slate-900/50 backdrop-blur-sm animate-fadeIn">
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
