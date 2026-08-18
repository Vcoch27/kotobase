# Hướng Dẫn Cài Đặt & Chạy Môi Trường Cục Bộ (Setup Guide)

Tài liệu này cung cấp hướng dẫn từng bước để thiết lập, cấu hình và chạy dự án **KotoBase** trên môi trường máy tính cá nhân (Local Development).

---

## 1. Yêu Cầu Tiên Quyết (Prerequisites)

Trước khi bắt đầu, hãy đảm bảo hệ thống đã cài đặt các công cụ sau:

* **Node.js**: Phiên bản `>= 18.17.0` (Khuyến nghị dùng bản LTS Node.js 20.x).
* **Trình quản lý gói (Package Manager)**: `npm` (mặc định theo Node.js) hoặc `pnpm`/`yarn`.
* **Git**: Phiên bản `>= 2.30.0`.
* **Tài khoản Google Firebase**: Dự án sử dụng Firebase Authentication và Cloud Firestore.

Kiểm tra phiên bản trong terminal:
```bash
node -v
npm -v
git --version
```

---

## 2. Các Bước Cài Đặt (Step-by-step Installation)

### Bước 1: Clone kho mã nguồn
```bash
git clone https://github.com/Vcoch27/kotobase.git
cd kotobase
```

### Bước 2: Cài đặt các gói phụ thuộc (Dependencies)
```bash
npm install
```

---

## 3. Cấu Hình Biến Môi Trường (Environment Variables)

Tạo file `.env.local` tại thư mục gốc của dự án (`c:\mydata\ForkProject\kotobase\.env.local`) và cấu hình các biến tương ứng với dự án Firebase của bạn:

```env
# ===================================================================
# FIREBASE CLIENT CONFIGURATION (Frontend / React)
# Lấy từ Firebase Console -> Project Settings -> General -> Your apps
# ===================================================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-app.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-app.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789012:web:abcdef123456

# ===================================================================
# FIREBASE ADMIN SDK CONFIGURATION (Server Actions / API Routes)
# Lấy từ Firebase Console -> Project Settings -> Service accounts
# ===================================================================
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project-id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

> **Lưu ý quan trọng về `FIREBASE_PRIVATE_KEY`:**
> - Giữ nguyên dấu ngoặc kép bọc toàn bộ chuỗi private key.
> - Ký tự xuống dòng `\n` trong private key sẽ được xử lý tự động trong [src/lib/firebase-admin.ts](file:///c:/mydata/ForkProject/kotobase/src/lib/firebase-admin.ts).

---

## 4. Danh Sách Lệnh Thực Thi (Scripts & Commands)

| Lệnh | Mục đích |
| :--- | :--- |
| `npm run dev` | Khởi chạy máy chủ phát triển (Next.js Dev Server) tại `http://localhost:3000` |
| `npm run build` | Biên dịch và đóng gói ứng dụng cho môi trường Production |
| `npm run start` | Chạy ứng dụng Production sau khi đã build |
| `npm run lint` | Kiểm tra lỗi cú pháp và quy tắc code bằng ESLint & TypeScript compiler |

---

## 5. Khởi Chạy Dự Án (Run Development Server)

Chạy lệnh:
```bash
npm run dev
```

Mở trình duyệt web và truy cập địa chỉ:
```
http://localhost:3000
```

---

## 6. Xử Lý Các Sự Cố Phổ Biến (Troubleshooting)

### 6.1. Lỗi kết nối Firebase Admin SDK
* **Hiện tượng:** Lỗi `FirebaseAppError: Failed to parse private key: Error: Invalid PEM formatted message`.
* **Khắc phục:** Kiểm tra lại biến `FIREBASE_PRIVATE_KEY` trong `.env.local`, đảm bảo có đầy đủ header `-----BEGIN PRIVATE KEY-----`, footer `-----END PRIVATE KEY-----` và giữ định dạng chuỗi escape `\n`.

### 6.2. Lỗi CORS khi gọi API tra cứu Jisho / Mazii
* Dự án đã định tuyến qua Next.js Route Handlers (`/api/jisho`, `/api/kanji`) làm proxy nội bộ để tránh lỗi CORS trên trình duyệt. Hãy đảm bảo Next.js Server đang chạy bình thường.

### 6.3. Lỗi Cache hoặc HMR (Hot Module Replacement)
* Xóa thư mục `.next` và khởi động lại:
```bash
rm -rf .next
npm run dev
```
*(Trên Windows PowerShell: `Remove-Item -Recurse -Force .next`)*
