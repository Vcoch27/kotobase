import { NextRequest } from "next/server";
import { listeningExams } from "@/lib/listening-plan";
import { verifyToken } from "@/lib/auth-utils";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";
const CHUNK_SIZE = 2 * 1024 * 1024;
const allowedFiles = new Set(listeningExams.map(exam => exam.driveFileId));

export async function GET(request: NextRequest, { params }: { params: { fileId: string } }) {
  const user = await getCurrentUser();
  if (!user?.uid) return new Response("Google sign-in required", { status: 401, headers: { "Cache-Control": "private, no-store" } });
  if (process.env.APP_ACCESS_PASSWORD && !(await verifyToken(request.cookies.get("kotobase_auth_token")?.value || ""))) {
    return new Response("Authentication required", { status: 401 });
  }
  if (!allowedFiles.has(params.fileId)) return new Response("Unknown listening file", { status: 404 });

  // Bound each streaming response; never buffer or proxy the whole MP4 in memory.
  const range = request.headers.get("range");
  const match = range?.match(/^bytes=(\d+)-(\d*)$/);
  if (range && !match) return new Response("Unsupported range", { status: 416 });
  const start = match ? Number(match[1]) : 0;
  const requestedEnd = match?.[2] ? Number(match[2]) : start + CHUNK_SIZE - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(requestedEnd) || requestedEnd < start || start > Number.MAX_SAFE_INTEGER - CHUNK_SIZE) {
    return new Response("Invalid range", { status: 416 });
  }
  const end = Math.min(requestedEnd, start + CHUNK_SIZE - 1);
  try {
    const upstream = await fetch(`https://drive.usercontent.google.com/download?id=${encodeURIComponent(params.fileId)}&export=download`, {
      headers: { Range: `bytes=${start}-${end}` }, cache: "no-store",
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(25000)]),
    });
    if (upstream.status === 416) {
      const contentRange = upstream.headers.get("content-range");
      await upstream.body?.cancel();
      return new Response(null, { status: 416, headers: contentRange ? { "Content-Range": contentRange } : undefined });
    }
    if (upstream.status !== 206 || !upstream.headers.get("content-type")?.startsWith("video/") || !upstream.headers.get("content-range")) {
      await upstream.body?.cancel();
      return new Response("Drive video unavailable; open the Drive preview", { status: 502 });
    }
    const headers = new Headers({ "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" });
    for (const name of ["content-range", "content-length"]) {
      const value = upstream.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(upstream.body, { status: 206, headers });
  } catch {
    return new Response("Drive connection unavailable", { status: 502 });
  }
}
