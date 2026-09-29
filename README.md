# KotoBase — Học từ vựng tiếng Nhật theo cách của bạn

**Japanese vocabulary learning, flashcards & Kanji dictionary.** KotoBase giúp bạn lưu từ mới theo chủ đề, tra cứu và ôn tập ngay trên cùng một nơi. Mở ứng dụng tại **[kotobase.vanhoang.online](https://kotobase.vanhoang.online/)**.

## Bắt đầu học

1. Tạo thư mục cho giáo trình, chủ đề hoặc cấp độ JLPT.
2. Thêm từ vựng từng từ, tra cứu qua Jisho hoặc nhập cả danh sách bằng JSON. Nếu có Gemini API key cá nhân, bạn có thể dùng AI để phân tích văn bản thành danh sách từ rồi xem trước trước khi lưu.
3. Chọn một hoặc nhiều thư mục và học bằng chế độ phù hợp: xem tổng quan, ôn tập che đáp án, flashcard hoặc quiz gõ phím.
4. Nhấn vào chữ Hán trong từ vựng để xem cách đọc, nghĩa và các từ ghép liên quan.

> Quiz gõ phím yêu cầu đăng nhập Google. Một số khả năng tra cứu và tạo nội dung bằng AI cần kết nối mạng hoặc API key riêng.

## Học từ vựng

| Tính năng | Bạn có thể làm gì? |
| --- | --- |
| **Kho từ vựng** | Tạo, sửa, tìm kiếm và sắp xếp từ theo cây thư mục nhiều cấp; chọn nhiều thư mục để học cùng lúc. |
| **Thêm nhanh & nhập hàng loạt** | Thêm từ ngay trên trang học; dán JSON hoặc để Gemini phân tích danh sách thô, xem trước rồi mới nhập. |
| **Tra cứu khi học** | Tìm từ bằng chữ Nhật, cách đọc hoặc nghĩa; mở kết quả Jisho từ giao diện học và tương tác trực tiếp với chữ Hán. |
| **Ôn tập che đáp án** | Tự nhớ cách đọc và nghĩa trước khi hiện đáp án (active recall). |
| **Flashcard** | Lật thẻ, xáo trộn, tự động chuyển thẻ, nghe phát âm; chọn chế độ thường, theo tiến độ, nghe hoặc Anki SRS. |
| **Lặp lại ngắt quãng** | Đánh giá thẻ bằng Again / Hard / Good / Easy để lên lịch ôn tiếp theo; tiến độ được lưu trên thiết bị. |
| **Quiz gõ phím** | Luyện nhập câu trả lời và xem lại các từ cần củng cố sau lượt học. |
| **Phát âm** | Nghe từ vựng bằng tính năng đọc tiếng Nhật và điều chỉnh cài đặt TTS. |

## Các phần học khác

- **[Sổ tay Hán tự](https://kotobase.vanhoang.online/kanji):** xem các chữ Hán đã lưu, âm On/Kun, nghĩa, ghi chú và từ vựng liên quan. Popup tra cứu cũng có trong các chế độ học từ vựng.
- **[Ngữ pháp](https://kotobase.vanhoang.online/grammar)** và **[mẫu câu](https://kotobase.vanhoang.online/sentences):** lưu nội dung học theo thư mục riêng.
- **[Luyện nghe N3](https://kotobase.vanhoang.online/listening):** lộ trình luyện nghe 7 tuần.
- **[Ứng dụng trên điện thoại](https://kotobase.vanhoang.online/download):** giao diện tương thích màn hình nhỏ, hỗ trợ cài đặt PWA và sử dụng dữ liệu từ vựng đã lưu trên máy khi mất kết nối. Trang tải cũng cung cấp bản Android.
- **Trang quản trị:** quản lý người dùng và theo dõi mức sử dụng Firestore dành cho tài khoản quản trị.

KotoBase có giao diện sáng/tối và dùng Firebase Authentication cùng Cloud Firestore để đồng bộ dữ liệu khi trực tuyến.

## Công nghệ

Next.js 14 (App Router, Server Actions), React 18, TypeScript, Tailwind CSS, Firebase Authentication, Cloud Firestore và Capacitor cho bản ứng dụng di động.

## Chạy tại máy

Yêu cầu Node.js 18.17+ và một dự án Firebase đã bật Authentication, Cloud Firestore.

```bash
git clone https://github.com/Vcoch27/kotobase.git
cd kotobase
npm install
```

Tạo `.env.local` với cấu hình Firebase của **dự án riêng**:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Chỉ dùng ở phía máy chủ cho các chức năng cần Firebase Admin SDK.
FIREBASE_CLIENT_EMAIL=your_service_account_email
FIREBASE_PRIVATE_KEY=your_service_account_private_key
```

Giữ `FIREBASE_PRIVATE_KEY` ở môi trường máy chủ; không đưa khóa này vào biến `NEXT_PUBLIC_` hoặc commit lên Git. Thiết lập quy tắc Firestore và phương thức đăng nhập Google trong Firebase Console theo dự án của bạn.

```bash
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000). Để kiểm tra mã nguồn: `npx tsc --noEmit` và `npm run build`.

## Góp ý & liên hệ

Nếu gặp lỗi hoặc có ý tưởng cải thiện trải nghiệm học, hãy mở [GitHub Issue](https://github.com/Vcoch27/kotobase/issues).

© 2026 Nguyễn Văn Hoàng · [GitHub](https://github.com/Vcoch27) · [Instagram](https://www.instagram.com/vcoch_27/) · [Email](mailto:vanhoang.vcoch27@gmail.com)
