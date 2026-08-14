// src/lib/auth-utils.ts
const SECRET_KEY = process.env.APP_ACCESS_PASSWORD || "fallback_default_secret_dev_only_123456";

// A very simple token generator that works universally on Node and Edge
// without requiring Web Crypto API (which can cause issues in older Node versions).
export async function signToken(payload: string): Promise<string> {
  const dataToSign = `${payload}:${SECRET_KEY}`;
  // Simple Base64 encode using btoa
  // btoa works in Edge and Node 16+
  return btoa(dataToSign);
}

export async function verifyToken(token: string): Promise<boolean> {
  try {
    const decoded = atob(token);
    const expectedData = `authenticated:${SECRET_KEY}`;
    return decoded === expectedData;
  } catch (e) {
    return false;
  }
}
