const { spawn } = require("child_process");
const path = require("path");

console.log("==================================================");
console.log("🌸 KOTOBASE FULLSTACK + AI BACKEND LAUNCHER 🌸");
console.log("==================================================");

const rootDir = path.resolve(__dirname, "..");
const aiDir = path.join(rootDir, "services", "chatgpt2api");

// 1. Khởi động AI Backend (ChatGPT2API Python)
console.log("[1/2] 🤖 Đang khởi động AI Backend Service (Port 8001)...");
const aiProcess = spawn("cmd.exe", ["/c", "uv run main.py"], {
  cwd: aiDir,
  env: {
    ...process.env,
    CHATGPT2API_AUTH_KEY: "16022005",
  },
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

const { execSync } = require("child_process");

function killProcessTree(pid) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
    } else {
      process.kill(-pid, "SIGKILL");
    }
  } catch (e) {}
}

const cleanExit = () => {
  console.log("\n🛑 Đang dừng toàn bộ tiến trình Kotobase & AI Backend...");
  if (aiProcess && aiProcess.pid) killProcessTree(aiProcess.pid);
  if (nextProcess && nextProcess.pid) killProcessTree(nextProcess.pid);
  process.exit(0);
};

process.on("SIGINT", cleanExit);
process.on("SIGTERM", cleanExit);
process.on("exit", cleanExit);
