import { requireAdminAal2 } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Audit log" };
export const dynamic = "force-dynamic";

type AuditRow = {
  id: string;
  actor_user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  event_timestamp: string;
  outcome: string;
  safe_metadata: Record<string, unknown>;
};

export default async function AuditPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireAdminAal2();
  const params = await searchParams;
  const query = (params.q ?? "").trim().toLowerCase();
  const supabase = await createClient();

  // Fetch a bounded recent window and filter in server memory instead of building
  // a PostgREST filter expression from untrusted user text.
  const { data } = await supabase
    .from("audit_logs")
    .select("id, actor_user_id, action, resource_type, resource_id, event_timestamp, outcome, safe_metadata")
    .order("event_timestamp", { ascending: false })
    .limit(200);

  const rows = ((data ?? []) as AuditRow[]).filter((row) =>
    !query ||
    row.action.toLowerCase().includes(query) ||
    row.resource_type.toLowerCase().includes(query)
  );

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Audit log</h1>
          <p>Audit metadata excludes passwords, tokens, names, and full contact details.</p>
        </div>
      </header>

      <section className="card">
        <form method="get" action="/admin/audit" className="toolbar">
          <div className="field grow">
            <label htmlFor="q">Filter by action or resource</label>
            <input id="q" name="q" defaultValue={params.q ?? ""} maxLength={80} />
          </div>
          <button className="button button-primary" type="submit">Filter</button>
        </form>

        <div className="table-wrap">
          <table>
            <thead><tr><th>Time</th><th>Action</th><th>Resource</th><th>Outcome</th><th>Safe metadata</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>{new Date(row.event_timestamp).toLocaleString()}</td>
                  <td>{row.action}</td>
                  <td>{row.resource_type}{row.resource_id ? ` · ${row.resource_id.slice(0, 8)}` : ""}</td>
                  <td><span className={`badge ${row.outcome === "success" ? "badge-success" : "badge-danger"}`}>{row.outcome}</span></td>
                  <td><code>{JSON.stringify(row.safe_metadata)}</code></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? <div className="empty">No matching audit events.</div> : null}
      </section>
    </>
  );
}
