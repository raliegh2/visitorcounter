"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAal2 } from "@/lib/auth";
import { requireRecentReauth } from "@/lib/reauth";
import { checkbox, stringField } from "@/lib/form-data";
import { retentionSettingsSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";

export async function updateRetentionSettingsAction(formData: FormData) {
  await requireAdminAal2();
  const parsed = retentionSettingsSchema.safeParse({
    visitorRetentionMonths: stringField(formData, "visitorRetentionMonths"),
    contactRetentionMonths: stringField(formData, "contactRetentionMonths"),
    attendanceRetentionMonths: stringField(formData, "attendanceRetentionMonths"),
    auditRetentionMonths: stringField(formData, "auditRetentionMonths"),
    notSeenDays: stringField(formData, "notSeenDays"),
    requireServiceAssignment: checkbox(formData, "requireServiceAssignment")
  });

  if (!parsed.success) redirect("/admin/settings?error=Retention+settings+are+invalid.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("update_organization_settings", {
    p_visitor_retention_months: parsed.data.visitorRetentionMonths,
    p_contact_retention_months: parsed.data.contactRetentionMonths,
    p_attendance_retention_months: parsed.data.attendanceRetentionMonths,
    p_audit_retention_months: parsed.data.auditRetentionMonths,
    p_not_seen_days: parsed.data.notSeenDays,
    p_require_service_assignment: parsed.data.requireServiceAssignment
  });

  if (error) redirect("/admin/settings?error=Retention+settings+could+not+be+saved.");
  revalidatePath("/admin/settings");
  redirect("/admin/settings?notice=Privacy+and+retention+settings+saved.");
}

export async function applyRetentionAction(formData: FormData) {
  await requireRecentReauth("/admin/settings");
  const reason = stringField(formData, "reason").trim();
  if (reason.length < 10 || reason.length > 240) {
    redirect("/admin/settings?error=A+meaningful+retention+reason+is+required.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("apply_visitor_retention", { p_reason: reason });

  if (error) redirect("/admin/settings?error=The+retention+workflow+could+not+be+completed.");
  revalidatePath("/admin/settings");
  redirect(`/admin/settings?notice=${encodeURIComponent(`${data ?? 0} visitor records were anonymized.`)}`);
}
