import type { AppRole } from "@/types/app";

export type Permission =
  | "dashboard:view"
  | "visitor:search"
  | "visitor:create"
  | "attendance:view"
  | "attendance:create"
  | "attendance:correct"
  | "service:manage"
  | "report:view"
  | "export:personal"
  | "user:manage"
  | "audit:view"
  | "retention:manage";

const visitorTeamPermissions: ReadonlySet<Permission> = new Set([
  "dashboard:view",
  "visitor:search",
  "visitor:create",
  "attendance:view",
  "attendance:create"
]);

const permissions: Record<AppRole, ReadonlySet<Permission>> = {
  administrator: new Set([
    "dashboard:view",
    "visitor:search",
    "visitor:create",
    "attendance:view",
    "attendance:create",
    "attendance:correct",
    "service:manage",
    "report:view",
    "export:personal",
    "user:manage",
    "audit:view",
    "retention:manage"
  ]),
  usher: visitorTeamPermissions,
  pastor: visitorTeamPermissions,
  auditor: new Set([
    "dashboard:view",
    "report:view"
  ])
};

export function hasPermission(role: AppRole, permission: Permission): boolean {
  return permissions[role].has(permission);
}
