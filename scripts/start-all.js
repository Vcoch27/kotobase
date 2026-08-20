const { spawn } = require("child_process");
const path = require("path");

console.log("==================================================");
console.log("🌸 KOTOBASE FULLSTACK + AI BACKEND LAUNCHER 🌸");
console.log("==================================================");

const rootDir = path.resolve(__dirname, "..");
const aiDir = path.join(rootDir, "services", "chatgpt2api");

// 1. Khởi động AI Backend (ChatGPT2API Python)
console.log("[1/2] 🤖 Đang khởi động AI Backend Service (Port 8001)...");
const aiProcess = spawn("cmd.exe", ["/c", "set CHATGPT2API_AUTH_KEY=16022005 && uv run main.py"], {
  cwd: aiDir,
  stdio: "inherit",
  shell: true,
});

aiProcess.on("error", (err) => {
  console.warn("⚠️ Không thể khởi động local AI backend (sẽ tự động dùng Online AI Gateway):", err.message);
});

// 2. Khởi động Next.js Frontend
console.log("[2/2] ⚡ Đang khởi động Kotobase Web (Next.js)...");
const nextProcess = spawn("cmd.exe", ["/c", "npx next dev"], {
  cwd: rootDir,
  stdio: "inherit",
  shell: true,
});

process.on("SIGINT", () => {
  console.log("\n🛑 Đang dừng toàn bộ tiến trình Kotobase...");
  aiProcess.kill();
  nextProcess.kill();
  process.exit(0);
});
