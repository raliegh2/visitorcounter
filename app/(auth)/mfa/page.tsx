import { redirect } from "next/navigation";

export const metadata = { title: "Sign in" };

export default function MfaPage() {
  // Authenticator-app MFA is no longer part of the application access flow.
  redirect("/dashboard");
}
