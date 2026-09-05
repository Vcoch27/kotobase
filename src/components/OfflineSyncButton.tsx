"use client";

import React, { useState, useEffect } from "react";
import { 
  DownloadCloud, CheckCircle2, HardDrive, Trash2, RefreshCw, 
  Wifi, WifiOff, X, Layers, AlertCircle, Sparkles
} from "lucide-react";
import toast from "react-hot-toast";
import { 
  saveVocabulariesOffline, saveFoldersOffline, markDeckDownloaded, 
  getDownloadedDecks, deleteDownloadedDeck, clearAllOfflineData, 
  getOfflineStorageStats, DownloadedDeckMeta 
} from "@/lib/offline-storage";
import { getVocabularies } from "@/app/actions/vocabulary";

interface OfflineSyncButtonProps {
  currentFolderId: string;
  currentFolderName: string;
  currentVocabs: any[];
  folders: any[];
  onOfflineDataChanged?: () => void;
  isOnline: boolean;
}

export function OfflineSyncButton({
  currentFolderId,
  currentFolderName,
  currentVocabs,
  folders,
  onOfflineDataChanged,
  isOnline
}: OfflineSyncButtonProps) {
  const [downloading, setDownloading] = useState(false);
  const [downloadedDecks, setDownloadedDecks] = useState<DownloadedDeckMeta[]>([]);
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [stats, setStats] = useState({ totalVocabs: 0, totalFolders: 0, totalDecks: 0 });

  // Kiểm tra xem folder hiện tại đã tải về chưa
  const isCurrentDeckDownloaded = downloadedDecks.some(d => d.folderId === currentFolderId);

  const refreshDecksInfo = async () => {
    try {
      const decks = await getDownloadedDecks();
      setDownloadedDecks(decks);
      const s = await getOfflineStorageStats();
      setStats(s);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshDecksInfo();
  }, [currentFolderId]);

  const handleDownloadCurrentDeck = async () => {
    if (!isOnline) {
      toast.error("Bạn đang mất kết nối internet. Không thể tải thêm dữ liệu mới!");
      return;
    }

    setDownloading(true);
    const toastId = toast.loading(`Đang tải bộ từ "${currentFolderName}" về máy...`);

    try {
      let vocabsToSave = currentVocabs;
      
      // Nếu là all hoặc chưa có đủ data, fetch trực tiếp
      if (!vocabsToSave || vocabsToSave.length === 0) {
        const res = await getVocabularies(currentFolderId);
        if (Array.isArray(res)) {
          vocabsToSave = res;
        }
      }

      if (!vocabsToSave || vocabsToSave.length === 0) {
        toast.dismiss(toastId);
        toast.error("Thư mục này hiện không có từ vựng nào để tải!");
        setDownloading(false);
        return;
      }

      // Lưu từ vựng & thư mục vào IndexedDB
      await saveVocabulariesOffline(vocabsToSave);
      if (folders && folders.length > 0) {
        await saveFoldersOffline(folders);
      }

      // Đánh dấu đã tải
      await markDeckDownloaded({
        folderId: currentFolderId,
        folderName: currentFolderName,
        count: vocabsToSave.length,
        downloadedAt: Date.now(),
      });

      await refreshDecksInfo();
      toast.dismiss(toastId);
      toast.success(`Đã lưu thành công ${vocabsToSave.length} từ vựng về máy để học Offline!`);
      if (onOfflineDataChanged) onOfflineDataChanged();
    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error("Lỗi khi lưu dữ liệu về máy: " + (error?.message || "Không xác định"));
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteDeck = async (folderId: string, folderName: string) => {
    try {
      await deleteDownloadedDeck(folderId);
      await refreshDecksInfo();
      toast.success(`Đã xoá bộ từ "${folderName}" khỏi máy`);
      if (onOfflineDataChanged) onOfflineDataChanged();
    } catch (e) {
      toast.error("Lỗi khi xoá bộ từ offline");
    }
  };

  const handleClearAll = async () => {
    if (!confirm("Bạn có chắc chắn muốn xoá toàn bộ dữ liệu học offline đã lưu trên máy này?")) return;
    try {
      await clearAllOfflineData();
      await refreshDecksInfo();
      toast.success("Đã xoá toàn bộ dữ liệu offline trên thiết bị!");
      if (onOfflineDataChanged) onOfflineDataChanged();
    } catch (e) {
      toast.error("Lỗi khi dọn dẹp dữ liệu");
    }
  };

  return (
    <>
      <div className="flex items-center gap-1.5">
        {/* Nút tải về máy hoặc badge đã tải */}
        {isCurrentDeckDownloaded ? (
          <button
            onClick={() => setShowManagerModal(true)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 transition-all shadow-sm"
            title="Bộ từ này đã lưu trên máy. Bấm để quản lý kho offline."
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Đã lưu Offline</span>
            <span className="sm:hidden">Offline</span>
          </button>
        ) : (
          <button
            onClick={handleDownloadCurrentDeck}
            disabled={downloading}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-500/30 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-all shadow-sm disabled:opacity-50"
            title="Tải bộ từ này về máy để học khi mất mạng hoặc đi máy bay"
          >
            <DownloadCloud className={`w-3.5 h-3.5 ${downloading ? 'animate-bounce' : ''}`} />
            <span className="hidden sm:inline">{downloading ? "Đang lưu..." : "Tải học Offline"}</span>
            <span className="sm:hidden">{downloading ? "Tải..." : "Tải"}</span>
          </button>
        )}

        {/* Nút mở kho Offline */}
        <button
          onClick={() => setShowManagerModal(true)}
          className="p-1.5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
          title="Quản lý kho dữ liệu Offline trên máy"
        >
          <HardDrive className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Modal Quản lý dữ liệu Offline */}
      {showManagerModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-slideUp"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                  <HardDrive className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base flex items-center gap-2">
                    Kho Dữ Liệu Offline
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                      IndexedDB
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Học từ vựng, Flashcard, Quiz trơn tru ngay cả khi không có mạng
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowManagerModal(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nội dung Modal */}
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Thống kê nhanh */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                  <div className="text-xl font-black text-indigo-600 dark:text-indigo-400">{stats.totalVocabs}</div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Từ vựng offline</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                  <div className="text-xl font-black text-emerald-600 dark:text-emerald-400">{stats.totalDecks}</div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Bộ từ đã tải</div>
                </div>
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 text-center">
                  <div className="text-xs font-black text-amber-600 dark:text-amber-400 flex items-center justify-center gap-1 mt-1">
                    {isOnline ? (
                      <>
                        <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                        <span className="text-emerald-600 dark:text-emerald-400">Online</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-rose-600 dark:text-rose-400">Offline</span>
                      </>
                    )}
                  </div>
                  <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mt-0.5">Trạng thái mạng</div>
                </div>
              </div>

              {/* Hướng dẫn ngắn */}
              <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/40 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  Khi mất mạng, KotoBase sẽ tự động lấy từ vựng trong kho này để bạn tiếp tục ôn Flashcard & làm Quiz mà không bị ngắt quãng.
                </p>
              </div>

              {/* Danh sách các bộ từ đã tải */}
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Các bộ từ trên thiết bị này:
                  </h4>
                  {downloadedDecks.length > 0 && (
                    <button
                      onClick={handleClearAll}
                      className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" /> Xoá tất cả
                    </button>
                  )}
                </div>

                {downloadedDecks.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500">
                    <Layers className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-xs font-semibold">Chưa có bộ từ nào được tải về máy.</p>
                    <p className="text-[11px] mt-1 text-slate-400">Hãy bấm nút "Tải học Offline" ở thanh công cụ để lưu bài học về điện thoại.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {downloadedDecks.map((deck) => (
                      <div
                        key={deck.folderId}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                            {deck.folderName}
                          </div>
                          <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5">
                            <span className="font-semibold text-indigo-600 dark:text-indigo-400">{deck.count} từ vựng</span>
                            <span>•</span>
                            <span>{new Date(deck.downloadedAt).toLocaleDateString("vi-VN")}</span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteDeck(deck.folderId, deck.folderName)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors shrink-0"
                          title="Xoá bộ từ này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Lưu trữ an toàn trên thiết bị của bạn
              </span>
              <button
                onClick={() => setShowManagerModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-slate-800 dark:bg-slate-700 text-white hover:bg-slate-900 transition-colors shadow-sm"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
