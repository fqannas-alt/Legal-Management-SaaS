import { boolean, integer, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { actorTrackingColumns, id, softDeleteColumn, timestampColumns } from "./common";
import { assignmentTypeEnum, legalMatterOriginEnum, privacyModeEnum } from "./enums";
import { clients } from "./platform";
import { teams, users } from "./users";

export const legalMatterTypes = pgTable(
  "legal_matter_types",
  {
    id: id(),
    clientId: text("client_id").notNull().references(() => clients.id),
    name: text("name").notNull(),
  },
  (table) => [unique().on(table.clientId, table.name)],
);

export const legalMatterCategories = pgTable(
  "legal_matter_categories",
  {
    id: id(),
    clientId: text("client_id").notNull().references(() => clients.id),
    name: text("name").notNull(),
  },
  (table) => [unique().on(table.clientId, table.name)],
);

export const legalMatterSubcategories = pgTable(
  "legal_matter_subcategories",
  {
    id: id(),
    categoryId: text("category_id").notNull().references(() => legalMatterCategories.id),
    name: text("name").notNull(),
  },
  (table) => [unique().on(table.categoryId, table.name)],
);

export const legalMatterStatuses = pgTable(
  "legal_matter_statuses",
  {
    id: id(),
    clientId: text("client_id").notNull().references(() => clients.id),
    key: text("key").notNull(), // "new" | "under_review" | ... (customizable/extendable)
    name: text("name").notNull(),
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (table) => [unique().on(table.clientId, table.key)],
);

export const legalMatters = pgTable(
  "legal_matters",
  {
    id: id(),
    clientId: text("client_id").notNull().references(() => clients.id),
    code: text("code").notNull(), // LM-0001
    title: text("title").notNull(),
    origin: legalMatterOriginEnum("origin").notNull().default("DIRECT"),
    typeId: text("type_id").references(() => legalMatterTypes.id),
    categoryId: text("category_id").references(() => legalMatterCategories.id),
    subcategoryId: text("subcategory_id").references(() => legalMatterSubcategories.id),
    statusId: text("status_id").notNull().references(() => legalMatterStatuses.id),
    privacyMode: privacyModeEnum("privacy_mode").notNull().default("ALL_AUTHORIZED"),
    details: text("details"),
    ...timestampColumns(),
    ...actorTrackingColumns(),
    ...softDeleteColumn(),
  },
  (table) => [unique().on(table.clientId, table.code)],
);

export const legalMatterAssignments = pgTable("legal_matter_assignments", {
  id: id(),
  matterId: text("matter_id").notNull().references(() => legalMatters.id),
  userId: text("user_id").references(() => users.id),
  teamId: text("team_id").references(() => teams.id),
  assignmentType: assignmentTypeEnum("assignment_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const legalMatterTimelineEvents = pgTable("legal_matter_timeline_events", {
  id: id(),
  matterId: text("matter_id").notNull().references(() => legalMatters.id),
  userId: text("user_id").references(() => users.id),
  eventType: text("event_type").notNull(), // "MATTER_CREATED" | "STATUS_CHANGED" | "DOCUMENT_ADDED" | ...
  description: text("description"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
