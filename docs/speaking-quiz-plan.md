# Quiz luyện nói — kế hoạch và tiêu chí nghiệm thu

## Mục tiêu

Thêm một kiểu trả lời trong Quiz: nói tiếng Nhật thay vì gõ. Hai hướng đề: nhìn từ Nhật để đọc, hoặc nhìn nghĩa Việt để nhớ và nói. Giữ nguyên Quiz gõ phím và phạm vi từ vựng hiện tại. Không thêm dịch vụ trả phí, khóa API, lượt đọc Firestore hay thay đổi dữ liệu gốc.

## Các phần triển khai

1. **Nền tảng:** bộ so đáp án tiếng Nhật và bộ điều khiển Web Speech độc lập, kiểm thử bằng recognition giả. Chuẩn hóa Unicode, kana, dấu câu; không dùng khớp chuỗi con, fuzzy acceptance hay confidence làm điểm phát âm.
2. **Phiên nhận giọng:** cấp quyền một lần, kết quả tạm thời trực tiếp, tự lắng nghe lại sau một lượt chưa đúng. Khóa kết quả đúng, vô hiệu sự kiện cũ khi đổi câu, dừng khi rời Quiz/ẩn trang/mất mạng, xử lý lỗi và dọn tài nguyên.
3. **Giao diện:** tab Gõ phím / Luyện nói, hai hướng đề, trạng thái micro thật, bản nhận dạng và lịch sử các lượt gần nhất, gợi ý có chủ ý, thử lại, tạm dừng, bỏ qua, chime khi đúng, đáp án đầy đủ và đếm ngược/Enter/câu tiếp. Tóm tắt và luyện lại từ bỏ qua. Mobile và dark mode.
4. **Kiểm chứng:** unit tests đối chiếu và vòng đời phiên; TypeScript/build; trình duyệt với dữ liệu mẫu và recognition giả; ghi rõ giới hạn kiểm thử micro thực.

## Quyết định thiết kế

- Web Speech `ja-JP`, `interimResults`, tối đa 5 alternatives. Tự nghe dùng continuous để giảm khoảng hở giữa các lượt; giữ–thả dùng phiên riêng, thêm đệm 250 ms khi thả để tránh cắt âm cuối. Kết quả final khớp được nhận ngay; interim khớp giữ ổn định 350 ms, hoặc được giữ lại khi engine kết thúc sớm.
- Chỉ khớp toàn bộ `word` hoặc một cách đọc khai báo rõ trong `reading`. Hỗ trợ cách đọc phân tách bằng `/`, `／`, `;`, `；`, `、`, xuống dòng; không tự sinh cách đọc Kanji, không gộp từ đồng âm hoặc bỏ âm dài/âm ngắt/âm đục.
- Hiện những gì dịch vụ thực sự nhận được. Đối chiếu ký tự chỉ là giải thích văn bản; không gọi đó là điểm phát âm/trọng âm. Không tự đánh sai khi dịch vụ không nghe được.
- Sai được nói lại không giới hạn. Lịch sử giới hạn 6 lượt để tránh bộ nhớ tăng mãi. Im lặng lâu hoặc lỗi yêu cầu thao tác tiếp tục rõ ràng, tránh vòng lặp vô tận.
- Không ghi âm/lưu tiếng nói vào KotoBase. Trình duyệt có thể gửi âm thanh tới dịch vụ của hãng; cần mạng trong cấu hình mặc định. Không hứa hỗ trợ mọi trình duyệt hay offline. Không thêm model lớn cần tải về.
- Nghe mẫu dùng giọng Nhật có sẵn trên thiết bị, tắt micro trước; người học bấm tiếp tục sau khi nghe để không tự chấm tiếng máy.
- Phím tắt theo yêu cầu bổ sung: giữ Space để nói, thả để nhận nốt kết quả; Tab bỏ qua và phát cách đọc. Shift+Tab vẫn di chuyển focus. Không chặn phím trong ô nhập liệu, select hay hộp thoại. Enter chuyển câu sau khi đã chấm, Esc tạm dừng.

## Giới hạn / phần cần người thật xác nhận

Web Speech phụ thuộc trình duyệt, quyền micro, mạng và dịch vụ nhận dạng. Không thể xác minh chất lượng nhận giọng người thật chỉ bằng mock. Cần nói thử tiếng Nhật trên Chrome/thiết bị của người dùng; nếu dịch vụ trả Kanji đồng âm khác mà không có kana đúng, kết quả được báo chưa khớp thay vì đoán đúng. Không yêu cầu cấu hình server.

## Tiến độ

- [x] Khảo sát Quiz, phạm vi học, âm thanh và quota tài khoản.
- [x] Nền tảng và kiểm thử (29 ca bằng Node, recognition và đồng hồ giả).
- [x] Giao diện và tích hợp.
- [x] Kiểm chứng cục bộ: 29 kiểm thử luyện nói + 14 kiểm thử từ vựng, TypeScript, production build và trình duyệt.

## Bổ sung giữ–thả và luyện lại

- Space dùng `stop()` khi thả để giữ kết quả cuối, thay vì `abort()` hủy phát ngôn. Chờ tối đa 3 giây; không tự mở mic ở câu sau trong kiểu giữ–thả. Blur, Escape và sự kiện từ câu cũ được xử lý an toàn.
- Từ có cách đọc 1–2 mora cho phép thêm đúng đuôi `です` để tạo ngữ cảnh ASR, ví dụ `せです`/`背です`. Vẫn đối chiếu toàn bộ từ chính, không khớp chuỗi con, không châm chước thiếu âm/âm khác. UI nhắc chờ mic sẵn sàng để tránh nói trước khi mở mic xong.
- Tab hiển thị đáp án, tắt micro rồi phát cách đọc bằng giọng Nhật trên thiết bị. Đếm ngược chờ âm thanh xong (hoặc lỗi/timeout), có thể chủ động qua câu ngay. Không có giọng Nhật thì báo rõ và tiếp tục phiên.
- Đáp án có nút “Thử lại ngay” và “Nghe & thử lại”. Nút thứ hai chờ phát xong rồi tự mở phiên thử lại. Hủy âm thanh khi đổi câu/rời Quiz.
- Các từ có kết quả final chưa khớp hoặc đã bỏ qua đều vào nhóm “chưa vững”, khử trùng theo ID. Nói đúng sau đó không xóa từ khỏi nhóm này. Cuối phiên người học chọn luyện lại cả nhóm.
- Đối chiếu có hai ô riêng: word và reading. Hiển thị phần văn bản trùng; các cách đọc thay thế khớp cũng được đối chiếu đúng.
- Kiểm tra UI bằng recognition/TTS giả đã xác nhận Tab phát `つよみ`, nghe xong mở lại micro, đối chiếu hai ô, tổng kết giữ từ từng sai rồi nói đúng, và Space không tự mở mic ở câu sau. Ảnh mới: `docs/previews/speaking-quiz/dual-comparison.png`.
- Đã sửa trường hợp khởi tạo giọng TTS ném lỗi làm kẹt trạng thái phát; thêm kiểm thử hồi quy. Bộ preview giữ recognition qua React ref để tránh mất đối tượng khi Fast Refresh.

Nếu cache dev cũ còn giữ JavaScript của phiên trước, chạy preview trên cổng riêng bằng biến `SPEAKING_PREVIEW_PORT` (mặc định 3007). Kiểm tra này dùng dữ liệu giả, không xác nhận chất lượng micro/phát âm thật trên thiết bị người học.

Build cục bộ đã khóa Firestore về `127.0.0.1:9` để không tiêu quota. Build hoàn thành; route cũ `/api/kanji/notes-map` có log kết nối bị từ chối trong bước dựng trang. Tính năng luyện nói không gọi Firestore hoặc API TTS. Bước triển khai dùng quy trình Vercel hiện tại.

## Kết quả kiểm tra giao diện cục bộ

Đã dùng dữ liệu mẫu 3 từ, không đọc Firestore hay mở micro thật. Kiểm tra bằng trình duyệt:

- Sai một lượt rồi tự nghe lại; đúng ở final và interim; nhận đúng câu tiếp theo không cần bật lại.
- Bỏ qua vẫn tiếp tục phiên nghe ở câu sau; tổng kết 2/3 đúng và luyện lại riêng từ bỏ qua.
- Hướng nghĩa Việt không lộ mẹo đọc; nút đối chiếu chủ động hiện cách đọc và phần văn bản trùng.
- Enter chuyển câu, giữ đếm ngược, cài đặt thời gian 1–10 giây.
- Lỗi mạng trả nút thử lại; rời Quiz dừng micro; bật lại do người học chủ động.
- Responsive 390×844, không tràn ngang; giao diện dark mode; ảnh ở `docs/previews/speaking-quiz/`.

Những ảnh này dùng recognition giả để chứng minh luồng giao diện, không chứng minh chất lượng nhận giọng người thật.

Để lặp lại kiểm tra UI: chạy `node scripts/preview-speaking-quiz.cjs`, mở `http://localhost:3007/speaking-qa`, chọn Luyện nói rồi dùng các nút Mock để đưa kết quả nhận dạng vào phiên. Script chỉ bind localhost, khóa kết nối Firestore về endpoint giả cục bộ, tạo route tạm và xóa khi dừng bằng Ctrl+C. Không chạy build/deploy trong khi preview đang mở. Kiểm tra logic: `npm run test:speaking`.

## Tài liệu nền

### Bổ sung đối chiếu đồng âm và phím nghe mẫu (26/10/2026)

- Ngoài chữ và kana chính xác, chấp nhận Kanji đồng âm dựa trên cặp từ/cách đọc đã khai báo trong bộ từ đang tải hoặc từ điển Jisho: `明ける`, `開ける`, `空ける` cùng `あける`. Không suy từ chữ gần giống hay so khớp một phần.
- Mỗi câu tải trước các từ đồng âm qua `/api/jisho` sẵn có (cache server 1 giờ); cache tối đa 128 cách đọc trong phiên trình duyệt, chia sẻ request đồng thời, timeout 5 giây. Không thêm lượt đọc Firestore, API key hoặc dịch vụ tính phí. Khi không tra được từ điển vẫn dùng đối chiếu chữ/kana và dữ liệu đã tải.
- Kết quả từ điển về trễ chỉ đối chiếu lại lượt nhận cuối trong đúng câu/vòng hiện tại; không nhận lại câu đã bỏ qua hay đang phát mẫu. Máy vẫn hiển thị nguyên văn kết quả nhận dạng; phần đối chiếu phân biệt khớp chữ và khớp cách đọc.
- Phím Backquote (`) nghe mẫu trước/sau đáp án; nhả chế độ giữ mic rồi dừng mic trong khi phát. Không kích hoạt lặp khi giữ phím, khi nhập liệu, trong hộp thoại hoặc cùng phím bổ trợ.
- Kiểm thử tập trung: cặp đồng âm/không đồng âm, bảo toàn cặp chữ/cách đọc trong phản hồi từ điển, cache/lỗi mạng, phím tắt và TypeScript. Nhận dạng văn bản không đo cao độ/trọng âm.

- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition
- https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/interimResults

Tài khoản Codex chỉ cung cấp phần trăm giới hạn sử dụng, không cung cấp số token chính xác còn lại. Chia giai đoạn và lưu checklist giúp tiếp nối công việc; không tự mua/reset hạn mức.
