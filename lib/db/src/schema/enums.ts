import { pgEnum } from "drizzle-orm/pg-core";

export const clientStatusEnum = pgEnum("client_status", [
  "TRIAL",
  "ACTIVE",
  "SUSPENDED",
  "CANCELLED",
]);

export const userAccountTypeEnum = pgEnum("user_account_type", [
  "PRIVILEGED",
  "STANDARD",
  "SUB_CLIENT",
]);

export const accountStatusEnum = pgEnum("account_status", [
  "INVITED",
  "ACTIVE",
  "DISABLED",
  "LOCKED",
]);

export const partyTypeEnum = pgEnum("party_type", ["INDIVIDUAL", "ORGANIZATION"]);

export const privacyModeEnum = pgEnum("privacy_mode", [
  "ALL_AUTHORIZED",
  "SPECIFIC_USERS",
]);

export const legalMatterOriginEnum = pgEnum("legal_matter_origin", [
  "DIRECT",
  "SUB_CLIENT_REQUEST",
]);

export const requestStatusEnum = pgEnum("request_status", [
  "NEW",
  "UNDER_REVIEW",
  "NEED_MORE_INFO",
  "ACCEPTED",
  "REJECTED",
]);

export const litigantCapacityEnum = pgEnum("litigant_capacity", [
  "CLAIMANT",
  "DEFENDANT",
]);

export const litigationStageTypeEnum = pgEnum("litigation_stage_type", [
  "FIRST_INSTANCE",
  "APPEAL",
  "SUPREME_COURT",
  "ENFORCEMENT",
]);

export const assignmentTypeEnum = pgEnum("assignment_type", [
  "REQUESTED_BY",
  "ASSIGNED_PERSON",
  "ASSIGNED_TEAM",
]);

export const permissionOverrideEffectEnum = pgEnum("permission_override_effect", [
  "GRANT",
  "DENY",
]);

export const customFieldTypeEnum = pgEnum("custom_field_type", [
  "TEXT",
  "LONG_TEXT",
  "NUMBER",
  "CURRENCY",
  "DATE",
  "DATETIME",
  "DROPDOWN",
  "MULTI_SELECT",
  "CHECKBOX",
  "USER_SELECTOR",
  "PARTY_SELECTOR",
  "FILE",
]);

export const auditActionEnum = pgEnum("audit_action", [
  "CREATE",
  "UPDATE",
  "DELETE",
  "LOGIN",
  "LOGOUT",
  "STATUS_CHANGE",
  "PERMISSION_CHANGE",
  "ASSIGNMENT_CHANGE",
  "DOCUMENT_UPLOAD",
  "DOCUMENT_DELETE",
  "PARTY_MERGE",
  "USER_DISABLED",
]);

export const reminderStatusEnum = pgEnum("reminder_status", [
  "PENDING",
  "DONE",
  "DISMISSED",
]);
