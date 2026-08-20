"use client";

import { LoaderCircle, MoreVertical, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSettingsStore } from "../store";
import type { CPAConnection } from "../types";

export function CPAPoolsCard() {
  const connections = useSettingsStore((state) => state.cpaConnections);
  const isLoading = useSettingsStore((state) => state.isLoadingConfig);
  const isSaving = useSettingsStore((state) => state.isSavingConfig);
  const refreshConfig = useSettingsStore((state) => state.refreshConfig);
  const saveAndRefresh = useSettingsStore((state) => state.saveAndRefresh);
  const [editingPool, setEditingPool] = useState<CPAConnection | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
        <CardContent className="flex items-center justify-center p-10">
          <LoaderCircle className="size-5 animate-spin text-stone-400" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
      <CardContent className="space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Kết nối CPA</h2>
            <p className="text-sm text-stone-500">Quản lý các kết nối CLIProxyAPI.</p>
          </div>
          <Button className="h-9 rounded-xl bg-stone-950 px-4 text-white hover:bg-stone-800" onClick={() => { setEditingPool(null); setIsDialogOpen(true); }}>
            Thêm kết nối
          </Button>
        </div>

        {connections.length === 0 ? (
          <div className="rounded-xl border border-dashed border-stone-200 bg-stone-50 px-4 py-10 text-center text-sm text-stone-500">
            Chưa có kết nối CPA nào. Nhấn Thêm kết nối để bắt đầu.
          </div>
        ) : (
          <div className="space-y-3">
            {connections.map((connection) => (
              <div key={connection.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-stone-900">{connection.name || "Kết nối"}</div>
                  <div className="truncate text-xs text-stone-500">{connection.base_url}</div>
                </div>
                <DropdownMenu open={menuOpenId === connection.id} onOpenChange={(open) => { setMenuOpenId(open ? connection.id : null); }}>
                  <DropdownMenuTrigger asChild>
                    <button type="button" className="inline-flex size-8 items-center justify-center rounded-md text-stone-400 hover:bg-stone-100">
                      <MoreVertical className="size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => { setEditingPool(connection); setIsDialogOpen(true); }}>
                      <Pencil className="mr-2 size-4" /> Chỉnh sửa
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-rose-600" onClick={() => { }}>
                      <Trash2 className="mr-2 size-4" /> Xóa
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}