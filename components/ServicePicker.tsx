import type { ServiceSummary } from "@/types/app";
import { SubmitButton } from "@/components/ui/SubmitButton";

export function ServicePicker({
  services,
  selectedId,
  action
}: {
  services: readonly ServiceSummary[];
  selectedId?: string;
  action: string;
}) {
  return (
    <form method="get" action={action} className="actions">
      <label className="sr-only" htmlFor="service">Selected service</label>
      <select id="service" name="service" defaultValue={selectedId}>
        {services.map((service) => (
          <option value={service.id} key={service.id}>
            {service.service_name} — {service.service_date}
          </option>
        ))}
      </select>
      <SubmitButton className="button button-secondary" pendingLabel="Loading…">Load service</SubmitButton>
    </form>
  );
}
