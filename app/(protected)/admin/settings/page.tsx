import { requireAdminAal2 } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Notice } from "@/components/ui/Notice";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { ConfirmSubmitButton } from "@/components/ui/ConfirmSubmitButton";
import { applyRetentionAction, updateRetentionSettingsAction } from "./actions";

export const metadata = { title: "Privacy and retention" };
export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams
}: {
  searchParams: Promise<{ notice?: string; error?: string }>;
}) {
  await requireAdminAal2();
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: settings }, { data: preview }] = await Promise.all([
    supabase.from("organization_settings").select("*").single(),
    supabase.rpc("retention_preview")
  ]);

  const eligible = Number(preview?.[0]?.eligible_visitors ?? 0);

  return (
    <>
      <header className="page-header">
        <div>
          <h1>Privacy and retention</h1>
          <p>Retention periods require documented church approval and applicable-jurisdiction review.</p>
        </div>
      </header>
      <Notice message={params.notice} kind="success" />
      <Notice message={params.error} kind="error" />

      <div className="grid grid-2">
        <section className="card">
          <h2>Retention configuration</h2>
          <form action={updateRetentionSettingsAction}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="visitorRetentionMonths">Visitor records (months)</label>
                <input id="visitorRetentionMonths" name="visitorRetentionMonths" type="number" min={1} max={120} defaultValue={settings?.visitor_retention_months ?? 24} required />
              </div>
              <div className="field">
                <label htmlFor="contactRetentionMonths">Optional contact (months)</label>
                <input id="contactRetentionMonths" name="contactRetentionMonths" type="number" min={1} max={120} defaultValue={settings?.contact_retention_months ?? 12} required />
              </div>
              <div className="field">
                <label htmlFor="attendanceRetentionMonths">Attendance (months)</label>
                <input id="attendanceRetentionMonths" name="attendanceRetentionMonths" type="number" min={1} max={120} defaultValue={settings?.attendance_retention_months ?? 36} required />
              </div>
              <div className="field">
                <label htmlFor="auditRetentionMonths">Audit log (months)</label>
                <input id="auditRetentionMonths" name="auditRetentionMonths" type="number" min={6} max={120} defaultValue={settings?.audit_retention_months ?? 24} required />
              </div>
              <div className="field">
                <label htmlFor="notSeenDays">Not-seen report (days)</label>
                <input id="notSeenDays" name="notSeenDays" type="number" min={7} max={730} defaultValue={settings?.not_seen_days ?? 30} required />
              </div>
            </div>
            <label className="checkbox-row">
              <input name="requireServiceAssignment" type="checkbox" defaultChecked={settings?.require_service_assignment ?? true} />
              <span><strong>Require usher assignment for check-in</strong><br /><small className="muted">Recommended for least-privilege operation.</small></span>
            </label>
            <div className="field">
              <SubmitButton className="button button-primary button-full" pendingLabel="Saving…">Save settings</SubmitButton>
            </div>
          </form>
        </section>

        <section className="card danger-zone">
          <h2>Retention workflow</h2>
          <p><strong>{eligible}</strong> visitor record{eligible === 1 ? "" : "s"} currently match the configured anonymization rule.</p>
          <p className="muted small">
            The database replaces identifying fields and records a retention action. Attendance totals remain usable without preserving the visitor’s identity.
          </p>
          <form action={applyRetentionAction}>
            <div className="field">
              <label htmlFor="reason">Approved reason</label>
              <textarea id="reason" name="reason" minLength={10} maxLength={240} required defaultValue="Approved retention period reached." />
            </div>
            <ConfirmSubmitButton
              className="button button-danger button-full"
              pendingLabel="Applying retention…"
              confirmation="Confirm the approved retention action. Eligible records will be deleted or anonymized and cannot be restored through the application."
            >
              Anonymize eligible records
            </ConfirmSubmitButton>
          </form>
        </section>
      </div>

      <section className="card" style={{ marginTop: 18 }}>
        <h2>Privacy notice summary</h2>
        <p><strong>Collected:</strong> name, preferred name, first-visit date, attendance, and optional contact information with consent.</p>
        <p><strong>Purpose:</strong> visitor welcome, duplicate prevention, service check-in, and approved attendance reporting.</p>
        <p><strong>Access:</strong> authorized staff according to assigned roles and services.</p>
        <p><strong>Correction and deletion:</strong> handled by administrators through auditable correction and retention workflows.</p>
      </section>
    </>
  );
}
