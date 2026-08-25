import { boolean, index, integer, jsonb, numeric, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { id } from "./common";
import { auditActionEnum, customFieldTypeEnum, privacyModeEnum, reminderStatusEnum } from "./enums";
import { clients } from "./platform";

export const attachments = pgTable(
  "attachments",
  {
    id: id(),
    clientId: text("client_id").notNull().references(() => clients.id),
    entityType: text("entity_type").notNull(), // "Party" | "SubClient" | "LegalMatter" | "LitigationCase" | ...
    entityId: text("entity_id").notNull(),
    fileName: text("file_name").notNull(),
    fileType: text("file_type").notNull(),
    fileSizeBytes: integer("file_size_bytes").notNull(),
    storageKey: text("storage_key").notNull(), // S3-compatible object storage path
    description: text("description"),
    category: text("category"),
    privacyMode: privacyModeEnum("privacy_mode").notNull().default("ALL_AUTHORIZED"),
    uploadedById: text("uploaded_by_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [index("attachments_entity_idx").on(table.entityType, table.entityId)],
);

export const reminders = pgTable(
  "reminders",
  {
    id: id(),
    clientId: text("client_id").notNull().references(() => clients.id),
    entityType: text("entity_type").notNull(), // "Party" | "SubClient" | "LegalMatter" | "LitigationCase"
    entityId: text("entity_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    dueAt: timestamp("due_at", { withTimezone: true }).notNull(),
    assignedToId: text("assigned_to_id"),
    status: reminderStatusEnum("status").notNull().default("PENDING"),
    notifySettings: jsonb("notify_settings"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    createdById: text("created_by_id"),
  },
  (table) => [index("reminders_entity_idx").on(table.entityType, table.entityId)],
);

export const customFieldDefinitions = pgTable(
  "custom_field_definitions",
  {
    id: id(),
    clientId: text("client_id").notNull().references(() => clients.id),
    entityType: text("entity_type").notNull(), // "Party" | "SubClient" | "LegalMatter" | "LitigationCase"
    key: text("key").notNull(),
    label: text("label").notNull(),
    fieldType: customFieldTypeEnum("field_type").notNull(),
    options: jsonb("options"), // DROPDOWN / MULTI_SELECT
    isRequired: boolean("is_required").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.clientId, table.entityType, table.key)],
);

export const customFieldValues = pgTable(
  "custom_field_values",
  {
    id: id(),
    definitionId: text("definition_id").notNull().references(() => customFieldDefinitions.id),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    valueText: text("value_text"),
    valueNumber: numeric("value_number", { precision: 18, scale: 4 }),
    valueDate: timestamp("value_date", { withTimezone: true }),
    valueBoolean: boolean("value_boolean"),
    valueJson: jsonb("value_json"), // Multi Select / File references
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    unique().on(table.definitionId, table.entityId),
    index("custom_field_values_entity_idx").on(table.entityType, table.entityId),
  ],
);

// No relation() to a specific tenant/user table on purpose — this table is
// append-only and extremely high-volume; indexed instead (see blueprint §10).
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    clientId: text("client_id"), // null = platform-level action
    userId: text("user_id"),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    action: auditActionEnum("action").notNull(),
    oldValue: jsonb("old_value"),
    newValue: jsonb("new_value"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("audit_logs_client_entity_idx").on(table.clientId, table.entityType, table.entityId),
    index("audit_logs_created_at_idx").on(table.createdAt),
  ],
);

export const recordAccessGrants = pgTable(
  "record_access_grants",
  {
    id: id(),
    clientId: text("client_id").notNull(),
    entityType: text("entity_type").notNull(), // "Party" | "LegalMatter" | "LitigationCase" | "Attachment" | ...
    entityId: text("entity_id").notNull(),
    userId: text("user_id").notNull(),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    grantedById: text("granted_by_id"),
  },
  (table) => [
    unique().on(table.entityType, table.entityId, table.userId),
    index("record_access_grants_client_entity_idx").on(table.clientId, table.entityType, table.entityId),
  ],
);

export const numberingSequences = pgTable(
  "numbering_sequences",
  {
    id: id(),
    clientId: text("client_id").notNull().references(() => clients.id),
    entityType: text("entity_type").notNull(), // "Client" | "SubClient" | "User" | "Party" | "LegalMatter" | "LitigationCase"
    prefix: text("prefix").notNull(), // "CL" | "SC" | "US" | "PT" | "LM" | "LC"
    padding: integer("padding").notNull().default(4),
    nextValue: integer("next_value").notNull().default(1),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [unique().on(table.clientId, table.entityType)],
);
