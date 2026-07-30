import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Administrator center" };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireProfile(["administrator"]);
  const supabase = await createClient();
  const [profiles, members, visitors, notes, requests] = await Promise.all([
    supabase.from("user_profiles").select("id", { count: "exact", head: true }),
    supabase.from("members").select("id", { count: "exact", head: true }),
    supabase.from("visitors").select("id", { count: "exact", head: true }),
    supabase.from("care_notes").select("id", { count: "exact", head: true }).neq("status", "resolved"),
    supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("role_status", "pending")
  ]);
  const cards = [
    ["Staff accounts", profiles.count ?? 0, "/admin/users", "Manage accounts and approve role requests."],
    ["Members", members.count ?? 0, "/members", "Open, maintain, import, and monitor the member database."],
    ["Visitors", visitors.count ?? 0, "/visitors", "Access every visitor and attendance workflow."],
    ["Open care needs", notes.count ?? 0, "/care", "Review support notes and ministry visits."],
    ["Pending requests", requests.count ?? 0, "/admin/users", "Approve or reject Pastor and Administrator requests."]
  ] as const;
  return <><header className="page-header"><div><h1>Administrator center</h1><p>Complete oversight of users, members, visitors, care activity, reporting, audit, and privacy settings.</p></div></header><section className="grid grid-3">{cards.map(([label, count, href, description]) => <Link href={href} className="card admin-module" key={label}><div className="metric-value">{count}</div><h2>{label}</h2><p className="muted">{description}</p><span className="button button-secondary button-small">Open section</span></Link>)}</section><section className="grid grid-3" style={{ marginTop: 18 }}><Link className="card admin-module" href="/services"><h2>Services</h2><p className="muted">Create services and manage check-in availability.</p></Link><Link className="card admin-module" href="/reports"><h2>Reports</h2><p className="muted">Monitor attendance and ministry activity.</p></Link><Link className="card admin-module" href="/admin/audit"><h2>Audit log</h2><p className="muted">Review sensitive administrative activity.</p></Link><Link className="card admin-module" href="/admin/settings"><h2>Privacy & retention</h2><p className="muted">Maintain data retention and operational privacy controls.</p></Link></section></>;
}
