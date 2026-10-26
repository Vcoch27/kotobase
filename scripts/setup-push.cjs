#!/usr/bin/env node
/** Generate once; never print keys. Optional --vercel adds production env via stdin. */
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const { loadEnvConfig } = require("@next/env");
const webpush = require("web-push");
const root = path.resolve(__dirname, "..");
loadEnvConfig(root);
const names = ["VAPID_PUBLIC_KEY", "VAPID_PRIVATE_KEY", "VAPID_SUBJECT"];
const local = path.join(root, ".env.local");
const remote = process.argv.includes("--vercel");
const runVercel = (args, input) => spawnSync(process.platform === "win32" ? "vercel.cmd" : "vercel", args, {
  cwd: root, input, encoding: "utf8", shell: process.platform === "win32", windowsHide: true,
});

try {
  if (!!process.env.VAPID_PUBLIC_KEY !== !!process.env.VAPID_PRIVATE_KEY)
    throw new Error("Chỉ tìm thấy một khóa VAPID. Không tự thay/rotate khóa; hãy khôi phục đủ cặp.");
  if (remote) {
    const listed = runVercel(["env", "ls", "production"]);
    if (listed.status !== 0) throw new Error("Không đọc được danh sách biến môi trường Vercel.");
    const output = `${listed.stdout}\n${listed.stderr}`;
    if (names.some((name) => new RegExp(`\\b${name}\\b`).test(output)))
      throw new Error("Vercel đã có biến VAPID. Dừng để tránh thay khóa và làm hỏng đăng ký hiện có.");
  }
  if (!process.env.VAPID_PUBLIC_KEY) {
    const keys = webpush.generateVAPIDKeys();
    const values = { VAPID_PUBLIC_KEY: keys.publicKey, VAPID_PRIVATE_KEY: keys.privateKey,
      VAPID_SUBJECT: "https://kotobase.vanhoang.online" };
    fs.appendFileSync(local, `\n# Web Push — keep this key pair stable; never commit.\n${names.map((name) => `${name}=${values[name]}`).join("\n")}\n`, { mode: 0o600 });
    Object.assign(process.env, values);
    console.log("Đã lưu cặp khóa Web Push vào .env.local (không in khóa).");
  } else console.log("Giữ nguyên cặp khóa Web Push hiện có.");
  if (remote) {
    for (const name of names) {
      const result = runVercel(["env", "add", name, "production", "--sensitive"],
        process.env[name] || "https://kotobase.vanhoang.online");
      if (result.status !== 0) throw new Error(`Không thêm được ${name}. Kiểm tra cấu hình Vercel; không tự đổi khóa.`);
      console.log(`Đã thêm ${name} vào Vercel Production.`);
    }
    console.log("Cần một deployment mới để dùng cấu hình này.");
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
