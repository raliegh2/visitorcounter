"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/(auth)/login/actions";
import type { AppRole, UserProfile } from "@/types/app";

type IconName =
  | "dashboard"
  | "person"
  | "check"
  | "members"
  | "heart"
  | "import"
  | "calendar"
  | "chart"
  | "admin"
  | "users"
  | "audit"
  | "shield";

type NavigationItem = {
  href: string;
  label: string;
  icon: IconName;
  roles: readonly AppRole[];
};

const navigation: NavigationItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: "dashboard", roles: ["administrator", "usher", "pastor", "auditor"] },
  { href: "/visitors", label: "Visitors", icon: "person", roles: ["administrator", "usher", "pastor"] },
  { href: "/attendance", label: "Attendance", icon: "check", roles: ["administrator", "usher", "pastor"] },
  { href: "/members", label: "Members", icon: "members", roles: ["administrator", "pastor"] },
  { href: "/care", label: "Care & follow-up", icon: "heart", roles: ["administrator", "usher", "pastor"] },
  { href: "/import", label: "Import members", icon: "import", roles: ["administrator", "pastor"] },
  { href: "/services", label: "Services", icon: "calendar", roles: ["administrator"] },
  { href: "/reports", label: "Reports", icon: "chart", roles: ["administrator", "pastor", "auditor"] },
  { href: "/admin", label: "Administrator center", icon: "admin", roles: ["administrator"] },
  { href: "/admin/users", label: "Users & roles", icon: "users", roles: ["administrator"] },
  { href: "/admin/audit", label: "Audit log", icon: "audit", roles: ["administrator"] },
  { href: "/admin/settings", label: "Privacy & retention", icon: "shield", roles: ["administrator"] }
];

const roleLabels: Record<AppRole, string> = {
  administrator: "Administrator",
  pastor: "Pastor",
  usher: "Usher",
  auditor: "Read-only leader"
};

const roleSummaries: Record<AppRole, string> = {
  administrator: "Complete system access and ministry oversight",
  pastor: "Visitor, member, care and ministry records",
  usher: "Visitor welcome, attendance and follow-up",
  auditor: "Approved dashboards and reports"
};

function NavIcon({ name }: { name: IconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const
  };

  switch (name) {
    case "dashboard":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
    case "person":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="12" cy="8" r="4" /><path d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>;
    case "check":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><rect x="4" y="3" width="16" height="18" rx="2" /><path d="m8 12 2.5 2.5L16 9" /></svg>;
    case "members":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20a6 6 0 0 1 12 0M14 20a5 5 0 0 1 7 0" /></svg>;
    case "heart":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M20.8 4.8a5.5 5.5 0 0 0-7.8 0L12 5.8l-1-1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.4a5.5 5.5 0 0 0 0-7.8Z" /></svg>;
    case "import":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M4 17v3h16v-3" /></svg>;
    case "calendar":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M7 3v4m10-4v4M3 10h18" /></svg>;
    case "chart":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M4 20V10m6 10V4m6 16v-7m4 7H2" /></svg>;
    case "admin":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z" /><path d="M9 12h6M12 9v6" /></svg>;
    case "users":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 11a3 3 0 0 0 0-6m1 10a5 5 0 0 1 4 5" /></svg>;
    case "audit":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 12h6m-6 4h6" /></svg>;
    case "shield":
      return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}><path d="M12 3 20 6v6c0 5-3.4 8-8 9-4.6-1-8-4-8-9V6z" /><path d="m9 12 2 2 4-4" /></svg>;
  }
}

export function AppShell({ profile, children }: { profile: UserProfile; children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const visibleNavigation = navigation.filter((item) => item.roles.includes(profile.role));
  const current = visibleNavigation
    .filter((item) => pathname === item.href || pathname.startsWith(`${item.href}/`))
    .sort((a, b) => b.href.length - a.href.length)[0];

  return (
    <div className="application-shell">
      <button
        type="button"
        className={`sidebar-scrim ${open ? "visible" : ""}`}
        aria-label="Close navigation"
        onClick={() => setOpen(false)}
      />

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">✦</div>
            <div>
              <strong>Church Care Hub</strong>
              <span>Ministry workspace</span>
            </div>
          </div>
          <button type="button" className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setOpen(false)}>×</button>
        </div>

        <div className="sidebar-role">
          <strong>{roleLabels[profile.role]} workspace</strong>
          <small>{roleSummaries[profile.role]}</small>
        </div>

        <nav aria-label="Main navigation">
          {visibleNavigation.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-link ${active ? "active" : ""}`}
                aria-current={active ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <NavIcon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-account">
          <span>Signed in as</span>
          <strong>{profile.display_name}</strong>
          <small>{roleLabels[profile.role]}</small>
          <form action={logoutAction}>
            <button className="sidebar-signout" type="submit">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5v16h5M14 8l4 4-4 4m4-4H9" /></svg>
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <button type="button" className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setOpen(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
          </button>
          <div>
            <h1>{current?.label ?? "Church Care Hub"}</h1>
            <p>{roleLabels[profile.role]} · {roleSummaries[profile.role]}</p>
          </div>
          <div className="workspace-mark" aria-hidden="true">✦</div>
        </header>
        <main className="main-content">{children}</main>
      </section>
    </div>
  );
}
