"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { stringField } from "@/lib/form-data";
import { z } from "zod";

const requestAccessSchema = z
  .object({
    displayName: z.string().trim().min(2).max(80),
    email: z.email().max(254),
    requestedRole: z.enum(["usher", "pastor"]),
    churchName: z.string().trim().max(160),
    pastorName: z.string().trim().max(120),
    district: z.string().trim().max(120),
    denomination: z.string().trim().max(120),
    churchPhone: z.string().trim().max(40)
  })
  .superRefine((value, context) => {
    if (value.requestedRole !== "pastor") return;

    const requiredFields: Array<[keyof typeof value, string]> = [
      ["churchName", "Church name is required for pastor verification."],
      ["pastorName", "Pastor or supervisor name is required."],
      ["district", "District or region is required."],
      ["denomination", "Denomination is required."],
      ["churchPhone", "Church phone is required."]
    ];

    for (const [field, message] of requiredFields) {
      if (String(value[field]).trim().length < 2) {
        context.addIssue({ code: "custom", path: [field], message });
      }
    }
  });

export async function requestStaffAccess(formData: FormData) {
  const parsed = requestAccessSchema.safeParse({
    displayName: stringField(formData, "displayName"),
    email: stringField(formData, "email"),
    requestedRole: stringField(formData, "requestedRole"),
    churchName: stringField(formData, "churchName"),
    pastorName: stringField(formData, "pastorName"),
    district: stringField(formData, "district"),
    denomination: stringField(formData, "denomination"),
    churchPhone: stringField(formData, "churchPhone")
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Enter valid account details.";
    redirect(`/signup?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const env = publicEnv();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/signup/pending`,
      data: {
        display_name: parsed.data.displayName,
        requested_role: parsed.data.requestedRole,
        church_name: parsed.data.churchName || null,
        pastor_name: parsed.data.pastorName || null,
        district: parsed.data.district || null,
        denomination: parsed.data.denomination || null,
        church_phone: parsed.data.churchPhone || null
      }
    }
  });

  if (error) {
    console.error("Self-registration request failed", {
      code: error.code ?? "unknown",
      status: error.status ?? 0,
      message: error.message
    });

    const safeCode = encodeURIComponent(error.code ?? "auth_error");
    redirect(`/signup?error=Signup+could+not+be+completed.+Reference%3A+${safeCode}`);
  }

  const notice = parsed.data.requestedRole === "pastor"
    ? "Check your email for the secure sign-in link. Your pastor request will be reviewed after email confirmation."
    : "Check your email for the secure sign-in link. After confirmation, you can enter the usher workspace.";
  redirect(`/login?notice=${encodeURIComponent(notice)}`);
}
