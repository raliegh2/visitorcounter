import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

const emailOtpTypes = new Set<EmailOtpType>([
  "email",
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change"
]);

function safeNext(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

function safeOtpType(value: string | null): EmailOtpType | null {
  return value && emailOtpTypes.has(value as EmailOtpType) ? (value as EmailOtpType) : null;
}

function redirectToLogin(url: URL, message: string): NextResponse {
  const loginUrl = new URL("/login", url.origin);
  loginUrl.searchParams.set("error", message);
  return NextResponse.redirect(loginUrl);
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = safeOtpType(url.searchParams.get("type"));
  const next = safeNext(url.searchParams.get("next"));
  const supabase = await createClient();

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }

    console.error("Supabase email token verification failed", {
      code: error.code ?? "unknown",
      status: error.status ?? 0
    });
  }

  // Keep compatibility with authorization-code links that Supabase already sent.
  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(next, url.origin));
    }

    console.error("Supabase authorization-code exchange failed", {
      code: error.code ?? "unknown",
      status: error.status ?? 0
    });
  }

  const providerError = url.searchParams.get("error_description");
  return redirectToLogin(
    url,
    providerError?.slice(0, 180) ??
      "The authentication link could not be verified. Request a new link and open it in this browser."
  );
}
