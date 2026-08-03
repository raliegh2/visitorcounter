import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { chooseService, getAvailableServices } from "@/lib/data";
import { ServicePicker } from "@/components/ServicePicker";
import { Notice } from "@/components/ui/Notice";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { correctAttendanceAction } from "./actions";
import type { AttendanceRow } from "@/types/app";

type Metrics = {
  attending: number;
  first_time: number;
  returning: number;
  visitor_records: number;
};

export const metadata = { title: "Attendance" };
export const dynamic = "force-dynamic";

export default async function AttendancePage({
  searchParams
}: {
  searchParams: Promise<{ service?: string; notice?: string; error?: string }>;
}) {
  const profile = await requireProfile(["administrator", "usher"]);
  const params = await searchParams;
  const services = await getAvailableServices();
  const service = chooseService(services, params.service);
  let rows: AttendanceRow[] = [];
  let metrics: Metrics = { attending: 0, first_time: 0, returning: 0, visitor_records: 0 };

  if (service) {
    const supabase = await createClient();
    const [{ data: attendanceData }, { data: metricsData }] = await Promise.all([
      supabase.rpc("current_attendance", { p_service_id: service.id }),
      supabase.rpc("dashboard_metrics", { p_service_id: service.id })
    ]);

    rows = (attendanceData ?? []) as AttendanceRow[];
    if (metricsData?.[0]) metrics = metricsData[0] as Metrics;
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Service attendance count</h1>
          <p>
            Each active check-in counts one person present. First-time and returning totals are
            calculated automatically from the visitor&apos;s recorded first visit.
          </p>
        </div>
        {service ? <ServicePicker services={services} selectedId={service.id} action="/attendance" /> : null}
      </header>
      <Notice message={params.notice} kind="success" />
      <Notice message={params.error} kind="error" />

      <section className="grid grid-4" style={{ marginBottom: 18 }}>
        <div className="card metric">
          <div>
            <div className="metric-label">Total individuals present</div>
            <div className="metric-value">{metrics.attending}</div>
          </div>
          <div className="metric-icon" aria-hidden="true">✓</div>
        </div>
        <div className="card metric">
          <div>
            <div className="metric-label">First-time visitors</div>
            <div className="metric-value">{metrics.first_time}</div>
          </div>
          <div className="metric-icon" aria-hidden="true">★</div>
        </div>
        <div className="card metric">
          <div>
            <div className="metric-label">Returning visitors</div>
            <div className="metric-value">{metrics.returning}</div>
          </div>
          <div className="metric-icon" aria-hidden="true">↻</div>
        </div>
        <div className="card metric">
          <div>
            <div className="metric-label">Active visitor records</div>
            <div className="metric-value">{metrics.visitor_records}</div>
          </div>
          <div className="metric-icon" aria-hidden="true">◎</div>
        </div>
      </section>

      <section className="card">
        {!service ? (
          <div className="empty">No service is available.</div>
        ) : rows.length === 0 ? (
          <div className="empty">No active check-ins have been recorded for this service.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Person</th>
                  <th>Visitor status</th>
                  <th>Checked in</th>
                  <th>Recorded by</th>
                  {profile.role === "administrator" ? <th>Correction</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const firstTime = row.visitor_type === "first-time";
                  return (
                    <tr key={row.attendance_id}>
                      <td>
                        <strong>{row.display_name}</strong>
                        <br />
                        <small className="muted">Active visitor record {row.visitor_id.slice(0, 8)}</small>
                      </td>
                      <td>
                        <span className={`badge ${firstTime ? "badge-success" : "badge-neutral"}`}>
                          {firstTime ? "First-time visitor" : "Returning visitor"}
                        </span>
                      </td>
                      <td>{new Date(row.checked_in_at).toLocaleString()}</td>
                      <td>{row.checked_in_by_name}</td>
                      {profile.role === "administrator" ? (
                        <td>
                          <details>
                            <summary>Correct record</summary>
                            <form action={correctAttendanceAction}>
                              <input type="hidden" name="attendanceId" value={row.attendance_id} />
                              <input type="hidden" name="serviceId" value={service.id} />
                              <div className="field">
                                <label htmlFor={`reason-${row.attendance_id}`}>Reason</label>
                                <input id={`reason-${row.attendance_id}`} name="reason" minLength={8} maxLength={240} required />
                              </div>
                              <ConfirmSubmitButton
                                className="button button-danger button-small"
                                pendingLabel="Correcting…"
                                confirmation="Confirm that this attendance record should be voided. The correction will be audited."
                              >
                                Void check-in
                              </ConfirmSubmitButton>
                            </form>
                          </details>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
