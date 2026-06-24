import type { AppRole } from "@/types/app";

export type Permission =
  | "dashboard:view" | "visitor:search" | "visitor:create"
  | "attendance:view" | "attendance:create" | "attendance:correct"
  | "service:manage" | "report:view" | "export:personal"
  | "user:manage" | "audit:view" | "retention:manage";

const permissions: Record<AppRole, ReadonlySet<Permission>> = {
  administrator: new Set(["dashboard:view","visitor:search","visitor:create","attendance:view","attendance:create","attendance:correct","service:manage","report:view","export:personal","user:manage","audit:view","retention:manage"]),
  usher: new Set(["dashboard:view","visitor:search","visitor:create","attendance:view","attendance:create"]),
  auditor: new Set(["dashboard:view","report:view"])
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return permissions[role].has(permission);
}
