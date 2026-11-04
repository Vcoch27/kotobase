"use server";

import { adminDb } from "@/lib/firebase-admin";
import { verifyAdminSession } from "@/lib/admin";
import { revalidatePath } from "next/cache";
import { DEFAULT_PROMPTS, type PromptConfig } from "@/lib/prompt-templates";

// In-memory cache serverless: Giữ 15 phút, giảm tối đa số lượt đọc Firestore (tối ưu Free Tier)
let memoryPromptsCache: { data: Record<string, PromptConfig>; expiresAt: number } | null = null;

/**
 * Lấy toàn bộ cấu hình Prompt hệ thống (Có cache in-memory 15 phút)
 */
export async function getSystemPrompts(): Promise<{
  success: boolean;
  prompts: Record<string, PromptConfig>;
  error?: string;
}> {
  const now = Date.now();
  if (memoryPromptsCache && now < memoryPromptsCache.expiresAt) {
    return { success: true, prompts: memoryPromptsCache.data };
  }

  try {
    const docRef = adminDb.collection("system_prompts").doc("active_prompts");
    const docSnap = await docRef.get();

    const merged: Record<string, PromptConfig> = { ...DEFAULT_PROMPTS };

    if (docSnap.exists) {
      const data = docSnap.data() || {};
      for (const [key, val] of Object.entries(data)) {
        if (merged[key] && typeof val === "object" && val !== null) {
          const v = val as Partial<PromptConfig>;
          merged[key] = {
            ...merged[key],
            content: v.content !== undefined ? v.content : merged[key].content,
            updatedAt: v.updatedAt || merged[key].updatedAt,
            updatedBy: v.updatedBy || merged[key].updatedBy,
            version: v.version || merged[key].version,
          };
        }
      }
    }

    memoryPromptsCache = {
      data: merged,
      expiresAt: now + 15 * 60 * 1000, // 15 phút
    };

    return { success: true, prompts: merged };
  } catch (error: any) {
    console.error("Lỗi khi tải system prompts từ Firestore:", error);
    // Nếu có lỗi, luôn fallback an toàn về cấu hình mặc định, không để vỡ app
    return { success: true, prompts: DEFAULT_PROMPTS };
  }
}

/**
 * Cập nhật nội dung một Prompt (Chỉ dành cho Admin)
 */
export async function updateSystemPrompt(
  promptId: string,
  newContent: string
): Promise<{ success: boolean; error?: string }> {
  const { isAdmin, user } = await verifyAdminSession();
  if (!isAdmin || !user) {
    return { success: false, error: "Bạn không có quyền thực hiện thao tác này." };
  }

  if (!promptId || !DEFAULT_PROMPTS[promptId]) {
    return { success: false, error: `Mã prompt "${promptId}" không hợp lệ.` };
  }

  if (!newContent || !newContent.trim()) {
    return { success: false, error: "Nội dung prompt không được để trống." };
  }

  try {
    const now = new Date().toISOString();
    const docRef = adminDb.collection("system_prompts").doc("active_prompts");

    await docRef.set(
      {
        [promptId]: {
          content: newContent.trim(),
          updatedAt: now,
          updatedBy: user.email || "admin",
        },
      },
      { merge: true }
    );

    // Xóa cache ngay lập tức để người dùng nhận prompt mới
    memoryPromptsCache = null;

    revalidatePath("/admin/prompts");
    revalidatePath("/");

    return { success: true };
  } catch (error: any) {
    console.error("Lỗi khi cập nhật system prompt:", error);
    return { success: false, error: error.message || "Không thể cập nhật prompt vào Firestore." };
  }
}

/**
 * Khôi phục Prompt về mặc định gốc của hệ thống (Chỉ dành cho Admin)
 */
export async function resetSystemPrompt(
  promptId: string
): Promise<{ success: boolean; defaultContent?: string; error?: string }> {
  const { isAdmin, user } = await verifyAdminSession();
  if (!isAdmin || !user) {
    return { success: false, error: "Bạn không có quyền thực hiện thao tác này." };
  }

  const defaultItem = DEFAULT_PROMPTS[promptId];
  if (!defaultItem) {
    return { success: false, error: `Mã prompt "${promptId}" không hợp lệ.` };
  }

  try {
    const now = new Date().toISOString();
    const docRef = adminDb.collection("system_prompts").doc("active_prompts");

    await docRef.set(
      {
        [promptId]: {
          content: defaultItem.defaultContent,
          updatedAt: now,
          updatedBy: `${user.email} (Reset)`,
        },
      },
      { merge: true }
    );

    memoryPromptsCache = null;

    revalidatePath("/admin/prompts");
    revalidatePath("/");

    return { success: true, defaultContent: defaultItem.defaultContent };
  } catch (error: any) {
    console.error("Lỗi khi reset system prompt:", error);
    return { success: false, error: error.message || "Không thể khôi phục prompt." };
  }
}
