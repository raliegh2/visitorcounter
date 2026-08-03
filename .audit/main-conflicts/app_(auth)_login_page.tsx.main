import Link from "next/link";
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
        <div className="eyebrow" style={{ color: "#ded9fb" }}>Private ministry workspace</div>
        <h1>Welcome people well. Keep every care step visible.</h1>
        <p>
          Manage visitor welcome, attendance, member care, support notes, ministry visits, reporting,
          and role-based oversight through one protected workspace.
        </p>
        <div className="login-points">
          <div className="login-point"><span>✓</span><strong>Clear responsibilities for every role</strong></div>
          <div className="login-point"><span>✓</span><strong>Visitor and member care in one place</strong></div>
          <div className="login-point"><span>✓</span><strong>Organization-scoped access and audit history</strong></div>
        </div>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="brand auth-brand">
            <div className="brand-mark" aria-hidden="true">✦</div>
            <div><strong>Church Care Hub</strong><span>Ministry workspace</span></div>
          </div>
          <h2>Sign in</h2>
          <p className="muted">Use your assigned password or request secure email access.</p>
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
              <input id="password" name="password" type="password" autoComplete="current-password" maxLength={128} required />
            </div>
            <div className="field">
              <SubmitButton className="button button-primary button-full" pendingLabel="Signing in…">
                Sign in
              </SubmitButton>
            </div>
          </form>

          <hr className="divider" />
          <div className="auth-links">
            <Link href="/forgot-password">Forgot password?</Link>
            <Link href="/signup">Create account</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
