import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Approval pending" };
export const dynamic = "force-dynamic";

export default async function SignupPendingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let active = false;
  if (user) {
    const { data } = await supabase
      .from("user_profiles")
      .select("active")
      .eq("id", user.id)
      .maybeSingle();
    active = Boolean(data?.active);
  }

  return (
    <main className="login-panel" style={{ minHeight: "100vh" }}>
      <section className="login-card">
        <div className="eyebrow">Account status</div>
        {active ? (
          <>
            <h1>Access approved</h1>
            <p>Your account is active. Continue to the staff dashboard.</p>
            <Link className="button button-primary button-full" href="/dashboard">Open dashboard</Link>
          </>
        ) : (
          <>
            <h1>Waiting for approval</h1>
            <p>
              Your email has been confirmed, but a church administrator must activate your staff
              profile before you can view visitor or attendance information.
            </p>
            <div className="notice notice-info">
              You may safely close this page. Return after an administrator confirms your account.
            </div>
            <Link className="button button-secondary button-full" href="/login">Return to sign in</Link>
          </>
        )}
      </section>
    </main>
  );
}
