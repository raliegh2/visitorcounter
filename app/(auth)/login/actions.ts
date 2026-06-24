"use server";

import { redirect } from "next/navigation";
import { resolveActiveProfile, safeInternalPath } from "@/lib/auth-profile";
import { createClient } from "@/lib/supabase/server";
import { loginSchema } from "@/lib/schemas";
import { stringField } from "@/lib/form-data";
import { clearRecentReauth } from "@/lib/reauth";

function loginError(message: string, next: string): string {
  const params = new URLSearchParams({ error: message, next });
  return `/login?${params.toString()}`;
}

export async function loginAction(formData: FormData) {
  const next = safeInternalPath(stringField(formData, "next"));
  const parsed = loginSchema.safeParse({
    email: stringField(formData, "email"),
    password: stringField(formData, "password"),
    next
  });

  if (!parsed.success) {
    redirect(loginError("Enter a valid email and password.", next));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password
  });

  if (error || !data.user) {
    redirect(loginError("Sign-in failed. Check your credentials or account status.", next));
  }

  const resolution = await resolveActiveProfile(supabase, data.user);

  if (!resolution.ok) {
    await supabase.auth.signOut();

    if (resolution.reason === "inactive") {
      redirect(loginError("This staff account is disabled. Contact an administrator.", next));
    }

    redirect(loginError(
      "Your login was accepted, but the staff profile is incomplete. Ask an administrator to finish account setup.",
      next
    ));
  }

  if (resolution.profile.role === "administrator") {
    const { data: aal, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalError || (aal?.nextLevel === "aal2" && aal.currentLevel !== "aal2")) {
      redirect(`/mfa?next=${encodeURIComponent(next)}`);
    }
  }

  redirect(next);
}

export async function logoutAction() {
  const supabase = await createClient();
  await clearRecentReauth();
  await supabase.auth.signOut();
  redirect("/login");
}
