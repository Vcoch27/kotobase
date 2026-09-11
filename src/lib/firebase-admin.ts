import * as admin from "firebase-admin";

const firebaseAdmin: typeof admin = (admin as any).default?.apps ? (admin as any).default : admin;

// Cấu hình Firebase Admin (Dành cho Server Actions / API Routes)
// Chỉ chạy trong môi trường Node.js (Server)
if (!firebaseAdmin.apps.length) {
  try {
    firebaseAdmin.initializeApp({
      credential: firebaseAdmin.credential.cert({
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

const adminDb = firebaseAdmin.firestore();
const adminAuth = firebaseAdmin.auth();

export { adminDb, adminAuth };
