import Link from "next/link";
import { logoutAction } from "@/app/(auth)/login/actions";
import type { AppRole, UserProfile } from "@/types/app";

const navigation: Array<{ href: string; label: string; roles: readonly AppRole[] }> = [
  { href: "/dashboard", label: "My dashboard", roles: ["administrator", "usher", "pastor", "auditor"] },
  { href: "/visitors", label: "Visitor management", roles: ["administrator", "usher", "pastor"] },
  { href: "/attendance", label: "Attendance", roles: ["administrator", "usher", "pastor"] },
  { href: "/members", label: "Member database", roles: ["administrator", "pastor"] },
  { href: "/import", label: "Import members", roles: ["administrator", "pastor"] },
  { href: "/care", label: "Care notes & visits", roles: ["administrator", "usher", "pastor"] },
  { href: "/services", label: "Services", roles: ["administrator"] },
  { href: "/reports", label: "Reports", roles: ["administrator", "pastor", "auditor"] },
  { href: "/admin", label: "Administrator center", roles: ["administrator"] },
  { href: "/admin/users", label: "Users & role requests", roles: ["administrator"] },
  { href: "/admin/audit", label: "Audit log", roles: ["administrator"] },
  { href: "/admin/settings", label: "Privacy & retention", roles: ["administrator"] }
];

const roleLabels: Record<AppRole, string> = { administrator: "Administrator", pastor: "Pastor", usher: "Usher", auditor: "Read-only leader" };

export function AppShell({ profile, children }: { profile: UserProfile; children: React.ReactNode }) {
  return (
    <div className="application-shell">
      <aside className="sidebar">
        <div className="brand"><div className="brand-mark" aria-hidden="true">✦</div><div><strong>Church Care Hub</strong><span>Visitor and member care</span></div></div>
        <div className="role-responsibility"><strong>{roleLabels[profile.role]} workspace</strong><small>{profile.role === "usher" ? "Visitors, check-in and visitor follow-up" : profile.role === "pastor" ? "Visitors, members, care and ministry visits" : profile.role === "administrator" ? "Complete system access and oversight" : "Approved dashboards and reports"}</small></div>
        <nav aria-label="Main navigation">{navigation.filter((item) => item.roles.includes(profile.role)).map((item) => <Link key={item.href} href={item.href} className="nav-link">{item.label}</Link>)}</nav>
        <div className="sidebar-account"><span>Signed in as</span><strong>{profile.display_name}</strong><small>{roleLabels[profile.role]}</small><form action={logoutAction}><button className="button button-secondary button-full" type="submit">Sign out</button></form></div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
