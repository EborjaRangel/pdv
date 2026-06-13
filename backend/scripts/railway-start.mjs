import { spawnSync } from "node:child_process";

function run(label, command, args) {
  console.log(`[railway-start] ${label}...`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: true,
    env: process.env,
  });
  if (result.status !== 0) {
    console.error(`[railway-start] ${label} failed with code ${result.status}`);
    return false;
  }
  console.log(`[railway-start] ${label} OK`);
  return true;
}

const dbUrl = process.env.DATABASE_URL ?? "";

console.log("[railway-start] Booting PDV API");
console.log(`[railway-start] PORT=${process.env.PORT ?? "(default 4000)"}`);

if (!/^postgres(ql)?:\/\//.test(dbUrl)) {
  console.error("[railway-start] WARNING: DATABASE_URL is missing or invalid.");
  console.error(
    "[railway-start] Copy the full URL from postgres -> Variables -> DATABASE_URL",
  );
  console.error(
    `[railway-start] Current value starts with: ${JSON.stringify(dbUrl.slice(0, 24))}`,
  );
} else {
  run("db:push", "npm", ["run", "db:push"]);
  run("db:seed", "npm", ["run", "db:seed"]);
}

console.log("[railway-start] Starting HTTP server...");
const started = run("start", "npm", ["start"]);
if (!started) {
  process.exit(1);
}
