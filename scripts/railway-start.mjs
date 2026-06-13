import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const backendDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "backend",
);
const script = path.join(backendDir, "scripts", "railway-start.mjs");

console.log(`[railway] Starting API from ${backendDir}`);

const result = spawnSync(process.execPath, [script], {
  cwd: backendDir,
  stdio: "inherit",
  env: process.env,
});

process.exit(result.status ?? 1);
