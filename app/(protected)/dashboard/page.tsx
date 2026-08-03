import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/supabase/rpc";
import { chooseService, getAvailableServices } from "@/lib/data";
import { ServicePicker } from "@/components/ServicePicker";

type AttendanceMetrics = {
  attending: number;
  first_time: number;
  returning: number;
  visitor_records: number;
};

type MinistryMetrics = {
  visitor_records: number;
  member_records: number;
  open_care_needs: number;
  completed_visits: number;
};

export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams
}: {
  searchParams: Promise<{ service?: string }>;
}) {
  const [profile, params, services] = await Promise.all([
    requireProfile(),
    searchParams,
    getAvailableServices()
  ]);
  const service = chooseService(services, params.service);
  const supabase = await createClient();

  const attendancePromise = service
    ? supabase.rpc("dashboard_metrics", { p_service_id: service.id })
    : Promise.resolve({ data: null, error: null });
  const ministryPromise = callRpc<MinistryMetrics[]>(supabase, "ministry_dashboard_metrics");
  const [attendanceResult, ministryResult] = await Promise.all([attendancePromise, ministryPromise]);

  const attendance: AttendanceMetrics = attendanceResult.data?.[0]
    ? attendanceResult.data[0] as AttendanceMetrics
    : { attending: 0, first_time: 0, returning: 0, visitor_records: 0 };
  const ministry = ministryResult.data?.[0] ?? {
    visitor_records: 0,
    member_records: 0,
    open_care_needs: 0,
    completed_visits: 0
  };

  const canCareForMembers = profile.role === "administrator" || profile.role === "pastor";
  const canCheckIn = profile.role !== "auditor";

  return (
    <>
      <section className="ministry-hero">
        <h2>One place to welcome, care and follow up.</h2>
        <p>
          See the responsibilities assigned to your role, keep every ministry next step visible and protect sensitive information through database-enforced permissions.
        </p>
        <div className="actions">
          {canCheckIn && service ? (
            <Link className="button button-primary" href={`/visitors?service=${service.id}`}>Register or find visitor</Link>
          ) : null}
          {canCheckIn ? <Link className="button button-secondary" href="/care">Open care workspace</Link> : null}
          {canCareForMembers ? <Link className="button button-secondary" href="/members">View members</Link> : null}
        </div>
      </section>

      <section className="metric-grid" aria-label="Ministry overview">
        <article><div className="metric-symbol" aria-hidden="true">V</div><span>Visitors</span><strong>{ministry.visitor_records}</strong></article>
        <article><div className="metric-symbol" aria-hidden="true">M</div><span>Members</span><strong>{ministry.member_records}</strong></article>
        <article><div className="metric-symbol" aria-hidden="true">♡</div><span>Open care needs</span><strong>{ministry.open_care_needs}</strong></article>
        <article><div className="metric-symbol" aria-hidden="true">✓</div><span>Completed visits</span><strong>{ministry.completed_visits}</strong></article>
      </section>

      <header className="page-header" style={{ marginTop: 28 }}>
        <div>
          <h1>Current service</h1>
          <p>Live attendance totals are calculated from active check-ins for services assigned to your account.</p>
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
          {canCheckIn ? (
            <div className="actions">
              <Link className="button button-primary" href={`/visitors?service=${service.id}`}>Visitor check-in</Link>
              <Link className="button button-secondary" href={`/attendance?service=${service.id}`}>View attendance</Link>
            </div>
          ) : null}
        </section>
      ) : (
        <div className="notice notice-info">No service is currently available to your account.</div>
      )}

      <section className="grid grid-4">
        <div className="card metric"><div><div className="metric-label">Total present</div><div className="metric-value">{attendance.attending}</div></div><div className="metric-icon" aria-hidden="true">✓</div></div>
        <div className="card metric"><div><div className="metric-label">First-time visitors</div><div className="metric-value">{attendance.first_time}</div></div><div className="metric-icon" aria-hidden="true">★</div></div>
        <div className="card metric"><div><div className="metric-label">Returning visitors</div><div className="metric-value">{attendance.returning}</div></div><div className="metric-icon" aria-hidden="true">↻</div></div>
        <div className="card metric"><div><div className="metric-label">Active visitor records</div><div className="metric-value">{attendance.visitor_records}</div></div><div className="metric-icon" aria-hidden="true">◎</div></div>
      </section>

      <section className="grid grid-2" style={{ marginTop: 18 }}>
        <div className="card"><h2>Follow-up workflow</h2><p className="muted">Register a person, document an appropriate support need and record each completed visit or follow-up.</p></div>
        <div className="card"><h2>Privacy reminder</h2><p className="muted">Record only information needed for ministry care and limit sensitive notes to the appropriate team.</p></div>
      </section>
    </>
  );
}
