import { Suspense } from "react";
import { MfaClient } from "./MfaClient";

export const metadata = { title: "Multi-factor authentication" };
export const dynamic = "force-dynamic";

export default function MfaPage() {
  return (
    <main className="login-panel" style={{ minHeight: "100vh" }}>
      <Suspense fallback={<div className="login-card">Loading authentication challenge…</div>}>
        <MfaClient />
      </Suspense>
    </main>
  );
}
