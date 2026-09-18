import { NextRequest } from "next/server";
import { listeningExams } from "@/lib/listening-plan";
import { verifyToken } from "@/lib/auth-utils";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
const allowedFiles = new Set(listeningExams.map(exam => exam.driveFileId));

export async function GET(request: NextRequest, { params }: { params: { fileId: string } }) {
  const user = await getCurrentUser();
  if (!user?.uid) return new Response("Google sign-in required", { status: 401, headers: { "Cache-Control": "private, no-store" } });
  if (process.env.APP_ACCESS_PASSWORD && !(await verifyToken(request.cookies.get("kotobase_auth_token")?.value || ""))) {
    return new Response("Authentication required", { status: 401 });
  }
  if (!allowedFiles.has(params.fileId)) return new Response("Unknown listening file", { status: 404 });

  // Preserve the browser's range, including open-ended and suffix requests.
  // A header timeout must not remain attached to the streaming response body.
  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) return new Response("Unsupported range", { status: 416 });
    const start = match[1] ? Number(match[1]) : null;
    const end = match[2] ? Number(match[2]) : null;
    if ((start !== null && !Number.isSafeInteger(start)) || (end !== null && !Number.isSafeInteger(end)) ||
        (start !== null && end !== null && end < start) || (start === null && end === 0)) {
      return new Response("Invalid range", { status: 416 });
    }
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);
  try {
    const upstream = await fetch(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(params.fileId)}&export=download`, {
      headers: { ...(range ? { Range: range } : {}), "Accept-Encoding": "identity" }, cache: "no-store",
      signal: AbortSignal.any([request.signal, controller.signal]),
    });
    clearTimeout(timeout);
    if (upstream.status === 416) {
      const contentRange = upstream.headers.get("content-range");
      await upstream.body?.cancel();
      return new Response(null, { status: 416, headers: { "Cache-Control": "private, no-store", ...(contentRange ? { "Content-Range": contentRange } : {}) } });
    }
    const type = upstream.headers.get("content-type") || "";
    if (![200, 206].includes(upstream.status) || (!type.startsWith("video/") && !type.startsWith("application/octet-stream")) ||
        (upstream.status === 206 && !upstream.headers.get("content-range"))) {
      await upstream.body?.cancel();
      return new Response("Drive video unavailable; open the Drive preview", { status: 502, headers: { "Cache-Control": "private, no-store" } });
    }
    const headers = new Headers({ "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    for (const name of ["content-range", "content-length"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    // Pipe bytes with backpressure; never materialize the whole video in memory.
    return new Response(upstream.body, { status: upstream.status, headers });
  } catch {
    return new Response("Drive connection unavailable", { status: 502, headers: { "Cache-Control": "private, no-store" } });
  } finally {
    clearTimeout(timeout);
  }
}
