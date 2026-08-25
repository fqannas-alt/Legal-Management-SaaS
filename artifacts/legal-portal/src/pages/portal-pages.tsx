import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpLeft,
  BarChart3,
  BookOpen,
  Check,
  Clock3,
  FileCheck2,
  FileText,
  Filter,
  Gavel,
  LoaderCircle,
  LockKeyhole,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  UsersRound,
  X,
} from 'lucide-react';
import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'wouter';
import {
  getGetClientQueryKey,
  getListClientsQueryKey,
  getListUsersQueryKey,
  useCreateClient,
  useCreateUser,
  useGetClient,
  useGetDashboardSummary,
  useListAuditLogs,
  useListClients,
  useListUsers,
  useUpdateClient,
  useUpdateUser,
  type User,
} from '@workspace/api-client-react';

export function DashboardPage() {
  const summaryQuery = useGetDashboardSummary();
  const summary = summaryQuery.data;
  const metrics = [
    { label: 'مسائل مفتوحة', value: summary?.openMatters ?? '—', note: 'تحتاج إلى متابعة', tone: 'teal', icon: FileText },
    { label: 'قضايا قيد النظر', value: summary?.openCases ?? '—', note: 'ضمن محفظة التقاضي', tone: 'navy', icon: Gavel },
    { label: 'جلسات قادمة', value: summary?.upcomingHearings ?? '—', note: 'خلال الثلاثين يوماً', tone: 'gold', icon: Clock3 },
    { label: 'طلبات معلقة', value: summary?.pendingRequests ?? '—', note: 'بانتظار الإجراء', tone: 'coral', icon: FileCheck2 },
  ];

  return (
    <PageFrame eyebrow="مركز القيادة" title="صباح الخير، عبدالله" description="هذه صورة مركزة لما يحتاج انتباه فريقك اليوم.">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">الأحد، ٢٣ يونيو ٢٠٢٤ <span className="mx-2 text-border">•</span> تحديث مباشر</p>
        </div>
        <button type="button" data-testid="button-dashboard-refresh" onClick={() => summaryQuery.refetch()} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:border-primary/25 hover:text-primary">
          <RefreshCw size={14} className={summaryQuery.isFetching ? 'animate-spin' : ''} />
          تحديث البيانات
        </button>
      </div>

      {summaryQuery.isLoading ? <DashboardSkeleton /> : summaryQuery.isError ? <ErrorState onRetry={() => summaryQuery.refetch()} /> : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric, index) => <MetricCard key={metric.label} {...metric} index={index} />)}
          </section>
          <div className="mt-6 grid gap-6 xl:grid-cols-[1.45fr_1fr]">
            <section className="panel-shadow fade-up fade-up-delay-2 rounded-xl border border-card-border bg-card p-5 md:p-6">
              <SectionHeading icon={<ActivityMark />} title="آخر النشاطات" action="عرض سجل التدقيق" href="/audit" />
              <div className="mt-5 divide-y divide-border/70">
                {summary?.recentActivity?.length ? summary.recentActivity.map((activity, index) => (
                  <div key={activity.id} data-testid={`activity-row-${activity.id}`} className="flex items-start gap-3.5 py-4 first:pt-0 last:pb-0">
                    <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${index % 3 === 0 ? 'bg-secondary text-[#347a73]' : index % 3 === 1 ? 'bg-[#f7ecd9] text-[#ae7133]' : 'bg-muted text-primary'}`}>
                      {index % 3 === 0 ? <FileText size={15} /> : index % 3 === 1 ? <UsersRound size={15} /> : <ShieldCheck size={15} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-foreground">{activity.title}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">{activity.description}</p>
                    </div>
                    <time className="shrink-0 text-[11px] text-muted-foreground/75">{activity.time}</time>
                  </div>
                )) : <EmptyState compact title="لا توجد نشاطات حديثة" description="ستظهر الإجراءات الجديدة هنا." />}
              </div>
            </section>
            <section className="panel-shadow fade-up fade-up-delay-3 rounded-xl border border-card-border bg-card p-5 md:p-6">
              <SectionHeading icon={<Clock3 size={17} />} title="نظرة على الالتزامات" />
              <p className="mt-1 text-xs text-muted-foreground">مواعيد تستحق المتابعة قبل نهاية الشهر</p>
              <div className="mt-6 space-y-5">
                <ProgressRow label="المواعيد النهائية القادمة" value={summary?.upcomingDeadlines ?? 0} total={20} color="bg-[#bd7a3e]" />
                <ProgressRow label="الجلسات المحددة" value={summary?.upcomingHearings ?? 0} total={12} color="bg-[#3f897f]" />
                <ProgressRow label="الطلبات قيد المراجعة" value={summary?.pendingRequests ?? 0} total={10} color="bg-primary" />
              </div>
              <div className="mt-7 flex items-center gap-2 rounded-lg bg-muted/70 px-3 py-2.5 text-xs text-muted-foreground">
                <Sparkles size={14} className="text-accent" />
                <span>ابدأ بالطلبات ذات الأولوية العالية لتقليل زمن الاستجابة.</span>
              </div>
            </section>
          </div>
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <QuickActionCard href="/requests" icon={<FileCheck2 size={19} />} title="مراجعة الطلبات" description={`${summary?.pendingRequests ?? 0} طلبات تنتظر قراراً`} />
            <QuickActionCard href="/reports" icon={<BarChart3 size={19} />} title="تقارير المحفظة" description="عرض مؤشرات العمل القانوني الشهرية" />
          </div>
        </>
      )}
    </PageFrame>
  );
}

export function ClientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dialog, setDialog] = useState<'create' | string | null>(null);
  const params = useMemo(() => ({ ...(search ? { search } : {}), ...(status ? { status } : {}) }), [search, status]);
  const clientsQuery = useListClients(params);
  const clients = clientsQuery.data ?? [];
  const close = () => setDialog(null);

  return (
    <PageFrame eyebrow="الإدارة والحوكمة" title="المنظمات العميلة" description="إدارة كيانات العملاء، خططهم، ووحدات العمل المفعلة.">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{clients.length} منظمة</span>
          <span className="text-xs text-muted-foreground">ضمن مساحة العمل الحالية</span>
        </div>
        <button type="button" data-testid="button-create-client" onClick={() => setDialog('create')} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90">
          <Plus size={15} /> إضافة منظمة
        </button>
      </div>
      <section className="panel-shadow rounded-xl border border-card-border bg-card">
        <Toolbar search={search} onSearch={setSearch} placeholder="ابحث باسم المنظمة أو الرقم المرجعي..." filter={status} onFilter={setStatus} />
        {clientsQuery.isLoading ? <TableSkeleton columns={5} /> : clientsQuery.isError ? <ErrorState onRetry={() => clientsQuery.refetch()} /> : clients.length === 0 ? <EmptyState title="لا توجد منظمات مطابقة" description="جرّب تغيير كلمات البحث أو أضف منظمة جديدة لمساحة العمل." actionLabel="إضافة منظمة" onAction={() => setDialog('create')} /> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[740px] text-right">
              <thead><tr className="border-b border-border bg-muted/45 text-[11px] font-semibold text-muted-foreground"><th className="px-5 py-3.5">المنظمة</th><th className="px-4 py-3.5">الرقم المرجعي</th><th className="px-4 py-3.5">الخطة</th><th className="px-4 py-3.5">المستخدمون</th><th className="px-4 py-3.5">الحالة</th><th className="w-12 px-4 py-3.5" /></tr></thead>
              <tbody className="divide-y divide-border/70">
                {clients.map((client) => <tr key={client.id} data-testid={`row-client-${client.id}`} className="data-row">
                  <td className="px-5 py-4"><button type="button" data-testid={`button-edit-client-${client.id}`} onClick={() => setDialog(client.id)} className="group text-right"><span className="block text-sm font-semibold group-hover:text-[#347a73]">{client.name}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{client.legalName || 'اسم قانوني غير محدد'}</span></button></td>
                  <td className="px-4 py-4 font-mono-ui text-xs text-muted-foreground">{client.referenceNo}</td>
                  <td className="px-4 py-4"><PlanBadge plan={client.plan} /></td>
                  <td className="px-4 py-4 text-sm text-foreground">{client.users} <span className="text-[11px] text-muted-foreground">مستخدم</span></td>
                  <td className="px-4 py-4"><StatusBadge status={client.status} /></td>
                  <td className="px-4 py-4"><button type="button" data-testid={`button-client-menu-${client.id}`} aria-label="خيارات المنظمة" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><MoreHorizontal size={17} /></button></td>
                </tr>)}
              </tbody>
            </table>
          </div>
        )}
      </section>
      {dialog && <ClientDialog clientId={dialog === 'create' ? null : dialog} onClose={close} onSaved={() => { queryClient.invalidateQueries({ queryKey: getListClientsQueryKey() }); close(); }} />}
    </PageFrame>
  );
}

function ClientDialog({ clientId, onClose, onSaved }: { clientId: string | null; onClose: () => void; onSaved: () => void }) {
  const queryClient = useQueryClient();
  const editingQuery = useGetClient(clientId ?? '', { query: { enabled: Boolean(clientId), queryKey: getGetClientQueryKey(clientId ?? '') } });
  const createClient = useCreateClient();
  const updateClient = useUpdateClient();
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [plan, setPlan] = useState('professional');
  const [modules, setModules] = useState<string[]>(['matters', 'documents']);
  useEffect(() => {
    if (clientId && editingQuery.data) {
      setName(editingQuery.data.name);
      setLegalName(editingQuery.data.legalName ?? '');
      setPlan(editingQuery.data.plan);
      setModules(editingQuery.data.enabledModules ?? []);
    }
  }, [clientId, editingQuery.data]);

  const toggleModule = (module: string) => setModules((current) => current.includes(module) ? current.filter((item) => item !== module) : [...current, module]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    if (clientId) {
      updateClient.mutate({ clientId, data: { name, legalName, plan, enabledModules: modules } }, { onSuccess: (client) => { queryClient.setQueryData(getGetClientQueryKey(client.id), client); onSaved(); } });
    } else {
      createClient.mutate({ data: { name, legalName, plan, enabledModules: modules } }, { onSuccess: onSaved });
    }
  };
  const pending = createClient.isPending || updateClient.isPending;
  return <Modal title={clientId ? 'تعديل المنظمة' : 'إضافة منظمة عميلة'} description={clientId ? 'حدّث بيانات الكيان والوحدات المتاحة لفريقه.' : 'أنشئ مساحة عمل جديدة لفريق قانوني أو شركة.'} onClose={onClose}>
    {clientId && editingQuery.isLoading ? <div className="space-y-3 p-1"><div className="h-11 animate-pulse rounded bg-muted" /><div className="h-11 animate-pulse rounded bg-muted" /><div className="h-24 animate-pulse rounded bg-muted" /></div> : (
      <form onSubmit={submit} className="space-y-4">
        <Field label="اسم المنظمة" required><input autoFocus value={name} onChange={(event) => setName(event.target.value)} data-testid="input-client-name" className="field-input" placeholder="مثال: شركة مدار للاستثمار" /></Field>
        <Field label="الاسم القانوني"><input value={legalName} onChange={(event) => setLegalName(event.target.value)} data-testid="input-client-legal-name" className="field-input" placeholder="الاسم المسجل رسمياً" /></Field>
        <Field label="الخطة"><select value={plan} onChange={(event) => setPlan(event.target.value)} data-testid="select-client-plan" className="field-input"><option value="starter">أساسية</option><option value="professional">احترافية</option><option value="enterprise">مؤسسية</option></select></Field>
        <Field label="الوحدات المفعلة"><div className="grid grid-cols-2 gap-2">{[['matters', 'المسائل القانونية'], ['litigation', 'التقاضي'], ['documents', 'المستندات'], ['reports', 'التقارير']].map(([value, label]) => <button type="button" key={value} data-testid={`button-toggle-module-${value}`} onClick={() => toggleModule(value)} className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-xs transition ${modules.includes(value) ? 'border-[#86b9b3] bg-secondary text-secondary-foreground' : 'border-border text-muted-foreground hover:bg-muted'}`}><span>{label}</span>{modules.includes(value) && <Check size={14} />}</button>)}</div></Field>
        {(createClient.isError || updateClient.isError) && <p className="rounded-lg bg-[#f6e3dc] px-3 py-2 text-xs text-[#a45043]">تعذر حفظ بيانات المنظمة. راجع الحقول وحاول مرة أخرى.</p>}
        <DialogActions onClose={onClose} pending={pending} label={clientId ? 'حفظ التغييرات' : 'إنشاء المنظمة'} />
      </form>
    )}
  </Modal>;
}

export function UsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [dialog, setDialog] = useState<'create' | User | null>(null);
  const params = useMemo(() => ({ ...(search ? { search } : {}), ...(status ? { status } : {}) }), [search, status]);
  const usersQuery = useListUsers(params);
  const users = usersQuery.data ?? [];
  return <PageFrame eyebrow="الإدارة والحوكمة" title="المستخدمون والصلاحيات" description="تحكم دقيق في الوصول إلى السجلات الحساسة ومساحات العملاء.">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground">{users.length} مستخدم</span><span className="text-xs text-muted-foreground">الوصول بحسب الدور والحالة</span></div><button type="button" data-testid="button-invite-user" onClick={() => setDialog('create')} className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"><Plus size={15} /> دعوة مستخدم</button></div>
    <section className="panel-shadow rounded-xl border border-card-border bg-card">
      <Toolbar search={search} onSearch={setSearch} placeholder="ابحث بالاسم أو البريد الإلكتروني..." filter={status} onFilter={setStatus} />
      {usersQuery.isLoading ? <TableSkeleton columns={5} /> : usersQuery.isError ? <ErrorState onRetry={() => usersQuery.refetch()} /> : users.length === 0 ? <EmptyState title="لا يوجد مستخدمون مطابقون" description="عدّل البحث أو وجّه دعوة إلى عضو جديد في الفريق." actionLabel="دعوة مستخدم" onAction={() => setDialog('create')} /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-right"><thead><tr className="border-b border-border bg-muted/45 text-[11px] font-semibold text-muted-foreground"><th className="px-5 py-3.5">المستخدم</th><th className="px-4 py-3.5">الدور</th><th className="px-4 py-3.5">نوع الحساب</th><th className="px-4 py-3.5">آخر نشاط</th><th className="px-4 py-3.5">الحالة</th><th className="w-12 px-4 py-3.5" /></tr></thead><tbody className="divide-y divide-border/70">{users.map((user) => <tr key={user.id} data-testid={`row-user-${user.id}`} className="data-row"><td className="px-5 py-4"><button type="button" data-testid={`button-edit-user-${user.id}`} onClick={() => setDialog(user)} className="flex items-center gap-3 text-right"><Avatar initials={user.initials || user.name.slice(0, 2)} /><span><span className="block text-sm font-semibold">{user.name}</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{user.email}</span></span></button></td><td className="px-4 py-4 text-xs font-medium">{user.role}</td><td className="px-4 py-4 text-xs text-muted-foreground">{user.userType}</td><td className="px-4 py-4 text-xs text-muted-foreground">{user.lastActive}</td><td className="px-4 py-4"><StatusBadge status={user.status} user /></td><td className="px-4 py-4"><button type="button" data-testid={`button-user-menu-${user.id}`} aria-label="خيارات المستخدم" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"><MoreHorizontal size={17} /></button></td></tr>)}</tbody></table></div>}
    </section>
    {dialog && <UserDialog user={dialog === 'create' ? null : dialog} onClose={() => setDialog(null)} onSaved={() => { queryClient.invalidateQueries({ queryKey: getListUsersQueryKey() }); setDialog(null); }} />}
  </PageFrame>;
}

function UserDialog({ user, onClose, onSaved }: { user: User | null; onClose: () => void; onSaved: () => void }) {
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState(user?.role ?? 'عضو فريق');
  const [userType, setUserType] = useState(user?.userType ?? 'داخلي');
  const [subClient, setSubClient] = useState(user?.subClient ?? '');
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim() || (!user && !email.trim())) return;
    if (user) updateUser.mutate({ userId: user.id, data: { name, role, status: user.status, subClient } }, { onSuccess: onSaved });
    else createUser.mutate({ data: { name, email, role, userType, subClient } }, { onSuccess: onSaved });
  };
  return <Modal title={user ? 'تعديل بيانات المستخدم' : 'دعوة مستخدم جديد'} description={user ? 'راجع الدور ومساحة الوصول لهذا المستخدم.' : 'ستصل الدعوة إلى البريد الإلكتروني مع رابط آمن.'} onClose={onClose}><form onSubmit={submit} className="space-y-4"><Field label="الاسم الكامل" required><input autoFocus value={name} onChange={(event) => setName(event.target.value)} data-testid="input-user-name" className="field-input" placeholder="الاسم الكامل" /></Field><Field label="البريد الإلكتروني" required={!user}><input type="email" disabled={Boolean(user)} value={email} onChange={(event) => setEmail(event.target.value)} data-testid="input-user-email" className="field-input disabled:cursor-not-allowed disabled:bg-muted" placeholder="name@company.com" /></Field><div className="grid grid-cols-2 gap-3"><Field label="الدور"><select value={role} onChange={(event) => setRole(event.target.value)} data-testid="select-user-role" className="field-input"><option>مدير النظام</option><option>مسؤول قانوني</option><option>عضو فريق</option><option>قارئ</option></select></Field><Field label="نوع الحساب"><select disabled={Boolean(user)} value={userType} onChange={(event) => setUserType(event.target.value)} data-testid="select-user-type" className="field-input disabled:bg-muted"><option>داخلي</option><option>عميل</option><option>مستشار خارجي</option></select></Field></div><Field label="العميل الفرعي (اختياري)"><input value={subClient} onChange={(event) => setSubClient(event.target.value)} data-testid="input-user-sub-client" className="field-input" placeholder="اسم الجهة أو الفريق" /></Field>{(createUser.isError || updateUser.isError) && <p className="rounded-lg bg-[#f6e3dc] px-3 py-2 text-xs text-[#a45043]">تعذر حفظ المستخدم. تحقق من البيانات وحاول مرة أخرى.</p>}<DialogActions onClose={onClose} pending={createUser.isPending || updateUser.isPending} label={user ? 'حفظ التغييرات' : 'إرسال الدعوة'} /></form></Modal>;
}

export function AuditPage() {
  const [search, setSearch] = useState('');
  const params = useMemo(() => search ? { search } : {}, [search]);
  const auditQuery = useListAuditLogs(params);
  const logs = auditQuery.data ?? [];
  return <PageFrame eyebrow="الإدارة والحوكمة" title="سجل التدقيق" description="أثر موثوق لكل إجراء تم داخل مساحة العمل.">
    <section className="panel-shadow rounded-xl border border-card-border bg-card"><Toolbar search={search} onSearch={setSearch} placeholder="ابحث في الإجراءات أو الكيانات أو المستخدمين..." /><div className="flex items-center justify-between border-b border-border px-5 py-3 text-xs text-muted-foreground"><span>{logs.length} إجراء مسجل</span><button type="button" data-testid="button-audit-filter" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 font-medium hover:bg-muted hover:text-foreground"><Filter size={14} /> تصفية متقدمة</button></div>{auditQuery.isLoading ? <TableSkeleton columns={4} /> : auditQuery.isError ? <ErrorState onRetry={() => auditQuery.refetch()} /> : logs.length === 0 ? <EmptyState title="لا توجد سجلات" description="ستظهر جميع الإجراءات الحساسة هنا بعد تنفيذها." /> : <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-right"><thead><tr className="border-b border-border bg-muted/45 text-[11px] font-semibold text-muted-foreground"><th className="px-5 py-3.5">المستخدم</th><th className="px-4 py-3.5">الإجراء</th><th className="px-4 py-3.5">الكيان</th><th className="px-4 py-3.5">التفاصيل</th><th className="px-4 py-3.5">التوقيت</th></tr></thead><tbody className="divide-y divide-border/70">{logs.map((log) => <tr key={log.id} data-testid={`row-audit-${log.id}`} className="data-row"><td className="px-5 py-4"><div className="flex items-center gap-2.5"><Avatar initials={log.user.slice(0, 2)} small /><span className="text-xs font-semibold">{log.user}</span></div></td><td className="px-4 py-4"><ActionBadge action={log.action} /></td><td className="px-4 py-4 text-xs font-medium">{log.entity}</td><td className="max-w-[300px] px-4 py-4 text-xs text-muted-foreground">{log.description}</td><td className="px-4 py-4 text-[11px] text-muted-foreground">{log.timestamp}</td></tr>)}</tbody></table></div>}</section>
  </PageFrame>;
}

export function SettingsPage() {
  const [active, setActive] = useState('organization');
  const [saved, setSaved] = useState(false);
  const sections = [{ id: 'organization', label: 'بيانات المنظمة', icon: BuildingIcon }, { id: 'roles', label: 'الأدوار والصلاحيات', icon: ShieldCheck }, { id: 'teams', label: 'الفرق ومساحات الوصول', icon: UsersRound }, { id: 'numbering', label: 'التسلسل والترقيم', icon: ListNumberIcon }, { id: 'privacy', label: 'الخصوصية والأمان', icon: LockKeyhole }];
  return <PageFrame eyebrow="الإدارة والحوكمة" title="إعدادات مساحة العمل" description="تهيئة القواعد التي تحافظ على اتساق العمل وسلامة الوصول."><div className="grid gap-6 lg:grid-cols-[235px_1fr]"><aside className="h-fit rounded-xl border border-card-border bg-card p-2 panel-shadow">{sections.map((section) => { const Icon = section.icon; return <button type="button" key={section.id} data-testid={`button-settings-${section.id}`} onClick={() => setActive(section.id)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-right text-xs font-semibold transition ${active === section.id ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}><Icon size={16} />{section.label}{active === section.id && <ArrowDownLeft size={14} className="mr-auto" />}</button>; })}</aside><section className="panel-shadow rounded-xl border border-card-border bg-card p-5 md:p-7">{active === 'organization' && <SettingsOrganization />}{active === 'roles' && <SettingsRoles />}{active === 'teams' && <SettingsTeams />}{active === 'numbering' && <SettingsNumbering />}{active === 'privacy' && <SettingsPrivacy />}<div className="mt-8 flex items-center justify-between border-t border-border pt-5"><span className={`text-xs text-[#347a73] transition-opacity ${saved ? 'opacity-100' : 'opacity-0'}`}><Check size={14} className="ml-1 inline" />تم حفظ التغييرات</span><button type="button" data-testid="button-save-settings" onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2200); }} className="rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">حفظ التغييرات</button></div></section></div></PageFrame>;
}

function SettingsOrganization() { return <SettingsSection title="بيانات المنظمة" description="المعلومات الأساسية التي تظهر في المراسلات والتقارير."><div className="grid gap-4 md:grid-cols-2"><Field label="اسم المنظمة"><input defaultValue="مرسى للمحاماة والاستشارات" data-testid="input-settings-organization-name" className="field-input" /></Field><Field label="الرقم المرجعي"><input defaultValue="MRSA-001" data-testid="input-settings-reference" className="field-input font-mono-ui" /></Field><Field label="البريد الرسمي"><input defaultValue="office@marsa.legal" data-testid="input-settings-email" className="field-input" /></Field><Field label="المنطقة الزمنية"><select defaultValue="riyadh" data-testid="select-settings-timezone" className="field-input"><option value="riyadh">الرياض (GMT+3)</option><option value="dubai">دبي (GMT+4)</option></select></Field></div></SettingsSection>; }
function SettingsRoles() { return <SettingsSection title="الأدوار والصلاحيات" description="مراجعة مستويات الوصول قبل منحها إلى أعضاء الفريق."><div className="space-y-3">{[['مدير النظام', 'إدارة كاملة للمساحة والإعدادات', '٣ أعضاء'], ['مسؤول قانوني', 'المسائل والتقاضي والوثائق', '١٢ عضواً'], ['قارئ', 'الوصول للعرض والتقارير فقط', '٨ أعضاء']].map(([name, desc, count], index) => <div key={name} className="flex items-center gap-3 rounded-lg border border-border p-4"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-primary"><ShieldCheck size={16} /></div><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{name}</p><p className="mt-1 text-xs text-muted-foreground">{desc}</p></div><span className="text-[11px] text-muted-foreground">{count}</span><button type="button" data-testid={`button-edit-role-${index}`} className="rounded-md p-2 text-muted-foreground hover:bg-muted"><SlidersHorizontal size={15} /></button></div>)}</div></SettingsSection>; }
function SettingsTeams() { return <SettingsSection title="الفرق ومساحات الوصول" description="قسّم العمل مع الحفاظ على حدود واضحة بين الملفات."><div className="grid gap-3 md:grid-cols-2">{[['الفريق التجاري', 'عقود، مسائل تجارية، ومنازعات التوريد', '٧ أعضاء'], ['فريق التقاضي', 'قضايا المحاكم والجلسات والمذكرات', '٥ أعضاء'], ['الامتثال والمخاطر', 'الاستشارات الداخلية وسجل السياسات', '٤ أعضاء']].map(([name, desc, count], index) => <div key={name} className="rounded-lg border border-border p-4"><div className="flex items-center justify-between"><p className="text-sm font-semibold">{name}</p><button type="button" data-testid={`button-team-options-${index}`} className="text-muted-foreground hover:text-foreground"><MoreHorizontal size={16} /></button></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{desc}</p><p className="mt-4 text-[11px] font-semibold text-[#347a73]">{count}</p></div>)}</div></SettingsSection>; }
function SettingsNumbering() { return <SettingsSection title="التسلسل والترقيم" description="قوالب ثابتة تجعل العثور على الملفات أسهل عبر السنوات."><div className="space-y-4"><Field label="المسائل القانونية"><div className="flex items-center gap-2"><input defaultValue="MAT-{YYYY}-{0000}" data-testid="input-numbering-matters" className="field-input font-mono-ui" /><span className="text-[11px] text-muted-foreground">مثال: MAT-2024-0018</span></div></Field><Field label="القضايا"><input defaultValue="LIT-{YYYY}-{0000}" data-testid="input-numbering-litigation" className="field-input font-mono-ui" /></Field></div></SettingsSection>; }
function SettingsPrivacy() { return <SettingsSection title="الخصوصية والأمان" description="ضوابط إضافية لحماية البيانات القانونية الحساسة."><div className="space-y-3">{[['المصادقة متعددة العوامل', 'إلزام جميع المستخدمين بالتحقق بخطوتين', true], ['جلسات الدخول', 'إنهاء الجلسة تلقائياً بعد ٣٠ دقيقة من الخمول', true], ['تسجيل التنزيلات', 'حفظ أثر كل عملية تنزيل للمستندات', false]].map(([title, desc, checked], index) => <label key={`${title}`} className="flex cursor-pointer items-center gap-3 rounded-lg border border-border p-4"><div className="min-w-0 flex-1"><p className="text-sm font-semibold">{title}</p><p className="mt-1 text-xs text-muted-foreground">{desc}</p></div><input type="checkbox" defaultChecked={Boolean(checked)} data-testid={`checkbox-privacy-${index}`} className="h-4 w-4 accent-[#3f897f]" /></label>)}</div></SettingsSection>; }

const moduleMeta: Record<string, { title: string; eyebrow: string; description: string; icon: typeof FileText; chips: string[] }> = {
  '/requests': { title: 'الطلبات القانونية', eyebrow: 'مساحة العمل', description: 'بوابة استقبال الطلبات وتوجيهها إلى المسار القانوني الصحيح.', icon: FileCheck2, chips: ['نموذج استقبال موحد', 'تعيين المسؤول', 'مستويات الأولوية'] },
  '/matters': { title: 'المسائل القانونية', eyebrow: 'مساحة العمل', description: 'سجل مركزي للاستشارات والعقود والملفات القانونية المفتوحة.', icon: FileText, chips: ['ملف المسألة', 'المواعيد النهائية', 'سجل المراسلات'] },
  '/litigation': { title: 'التقاضي', eyebrow: 'مساحة العمل', description: 'متابعة القضايا والجلسات والإجراءات القادمة من لوحة واحدة.', icon: Gavel, chips: ['خط زمني للقضية', 'الجلسات', 'الأطراف والمحامون'] },
  '/sub-clients': { title: 'العملاء الفرعيون', eyebrow: 'مساحة العمل', description: 'تنظيم الجهات التابعة لكل منظمة عميلة وحدود الوصول الخاصة بها.', icon: UsersRound, chips: ['هيكل العملاء', 'حدود الوصول', 'ملفات مرتبطة'] },
  '/parties': { title: 'الأطراف', eyebrow: 'مساحة العمل', description: 'دليل موحد للأطراف المرتبطة بالمسائل والقضايا القانونية.', icon: UsersRound, chips: ['ملف الطرف', 'العلاقات', 'سجل الارتباط'] },
  '/documents': { title: 'المستندات', eyebrow: 'مساحة العمل', description: 'مكتبة وثائق آمنة مع سياق واضح لكل ملف ونسخة.', icon: BookOpen, chips: ['تصنيف المستندات', 'إصدارات', 'صلاحيات المشاركة'] },
  '/reminders': { title: 'التذكيرات', eyebrow: 'مساحة العمل', description: 'مواعيد وإجراءات لا ينبغي أن تسقط من المتابعة اليومية.', icon: Clock3, chips: ['التزامات اليوم', 'مواعيد متكررة', 'تنبيهات الفريق'] },
  '/reports': { title: 'التقارير والتحليلات', eyebrow: 'مساحة العمل', description: 'قراءة عملية لحجم العمل القانوني وأداء المحفظة عبر الزمن.', icon: BarChart3, chips: ['مؤشرات المحفظة', 'وقت الاستجابة', 'تصدير التقارير'] },
};

export function ModulePage({ module }: { module: string }) {
  const [acknowledged, setAcknowledged] = useState(false);
  const meta = moduleMeta[module] ?? moduleMeta['/matters'];
  const Icon = meta.icon;
  return <PageFrame eyebrow={meta.eyebrow} title={meta.title} description={meta.description}><section className="relative min-h-[490px] overflow-hidden rounded-2xl border border-card-border bg-card p-6 panel-shadow md:p-10"><div className="pointer-events-none absolute -left-20 -top-24 h-64 w-64 rounded-full border-[1px] border-[#d7b47d]/25" /><div className="pointer-events-none absolute -left-9 -top-12 h-44 w-44 rounded-full border-[1px] border-[#d7b47d]/20" /><div className="relative flex max-w-2xl flex-col items-start"><span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-[#347a73]"><Icon size={25} /></span><p className="mt-8 text-[11px] font-semibold tracking-[.16em] text-[#b37c3e]">قريباً في مساحة العمل</p><h2 className="mt-3 text-3xl font-bold tracking-[-.045em] text-primary md:text-4xl">هذه الوحدة قيد الإعداد</h2><p className="mt-4 max-w-xl text-sm leading-7 text-muted-foreground">نعمل على تجهيز تجربة {meta.title} لتكون متسقة مع سجلاتك الحالية، دون فقدان السياق أو وضوح المسؤوليات. ستتوفر هذه المساحة ضمن تحديثات المنتج القادمة.</p><div className="mt-8 flex flex-wrap gap-2">{meta.chips.map((chip) => <span key={chip} className="rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">{chip}</span>)}</div><button type="button" data-testid={`button-notify-${module.slice(1)}`} onClick={() => setAcknowledged(true)} className="mt-9 inline-flex items-center gap-2 rounded-lg border border-primary/20 bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground transition hover:bg-primary/90">{acknowledged ? <><Check size={15} />تم تسجيل اهتمامك</> : <><BellIcon />أبلغوني عند الجاهزية</>}</button>{acknowledged && <p className="mt-3 text-xs text-[#347a73]">سنضيف تنبيهاً إلى مركز الإشعارات لديك.</p>}</div><div className="absolute bottom-8 left-8 hidden w-64 rounded-xl border border-border bg-background/70 p-4 backdrop-blur-sm md:block"><div className="mb-3 flex items-center justify-between"><span className="text-[10px] font-semibold text-muted-foreground">حالة التجهيز</span><span className="font-mono-ui text-[10px] text-[#b37c3e]">04 / 06</span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full w-2/3 rounded-full bg-accent" /></div><p className="mt-3 text-[11px] text-muted-foreground">نحن نختبر مسارات الصلاحيات والبحث.</p></div></section></PageFrame>;
}

function PageFrame({ eyebrow, title, description, children }: { eyebrow: string; title: string; description: string; children: ReactNode }) {
  return <div className="fade-up mx-auto max-w-[1440px]"><div className="mb-8"><p className="text-[11px] font-semibold tracking-[.15em] text-[#b37c3e]">{eyebrow}</p><h1 className="mt-2 text-3xl font-bold tracking-[-.045em] text-primary md:text-[34px]">{title}</h1><p className="mt-2 text-sm text-muted-foreground">{description}</p></div>{children}</div>;
}

function MetricCard({ label, value, note, tone, icon: Icon, index }: { label: string; value: number | string; note: string; tone: string; icon: typeof FileText; index: number }) {
  const toneClasses: Record<string, string> = { teal: 'bg-secondary text-[#347a73]', navy: 'bg-[#e4e8ef] text-primary', gold: 'bg-[#f7ecd9] text-[#ae7133]', coral: 'bg-[#f6e3dc] text-[#a45043]' };
  return <div className={`stat-card panel-shadow fade-up fade-up-delay-${Math.min(index + 1, 3)} rounded-xl border border-card-border bg-card p-5`} data-testid={`stat-card-${label}`}><div className="flex items-start justify-between"><span className={`flex h-9 w-9 items-center justify-center rounded-lg ${toneClasses[tone]}`}><Icon size={17} /></span><ArrowUpLeft size={15} className="text-[#347a73]" /></div><p className="mt-5 text-[28px] font-bold leading-none tracking-[-.04em] text-primary">{value}</p><p className="mt-2 text-sm font-semibold">{label}</p><p className="mt-1 text-[11px] text-muted-foreground">{note}</p></div>;
}

function ProgressRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) { const width = Math.min(100, Math.round((value / total) * 100)); return <div><div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium">{label}</span><span className="font-mono-ui text-[11px] text-muted-foreground">{value} / {total}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${width}%` }} /></div></div>; }
function QuickActionCard({ href, icon, title, description }: { href: string; icon: ReactNode; title: string; description: string }) { return <Link href={href} data-testid={`link-quick-${href.slice(1)}`} className="group flex items-center gap-4 rounded-xl border border-card-border bg-card p-4 panel-shadow transition hover:-translate-y-0.5 hover:border-primary/25"><span className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-primary group-hover:bg-secondary group-hover:text-[#347a73]">{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{title}</span><span className="mt-1 block text-xs text-muted-foreground">{description}</span></span><ArrowDownLeft size={16} className="text-muted-foreground transition group-hover:text-primary" /></Link>; }
function SectionHeading({ icon, title, action, href }: { icon: ReactNode; title: string; action?: string; href?: string }) { return <div className="flex items-center justify-between"><div className="flex items-center gap-2.5"><span className="text-[#347a73]">{icon}</span><h2 className="text-sm font-bold">{title}</h2></div>{action && href && <Link href={href} data-testid={`link-section-${href.slice(1)}`} className="text-[11px] font-semibold text-[#347a73] hover:underline">{action}</Link>}</div>; }
function ActivityMark() { return <ActivityIcon />; }
function ActivityIcon() { return <span className="flex h-7 w-7 items-center justify-center rounded-md bg-secondary"><ArrowUpLeft size={14} /></span>; }
function Toolbar({ search, onSearch, placeholder, filter, onFilter }: { search: string; onSearch: (value: string) => void; placeholder: string; filter?: string; onFilter?: (value: string) => void }) { return <div className="flex flex-wrap items-center gap-3 border-b border-border p-4"><div className="relative min-w-[240px] flex-1"><Search size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" /><input type="search" value={search} onChange={(event) => onSearch(event.target.value)} data-testid="input-table-search" className="field-input pr-9" placeholder={placeholder} /></div>{onFilter && <select value={filter} onChange={(event) => onFilter(event.target.value)} data-testid="select-table-status" className="field-input w-auto min-w-[145px]"><option value="">كل الحالات</option><option value="active">نشط</option><option value="pending">معلق</option><option value="suspended">موقوف</option></select>}<button type="button" data-testid="button-table-filters" className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-xs font-semibold text-muted-foreground hover:bg-muted hover:text-foreground"><SlidersHorizontal size={15} /> خيارات العرض</button></div>; }
function StatusBadge({ status, user = false }: { status: string; user?: boolean }) { const normalized = status.toLowerCase(); const active = normalized.includes('active') || normalized.includes('نشط'); const pending = normalized.includes('pending') || normalized.includes('معلق'); const label = active ? 'نشط' : pending ? 'معلق' : status || 'غير محدد'; return <span data-testid={`status-${user ? 'user' : 'client'}-${status}`} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${active ? 'bg-[#e0efea] text-[#347a73]' : pending ? 'bg-[#f7ecd9] text-[#a16b32]' : 'bg-[#f4e2de] text-[#a45043]'}`}><span className="h-1.5 w-1.5 rounded-full bg-current" />{label}</span>; }
function PlanBadge({ plan }: { plan: string }) { const labels: Record<string, string> = { enterprise: 'مؤسسية', professional: 'احترافية', starter: 'أساسية' }; return <span className="rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground">{labels[plan] ?? plan}</span>; }
function ActionBadge({ action }: { action: string }) { return <span className="rounded-md bg-secondary px-2 py-1 text-[11px] font-semibold text-secondary-foreground">{action}</span>; }
function Avatar({ initials, small = false }: { initials: string; small?: boolean }) { return <span className={`flex shrink-0 items-center justify-center rounded-full bg-[#e4e8ef] font-semibold text-primary ${small ? 'h-7 w-7 text-[9px]' : 'h-9 w-9 text-[11px]'}`}>{initials.slice(0, 2)}</span>; }
function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold">{label}{required && <span className="mr-1 text-[#b05f4f]">*</span>}</span>{children}</label>; }
function SettingsSection({ title, description, children }: { title: string; description: string; children: ReactNode }) { return <div><h2 className="text-lg font-bold text-primary">{title}</h2><p className="mt-1 text-xs text-muted-foreground">{description}</p><div className="mt-7">{children}</div></div>; }
function BuildingIcon() { return <span><UsersRound size={16} /></span>; }
function ListNumberIcon() { return <span className="font-mono-ui text-xs">01</span>; }
function BellIcon() { return <span className="inline-flex h-3.5 w-3.5 rounded-full border-2 border-current" />; }
function Modal({ title, description, onClose, children }: { title: string; description: string; onClose: () => void; children: ReactNode }) { return <div className="fixed inset-0 z-[80] flex items-end justify-center bg-primary/35 p-0 backdrop-blur-[2px] sm:items-center sm:p-5"><div role="dialog" aria-modal="true" className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-card-border bg-card p-5 shadow-2xl sm:rounded-2xl sm:p-6"><div className="mb-6 flex items-start justify-between gap-4"><div><h2 className="text-lg font-bold text-primary">{title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p></div><button type="button" onClick={onClose} data-testid="button-close-dialog" aria-label="إغلاق" className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"><X size={17} /></button></div>{children}</div></div>; }
function DialogActions({ onClose, pending, label }: { onClose: () => void; pending: boolean; label: string }) { return <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onClose} data-testid="button-cancel-dialog" className="rounded-lg px-4 py-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted">إلغاء</button><button type="submit" disabled={pending} data-testid="button-submit-dialog" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:opacity-60">{pending && <LoaderCircle size={14} className="animate-spin" />}{label}</button></div>; }
function DashboardSkeleton() { return <div className="space-y-6"><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{[1, 2, 3, 4].map((item) => <div key={item} className="h-[165px] animate-pulse rounded-xl bg-muted" />)}</div><div className="grid gap-6 xl:grid-cols-[1.45fr_1fr]"><div className="h-[330px] animate-pulse rounded-xl bg-muted" /><div className="h-[330px] animate-pulse rounded-xl bg-muted" /></div></div>; }
function TableSkeleton({ columns }: { columns: number }) { return <div className="space-y-4 p-5">{[1, 2, 3, 4, 5].map((row) => <div key={row} className="flex gap-4">{Array.from({ length: columns }).map((_, column) => <div key={column} className={`h-10 animate-pulse rounded bg-muted ${column === 0 ? 'flex-1' : 'w-28'}`} />)}</div>)}</div>; }
function EmptyState({ title, description, actionLabel, onAction, compact = false }: { title: string; description: string; actionLabel?: string; onAction?: () => void; compact?: boolean }) { return <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'min-h-[280px] px-5 py-12'}`}><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-muted-foreground"><ArchiveIcon /></span><h3 className="mt-4 text-sm font-bold">{title}</h3><p className="mt-1 max-w-xs text-xs leading-5 text-muted-foreground">{description}</p>{actionLabel && onAction && <button type="button" onClick={onAction} data-testid="button-empty-action" className="mt-4 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground">{actionLabel}</button>}</div>; }
function ArchiveIcon() { return <FileText size={18} />; }
function ErrorState({ onRetry }: { onRetry: () => void }) { return <div className="flex min-h-[220px] flex-col items-center justify-center px-5 text-center"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f6e3dc] text-[#a45043]"><AlertCircle size={18} /></span><h3 className="mt-3 text-sm font-bold">تعذر تحميل البيانات</h3><p className="mt-1 text-xs text-muted-foreground">تحقق من الاتصال وحاول مرة أخرى.</p><button type="button" onClick={onRetry} data-testid="button-retry" className="mt-4 inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-xs font-semibold hover:bg-muted"><RefreshCw size={14} /> إعادة المحاولة</button></div>; }