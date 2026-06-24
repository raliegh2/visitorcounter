import { requireProfile } from "@/lib/auth";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { reauthenticateAction } from "./actions";

export const metadata = { title: "Confirm administrator identity" };

export default async function ReauthPage({
  searchParams
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  await requireProfile(["administrator"]);
  const params = await searchParams;
  const next = params.next?.startsWith("/") && !params.next.startsWith("//")
    ? params.next
    : "/dashboard";

  return (
    <main className="login-panel" style={{ minHeight: "100vh" }}>
      <div className="login-card">
        <div className="eyebrow">Sensitive administrator action</div>
        <h1>Confirm your identity</h1>
        <p className="muted">
          Re-enter your password and complete multi-factor authentication. Authorization remains
          valid for five minutes.
        </p>
        <Notice message={params.error} kind="error" />
        <form action={reauthenticateAction}>
          <input type="hidden" name="next" value={next} />
          <div className="field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="field">
            <SubmitButton className="button button-primary button-full" pendingLabel="Confirming…">
              Continue
            </SubmitButton>
          </div>
        </form>
      </div>
    </main>
  );
}
