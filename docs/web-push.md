# Thông báo PWA trên điện thoại

KotoBase dùng Web Push tiêu chuẩn (VAPID + Push API), chạy từ Next.js/Vercel hiện có. Firestore chỉ lưu đăng ký của từng thiết bị và biên nhận gửi. Không cần bật Cloud Functions, đổi gói Firebase, tạo tài khoản dịch vụ mới hay dùng AWS. FCM là một lựa chọn miễn phí khác; ở đây dùng trực tiếp giao thức Web Push để giữ service worker/offline hiện có và tránh thêm cấu hình SDK.

## Người học

1. Mở chuông thông báo trong KotoBase.
2. Trong **Thông báo trên điện thoại**, bấm **Bật thông báo** rồi cho phép trên thiết bị.
3. Bấm **Gửi thử** và kiểm tra Trung tâm thông báo. Gửi thử là yêu cầu push thật qua máy chủ, không phải popup giả trong trang.
4. Có thể tắt riêng từng thiết bị bằng **Tắt trên thiết bị này**.

Android: dùng Chrome hoặc trình duyệt hỗ trợ Push API, HTTPS và cho phép thông báo. Cài PWA giúp trải nghiệm giống ứng dụng nhưng không phải điều kiện bắt buộc cho Chrome Android.

iPhone/iPad: iOS/iPadOS 16.4 trở lên, thêm KotoBase vào Màn hình chính rồi mở bằng biểu tượng đó. Trang trong Safari thông thường hiển thị hướng dẫn cài, không cố xin quyền ngoài điều kiện được hỗ trợ. Yêu cầu quyền được gọi trực tiếp từ thao tác bấm, không tự bật khi mở trang.

Thông báo có thể đến khi app đã đóng. Không cam kết mọi push đến ngay, có âm thanh hay luôn có banner nổi: thiết bị có thể mất mạng, quyền bị tắt, Focus/Không làm phiền, giới hạn nền hoặc tùy chọn hiển thị. Web Push không tùy biến âm báo như app native. WebView/Capacitor không tự có Web Push; tính năng này dành cho PWA/trình duyệt có hỗ trợ.

## Quản trị

- Mở **Quản trị → Thông báo** (`/admin/push`), chọn một thông báo đã xuất bản, xem trước rồi bấm **Gửi tới các thiết bị đã bật**.
- Có thể xuất bản thông báo như trước bằng `npm run notify`; trang quản trị lấy tối đa 20 thông báo đang hoạt động. Việc ghi/chỉnh `system_notifications` trực tiếp chỉ tạo thông báo trong app; bước bấm gửi trên trang quản trị mới tạo push.
- Mỗi ID thông báo chỉ gửi một lần, có khóa transaction chống bấm hai lần hoặc hai quản trị viên gửi đồng thời. Không tự phát lại lịch sử khi người học bật thông báo.
- Hiển thị số yêu cầu dịch vụ push đã chấp nhận, đăng ký hết hạn và lỗi. Đây không phải biên nhận điện thoại đã đọc. Đăng ký bị trả 404/410 được xóa; lỗi khác không tự retry.
- Giới hạn mỗi lần tối đa 100 thiết bị và 10 yêu cầu đồng thời; quá giới hạn dừng trước khi gửi để tránh bỏ sót âm thầm. Với quy mô lớn hơn cần job chia lô/queue. Lỗi trong lúc gửi có thể tạo trạng thái `sending`/`partial`; không tự xóa biên nhận để gửi lại toàn bộ vì có thể gây trùng.
- Chưa tạo lịch nhắc học hàng ngày; các thông báo gửi theo sự kiện/quản trị. Nhắc học định kỳ cần thêm lịch và lựa chọn giờ/múi giờ của người học.

## Lượt đọc Firestore

Không polling, không `onSnapshot`, không tải danh sách người dùng/từ vựng để fan-out. Mở bảng tùy chọn chỉ đọc subscription từ trình duyệt và GET cấu hình công khai (0 Firestore reads).

| Thao tác | Reads | Writes |
|---|---:|---:|
| Bật/đồng bộ một thiết bị | 1 | 1, hoặc 0 nếu cùng dữ liệu trong 7 ngày |
| Gửi thử thiết bị đã đăng ký | 1 | 1 để khóa 30 giây giữa các lần thử |
| Tắt một thiết bị | 0 | 1 delete |
| Gửi một thông báo đến N thiết bị | N + 3 | 2 biên nhận + delete các đăng ký hết hạn |
| Gửi lặp ID đã có biên nhận | 1 | 0 |

Ví dụ 10 người, mỗi người 1 thiết bị: khoảng **13 reads/lần gửi**; 2 thiết bị/người: khoảng **23 reads/lần gửi**. Không phải tải lại 3.000 từ cho từng người. Bảng không cộng lượt đọc thông báo trong app vốn có, lượt kiểm tra role admin ngoài whitelist, hoặc các thao tác khác của KotoBase. Truy vấn rỗng vẫn có phí đọc tối thiểu của Firestore.

## Cấu hình và bảo vệ

- Server: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`. Khóa công khai được trả qua GET `/api/push`; khóa riêng chỉ ở server. Giữ nguyên cặp khóa qua các lần deploy.
- Chạy `node scripts/setup-push.cjs` để sinh khóa một lần vào `.env.local` (bị Git ignore); `node scripts/setup-push.cjs --vercel` thêm khóa vào Vercel Production qua stdin, không in giá trị. Script từ chối khi Vercel đã có biến VAPID để tránh vô tình rotate khóa. Không chạy lại để chữa lỗi đăng ký.
- Bản triển khai này đã cấu hình khóa Production; người dùng chỉ cần cấp quyền trên điện thoại. Preview/local khác có thể dùng cấu hình riêng; không sao chép khóa riêng vào tài liệu hay client.
- `push_subscriptions/{sha256(deviceCookie + endpoint)}`: subscription, UID tùy chọn, timestamps. Cookie định danh ngẫu nhiên HttpOnly/SameSite Strict để giới hạn test/delete về đúng trình duyệt; không dựa vào UID client gửi lên.
- POST/DELETE kiểm tra origin và phiên đăng nhập. Sender chỉ nhận endpoint HTTPS của các dịch vụ trình duyệt đã cho phép, chặn URL nội bộ/tùy ý. Push payload không chứa dữ liệu học tập riêng.
- `push_broadcasts/{notificationId}` lưu trạng thái gửi. Quyền Firestore client vẫn deny-all; đọc/ghi qua server Admin SDK. Broadcast chỉ cho quản trị viên đã xác thực.
- `/sw.js` hiện có xử lý push và click: luôn hiển thị thông báo, không cần mở app, không truy vấn Firestore trong worker. Click chỉ mở đường dẫn cùng origin; tái sử dụng cửa sổ khi có. API push không được service worker cache.
- Khi xóa dữ liệu trình duyệt/cài lại PWA phải bật lại; đăng ký cũ được dọn khi dịch vụ push báo hết hạn. Không có tác vụ quét nền tốn reads.

## Kiểm tra

- `npm run test:push`: xác thực subscription/chống SSRF, iOS install gate, không lộ khóa, auth/origin, idempotent đăng ký, sở hữu thiết bị, hạn chế gửi thử, budget reads, chống gửi trùng, giới hạn lô, dọn endpoint hết hạn, worker hiển thị/click/cache và tạo payload mã hóa thật cho Apple/Chrome/Firefox (không gửi mạng).
- `node scripts/preview-push.cjs`: fixture localhost 3132, mock quyền/subscription/fetch; không xin quyền thiết bị thật và khóa Firestore về endpoint giả. Kiểm tra bật → gửi thử → tắt, iPhone chưa cài, đã chặn, lỗi mạng và bố cục 390×844. Route tạm `src/app/push-qa` phải được xóa trước build/deploy.
- Ảnh kiểm tra mô phỏng: `docs/previews/push/enabled-mobile.png`, `iphone-install.png`. Các ảnh và unit tests không chứng minh giao hàng trên iPhone/Android vật lý; cần tự bấm Gửi thử sau khi cấp quyền để kiểm tra điều kiện thực trên máy.

## Nguồn kỹ thuật

- Apple/WebKit: https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/
- Apple: https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers
- Google: https://web.dev/articles/push-notifications-web-push-protocol
- Thư viện sender: https://github.com/web-push-libs/web-push
- FCM miễn phí: https://firebase.google.com/pricing
