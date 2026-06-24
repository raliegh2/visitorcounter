export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];
export type AppRole = "administrator" | "usher" | "auditor";
export type RetentionActionType = "contact_purged" | "visitor_anonymized" | "attendance_deleted" | "manual_deletion";

type OrganizationRow={id:string;name:string;created_at:string};
type UserProfileRow={id:string;organization_id:string;display_name:string;role:AppRole;active:boolean;auth_not_before:string;created_at:string;updated_at:string};
type OrganizationSettingsRow={organization_id:string;visitor_retention_months:number;contact_retention_months:number;attendance_retention_months:number;audit_retention_months:number;not_seen_days:number;require_service_assignment:boolean;updated_at:string;updated_by:string|null};
type VisitorRow={id:string;organization_id:string;full_name:string;preferred_name:string|null;first_visit_date:string;optional_contact:string|null;contact_consent:boolean;active:boolean;anonymized_at:string|null;created_at:string;updated_at:string;created_by:string};
type ServiceRow={id:string;organization_id:string;service_name:string;service_date:string;start_time:string;active:boolean;created_by:string;created_at:string;updated_at:string};
type ServiceAssignmentRow={organization_id:string;service_id:string;user_id:string;assigned_by:string;created_at:string};
type AttendanceRow={id:string;organization_id:string;visitor_id:string;service_id:string;checked_in_at:string;checked_in_by:string;created_at:string;voided_at:string|null;voided_by:string|null;void_reason:string|null};
type AuditLogRow={id:string;organization_id:string;actor_user_id:string|null;action:string;resource_type:string;resource_id:string|null;event_timestamp:string;outcome:string;safe_metadata:Json};
type RetentionActionRow={id:string;organization_id:string;action_type:RetentionActionType;visitor_id:string|null;performed_by:string;performed_at:string;reason:string};

export type Database={public:{
  Tables:{
    organizations:{Row:OrganizationRow;Insert:{id?:string;name:string;created_at?:string};Update:Partial<OrganizationRow>;Relationships:[]};
    user_profiles:{Row:UserProfileRow;Insert:{id:string;organization_id:string;display_name:string;role?:AppRole;active?:boolean;auth_not_before?:string;created_at?:string;updated_at?:string};Update:Partial<UserProfileRow>;Relationships:[]};
    organization_settings:{Row:OrganizationSettingsRow;Insert:{organization_id:string;visitor_retention_months?:number;contact_retention_months?:number;attendance_retention_months?:number;audit_retention_months?:number;not_seen_days?:number;require_service_assignment?:boolean;updated_at?:string;updated_by?:string|null};Update:Partial<OrganizationSettingsRow>;Relationships:[]};
    visitors:{Row:VisitorRow;Insert:{id?:string;organization_id:string;full_name:string;preferred_name?:string|null;first_visit_date:string;optional_contact?:string|null;contact_consent?:boolean;active?:boolean;anonymized_at?:string|null;created_at?:string;updated_at?:string;created_by:string};Update:Partial<VisitorRow>;Relationships:[]};
    services:{Row:ServiceRow;Insert:{id?:string;organization_id:string;service_name:string;service_date:string;start_time:string;active?:boolean;created_by:string;created_at?:string;updated_at?:string};Update:Partial<ServiceRow>;Relationships:[]};
    service_assignments:{Row:ServiceAssignmentRow;Insert:ServiceAssignmentRow;Update:Partial<ServiceAssignmentRow>;Relationships:[]};
    attendance:{Row:AttendanceRow;Insert:{id?:string;organization_id:string;visitor_id:string;service_id:string;checked_in_at?:string;checked_in_by:string;created_at?:string;voided_at?:string|null;voided_by?:string|null;void_reason?:string|null};Update:Partial<AttendanceRow>;Relationships:[]};
    audit_logs:{Row:AuditLogRow;Insert:{id?:string;organization_id:string;actor_user_id?:string|null;action:string;resource_type:string;resource_id?:string|null;event_timestamp?:string;outcome:string;safe_metadata?:Json};Update:never;Relationships:[]};
    retention_actions:{Row:RetentionActionRow;Insert:{id?:string;organization_id:string;action_type:RetentionActionType;visitor_id?:string|null;performed_by:string;performed_at?:string;reason:string};Update:never;Relationships:[]};
  };
  Views:Record<string,never>;
  Functions:{
    available_services:{Args:Record<PropertyKey,never>;Returns:Array<{id:string;service_name:string;service_date:string;start_time:string;active:boolean;assigned:boolean}>};
    search_visitors:{Args:{p_query:string;p_service_id:string};Returns:Array<{id:string;full_name:string;preferred_name:string|null;first_visit_date:string;last_seen_date:string|null;already_checked_in:boolean}>};
    register_visitor_and_check_in:{Args:{p_full_name:string;p_preferred_name:string|null;p_first_visit_date:string;p_optional_contact:string|null;p_contact_consent:boolean;p_service_id:string};Returns:string};
    check_in_visitor:{Args:{p_visitor_id:string;p_service_id:string};Returns:string};
    current_attendance:{Args:{p_service_id:string};Returns:Array<{attendance_id:string;visitor_id:string;display_name:string;visitor_type:string;checked_in_at:string;checked_in_by_name:string;voided_at:string|null}>};
    dashboard_metrics:{Args:{p_service_id:string};Returns:Array<{attending:number;first_time:number;returning:number;visitor_records:number}>};
    create_service:{Args:{p_service_name:string;p_service_date:string;p_start_time:string};Returns:string};
    set_service_assignment:{Args:{p_service_id:string;p_user_id:string;p_assigned:boolean};Returns:undefined};
    attendance_summary:{Args:{p_from:string;p_to:string};Returns:Array<{service_id:string;service_name:string;service_date:string;total_attendance:number;first_time_visitors:number;returning_visitors:number}>};
    export_attendance:{Args:{p_from:string;p_to:string};Returns:Array<{service_date:string;service_name:string;visitor_record_id:string;full_name:string;preferred_name:string|null;optional_contact:string|null;checked_in_at:string;visitor_type:string}>};
    correct_attendance:{Args:{p_attendance_id:string;p_reason:string};Returns:undefined};
    set_user_role:{Args:{p_user_id:string;p_role:AppRole};Returns:undefined};
    set_user_active:{Args:{p_user_id:string;p_active:boolean};Returns:undefined};
    update_organization_settings:{Args:{p_visitor_retention_months:number;p_contact_retention_months:number;p_attendance_retention_months:number;p_audit_retention_months:number;p_not_seen_days:number;p_require_service_assignment:boolean};Returns:undefined};
    retention_preview:{Args:Record<PropertyKey,never>;Returns:Array<{eligible_visitors:number;eligible_contact_records:number;eligible_attendance_records:number}>};
    apply_visitor_retention:{Args:{p_reason:string};Returns:number};
    record_admin_event:{Args:{p_action:string;p_resource_type:string;p_resource_id:string|null;p_outcome:string;p_safe_metadata?:Json};Returns:undefined};
  };
  Enums:{app_role:AppRole;retention_action_type:RetentionActionType};
  CompositeTypes:Record<string,never>;
}};
