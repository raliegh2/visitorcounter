import { loginAction } from "@/app/(auth)/login/actions";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; notice?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="login-shell">
      <section className="login-hero">
        <div className="eyebrow" style={{ color: "#bfdbfe" }}>Private staff workspace</div>
        <h1>Welcome visitors with care and confidence.</h1>
        <p>
          Register first-time visitors, check in returning visitors, and manage service attendance
          through a role-restricted system designed around minimum data collection.
        </p>
        <div className="login-points">
          <div className="login-point"><span>✓</span><strong>Individual staff accounts</strong></div>
          <div className="login-point"><span>✓</span><strong>Server and database authorization</strong></div>
          <div className="login-point"><span>✓</span><strong>Auditable attendance corrections</strong></div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="eyebrow">Staff access</div>
          <h2>Sign in</h2>
          <p className="muted">Enter the email address and password assigned to your individual account.</p>
          <Notice message={params.error} kind="error" />
          <Notice message={params.notice} kind="success" />

          <form action={loginAction}>
            <input type="hidden" name="next" value={params.next ?? "/dashboard"} />
            <div className="field">
              <label htmlFor="email">Email address</label>
              <input id="email" name="email" type="email" autoComplete="username" maxLength={254} required />
            </div>
            <div className="field">
              <label htmlFor="password">Password</label>
              <input id="password" name="password" type="password" autoComplete="current-password" minLength={12} maxLength={128} required />
            </div>
            <div className="field">
              <SubmitButton className="button button-primary button-full" pendingLabel="Signing in…">
                Sign in
              </SubmitButton>
            </div>
          </form>

          <hr className="divider" />
          <a href="/forgot-password">Forgot your password?</a>
        </div>
      </section>
    </main>
  );
}
