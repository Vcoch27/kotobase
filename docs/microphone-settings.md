# Micro & luyện nói

Truy cập từ Cài đặt → Micro & luyện nói · Test mic, nút cài đặt mic trong Quiz hoặc `/?settings=microphone`.

- Chọn mic, yêu cầu lọc ồn/khử vọng/tự cân bằng âm lượng nếu trình duyệt cung cấp. UI hiển thị trạng thái thực từ `getSettings()`, không chỉ từ checkbox đã chọn.
- Web Audio lọc high-pass 80 Hz và gain 25–200%; thanh mức âm sau xử lý hiển thị khoảng -60 đến 0 dBFS, có cảnh báo tín hiệu nhỏ/clipping.
- Thu thử tối đa 8 giây (giới hạn 5 MB), ghi bằng MediaRecorder từ luồng đã xử lý. Chỉ lưu Blob trong bộ nhớ, thu xong mới nghe lại; không nối mic trực tiếp tới loa. Object URL được thu hồi khi xóa, thử lại hoặc đóng modal.
- Chọn loa nghe thử khi `setSinkId` được hỗ trợ; không thay đổi loa hệ thống hoặc giọng TTS toàn ứng dụng.
- Cài đặt mic lưu localStorage trên thiết bị. Mở cài đặt hoặc lưu sẽ dừng ASR Quiz hiện tại, tránh hai phiên cùng chiếm mic. Quyền mở mic chỉ xin khi người học bấm Test/mở mic Quiz, không tự xin khi mở modal.
- Chrome/Chromium máy tính từ 135 và Edge tương ứng hỗ trợ `SpeechRecognition.start(audioTrack)` theo MDN BCD. Dùng gate tương thích thận trọng, loại Android/iOS/Safari/Opera. Đưa track đã lọc vào ASR, không mở một luồng để đo rồi âm thầm nhận dạng luồng khác. Nếu đường track bị lỗi, báo lỗi rõ, không âm thầm đổi sang mic mặc định.
- Trình duyệt khác: Test mic vẫn dùng bộ lọc theo khả năng; ASR dùng đường mic mặc định do trình duyệt quản lý. UI công khai giới hạn này. Không hứa Krisp/RNNoise hay khử mọi tiếng ồn.
- Đóng, chuyển trang, kết thúc, thả Space, lỗi và quyền trả về muộn đều có xử lý giải phóng track/context. ASR giữ track đích tới khi chốt kết quả sau khi thả Space, nhưng dừng track mic gốc ngay.

## Kiểm tra

`npm run test:microphone`, `npm run test:speaking`, `npm run test:vocabulary`, TypeScript và build. Preview dùng thiết bị âm thanh mô phỏng, không thu tiếng trong phòng. Cần người thật nói thử để đánh giá mức cải thiện lọc ồn và độ chính xác nhận giọng.

Đã qua 11 ca unit microphone (settings, tương thích, meter, đồ thị xử lý, quyền trả về muộn, adapter track và cleanup), 29 ca Quiz nói và 14 ca từ vựng. Kiểm tra UI với nguồn sine mô phỏng: meter có tín hiệu, ghi/tự dừng 8 giây có bản nghe lại, lưu cài đặt rồi Quiz nhận đúng qua track xử lý, từ chối quyền và thử lại, Tab trong modal không bỏ qua Quiz, bố cục 390×844 không tràn ngang. Ảnh tại `docs/previews/microphone/`.

## Phát hành thông báo

`node scripts/publish-microphone-notification.cjs` xem trước, không đọc DB. Chỉ chạy `--apply` sau khi Vercel Ready. Một ID cố định, dùng create để không tạo thông báo trùng; một read xác minh. Dùng luồng thông báo hệ thống hiện có (chuông + toast), không gửi email hay xin quyền thông báo hệ điều hành.

Nguồn: [Web Speech start](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition/start), [MDN BCD](https://github.com/mdn/browser-compat-data/blob/main/api/SpeechRecognition.json), [noiseSuppression](https://developer.mozilla.org/en-US/docs/Web/API/MediaTrackConstraints/noiseSuppression).
