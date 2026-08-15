# KotoBase - Nền tảng Quản lý và Học Từ vựng Tiếng Nhật Thông minh

KotoBase là ứng dụng web hiện đại hỗ trợ người học tiếng Nhật xây dựng, tổ chức và ghi nhớ hệ thống từ vựng, chữ Hán (Kanji) theo cấu trúc thư mục lồng nhau, kết hợp các phương pháp ghi nhớ khoa học (Spaced Repetition System - Anki SM-2, Active Recall).

---

## 1. Giới thiệu tổng quan

KotoBase được thiết kế nhằm giải quyết bài toán phân mảnh dữ liệu khi học tiếng Nhật:
- Quản lý từ vựng theo cây thư mục nhiều cấp (Nested Folders), hỗ trợ thao tác kéo thả.
- Tự động tích hợp từ điển trực tuyến (Jisho, Mazii) để tra cứu nhanh ngữ nghĩa, âm Hán Việt, cách đọc On/Kun, cấp độ JLPT và số nét.
- Đa dạng hóa hình thức ôn tập thông qua các chế độ: Flashcard SRS, Focus Recall và Trắc nghiệm gõ phím (Typing Quiz).
- Hỗ trợ phát âm chuẩn tiếng Nhật qua Web Speech API / TTS.

---

## 2. Các tính năng chính

### 2.1. Quản lý kho từ vựng và Thư mục
- Cây thư mục đa cấp: Tạo, đổi tên, phân cấp và xóa thư mục với cơ chế cập nhật giao diện tức thì (Optimistic UI).
- Kéo thả trực quan: Kéo từ vựng thả trực tiếp vào thư mục trên thanh điều hướng bên trái.
- Thêm nhanh (Quick Add): Tự động kiểm tra trùng lặp từ vựng trong cơ sở dữ liệu khi nhập liệu.
- Nhập dữ liệu hàng loạt (Bulk Import): Hỗ trợ nhập liệu nhanh danh sách từ vựng theo định dạng phân tách.

### 2.2. Các chế độ học tập và ôn tập
- Chế độ Tổng quan (Overview): Hiển thị toàn bộ từ vựng theo bảng, hỗ trợ phân trang, lọc theo thư mục và tương tác nhanh với từng chữ Hán.
- Chế độ Tập trung (Focus Recall): Ẩn nghĩa và cách đọc để rèn luyện phản xạ nhớ chủ động, hỗ trợ phát âm từng từ.
- Thẻ ghi nhớ (Flashcard):
  - Chế độ Thường (Normal): Lật thẻ hai chiều, xáo trộn thứ tự (Shuffle) và hoàn tác.
  - Chế độ Tiến độ (Progress): Đánh dấu Đã thuộc / Chưa thuộc để lọc danh sách cần ôn lại.
  - Chế độ Anki SRS: Áp dụng thuật toán lặp lại ngắt quãng (Spaced Repetition System), tự động tính toán chu kỳ ôn tập tiếp theo (Again, Hard, Good, Easy) dựa trên độ khó của từng từ.
- Sổ tay Hán tự (Kanji Dictionary):
  - Tự động bóc tách các chữ Hán có trong kho từ vựng.
  - Hiển thị âm Hán Việt in hoa nổi bật dưới từng chữ Hán.
  - Tra cứu trực tiếp từ API từ điển Mazii: số nét, cấp độ JLPT, âm On, âm Kun, nghĩa tiếng Việt và mẹo nhớ (Mnemonic).
- Trắc nghiệm gõ phím (Typing Quiz): Luyện gõ cách đọc từ vựng bằng bàn phím, kiểm tra độ chính xác theo thời gian thực và tổng kết danh sách từ cần củng cố.

### 2.3. Tối ưu hóa hiệu năng và Trải nghiệm người dùng
- Cơ chế Debounce thanh tìm kiếm: Giảm thiểu số lượng truy vấn tới máy chủ khi nhập từ khóa.
- Tải động thành phần (Dynamic Imports): Phân tách các module nặng để tối ưu hóa thời gian hiển thị ban đầu (TTI).
- Giao diện Sáng / Tối (Dark / Light Mode): Hỗ trợ chuyển đổi chủ đề màu sắc mượt mà.

---

## 3. Công nghệ sử dụng

- Framework: Next.js 14 (App Router, Server Actions)
- Ngôn ngữ: TypeScript
- Thư viện giao diện: React 18, Tailwind CSS, Lucide Icons
- Cơ sở dữ liệu: Google Firebase / Cloud Firestore
- Quản trị giao diện & Chủ đề: Next Themes, Tailwind Merge, CLSX
- API bên thứ ba: Jisho API, Mazii API

---

## 4. Cấu trúc thư mục dự án

```text
KotoBase/
├── src/
│   ├── app/
│   │   ├── actions/          # Server Actions xử lý dữ liệu (Vocabulary, Folder, Kanji)
│   │   ├── api/              # API Route Handlers (Jisho Proxy, Kanji Lookup)
│   │   ├── layout.tsx        # Layout chính của ứng dụng
│   │   └── page.tsx          # Trang chủ Dashboard
│   ├── components/           # Các thành phần giao diện người dùng (UI Components)
│   │   ├── Dashboard.tsx     # Bảng điều khiển trung tâm
│   │   ├── FolderTree.tsx    # Cây quản lý thư mục
│   │   ├── OverviewView.tsx  # Bảng tổng quan danh sách từ
│   │   ├── FocusRecallView.tsx # Giao diện ôn tập phản xạ
│   │   ├── FlashcardView.tsx # Giao diện Flashcard & Anki SRS
│   │   ├── KanjiDictionaryView.tsx # Quản lý và tra cứu Hán tự
│   │   ├── TypingQuizView.tsx # Giao diện trắc nghiệm gõ phím
│   │   ├── QuickAddForm.tsx  # Form thêm nhanh từ vựng
│   │   └── ...
│   ├── hooks/                # Custom React Hooks (useDebounce, ...)
│   └── lib/                  # Tiện ích bổ trợ (TTS, Anki Algorithm, Firebase Config)
├── public/                   # Tài nguyên tĩnh
├── package.json              # Cấu hình phụ thuộc và scripts
├── tailwind.config.ts        # Cấu hình Tailwind CSS
└── tsconfig.json             # Cấu hình TypeScript
```

---

## 5. Hướng dẫn cài đặt và chạy môi trường cục bộ

### 5.1. Yêu cầu hệ thống
- Node.js phiên bản 18.17.0 trở lên.
- Trình quản lý gói: npm hoặc yarn hoặc pnpm.

### 5.2. Các bước cài đặt

1. Sao chép mã nguồn về máy:
   ```bash
   git clone <URL_REPOSITORY>
   cd KotoBase
   ```

2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```

3. Cấu hình biến môi trường:
   Tạo file `.env.local` tại thư mục gốc và khai báo các khóa kết nối Firebase:
   ```env
   NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
   NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
   ```

4. Khởi chạy máy chủ phát triển (Development Server):
   ```bash
   npm run dev
   ```
   Mở trình duyệt và truy cập: `http://localhost:3000`

---

## 6. Lệnh xây dựng dự án

- Kiểm tra lỗi TypeScript:
  ```bash
  npm run lint
  ```
- Đóng gói dự án (Production Build):
  ```bash
  npm run build
  ```
- Khởi chạy bản đóng gói:
  ```bash
  npm run start
  ```

---

## 7. Giấy phép

Dự án được phát triển phục vụ mục đích học tập và nghiên cứu cá nhân.
