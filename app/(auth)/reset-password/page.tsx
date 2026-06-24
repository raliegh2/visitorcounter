import { updatePasswordAction } from "./actions";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata = { title: "Choose new password" };

export default async function ResetPasswordPage({
  searchParams
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="login-panel" style={{ minHeight: "100vh" }}>
      <div className="login-card">
        <div className="eyebrow">Account recovery</div>
        <h1>Choose a new password</h1>
        <p className="muted">Use a unique password with at least 14 characters.</p>
        <Notice message={params.error} kind="error" />
        <form action={updatePasswordAction}>
          <div className="field">
            <label htmlFor="password">New password</label>
            <input id="password" name="password" type="password" minLength={14} maxLength={128} autoComplete="new-password" required />
          </div>
          <div className="field">
            <label htmlFor="confirmation">Confirm new password</label>
            <input id="confirmation" name="confirmation" type="password" minLength={14} maxLength={128} autoComplete="new-password" required />
          </div>
          <div className="field">
            <SubmitButton className="button button-primary button-full" pendingLabel="Updating…">
              Update password
            </SubmitButton>
          </div>
        </form>
      </div>
    </main>
  );
}
