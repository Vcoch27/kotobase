export interface StoredPushSubscription {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

/** Send only to known browser push services; never to an arbitrary client URL. */
export function parsePushSubscription(value: unknown): StoredPushSubscription | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<StoredPushSubscription>;
  if (typeof input.endpoint !== "string" || input.endpoint.length > 2048) return null;
  try {
    const url = new URL(input.endpoint);
    const host = url.hostname;
    if (url.protocol !== "https:" || url.username || url.password || url.hash ||
        (url.port && url.port !== "443") || !(
          host === "fcm.googleapis.com" || host === "web.push.apple.com" ||
          host === "updates.push.services.mozilla.com" ||
          /^[a-z0-9-]+\.notify\.windows\.com$/.test(host)
        )) return null;
  } catch { return null; }
  if (!input.keys || typeof input.keys.p256dh !== "string" || typeof input.keys.auth !== "string") return null;
  if (!/^[A-Za-z0-9_-]{87}=?$/.test(input.keys.p256dh) ||
      !/^[A-Za-z0-9_-]{22}={0,2}$/.test(input.keys.auth)) return null;
  return { endpoint: input.endpoint, keys: { p256dh: input.keys.p256dh, auth: input.keys.auth } };
}

/** Notifications can navigate only within this app, including when payloads are malformed. */
export function safePushPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") ||
      value.startsWith("//") || /[\\\u0000-\u0020]/.test(value)) return "/";
  try {
    const url = new URL(value, "https://kotobase.invalid");
    return url.origin === "https://kotobase.invalid" ? `${url.pathname}${url.search}${url.hash}` : "/";
  } catch { return "/"; }
}

export function pushPlatform(input: {
  ios: boolean; standalone: boolean; secure: boolean; supported: boolean;
}): "ready" | "install-ios" | "unsupported" {
  if (!input.secure) return "unsupported";
  if (input.ios && !input.standalone) return "install-ios";
  return input.supported ? "ready" : "unsupported";
}
