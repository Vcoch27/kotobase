import * as admin from "firebase-admin";

// Cấu hình Firebase Admin (Dành cho Server Actions / API Routes)
// Chỉ chạy trong môi trường Node.js (Server)
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Chú ý: Ký tự xuống dòng trong Private Key cần được format đúng
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  } catch (error) {
    console.error("Lỗi khởi tạo Firebase Admin:", error);
  }
}

const adminDb = admin.firestore();
const adminAuth = admin.auth();

export { adminDb, adminAuth };
