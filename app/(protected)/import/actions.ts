"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { stringField } from "@/lib/form-data";
import { memberImportSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/supabase/rpc";

export async function importMembersAction(formData: FormData) {
  await requireProfile(["administrator", "pastor"]);
  let rows: unknown;
  try { rows = JSON.parse(stringField(formData, "rowsJson")); } catch { redirect("/import?error=The+import+preview+is+invalid.+Choose+the+file+again."); }
  const parsed = memberImportSchema.safeParse(rows);
  if (!parsed.success) redirect(`/import?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "The member rows are invalid.")}`);
  const supabase = await createClient();
  const payload = parsed.data.map((row) => ({
    first_name: row.firstName,
    last_name: row.lastName,
    email: row.email || null,
    phone: row.phone || null,
    address: row.address || null,
    membership_status: row.membershipStatus,
    last_contact_at: row.lastContactAt || null
  }));
  const { data, error } = await callRpc<number>(supabase, "bulk_import_member_records", { p_rows: payload });
  if (error) redirect(`/import?error=${encodeURIComponent(error.message || "The member file could not be imported.")}`);
  revalidatePath("/members"); revalidatePath("/dashboard");
  redirect(`/members?notice=${encodeURIComponent(`${data ?? payload.length} member records imported.`)}`);
}
