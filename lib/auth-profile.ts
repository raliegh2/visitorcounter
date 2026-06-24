import "server-only";

import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AppRole, UserProfile } from "@/types/app";
import type { Database } from "@/types/database.generated";

const VALID_ROLES = new Set<AppRole>(["administrator", "usher", "auditor"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type ProfileResolution =
  | { ok: true; profile: UserProfile }
  | { ok: false; reason: "inactive" | "incomplete" | "unavailable" };

function trustedRole(user: User): AppRole | null {
  const value = user.app_metadata?.role;
  return typeof value === "string" && VALID_ROLES.has(value as AppRole)
    ? (value as AppRole)
    : null;
}

function trustedOrganizationId(user: User): string | null {
  const value = user.app_metadata?.organization_id;
  return typeof value === "string" && UUID_PATTERN.test(value) ? value : null;
}

function displayName(user: User): string {
  const metadataName = user.user_metadata?.display_name;
  if (typeof metadataName === "string" && metadataName.trim().length >= 2) {
    return metadataName.trim().slice(0, 80);
  }
  const emailName = user.email?.split("@")[0]?.trim();
  if (emailName && emailName.length >= 2) return emailName.slice(0, 80);
  return "Staff member";
}

async function readOwnProfile(supabase: SupabaseClient<Database>, userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("user_profiles")
    .select("id, organization_id, display_name, role, active, created_at, updated_at")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("Authenticated profile lookup failed", { userId, code: error.code });
    return null;
  }
  return data as UserProfile | null;
}

async function repairMissingProfile(user: User): Promise<UserProfile | null> {
  const organizationId = trustedOrganizationId(user);
  const role = trustedRole(user);
  if (!organizationId || !role) return null;

  try {
    const admin = createAdminClient();
    const { data: organization, error: organizationError } = await admin
      .from("organizations").select("id").eq("id", organizationId).maybeSingle();
    if (organizationError || !organization) {
      console.error("Profile repair rejected because the organization is unavailable", {
        userId: user.id, organizationId, code: organizationError?.code
      });
      return null;
    }

    const { data, error } = await admin
      .from("user_profiles")
      .upsert({
        id: user.id,
        organization_id: organizationId,
        display_name: displayName(user),
        role,
        active: true
      }, { onConflict: "id" })
      .select("id, organization_id, display_name, role, active, created_at, updated_at")
      .single();
    if (error || !data) {
      console.error("Authenticated profile repair failed", {
        userId: user.id, organizationId, code: error?.code
      });
      return null;
    }
    return data as UserProfile;
  } catch (error) {
    console.error("Authenticated profile repair is unavailable", {
      userId: user.id,
      error: error instanceof Error ? error.message : "Unknown error"
    });
    return null;
  }
}

export async function resolveActiveProfile(
  supabase: SupabaseClient<Database>,
  user: User
): Promise<ProfileResolution> {
  let profile = await readOwnProfile(supabase, user.id);
  if (!profile) profile = await repairMissingProfile(user);
  if (!profile) return { ok: false, reason: "incomplete" };
  if (!profile.active) return { ok: false, reason: "inactive" };
  return { ok: true, profile };
}

export function safeInternalPath(value: string | null | undefined): string {
  if (!value) return "/dashboard";
  return value.startsWith("/") && !value.startsWith("//") && !value.includes("\\")
    ? value
    : "/dashboard";
}
