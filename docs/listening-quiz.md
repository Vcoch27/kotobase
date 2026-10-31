# Quiz Nghe & hiểu

## Luồng học

Phần Nghe được chuyển từ Flashcard sang Quiz. Flashcard còn Bình thường, Tiến độ và Anki; nút **Nghe → Quiz** mang đúng ID các từ trong phạm vi đang học sang **Quiz → Nghe & hiểu**. Vẫn giữ điều kiện đăng nhập Google của Quiz và cơ chế tải đầy đủ phạm vi học hiện có.

Mỗi câu có ba bước:

1. Phát từ bằng giọng TTS/âm lượng phát âm đã cài đặt. Chờ sự kiện kết thúc âm thanh thật mới cho nhập kana/Kanji. Có Nghe lại, Nghe chậm và dừng âm thanh; không hiện từ/cách đọc/nghĩa/ví dụ.
2. Chốt phần gõ rồi chọn nghĩa tiếng Việt và **Chắc nghĩa này** hoặc **Còn phân vân / đang đoán**. Chưa báo phần gõ đúng/sai, cũng không nhắc lại chữ đã gõ để tránh bật mí. Có **Chưa nghe ra từ · Thử phần nghĩa** và **Chưa nhớ nghĩa** để ghi kết quả trung thực thay vì ép đoán.
3. Chỉ sau khi chốt cả hai phần hoặc chủ động bỏ qua mới hiện toàn bộ từ, cách đọc, nghĩa, ví dụ và phần trả lời ở từng bước. Gõ đúng + chọn nghĩa đúng + tự tin mới tính là vững trong phiên; chưa chắc vẫn luyện lại.

Kết quả đúng cả hai bước và tự tin có đếm ngược (dùng thời gian Quiz hiện có), giữ đáp án hoặc Enter để chuyển. Câu sai/chưa chắc/bỏ qua được giữ để đối chiếu, có thể tiếp tục đếm hoặc chuyển tay. Cuối bộ thống kê riêng nghe/gõ, nghĩa và các từ cần luyện lại, kèm nguyên nhân cho từng từ.

Một lần chọn đúng không chứng minh đã hiểu 100%; trắc nghiệm vẫn có thể đoán trúng và mức tự tin là tự báo cáo. Thiết kế giảm việc chỉ nhận ra nghĩa sau khi xem đáp án, nhưng không gọi đây là đánh giá hiểu nghĩa chắc chắn hoặc điểm SRS lâu dài. Kết quả lưu trong phiên trên thiết bị, không ghi vào Firebase.

## Câu hỏi nghĩa

- Dùng tối đa bốn nghĩa từ bộ từ đã tải, không tạo nghĩa bằng AI hay đọc thêm Firestore.
- Loại mẹo `<<...>>`, chữ Nhật trong lựa chọn, nghĩa trùng/chia sẻ biến thể rõ ràng, từ cùng chữ và những từ đồng âm đã biết.
- Không dùng nghĩa của từ đồng âm làm đáp án nhiễu vì chỉ một từ đơn lẻ không đủ ngữ cảnh phân biệt các nghĩa đó.
- Khi không có ít nhất hai nghĩa phân biệt được: yêu cầu tự ghi nghĩa trước khi bật đáp án. Kết quả nghĩa là **Chưa kiểm chứng**, không tự chấm đúng theo chuỗi tiếng Việt và không tính là vững. Không bịa đáp án cho đủ bốn lựa chọn.
- Chấp nhận đúng chữ Nhật, kana/katakana, biến thể chữ đã khai báo và từ đồng âm có cách đọc trong dữ liệu đã tải. Không dùng fuzzy/chuỗi con hoặc bỏ mora cho bài nghe/gõ.

## Phím tắt và vòng đời

- Backquote (`): nghe lại; Tab: chủ động bỏ qua rồi xem đáp án; Shift+Tab giữ điều hướng; Enter: chốt phần gõ/chốt nghĩa/chuyển câu; 1–4: chọn nghĩa khi không ở ô nhập.
- Không xử lý Enter khi IME còn composition hoặc keyCode 229. Không bắt phím trong hộp thoại, ô tìm kiếm khác, textarea/chọn phạm vi, hoặc tổ hợp Ctrl/Alt/Meta.
- Đổi câu/phạm vi, rời chế độ hoặc ẩn trang dừng âm thanh và vô hiệu callback cũ. Yêu cầu TTS về muộn không được phát sang câu mới. Không tự phát lại khi chỉ quay lại từ tab trình duyệt khác.
- Giữ phân tách âm lượng phát âm và SFX từ bản trước. `playAudio` có callback phát/kết thúc/lỗi, tùy chọn tốc độ và generation fence; các nơi gọi cũ vẫn dùng chữ ký cũ được. Hủy voice listener/timer khi dừng, dùng lại cache TTS hiện có. Không mở micro.
- Không giả lập thời gian phát 3 giây như thẻ nghe cũ. Chưa tải được giọng, âm lượng 0, lỗi phát hoặc thiếu giọng Nhật phải có trạng thái rõ và không giả là đã nghe xong. Watchdog 20 giây để không kẹt vô hạn.

## Kiểm tra

- `npm run test:listening`: logic nghe/gõ và đồng âm; lựa chọn nghĩa không lộ mẹo/không trùng; bộ nhỏ; chấm độc lập và tự tin; audio state/cancellation/timeout; TTS thiết bị và KotoBase AI/cache/phản hồi muộn. Dùng dữ liệu giả, không gửi âm thanh/API hoặc đọc DB.
- `node scripts/preview-listening-quiz.cjs`: route localhost tạm ở cổng 3134. Mock speech synthesis, khóa Firestore về `127.0.0.1:9`, tắt SFX; không phát tiếng thật. Có nút đổi một/bốn từ, chọn hai từ, mở Flashcard, giữ/làm lỗi audio và đổi active.
- UI đã kiểm tra: chờ audio kết thúc mới gõ; gõ sai vẫn chưa lộ đáp án trước bước nghĩa; sai gõ/đúng nghĩa; đúng gõ/sai nghĩa; đúng cả hai nhưng phân vân; câu vững; tổng kết 1/4 vững, 3 nghe/gõ đúng, 3 chọn nghĩa đúng, luyện lại đúng 3 từ; mang đúng 2 từ từ Flashcard; lỗi audio; Enter, Tab; bộ một từ không tự chấm nghĩa; màn hình điện thoại không tràn ngang.
- Ảnh mô phỏng: `docs/previews/listening-quiz/meaning-step.png`, `summary.png`, `mobile.png`. Chúng xác minh luồng, không xác minh chất lượng giọng thật/khả năng nhận âm hay khả năng hiểu của người thật.
- Xóa route QA trước build/deploy. Bản build cục bộ khóa Firestore về endpoint giả để không tiêu quota; route cũ `api/kanji/notes-map` có thể log lỗi kết nối khi prerender, cần xem mã thoát cuối của build.
