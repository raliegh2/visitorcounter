import Link from "next/link";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requestStaffAccess } from "@/lib/self-registration";

export const metadata = { title: "Request staff access" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams;
  return (
    <main className="login-shell">
      <section className="login-hero">
        <div className="eyebrow" style={{ color: "#bfdbfe" }}>Role-based ministry access</div>
        <h1>Join the workspace with the responsibilities assigned to you.</h1>
        <p>Choose Usher, Pastor, or Administrator. Usher access begins after email confirmation; Pastor and Administrator requests require approval.</p>
        <div className="login-points">
          <div className="login-point"><span>1</span><strong>Select your ministry role</strong></div>
          <div className="login-point"><span>2</span><strong>Confirm your email securely</strong></div>
          <div className="login-point"><span>3</span><strong>Open the sections assigned to that role</strong></div>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-card role-signup-card">
          <div className="eyebrow">Staff access</div>
          <h2>Create account or request access</h2>
          <Notice message={params.error} kind="error" />
          <form action={requestStaffAccess}>
            <div className="form-grid">
              <div className="field"><label htmlFor="displayName">Full name</label><input id="displayName" name="displayName" minLength={2} maxLength={80} required /></div>
              <div className="field"><label htmlFor="email">Email address</label><input id="email" name="email" type="email" maxLength={254} required /></div>
            </div>
            <fieldset className="role-picker">
              <legend>Select your role</legend>
              <label className="role-option"><input type="radio" name="requestedRole" value="usher" defaultChecked /><span><strong>Usher</strong><small>Visitor registration, check-in, visitor care notes, and visit tracking.</small></span></label>
              <label className="role-option"><input type="radio" name="requestedRole" value="pastor" /><span><strong>Pastor</strong><small>Visitor and member records, member imports, care notes, and ministry visits.</small></span></label>
              <label className="role-option"><input type="radio" name="requestedRole" value="administrator" /><span><strong>Administrator</strong><small>All ministry sections plus users, approvals, reports, audit, and settings.</small></span></label>
            </fieldset>
            <details className="pastor-details">
              <summary>Pastor verification details</summary>
              <p className="muted small">Complete these fields when requesting Pastor access.</p>
              <div className="form-grid">
                <div className="field"><label htmlFor="churchName">Church name</label><input id="churchName" name="churchName" maxLength={160} /></div>
                <div className="field"><label htmlFor="pastorName">Pastor name</label><input id="pastorName" name="pastorName" maxLength={120} /></div>
                <div className="field"><label htmlFor="district">District or region</label><input id="district" name="district" maxLength={160} /></div>
                <div className="field"><label htmlFor="denomination">Denomination</label><input id="denomination" name="denomination" maxLength={160} /></div>
                <div className="field"><label htmlFor="churchPhone">Church phone</label><input id="churchPhone" name="churchPhone" maxLength={40} /></div>
              </div>
            </details>
            <SubmitButton className="button button-primary button-full" pendingLabel="Sending secure link…">Send secure email link</SubmitButton>
          </form>
          <hr className="divider" />
          <Link className="button button-secondary button-full" href="/login">Return to sign in</Link>
        </div>
      </section>
    </main>
  );
}
