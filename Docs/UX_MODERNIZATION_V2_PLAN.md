# UX Modernization Initiative v2.0 — خطة التنفيذ

> **مصدر الحقيقة للمنصة:** `Docs/AI_PLATFORM_CONTEXT.md`  
> **إصدار المنصة عند إعداد الخطة:** v1.28.5  
> **تاريخ الخطة:** 2026-08-01  
> **نطاق المبادرة:** إعادة تنظيم تجربة المستخدم فقط — بدون ميزات جديدة، بدون كسر وظائف، بدون تغيير منطق الأعمال، وبدون تعديل قاعدة البيانات إلا إذا فرضت مرحلة لاحقة ذلك صراحةً.

---

## 0) مبادئ غير قابلة للتفاوض

| القاعدة | التفصيل |
|--------|---------|
| لا حذف ميزات | كل مسار وظيفي موجود يبقى متاحاً (صفحة أو تبويب أو رابط داخل Hub) |
| لا تغيير Business Logic | خدمات `src/lib/**` ومنطق الاعتماد/النقاط/RLS تبقى كما هي |
| لا DB افتراضياً | Migration ممنوعة إلا بموافقة مرحلة مكتوبة + سبب UX تقني فقط |
| لا Edge Functions جديدة افتراضياً | إلا إذا ظهرت حاجة قياس/تفضيلات مستخدم لاحقاً |
| Routes القديمة تُحافظ | أي دمج يتم عبر Hub + `Navigate` redirect — لا كسر روابط محفوظة/أدلة |
| ZIP قبل كل مرحلة كبيرة | حسب `.cursor/rules/version-management.mdc` |
| RTL أولاً | أي إعادة تصميم تُبنى عربية من الأساس |

---

## 1) ملخص تشخيص المشروع الحالي

### 1.1 الحجم والهيكل

| الطبقة | الواقع |
|--------|--------|
| Pages | ~112 ملف شاشة تحت `src/pages/` |
| Components | ~172 مكوّن |
| Lib / Services | ~156 ملف منطق |
| Stores (Zustand) | 3 فقط: `authStore`, `teacherModeStore`, `parentChildStore` |
| Layout | Layout واحد: `src/layouts/AppLayout.tsx` (~524 سطر) لكل الأدوار المحمية |
| Router | `src/router/index.tsx` (~707 سطر) — شجرة أدوار متداخلة + AcademicSetupGate |
| ROLE_NAV | قائمة مسطحة لكل دور في `src/types/index.ts` |

### 1.2 كثافة التنقل الجانبي (ROLE_NAV)

| الدور | عدد عناصر القائمة | ملاحظة UX |
|-------|-------------------|-----------|
| principal | 20 | أعلى حمل معرفي + مزج أولمبياد/أكاديمي/إدارة |
| supervisor | 19 | 7 عناصر تحليلات منفصلة رغم وجود Hub بتبويبات |
| admin | 18 | تقارير متعددة + مراكز جزئية موجودة |
| teacher | 17 قبل الفلترة | يُفلتر بوضع أولمبياد/أكاديمي لكن بدون تجميع |
| deputy | 12 | لا Dashboard مخصص — يعرض AcademicStaffHub كرئيسية |
| parent | 9 | تفرّق أكاديمي على 4–5 صفحات |
| student | 8 | أوضح نسبياً |
| reviewer | 2 | أبسط دور |

### 1.3 أنماط موجودة يُستفاد منها (لا تُخترع من الصفر)

| النمط | أين | الدرس |
|-------|-----|------|
| Hub بتبويبات | `PointsHubPage`, `AdminAttendanceHubPage`, `AdminUsersHub`, `AdminIdCardsHubPage`, `AnalyticsPage` | الدمج عبر تبويب أفضل من حذف صفحات |
| Mode Toggle | `TeacherModeToggle` + `teacherMode.ts` | فصل سياقي ناجح يحتاج دعم IA أوضح |
| Academic Hub Cards | `AcademicStaffHubPage`, `PrincipalAcademicHubPage` | جيد كمدخل لكن مكرر مع ROLE_NAV |
| Horizon Dashboard | Principal/Teacher | نواة تصميم حديثة غير موحّدة على باقي الأدوار |
| AcademicUi | وحدة أكاديمية | نظام بصري ثانٍ موازٍ لـ Horizon/ui |
| ParentPageShell | بوابة ولي الأمر | غلاف خفيف فقط — ليس IA كامل |

---

## 2) تحليل الوحدات (وضع UX الحالي)

### 2.1 Teacher Mode (`olympiad` | `academic`)
- الفلترة تعمل عبر `filterTeacherNavByMode`.
- المسارات المشتركة: AI Assistant + إعداد الملف.
- **ضعف:** القائمة تبقى مسطحة داخل كل وضع؛ التبديل يعيد لـ `/dashboard` دون «منزل وضع» واضح؛ بعض عناصر ROLE_NAV مكررة مع بطاقات الـ Hub الأكاديمي.

### 2.2 Academic Module
- مسارات `/academic/*` + `/principal/academic/*`.
- بوابتان: `AcademicStaffHubPage` و`PrincipalAcademicHubPage`.
- **ضعف:** المدير يرى «الشؤون الأكاديمية» و«الإدارة الأكاديمية» وعدة عناصر أكاديمية مباشرة في السايدبار معاً.

### 2.3 Olympiad Module
- نقاط، حضور، أنشطة، تقارير، متصدرون، بطاقات، مكافآت.
- مراكز جزئية جيدة (`/admin/points`, `/admin/attendance`, `/admin/users`).
- **ضعف:** التقارير مبعثرة (`/admin/reports`, classes/teachers/equity/class-report) ومسارات `/admin/*` تظهر أيضاً في قائمة المدير.

### 2.4 AI Module
- معلم: `/teacher/ai-assistant` (AiStudioShell — ناضج نسبياً).
- مدير: `/principal/ai-settings`.
- **ضعف UX طفيف:** اكتشاف الميزة داخل القائمة وسط عناصر كثيرة؛ ليس أولوية إعادة بناء.

### 2.5 WhatsApp Module
- شاشة واحدة رئيسية: `/principal/academic/whatsapp-reminders` + أدوات داخل صفحات أكاديمية.
- **ضعف:** مدفونة تحت أكاديمي؛ لا حاجة لتغيير منطق الإرسال.

### 2.6 Parent Portal
- Dashboard غني بالمكوّنات + صفحات منفصلة: ملف، حضور، نتائج، واجبات، طلب ملاحظة، طلباتي، مراجعات، ربط ابن.
- **ضعف:** رحلة مجزأة؛ تكرار طلب/طلبات؛ اختيار الابن غير موحّد بصرياً في كل الصفحات بنفس القوة.

### 2.7 Student Portal
- `/student` + أكاديمي + اختبارات + محفظة + مكافآت + متصدرون + ملف.
- **ضعف:** أقل حدة؛ يحتاج تناسق بصري مع النظام الموحّد أكثر من إعادة هيكلة.

### 2.8 Principal Portal
- Dashboard مزدوج الوضع (Horizon) + تنفيذية + مستخدمون + أكاديمي + تقييم + مسابقة + AI.
- **ضعف:** السايدبار الأطول؛ تداخل مسارات admin مع principal؛ ازدواجية المراكز الأكاديمية.

### 2.9 Supervisor Portal
- Dashboard تنبيهات + بنك أسئلة + اختبارات + تحليلات متعددة + أكاديمي جزئي.
- **ضعف:** ROLE_NAV يكرّر تبويبات `/analytics/:tab` كعناصر قائمة مستقلة.

---

## 3) نتائج التحليل المطلوبة

### 3.1 نقاط الضعف في تجربة المستخدم

1. **قائمة جانبية مسطحة ومزدحمة** — حتى 20 عنصراً بلا مجموعات (إدارة / تقارير / أكاديمي / أولمبياد).
2. **ازدواجية المدخلات** — نفس الوجهة تظهر كعنصر قائمة + بطاقة Hub + اختصار Dashboard.
3. **ثلاث طبقات بصرية** — Horizon / AcademicUi / Panel+glass-card بلا لغة موحّدة.
4. **Layout واحد لكل الأدوار** — لا فرق في كثافة المعلومات أو أولوية المهام بين مدير وولي أمر.
5. **رحلة ولي الأمر مجزأة** — متابعة الابن تتطلب تنقلاً بين صفحات كثيرة.
6. **تحليلات المشرف مكررة في القائمة** رغم وجود Hub بتبويبات جاهز.
7. **تقارير الأولمبياد مبعثرة** عبر مسارات admin متعددة.
8. **الوكيل بلا لوحة قيادة مخصصة** — يدخل مباشرة لشبكة بطاقات.
9. **اكتشاف الميزات ضعيف** — واتساب / AI / تقييم مدفونة وسط الضوضاء.
10. **موبايل/PWA** — السايدبار الطويل أقل ملاءمة للشاشات الصغيرة رغم وجود دعم أساسي.

### 3.2 أماكن تكرار الصفحات / المداخل

| التكرار | المواقع |
|---------|---------|
| مراكز أكاديمية متداخلة | `/academic` + `/principal/academic` + عناصر ROLE_NAV المباشرة |
| تقارير فصول/معلمين/عدالة | قائمة principal + admin + supervisor تشير لنفس صفحات `/admin/*-report` |
| تحليلات المشرف | 7 عناصر ROLE_NAV ≈ تبويبات `AnalyticsPage` |
| منح فردي/جماعي للمعلم | مساران في القائمة → صفحة واحدة `/points/grant` مع `?bulk=1` |
| طلب ملاحظة ولي الأمر | `/parent/academic/request` و`/parent/academic/requests` منفصلان وظيفياً لكن متقاربان رحلةً |
| لوحات المتصدرين | `/leaderboard` + `/admin/leaderboard` + `/display/leaderboard` + `/board/leaderboard` + `/competition/leaderboard` (أغراض عرض مختلفة — تكرار مفهومي لا دمج قسري) |
| تقييم المعلمين | `/principal/evaluation*` و`/academic/teacher-evaluation` و`/teacher/evaluation` (أدوار مختلفة — تكرار مفهومي مقصود) |

### 3.3 صفحات يمكن دمجها (UX فقط — مع الإبقاء على Routes القديمة كتحويل)

| الدمج المقترح | الآلية |
|---------------|--------|
| عناصر تحليلات المشرف السبعة → مركز تحليلات واحد في القائمة | القائمة تشير لـ `/analytics`؛ التبويبات تبقى |
| تقارير admin/principal المتفرقة → `ReportsHub` | تبويبات/أقسام داخل Hub؛ Redirect من المسارات القديمة |
| صفحات ولي الأمر الأكاديمية الأربع → `ParentAcademicHub` | تبويبات: واجبات / ملاحظات / مراجعات |
| طلب ملاحظة + طلباتي → تبويبان في نفس الـ Hub | بدون حذف المنطق |
| عناصر المعلم الأكاديمية المكررة مع `/academic` | الإبقاء على Hub كمدخل؛ تقليل عناصر القائمة الفرعية |
| إعدادات المدير الأكاديمية الفرعية | تبقى تحت `/principal/academic`؛ تُزال من السايدبار الأعلى إن وُجدت لاحقاً كروابط مباشرة |

### 3.4 صفحات تحتاج Dashboard جديد / أقوى

| الدور | الاحتياج |
|-------|----------|
| deputy | **DeputyDashboard جديد** (اليوم = AcademicStaffHub) |
| principal | تعزيز Command Center حسب الوضع (موجود جزئياً) |
| parent | **Parent Home أقوى** كمركز متابعة ابن واحد |
| supervisor | توحيد دخول أولمبياد-تقارير + أكاديمي في لوحة أوضح |
| admin | الإبقاء على AdminDashboard مع إعادة ترتيب الاختصارات حسب المهام اليومية |

### 3.5 صفحات تحتاج إعادة تصميم فقط (بدون دمج مسارات)

- `AppLayout` (مجموعات قائمة، رؤوس أقسام، كثافة موبايل)
- `LoginPage` / `RegisterPage` / `TeacherRegisterPage` (اتساق بصري)
- `TeacherDashboard` / `PrincipalDashboard` / `SupervisorDashboard` / `StudentDashboard` / `ParentDashboard`
- صفحات الأكاديمية التشغيلية (homework, weekly-plans, reviews…) — غلاف UI موحّد
- `ProgramSettingsPage` (كثافة عالية — تنظيم أقسام)
- `PrincipalAiSettingsPage` و`TeacherAiAssistantPage` — تلميع اكتشاف/هيكلة لا إعادة منطق
- `PrincipalWhatsAppRemindersPage` — وضوح حالات الاتصال والجدولة

### 3.6 صفحات يجب أن تبقى كما هي منطقياً (تغيير غلاف محدود أو صفر)

| المجال | السبب |
|--------|-------|
| `/class/:slug`, `/answer/:slug`, تدفق المسابقة الزمني | حساس للتوقيت/الصوت/APK |
| `/competition/leaderboard`, شاشات العرض `/display/*`, `/board/*` | شاشات عامة/TV |
| منطق منح/اعتماد النقاط | قلب الأولمبياد |
| `TakeExamPage` / `PrepExamPage` | تدفق اختبار حرج |
| Auth: login/callback/invite/force-password | أمني |
| Edge Functions وواتساب VPS | خارج نطاق UX UI |
| Stores الثلاثة ومنطقها | كافية؛ لا Stores إلزامية للمبادرة |
| AcademicSetupGate / Teacher setup | بوابة بيانات إلزامية |

### 3.7 ترتيب التنفيذ من الأقل خطورة إلى الأعلى

```
الأقل خطورة
  ① توثيق IA + Design Tokens (بدون سلوك)
  ② توحيد مكوّنات UI الأساسية (غلاف)
  ③ تجميع ROLE_NAV بصرياً (بدون حذف مسارات)
  ④ Hubs بالتبويبات + Redirects ناعمة
  ⑤ ترقية Dashboards حسب الدور
  ⑥ بوابة ولي الأمر
  ⑦ تجربة وضع المعلم
  ⑧ مركز المدير/رائد النشاط
  ⑨ إعادة ترتيب IA المشرف
  ⑩ تلميع بوابة الطالب + موبايل/PWA
  ⑪ تنظيف redirects والوثائق والتحقق الشامل
الأعلى خطورة (ما زالت بدون DB/Logic)
```

---

## 4) الخريطة المستهدفة للتنقل (IA Target — مفهومياً)

> لا تُنفَّذ هنا؛ مرجع للمراحل. المسارات القديمة تبقى كـ aliases.

### Principal
- الرئيسية
- مجموعة **التشغيل:** تنفيذية، مستخدمون، رفع/حسابات، صفوف
- مجموعة **أولمبياد:** مسابقة، تقارير أولمبياد (Hub)
- مجموعة **أكاديمي:** شؤون أكاديمية (Hub)، إدارة أكاديمية (Hub)، ملاحظات، مراجعات، واتساب، تقييم
- مجموعة **ذكاء:** إعدادات AI
- أدوات: محاكي QA (إن بقي ظاهراً)

### Teacher
- حسب الوضع فقط + مجموعات داخل الوضع (منح/طلاب | واجبات/خطط/جدول)

### Admin
- تشغيل يومي (نقاط/حضور/أنشطة) → تقارير Hub → إعدادات/أدلة

### Supervisor
- متابعة → بنك/اختبارات → تحليلات (Hub واحد) → أكاديمي مختصر

### Parent
- الرئيسية (ابن مختار) → أكاديمي (Hub) → حضور/نتائج/ملف/ربط

### Student / Reviewer / Deputy
- قوائم قصيرة؛ الوكيل يحصل Dashboard حقيقي ثم Hub أكاديمي

---

## 5) خطة المراحل التفصيلية

---

### Phase 0 — تجميد النطاق وخريطة IA
**الهدف:** اعتماد هذه الوثيقة كمرجع تنفيذ؛ جرد Routes ↔ ROLE_NAV ↔ Hubs.  
**الفائدة:** منع انحراف النطاق وإضافة ميزات «أثناء التجميل».  
**الملفات:** `Docs/UX_MODERNIZATION_V2_PLAN.md` (+ لاحقاً ملحق IA إن لزم).  
**المخاطر:** منخفضة جداً.  
**Migration؟** لا. **Edge؟** لا. **Store جديد؟** لا. **Components جديدة؟** لا. **Routes جديدة؟** لا.

---

### Phase 1 — Design System Foundation (غلاف بصري موحّد)
**الهدف:** توحيد primitives المستخدمة عبر المنصة دون تغيير تدفق الصفحات.  
**الفائدة:** تقليل الإحساس بأن كل وحدة «تطبيق مختلف».  
**الملفات المتوقعة:**
- `src/components/ui/*` (PageHeader, Card/Panel, EmptyState…)
- `src/components/dashboard/horizon/*`
- `src/components/academic/AcademicUi.tsx` (محاذاة tokens لا إعادة كتابة منطق)
- `src/index.css` / متغيرات الألوان الموجودة
**المخاطر:** منخفضة — انحدار بصري فقط؛ راقب الانحدارات على الصفحات الحساسة (مسابقة/اختبار).  
**Migration؟** لا. **Edge؟** لا. **Store؟** لا.  
**Components جديدة؟** نعم محتمل: `NavSection`, `RolePageShell`, `HubTabs` (عرض فقط).  
**Routes جديدة؟** لا.

---

### Phase 2 — Navigation IA (تجميع القائمة بدون حذف)
**الهدف:** تحويل ROLE_NAV من قائمة مسطحة إلى مجموعات قابلة للطي/عناوين أقسام داخل `AppLayout`.  
**الفائدة:** أكبر تحسّن UX بأقل مخاطرة وظيفية.  
**الملفات:**
- `src/types/index.ts` (هيكل NavItem/NavGroup أو طبقة فوق ROLE_NAV)
- `src/lib/nav.ts`, `src/lib/teacherMode.ts`, `src/lib/featureVisibility.ts`, `src/lib/navOrder.ts`
- `src/layouts/AppLayout.tsx`
- ملفات تعتمد على ROLE_NAV للعرض فقط: `featureCatalog.ts`, `promoTour.ts`, `qa/catalog.ts`, `userGuides.ts`
**المخاطر:** متوسطة-منخفضة — كسر ترتيب المستخدم المحفوظ في localStorage؛ يحتاج ترحيل ترتيب أو reset لطيف.  
**Migration؟** لا. **Edge؟** لا. **Store؟** لا (الترتيب الحالي كافٍ).  
**Components جديدة؟** نعم: مكوّن مجموعة قائمة.  
**Routes جديدة؟** لا — نفس المسارات.

---

### Phase 3 — Soft Hub Consolidation (دمج مداخل عبر تبويبات + Redirect)
**الهدف:** تقليل عناصر القائمة عبر Hubs مع الإبقاء على كل URL قديماً يعمل.  
**الفائدة:** رحلة أقصر دون فقدان ميزات.  
**الدُفعات داخل المرحلة (تُنفَّذ بالترتيب):**
1. Supervisor Analytics Hub في ROLE_NAV (عنصر واحد → `/analytics`)
2. Olympiad Reports Hub لـ admin/principal
3. Parent Academic Hub
4. ضبط ROLE_NAV للمدير لإبراز Hub الأكاديمي بدل تكرار الروابط التشغيلية
**الملفات:**
- صفحات Hub جديدة تحت `src/pages/**` أو توسيع الموجود (`AnalyticsPage`, hubs)
- `src/router/index.tsx` (Redirects فقط)
- `src/types/index.ts` (ROLE_NAV)
- أدلة المستخدم إن لزم تحديث المسارات الظاهرة
**المخاطر:** متوسطة — bookmarks، أدلة، onboarding tour، feature visibility keys.  
**Migration؟** لا. **Edge؟** لا. **Store؟** لا.  
**Components جديدة؟** نعم: `HubTabs`/أغلفة.  
**Routes جديدة؟** اختيارية (`/parent/academic`, `/admin/reports-hub`) مع Redirect من القديم؛ أو إعادة استخدام مسارات قائمة.

---

### Phase 4 — Role Dashboards Upgrade
**الهدف:** كل دور يصل لـ «منزل» يلخّص مهامه اليومية ويوجّه للمراكز.  
**الفائدة:** تقليل التيه بعد تسجيل الدخول.  
**الملفات:**
- `src/pages/DashboardPage.tsx`
- `src/pages/principal/PrincipalDashboard.tsx`
- `src/pages/teacher/TeacherDashboard.tsx`
- `src/pages/supervisor/SupervisorDashboard.tsx`
- `src/components/admin/AdminDashboard.tsx`
- **جديد:** `src/pages/deputy/DeputyDashboard.tsx` (أو مسار معادل)
- `src/lib/unifiedDashboard.ts` (قراءة فقط/تجميع عرض — بلا تغيير قواعد احتساب)
**المخاطر:** متوسطة — انحدار صلاحيات الروابط السريعة؛ يجب احترام FeatureGate وTeacherMode.  
**Migration؟** لا. **Edge؟** لا. **Store؟** لا.  
**Components جديدة؟** نعم لبطاقات الملخص إن لزم.  
**Routes جديدة؟** لا إلزامياً (deputy عبر `/dashboard`).

---

### Phase 5 — Parent Portal UX
**الهدف:** تحويل البوابة إلى مركز متابعة ابن واحد متسق.  
**الفائدة:** أقل نقرات لولي الأمر (الجمهور الأقل تقنية).  
**الملفات:**
- `src/components/parent/*`
- `src/pages/parent/*`
- `src/stores/parentChildStore.ts` (استخدام أوضح — بدون تغيير نموذج البيانات)
- ROLE_NAV لـ parent + router redirects
**المخاطر:** متوسطة — حساسة لتجربة الأسر؛ اختبار اختيار الابن عبر الصفحات إلزامي.  
**Migration؟** لا. **Edge؟** لا. **Store جديد؟** لا (الموجود يكفي).  
**Components جديدة؟** نعم محتمل: شريط ابن ثابت، Hub أكاديمي.  
**Routes جديدة؟** اختيارية مع aliases.

---

### Phase 6 — Teacher Mode Experience
**الهدف:** جعل التبديل أولمبياد/أكاديمي واضحاً كـ «مساحتي عمل» لا مجرد فلتر قائمة.  
**الفائدة:** تقليل اللبس للمعلمين (أكثر المستخدمين اليوميين).  
**الملفات:**
- `src/components/teacher/TeacherModeToggle.tsx`
- `src/lib/teacherMode.ts`
- `src/stores/teacherModeStore.ts` (سلوك تنقل خفيف فقط إن لزم)
- `src/pages/teacher/TeacherDashboard.tsx`
- `src/pages/academic/AcademicStaffHubPage.tsx`
- ROLE_NAV teacher
**المخاطر:** متوسطة — مسار التحويل عند تبديل الوضع؛ AcademicSetupGate.  
**Migration؟** لا. **Edge؟** لا. **Store جديد؟** لا.  
**Components جديدة؟** اختيارية (ModeHomeBanner).  
**Routes جديدة؟** لا.

---

### Phase 7 — Principal & Admin Command UX
**الهدف:** فصل واضح بين تشغيل أولمبياد، إدارة المدرسة، والإدارة الأكاديمية في الواجهة فقط.  
**الفائدة:** المدير ورائد النشاط يصلان للمهمة الصحيحة أسرع.  
**الملفات:**
- `PrincipalDashboard`, `PrincipalExecutivePage`, hubs الأكاديمية
- `AdminDashboard`, `PointsHubPage` وما حولها
- ROLE_NAV principal/admin
- صفحات التقارير المدمجة من Phase 3 إن لزم تلميع
**المخاطر:** متوسطة-عالية نسبياً داخل نطاق UX — أكثر الأدوار صلاحيات وتشابك مسارات.  
**Migration؟** لا. **Edge؟** لا. **Store؟** لا.  
**Components جديدة؟** محتملة لأقسام لوحة القيادة.  
**Routes جديدة؟** لا إلزامياً.

---

### Phase 8 — Supervisor Analytics & Academic Entry
**الهدف:** قائمة مشرف قصيرة؛ التحليلات من مركز واحد؛ دخول أكاديمي واضح دون ضوضاء.  
**الفائدة:** تركيز المشرف على التشخيص التربوي.  
**الملفات:**
- `src/pages/supervisor/*`
- `src/components/supervisor/*` (خصوصاً Analytics Hub)
- ROLE_NAV supervisor
- روابط التقارير المشتركة `/admin/class*-report`
**المخاطر:** متوسطة — الاعتماد على تبويبات موجودة؛ التحقق من deep links `/analytics/:tab`.  
**Migration؟** لا. **Edge؟** لا. **Store؟** لا.  
**Components جديدة؟** تلميع فقط.  
**Routes جديدة؟** لا.

---

### Phase 9 — Student Portal Polish + Mobile/PWA Shell
**حالة:** منفَّذ (v2.0.0) — `MobileRoleDock` موسّع، EmptyState للطالب/المتجر، مهمة تالية على اللوحة.  
**الهدف:** اتساق بصري لبوابة الطالب وتحسين كثافة السايدبار/التنقل على الموبايل لكل الأدوار.  
**الفائدة:** PWA أوضح؛ طلاب وأولياء على الجوال.  
**الملفات:**
- `src/components/student/*`, صفحات `src/pages/student/*`
- `AppLayout.tsx` (نمط موبايل/bottom nav اختياري لاحقاً داخل المرحلة)
- مكوّنات PWA الموجودة (بدون تغيير service worker logic إن أمكن)
**المخاطر:** متوسطة — الملاحة الموبايلة إن أُضيفت قد تتعارض مع السايدبار؛ يُفضّل تحسين السايدبار أولاً قبل bottom nav.  
**Migration؟** لا. **Edge؟** لا. **Store؟** لا.  
**Components جديدة؟** محتملة لموبايل.  
**Routes جديدة؟** لا.

---

### Phase 10 — Cross-cutting UX Quality
**حالة:** منفَّذ (v2.0.0) — EmptyState موحّد، أدلة شاشات محدّثة (`roleScreenGuides`).  
**الهدف:** Empty states، تحميل موحّد، عناوين صفحات، أدلة الشاشات، اتساق PageHeader.  
**الفائدة:** إحساس منتج واحد.  
**الملفات:**
- `EmptyState`, loaders، `roleScreenGuides` / `adminScreenGuides` / `userGuides`
- تحديث نصوص الأدلة بعد تغيير المداخل (ليس محتوى الوظائف)
**المخاطر:** منخفضة-متوسطة.  
**Migration؟** لا. **Edge؟** لا. **Store؟** لا.  
**Components جديدة؟** نادرة.  
**Routes جديدة؟** لا.

---

### Phase 11 — Hardening, Redirect Audit, Documentation Freeze
**حالة:** منفَّذ (v2.0.0) — `Docs/ROUTE_REDIRECT_AUDIT.md` + تجميد سياق في `AI_PLATFORM_CONTEXT.md`.  
**الهدف:** جدول تدقيق لكل Route قديم → وجهة نهائية؛ تحديث وثائق السياق؛ QA يدوي حسب الأدوار.  
**الفائدة:** إغلاق المبادرة دون ديون روابط.  
**الملفات:**
- `Docs/AI_PLATFORM_CONTEXT.md` (قسم IA/UX الجديد)
- `Docs/شرح-المنصة-الكامل.md` (مسارات ظاهرة للمستخدم)
- `VERSION.md`
- ملحق تدقيق Routes في Docs
**المخاطر:** منخفضة.  
**Migration؟** لا. **Edge؟** لا. **Store؟** لا.  
**Components جديدة؟** لا. **Routes جديدة؟** لا (إبقاء redirects).

---

## 6) ما هو خارج النطاق صراحةً

- ميزات نقاط/اختبارات/واتساب/AI جديدة
- إعادة تصميم شاشات المسابقة الزمنية أو APK
- تغيير جداول Supabase أو سياسات RLS
- Edge Functions جديدة (AI/Users/Push)
- استبدال Zustand أو React Query
- إعادة كتابة `whatsapp-server.js`
- حذف دور `activity_leader` من الكود (يبقى توافقياً)

---

## 7) استراتيجية الأمان ضد كسر الوظائف

1. **كل دمج = Hub + Redirect** وليس حذف ملف صفحة في نفس الـ PR إن أمكن.
2. **FeatureGate / featureVisibility** تُختبر بعد كل تغيير ROLE_NAV.
3. **Teacher mode** يُختبر في الوضعين + مسارات AI المشتركة.
4. **AcademicSetupGate** لا يُمس منطقياً.
5. **QA Simulator** (`/qa/simulator`) يُحدَّث كتالوج المسارات إن تغيّرت المداخل الظاهرة.
6. قبل كل Phase كبيرة: ZIP في `Versions/` بصيغة `YYYY-MM-DD_vX.Y.Z_UXModernizationPhaseN.zip`.
7. رفع الإصدار: Minor عند إكمال مجموعة مراحل ملموسة للمستخدم؛ Patch لتلميع داخل المرحلة.

---

## 8) مؤشرات نجاح UX (بدون تحليلات منتج إلزامية في الكود)

| مؤشر | قبل | بعد مستهدف |
|------|-----|-------------|
| عناصر قائمة المدير الظاهرة دفعة واحدة | ~20 مسطحة | مجموعات ≤ 6 أقسام |
| عناصر قائمة المشرف للتحليلات | 7 | 1 مدخل + تبويبات |
| نقرات ولي الأمر لواجب/ملاحظة/مراجعة | متعددة الصفحات | Hub واحد |
| وصول الوكيل لمهامه | شبكة بطاقات كـ Home | Dashboard ملخص ثم Hub |
| إحساس بصري | 3 أنظمة | نظام غلاف موحّد |

---

## 9) جدول اعتماد سريع لكل مرحلة

| Phase | Migration | Edge Function | Store جديد | Components جديدة | Routes جديدة |
|-------|-----------|---------------|------------|------------------|--------------|
| 0 | لا | لا | لا | لا | لا |
| 1 | لا | لا | لا | نعم (UI shell) | لا |
| 2 | لا | لا | لا | نعم (Nav groups) | لا |
| 3 | لا | لا | لا | نعم (Hubs/Tabs) | اختيارية + Redirects |
| 4 | لا | لا | لا | نعم (Dash widgets) | لا إلزامي |
| 5 | لا | لا | لا | نعم (Parent hub) | اختيارية |
| 6 | لا | لا | لا | اختيارية | لا |
| 7 | لا | لا | لا | اختيارية | لا |
| 8 | لا | لا | لا | تلميع | لا |
| 9 | لا | لا | لا | اختيارية موبايل | لا |
| 10 | لا | لا | لا | نادرة | لا |
| 11 | لا | لا | لا | لا | لا |

> إن ظهرت حاجة لاحقاً لتفضيلات IA على السحابة (بدل localStorage لترتيب القائمة)، تُفتح **Phase استثنائية منفصلة** بموافقة صريحة + Migration — وهي **غير مطلوبة** لإكمال v2.0.

---

## 10) اقتراح ترتيب الإصدارات

| معلم | إصدار مقترح | ملاحظة |
|------|-------------|--------|
| اعتماد الخطة (هذه الوثيقة) | v1.29.0 أو Patch توثيق | حسب سياسة الفريق |
| إكمال Phase 1–2 | v1.30.0 | أول فرق ملموس للمستخدم (شكل + قائمة) |
| إكمال Phase 3–5 | v1.31.0 | Hubs + ولي الأمر |
| إكمال Phase 6–8 | v1.32.0 | معلم/مدير/مشرف |
| إكمال Phase 9–11 | **v2.0.0** | ✅ إغلاق مبادرة UX Modernization (2026-08-01) |

---

## 11) الخطوة التالية بعد اعتماد الخطة

1. ~~اعتماد المستخدم لهذه الوثيقة~~  
2. ~~Phases 1–11~~ — مكتملة في **v2.0.0**.  
3. أي عمل لاحق: اتبع `Docs/SCHOOL_PLATFORM_ROADMAP.md` (قيمة مدرسية / مطور منصة) وليس إعادة فتح UX v2 إلا بمبادرة جديدة.

---

**— نهاية خطة UX Modernization Initiative v2.0 — (مغلقة في v2.0.0) —**
