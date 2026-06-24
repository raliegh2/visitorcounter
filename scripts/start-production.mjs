import { spawn } from "node:child_process";

const child = spawn(process.platform === "win32" ? "npx.cmd" : "npx", ["next","start"], {
  env: process.env,
  stdio: "inherit",
  shell: false
});
for (const signal of ["SIGINT","SIGTERM"]) process.on(signal,()=>child.kill(signal));
child.on("exit",(code,signal)=>{ if (signal) process.kill(process.pid,signal); else process.exit(code ?? 1); });
