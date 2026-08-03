import { MemberImport } from "@/components/MemberImport";
import { Notice } from "@/components/ui/Notice";
import { requireProfile } from "@/lib/auth";

export const metadata = { title: "Import members" };

export default async function ImportPage({
  searchParams
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  await requireProfile(["administrator", "pastor"]);
  const params = await searchParams;

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Import members</h1>
          <p>Move an existing church directory into the protected member and pastoral-care workspace.</p>
        </div>
      </header>
      <Notice message={params.notice} kind="success" />
      <Notice message={params.error} kind="error" />
      <MemberImport />
    </>
  );
}
