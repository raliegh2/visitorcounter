"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAal2 } from "@/lib/auth";
import { requireRecentReauth } from "@/lib/reauth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { checkbox, stringField } from "@/lib/form-data";
import { inviteUserSchema, userActiveSchema, userRoleSchema } from "@/lib/schemas";

export async function inviteUserAction(formData: FormData) {
  await requireRecentReauth("/admin/users");
  const profile = await requireAdminAal2();
  const parsed = inviteUserSchema.safeParse({
    email: stringField(formData, "email"),
    displayName: stringField(formData, "displayName"),
    role: stringField(formData, "role")
  });

  if (!parsed.success) {
    redirect("/admin/users?error=Enter+valid+invitation+details.");
  }

  const admin = createAdminClient();
  const env = publicEnv();
  const { data, error } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/reset-password`,
    data: {
      display_name: parsed.data.displayName
    }
  });

  if (error || !data.user) {
    redirect("/admin/users?error=The+staff+invitation+could+not+be+created.");
  }

  const { error: profileError } = await admin.from("user_profiles").upsert({
    id: data.user.id,
    organization_id: profile.organization_id,
    display_name: parsed.data.displayName,
    role: parsed.data.role,
    active: true
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(data.user.id);
    redirect("/admin/users?error=The+staff+profile+could+not+be+created.");
  }

  const supabase = await createClient();
  await supabase.rpc("record_admin_event", {
    p_action: "USER_INVITED",
    p_resource_type: "user_profile",
    p_resource_id: data.user.id,
    p_outcome: "success",
    p_safe_metadata: { role: parsed.data.role }
  });

  revalidatePath("/admin/users");
  redirect("/admin/users?notice=Staff+invitation+created.");
}

export async function changeUserRoleAction(formData: FormData) {
  await requireRecentReauth("/admin/users");
  const parsed = userRoleSchema.safeParse({
    userId: stringField(formData, "userId"),
    role: stringField(formData, "role")
  });

  if (!parsed.success) redirect("/admin/users?error=The+role+change+is+invalid.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_role", {
    p_user_id: parsed.data.userId,
    p_role: parsed.data.role
  });

  if (error) redirect("/admin/users?error=The+role+could+not+be+changed.");
  revalidatePath("/admin/users");
  redirect("/admin/users?notice=User+role+updated.");
}

export async function changeUserActiveAction(formData: FormData) {
  await requireRecentReauth("/admin/users");
  const parsed = userActiveSchema.safeParse({
    userId: stringField(formData, "userId"),
    active: checkbox(formData, "active")
  });

  if (!parsed.success) redirect("/admin/users?error=The+account+status+request+is+invalid.");

  const supabase = await createClient();
  const { error } = await supabase.rpc("set_user_active", {
    p_user_id: parsed.data.userId,
    p_active: parsed.data.active
  });

  if (error) redirect("/admin/users?error=The+account+status+could+not+be+changed.");
  revalidatePath("/admin/users");
  redirect("/admin/users?notice=Account+status+updated.");
}
