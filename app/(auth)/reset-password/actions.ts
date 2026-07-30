"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { stringField } from "@/lib/form-data";
import { z } from "zod";

const passwordSchema = z
  .string()
  .min(14)
  .max(128)
  .regex(/[a-z]/)
  .regex(/[A-Z]/)
  .regex(/[0-9]/)
  .regex(/[^A-Za-z0-9]/);

const schema = z
  .object({
    password: passwordSchema,
    confirmation: passwordSchema
  })
  .refine((data) => data.password === data.confirmation, {
    path: ["confirmation"],
    message: "Passwords must match."
  });

const requirementsMessage =
  "Use matching passwords with at least 14 characters, including uppercase, lowercase, a number, and a special character.";

export async function updatePasswordAction(formData: FormData) {
  const parsed = schema.safeParse({
    password: stringField(formData, "password"),
    confirmation: stringField(formData, "confirmation")
  });

  if (!parsed.success) {
    redirect(`/reset-password?error=${encodeURIComponent(requirementsMessage)}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    const message = error.code === "weak_password" ? requirementsMessage : "The password could not be updated. Request a new reset link and try again.";
    redirect(`/reset-password?error=${encodeURIComponent(message)}`);
  }

  await supabase.auth.signOut();
  redirect("/login?notice=Password+updated.+Sign+in+with+your+new+password.");
}
