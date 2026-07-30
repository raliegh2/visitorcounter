import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { AppRole, UserProfile } from "@/types/app";

export const getCurrentProfile = cache(async (): Promise<UserProfile | null> => {
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) return null;

  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, organization_id, display_name, role, requested_role, role_status, active, created_at, updated_at")
    .eq("id", user.id)
    .single();

  if (error || !data || !data.active) return null;
  return data as UserProfile;
});

export async function requireProfile(allowedRoles?: readonly AppRole[]): Promise<UserProfile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  if (profile.role_status !== "approved") {
    redirect("/signup/pending");
  }

  if (allowedRoles && !allowedRoles.includes(profile.role)) {
    redirect("/unauthorized");
  }

  return profile;
}

/** Compatibility wrapper retained for existing administrator call sites. */
export async function requireAdminAal2(): Promise<UserProfile> {
  return requireProfile(["administrator"]);
}
