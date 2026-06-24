import Link from "next/link";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { signupAction } from "./actions";

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
        <h1>Create your individual church staff account.</h1>
        <p>
          New accounts are verified by email and remain inactive until a church administrator
          approves access. New users cannot select or grant themselves privileged roles.
        </p>
        <div className="login-points">
          <div className="login-point"><span>1</span><strong>Create and confirm your account</strong></div>
          <div className="login-point"><span>2</span><strong>Wait for administrator approval</strong></div>
          <div className="login-point"><span>3</span><strong>Sign in after activation</strong></div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="eyebrow">Request access</div>
          <h2>Create account</h2>
          <p className="muted">Use your own email address. Shared accounts are not permitted.</p>
          <Notice message={params.error} kind="error" />

          <form action={signupAction}>
            <div className="field">
              <label htmlFor="displayName">Full name</label>
              <input id="displayName" name="displayName" autoComplete="name" minLength={2} maxLength={80} required />
            </div>
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
              <small className="muted">Use at least 12 characters.</small>
            </div>
            <div className="field">
              <label htmlFor="confirmPassword">Confirm password</label>
              <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required />
            </div>
            <div className="field">
              <SubmitButton className="button button-primary button-full" pendingLabel="Creating account…">
                Create account
              </SubmitButton>
            </div>
          </form>

          <hr className="divider" />
          <p className="muted">Already registered?</p>
          <Link className="button button-secondary button-full" href="/login">Return to sign in</Link>
        </div>
      </section>
    </main>
  );
}
