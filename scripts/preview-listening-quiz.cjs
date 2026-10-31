const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const route = path.join(root, "src/app/listening-quiz-qa");
const fixture = path.join(__dirname, "fixtures/listening-quiz-preview.tsx");
const file = path.join(route, "page.tsx");
const port = Number(process.env.LISTENING_QUIZ_PREVIEW_PORT || 3134);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error("Invalid port");
if (fs.existsSync(route)) throw Error("Preview route already exists; refusing to overwrite");
fs.mkdirSync(route); fs.copyFileSync(fixture, file);
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "dev", "-p", String(port), "-H", "127.0.0.1"], {
  cwd: root, stdio: "inherit", env: { ...process.env, APP_ACCESS_PASSWORD: "", FIRESTORE_EMULATOR_HOST: "127.0.0.1:9" },
});
console.log(`Synthetic listening quiz: http://127.0.0.1:${port}/listening-quiz-qa`);
function cleanup() {
  if (fs.existsSync(file) && fs.readFileSync(file).equals(fs.readFileSync(fixture))) fs.unlinkSync(file);
  if (fs.existsSync(route) && !fs.readdirSync(route).length) fs.rmdirSync(route);
}
process.on("SIGINT", () => child.kill()); process.on("SIGTERM", () => child.kill());
process.on("exit", cleanup);
child.on("exit", (code) => { cleanup(); process.exitCode = code || 0; });
