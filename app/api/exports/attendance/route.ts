import { NextResponse, type NextRequest } from "next/server";
import { requireRecentReauth } from "@/lib/reauth";
import { createClient } from "@/lib/supabase/server";
import { publicEnv } from "@/lib/env";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

function validDate(value: FormDataEntryValue | null): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed." }, { status: 405 });
}

export async function POST(request: NextRequest) {
  const env = publicEnv();
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(env.NEXT_PUBLIC_APP_URL).origin) {
    return NextResponse.json({ error: "Request origin was not accepted." }, { status: 403 });
  }

  await requireRecentReauth("/reports");
  const formData = await request.formData();
  const from = formData.get("from");
  const to = formData.get("to");

  if (!validDate(from) || !validDate(to) || from > to) {
    return NextResponse.json({ error: "Invalid report period." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("export_attendance", {
    p_from: from,
    p_to: to
  });

  if (error) {
    return NextResponse.json({ error: "Export could not be created." }, { status: 403 });
  }

  const csv = toCsv((data ?? []) as Array<Record<string, unknown>>);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="attendance-${from}-to-${to}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
