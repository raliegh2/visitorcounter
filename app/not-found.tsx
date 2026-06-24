import Link from "next/link";

export default function NotFound() {
  return (
    <main className="main-content">
      <div className="card">
        <h1>Page not found</h1>
        <p className="muted">The requested page is unavailable.</p>
        <Link className="button button-primary" href="/dashboard">Return to dashboard</Link>
      </div>
    </main>
  );
}
