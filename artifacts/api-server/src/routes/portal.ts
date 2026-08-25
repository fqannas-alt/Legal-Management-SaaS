import { Router, type IRouter } from "express";
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

type Client = {
  id: string;
  referenceNo: string;
  name: string;
  legalName: string | null;
  plan: string;
  status: string;
  users: number;
  enabledModules: string[];
  createdAt: string;
};

type User = {
  id: string;
  referenceNo: string;
  name: string;
  email: string;
  role: string;
  userType: string;
  status: string;
  subClient: string | null;
  lastActive: string;
  initials: string;
};

const clients: Client[] = [
  {
    id: "cl-0001",
    referenceNo: "CL-0001",
    name: "مكتب الصفوة للمحاماة",
    legalName: "شركة الصفوة للمحاماة والاستشارات القانونية",
    plan: "Enterprise",
    status: "ACTIVE",
    users: 24,
    enabledModules: ["litigation", "matters", "documents"],
    createdAt: "2026-01-14",
  },
  {
    id: "cl-0002",
    referenceNo: "CL-0002",
    name: "مجموعة النخبة القانونية",
    legalName: "النخبة للمحاماة",
    plan: "Professional",
    status: "ACTIVE",
    users: 11,
    enabledModules: ["matters", "documents"],
    createdAt: "2026-03-02",
  },
  {
    id: "cl-0003",
    referenceNo: "CL-0003",
    name: "شركة المدار القابضة",
    legalName: null,
    plan: "Enterprise",
    status: "TRIAL",
    users: 7,
    enabledModules: ["matters"],
    createdAt: "2026-05-21",
  },
];

const users: User[] = [
  { id: "us-0001", referenceNo: "US-0001", name: "سارة العتيبي", email: "sara@alsafwa.legal", role: "Client Admin", userType: "PRIVILEGED", status: "ACTIVE", subClient: null, lastActive: "منذ 4 دقائق", initials: "سع" },
  { id: "us-0002", referenceNo: "US-0002", name: "خالد الزهراني", email: "khalid@alsafwa.legal", role: "Litigation Manager", userType: "PRIVILEGED", status: "ACTIVE", subClient: null, lastActive: "منذ 18 دقيقة", initials: "خز" },
  { id: "us-0003", referenceNo: "US-0003", name: "نورة الحربي", email: "noura@alsafwa.legal", role: "Lawyer", userType: "STANDARD", status: "ACTIVE", subClient: "شركة المدار", lastActive: "أمس", initials: "نح" },
  { id: "us-0004", referenceNo: "US-0004", name: "أحمد المطيري", email: "ahmad@example.com", role: "Standard User", userType: "STANDARD", status: "INVITED", subClient: null, lastActive: "لم يسجل الدخول", initials: "أم" },
];

const auditLogs = [
  { id: "au-001", user: "سارة العتيبي", action: "تعديل", entity: "صلاحيات مستخدم", timestamp: "اليوم، 10:42 ص", description: "تم تحديث صلاحيات خالد الزهراني" },
  { id: "au-002", user: "خالد الزهراني", action: "إنشاء", entity: "ملف قانوني", timestamp: "اليوم، 09:18 ص", description: "تم إنشاء الملف القانوني LM-0018" },
  { id: "au-003", user: "نورة الحربي", action: "رفع", entity: "مستند", timestamp: "أمس، 04:35 م", description: "تم رفع مذكرة الرد على الدعوى" },
  { id: "au-004", user: "سارة العتيبي", action: "دعوة", entity: "مستخدم", timestamp: "أمس، 01:10 م", description: "تم إرسال دعوة إلى أحمد المطيري" },
];

router.get("/dashboard/summary", (_req, res) => {
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

router.get("/clients", (req, res) => {
  const search = String(req.query.search ?? "").toLowerCase();
  const status = String(req.query.status ?? "");
  const result = clients.filter((client) =>
    (!search || `${client.name} ${client.referenceNo}`.toLowerCase().includes(search)) &&
    (!status || client.status === status),
  );
  res.json(ListClientsResponse.parse(result));
});

router.post("/clients", (req, res) => {
  const input = CreateClientBody.parse(req.body);
  const client: Client = {
    id: `cl-${String(clients.length + 1).padStart(4, "0")}`,
    referenceNo: `CL-${String(clients.length + 1).padStart(4, "0")}`,
    name: input.name,
    legalName: input.legalName ?? null,
    plan: input.plan,
    status: "TRIAL",
    users: 0,
    enabledModules: input.enabledModules ?? ["matters"],
    createdAt: new Date().toISOString().slice(0, 10),
  };
  clients.unshift(client);
  res.status(201).json(client);
});

router.get("/clients/:clientId", (req, res) => {
  const params = GetClientParams.parse(req.params);
  const client = clients.find((item) => item.id === params.clientId);
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  res.json(client);
});

router.patch("/clients/:clientId", (req, res) => {
  const params = UpdateClientParams.parse(req.params);
  const input = UpdateClientBody.parse(req.body);
  const client = clients.find((item) => item.id === params.clientId);
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }
  Object.assign(client, input);
  res.json(client);
});

router.get("/users", (req, res) => {
  const search = String(req.query.search ?? "").toLowerCase();
  const status = String(req.query.status ?? "");
  const result = users.filter((user) =>
    (!search || `${user.name} ${user.email} ${user.referenceNo}`.toLowerCase().includes(search)) &&
    (!status || user.status === status),
  );
  res.json(ListUsersResponse.parse(result));
});

router.post("/users", (req, res) => {
  const input = CreateUserBody.parse(req.body);
  const user: User = {
    id: `us-${String(users.length + 1).padStart(4, "0")}`,
    referenceNo: `US-${String(users.length + 1).padStart(4, "0")}`,
    name: input.name,
    email: input.email,
    role: input.role,
    userType: input.userType,
    status: "INVITED",
    subClient: input.subClient ?? null,
    lastActive: "لم يسجل الدخول",
    initials: input.name.split(" ").map((part) => part[0]).slice(0, 2).join(""),
  };
  users.unshift(user);
  res.status(201).json(user);
});

router.patch("/users/:userId", (req, res) => {
  const params = UpdateUserParams.parse(req.params);
  const input = UpdateUserBody.parse(req.body);
  const user = users.find((item) => item.id === params.userId);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  Object.assign(user, input);
  res.json(user);
});

router.get("/audit-logs", (req, res) => {
  const search = String(req.query.search ?? "").toLowerCase();
  const result = auditLogs.filter((log) =>
    !search || `${log.user} ${log.action} ${log.entity} ${log.description}`.toLowerCase().includes(search),
  );
  res.json(ListAuditLogsResponse.parse(result));
});

export default router;