// src/lib/bot-protection.ts
// Cơ chế thông minh phát hiện & chặn bot / tool tự động (Anti-Bot / Anti-DDoS)
// Thiết kế đặc biệt để phân biệt rõ ràng giữa Bot tự động và Người dùng học tập thường xuyên (Zero False Positives)

import { NextRequest, NextResponse } from "next/server";
import { verifyToken, verifyGoogleSession } from "./auth-utils";

export interface BotProtectionResult {
  allowed: boolean;
  status?: number; // 403 (Bot bị từ chối) | 429 (Tần suất quá nhanh)
  reason?: string;
  retryAfter?: number;
  isTrustedUser: boolean;
  clientIp: string;
}

// -------------------------------------------------------------
// 1. Danh sách các mẫu User-Agent của Bot, Tool tự động, Scraper
// -------------------------------------------------------------
const KNOWN_BOT_PATTERNS = [
  /python-requests/i,
  /aiohttp/i,
  /scrapy/i,
  /mechanize/i,
  /httpclient/i,
  /curl\//i,
  /wget\//i,
  /libwww-perl/i,
  /go-http-client/i,
  /headlesschrome/i,
  /phantomjs/i,
  /selenium/i,
  /puppeteer/i,
  /postmanruntime/i,
  /insomnia/i,
  /sqlmap/i,
  /nikto/i,
  /zgrab/i,
  /censys/i,
  /bytespider/i,
  /mj12bot/i,
  /semrushbot/i,
  /ahrefsbot/i,
  /dotbot/i,
  /exabot/i,
  /zoominfobot/i,
  /dataforseobot/i,
  /seekport/i,
];

// -------------------------------------------------------------
// 2. Danh sách bẫy quét lỗ hổng (Honeypot / Scanner Exploit Paths)
// -------------------------------------------------------------
const SCANNER_PROBE_PATHS = [
  /\/\.env/i,
  /\/\.git/i,
  /\/wp-admin/i,
  /\/wp-login\.php/i,
  /\/phpmyadmin/i,
  /\/admin\.php/i,
  /\/config\.json/i,
  /\/xmlrpc\.php/i,
  /\/boaform/i,
  /\/shell/i,
  /\/actuator/i,
  /\/eval-stdin\.php/i,
  /\/HNAP1/i,
  /\/solr/i,
];

// -------------------------------------------------------------
// 3. Cấu hình ngưỡng tần suất (Rate Limiting Tiers)
// -------------------------------------------------------------
const LIMITS = {
  // Người dùng thường xuyên đã đăng nhập (Google hoặc App Key):
  // Rất hào phóng, cho phép học dồn dập, gõ phím quiz nhanh, lật flashcard liên tục
  TRUSTED_USER: {
    WINDOW_MS: 60 * 1000,     // 1 phút
    MAX_REQUESTS: 250,        // Tối đa 250 req / phút (~4.1 req/giây liên tục)
    BURST_WINDOW_MS: 2000,    // 2 giây
    BURST_MAX: 25,            // Tối đa 25 req trong 2 giây
  },
  // Khách vãng lai / chưa đăng nhập:
  ANONYMOUS_USER: {
    WINDOW_MS: 60 * 1000,     // 1 phút
    MAX_REQUESTS: 60,         // Tối đa 60 req / phút
    BURST_WINDOW_MS: 2000,    // 2 giây
    BURST_MAX: 12,            // Tối đa 12 req trong 2 giây
  },
  // IP bị phát hiện quét đường dẫn độc hại hoặc bot công cụ:
  BLOCK_DURATION_MS: 15 * 60 * 1000, // Khóa 15 phút
};

interface ClientTracker {
  ip: string;
  requests: number[];        // Lưu timestamps trong window 60s
  burstRequests: number[];   // Lưu timestamps trong burst window 2s
  blacklistedUntil?: number; // Thời điểm hết hạn khóa (nếu bị ban)
  blockReason?: string;
  isTrusted?: boolean;
}

// Lưu trữ bộ nhớ trong Edge/Node instance
const clientTrackers = new Map<string, ClientTracker>();
let lastCleanup = Date.now();
const MAX_TRACKERS = 5000;

// Thống kê Anti-Bot
export const botProtectionMetrics = {
  totalEvaluated: 0,
  botsBlocked: 0,
  scannersBlocked: 0,
  rateLimitsTriggered: 0,
  trustedUsersAllowed: 0,
};

// Dọn dẹp cache hết hạn định kỳ
function cleanupTrackers() {
  const now = Date.now();
  if (now - lastCleanup < 60 * 1000) return;
  lastCleanup = now;

  for (const [ip, tracker] of clientTrackers.entries()) {
    const isBlacklisted = tracker.blacklistedUntil && tracker.blacklistedUntil > now;
    const hasRecentRequests = tracker.requests.some(t => now - t < LIMITS.TRUSTED_USER.WINDOW_MS);
    if (!isBlacklisted && !hasRecentRequests) {
      clientTrackers.delete(ip);
    }
  }

  // Giới hạn dung lượng Map
  if (clientTrackers.size > MAX_TRACKERS) {
    const keys = Array.from(clientTrackers.keys());
    for (let i = 0; i < 500 && i < keys.length; i++) {
      clientTrackers.delete(keys[i]);
    }
  }
}

// Lấy IP thật của client
export function getClientIp(request: NextRequest): string {
  const cfConnectingIp = request.headers.get("cf-connecting-ip");
  if (cfConnectingIp) return cfConnectingIp.trim();
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0].trim();
    if (firstIp) return firstIp;
  }
  return (request as any).ip || "127.0.0.1";
}

/**
 * Kiểm tra xem request có phải từ người dùng web hợp lệ hay từ bot/tool
 */
export async function checkBotAndRateLimit(request: NextRequest): Promise<BotProtectionResult> {
  botProtectionMetrics.totalEvaluated++;
  cleanupTrackers();

  const ip = getClientIp(request);
  const pathname = request.nextUrl.pathname;
  const userAgent = request.headers.get("user-agent") || "";
  const now = Date.now();

  let tracker = clientTrackers.get(ip);
  if (!tracker) {
    tracker = { ip, requests: [], burstRequests: [] };
    clientTrackers.set(ip, tracker);
  }

  // 1. Kiểm tra nếu IP đang trong danh sách bị khóa tạm thời
  if (tracker.blacklistedUntil && tracker.blacklistedUntil > now) {
    botProtectionMetrics.botsBlocked++;
    const retryAfter = Math.ceil((tracker.blacklistedUntil - now) / 1000);
    return {
      allowed: false,
      status: 403,
      reason: tracker.blockReason || "Địa chỉ IP tạm thời bị chặn do phát hiện hành vi tự động bất thường.",
      retryAfter,
      isTrustedUser: false,
      clientIp: ip,
    };
  }

  // 2. Phát hiện Bẫy quét lỗ hổng (Honeypot Scanner Probes)
  // Chỉ có bot/scanner mới cố tình truy cập các đường dẫn này
  for (const pattern of SCANNER_PROBE_PATHS) {
    if (pattern.test(pathname)) {
      tracker.blacklistedUntil = now + LIMITS.BLOCK_DURATION_MS;
      tracker.blockReason = "Phát hiện quét lỗ hổng bảo mật tự động.";
      botProtectionMetrics.scannersBlocked++;
      return {
        allowed: false,
        status: 403,
        reason: "Truy cập bị từ chối: Phát hiện quét hệ thống trái phép.",
        retryAfter: Math.ceil(LIMITS.BLOCK_DURATION_MS / 1000),
        isTrustedUser: false,
        clientIp: ip,
      };
    }
  }

  // 3. Kiểm tra tính xác thực của người dùng (Xác minh người dùng thường xuyên)
  const appToken = request.cookies.get("kotobase_auth_token")?.value;
  const googleToken = request.cookies.get("kotobase_session")?.value;

  let isTrustedUser = false;
  if (appToken) {
    isTrustedUser = await verifyToken(appToken);
  }
  if (!isTrustedUser && googleToken) {
    const session = await verifyGoogleSession(googleToken);
    isTrustedUser = !!session;
  }

  tracker.isTrusted = isTrustedUser;

  // 4. Phát hiện chữ ký Bot / Scraper đã biết
  // Cho phép Googlebot / Bingbot nếu chỉ crawl trang public như /download
  const isSearchEngineBot = /googlebot|bingbot|duckduckbot|yandexbot/i.test(userAgent);
  if (isSearchEngineBot && pathname.startsWith("/download")) {
    return { allowed: true, isTrustedUser: false, clientIp: ip };
  }

  // Kiểm tra User-Agent trống hoặc quá ngắn (đặc điểm điển hình của script cùi)
  if (!userAgent || userAgent.trim().length < 6) {
    botProtectionMetrics.botsBlocked++;
    return {
      allowed: false,
      status: 403,
      reason: "Yêu cầu bị từ chối: Thiếu thông tin User-Agent của trình duyệt.",
      isTrustedUser: false,
      clientIp: ip,
    };
  }

  // So khớp với mẫu công cụ bot tự động
  for (const botPattern of KNOWN_BOT_PATTERNS) {
    if (botPattern.test(userAgent)) {
      botProtectionMetrics.botsBlocked++;
      tracker.blacklistedUntil = now + 5 * 60 * 1000; // Khóa 5 phút
      tracker.blockReason = `Phát hiện User-Agent tự động: ${userAgent.slice(0, 50)}`;
      return {
        allowed: false,
        status: 403,
        reason: "Truy cập tự động (Bot/Script) bị từ chối. Vui lòng sử dụng trình duyệt web tiêu chuẩn.",
        retryAfter: 300,
        isTrustedUser: false,
        clientIp: ip,
      };
    }
  }

  // 5. Kiểm tra tín hiệu trình duyệt tiêu chuẩn
  // Các công cụ script thường không gửi header `sec-fetch-mode` hoặc `accept-language`
  // Tuy nhiên ta chỉ tăng cảnh giác chứ KHÔNG chặn nhầm người dùng trình duyệt cũ
  const hasBrowserHeaders = request.headers.has("accept-language") || request.headers.has("sec-fetch-mode");

  // 6. Cơ chế giới hạn tần suất (Sliding-Window Rate Limiting)
  const limits = isTrustedUser ? LIMITS.TRUSTED_USER : LIMITS.ANONYMOUS_USER;

  // Lọc bỏ các timestamp cũ ngoài window 60s
  tracker.requests = tracker.requests.filter(t => now - t < limits.WINDOW_MS);
  // Lọc bỏ các timestamp cũ ngoài burst window 2s
  tracker.burstRequests = tracker.burstRequests.filter(t => now - t < limits.BURST_WINDOW_MS);

  // Thêm request hiện tại
  tracker.requests.push(now);
  tracker.burstRequests.push(now);

  // A. Kiểm tra Burst Rate (Tốc độ máy bắn dồn dập trong 2 giây)
  if (tracker.burstRequests.length > limits.BURST_MAX) {
    botProtectionMetrics.rateLimitsTriggered++;
    return {
      allowed: false,
      status: 429,
      reason: "Tần suất thao tác quá nhanh trong thời gian ngắn. Vui lòng giảm tốc độ và thử lại.",
      retryAfter: 5,
      isTrustedUser,
      clientIp: ip,
    };
  }

  // B. Kiểm tra Sustained Rate (Tần suất trong 1 phút)
  if (tracker.requests.length > limits.MAX_REQUESTS) {
    botProtectionMetrics.rateLimitsTriggered++;
    return {
      allowed: false,
      status: 429,
      reason: isTrustedUser
        ? "Bạn đang gửi quá nhiều yêu cầu liên tục (vượt quá 250 req/phút). Vui lòng nghỉ ngơi 30 giây."
        : "Vượt quá giới hạn truy cập cho khách chưa đăng nhập (60 req/phút). Vui lòng đăng nhập hoặc đợi 30 giây.",
      retryAfter: 30,
      isTrustedUser,
      clientIp: ip,
    };
  }

  if (isTrustedUser) {
    botProtectionMetrics.trustedUsersAllowed++;
  }

  return {
    allowed: true,
    isTrustedUser,
    clientIp: ip,
  };
}

/**
 * Trả về phản hồi từ chối đẹp mắt và thân thiện với tiếng Việt
 */
export function createBlockedResponse(result: BotProtectionResult, isApiRequest: boolean): NextResponse {
  const retrySec = result.retryAfter || 30;

  if (isApiRequest) {
    return NextResponse.json(
      {
        success: false,
        error: result.reason || "Truy cập bị hạn chế bởi hệ thống bảo vệ Anti-Bot.",
        retryAfter: retrySec,
      },
      {
        status: result.status || 429,
        headers: {
          "Retry-After": String(retrySec),
          "X-Protection": "KotoBase-AntiBot",
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  }

  // Phản hồi trang HTML trực quan nếu là truy cập trang web thông thường
  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bảo vệ truy cập - KotoBase</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      padding: 16px;
    }
    .card {
      background: #1e293b;
      border: 1px solid #334155;
      border-radius: 24px;
      padding: 36px 28px;
      max-width: 480px;
      width: 100%;
      text-align: center;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);
    }
    .icon {
      width: 64px;
      height: 64px;
      background: ${result.status === 403 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(245, 158, 11, 0.15)'};
      color: ${result.status === 403 ? '#f87171' : '#fbbf24'};
      border-radius: 20px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      margin-bottom: 20px;
    }
    h1 {
      font-size: 20px;
      font-weight: 800;
      margin: 0 0 12px;
    }
    p {
      font-size: 14px;
      color: #94a3b8;
      line-height: 1.6;
      margin: 0 0 24px;
    }
    .timer {
      display: inline-block;
      font-size: 13px;
      font-weight: 700;
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.1);
      padding: 8px 16px;
      border-radius: 12px;
      margin-bottom: 24px;
    }
    .btn {
      display: block;
      width: 100%;
      background: #6366f1;
      color: #ffffff;
      font-weight: 700;
      font-size: 14px;
      padding: 12px;
      border-radius: 14px;
      border: none;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.2s;
    }
    .btn:hover {
      background: #4f46e5;
    }
    .footer {
      font-size: 11px;
      color: #64748b;
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${result.status === 403 ? '🛡️' : '⏱️'}</div>
    <h1>${result.status === 403 ? 'Phát hiện truy cập tự động' : 'Tần suất thao tác quá nhanh'}</h1>
    <p>${result.reason || 'Hệ thống bảo vệ KotoBase nhận thấy lưu lượng truy cập bất thường từ thiết bị của bạn.'}</p>
    ${result.status === 429 ? `<div class="timer">Vui lòng thử lại sau <span id="countdown">${retrySec}</span>s</div>` : ''}
    <a href="/" class="btn" id="retryBtn">Tải lại trang</a>
    <div class="footer">KotoBase Anti-Bot Protection • IP: ${result.clientIp}</div>
  </div>
  ${result.status === 429 ? `
  <script>
    let timeLeft = ${retrySec};
    const countEl = document.getElementById('countdown');
    const timer = setInterval(() => {
      timeLeft--;
      if (countEl) countEl.innerText = timeLeft;
      if (timeLeft <= 0) {
        clearInterval(timer);
        window.location.reload();
      }
    }, 1000);
  </script>
  ` : ''}
</body>
</html>`;

  return new NextResponse(html, {
    status: result.status || 429,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Retry-After": String(retrySec),
      "X-Protection": "KotoBase-AntiBot",
    },
  });
}
