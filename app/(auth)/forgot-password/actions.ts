"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { stringField } from "@/lib/form-data";
import { z } from "zod";

const schema = z.object({ email: z.email().max(254) });

export async function requestPasswordResetAction(formData: FormData) {
  const parsed = schema.safeParse({ email: stringField(formData, "email") });

  // Always return the same result to prevent account enumeration.
  if (parsed.success) {
    const supabase = await createClient();
    const env = publicEnv();
    await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`
    });
  }

  redirect("/login?notice=If+the+account+exists,+a+password-reset+message+has+been+sent.");
}
