import { text, timestamp } from "drizzle-orm/pg-core";
import { createId } from "@paralleldrive/cuid2";

/**
 * Non-guessable primary key (cuid2). The human-readable sequence number
 * (CL-0001, US-0001...) is a separate unique `code` column, never the PK.
 */
export const id = () => text("id").primaryKey().$defaultFn(() => createId());

export const timestampColumns = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const softDeleteColumn = () => ({
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

/**
 * Plain text actor references (no Prisma-style relation()) to avoid an
 * explosion of reverse relations on `users` — integrity is enforced in the
 * application layer, same trade-off documented in the foundation blueprint.
 */
export const actorTrackingColumns = () => ({
  createdById: text("created_by_id"),
  updatedById: text("updated_by_id"),
});
