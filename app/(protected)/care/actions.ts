"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { stringField } from "@/lib/form-data";
import { careNoteSchema, ministryVisitSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/supabase/rpc";

const destination = (type: string, person: string, message: string, error = false) => `/care?type=${encodeURIComponent(type)}&person=${encodeURIComponent(person)}&${error ? "error" : "notice"}=${encodeURIComponent(message)}`;

export async function addCareNoteAction(formData: FormData) {
  const profile = await requireProfile(["administrator", "pastor", "usher"]);
  const parsed = careNoteSchema.safeParse({ personType: stringField(formData, "personType"), personId: stringField(formData, "personId"), noteText: stringField(formData, "noteText"), visibility: profile.role === "usher" ? "assigned_team" : stringField(formData, "visibility") || "pastoral_team" });
  if (!parsed.success) redirect(destination(stringField(formData, "personType"), stringField(formData, "personId"), parsed.error.issues[0]?.message ?? "The note is invalid.", true));
  if (profile.role === "usher" && parsed.data.personType !== "visitor") redirect(destination(parsed.data.personType, parsed.data.personId, "Ushers may add notes only to visitor records.", true));
  const supabase = await createClient();
  const { error } = await callRpc<string>(supabase, "add_person_care_note", { p_person_type: parsed.data.personType, p_person_id: parsed.data.personId, p_note_text: parsed.data.noteText, p_visibility: parsed.data.visibility });
  if (error) redirect(destination(parsed.data.personType, parsed.data.personId, "The support note could not be saved.", true));
  revalidatePath("/care"); revalidatePath("/dashboard");
  redirect(destination(parsed.data.personType, parsed.data.personId, "Support note saved."));
}

export async function recordVisitAction(formData: FormData) {
  const profile = await requireProfile(["administrator", "pastor", "usher"]);
  const parsed = ministryVisitSchema.safeParse({ personType: stringField(formData, "personType"), personId: stringField(formData, "personId"), outcome: stringField(formData, "outcome"), summary: stringField(formData, "summary") });
  if (!parsed.success) redirect(destination(stringField(formData, "personType"), stringField(formData, "personId"), parsed.error.issues[0]?.message ?? "The visit record is invalid.", true));
  if (profile.role === "usher" && parsed.data.personType !== "visitor") redirect(destination(parsed.data.personType, parsed.data.personId, "Ushers may record visits only for visitors.", true));
  const supabase = await createClient();
  const { error } = await callRpc<string>(supabase, "record_ministry_visit", { p_person_type: parsed.data.personType, p_person_id: parsed.data.personId, p_outcome: parsed.data.outcome, p_summary: parsed.data.summary || null });
  if (error) redirect(destination(parsed.data.personType, parsed.data.personId, "The visit record could not be saved.", true));
  revalidatePath("/care"); revalidatePath("/members"); revalidatePath("/dashboard");
  redirect(destination(parsed.data.personType, parsed.data.personId, "Visit activity recorded."));
}
