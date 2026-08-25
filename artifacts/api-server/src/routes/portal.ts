import { Router, type IRouter } from "express";
import { and, desc, eq, ilike, inArray, isNull, or } from "drizzle-orm";
import {
  accountStatusEnum,
  auditLogs,
  clientLimits,
  clientModules,
  clients,
  clientStatusEnum,
  db,
  modules,
  plans,
  roles,
  sessions,
  userAccountTypeEnum,
  users,
} from "@workspace/db";
import {
  CreateClientBody,
  CreateUserBody,
  GetClientParams,
  UpdateClientBody,
  UpdateClientParams,
  UpdateUserBody,
  UpdateUserParams,
  GetDashboardSummaryResponse,
  ListClientsResponse,
  ListUsersResponse,
  ListAuditLogsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

// No tenant/session layer yet (Auth.js integration is still pending — see
// FOUNDATION-BLUEPRINT.md §12). Until then the Users page operates against a
// single fixed demo client, seeded by `pnpm --filter @workspace/db run seed:demo`.
async function getPrimaryClientId(): Promise<string> {
  const [row] = await db.select({ id: clients.id }).from(clients).where(eq(clients.code, "CL-0001")).limit(1);
  if (!row) {
    throw new Error("Demo client CL-0001 not found. Run `pnpm --filter @workspace/db run seed:demo` first.");
  }
  return row.id;
}

// Not concurrency-safe — a placeholder until the NumberingSequence engine
// (SELECT ... FOR UPDATE, see blueprint §9) is implemented as a real service.
async function nextClientCode(): Promise<string> {
  const rows = await db.select({ id: clients.id }).from(clients);
  return `CL-${String(rows.length + 1).padStart(4, "0")}`;
}

async function nextUserCode(): Promise<string> {
  const rows = await db.select({ id: users.id }).from(users);
  return `US-${String(rows.length + 1).padStart(4, "0")}`;
}

function initialsOf(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("");
}

async function serializeClient(client: typeof clients.$inferSelect) {
  const [planRow, moduleRows, userRows] = await Promise.all([
    client.planId ? db.select({ name: plans.name }).from(plans).where(eq(plans.id, client.planId)).limit(1) : Promise.resolve([]),
    db
      .select({ key: modules.key })
      .from(clientModules)
      .innerJoin(modules, eq(clientModules.moduleId, modules.id))
      .where(and(eq(clientModules.clientId, client.id), eq(clientModules.enabled, true))),
    db.select({ id: users.id }).from(users).where(eq(users.clientId, client.id)),
  ]);

  return {
    id: client.id,
    referenceNo: client.code,
    name: client.name,
    legalName: client.legalName,
    plan: planRow[0]?.name ?? "—",
    status: client.status,
    users: userRows.length,
    enabledModules: moduleRows.map((row) => row.key),
    createdAt: client.createdAt.toISOString().slice(0, 10),
  };
}

async function serializeUser(user: typeof users.$inferSelect) {
  const [role] = await db.select({ name: roles.name }).from(roles).where(eq(roles.id, user.roleId)).limit(1);

  return {
    id: user.id,
    referenceNo: user.code,
    name: user.fullName,
    email: user.email,
    role: role?.name ?? "—",
    userType: user.accountType,
    status: user.status,
    // Sub-Clients aren't wired into the portal yet — see foundation blueprint Milestone 2.
    subClient: null,
    lastActive: user.lastLoginAt ? user.lastLoginAt.toISOString() : "لم يسجل الدخول",
    initials: initialsOf(user.fullName),
  };
}

const AUDIT_ACTION_LABELS: Record<string, string> = {
  CREATE: "إنشاء",
  UPDATE: "تعديل",
  DELETE: "حذف",
  LOGIN: "تسجيل دخول",
  LOGOUT: "تسجيل خروج",
  STATUS_CHANGE: "تغيير حالة",
  PERMISSION_CHANGE: "تعديل صلاحيات",
  ASSIGNMENT_CHANGE: "تغيير تكليف",
  DOCUMENT_UPLOAD: "رفع مستند",
  DOCUMENT_DELETE: "حذف مستند",
  PARTY_MERGE: "دمج طرف",
  USER_DISABLED: "تعطيل مستخدم",
};

const AUDIT_ENTITY_LABELS: Record<string, string> = {
  Client: "عميل",
  User: "مستخدم",
  Role: "دور",
  Party: "طرف",
  LegalMatter: "ملف قانوني",
  LitigationCase: "قضية",
  Attachment: "مستند",
};

router.get("/dashboard/summary", (_req, res) => {
  // Not wired to real data yet — LegalMatter/LitigationCase/Reminder aren't
  // populated in this pass (scope was Clients + Users + Audit only).
  res.json(GetDashboardSummaryResponse.parse({
    openMatters: 42,
    openCases: 18,
    upcomingHearings: 7,
    pendingRequests: 5,
    upcomingDeadlines: 12,
    recentActivity: [
      { id: "1", title: "تم تحديث صلاحيات مستخدم", description: "سارة العتيبي عدّلت صلاحيات خالد الزهراني", time: "منذ 4 دقائق", type: "permission" },
      { id: "2", title: "تم إنشاء ملف قانوني", description: "الملف LM-0018 — نزاع تجاري", time: "منذ ساعة", type: "matter" },
      { id: "3", title: "موعد جلسة قادم", description: "القضية LC-0007 — المحكمة التجارية", time: "غدًا، 10:00 ص", type: "hearing" },
      { id: "4", title: "طلب خدمة جديد", description: "طلب استشارة من شركة المدار القابضة", time: "منذ 3 ساعات", type: "request" },
    ],
  }));
});

router.get("/clients", async (req, res) => {
  const search = String(req.query.search ?? "").trim();
  const status = String(req.query.status ?? "").trim();

  const rows = await db
    .select()
    .from(clients)
    .where(
      and(
        search ? or(ilike(clients.name, `%${search}%`), ilike(clients.code, `%${search}%`)) : undefined,
        status ? eq(clients.status, status as (typeof clientStatusEnum.enumValues)[number]) : undefined,
      ),
    )
    .orderBy(desc(clients.createdAt));

  const result = await Promise.all(rows.map(serializeClient));
  res.json(ListClientsResponse.parse(result));
});

router.post("/clients", async (req, res) => {
  const input = CreateClientBody.parse(req.body);

  const allPlans = await db.select().from(plans);
  const plan = allPlans.find(
    (p) => p.key.toLowerCase() === input.plan.toLowerCase() || p.name.toLowerCase() === input.plan.toLowerCase(),
  );
  if (!plan) {
    res.status(400).json({ error: `Unknown plan: ${input.plan}` });
    return;
  }

  const code = await nextClientCode();
  const [client] = await db
    .insert(clients)
    .values({ code, name: input.name, legalName: input.legalName ?? null, status: "TRIAL", planId: plan.id })
    .returning();

  await db.insert(clientLimits).values({ clientId: client.id, maxPrivilegedUsers: 5, maxSubClientUsers: 10 });

  const requestedModuleKeys = input.enabledModules ?? [];
  if (requestedModuleKeys.length) {
    const moduleRows = await db.select().from(modules).where(inArray(modules.key, requestedModuleKeys));
    if (moduleRows.length) {
      await db.insert(clientModules).values(moduleRows.map((m) => ({ clientId: client.id, moduleId: m.id, enabled: true })));
    }
  }

  await db.insert(auditLogs).values({
    clientId: client.id,
    entityType: "Client",
    entityId: client.id,
    action: "CREATE",
    newValue: { message: `تم إنشاء العميل ${client.name}` },
  });

  res.status(201).json(await serializeClient(client));
});

router.get("/clients/:clientId", async (req, res) => {
  const params = GetClientParams.parse(req.params);
  const [client] = await db.select().from(clients).where(eq(clients.id, params.clientId)).limit(1);
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(await serializeClient(client));
});

router.patch("/clients/:clientId", async (req, res) => {
  const params = UpdateClientParams.parse(req.params);
  const input = UpdateClientBody.parse(req.body);

  const [existing] = await db.select().from(clients).where(eq(clients.id, params.clientId)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  let planId = existing.planId;
  if (input.plan) {
    const allPlans = await db.select().from(plans);
    const plan = allPlans.find(
      (p) => p.key.toLowerCase() === input.plan!.toLowerCase() || p.name.toLowerCase() === input.plan!.toLowerCase(),
    );
    if (!plan) {
      res.status(400).json({ error: `Unknown plan: ${input.plan}` });
      return;
    }
    planId = plan.id;
  }

  const [updated] = await db
    .update(clients)
    .set({
      name: input.name ?? undefined,
      legalName: input.legalName ?? undefined,
      status: input.status ? (input.status as (typeof clientStatusEnum.enumValues)[number]) : undefined,
      planId,
    })
    .where(eq(clients.id, params.clientId))
    .returning();

  if (input.enabledModules) {
    await db.delete(clientModules).where(eq(clientModules.clientId, updated.id));
    const moduleRows = await db.select().from(modules).where(inArray(modules.key, input.enabledModules));
    if (moduleRows.length) {
      await db.insert(clientModules).values(moduleRows.map((m) => ({ clientId: updated.id, moduleId: m.id, enabled: true })));
    }
  }

  await db.insert(auditLogs).values({
    clientId: updated.id,
    entityType: "Client",
    entityId: updated.id,
    action: "UPDATE",
    newValue: { message: `تم تحديث بيانات العميل ${updated.name}` },
  });

  res.json(await serializeClient(updated));
});

router.get("/users", async (req, res) => {
  const search = String(req.query.search ?? "").trim();
  const status = String(req.query.status ?? "").trim();
  const primaryClientId = await getPrimaryClientId();

  const rows = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.clientId, primaryClientId),
        search ? or(ilike(users.fullName, `%${search}%`), ilike(users.email, `%${search}%`), ilike(users.code, `%${search}%`)) : undefined,
        status ? eq(users.status, status as (typeof accountStatusEnum.enumValues)[number]) : undefined,
      ),
    )
    .orderBy(desc(users.createdAt));

  const result = await Promise.all(rows.map(serializeUser));
  res.json(ListUsersResponse.parse(result));
});

router.post("/users", async (req, res) => {
  const input = CreateUserBody.parse(req.body);
  const primaryClientId = await getPrimaryClientId();

  const [role] = await db.select().from(roles).where(and(isNull(roles.clientId), eq(roles.name, input.role))).limit(1);
  if (!role) {
    res.status(400).json({ error: `Unknown role: ${input.role}` });
    return;
  }

  const validAccountTypes: Array<(typeof userAccountTypeEnum.enumValues)[number]> = ["PRIVILEGED", "STANDARD", "SUB_CLIENT"];
  if (!validAccountTypes.includes(input.userType as (typeof userAccountTypeEnum.enumValues)[number])) {
    res.status(400).json({ error: `Unknown userType: ${input.userType}` });
    return;
  }

  const code = await nextUserCode();
  const [user] = await db
    .insert(users)
    .values({
      clientId: primaryClientId,
      code,
      email: input.email,
      // No login flow yet — placeholder until the invite/activation flow (Auth.js) is built.
      passwordHash: "NOT_SET_PENDING_INVITE_ACTIVATION",
      fullName: input.name,
      accountType: input.userType as (typeof userAccountTypeEnum.enumValues)[number],
      status: "INVITED",
      roleId: role.id,
    })
    .returning();

  await db.insert(auditLogs).values({
    clientId: primaryClientId,
    entityType: "User",
    entityId: user.id,
    action: "CREATE",
    newValue: { message: `تم إرسال دعوة إلى ${user.fullName}` },
  });

  res.status(201).json(await serializeUser(user));
});

router.patch("/users/:userId", async (req, res) => {
  const params = UpdateUserParams.parse(req.params);
  const input = UpdateUserBody.parse(req.body);

  const [existing] = await db.select().from(users).where(eq(users.id, params.userId)).limit(1);
  if (!existing) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  let roleId = existing.roleId;
  if (input.role) {
    const [role] = await db.select().from(roles).where(and(isNull(roles.clientId), eq(roles.name, input.role))).limit(1);
    if (!role) {
      res.status(400).json({ error: `Unknown role: ${input.role}` });
      return;
    }
    roleId = role.id;
  }

  const [updated] = await db
    .update(users)
    .set({
      fullName: input.name ?? undefined,
      roleId,
      status: input.status ? (input.status as (typeof accountStatusEnum.enumValues)[number]) : undefined,
    })
    .where(eq(users.id, params.userId))
    .returning();

  // Disabling a user must revoke sessions immediately — see foundation blueprint §6.
  if (input.status === "DISABLED") {
    await db.delete(sessions).where(eq(sessions.userId, updated.id));
    await db.insert(auditLogs).values({
      clientId: updated.clientId,
      entityType: "User",
      entityId: updated.id,
      action: "USER_DISABLED",
      newValue: { message: `تم تعطيل المستخدم ${updated.fullName}` },
    });
  } else {
    await db.insert(auditLogs).values({
      clientId: updated.clientId,
      entityType: "User",
      entityId: updated.id,
      action: "UPDATE",
      newValue: { message: `تم تحديث بيانات المستخدم ${updated.fullName}` },
    });
  }

  res.json(await serializeUser(updated));
});

router.get("/audit-logs", async (req, res) => {
  const search = String(req.query.search ?? "").toLowerCase();

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      createdAt: auditLogs.createdAt,
      newValue: auditLogs.newValue,
      actorName: users.fullName,
    })
    .from(auditLogs)
    .leftJoin(users, eq(auditLogs.userId, users.id))
    .orderBy(desc(auditLogs.createdAt));

  const mapped = rows.map((row) => ({
    id: row.id,
    user: row.actorName ?? "النظام",
    action: AUDIT_ACTION_LABELS[row.action] ?? row.action,
    entity: AUDIT_ENTITY_LABELS[row.entityType] ?? row.entityType,
    timestamp: row.createdAt.toISOString(),
    description: (row.newValue as { message?: string } | null)?.message ?? "",
  }));

  const result = search
    ? mapped.filter((log) => `${log.user} ${log.action} ${log.entity} ${log.description}`.toLowerCase().includes(search))
    : mapped;

  res.json(ListAuditLogsResponse.parse(result));
});

export default router;
