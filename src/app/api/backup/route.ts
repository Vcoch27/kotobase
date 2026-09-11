import { NextRequest, NextResponse } from "next/server";
import { runFirestoreBackup } from "@/lib/backup/backup-service";

export const dynamic = "force-dynamic";
export const maxDuration = 300; // 5 minutes max duration for backup operations

function isAuthorized(request: NextRequest): boolean {
  const backupSecret = process.env.BACKUP_CRON_SECRET;
  const vercelCronSecret = process.env.CRON_SECRET;

  if (!backupSecret && !vercelCronSecret) {
    return false;
  }

  // Check Bearer token in Authorization header (Sent automatically by Vercel Cron)
  const authHeader = request.headers.get("Authorization");
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7).trim();
    if (backupSecret && token === backupSecret) return true;
    if (vercelCronSecret && token === vercelCronSecret) return true;
  }

  // Check query parameter ?secret=...
  const querySecret = request.nextUrl.searchParams.get("secret");
  if (querySecret) {
    if (backupSecret && querySecret === backupSecret) return true;
    if (vercelCronSecret && querySecret === vercelCronSecret) return true;
  }

  return false;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized access to backup endpoint" }, { status: 401 });
  }

  try {
    const result = await runFirestoreBackup();
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error("Backup execution failed:", error?.message || error);
    return NextResponse.json(
      {
        success: false,
        error: "Backup execution failed",
        message: error?.message || "Internal server error during backup",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return GET(request);
}
