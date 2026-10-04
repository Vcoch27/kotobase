# Ôn tập theo lượt: kế hoạch và triển khai

## Mục tiêu
Giữ vai trò riêng của Ôn tập: một bảng nhiều từ để tự gợi nhớ, mở đáp án và đánh giá. Flashcard vẫn là luồng thẻ đơn; Quiz vẫn kiểm tra bằng gõ đáp án. Quản lý/xóa từ nằm ở Tổng quan.

## Tham khảo
- Anki learning steps: https://docs.ankiweb.net/deck-options — câu trả lời quyết định lần gặp tiếp theo; nhớ một lần không đồng nghĩa hoàn tất học.
- Quizlet Write: https://help.quizlet.com/hc/en-ca/articles/360030990531-Studying-with-Write-mode — tập trung lại vào từ sai và yêu cầu nhiều lần nhớ đúng.

Áp dụng nguyên tắc luyện nhớ nhiều lần, không sao chép thuật toán SRS hay giao diện thẻ đơn.

## Kế hoạch đã triển khai
1. Tách bộ lập lượt thành hàm thuần có kiểm thử.
2. Bảng tối đa 6 từ. Thẻ chưa mở gọn theo nội dung; thẻ đang mở tự giãn và chiếm cả hàng trên desktop để đọc đáp án dài. Không đặt chiều cao cố định hoặc vùng cuộn trong thẻ. Bấm từ để mở; đánh giá chỉ khả dụng sau khi mở.
3. Nhớ 2/3/4 lần liên tiếp mới đạt trong phiên. Chưa nhớ đặt chuỗi về 0, tăng số lần quên và đến hạn ngay lượt kế tiếp. Nhớ nhưng chưa đạt được hẹn sau 1/2/3 lượt.
4. Từ đã đánh giá được thu khỏi bảng, không giữ ô trống. Khi toàn bộ từ trong lượt đã đánh giá, người học chủ động chuyển lượt bằng nút hoặc Enter. Fisher–Yates trộn các từ cùng ưu tiên; hạn cũ trước để tránh bỏ quên từ; số lần quên phá hòa. Không lặp cùng từ trong một bảng.
5. Nếu không còn từ đến hạn, chuyển đến lượt có từ cần ôn gần nhất. Không tạo bảng trống hoặc chờ vô hạn với bộ chỉ có một từ.
6. Cho đổi chiều Nhật–Việt, Việt–Nhật hoặc xen kẽ theo số lượt. Thiết lập mới bắt đầu phiên mới và xác nhận trước khi bỏ tiến độ.
7. Hoàn tác đánh giá gần nhất; theo dõi nhóm cần ôn và đã đạt. Lưu bằng sessionStorage theo tài khoản, thư mục và tập ID; sửa nội dung/sắp xếp không xóa tiến độ. Đổi phạm vi có phiên riêng. Đóng tab có thể mất phiên; không đồng bộ đa thiết bị.
8. Kiểm thử logic, TypeScript, production build và kiểm tra giao diện bằng dữ liệu giả.

## Giới hạn rõ ràng
“Đã đạt” chỉ có nghĩa đạt mục tiêu của phiên này. Chưa thêm lịch ôn theo ngày hoặc ghi trạng thái thuộc vĩnh viễn vào dữ liệu từ vựng. Người học được nhắc quay lại ngày khác. Đây là tự đánh giá, không tự động xác minh câu trả lời trong đầu.

## Kiểm tra
- `node --test scripts/test-recall-session.cjs`
- `npx tsc --noEmit`
- `npm run build`

Kết quả phiên đầu (trước tối ưu diện tích): 6/6 kiểm thử logic đạt; TypeScript và production build thành công. Kiểm tra trình duyệt với 7 từ giả: mở/đánh giá, hoàn tác, tải lại giữ 6/6 đánh giá, từ quay lại lượt 3, kết thúc 7/7. Kiểm tra chế độ tối ở viewport 390px: các ô cao 320px và không tràn ngang. Trang fixture đã xóa trước commit.


## Tối ưu thao tác và diện tích theo phản hồi
- Gom tiến độ, hoàn tác, thiết lập và tùy chọn phím tắt vào thanh gọn. Bỏ nút mở đáp án riêng cho từng thẻ; bấm trực tiếp từ để mở/chọn.
- Chỉ một đáp án mở tại một thời điểm. Khi bật bàn phím, sau đánh giá tự chọn từ chưa đánh giá tiếp theo; giữ đáp án che để người học tự nhớ, Enter mở đáp án: mũi tên trái = chưa nhớ, phải = nhớ. Có thể tắt và lưu tùy chọn trong tab.
- Từ đã đánh giá biến mất khỏi bảng; nhóm tiến độ vẫn giữ lịch lặp. Không tạo thẻ placeholder chiếm chỗ. Hoàn tác khôi phục đúng từ và đáp án.
- Nút sang lượt chỉ hiện khi hết lượt; Enter hoạt động lúc focus ở bảng hoặc nút sang lượt. Không bắt Enter trên các nút khác, không bắt phím trong input/select, khi thiết lập mở, khi mode không hoạt động, với tổ hợp modifier, IME hoặc key repeat.
- Thẻ chưa mở cao khoảng 82px thay cho 320px. Đáp án dài tự giãn; các thẻ chưa mở không bị kéo cao theo. Thẻ đang mở chiếm cả hàng trên desktop để giảm khoảng trắng bên cạnh.
- Kiểm tra trực tiếp bằng dữ liệu giả: trái/phải, tự chọn từ tiếp với đáp án còn che, Enter mở đáp án/sang lượt sau khi hết lượt, hoàn tác, tắt phím tắt, ô tìm kiếm và mode không hoạt động. Ở mobile 390px/tối: không tràn ngang, không có vùng cuộn trong thẻ với ví dụ dài. Trang fixture đã xóa trước commit.

## Chọn từ hoàn toàn bằng bàn phím
- Tách từ được chọn và từ đang mở đáp án. Khi vào Ôn tập, tải lại hoặc sang lượt mới, tự chọn/focus từ đầu tiên chưa đánh giá; đáp án còn che.
- ↑ / ↓ chọn từ trước/sau trong các từ chưa đánh giá, quay vòng ở hai đầu. Đổi chọn đóng đáp án cũ; Enter mở đáp án của từ đang chọn. ← / → chỉ đánh giá khi đáp án đã mở.
- Sau đánh giá chọn từ chưa đánh giá tiếp theo. Enter hết lượt chuyển lượt rồi chọn ngay từ đầu tiên của lượt mới; có thể Enter tiếp để mở.
- Thay viền focus bao quanh chữ bằng nền nhạt và viền nhẹ trên thẻ được chọn; bỏ caret/selection của văn bản trong nút từ. Vẫn giữ dấu chọn rõ khi Tab/Shift+Tab vào từ.
- Kiểm tra trình duyệt: khởi tạo focus đầu tiên, ↑ ↓ và quay vòng, mở/đánh giá, Enter sang lượt và mở tiếp không cần chuột; phím ↑ ↓ trong input không đổi chọn. TypeScript và các kiểm thử hàng đợi đạt.
