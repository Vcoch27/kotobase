'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  FileText,
  BookOpen,
  Sparkles,
  Layers,
  Folder,
  ExternalLink,
  Settings,
  Maximize2,
  Minimize2,
  ArrowLeft,
  Share2,
  HelpCircle,
  Check,
  RefreshCw,
  FolderOpen,
} from 'lucide-react';
import { cn } from '@/lib/cn';
import toast from 'react-hot-toast';

interface UserInfo {
  uid: string;
  email: string;
  name: string;
  picture?: string;
}

interface DocumentViewerProps {
  currentUser?: UserInfo | null;
}

export interface DocumentItem {
  key: string;
  title: string;
  subTitle: string;
  fileName: string;
  category: 'kanji' | 'goi' | 'bunpou' | 'folder';
  badge: string;
  badgeColor: string;
  icon: React.ElementType;
  description: string;
  fileId?: string;
}

const DEFAULT_FOLDER_ID = '1VtGLRU3rkKhGJZTzKYlZLiRiUkgQnJQi';

// Hàm trích xuất File ID từ link Google Drive bất kỳ
export function extractDriveFileId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  
  // Link dạng: https://drive.google.com/file/d/FILE_ID/view...
  const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileDMatch && fileDMatch[1]) return fileDMatch[1];

  // Link dạng: https://drive.google.com/open?id=FILE_ID hoặc id=FILE_ID
  const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idParamMatch && idParamMatch[1]) return idParamMatch[1];

  // Link dạng folder: https://drive.google.com/drive/folders/FOLDER_ID
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch && folderMatch[1]) return folderMatch[1];

  // Nếu người dùng dán trực tiếp chuỗi ID (khoảng 25-45 ký tự)
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

const STORAGE_KEY = 'kotobase_drive_doc_ids_v1';

export function DocumentViewer({ currentUser }: DocumentViewerProps) {
  const [docIds, setDocIds] = useState<{ [key: string]: string }>({
    kanji: '',
    goi: '',
    bunpou: '',
    folder: DEFAULT_FOLDER_ID,
  });

  const [activeTab, setActiveTab] = useState<string>('kanji');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showConfigModal, setShowConfigModal] = useState<boolean>(false);

  // Load cấu hình từ localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setDocIds((prev) => ({
          ...prev,
          ...parsed,
          folder: parsed.folder || DEFAULT_FOLDER_ID,
        }));
      }
    } catch (e) {
      console.error('Failed to parse saved doc ids', e);
    }
  }, []);

  // Form input tạm cho Modal cấu hình
  const [inputKanji, setInputKanji] = useState('');
  const [inputGoi, setInputGoi] = useState('');
  const [inputBunpou, setInputBunpou] = useState('');
  const [inputFolder, setInputFolder] = useState('');

  const handleOpenConfig = () => {
    setInputKanji(docIds.kanji || '');
    setInputGoi(docIds.goi || '');
    setInputBunpou(docIds.bunpou || '');
    setInputFolder(docIds.folder || DEFAULT_FOLDER_ID);
    setShowConfigModal(true);
  };

  const handleSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const newDocIds = {
      kanji: extractDriveFileId(inputKanji),
      goi: extractDriveFileId(inputGoi),
      bunpou: extractDriveFileId(inputBunpou),
      folder: extractDriveFileId(inputFolder) || DEFAULT_FOLDER_ID,
    };

    setDocIds(newDocIds);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newDocIds));
      toast.success('Đã lưu cấu hình liên kết tài liệu thành công!');
    } catch (e) {
      toast.error('Lỗi khi lưu cấu hình.');
    }
    setShowConfigModal(false);
  };

  const documents: DocumentItem[] = [
    {
      key: 'kanji',
      title: 'Soumatome N3 Hán tự',
      subTitle: 'N3 Kanji',
      fileName: '[VTI Mirai Share] 141 - Soumatome N3 Kanji.pdf',
      category: 'kanji',
      badge: 'Hán tự',
      badgeColor: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-500/20 dark:text-rose-300 dark:border-rose-500/30',
      icon: Sparkles,
      description: 'Giáo trình học chữ Hán N3 theo chủ đề, mẹo ghi nhớ và bài tập ứng dụng',
      fileId: docIds.kanji,
    },
    {
      key: 'goi',
      title: 'Mimi Kara Oboeru N3 Từ vựng',
      subTitle: 'N3 Goi',
      fileName: 'Mimi_Kara_Oboeru_N3-Goi.pdf',
      category: 'goi',
      badge: 'Từ vựng',
      badgeColor: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30',
      icon: BookOpen,
      description: 'Bộ sách từ vựng kinh điển kèm câu ví dụ thực tế và ngữ cảnh cụ thể',
      fileId: docIds.goi,
    },
    {
      key: 'bunpou',
      title: 'Shin Kanzen Master N3 Ngữ pháp',
      subTitle: 'N3 Bunpou',
      fileName: 'Shin_Kanzen_Master_N3-Bunpou.pdf',
      category: 'bunpou',
      badge: 'Ngữ pháp',
      badgeColor: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-500/20 dark:text-violet-300 dark:border-violet-500/30',
      icon: Layers,
      description: 'Phân tích ngữ pháp chi tiết, phân biệt cấu trúc tương đồng và luyện thi JLPT',
      fileId: docIds.bunpou,
    },
    {
      key: 'folder',
      title: 'Thư mục Google Drive',
      subTitle: 'Tất cả tài liệu',
      fileName: 'Thư mục Google Drive gốc',
      category: 'folder',
      badge: 'Toàn bộ',
      badgeColor: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30',
      icon: FolderOpen,
      description: 'Xem toàn bộ danh sách 3 sách PDF cùng bảng theo dõi học tập',
      fileId: docIds.folder || DEFAULT_FOLDER_ID,
    },
  ];

  const currentDoc = documents.find((d) => d.key === activeTab) || documents[0];

  // URL iframe nhúng
  const getEmbedUrl = (doc: DocumentItem): string => {
    if (doc.category === 'folder') {
      const folderId = doc.fileId || DEFAULT_FOLDER_ID;
      return `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
    }
    if (doc.fileId) {
      return `https://drive.google.com/file/d/${doc.fileId}/preview`;
    }
    return '';
  };

  const getDirectDriveUrl = (doc: DocumentItem): string => {
    if (doc.category === 'folder') {
      const folderId = doc.fileId || DEFAULT_FOLDER_ID;
      return `https://drive.google.com/drive/folders/${folderId}`;
    }
    if (doc.fileId) {
      return `https://drive.google.com/file/d/${doc.fileId}/view`;
    }
    return `https://drive.google.com/drive/folders/${DEFAULT_FOLDER_ID}`;
  };

  const embedUrl = getEmbedUrl(currentDoc);

  return (
    <div className={cn(
      "min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300",
      isFullscreen && "fixed inset-0 z-[100] h-screen w-screen overflow-hidden p-0"
    )}>
      {/* 1. HEADER CHÍNH */}
      <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-slate-800 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <Link
            href="/"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition-all shrink-0"
            title="Trở về Trang chủ KotoBase"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Từ vựng</span>
          </Link>

          <div className="flex items-center gap-2 min-w-0">
            <span className="p-1.5 rounded-xl bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 shrink-0">
              <FileText className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-black truncate text-slate-900 dark:text-white flex items-center gap-2">
                <span>Tài liệu & Giáo trình N3</span>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50 hidden md:inline-block">
                  Google Drive Viewer
                </span>
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate hidden sm:block">
                {currentDoc.fileName}
              </p>
            </div>
          </div>
        </div>

        {/* Nút hành động trên Header */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenConfig}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-700 shadow-xs transition-all"
            title="Cài đặt File ID hoặc dán liên kết Google Drive"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
            <span className="hidden md:inline">Cài đặt liên kết</span>
          </button>

          <a
            href={getDirectDriveUrl(currentDoc)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-500/20 shadow-xs transition-all"
            title="Mở file trên tab Google Drive mới"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Drive gốc</span>
          </a>

          <button
            type="button"
            onClick={() => setIsFullscreen((prev) => !prev)}
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 text-xs font-bold shadow-xs hover:opacity-90 active:scale-95 transition-all flex items-center gap-1.5"
            title={isFullscreen ? 'Thu nhỏ khung xem' : 'Xem toàn màn hình'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Thu nhỏ</span>
              </>
            ) : (
              <>
                <Maximize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Toàn màn hình</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. THANH CHỌN TÀI LIỆU (TABS) */}
      {!isFullscreen && (
        <div className="bg-white dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-2">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1">
            {documents.map((doc) => {
              const Icon = doc.icon;
              const isActive = activeTab === doc.key;
              const isConfigured = !!doc.fileId;

              return (
                <button
                  key={doc.key}
                  type="button"
                  onClick={() => setActiveTab(doc.key)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 border",
                    isActive
                      ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-md shadow-slate-900/10 dark:shadow-white/5 scale-[1.02]"
                      : "bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-amber-400 dark:text-amber-600" : "text-slate-400")} />
                  <span className="whitespace-nowrap">{doc.title}</span>
                  <span
                    className={cn(
                      "text-[10px] font-extrabold px-1.5 py-0.2 rounded-md border",
                      isActive
                        ? "bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900 border-white/30 dark:border-slate-900/30"
                        : doc.badgeColor
                    )}
                  >
                    {doc.badge}
                  </span>
                  {!isConfigured && doc.category !== 'folder' && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" title="Chưa nhập File ID" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. VÙNG KHUNG XEM TÀI LIỆU (VIEWER BODY) */}
      <main className="flex-1 flex flex-col p-2 sm:p-4 min-h-0 bg-slate-100/70 dark:bg-slate-950">
        <div className="flex-1 w-full flex flex-col rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-elevation-md relative min-h-[550px]">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              className="w-full flex-1 h-full min-h-[550px] border-0"
              title={currentDoc.title}
              allow="autoplay; fullscreen"
            />
          ) : (
            /* Khi chưa có File ID riêng cho sách này */
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                <FileText className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                  Chưa cài đặt liên kết cho file {currentDoc.title}
                </h3>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                  Bạn có thể bấm <strong>"Dán liên kết Drive"</strong> bên dưới để dán link chia sẻ của file <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-amber-600 font-mono text-xs">{currentDoc.fileName}</code>, hoặc chuyển sang tab <strong>"Thư mục Google Drive"</strong> để xem trực tiếp toàn bộ thư mục.
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={handleOpenConfig}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Settings className="w-4 h-4" />
                  <span>Dán liên kết Drive</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('folder')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs border border-slate-200 dark:border-slate-700 transition-all flex items-center gap-1.5"
                >
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  <span>Xem qua Thư mục Drive</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* 4. MODAL CÀI ĐẶT LIÊN KẾT (CONFIG MODAL) */}
      {showConfigModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slideUp">
            {/* Header Modal */}
            <div className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
                  <Settings className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-black text-slate-800 dark:text-slate-100">
                    Cài đặt liên kết tài liệu Drive
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Dán link chia sẻ hoặc ID file Google Drive của từng sách
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfigModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Form Fields */}
            <form onSubmit={handleSaveConfig} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-3 text-amber-800 dark:text-amber-300 flex items-start gap-2.5">
                <HelpCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Cách lấy link file từ Google Drive:</p>
                  <p className="text-[11px] leading-relaxed">
                    1. Mở thư mục trên Google Drive của bạn.<br />
                    2. Nhấp chuột phải vào từng file PDF ➔ Chọn <strong>"Chia sẻ"</strong> ➔ <strong>"Sao chép đường liên kết"</strong>.<br />
                    3. Đảm bảo quyền truy cập là <em>"Bất kỳ ai có đường liên kết đều có thể xem"</em> để nhúng xem mượt mà nhất.
                  </p>
                </div>
              </div>

              {/* 1. Kanji */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-500" />
                  <span>1. Soumatome N3 Kanji (Hán tự)</span>
                </label>
                <input
                  type="text"
                  value={inputKanji}
                  onChange={(e) => setInputKanji(e.target.value)}
                  placeholder="Dán link chia sẻ hoặc File ID của file Soumatome N3 Kanji"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 text-xs transition-colors"
                />
              </div>

              {/* 2. Goi */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5 text-emerald-500" />
                  <span>2. Mimi Kara Oboeru N3 Goi (Từ vựng)</span>
                </label>
                <input
                  type="text"
                  value={inputGoi}
                  onChange={(e) => setInputGoi(e.target.value)}
                  placeholder="Dán link chia sẻ hoặc File ID của file Mimi Kara Oboeru N3 Goi"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 text-xs transition-colors"
                />
              </div>

              {/* 3. Bunpou */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-violet-500" />
                  <span>3. Shin Kanzen Master N3 Bunpou (Ngữ pháp)</span>
                </label>
                <input
                  type="text"
                  value={inputBunpou}
                  onChange={(e) => setInputBunpou(e.target.value)}
                  placeholder="Dán link chia sẻ hoặc File ID của file Shin Kanzen Master N3 Bunpou"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 text-xs transition-colors"
                />
              </div>

              {/* 4. Folder */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 dark:text-slate-200 flex items-center gap-1.5">
                  <Folder className="w-3.5 h-3.5 text-amber-500" />
                  <span>4. ID Thư mục Google Drive (Mặc định)</span>
                </label>
                <input
                  type="text"
                  value={inputFolder}
                  onChange={(e) => setInputFolder(e.target.value)}
                  placeholder="ID Thư mục Drive"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-indigo-500 text-xs transition-colors"
                />
              </div>

              {/* Footer buttons */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold transition-all"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Lưu liên kết</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
