import type { ServiceSummary } from "@/types/app";

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
      <button className="button button-secondary" type="submit">Load service</button>
    </form>
  );
}
