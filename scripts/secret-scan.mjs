import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const excluded = new Set([
  ".git",
  ".next",
  "node_modules",
  "coverage",
  "playwright-report",
  "test-results",
  "supabase/.temp"
]);
const extensions = new Set([
  ".ts", ".tsx", ".js", ".mjs", ".json", ".sql", ".md", ".toml",
  ".yml", ".yaml", ".env", ".example", ".txt"
]);

const patterns = [
  { name: "private key", regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "GitHub token", regex: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/ },
  { name: "Slack token", regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ },
  { name: "Supabase service JWT", regex: /\beyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\b/ },
  { name: "hard-coded password assignment", regex: /\b(?:password|secret|service_role_key)\s*[:=]\s*["'][^"'$\n]{12,}["']/i }
];

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const full = join(directory, entry.name);
    const rel = relative(root, full).replaceAll("\\", "/");
    if ([...excluded].some((item) => rel === item || rel.startsWith(`${item}/`))) continue;
    if (entry.isDirectory()) files.push(...await walk(full));
    else if (entry.isFile() && (extensions.has(extname(entry.name)) || entry.name.startsWith(".env"))) files.push(full);
  }
  return files;
}

const findings = [];
for (const file of await walk(root)) {
  const content = await readFile(file, "utf8");
  const rel = relative(root, file).replaceAll("\\", "/");
  for (const pattern of patterns) {
    if (pattern.regex.test(content)) findings.push(`${rel}: possible ${pattern.name}`);
  }
}

if (findings.length > 0) {
  console.error("Potential secrets detected:");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log("Source secret scan passed.");
