import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/supabase/rpc";
import { chooseService, getAvailableServices } from "@/lib/data";
import { ServicePicker } from "@/components/ServicePicker";
import type { MinistryMetrics } from "@/types/app";

type AttendanceMetrics = { attending: number; first_time: number; returning: number; visitor_records: number };
export const metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ service?: string }> }) {
  const profile = await requireProfile();
  const params = await searchParams;
  const services = await getAvailableServices();
  const service = chooseService(services, params.service);
  const supabase = await createClient();
  let attendance: AttendanceMetrics = { attending: 0, first_time: 0, returning: 0, visitor_records: 0 };
  if (service) { const { data } = await supabase.rpc("dashboard_metrics", { p_service_id: service.id }); if (data?.[0]) attendance = data[0] as AttendanceMetrics; }
  const { data: ministryData } = await callRpc<MinistryMetrics[]>(supabase, "ministry_dashboard_metrics");
  const ministry = ministryData?.[0] ?? { visitors: attendance.visitor_records, members: 0, open_care_needs: 0, completed_visits: 0, pending_role_requests: 0 };
  const responsibility = profile.role === "usher" ? "Manage visitors, attendance, visitor support notes, and visitor follow-up." : profile.role === "pastor" ? "Manage visitor and member care, member imports, notes, and ministry visits." : profile.role === "administrator" ? "Access every ministry section and oversee users, approvals, security, reporting, and retention." : "Review approved aggregate dashboards and reports.";
  return <><header className="page-header"><div><div className="eyebrow">{profile.role} workspace</div><h1>Welcome, {profile.display_name}</h1><p>{responsibility}</p></div>{service ? <ServicePicker services={services} selectedId={service.id} action="/dashboard" /> : null}</header>
  {service && profile.role !== "auditor" ? <section className="service-banner"><div><div className="eyebrow">Selected service</div><h2>{service.service_name}</h2><p className="muted">{service.service_date} · {service.start_time}</p></div><div className="actions"><Link className="button button-primary" href={`/visitors?service=${service.id}`}>Register or find visitor</Link><Link className="button button-secondary" href={`/attendance?service=${service.id}`}>Attendance</Link></div></section> : null}
  <section className="grid grid-4"><div className="card metric"><div><div className="metric-label">People present</div><div className="metric-value">{attendance.attending}</div></div><div className="metric-icon">✓</div></div><div className="card metric"><div><div className="metric-label">Active visitors</div><div className="metric-value">{ministry.visitors}</div></div><div className="metric-icon">◎</div></div>{profile.role === "pastor" || profile.role === "administrator" ? <div className="card metric"><div><div className="metric-label">Members</div><div className="metric-value">{ministry.members}</div></div><div className="metric-icon">M</div></div> : <div className="card metric"><div><div className="metric-label">First-time visitors</div><div className="metric-value">{attendance.first_time}</div></div><div className="metric-icon">★</div></div>}<div className="card metric"><div><div className="metric-label">Open care needs</div><div className="metric-value">{ministry.open_care_needs}</div></div><div className="metric-icon">♥</div></div></section>
  <section className="grid grid-3" style={{ marginTop: 18 }}><Link className="card admin-module" href="/care"><h2>Care & visits</h2><p className="muted">{ministry.completed_visits} completed ministry visits are recorded.</p></Link>{profile.role === "pastor" || profile.role === "administrator" ? <><Link className="card admin-module" href="/members"><h2>Member database</h2><p className="muted">Search members and see whether they have been visited.</p></Link><Link className="card admin-module" href="/import"><h2>Import members</h2><p className="muted">Upload Excel or CSV member information.</p></Link></> : null}{profile.role === "administrator" ? <Link className="card admin-module" href="/admin"><h2>Administrator center</h2><p className="muted">{ministry.pending_role_requests} role requests are awaiting review.</p></Link> : null}</section></>;
}
