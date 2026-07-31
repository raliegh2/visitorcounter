"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  clearPasswordRecoveryAuthorization,
  hasPasswordRecoveryAuthorization
} from "@/lib/password-recovery";
import { stringField } from "@/lib/form-data";
import { z } from "zod";

const passwordSchema = z.string().min(12).max(72);

const schema = z
  .object({
    password: passwordSchema,
    confirmation: passwordSchema
  })
  .refine((data) => data.password === data.confirmation, {
    path: ["confirmation"],
    message: "Passwords must match."
  });

const requirementsMessage = "Use matching passwords with at least 12 characters.";

type RecoveryRpcError = {
  code?: string;
  message: string;
};

type RecoveryRpcClient = {
  rpc: (
    name: "reset_password_without_mfa",
    args: { p_user_id: string; p_password: string }
  ) => Promise<{ error: RecoveryRpcError | null }>;
};

export async function updatePasswordAction(formData: FormData) {
  const parsed = schema.safeParse({
    password: stringField(formData, "password"),
    confirmation: stringField(formData, "confirmation")
  });

  if (!parsed.success) {
    redirect(`/reset-password?error=${encodeURIComponent(requirementsMessage)}`);
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError
  } = await supabase.auth.getUser();

  if (userError || !user || !(await hasPasswordRecoveryAuthorization(user.id))) {
    await clearPasswordRecoveryAuthorization();
    await supabase.auth.signOut();
    redirect(
      "/login?error=Your+password-reset+authorization+expired.+Request+a+new+reset+link+and+try+again."
    );
  }

  // The service-role-only RPC performs the same password-state cleanup as
  // GoTrue while enforcing the application's length-only rule. It also removes
  // TOTP factors and revokes all sessions, so recovery never depends on an
  // authenticator device or hosted character-class settings.
  const admin = createAdminClient() as unknown as RecoveryRpcClient;
  const { error } = await admin.rpc("reset_password_without_mfa", {
    p_user_id: user.id,
    p_password: parsed.data.password
  });

  if (error) {
    console.error("Password recovery RPC failed", {
      code: error.code ?? "unknown",
      message: error.message
    });

    const message = error.message.includes("different from your current password")
      ? "Choose a password that is different from your current password."
      : error.code === "22023"
        ? requirementsMessage
        : "The password could not be updated. Request a new reset link and try again.";
    redirect(`/reset-password?error=${encodeURIComponent(message)}`);
  }

  await clearPasswordRecoveryAuthorization();
  await supabase.auth.signOut();
  redirect("/login?notice=Password+updated.+Sign+in+with+your+new+password.");
}
