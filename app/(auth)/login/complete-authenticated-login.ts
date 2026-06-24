"use server";

import { redirect } from "next/navigation";
import { resolveAuthenticatedProfile, safePostLoginPath } from "@/lib/auth-profile";
import { createClient } from "@/lib/supabase/server";

function loginErrorPath(code: string, nextPath: string): string {
  const query = new URLSearchParams({ error: code, next: nextPath });
  return `/login?${query.toString()}`;
}

export async function completeAuthenticatedLogin(
  requestedPath: FormDataEntryValue | null,
): Promise<never> {
  const nextPath = safePostLoginPath(requestedPath);
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(loginErrorPath("session_missing", nextPath));
  }

  const resolution = await resolveAuthenticatedProfile(supabase, user);

  if (!resolution.ok) {
    await supabase.auth.signOut();
    redirect(loginErrorPath(resolution.reason, nextPath));
  }

  if (resolution.profile.role === "admin") {
    const { data: assurance, error: assuranceError } =
      await supabase.auth.mfa.getAuthenticatorAssuranceLevel();

    if (assuranceError || assurance.currentLevel !== "aal2") {
      const query = new URLSearchParams({ next: nextPath });
      redirect(`/mfa?${query.toString()}`);
    }
  }

  redirect(nextPath);
}
