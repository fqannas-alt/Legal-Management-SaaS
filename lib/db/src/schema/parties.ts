import { type AnyPgColumn, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { actorTrackingColumns, id, softDeleteColumn, timestampColumns } from "./common";
import { partyTypeEnum, privacyModeEnum } from "./enums";
import { clients } from "./platform";
import { subClients } from "./sub-clients";

export const partyCategories = pgTable(
  "party_categories",
  {
    id: id(),
    clientId: text("client_id").notNull().references(() => clients.id),
    name: text("name").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [unique().on(table.clientId, table.name)],
);

export const partySubcategories = pgTable(
  "party_subcategories",
  {
    id: id(),
    categoryId: text("category_id").notNull().references(() => partyCategories.id),
    name: text("name").notNull(),
  },
  (table) => [unique().on(table.categoryId, table.name)],
);

export const parties = pgTable(
  "parties",
  {
    id: id(),
    clientId: text("client_id").notNull().references(() => clients.id),
    code: text("code").notNull(), // PT-0001
    type: partyTypeEnum("type").notNull(),
    displayName: text("display_name").notNull(),
    categoryId: text("category_id").references(() => partyCategories.id),
    subcategoryId: text("subcategory_id").references(() => partySubcategories.id),
    // Link/convert to a Sub-Client without losing historical data (original requirements §14).
    linkedSubClientId: text("linked_sub_client_id").references(() => subClients.id),
    privacyMode: privacyModeEnum("privacy_mode").notNull().default("ALL_AUTHORIZED"),
    // Merge Parties (§12) — preserves merge trail instead of deleting.
    mergedIntoId: text("merged_into_id").references((): AnyPgColumn => parties.id),
    ...timestampColumns(),
    ...actorTrackingColumns(),
    ...softDeleteColumn(),
  },
  (table) => [unique().on(table.clientId, table.code)],
);

export const partyIndividualProfiles = pgTable("party_individual_profiles", {
  id: id(),
  partyId: text("party_id").notNull().unique().references(() => parties.id),
  firstName: text("first_name"),
  lastName: text("last_name"),
  nationalId: text("national_id"),
  nationality: text("nationality"),
  dateOfBirth: timestamp("date_of_birth", { withTimezone: true }),
  phone: text("phone"),
  email: text("email"),
});

export const partyOrganizationProfiles = pgTable("party_organization_profiles", {
  id: id(),
  partyId: text("party_id").notNull().unique().references(() => parties.id),
  commercialRegistration: text("commercial_registration"),
  unifiedNumber: text("unified_number"),
  legalForm: text("legal_form"),
  phone: text("phone"),
  email: text("email"),
});

export const partyRelationships = pgTable("party_relationships", {
  id: id(),
  clientId: text("client_id").notNull().references(() => clients.id),
  fromPartyId: text("from_party_id").notNull().references(() => parties.id),
  toPartyId: text("to_party_id").notNull().references(() => parties.id),
  // "Manager Of" | "Subsidiary Of" | "Legal Representative Of" ...
  // Free-form pending decision: Enum vs. per-client Lookup table (see blueprint Questions §3).
  relationshipType: text("relationship_type").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  createdById: text("created_by_id"),
});
