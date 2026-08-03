import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/supabase/rpc";
import type { AppRole } from "@/types/app";

type MinistryMetrics = {
  visitor_records: number;
  member_records: number;
  open_care_needs: number;
  completed_visits: number;
};

export async function MinistryOverview({
  role,
  serviceId
}: {
  role: AppRole;
  serviceId: string | undefined;
}) {
  const supabase = await createClient();
  const { data } = await callRpc<MinistryMetrics[]>(supabase, "ministry_dashboard_metrics");
  const metrics = data?.[0] ?? {
    visitor_records: 0,
    member_records: 0,
    open_care_needs: 0,
    completed_visits: 0
  };

  const canCareForMembers = role === "administrator" || role === "pastor";
  const canCheckIn = role !== "auditor";

  return (
    <>
      <section className="ministry-hero">
        <h2>One place to welcome, care and follow up.</h2>
        <p>
          See the responsibilities assigned to your role, keep every ministry next step visible and
          protect sensitive information through database-enforced permissions.
        </p>
        <div className="actions">
          {canCheckIn && serviceId ? (
            <Link className="button button-primary" href={`/visitors?service=${serviceId}`}>
              Register or find visitor
            </Link>
          ) : null}
          {canCheckIn ? (
            <Link className="button button-secondary" href="/care">
              Open care workspace
            </Link>
          ) : null}
          {canCareForMembers ? (
            <Link className="button button-secondary" href="/members">
              View members
            </Link>
          ) : null}
        </div>
      </section>

      <section className="metric-grid" aria-label="Ministry overview">
        <article>
          <div className="metric-symbol" aria-hidden="true">V</div>
          <span>Visitors</span>
          <strong>{metrics.visitor_records}</strong>
        </article>
        <article>
          <div className="metric-symbol" aria-hidden="true">M</div>
          <span>Members</span>
          <strong>{metrics.member_records}</strong>
        </article>
        <article>
          <div className="metric-symbol" aria-hidden="true">♡</div>
          <span>Open care needs</span>
          <strong>{metrics.open_care_needs}</strong>
        </article>
        <article>
          <div className="metric-symbol" aria-hidden="true">✓</div>
          <span>Completed visits</span>
          <strong>{metrics.completed_visits}</strong>
        </article>
      </section>
    </>
  );
}
