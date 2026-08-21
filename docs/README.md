# 📚 Kotobase Technical Documentation Suite

Chào mừng bạn đến với bộ tài liệu kỹ thuật của dự án **Kotobase**. Thư mục này bao gồm toàn bộ tài liệu đặc tả kiến trúc, thuật toán, tính năng AI và hướng dẫn vận hành hệ thống.

---

## 📑 Danh Mục Tài Liệu

| Tài liệu | Mô tả nội dung |
| :--- | :--- |
| 🏛️ [**ARCHITECTURE.md**](./ARCHITECTURE.md) | **Kiến trúc kỹ thuật:** Mô hình Local-First, Schema IndexedDB, sơ đồ luồng dữ liệu Mermaid. |
| ☁️ [**GOOGLE_DRIVE_SYNC.md**](./GOOGLE_DRIVE_SYNC.md) | **Đồng bộ Google Drive:** Cơ chế đồng bộ hai chiều Two-Way Smart Merge (LWW), bảo mật OAuth GIS. |
| 🤖 [**AI_FEATURES.md**](./AI_FEATURES.md) | **Tự động hóa bằng AI:** Đặc tả Prompt Engineering chuẩn 5 sao, Few-Shot prompting, Multi-Provider fallback. |
| 🎙️ [**TTS_ENGINE.md**](./TTS_ENGINE.md) | **Hệ thống phát âm (TTS):** Động cơ VOICEVOX Local GPU CUDA (30ms), chuẩn trọng âm Tokyo (Pitch Accent). |
| 🧠 [**ANKI_SRS.md**](./ANKI_SRS.md) | **Thuật toán Anki SRS:** Công thức toán học SuperMemo SM-2 (Ease Factor, Intervals, Queue ôn tập hàng ngày). |
| 🚀 [**SETUP_GUIDE.md**](./SETUP_GUIDE.md) | **Hướng dẫn cài đặt:** Cấu hình môi trường `.env.local`, các script chạy 1-Click và build production. |

---

## 🛠️ Triết Lý Kỹ Thuật
1. **Local-First & Zero-Latency:** Ưu tiên xử lý cục bộ trên trình duyệt, tốc độ phản hồi < 2ms, hoạt động 100% Offline.
2. **User Data Ownership:** Người dùng toàn quyền sở hữu dữ liệu trên Google Drive cá nhân, không bị khóa vào bất kỳ máy chủ nào.
3. **GPU Accelerated TTS:** Tận dụng card đồ họa để render giọng đọc bản xứ nhanh như thời gian thực.
