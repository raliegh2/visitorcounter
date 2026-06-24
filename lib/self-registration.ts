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
      emailRedirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/signup/pending`,
      data: { display_name: parsed.data.displayName }
    }
  });

  if (error) {
    redirect("/signup?error=The+access+request+could+not+be+submitted.+Please+try+again.");
  }

  redirect("/login?notice=Check+your+email+for+the+secure+sign-in+link.+Your+account+will+remain+pending+until+an+administrator+approves+it.");
}
