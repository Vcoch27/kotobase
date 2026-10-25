# Từ vựng unique theo cây thư mục, tiết kiệm lượt đọc

## Sự cố đã xác minh ngày 25/10/2026

- Query Insights: toàn bộ `vocabularies` có 2.948 tài liệu, chạy 14 lần, tốn 41.298 document reads.
- Cloud Monitoring: 50.746 reads trong kỳ bắt đầu `2026-10-24T07:00:00Z`. Metrics có độ trễ, không phải cam kết số dư tức thời.
- Bản trước bắt cả `getFolders()` và mở một thư mục phải tải toàn bộ collection, rồi mới lọc trong RAM. Cùng lúc, các thao tác ghi invalidated cache chung.
- Next.js 14.2.8 đang cài giới hạn Data Cache entry 2 MiB. Gom toàn bộ bản ghi có `example`/`note` vào một cache tạo thêm rủi ro không lưu được cache; chưa có log production xác nhận đây là nguyên nhân thực tế.
- Firebase CLI 15.30.1, project `kotobase-42cdc`, `(default)`, `FIRESTORE_NATIVE`, `STANDARD`, `asia-southeast1`, `freeTier: true`.

## Dữ liệu

`vocabularies/{id}` tiếp tục là nguồn gốc. Không gộp/xóa các bản sao giữa thư mục.

Thêm `vocabulary_catalog/{00..31}`. Mỗi document chứa `entries`, một map từ ID gốc đến các trường nhỏ:

```text
word, meaning, reading, sinoVietnamese, folderIds,
createdBy, createdAt, updatedAt
```

Không có `example`, `note`, dữ liệu audio, thông tin user đầy đủ. Chia shard bằng hash ID ổn định; không lưu thêm từ vựng đầy đủ cho mỗi tổ tiên. Tắt automatic indexing cho map `entries`: ứng dụng chỉ đọc shard bằng document ID.

`vocabulary_catalog_meta/current` chứa `ready`, `version`, `shards`, `builtAt`, `sourceDocuments`. `sourceDocuments` là số tài liệu lúc bootstrap, không phải bộ đếm cập nhật hằng ngày.

Đây là read model riêng trong cùng Firestore, không cần Cloud Functions, Redis hoặc nâng gói. 32 shard là lựa chọn cho quy mô hiện tại, không phải schema có dung lượng vô hạn. Script chặn bootstrap nếu một shard JSON vượt 750 KB để chừa khoảng trống dưới giới hạn 1 MiB/tài liệu. Khi dữ liệu tăng nhiều cần nâng version và số shard có kiểm soát.

## Luồng đọc

1. Server đọc cache metadata thư mục, manifest và các shard nhẹ.
2. Lọc quyền xem và phạm vi cây thư mục trước khi chọn bản thắng. Không cache kết quả quyền theo user vào shard dùng chung.
3. Ở góc nhìn cha/gốc/gộp, group bằng `word` chính xác, chọn `updatedAt` mới nhất; nếu bằng nhau dùng ID ổn định. Thư mục lá giữ bản gốc của chính nó.
4. Tìm kiếm và sắp xếp trên chỉ mục trước khi phân trang. Nhờ vậy tìm kiếm vẫn tìm được từ nằm ngoài trang đã tải, và bản cũ không được xuất hiện lại vì khớp nghĩa cũ.
5. Chỉ đọc tối đa 40 bản ghi đầy đủ cho trang đầu. Cursor là ID cuối trong tập đã lọc/sắp xếp, không dùng Firestore `offset`. Cursor bị xóa/đổi phạm vi yêu cầu tải lại.
6. Mỗi bản ghi đầy đủ được cache riêng theo ID + revision. Tránh một cache nhiều MB. Quay lại thư mục có cache phía client không gọi lại server.
7. Số đếm toàn cây tính bằng hợp `word` trên catalog; không tải các bản ghi đầy đủ để đếm.
8. Học cả bộ hoặc tải offline là thao tác tải đầy đủ có chủ ý. Offline giữ cả bản sao bị ẩn trong góc nhìn cha để mở thư mục con vẫn đúng. Không đánh dấu một trang 40 từ là đã tải cả bộ.

Không có fallback quét toàn collection khi thiếu/hỏng catalog. App hiển thị dữ liệu offline hoặc thông báo cần bootstrap.

## Luồng ghi và tính nhất quán

`createVocabularyWriteBatch()` ghi bản gốc và patch/delete mục catalog trong cùng transaction. Các thao tác tạo, import (chunk 400), sửa, gán thư mục, move/copy/delete hàng loạt, xóa cây thư mục đều dùng helper này.

Transaction đọc manifest để có thứ tự serializable với bootstrap. Chỉ invalidate shard chứa ID bị đổi và cache bản ghi tương ứng. Thay đổi từ vựng không invalidate metadata thư mục hay toàn bộ route `/`. Cache cũ theo tag `vocabularies` còn phục vụ truy vấn Kanji hiện có.

Sửa/xóa bản thắng chỉ đổi lựa chọn trong phạm vi hiện tại; không sửa hoặc xóa các bản khác. Xóa bản mới nhất sẽ chọn lại bản mới nhất còn tồn tại.

Mọi công cụ ngoài app ghi `word`, nghĩa, `folderIds` hoặc thời gian đều phải cập nhật catalog cùng transaction, hoặc thực hiện rebuild sau khi dừng ghi. Không sửa các trường này trực tiếp trong Firebase Console rồi kỳ vọng catalog tự đồng bộ. Script chỉ backfill trường `kanjiCharacters` không ảnh hưởng catalog.

## Ngân sách ước tính

Không tính cache hit là lượt đọc Firestore. Số dưới đây dành cho document reads, chưa gồm Auth/Rules, các tiện ích khác, thao tác ghi hoặc cache eviction.

| Hành động | Bản cũ khi cache trống | Bản mới khi cache trống |
| --- | ---: | ---: |
| Mở gốc/trang đầu | ~2.948 từ + ~74 thư mục | 1 manifest + 32 shard + tối đa 40 từ + ~74 thư mục = ~147 |
| Mở thư mục nhỏ | Có thể đọc lại ~2.948 từ | tối đa 40 từ, metadata/catalog thường đã cache |
| Trang tiếp theo | Đã tải tất cả từ trước đó | tối đa 40 từ chưa cache |
| Đếm unique toàn cây | Cần các bản ghi đầy đủ | 0 bản ghi đầy đủ; dùng 32 shard nhẹ |
| Bootstrap một lần | Không có | ~2.949 reads, 33 writes với quy mô ảnh chụp |

Ước tính trang đầu giảm khoảng 95% trong tình huống cache trống. Đây không phải số đo production sau triển khai. Tải cả bộ vẫn phải trả chi phí cho mọi bản ghi chưa cache; phân trang không biến lượt tải đầy đủ thành miễn phí.

Cron backup hiện có vẫn đọc toàn bộ dữ liệu mỗi ngày; phải dành ngân sách riêng cho backup. Bản này giữ nguyên backup. Khách ở ngoài ứng dụng hoặc công cụ admin vẫn có thể tạo lượt đọc khác.

Đặt Vercel Functions `regions: ["sin1"]`, cùng Singapore với Firestore để tránh các round trip xuyên lục địa. Cần deploy mới để áp dụng. Tài liệu: [Vercel regions](https://vercel.com/docs/functions/configuring-functions/region).

## Bootstrap và chuyển production

Production đã hết quota khi kiểm tra. Không chạy preview rồi apply liên tiếp: mỗi lệnh quét lại một lần. Không chạy bootstrap khi quota chưa đặt lại. Kỳ tiếp theo dự kiến bắt đầu 14:00 ngày 25/10/2026 giờ Việt Nam (midnight Pacific trong DST).

1. Đã chuẩn bị `.firebaserc`, `firebase.json`, index exemptions, giữ nguyên hai composite indexes đang tồn tại. Rules local giữ nguyên policy production `allow read, write: if false`; Admin SDK trên server tiếp tục áp quyền.
2. Deploy bản có indexed writers trước khi bootstrap để các thao tác ghi đồng thời có chung khóa manifest. Trong khoảng chưa ready, browsing dùng offline hoặc báo chưa khởi tạo; không chạy lại đường đọc cũ.
3. Khi quota đã hồi phục và còn ít nhất 3.500 reads, chạy đúng **một lần**:

```powershell
npm run vocabulary:index -- --apply --max-reads=3500
```

Script chỉ chọn các trường summary, giới hạn ngân sách, giữ nguyên tài liệu gốc, ghi đè đủ 32 shard và đặt manifest ready trong cùng transaction. `maxAttempts: 1` tránh retry tự động một lần quét hàng nghìn tài liệu. Nếu chạm budget hoặc shard quá lớn, transaction abort, không ghi dở chỉ mục. Khi script lỗi không tự động chạy lại; kiểm tra quota/lỗi trước.

Không chạy apply từ bản code cũ khi website vẫn còn writer chưa cập nhật. Nếu cần dựng sẵn trước deploy, phải dừng thao tác ghi trong suốt bootstrap và đổi phiên bản.

4. Kiểm tra `npm run vocabulary:index -- --status` (1 read), mở `debug/1`, `debug/2`, `debug`, gốc; unique `強み` ở cha/gốc bằng 1, ưu tiên bản mới nhất. Manifest chưa ready không được cache thành công, nên bootstrap mới có hiệu lực mà không chờ một giờ. Rebuild một catalog đã ready cần deploy/revalidate để xóa cache shard cũ.
5. Theo dõi Query Insights: browsing không còn query toàn `vocabularies`; chỉ còn document GET cho trang đang xem và shard nhỏ. Không bật preload tất cả trang chạy nền.

## Kiểm thử

```powershell
npm run test:vocabulary
$env:JAVA_HOME = 'C:\Program Files\Java\jdk-21'
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
npm run test:vocabulary:emulator
npx tsc --noEmit --incremental false
```

Emulator luôn dùng project `demo-kotobase`; integration test từ chối chạy nếu không có `FIRESTORE_EMULATOR_HOST`. Bao phủ copy/move/delete/import >400, atomicity, latest winner, giữ bản gốc, giới hạn trang, tìm kiếm ngoài trang đầu, bootstrap và abort khi hết budget. Giao diện đã kiểm tra trên 92 bản ghi giả: gốc/cha 91 từ unique, tải 40 → 80, tìm được từ thứ 91, chế độ học tải đủ 91/91.

Nguồn nền tảng: [Firestore quotas](https://firebase.google.com/docs/firestore/quotas), [write-time aggregation](https://firebase.google.com/docs/firestore/solutions/aggregation), [pagination](https://firebase.google.com/docs/firestore/query-data/query-cursors).
