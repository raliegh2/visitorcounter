import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { chooseService, getAvailableServices } from "@/lib/data";
import { ServicePicker } from "@/components/ServicePicker";

type Metrics = {
  attending: number;
  first_time: number;
  returning: number;
  visitor_records: number;
};

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const profile = await requireProfile();
  const params = await searchParams;
  const services = await getAvailableServices();
  const service = chooseService(services, params.service);

  let metrics: Metrics = { attending: 0, first_time: 0, returning: 0, visitor_records: 0 };
  if (service) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("dashboard_metrics", { p_service_id: service.id });
    if (data?.[0]) metrics = data[0] as Metrics;
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Current service dashboard</h1>
          <p>
            Live attendance totals are calculated from active check-ins for services assigned to your account.
          </p>
        </div>
        {service ? <ServicePicker services={services} selectedId={service.id} action="/dashboard" /> : null}
      </header>

      {service ? (
        <section className="service-banner">
          <div>
            <div className="eyebrow">Selected service</div>
            <h2>{service.service_name}</h2>
            <p className="muted">{service.service_date} · {service.start_time}</p>
          </div>
          {profile.role !== "auditor" ? (
            <div className="actions">
              <Link className="button button-primary" href={`/visitors?service=${service.id}`}>
                Register or find visitor
              </Link>
              <Link className="button button-secondary" href={`/attendance?service=${service.id}`}>
                View attendance count
              </Link>
            </div>
          ) : null}
        </section>
      ) : (
        <div className="notice notice-info">No service is currently available to your account.</div>
      )}

      <section className="grid grid-4">
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

      <section className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <h2>How the count works</h2>
          <p className="muted">
            Each non-voided check-in counts one individual present. A person is marked first-time when
            the selected service date matches the first-visit date; later check-ins are marked returning.
          </p>
        </div>
        <div className="card">
          <h2>Active visitors</h2>
          <p className="muted">
            Active visitor records are available for future search and check-in. Anonymized or inactive
            records are excluded automatically.
          </p>
        </div>
      </section>
    </>
  );
}
