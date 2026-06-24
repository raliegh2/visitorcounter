import Link from "next/link";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requestStaffAccess } from "@/lib/self-registration";

export const metadata = { title: "Request staff access" };

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="login-shell">
      <section className="login-hero">
        <div className="eyebrow" style={{ color: "#bfdbfe" }}>Staff account request</div>
        <h1>Create an account or request a secure sign-in link.</h1>
        <p>
          Submit your name and email address, then use the secure link sent by Supabase.
          New accounts remain inactive until a church administrator approves access.
        </p>
        <div className="login-points">
          <div className="login-point"><span>1</span><strong>Request your secure email link</strong></div>
          <div className="login-point"><span>2</span><strong>Confirm the account through email</strong></div>
          <div className="login-point"><span>3</span><strong>Wait for administrator approval</strong></div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="eyebrow">Secure email access</div>
          <h2>Request access or sign in</h2>
          <p className="muted">Use your own email address. Shared accounts are not permitted.</p>
          <Notice message={params.error} kind="error" />

          <form action={requestStaffAccess}>
            <div className="field">
              <label htmlFor="displayName">Full name</label>
              <input id="displayName" name="displayName" autoComplete="name" minLength={2} maxLength={80} required />
            </div>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
            </div>
            <div className="field">
              <SubmitButton className="button button-primary button-full" pendingLabel="Sending secure link…">
                Send secure email link
              </SubmitButton>
            </div>
          </form>

          <hr className="divider" />
          <p className="muted">Prefer password sign-in?</p>
          <Link className="button button-secondary button-full" href="/login">Return to sign in</Link>
        </div>
      </section>
    </main>
  );
}
