import { requestPasswordResetAction } from "./actions";
import { SubmitButton } from "@/components/ui/SubmitButton";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <main className="login-panel" style={{ minHeight: "100vh" }}>
      <div className="login-card">
        <div className="eyebrow">Account recovery</div>
        <h1>Reset your password</h1>
        <p className="muted">
          Enter your staff email address. The response will be the same whether or not an account exists.
        </p>
        <form action={requestPasswordResetAction}>
          <div className="field">
            <label htmlFor="email">Email address</label>
            <input id="email" name="email" type="email" autoComplete="email" required maxLength={254} />
          </div>
          <div className="field">
            <SubmitButton className="button button-primary button-full" pendingLabel="Submitting…">
              Send reset instructions
            </SubmitButton>
          </div>
        </form>
      </div>
    </main>
  );
}
