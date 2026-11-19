# Thêm bài nghe vào `/choukai`

Trang hiện dùng dữ liệu tĩnh trong kho mã. Mỗi bài gồm **một file audio** và **một mục JSON có các câu được căn theo audio**. Không cần tạo bản ghi Firestore cho trang này.

## Bạn cần chuẩn bị gì?

Cho **mỗi bài**, gửi:

1. **Audio gốc**: MP3 là tiện nhất; M4A, WAV và OGG cũng được chấp nhận. Nếu hiện chỉ có video, gửi video để trích audio. File Google Drive cần được chia sẻ sao cho có thể tải xuống; link xem thư mục không tự trở thành URL phát audio của trình duyệt.
2. **Script tiếng Nhật** theo đúng thứ tự phát, tốt nhất có tên người nói và chia từng câu. DOCX, PDF, Google Docs, SRT, VTT hoặc văn bản thường đều dùng làm nguồn biên tập được. Nếu chưa có script, có thể chép lời từ audio, nhưng cần nghe kiểm lại tên riêng, chữ Hán và chỗ ngắt câu.
3. **Tên bài và nhóm** muốn hiển thị ở thư viện, ví dụ `N3 · Hội thoại` / `Bài 1 · Đặt lịch hẹn`. Nhóm mới sẽ xuất hiện tự động; `id` phải duy nhất.
4. **Bản dịch Việt** nếu đã có. Nếu chưa có, có thể biên dịch khi nhập bài. Cần một bản dịch cho từng câu để bật/tắt song ngữ và đối chiếu ở chế độ nghe–gõ.
5. **Link tài liệu gốc** để nút “Xem tài liệu gốc” dẫn tới đúng nguồn. Nếu chỉ có audio, có thể dùng link file gốc được chia sẻ.

Mốc thời gian không bắt buộc phải được cung cấp sẵn. Nếu có SRT/VTT với thời gian từng câu, việc nhập sẽ nhanh hơn. Nếu không, cần tạo và nghe kiểm mốc trên **chính file audio sẽ phát trên web**; dùng số giây thập phân, chẳng hạn `4.22` đến `6.99`. Chú ý chừa đủ đầu và cuối câu để chế độ nghe–gõ không cắt tiếng.

## Thêm vào kho mã ở đâu?

1. Đặt audio ở `public/choukai/<ten-file>.mp3` (hoặc đuôi tương ứng). Nên dùng tên không dấu, không khoảng trắng, ví dụ `n3-dat-lich-01.mp3`.
2. Sao chép một mục từ [mẫu JSON](./choukai-lesson-template.json) vào mảng `src/data/choukai-lessons.json`. Đường dẫn `audio` phải là `/choukai/<ten-file>`. `filename` là tên hiển thị. `group` là mã nhóm; `groupLabel` là nhãn nhóm tùy chọn.
3. Mỗi mục `cues` là một **câu nghe được** với `start`, `end`, `speaker`, `ja`, `vi`. Sắp xếp theo thời gian. Ghi furigana trong `ja` bằng `漢字(かな)`, ví dụ `今日(きょう)`; khi kiểm tra chính tả ở chế độ nghe–gõ, furigana được bỏ đi. Không chèn HTML ruby vào JSON.
4. Chạy `npm run choukai:validate` để kiểm tra JSON, ID trùng, file audio, thời lượng và mốc câu. Nếu `ffprobe` có trên máy, lệnh cũng so thời điểm kết thúc với thời lượng audio. Sau đó chạy `npm run build` và thử cả hai chế độ trên `/choukai`.

## Đưa bài cho mình để nhập giúp

Bạn có thể gửi một thư mục Drive chứa các file, hoặc đính kèm từng audio/video và script. Chỉ cần nói **nhóm, tên bài và thứ tự**; nếu không có mốc hoặc bản dịch, mình sẽ tạo chúng và kiểm tra lại với audio. Không cần tự sửa JSON.

Hiện thư viện có 8 bài (4 TNCS, 4 TNCN). Số bài và danh sách nhóm trên giao diện được lấy từ dữ liệu, nên thêm nhóm/bài mới không cần sửa bộ đếm hay mã giao diện.
