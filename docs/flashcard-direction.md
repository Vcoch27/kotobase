# Đổi hướng Flashcard

Vị trí: Flashcard → hàng Hướng học ngay dưới Bình thường / Tiến độ / Anki và trên hàng Phát âm.

- Nhật → Việt: xem từ Nhật trước, lật để xem cách đọc, nghĩa, Hán Việt và ví dụ.
- Việt → Nhật: xem nghĩa Việt trước (không hiện mẹo cách đọc); lật để xem từ Nhật, cách đọc, Hán Việt, nghĩa và ví dụ.
- D đổi nhanh giữa hai hướng khi không nhập liệu hoặc mở hộp thoại. Không bắt Ctrl/Alt/Meta+D và không đổi lặp khi giữ phím.
- Đổi hướng đưa thẻ về mặt trước, giữ nguyên từ đang học và lưu hướng trên thiết bị.

Kiểm tra localhost bằng fixture: bấm Việt → Nhật, mặt trước hiển thị Điểm mạnh, thế mạnh; D chọn lại Nhật → Việt; bấm lại Việt → Nhật kiểm tra mẹo tsuyomi đã ẩn ở mặt trước. Ảnh: `docs/previews/flashcard-direction.png`.

Bản Antigravity 5b9a938 có state/render hai hướng nhưng thiếu nút và nhánh xử lý D. Bản sửa nối cả hai vào thao tác thật, đồng thời chuyển ghi localStorage/reset mặt thẻ ra khỏi state updater.
