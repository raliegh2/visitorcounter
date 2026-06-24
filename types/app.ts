export type AppRole = "administrator" | "usher" | "auditor";

export interface UserProfile {
  id: string;
  organization_id: string;
  display_name: string;
  role: AppRole;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ServiceSummary {
  id: string;
  service_name: string;
  service_date: string;
  start_time: string;
  active: boolean;
  assigned: boolean;
}

export interface VisitorSearchResult {
  id: string;
  full_name: string;
  preferred_name: string | null;
  first_visit_date: string;
  last_seen_date: string | null;
  already_checked_in: boolean;
}

export interface AttendanceRow {
  attendance_id: string;
  visitor_id: string;
  display_name: string;
  visitor_type: "first-time" | "returning";
  checked_in_at: string;
  checked_in_by_name: string;
  voided_at: string | null;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
}
