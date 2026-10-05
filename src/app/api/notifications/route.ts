import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snap = await adminDb
      .collection("system_notifications")
      .orderBy("createdAt", "desc")
      .limit(20)
      .get();

    const notifications = snap.docs
      .map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          title: d.title || "",
          summary: d.summary || "",
          content: d.content || "",
          type: d.type || "feature",
          tag: d.tag || undefined,
          link: d.link || undefined,
          createdAt:
            typeof d.createdAt === "string"
              ? d.createdAt
              : d.createdAt?.toDate?.().toISOString() || new Date().toISOString(),
          isActive: d.isActive !== false,
          version: d.version || undefined,
        };
      })
      .filter((n) => n.isActive);

    return NextResponse.json(notifications, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (error: any) {
    console.error("Lỗi API /api/notifications:", error);
    return NextResponse.json([], { status: 200 });
  }
}
