export interface AppUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: "admin" | "user";
  status: "active" | "disabled";
  createdAt: string;
  lastLoginAt?: string;
  notes?: string;
  stats?: {
    folderCount: number;
    vocabCount: number;
    grammarCount: number;
    sentenceCount: number;
  };
}

/**
 * Danh sách email quản trị viên mặc định hoặc cấu hình qua biến môi trường.
 */
export function getAdminEmails(): string[] {
  const envEmails = process.env.ADMIN_EMAILS || "hoangtungmy123@gmail.com";
  return envEmails
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Kiểm tra xem email có thuộc danh sách Quản trị viên hay không (Client & Server safe).
 */
export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  const adminList = getAdminEmails();
  return adminList.includes(email.trim().toLowerCase());
}
