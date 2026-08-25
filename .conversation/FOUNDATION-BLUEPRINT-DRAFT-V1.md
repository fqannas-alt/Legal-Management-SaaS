# LegalTech Platform — Technical Foundation Proposal (Draft v1)

> هذا هو النص الأصلي الكامل لـ"Draft v1" كما زوّدنا به المستخدم، محفوظ هنا حرفيًا للأرشفة والرجوع إليه.
> **ملاحظة مهمة:** هذا المستند مكتوب بالكامل بافتراض Prisma كـORM. المشروع الفعلي يستخدم **Drizzle ORM**، وتمت ترجمة كل الكيانات هنا إلى جداول Drizzle داخل `lib/db/src/schema/`. راجع [FOUNDATION-BLUEPRINT.md](./FOUNDATION-BLUEPRINT.md) القسم 12 لتفاصيل الترجمة وحالة التنفيذ الفعلية.

---

هذا مستند مراجعة معمارية فقط — لا يوجد فيه أي تنفيذ. الهدف منه اعتماد القرارات التقنية الأساسية قبل بدء Foundation Phase، وفق ما طُلب في نقطة "طريقة العمل المطلوبة".

الالتزام بالمصدر: كل المسميات، الكيانات، والعلاقات أدناه مأخوذة حرفيًا من المتطلبات التي زودتموني بها (الرسالة الأولى الشاملة + رسالة الـTechnical Foundation). أي إضافة تقنية بحتة (جدول أو حقل لم يُطلب صراحة) معلّمة بـ🆕 مع شرح السبب، وأي نقطة كانت غامضة أو تحتمل أكثر من تفسير مذكورة في القسم الأخير كـQuestion أو Assumption بدلاً من افتراضها ضمنيًا داخل التصميم.

## 1. Proposed Architecture

النمط المعماري: Modular Monolith (وليس Microservices).

السبب: عدد الـModules في المرحلة الحالية محدود (Litigation، ثم Contracts لاحقًا)، والفريق يحتاج سرعة تطوير وتكلفة تشغيل منخفضة. لكن البنية الداخلية مقسّمة بحدود واضحة بين الـModules بحيث يمكن فصل أي Module إلى خدمة مستقلة لاحقًا دون إعادة كتابة منطق الأعمال — لأن الطبقة الوحيدة التي "تعرف" التفاصيل التقنية (Prisma, HTTP) هي طبقة الـRepositories، بينما طبقة الـServices تتعامل مع Interfaces فقط.

### الطبقات (Layers)

| الطبقة | المسؤولية | ممنوع فيها |
|---|---|---|
| Presentation (/app, Components) | عرض البيانات، استدعاء Services، لا شيء غير ذلك | استعلامات Prisma مباشرة، منطق صلاحيات، منطق أعمال |
| Application/Service (/modules/*/services) | منطق الأعمال، التحقق من الصلاحيات (RBAC + Privacy)، تنسيق العمليات متعددة الجداول | التعامل المباشر مع Next.js Request/Response |
| Data Access (/modules/*/repositories) | استعلامات Prisma، فرض clientId إجباريًا (راجع القسم 5) | أي قرار متعلق بالصلاحيات أو منطق الأعمال |
| Cross-cutting | Auth, Tenant Context, RBAC Engine, Audit, Validation (Zod) | — |

كل Module من الـModules التجارية (Litigation، Contracts مستقبلًا) يقابله Code Module تحت /modules يحتوي Services + Repositories + Permission Keys الخاصة به، ويُفعَّل/يُعطَّل عرضه بناءً على ClientModule.enabled.

## 2. Database Entities

الجداول أدناه هي نفس الكيانات التي طلبتموها بالضبط، مجمّعة بنفس التصنيف. الكيانات المعلّمة 🆕 هي إضافات تقنية بحتة (بنية تحتية، وليست Business Entities) ومبررة بجانبها.

### Platform Level

| Entity | الغرض |
|---|---|
| PlatformUser 🆕 | مستخدم Platform Owner — منفصل عن User لأنه ليس تابعًا لأي Client (Tenant)، وله Portal مستقل (بند 30 من المتطلبات الأصلية). لو استخدمنا User نفسه، سيصبح clientId اختياريًا على كل الاستعلامات ويكسر افتراض "كل Query مرتبطة بـclient_id". |
| Client | العميل المتعاقد مباشرة (Tenant الرئيسي) |
| Plan | الباقة (Subscription/Plan) |
| Module | الوحدة (Litigation, Contracts...) — جدول بيانات وليس Enum، حتى تُضاف وحدات جديدة دون Migration |
| ClientModule | الوحدات المفعّلة لكل Client |
| ClientLimits | حدود الحسابات (Privileged / Sub-Client Users) |

### Users & Access

| Entity | الغرض |
|---|---|
| User | مستخدم بحساب دخول فعلي (Privileged / Standard / Sub-Client) |
| Role | دور — قد يكون نظامي (clientId = null) أو مخصص لعميل |
| Permission | صلاحية ذرية (module.resource.action) |
| RolePermission | صلاحيات الدور الافتراضية |
| UserPermissionOverride | استثناء صلاحية على مستوى مستخدم (Grant/Deny) |
| Team | فريق عمل |
| TeamMember | أعضاء الفريق |

### Sub-Clients

| Entity | الغرض |
|---|---|
| SubClient | عميل العميل |
| SubClientUserRelation | ربط مستخدمي الـSub-Client بالـSub-Client (علاقة مستقلة تسمح لاحقًا بأن يخدم نفس المستخدم أكثر من Sub-Client) |

### Parties

| Entity | الغرض |
|---|---|
| Party | الكيان المركزي (شخص أو شركة) |
| PartyIndividualProfile | بيانات إضافية لطرف فردي |
| PartyOrganizationProfile | بيانات إضافية لطرف شركة |
| PartyRelationship | علاقة بين طرفين (Entity وليست نص) |
| PartyCategory / PartySubcategory | التصنيفات |

### Legal Matters

| Entity | الغرض |
|---|---|
| LegalMatter | الملف القانوني (Parent Container) |
| LegalMatterType / Category / Subcategory / Status | التصنيفات وWorkflow القابل للتخصيص |
| LegalMatterAssignment | التكليفات (Requested By / Assigned Person / Assigned Team) |
| LegalMatterTimeline | الأحداث التلقائية |

### Litigation

| Entity | الغرض |
|---|---|
| LitigationRequest | طلب خدمة تقاضي من Sub-Client قبل تحويله لقضية |
| LitigationCase | القضية — سجل واحد طوال دورة التقاضي |
| LitigationStage | مرحلة القضية (ابتدائي/استئناف/عليا/تنفيذ) |
| CaseParty | أطراف القضية (Party أو SubClient) |
| CaseAssignment | تكليفات القضية |

### Shared Components

| Entity | الغرض |
|---|---|
| Attachment | مستند مرتبط بأي Entity |
| Reminder | تذكير مرتبط بأي Entity |
| CustomFieldDefinition / CustomFieldValue | محرك الحقول المخصصة |
| AuditLog | سجل تدقيق مركزي |
| RecordAccessGrant 🆕 | يطبّق "Specific Users" ضمن Record Privacy (طلبتم تصميم الآلية في البند 6 — هذا الجدول هو تنفيذها، وليس Business Entity جديد) |
| NumberingSequence 🆕 | يولّد الترقيم الداخلي (CL-0001...) بدون الاعتماد على الرقم كـPrimary Key — تنفيذ للبند 7 |
| Session, VerificationToken 🆕 | جداول تقنية بحتة يتطلبها Auth.js لتسجيل الدخول وإعادة تعيين كلمة المرور (بند 4) — ليست كيانات أعمال |

لم تتم إضافة أي جدول آخر خارج هذه القائمة.

## 3. Prisma Schema Draft

> **الكود الفعلي الآن Drizzle، لا Prisma.** النص أدناه هو الـDraft الأصلي كما زوّدنا به المستخدم، محفوظ للأرشفة فقط. الترجمة الفعلية الكاملة إلى جداول Drizzle موجودة في `lib/db/src/schema/*.ts` بنفس المشروع.

ملاحظة مهمة: هذا Draft معماري لمراجعة العلاقات والحقول الأساسية فقط. حقول واجهة إضافية (مثل تفاصيل الأصول/المساهمين داخل Sub-Client المذكورة في المتطلبات الأصلية) متروكة كـJson? مؤقتًا وستُفصَّل في Phase 2 عند بدء التنفيذ الفعلي، حتى لا نُثقل Draft القرار المعماري بتفاصيل واجهة لم تُعتمد بعد.

القرارات الأساسية الموثّقة في الملاحظات المرافقة للـSchema الأصلي:

- **createdById / updatedById**: حقول نصية عادية بدون Prisma relation() نحو User، لتفادي انفجار العلاقات العكسية على نموذج User. التكامل المرجعي يُفرض عبر منطق التطبيق.
- **AuditLog.clientId**: بدون relation() رسمية أيضًا، لنفس السبب، مع فهرسة (@@index) بدلاً من العلاقة.
- **الحقول متعددة الأشكال** (entityType + entityId في Attachment, Reminder, CustomFieldValue, RecordAccessGrant, LegalMatterTimeline) لا يمكن أن تحمل Foreign Key حقيقي لأنها تشير لأكثر من جدول محتمل — Trade-off مقصود موضّح في القسم 10 (المخاطر).
- **معرّف Primary Key**: cuid() وليس رقم تسلسلي، لتفادي تخمين المعرّفات عبر الـTenants ولأن الرقم الداخلي (CL-0001...) ممنوع أن يكون Primary Key حسب طلبكم صراحة.

(الـSchema الكامل — كل الـmodels والـenums بالتفصيل — مطابق تمامًا لِما تُرجم إلى `lib/db/src/schema/`؛ راجع تلك الملفات للتفاصيل الحرفية بدل تكرارها هنا.)

## 4. ERD — العلاقات بين الكيانات

```mermaid
erDiagram
    CLIENT ||--o{ USER : has
    CLIENT ||--o{ SUB_CLIENT : has
    CLIENT ||--o{ PARTY : has
    CLIENT ||--o{ LEGAL_MATTER : has
    CLIENT ||--o{ LITIGATION_CASE : has
    CLIENT ||--o{ ROLE : customizes
    CLIENT ||--o{ TEAM : has
    CLIENT ||--|| CLIENT_LIMITS : has
    CLIENT ||--o{ CLIENT_MODULE : enables
    MODULE ||--o{ CLIENT_MODULE : "enabled via"
    PLAN ||--o{ CLIENT : subscribes
    ROLE ||--o{ USER : "assigned to"
    ROLE ||--o{ ROLE_PERMISSION : grants
    PERMISSION ||--o{ ROLE_PERMISSION : "granted via"
    PERMISSION ||--o{ USER_PERMISSION_OVERRIDE : "overridden via"
    USER ||--o{ USER_PERMISSION_OVERRIDE : has
    TEAM ||--o{ TEAM_MEMBER : has
    USER ||--o{ TEAM_MEMBER : "member of"
    SUB_CLIENT ||--o{ SUB_CLIENT_USER_RELATION : has
    USER ||--o{ SUB_CLIENT_USER_RELATION : "linked to"
    PARTY ||--o| PARTY_INDIVIDUAL_PROFILE : extends
    PARTY ||--o| PARTY_ORGANIZATION_PROFILE : extends
    PARTY ||--o{ PARTY_RELATIONSHIP : from
    PARTY ||--o{ PARTY_RELATIONSHIP : to
    PARTY_CATEGORY ||--o{ PARTY : classifies
    PARTY_CATEGORY ||--o{ PARTY_SUBCATEGORY : has
    SUB_CLIENT ||--o| PARTY : "optionally linked to"
    LEGAL_MATTER_TYPE ||--o{ LEGAL_MATTER : classifies
    LEGAL_MATTER_CATEGORY ||--o{ LEGAL_MATTER : classifies
    LEGAL_MATTER_CATEGORY ||--o{ LEGAL_MATTER_SUBCATEGORY : has
    LEGAL_MATTER_STATUS ||--o{ LEGAL_MATTER : "current status"
    LEGAL_MATTER ||--o{ LEGAL_MATTER_ASSIGNMENT : has
    LEGAL_MATTER ||--o{ LEGAL_MATTER_TIMELINE : has
    LEGAL_MATTER ||--o{ LITIGATION_CASE : "parent of"
    LITIGATION_REQUEST ||--o| LITIGATION_CASE : "converts to"
    SUB_CLIENT ||--o{ LITIGATION_REQUEST : submits
    LITIGATION_CASE ||--o{ LITIGATION_STAGE : has
    LITIGATION_CASE ||--o{ CASE_PARTY : has
    LITIGATION_CASE ||--o{ CASE_ASSIGNMENT : has
    PARTY ||--o{ CASE_PARTY : "may appear as"
    SUB_CLIENT ||--o{ CASE_PARTY : "may appear as"
    CUSTOM_FIELD_DEFINITION ||--o{ CUSTOM_FIELD_VALUE : has
```

(الجداول متعددة الأشكال — Attachment, Reminder, AuditLog, RecordAccessGrant, NumberingSequence — غير ممثَّلة في الرسم لأنها ترتبط بعدة كيانات عبر entityType/entityId وليس FK تقليدي؛ موضّحة نصيًا في القسم 2.)

### تأكيد القواعد التي حددتموها

| القاعدة المطلوبة | كيف تم تنفيذها |
|---|---|
| Client هو Tenant الرئيسي | كل الجداول التشغيلية تحمل clientId |
| كل البيانات التشغيلية مرتبطة بـClient | راجع كل Model في القسم 3 |
| SubClient مستقل عن User وParty | SubClient جدول مستقل، SubClientUserRelation هو الرابط الوحيد مع User، ولا علاقة مباشرة مع Party إلا عبر Party.linkedSubClientId الاختياري |
| SubClient يُستخدم مباشرة كطرف في قضية | CaseParty.subClientId |
| Party فردي أو شركة | Party.type + Profile منفصل لكل نوع |
| LegalMatter هو Parent | LitigationCase.matterId إجباري |
| LitigationCase مرتبط بـLegalMatter | نفس الحقل أعلاه |
| LitigationCase سجل واحد بمراحل متعددة | LitigationStage[] تابعة لنفس LitigationCase.id، لا يُنشأ Case جديد للاستئناف/العليا/التنفيذ |
| User منفصل تمامًا عن Party | لا يوجد أي FK بين الجدولين |
| يمكن ربط User بـSubClient | SubClientUserRelation |
| Parties ترتبط ببعضها عبر PartyRelationship | PartyRelationship.fromPartyId/toPartyId |

## 5. Multi-Tenant Strategy

النموذج: Shared Database, Shared Schema، عزل عبر clientId (وليس Database-per-Tenant أو Schema-per-Tenant). هذا قرار تقني يحتاج اعتمادكم — البديل (DB منفصلة لكل Client) يعطي عزلًا أقوى لكنه يرفع تكلفة التشغيل والـMigrations بشكل كبير غير مبرر في هذه المرحلة. راجع القسم 10.

### كيف يُحدَّد Tenant من الـSession

عند تسجيل الدخول، تحمل الـSession (مخزّنة في DB، انظر القسم 6) userId + clientId + roleId بشكل ثابت.

clientId لا يُقرأ أبدًا من الـRequest (لا من Header ولا Body ولا Query String) — فقط من الـSession الموقّعة على السيرفر، لمنع أي Spoofing.

كل Request يمر عبر Middleware يبني TenantContext { clientId, userId, roleId } ويمرره لطبقة الـServices.

### كيف يُمنع الوصول العابر للـTenants (Cross-Tenant Access) — دفاع بثلاث طبقات

1. **Service Layer**: كل دالة Service تتطلب TenantContext كأول Parameter إجباري (لا توجد دالة Service بدونه) — امتناع بنيوي، وليس فقط اتفاقًا برمجيًا.
2. **Repository Layer عبر Prisma Client Extensions**: نبني Prisma Client موسّع ($extends) يفرض تلقائيًا where: { clientId } على كل عملية قراءة/كتابة على النماذج التي تحمل clientId، بحيث يصبح من المستحيل هيكليًا استدعاء prisma.legalMatter.findMany() بدون Scope — أي محاولة استعلام بدون clientId صريح تُرفض في وقت الـCode Review/الـLint أيضًا عبر قاعدة ESLint مخصصة تمنع استيراد prisma مباشرة خارج طبقة الـRepositories.

   > **Drizzle equivalent**: بما أن Drizzle لا يملك آلية Client Extensions بنفس الشكل، البديل هو wrapper مركزي حول query builder (أو repository base class) يفرض `clientId` صراحة على كل استعلام، بالإضافة لنفس قاعدة الـESLint لمنع استيراد `db` مباشرة خارج طبقة الـrepositories. **لم يُنفَّذ بعد** — بند مفتوح لجولة Milestone 1 القادمة.

3. **Postgres Row-Level Security (RLS) كخط دفاع أخير**: تفعيل RLS على كل جدول يحمل clientId، مع Policy مثل:

```sql
CREATE POLICY tenant_isolation ON legal_matter
  USING (client_id = current_setting('app.current_client_id')::text);
```

يتم ضبط app.current_client_id عبر SET LOCAL داخل كل Transaction. هذا يحمي حتى لو وُجد خطأ برمجي في الطبقتين أعلاه (مثل Raw Query نُسي فيها الـFilter). هذا يحتاج قرارًا صريحًا منكم لأنه يضيف تعقيدًا تشغيليًا (كل استعلام يجب أن يمر داخل Transaction يضبط المتغير) — البديل هو الاكتفاء بالطبقتين 1 و2 فقط. راجع القسم 10.

### اختبار Tenant Isolation

Test Suite مخصص (/tests/integration/tenant-isolation): يُنشئ Client A و Client B ببيانات مشابهة، ثم:

- يحاول قراءة/تعديل بيانات B عبر Session خاصة بـA على مستوى الـService — يجب أن يُرجع صفر نتائج أو Access Denied.
- يحاول نفس الشيء عبر Repository مباشرة بدون المرور بالـService — للتأكد أن الحماية ليست فقط في مكان واحد.
- Test بنيوي (Static): يقرأ Prisma DMMF ويتأكد أن كل Model يحمل حقل clientId له Wrapper مفروض في طبقة الـRepository (يفشل الـBuild لو أُضيف Model جديد بـclientId بدون أن يُسجَّل في طبقة العزل). *(مع Drizzle: البديل هو قراءة تعريفات الجداول من `lib/db/src/schema` بدل Prisma DMMF.)*

## 6. Authentication Strategy

### الفاعلون (Actors)

| Actor | الجدول | ملاحظة |
|---|---|---|
| Platform Owner | PlatformUser | خارج نطاق أي Client، Portal منفصل بالكامل |
| Client Primary Admin | User (مع isPrimaryAdmin = true) | ليس نوع حساب منفصل، بل علامة على User بالإضافة لـRole عادي (Client Admin) |
| Privileged User | User (accountType = PRIVILEGED) | يُحتسب ضمن ClientLimits.maxPrivilegedUsers |
| Standard User | User (accountType = STANDARD) | بدون سقف |
| Sub-Client User | User (accountType = SUB_CLIENT) + SubClientUserRelation | يُحتسب ضمن ClientLimits.maxSubClientUsers |

### Login Flow

لا يوجد Self-Registration المفتوح — كل حساب يُنشأ عبر Admin (Primary Admin أو Platform Owner)، ثم يُرسَل Invite Link موقّع (VerificationToken.purpose = INVITE_ACTIVATION) صالح لمدة محدودة، يقوم المستخدم عبره بتعيين كلمة المرور وتفعيل الحساب (status: INVITED → ACTIVE). هذا يغطي متطلب "Email Verification" فعليًا (تفعيل الحساب = تأكيد ملكية البريد).

تسجيل الدخول عبر Auth.js (Credentials Provider: بريد + كلمة مرور، بـPassword Hashing عبر argon2).

تحديد الـTenant عند تسجيل الدخول — هذه نقطة تحتاج قراركم، انظر Questions أدناه، الافتراض المستخدم في هذا الـDraft: كل Client له Subdomain خاص ({client-slug}.app.legaltech.com)، ويُحدَّد clientId من الـSubdomain وقت Login، لا من إدخال المستخدم.

### Sessions

DB-backed Sessions (وليس JWT فقط) عبر Auth.js + جدول Session — القرار مبني على أن الحسابات المعطَّلة يجب أن تُقفَل فورًا (متطلب صريح: "Disabled Users")، وهذا غير ممكن بشكل موثوق مع JWT Stateless إلا بقوائم Blacklist إضافية تُعقّد الحل دون داعٍ. مع DB Session: تعطيل مستخدم = حذف كل صفوف Session الخاصة به فورًا.

### Password Reset

طلب إعادة تعيين → VerificationToken (purpose = PASSWORD_RESET)، صالح 30 دقيقة، Single-Use، يُرسَل بالبريد.

### Account Status & Last Login

User.status: INVITED | ACTIVE | DISABLED | LOCKED.

LOCKED مقترح اختياري (بعد عدد محاولات دخول فاشلة) — ليس مطلوبًا صراحة في المتطلبات، مذكور كـAssumption قابلة للإزالة.

User.lastLoginAt يُحدَّث عند كل دخول ناجح.

تعطيل المستخدم (DISABLED) يمنع Login جديد + يُبطل كل Sessions الحالية فورًا + يُسجَّل في AuditLog (action = USER_DISABLED).

## 7. Roles & Permissions Design

### تصميم مفاتيح الصلاحيات (Permission Keys)

الصيغة: module.resource.action

- module: core (منصة/مستخدمين/إعدادات) | party | sub_client | legal_matter | litigation | contract (مستقبلًا).
- resource: الكيان المستهدف، مثل case, matter, user.
- action: من المفردات الثابتة المطلوبة: view, create, edit, delete, assign, approve, export, manage_users, manage_settings, view_reports.

أمثلة مطابقة لما ورد في طلبكم بالضبط: litigation.case.view, litigation.case.create, party.edit, client.users.manage.

ملاحظة دقيقة: client.users.manage كما ورد في مثالكم يكسر نمط module.resource.action بترتيب resource.action مباشرة بعد client بدل module. اعتمدنا القراءة التالية: client هنا هو الـmodule (core)، والمفتاح الفعلي المخزَّن هو core.users.manage_users. إن كان القصد نمطًا مختلفًا فهذه نقطة تحتاج توضيحكم (انظر Questions).

> **حُسم في التنفيذ الفعلي**: اعتُمد `core.user.manage_users` (مفرد `user` لا `users`، اتساقًا مع بقية أسماء الـresources). راجع `lib/db/src/seed.ts`.

### آلية الحل (Resolution)

```
function hasPermission(user, permissionKey):
    if not client.hasModuleEnabled(moduleOf(permissionKey)):
        return false                        // بوابة تفعيل الـModule أولاً
    override = getUserOverride(user, permissionKey)
    if override == DENY:  return false      // المنع الفردي له الأولوية القصوى
    if override == GRANT: return true       // منح فردي حتى لو الدور لا يملكها
    return roleHasPermission(user.role, permissionKey)
```

RolePermission: الصلاحيات الافتراضية للدور (Additive فقط، لا يوجد Deny على مستوى Role — المنع الوحيد يكون فرديًا عبر UserPermissionOverride).

UserPermissionOverride: GRANT أو DENY مستقل لكل مستخدم، له الأولوية فوق الدور، وDENY له الأولوية فوق GRANT عند التعارض النظري (لن يحدث تعارض عمليًا لأن كل صف يمثل صلاحية واحدة فقط لكل مستخدم — @@unique([userId, permissionId])).

Roles الجاهزة (isSystem = true, clientId = null) تُستنسخ كنقطة بداية عند إنشاء Client جديد، ويمكن للـClient تعديل نسخته الخاصة دون التأثير على القالب النظامي.

### الأدوار الافتراضية (Seed)

Client Admin, Legal Director, Litigation Manager, Contract Manager, Lawyer, Standard User, External User — كما وردت حرفيًا في متطلباتكم، بدون إضافة أدوار جديدة.

## 8. Record-Level Privacy Design

مستقلة تمامًا عن RBAC — طبقة تحقق إضافية بعد التأكد من الصلاحية العامة.

### التصميم

كل Record رئيسي (LegalMatter, LitigationCase, Party, ولاحقًا Contract/Attachment) يحمل حقل privacyMode: ALL_AUTHORIZED | SPECIFIC_USERS مباشرة على جدوله.

عند SPECIFIC_USERS، تُخزَّن القائمة في جدول عام واحد قابل لإعادة الاستخدام: RecordAccessGrant (entityType, entityId, userId) — بدلًا من جدول Grant منفصل لكل كيان (PartyAccess, CaseAccess...)، تحقيقًا لمتطلبكم الصريح "يجب أن تكون الآلية قابلة لإعادة الاستخدام".

Trade-off مقصود: هذا النمط "متعدد الأشكال" (Polymorphic) لا يمكن أن يحمل Foreign Key حقيقي في PostgreSQL/Prisma تجاه الجدول المستهدف (لأن entityId قد يشير لأي جدول حسب entityType) — التكامل المرجعي يُفرض عبر منطق التطبيق فقط، وليس عبر DB Constraint. البديل (جدول Grant منفصل لكل كيان) يعطي تكاملًا مرجعيًا حقيقيًا لكن يخالف طلب إعادة الاستخدام ويُنتج جداول متكررة. هذا قرار يحتاج اعتمادكم — راجع القسم 10.

### منطق التحقق

```
function canAccessRecord(user, record):
    if not hasPermission(user, record.viewPermissionKey):
        return false                                   // RBAC أولاً
    if record.privacyMode == ALL_AUTHORIZED:
        return true
    if record.createdById == user.id:
        return true                                     // المنشئ يرى دائمًا
    if isAssignedTo(user, record):                       // عبر *Assignment tables
        return true                                      // المكلَّف يرى دائمًا (Assumption — انظر Questions)
    return RecordAccessGrant.exists(record.type, record.id, user.id)
```

## 9. Internal Numbering

جدول NumberingSequence (clientId, entityType, prefix, padding, nextValue) — واحد لكل (Client × نوع كيان).

الرقم الداخلي (CL-0001) ليس Primary Key؛ يُخزَّن كحقل code فريد (@unique) بجانب id (cuid) الذي يبقى المفتاح الأساسي الفعلي في كل العلاقات.

التزامن (Concurrency): توليد الرقم يتم داخل Transaction واحدة تستخدم SELECT ... FOR UPDATE على صف NumberingSequence المطابق قبل القراءة والزيادة، لمنع تكرار نفس الرقم عند إنشاء سجلين في نفس اللحظة. هذا قرار تقني يحتاج توثيقه لأنه يضيف نقطة تسلسل (Serialization Point) صغيرة لكل عملية إنشاء — الأثر ضئيل عمليًا لأن الإنشاء ليس عملية عالية التردد.

الصيغة والـPrefix قابلان للتخصيص لاحقًا لكل Client دون تعديل بنية الجدول (فقط تحديث الصف).

## 10. Custom Fields, Audit Trail — تفاصيل تنفيذية إضافية

### Custom Fields

تخزين القيم بأعمدة مفصولة حسب النوع (valueText, valueNumber, valueDate, valueBoolean, valueJson) بدلًا من عمود JSON واحد لكل القيم — قرار يحتاج اعتمادكم: البديل (JSON واحد) أبسط تنفيذًا لكنه يمنع الفلترة/الفرز/التقارير المستقبلية على قيم Custom Fields بكفاءة (مطلوب لاحقًا في Phase 5: Reports/Analytics)؛ الأعمدة المفصولة تدعم ذلك من اليوم الأول.

### Audit Trail

الالتقاط يتم عبر Prisma Client Extension مركزي يعترض عمليات create/update/delete على النماذج المحددة، ويكتب تلقائيًا الفرق (oldValue/newValue) دون الحاجة لاستدعاء يدوي في كل Service — مع استثناء: الأحداث ذات السياق الدلالي الغني (تغيير حالة بسبب معيّن، دمج أطراف، تغيير صلاحيات) تُسجَّل يدويًا بجانب الالتقاط التلقائي لأنها تحتاج وصفًا لا يُستنتج من الفرق الخام وحده.

> **Drizzle equivalent**: لا يوجد Client Extension مكافئ مباشر؛ البديل هو Postgres trigger أو wrapper صريح حول عمليات الكتابة في طبقة الـrepositories يكتب سطر AuditLog بعد كل mutation. **لم يُنفَّذ بعد**.

حماية الثبات: صلاحيات UPDATE/DELETE على جدول audit_log تُسحَب من الـDatabase Role الذي يستخدمه التطبيق (REVOKE UPDATE, DELETE ON audit_log FROM app_role) — دفاع على مستوى الـDB نفسه، وليس فقط منع في الكود.

## 11. Folder Structure

> هيكل مقترح من Draft v1 (يفترض Next.js App Router). المشروع الفعلي بنيته مختلفة (Express api-server + Vite/React SPA منفصلين) — راجع القسم 12 في FOUNDATION-BLUEPRINT.md. القرار حول تبنّي هذا الهيكل أو تكييفه لم يُتخذ بعد.

```text
/prisma
  schema.prisma
  /migrations
  seed.ts                     # Roles, Permissions, Modules الافتراضية
/src
  /app                        # Presentation فقط — لا Prisma هنا مباشرة
    /(platform-owner)/...     # Portal مالك المنصة
    /(client-app)/...         # تطبيق الـClient (Tenant-resolved)
    /api/...                  # Route Handlers للـWebhooks/تكاملات خارجية فقط
  /modules                    # منطق الأعمال — مقسّم حسب الـModules التجارية
    /core                     # Client, User, Role, Permission, Team, Numbering, Audit
    /parties
    /sub-clients
    /legal-matters
    /litigation
    /shared                   # Attachment, Reminder, Custom Fields
    <each module>/
      services/                # Use-cases + Business Rules
      repositories/            # Prisma Tenant-Scoped Access
      validators/               # Zod Schemas
      permissions/              # Permission Keys + Guards الخاصة بالـModule
      types/
  /lib
    /auth                    # Auth.js config, Session helpers
    /tenant                  # TenantContext resolution + Prisma Extension
    /rbac                    # محرك حل الصلاحيات (القسم 7)
    /privacy                 # محرك Record-Level Privacy (القسم 8)
    /audit                   # Prisma Extension لتسجيل التدقيق
    /db                      # Prisma Client singleton (موسّع بالـExtensions)
  /components
    /ui                      # shadcn/ui primitives
    /shared                  # مكوّنات مركّبة معاد استخدامها بين الـModules
  /types                     # أنواع مشتركة عابرة للـModules
  /config
/tests
  /integration
    /tenant-isolation
  /unit
```

قاعدة الفصل الصارمة: /app لا يستدعي شيئًا سوى /modules/*/services. لا Prisma خارج /modules/*/repositories. فحص الصلاحيات يبدأ من /lib/rbac ويُستدعى من طبقة الـServices — وليس فقط في الواجهة (تحقيقًا لقاعدتكم رقم 36: "لا تعتمد على Frontend Permissions فقط").

## 12. Risks & Technical Decisions Requiring Approval

| # | القرار | الخيار المقترح في هذا الـDraft | البديل | الأثر |
|---|---|---|---|---|
| 1 | نموذج العزل بين الـTenants | Shared DB/Schema + clientId + Prisma Extension | DB منفصلة لكل Client | البديل يرفع تكلفة التشغيل والـMigrations بشكل كبير غير مبرر حاليًا |
| 2 | تفعيل Postgres RLS كطبقة حماية إضافية | مفعّل | الاكتفاء بطبقتي Service+Repository | يضيف تعقيدًا تشغيليًا (كل استعلام داخل Transaction يضبط متغير الجلسة) مقابل حماية إضافية حقيقية |
| 3 | Record Privacy: جدول عام واحد (RecordAccessGrant) | مفعّل | جدول Grant منفصل لكل كيان | الخيار المعتمد لا يملك FK حقيقي (تكامل مرجعي بالتطبيق فقط)؛ البديل يعطي تكاملًا أقوى لكن يخالف طلب "قابل لإعادة الاستخدام" |
| 4 | تخزين Custom Field Values | أعمدة مفصولة حسب النوع | عمود JSON واحد | الخيار المعتمد يدعم الفلترة/التقارير مستقبلًا، لكنه أكثر تعقيدًا في القراءة |
| 5 | نوع الـSessions | DB-backed (Auth.js + جدول Session) | JWT فقط | مطلوب للإبطال الفوري عند تعطيل مستخدم |
| 6 | Primary Key | cuid() غير قابل للتخمين | رقم تسلسلي Int | الرقم التسلسلي أبسط لكنه يسمح بتخمين/عدّ السجلات عبر الـTenants |
| 7 | Platform Owner | جدول PlatformUser منفصل | حقل خاص على User نفسه | الفصل يمنع أن يصبح clientId اختياريًا على كل استعلامات User |
| 8 | نطاق Soft Delete | Client, SubClient, User, Party, Team, LegalMatter, LitigationCase, Attachment فقط | كل الجداول | جداول الربط/الـLogs لا تحتاج Soft Delete (تُحذف Hard أو تبقى دومًا) |
| 9 | التزامن في الترقيم الداخلي | SELECT ... FOR UPDATE على صف Sequence | معرّف عشوائي بدل تسلسلي | التسلسلي مطلوب صراحة (CL-0001, CL-0002...)، لذا يجب قفل الصف لحظيًا |
| 10 | تعريف علاقات createdById/updatedById | حقول نصية بدون Prisma relation | Relation كامل نحو User | تفادي انفجار عدد العلاقات العكسية على User |

### Questions — تحتاج قراركم قبل اعتماد الـSchema نهائيًا

1. **نطاق تفرد البريد الإلكتروني**: هل email فريد على مستوى المنصة كاملة (Global)، أم فريد ضمن كل Client (كما افترضنا في الـDraft: @@unique([clientId, email]))؟ هذا يحدد: هل يمكن لنفس الشخص (بنفس البريد) أن يكون Sub-Client User لدى أكثر من Client في نفس الوقت؟ وهذا بدوره يحدد آلية تحديد الـTenant عند تسجيل الدخول (Subdomain لكل Client، أو تسجيل دخول موحّد ثم اختيار Workspace).
2. **آلية تحديد الـTenant عند Login**: افترضنا Subdomain لكل Client ({slug}.app.legaltech.com). هل هذا مقبول، أم تفضلون آلية أخرى (Path-based، أو صفحة اختيار Client بعد إدخال البريد)؟
3. **نوع علاقة PartyRelationship**: هل "نوع العلاقة" (Manager Of, Subsidiary Of...) قائمة Enum ثابتة، أم Lookup Table قابلة للتخصيص من كل Client (مثل Categories)؟ الـDraft الحالي تركها String حرة مؤقتًا لحين تحديد ذلك.
4. **صياغة مثال الصلاحية client.users.manage**: هل تتبع نفس نمط module.resource.action المعتمد لبقية الأمثلة، أم أن client.* نمط خاص بصلاحيات مستوى المنصة/العميل ككل؟
5. **هل المستخدم المكلَّف (Assigned) على سجل يرى السجل تلقائيًا** حتى لو كان privacyMode = SPECIFIC_USERS ولم يُدرَج صراحة في RecordAccessGrant؟ افترضنا نعم (منطقيًا)، لكنها تحتاج تأكيدكم صراحة.
6. **هل مراحل التقاضي (LitigationStage) تحتاج تخصيصًا لكل Client** مثل حالات Legal Matter، أم تكفي القائمة الثابتة (ابتدائي/استئناف/عليا/تنفيذ) كـEnum نظامي في هذه المرحلة؟

### Assumptions — افتراضات استخدمناها لإكمال الـDraft (قابلة للتعديل)

- isPrimaryAdmin علامة Boolean على User العادي (وليس نوع حساب مستقل).
- كل User يملك دورًا واحدًا فقط (roleId مفرد) استنادًا لصياغة "اختيار Role" في متطلباتكم — إن كان مطلوبًا دعم أدوار متعددة لنفس المستخدم فهذا يغيّر User.roleId إلى جدول ربط UserRole.
- LOCKED كحالة حساب اختيارية (بعد محاولات دخول فاشلة متكررة) — لم تُطلب صراحة، ويمكن حذفها إن لم تكن مطلوبة.
- عند قبول LitigationRequest، يُنشأ LitigationCase جديد يشير إليه عبر originRequestId، بدلًا من تحويل نفس السجل — للحفاظ على أثر الطلب الأصلي كسجل تاريخي منفصل.
- حقول تفاصيل Sub-Client الموسّعة (مساهمون، مجلس إدارة، حسابات مصرفية، أصول...) محفوظة مؤقتًا في generalInfo Json? ريثما تُفصَّل جداولها المستقلة عند بدء التنفيذ الفعلي لهذا الجزء — لتفادي تضخيم Draft القرار المعماري بتفاصيل واجهة غير معتمدة بعد.

الخطوة التالية: بانتظار اعتمادكم أو تعديلاتكم على أي من الأقسام أعلاه (خصوصًا القرارات في القسم 12 والأسئلة في القسم الأخير) قبل البدء بأي تنفيذ فعلي لـFoundation Phase.
