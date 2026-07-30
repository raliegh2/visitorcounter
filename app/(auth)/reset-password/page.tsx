import { updatePasswordAction } from "./actions";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata = { title: "Choose new password" };

const passwordPattern = "(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{14,128}";

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
        <p className="muted" id="password-requirements">
          Use at least 14 characters with uppercase and lowercase letters, a number, and a special character.
        </p>
        <Notice message={params.error} kind="error" />
        <form action={updatePasswordAction}>
          <div className="field">
            <label htmlFor="password">New password</label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={14}
              maxLength={128}
              pattern={passwordPattern}
              title="Use at least 14 characters with uppercase and lowercase letters, a number, and a special character."
              aria-describedby="password-requirements"
              autoComplete="new-password"
              required
            />
          </div>
          <div className="field">
            <label htmlFor="confirmation">Confirm new password</label>
            <input
              id="confirmation"
              name="confirmation"
              type="password"
              minLength={14}
              maxLength={128}
              pattern={passwordPattern}
              title="Use at least 14 characters with uppercase and lowercase letters, a number, and a special character."
              aria-describedby="password-requirements"
              autoComplete="new-password"
              required
            />
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
