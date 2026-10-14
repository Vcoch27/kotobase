import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Whitelist các ID tài liệu hợp lệ trên Google Drive
const ALLOWED_PDF_IDS = new Set([
  '1JXPagJU9zdut4rcYmd8Q4gXaFx7idmgT', // Soumatome N3 Kanji
  '18MFu40Ra5CjwJOcTPDq2poXbhFOtqvTe', // Mimi Kara Oboeru N3 Goi
  '1zWuU4D2Ow2LSHLdKJeUHNac_9HArdjLz', // Shin Kanzen Master N3 Bunpou (bản nén tối ưu)
  '1GRApZoSLo5KSoj1bSStxbPwyFhuzV9c9', // Shin Kanzen Master N3 Bunpou (bản gốc)
]);

export async function GET(request: NextRequest, { params }: { params: { fileId: string } }) {
  const fileId = params.fileId;
  if (!ALLOWED_PDF_IDS.has(fileId)) {
    return new Response("Tài liệu không hợp lệ hoặc không có quyền truy cập", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  const range = request.headers.get("range");
  const upstreamUrl = `https://drive.usercontent.google.com/download?id=${encodeURIComponent(fileId)}&export=download&confirm=t`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60000); // 60s timeout

  try {
    const upstream = await fetch(upstreamUrl, {
      headers: {
        ...(range ? { Range: range } : {}),
        "Accept-Encoding": "identity",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
      cache: "no-store",
      signal: AbortSignal.any([request.signal, controller.signal]),
    });

    clearTimeout(timeout);

    if (upstream.status === 416) {
      const contentRange = upstream.headers.get("content-range");
      await upstream.body?.cancel();
      return new Response(null, {
        status: 416,
        headers: {
          "Cache-Control": "public, max-age=86400",
          ...(contentRange ? { "Content-Range": contentRange } : {}),
        },
      });
    }

    if (![200, 206].includes(upstream.status)) {
      await upstream.body?.cancel();
      return new Response(`Máy chủ Google Drive trả về mã lỗi: ${upstream.status}`, {
        status: upstream.status === 503 ? 503 : 502,
        headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
      });
    }

    const headers = new Headers({
      "Content-Type": "application/pdf",
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=604800, stale-while-revalidate=2592000",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
      "Access-Control-Expose-Headers": "Content-Range, Content-Length, Accept-Ranges",
    });

    for (const name of ["content-range", "content-length", "last-modified", "etag"]) {
      const val = upstream.headers.get(name);
      if (val) headers.set(name, val);
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    return new Response("Không thể kết nối đến máy chủ Google Drive", {
      status: 502,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
}
