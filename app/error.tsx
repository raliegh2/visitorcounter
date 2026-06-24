"use client";

export default function ErrorPage({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="main-content">
      <div className="card">
        <h1>Something went wrong</h1>
        <p className="muted">The request could not be completed. No sensitive technical details are displayed.</p>
        <button className="button button-primary" onClick={reset}>Try again</button>
      </div>
    </main>
  );
}
