import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, RoleStatus } from "@/types/app";

export const metadata = { title: "Account status" };
export const dynamic = "force-dynamic";

type PendingProfile = {
  active: boolean;
  role: AppRole;
  requested_role: AppRole;
  role_status: RoleStatus;
};

export default async function SignupPendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile: PendingProfile | null = null;
  if (user) {
    const { data } = await supabase
      .from("user_profiles")
      .select("active, role, requested_role, role_status")
      .eq("id", user.id)
      .maybeSingle();
    profile = data as unknown as PendingProfile | null;
  }

  const approved = profile?.active === true && profile.role_status === "approved";
  const rejected = profile?.role_status === "rejected";

  return (
    <main className="center-screen status-screen">
      <section className="status-card">
        <div className="brand auth-brand">
          <div className="brand-mark" aria-hidden="true">✦</div>
          <div>
            <strong>Church Care Hub</strong>
            <span>Account status</span>
          </div>
        </div>

        {approved ? (
          <>
            <div className="status-symbol status-approved" aria-hidden="true">✓</div>
            <h1>Access approved</h1>
            <p>
              Your {profile.requested_role.replace("_", " ")} account is active. Continue to the ministry dashboard.
            </p>
            <Link className="button button-primary button-full" href="/dashboard">Open dashboard</Link>
          </>
        ) : rejected ? (
          <>
            <div className="status-symbol status-rejected" aria-hidden="true">×</div>
            <h1>Request not approved</h1>
            <p>
              The pastor-access request could not be verified. Contact a church administrator to review or update the submitted details.
            </p>
            <Link className="button button-secondary button-full" href="/login">Return to sign in</Link>
          </>
        ) : (
          <>
            <div className="status-symbol" aria-hidden="true">…</div>
            <h1>Pastor verification pending</h1>
            <p>
              Your email is confirmed. A church administrator must verify the church, district and supervisor information before pastor access is enabled.
            </p>
            <div className="notice notice-info">
              No visitor, member or care information is visible while the request is pending. You may safely close this page and return later.
            </div>
            <Link className="button button-secondary button-full" href="/login">Return to sign in</Link>
          </>
        )}
      </section>
    </main>
  );
}
