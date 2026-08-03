export type AppRole = "administrator" | "usher" | "pastor" | "auditor";
export type RoleStatus = "pending" | "approved" | "rejected";
export type PersonType = "visitor" | "member";

export interface UserProfile {
  id: string;
  organization_id: string;
  display_name: string;
  role: AppRole;
  requested_role: AppRole;
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

export interface MemberRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  ministry: string | null;
  joined_date: string | null;
  active: boolean;
  created_at: string;
}

export interface CarePerson {
  person_type: PersonType;
  person_id: string;
  display_name: string;
  contact: string | null;
  subtitle: string;
}

export interface CareNoteRow {
  id: string;
  note_text: string;
  note_type: "care" | "prayer" | "follow_up" | "visit";
  status: "open" | "resolved";
  visibility: "assigned_team" | "pastoral_team" | "administrator";
  created_at: string;
  created_by_name: string;
}

export interface VisitRecordRow {
  id: string;
  outcome: string;
  visited_at: string;
  visited_by_name: string;
}

export interface PastorApplication {
  profile_id: string;
  display_name: string;
  requested_role: AppRole;
  role_status: RoleStatus;
  church_name: string;
  pastor_name: string;
  district: string;
  denomination: string;
  church_phone: string;
  submitted_at: string;
  verification_notes: string | null;
}

export interface ActionResult {
  ok: boolean;
  message: string;
  fieldErrors?: Record<string, string[]>;
}
