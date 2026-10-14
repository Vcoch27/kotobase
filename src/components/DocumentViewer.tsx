'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  FileText,
  BookOpen,
  Sparkles,
  Layers,
  ExternalLink,
  Maximize2,
  Minimize2,
  ArrowLeft,
  FolderOpen,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/cn';

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
  fileId: string;
}

const DEFAULT_DOC_IDS = {
  kanji: '1JXPagJU9zdut4rcYmd8Q4gXaFx7idmgT',
  goi: '18MFu40Ra5CjwJOcTPDq2poXbhFOtqvTe',
  bunpou: '1GRApZoSLo5KSoj1bSStxbPwyFhuzV9c9',
  folder: '1VtGLRU3rkKhGJZTzKYlZLiRiUkgQnJQi',
};

export function DocumentViewer({ currentUser }: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<string>('kanji');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
      fileId: DEFAULT_DOC_IDS.kanji,
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
      fileId: DEFAULT_DOC_IDS.goi,
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
      fileId: DEFAULT_DOC_IDS.bunpou,
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
      fileId: DEFAULT_DOC_IDS.folder,
    },
  ];

  const currentDoc = documents.find((d) => d.key === activeTab) || documents[0];

  // URL iframe nhúng
  const getEmbedUrl = (doc: DocumentItem): string => {
    if (doc.category === 'folder') {
      return `https://drive.google.com/embeddedfolderview?id=${doc.fileId}#grid`;
    }
    return `https://drive.google.com/file/d/${doc.fileId}/preview`;
  };

  const getDirectDriveUrl = (doc: DocumentItem): string => {
    if (doc.category === 'folder') {
      return `https://drive.google.com/drive/folders/${doc.fileId}`;
    }
    return `https://drive.google.com/file/d/${doc.fileId}/view?usp=sharing`;
  };

  const embedUrl = getEmbedUrl(currentDoc);

  const handleTabChange = (key: string) => {
    if (key !== activeTab) {
      setIsLoading(true);
      setActiveTab(key);
    }
  };

  return (
    <div className={cn(
      "min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300",
      isFullscreen && "fixed inset-0 z-[100] h-screen w-screen overflow-hidden p-0"
    )}>
      {/* 1. HEADER CHÍNH */}
      <header className="sticky top-0 z-30 bg-white/95 dark:bg-slate-900/95 border-b border-slate-200/80 dark:border-slate-800 backdrop-blur-md px-3 sm:px-6 py-2.5 flex items-center justify-between gap-3 shadow-xs">
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
                  Trực tuyến
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
          <a
            href={getDirectDriveUrl(currentDoc)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 dark:bg-blue-500/10 dark:hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 text-xs font-bold border border-blue-200 dark:border-blue-500/20 shadow-xs transition-all"
            title="Mở file trên tab Google Drive mới (tải về / in ấn)"
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

              return (
                <button
                  key={doc.key}
                  type="button"
                  onClick={() => handleTabChange(doc.key)}
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
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. VÙNG KHUNG XEM TÀI LIỆU (VIEWER BODY) */}
      <main className="flex-1 flex flex-col p-2 sm:p-4 min-h-0 bg-slate-100/70 dark:bg-slate-950">
        <div className={cn(
          "flex-1 w-full flex flex-col rounded-2xl overflow-hidden border border-slate-200/90 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-elevation-md relative",
          isFullscreen ? "h-[calc(100vh-56px)]" : "h-[78vh] md:h-[calc(100vh-140px)] min-h-[550px]"
        )}>
          {isLoading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-xs transition-opacity duration-300">
              <Loader2 className="w-8 h-8 text-indigo-600 dark:text-indigo-400 animate-spin mb-2" />
              <p className="text-xs font-bold text-slate-600 dark:text-slate-300">
                Đang tải {currentDoc.title}...
              </p>
            </div>
          )}

          <iframe
            key={embedUrl}
            src={embedUrl}
            onLoad={() => setIsLoading(false)}
            className="w-full flex-1 h-full border-0"
            title={currentDoc.title}
            allow="autoplay; fullscreen"
          />
        </div>
      </main>
    </div>
  );
}
