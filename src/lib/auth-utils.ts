// src/lib/auth-utils.ts
// Tất cả hàm đều tương thích Edge Runtime (không dùng Buffer hay Node.js APIs)

const SECRET_KEY = process.env.APP_ACCESS_PASSWORD || "fallback_default_secret_dev_only_123456";
const JWT_SECRET = process.env.JWT_SECRET || SECRET_KEY;

// ============================================================
// Helpers: Base64URL encode/decode (Edge-safe, không dùng Buffer)
// ============================================================

function base64urlEncode(data: ArrayBuffer): string {
  const bytes = new Uint8Array(data);
  let str = "";
  for (let i = 0; i < bytes.length; i++) {
    str += String.fromCharCode(bytes[i]);
  }
  return btoa(str)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// Encode chuỗi UTF-8 sang base64url (tránh lỗi btoa với tiếng Việt)
function encodeUTF8Base64(str: string): string {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

// Decode base64url về chuỗi UTF-8
function decodeUTF8Base64(str: string): string {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64.padEnd(base64.length + (4 - (base64.length % 4)) % 4, "="));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new TextDecoder().decode(bytes);
}

// ============================================================
// Helpers: HMAC-SHA256 (Web Crypto API - Edge-compatible)
// ============================================================
async function hmacSign(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(JWT_SECRET);
  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(data));
  return base64urlEncode(sigBuffer);
}

async function hmacVerify(data: string, signature: string): Promise<boolean> {
  try {
    const expected = await hmacSign(data);
    return expected === signature;
  } catch (e) {
    return false;
  }
}

// ============================================================
// Mật khẩu truy cập chung (Token có hạn dùng & kiểm tra hạn)
// ============================================================
export const KEY_EXPIRY_SECONDS = 60 * 60 * 24 * 30; // 30 ngày mặc định

export async function signToken(
  payload: string = "authenticated",
  expiresInSeconds: number = KEY_EXPIRY_SECONDS
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const exp = now + expiresInSeconds;
  const dataToSign = `${payload}:${exp}`;
  const signature = await hmacSign(dataToSign);
  return btoa(`${dataToSign}:${signature}`);
}

export async function verifyToken(token: string): Promise<boolean> {
  if (!token || typeof token !== "string") return false;
  try {
    const decoded = atob(token.trim());

    // 1. Kiểm tra token có hạn sử dụng (exp): "authenticated:1758000000:signature"
    const parts = decoded.split(":");
    if (parts.length >= 3) {
      const [payload, expStr, ...sigParts] = parts;
      const signature = sigParts.join(":");
      const exp = parseInt(expStr, 10);

      // Kiểm tra xem key còn hạn hay đã hết hạn
      if (isNaN(exp) || exp < Math.floor(Date.now() / 1000)) {
        return false; // Đã hết hạn (expired)
      }

      if (payload !== "authenticated") {
        return false;
      }

      const isValid = await hmacVerify(`${payload}:${expStr}`, signature);
      return isValid;
    }

    // 2. Fallback cho token cũ dạng legacy (chưa có exp): "authenticated:SECRET_KEY"
    const expectedData = `authenticated:${SECRET_KEY}`;
    return decoded === expectedData;
  } catch (e) {
    return false;
  }
}

export async function getTokenRemainingSeconds(token: string): Promise<number | null> {
  if (!token || typeof token !== "string") return null;
  try {
    const decoded = atob(token.trim());
    const parts = decoded.split(":");
    if (parts.length >= 3) {
      const exp = parseInt(parts[1], 10);
      if (!isNaN(exp)) {
        const remaining = exp - Math.floor(Date.now() / 1000);
        return remaining > 0 ? remaining : 0;
      }
    }
  } catch (e) {}
  return null;
}

// ============================================================
// Google / Firebase Auth Session (JWT HS256 - Edge-safe)
// ============================================================

export interface UserSession {
  uid: string;
  email: string;
  name: string;
  picture?: string;
  iat: number;
  exp: number;
}

// Ký Google session token (JWT: header.payload.signature)
export async function signGoogleSession(user: {
  uid: string;
  email: string;
  name: string;
  picture?: string;
}): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: UserSession = {
    uid: user.uid,
    email: user.email,
    name: user.name,
    picture: user.picture,
    iat: now,
    exp: now + 60 * 60 * 24 * 7, // 7 ngày
  };

  const header = encodeUTF8Base64(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = encodeUTF8Base64(JSON.stringify(payload));
  const dataToSign = `${header}.${body}`;
  const signature = await hmacSign(dataToSign);
  return `${dataToSign}.${signature}`;
}

// Verify và decode Google session token
export async function verifyGoogleSession(token: string): Promise<UserSession | null> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const [header, body, signature] = parts;
    const dataToVerify = `${header}.${body}`;

    const valid = await hmacVerify(dataToVerify, signature);
    if (!valid) return null;

    const payload = JSON.parse(decodeUTF8Base64(body)) as UserSession;

    // Kiểm tra hạn
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;

    return payload;
  } catch (e) {
    return null;
  }
}
