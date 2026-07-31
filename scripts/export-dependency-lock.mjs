import { copyFileSync, mkdirSync } from "node:fs";

mkdirSync("public", { recursive: true });
copyFileSync("package-lock.json", "public/dependency-lock.json");
console.log("Prepared regenerated dependency lock for validation preview.");
