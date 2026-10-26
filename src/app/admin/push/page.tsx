import Link from "next/link";
import { getSystemNotifications } from "@/app/actions/notification";
import { verifyAdminSession } from "@/lib/admin";
import { redirect } from "next/navigation";
import { pushConfiguration } from "@/lib/web-push";
import { PushBroadcastPanel } from "@/components/admin/PushBroadcastPanel";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export default async function PushAdminPage() {
  const { isAdmin } = await verifyAdminSession();
  if (!isAdmin) redirect("/");
  const notifications = await getSystemNotifications();
  return <main className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
    <Link href="/admin" className="mb-5 inline-block text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-300">← Về quản trị</Link>
    <PushBroadcastPanel notifications={notifications} configured={!!pushConfiguration()} />
  </main>;
}
