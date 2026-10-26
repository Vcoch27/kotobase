import webpush from "web-push";
import { createHash } from "node:crypto";
import { adminDb } from "@/lib/firebase-admin";
import { parsePushSubscription, safePushPath, StoredPushSubscription } from "./push-validation";

export const PUSH_COLLECTION = "push_subscriptions";
export const PUSH_DEVICE_COOKIE = "kotobase_push_device";
export const MAX_PUSH_RECIPIENTS = 100;

export function pushConfiguration() {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  return publicKey && privateKey ? {
    publicKey, privateKey,
    subject: process.env.VAPID_SUBJECT || "https://kotobase.vanhoang.online",
  } : null;
}

export function pushDeviceId(owner: string, endpoint: string) {
  return createHash("sha256").update(`${owner}\n${endpoint}`).digest("hex");
}

export interface PushMessage { id: string; title: string; body: string; url?: string | null }

export async function sendDevicePush(subscription: StoredPushSubscription, message: PushMessage) {
  const config = pushConfiguration();
  if (!config) throw new Error("PUSH_NOT_CONFIGURED");
  const checked = parsePushSubscription(subscription);
  if (!checked) throw new Error("INVALID_PUSH_SUBSCRIPTION");
  await webpush.sendNotification(checked, JSON.stringify({
    id: message.id.slice(0, 160),
    title: message.title.slice(0, 100),
    body: message.body.slice(0, 300),
    url: safePushPath(message.url),
  }), {
    vapidDetails: config,
    TTL: 24 * 60 * 60,
    urgency: "normal",
    timeout: 4000,
    contentEncoding: "aes128gcm",
  });
}

export function isExpiredPush(error: unknown): boolean {
  const status = (error as { statusCode?: number })?.statusCode;
  return status === 404 || status === 410;
}

/** One explicit broadcast, bounded reads and concurrency. No background polling/retries. */
export async function broadcastSystemPush(notificationId: string) {
  if (!pushConfiguration()) throw new Error("Chưa cấu hình khóa Web Push.");
  if (!/^[A-Za-z0-9_-]{1,160}$/.test(notificationId)) throw new Error("Thông báo không hợp lệ.");
  const receipt = adminDb.collection("push_broadcasts").doc(notificationId);
  if ((await receipt.get()).exists)
    throw new Error("Thông báo này đã được gửi hoặc đang gửi. Không gửi lại để tránh trùng.");
  const notification = await adminDb.collection("system_notifications").doc(notificationId).get();
  const data = notification.data();
  if (!notification.exists || data?.isActive === false) throw new Error("Thông báo không còn hoạt động.");

  // Refuse oversized broadcasts before sending anything; never silently drop recipients.
  const devices = await adminDb.collection(PUSH_COLLECTION).limit(MAX_PUSH_RECIPIENTS + 1).get();
  if (devices.size > MAX_PUSH_RECIPIENTS)
    throw new Error("Có hơn 100 thiết bị. Cần chia lô gửi trước khi tiếp tục để bảo vệ quota.");
  if (devices.empty) return { accepted: 0, expired: 0, failed: 0, empty: true };

  await adminDb.runTransaction(async (tx) => {
    const old = await tx.get(receipt);
    if (old.exists) throw new Error("Thông báo này đã được gửi hoặc đang gửi. Không gửi lại để tránh trùng.");
    tx.create(receipt, { status: "sending", startedAt: new Date().toISOString(), recipients: devices.size });
  }, { maxAttempts: 1 });

  const counts = { accepted: 0, expired: 0, failed: 0, empty: false };
  for (let offset = 0; offset < devices.docs.length; offset += 10) {
    await Promise.all(devices.docs.slice(offset, offset + 10).map(async (doc) => {
      const subscription = parsePushSubscription(doc.data().subscription);
      if (!subscription) { counts.failed++; return; }
      try {
        await sendDevicePush(subscription, {
          id: notificationId, title: String(data?.title || "KotoBase"),
          body: String(data?.summary || "Có cập nhật mới."), url: data?.link || "/",
        });
        counts.accepted++;
      } catch (error) {
        if (isExpiredPush(error)) {
          try { await doc.ref.delete(); counts.expired++; }
          catch { counts.failed++; }
        } else counts.failed++;
      }
    }));
  }
  await receipt.set({ ...counts, status: counts.failed ? "partial" : "completed", finishedAt: new Date().toISOString() }, { merge: true });
  return counts;
}
