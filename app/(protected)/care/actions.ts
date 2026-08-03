"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { stringField } from "@/lib/form-data";
import { careNoteSchema, visitRecordSchema } from "@/lib/schemas";
import { callRpc } from "@/lib/supabase/rpc";
import { createClient } from "@/lib/supabase/server";

function destination(personType: string, personId: string, message: string, error = false): string {
  const key = error ? "error" : "notice";
  const params = new URLSearchParams({ type: personType, person: personId, [key]: message });
  return `/care?${params.toString()}`;
}

export async function addCareNoteAction(formData: FormData) {
  await requireProfile(["administrator", "usher", "pastor"]);
  const parsed = careNoteSchema.safeParse({
    personType: stringField(formData, "personType"),
    personId: stringField(formData, "personId"),
    noteText: stringField(formData, "noteText"),
    noteType: stringField(formData, "noteType"),
    visibility: stringField(formData, "visibility")
  });

  const personType = stringField(formData, "personType");
  const personId = stringField(formData, "personId");
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "The care note is invalid.";
    redirect(destination(personType, personId, message, true));
  }

  const supabase = await createClient();
  const { error } = await callRpc<string>(supabase, "add_care_note", {
    p_person_type: parsed.data.personType,
    p_person_id: parsed.data.personId,
    p_note_text: parsed.data.noteText,
    p_note_type: parsed.data.noteType,
    p_visibility: parsed.data.visibility
  });

  if (error) {
    redirect(destination(parsed.data.personType, parsed.data.personId, "The care note could not be saved.", true));
  }

  revalidatePath("/care");
  revalidatePath("/dashboard");
  redirect(destination(parsed.data.personType, parsed.data.personId, "Care note saved."));
}

export async function recordVisitAction(formData: FormData) {
  await requireProfile(["administrator", "usher", "pastor"]);
  const parsed = visitRecordSchema.safeParse({
    personType: stringField(formData, "personType"),
    personId: stringField(formData, "personId"),
    outcome: stringField(formData, "outcome")
  });

  const personType = stringField(formData, "personType");
  const personId = stringField(formData, "personId");
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "The visit record is invalid.";
    redirect(destination(personType, personId, message, true));
  }

  const supabase = await createClient();
  const { error } = await callRpc<string>(supabase, "record_person_visit", {
    p_person_type: parsed.data.personType,
    p_person_id: parsed.data.personId,
    p_outcome: parsed.data.outcome
  });

  if (error) {
    redirect(destination(parsed.data.personType, parsed.data.personId, "The visit could not be recorded.", true));
  }

  revalidatePath("/care");
  revalidatePath("/dashboard");
  redirect(destination(parsed.data.personType, parsed.data.personId, "Visit recorded."));
}
