import { getCurrentUser } from "@/lib/session";
import { getAdminOverviewStats, getAdminUsers } from "@/app/actions/admin";
import { AdminUserDashboard } from "@/components/admin/AdminUserDashboard";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const currentUser = await getCurrentUser();

  // Tải dữ liệu ban đầu phía server
  const [statsRes, usersRes] = await Promise.all([
    getAdminOverviewStats().catch(() => ({ success: false, stats: null })),
    getAdminUsers({ page: 1, limit: 10 }).catch(() => ({ success: false, users: [], total: 0, totalPages: 1 })),
  ]);

  const initialStats = statsRes.success ? statsRes.stats : null;
  const initialUsers = usersRes.success ? usersRes.users : [];
  const initialTotal = usersRes.success ? usersRes.total : 0;
  const initialTotalPages = usersRes.success ? usersRes.totalPages : 1;

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
