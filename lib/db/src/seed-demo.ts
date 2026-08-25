/**
 * Seeds a handful of demo Clients, Users, and AuditLog rows so the portal
 * (Clients/Users/Audit pages) has real data to work against instead of the
 * old in-memory mock arrays. Depends on `seed.ts` having run first (system
 * roles + module/plan catalog). Safe to re-run — every insert is guarded by
 * a lookup on the relevant unique `code` column.
 *
 * There is no tenant/session layer yet, so the API server currently treats
 * CL-0001 (مكتب الصفوة للمحاماة) as *the* client for the Users page — see
 * `getPrimaryClientId()` in artifacts/api-server/src/routes/portal.ts.
 */
import { and, eq, isNull } from "drizzle-orm";
import { db, pool } from "./index";
import {
  auditLogs,
  clientLimits,
  clientModules,
  clients,
  modules,
  plans,
  roles,
  users,
} from "./schema";

const NO_LOGIN_PLACEHOLDER = "NOT_SET_PENDING_INVITE_ACTIVATION";

async function findRoleIdByKey(key: string) {
  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(and(isNull(roles.clientId), eq(roles.key, key)))
    .limit(1);
  if (!role) throw new Error(`System role not found: ${key}. Run seed.ts first.`);
  return role.id;
}

async function findPlanIdByKey(key: string) {
  const [plan] = await db.select({ id: plans.id }).from(plans).where(eq(plans.key, key)).limit(1);
  if (!plan) throw new Error(`Plan not found: ${key}. Run seed.ts first.`);
  return plan.id;
}

async function findModuleIdByKey(key: string) {
  const [module_] = await db.select({ id: modules.id }).from(modules).where(eq(modules.key, key)).limit(1);
  if (!module_) throw new Error(`Module not found: ${key}. Run seed.ts first.`);
  return module_.id;
}

async function upsertClient(input: {
  code: string;
  name: string;
  legalName: string | null;
  planKey: string;
  status: "TRIAL" | "ACTIVE" | "SUSPENDED" | "CANCELLED";
}) {
  const [existing] = await db.select().from(clients).where(eq(clients.code, input.code)).limit(1);
  if (existing) return existing;

  const planId = await findPlanIdByKey(input.planKey);
  const [client] = await db
    .insert(clients)
    .values({ code: input.code, name: input.name, legalName: input.legalName, planId, status: input.status })
    .returning();

  await db.insert(clientLimits).values({ clientId: client.id, maxPrivilegedUsers: 5, maxSubClientUsers: 10 });

  const litigationModuleId = await findModuleIdByKey("litigation");
  await db.insert(clientModules).values({ clientId: client.id, moduleId: litigationModuleId, enabled: true });

  return client;
}

async function upsertUser(input: {
  clientId: string;
  code: string;
  email: string;
  fullName: string;
  roleKey: string;
  accountType: "PRIVILEGED" | "STANDARD" | "SUB_CLIENT";
  isPrimaryAdmin?: boolean;
  status: "INVITED" | "ACTIVE" | "DISABLED" | "LOCKED";
  lastLoginAt?: Date;
}) {
  const [existing] = await db.select().from(users).where(eq(users.code, input.code)).limit(1);
  if (existing) return existing;

  const roleId = await findRoleIdByKey(input.roleKey);
  const [user] = await db
    .insert(users)
    .values({
      clientId: input.clientId,
      code: input.code,
      email: input.email,
      passwordHash: NO_LOGIN_PLACEHOLDER,
      fullName: input.fullName,
      accountType: input.accountType,
      isPrimaryAdmin: input.isPrimaryAdmin ?? false,
      status: input.status,
      roleId,
      lastLoginAt: input.lastLoginAt,
    })
    .returning();

  return user;
}

async function logAudit(input: {
  clientId: string;
  userId?: string;
  entityType: string;
  entityId: string;
  action: (typeof auditLogs.$inferInsert)["action"];
  message: string;
  createdAt?: Date;
}) {
  await db.insert(auditLogs).values({
    clientId: input.clientId,
    userId: input.userId ?? null,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    newValue: { message: input.message },
    createdAt: input.createdAt,
  });
}

async function main() {
  const alSafwa = await upsertClient({
    code: "CL-0001",
    name: "مكتب الصفوة للمحاماة",
    legalName: "شركة الصفوة للمحاماة والاستشارات القانونية",
    planKey: "enterprise",
    status: "ACTIVE",
  });

  await upsertClient({
    code: "CL-0002",
    name: "مجموعة النخبة القانونية",
    legalName: "النخبة للمحاماة",
    planKey: "professional",
    status: "ACTIVE",
  });

  await upsertClient({
    code: "CL-0003",
    name: "شركة المدار القابضة",
    legalName: null,
    planKey: "enterprise",
    status: "TRIAL",
  });

  const sara = await upsertUser({
    clientId: alSafwa.id,
    code: "US-0001",
    email: "sara@alsafwa.legal",
    fullName: "سارة العتيبي",
    roleKey: "client_admin",
    accountType: "PRIVILEGED",
    isPrimaryAdmin: true,
    status: "ACTIVE",
    lastLoginAt: new Date(Date.now() - 4 * 60 * 1000),
  });

  const khalid = await upsertUser({
    clientId: alSafwa.id,
    code: "US-0002",
    email: "khalid@alsafwa.legal",
    fullName: "خالد الزهراني",
    roleKey: "litigation_manager",
    accountType: "PRIVILEGED",
    status: "ACTIVE",
    lastLoginAt: new Date(Date.now() - 18 * 60 * 1000),
  });

  const noura = await upsertUser({
    clientId: alSafwa.id,
    code: "US-0003",
    email: "noura@alsafwa.legal",
    fullName: "نورة الحربي",
    roleKey: "lawyer",
    accountType: "STANDARD",
    status: "ACTIVE",
    lastLoginAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
  });

  await upsertUser({
    clientId: alSafwa.id,
    code: "US-0004",
    email: "ahmad@example.com",
    fullName: "أحمد المطيري",
    roleKey: "standard_user",
    accountType: "STANDARD",
    status: "INVITED",
  });

  await logAudit({
    clientId: alSafwa.id,
    userId: sara.id,
    entityType: "User",
    entityId: khalid.id,
    action: "PERMISSION_CHANGE",
    message: "تم تحديث صلاحيات خالد الزهراني",
    createdAt: new Date(Date.now() - 10 * 60 * 1000),
  });

  await logAudit({
    clientId: alSafwa.id,
    userId: noura.id,
    entityType: "Attachment",
    entityId: noura.id,
    action: "DOCUMENT_UPLOAD",
    message: "تم رفع مذكرة الرد على الدعوى",
    createdAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
  });

  await logAudit({
    clientId: alSafwa.id,
    userId: sara.id,
    entityType: "User",
    entityId: sara.id,
    action: "CREATE",
    message: "تم إرسال دعوة إلى أحمد المطيري",
    createdAt: new Date(Date.now() - 22 * 60 * 60 * 1000),
  });
}

main()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log("Demo data seed complete.");
  })
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error("Demo seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
