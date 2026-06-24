import { cache } from "react";
import { redirect } from "next/navigation";
import { resolveActiveProfile } from "@/lib/auth-profile";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, UserProfile } from "@/types/app";

export const getCurrentProfile = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return null;
  const resolution = await resolveActiveProfile(supabase, user);
  return resolution.ok ? resolution.profile : null;
});

export async function requireProfile(allowedRoles?: readonly AppRole[]): Promise<UserProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (allowedRoles && !allowedRoles.includes(profile.role)) redirect("/unauthorized");
  if (profile.role === "administrator") {
    const supabase = await createClient();
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (data?.nextLevel === "aal2" && data.currentLevel !== "aal2") {
      redirect("/mfa?next=/dashboard");
    }
  }
  return profile;
}

export async function requireAdminAal2(): Promise<UserProfile> {
  const profile = await requireProfile(["administrator"]);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || data?.currentLevel !== "aal2") redirect("/mfa?next=/dashboard");
  return profile;
}
