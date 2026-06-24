import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "REAUTH_COOKIE_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "SUPABASE_ACCESS_TOKEN",
  "SUPABASE_PROJECT_ID",
  "SUPABASE_DB_PASSWORD",
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID"
];

const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) {
  console.error("Deployment cannot continue. Missing environment variables:");
  for (const name of missing) console.error(`- ${name}`);
  process.exit(1);
}

if ((process.env.REAUTH_COOKIE_SECRET ?? "").length < 32) {
  console.error("REAUTH_COOKIE_SECRET must contain at least 32 characters.");
  process.exit(1);
}

if (!process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")) {
  console.error("NEXT_PUBLIC_APP_URL must use HTTPS for production.");
  process.exit(1);
}

for (const file of [".env", ".env.local", ".env.production"]) {
  if (existsSync(file)) {
    console.error(`${file} exists in the repository root. Do not deploy local secret files.`);
    process.exit(1);
  }
}

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
if (!lock.lockfileVersion) {
  console.error("package-lock.json is missing or invalid.");
  process.exit(1);
}

const commands = [
  ["npm", ["run", "typecheck"]],
  ["npm", ["run", "lint"]],
  ["npm", ["test"]],
  ["npm", ["run", "security:source"]],
  ["npm", ["run", "security:audit"]],
  ["npm", ["run", "build"]]
];

for (const [command, args] of commands) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Deployment preflight passed.");
