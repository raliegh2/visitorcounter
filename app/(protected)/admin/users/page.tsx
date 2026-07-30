import { requireAdminAal2 } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { callRpc } from "@/lib/supabase/rpc";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import {
  changeUserActiveAction,
  changeUserRoleAction,
  inviteUserAction,
  reviewPastorApplicationAction
} from "./actions";
import type { AppRole, PastorApplication, UserProfile } from "@/types/app";

export const metadata = { title: "Users and roles" };
export const dynamic = "force-dynamic";

const roleLabels: Record<AppRole, string> = {
  administrator: "Administrator",
  usher: "Usher",
  pastor: "Pastor",
  auditor: "Read-only leader"
};

export default async function UsersPage({
  searchParams
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  const current = await requireAdminAal2();
  const params = await searchParams;
  const supabase = await createClient();
  const admin = createAdminClient();
  const [profilesResult, authUsers, applicationsResult] = await Promise.all([
    supabase
      .from("user_profiles")
      .select("id, organization_id, display_name, role, requested_role, role_status, active, created_at, updated_at")
      .order("display_name"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    callRpc<PastorApplication[]>(supabase, "list_pastor_applications")
  ]);

  const users = (profilesResult.data ?? []) as unknown as UserProfile[];
  const applications = applicationsResult.data ?? [];
  const emailById = new Map(
    (authUsers.data?.users ?? []).map((user) => [user.id, user.email ?? "Email unavailable"])
  );
  const pendingApplications = applications.filter((application) => application.role_status === "pending");

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Users, roles and approvals</h1>
          <p>Invite staff, review pastor verification requests and control access through individual accounts.</p>
        </div>
      </header>
      <Notice message={params.notice} kind="success" />
      <Notice message={params.error ?? (applicationsResult.error ? "Pastor applications could not be loaded." : undefined)} kind="error" />

      <section className="grid grid-3">
        <div className="card admin-summary"><span className="muted">Staff accounts</span><strong>{users.length}</strong></div>
        <div className="card admin-summary"><span className="muted">Pending pastor reviews</span><strong>{pendingApplications.length}</strong></div>
        <div className="card admin-summary"><span className="muted">Active administrators</span><strong>{users.filter((user) => user.active && user.role === "administrator").length}</strong></div>
      </section>

      {pendingApplications.length > 0 ? (
        <section className="stack" style={{ marginTop: 18 }}>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <div><h2>Pastor verification queue</h2><p>Review submitted church and district details before granting member and pastoral-care access.</p></div>
          </div>
          {pendingApplications.map((application) => (
            <article className="card application-card" key={application.profile_id}>
              <div className="page-header" style={{ marginBottom: 0 }}>
                <div><h3>{application.display_name}</h3><p className="muted">{emailById.get(application.profile_id) ?? "Email unavailable"} · submitted {new Date(application.submitted_at).toLocaleString()}</p></div>
                <span className="badge badge-warning">Pending</span>
              </div>
              <div className="application-details">
                <div><small>Church</small><strong>{application.church_name}</strong></div>
                <div><small>Pastor / supervisor</small><strong>{application.pastor_name}</strong></div>
                <div><small>Church phone</small><strong>{application.church_phone}</strong></div>
                <div><small>District</small><strong>{application.district}</strong></div>
                <div><small>Denomination</small><strong>{application.denomination}</strong></div>
                <div><small>Requested role</small><strong>Pastor</strong></div>
              </div>
              <form action={reviewPastorApplicationAction}>
                <input type="hidden" name="userId" value={application.profile_id} />
                <div className="field">
                  <label htmlFor={`notes-${application.profile_id}`}>Verification notes</label>
                  <input id={`notes-${application.profile_id}`} name="notes" maxLength={500} placeholder="Optional internal review note" />
                </div>
                <div className="actions" style={{ marginTop: 14 }}>
                  <SubmitButton className="button button-primary" name="decision" value="approve" pendingLabel="Approving…">Approve pastor access</SubmitButton>
                  <ConfirmSubmitButton
                    className="button button-danger"
                    name="decision"
                    value="reject"
                    pendingLabel="Rejecting…"
                    confirmation={`Reject the pastor-access request for ${application.display_name}?`}
                  >
                    Reject request
                  </ConfirmSubmitButton>
                </div>
              </form>
            </article>
          ))}
        </section>
      ) : (
        <div className="notice notice-info" style={{ marginTop: 18 }}>There are no pending pastor verification requests.</div>
      )}

      <div className="grid grid-2" style={{ marginTop: 18 }}>
        <section className="card">
          <h2>Invite staff member</h2>
          <form action={inviteUserAction}>
            <div className="field"><label htmlFor="displayName">Display name</label><input id="displayName" name="displayName" minLength={2} maxLength={80} required /></div>
            <div className="field"><label htmlFor="email">Staff email</label><input id="email" name="email" type="email" maxLength={254} required /></div>
            <div className="field">
              <label htmlFor="role">Role</label>
              <select id="role" name="role" defaultValue="usher">
                <option value="usher">Usher</option>
                <option value="pastor">Pastor</option>
                <option value="auditor">Read-only leader</option>
                <option value="administrator">Administrator</option>
              </select>
            </div>
            <div className="notice notice-info">Administrators must enroll multi-factor authentication before accessing administrative pages.</div>
            <SubmitButton className="button button-primary button-full" pendingLabel="Sending invitation…">Invite staff member</SubmitButton>
          </form>
        </section>

        <section className="card">
          <h2>Permission summary</h2>
          <p><strong>Administrator:</strong> users, approvals, services, reports, audit, retention and all ministry records.</p>
          <p><strong>Pastor:</strong> visitors, attendance, member records, imports, care notes and completed visits.</p>
          <p><strong>Usher:</strong> visitor registration, assigned-service check-in and assigned-team visitor follow-up.</p>
          <p><strong>Read-only leader:</strong> approved aggregate dashboard and reports only.</p>
        </section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Staff accounts</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Staff account</th><th>Current role</th><th>Request status</th><th>Account</th><th>Role action</th><th>Account action</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td><strong>{user.display_name}</strong><br /><small className="muted">{emailById.get(user.id) ?? "Email unavailable"} · {user.id.slice(0, 8)}</small></td>
                  <td>{roleLabels[user.role]}</td>
                  <td><span className={`badge ${user.role_status === "approved" ? "badge-success" : user.role_status === "pending" ? "badge-warning" : "badge-danger"}`}>{user.requested_role === user.role ? user.role_status : `${user.requested_role} ${user.role_status}`}</span></td>
                  <td><span className={`badge ${user.active ? "badge-success" : "badge-danger"}`}>{user.active ? "Active" : "Disabled"}</span></td>
                  <td>
                    <form action={changeUserRoleAction} className="actions">
                      <input type="hidden" name="userId" value={user.id} />
                      <select name="role" defaultValue={user.role} disabled={user.id === current.id}>
                        <option value="administrator">Administrator</option>
                        <option value="pastor">Pastor</option>
                        <option value="usher">Usher</option>
                        <option value="auditor">Read-only leader</option>
                      </select>
                      <SubmitButton className="button button-secondary button-small" pendingLabel="Saving…">Save role</SubmitButton>
                    </form>
                  </td>
                  <td>
                    <form action={changeUserActiveAction}>
                      <input type="hidden" name="userId" value={user.id} />
                      <input type="hidden" name="active" value={user.active ? "false" : "true"} />
                      {user.active ? (
                        <ConfirmSubmitButton className="button button-secondary button-small" pendingLabel="Saving…" confirmation={`Disable ${user.display_name}? Existing sessions will lose database access.`}>Disable</ConfirmSubmitButton>
                      ) : (
                        <SubmitButton className="button button-secondary button-small" pendingLabel="Saving…">Enable</SubmitButton>
                      )}
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
