import Link from "next/link";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireProfile } from "@/lib/auth";
import { callRpc } from "@/lib/supabase/rpc";
import { createClient } from "@/lib/supabase/server";
import type { CareNoteRow, CarePerson, PersonType, VisitRecordRow } from "@/types/app";
import { addCareNoteAction, recordVisitAction } from "./actions";

export const metadata = { title: "Care and follow-up" };
export const dynamic = "force-dynamic";

export default async function CarePage({
  searchParams
}: {
  searchParams: Promise<{
    q?: string;
    type?: PersonType;
    person?: string;
    notice?: string;
    error?: string;
  }>;
}) {
  const [profile, params] = await Promise.all([
    requireProfile(["administrator", "usher", "pastor"]),
    searchParams
  ]);
  const query = (params.q ?? "").trim();
  const supabase = await createClient();
  const peopleResult = await callRpc<CarePerson[]>(supabase, "search_care_people", { p_query: query });
  const people = peopleResult.data ?? [];
  const selected = people.find((person) => person.person_type === params.type && person.person_id === params.person) ?? null;

  let notes: CareNoteRow[] = [];
  let visits: VisitRecordRow[] = [];
  if (selected) {
    const [noteResult, visitResult] = await Promise.all([
      callRpc<CareNoteRow[]>(supabase, "care_notes_for_person", {
        p_person_type: selected.person_type,
        p_person_id: selected.person_id
      }),
      callRpc<VisitRecordRow[]>(supabase, "visits_for_person", {
        p_person_type: selected.person_type,
        p_person_id: selected.person_id
      })
    ]);
    notes = noteResult.data ?? [];
    visits = visitResult.data ?? [];
  }

  const errorMessage = params.error ?? (peopleResult.error ? "The care directory could not be loaded." : undefined);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Care and follow-up</h1>
          <p>Document appropriate support needs, prayer follow-up and completed ministry visits.</p>
        </div>
      </header>
      <Notice message={params.notice} kind="success" />
      <Notice message={errorMessage} kind="error" />

      <section className="care-layout">
        <article className="card">
          <div className="section-heading">
            <div>
              <h2>People</h2>
              <p className="small">
                {profile.role === "usher" ? "Visitor care assigned to the usher team." : "Visitors and members available to your role."}
              </p>
            </div>
            <span className="badge badge-neutral">{people.length}</span>
          </div>

          <form method="get" action="/care" className="toolbar">
            <div className="field grow">
              <label htmlFor="q">Search people</label>
              <input id="q" name="q" defaultValue={query} maxLength={100} placeholder="Name, phone or email" />
            </div>
            <button className="button button-secondary" type="submit">Search</button>
          </form>

          {people.length === 0 ? (
            <div className="empty">No matching people were found.</div>
          ) : (
            <div className="rows">
              {people.map((person) => {
                const target = new URLSearchParams({ type: person.person_type, person: person.person_id });
                if (query) target.set("q", query);
                const active = selected?.person_id === person.person_id && selected.person_type === person.person_type;
                return (
                  <Link
                    key={`${person.person_type}:${person.person_id}`}
                    href={`/care?${target.toString()}`}
                    className={`care-person-row ${active ? "selected" : ""}`}
                  >
                    <span>
                      <strong>{person.display_name}</strong>
                      <small>{person.subtitle}{person.contact ? ` · ${person.contact}` : ""}</small>
                    </span>
                    <span aria-hidden="true">›</span>
                  </Link>
                );
              })}
            </div>
          )}
        </article>

        <article className="card">
          {!selected ? (
            <div className="empty">Select a person to review care notes and completed visits.</div>
          ) : (
            <>
              <div className="section-heading">
                <div>
                  <h2>{selected.display_name}</h2>
                  <p>{selected.subtitle}</p>
                </div>
                <span className={`badge ${selected.person_type === "member" ? "badge-warning" : "badge-success"}`}>
                  {selected.person_type}
                </span>
              </div>

              <div className="detail-tabs">
                <form action={addCareNoteAction} className="panel">
                  <h3>Add care note</h3>
                  <input type="hidden" name="personType" value={selected.person_type} />
                  <input type="hidden" name="personId" value={selected.person_id} />
                  <div className="field">
                    <label htmlFor="noteText">Support need or next action</label>
                    <textarea id="noteText" name="noteText" maxLength={2000} required />
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor="noteType">Note type</label>
                      <select id="noteType" name="noteType" defaultValue="care">
                        <option value="care">Care</option>
                        <option value="prayer">Prayer follow-up</option>
                        <option value="follow_up">Follow-up</option>
                        <option value="visit">Visit note</option>
                      </select>
                    </div>
                    <div className="field">
                      <label htmlFor="visibility">Visibility</label>
                      {profile.role === "usher" ? (
                        <>
                          <input type="hidden" name="visibility" value="assigned_team" />
                          <input value="Assigned usher team" disabled />
                        </>
                      ) : (
                        <select id="visibility" name="visibility" defaultValue="pastoral_team">
                          <option value="assigned_team">Assigned team</option>
                          <option value="pastoral_team">Pastoral team</option>
                          <option value="administrator">Administrators only</option>
                        </select>
                      )}
                    </div>
                  </div>
                  <div className="field">
                    <SubmitButton className="button button-primary button-full" pendingLabel="Saving note…">Save note</SubmitButton>
                  </div>
                </form>

                <form action={recordVisitAction} className="panel">
                  <h3>Record completed visit</h3>
                  <input type="hidden" name="personType" value={selected.person_type} />
                  <input type="hidden" name="personId" value={selected.person_id} />
                  <div className="field">
                    <label htmlFor="outcome">Visit outcome</label>
                    <textarea id="outcome" name="outcome" maxLength={120} defaultValue="Completed ministry visit" required />
                  </div>
                  <div className="notice notice-info small">
                    Record a concise operational outcome. Do not include unnecessary medical, financial or counseling details.
                  </div>
                  <SubmitButton className="button button-secondary button-full" pendingLabel="Recording visit…">Mark visit completed</SubmitButton>
                </form>
              </div>

              <section style={{ marginTop: 22 }}>
                <h3>Care history</h3>
                {notes.length === 0 ? <div className="empty">No care notes recorded.</div> : (
                  <div className="care-timeline">
                    {notes.map((note) => (
                      <article className="care-entry" key={note.id}>
                        <div className="care-entry-meta">
                          <span className="badge badge-neutral">{note.note_type.replace("_", " ")}</span>
                          <span className={`badge ${note.status === "open" ? "badge-warning" : "badge-success"}`}>{note.status}</span>
                          <span>{note.visibility.replace("_", " ")}</span>
                        </div>
                        <p>{note.note_text}</p>
                        <small className="muted">{new Date(note.created_at).toLocaleString()} · {note.created_by_name}</small>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section style={{ marginTop: 22 }}>
                <h3>Completed visits</h3>
                {visits.length === 0 ? <div className="empty">No visits recorded.</div> : (
                  <div className="care-timeline">
                    {visits.map((visit) => (
                      <article className="care-entry" key={visit.id}>
                        <p>{visit.outcome}</p>
                        <small className="muted">{new Date(visit.visited_at).toLocaleString()} · {visit.visited_by_name}</small>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </article>
      </section>
    </>
  );
}
