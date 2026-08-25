# Foundation Blueprint
## Enterprise Legal Management SaaS

> الحالة: مسودة للمراجعة والاعتماد  
> النطاق: Foundation + التصميم المبدئي للمراحل اللاحقة  
> لغة الواجهة الأساسية: العربية RTL، مع تجهيز كامل للإنجليزية LTR

## 1. القرارات المعمارية المقترحة

### Stack

- **Web application:** Next.js App Router + TypeScript strict mode
- **UI:** Tailwind CSS + shadcn/ui
- **Validation:** Zod على الخادم والعميل عند الحاجة
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** Auth.js مع جلسات خادمية، أو مزود هوية OIDC قابل للاستبدال
- **File storage:** S3-compatible object storage، مع حفظ الـmetadata في PostgreSQL
- **Background jobs:** queue abstraction قابلة للربط بـRedis/managed queue لاحقًا
- **Deployment:** Replit Deployments في بيئة واحدة قابلة للتوسع، مع فصل Worker عند الحاجة

### Architectural style

يبدأ النظام كـ **Modular Monolith** وليس Microservices. كل Module يملك حدودًا واضحة وطبقة Domain مستقلة، بينما تشترك الوحدات في Foundation مثل الهوية، الصلاحيات، الملفات، التدقيق، الترقيم، والإشعارات. هذا يقلل التعقيد في البداية ويحافظ على إمكانية فصل Module لاحقًا إلى خدمة مستقلة دون إعادة تصميم قاعدة البيانات بالكامل.

### قواعد غير قابلة للتفاوض

1. لا تصل واجهة المستخدم إلى قاعدة البيانات مباشرة.
2. كل عملية قراءة أو كتابة تمر عبر Service/Use Case يتحقق من الهوية والـtenant والصلاحية.
3. `client_id` إلزامي على كل سجل tenant-owned، ولا يعتمد عزل البيانات على الواجهة.
4. لا يتم قبول `client_id` من body كمرجع موثوق؛ يؤخذ من جلسة المستخدم أو سياق Platform Owner المصرّح.
5. كل mutation يتحقق خادميًا من Zod ومن حدود الصلاحيات والاشتراك.
6. السجلات المهمة تستخدم Soft Delete، مع الاحتفاظ بسجل Audit مستقل.
7. لا تحفظ الملفات داخل PostgreSQL؛ تحفظ في Object Storage ويخزن النظام metadata فقط.

## 2. حدود النظام والـTenancy

### أنواع السياق

- **Platform context:** مالك المنصة يرى ويدير Clients والاشتراكات والحدود وإعدادات النظام، ولا يحصل تلقائيًا على صلاحية قراءة محتوى العميل القانوني.
- **Client context:** المستخدم يعمل داخل Client واحد في الطلب الحالي.
- **Sub-client context:** مستخدم تابع لـSub-Client، وصلاحياته تحدد ما يمكنه رؤيته داخل Client الأب.

### استراتيجية العزل

الطبقة الأولى هي **application-level tenant scoping** مركزي داخل كل repository/service. ولزيادة الحماية، تستخدم الجداول tenant-owned أيضًا PostgreSQL Row-Level Security عندما تصبح بيئة الإنتاج مستقرة؛ يضبط التطبيق `app.current_client_id` داخل transaction ولا يسمح للمستخدم بتغييرها.

كل query يجب أن تكون من الشكل المفاهيمي:

```ts
repository.findMany({
  where: {
    clientId: tenantContext.clientId,
    deletedAt: null,
  },
});
```

ولا يسمح باستخدام `prisma.<model>.findMany()` مباشرة من route أو component.

## 3. نموذج الصلاحيات

### RBAC + Custom User Permissions

- `Role` يحدد الصلاحيات الافتراضية.
- `UserPermissionOverride` يضيف أو يمنع صلاحية لمستخدم محدد.
- `ModuleAccess` يحدد الوحدات المفعلة للـClient والمرئية للمستخدم.
- `RecordAccess` يطبق خصوصية السجل عند اختيار Specific Users.
- المنع الصريح `deny` يتغلب على السماح الافتراضي، ما لم تكن هناك صلاحية Platform Owner منفصلة.

### صيغة الصلاحية

`resource.action`

أمثلة:

- `party.view`
- `party.create`
- `matter.assign`
- `case.approve`
- `document.export`
- `user.manage`
- `settings.manage`
- `report.view`

تتضمن الصلاحيات مستوى **Module**، وعند الحاجة مستوى **Record**. لا تعتمد الحماية على إخفاء عناصر الـSidebar.

### الأدوار الأولية

`CLIENT_ADMIN`, `LEGAL_DIRECTOR`, `LITIGATION_MANAGER`, `CONTRACT_MANAGER`, `LAWYER`, `STANDARD_USER`, `EXTERNAL_USER`.

يضاف `PLATFORM_OWNER` في سياق المنصة، ولا يخلط مع أدوار Client.

## 4. Database Schema مبدئي

### Foundation

#### `clients`

- `id` UUID PK
- `reference_no` unique per platform، مثل `CL-0001`
- `name`, `legal_name`
- `status`: `TRIAL | ACTIVE | SUSPENDED | CLOSED`
- `subscription_plan_id`
- `settings` JSONB
- `timezone`, `default_locale`
- `created_at`, `updated_at`, `deleted_at`

#### `subscription_plans`

- `id`, `code`, `name`
- `enabled_modules` JSONB
- `max_privileged_users`
- `max_sub_client_users`
- `max_standard_users`
- `settings` JSONB

#### `client_modules`

- `id`, `client_id`, `module_code`
- `status`: `ENABLED | DISABLED`
- `enabled_at`, `disabled_at`
- Unique: `(client_id, module_code)`

#### `users`

- `id` UUID PK
- `reference_no`
- `email` unique على مستوى النظام
- `display_name`, `phone`, `locale`, `timezone`
- `status`: `INVITED | ACTIVE | DISABLED | DELETED`
- `user_type`: `STANDARD | PRIVILEGED | SUB_CLIENT`
- `auth_subject` unique
- `last_login_at`
- timestamps + `deleted_at`

#### `client_users`

- `id`, `client_id`, `user_id`
- `sub_client_id` nullable
- `status`, `is_primary_admin`
- timestamps
- Unique: `(client_id, user_id)`

#### `roles`, `permissions`, `role_permissions`

- Roles يمكن أن تكون `SYSTEM` أو `CLIENT_CUSTOM`
- Permission keys مثل `case.view`
- `role_permissions(role_id, permission_id)`

#### `user_roles`

- `client_user_id`, `role_id`
- Unique: `(client_user_id, role_id)`

#### `user_permission_overrides`

- `id`, `client_id`, `user_id`
- `permission_id`
- `effect`: `ALLOW | DENY`
- `scope_type`: `MODULE | RECORD`
- `scope_entity_type`, `scope_entity_id` nullable

#### `teams`, `team_members`

- Team مرتبطة بـ`client_id`
- العضو يربط بـ`client_user_id`
- يمنع التكرار في عضوية الفريق

#### `numbering_sequences`

- `client_id` nullable للأنواع platform/client
- `entity_type`
- `prefix`
- `next_value`
- `padding`
- `reset_policy`
- Unique: `(client_id, entity_type)`

#### `audit_logs`

- `id`, `client_id` nullable
- `actor_user_id` nullable
- `action`
- `entity_type`, `entity_id`
- `occurred_at`
- `old_value` JSONB nullable
- `new_value` JSONB nullable
- `metadata` JSONB
- لا يسمح بتعديل أو حذف Audit Log من واجهة المستخدم

### Sub-Clients وParties

#### `sub_clients`

- `id`, `client_id`, `reference_no`
- `name`, `legal_name`
- `status`
- `official_data` JSONB
- `settings` JSONB
- timestamps + `deleted_at`

#### `parties`

- `id`, `client_id`, `reference_no`
- `party_type`: `INDIVIDUAL | ORGANIZATION`
- `display_name`, `normalized_name`
- `national_id`, `commercial_registration`, `unified_number`
- `other_identifiers` JSONB
- `individual_data` JSONB nullable
- `organization_data` JSONB nullable
- `status`, timestamps + `deleted_at`

#### `sub_client_party_links`

- `client_id`, `sub_client_id`, `party_id`
- `link_type`: `REPRESENTS | SAME_ENTITY | CONVERTED_FROM`
- `effective_at`
- Unique حسب نوع الربط

#### `party_relationship_types`, `party_relationships`

- نوع العلاقة قابل للتخصيص لكل Client
- العلاقة تحتوي `from_party_id`, `to_party_id`, `relationship_type_id`
- `valid_from`, `valid_to`, `notes`
- لا تستخدم العلاقات كنص حر فقط

#### `categories`

- `client_id`, `entity_type`, `parent_id`
- `name`, `code`, `sort_order`, `is_active`
- يدعم Main Category وSubcategory

#### `custom_field_definitions`, `custom_field_options`, `custom_field_values`

- تعريف الحقل مرتبط بـ`client_id` و`entity_type`
- الأنواع: `TEXT`, `LONG_TEXT`, `NUMBER`, `CURRENCY`, `DATE`, `DATETIME`, `DROPDOWN`, `MULTI_SELECT`, `CHECKBOX`, `USER`, `PARTY`, `FILE`
- القيمة تخزن في أعمدة typed منفصلة أو JSONB مضبوط حسب النوع
- لا يسمح بتغيير نوع حقل مستخدم؛ ينشأ تعريف جديد مع migration للبيانات عند الحاجة

### Legal Matters وLitigation

#### `legal_matters`

- `id`, `client_id`, `reference_no`
- `sub_client_id` nullable
- `matter_type_id`, `category_id`, `subcategory_id`
- `title`, `description`
- `status_id`, `priority`
- `privacy_type`: `ALL_AUTHORIZED | SPECIFIC_USERS`
- `created_by_user_id`, `assigned_team_id`, `assigned_user_id`
- timestamps + `deleted_at`

#### `matter_statuses`, `matter_status_transitions`

- حالات افتراضية قابلة للتعديل لكل Client
- transitions تضبط الحالات المسموحة والأدوار التي تستطيع تنفيذها

#### `litigation_cases`

- `id`, `client_id`, `reference_no`
- `legal_matter_id`
- `title`, `court_case_number`
- `case_type_id`, `category_id`, `subcategory_id`
- `client_capacity`: `CLAIMANT | DEFENDANT | OTHER`
- `priority`, `privacy_type`
- `details`, assignments, billing preferences
- timestamps + `deleted_at`

#### `case_opponents`

- `case_id`, `party_id` nullable, `sub_client_id` nullable
- `role_in_case`
- يجب أن يكون أحد الطرفين غير فارغ

#### `case_stages`

- `case_id`
- `stage_type`: `FIRST_INSTANCE | APPEAL | SUPREME_COURT | ENFORCEMENT`
- `case_number`, `court`, `circuit`
- `status`, `started_at`, `closed_at`, `metadata`
- Unique: `(case_id, stage_type)` ما لم تعتمد إعادة فتح مرحلة

#### `hearings`, `pleadings`, `decisions`, `judgments`

- كل سجل مرتبط بـ`client_id` و`case_stage_id`
- يتضمن التواريخ، الوصف، الحالة، والمنشئ
- المستندات لا تكرر؛ تربط عبر Document Layer

#### `service_requests`

- `id`, `client_id`, `sub_client_id`, `request_type`
- `status`: `NEW | UNDER_REVIEW | NEED_MORE_INFORMATION | ACCEPTED | REJECTED`
- `payload` JSONB versioned
- `converted_matter_id`, `converted_case_id`
- عند التحويل تنقل المرفقات والبيانات مع Audit Log واضح

#### `timeline_events`

- `client_id`, `entity_type`, `entity_id`
- `event_type`, `description`
- `actor_user_id`, `occurred_at`, `metadata`

### Documents وReminders وPrivacy

#### `documents`, `document_links`

- `documents`: metadata، storage key، checksum، file size، MIME type، uploader، category، privacy
- `document_links`: `document_id`, `client_id`, `entity_type`, `entity_id`, `description`
- unique يمنع نفس الرابط من التكرار، ويسمح للمستند الواحد بالارتباط بعدة كيانات

#### `record_access_grants`

- `client_id`, `entity_type`, `entity_id`, `user_id`
- يمنح وصولًا لسجل خصوصيته `SPECIFIC_USERS`
- يجب أن يتحقق كل service من هذه المنح قبل إرجاع السجل أو أي attachment تابع له

#### `reminders`

- `client_id`, `entity_type`, `entity_id`
- `title`, `description`, `due_at`
- `assigned_user_id`, `status`
- `notification_settings` JSONB

## 5. Entity Relationship Diagram

```mermaid
erDiagram
  CLIENT ||--o{ CLIENT_USER : has
  USER ||--o{ CLIENT_USER : joins
  CLIENT_USER }o--o{ ROLE : assigned
  ROLE }o--o{ PERMISSION : grants
  CLIENT ||--o{ TEAM : owns
  TEAM }o--o{ CLIENT_USER : includes
  CLIENT ||--o{ SUB_CLIENT : owns
  CLIENT ||--o{ PARTY : owns
  SUB_CLIENT }o--o{ PARTY : links
  PARTY ||--o{ PARTY_RELATIONSHIP : from
  PARTY ||--o{ PARTY_RELATIONSHIP : to
  CLIENT ||--o{ LEGAL_MATTER : owns
  SUB_CLIENT ||--o{ LEGAL_MATTER : requests
  LEGAL_MATTER ||--o{ LITIGATION_CASE : contains
  LITIGATION_CASE ||--o{ CASE_STAGE : has
  CASE_STAGE ||--o{ HEARING : schedules
  LITIGATION_CASE }o--o{ PARTY : opponents
  LITIGATION_CASE }o--o{ SUB_CLIENT : opponents
  DOCUMENT }o--o{ ENTITY : links
  ENTITY ||--o{ RECORD_ACCESS_GRANT : protects
  ENTITY ||--o{ REMINDER : reminds
  ENTITY ||--o{ TIMELINE_EVENT : records
```

> `ENTITY` في الرسم تمثيل polymorphic للعلاقات المشتركة، أما في التنفيذ فتستخدم جداول links صريحة أو typed foreign keys حسب الكيان، لتفادي foreign key غير قابل للتحقق.

## 6. Folder Structure

```text
src/
  app/
    (auth)/
    (platform)/
    (client)/
      dashboard/
      requests/
      matters/
      litigation/
      sub-clients/
      parties/
      documents/
      reminders/
      reports/
      settings/
    api/
  modules/
    foundation/
      auth/
      tenancy/
      authorization/
      numbering/
      audit/
      notifications/
    clients/
    users/
    teams/
    sub-clients/
    parties/
    legal-matters/
    litigation/
    documents/
    reminders/
    contracts/                 # reserved boundary
  components/
    ui/
    forms/
    data-table/
    navigation/
  server/
    db/
    storage/
    jobs/
  lib/
    validation/
    i18n/
    errors/
    utils/
prisma/
  schema.prisma
  migrations/
  seed.ts
tests/
  unit/
  integration/
  authorization/
```

كل Module يستخدم طبقات `domain`, `application`, `infrastructure`, و`presentation` عند الحاجة. لا يوضع منطق الصلاحيات أو tenant filtering داخل مكونات React.

## 7. Authentication وAuthorization Flow

1. يسجل المستخدم الدخول عبر Auth.js/مزود الهوية.
2. ينشئ الخادم جلسة تحتوي على `userId` فقط والحد الأدنى من claims.
3. يختار النظام `clientId` من عضوية المستخدم أو من سياق Platform Owner المسموح.
4. يبني `TenantContext` خادميًا.
5. ينفذ `AuthorizationService` فحوص:
   - عضوية المستخدم في Client.
   - حالة الحساب والـClient.
   - تفعيل الـModule.
   - صلاحية المورد والفعل.
   - خصوصية السجل.
   - حدود الاشتراك قبل الإنشاء.
6. يسجل mutation ونتيجته في Audit Log.

الدخول، تعطيل المستخدم، تغيير الدور، تغيير الصلاحيات، وتغيير Client status كلها أحداث تدقيق إلزامية.

## 8. Platform Owner Portal

يبنى كمساحة منفصلة في المسارات والصلاحيات، ويحتوي مبدئيًا على:

- Clients وحالة الحساب
- Plans وModules
- User limits وSub-client user limits
- Global settings
- System logs وsupport tools

لا تمنح صلاحية Platform Owner وصولًا ضمنيًا إلى النصوص القانونية أو المستندات. أي impersonation مستقبلي يجب أن يكون مؤقتًا، صريحًا، قابلًا للتدقيق، ومقيدًا بالقراءة افتراضيًا.

## 9. Milestones

### Milestone 0 — اعتماد التصميم

- مراجعة هذا المستند
- تثبيت أسماء الكيانات وقواعد الحالة
- اعتماد قرار Auth والـObject Storage
- تحديد الحقول الرسمية المطلوبة لكل نوع Party

### Milestone 1 — Foundation

- Prisma schema وmigrations وseed
- Auth والجلسات
- Client context وtenant guard
- Users/Roles/Permissions/Teams
- Platform Owner portal الأساسي
- Client settings
- Numbering
- Audit trail

### Milestone 2 — Sub-Clients وParties

- ملفات Sub-Client وParty
- relationships وcategories
- custom fields
- privacy grants
- duplicate detection
- merge workflow مع audit
- documents وreminders

### Milestone 3 — Legal Matters

- matter types/categories/statuses
- assignments
- workflow transitions
- timeline
- service requests والتحويل

### Milestone 4 — Litigation

- claimant/defendant request flows
- cases وopponents
- stages
- hearings, pleadings, decisions, judgments
- deadlines وbilling preferences

### Milestone 5 — Contracts

- يضاف بعد تثبيت الحدود المشتركة
- يستفيد من Party, Document, Reminder, Custom Field, Privacy, Audit

## 10. بوابات الجودة قبل الانتقال بين المراحل

- اختبارات authorization تمنع cross-tenant reads/writes.
- اختبارات uniqueness للمعرفات والترقيم.
- اختبار تعطيل المستخدم وإبطال الجلسة.
- اختبار privacy على مستوى السجل والمرفقات والبحث.
- اختبار soft delete وعدم ظهور السجلات المحذوفة.
- اختبار Audit Log لكل mutation أساسي.
- اختبار migration من database فارغة وseed قابل للتكرار.
- اختبار RTL/LTR وعدم تسرب نصوص غير مترجمة.

## 11. قرارات تحتاج اعتمادًا قبل التنفيذ

1. هل يسمح للمستخدم بعضوية أكثر من Client، أم عضوية واحدة فقط؟
2. هل `email` معرف دخول فريد عالميًا، أم يسمح بإعادة استخدامه بين Clients؟
3. هل Platform Owner يستطيع impersonation، أم نؤجلها؟
4. ما الحقول الرسمية الإلزامية للأفراد والمنظمات في السوق المستهدف؟
5. هل الخصوصية الافتراضية للسجلات `ALL_AUTHORIZED` أم `SPECIFIC_USERS`؟
6. هل الموافقات على الإنشاء/التحويل مطلوبة لكل Client أم تبقى ضمن Workflow قابل للإعداد؟
7. ما مزود التخزين والهوية المرغوب اعتمادهما في بيئة الإنتاج؟

### التوصية التنفيذية

اعتماد **Modular Monolith + PostgreSQL + Drizzle ORM + Auth.js/OIDC + S3-compatible storage**، والبدء بـMilestone 0 ثم Milestone 1 فقط. لا نضيف Contracts أو Billing المتقدم إلى schema التنفيذي قبل تثبيت الـFoundation، لكن نحتفظ بحدودها وعلاقاتها المشتركة من الآن.

> **تحديث 2026-08-25:** ORM المعتمد فعليًا هو **Drizzle**، وليس Prisma (راجع القسم 12 أدناه للتفاصيل والسبب).

## 12. Implementation Status — Draft v1 (2026-08-25)

هذا القسم يوثّق تنفيذ "LegalTech Platform — Technical Foundation Proposal (Draft v1)" الذي راجعناه معًا، ونقاط الانحراف عن الافتراضات الأصلية فيه بسبب واقع المشروع الحالي.

### قرار حاسم: Drizzle بدل Prisma

مستند Draft v1 كتب الـschema بالكامل بصيغة Prisma (`schema.prisma`, Prisma Client Extensions). لكن `lib/db` في هذا المشروع كان مُجهّزًا مسبقًا بـ**Drizzle ORM** (`drizzle-orm`, `drizzle-kit push`)، بدون أي كود Prisma. تقرر الالتزام بـDrizzle والامتناع عن إدخال ORM ثانٍ، وتُرجمت كل الكيانات في Draft v1 حرفيًا (نفس الحقول، العلاقات، الـEnums، الـUnique/Index/Check constraints) إلى جداول Drizzle.

**التطبيق العملي لكل ميكانيكية كانت مبنية على Prisma تحديدًا:**

| آلية في Draft v1 (Prisma) | البديل في التنفيذ الفعلي (Drizzle) |
|---|---|
| `schema.prisma` واحد | ملفات مقسّمة حسب النطاق تحت `lib/db/src/schema/`: `enums.ts`, `platform.ts`, `users.ts`, `sub-clients.ts`, `parties.ts`, `legal-matters.ts`, `litigation.ts`, `shared.ts`, `auth.ts` |
| `cuid()` كـPrimary Key | `@paralleldrive/cuid2` عبر هيلبر `id()` في `common.ts` |
| Prisma Client Extension لفرض `where: { clientId }` تلقائيًا | لسا غير منفَّذ — نفس الفكرة مطلوبة كـwrapper حول Drizzle query builder في طبقة الـrepositories عند بدء Milestone 1 الفعلي (Services/Repositories) |
| Postgres RLS + `SET LOCAL app.current_client_id` | نفس القرار، لسا غير مفعّل — يبقى بند مفتوح (راجع القسم 10، قرار #2) |
| `@@unique`, `@@index`, CHECK constraint على `CaseParty` | مطابقة 1:1 عبر `unique()`, `index()`, `check()` من `drizzle-orm/pg-core` |

### ما تم تنفيذه فعليًا (schema + seed فقط)

- **Schema كامل** حسب كل جداول Draft v1 (قسم 2 و3) — موجود في `lib/db/src/schema/*.ts`، مصدّر عبر `lib/db/src/schema/index.ts`.
- **Seed** لبيانات الكتالوج المشتركة — `lib/db/src/seed.ts` (يُشغَّل عبر `pnpm --filter @workspace/db run seed`):
  - Modules: `litigation` (مفعّل)، `contracts` (محجوز، غير مفعّل بعد).
  - Plans: `professional`, `enterprise`.
  - Permission catalog كامل بصيغة `module.resource.action` (حسم فيه سؤال Draft v1 حول `client.users.manage` → اعتُمد `core.user.manage_users`).
  - الأدوار النظامية السبعة كما وردت حرفيًا في المتطلبات، مع صلاحيات افتراضية معقولة لكل دور (قابلة للتخصيص لاحقًا لكل Client).
- **لم يُنفَّذ بعد** (خارج نطاق هذه الجولة): طبقة Services/Repositories، Tenant Context middleware، RBAC/Privacy resolution engine، Auth.js integration، Numbering concurrency logic، Audit Log interceptor. هذه من صلب Milestone 1 وتحتاج جولة تنفيذ منفصلة.
- **Migration**: لا يوجد مجلد `/migrations` — هذا المشروع يعتمد `drizzle-kit push` مباشرة (سكربتات `push` / `push-force` في `lib/db/package.json`) بدل ملفات migration. يحتاج `DATABASE_URL` فعلي (متوفر على Replit) لتطبيق الـschema فعليًا على قاعدة البيانات — لم يُشغَّل من هذه البيئة المحلية.

### تعارض إضافي لم يُحسم بعد: Presentation Layer

Draft v1 (وMilestone 1 folder structure في القسم 6 أعلاه) يفترضان **Next.js App Router**. لكن الواجهة الفعلية في هذا المشروع (`artifacts/legal-portal`) هي **Vite + React SPA بموجّه `wouter`**، تتحدث مع خادم **Express** منفصل (`artifacts/api-server`) عبر REST مولّد من OpenAPI (`lib/api-spec`, `lib/api-zod`, `lib/api-client-react`). هذا لم يُحسم في هذه الجولة لأنه لا يمس الـschema — لكنه قرار معماري لازم يُتخذ صراحة قبل بناء طبقة الـServices/Repositories، لأنه يغيّر مكان كود التحقق من الصلاحيات وTenant Context (Route Handler في Next.js مقابل Express middleware).