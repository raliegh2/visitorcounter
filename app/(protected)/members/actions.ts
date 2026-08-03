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
    ministry: stringField(formData, "ministry"),
    joinedDate: stringField(formData, "joinedDate")
  });

  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Member details are invalid.";
    redirect(`/members?error=${encodeURIComponent(message)}`);
  }

  const supabase = await createClient();
  const { error } = await callRpc<string>(supabase, "create_member", {
    p_first_name: parsed.data.firstName,
    p_last_name: parsed.data.lastName,
    p_email: parsed.data.email || null,
    p_phone: parsed.data.phone || null,
    p_address: parsed.data.address || null,
    p_ministry: parsed.data.ministry || null,
    p_joined_date: parsed.data.joinedDate || null
  });

  if (error) {
    redirect("/members?error=The+member+record+could+not+be+created.");
  }

  revalidatePath("/members");
  revalidatePath("/dashboard");
  revalidatePath("/care");
  redirect("/members?notice=Member+record+created.");
}
