import { spawnSync } from "node:child_process";

function run(label, command, args) {
  console.log(`[railway-start] ${label}...`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`[railway-start] ${label} failed with code ${result.status}`);
    process.exit(result.status ?? 1);
  }
  console.log(`[railway-start] ${label} OK`);
}

if (!process.env.DATABASE_URL?.startsWith("postgresql")) {
  console.error(
    "[railway-start] DATABASE_URL invalid. Use Add Reference -> postgres -> DATABASE_URL",
  );
  console.error(`[railway-start] Current value starts with: ${process.env.DATABASE_URL?.slice(0, 20) ?? "(empty)"}`);
  process.exit(1);
}

run("db:push", "npm", ["run", "db:push"]);
run("db:seed", "npm", ["run", "db:seed"]);
run("start", "npm", ["start"]);
