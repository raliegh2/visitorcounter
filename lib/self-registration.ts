"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { stringField } from "@/lib/form-data";
import { signupSchema } from "@/lib/schemas";

export async function requestStaffAccess(formData: FormData) {
  const parsed = signupSchema.safeParse({
    displayName: stringField(formData, "displayName"),
    email: stringField(formData, "email"),
    requestedRole: stringField(formData, "requestedRole") || "usher",
    churchName: stringField(formData, "churchName"),
    pastorName: stringField(formData, "pastorName"),
    district: stringField(formData, "district"),
    denomination: stringField(formData, "denomination"),
    churchPhone: stringField(formData, "churchPhone")
  });

  if (!parsed.success) {
    redirect(`/signup?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Enter valid account details.")}`);
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
    console.error("Self-registration request failed", { code: error.code ?? "unknown", status: error.status ?? 0 });
    redirect(`/signup?error=Signup+could+not+be+completed.+Reference%3A+${encodeURIComponent(error.code ?? "auth_error")}`);
  }

  const message = parsed.data.requestedRole === "usher"
    ? "Check your email for the secure sign-in link. Usher access is available after email confirmation."
    : `Check your email for the secure link. A church administrator must approve your ${parsed.data.requestedRole} request.`;
  redirect(`/login?notice=${encodeURIComponent(message)}`);
}
