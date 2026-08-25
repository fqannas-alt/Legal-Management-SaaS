import { boolean, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { actorTrackingColumns, id, softDeleteColumn, timestampColumns } from "./common";
import { accountStatusEnum, clientStatusEnum } from "./enums";

// Platform Owner — deliberately separate from `users` so that `clientId`
// never becomes optional on tenant-owned queries (see foundation blueprint §2/§6).
export const platformUsers = pgTable("platform_users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  fullName: text("full_name").notNull(),
  status: accountStatusEnum("status").notNull().default("ACTIVE"),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  ...timestampColumns(),
});

export const plans = pgTable("plans", {
  id: id(),
  key: text("key").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  ...timestampColumns(),
});

export const clients = pgTable("clients", {
  id: id(),
  code: text("code").notNull().unique(), // CL-0001
  name: text("name").notNull(),
  legalName: text("legal_name"),
  status: clientStatusEnum("status").notNull().default("TRIAL"),
  planId: text("plan_id").references(() => plans.id),
  ...timestampColumns(),
  ...actorTrackingColumns(),
  ...softDeleteColumn(),
});

export const modules = pgTable("modules", {
  id: id(),
  key: text("key").notNull().unique(), // "litigation" | "contracts"
  name: text("name").notNull(),
  description: text("description"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestampColumns(),
});

export const clientModules = pgTable(
  "client_modules",
  {
    id: id(),
    clientId: text("client_id").notNull().references(() => clients.id),
    moduleId: text("module_id").notNull().references(() => modules.id),
    enabled: boolean("enabled").notNull().default(true),
    enabledAt: timestamp("enabled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.clientId, table.moduleId)],
);

export const clientLimits = pgTable("client_limits", {
  id: id(),
  clientId: text("client_id").notNull().unique().references(() => clients.id),
  maxPrivilegedUsers: integer("max_privileged_users").notNull().default(0),
  maxSubClientUsers: integer("max_sub_client_users").notNull().default(0),
  // Standard Users: no cap per requirements.
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
