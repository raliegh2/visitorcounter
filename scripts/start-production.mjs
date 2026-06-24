import { cp, mkdir, stat } from "node:fs/promises";
import { spawn } from "node:child_process";
import { join } from "node:path";

const root = process.cwd();
const standalone = join(root, ".next", "standalone");
const server = join(standalone, "server.js");

try {
  await stat(server);
} catch {
  console.error("Production build not found. Run npm run build first.");
  process.exit(1);
}

await mkdir(join(standalone, ".next"), { recursive: true });
await cp(join(root, ".next", "static"), join(standalone, ".next", "static"), {
  recursive: true,
  force: true
});
await cp(join(root, "public"), join(standalone, "public"), {
  recursive: true,
  force: true
});

const child = spawn(process.execPath, [server], {
  cwd: standalone,
  env: process.env,
  stdio: "inherit"
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 1);
});
