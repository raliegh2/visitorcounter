import { loginAction } from "@/app/(auth)/login/actions";
import { Notice } from "@/components/ui/Notice";
import Link from "next/link";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string; notice?: string; next?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <div className="auth-card">
          <div className="brand auth-brand">
            <div className="brand-mark" aria-hidden="true">✦</div>
            <div>
              <strong>Church Care Hub</strong>
              <span>Visitor, member and ministry care</span>
            </div>
          </div>

          <h1>Welcome back.</h1>
          <p className="muted">Sign in to your secure, role-based ministry workspace.</p>
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

          <div className="auth-links">
            <Link href="/forgot-password">Forgot your password?</Link>
            <Link href="/signup">Create ministry account</Link>
          </div>
        </div>
      </section>

      <section className="auth-visual">
        <div>
          <h2>Welcome every person.<br />Track every follow-up.<br />Support every need.</h2>
          <p>
            Register visitors, manage attendance, care for members and keep ministry next steps visible.
          </p>
          <div className="auth-proof">
            <span>Individual staff accounts</span>
            <span>Database-enforced permissions</span>
            <span>Auditable care and attendance actions</span>
          </div>
        </div>
      </section>
    </main>
  );
}
