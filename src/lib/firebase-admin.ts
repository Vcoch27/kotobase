import * as admin from "firebase-admin";

// Cấu hình Firebase Admin an toàn (không crash khi build hoặc thiếu env)
function getAdminApp() {
  if (!admin.apps.length) {
    try {
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

      if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        admin.initializeApp({
          projectId: projectId || "kotobase-fallback",
        });
      }
    } catch (error) {
      console.warn("Cảnh báo: Firebase Admin chưa được cấu hình đầy đủ (chế độ offline/local-first).");
    }
  }
  return admin.apps[0] || null;
}

getAdminApp();

const adminDb = new Proxy({} as admin.firestore.Firestore, {
  get(_, prop) {
    const app = getAdminApp();
    if (!app) {
      console.warn("Firebase Admin không khả dụng.");
      return () => ({});
    }
    const db = admin.firestore();
    return (db as any)[prop];
  },
});

const adminAuth = new Proxy({} as admin.auth.Auth, {
  get(_, prop) {
    const app = getAdminApp();
    if (!app) {
      console.warn("Firebase Admin không khả dụng.");
      return () => ({});
    }
    const a = admin.auth();
    return (a as any)[prop];
  },
});

export { adminDb, adminAuth };
