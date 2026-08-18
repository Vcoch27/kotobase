"use client";

import React, { useState, useEffect } from "react";
import { 
  Cloud, RefreshCw, DownloadCloud, UploadCloud, 
  X, CheckCircle2, ShieldCheck, User, LogOut
} from "lucide-react";
import { syncManager, SyncState } from "@/lib/sync-manager";
import { googleDriveService } from "@/lib/google-drive";
import toast from "react-hot-toast";

interface GoogleDriveSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataRestored?: () => void;
}

export function GoogleDriveSyncModal({ isOpen, onClose, onDataRestored }: GoogleDriveSyncModalProps) {
  const [syncState, setSyncState] = useState<SyncState>(syncManager.getState());
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe((state) => {
      setSyncState(state);
    });
    return () => unsubscribe();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setIsSyncing(true);
    try {
      await syncManager.connectGoogleDrive();
      toast.success("Đã kết nối thành công với Google Drive!");
      if (onDataRestored) onDataRestored();
    } catch (err: any) {
      toast.error(err.message || "Không thể kết nối với Google Drive");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBackup = async () => {
    setIsSyncing(true);
    try {
      await syncManager.backupNow(false);
      toast.success("Đã sao lưu toàn bộ dữ liệu lên Google Drive!");
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi sao lưu dữ liệu");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRestore = async () => {
    if (!window.confirm("Hệ thống sẽ đồng bộ và gộp dữ liệu từ Google Drive về máy. Bạn có muốn tiếp tục?")) {
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncManager.restoreNow(false);
      toast.success(`Đã khôi phục thành công ${result.vocabsCount} từ vựng và ${result.foldersCount} thư mục!`);
      if (onDataRestored) onDataRestored();
    } catch (err: any) {
      toast.error(err.message || "Lỗi khi khôi phục dữ liệu");
    } finally {
      setIsSyncing(false);
    }
  };

  const isConnected = syncState.status !== "disconnected";
  const user = syncState.user;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Đồng bộ Google Drive</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Lưu trữ đám mây & sao lưu dữ liệu cá nhân</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Connection Status Card */}
          <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Trạng thái kết nối</span>
              {isConnected ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Đã kết nối
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                  Chưa kết nối
                </span>
              )}
            </div>

            {isConnected && user ? (
              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-3">
                  {user.picture ? (
                    <img src={user.picture} alt={user.name} className="w-9 h-9 rounded-full border border-slate-200 dark:border-slate-700" />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold text-sm">
                      {user.name?.[0]?.toUpperCase() || "U"}
                    </div>
                  )}
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.name}</div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{user.email}</div>
                  </div>
                </div>
                <button
                  onClick={() => syncManager.disconnectGoogleDrive()}
                  className="px-2.5 py-1.5 rounded-lg text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                  Kết nối Google Drive để tự động sao lưu và đồng bộ toàn bộ từ vựng, thư mục và tiến độ SRS Anki qua các thiết bị.
                </p>
                <button
                  onClick={handleConnect}
                  disabled={isSyncing}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cloud className="w-4 h-4" />}
                  Đăng nhập & Kết nối Google Drive
                </button>
              </div>
            )}

            {/* Last Synced Information */}
            {isConnected && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
                <span>Lần đồng bộ cuối:</span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {syncState.lastSyncedAt 
                    ? new Date(syncState.lastSyncedAt).toLocaleString("vi-VN") 
                    : "Chưa có sao lưu"}
                </span>
              </div>
            )}
          </div>

          {/* Quick Actions (Khi đã kết nối) */}
          {isConnected && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleBackup}
                disabled={isSyncing}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left space-y-1 transition-all group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500">
                  <UploadCloud className="w-4 h-4 text-amber-500" />
                  Sao lưu lên Drive
                </div>
                <p className="text-[11px] text-slate-400">Đẩy toàn bộ dữ liệu máy lên Google Drive</p>
              </button>

              <button
                onClick={handleRestore}
                disabled={isSyncing}
                className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-amber-500/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-left space-y-1 transition-all group disabled:opacity-50 cursor-pointer"
              >
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-amber-500">
                  <DownloadCloud className="w-4 h-4 text-amber-500" />
                  Khôi phục từ Drive
                </div>
                <p className="text-[11px] text-slate-400">Gộp dữ liệu từ Drive về trình duyệt này</p>
              </button>
            </div>
          )}

          {/* Local-First Benefits Badge */}
          <div className="p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-700 dark:text-amber-400">
              <ShieldCheck className="w-4 h-4" />
              Kiến trúc Local-First & Bảo mật 100%
            </div>
            <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
              Mọi dữ liệu từ vựng được lưu trực tiếp trên máy của bạn (IndexedDB) với tốc độ tức thì &lt;2ms, học offline không cần mạng. Google Drive chỉ dùng để sao lưu và đồng bộ đa thiết bị khi bạn muốn.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
