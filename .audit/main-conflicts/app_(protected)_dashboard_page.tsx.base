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
          <p>Summary information is limited according to your assigned role.</p>
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
                View attendance
              </Link>
            </div>
          ) : null}
        </section>
      ) : (
        <div className="notice notice-info">No service is currently available to your account.</div>
      )}

      <section className="grid grid-4">
        <div className="card metric">
          <div><div className="metric-label">Attending</div><div className="metric-value">{metrics.attending}</div></div>
          <div className="metric-icon" aria-hidden="true">✓</div>
        </div>
        <div className="card metric">
          <div><div className="metric-label">First-time visitors</div><div className="metric-value">{metrics.first_time}</div></div>
          <div className="metric-icon" aria-hidden="true">★</div>
        </div>
        <div className="card metric">
          <div><div className="metric-label">Returning visitors</div><div className="metric-value">{metrics.returning}</div></div>
          <div className="metric-icon" aria-hidden="true">↻</div>
        </div>
        <div className="card metric">
          <div><div className="metric-label">Active visitor records</div><div className="metric-value">{metrics.visitor_records}</div></div>
          <div className="metric-icon" aria-hidden="true">◎</div>
        </div>
      </section>

      <section className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="card">
          <h2>Privacy-first check-in</h2>
          <p className="muted">
            Collect only a name, preferred name, first-visit date, and optional contact information
            when the visitor has clearly consented.
          </p>
        </div>
        <div className="card">
          <h2>Do not record</h2>
          <p className="muted">
            Do not enter addresses, dates of birth, identification numbers, health information,
            prayer requests, counseling notes, financial information, or details about minors.
          </p>
        </div>
      </section>
    </>
  );
}
