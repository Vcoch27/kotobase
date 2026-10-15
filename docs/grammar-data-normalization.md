# Chuẩn hóa dữ liệu `/grammar`

Trang ngữ pháp ghép 100 bài Shin Kanzen từ collection Firestore `grammars` với 308 bài Tiếng Nhật Đơn Giản trong `data/tiengnhatdongian-n3-summary.json`. Bài đầy đủ của bộ thứ hai lấy từ `data/tiengnhatdongian-n3-parsed.json`.

Định dạng mới giữ câu Nhật thuần trong `example` và `examples[].jpn` để tìm kiếm, sao chép, phát âm. Cách đọc nằm ở `exampleRuby` và `examples[].ruby`; các trường `structure`, `formation`, `meaning`, `nuance` có cặp `...Ruby` khi nguồn có furigana. Dấu `{漢字|かな}` chỉ được chuyển thành thẻ `<ruby>` qua React, không đưa HTML chưa kiểm tra vào trang.

Quy trình tái tạo:

1. `node scripts/export-grammar-firestore.cjs` tạo bản sao Firestore trong `tmp/grammar-firestore-backup-2026-10-15.json` (không commit).
2. `python -X utf8 scripts/normalize-grammar-data.py --apply-local` tạo bản xem trước, bộ tóm tắt và ví dụ chi tiết đã chuẩn hóa.
3. `node scripts/verify-grammar-normalization.cjs` đối chiếu đủ 408 bài, tính hợp lệ của furigana và các câu ví dụ.
4. `node scripts/apply-grammar-normalization.cjs --apply` ghi 100 bài Firestore trong một transaction, chỉ khi chúng vẫn khớp bản sao. Chạy không có `--apply` để kiểm tra trước.

Các cách đọc được lấy từ ruby trong bài nguồn và một danh sách nhỏ được đối chiếu thủ công. Những cặp chữ Hán/kana không xác định chắc chắn được giữ nguyên; không đoán cách đọc rồi xóa chữ. Nội dung HTML bài gốc vẫn giữ để người học đối chiếu khi cần.
