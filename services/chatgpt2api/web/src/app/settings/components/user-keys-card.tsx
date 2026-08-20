"use client";

import { useEffect, useRef, useState } from "react";
import { Ban, CheckCircle2, Copy, KeyRound, LoaderCircle, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { createUserKey, deleteUserKey, fetchUserKeys, updateUserKey, type UserKey } from "@/lib/api";

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("vi-VN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function UserKeysCard() {
  const didLoadRef = useRef(false);
  const [items, setItems] = useState<UserKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [pendingIds, setPendingIds] = useState<Set<string>>(() => new Set());
  const [revealedKey, setRevealedKey] = useState("");
  const [deletingItem, setDeletingItem] = useState<UserKey | null>(null);
  const [editingItem, setEditingItem] = useState<UserKey | null>(null);
  const [editName, setEditName] = useState("");
  const [editKey, setEditKey] = useState("");

  const load = async () => {
    setIsLoading(true);
    try {
      const data = await fetchUserKeys();
      setItems(data.items);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tải khóa người dùng thất bại");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (!didLoadRef.current) { didLoadRef.current = true; void load(); } }, []);

  const setItemPending = (id: string, isPending: boolean) => {
    setPendingIds((current) => { const next = new Set(current); if (isPending) next.add(id); else next.delete(id); return next; });
  };

  const handleCreate = async () => {
    setIsCreating(true);
    try {
      const data = await createUserKey(name.trim());
      setItems(data.items);
      setRevealedKey(data.key);
      setName("");
      setIsDialogOpen(false);
      toast.success("Đã tạo khóa người dùng");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Tạo khóa người dùng thất bại");
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggle = async (item: UserKey) => {
    setItemPending(item.id, true);
    try {
      const data = await updateUserKey(item.id, { enabled: !item.enabled });
      setItems(data.items);
      toast.success(item.enabled ? "Đã vô hiệu hóa khóa người dùng" : "Đã kích hoạt khóa người dùng");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cập nhật khóa người dùng thất bại");
    } finally {
      setItemPending(item.id, false);
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    const item = deletingItem;
    setItemPending(item.id, true);
    try {
      const data = await deleteUserKey(item.id);
      setItems(data.items);
      setDeletingItem(null);
      toast.success("Đã xóa khóa người dùng");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Xóa khóa người dùng thất bại");
    } finally {
      setItemPending(item.id, false);
    }
  };

  const openEditDialog = (item: UserKey) => { setEditingItem(item); setEditName(item.name); setEditKey(""); };

  const handleEdit = async () => {
    if (!editingItem) return;
    const item = editingItem;
    const trimmedName = editName.trim();
    const trimmedKey = editKey.trim();
    if (trimmedName === item.name && !trimmedKey) { setEditingItem(null); return; }
    setItemPending(item.id, true);
    try {
      const data = await updateUserKey(item.id, { ...(trimmedName !== item.name ? { name: trimmedName } : {}), ...(trimmedKey ? { key: trimmedKey } : {}) });
      setItems(data.items);
      setEditingItem(null);
      setEditKey("");
      toast.success(trimmedKey ? "Đã cập nhật khóa người dùng" : "Đã cập nhật tên người dùng");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cập nhật khóa người dùng thất bại");
    } finally {
      setItemPending(item.id, false);
    }
  };

  const handleCopy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Đã sao chép vào clipboard");
    } catch {
      toast.error("Sao chép thất bại, vui lòng sao chép thủ công");
    }
  };

  return (
    <>
      <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
        <CardContent className="space-y-6 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-stone-100">
                <KeyRound className="size-5 text-stone-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold tracking-tight">Quản lý khóa người dùng</h2>
                <p className="text-sm text-stone-500">Tạo khóa chuyên dụng cho người dùng thường; chỉ truy cập được trang vẽ ảnh, không xem được cài đặt và quản lý tài khoản.</p>
              </div>
            </div>
            <Button className="h-9 rounded-xl bg-stone-950 px-4 text-white hover:bg-stone-800" onClick={() => setIsDialogOpen(true)}>
              <Plus className="size-4" /> Tạo khóa người dùng
            </Button>
          </div>

          {revealedKey && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
              <div className="font-medium">Khóa mới chỉ hiển thị một lần, vui lòng lưu ngay:</div>
              <div className="mt-3 flex flex-col gap-3 rounded-lg border border-emerald-200 bg-white/80 p-3 md:flex-row md:items-center md:justify-between">
                <code className="break-all font-mono text-[13px]">{revealedKey}</code>
                <Button type="button" variant="outline" className="h-9 rounded-xl border-emerald-200 bg-white px-4 text-emerald-700" onClick={() => void handleCopy(revealedKey)}>
                  <Copy className="size-4" /> Sao chép
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-10"><LoaderCircle className="size-5 animate-spin text-stone-400" /></div>
          ) : items.length === 0 ? (
            <div className="rounded-xl bg-stone-50 px-6 py-10 text-center text-sm text-stone-500">
              Chưa có khóa người dùng thường. Nhấn nút góc trên bên phải để tạo và phân phối cho người khác.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const isPending = pendingIds.has(item.id);
                return (
                  <div key={item.id} className="flex flex-col gap-3 rounded-xl border border-stone-200 bg-white px-4 py-4 md:flex-row md:items-center md:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="truncate text-sm font-medium text-stone-800">{item.name}</div>
                        <Badge variant={item.enabled ? "success" : "secondary"} className="rounded-md">
                          {item.enabled ? "Đã kích hoạt" : "Đã vô hiệu hóa"}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-stone-500">
                        <span>Thời gian tạo {formatDateTime(item.created_at)}</span>
                        <span>Sử dụng lần cuối {formatDateTime(item.last_used_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" className="h-9 rounded-xl border-stone-200 bg-white px-4 text-stone-700" onClick={() => openEditDialog(item)} disabled={isPending}>
                        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Pencil className="size-4" />} Chỉnh sửa
                      </Button>
                      <Button type="button" variant="outline" className="h-9 rounded-xl border-stone-200 bg-white px-4 text-stone-700" onClick={() => void handleToggle(item)} disabled={isPending}>
                        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : item.enabled ? <Ban className="size-4" /> : <CheckCircle2 className="size-4" />}
                        {item.enabled ? "Vô hiệu hóa" : "Kích hoạt"}
                      </Button>
                      <Button type="button" variant="outline" className="h-9 rounded-xl border-rose-200 bg-white px-4 text-rose-600 hover:bg-rose-50 hover:text-rose-700" onClick={() => setDeletingItem(item)} disabled={isPending}>
                        {isPending ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Xóa
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <DialogTitle>Tạo khóa người dùng</DialogTitle>
            <DialogDescription className="text-sm leading-6">
              Có thể điền tên ghi chú để phân biệt người dùng; sau khi tạo sẽ tạo ra một khóa gốc chỉ xem được một lần.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <label className="text-sm font-medium text-stone-700">Tên (tùy chọn)</label>
            <Input value={name} onChange={(event) => setName(event.target.value)} placeholder="Ví dụ: bạn A thiết kế, tài khoản tạm vận hành" className="h-11 rounded-xl border-stone-200 bg-white" />
          </div>
          <DialogFooter>
            <Button type="button" variant="secondary" className="h-10 rounded-xl bg-stone-100 px-5 text-stone-700 hover:bg-stone-200" onClick={() => setIsDialogOpen(false)} disabled={isCreating}>Hủy</Button>
            <Button type="button" className="h-10 rounded-xl bg-stone-950 px-5 text-white hover:bg-stone-800" onClick={() => void handleCreate()} disabled={isCreating}>
              {isCreating ? <LoaderCircle className="size-4 animate-spin" /> : <Plus className="size-4" />} Tạo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deletingItem)} onOpenChange={(open) => (!open ? setDeletingItem(null) : null)}>
        <DialogContent className="rounded-2xl p-6">
          <DialogHeader className="gap-2">
            <DialogTitle>Xóa khóa người dùng</DialogTitle>
            <DialogDescription className="text-sm leading-6">
              Xác nhận xóa khóa người dùng「{deletingItem?.name}」? Sau khi xóa, khóa này không thể gọi API nữa.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" className="h-10 rounded-xl bg-stone-100 px-5 text-stone-700 hover:bg-stone-200" onClick={() => setDeletingItem(null)} disabled={Boolean(deletingItem && pendingIds.has(deletingItem.id))}>Hủy</Button>
            <Button type="button" className="h-10 rounded-xl bg-rose-600 px-5 text-white hover:bg-rose-700" onClick={() => void handleDelete()} disabled={Boolean(deletingItem && pendingIds.has(deletingItem.id))}>
              {deletingItem && pendingIds.has(deletingItem.id) ? <LoaderCircle className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingItem && (
        <Dialog open={Boolean(editingItem)} onOpenChange={(open) => { if (!open) { setEditingItem(null); setEditKey(""); } }}>
          <DialogContent className="rounded-2xl p-6">
            <DialogHeader className="gap-2">
              <DialogTitle>Chỉnh sửa khóa người dùng</DialogTitle>
              <DialogDescription className="text-sm leading-6">
                Có thể sửa tên ghi chú; để đổi khóa thì điền khóa mới vào ô dưới. Để trống giữ nguyên giá trị hiện tại.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">Tên</label>
                <Input value={editName} onChange={(event) => setEditName(event.target.value)} placeholder="ví dụ: bạn A thiết kế, tài khoản tạm vận hành" className="h-11 rounded-xl border-stone-200 bg-white" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-stone-700">Khóa chuyên dụng mới (tùy chọn)</label>
                <Input value={editKey} onChange={(event) => setEditKey(event.target.value)} placeholder="ví dụ: sk-your-custom-user-key" className="h-11 rounded-xl border-stone-200 bg-white font-mono" />
                <p className="text-xs leading-5 text-stone-500">
                  Sau khi lưu, khóa cũ sẽ mất hiệu lực ngay và khóa mới có hiệu lực. Hệ thống chỉ lưu hash, không hiển thị lại khóa hiện tại.
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="secondary" className="h-10 rounded-xl bg-stone-100 px-5 text-stone-700 hover:bg-stone-200" onClick={() => { setEditingItem(null); setEditKey(""); }} disabled={Boolean(editingItem && pendingIds.has(editingItem.id))}>Hủy</Button>
              <Button type="button" className="h-10 rounded-xl bg-stone-950 px-5 text-white hover:bg-stone-800" onClick={() => void handleEdit()} disabled={Boolean(editingItem && pendingIds.has(editingItem.id))}>
                {editingItem && pendingIds.has(editingItem.id) ? <LoaderCircle className="size-4 animate-spin" /> : <Pencil className="size-4" />} Lưu
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}