import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/database.generated";

const publicPaths = [
  "/login",
  "/signup",
  "/signup/pending",
  "/forgot-password",
  "/reset-password",
  "/auth/callback",
  "/api/health"
];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

function buildCsp(nonce: string, supabaseUrl: string): string {
  const websocketUrl = supabaseUrl.replace(/^https:/, "wss:");
  const development = process.env.NODE_ENV !== "production";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "img-src 'self' data:",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${development ? " 'unsafe-eval'" : ""}`,
    `connect-src 'self' ${supabaseUrl} ${websocketUrl}`,
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "upgrade-insecure-requests"
  ].join("; ");
}

function copyCookies(from: NextResponse, to: NextResponse): void {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
}

export async function updateSession(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    return NextResponse.next({ request });
  }

  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = buildCsp(nonce, url);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders
    }
  });

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({
          request: {
            headers: requestHeaders
          }
        });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      }
    }
  });

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;
  let activeProfile = false;

  if (user) {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("active")
      .eq("id", user.id)
      .maybeSingle();
    activeProfile = profile?.active === true;
  }

  if (user && !activeProfile) {
    if (pathname === "/signup/pending") {
      response.headers.set("Content-Security-Policy", csp);
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    const pendingUrl = request.nextUrl.clone();
    pendingUrl.pathname = "/signup/pending";
    pendingUrl.search = "";
    const redirectResponse = NextResponse.redirect(pendingUrl);
    copyCookies(response, redirectResponse);
    redirectResponse.headers.set("Content-Security-Policy", csp);
    return redirectResponse;
  }

  if (!user && !isPublicPath(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.searchParams.set("next", pathname);
    const redirectResponse = NextResponse.redirect(loginUrl);
    copyCookies(response, redirectResponse);
    redirectResponse.headers.set("Content-Security-Policy", csp);
    return redirectResponse;
  }

  if (user && activeProfile && (pathname === "/login" || pathname === "/signup" || pathname === "/signup/pending")) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = "/dashboard";
    dashboardUrl.search = "";
    const redirectResponse = NextResponse.redirect(dashboardUrl);
    copyCookies(response, redirectResponse);
    redirectResponse.headers.set("Content-Security-Policy", csp);
    return redirectResponse;
  }

  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
