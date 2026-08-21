# 🌸 KotoBase - Japanese Vocabulary & Kanji Learning Platform

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)
![IndexedDB](https://img.shields.io/badge/Storage-IndexedDB_Local--First-orange?style=for-the-badge)
![Google Drive](https://img.shields.io/badge/Cloud_Sync-Google_Drive_API_v3-4285F4?style=for-the-badge&logo=google-drive)
![VOICEVOX](https://img.shields.io/badge/TTS-VOICEVOX_GPU-A5D6A7?style=for-the-badge)

**Nền tảng học từ vựng và chữ Hán (Kanji) tiếng Nhật hiện đại với kiến trúc Local-First, đồng bộ Google Drive cá nhân, tạo từ vựng tự động bằng AI và phát âm chuẩn bản xứ bằng GPU.**

[🌟 Tính Năng](#-tính-năng-nổi-bật) • [🏛️ Kiến Trúc](#-kiến-trúc-local-first) • [🚀 Cài Đặt](#-cài-đặt--khởi-chạy) • [📚 Tài Liệu Kỹ Thuật](#-tài-liệu-kỹ-thuật-chi-tiết)

</div>

---

## 🌟 Tính Năng Nổi Bật

### 1. 🗄️ Kiến Trúc Local-First (Tốc Độ Tức Thì & 100% Offline)
* Dữ liệu được lưu trữ trực tiếp trong **IndexedDB** của trình duyệt.
* Tốc độ truy xuất và phản hồi **< 2ms**, không phụ thuộc vào mạng, không lo nghẽn server.
* Không bao giờ chạm trần giới hạn đọc/ghi (Zero Quota Limit).

### 2. ☁️ Đồng Bộ Hai Chiều Với Google Drive
* Toàn bộ bài học được sao lưu vào thư mục riêng biệt **`Kotobase/`** trên Google Drive của người dùng (`kotobase_backup.json`).
* Cơ chế **Debounced Auto-Sync (3.5s)**: Tự động lưu ngầm sau khi học xong.
* Thuật toán **Two-Way Smart Merge**: Tự động so khớp `updatedAt` khi chuyển đổi thiết bị mà không bị mất dữ liệu hay tiến độ SRS.

### 3. 🤖 Tạo Từ Vựng Hàng Loạt Bằng AI (Bulk AI Generator)
* Nhập câu lệnh tự nhiên (VD: *"30 từ vựng N3 chủ đề Du lịch"* hoặc dán danh sách từ thô / đoạn văn).
* Tự động sinh đầy đủ: **Kanji $\rightarrow$ Hiragana $\rightarrow$ Âm Hán Việt viết HOA $\rightarrow$ Nghĩa tiếng Việt $\rightarrow$ Ví dụ song ngữ**.
* Tích hợp **Free GPT-4o Gateway** (Miễn phí 100%, không cần key) và hỗ trợ kết nối `chatgpt2api` local.

### 4. 🎙️ Hệ Thống Phát Âm 3 Tầng (VOICEVOX GPU Local)
* **Ưu tiên số 1:** Kết nối trực tiếp **VOICEVOX GPU Engine (`http://127.0.0.1:50021`)** trên card đồ họa NVIDIA (RTX) với thời gian phản hồi **30ms**.
* **Chuẩn trọng âm Tokyo (Pitch Accent):** Giọng đọc Seiyuu tự nhiên chuẩn người bản xứ.
* **Fallback thông minh:** Tự động chuyển sang Voicevox Cloud API hoặc Web Speech API nếu offline.

### 5. 🧠 Ôn Tập Khoa Học Với Anki SRS (SuperMemo SM-2)
* Thuật toán lặp lại ngắt quãng SM-2 tự động tính toán chu kỳ lặp lại (Again, Hard, Good, Easy) dựa trên độ khó.
* Hàng đợi thông minh lọc các từ vựng đến hạn ôn tập hàng ngày (Due Cards Queue).

### 6. 📁 Cây Thư Mục Đa Cấp & Phân Loại Thông Minh
* Tạo, đổi tên, phân cấp thư mục con (`+`), xóa bài học an toàn.
* Tách biệt rõ ràng: **"Tất cả từ vựng"** và **"Từ chưa phân loại (Mới thêm)"**.
* Hỗ trợ kéo thả (Drag & Drop) từ vựng vào từng bài học.

---

## 🏛️ Kiến Trúc Local-First

```
+---------------------------------------------------------+
|                  Kotobase Next.js Web                   |
+---------------------------------------------------------+
        |                                       |
  (Read/Write < 2ms)                    (Audio Playback 30ms)
        v                                       v
+------------------+                    +--------------------+
| IndexedDB Local  |                    | VOICEVOX Local GPU |
| Browser Storage  |                    | (Port 50021 - CUDA)|
+------------------+                    +--------------------+
        |
  (Auto Sync 3.5s)
        v
+---------------------------------------------------------+
|   Google Drive API v3 (Folder: Kotobase/backup.json)    |
+---------------------------------------------------------+
```

---

## 📚 Tài Liệu Kỹ Thuật Chi Tiết (Documentation Suite)

Dự án đi kèm bộ tài liệu kỹ thuật toàn diện trong thư mục [`docs/`](./docs/):

| Tài liệu | Nội dung chi tiết |
| :--- | :--- |
| 🏛️ [**ARCHITECTURE.md**](./docs/ARCHITECTURE.md) | Kiến trúc tổng quan, mô hình Local-First, Schema IndexedDB, Data Flow |
| ☁️ [**GOOGLE_DRIVE_SYNC.md**](./docs/GOOGLE_DRIVE_SYNC.md) | Cơ chế đồng bộ Drive API v3, Two-Way Smart Merge, bảo mật OAuth |
| 🤖 [**AI_FEATURES.md**](./docs/AI_FEATURES.md) | Tự động hóa từ vựng bằng AI, chuẩn Prompt Engineering, Multi-Provider |
| 🎙️ [**TTS_ENGINE.md**](./docs/TTS_ENGINE.md) | Động cơ phát âm 3 tầng, tích hợp VOICEVOX GPU, ElevenLabs |
| 🧠 [**ANKI_SRS.md**](./docs/ANKI_SRS.md) | Thuật toán ôn tập ngắt quãng SuperMemo SM-2, công thức toán học |
| 🚀 [**SETUP_GUIDE.md**](./docs/SETUP_GUIDE.md) | Hướng dẫn cài đặt, cấu hình `.env.local`, các lệnh chạy & build |

---

## 🚀 Cài Đặt & Khởi Chạy

### 1. Cài đặt thư viện
```bash
git clone https://github.com/NhatPrv/kotobase.git
cd kotobase
npm install
```

### 2. Cấu hình biến môi trường (`.env.local`)
```env
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id_here
CHATGPT2API_URL=http://127.0.0.1:8001/v1/chat/completions
CHATGPT2API_KEY=16022005
```

### 3. Khởi chạy
* **Khởi động 1-Click (Windows):** Click đúp vào file `start_all.bat`.
* **Khởi động qua dòng lệnh:**
  ```bash
  npm run dev:all   # Chạy cả Web App (3000) và AI Backend (8001)
  npm run dev       # Chỉ chạy Web App (Dùng Free AI Gateway Online)
  ```
* Mở trình duyệt tại: `http://localhost:3000`

---

## 📄 Giấy Phép

Dự án mã nguồn mở phục vụ mục đích học tập và nghiên cứu.
