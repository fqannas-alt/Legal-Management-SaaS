import { check, integer, numeric, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { actorTrackingColumns, id, softDeleteColumn, timestampColumns } from "./common";
import {
  assignmentTypeEnum,
  litigantCapacityEnum,
  litigationStageTypeEnum,
  privacyModeEnum,
  requestStatusEnum,
} from "./enums";
import { legalMatters } from "./legal-matters";
import { parties } from "./parties";
import { clients } from "./platform";
import { subClients } from "./sub-clients";
import { teams, users } from "./users";

export const litigationRequests = pgTable("litigation_requests", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id),
  subClientId: text("sub_client_id").notNull().references(() => subClients.id),
  capacity: litigantCapacityEnum("capacity").notNull(), // Claimant | Defendant
  status: requestStatusEnum("status").notNull().default("NEW"),
  // Defendant path
  noticeType: text("notice_type"), // "pre_litigation_settlement" | "filed_court_case"
  noticeText: text("notice_text"),
  caseNumber: text("case_number"),
  // Claimant path
  title: text("title"),
  details: text("details"),
  claimAmount: numeric("claim_amount", { precision: 18, scale: 2 }),
  technicalContactName: text("technical_contact_name"),
  technicalContactInfo: text("technical_contact_info"),
  financialContactName: text("financial_contact_name"),
  financialContactInfo: text("financial_contact_info"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  createdById: text("created_by_id"),
});

export const litigationCases = pgTable(
  "litigation_cases",
  {
    id: id(),
    clientId: text("client_id").notNull().references(() => clients.id),
    code: text("code").notNull(), // LC-0001
    matterId: text("matter_id").notNull().references(() => legalMatters.id),
    originRequestId: text("origin_request_id").unique().references(() => litigationRequests.id),
    title: text("title").notNull(),
    mainCategory: text("main_category"),
    subcategory: text("subcategory"),
    caseType: text("case_type"),
    courtCaseNumber: text("court_case_number"),
    subClientId: text("sub_client_id").references(() => subClients.id),
    clientCapacity: litigantCapacityEnum("client_capacity"),
    details: text("details"),
    internalRefNumber: text("internal_ref_number"),
    priority: text("priority"),
    privacyMode: privacyModeEnum("privacy_mode").notNull().default("ALL_AUTHORIZED"),
    billingMethod: text("billing_method"),
    billingPaymentMethod: text("billing_payment_method"),
    billingFeeValue: numeric("billing_fee_value", { precision: 18, scale: 2 }),
    ...timestampColumns(),
    ...actorTrackingColumns(),
    ...softDeleteColumn(),
  },
  (table) => [unique().on(table.clientId, table.code)],
);

export const litigationStages = pgTable("litigation_stages", {
  id: id(),
  caseId: text("case_id").notNull().references(() => litigationCases.id),
  stageType: litigationStageTypeEnum("stage_type").notNull(),
  courtName: text("court_name"),
  circuit: text("circuit"),
  caseNumber: text("case_number"),
  sortOrder: integer("sort_order").notNull().default(0),
  openedAt: timestamp("opened_at", { withTimezone: true }),
  closedAt: timestamp("closed_at", { withTimezone: true }),
  ...timestampColumns(),
});

export const caseParties = pgTable(
  "case_parties",
  {
    id: id(),
    caseId: text("case_id").notNull().references(() => litigationCases.id),
    // Unified Selector (§14): either a Party or a SubClient — never both.
    partyId: text("party_id").references(() => parties.id),
    subClientId: text("sub_client_id").references(() => subClients.id),
    roleInCase: text("role_in_case").notNull(), // "Opponent" | ...
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check(
      "case_party_target_xor",
      sql`(("party_id" is not null and "sub_client_id" is null) or ("party_id" is null and "sub_client_id" is not null))`,
    ),
  ],
);

export const caseAssignments = pgTable("case_assignments", {
  id: id(),
  caseId: text("case_id").notNull().references(() => litigationCases.id),
  userId: text("user_id").references(() => users.id),
  teamId: text("team_id").references(() => teams.id),
  assignmentType: assignmentTypeEnum("assignment_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
