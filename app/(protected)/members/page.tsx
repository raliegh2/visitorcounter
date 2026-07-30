import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireProfile } from "@/lib/auth";
import { callRpc } from "@/lib/supabase/rpc";
import { createClient } from "@/lib/supabase/server";
import type { MemberRow } from "@/types/app";
import { createMemberAction } from "./actions";

export const metadata = { title: "Members" };
export const dynamic = "force-dynamic";

export default async function MembersPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; notice?: string; error?: string }>;
}) {
  await requireProfile(["administrator", "pastor"]);
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const supabase = await createClient();
  const { data, error } = await callRpc<MemberRow[]>(supabase, "search_members", { p_query: query });
  const members = data ?? [];

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Member directory</h1>
          <p>Search ministry records, add members and open care follow-up from one protected workspace.</p>
        </div>
      </header>
      <Notice message={params.notice} kind="success" />
      <Notice message={params.error ?? (error ? "Member records could not be loaded." : undefined)} kind="error" />

      <div className="grid grid-2">
        <section className="card">
          <h2>Add member</h2>
          <p className="muted small">Only collect details required for church administration and ministry care.</p>
          <form action={createMemberAction}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="firstName">First name</label>
                <input id="firstName" name="firstName" maxLength={80} required />
              </div>
              <div className="field">
                <label htmlFor="lastName">Last name</label>
                <input id="lastName" name="lastName" maxLength={80} required />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input id="email" name="email" type="email" maxLength={254} />
              </div>
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input id="phone" name="phone" type="tel" maxLength={40} />
              </div>
              <div className="field">
                <label htmlFor="ministry">Ministry</label>
                <input id="ministry" name="ministry" maxLength={120} />
              </div>
              <div className="field">
                <label htmlFor="joinedDate">Date joined</label>
                <input id="joinedDate" name="joinedDate" type="date" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="address">Address</label>
              <input id="address" name="address" maxLength={240} />
            </div>
            <div className="field">
              <SubmitButton className="button button-primary button-full" pendingLabel="Saving member…">
                Save member
              </SubmitButton>
            </div>
          </form>
        </section>

        <section className="card">
          <div className="section-heading">
            <div>
              <h2>Find members</h2>
              <p className="small">Search by name, contact information or ministry.</p>
            </div>
            <span className="badge badge-neutral">{members.length} shown</span>
          </div>
          <form method="get" action="/members" className="toolbar">
            <div className="field grow">
              <label htmlFor="q">Search directory</label>
              <input id="q" name="q" defaultValue={query} maxLength={100} placeholder="Name, phone, email or ministry" />
            </div>
            <button className="button button-secondary" type="submit">Search</button>
          </form>

          {members.length === 0 ? (
            <div className="empty">No matching active member records were found.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Member</th><th>Contact</th><th>Ministry</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td><strong>{member.first_name} {member.last_name}</strong><br /><small className="muted">Record {member.id.slice(0, 8)}</small></td>
                      <td>{member.phone ?? member.email ?? <span className="muted">Not recorded</span>}</td>
                      <td>{member.ministry ?? <span className="muted">Not assigned</span>}</td>
                      <td>{member.joined_date ?? <span className="muted">Not recorded</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
