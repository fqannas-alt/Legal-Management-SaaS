/**
 * Seeds platform-level catalog data that every Client starts from: Modules,
 * Plans, system Roles, and the Permission catalog + each system Role's
 * default grants. Safe to re-run — every insert is guarded against
 * duplicates. Run with `pnpm --filter @workspace/db run seed`.
 */
import { and, eq, isNull } from "drizzle-orm";
import { db, pool } from "./index";
import {
  modules,
  permissions,
  plans,
  rolePermissions,
  roles,
} from "./schema";

// module.resource.action — see foundation blueprint §7.
const PERMISSION_CATALOG: Array<{
  moduleKey: string;
  resource: string;
  action: string;
  description: string;
}> = [
  // core — platform/users/settings, resolves the `client.users.manage` example from the draft.
  { moduleKey: "core", resource: "user", action: "view", description: "View users" },
  { moduleKey: "core", resource: "user", action: "create", description: "Invite users" },
  { moduleKey: "core", resource: "user", action: "edit", description: "Edit users" },
  { moduleKey: "core", resource: "user", action: "delete", description: "Disable users" },
  { moduleKey: "core", resource: "user", action: "manage_users", description: "Manage users, roles, and overrides" },
  { moduleKey: "core", resource: "team", action: "view", description: "View teams" },
  { moduleKey: "core", resource: "team", action: "create", description: "Create teams" },
  { moduleKey: "core", resource: "team", action: "edit", description: "Edit teams" },
  { moduleKey: "core", resource: "team", action: "delete", description: "Delete teams" },
  { moduleKey: "core", resource: "role", action: "view", description: "View roles" },
  { moduleKey: "core", resource: "role", action: "create", description: "Create custom roles" },
  { moduleKey: "core", resource: "role", action: "edit", description: "Edit custom roles" },
  { moduleKey: "core", resource: "role", action: "delete", description: "Delete custom roles" },
  { moduleKey: "core", resource: "settings", action: "view", description: "View client settings" },
  { moduleKey: "core", resource: "settings", action: "manage_settings", description: "Manage client settings" },
  { moduleKey: "core", resource: "report", action: "view_reports", description: "View reports" },
  // party
  { moduleKey: "party", resource: "party", action: "view", description: "View parties" },
  { moduleKey: "party", resource: "party", action: "create", description: "Create parties" },
  { moduleKey: "party", resource: "party", action: "edit", description: "Edit parties" },
  { moduleKey: "party", resource: "party", action: "delete", description: "Delete parties" },
  { moduleKey: "party", resource: "party", action: "export", description: "Export parties" },
  // sub_client
  { moduleKey: "sub_client", resource: "sub_client", action: "view", description: "View sub-clients" },
  { moduleKey: "sub_client", resource: "sub_client", action: "create", description: "Create sub-clients" },
  { moduleKey: "sub_client", resource: "sub_client", action: "edit", description: "Edit sub-clients" },
  { moduleKey: "sub_client", resource: "sub_client", action: "delete", description: "Delete sub-clients" },
  // legal_matter
  { moduleKey: "legal_matter", resource: "matter", action: "view", description: "View legal matters" },
  { moduleKey: "legal_matter", resource: "matter", action: "create", description: "Create legal matters" },
  { moduleKey: "legal_matter", resource: "matter", action: "edit", description: "Edit legal matters" },
  { moduleKey: "legal_matter", resource: "matter", action: "delete", description: "Delete legal matters" },
  { moduleKey: "legal_matter", resource: "matter", action: "assign", description: "Assign legal matters" },
  { moduleKey: "legal_matter", resource: "matter", action: "approve", description: "Approve legal matter status changes" },
  { moduleKey: "legal_matter", resource: "matter", action: "export", description: "Export legal matters" },
  // litigation
  { moduleKey: "litigation", resource: "case", action: "view", description: "View litigation cases" },
  { moduleKey: "litigation", resource: "case", action: "create", description: "Create litigation cases" },
  { moduleKey: "litigation", resource: "case", action: "edit", description: "Edit litigation cases" },
  { moduleKey: "litigation", resource: "case", action: "delete", description: "Delete litigation cases" },
  { moduleKey: "litigation", resource: "case", action: "assign", description: "Assign litigation cases" },
  { moduleKey: "litigation", resource: "case", action: "approve", description: "Approve litigation case decisions" },
  { moduleKey: "litigation", resource: "case", action: "export", description: "Export litigation cases" },
];

const SYSTEM_ROLES = [
  { key: "client_admin", name: "Client Admin" },
  { key: "legal_director", name: "Legal Director" },
  { key: "litigation_manager", name: "Litigation Manager" },
  { key: "contract_manager", name: "Contract Manager" },
  { key: "lawyer", name: "Lawyer" },
  { key: "standard_user", name: "Standard User" },
  { key: "external_user", name: "External User" },
] as const;

// Default permission keys per system role. `client_admin` gets everything.
// These are starting points only — each Client can customize its own copy
// of a role without touching the system template (see blueprint §7).
const ROLE_DEFAULT_PERMISSIONS: Record<string, string[] | "ALL"> = {
  client_admin: "ALL",
  legal_director: [
    "core.report.view_reports",
    "core.team.view",
    "party.party.view",
    "party.party.create",
    "party.party.edit",
    "party.party.export",
    "sub_client.sub_client.view",
    "legal_matter.matter.view",
    "legal_matter.matter.create",
    "legal_matter.matter.edit",
    "legal_matter.matter.assign",
    "legal_matter.matter.approve",
    "legal_matter.matter.export",
    "litigation.case.view",
    "litigation.case.create",
    "litigation.case.edit",
    "litigation.case.assign",
    "litigation.case.approve",
    "litigation.case.export",
  ],
  litigation_manager: [
    "core.team.view",
    "party.party.view",
    "party.party.create",
    "party.party.edit",
    "sub_client.sub_client.view",
    "legal_matter.matter.view",
    "legal_matter.matter.assign",
    "litigation.case.view",
    "litigation.case.create",
    "litigation.case.edit",
    "litigation.case.assign",
    "litigation.case.export",
  ],
  // Contracts module isn't built yet — starts with base visibility only.
  contract_manager: ["party.party.view", "legal_matter.matter.view"],
  lawyer: [
    "party.party.view",
    "party.party.create",
    "party.party.edit",
    "legal_matter.matter.view",
    "legal_matter.matter.edit",
    "litigation.case.view",
    "litigation.case.edit",
  ],
  standard_user: ["party.party.view", "legal_matter.matter.view", "litigation.case.view"],
  external_user: ["litigation.case.view"],
};

const SYSTEM_MODULES = [
  { key: "litigation", name: "Litigation", isActive: true },
  // Reserved boundary — schema/folder structure exists, module not released yet.
  { key: "contracts", name: "Contracts", isActive: false },
] as const;

const SYSTEM_PLANS = [
  { key: "professional", name: "Professional" },
  { key: "enterprise", name: "Enterprise" },
] as const;

async function upsertModules() {
  for (const module of SYSTEM_MODULES) {
    await db.insert(modules).values(module).onConflictDoNothing({ target: modules.key });
  }
}

async function upsertPlans() {
  for (const plan of SYSTEM_PLANS) {
    await db.insert(plans).values(plan).onConflictDoNothing({ target: plans.key });
  }
}

async function upsertPermissions() {
  for (const entry of PERMISSION_CATALOG) {
    const key = `${entry.moduleKey}.${entry.resource}.${entry.action}`;
    await db
      .insert(permissions)
      .values({ key, moduleKey: entry.moduleKey, resource: entry.resource, action: entry.action, description: entry.description })
      .onConflictDoNothing({ target: permissions.key });
  }
}

// System roles have clientId = null, and Postgres unique constraints treat
// NULL as distinct from NULL — the DB-level unique on (clientId, key) will
// NOT stop duplicates here, so we check existence explicitly.
async function upsertSystemRoles() {
  const roleIds: Record<string, string> = {};

  for (const role of SYSTEM_ROLES) {
    const existing = await db
      .select({ id: roles.id })
      .from(roles)
      .where(and(isNull(roles.clientId), eq(roles.key, role.key)))
      .limit(1);

    if (existing[0]) {
      roleIds[role.key] = existing[0].id;
      continue;
    }

    const [inserted] = await db
      .insert(roles)
      .values({ clientId: null, key: role.key, name: role.name, isSystem: true })
      .returning({ id: roles.id });

    roleIds[role.key] = inserted.id;
  }

  return roleIds;
}

async function upsertRolePermissions(roleIds: Record<string, string>) {
  const allPermissionRows = await db.select({ id: permissions.id, key: permissions.key }).from(permissions);
  const permissionIdByKey = new Map(allPermissionRows.map((row) => [row.key, row.id]));

  for (const [roleKey, grant] of Object.entries(ROLE_DEFAULT_PERMISSIONS)) {
    const roleId = roleIds[roleKey];
    if (!roleId) continue;

    const permissionKeys = grant === "ALL" ? [...permissionIdByKey.keys()] : grant;

    for (const permissionKey of permissionKeys) {
      const permissionId = permissionIdByKey.get(permissionKey);
      if (!permissionId) {
        throw new Error(`Unknown permission key in seed data: ${permissionKey}`);
      }

      await db
        .insert(rolePermissions)
        .values({ roleId, permissionId })
        .onConflictDoNothing({ target: [rolePermissions.roleId, rolePermissions.permissionId] });
    }
  }
}

async function main() {
  await upsertModules();
  await upsertPlans();
  await upsertPermissions();
  const roleIds = await upsertSystemRoles();
  await upsertRolePermissions(roleIds);
}

main()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("Seed complete.");
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
