export type AppRole = "administrator" | "usher" | "pastor" | "auditor";
export type RoleStatus = "pending" | "approved" | "rejected";

export interface UserProfile {
  id: string;
  organization_id: string;
  display_name: string;
  role: AppRole;
  requested_role: "administrator" | "usher" | "pastor";
  role_status: RoleStatus;
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

export interface MemberSearchResult {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  membership_status: "active" | "inactive" | "prospective";
  last_contact_at: string | null;
  last_visited_at: string | null;
  visit_count: number;
  has_been_visited: boolean;
}

export type CarePersonType = "visitor" | "member";

export interface CarePerson {
  person_type: CarePersonType;
  id: string;
  display_name: string;
  secondary_text: string | null;
  contact_text: string | null;
  last_visited_at: string | null;
  visit_count: number;
}

export interface CareNote {
  id: string;
  note_text: string;
  status: "open" | "in_progress" | "resolved";
  visibility: "assigned_team" | "pastoral_team" | "admin_only";
  created_at: string;
  created_by_name: string;
}

export interface MinistryVisit {
  id: string;
  visited_at: string;
  outcome: "planned" | "attempted" | "completed" | "follow_up_needed";
  summary: string | null;
  visited_by_name: string;
}

export interface RoleRequest {
  user_id: string;
  display_name: string;
  email: string | null;
  requested_role: "administrator" | "usher" | "pastor";
  role_status: RoleStatus;
  church_name: string | null;
  pastor_name: string | null;
  district: string | null;
  denomination: string | null;
  church_phone: string | null;
  submitted_at: string | null;
}

export interface MinistryMetrics {
  visitors: number;
  members: number;
  open_care_needs: number;
  completed_visits: number;
  pending_role_requests: number;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
}
