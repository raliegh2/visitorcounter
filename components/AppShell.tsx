import Link from "next/link";
import { logoutAction } from "@/app/(auth)/login/actions";
import type { AppRole, UserProfile } from "@/types/app";

const navigation: Array<{
  href: string;
  label: string;
  roles: readonly AppRole[];
}> = [
  { href: "/dashboard", label: "Dashboard", roles: ["administrator", "usher", "auditor"] },
  { href: "/visitors", label: "Visitors", roles: ["administrator", "usher"] },
  { href: "/attendance", label: "Attendance", roles: ["administrator", "usher"] },
  { href: "/services", label: "Services", roles: ["administrator"] },
  { href: "/reports", label: "Reports", roles: ["administrator", "auditor"] },
  { href: "/admin/users", label: "Users & roles", roles: ["administrator"] },
  { href: "/admin/audit", label: "Audit log", roles: ["administrator"] },
  { href: "/admin/settings", label: "Privacy & retention", roles: ["administrator"] }
];

export function AppShell({
  profile,
  children
}: {
  profile: UserProfile;
  children: React.ReactNode;
}) {
  return (
    <div className="application-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">✦</div>
          <div>
            <strong>Visitor Care</strong>
            <span>Church attendance</span>
          </div>
        </div>

        <nav aria-label="Main navigation">
          {navigation
            .filter((item) => item.roles.includes(profile.role))
            .map((item) => (
              <Link key={item.href} href={item.href} className="nav-link">
                {item.label}
              </Link>
            ))}
        </nav>

        <div className="sidebar-account">
          <span>Signed in as</span>
          <strong>{profile.display_name}</strong>
          <small>{profile.role.replace("_", " ")}</small>
          <form action={logoutAction}>
            <button className="button button-secondary button-full" type="submit">
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
