import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/supabase/rpc";
import { chooseService, getAvailableServices } from "@/lib/data";
import { ServicePicker } from "@/components/ServicePicker";
import type { MinistryMetrics } from "@/types/app";

type AttendanceMetrics = {
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
    visitors: attendance.visitor_records,
    members: 0,
    open_care_needs: 0,
    completed_visits: 0,
    pending_role_requests: 0
  };

  const canCheckIn = profile.role !== "auditor";
  const canManageMembers = profile.role === "administrator" || profile.role === "pastor";
  const heroCopy = profile.role === "usher"
    ? "Welcome people well and keep every visitor follow-up visible."
    : profile.role === "pastor"
      ? "See the people, care needs and ministry visits that need pastoral attention."
      : profile.role === "administrator"
        ? "Oversee the complete ministry workspace from one clear command center."
        : "Review approved attendance and ministry reporting in one place.";

  return (
    <>
      <section className="ministry-hero">
        <h1>{heroCopy}</h1>
        <p>
          Church Care Hub brings visitor welcome, member care, follow-up notes, ministry visits and role-based oversight into one protected workspace.
        </p>
        <div className="actions">
          {canCheckIn && service ? (
            <Link className="button button-primary" href={`/visitors?service=${service.id}`}>
              Register or find visitor
            </Link>
          ) : null}
          {canCheckIn ? <Link className="button button-secondary" href="/care">Open care workspace</Link> : null}
          {canManageMembers ? <Link className="button button-secondary" href="/members">View members</Link> : null}
          {profile.role === "administrator" ? <Link className="button button-secondary" href="/admin">Administrator center</Link> : null}
        </div>
      </section>

      <section className="metric-grid" aria-label="Ministry overview">
        <article>
          <div className="metric-symbol" aria-hidden="true">V</div>
          <span>Active visitors</span>
          <strong>{ministry.visitors}</strong>
        </article>
        <article>
          <div className="metric-symbol" aria-hidden="true">M</div>
          <span>Members</span>
          <strong>{canManageMembers ? ministry.members : "—"}</strong>
        </article>
        <article>
          <div className="metric-symbol" aria-hidden="true">♡</div>
          <span>Open care needs</span>
          <strong>{ministry.open_care_needs}</strong>
        </article>
        <article>
          <div className="metric-symbol" aria-hidden="true">✓</div>
          <span>Completed visits</span>
          <strong>{ministry.completed_visits}</strong>
        </article>
      </section>

      <header className="page-header" style={{ marginTop: 28 }}>
        <div>
          <h1>Current service</h1>
          <p>Live attendance totals are calculated from active check-ins for the selected service.</p>
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
        <div className="card metric">
          <div><div className="metric-label">Total present</div><div className="metric-value">{attendance.attending}</div></div>
          <div className="metric-icon" aria-hidden="true">✓</div>
        </div>
        <div className="card metric">
          <div><div className="metric-label">First-time visitors</div><div className="metric-value">{attendance.first_time}</div></div>
          <div className="metric-icon" aria-hidden="true">★</div>
        </div>
        <div className="card metric">
          <div><div className="metric-label">Returning visitors</div><div className="metric-value">{attendance.returning}</div></div>
          <div className="metric-icon" aria-hidden="true">↻</div>
        </div>
        <div className="card metric">
          <div><div className="metric-label">Visitor records</div><div className="metric-value">{attendance.visitor_records}</div></div>
          <div className="metric-icon" aria-hidden="true">◎</div>
        </div>
      </section>

      <section className="grid grid-3" style={{ marginTop: 18 }}>
        <Link className="card admin-module" href="/care">
          <h2>Care & visits</h2>
          <p className="muted">Document support needs and record planned, attempted or completed ministry visits.</p>
        </Link>
        {canManageMembers ? (
          <Link className="card admin-module" href="/members">
            <h2>Member directory</h2>
            <p className="muted">Search member records and review whether each person has been visited.</p>
          </Link>
        ) : null}
        {canManageMembers ? (
          <Link className="card admin-module" href="/import">
            <h2>Member import</h2>
            <p className="muted">Preview and import Excel or CSV member information securely.</p>
          </Link>
        ) : null}
        {profile.role === "administrator" ? (
          <Link className="card admin-module" href="/admin/users">
            <h2>Role requests</h2>
            <p className="muted">{ministry.pending_role_requests} staff role request{ministry.pending_role_requests === 1 ? " is" : "s are"} awaiting review.</p>
          </Link>
        ) : null}
      </section>
    </>
  );
}
