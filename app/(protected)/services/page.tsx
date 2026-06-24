import { requireAdminAal2 } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createServiceAction, updateAssignmentAction } from "./actions";

export const metadata = { title: "Services" };
export const dynamic = "force-dynamic";

export default async function ServicesPage({
  searchParams
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  await requireAdminAal2();
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: services }, { data: ushers }, { data: assignments }] = await Promise.all([
    supabase.from("services").select("id, service_name, service_date, start_time, active").order("service_date", { ascending: false }).limit(40),
    supabase.from("user_profiles").select("id, display_name, active").eq("role", "usher").order("display_name"),
    supabase.from("service_assignments").select("service_id, user_id")
  ]);

  const assignmentSet = new Set((assignments ?? []).map((item) => `${item.service_id}:${item.user_id}`));

  return (
    <>
      <header className="page-header">
        <div><h1>Service management</h1><p>Create church gatherings and assign individual ushers.</p></div>
      </header>
      <Notice message={params.notice} kind="success" />
      <Notice message={params.error} kind="error" />

      <div className="grid grid-2">
        <section className="card">
          <h2>Create service</h2>
          <form action={createServiceAction}>
            <div className="field">
              <label htmlFor="serviceName">Service name</label>
              <input id="serviceName" name="serviceName" minLength={2} maxLength={100} required />
            </div>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="serviceDate">Date</label>
                <input id="serviceDate" name="serviceDate" type="date" required />
              </div>
              <div className="field">
                <label htmlFor="startTime">Start time</label>
                <input id="startTime" name="startTime" type="time" required />
              </div>
            </div>
            <div className="field">
              <SubmitButton className="button button-primary button-full" pendingLabel="Creating…">Create service</SubmitButton>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Usher assignments</h2>
          <p className="muted small">Assignments are enforced by database functions and Row-Level Security.</p>
          <div className="stack">
            {(services ?? []).slice(0, 10).map((service) => (
              <details key={service.id}>
                <summary><strong>{service.service_name}</strong> — {service.service_date}</summary>
                <div className="stack" style={{ marginTop: 12 }}>
                  {(ushers ?? []).map((usher) => {
                    const assigned = assignmentSet.has(`${service.id}:${usher.id}`);
                    return (
                      <form action={updateAssignmentAction} key={usher.id} className="actions">
                        <input type="hidden" name="serviceId" value={service.id} />
                        <input type="hidden" name="userId" value={usher.id} />
                        <label className="checkbox-row" style={{ marginTop: 0 }}>
                          <input name="assigned" type="checkbox" defaultChecked={assigned} />
                          <span>{usher.display_name}{usher.active ? "" : " (inactive)"}</span>
                        </label>
                        <SubmitButton className="button button-secondary button-small" pendingLabel="Saving…">Save</SubmitButton>
                      </form>
                    );
                  })}
                </div>
              </details>
            ))}
          </div>
        </section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Recent services</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Service</th><th>Date</th><th>Start</th><th>Status</th></tr></thead>
            <tbody>
              {(services ?? []).map((service) => (
                <tr key={service.id}>
                  <td>{service.service_name}</td>
                  <td>{service.service_date}</td>
                  <td>{service.start_time}</td>
                  <td><span className={`badge ${service.active ? "badge-success" : "badge-neutral"}`}>{service.active ? "Active" : "Inactive"}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
