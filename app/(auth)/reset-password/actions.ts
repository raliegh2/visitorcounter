"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stringField } from "@/lib/form-data";
import { z } from "zod";

const schema = z
  .object({
    password: z.string().min(14).max(128),
    confirmation: z.string().min(14).max(128)
  })
  .refine((data) => data.password === data.confirmation, {
    path: ["confirmation"],
    message: "Passwords must match."
  });

export async function updatePasswordAction(formData: FormData) {
  const parsed = schema.safeParse({
    password: stringField(formData, "password"),
    confirmation: stringField(formData, "confirmation")
  });

  if (!parsed.success) {
    redirect("/reset-password?error=Use+matching+passwords+with+at+least+14+characters.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    redirect("/reset-password?error=The+password+could+not+be+updated.");
  }

  await supabase.auth.signOut();
  redirect("/login?notice=Password+updated.+Sign+in+with+your+new+password.");
}
