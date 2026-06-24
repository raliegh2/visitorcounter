"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { checkbox, stringField } from "@/lib/form-data";
import { createClient } from "@/lib/supabase/server";
import { checkInSchema, visitorRegistrationSchema } from "@/lib/schemas";

function destination(serviceId: string, notice: string, error = false): string {
  const key = error ? "error" : "notice";
  return `/visitors?service=${encodeURIComponent(serviceId)}&${key}=${encodeURIComponent(notice)}`;
}

export async function registerVisitorAction(formData: FormData) {
  await requireProfile(["administrator", "usher"]);
  const parsed = visitorRegistrationSchema.safeParse({
    fullName: stringField(formData, "fullName"),
    preferredName: stringField(formData, "preferredName"),
    firstVisitDate: stringField(formData, "firstVisitDate"),
    optionalContact: stringField(formData, "optionalContact"),
    contactConsent: checkbox(formData, "contactConsent"),
    serviceId: stringField(formData, "serviceId")
  });

  const serviceId = stringField(formData, "serviceId");
  if (!parsed.success) {
    redirect(destination(serviceId, parsed.error.issues[0]?.message ?? "Visitor details are invalid.", true));
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("register_visitor_and_check_in", {
    p_full_name: parsed.data.fullName,
    p_preferred_name: parsed.data.preferredName || null,
    p_first_visit_date: parsed.data.firstVisitDate,
    p_optional_contact: parsed.data.optionalContact || null,
    p_contact_consent: parsed.data.contactConsent,
    p_service_id: parsed.data.serviceId
  });

  if (error) {
    redirect(destination(parsed.data.serviceId, "The visitor could not be registered. Check for a duplicate or service restriction.", true));
  }

  revalidatePath("/visitors");
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  redirect(destination(parsed.data.serviceId, "Visitor registered and checked in."));
}

export async function checkInVisitorAction(formData: FormData) {
  await requireProfile(["administrator", "usher"]);
  const parsed = checkInSchema.safeParse({
    visitorId: stringField(formData, "visitorId"),
    serviceId: stringField(formData, "serviceId")
  });

  if (!parsed.success) {
    redirect(destination(stringField(formData, "serviceId"), "The check-in request is invalid.", true));
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("check_in_visitor", {
    p_visitor_id: parsed.data.visitorId,
    p_service_id: parsed.data.serviceId
  });

  if (error) {
    redirect(destination(parsed.data.serviceId, "The visitor is already checked in or the service is not authorized.", true));
  }

  revalidatePath("/visitors");
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  redirect(destination(parsed.data.serviceId, "Check-in confirmed."));
}
