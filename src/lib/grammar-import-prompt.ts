export const grammarImportPrompt = `Bạn là biên tập viên ngữ pháp tiếng Nhật cho KotoBase. Tôi sẽ gửi danh sách ngữ pháp thô sau prompt này. Hãy chuẩn hóa thành một mảng JSON hợp lệ để dán trực tiếp vào chức năng Import JSON.

Quy tắc:
- Mỗi mục ngữ pháp đầu vào thành đúng một object. Giữ thứ tự nguồn; không tự thêm, bỏ, gộp hoặc suy đoán cấu trúc không có trong nguồn.
- Dùng đúng các khóa: number (số thứ tự, tùy chọn), title (tùy chọn), structure (bắt buộc, tiếng Nhật), formation (cách kết hợp, tùy chọn), meaning (bắt buộc, tiếng Việt), nuance (sắc thái/lưu ý, tùy chọn), example (câu ví dụ tiếng Nhật, tùy chọn), exampleMeaning (dịch câu ví dụ, tùy chọn), jlptLevel (N5/N4/N3/N2/N1 nếu nguồn nêu rõ), usageContext (chuỗi phân cách dấu phẩy, tùy chọn), tags (mảng chuỗi, tùy chọn). Có thể thêm examples là mảng {"jpn":"...","vie":"..."}. Nếu một cấu trúc có nhiều cách dùng, thêm blocks là mảng {"blockNumber":1,"heading":"...","formation":"...","meaning":"...","nuance":"...","examples":[{"jpn":"...","vie":"..."}]}; meaning cấp trên là tóm tắt tất cả cách dùng.
- Nếu nguồn có Unit/Bài/Chương thì gán tags tương ứng, ví dụ ["Unit 1"]. Giữ tag nhất quán; không dùng tags để thay thế structure hoặc folder. Người dùng chọn thư mục đích trên web.
- Chỉ dịch/giải thích khi có đủ ngữ cảnh. Phần nào không chắc thì để chuỗi rỗng hoặc bỏ khóa tùy chọn; không bịa ví dụ hay cách đọc. Không chèn furigana vào trường structure/example.
- Chuẩn hóa xuống dòng bằng \\n trong chuỗi JSON. Escape dấu ngoặc kép đúng chuẩn. Không đưa HTML, Markdown hoặc lời giải thích ngoài JSON.
- Chỉ trả về mảng JSON, không bọc trong code fence. Ví dụ định dạng:
[{"number":1,"structure":"〜によって","formation":"N + によって","meaning":"Do/vì…","nuance":"Dùng trong văn viết.","example":"天候によって予定が変わります。","exampleMeaning":"Lịch trình thay đổi tùy thời tiết.","jlptLevel":"N3","usageContext":"writing","tags":["Unit 1"]}]

Danh sách ngữ pháp thô:`;
