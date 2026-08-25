import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { id } from "./common";
import { platformUsers } from "./platform";
import { users } from "./users";

export const sessions = pgTable("sessions", {
  id: id(),
  sessionToken: text("session_token").notNull().unique(),
  userId: text("user_id").references(() => users.id), // client-tenant user
  platformUserId: text("platform_user_id").references(() => platformUsers.id),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const verificationTokens = pgTable("verification_tokens", {
  id: id(),
  identifier: text("identifier").notNull(), // email
  token: text("token").notNull().unique(),
  purpose: text("purpose").notNull(), // "PASSWORD_RESET" | "INVITE_ACTIVATION"
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
