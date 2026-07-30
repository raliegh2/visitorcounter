import Link from "next/link";
import { requireProfile } from "@/lib/auth";
import { Notice } from "@/components/ui/Notice";
import { MemberImport } from "@/components/import/MemberImport";

export const metadata = { title: "Import members" };

export default async function ImportPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireProfile(["administrator", "pastor"]); const params = await searchParams;
  return <><header className="page-header"><div><h1>Import member database</h1><p>Upload an Excel `.xlsx` workbook or CSV exported from Excel. Review the preview before saving records.</p></div><Link className="button button-secondary" href="/members">Return to members</Link></header><Notice message={params.error} kind="error" /><div className="grid grid-2"><section className="card"><h2>File requirements</h2><p>Maximum 500 rows and 2 MB. The first worksheet is imported.</p><div className="code-box">First Name, Last Name, Email, Phone, Address, Membership Status, Last Contact Date</div><p className="muted small">First Name and Last Name are required. Membership Status may be Active, Inactive, or Prospective.</p></section><section className="card"><h2>Select and preview</h2><MemberImport /></section></div></>;
}
