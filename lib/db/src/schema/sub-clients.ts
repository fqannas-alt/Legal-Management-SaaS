import { jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { actorTrackingColumns, id, softDeleteColumn, timestampColumns } from "./common";
import { clients } from "./platform";
import { users } from "./users";

export const subClients = pgTable(
  "sub_clients",
  {
    id: id(),
    clientId: text("client_id").notNull().references(() => clients.id),
    code: text("code").notNull(), // SC-0001
    name: text("name").notNull(),
    // Governance/shareholders/bank accounts etc. (original requirements §3).
    // Kept flexible until the detailed Phase 2 scope is approved — see blueprint Assumptions.
    generalInfo: jsonb("general_info"),
    ...timestampColumns(),
    ...actorTrackingColumns(),
    ...softDeleteColumn(),
  },
  (table) => [unique().on(table.clientId, table.code)],
);

export const subClientUserRelations = pgTable(
  "sub_client_user_relations",
  {
    id: id(),
    subClientId: text("sub_client_id").notNull().references(() => subClients.id),
    userId: text("user_id").notNull().references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.subClientId, table.userId)],
);
