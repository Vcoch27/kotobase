import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth-utils";
import { getCurrentUser } from "@/lib/session";
import { adminDb } from "@/lib/firebase-admin";
import { parsePushSubscription } from "@/lib/push-validation";
import {
  PUSH_COLLECTION, PUSH_DEVICE_COOKIE, pushConfiguration, pushDeviceId,
  sendDevicePush, isExpiredPush,
} from "@/lib/web-push";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  const config = pushConfiguration();
  return json({ available: !!config, publicKey: config?.publicKey || null });
}

async function authorize(request: NextRequest) {
  // Next's Node adapter can expose an internal localhost nextUrl behind a proxy.
  // Browsers send the public Host; preserve the original scheme from the proxy.
  const host = request.headers.get("host") || request.nextUrl.host;
  const protocol = request.headers.get("x-forwarded-proto")?.split(",")[0].trim() ||
    request.nextUrl.protocol.replace(":", "");
  if (request.headers.get("origin") !== `${protocol}://${host}`)
    return json({ error: "Yêu cầu phải đến từ KotoBase." }, 403);
  if (process.env.APP_ACCESS_PASSWORD &&
      !await verifyToken(request.cookies.get("kotobase_auth_token")?.value || "") &&
      !await getCurrentUser())
    return json({ error: "Phiên đăng nhập đã hết hạn. Mở lại KotoBase để đăng nhập." }, 401);
  if ((Number(request.headers.get("content-length")) || 0) > 8192)
    return json({ error: "Yêu cầu quá lớn." }, 413);
  return null;
}

export async function POST(request: NextRequest) {
  const blocked = await authorize(request);
  if (blocked) return blocked;
  if (!pushConfiguration()) return json({ error: "Thông báo điện thoại chưa được cấu hình." }, 503);
  try {
    const text = await request.text();
    if (text.length > 8192) return json({ error: "Yêu cầu quá lớn." }, 413);
    const input = JSON.parse(text);
    const subscription = parsePushSubscription(input.subscription);
    if (!subscription || !["subscribe", "test"].includes(input.action))
      return json({ error: "Đăng ký thông báo không hợp lệ." }, 400);
    const previousOwner = request.cookies.get(PUSH_DEVICE_COOKIE)?.value;
    if (input.action === "test" && !previousOwner)
      return json({ error: "Hãy bật thông báo trên thiết bị trước." }, 400);
    const owner = previousOwner || randomBytes(32).toString("base64url");
    const ref = adminDb.collection(PUSH_COLLECTION).doc(pushDeviceId(owner, subscription.endpoint));
    if (input.action === "test") {
      const ready = await adminDb.runTransaction(async (tx) => {
        const old = await tx.get(ref);
        if (!old.exists) return "missing";
        if (Date.now() - (old.data()?.lastTestAt || 0) < 30000) return "limited";
        tx.update(ref, { lastTestAt: Date.now() });
        return { subscription: old.data()?.subscription };
      }, { maxAttempts: 1 });
      if (typeof ready === "string") return json({ error: ready === "limited"
        ? "Chờ 30 giây trước khi gửi thử lần tiếp theo."
        : "Thiết bị chưa đăng ký. Hãy bật lại thông báo." }, ready === "limited" ? 429 : 404);
      // Read the stored keys rather than allowing the caller to substitute them.
      const target = parsePushSubscription(ready.subscription);
      if (!target) return json({ error: "Đăng ký đã hết hạn. Hãy bật lại thông báo." }, 404);
      try {
        await sendDevicePush(target, { id: "device-test", title: "KotoBase · Kết nối thành công",
          body: "Điện thoại đã nhận được thông báo thử. Bạn có thể đóng app và vẫn nhận các cập nhật mới.", url: "/?notifications=1" });
      } catch (error) {
        if (isExpiredPush(error)) {
          await ref.delete();
          return json({ error: "Đăng ký đã hết hạn. Tắt rồi bật lại thông báo." }, 410);
        }
        return json({ error: "Dịch vụ push chưa nhận được yêu cầu. Thử lại sau." }, 502);
      }
      return json({ success: true, accepted: true });
    }
    const user = await getCurrentUser();
    await adminDb.runTransaction(async (tx) => {
      const old = await tx.get(ref);
      const data = old.data();
      if (JSON.stringify(data?.subscription) === JSON.stringify(subscription) &&
          Date.now() - (data?.updatedAt || 0) < 7 * 86400000) return;
      tx.set(ref, { subscription, uid: user?.uid || null, updatedAt: Date.now(),
        ...(old.exists ? {} : { createdAt: Date.now() }) }, { merge: true });
    }, { maxAttempts: 1 });
    const response = json({ success: true });
    response.cookies.set(PUSH_DEVICE_COOKIE, owner, {
      httpOnly: true, secure: request.nextUrl.protocol === "https:", sameSite: "strict", path: "/",
      maxAge: 365 * 86400,
    });
    return response;
  } catch (error) {
    if (error instanceof SyntaxError) return json({ error: "Yêu cầu không hợp lệ." }, 400);
    return json({ error: "Không lưu được đăng ký thông báo. Kiểm tra kết nối và thử lại." }, 500);
  }
}

export async function DELETE(request: NextRequest) {
  const blocked = await authorize(request);
  if (blocked) return blocked;
  try {
    const text = await request.text();
    if (text.length > 4096) return json({ error: "Yêu cầu quá lớn." }, 413);
    const input = JSON.parse(text);
    const owner = request.cookies.get(PUSH_DEVICE_COOKIE)?.value;
    if (typeof input.endpoint !== "string" || input.endpoint.length > 2048)
      return json({ error: "Đăng ký không hợp lệ." }, 400);
    if (owner) await adminDb.collection(PUSH_COLLECTION).doc(pushDeviceId(owner, input.endpoint)).delete();
    return json({ success: true });
  } catch {
    return json({ error: "Không tắt được đăng ký. Hãy thử lại khi có mạng." }, 500);
  }
}
