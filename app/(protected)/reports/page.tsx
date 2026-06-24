import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { hasRecentReauth } from "@/lib/reauth";
import { createClient } from "@/lib/supabase/server";

type Summary = {
  service_id: string;
  service_name: string;
  service_date: string;
  total_attendance: number;
  first_time_visitors: number;
  returning_visitors: number;
};

export const metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const profile = await requireProfile(["administrator", "auditor"]);
  const params = await searchParams;
  const today = new Date();
  const defaultTo = today.toISOString().slice(0, 10);
  const fromDate = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate())
    .toISOString()
    .slice(0, 10);
  const from = params.from ?? fromDate;
  const to = params.to ?? defaultTo;

  const supabase = await createClient();
  const { data } = await supabase.rpc("attendance_summary", {
    p_from: from,
    p_to: to
  });
  const rows = (data ?? []) as Summary[];
  const recentlyAuthorized = profile.role === "administrator"
    ? await hasRecentReauth(profile.id)
    : false;
  const returnTo = `/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

  return (
    <>
      <header className="page-header">
        <div><h1>Attendance reports</h1><p>Summary reports do not expose personal details.</p></div>
        {profile.role === "administrator" ? (
          recentlyAuthorized ? (
            <form method="post" action="/api/exports/attendance">
              <input type="hidden" name="from" value={from} />
              <input type="hidden" name="to" value={to} />
              <button className="button button-primary" type="submit">
                Export authorized data
              </button>
            </form>
          ) : (
            <Link
              className="button button-primary"
              href={`/reauth?next=${encodeURIComponent(returnTo)}`}
            >
              Authorize export
            </Link>
          )
        ) : null}
      </header>

      {profile.role === "administrator" && recentlyAuthorized ? (
        <div className="notice notice-info">
          Sensitive administrator actions are authorized for five minutes.
        </div>
      ) : null}

      <section className="card">
        <form method="get" action="/reports" className="toolbar">
          <div className="field">
            <label htmlFor="from">From</label>
            <input id="from" name="from" type="date" defaultValue={from} required />
          </div>
          <div className="field">
            <label htmlFor="to">To</label>
            <input id="to" name="to" type="date" defaultValue={to} required />
          </div>
          <button className="button button-primary" type="submit">Run report</button>
        </form>

        <div className="table-wrap">
          <table>
            <thead><tr><th>Service</th><th>Date</th><th>Total</th><th>First-time</th><th>Returning</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.service_id}>
                  <td>{row.service_name}</td>
                  <td>{row.service_date}</td>
                  <td>{row.total_attendance}</td>
                  <td>{row.first_time_visitors}</td>
                  <td>{row.returning_visitors}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 ? <div className="empty">No services match the selected period.</div> : null}
      </section>
    </>
  );
}
