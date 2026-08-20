"use client";

import { Cloud, LoaderCircle, PlugZap, RefreshCw, Save } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ImageStorageMode } from "@/lib/api";
import { testProxy, type ProxyTestResult } from "@/lib/api";

import { useSettingsStore } from "../store";

export function ConfigCard() {
  const [isTestingProxy, setIsTestingProxy] = useState(false);
  const [proxyTestResult, setProxyTestResult] = useState<ProxyTestResult | null>(null);
  const logLevelOptions = ["debug", "info", "warning", "error"];
  const config = useSettingsStore((state) => state.config);
  const isLoadingConfig = useSettingsStore((state) => state.isLoadingConfig);
  const isSavingConfig = useSettingsStore((state) => state.isSavingConfig);
  const setRefreshAccountIntervalMinute = useSettingsStore((state) => state.setRefreshAccountIntervalMinute);
  const setImageRetentionDays = useSettingsStore((state) => state.setImageRetentionDays);
  const setImagePollTimeoutSecs = useSettingsStore((state) => state.setImagePollTimeoutSecs);
  const setImageAccountConcurrency = useSettingsStore((state) => state.setImageAccountConcurrency);
  const setImageSettleEnabled = useSettingsStore((state) => state.setImageSettleEnabled);
  const setImageRemoveConversationAfterResult = useSettingsStore((state) => state.setImageRemoveConversationAfterResult);
  const setImageSettleSecs = useSettingsStore((state) => state.setImageSettleSecs);
  const setImageTimeoutRetrySecs = useSettingsStore((state) => state.setImageTimeoutRetrySecs);
  const setAutoRemoveInvalidAccounts = useSettingsStore((state) => state.setAutoRemoveInvalidAccounts);
  const setAutoRemoveRateLimitedAccounts = useSettingsStore((state) => state.setAutoRemoveRateLimitedAccounts);
  const setAutoReloginAfterRefresh = useSettingsStore((state) => state.setAutoReloginAfterRefresh);
  const setLogLevel = useSettingsStore((state) => state.setLogLevel);
  const setProxy = useSettingsStore((state) => state.setProxy);
  const setBaseUrl = useSettingsStore((state) => state.setBaseUrl);
  const setGlobalSystemPrompt = useSettingsStore((state) => state.setGlobalSystemPrompt);
  const setSensitiveWordsText = useSettingsStore((state) => state.setSensitiveWordsText);
  const setAIReviewField = useSettingsStore((state) => state.setAIReviewField);
  const setImageStorageField = useSettingsStore((state) => state.setImageStorageField);
  const testImageStorage = useSettingsStore((state) => state.testImageStorage);
  const syncImagesToWebDAV = useSettingsStore((state) => state.syncImagesToWebDAV);
  const isTestingImageStorage = useSettingsStore((state) => state.isTestingImageStorage);
  const isSyncingImageStorage = useSettingsStore((state) => state.isSyncingImageStorage);
  const saveConfig = useSettingsStore((state) => state.saveConfig);

  const handleTestProxy = async () => {
    const candidate = String(config?.proxy || "").trim();
    if (!candidate) {
      toast.error("Vui lòng nhập địa chỉ proxy");
      return;
    }
    setIsTestingProxy(true);
    setProxyTestResult(null);
    try {
      const data = await testProxy(candidate);
      setProxyTestResult(data);
      if (data.ok) {
        toast.success(`Proxy khả dụng (${data.latency_ms} ms, HTTP ${data.status})`);
      } else {
        toast.error(`Proxy không khả dụng: ${data.error ?? "Lỗi không xác định"}`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Kiểm tra proxy thất bại");
    } finally {
      setIsTestingProxy(false);
    }
  };

  if (isLoadingConfig || !config) {
    return (
      <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
        <CardContent className="flex items-center justify-center p-10">
          <LoaderCircle className="size-5 animate-spin text-stone-400" />
        </CardContent>
      </Card>
    );
  }

  const imageStorageMode = String(config.image_storage?.mode || "local");
  const imageStorageOptions: { value: ImageStorageMode; label: string }[] = [
    { value: "local", label: "Chỉ local" },
    { value: "webdav", label: "Chỉ WebDAV" },
    { value: "both", label: "Local + WebDAV" },
  ];

  return (
    <Card className="rounded-2xl border-white/80 bg-white/90 shadow-sm">
      <CardContent className="space-y-6 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-stone-100">
              <Cloud className="size-5 text-stone-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight">Cấu hình hệ thống</h2>
              <p className="text-sm text-stone-500">Cài đặt proxy, lưu trữ ảnh, nhật ký, nội dung và hành vi tự động.</p>
            </div>
          </div>
          <Button className="h-9 rounded-xl bg-stone-950 px-5 text-white hover:bg-stone-800" onClick={() => void saveConfig()} disabled={isSavingConfig}>
            {isSavingConfig ? <LoaderCircle className="size-4 animate-spin" /> : <Save className="size-4" />}
            Lưu cấu hình
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Base URL</label>
              <Input value={String(config.base_url || "")} onChange={(event) => setBaseUrl(event.target.value)} placeholder="https://example.com" className="h-11 rounded-xl border-stone-200 bg-white" />
              <p className="text-xs text-stone-500">Để trống sẽ dùng biến môi trường hoặc giá trị mặc định.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Proxy</label>
              <Input value={String(config.proxy || "")} onChange={(event) => setProxy(event.target.value)} placeholder="http://127.0.0.1:7890" className="h-11 rounded-xl border-stone-200 bg-white font-mono text-xs" />
              <p className="text-xs text-stone-500">Để trống thì không dùng proxy. Điền đầy đủ địa chỉ, ví dụ `http://127.0.0.1:7890` hoặc `socks5://127.0.0.1:7890`.</p>
              {proxyTestResult && (
                <div className="rounded-xl border border-stone-200 bg-stone-50 p-3 text-xs leading-5 text-stone-600">
                  {proxyTestResult.ok ? `Proxy khả dụng: HTTP ${proxyTestResult.status}, ${proxyTestResult.latency_ms} ms` : `Proxy không khả dụng: ${proxyTestResult.error ?? "Lỗi không xác định"} (${proxyTestResult.latency_ms} ms)`}
                </div>
              )}
              <Button type="button" variant="outline" className="h-9 rounded-xl border-stone-200 bg-white px-4 text-stone-700" onClick={() => void handleTestProxy()} disabled={isTestingProxy}>
                {isTestingProxy ? <LoaderCircle className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
                Kiểm tra proxy
              </Button>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Cấp độ nhật ký</label>
              <Select value={String(config.log_level || "info")} onValueChange={(value) => setLogLevel(value)}>
                <SelectTrigger className="h-11 rounded-xl border-stone-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {logLevelOptions.map((level) => (
                    <SelectItem key={level} value={level}>{level}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Làm mới sau (phút)</label>
              <Input type="number" value={String(config.refresh_account_interval_minute || 30)} onChange={(event) => setRefreshAccountIntervalMinute(Number(event.target.value) || 0)} className="h-11 rounded-xl border-stone-200 bg-white" />
              <p className="text-xs text-stone-500">Đơn vị phút. Sau khi hết thời gian, nhấn Tiếp tục chờ để gia hạn thêm.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Lưu trữ ảnh</label>
              <Select value={imageStorageMode} onValueChange={(value) => setImageStorageField("mode", value)}>
                <SelectTrigger className="h-11 rounded-xl border-stone-200 bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {imageStorageOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" className="h-9 rounded-xl border-stone-200 bg-white px-4 text-stone-700" onClick={() => void testImageStorage()} disabled={isTestingImageStorage}>
                  {isTestingImageStorage ? <LoaderCircle className="size-4 animate-spin" /> : <Cloud className="size-4" />}
                  Kiểm tra kết nối
                </Button>
                <Button type="button" variant="outline" className="h-9 rounded-xl border-stone-200 bg-white px-4 text-stone-700" onClick={() => void syncImagesToWebDAV()} disabled={isSyncingImageStorage}>
                  {isSyncingImageStorage ? <LoaderCircle className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
                  Đồng bộ ngay
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Prompt hệ thống</label>
              <Textarea value={String(config.global_system_prompt || "")} onChange={(event) => setGlobalSystemPrompt(event.target.value)} placeholder="Ví dụ: kiểm tra tính hợp lệ của prompt từ người dùng; từ chối yêu cầu bất hợp pháp, khiêu dâm, bạo lực..." className="min-h-28 rounded-xl border-stone-200 bg-white font-mono text-xs shadow-none" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Từ nhạy cảm</label>
              <Textarea value={String(config.sensitive_words_text || "")} onChange={(event) => setSensitiveWordsText(event.target.value)} placeholder="Mỗi dòng một từ, khớp thì từ chối" className="min-h-28 rounded-xl border-stone-200 bg-white font-mono text-xs shadow-none" />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-stone-700">Prompt đánh giá AI</label>
              <Textarea value={String(config.ai_review?.prompt || "")} onChange={(event) => setAIReviewField("prompt", event.target.value)} placeholder="Kiểm tra yêu cầu người dùng có được phép không. Chỉ trả lời ALLOW hoặc REJECT." className="min-h-24 rounded-xl border-stone-200 bg-white text-xs shadow-none" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}