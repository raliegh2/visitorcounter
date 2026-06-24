import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { chooseService, getAvailableServices } from "@/lib/data";
import { ServicePicker } from "@/components/ServicePicker";
import { Notice } from "@/components/ui/Notice";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { correctAttendanceAction } from "./actions";
import type { AttendanceRow } from "@/types/app";

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

  if (service) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("current_attendance", { p_service_id: service.id });
    rows = (data ?? []) as AttendanceRow[];
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Current attendance</h1>
          <p>Absence is derived from missing attendance and is never stored as a false record.</p>
        </div>
        {service ? <ServicePicker services={services} selectedId={service.id} action="/attendance" /> : null}
      </header>
      <Notice message={params.notice} kind="success" />
      <Notice message={params.error} kind="error" />

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
                  <th>Visitor</th>
                  <th>Type</th>
                  <th>Checked in</th>
                  <th>Recorded by</th>
                  {profile.role === "administrator" ? <th>Correction</th> : null}
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.attendance_id}>
                    <td><strong>{row.display_name}</strong><br /><small className="muted">Record {row.visitor_id.slice(0, 8)}</small></td>
                    <td><span className={`badge ${row.visitor_type === "first-time" ? "badge-success" : "badge-neutral"}`}>{row.visitor_type}</span></td>
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
