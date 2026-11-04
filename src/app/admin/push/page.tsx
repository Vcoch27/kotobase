import { getSystemNotifications } from "@/app/actions/notification";
import { verifyAdminSession } from "@/lib/admin";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { pushConfiguration } from "@/lib/web-push";
import { PushBroadcastPanel } from "@/components/admin/PushBroadcastPanel";
import { AdminHeader } from "@/components/admin/AdminHeader";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function PushAdminPage() {
  const { isAdmin } = await verifyAdminSession();
  if (!isAdmin) redirect("/");
  
  const currentUser = await getCurrentUser();
  const notifications = await getSystemNotifications();

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
        activeTab="push"
      />

      <main className="flex-1 mx-auto max-w-3xl w-full px-4 py-6 sm:py-8">
        <PushBroadcastPanel notifications={notifications} configured={!!pushConfiguration()} />
      </main>
    </div>
  );
}
