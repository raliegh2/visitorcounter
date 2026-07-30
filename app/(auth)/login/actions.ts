"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/schemas";
import { stringField } from "@/lib/form-data";
import { clearRecentReauth } from "@/lib/reauth";

function safeNext(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function loginAction(formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: stringField(formData, "email"),
    password: stringField(formData, "password"),
    next: safeNext(stringField(formData, "next") || "/dashboard")
  });

  if (!parsed.success) {
    redirect("/login?error=Enter+a+valid+email+and+password.");
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (error) {
    redirect("/login?error=Sign-in+failed.+Check+your+credentials+or+account+status.");
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("active, role")
    .single();

  if (!profile?.active) {
    await supabase.auth.signOut();
    redirect("/login?error=Sign-in+failed.+Check+your+credentials+or+account+status.");
  }

  redirect(parsed.data.next);
}

export async function logoutAction() {
  const supabase = await createClient();
  await clearRecentReauth();
  await supabase.auth.signOut();
  redirect("/login");
}
