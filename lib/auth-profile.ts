import type { SupabaseClient, User } from "@supabase/supabase-js";

export type AppRole = "admin" | "pastor" | "usher" | "member";

export type AuthenticatedProfile = {
  id: string;
  role: AppRole;
  is_active: boolean;
};

export type ProfileResolution =
  | { ok: true; profile: AuthenticatedProfile }
  | { ok: false; reason: "account_setup" | "account_disabled" };

async function readOwnProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<AuthenticatedProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    console.error("Unable to read authenticated profile", {
      userId,
      code: error.code,
    });
    return null;
  }

  return data as AuthenticatedProfile | null;
}

export async function resolveAuthenticatedProfile(
  supabase: SupabaseClient,
  user: User,
): Promise<ProfileResolution> {
  let profile = await readOwnProfile(supabase, user.id);

  if (!profile) {
    const { error: repairError } = await supabase.rpc("ensure_current_user_profile");

    if (repairError) {
      console.error("Unable to repair authenticated profile", {
        userId: user.id,
        code: repairError.code,
      });
      return { ok: false, reason: "account_setup" };
    }

    profile = await readOwnProfile(supabase, user.id);
  }

  if (!profile) {
    return { ok: false, reason: "account_setup" };
  }

  if (!profile.is_active) {
    return { ok: false, reason: "account_disabled" };
  }

  return { ok: true, profile };
}

export function safePostLoginPath(value: FormDataEntryValue | null): string {
  if (typeof value !== "string") {
    return "/dashboard";
  }

  const candidate = value.trim();

  if (!candidate.startsWith("/") || candidate.startsWith("//") || candidate.includes("\\")) {
    return "/dashboard";
  }

  return candidate;
}
