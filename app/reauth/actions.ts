"use server";

import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { clearRecentReauth } from "@/lib/reauth";
import { createClient } from "@/lib/supabase/server";
import { stringField } from "@/lib/form-data";

function safeNext(value: string): string {
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function reauthenticateAction(formData: FormData) {
  const profile = await requireProfile(["administrator"]);
  const password = stringField(formData, "password");
  const next = safeNext(stringField(formData, "next"));

  if (password.length < 12 || password.length > 128) {
    redirect(`/reauth?next=${encodeURIComponent(next)}&error=${encodeURIComponent("Reauthentication failed.")}`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email || user.id !== profile.id) {
    redirect("/login");
  }

  await clearRecentReauth();

  const { error } = await supabase.auth.signInWithPassword({
    email: user.email,
    password
  });

  if (error) {
    redirect(`/reauth?next=${encodeURIComponent(next)}&error=${encodeURIComponent("Reauthentication failed.")}`);
  }

  redirect(`/mfa?next=${encodeURIComponent(`/reauth/complete?next=${encodeURIComponent(next)}`)}`);
}
