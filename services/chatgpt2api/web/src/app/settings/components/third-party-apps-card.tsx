"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useSettingsStore } from "../store";

export function ThirdPartyAppsCard() {
  const canvas = useSettingsStore((state) => state.canvas);
  const toggleCanvas = useSettingsStore((state) => state.toggleCanvas);

  return (
    <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
      <CardContent className="space-y-6 p-6">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Ứng dụng của bên thứ ba</h2>
          <p className="text-sm text-stone-500">Bật/tắt tính năng tích hợp bên ngoài.</p>
        </div>

        <div className="flex items-center justify-between rounded-xl border border-stone-200 bg-white px-4 py-3">
          <div>
            <div className="text-sm font-medium text-stone-900">Canvas</div>
            <div className="text-xs text-stone-500">Cho phép dùng canvas vẽ ảnh từ các ứng dụng bên thứ ba</div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs ${canvas.enabled ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
              {canvas.enabled ? "Đã bật" : "Chưa bật"}
            </span>
            <Checkbox checked={canvas.enabled} onCheckedChange={(checked) => toggleCanvas(Boolean(checked))} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}