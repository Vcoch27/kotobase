"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { LoaderCircle, PlugZap } from "lucide-react";
import { testProxy, type ProxyTestResult } from "@/lib/api";

import { useSettingsStore } from "../store";

export function ProxySettings() {
  const didLoadRef = useRef(false);
  const [formEnabled, setFormEnabled] = useState(false);
  const [formUrl, setFormUrl] = useState("");
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<ProxyTestResult | null>(null);
  const config = useSettingsStore((state) => state.config);
  const isLoadingConfig = useSettingsStore((state) => state.isLoadingConfig);
  const isSavingConfig = useSettingsStore((state) => state.isSavingConfig);
  const setProxy = useSettingsStore((state) => state.setProxy);
  const saveConfig = useSettingsStore((state) => state.saveConfig);

  const load = async () => {
    const data = await fetch("/api/settings/proxy");
    if (!data.ok) {
      throw new Error("Tải cấu hình proxy thất bại");
    }
    const json = await data.json();
    setFormEnabled(Boolean(json.proxy?.enabled));
    setFormUrl(String(json.proxy?.url || ""));
  };

  const persist = async () => {
    const res = await fetch("/api/settings/proxy", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: formEnabled, url: formUrl.trim() }),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || "Lưu cấu hình proxy thất bại");
    }
    return res.json();
  };

  const handleSave = async () => {
    if (formEnabled && !formUrl.trim()) {
      toast.error("Khi bật proxy phải nhập địa chỉ proxy");
      return;
    }
    try {
      await saveConfig();
      toast.success("Đã lưu cấu hình proxy");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Lưu thất bại");
    }
  };

  const handleTest = async () => {
    const candidate = formUrl.trim();
    if (!candidate) {
      toast.error("Vui lòng nhập địa chỉ proxy");
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const data = await testProxy(candidate);
      setTestResult(data.result);
      if (data.result.ok) {
        toast.success(`Proxy khả dụng (${data.result.latency_ms} ms, HTTP ${data.result.status})`);
      } else {
        toast.error(`Proxy không khả dụng: ${data.result.error ?? "Lỗi không xác định"}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kiểm tra proxy thất bại");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
      <CardContent className="space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Cấu hình proxy</h2>
            <p className="text-sm text-stone-500">Bật/tắt proxy và kiểm tra kết nối.</p>
          </div>
          <Badge variant={formEnabled ? "success" : "secondary"} className="w-fit rounded-md px-2.5 py-1">
            {formEnabled ? "Đã bật" : "Chưa bật"}
          </Badge>
        </div>

        {isLoadingConfig ? (
          <div className="flex items-center justify-center py-10">
            <LoaderCircle className="size-5 animate-spin text-stone-400" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox
                id="proxy-enabled"
                checked={formEnabled}
                onCheckedChange={(checked) => {
                  setFormEnabled(Boolean(checked));
                  setTestResult(null);
                }}
              />
              <label htmlFor="proxy-enabled" className="text-sm font-medium text-stone-700">Bật proxy</label>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Địa chỉ proxy</label>
              <Input
                value={formUrl}
                onChange={(event) => {
                  setFormUrl(event.target.value);
                  setTestResult(null);
                }}
                placeholder="http://127.0.0.1:7890"
                className="h-11 rounded-xl border-stone-200 bg-white"
                disabled={!formEnabled}
              />
              <p className="text-sm text-stone-500">Để trống nghĩa là không dùng proxy.</p>
            </div>

            {testResult && (
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 text-sm leading-6 text-stone-600">
                {testResult.ok
                  ? `Proxy khả dụng: HTTP ${testResult.status}, ${testResult.latency_ms} ms`
                  : `Proxy không khả dụng: ${testResult.error ?? "Lỗi không xác định"} (${testResult.latency_ms} ms)`}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl border-stone-200 bg-white px-5 text-stone-700"
                onClick={() => void handleTest()}
                disabled={!formEnabled || isTesting}
              >
                {isTesting ? <LoaderCircle className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
                Kiểm tra proxy
              </Button>
              <Button
                type="button"
                className="h-10 rounded-xl bg-stone-950 px-5 text-white hover:bg-stone-800"
                onClick={() => void handleSave()}
                disabled={isSavingConfig}
              >
                Lưu cấu hình
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}