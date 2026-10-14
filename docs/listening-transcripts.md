# Script nghe N3

`public/listening-transcripts/` chứa 26 bản chép lời dùng cho `/listening`, mỗi file mang tên theo mã video Google Drive. `manifest.json` ánh xạ số đề, kỳ thi và mốc Mondai 1–5.

Mỗi bản có 28 nhóm câu theo thứ tự 6, 6, 3, 4, 9. `questions[].timing` cho biết mốc lấy từ script nguồn (`source`), số câu trong audio (`audio_marker`) hay nội suy (`estimated`). Hiện có 49 mốc nội suy trong 728 câu. `cues[].vi` là bản dịch máy; `cues[].ruby` là furigana tự động. Chúng giúp học, nhưng vẫn cần đối chiếu với audio khi chỉnh sửa.

`scripts/structure-listening-transcripts.py` đọc bản chép và các script PDF đã trích chữ trong `tmp/listening-transcription/sources/` nếu có. `scripts/enrich-listening-transcripts.py` thêm bản dịch và furigana; tùy chọn `--offline` chỉ tạo furigana và giữ bản dịch đã có. Hai script cần Python với `requests` và `pykakasi`. Chạy script cấu trúc trước script bổ sung dữ liệu; bản chép gốc được tạo bởi `scripts/finalize-listening-transcripts.py`.
