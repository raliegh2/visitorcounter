import { NextResponse, type NextRequest } from "next/server";
import { requireAdminAal2 } from "@/lib/auth";
import { markRecentReauth } from "@/lib/reauth";

function safeNext(value: string | null): string {
  return value?.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function GET(request: NextRequest) {
  const profile = await requireAdminAal2();
  await markRecentReauth(profile.id);
  return NextResponse.redirect(new URL(safeNext(request.nextUrl.searchParams.get("next")), request.url));
}
