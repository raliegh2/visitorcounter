"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { stringField } from "@/lib/form-data";
import { memberSchema } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/server";
import { callRpc } from "@/lib/supabase/rpc";

export async function createMemberAction(formData: FormData) {
  await requireProfile(["administrator", "pastor"]);
  const parsed = memberSchema.safeParse({
    firstName: stringField(formData, "firstName"),
    lastName: stringField(formData, "lastName"),
    email: stringField(formData, "email"),
    phone: stringField(formData, "phone"),
    address: stringField(formData, "address"),
    membershipStatus: stringField(formData, "membershipStatus") || "active",
    lastContactAt: stringField(formData, "lastContactAt")
  });
  if (!parsed.success) redirect(`/members?error=${encodeURIComponent(parsed.error.issues[0]?.message ?? "Member details are invalid.")}`);
  const supabase = await createClient();
  const { error } = await callRpc<string>(supabase, "create_member_record", {
    p_first_name: parsed.data.firstName,
    p_last_name: parsed.data.lastName,
    p_email: parsed.data.email || null,
    p_phone: parsed.data.phone || null,
    p_address: parsed.data.address || null,
    p_membership_status: parsed.data.membershipStatus,
    p_last_contact_at: parsed.data.lastContactAt || null
  });
  if (error) redirect(`/members?error=${encodeURIComponent("The member record could not be created.")}`);
  revalidatePath("/members");
  revalidatePath("/dashboard");
  redirect("/members?notice=Member+record+created.");
}
