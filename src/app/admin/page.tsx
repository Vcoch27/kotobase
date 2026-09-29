import { getCurrentUser } from "@/lib/session";
import { getAdminOverviewStats, getAdminUsers } from "@/app/actions/admin";
import { AdminUserDashboard } from "@/components/admin/AdminUserDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();

  // Tải dữ liệu ban đầu phía server
  const statsRes = await getAdminOverviewStats(true).catch(() => ({ success: false as const, stats: null, users: undefined }));
  const usersRes = statsRes.success
    ? null
    : await getAdminUsers({ page: 1, limit: 10 }).catch(() => ({ success: false as const, users: [], total: 0, totalPages: 1 }));

  const initialStats = statsRes.success ? statsRes.stats : null;
  const initialUsers = statsRes.success ? (statsRes.users || []).slice(0, 10) : (usersRes?.success ? usersRes.users : []);
  const initialTotal = statsRes.success ? (statsRes.stats?.totalUsers || 0) : (usersRes?.success ? usersRes.total : 0);
  const initialTotalPages = Math.max(1, Math.ceil(initialTotal / 10));

  return (
    <AdminUserDashboard
      currentUser={currentUser ? {
        uid: currentUser.uid,
        email: currentUser.email,
        name: currentUser.name,
        picture: currentUser.picture,
        iat: currentUser.iat,
        exp: currentUser.exp,
      } : null}
      initialStats={initialStats}
      initialUsers={initialUsers}
      initialTotal={initialTotal}
      initialTotalPages={initialTotalPages}
    />
  );
}
