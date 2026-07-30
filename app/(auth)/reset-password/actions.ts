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

const passwordSchema = z.string().min(12).max(128);

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

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.updateUserById(user.id, {
    password: parsed.data.password
  });

  if (error) {
    const message =
      error.code === "weak_password"
        ? requirementsMessage
        : error.code === "same_password"
          ? "Choose a password that is different from your current password."
          : "The password could not be updated. Request a new reset link and try again.";
    redirect(`/reset-password?error=${encodeURIComponent(message)}`);
  }

  // Authenticator-app MFA is no longer offered by this application. Remove any
  // factors from the recovered account so future password changes are not tied
  // to a device the user may no longer have.
  const { data: factorData, error: factorListError } = await admin.auth.admin.mfa.listFactors({
    userId: user.id
  });

  if (factorListError) {
    console.error("Unable to list MFA factors after password recovery", {
      code: factorListError.code ?? "unknown",
      status: factorListError.status ?? 0
    });
  } else {
    for (const factor of factorData.factors) {
      const { error: deleteFactorError } = await admin.auth.admin.mfa.deleteFactor({
        id: factor.id,
        userId: user.id
      });

      if (deleteFactorError) {
        console.error("Unable to remove MFA factor after password recovery", {
          code: deleteFactorError.code ?? "unknown",
          status: deleteFactorError.status ?? 0
        });
      }
    }
  }

  await clearPasswordRecoveryAuthorization();
  await supabase.auth.signOut();
  redirect("/login?notice=Password+updated.+Sign+in+with+your+new+password.");
}
