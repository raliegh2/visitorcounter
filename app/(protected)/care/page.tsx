import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/supabase/rpc";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { addCareNoteAction, recordVisitAction } from "./actions";
import type { CareNote, CarePerson, CarePersonType, MinistryVisit } from "@/types/app";

export const metadata = { title: "Care notes and ministry visits" };
export const dynamic = "force-dynamic";

export default async function CarePage({ searchParams }: { searchParams: Promise<{ q?: string; type?: string; person?: string; notice?: string; error?: string }> }) {
  const profile = await requireProfile(["administrator", "pastor", "usher"]);
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const personType = params.type === "member" ? "member" : "visitor" as CarePersonType;
  const personId = params.person ?? "";
  const supabase = await createClient();
  const { data: peopleData } = await callRpc<CarePerson[]>(supabase, "search_care_people", { p_query: query, p_include_members: profile.role !== "usher" });
  const people = peopleData ?? [];
  let selected: CarePerson | undefined = people.find((person) => person.id === personId && person.person_type === personType);
  if (personId && !selected) {
    const { data } = await callRpc<CarePerson[]>(supabase, "search_care_people", { p_query: personId, p_include_members: profile.role !== "usher" });
    selected = data?.find((person) => person.id === personId && person.person_type === personType);
  }
  let notes: CareNote[] = []; let visits: MinistryVisit[] = [];
  if (selected) {
    const [noteResult, visitResult] = await Promise.all([
      callRpc<CareNote[]>(supabase, "care_notes_for_person", { p_person_type: selected.person_type, p_person_id: selected.id }),
      callRpc<MinistryVisit[]>(supabase, "visits_for_person", { p_person_type: selected.person_type, p_person_id: selected.id })
    ]);
    notes = noteResult.data ?? []; visits = visitResult.data ?? [];
  }
  return (
    <>
      <header className="page-header"><div><h1>Care notes and ministry visits</h1><p>Record the support a visitor or member needs and identify whether ministry follow-up has occurred.</p></div>{profile.role !== "usher" ? <Link className="button button-secondary" href="/members">Member database</Link> : null}</header>
      <Notice message={params.notice} kind="success" /><Notice message={params.error} kind="error" />
      <div className="care-layout">
        <section className="card care-directory">
          <h2>Find a person</h2>
          <form method="get" action="/care" className="toolbar"><div className="field grow"><label htmlFor="q">Name</label><input id="q" name="q" defaultValue={query} maxLength={120} /></div><button className="button button-primary" type="submit">Search</button></form>
          <div className="stack">{people.map((person) => <Link className={`person-result ${selected?.id === person.id ? "person-result-active" : ""}`} key={`${person.person_type}-${person.id}`} href={`/care?q=${encodeURIComponent(query)}&type=${person.person_type}&person=${person.id}`}><span><strong>{person.display_name}</strong><small>{person.person_type} · {person.secondary_text ?? "No additional details"}</small></span><span className={`badge ${person.visit_count > 0 ? "badge-success" : "badge-warning"}`}>{person.visit_count > 0 ? `Visited ${person.visit_count}` : "Not visited"}</span></Link>)}</div>
        </section>
        <section className="stack">
          {!selected ? <div className="card empty">Select a visitor or member to view notes and visits.</div> : <>
            <div className="card"><div className="page-header" style={{ marginBottom: 0 }}><div><div className="eyebrow">{selected.person_type}</div><h2>{selected.display_name}</h2><p className="muted">{selected.contact_text ?? selected.secondary_text ?? "No contact details recorded"}</p></div><span className={`badge ${selected.visit_count > 0 ? "badge-success" : "badge-warning"}`}>{selected.visit_count > 0 ? `Visited ${selected.visit_count} time${selected.visit_count === 1 ? "" : "s"}` : "Visit needed"}</span></div></div>
            <div className="grid grid-2">
              <section className="card"><h2>Add support note</h2><form action={addCareNoteAction}><input type="hidden" name="personType" value={selected.person_type} /><input type="hidden" name="personId" value={selected.id} /><div className="field"><label htmlFor="noteText">Support needed or follow-up note</label><textarea id="noteText" name="noteText" rows={5} minLength={2} maxLength={5000} required /></div>{profile.role !== "usher" ? <div className="field"><label htmlFor="visibility">Visibility</label><select id="visibility" name="visibility" defaultValue="pastoral_team"><option value="assigned_team">Assigned ministry team</option><option value="pastoral_team">Pastoral team</option>{profile.role === "administrator" ? <option value="admin_only">Administrators only</option> : null}</select></div> : <input type="hidden" name="visibility" value="assigned_team" />}<div className="notice notice-info">Record only information needed to coordinate support. Avoid highly sensitive medical, financial, or counseling details.</div><SubmitButton className="button button-primary button-full" pendingLabel="Saving…">Save support note</SubmitButton></form></section>
              <section className="card"><h2>Record visit activity</h2><form action={recordVisitAction}><input type="hidden" name="personType" value={selected.person_type} /><input type="hidden" name="personId" value={selected.id} /><div className="field"><label htmlFor="outcome">Visit status</label><select id="outcome" name="outcome" defaultValue="completed"><option value="planned">Planned</option><option value="attempted">Attempted</option><option value="completed">Completed</option><option value="follow_up_needed">Follow-up needed</option></select></div><div className="field"><label htmlFor="summary">Visit summary</label><textarea id="summary" name="summary" rows={5} maxLength={2000} /></div><SubmitButton className="button button-primary button-full" pendingLabel="Saving…">Record visit</SubmitButton></form></section>
            </div>
            <div className="grid grid-2"><section className="card"><h2>Support notes</h2>{notes.length === 0 ? <div className="empty">No support notes yet.</div> : <div className="timeline">{notes.map((note) => <article key={note.id}><div className="actions"><span className="badge badge-neutral">{note.status.replace("_", " ")}</span><span className="badge badge-neutral">{note.visibility.replace("_", " ")}</span></div><p>{note.note_text}</p><small className="muted">{note.created_by_name} · {new Date(note.created_at).toLocaleString()}</small></article>)}</div>}</section><section className="card"><h2>Visit history</h2>{visits.length === 0 ? <div className="empty">No visit activity recorded.</div> : <div className="timeline">{visits.map((visit) => <article key={visit.id}><span className={`badge ${visit.outcome === "completed" ? "badge-success" : "badge-warning"}`}>{visit.outcome.replaceAll("_", " ")}</span>{visit.summary ? <p>{visit.summary}</p> : null}<small className="muted">{visit.visited_by_name} · {new Date(visit.visited_at).toLocaleString()}</small></article>)}</div>}</section></div>
          </>}
        </section>
      </div>
    </>
  );
}
