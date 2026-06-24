"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireRecentReauth } from "@/lib/reauth";
import { correctionSchema } from "@/lib/schemas";
import { stringField } from "@/lib/form-data";
import { createClient } from "@/lib/supabase/server";

export async function correctAttendanceAction(formData: FormData) {
  const serviceId = stringField(formData, "serviceId");
  const returnTo = `/attendance?service=${encodeURIComponent(serviceId)}`;
  await requireRecentReauth(returnTo);

  const parsed = correctionSchema.safeParse({
    attendanceId: stringField(formData, "attendanceId"),
    reason: stringField(formData, "reason")
  });

  if (!parsed.success) {
    redirect(`${returnTo}&error=${encodeURIComponent("A meaningful correction reason is required.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("correct_attendance", {
    p_attendance_id: parsed.data.attendanceId,
    p_reason: parsed.data.reason
  });

  if (error) {
    redirect(`${returnTo}&error=${encodeURIComponent("The attendance correction could not be completed.")}`);
  }

  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  redirect(`${returnTo}&notice=${encodeURIComponent("Attendance correction recorded.")}`);
}
