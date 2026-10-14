'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  BookOpen,
  FileText,
  Scroll,
  RotateCcw,
  Loader2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/cn';

interface CustomPdfViewerProps {
  url: string;
  title: string;
  fallbackDriveUrl?: string;
  onUseDriveViewer?: () => void;
}

type ViewMode = 'single' | 'double' | 'continuous';

export function CustomPdfViewer({
  url,
  title,
  fallbackDriveUrl,
  onUseDriveViewer,
}: CustomPdfViewerProps) {
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [viewMode, setViewMode] = useState<ViewMode>('single');
  const [scale, setScale] = useState<number>(1.0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [inputPage, setInputPage] = useState<string>('1');

  // Canvas refs
  const canvasRef1 = useRef<HTMLCanvasElement | null>(null);
  const canvasRef2 = useRef<HTMLCanvasElement | null>(null);
  const continuousContainerRef = useRef<HTMLDivElement | null>(null);

  // Active render task refs to allow cancellation on quick turns
  const renderTask1 = useRef<any>(null);
  const renderTask2 = useRef<any>(null);

  // Auto-select double page on large screens if user hasn't set
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1200) {
      setViewMode('double');
    }
  }, []);

  // 1. Tải tài liệu PDF qua PDF.js
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    async function loadPdf() {
      try {
        const pdfjsLib = await import('pdfjs-dist');
        if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
          pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version || '3.11.174'}/pdf.worker.min.js`;
        }

        const loadingTask = pdfjsLib.getDocument({
          url,
          rangeChunkSize: 65536,
          disableAutoFetch: true,
          cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/cmaps/',
          cMapPacked: true,
        });

        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setCurrentPage(1);
          setInputPage('1');
          setLoading(false);
        }
      } catch (err: any) {
        console.error('Lỗi khi tải PDF:', err);
        if (!isCancelled) {
          setError(err.message || 'Không thể tải tệp PDF');
          setLoading(false);
        }
      }
    }

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [url]);

  // 2. Render 1 trang lên canvas
  const renderPageToCanvas = useCallback(
    async (
      pageNumber: number,
      canvas: HTMLCanvasElement,
      renderTaskRef: React.MutableRefObject<any>,
      currentScale: number
    ) => {
      if (!pdfDoc || pageNumber < 1 || pageNumber > numPages) return;

      try {
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const page = await pdfDoc.getPage(pageNumber);
        const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        const viewport = page.getViewport({ scale: currentScale * pixelRatio });

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / pixelRatio}px`;
        canvas.style.height = `${viewport.height / pixelRatio}px`;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const renderContext = {
          canvasContext: ctx,
          viewport,
        };

        const task = page.render(renderContext);
        renderTaskRef.current = task;
        await task.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error(`Lỗi render trang ${pageNumber}:`, err);
        }
      }
    },
    [pdfDoc, numPages]
  );

  // 3. Render các trang khi thay đổi currentPage, scale hoặc viewMode
  useEffect(() => {
    if (!pdfDoc || loading || viewMode === 'continuous') return;

    if (canvasRef1.current) {
      renderPageToCanvas(currentPage, canvasRef1.current, renderTask1, scale);
    }

    if (viewMode === 'double') {
      const secondPageNum = currentPage + 1;
      if (secondPageNum <= numPages && canvasRef2.current) {
        renderPageToCanvas(secondPageNum, canvasRef2.current, renderTask2, scale);
      }
    }
  }, [pdfDoc, currentPage, viewMode, scale, loading, numPages, renderPageToCanvas]);

  // 4. Điều hướng trang
  const goToNext = () => {
    const step = viewMode === 'double' ? 2 : 1;
    if (currentPage + step <= numPages) {
      const next = currentPage + step;
      setCurrentPage(next);
      setInputPage(next.toString());
    } else if (currentPage < numPages) {
      setCurrentPage(numPages);
      setInputPage(numPages.toString());
    }
  };

  const goToPrev = () => {
    const step = viewMode === 'double' ? 2 : 1;
    if (currentPage - step >= 1) {
      const prev = currentPage - step;
      setCurrentPage(prev);
      setInputPage(prev.toString());
    } else if (currentPage > 1) {
      setCurrentPage(1);
      setInputPage('1');
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(inputPage, 10);
    if (!isNaN(p) && p >= 1 && p <= numPages) {
      setCurrentPage(p);
    } else {
      setInputPage(currentPage.toString());
    }
  };

  // Keyboard navigation: Left/Right arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        goToPrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-slate-900 text-slate-100 select-none overflow-hidden relative">
      {/* TOOLBAR ĐIỀU KHIỂN ĐỌC SÁCH */}
      <div className="bg-slate-950/90 border-b border-slate-800 px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5 z-20 backdrop-blur-md">
        {/* Nhóm 1: Chế độ hiển thị (1 Trang / 2 Trang / Cuộn dọc) */}
        <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setViewMode('single')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
              viewMode === 'single'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
            title="Chế độ 1 trang đơn"
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">1 Trang</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('double')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
              viewMode === 'double'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
            title="Chế độ 2 trang song song (như mở sách thật)"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2 Trang</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('continuous')}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all",
              viewMode === 'continuous'
                ? "bg-indigo-600 text-white shadow-xs"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            )}
            title="Chế độ cuộn trượt liên tục từ trên xuống"
          >
            <Scroll className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Cuộn dọc</span>
          </button>
        </div>

        {/* Nhóm 2: Điều hướng trang */}
        {viewMode !== 'continuous' && numPages > 0 && (
          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={goToPrev}
              disabled={currentPage <= 1}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Trang trước (Phím ←)"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1 px-1">
              <span>Trang</span>
              <input
                type="text"
                value={inputPage}
                onChange={(e) => setInputPage(e.target.value)}
                onBlur={() => setInputPage(currentPage.toString())}
                className="w-10 text-center py-0.5 rounded bg-slate-800 text-white font-bold border border-slate-700 text-xs focus:outline-none focus:border-indigo-500"
              />
              <span className="text-slate-400">
                {viewMode === 'double' && currentPage < numPages
                  ? `- ${currentPage + 1} / ${numPages}`
                  : `/ ${numPages}`}
              </span>
            </form>

            <button
              type="button"
              onClick={goToNext}
              disabled={viewMode === 'double' ? currentPage + 1 >= numPages : currentPage >= numPages}
              className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all"
              title="Trang sau (Phím →)"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Nhóm 3: Thu phóng & Chuyển đổi */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 bg-slate-900 px-1.5 py-1 rounded-xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setScale((s) => Math.max(0.6, Number((s - 0.15).toFixed(2))))}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>

            <span className="text-[11px] font-bold text-slate-300 px-1 min-w-[42px] text-center">
              {Math.round(scale * 100)}%
            </span>

            <button
              type="button"
              onClick={() => setScale((s) => Math.min(2.5, Number((s + 0.15).toFixed(2))))}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              title="Phóng to"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>

            <button
              type="button"
              onClick={() => setScale(1.0)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800"
              title="Về kích thước mặc định (100%)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {onUseDriveViewer && (
            <button
              type="button"
              onClick={onUseDriveViewer}
              className="px-2 py-1.5 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 hidden lg:inline-flex items-center gap-1"
              title="Chuyển về khung nhúng Google Drive gốc"
            >
              <ExternalLink className="w-3 h-3" />
              <span>Drive Viewer</span>
            </button>
          )}
        </div>
      </div>

      {/* VÙNG HIỂN THỊ TRANG SÁCH */}
      <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center justify-start bg-slate-950 relative scrollbar-thin scrollbar-thumb-slate-800">
        {loading && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3 my-auto">
            <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
            <p className="text-xs sm:text-sm font-bold text-slate-300">
              Đang mở {title}...
            </p>
            <p className="text-[11px] text-slate-500">
              Đang tải trang sách từ Google Drive
            </p>
          </div>
        )}

        {error && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 gap-3 max-w-md text-center my-auto">
            <AlertCircle className="w-10 h-10 text-rose-500" />
            <h4 className="text-sm font-bold text-white">Không thể tải trực tiếp file PDF</h4>
            <p className="text-xs text-slate-400">{error}</p>
            {onUseDriveViewer && (
              <button
                type="button"
                onClick={onUseDriveViewer}
                className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md transition-all"
              >
                Chuyển sang khung Google Drive
              </button>
            )}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* 1. CHẾ ĐỘ 1 TRANG (SINGLE PAGE) */}
            {viewMode === 'single' && (
              <div className="flex flex-col items-center justify-center min-h-full py-2">
                <div className="bg-white rounded-lg shadow-2xl overflow-hidden border border-slate-700/60 transition-transform duration-200">
                  <canvas ref={canvasRef1} className="block max-w-full h-auto" />
                </div>
              </div>
            )}

            {/* 2. CHẾ ĐỘ 2 TRANG (TWO PAGES / BOOK SPREAD) */}
            {viewMode === 'double' && (
              <div className="flex items-center justify-center min-h-full py-2 gap-0 overflow-x-auto max-w-full">
                {/* Cuốn sách mở: Trang trái & Trang phải với hiệu ứng gáy sách ở giữa */}
                <div className="flex items-center shadow-2xl rounded-xl overflow-hidden border border-slate-700/80 bg-white">
                  {/* Trang trái */}
                  <div className="relative border-r border-slate-200">
                    <canvas ref={canvasRef1} className="block max-w-full h-auto" />
                    {/* Shadow gáy sách bên trái */}
                    <div className="absolute top-0 right-0 bottom-0 w-4 bg-gradient-to-l from-black/10 to-transparent pointer-events-none" />
                  </div>

                  {/* Trang phải */}
                  {currentPage + 1 <= numPages && (
                    <div className="relative">
                      <canvas ref={canvasRef2} className="block max-w-full h-auto" />
                      {/* Shadow gáy sách bên phải */}
                      <div className="absolute top-0 left-0 bottom-0 w-4 bg-gradient-to-r from-black/10 to-transparent pointer-events-none" />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. CHẾ ĐỘ CUỘN LIÊN TỤC (CONTINUOUS VERTICAL SCROLL) */}
            {viewMode === 'continuous' && (
              <ContinuousScrollList
                pdfDoc={pdfDoc}
                numPages={numPages}
                scale={scale}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Subcomponent: Cuộn dọc liên tục từng trang
function ContinuousScrollList({
  pdfDoc,
  numPages,
  scale,
}: {
  pdfDoc: any;
  numPages: number;
  scale: number;
}) {
  const pagesArray = Array.from({ length: numPages }, (_, i) => i + 1);

  return (
    <div className="flex flex-col items-center gap-6 py-4 w-full max-w-4xl">
      {pagesArray.map((pageNum) => (
        <ContinuousPageItem
          key={pageNum}
          pdfDoc={pdfDoc}
          pageNum={pageNum}
          scale={scale}
        />
      ))}
    </div>
  );
}

function ContinuousPageItem({
  pdfDoc,
  pageNum,
  scale,
}: {
  pdfDoc: any;
  pageNum: number;
  scale: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isRendered, setIsRendered] = useState<boolean>(false);

  // Lazy render using IntersectionObserver: Chỉ render khi trang cuộn vào tầm nhìn
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { rootMargin: '300px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible || !pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    async function renderPage() {
      try {
        const page = await pdfDoc.getPage(pageNum);
        const pixelRatio = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1;
        const viewport = page.getViewport({ scale: scale * pixelRatio });

        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;

        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / pixelRatio}px`;
        canvas.style.height = `${viewport.height / pixelRatio}px`;

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        await page.render({
          canvasContext: ctx,
          viewport,
        }).promise;

        if (!isCancelled) {
          setIsRendered(true);
        }
      } catch (e: any) {
        if (e?.name !== 'RenderingCancelledException') {
          console.error(`Lỗi render trang ${pageNum}:`, e);
        }
      }
    }

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [isVisible, pdfDoc, pageNum, scale]);

  return (
    <div
      ref={containerRef}
      className="flex flex-col items-center bg-white rounded-lg shadow-xl overflow-hidden border border-slate-700/60 min-h-[300px] relative transition-transform duration-200"
    >
      <canvas ref={canvasRef} className="block max-w-full h-auto" />
      {!isRendered && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
          <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
        </div>
      )}
      <div className="bg-slate-900 text-slate-400 text-[11px] font-bold py-1 px-3 w-full text-center border-t border-slate-800">
        Trang {pageNum}
      </div>
    </div>
  );
}
