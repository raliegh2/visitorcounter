import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/supabase/rpc";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createMemberAction } from "./actions";
import type { MemberSearchResult } from "@/types/app";

export const metadata = { title: "Member database" };
export const dynamic = "force-dynamic";

export default async function MembersPage({ searchParams }: { searchParams: Promise<{ q?: string; notice?: string; error?: string }> }) {
  await requireProfile(["administrator", "pastor"]);
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const supabase = await createClient();
  const { data } = await callRpc<MemberSearchResult[]>(supabase, "search_member_records", { p_query: query });
  const members = data ?? [];
  return (
    <>
      <header className="page-header"><div><h1>Member database</h1><p>Search church members, review contact and visit status, and open their care history.</p></div><Link className="button button-secondary" href="/import">Import Excel or CSV</Link></header>
      <Notice message={params.notice} kind="success" /><Notice message={params.error} kind="error" />
      <div className="grid grid-2">
        <section className="card">
          <h2>Find members</h2>
          <form method="get" action="/members" className="toolbar"><div className="field grow"><label htmlFor="q">Name, email, or phone</label><input id="q" name="q" defaultValue={query} maxLength={120} /></div><button className="button button-primary" type="submit">Search</button></form>
          {members.length === 0 ? <div className="empty">No matching member records were found.</div> : (
            <div className="table-wrap"><table><thead><tr><th>Member</th><th>Status</th><th>Visited</th><th>Last visit</th><th>Care</th></tr></thead><tbody>{members.map((member) => (
              <tr key={member.id}><td><strong>{member.first_name} {member.last_name}</strong><br /><small className="muted">{[member.email, member.phone].filter(Boolean).join(" · ") || "No contact recorded"}</small></td><td><span className={`badge ${member.membership_status === "active" ? "badge-success" : "badge-neutral"}`}>{member.membership_status}</span></td><td><span className={`badge ${member.has_been_visited ? "badge-success" : "badge-warning"}`}>{member.has_been_visited ? `Yes (${member.visit_count})` : "Not yet"}</span></td><td>{member.last_visited_at ? new Date(member.last_visited_at).toLocaleDateString() : "—"}</td><td><Link className="button button-secondary button-small" href={`/care?type=member&person=${member.id}`}>Notes & visits</Link></td></tr>
            ))}</tbody></table></div>
          )}
        </section>
        <section className="card">
          <h2>Add one member</h2>
          <form action={createMemberAction}>
            <div className="form-grid"><div className="field"><label htmlFor="firstName">First name</label><input id="firstName" name="firstName" maxLength={80} required /></div><div className="field"><label htmlFor="lastName">Last name</label><input id="lastName" name="lastName" maxLength={80} required /></div><div className="field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" maxLength={254} /></div><div className="field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" maxLength={40} /></div><div className="field"><label htmlFor="membershipStatus">Membership status</label><select id="membershipStatus" name="membershipStatus" defaultValue="active"><option value="active">Active</option><option value="prospective">Prospective</option><option value="inactive">Inactive</option></select></div><div className="field"><label htmlFor="lastContactAt">Last contact date</label><input id="lastContactAt" name="lastContactAt" type="date" /></div></div>
            <div className="field"><label htmlFor="address">Address</label><textarea id="address" name="address" rows={3} maxLength={300} /></div>
            <SubmitButton className="button button-primary button-full" pendingLabel="Saving…">Add member</SubmitButton>
          </form>
        </section>
      </div>
    </>
  );
}
