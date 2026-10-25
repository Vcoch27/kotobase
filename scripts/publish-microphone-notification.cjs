// Explicit --apply publishes once; running without flags is a read-free preview.
const payload = {
  id: "speaking-quiz-microphone-2026-10",
  title: "Mới: Luyện nói tiếng Nhật và kiểm tra micro",
  summary:
    "Quiz đã có luyện nói, giữ Space để nói và Tab bỏ qua. Mở Cài đặt → Micro & luyện nói để test mic, lọc âm và nghe lại giọng của bạn.",
  content: [
    "QUIZ LUYỆN NÓI TIẾNG NHẬT",
    "Đăng nhập Google, mở Quiz → Luyện nói. Chọn nhìn từ Nhật để đọc hoặc nhìn nghĩa Việt để nói đáp án. Máy nhận đúng từ sẽ báo âm thanh, hiện đáp án và đếm ngược sang câu tiếp.",
    "",
    "Giữ Space để bật mic, thả để nhận nốt kết quả. Tab bỏ qua và phát cách đọc; Enter chuyển câu khi hiện đáp án. Có thể nghe và thử lại ngay, hoặc luyện lại các từ chưa vững ở cuối phiên.",
    "",
    "TEST MIC & LỌC ÂM",
    "Vào Cài đặt → Micro & luyện nói · Test mic (hoặc nút cài đặt mic trong Quiz). Chọn thiết bị, xem mức âm đầu vào, thu thử tối đa 8 giây rồi nghe lại. Có lọc tiếng ồn, khử vọng, tự cân bằng âm lượng, giảm tiếng ù và chỉnh mức đầu vào, tùy khả năng trình duyệt.",
    "Chrome/Edge máy tính mới hỗ trợ dùng luồng mic đã xử lý cho Quiz. Trên trình duyệt chưa hỗ trợ, thiết lập chỉ áp dụng cho Test mic và Quiz dùng mic mặc định của trình duyệt; màn hình cài đặt sẽ cho biết rõ.",
    "",
    "Không cần API key. Bản test mic chỉ nằm trong bộ nhớ thiết bị và được xóa khi đóng cửa sổ, không tải lên máy chủ. Quiz cần trình duyệt hỗ trợ nhận giọng; dịch vụ của trình duyệt có thể xử lý âm thanh qua mạng. Tính năng nhận dạng đúng từ, không chấm trọng âm hay độ chuẩn phát âm chuyên sâu.",
  ].join("\n"),
  type: "feature",
  tag: "🎙️ Luyện nói & Test mic",
  version: null,
  link: "/?settings=microphone",
  isActive: true,
};
module.exports = payload;
if (require.main === module) {
  if (!process.argv.includes("--apply"))
    console.log(JSON.stringify(payload, null, 2));
  else
    (async () => {
      if (process.env.FIRESTORE_EMULATOR_HOST)
        throw new Error(
          "Refusing to publish production notification while emulator is configured.",
        );
      require("@next/env").loadEnvConfig(
        require("path").resolve(__dirname, ".."),
      );
      if (process.env.FIRESTORE_EMULATOR_HOST)
        throw new Error("Refusing to publish with emulator configured.");
      if (process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID !== "kotobase-42cdc")
        throw new Error("Unexpected Firebase project.");
      const admin = require("firebase-admin");
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });
      const ref = admin
        .firestore()
        .collection("system_notifications")
        .doc(payload.id);
      const now = new Date().toISOString();
      try {
        await ref.create({ ...payload, createdAt: now, updatedAt: now });
      } catch (error) {
        if (Number(error.code) !== 6) throw error;
      }
      const record = await ref.get();
      if (
        !record.exists ||
        record.data().title !== payload.title ||
        record.data().isActive !== true
      )
        throw new Error("Notification verification failed.");
      console.log(
        JSON.stringify({
          published: true,
          id: ref.id,
          active: true,
          title: record.data().title,
        }),
      );
    })().catch((error) => {
      console.error(error.message);
      process.exitCode = 1;
    });
}
