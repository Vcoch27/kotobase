# Luyện nghe N3 — 49 buổi, nguồn Google Drive

Route: `/listening`; mở từ sidebar kho từ vựng hoặc **Nghe N3** trên điện thoại.

Yêu cầu phiên đăng nhập Google hợp lệ ở cả trang và API phát video. Mật khẩu workspace không thay thế đăng nhập Google. Khách thấy màn hình đăng nhập; API trả 401 trước khi gọi Drive. Service worker không lưu/phục vụ offline trang và API luyện nghe. Quyền chia sẻ công khai của các file trên Drive không bị thay đổi.

- 7 tuần × 7 buổi, không gán ngày lịch, không lưu tiến độ và không xuất sheet.
- 26 file MP4 trong thư mục công khai của người dùng, đối chiếu năm/tháng ngày 2026-09-17. ID được lưu cố định, không phụ thuộc thứ tự file hay quyền connector khi chạy web.
- Trình phát HTML video đọc nguồn Drive trực tiếp, hỗ trợ tua, tốc độ, A–B tối thiểu 1 giây. Chuyển bài hoặc đóng player sẽ dừng media và hủy bộ đếm.
- Nếu tải trực tiếp lỗi: thử lại, chuyển sang iframe Drive preview hoặc mở file trong tab mới. Preview không cung cấp điều khiển A–B từ web.
- Route `/api/listening/[fileId]` truyền video từ Drive theo HTTP Range, tối đa 2 MiB mỗi phản hồi, không nạp cả file vào bộ nhớ. Chỉ cho phép 26 ID đã biết; áp dụng cookie mật khẩu hiện có. Không đưa video vào Git. Drive vẫn cần quyền xem/tải công khai và có thể giới hạn lưu lượng.
- Dark mode sử dụng token riêng trong `src/app/listening/listening.css`: nền sáng hơn, chữ phụ rõ hơn và trạng thái chọn xanh trầm; không đổi theme các trang khác.

## Chiến lược

Nghe lần đầu → chữa câu sai/đoán → nghe không nhìn chữ → ôn +1/+3/+7 buổi.
Buổi thường 20–30 phút; khi bận 10 phút; thi thử 35–45 phút liền mạch.
Giữ 07/2024, 12/2024, 07/2025 đến tuần 6–7. Nếu đã học thì thay bằng đề dự phòng chưa nghe.
Mốc ≥80% trên ít nhất hai đề mới là tiêu chí luyện tập đề xuất, không quy đổi sang điểm JLPT.

## Kiểm tra gọn

TypeScript, build production; kiểm tra 26 ID duy nhất, đủ tham chiếu cho 49 buổi.
Nguồn mẫu 07/2013 trả video/mp4 với HTTP 206 khi yêu cầu một đoạn dữ liệu.
Kiểm tra trình phát thực tế trên trình duyệt; quyền Drive/giới hạn lưu lượng có thể thay đổi.

## Nguồn

- [Thư mục Drive](https://drive.google.com/drive/folders/1isCyV5eflOsZCAR2bgJVRg_tABV1pagu)
- [Cấu trúc JLPT](https://www.jlpt.jp/e/guideline/testsections.html)
- [JLPT FAQ](https://www.jlpt.jp/e/faq/)
