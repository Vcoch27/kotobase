# Ôn tập theo lượt: kế hoạch và triển khai

## Mục tiêu
Giữ vai trò riêng của Ôn tập: một bảng nhiều từ để tự gợi nhớ, mở đáp án và đánh giá. Flashcard vẫn là luồng thẻ đơn; Quiz vẫn kiểm tra bằng gõ đáp án. Quản lý/xóa từ nằm ở Tổng quan.

## Tham khảo
- Anki learning steps: https://docs.ankiweb.net/deck-options — câu trả lời quyết định lần gặp tiếp theo; nhớ một lần không đồng nghĩa hoàn tất học.
- Quizlet Write: https://help.quizlet.com/hc/en-ca/articles/360030990531-Studying-with-Write-mode — tập trung lại vào từ sai và yêu cầu nhiều lần nhớ đúng.

Áp dụng nguyên tắc luyện nhớ nhiều lần, không sao chép thuật toán SRS hay giao diện thẻ đơn.

## Kế hoạch đã triển khai
1. Tách bộ lập lượt thành hàm thuần có kiểm thử.
2. Bảng tối đa 6 ô, kích thước cố định; nội dung dài cuộn trong ô. Mở đáp án bằng nút/từ gợi ý; đánh giá chỉ khả dụng sau khi mở.
3. Nhớ 2/3/4 lần liên tiếp mới đạt trong phiên. Chưa nhớ đặt chuỗi về 0, tăng số lần quên và đến hạn ngay lượt kế tiếp. Nhớ nhưng chưa đạt được hẹn sau 1/2/3 lượt.
4. Không dịch chuyển ô sau đánh giá. Khi toàn bộ ô đã đánh giá, người học chủ động chuyển lượt. Fisher–Yates trộn các từ cùng ưu tiên; hạn cũ trước để tránh bỏ quên từ; số lần quên phá hòa. Không lặp cùng từ trong một bảng.
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

Kết quả: 6/6 kiểm thử logic đạt; TypeScript và production build thành công. Kiểm tra trình duyệt với 7 từ giả: mở/đánh giá, hoàn tác, tải lại giữ 6/6 đánh giá, từ quay lại lượt 3, kết thúc 7/7. Kiểm tra chế độ tối ở viewport 390px: các ô cao 320px và không tràn ngang. Trang fixture đã xóa trước commit.
