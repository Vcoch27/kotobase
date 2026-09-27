"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminHeader } from "./AdminHeader";
import { AdminStatsOverview } from "./AdminStatsOverview";
import { UserFilterBar } from "./UserFilterBar";
import { UserTable } from "./UserTable";
import { UserDetailModal } from "./UserDetailModal";
import { UserFormModal } from "./UserFormModal";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { 
  getAdminUsers, 
  getAdminOverviewStats, 
  updateUserRole, 
  updateUserStatus, 
  updateUserNotes, 
  deleteUserPermanently, 
  createAdminUser,
  type AdminStats 
} from "@/app/actions/admin";
import { type AppUser } from "@/lib/admin-shared";
import { type UserSession } from "@/lib/auth-utils";
import toast from "react-hot-toast";

interface AdminUserDashboardProps {
  currentUser?: UserSession | null;
  initialStats?: AdminStats | null;
  initialUsers?: AppUser[];
  initialTotal?: number;
  initialTotalPages?: number;
}

export function AdminUserDashboard({
  currentUser,
  initialStats = null,
  initialUsers = [],
  initialTotal = 0,
  initialTotalPages = 1,
}: AdminUserDashboardProps) {
  const [users, setUsers] = useState<AppUser[]>(initialUsers);
  const [stats, setStats] = useState<AdminStats | null>(initialStats);
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [role, setRole] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [total, setTotal] = useState(initialTotal);

  // Modals state
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [confirmConfig, setConfirmConfig] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText?: string;
    confirmVariant?: "danger" | "warning";
    onConfirm: () => Promise<void>;
  } | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch users list
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getAdminUsers({
        search: debouncedSearch,
        role,
        status,
        page,
        limit: 10,
      });

      if (res.success) {
        setUsers(res.users);
        setTotal(res.total);
        setTotalPages(res.totalPages);
      } else {
        toast.error(res.error || "Không thể tải danh sách người dùng.");
      }
    } catch {
      toast.error("Lỗi mạng khi tải dữ liệu người dùng.");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, role, status, page]);

  // Fetch overview stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await getAdminOverviewStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch {}
  }, []);

  // Fetch when filters or page changes
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchUsers(), fetchStats()]);
    setIsRefreshing(false);
    toast.success("Đã làm mới dữ liệu người dùng!");
  };

  // Open user details
  const handleSelectUser = (u: AppUser) => {
    setSelectedUser(u);
    setIsDetailOpen(true);
  };

  // Toggle Role
  const handleToggleRole = (user: AppUser) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    const roleName = nextRole === "admin" ? "Quản trị viên" : "Học viên";

    setConfirmConfig({
      isOpen: true,
      title: `Thay đổi vai trò cho ${user.displayName}?`,
      description: `Bạn có chắc muốn đặt vai trò của tài khoản ${user.email} thành ${roleName}?`,
      confirmText: "Đồng ý",
      confirmVariant: "warning",
      onConfirm: async () => {
        const res = await updateUserRole(user.uid, nextRole);
        if (res.success) {
          toast.success(`Đã đổi vai trò thành ${roleName}!`);
          setUsers((prev) =>
            prev.map((u) => (u.uid === user.uid ? { ...u, role: nextRole } : u))
          );
          if (selectedUser?.uid === user.uid) {
            setSelectedUser((prev) => (prev ? { ...prev, role: nextRole } : null));
          }
          fetchStats();
        } else {
          toast.error(res.error || "Lỗi khi cập nhật vai trò.");
        }
      },
    });
  };

  // Toggle Status (Lock / Unlock)
  const handleToggleStatus = (user: AppUser) => {
    const nextStatus = user.status === "disabled" ? "active" : "disabled";
    const isLocking = nextStatus === "disabled";

    setConfirmConfig({
      isOpen: true,
      title: isLocking ? `Khóa tài khoản ${user.displayName}?` : `Mở khóa tài khoản ${user.displayName}?`,
      description: isLocking
        ? `Người dùng ${user.email} sẽ bị thu hồi phiên đăng nhập ngay lập tức và không thể truy cập ứng dụng.`
        : `Người dùng ${user.email} sẽ có thể đăng nhập và sử dụng ứng dụng bình thường trở lại.`,
      confirmText: isLocking ? "Khóa tài khoản" : "Mở khóa",
      confirmVariant: isLocking ? "danger" : "warning",
      onConfirm: async () => {
        const res = await updateUserStatus(user.uid, nextStatus);
        if (res.success) {
          toast.success(isLocking ? "Đã khóa tài khoản thành công!" : "Đã mở khóa tài khoản thành công!");
          setUsers((prev) =>
            prev.map((u) => (u.uid === user.uid ? { ...u, status: nextStatus } : u))
          );
          if (selectedUser?.uid === user.uid) {
            setSelectedUser((prev) => (prev ? { ...prev, status: nextStatus } : null));
          }
          fetchStats();
        } else {
          toast.error(res.error || "Lỗi khi cập nhật trạng thái.");
        }
      },
    });
  };

  // Delete User
  const handleDeleteUser = (user: AppUser) => {
    setConfirmConfig({
      isOpen: true,
      title: `Xóa vĩnh viễn người dùng ${user.displayName}?`,
      description: `Hành động này KHÔNG THỂ HOÀN TÁC. Toàn bộ thông tin tài khoản ${user.email} sẽ bị xóa hoàn toàn khỏi Firebase Auth và cơ sở dữ liệu.`,
      confirmText: "Xóa vĩnh viễn",
      confirmVariant: "danger",
      onConfirm: async () => {
        const res = await deleteUserPermanently(user.uid);
        if (res.success) {
          toast.success("Đã xóa người dùng thành công!");
          setUsers((prev) => prev.filter((u) => u.uid !== user.uid));
          if (selectedUser?.uid === user.uid) {
            setIsDetailOpen(false);
            setSelectedUser(null);
          }
          fetchStats();
        } else {
          toast.error(res.error || "Lỗi khi xóa người dùng.");
        }
      },
    });
  };

  // Save Notes
  const handleSaveNotes = async (uid: string, notes: string): Promise<boolean> => {
    const res = await updateUserNotes(uid, notes);
    if (res.success) {
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, notes } : u))
      );
      if (selectedUser?.uid === uid) {
        setSelectedUser((prev) => (prev ? { ...prev, notes } : null));
      }
      return true;
    }
    return false;
  };

  // Create User
  const handleCreateUser = async (data: {
    email: string;
    displayName: string;
    password?: string;
    role: "admin" | "user";
  }): Promise<boolean> => {
    const res = await createAdminUser(data);
    if (res.success) {
      toast.success("Đã tạo người dùng mới thành công!");
      fetchUsers();
      fetchStats();
      return true;
    } else {
      toast.error(res.error || "Lỗi khi tạo người dùng.");
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-[oklch(var(--color-bg))] text-slate-900 dark:text-slate-100 font-sans antialiased flex flex-col transition-colors">
      {/* Top Header */}
      <AdminHeader currentUser={currentUser} activeTab="users" />

      {/* Main Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* KPI Overview */}
        <AdminStatsOverview stats={stats} />

        {/* Filters and Search */}
        <UserFilterBar
          search={search}
          onSearchChange={setSearch}
          role={role}
          onRoleChange={(r) => {
            setRole(r);
            setPage(1);
          }}
          status={status}
          onStatusChange={(s) => {
            setStatus(s);
            setPage(1);
          }}
          onRefresh={handleRefresh}
          isRefreshing={isRefreshing}
          onOpenCreateModal={() => setIsCreateOpen(true)}
          totalCount={total}
        />

        {/* Users Data Table */}
        <UserTable
          users={users}
          currentAdminUid={currentUser?.uid}
          loading={loading}
          page={page}
          totalPages={totalPages}
          total={total}
          onPageChange={setPage}
          onSelectUser={handleSelectUser}
          onToggleStatus={handleToggleStatus}
          onToggleRole={handleToggleRole}
          onDeleteUser={handleDeleteUser}
        />
      </main>

      {/* User Detail Modal */}
      <UserDetailModal
        user={selectedUser}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedUser(null);
        }}
        onUpdateRole={handleToggleRole}
        onToggleStatus={handleToggleStatus}
        onSaveNotes={handleSaveNotes}
        currentAdminUid={currentUser?.uid}
      />

      {/* Create User Modal */}
      <UserFormModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={handleCreateUser}
      />

      {/* Confirm Action Dialog */}
      {confirmConfig && (
        <ConfirmActionModal
          isOpen={confirmConfig.isOpen}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmText={confirmConfig.confirmText}
          confirmVariant={confirmConfig.confirmVariant}
          onConfirm={confirmConfig.onConfirm}
          onClose={() => setConfirmConfig(null)}
        />
      )}
    </div>
  );
}
