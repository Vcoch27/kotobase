# 🚀 Hướng Dẫn Cài Đặt & Khởi Chạy Dự Án (Setup Guide)

Tài liệu này hướng dẫn chi tiết các bước thiết lập môi trường, cài đặt thư viện và khởi chạy dự án **Kotobase** trên máy tính cục bộ.

---

## 1. Yêu Cầu Môi Trường (Prerequisites)

* **Hệ điều hành:** Windows 10/11, macOS, hoặc Linux.
* **Node.js:** Phiên bản `>= 18.17.0` (Khuyên dùng Node 20 LTS).
* **Package Manager:** `npm`, `pnpm`, hoặc `bun`.
* **Python (Tùy chọn):** Phiên bản `>= 3.10` kèm công cụ `uv` nếu muốn chạy local module `chatgpt2api`.
* **VOICEVOX (Tùy chọn cho âm thanh GPU):** Bản cài đặt [VOICEVOX for Windows](https://voicevox.hiroshiba.jp/).

---

## 2. Cài Đặt Thư Viện

Mở terminal tại thư mục gốc của dự án và chạy lệnh:

```bash
npm install
```

---

## 3. Cấu Hình Biến Môi Trường (`.env.local`)

Tạo tệp `.env.local` tại thư mục gốc của dự án với nội dung mẫu:

```env
# Google OAuth Client ID dùng để xác thực đồng bộ Google Drive
NEXT_PUBLIC_GOOGLE_CLIENT_ID=277813055480-b4ej3ek6kptobmbp8d5uo8078he3dao1.apps.googleusercontent.com

# Cấu hình Local AI Backend (Nếu có)
CHATGPT2API_URL=http://127.0.0.1:8001/v1/chat/completions
CHATGPT2API_KEY=16022005

# (Tùy chọn) Google Gemini API Key nếu muốn dùng Gemini trực tiếp
# GEMINI_API_KEY=your_gemini_api_key_here
```

---

## 4. Các Lệnh Khởi Chạy (Development Scripts)

### 🥇 Cách 1: Khởi động 1-Click (Khuyên dùng)
* Trên Windows: Click đúp vào file **`start_all.bat`** tại thư mục gốc.

### 🥈 Cách 2: Khởi động toàn bộ qua dòng lệnh
```bash
npm run dev:all
```
Lệnh này sẽ tự động khởi động song song:
* **Web App (Next.js):** `http://localhost:3000`
* **AI Backend Service (Python):** `http://localhost:8001`

### 🥉 Cách 3: Chỉ khởi động Web App (Dùng Free AI Gateway Online)
```bash
npm run dev
```

---

## 5. Kiểm Tra & Đóng Gói (Production Build)

Trước khi gửi Pull Request hoặc deploy lên Vercel/Cloudflare, hãy kiểm tra tính đúng đắn của toàn bộ mã nguồn bằng lệnh:

```bash
npm run build
```

Sau khi build thành công (`✓ Compiled successfully`), bạn có thể chạy thử bản production bằng lệnh:

```bash
npm run start
```
