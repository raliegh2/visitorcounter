import { spawnSync } from "node:child_process";

for (const name of ["SUPABASE_ACCESS_TOKEN", "SUPABASE_PROJECT_ID", "SUPABASE_DB_PASSWORD"]) {
  if (!process.env[name]) {
    console.error(`Missing required variable: ${name}`);
    process.exit(1);
  }
}

function invoke(args, stdio = "inherit") {
  return spawnSync("npx", ["--yes", "supabase@2.107.0", ...args], {
    stdio,
    encoding: stdio === "pipe" ? "utf8" : undefined,
    shell: process.platform === "win32",
    env: process.env
  });
}

function run(args) {
  const result = invoke(args);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

function capture(args) {
  const result = invoke(args, "pipe");
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? "");
    process.exit(result.status ?? 1);
  }
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function remoteMigrationVersions(output) {
  const versions = new Set();
  for (const line of output.split(/\r?\n/)) {
    const cells = line.split("│");
    if (cells.length < 2) continue;
    const remote = cells[1]?.trim();
    if (remote && /^\d{12,14}$/.test(remote)) versions.add(remote);
  }
  return versions;
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

const passwordArgs = ["--password", process.env.SUPABASE_DB_PASSWORD];
run(["link", "--project-ref", process.env.SUPABASE_PROJECT_ID, ...passwordArgs, "--yes"]);

const migrationList = capture(["migration", "list", "--linked", ...passwordArgs]);
const remoteVersions = remoteMigrationVersions(migrationList);
const legacyReleaseMarker = "20260730205534";
const canonicalEquivalentVersions = [
  "202607300001",
  "202607300002",
  "202607300003",
  "202607300004",
  "202607300005",
  "202607300006"
];

if (remoteVersions.has(legacyReleaseMarker)) {
  const missingEquivalents = canonicalEquivalentVersions.filter(
    (version) => !remoteVersions.has(version)
  );
  if (missingEquivalents.length > 0) {
    console.log(
      `Legacy Church Care Hub migration ledger detected; recording canonical equivalents: ${missingEquivalents.join(", ")}`
    );
    run([
      "migration",
      "repair",
      ...missingEquivalents,
      "--status",
      "applied",
      "--linked",
      ...passwordArgs
    ]);
  }
}

run(["db", "push", "--linked", ...passwordArgs, "--dry-run"]);
run(["db", "push", "--linked", ...passwordArgs, "--yes"]);
await updateAuthConfiguration();

console.log("Supabase migrations and Auth configuration deployed.");
