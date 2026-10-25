// Local synthetic UI harness. Never creates production data or captures audio.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const root = path.resolve(__dirname, "..");
const route = path.join(root, "src/app/speaking-qa");
const port = Number(process.env.SPEAKING_PREVIEW_PORT || 3007);
if (!Number.isInteger(port) || port < 1024 || port > 65535)
  throw new Error("Invalid preview port");
if (fs.existsSync(route))
  throw new Error("src/app/speaking-qa already exists; refusing to overwrite.");
fs.mkdirSync(route);
fs.copyFileSync(
  path.join(__dirname, "fixtures/speaking-quiz-preview.tsx"),
  path.join(route, "page.tsx"),
);
console.log(`Synthetic speaking quiz: http://localhost:${port}/speaking-qa`);
console.log(
  "Localhost only. Recognition is mocked; no audio or production Firestore. Ctrl+C to stop.",
);
const child = spawn(
  process.execPath,
  [
    "node_modules/next/dist/bin/next",
    "dev",
    "-p",
    String(port),
    "-H",
    "127.0.0.1",
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: {
      ...process.env,
      APP_ACCESS_PASSWORD: "",
      FIRESTORE_EMULATOR_HOST: "127.0.0.1:9",
    },
  },
);
function cleanup() {
  // Only remove the exact fixture we created, never recursively delete an app directory.
  const file = path.join(route, "page.tsx");
  const fixture = fs.readFileSync(
    path.join(__dirname, "fixtures/speaking-quiz-preview.tsx"),
  );
  if (fs.existsSync(file) && fs.readFileSync(file).equals(fixture))
    fs.unlinkSync(file);
  if (fs.existsSync(route) && fs.readdirSync(route).length === 0)
    fs.rmdirSync(route);
}
process.on("SIGINT", () => child.kill());
process.on("SIGTERM", () => child.kill());
process.on("exit", cleanup);
child.on("error", (error) => {
  console.error(error.message);
  cleanup();
  process.exitCode = 1;
});
child.on("exit", (code) => {
  cleanup();
  process.exitCode = code || 0;
});
