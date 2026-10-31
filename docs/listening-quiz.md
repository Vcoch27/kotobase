# Quiz Nghe & hiểu

## Luồng học

Phần Nghe được chuyển từ Flashcard sang Quiz. Flashcard còn Bình thường, Tiến độ và Anki; nút **Nghe → Quiz** mang đúng ID các từ trong phạm vi đang học sang **Quiz → Nghe & hiểu**. Vẫn giữ điều kiện đăng nhập Google của Quiz và cơ chế tải đầy đủ phạm vi học hiện có.

Mỗi câu có ba bước:

1. Phát từ bằng giọng TTS/âm lượng phát âm đã cài đặt. Chờ sự kiện kết thúc âm thanh thật mới cho nhập kana/Kanji. Có Nghe lại, Nghe chậm và dừng âm thanh; không hiện từ/cách đọc/nghĩa/ví dụ.
2. Chốt phần gõ bằng Enter hoặc **Sang nghĩa**, rồi bấm một nghĩa tiếng Việt hoặc phím **1–4**. Chọn là chấm và chuyển ngay sang đối chiếu, không hỏi mức chắc chắn và không có nút chốt nghĩa thêm. Trước khi chọn nghĩa vẫn không báo phần gõ đúng/sai hoặc nhắc lại chữ đã gõ.
3. Sau khi chọn nghĩa hoặc chủ động bỏ qua mới hiện toàn bộ từ, cách đọc, nghĩa, ví dụ và phần trả lời ở từng bước. Gõ đúng + chọn nghĩa đúng tính là đúng cả hai bước trong phiên; sai hoặc bỏ qua vẫn luyện lại.

Mọi kết quả, gồm cả câu sai/bỏ qua, tự đếm ngược theo thời gian hiện đáp án Quiz đang cài (1–10 giây). Có thể chủ động giữ đáp án hoặc Enter để chuyển sớm. Cuối bộ thống kê riêng nghe/gõ, nghĩa và các từ cần luyện lại, kèm nguyên nhân cho từng từ.

Một lần chọn đúng không chứng minh đã hiểu 100%; trắc nghiệm vẫn có thể đoán trúng. Thiết kế giảm việc chỉ nhận ra nghĩa sau khi xem đáp án, nhưng không gọi đây là đánh giá hiểu nghĩa chắc chắn hoặc điểm SRS lâu dài. Kết quả lưu trong phiên trên thiết bị, không ghi vào Firebase.

## Câu hỏi nghĩa

- Dùng tối đa bốn nghĩa từ bộ từ đã tải, không tạo nghĩa bằng AI hay đọc thêm Firestore.
- Loại mẹo `<<...>>`, chữ Nhật trong lựa chọn, nghĩa trùng/chia sẻ biến thể rõ ràng, từ cùng chữ và những từ đồng âm đã biết.
- Không dùng nghĩa của từ đồng âm làm đáp án nhiễu vì chỉ một từ đơn lẻ không đủ ngữ cảnh phân biệt các nghĩa đó.
- Khi không có ít nhất hai nghĩa phân biệt được: yêu cầu tự ghi nghĩa trước khi bật đáp án. Kết quả nghĩa là **Chưa kiểm chứng**, không tự chấm đúng theo chuỗi tiếng Việt và không tính là vững. Không bịa đáp án cho đủ bốn lựa chọn.
- Chấp nhận đúng chữ Nhật, kana/katakana, biến thể chữ đã khai báo và từ đồng âm có cách đọc trong dữ liệu đã tải. Không dùng fuzzy/chuỗi con hoặc bỏ mora cho bài nghe/gõ.

## Phím tắt và vòng đời

- Backquote (`): nghe lại ngay cả khi đang nhập đáp án/IME, không chèn ký tự vào ô; listener capture bắt trước xử lý ô nhập. Tab: chủ động bỏ qua; Shift+Tab giữ điều hướng; Enter: sang phần nghĩa/chuyển câu; 1–4 (cả hàng số/numpad): chọn và chấm nghĩa ngay.
- Vẫn chặn Enter và phím chọn nghĩa khi IME còn composition/keyCode 229; chỉ ưu tiên Backquote. Không can thiệp hộp thoại, ô tìm kiếm ngoài Quiz, select hoặc tổ hợp Ctrl/Alt/Meta. Bộ một từ dùng textarea tự đối chiếu vẫn có nút Xem đối chiếu vì không có phương án để chọn.
- Đổi câu/phạm vi, rời chế độ hoặc ẩn trang dừng âm thanh và vô hiệu callback cũ. Yêu cầu TTS về muộn không được phát sang câu mới. Không tự phát lại khi chỉ quay lại từ tab trình duyệt khác.
- Giữ phân tách âm lượng phát âm và SFX từ bản trước. `playAudio` có callback phát/kết thúc/lỗi, tùy chọn tốc độ và generation fence; các nơi gọi cũ vẫn dùng chữ ký cũ được. Hủy voice listener/timer khi dừng, dùng lại cache TTS hiện có. Không mở micro.
- Không giả lập thời gian phát 3 giây như thẻ nghe cũ. Chưa tải được giọng, âm lượng 0, lỗi phát hoặc thiếu giọng Nhật phải có trạng thái rõ và không giả là đã nghe xong. Watchdog 20 giây để không kẹt vô hạn.

## Kiểm tra

- `npm run test:listening`: logic nghe/gõ và đồng âm; lựa chọn nghĩa không lộ mẹo/không trùng; bộ nhỏ; chấm hai bước không cần mức tự tin; Backquote trong ô nhập/IME, phím 1–4, Enter/Tab; audio state/cancellation/timeout; TTS thiết bị và KotoBase AI/cache/phản hồi muộn. Dùng dữ liệu giả, không gửi âm thanh/API hoặc đọc DB.
- `node scripts/preview-listening-quiz.cjs`: route localhost tạm ở cổng 3134. Mock speech synthesis, khóa Firestore về `127.0.0.1:9`, tắt SFX; không phát tiếng thật. Có nút đổi một/bốn từ, chọn hai từ, mở Flashcard, giữ/làm lỗi audio và đổi active.
- UI kiểm tra cho lần cập nhật này: Backquote khi ô nhập đang focus giữ nguyên `つよみ`, phát lại tăng từ 1 lên 2; Enter sang nghĩa; phím 1 chấm sai ngay, đếm ngược 8 giây rồi tự chuyển câu 2; bấm nghĩa đúng chấm ngay cả hai bước. Không còn phần hỏi mức chắc chắn/nút chốt nghĩa. Các luồng bộ nhỏ, phạm vi Flashcard, lỗi audio và giao diện điện thoại đã kiểm tra ở lần triển khai trước.
- Ảnh mô phỏng: `docs/previews/listening-quiz/meaning-step.png`, `summary.png`, `mobile.png`. Chúng xác minh luồng, không xác minh chất lượng giọng thật/khả năng nhận âm hay khả năng hiểu của người thật.
- Xóa route QA trước build/deploy. Bản build cục bộ khóa Firestore về endpoint giả để không tiêu quota; route cũ `api/kanji/notes-map` có thể log lỗi kết nối khi prerender, cần xem mã thoát cuối của build.
