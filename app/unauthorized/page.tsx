import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="main-content">
      <div className="card">
        <h1>Access denied</h1>
        <p className="muted">Your account does not have permission to access this function.</p>
        <Link className="button button-primary" href="/dashboard">Return to dashboard</Link>
      </div>
    </main>
  );
}
