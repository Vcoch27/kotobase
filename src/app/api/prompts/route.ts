import { NextResponse } from "next/server";
import { getSystemPrompts } from "@/app/actions/prompt";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const res = await getSystemPrompts();
    return NextResponse.json(res.prompts, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
