import { NextResponse } from "next/server";

export async function GET() {
  return new NextResponse("Edge TTS disabled", { status: 404 });
}
