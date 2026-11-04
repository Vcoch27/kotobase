import { Metadata } from "next";
import { redirect } from "next/navigation";
import { verifyAdminSession } from "@/lib/admin";
import { getCurrentUser } from "@/lib/session";
import { getSystemPrompts } from "@/app/actions/prompt";
import { AdminHeader } from "@/components/admin/AdminHeader";
import { PromptManagementPanel } from "@/components/admin/PromptManagementPanel";

export const metadata: Metadata = {
  title: "Quản lý Prompt Tiện ích | Admin KotoBase",
  description: "Tùy chỉnh các câu lệnh Prompt AI khi tạo nhanh nội dung từ vựng, ngữ pháp và mẫu câu",
};

export const dynamic = "force-dynamic";

export default async function AdminPromptsPage() {
  const { isAdmin, user: adminSessionUser } = await verifyAdminSession();
  if (!isAdmin) {
    redirect("/");
  }

  const currentUser = await getCurrentUser();
  const promptsRes = await getSystemPrompts();
  const initialPrompts = promptsRes.prompts;

  return (
    <div className="min-h-screen bg-[oklch(var(--color-bg))] flex flex-col">
      <AdminHeader
        currentUser={
          currentUser
            ? {
                uid: currentUser.uid,
                email: currentUser.email,
                name: currentUser.name,
                picture: currentUser.picture,
                iat: currentUser.iat,
                exp: currentUser.exp,
              }
            : null
        }
        activeTab="prompts"
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <PromptManagementPanel
          initialPrompts={initialPrompts}
          currentUserEmail={adminSessionUser?.email || currentUser?.email}
        />
      </main>
    </div>
  );
}
