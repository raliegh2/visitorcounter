import Link from "next/link";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requestStaffAccess } from "@/lib/self-registration";

export const metadata = { title: "Ministry access" };

export default async function SignupPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="auth-layout">
      <section className="auth-panel">
        <div className="auth-card auth-card-wide">
          <div className="brand auth-brand">
            <div className="brand-mark" aria-hidden="true">✦</div>
            <div>
              <strong>Church Care Hub</strong>
              <span>Visitor, member and ministry care</span>
            </div>
          </div>

          <h1>Join your church care team.</h1>
          <p className="muted">
            Request the ministry workspace that matches your responsibilities. Every person uses an individual account.
          </p>
          <Notice message={params.error} kind="error" />

          <form action={requestStaffAccess}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="displayName">Full name</label>
                <input id="displayName" name="displayName" autoComplete="name" minLength={2} maxLength={80} required />
              </div>
              <div className="field">
                <label htmlFor="email">Email address</label>
                <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
              </div>
            </div>

            <fieldset className="role-fieldset">
              <legend>Choose your ministry role</legend>
              <div className="role-grid">
                <label className="role-option">
                  <input type="radio" name="requestedRole" value="usher" defaultChecked />
                  <span className="role-option-copy">
                    <strong>Usher</strong>
                    <small>Visitor registration, service check-in, attendance and assigned-team follow-up.</small>
                  </span>
                </label>
                <label className="role-option">
                  <input type="radio" name="requestedRole" value="pastor" />
                  <span className="role-option-copy">
                    <strong>Pastor</strong>
                    <small>Usher capabilities plus member records, pastoral care, visits and member imports.</small>
                  </span>
                </label>
              </div>
            </fieldset>

            <details className="verification-panel">
              <summary>Pastor verification details</summary>
              <p className="muted small">
                Complete every field below when requesting pastor access. An administrator reviews the request before access is approved.
              </p>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="churchName">Church name</label>
                  <input id="churchName" name="churchName" maxLength={160} />
                </div>
                <div className="field">
                  <label htmlFor="pastorName">Senior pastor or supervisor</label>
                  <input id="pastorName" name="pastorName" maxLength={120} />
                </div>
                <div className="field">
                  <label htmlFor="district">District or region</label>
                  <input id="district" name="district" maxLength={120} />
                </div>
                <div className="field">
                  <label htmlFor="denomination">Denomination</label>
                  <input id="denomination" name="denomination" maxLength={120} />
                </div>
                <div className="field">
                  <label htmlFor="churchPhone">Church phone</label>
                  <input id="churchPhone" name="churchPhone" type="tel" maxLength={40} />
                </div>
              </div>
            </details>

            <div className="notice notice-info">
              Usher accounts are approved after email confirmation. Pastor accounts remain pending until an administrator verifies the ministry details.
            </div>
            <SubmitButton className="button button-primary button-full" pendingLabel="Sending secure link…">
              Send secure email link
            </SubmitButton>
          </form>

          <div className="auth-links">
            <span className="muted">Already registered?</span>
            <Link href="/login">Return to sign in</Link>
          </div>
        </div>
      </section>

      <section className="auth-visual">
        <div>
          <h2>Welcome every person.<br />Track every follow-up.<br />Support every need.</h2>
          <p>Secure ministry care for ushers, pastors and administrators.</p>
        </div>
      </section>
    </main>
  );
}
