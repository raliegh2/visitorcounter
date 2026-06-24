"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { stringField } from "@/lib/form-data";
import { z } from "zod";

const requestAccessSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  email: z.email().max(254)
});

export async function requestStaffAccess(formData: FormData) {
  const parsed = requestAccessSchema.safeParse({
    displayName: stringField(formData, "displayName"),
    email: stringField(formData, "email")
  });

  if (!parsed.success) {
    redirect("/signup?error=Enter+a+valid+full+name+and+email+address.");
  }

  const supabase = await createClient();
  const env = publicEnv();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/dashboard`,
      data: { display_name: parsed.data.displayName }
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

  redirect("/login?notice=Check+your+email+for+the+secure+sign-in+link.+After+confirmation,+you+will+enter+the+system+as+an+usher.");
}
