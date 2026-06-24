import { describe, expect, it } from "vitest";
import { hasPermission } from "@/lib/permissions";

describe("role permissions", () => {
  it("allows ushers to register and check in visitors", () => {
    expect(hasPermission("usher", "visitor:create")).toBe(true);
    expect(hasPermission("usher", "attendance:create")).toBe(true);
  });

  it("blocks ushers from exports and user management", () => {
    expect(hasPermission("usher", "export:personal")).toBe(false);
    expect(hasPermission("usher", "user:manage")).toBe(false);
  });

  it("keeps auditors read-only", () => {
    expect(hasPermission("auditor", "report:view")).toBe(true);
    expect(hasPermission("auditor", "visitor:create")).toBe(false);
    expect(hasPermission("auditor", "attendance:create")).toBe(false);
  });

  it("allows administrators to manage retention", () => {
    expect(hasPermission("administrator", "retention:manage")).toBe(true);
  });
});
