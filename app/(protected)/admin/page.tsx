import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Administrator center" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const profile = await requireProfile(["administrator"]);
  const supabase = await createClient();
  const [profiles, members, visitors, notes, requests] = await Promise.all([
    supabase.from("user_profiles").select("id", { count: "exact", head: true }),
    supabase.from("members").select("id", { count: "exact", head: true }),
    supabase.from("visitors").select("id", { count: "exact", head: true }),
    supabase.from("care_notes").select("id", { count: "exact", head: true }).neq("status", "resolved"),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("role_status", "pending")
  ]);

  const overview = [
    ["Staff accounts", profiles.count ?? 0, "/admin/users", "Manage individual accounts, roles, approvals, and access status."],
    ["Members", members.count ?? 0, "/members", "Maintain the member directory, imports, visit status, and care history."],
    ["Visitors", visitors.count ?? 0, "/visitors", "Access every visitor registration, check-in, and follow-up workflow."],
    ["Open care needs", notes.count ?? 0, "/care", "Review unresolved support notes and ministry visit activity."],
    ["Pending requests", requests.count ?? 0, "/admin/users", "Approve or reject Pastor and Administrator role requests."]
  ] as const;

  return (
    <>
      <section className="ministry-hero">
        <h1>Administrator center</h1>
        <p>
          Welcome, {profile.display_name}. Monitor the complete Church Care Hub workspace, maintain staff access,
          and move directly into every ministry, reporting, audit, and privacy section.
        </p>
        <div className="actions">
          <Link className="button button-primary" href="/admin/users">Review users & roles</Link>
          <Link className="button button-secondary" href="/admin/audit">Open audit log</Link>
          <Link className="button button-secondary" href="/admin/settings">Privacy & retention</Link>
        </div>
      </section>

      <header className="page-header" style={{ marginTop: 28 }}>
        <div>
          <h1>System overview</h1>
          <p>Current record and workflow totals across your organization.</p>
        </div>
      </header>

      <section className="grid grid-3">
        {overview.map(([label, count, href, description]) => (
          <Link href={href} className="card admin-module" key={label}>
            <div className="metric-value">{count}</div>
            <h2>{label}</h2>
            <p className="muted">{description}</p>
            <span className="button button-secondary button-small">Open section</span>
          </Link>
        ))}
      </section>

      <header className="page-header" style={{ marginTop: 30 }}>
        <div>
          <h1>Administration tools</h1>
          <p>Maintain operations, reporting, accountability, and data controls.</p>
        </div>
      </header>

      <section className="grid grid-3">
        <Link className="card admin-module" href="/services">
          <h2>Services</h2>
          <p className="muted">Create services and manage check-in availability.</p>
        </Link>
        <Link className="card admin-module" href="/reports">
          <h2>Reports</h2>
          <p className="muted">Monitor attendance and ministry activity.</p>
        </Link>
        <Link className="card admin-module" href="/admin/audit">
          <h2>Audit log</h2>
          <p className="muted">Review sensitive administrative and data events.</p>
        </Link>
        <Link className="card admin-module" href="/admin/settings">
          <h2>Privacy & retention</h2>
          <p className="muted">Maintain retention periods and operational privacy controls.</p>
        </Link>
        <Link className="card admin-module" href="/import">
          <h2>Member imports</h2>
          <p className="muted">Preview and import Excel or CSV member records.</p>
        </Link>
        <Link className="card admin-module" href="/care">
          <h2>Care oversight</h2>
          <p className="muted">Review visitor and member support notes and ministry visits.</p>
        </Link>
      </section>
    </>
  );
}
