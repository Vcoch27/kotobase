// ===================================================================
// GOOGLE DRIVE API v3 CLIENT & OAUTH 2.0 (Client-side GIS)
// ===================================================================

import { BackupDataPackage } from "./db";

declare global {
  interface Window {
    google?: any;
    gapi?: any;
  }
}

export interface GoogleDriveUser {
  email: string;
  name: string;
  picture?: string;
  sub?: string;
}

export interface GoogleDriveFileMeta {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
}

const BACKUP_FILE_NAME = "kotobase_backup.json";
const SCOPES = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email";

export class GoogleDriveService {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private tokenClient: any = null;
  private gisLoadedPromise: Promise<void> | null = null;

  // Lấy Google Client ID từ env hoặc localStorage do người dùng nhập
  getClientId(): string {
    if (typeof window === "undefined") return "";
    const customId = localStorage.getItem("kotobase_gdrive_client_id");
    return customId?.trim() || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
  }

  setCustomClientId(clientId: string) {
    if (typeof window !== "undefined") {
      if (clientId) {
        localStorage.setItem("kotobase_gdrive_client_id", clientId.trim());
      } else {
        localStorage.removeItem("kotobase_gdrive_client_id");
      }
    }
  }

  // Load Google Identity Services script
  private loadGIS(): Promise<void> {
    if (this.gisLoadedPromise) return this.gisLoadedPromise;

    this.gisLoadedPromise = new Promise((resolve, reject) => {
      if (typeof window === "undefined") return resolve();
      if (window.google?.accounts?.oauth2) return resolve();

      const existingScript = document.getElementById("google-gsi-client");
      if (existingScript) {
        existingScript.addEventListener("load", () => resolve());
        return;
      }

      const script = document.createElement("script");
      script.id = "google-gsi-client";
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Không thể tải Google Identity Services SDK"));
      document.head.appendChild(script);
    });

    return this.gisLoadedPromise;
  }

  // Khởi tạo GIS Token Client & Yêu cầu quyền truy cập
  async requestAccessToken(): Promise<string> {
    await this.loadGIS();

    const clientId = this.getClientId();
    if (!clientId) {
      throw new Error("CLIENT_ID_MISSING");
    }

    return new Promise((resolve, reject) => {
      try {
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: clientId,
          scope: SCOPES,
          callback: (response: any) => {
            if (response.error) {
              reject(new Error(response.error_description || response.error));
              return;
            }
            this.accessToken = response.access_token;
            // expires_in tính bằng giây (thường là 3600s = 1h)
            this.tokenExpiry = Date.now() + (parseInt(response.expires_in, 10) || 3500) * 1000;
            
            // Lưu token vào sessionStorage để giữ phiên khi F5
            if (typeof window !== "undefined") {
              sessionStorage.setItem("kotobase_gdrive_token", this.accessToken!);
              sessionStorage.setItem("kotobase_gdrive_token_expiry", this.tokenExpiry.toString());
            }

            resolve(this.accessToken!);
          },
        });

        this.tokenClient.requestAccessToken({ prompt: "" });
      } catch (err) {
        reject(err);
      }
    });
  }

  // Lấy token hiện tại (hoặc từ sessionStorage nếu còn hạn)
  getValidToken(): string | null {
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    if (typeof window !== "undefined") {
      const storedToken = sessionStorage.getItem("kotobase_gdrive_token");
      const storedExpiry = parseInt(sessionStorage.getItem("kotobase_gdrive_token_expiry") || "0", 10);
      if (storedToken && Date.now() < storedExpiry) {
        this.accessToken = storedToken;
        this.tokenExpiry = storedExpiry;
        return this.accessToken;
      }
    }

    return null;
  }

  // Đăng xuất Google Drive
  logout() {
    this.accessToken = null;
    this.tokenExpiry = 0;
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("kotobase_gdrive_token");
      sessionStorage.removeItem("kotobase_gdrive_token_expiry");
      localStorage.removeItem("kotobase_gdrive_user");
    }
  }

  // Lấy thông tin User Google Profile
  async getUserInfo(): Promise<GoogleDriveUser | null> {
    const token = this.getValidToken();
    if (!token) return null;

    try {
      const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return null;
      const data = await res.json();
      const user: GoogleDriveUser = {
        email: data.email,
        name: data.name || data.email,
        picture: data.picture,
        sub: data.sub,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("kotobase_gdrive_user", JSON.stringify(user));
      }
      return user;
    } catch (e) {
      console.error("Lỗi lấy thông tin Google User:", e);
      return null;
    }
  }

  getSavedUser(): GoogleDriveUser | null {
    if (typeof window === "undefined") return null;
    try {
      const u = localStorage.getItem("kotobase_gdrive_user");
      return u ? JSON.parse(u) : null;
    } catch (e) {
      return null;
    }
  }

  // -------------------------------------------------------------
  // GOOGLE DRIVE FOLDER & FILE OPERATIONS
  // -------------------------------------------------------------

  // Lấy hoặc tạo thư mục "Kotobase" trên Google Drive
  async getOrCreateKotobaseFolder(): Promise<string> {
    const token = this.getValidToken();
    if (!token) throw new Error("UNAUTHORIZED");

    // 1. Tìm xem thư mục Kotobase đã tồn tại chưa
    const query = encodeURIComponent(`name = 'Kotobase' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      const data = await res.json();
      if (data.files && data.files.length > 0) {
        return data.files[0].id;
      }
    }

    // 2. Nếu chưa có, tạo mới thư mục Kotobase
    const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Kotobase",
        mimeType: "application/vnd.google-apps.folder",
        description: "Thư mục lưu trữ bài học và từ vựng của ứng dụng Kotobase",
      }),
    });

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      console.error("Lỗi Google Drive API tạo thư mục Kotobase:", createRes.status, errData);
      if (errData.error?.message) {
        if (errData.error.message.includes("Google Drive API has not been used") || errData.error.message.includes("disabled")) {
          throw new Error("Bạn cần BẬT (Enable) 'Google Drive API' trên Google Cloud Console trước khi đồng bộ.");
        }
        throw new Error(`Google Drive: ${errData.error.message}`);
      }
      throw new Error("Không thể tạo thư mục Kotobase trên Google Drive");
    }

    const folder = await createRes.json();
    return folder.id;
  }

  // Tìm file backup kotobase_backup.json trên Drive (ưu tiên trong thư mục Kotobase)
  async findBackupFile(): Promise<GoogleDriveFileMeta | null> {
    const token = this.getValidToken();
    if (!token) throw new Error("UNAUTHORIZED");

    const query = encodeURIComponent(`name = '${BACKUP_FILE_NAME}' and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size,parents)&spaces=drive`;

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error("Lỗi tìm kiếm file trên Google Drive:", res.status, errData);
      if (res.status === 401) throw new Error("UNAUTHORIZED");
      if (errData.error?.message?.includes("Google Drive API has not been used") || errData.error?.message?.includes("disabled")) {
        throw new Error("Bạn cần BẬT (Enable) 'Google Drive API' trên Google Cloud Console trước khi đồng bộ.");
      }
      throw new Error("Lỗi tìm kiếm file trên Google Drive");
    }

    const data = await res.json();
    if (data.files && data.files.length > 0) {
      return data.files[0];
    }
    return null;
  }

  // Tải file backup JSON từ Drive về
  async downloadBackup(): Promise<BackupDataPackage | null> {
    const token = this.getValidToken();
    if (!token) throw new Error("UNAUTHORIZED");

    const fileMeta = await this.findBackupFile();
    if (!fileMeta) return null;

    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileMeta.id}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error("Không thể tải nội dung file từ Google Drive");
    }

    const json = await res.json();
    return json as BackupDataPackage;
  }

  // Upload/Ghi đè file backup JSON vào thư mục Kotobase trên Drive
  async uploadBackup(data: BackupDataPackage): Promise<GoogleDriveFileMeta> {
    const token = this.getValidToken();
    if (!token) throw new Error("UNAUTHORIZED");

    // Lấy hoặc tạo thư mục Kotobase (nếu lỗi sẽ fallback lưu ở root)
    let folderId: string | null = null;
    try {
      folderId = await this.getOrCreateKotobaseFolder();
    } catch (e: any) {
      console.warn("Không thể tạo folder Kotobase, sẽ lưu tại root:", e.message);
      if (e.message.includes("Google Drive API")) {
        throw e; // Ném lỗi nếu chưa enable Google Drive API
      }
    }

    const fileMeta = await this.findBackupFile();
    const jsonContent = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonContent], { type: "application/json" });

    if (fileMeta) {
      // Cập nhật file đã có
      const addParam = folderId ? `&addParents=${folderId}` : "";
      const uploadUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileMeta.id}?uploadType=media${addParam}`;
      const res = await fetch(uploadUrl, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: blob,
      });

      if (!res.ok) {
        throw new Error("Không thể cập nhật file sao lưu trên Google Drive");
      }

      const updated = await res.json();
      return {
        id: updated.id,
        name: updated.name || BACKUP_FILE_NAME,
        modifiedTime: new Date().toISOString(),
      };
    } else {
      // Tạo file mới bên trong thư mục Kotobase (hoặc root nếu chưa có folderId)
      const metadata: any = {
        name: BACKUP_FILE_NAME,
        mimeType: "application/json",
        description: "Kotobase Japanese Vocabulary Backup Package",
      };

      if (folderId) {
        metadata.parents = [folderId];
      }

      const form = new FormData();
      form.append("metadata", new Blob([JSON.stringify(metadata)], { type: "application/json" }));
      form.append("file", blob);

      const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart";
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!res.ok) {
        throw new Error("Không thể tạo mới file sao lưu trong thư mục Kotobase trên Google Drive");
      }

      const created = await res.json();
      return {
        id: created.id,
        name: created.name,
        modifiedTime: new Date().toISOString(),
      };
    }
  }
}

export const googleDriveService = new GoogleDriveService();
