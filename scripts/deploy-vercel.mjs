import { spawnSync } from "node:child_process";

for (const name of ["VERCEL_TOKEN", "VERCEL_ORG_ID", "VERCEL_PROJECT_ID"]) {
  if (!process.env[name]) {
    console.error(`Missing required variable: ${name}`);
    process.exit(1);
  }
}

function run(args) {
  const result = spawnSync("npx", ["--yes", "vercel@54.15.0", ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(["pull", "--yes", "--environment=production", `--token=${process.env.VERCEL_TOKEN}`]);
run(["build", "--prod", `--token=${process.env.VERCEL_TOKEN}`]);
run(["deploy", "--prebuilt", "--prod", "--yes", `--token=${process.env.VERCEL_TOKEN}`]);

console.log("Vercel production deployment completed.");
