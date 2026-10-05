# 🔔 QUY TẮC PHÁT HÀNH & TẠO THÔNG BÁO CẬP NHẬT KOTOBASE

Tài liệu này quy định quy trình chuẩn trước khi `push` mã nguồn lên nhánh `main` khi có thay đổi liên quan đến **giao diện (UI)**, **trải nghiệm người dùng (UX)** hoặc **tính năng mới**.

---

## 🎯 1. Khi nào BẮT BUỘC tạo thông báo?
Cần tạo thông báo mới trong các trường hợp:
1. **Thêm tính năng mới (`feature`)**: Ví dụ tra cứu Kanji trong thư mục, chế độ học mới, phím tắt mới.
2. **Cải tiến trải nghiệm người dùng (`improvement`)**: Đổi layout 2 cột, tối ưu responsive mobile, tăng tốc độ tải trang.
3. **Sửa lỗi quan trọng (`fix`)**: Khắc phục xung đột phím tắt trình duyệt, sửa lỗi đồng bộ dữ liệu.
4. **Thông báo hệ thống (`announcement`)**: Bảo trì, ra mắt phiên bản mới, v.v.

---

## ⚡ 2. Cách tạo thông báo (Dành cho Lập trình viên)

### Cách 1: Chạy lệnh tương tác (Khuyên dùng khi làm thủ công)
Trong terminal, chạy:
```bash
npm run notify
```
Hệ thống sẽ hỏi lần lượt:
- Tiêu đề (ngắn gọn, hấp dẫn)
- Tóm tắt (1-2 câu hiển thị trên Toast trượt góc)
- Nội dung chi tiết (hỗ trợ xuống dòng)
- Loại thông báo (feature / improvement / fix / announcement)
- Phiên bản (ví dụ `v2.5.0` hoặc bỏ trống)

---

### Cách 2: Chạy 1 dòng lệnh duy nhất (Một bước)
```bash
node scripts/create-notification.js --title "Giao diện Hán tự 2 cột" --summary "Danh sách Hán tự trong thư mục được chia làm 2 cột trực quan, không còn bị kéo dài." --content "Cải tiến giao diện hiển thị danh sách Hán tự dạng 2 cột trên máy tính và tự co giãn 1 cột trên điện thoại. Bổ sung nhãn Hán Việt và mẹo nhớ trực quan." --type "improvement" --version "v2.5.0"
```

---

### Cách 3: Prompt ngắn gọn cho AI Assistant 🤖
Khi làm việc cùng AI Coding Assistant (Antigravity), bạn chỉ cần gõ 1 câu lệnh ngắn:
> **"Tạo thông báo release cho tính năng vừa hoàn thành rồi push main"**

AI sẽ tự động nhận diện các thay đổi vừa thực hiện, soạn tiêu đề và tóm tắt chuẩn tiếng Việt, chạy script tạo thông báo lên Firestore, kiểm tra build và push code lên GitHub.

---

## 🛡️ 3. Cơ chế Tối ưu Lượt Đọc/Ghi Firestore
Hệ thống thông báo được thiết kế để **tiết kiệm tối đa chi phí Firestore**:
- **Layer 1 (Server Cache)**: Sử dụng Next.js `unstable_cache` với tag `system_notifications` và TTL 1 giờ. Hàng nghìn người dùng truy cập web cũng chỉ tiêu tốn **1 lượt đọc Firestore duy nhất**.
- **Layer 2 (Client Cache)**: Danh sách ID đã đọc được lưu tức thì vào `localStorage`. Khi mở web, giao diện phản hồi 0ms không cần đợi server.
- **Layer 3 (User Sync)**: Với người dùng đã đăng nhập Google, trạng thái đã đọc được gộp và lưu vào `users/{uid}` khi có thao tác đọc. Khách vãng lai dùng `localStorage` mà không ghi Firestore.
