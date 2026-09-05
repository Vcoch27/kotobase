import { NextResponse } from "next/server";
import releaseData from "@/config/app-release.json";

export async function GET() {
  return NextResponse.json(releaseData, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
