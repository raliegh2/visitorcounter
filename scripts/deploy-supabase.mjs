import { spawnSync } from "node:child_process";

for (const name of ["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_ID", "SUPABASE_DB_PASSWORD"]) {
  if (!process.env[name]) {
    console.error(`Missing required variable: ${name}`);
    process.exit(1);
  }
}

function run(args) {
  const result = spawnSync("npx", ["--yes", "supabase@2.107.0", ...args], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: process.env
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function updateAuthConfiguration() {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${process.env.SUPABASE_PROJECT_ID}/config/auth`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        password_min_length: 12,
        password_required_characters: "",
        mfa_totp_enroll_enabled: false,
        mfa_totp_verify_enabled: false
      })
    }
  );

  if (!response.ok) {
    const details = await response.text();
    console.error(`Supabase Auth configuration update failed (${response.status}): ${details}`);
    process.exit(1);
  }
}

run(["link", "--project-ref", process.env.SUPABASE_PROJECT_ID, "--password", process.env.SUPABASE_DB_PASSWORD, "--yes"]);
run(["db", "push", "--linked", "--password", process.env.SUPABASE_DB_PASSWORD, "--dry-run"]);
run(["db", "push", "--linked", "--password", process.env.SUPABASE_DB_PASSWORD, "--yes"]);
await updateAuthConfiguration();

console.log("Supabase migrations and Auth configuration deployed.");
