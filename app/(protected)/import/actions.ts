"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { stringField } from "@/lib/form-data";
import { memberImportSchema } from "@/lib/schemas";
import { callRpc } from "@/lib/supabase/rpc";
import { createClient } from "@/lib/supabase/server";

export async function importMembersAction(formData: FormData) {
  await requireProfile(["administrator", "pastor"]);
  const raw = stringField(formData, "rowsJson");

  let candidate: unknown;
  try {
    candidate = JSON.parse(raw);
  } catch {
    redirect("/import?error=The+import+payload+is+invalid.");
  }

  const parsed = memberImportSchema.safeParse(candidate);
  if (!parsed.success) {
    const issue = parsed.error.issues[0]?.message ?? "The import contains invalid member data.";
    redirect(`/import?error=${encodeURIComponent(issue)}`);
  }

  const supabase = await createClient();
  const { data, error } = await callRpc<number>(supabase, "bulk_import_members", {
    p_rows: parsed.data
  });

  if (error) {
    redirect("/import?error=The+member+import+could+not+be+completed.");
  }

  revalidatePath("/members");
  revalidatePath("/dashboard");
  revalidatePath("/care");
  redirect(`/import?notice=${encodeURIComponent(`Imported ${data ?? parsed.data.length} members.`)}`);
}
