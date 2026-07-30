import type { AppRole } from "@/types/app";

export type Permission =
  | "dashboard:view"
  | "visitor:search"
  | "visitor:create"
  | "attendance:view"
  | "attendance:create"
  | "attendance:correct"
  | "member:view"
  | "member:manage"
  | "member:import"
  | "care:manage"
  | "service:manage"
  | "report:view"
  | "export:personal"
  | "user:manage"
  | "audit:view"
  | "retention:manage";

const permissions: Record<AppRole, ReadonlySet<Permission>> = {
  administrator: new Set([
    "dashboard:view", "visitor:search", "visitor:create", "attendance:view", "attendance:create",
    "attendance:correct", "member:view", "member:manage", "member:import", "care:manage",
    "service:manage", "report:view", "export:personal", "user:manage", "audit:view", "retention:manage"
  ]),
  pastor: new Set([
    "dashboard:view", "visitor:search", "visitor:create", "attendance:view", "attendance:create",
    "member:view", "member:manage", "member:import", "care:manage", "report:view"
  ]),
  usher: new Set([
    "dashboard:view", "visitor:search", "visitor:create", "attendance:view", "attendance:create", "care:manage"
  ]),
  auditor: new Set(["dashboard:view", "report:view"])
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return permissions[role].has(permission);
}
