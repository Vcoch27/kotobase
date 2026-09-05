import { NextResponse } from "next/server";
import releaseData from "@/config/app-release.json";

export async function GET() {
  let latestVersion = releaseData.version;

  try {
    const res = await fetch("https://api.github.com/repos/Vcoch27/kotobase/releases/latest", {
      next: { revalidate: 3600 }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.tag_name) {
        latestVersion = data.tag_name.replace('v', '');
      }
    }
  } catch (e) {
    console.error("Failed to fetch Github version:", e);
  }

  return NextResponse.json({ ...releaseData, version: latestVersion }, {
    headers: {
      "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
    },
  });
}
