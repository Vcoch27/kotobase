"use client";

import { AlertTriangle, Cookie, LoaderCircle, PlugZap, Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  testProxy,
  testProxyClearance,
  type ClearanceTestResult,
  type ProxyRuntimeClearanceMode,
  type ProxyRuntimeEgressMode,
  type ProxyTestResult,
} from "@/lib/api";

import { useSettingsStore } from "../store";

export function ProxyRuntimeCard() {
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [isTestingClearance, setIsTestingClearance] = useState(false);
  const [proxyResult, setProxyResult] = useState<{ result: ProxyTestResult } | null>(null);
  const [clearanceResult, setClearanceResult] = useState<{ result: ClearanceTestResult } | null>(null);
  const [targetUrl, setTargetUrl] = useState("https://chatgpt.com");
  const config = useSettingsStore((state) => state.config);
  const isLoadingConfig = useSettingsStore((state) => state.isLoadingConfig);
  const isSavingConfig = useSettingsStore((state) => state.isSavingConfig);
  const saveConfig = useSettingsStore((state) => state.saveConfig);
  const setProxyRuntimeField = useSettingsStore((state) => state.setProxyRuntimeField);
  const setProxyRuntimeClearanceField = useSettingsStore((state) => state.setProxyRuntimeClearanceField);
  const setProxyRuntimeStatusCodesText = useSettingsStore((state) => state.setProxyRuntimeStatusCodesText);

  if (isLoadingConfig || !config?.proxy_runtime) {
    return (
      <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
        <CardContent className="flex items-center justify-center p-10">
          <LoaderCircle className="size-5 animate-spin text-stone-400" />
        </CardContent>
      </Card>
    );
  }

  const runtime = config.proxy_runtime;
  const clearance = runtime.clearance;
  const runtimeEnabled = Boolean(runtime.enabled);
  const clearanceMode = clearance.mode;
  const hasStoredClearance = Boolean(clearance.has_cf_cookies || clearance.has_cf_clearance);

  const handleTestRuntimeProxy = async () => {
    setIsTestingProxy(true);
    setProxyResult(null);
    try {
      const saved = await saveConfig();
      if (!saved) {
        return;
      }
      const url = String(config.base_url || "");
      const data = await testProxy(url);
      setProxyResult({ result: data });
      if (data.ok) {
        toast.success(`Proxy khả dụng: HTTP ${data.status}, ${data.latency_ms} ms`);
      } else {
        toast.error(`Proxy không khả dụng: ${data.error ?? "Lỗi không xác định"} (${data.latency_ms} ms)`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kiểm tra runtime proxy thất bại");
    } finally {
      setIsTestingProxy(false);
    }
  };

  const handleTestClearance = async () => {
    setIsTestingClearance(true);
    setClearanceResult(null);
    try {
      const saved = await saveConfig();
      if (!saved) {
        return;
      }
      const url = String(config.base_url || "");
      const data = await testProxyClearance(url);
      setClearanceResult({ result: data });
      if (data.ok) {
        toast.success(`Clearance khả dụng: ${data.has_cookies ? "Đã có Cookie" : "Không có Cookie"}, ${data.latency_ms} ms`);
      } else {
        toast.error(`Clearance không khả dụng: ${data.error ?? data.status} (${data.latency_ms} ms)`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kiểm tra Clearance thất bại");
    } finally {
      setIsTestingClearance(false);
    }
  };

  return (
    <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
      <CardContent className="space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-stone-100">
              <PlugZap className="size-5 text-stone-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Runtime proxy</h2>
              <p className="text-sm text-stone-500">Điều hướng các yêu cầu cần vượt xác minh trình duyệt/Cloudflare; có thể dùng proxy riêng hoặc clearance thủ công.</p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs ${runtimeEnabled ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>
            {runtimeEnabled ? "Đã bật" : "Chưa bật"}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Chế độ thoát</label>
              <Select value={clearanceMode} onValueChange={(value) => setProxyRuntimeField("clearance.mode" as any, value as ProxyRuntimeClearanceMode)}>
                <SelectTrigger className="h-11 rounded-xl border-stone-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Không dùng</SelectItem>
                  <SelectItem value="auto">Tự động lấy clearance</SelectItem>
                  <SelectItem value="manual">Nhập thủ công</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Chế độ egress</label>
              <Select value={runtime.egress_mode} onValueChange={(value) => setProxyRuntimeField("egress_mode", value as ProxyRuntimeEgressMode)}>
                <SelectTrigger className="h-11 rounded-xl border-stone-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="proxy">Dùng proxy cấu hình</SelectItem>
                  <SelectItem value="direct">Kết nối trực tiếp</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">URL tài nguyên</label>
              <Input value={String(runtime.resource_proxy_url || "")} onChange={(event) => setProxyRuntimeField("resource_proxy_url", event.target.value)} placeholder="Để trống thì dùng chung proxy chính" className="h-10 rounded-xl border-stone-200 bg-white" />
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Cookie/Clearance thủ công</label>
              <Textarea value={String(clearance.cf_cookies || "")} onChange={(event) => setProxyRuntimeClearanceField("cf_cookies", event.target.value)} placeholder="Ví dụ: foo=bar; cf_clearance=..." className="min-h-24 rounded-xl border-stone-200 bg-white font-mono text-xs shadow-none" />
              <p className="text-xs text-stone-500">
                {hasStoredClearance ? "Máy chủ đã lưu Cookie/clearance; để trống khi lưu sẽ không xóa giá trị hiện có." : "Để trống nghĩa là không dùng cookie thủ công."}
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Clearance</label>
              <Input value={String(clearance.cf_clearance || "")} onChange={(event) => setProxyRuntimeClearanceField("cf_clearance", event.target.value)} placeholder="Chỉ điền giá trị cf_clearance" className="h-10 rounded-xl border-stone-200 bg-white font-mono text-xs" />
              {clearanceResult && (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs leading-5 text-stone-600">
                  {clearanceResult.result.ok ? `Clearance khả dụng: ${clearanceResult.result.has_cookies ? "Đã có Cookie" : "Không có Cookie"}, ${clearanceResult.result.latency_ms} ms` : `Clearance không khả dụng: ${clearanceResult.result.error ?? clearanceResult.result.status} (${clearanceResult.result.latency_ms} ms)`}
                </div>
              )}
              <Button type="button" variant="outline" className="h-9 rounded-xl border-stone-200 bg-white px-4 text-stone-700" onClick={() => void handleTestClearance()} disabled={isTestingClearance}>
                {isTestingClearance ? <LoaderCircle className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Kiểm tra Clearance
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-700">URL mục tiêu kiểm tra</label>
          <Input value={targetUrl} onChange={(event) => setTargetUrl(event.target.value)} className="h-10 rounded-xl border-stone-200 bg-white" />
          <p className="text-xs text-stone-500">Trang mục tiêu dùng để kiểm tra clearance, ví dụ https://chatgpt.com.</p>
        </div>

        <div className="flex justify-end">
          <Button className="h-10 rounded-xl bg-stone-950 px-5 text-white hover:bg-stone-800" onClick={() => void saveConfig()} disabled={isSavingConfig}>
            {isSavingConfig ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            Lưu cấu hình
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}