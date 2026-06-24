import { createClient } from "@/lib/supabase/server";
import type { ServiceSummary } from "@/types/app";
export async function getAvailableServices(): Promise<ServiceSummary[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("available_services");
  if (error) throw new Error("Available services could not be loaded.");
  return (data ?? []) as ServiceSummary[];
}
export function chooseService(services: readonly ServiceSummary[], requestedId?: string): ServiceSummary | null {
  if (requestedId) {
    const requested = services.find((service) => service.id === requestedId);
    if (requested) return requested;
  }
  return services[0] ?? null;
}
