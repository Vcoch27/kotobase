"use client";

import { LoaderCircle, Save, Link2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useSettingsStore } from "../store";
import type { CPAConnection } from "../types";

type CPAConnectionFormData = {
  name: string;
  base_url: string;
  secret_key: string;
};

function emptyForm(): CPAConnectionFormData {
  return { name: "", base_url: "", secret_key: "" };
}

function toForm(connection: CPAConnection | null): CPAConnectionFormData {
  if (!connection) {
    return emptyForm();
  }
  return {
    name: connection.name,
    base_url: connection.base_url,
    secret_key: "",
  };
}

type CPAConnectionDialogProps = {
  pool: CPAConnection | null;
  isSaving: boolean;
  onSave: (pool: CPAConnectionFormData) => Promise<void> | void;
  onOpenChange: (open: boolean) => void;
};

export function CPAConnectionDialog({ pool, isSaving, onSave, onOpenChange }: CPAConnectionDialogProps) {
  const isEditing = Boolean(pool);
  const [form, setForm] = useState<CPAConnectionFormData>(() => toForm(pool));
  const [formName, setFormName] = useState(() => pool?.name || "");
  const [formBaseUrl, setFormBaseUrl] = useState(() => pool?.base_url || "");
  const [formSecretKey, setFormSecretKey] = useState("");

  return (
    <Dialog open={Boolean(pool)} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-2xl p-6">
        <DialogHeader className="gap-2">
          <DialogTitle>{isEditing ? "Chỉnh sửa kết nối" : "Thêm kết nối"}</DialogTitle>
          <DialogDescription className="text-sm leading-6">
            {isEditing ? "Thay đổi thông tin kết nối CPA." : "Thêm kết nối CLIProxyAPI mới."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cpa-name">Tên (tuỳ chọn)</Label>
            <Input
              id="cpa-name"
              value={formName}
              onChange={(event) => setFormName(event.target.value)}
              placeholder="Ví dụ: pool chính, pool dự phòng"
              className="h-11 rounded-xl border-stone-200 bg-white"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpa-url">Địa chỉ CPA</Label>
            <div className="relative">
              <Input
                id="cpa-url"
                value={formBaseUrl}
                onChange={(event) => setFormBaseUrl(event.target.value)}
                placeholder="https://cpa.example.com"
                className="h-11 rounded-xl border-stone-200 bg-white pr-10"
              />
              <Link2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-stone-400" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cpa-secret">Mã bảo mật</Label>
            <Input
              id="cpa-secret"
              type="password"
              value={formSecretKey}
              onChange={(event) => setFormSecretKey(event.target.value)}
              placeholder={isEditing ? "Để trống nếu không đổi mã" : "Mã quản lý CPA"}
              className="h-11 rounded-xl border-stone-200 bg-white pr-10"
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="secondary"
            className="h-10 rounded-xl bg-stone-100 px-5 text-stone-700 hover:bg-stone-200"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Hủy
          </Button>
          <Button
            type="button"
            className="h-10 rounded-xl bg-stone-950 px-5 text-white hover:bg-stone-800"
            onClick={() => onSave({ name: formName, base_url: formBaseUrl, secret_key: formSecretKey })}
            disabled={isSaving}
          >
            {isSaving ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            {isEditing ? "Lưu thay đổi" : "Thêm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}