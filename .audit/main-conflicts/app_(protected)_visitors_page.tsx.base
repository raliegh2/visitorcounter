import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { chooseService, getAvailableServices } from "@/lib/data";
import { ServicePicker } from "@/components/ServicePicker";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { DuplicateNameField } from "@/components/forms/DuplicateNameField";
import { checkInVisitorAction, registerVisitorAction } from "./actions";
import type { VisitorSearchResult } from "@/types/app";

export const metadata = { title: "Visitors" };
export const dynamic = "force-dynamic";

export default async function VisitorsPage({
  searchParams
}: {
  searchParams: Promise<{ service?: string; q?: string; notice?: string; error?: string }>;
}) {
  await requireProfile(["administrator", "usher"]);
  const params = await searchParams;
  const services = await getAvailableServices();
  const service = chooseService(services, params.service);
  const query = (params.q ?? "").trim();

  let visitors: VisitorSearchResult[] = [];
  if (service && query) {
    const supabase = await createClient();
    const { data } = await supabase.rpc("search_visitors", {
      p_query: query,
      p_service_id: service.id
    });
    visitors = (data ?? []) as VisitorSearchResult[];
  }

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Visitors</h1>
          <p>Search existing records before registering a first-time visitor.</p>
        </div>
        {service ? <ServicePicker services={services} selectedId={service.id} action="/visitors" /> : null}
      </header>

      <Notice message={params.notice} kind="success" />
      <Notice message={params.error} kind="error" />

      {!service ? (
        <div className="notice notice-info">No service is available for visitor check-in.</div>
      ) : (
        <div className="grid grid-2">
          <section className="card">
            <h2>Find a returning visitor</h2>
            <form method="get" action="/visitors" className="toolbar">
              <input type="hidden" name="service" value={service.id} />
              <div className="field grow">
                <label htmlFor="q">Name or preferred name</label>
                <input id="q" name="q" defaultValue={query} minLength={1} maxLength={100} required />
              </div>
              <button className="button button-primary" type="submit">Search</button>
            </form>

            {query && visitors.length === 0 ? (
              <div className="empty">No matching active visitor records were found.</div>
            ) : null}

            <div className="stack">
              {visitors.map((visitor) => (
                <article className="card" key={visitor.id}>
                  <div className="page-header" style={{ marginBottom: 0 }}>
                    <div>
                      <h3>{visitor.full_name}</h3>
                      <p className="muted small">
                        {visitor.preferred_name ? `Preferred: ${visitor.preferred_name} · ` : ""}
                        First visit: {visitor.first_visit_date}
                        {visitor.last_seen_date ? ` · Last seen: ${visitor.last_seen_date}` : ""}
                      </p>
                    </div>
                    {visitor.already_checked_in ? (
                      <span className="badge badge-success">Already checked in</span>
                    ) : (
                      <form action={checkInVisitorAction}>
                        <input type="hidden" name="visitorId" value={visitor.id} />
                        <input type="hidden" name="serviceId" value={service.id} />
                        <SubmitButton
                          className="button button-primary button-small"
                          pendingLabel="Checking in…"
                        >
                          Check in
                        </SubmitButton>
                      </form>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="card">
            <h2>Register first-time visitor</h2>
            <p className="muted small">Names are not unique identifiers. Duplicate names are supported safely.</p>
            <form action={registerVisitorAction}>
              <input type="hidden" name="serviceId" value={service.id} />
              <div className="form-grid">
                <DuplicateNameField serviceId={service.id} />
                <div className="field">
                  <label htmlFor="preferredName">Preferred name</label>
                  <input id="preferredName" name="preferredName" maxLength={60} autoComplete="off" />
                </div>
                <div className="field">
                  <label htmlFor="firstVisitDate">First visit date</label>
                  <input id="firstVisitDate" name="firstVisitDate" type="date" defaultValue={service.service_date} required />
                </div>
                <div className="field">
                  <label htmlFor="optionalContact">Optional phone or email</label>
                  <input id="optionalContact" name="optionalContact" maxLength={120} autoComplete="off" />
                </div>
              </div>
              <label className="checkbox-row">
                <input name="contactConsent" type="checkbox" />
                <span>
                  <strong>Visitor consented to contact storage</strong>
                  <br />
                  <small className="muted">Required only when optional contact information is entered.</small>
                </span>
              </label>
              <div className="notice notice-info">
                Never enter prayer requests, counseling notes, health information, financial data,
                addresses, identification numbers, or information about minors.
              </div>
              <SubmitButton className="button button-primary button-full" pendingLabel="Registering…">
                Register and check in
              </SubmitButton>
            </form>
          </section>
        </div>
      )}
    </>
  );
}
