"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAal2 } from "@/lib/auth";
import { serviceSchema } from "@/lib/schemas";
import { checkbox, stringField } from "@/lib/form-data";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export async function createServiceAction(formData: FormData) {
  await requireAdminAal2();
  const parsed = serviceSchema.safeParse({
    serviceName: stringField(formData, "serviceName"),
    serviceDate: stringField(formData, "serviceDate"),
    startTime: stringField(formData, "startTime")
  });

  if (!parsed.success) {
    redirect("/services?error=Enter+valid+service+details.");
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("create_service", {
    p_service_name: parsed.data.serviceName,
    p_service_date: parsed.data.serviceDate,
    p_start_time: parsed.data.startTime
  });

  if (error) redirect("/services?error=The+service+could+not+be+created.");
  revalidatePath("/services");
  redirect("/services?notice=Service+created.");
}

const assignmentSchema = z.object({
  serviceId: z.uuid(),
  userId: z.uuid(),
  assigned: z.boolean()
});

export async function updateAssignmentAction(formData: FormData) {
  await requireAdminAal2();
  const parsed = assignmentSchema.safeParse({
    serviceId: stringField(formData, "serviceId"),
    userId: stringField(formData, "userId"),
    assigned: checkbox(formData, "assigned")
  });
  if (!parsed.success) redirect("/services?error=The+assignment+request+is+invalid.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_service_assignment", {
    p_service_id: parsed.data.serviceId,
    p_user_id: parsed.data.userId,
    p_assigned: parsed.data.assigned
  });

  if (error) redirect("/services?error=The+service+assignment+could+not+be+updated.");
  revalidatePath("/services");
  redirect("/services?notice=Service+assignment+updated.");
}
