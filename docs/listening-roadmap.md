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

## Bộ đoạn lặp cá nhân và chia sẻ

- Trình phát gọn: thanh tua tô các đoạn đã lưu và highlight A–B hiện tại; một nút tuần tự **Đặt A → Đặt B** tự bật lặp. Bộ chọn đoạn và nút trước/sau nằm ngay dưới điều khiển. Bấm **+** để đặt tên rồi **Lưu đoạn**; sửa/xóa và Public ở menu ⋯. Mỗi thao tác xác nhận lưu một lần; nếu lỗi giữ nháp và hiện **Lưu nháp**. Tối đa 100 đoạn/đề, tên 80 ký tự, mỗi đoạn ít nhất 1 giây.
- **Public bộ đoạn này** trong menu áp dụng ngay khi bật/tắt. Public dành cho mọi tài khoản đã đăng nhập KotoBase, không phải danh sách mời riêng. Người khác chỉ đọc/nghe hoặc sao chép thành bản riêng. Tắt chia sẻ không xóa các bản sao đã được tạo hay nội dung người khác đã tải trước đó.
- Tab **Public** chỉ tải khi mở, 20 bộ/trang; dùng con trỏ document ID, không dùng offset, không cần composite index. Bộ của một người chứa toàn bộ các đoạn nên không cần truy vấn từng đoạn.
- Document riêng: `listening_loop_users/{sha256(uid)}/exams/{driveFileId}`. Snapshot chia sẻ: `listening_loop_groups/{driveFileId}/sets/{sha256(uid)}`. UID chủ sở hữu luôn lấy từ phiên máy chủ; không nhận UID tùy ý để sửa bộ của người khác. Snapshot nhóm không chứa email.
- Cache máy chủ: riêng theo tài khoản/đề 1 giờ, nhóm theo đề/con trỏ 5 phút; xác thực nằm ngoài cache. Lưu sẽ vô hiệu hóa cache liên quan. Bộ nhớ trình duyệt giữ kết quả 5 phút và nháp chưa lưu theo tài khoản/đề; không dùng localStorage, polling hay `onSnapshot`. Nút tải bản mới bỏ qua cache khi người học cần cập nhật ngay.
- Cache miss bộ riêng thường đọc 1 document; chọn đoạn/nghe lặp không đọc Firestore. Nhóm đọc tối đa 20 document mỗi trang cache miss (query rỗng vẫn có chi phí tối thiểu của Firestore). Lưu dùng transaction: 1 lượt đọc để kiểm tra revision, 1 write riêng và thêm 1 write/delete khi chia sẻ; tranh chấp có thể khiến transaction thử lại. Không ghi theo vị trí phát hay mỗi lần gõ.
- Revision chống ghi đè khi nhiều tab/thiết bị sửa cùng bộ. Nếu xung đột, giữ nháp và yêu cầu tải bản mới; không tự ghi đè. Nháp còn khi đổi bài trong phiên, và có cảnh báo khi đóng/tải lại trang với nháp chưa lưu.
- Rules Firestore hiện tại đã kiểm tra: chặn mọi đọc/ghi từ SDK trình duyệt. Feature chỉ dùng Admin SDK qua Server Actions có xác thực; không thay rules hay ghi dữ liệu thử vào Firestore thật.
- Kiểm thử cô lập: `node --test scripts/test-listening-loops.cjs` (validation, quyền, cache, revision, chia sẻ, phân trang; không truy cập database thật).

- Bộ riêng tải khi mở trình phát (có cache), Public vẫn chỉ tải khi chọn tab. Không đọc lại khi tua/đổi đoạn. Chế độ Drive, âm lượng và toàn màn hình nằm trong menu trình phát. Video giới hạn 45vh để giữ điều khiển và bộ chọn đoạn gần nhau trên mobile.
