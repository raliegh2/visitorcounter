import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

const roots = ["app", "components"];

function sourceFiles(): string[] {
  const output: string[] = [];

  const visit = (directory: string) => {
    for (const entry of readdirSync(directory)) {
      const path = join(directory, entry);
      if (statSync(path).isDirectory()) {
        visit(path);
      } else if (/\.(tsx|ts|css)$/.test(entry)) {
        output.push(path);
      }
    }
  };

  for (const root of roots) visit(root);
  return output.sort();
}

function source(path: string): string {
  return readFileSync(path, "utf8");
}

const files = sourceFiles();

describe("investor-facing UI controls", () => {
  it("does not contain placeholder or dead-end interaction patterns", () => {
    for (const path of files) {
      const content = source(path);
      expect(content, relative(process.cwd(), path)).not.toMatch(/href=["']#["']/);
      expect(content, relative(process.cwd(), path)).not.toMatch(/javascript:/i);
      expect(content, relative(process.cwd(), path)).not.toMatch(/onClick=\{\(\) => \{\}\}/);
      expect(content, relative(process.cwd(), path)).not.toMatch(/coming soon/i);
    }
  });

  it("gives every native button an explicit submit or click behavior", () => {
    for (const path of files.filter((path) => path.endsWith(".tsx"))) {
      const content = source(path);
      const buttons = content.match(/<button\b[\s\S]*?(?:<\/button>|\/>)/g) ?? [];

      for (const button of buttons) {
        expect(
          button,
          `${relative(process.cwd(), path)} contains a button without type or onClick: ${button.slice(0, 140)}`
        ).toMatch(/\btype=(?:["'](?:button|submit)["']|\{[^}]+\})|\bonClick=/);
      }
    }
  });

  it("gives every Next.js Link a destination", () => {
    for (const path of files.filter((path) => path.endsWith(".tsx"))) {
      const content = source(path);
      const links = content.match(/<Link\b[\s\S]*?<\/Link>/g) ?? [];
      for (const link of links) {
        expect(link, `${relative(process.cwd(), path)} contains a Link without href`).toMatch(/\bhref=/);
      }
    }
  });

  it("uses pending feedback for every server-action form", () => {
    for (const path of files.filter((path) => path.endsWith(".tsx"))) {
      const content = source(path);
      const forms = content.match(/<form\b[^>]*action=\{[^}]+\}[^>]*>[\s\S]*?<\/form>/g) ?? [];
      for (const form of forms) {
        expect(
          form,
          `${relative(process.cwd(), path)} contains a server-action form without a pending submit control`
        ).toMatch(/<(?:SubmitButton|ConfirmSubmitButton)\b/);
      }
    }
  });

  it("supplies a specific pending label for user-facing submit controls", () => {
    for (const path of files.filter((path) => path.endsWith(".tsx") && !path.includes("components/ui/"))) {
      const content = source(path);
      const controls = content.match(/<(?:SubmitButton|ConfirmSubmitButton)\b[\s\S]*?>/g) ?? [];
      for (const control of controls) {
        expect(control, `${relative(process.cwd(), path)} contains a submit control without pendingLabel`).toMatch(/\bpendingLabel=/);
      }
    }
  });

  it("keeps account-status actions from looping back to the protected status page", () => {
    const pendingPage = source("app/(auth)/signup/pending/page.tsx");
    expect(pendingPage).toContain("logoutAction");
    expect(pendingPage).not.toContain('href="/login"');
    expect(pendingPage).toContain("Sign out and return to sign in");
  });

  it("does not render invalid self-administration buttons", () => {
    const usersPage = source("app/(protected)/admin/users/page.tsx");
    expect(usersPage).toContain("Current account · role locked here");
    expect(usersPage).toContain("Current account · cannot disable");
  });

  it("uses the professional navy and teal visual system", () => {
    const stylesheet = source("app/globals.css");
    expect(stylesheet).toContain("--navy-950");
    expect(stylesheet).toContain("--brand-600");
    expect(stylesheet).not.toMatch(/--purple-|#351475|#7141e4|#6b3dde/i);
  });
});
