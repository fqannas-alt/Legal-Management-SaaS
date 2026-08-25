import { boolean, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { actorTrackingColumns, id, softDeleteColumn, timestampColumns } from "./common";
import { accountStatusEnum, permissionOverrideEffectEnum, userAccountTypeEnum } from "./enums";
import { clients } from "./platform";

export const roles = pgTable(
  "roles",
  {
    id: id(),
    clientId: text("client_id").references(() => clients.id), // null = system template
    key: text("key").notNull(), // "client_admin" | "lawyer" | ...
    name: text("name").notNull(),
    isSystem: boolean("is_system").notNull().default(false),
    ...timestampColumns(),
  },
  (table) => [unique().on(table.clientId, table.key)],
);

export const users = pgTable(
  "users",
  {
    id: id(),
    clientId: text("client_id").notNull().references(() => clients.id),
    code: text("code").notNull(), // US-0001
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    accountType: userAccountTypeEnum("account_type").notNull(),
    isPrimaryAdmin: boolean("is_primary_admin").notNull().default(false),
    status: accountStatusEnum("status").notNull().default("INVITED"),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    roleId: text("role_id").notNull().references(() => roles.id),
    ...timestampColumns(),
    ...actorTrackingColumns(),
    ...softDeleteColumn(),
  },
  // Scoped per-client, not global — see foundation blueprint Questions §1.
  (table) => [unique().on(table.clientId, table.email), unique().on(table.clientId, table.code)],
);

export const permissions = pgTable("permissions", {
  id: id(),
  key: text("key").notNull().unique(), // "litigation.case.view"
  moduleKey: text("module_key").notNull(), // "core" | "party" | "legal_matter" | "litigation" | ...
  resource: text("resource").notNull(), // "case"
  action: text("action").notNull(), // "view" | "create" | "edit" | "delete" | "assign" | "approve" | "export" | "manage_users" | "manage_settings" | "view_reports"
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    id: id(),
    roleId: text("role_id").notNull().references(() => roles.id),
    permissionId: text("permission_id").notNull().references(() => permissions.id),
  },
  (table) => [unique().on(table.roleId, table.permissionId)],
);

export const userPermissionOverrides = pgTable(
  "user_permission_overrides",
  {
    id: id(),
    userId: text("user_id").notNull().references(() => users.id),
    permissionId: text("permission_id").notNull().references(() => permissions.id),
    effect: permissionOverrideEffectEnum("effect").notNull(),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    createdById: text("created_by_id"),
  },
  (table) => [unique().on(table.userId, table.permissionId)],
);

export const teams = pgTable("teams", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  ...timestampColumns(),
  ...softDeleteColumn(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    id: id(),
    teamId: text("team_id").notNull().references(() => teams.id),
    userId: text("user_id").notNull().references(() => users.id),
  },
  (table) => [unique().on(table.teamId, table.userId)],
);
