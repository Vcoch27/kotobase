const path = require("path");
const projectRoot = path.resolve(__dirname, "..");

const { loadEnvConfig } = require("@next/env");
loadEnvConfig(projectRoot);

const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

const db = admin.firestore();
const now = new Date().toISOString();

const content = `Chào mừng bạn đến với Hệ thống Thông báo KotoBase! 🎉

Từ hôm nay, KotoBase chính thức ra mắt tính năng Thông báo & Nhật ký cập nhật tính năng:
• 🔔 Biểu tượng Chuông thông báo trên thanh điều hướng giúp bạn không bỏ lỡ bất kỳ cải tiến nào.
• ⚡ Thẻ thông báo trượt góc nổi bật mỗi khi có tính năng mới hữu ích.
• 📱 Đánh dấu đã đọc và tự động đồng bộ trên mọi thiết bị khi đăng nhập Google.

📌 Các cập nhật nổi bật gần đây:
- 🗂️ Tab Hán tự trong Thư mục: Gom toàn bộ chữ Kanji trong thư mục vào tab riêng, hiển thị 2 cột trực quan.
- 💡 Xem & Thêm mẹo nhớ Kanji: Xem nhanh câu gợi ý nhớ chữ Hán, nhấn vào để học hoặc bổ sung mẹo mới.
- ⌨️ Phím tắt Ctrl + \\: Thu gọn / mở rộng cây thư mục mượt mà, không xung đột trình duyệt.
- 📦 Thao tác hàng loạt: Chọn nhiều từ để chuyển thư mục, sao chép hoặc ôn luyện tập trung.

Chúc bạn có những giờ học tiếng Nhật thật hào hứng và hiệu quả cùng KotoBase! 🌸`;

async function main() {
  const data = {
    title: "Ra mắt Hệ thống Thông báo & Cập nhật KotoBase 🔔",
    summary: "Theo dõi các tính năng mới, mẹo học tiếng Nhật và cải tiến trải nghiệm trực tiếp qua biểu tượng Chuông thông báo!",
    content: content,
    type: "feature",
    tag: "✨ Tính năng mới",
    version: "v2.5.0",
    link: "/",
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };

  const docId = "welcome-notifications-v2";
  await db.collection("system_notifications").doc(docId).set(data);
  console.log("✅ Đã tạo thông báo giới thiệu với ID:", docId);

  // Dọn dẹp doc cũ
  try {
    await db.collection("system_notifications").doc("VtjT3tBTfCXfb9gOWApJ").delete();
    console.log("✅ Đã dọn dẹp thông báo mẫu cũ.");
  } catch (e) {}

  console.log("🎉 Hoàn tất khởi tạo thông báo giới thiệu!");
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
