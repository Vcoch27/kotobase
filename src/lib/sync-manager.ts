// ===================================================================
// KOTOBASE SYNC MANAGER (Local-First + Background Google Drive Sync)
// ===================================================================

import { localDB, BackupDataPackage } from "./db";
import { googleDriveService, GoogleDriveUser } from "./google-drive";

export type SyncStatus = "disconnected" | "idle" | "syncing" | "synced" | "error" | "offline";

export interface SyncState {
  status: SyncStatus;
  lastSyncedAt: string | null;
  errorMessage?: string;
  user: GoogleDriveUser | null;
  pendingChangesCount: number;
}

type SyncListener = (state: SyncState) => void;

class SyncManager {
  private status: SyncStatus = "disconnected";
  private lastSyncedAt: string | null = null;
  private errorMessage?: string;
  private pendingChangesCount: number = 0;
  private debounceTimer: any = null;
  private listeners: Set<SyncListener> = new Set();

  constructor() {
    if (typeof window !== "undefined") {
      this.lastSyncedAt = localStorage.getItem("kotobase_last_synced_at");
      this.updateStatusFromContext();

      // Lắng nghe mạng online/offline
      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));
    }
  }

  private handleNetworkChange(isOnline: boolean) {
    if (!isOnline) {
      this.status = "offline";
    } else {
      this.updateStatusFromContext();
    }
    this.notify();
  }

  private updateStatusFromContext() {
    if (typeof window !== "undefined" && !navigator.onLine) {
      this.status = "offline";
      return;
    }

    const token = googleDriveService.getValidToken();
    if (!token) {
      this.status = "disconnected";
    } else {
      this.status = this.lastSyncedAt ? "synced" : "idle";
    }
  }

  getState(): SyncState {
    return {
      status: this.status,
      lastSyncedAt: this.lastSyncedAt,
      errorMessage: this.errorMessage,
      user: googleDriveService.getSavedUser(),
      pendingChangesCount: this.pendingChangesCount,
    };
  }

  subscribe(listener: SyncListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }

  // Báo cho Sync Manager biết vừa có thay đổi dữ liệu cục bộ
  notifyDataChanged() {
    this.pendingChangesCount++;
    this.status = "idle";
    this.notify();

    // Nếu đã kết nối Drive thì kích hoạt Debounce Auto-Sync (sau 3.5s)
    const token = googleDriveService.getValidToken();
    if (token && typeof window !== "undefined" && navigator.onLine) {
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this.backupNow(true);
      }, 3500);
    }
  }

  // Đăng nhập kết nối Google Drive
  async connectGoogleDrive(): Promise<GoogleDriveUser | null> {
    this.status = "syncing";
    this.errorMessage = undefined;
    this.notify();

    try {
      await googleDriveService.requestAccessToken();
      const user = await googleDriveService.getUserInfo();
      this.status = "idle";
      this.notify();

      // Sau khi kết nối lần đầu, kiểm tra xem trên Drive có file backup không
      const driveFile = await googleDriveService.findBackupFile();
      if (driveFile) {
        // Tự động khôi phục / gộp từ Drive về máy
        await this.restoreNow(false);
      } else {
        // Chưa có file trên Drive -> Sao lưu dữ liệu hiện tại lên Drive
        await this.backupNow(false);
      }

      return user;
    } catch (err: any) {
      console.error("Lỗi kết nối Google Drive:", err);
      this.status = "error";
      this.errorMessage = err.message === "CLIENT_ID_MISSING" 
        ? "Chưa cấu hình Google Client ID" 
        : (err.message || "Không thể kết nối với Google Drive");
      this.notify();
      throw err;
    }
  }

  // Đăng xuất Google Drive
  disconnectGoogleDrive() {
    googleDriveService.logout();
    this.status = "disconnected";
    this.errorMessage = undefined;
    this.notify();
  }

  // Sao lưu toàn bộ dữ liệu từ IndexedDB lên Google Drive
  async backupNow(isBackground: boolean = false): Promise<boolean> {
    const token = googleDriveService.getValidToken();
    if (!token) {
      this.status = "disconnected";
      this.notify();
      return false;
    }

    if (!isBackground) {
      this.status = "syncing";
      this.errorMessage = undefined;
      this.notify();
    }

    try {
      const dataPackage = await localDB.exportFullPackage();
      await googleDriveService.uploadBackup(dataPackage);

      this.lastSyncedAt = new Date().toISOString();
      if (typeof window !== "undefined") {
        localStorage.setItem("kotobase_last_synced_at", this.lastSyncedAt);
      }
      this.pendingChangesCount = 0;
      this.status = "synced";
      this.errorMessage = undefined;
      this.notify();
      return true;
    } catch (err: any) {
      console.error("Lỗi khi sao lưu lên Google Drive:", err);
      this.status = "error";
      this.errorMessage = err.message || "Lỗi khi sao lưu dữ liệu lên Drive";
      this.notify();
      if (!isBackground) throw err;
      return false;
    }
  }

  // Khôi phục dữ liệu từ Google Drive về IndexedDB
  async restoreNow(overwrite: boolean = false): Promise<{ foldersCount: number; vocabsCount: number }> {
    const token = googleDriveService.getValidToken();
    if (!token) {
      throw new Error("Chưa kết nối tài khoản Google Drive");
    }

    this.status = "syncing";
    this.errorMessage = undefined;
    this.notify();

    try {
      const remoteData = await googleDriveService.downloadBackup();
      if (!remoteData) {
        this.status = "synced";
        this.notify();
        return { foldersCount: 0, vocabsCount: 0 };
      }

      const result = await localDB.importFullPackage(remoteData, overwrite ? "overwrite" : "merge");

      this.lastSyncedAt = new Date().toISOString();
      if (typeof window !== "undefined") {
        localStorage.setItem("kotobase_last_synced_at", this.lastSyncedAt);
      }
      this.pendingChangesCount = 0;
      this.status = "synced";
      this.notify();
      return result;
    } catch (err: any) {
      console.error("Lỗi khi khôi phục từ Google Drive:", err);
      this.status = "error";
      this.errorMessage = err.message || "Không thể khôi phục dữ liệu từ Drive";
      this.notify();
      throw err;
    }
  }
}

export const syncManager = new SyncManager();
