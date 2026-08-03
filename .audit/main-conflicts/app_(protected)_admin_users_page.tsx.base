import { requireAdminAal2 } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { changeUserActiveAction, changeUserRoleAction, inviteUserAction } from "./actions";
import type { AppRole, UserProfile } from "@/types/app";

export const metadata = { title: "Users and roles" };
export const dynamic = "force-dynamic";

const roleLabels: Record<AppRole, string> = {
  administrator: "Administrator",
  usher: "Usher",
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
  const [{ data }, authUsers] = await Promise.all([
    supabase
    .from("user_profiles")
    .select("id, organization_id, display_name, role, active, created_at, updated_at")
    .order("display_name"),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  ]);

  const users = (data ?? []) as UserProfile[];
  const emailById = new Map(
    (authUsers.data?.users ?? []).map((user) => [user.id, user.email ?? "Email unavailable"])
  );

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Users and roles</h1>
          <p>Every staff member must use an individual account. Shared credentials are not supported.</p>
        </div>
      </header>
      <Notice message={params.notice} kind="success" />
      <Notice message={params.error} kind="error" />

      <div className="grid grid-2">
        <section className="card">
          <h2>Invite staff member</h2>
          <form action={inviteUserAction}>
            <div className="field">
              <label htmlFor="displayName">Display name</label>
              <input id="displayName" name="displayName" minLength={2} maxLength={80} required />
            </div>
            <div className="field">
              <label htmlFor="email">Staff email</label>
              <input id="email" name="email" type="email" maxLength={254} required />
            </div>
            <div className="field">
              <label htmlFor="role">Role</label>
              <select id="role" name="role" defaultValue="usher">
                <option value="usher">Usher</option>
                <option value="auditor">Read-only leader</option>
                <option value="administrator">Administrator</option>
              </select>
            </div>
            <div className="notice notice-info">
              Administrators must enroll a multi-factor authenticator before accessing administrative pages.
            </div>
            <SubmitButton className="button button-primary button-full" pendingLabel="Sending invitation…">
              Invite staff member
            </SubmitButton>
          </form>
        </section>

        <section className="card">
          <h2>Permission summary</h2>
          <p><strong>Administrator:</strong> users, services, corrections, reports, audit, retention, and exports.</p>
          <p><strong>Usher:</strong> search, registration, and assigned-service check-in.</p>
          <p><strong>Read-only leader:</strong> approved aggregate dashboard and reports only.</p>
        </section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Staff accounts</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Staff account</th><th>Role</th><th>Status</th><th>Role action</th><th>Account action</th></tr></thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.display_name}</strong>
                    <br />
                    <small className="muted">{emailById.get(user.id) ?? "Email unavailable"} · {user.id.slice(0, 8)}</small>
                  </td>
                  <td>{roleLabels[user.role]}</td>
                  <td><span className={`badge ${user.active ? "badge-success" : "badge-danger"}`}>{user.active ? "Active" : "Disabled"}</span></td>
                  <td>
                    <form action={changeUserRoleAction} className="actions">
                      <input type="hidden" name="userId" value={user.id} />
                      <select name="role" defaultValue={user.role} disabled={user.id === current.id}>
                        <option value="administrator">Administrator</option>
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
                        <ConfirmSubmitButton
                          className="button button-secondary button-small"
                          pendingLabel="Saving…"
                          confirmation={`Disable ${user.display_name}? Existing sessions will lose database access.`}
                        >
                          Disable
                        </ConfirmSubmitButton>
                      ) : (
                        <SubmitButton className="button button-secondary button-small" pendingLabel="Saving…">
                          Enable
                        </SubmitButton>
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
