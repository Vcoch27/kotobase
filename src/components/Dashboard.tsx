"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import dynamic from "next/dynamic";
import { QuickAddForm } from "./QuickAddForm";
import { BulkImport } from "./BulkImport";
import { OverviewView } from "./OverviewView";
import { FolderTree } from "./FolderTree";
import { AnkiSettingsModal } from "./AnkiSettingsModal";
import { TTSSettingsModal } from "./TTSSettingsModal";
import { GeminiSettingsModal } from "./GeminiSettingsModal";
import { JishoSearchResults } from "./JishoSearchResults";
import { getVocabularies } from "@/app/actions/vocabulary";
import { getFolders, createFolder } from "@/app/actions/folder";
import { 
  LayoutGrid, Eye, Search, FolderPlus, Layers, Settings2, BrainCircuit, 
  Moon, Sun, Library, LogOut, ChevronDown, ChevronRight, ChevronUp, Volume2, Loader2,
  User, Lock, Folder, X, FolderTree as FolderTreeIcon, ArrowDownNarrowWide, ArrowUpNarrowWide,
  Sparkles, BookOpen, Smartphone, WifiOff
} from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { OfflineSyncButton } from "./OfflineSyncButton";
import { getOfflineVocabularies, getOfflineFolders, saveVocabulariesOffline, saveFoldersOffline } from "@/lib/offline-storage";
import { getFolderFullPath } from "@/lib/folder-utils";
import { useTheme } from "next-themes";
import { useDebounce } from "@/hooks/useDebounce";
import { AppLogo } from "./AppLogo";
import Link from "next/link";
import toast from "react-hot-toast";
import { auth } from "@/lib/firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { loginWithGoogle } from "@/app/actions/auth";

const FocusRecallView = dynamic(() => import("./FocusRecallView").then(m => m.FocusRecallView), {
  loading: () => <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
});
const FlashcardView = dynamic(() => import("./FlashcardView").then(m => m.FlashcardView), {
  loading: () => <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
});
const TypingQuizView = dynamic(() => import("./TypingQuizView").then(m => m.TypingQuizView), {
  loading: () => <div className="flex items-center justify-center p-20"><Loader2 className="w-8 h-8 animate-spin text-amber-500" /></div>
});

interface UserInfo {
  uid: string;
  email: string;
  name: string;
  picture?: string;
}

interface DashboardProps {
  currentUser?: UserInfo | null;
}

export function Dashboard({ currentUser }: DashboardProps) {
  const [viewMode, setViewMode] = useState<"overview" | "focus" | "flashcard" | "quiz">("overview");
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [vocabularies, setVocabularies] = useState<any[]>([]);
  const [folders, setFolders] = useState<any[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("kotobase_cached_folders");
        if (saved) return JSON.parse(saved);
      } catch (e) {}
    }
    return [];
  });
  const [selectedFolderId, setSelectedFolderId] = useState<string>("all");
  const [selectedVocabIds, setSelectedVocabIds] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"created_asc" | "created_desc" | "alphabetical">("created_asc");

  const handleSelectFolder = (id: string) => {
    setSelectedFolderId(id);
    setSelectedVocabIds([]);
    try {
      localStorage.setItem("kotobase_selected_folder", id);
    } catch (e) {}
  };

  const handleSortChange = (newSort: "created_asc" | "created_desc" | "alphabetical") => {
    setSortOrder(newSort);
    try {
      localStorage.setItem("kotobase_sort_order", newSort);
    } catch (e) {}
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showMobileFolderDrawer, setShowMobileFolderDrawer] = useState(false);
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showTTSSettingsModal, setShowTTSSettingsModal] = useState(false);
  const [showGeminiSettingsModal, setShowGeminiSettingsModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParentId, setNewFolderParentId] = useState<string>("");
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [isMobileFolderOpen, setIsMobileFolderOpen] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);

  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isOnline = useOnlineStatus();
  const [isOfflineMode, setIsOfflineMode] = useState(false);

  // Bộ nhớ đệm (Cache) siêu tiết kiệm Reads
  const vocabCache = React.useRef<Record<string, any[]>>({});
  const foldersCache = React.useRef<any[] | null>(null);
  
  const debouncedSearchQuery = useDebounce(searchQuery, 400);

  // Xác định quyền: chỉ user đã đăng nhập Google mới được tạo/sửa/xóa
  const isGoogleUser = !!currentUser?.uid;

  const fetchData = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
    }
    setQuotaExceeded(false);

    // Hàm phụ khôi phục thư mục offline/cache
    const getFallbackFolders = async (): Promise<any[]> => {
      try {
        const offlineF = await getOfflineFolders();
        if (Array.isArray(offlineF) && offlineF.length > 0) return offlineF;
      } catch (e) {}
      if (typeof window !== "undefined") {
        try {
          const saved = localStorage.getItem("kotobase_cached_folders");
          if (saved) return JSON.parse(saved);
        } catch (e) {}
      }
      return [];
    };

    try {
      // 1. Nếu thiết bị mất mạng (Offline), ưu tiên đọc ngay từ IndexedDB
      if (typeof window !== "undefined" && !navigator.onLine) {
        const [offlineVocabs, fallbackFolders] = await Promise.all([
          getOfflineVocabularies(selectedFolderId),
          getFallbackFolders()
        ]);

        if (fallbackFolders.length > 0) {
          setFolders(fallbackFolders);
          foldersCache.current = fallbackFolders;
        }

        setVocabularies(offlineVocabs || []);
        setIsOfflineMode(true);
        if (offlineVocabs && offlineVocabs.length > 0) {
          toast(`Đang học Offline (${offlineVocabs.length} từ vựng)`, { icon: "📶", id: "offline-status" });
        } else if (selectedFolderId !== "all") {
          toast("Thư mục này chưa có dữ liệu lưu offline trên máy.", { icon: "ℹ️", id: "offline-empty" });
        }
        return;
      }

      let vocabData: any[];
      let folderData: any[];

      // Kiểm tra xem trong cache đã có folder này chưa
      if (!isBackground && vocabCache.current[selectedFolderId] && foldersCache.current) {
        vocabData = vocabCache.current[selectedFolderId];
        folderData = foldersCache.current;
      } else {
        // Chỉ tải mới từ Firebase khi chưa có cache hoặc vừa có thay đổi dữ liệu (isBackground)
        const [vData, fData] = await Promise.all([
          getVocabularies(selectedFolderId),
          getFolders(),
        ]);
        
        if (vData && (vData as any).error === "QUOTA_EXCEEDED") throw new Error("QUOTA_EXCEEDED");
        if (fData && (fData as any).error === "QUOTA_EXCEEDED") throw new Error("QUOTA_EXCEEDED");

        vocabData = vData as any[];
        folderData = fData as any[];
        
        // Lưu lại vào Cache RAM
        vocabCache.current[selectedFolderId] = Array.isArray(vocabData) ? vocabData : [];
        foldersCache.current = Array.isArray(folderData) ? folderData : [];

        // Tự động lưu bản sao vào IndexedDB và localStorage để sẵn sàng cho lúc mất mạng (Background)
        if (Array.isArray(vocabData) && vocabData.length > 0) {
          saveVocabulariesOffline(vocabData).catch(() => {});
        }
        if (Array.isArray(folderData) && folderData.length > 0) {
          saveFoldersOffline(folderData).catch(() => {});
          try {
            localStorage.setItem("kotobase_cached_folders", JSON.stringify(folderData));
          } catch (e) {}
        }
      }

      setVocabularies(Array.isArray(vocabData) ? vocabData : []);
      setFolders(Array.isArray(folderData) ? folderData : []);
      setIsOfflineMode(false);
    } catch (error: any) {
      console.error("Lỗi khi tải dữ liệu:", error);
      
      // Fallback: Khi có lỗi (hết Quota Firebase hoặc rớt mạng đột ngột), đọc ngay từ IndexedDB
      try {
        const [offlineVocabs, fallbackFolders] = await Promise.all([
          getOfflineVocabularies(selectedFolderId),
          getFallbackFolders()
        ]);

        if (fallbackFolders.length > 0) {
          setFolders(fallbackFolders);
          foldersCache.current = fallbackFolders;
        }

        setVocabularies(offlineVocabs || []);
        setIsOfflineMode(true);
        if (offlineVocabs && offlineVocabs.length > 0) {
          toast.success(`Đã tự động chuyển sang ${offlineVocabs.length} từ vựng Offline trên máy!`, { id: "offline-status" });
        }
        return;
      } catch (offlineErr) {
        console.warn("Lỗi đọc offline fallback:", offlineErr);
      }

      if (error.message === "QUOTA_EXCEEDED") {
        setQuotaExceeded(true);
      } else {
        toast.error("Lỗi tải dữ liệu, vui lòng thử lại sau.");
      }
      setVocabularies([]);
    } finally {
      if (!isBackground) {
        setLoading(false);
      }
    }
  };

  // Khôi phục selectedFolderId & sortOrder từ localStorage ở Client
  useEffect(() => {
    try {
      const savedFolder = localStorage.getItem("kotobase_selected_folder");
      if (savedFolder && savedFolder !== "all") {
        setSelectedFolderId(savedFolder);
      }
      const savedSort = localStorage.getItem("kotobase_sort_order") as any;
      if (savedSort && ["created_asc", "created_desc", "alphabetical"].includes(savedSort)) {
        setSortOrder(savedSort);
      }
    } catch (e) {}
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    fetchData();
  }, [selectedFolderId, mounted]); // ĐÃ BỎ debouncedSearchQuery khỏi đây!

  // Client-side Filtering & Sorting cực nhanh và 0 tốn read của Firebase
  const filteredVocabularies = React.useMemo(() => {
    let result = vocabularies;
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.trim().toLowerCase();
      result = result.filter(v => 
        (v.word && v.word.toLowerCase().includes(q)) ||
        (v.meaning && v.meaning.toLowerCase().includes(q)) ||
        (v.reading && v.reading.toLowerCase().includes(q)) ||
        (v.sinoVietnamese && v.sinoVietnamese.toLowerCase().includes(q))
      );
    }

    const sorted = [...result];
    if (sortOrder === "created_asc") {
      sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateA - dateB;
      });
    } else if (sortOrder === "created_desc") {
      sorted.sort((a, b) => {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        return dateB - dateA;
      });
    } else if (sortOrder === "alphabetical") {
      sorted.sort((a, b) => {
        const textA = (a.reading || a.word || "").toLowerCase();
        const textB = (b.reading || b.word || "").toLowerCase();
        return textA.localeCompare(textB);
      });
    }

    return sorted;
  }, [vocabularies, debouncedSearchQuery, sortOrder]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    
    // Optimistic Update
    const optimisticId = `temp-${Date.now()}`;
    const newFolder = { 
      id: optimisticId, 
      name: newFolderName.trim(), 
      parentId: newFolderParentId || null, 
      ownerId: currentUser?.uid || null,
      ownerEmail: currentUser?.email || null,
      ownerName: currentUser?.name || null,
      _count: { folderVocabularies: 0 } 
    };
    setFolders(prev => [...prev, newFolder]);
    
    const submittedName = newFolderName.trim();
    const submittedParentId = newFolderParentId;
    
    setNewFolderName("");
    setNewFolderParentId("");
    setShowFolderModal(false);

    const res = await createFolder(submittedName, submittedParentId || undefined);
    
    if (res.success) {
      fetchData(true);
    } else {
      setFolders(prev => prev.filter(f => f.id !== optimisticId));
      toast.error(res.error || "Không thể tạo thư mục!");
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center pb-20">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
        <p className="text-sm font-semibold text-slate-500 animate-pulse">Đang tải dữ liệu...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans antialiased pb-24 md:pb-0 flex flex-col transition-colors duration-300">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 shadow-elevation-sm bg-[oklch(var(--color-surface)/0.85)] backdrop-blur-xl transition-colors duration-300">
        <div className="max-w-screen-2xl mx-auto px-4 lg:px-6 py-3 md:h-16 flex flex-wrap items-center justify-between gap-3 md:gap-4">
          {/* Logo */}
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <AppLogo />
            <div>
              <h1 className="text-base md:text-lg font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                KotoBase <span className="hidden sm:inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">Japanese</span>
              </h1>
            </div>
          </div>

          {/* Desktop Search */}
          <div className="flex-1 max-w-xl hidden md:block px-8">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[oklch(var(--color-text-muted))] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm từ vựng, âm đọc, nghĩa..."
                className={cn(
                  "w-full pl-10 pr-4 py-2 rounded-xl text-xs",
                  "bg-[oklch(var(--color-surface-raised))]",
                  "text-[oklch(var(--color-text-primary))] placeholder:text-[oklch(var(--color-text-muted))]",
                  "border border-[oklch(var(--color-border))]",
                  "focus:outline-none focus:ring-2 focus:ring-[oklch(var(--ring))] focus:ring-offset-1 focus:border-transparent",
                  "transition-all duration-150"
                )}
              />
            </div>
          </div>
          
          {/* Settings & Theme & User */}
          <div className="flex items-center gap-1 md:gap-2 shrink-0">
            {/* User info hoặc login prompt */}
            {isGoogleUser ? (
              <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                {currentUser?.picture ? (
                  <img src={currentUser.picture} alt={currentUser.name} className="w-6 h-6 rounded-full" />
                ) : (
                  <User className="w-4 h-4 text-slate-500" />
                )}
                <span className="hidden sm:block text-xs font-semibold text-slate-700 dark:text-slate-300 max-w-[120px] truncate">
                  {currentUser?.name || currentUser?.email}
                </span>
              </div>
            ) : (
              <button
                onClick={async () => {
                  try {
                    const provider = new GoogleAuthProvider();
                    const result = await signInWithPopup(auth, provider);
                    const idToken = await result.user.getIdToken();
                    const res = await loginWithGoogle(idToken);
                    if (res.success) {
                      toast.success('Đăng nhập thành công!');
                      setTimeout(() => window.location.reload(), 1000);
                    } else {
                      toast.error(res.error || 'Đăng nhập Google thất bại');
                    }
                  } catch (error: any) {
                    console.error(error);
                    if (error.code !== "auth/popup-closed-by-user") {
                      toast.error('Lỗi đăng nhập Google: ' + error.message);
                    }
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors cursor-pointer"
                title="Đăng nhập Google để quản lý thư mục cá nhân"
              >
                <Lock className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Nút Tải App Mobile */}
            <Link
              href="/download"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200 dark:border-indigo-500/20 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all shrink-0"
              title="Tải ứng dụng cho điện thoại Android (.APK) & iOS (.IPA / PWA)"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Tải App</span>
            </Link>

            <button 
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl transition-colors text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-900"
              title="Đổi giao diện Sáng/Tối"
            >
              {mounted && theme === "dark" ? <Sun className="w-4 h-4 md:w-5 md:h-5" /> : <Moon className="w-4 h-4 md:w-5 md:h-5" />}
            </button>
            <div className="relative">
              <button 
                onClick={() => setShowSettingsDropdown(!showSettingsDropdown)}
                className={`p-2 rounded-xl transition-colors ${showSettingsDropdown ? 'bg-slate-100 dark:bg-slate-800 text-amber-500 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-900'}`}
                title="Cài đặt hệ thống"
              >
                <Settings2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
              
              {showSettingsDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowSettingsDropdown(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden animate-fadeIn">
                    <button 
                      onClick={() => {
                        setShowSettingsDropdown(false);
                        setShowSettingsModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border-b border-slate-100 dark:border-slate-800"
                    >
                      <BrainCircuit className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                      Cài đặt Anki
                    </button>
                    <button 
                      onClick={() => {
                        setShowSettingsDropdown(false);
                        setShowTTSSettingsModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border-b border-slate-100 dark:border-slate-800"
                    >
                      <Volume2 className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                      Cài đặt Phát âm
                    </button>
                    <button 
                      onClick={() => {
                        setShowSettingsDropdown(false);
                        setShowGeminiSettingsModal(true);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors text-left border-b border-slate-100 dark:border-slate-800"
                    >
                      <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      Cài đặt Gemini AI
                    </button>
                    {isGoogleUser && (
                      <button 
                        onClick={async () => {
                          setShowSettingsDropdown(false);
                          const toastId = toast.loading("Đang đăng xuất...");
                          try {
                            // Xóa Firebase IndexedDB token ở phía Client
                            const { auth } = await import('@/lib/firebase');
                            await auth.signOut();
                            toast.dismiss(toastId);
                            // API Route sẽ xóa cookie httpOnly và redirect trong 1 Response
                            window.location.href = '/api/auth/logout-google';
                          } catch (e) {
                            toast.dismiss(toastId);
                            toast.error("Đăng xuất thất bại, thử lại!");
                          }
                        }}
                        className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition-colors text-left border-b border-slate-100 dark:border-slate-800"
                      >
                        <LogOut className="w-4 h-4 text-amber-500" /> Đăng xuất Google
                      </button>
                    )}
                    <button 
                      onClick={async () => {
                        setShowSettingsDropdown(false);
                        const toastId = toast.loading("Đang khoá & đăng xuất...");
                        try {
                          const { auth } = await import('@/lib/firebase');
                          await auth.signOut();
                          toast.dismiss(toastId);
                          window.location.href = '/api/auth/logout-app';
                        } catch (e) {
                          toast.dismiss(toastId);
                          toast.error("Đăng xuất thất bại, thử lại!");
                        }
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors text-left"
                    >
                      <Lock className="w-4 h-4 text-rose-500" /> Khoá & Đăng xuất Web
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          
          {/* Mobile Search */}
          <div className="w-full md:hidden order-last mt-1">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-[oklch(var(--color-text-muted))] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm..."
                className={cn(
                  "w-full pl-10 pr-4 py-2 rounded-xl text-xs",
                  "bg-[oklch(var(--color-surface-raised))]",
                  "text-[oklch(var(--color-text-primary))] placeholder:text-[oklch(var(--color-text-muted))]",
                  "border border-[oklch(var(--color-border))]",
                  "focus:outline-none focus:ring-2 focus:ring-[oklch(var(--ring))] focus:ring-offset-1 focus:border-transparent",
                  "transition-all duration-150"
                )}
              />
            </div>
          </div>
        </div>
      </header>

      {/* Main Layout (2 Columns) */}
      <main className="flex-1 max-w-screen-2xl w-full mx-auto px-4 lg:px-6 pt-6 pb-28 md:pb-10 flex flex-col md:flex-row gap-6">
        
        {/* LEFT SIDEBAR: Folder Tree */}
        <div className="w-full md:w-64 lg:w-72 shrink-0 space-y-4 md:sticky md:top-20 md:self-start">
          <div className="bg-[oklch(var(--color-surface))] rounded-2xl p-4 shadow-elevation-md transition-colors duration-300 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-4 pb-3">
              <h2 
                className="text-sm font-bold text-[oklch(var(--color-text-primary))] flex items-center justify-between w-full md:w-auto cursor-pointer md:cursor-default"
                onClick={() => setIsMobileFolderOpen(!isMobileFolderOpen)}
              >
                <span>Quản lý Thư mục</span>
                <span className="md:hidden p-1 bg-slate-100 dark:bg-slate-800 rounded-md ml-2">
                  {isMobileFolderOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </span>
              </h2>
              {/* Nút tạo thư mục - chỉ hiển thị khi đã đăng nhập Google */}
              {isGoogleUser && (
                <button
                  onClick={() => {
                    setNewFolderParentId(selectedFolderId !== "all" ? selectedFolderId : "");
                    setShowFolderModal(true);
                  }}
                  title="Tạo thư mục mới"
                  className="p-1.5 rounded-lg bg-indigo-100 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-200 dark:hover:bg-indigo-500/20 transition-colors shrink-0"
                >
                  <FolderPlus className="w-4 h-4" />
                </button>
              )}
            </div>
            
            <div className={`${isMobileFolderOpen ? 'block' : 'hidden'} md:block`}>
              <FolderTree 
                folders={folders} 
                selectedFolderId={selectedFolderId} 
                onSelectFolder={handleSelectFolder}
                onRefresh={() => fetchData(true)}
                currentUserId={currentUser?.uid || null}
                currentUserEmail={currentUser?.email || null}
              />
            </div>

            {/* Các công cụ khác (Kanji, Mẫu câu) */}
            <div className="mt-4 pt-3 flex flex-col gap-1.5 border-t border-slate-100 dark:border-slate-800">
              <Link 
                href="/sentences"
                className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-500/20 transition-all"
              >
                <Library className="w-4 h-4 shrink-0" />
                <span className="flex-1">Mẫu câu giao tiếp</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </Link>
              
              <Link 
                href="/kanji"
                className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 border border-transparent hover:border-rose-200 dark:hover:border-rose-500/20 transition-all"
              >
                <Library className="w-4 h-4 shrink-0" />
                <span className="flex-1">Tra cứu Hán tự (Kanji)</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </Link>
              
              <Link 
                href="/grammar"
                className="flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-500/10 border border-transparent hover:border-violet-200 dark:hover:border-violet-500/20 transition-all"
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span className="flex-1">Ngữ Pháp</span>
                <ChevronRight className="w-3.5 h-3.5 opacity-50" />
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT MAIN CONTENT */}
        <div className="flex-1 flex flex-col gap-6 min-w-0">
          
          {/* Action Tabs: Quick Add & Bulk Import - Chỉ hiện khi đăng nhập Google */}
          {isGoogleUser ? (
            <>
              <div className="flex items-center gap-2 mb-2">
                <button
                  onClick={() => setShowBulkImport(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${!showBulkImport ? 'bg-slate-800 dark:bg-slate-800 text-white shadow-md' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-900'}`}
                >
                  Thêm Nhanh (Quick Add)
                </button>
                <button
                  onClick={() => setShowBulkImport(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${showBulkImport ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20' : 'text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-900'}`}
                >
                  Thêm Hàng Loạt (Bulk AI)
                </button>
              </div>

              {showBulkImport ? (
                <BulkImport 
                  folders={folders} 
                  currentFolderId={selectedFolderId} 
                  onSuccess={() => fetchData(true)} 
                  onOpenGeminiSettings={() => setShowGeminiSettingsModal(true)}
                />
              ) : (
                <QuickAddForm folders={folders} currentFolderId={selectedFolderId} onSuccess={() => fetchData(true)} />
              )}
            </>
          ) : null}

          {/* Breadcrumbs & Bộ chọn sắp xếp linh hoạt */}
          <div className="flex flex-wrap items-center justify-between gap-3 px-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đang chọn:</span>
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800/50 rounded-lg text-sm font-bold text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/50">
                <Folder className="w-4 h-4 text-amber-500" />
                {selectedFolderId === 'all' ? (
                  <span>Tất cả từ vựng</span>
                ) : (
                  <span>{getFolderFullPath(folders.find(f => f.id === selectedFolderId) || { name: 'Thư mục không xác định' }, folders)}</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {selectedFolderId !== 'all' && folders.find(f => f.id === selectedFolderId)?.ownerEmail && (
                <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 rounded-full">
                  <User className="w-3 h-3" />
                  <span>Chủ sở hữu: {folders.find(f => f.id === selectedFolderId)?.ownerEmail}</span>
                </div>
              )}

              {/* Nút Tải Học Offline & Quản lý kho */}
              <OfflineSyncButton
                currentFolderId={selectedFolderId}
                currentFolderName={
                  selectedFolderId === 'all' 
                    ? 'Tất cả từ vựng' 
                    : folders.find(f => f.id === selectedFolderId)?.name || 'Thư mục'
                }
                currentVocabs={filteredVocabularies}
                folders={folders}
                isOnline={isOnline}
                onOfflineDataChanged={() => fetchData(true)}
                onNavigateToFolder={(folderId) => {
                  handleSelectFolder(folderId);
                }}
              />

              {/* Sort Order Selector */}
              <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl border border-slate-200 dark:border-slate-700/60 text-xs">
                <button
                  onClick={() => handleSortChange("created_asc")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                    sortOrder === "created_asc"
                      ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                  title="Hiển thị theo đúng thứ tự thêm vào (Bài học từ trên xuống dưới)"
                >
                  <ArrowDownNarrowWide className="w-3.5 h-3.5" />
                  <span>Thứ tự thêm</span>
                </button>

                <button
                  onClick={() => handleSortChange("created_desc")}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-bold transition-all ${
                    sortOrder === "created_desc"
                      ? "bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-400 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                  title="Từ mới nhất lên đầu"
                >
                  <ArrowUpNarrowWide className="w-3.5 h-3.5" />
                  <span>Mới nhất</span>
                </button>
              </div>
            </div>
          </div>

          {/* Thông báo trạng thái Offline nếu mất mạng */}
          {(!isOnline || isOfflineMode) && (
            <div className="p-3 px-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300 text-xs flex flex-wrap items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>
                  <strong>Chế độ Ngoại tuyến (Offline):</strong> Đang sử dụng dữ liệu được lưu trực tiếp trên bộ nhớ thiết bị. Flashcard và Quiz vẫn hoạt động 100%!
                </span>
              </div>
              <button
                onClick={() => fetchData(true)}
                className="px-3 py-1 rounded-xl bg-amber-600 text-white font-bold text-[11px] hover:bg-amber-700 transition-colors shrink-0"
              >
                Thử kết nối lại
              </button>
            </div>
          )}

          {/* View Modes — Animated Tab Indicator (Framer Motion layoutId) */}
          {(() => {
            const tabs = [
              { id: "overview",  icon: <LayoutGrid className="w-3.5 h-3.5" />,   label: "Tổng quan",        color: "text-amber-500" },
              { id: "focus",     icon: <Eye className="w-3.5 h-3.5" />,          label: "Ôn tập (Focus)",   color: "text-indigo-500" },
              { id: "flashcard", icon: <Layers className="w-3.5 h-3.5" />,       label: "Flashcard",        color: "text-emerald-500" },
              { id: "quiz",      icon: <BrainCircuit className="w-3.5 h-3.5" />, label: "Quiz",             color: "text-purple-500" },
            ] as const;

            return (
              <div className="bg-[oklch(var(--color-surface))] p-3 rounded-2xl shadow-elevation-sm w-full overflow-x-auto scrollbar-hide transition-colors duration-300">
                <div className="flex items-center w-max bg-[oklch(var(--color-surface-raised))] p-1 rounded-xl gap-0.5">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setViewMode(tab.id as typeof viewMode)}
                      className={cn(
                        "relative flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors duration-150",
                        viewMode === tab.id
                          ? "text-[oklch(var(--color-text-primary))]"
                          : "text-[oklch(var(--color-text-muted))] hover:text-[oklch(var(--color-text-primary))]"
                      )}
                    >
                      {/* Animated background indicator */}
                      {viewMode === tab.id && (
                        <motion.div
                          layoutId="active-tab-indicator"
                          className="absolute inset-0 bg-[oklch(var(--color-surface))] rounded-lg shadow-elevation-sm"
                          style={{ zIndex: -1 }}
                          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
                        />
                      )}
                      <span className={cn("relative z-10 transition-colors", viewMode === tab.id && tab.color)}>
                        {tab.icon}
                      </span>
                      <span className="relative z-10 whitespace-nowrap">
                        {tab.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Mode Description Banner */}
          <div className="bg-[oklch(var(--color-surface)/0.6)] shadow-elevation-sm p-3.5 px-4 rounded-2xl flex items-start gap-3.5 transition-colors">
            <div className="p-2 rounded-xl bg-[oklch(var(--color-surface-raised))] shadow-elevation-sm shrink-0">
              {viewMode === "overview" && <LayoutGrid className="w-4 h-4 text-amber-500" />}
              {viewMode === "focus" && <Eye className="w-4 h-4 text-indigo-500" />}
              {viewMode === "flashcard" && <Layers className="w-4 h-4 text-emerald-500" />}
              {viewMode === "quiz" && <BrainCircuit className="w-4 h-4 text-purple-500" />}
            </div>
            <div className="space-y-0.5">
              <div className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                {viewMode === "overview" && "Mode 1: Quản lý & Danh sách Tổng quan"}
                {viewMode === "focus" && "Mode 2: Ôn tập che đáp án (Active Recall)"}
                {viewMode === "flashcard" && "Mode 3: Flashcard lặp lại ngắt quãng (SRS Anki)"}
                {viewMode === "quiz" && "Mode 4: Kiểm tra gõ phím (Typing Quiz)"}
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                {viewMode === "overview" && "Xem toàn bộ từ vựng dưới dạng bảng. Bấm vào bất kỳ dòng nào để chỉnh sửa, hoặc kéo thả vào thư mục bên trái để phân loại."}
                {viewMode === "focus" && "Luyện nhớ nhanh bằng cách che bớt nghĩa và cách đọc. Bấm vào từng thẻ để lật mở đáp án."}
                {viewMode === "flashcard" && "Luyện tập theo phương pháp lặp lại ngắt quãng (Spaced Repetition). Lật thẻ kiểm tra và chọn mức độ nhớ."}
                {viewMode === "quiz" && "Thử thách phản xạ bằng cách gõ trực tiếp đáp án tiếng Nhật. Hỗ trợ 2 dạng câu hỏi."}
              </p>
            </div>
          </div>

          <div className="pb-24 md:pb-10">
            {quotaExceeded ? (
              <div className="p-8 my-8 text-center bg-rose-50 dark:bg-rose-900/10 rounded-2xl border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-400">
                <BrainCircuit className="w-12 h-12 mx-auto mb-4 text-rose-500 opacity-80" />
                <h3 className="text-xl font-bold mb-2">Đã hết hạn mức Firebase (Quota Exceeded)</h3>
                <p className="text-sm font-medium opacity-90 max-w-lg mx-auto leading-relaxed">
                  Ứng dụng đang dùng gói Firebase miễn phí và dự án của bạn đã sử dụng hết 50.000 lượt đọc trong hôm nay. 
                  <br /><br />
                  Vui lòng chờ đến <strong>14:00 (2h chiều) theo giờ Việt Nam</strong> để hạn mức được thiết lập lại về 0, hoặc nâng cấp gói Firebase của bạn để sử dụng tiếp.
                </p>
              </div>
            ) : loading ? (
              <div className="py-6 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div
                      key={i}
                      className="h-28 rounded-xl animate-shimmer"
                      style={{ animationDelay: `${i * 50}ms` }}
                    />
                  ))}
                </div>
              </div>
            ) : viewMode === "overview" ? (
              <OverviewView 
                vocabularies={filteredVocabularies} 
                folders={folders} 
                onRefresh={() => fetchData(true)} 
                selectedVocabIds={selectedVocabIds}
                onSelectionChange={setSelectedVocabIds}
                onNavigateToStudyMode={(mode, ids) => {
                  if (ids) setSelectedVocabIds(ids);
                  setViewMode(mode);
                }}
              />
            ) : viewMode === "focus" ? (
              <FocusRecallView 
                vocabularies={filteredVocabularies} 
                onRefresh={fetchData}
                selectedVocabIds={selectedVocabIds}
              />
            ) : viewMode === "quiz" ? (
              <TypingQuizView 
                vocabularies={filteredVocabularies}
                selectedVocabIds={selectedVocabIds}
              />
            ) : (
              <FlashcardView 
                vocabularies={filteredVocabularies}
                selectedVocabIds={selectedVocabIds}
              />
            )}

            {/* Tra cứu Từ điển Jisho mở rộng khi người dùng đang tìm kiếm */}
            {searchQuery && searchQuery.trim() && (
              <JishoSearchResults 
                searchQuery={searchQuery} 
                currentFolderId={selectedFolderId} 
                onAddedSuccess={fetchData} 
              />
            )}
          </div>
        </div>
      </main>

      {/* Modal Tạo Thư Mục */}
      {showFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-transparent animate-fadeIn">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-indigo-500 dark:text-indigo-400" /> Tạo Thư mục mới
            </h3>
            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Tên thư mục</label>
                <input
                  type="text"
                  required
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="VD: N3 Kanji, Bài 1 Minna..."
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Thuộc thư mục cha (Optional)</label>
                <select
                  value={newFolderParentId}
                  onChange={(e) => setNewFolderParentId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 text-sm text-slate-800 dark:text-slate-100 outline-none"
                >
                  <option value="">-- Không có (Root) --</option>
                  {/* Chỉ hiển thị folder của mình */}
                  {folders.filter(f => !f.ownerId || f.ownerId === currentUser?.uid).map((f) => (
                    <option key={f.id} value={f.id}>{getFolderFullPath(f, folders)}</option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowFolderModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
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

      {/* Modal Cài đặt Anki */}
      {showSettingsModal && (
        <AnkiSettingsModal onClose={() => setShowSettingsModal(false)} />
      )}

      {/* Modal Cài đặt Phát âm (TTS) */}
      {showTTSSettingsModal && (
        <TTSSettingsModal onClose={() => setShowTTSSettingsModal(false)} />
      )}

      {/* Modal Cài đặt Gemini AI */}
      {showGeminiSettingsModal && (
        <GeminiSettingsModal onClose={() => setShowGeminiSettingsModal(false)} />
      )}

      {/* 🚀 MOBILE ONLY: Nút nổi Floating Button chuyển nhanh Thư mục */}
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px)+14px)] right-4 z-[45] md:hidden animate-fadeIn">
        <button
          onClick={() => setShowMobileFolderDrawer(true)}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-600 dark:to-amber-700 text-white shadow-xl shadow-amber-500/30 border border-amber-400/30 active:scale-95 transition-all"
          title="Chuyển nhanh thư mục"
        >
          <Folder className="w-4 h-4 text-white shrink-0" />
          <span className="text-xs font-black max-w-[120px] truncate">
            {selectedFolderId === 'all' 
              ? 'Tất cả từ vựng' 
              : (folders.find(f => f.id === selectedFolderId)?.name || 'Thư mục')}
          </span>
          <ChevronUp className="w-3.5 h-3.5 opacity-80 shrink-0" />
        </button>
      </div>

      {/* 🚀 MOBILE ONLY: Bottom Sheet Drawer Cây Thư Mục */}
      {showMobileFolderDrawer && (
        <div className="fixed inset-0 z-[70] md:hidden flex flex-col justify-end">
          {/* Backdrop mờ tối */}
          <div 
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity animate-fadeIn" 
            onClick={() => setShowMobileFolderDrawer(false)}
          />
          
          {/* Drawer Panel trượt từ dưới lên */}
          <div className="relative z-10 w-full max-h-[85vh] bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-slideUp">
            {/* Handle bar vuốt kéo */}
            <div 
              className="w-full pt-3 pb-1 flex justify-center cursor-pointer" 
              onClick={() => setShowMobileFolderDrawer(false)}
            >
              <div className="w-12 h-1.5 bg-slate-300 dark:bg-slate-700 rounded-full" />
            </div>

            {/* Header Drawer */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Folder className="w-5 h-5 text-amber-500" />
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">
                  Chuyển nhanh Thư mục
                </h3>
              </div>
              
              <div className="flex items-center gap-2">
                {isGoogleUser && (
                  <button
                    onClick={() => {
                      setShowMobileFolderDrawer(false);
                      setNewFolderParentId(selectedFolderId !== "all" ? selectedFolderId : "");
                      setShowFolderModal(true);
                    }}
                    className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-lg border border-indigo-200 dark:border-indigo-500/20"
                  >
                    <FolderPlus className="w-3.5 h-3.5" /> Tạo mới
                  </button>
                )}
                <button
                  onClick={() => setShowMobileFolderDrawer(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Body: Cây thư mục đầy đủ */}
            <div className="p-4 overflow-y-auto flex-1 custom-scrollbar max-h-[60vh]">
              <FolderTree 
                folders={folders} 
                selectedFolderId={selectedFolderId} 
                onSelectFolder={(id) => {
                  handleSelectFolder(id);
                  setShowMobileFolderDrawer(false);
                }}
                onRefresh={() => fetchData(true)}
                currentUserId={currentUser?.uid || null}
                currentUserEmail={currentUser?.email || null}
              />
            </div>

            {/* Footer Drawer: Link sang Tra cứu Hán tự */}
            <div className="p-3.5 px-5 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <Link 
                href="/kanji"
                onClick={() => setShowMobileFolderDrawer(false)}
                className="flex items-center gap-2 text-xs font-bold text-rose-600 dark:text-rose-400 hover:underline"
              >
                <Library className="w-4 h-4" />
                <span>Tra cứu Hán tự (Kanji)</span>
              </Link>
              <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                {folders.length} thư mục
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
