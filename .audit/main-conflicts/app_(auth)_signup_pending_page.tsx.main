import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { RoleStatus } from "@/types/app";

type PendingProfile = {
  active: boolean;
  requested_role: "administrator" | "usher" | "pastor";
  role_status: RoleStatus;
};

export const metadata = { title: "Role request status" };
export const dynamic = "force-dynamic";

export default async function SignupPendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let profile: PendingProfile | null = null;

  if (user) {
    const { data } = await supabase
      .from("user_profiles")
      .select("active, requested_role, role_status")
      .eq("id", user.id)
      .maybeSingle();
    profile = data as unknown as PendingProfile | null;
  }

  const approved = profile?.active === true && profile.role_status === "approved";
  const requestedRole = profile?.requested_role ?? "staff";
  const roleStatus = profile?.role_status ?? "pending";

  return (
    <main className="login-panel" style={{ minHeight: "100vh" }}>
      <section className="login-card">
        <div className="eyebrow">Account status</div>
        {approved ? (
          <>
            <h1>Access approved</h1>
            <p>Your {requestedRole} access is ready.</p>
            <Link className="button button-primary button-full" href="/dashboard">Open dashboard</Link>
          </>
        ) : roleStatus === "rejected" ? (
          <>
            <h1>Role request not approved</h1>
            <p>Your requested role was not approved. Contact a church administrator for help.</p>
            <Link className="button button-secondary button-full" href="/login">Return to sign in</Link>
          </>
        ) : (
          <>
            <h1>Waiting for approval</h1>
            <p>Your email is confirmed. A church administrator must approve your {requestedRole} role before protected ministry information is available.</p>
            <div className="notice notice-info">You may close this page and return after an administrator reviews the request.</div>
            <Link className="button button-secondary button-full" href="/login">Return to sign in</Link>
          </>
        )}
      </section>
    </main>
  );
}
