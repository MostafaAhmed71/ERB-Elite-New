# سياق منصة أولمبياد النخبة (ERB Elite) — الملف الشامل للذكاء الاصطناعي

> **الاستخدام:** انسخ هذا الملف **كاملاً** والصقه في بداية أي محادثة مع ChatGPT / Claude / Cursor / Gemini قبل طلب تعديل أو ميزة أو إصلاح.  
> **مصدر الحقيقة:** هذا الملف + `VERSION.md` + الكود الفعلي. عند التعارض مع `CLAUDE.md` اعتمد **هذا الملف**.  
> **الصيانة:** أي مطور/وكيل AI يعدّل المنصة **يجب** تحديث هذا الملف في نفس الجلسة (انظر `.cursor/rules/ai-platform-context-maintenance.mdc`).

**تاريخ التحديث:** 2026-08-21  
**إصدار المنصة:** v2.8.23  
**الموقع:** https://northelite.tech  
**اسم الحزمة:** `erb-elite`  
**المجلد:** `ERB Elite/`

---

## 0) تعليمات إلزامية للمساعد الذكي

### 0.1 قبل أي تعديل
1. افترض **RTL عربي** دائماً (`dir="rtl"`, خط Tajawal/Cairo).
2. ابحث في `src/` و`supabase/migrations/` — **لا تخترع** جداول أو مسارات.
3. ميّز بين:
   - **SPA** على Hostinger (`dist/` → `public_html`)
   - **Supabase** (PostgreSQL + Auth + RLS + Realtime + Edge + Storage)
   - **WhatsApp VPS** (`wpp.northelite0.com`, `whatsapp-server.js`)
4. **مدير المدرسة (`principal`) ≠ مطور المنصة (`platform_developer`)** — أدوات `/dev/*` للمطور فقط.
5. المعلم: وضعان **`olympiad`** و **`academic`** (`src/lib/teacherMode.ts`).
6. تعديل كبير → ZIP في `Versions/` + `VERSION.md` (قاعدة `.cursor/rules/version-management.mdc`).
7. لا أسرار في `VITE_*` — مفاتيح AI على Supabase Secrets.
8. `CLAUDE.md` = مواصفات المسابقة اليومية القديمة جزئياً — **لا يمثل المنصة كاملة**.
9. Roadmap موجات 1–5 **مكتملة**؛ عمل جديد = عمق أو مبادرة صريحة من `Docs/SCHOOL_PLATFORM_ROADMAP.md`.
10. **بعد انتهاء التعديل:** حدّث **هذا الملف** (التاريخ، الإصدار، الأقسام المتأثرة).

### 0.2 قواعد منتج
- لا SaaS متعدد المدارس — **مدرسة واحدة**.
- الأسعار للمستخدمين: «يرجى التواصل مع الإدارة لمعرفة الأسعار الحالية.»
- لا تُعرض للمستخدم المدرسي «سيصلك واتساب للمطور» — التنبيهات الداخلية خلفية.
- لا تدمج `/dev` في قوائم المدير.

### 0.3 ملفات مكمّلة (لا تُستبدل هذا الملف)
| الملف | الغرض |
|--------|--------|
| `knowledge-base/*.md` | دليل المستخدم + FAQ + دعم (Meta AI / RAG) |
| `knowledge-base/AI_AGENT_CONTEXT.md` | سلوك وكيل الدعم للمستخدمين النهائيين |
| `VERSION.md` | سجل الإصدارات التفصيلي |
| `Docs/SCHOOL_PLATFORM_ROADMAP.md` | خارطة الطريق |
| `Docs/UX_MODERNIZATION_V2_PLAN.md` | UX v2 — مغلقة v2.0.0 |
| `Docs/PRE_LAUNCH_ROLE_REVIEW.md` | مراجعة أدوار ما قبل الإطلاق |
| `Docs/MANUAL_QA_FULL_CHECKLIST.md` | **اختبار يدوي شامل** — جلسات A–L + سجل مشاكل (Pass/Fail) |
| `public/manual-qa.html` | **نسخة تفاعلية** من دليل الاختبار — حفظ محلي + تصدير JSON (`/manual-qa.html`) |
| `Docs/BENQ_INSTALL_CHECKLIST.md` | تثبيت APK شاشات BenQ للفصول |


---

## 1) ما هي المنصة؟

| البند | القيمة |
|--------|--------|
| الاسم الظاهر | أولمبياد النخبة 1448 هــ |
| الاسم القصير | أولمبياد النخبة |
| الشعار | نحو القمة بالتميز |
| الأيقونة | `/icon.jpeg` |
| التعريف في الكود | `src/lib/branding.ts` |
| التحليلات | Microsoft Clarity (`@microsoft/clarity`, Project `xxrcpnz5j0`) في `src/main.tsx` |

**منصة مدرسية ويب متكاملة** تجمع:

1. **نظام نقاط الأولمبياد** — تحفيز، متصدرون، مكافآت، بطاقات.
2. **الشؤون الأكاديمية** — واجبات، خطط أسبوعية، جداول، مراجعات PDF، ملاحظات أولياء.
3. **الاختبارات الإلكترونية** + تحليلات المشرف.
4. **الحضور والغياب** — رائد (`/admin/attendance`) · **وكيل مرحلته** (`/academic/attendance`) · **متابعة مدير** (`/principal/academic/attendance`).
5. **المسابقة اليومية بين الفصول** (BenQ / APK) — للمعلمين ذوي نطاق متوسط فقط عند الحاجة.
6. **مساعد AI للمعلمين** (توليد + RAG + رصيد).
7. **واتساب** (تذكيرات يدوية/تلقائية/Jobs).
8. **بوابات طالب وولي أمر** + PWA.
9. **مساحة مطور** `/dev` — Jobs، GEM، معرفة، دعم فني.
10. **الدعم الفني** — `/support` → `/dev/support`.
11. **إدارة طلاب الطاقم** — وكيل مرحلته + مدير كل المدرسة: عرض/نقل فصول مع بقاء النقاط الفردية.

**المراحل الأكاديمية:** `middle` (متوسط) · `high` (ثانوي) — صفوف 1–3، فصول أ/ب/ج/د.

---

## 2) Tech Stack

| الطبقة | التقنية |
|--------|---------|
| Frontend | React 19 + TypeScript + Vite 8 + Tailwind + Framer Motion |
| State / Data | Zustand + TanStack Query + React Router 7 |
| Backend | Supabase: PostgreSQL, Auth (Google للمعلمين), RLS, Realtime, Storage |
| Edge Functions | Deno — AI, users, jobs, alerts |
| AI | OpenRouter/مزودون via `ai-generate`; RAG `ai-knowledge-ingest` |
| TTS مسابقة | ElevenLabs (`VITE_ELEVENLABS_*`) |
| تصدير | docx, pptxgenjs, jspdf, xlsx |
| WhatsApp | `whatsapp-server.js` + WPPConnect على VPS |
| Hosting | Hostinger static + `.htaccess` / `404.html` SPA |
| PDF reviews | PHP `public/api/upload-exam-review.php` → `uploads/exam-reviews` + URL in Supabase |
| Points evidence | PHP `public/api/upload-points-evidence.php` → `uploads/points-evidence` + URL in `points_ledger.evidence_urls` |
| Student/class photos | PHP `public/api/upload-school-media.php` → `uploads/school-media` + URL in `students.photo_url` / `class_profiles.photo_url` |
| PWA | vite-plugin-pwa + `src/sw.ts` |
| Android TV | `android-apk/` Kotlin (اختياري) |
| Analytics | Microsoft Clarity |
| Docs build | `npm run build-docs` → PDF/HTML/ZIP |

---

## 3) هيكل المشروع

```
ERB Elite/
├── src/
│   ├── pages/              # ~152 صفحة (admin, principal, teacher, student, dev, …)
│   ├── components/         # UI, support, dev, dashboard/glass + horizon, student, …
│   ├── lib/                # ~173 ملف خدمة (academic/, ai/, platform*, …)
│   ├── layouts/            # AppLayout (مدرسة) · DevLayout (مطور)
│   ├── router/             # index.tsx, ProtectedRoute, gates
│   ├── stores/             # authStore, teacherModeStore, …
│   ├── hooks/
│   ├── types/              # UserRole, ROLE_NAV, database.types
│   └── main.tsx            # Clarity + error listeners + SPA recovery
├── public/
├── supabase/
│   ├── migrations/         # 001 → 123+ (راجع أحدث ملف)
│   └── functions/          # Edge Functions (AI, users, auth-phone-otp, …)
├── Docs/                   # هذا الملف + roadmap + plans
├── knowledge-base/         # 12 MD للمستخدمين وMeta AI
├── build/build-docs.mjs    # بناء الوثائق
├── Versions/               # ZIP استرجاع — لا تحذف
├── deploy/
├── wppconnect-master/
├── android-apk/
├── whatsapp-server.js
├── vite.config.ts          # alias @/ فقط (لا @ وحده — يكسر scoped packages)
├── VERSION.md
└── CLAUDE.md               # قديم جزئياً
```

---

## 4) الأدوار (UserRole)

المصدر: `src/types/index.ts` · `src/types/database.types.ts`

| المفتاح | الاسم العربي | ملخص الصلاحيات |
|---------|--------------|----------------|
| `principal` | مدير المدرسة | مستخدمون، تنفيذي، أكاديمي، AI، واتساب، مسابقة، تقييم، supervisor routes |
| `admin` | رائد النشاط | نقاط، حضور، أنشطة، تقارير، `/admin/*` |
| `activity_leader` | رائد (قديم) | مثل admin — دور legacy |
| `supervisor` | المشرف التربوي | مواد، أسئلة، اختبارات، تحليلات |
| `teacher` | المعلم | نقاط/طلاب (أولمبياد) + `/academic/*` + AI · وضعان olympiad/academic · أولمبياد مخفي إن كان نطاقه ثانوي فقط |
| `deputy` | الوكيل | إشراف أكاديمي **لمرحلته** عبر `users.staff_education_level` (`middle`/`high`) — غياب، طلاب، ملاحظات، تقييم معلمين |
| `reviewer` | المراجع | مراجعات PDF |
| `parent` | ولي الأمر | متابعة الابن |
| `student` | الطالب | نقاط، اختبارات، واجبات، مكافآت |
| `platform_developer` | مطور المنصة | `/dev/*` فقط — **ليس** مديراً مدرسياً |

**`staff_education_level`:** يُضبط عند إنشاء/تعديل الوكيل من إدارة المستخدمين (`AddUserModal`) أو الموظفين الأكاديميين · يُمرَّر عبر Edge `create-user` · بدونه لا يعمل غياب/طلاب الوكيل.

**التوجيه بعد الدخول:** `platform_developer` → `/dev` · `admin`/`activity_leader` → `/admin` · `student` → `/student` · غير ذلك → `/dashboard` (حسب الدور).

**بعد الخروج (v2.8.18):** طاقم → `/login/staff` · طالب/ولي → `/login` — `getLoginPathForRole()` في `src/lib/auth.ts` + `authStore.logout`.

**تصميم اللوحات (v2.7.2):** `AdminDashboard` و`PrincipalDashboard` — طقم `dashboard/glass` بهوية المنصة (**navy + gold + Cairo**)، بطاقات زجاجية داكنة أفق Horizon؛ ليس المظهر الفاتح للمرجع الخارجي.

**ملف المطور الظاهر للمدرسة:** `school_settings.platform_developer_profile` (هجرة 107) — RPC `get_platform_developer_profile()`.

---

## 5) القوائم الجانبية (ROLE_NAV)

المصدر: `src/types/index.ts` — **كل عنصر = مسار حقيقي في Router**.

### مدير المدرسة (`principal`)
`/dashboard` · `/qa/simulator` · `/principal/executive` · `/principal/users` · `/principal/bulk-upload` · `/principal/import-export` · `/principal/bulk-accounts` · `/principal/reports` · `/admin/reports-hub` · `/principal/settings` · `/academic` · `/academic/templates` · `/principal/academic` · **`/principal/academic/attendance`** · **`/principal/academic/students`** · `/principal/evaluation` · `/principal/ai-settings` · `/competition/admin` · `/support`

### رائد النشاط (`admin` / `activity_leader`)
`/admin` · `/admin/points` · `/admin/bulk-grant` · `/admin/attendance` · `/admin/suggestions` · `/admin/activities` · `/admin/user-guides` · `/admin/users` · `/admin/leaderboard` · `/competition/admin` · `/admin/id-cards` · `/admin/reports-hub` · `/admin/settings` · `/support`

### المعلم (`teacher`)
`/dashboard` · `/points/grant` · `/points/grant?bulk=1` · `/students` · `/students/class-board` · `/teacher/analytics` · `/teacher/activity-log` · `/teacher/lesson-plan` · `/teacher/ai-assistant` · `/academic/*` · `/teacher/evaluation` · `/support`

### الوكيل (`deputy`)
`/dashboard` · `/academic` · **`/academic/attendance`** · **`/academic/students`** · `/academic/observation-inbox` · `/academic/exam-results` · homework · weekly-plans · reviews · reports · communication · export · search · `/academic/teacher-evaluation` · `/support`

### الطالب (`student`)
`/student` · `/student/academic` · `/student/exams` · `/student/portfolio` · `/student/rewards` · `/leaderboard` · `/my-profile` · `/support`

### ولي الأمر (`parent`)
`/dashboard` · `/student-profile` · `/parent/link-child` · `/attendance/view` · `/exams/results` · `/parent/academic/*` · `/support`

### المشرف (`supervisor`)
`/dashboard` · `/grade-subjects` · `/skills` · `/questions` · `/exams` · `/analytics/*` · `/academic` (عرض) · `/support`

### مطور المنصة
`DEV_NAV_GROUPS` في `src/lib/devNav.ts` — **لا ROLE_NAV مدرسي**.

---

## 6) المسارات والصلاحيات (ProtectedRoute)

المصدر: `src/router/index.tsx` · `src/router/ProtectedRoute.tsx` (403 → `/unauthorized`).

### عام / Auth
| المسار | الصلاحية |
|--------|----------|
| `/login` | عائلة (طالب/ولي) — إيميل + كلمة مرور |
| `/login/staff` | طاقم — معلم OTP / إدارة إيميل / نسيان كلمة المرور · **هدف خروج الطاقم** |
| `/register`, `/register/teacher` | عام |
| `/auth/callback` | OAuth |
| `/unauthorized` | عام |
| `/force-password-change` | مسجل |
| `/onboarding` | Google onboarding |
| `/invite/:token` | دعوة موظف |
| `/card/:id`, `/card/t/:code` | بطاقة طالب عامة |
| `/verify/:id` | تحقق مستند |
| `/display/leaderboard` | عام |
| `/board/leaderboard` | شاشة كاملة (خارج AppLayout) |
| `/class/:slug`, `/answer/:slug` | مسابقة |
| `/competition/leaderboard` | عام |
| `/promo-tour` | جولة فيديو — يتطلب دخول |

### مدير (`principal` فقط)
`/principal/*` (users, executive, settings, academic/*, evaluation/*, bulk-*, reports, audit-logs, student/:id)  
أكاديمي إضافي: **`/principal/academic/attendance`** (متابعة غياب يومي + تذكير واتساب للوكلاء) · **`/principal/academic/students`** (كل طلاب المدرسة + نقل فصول)

### رائد (`admin`, `activity_leader`)
`/admin/*` (points, attendance, activities, users, leaderboard, …) · `/activities` · `/points/approve` · `/attendance` (legacy)

### مشترك تقارير
`/admin/reports-hub`, `/admin/classes-report`, … — `admin`, `activity_leader`, `supervisor`, **`principal`**

### نقاط
`/points/grant` — `teacher`, `admin`, `activity_leader` (**ليس principal**) · نشاط يدوي + شواهد (هجرة 116)

### معلم + مدير
`/students`, `/students/class-board`, `/teacher/analytics`, `/teacher/ai-assistant`, …

### مشرف + مدير
`/grade-subjects`, `/questions`, `/exams`, `/analytics/:tab`

### طالب (+ admin/principal للاختبار)
`/student/*`, `/leaderboard`, `/my-profile`

### أكاديمي
- مشترك (teacher, deputy, principal, supervisor): `/academic`, homework, weekly-plans, templates, …
- طاقم فقط (teacher, deputy, principal): schedule, communication, export, …
- reviews: + reviewer
- `/academic/teacher-setup` — teacher فقط + `AcademicSetupGate`
- **وكيل فقط:** `/academic/attendance` · `/academic/students` (نطاق `staff_education_level`)

### ولي أمر (+ principal)
`/parent/academic/*`, `/student-profile`, `/attendance/view`, …

### QA / مسابقة إدارة
`/qa/simulator`, `/competition/admin` — `principal`, `admin`, `activity_leader`

### مطور (`platform_developer`)
`/dev`, `/dev/health`, `/dev/errors`, `/dev/support`, `/dev/jobs`, `/dev/schedules`, `/dev/db`, `/dev/knowledge`, `/dev/sandbox`, `/dev/tools/*`, `/dev/monitor/*`, …

---

## 7) وضعا المعلم

| الوضع | المفتاح | المحتوى |
|--------|---------|---------|
| أولمبياد | `olympiad` | نقاط، طلاب، لوحة فصل، مسابقة |
| أكاديمي | `academic` | `/academic/*` |
| مشترك | — | AI `/teacher/ai-assistant` · دعم `/support` |

الملفات: `src/lib/teacherMode.ts` · `src/stores/teacherModeStore.ts` · `AcademicSetupGate`.

**أولمبياد للمتوسط فقط (v2.8.9):** إن كان نطاق المعلم ثانوياً فقط (`staff_education_level` / فصوله) يُخفى وضع الأولمبياد — `src/lib/teacherOlympiadAccess.ts` · `useTeacherOlympiadAccess`.

---

## 8) الوحدات الوظيفية

### 8.1 النقاط
منح فردي/جماعي، اعتماد، متصدرون، عدالة، مكافآت.  
`src/pages/points/` · `src/lib/classReport.ts` · `src/lib/pointsPolicy.ts`

### 8.1b لوحة المتصدرين (v2.8.19 → v2.8.25)
| المسار | الاستخدام |
|--------|-----------|
| `/admin/leaderboard` | رائد — لوحة إدارية |
| `/leaderboard` | طالب |
| `/display/leaderboard` | شاشة عامة |
| `/board/leaderboard` | شاشة كاملة مقسومة |
| `/students/class-board` | معلم — لوحة الفصل |
| `/competition/leaderboard` | مسابقة يومية |

- العرض المقسوم: `SplitLeaderboardPanel` — طلاب | فصول · **منصة أسطوانية** (`GamingPodium`) + قائمة من 4+ · شريط نسبي · تبويب زمني UI · حالة فارغة تحفيزية  
- صور الطلاب من `photo_url` · صور الفصول من `class_profiles`  
- رفع الصور على **Hostinger** (`upload-school-media.php`) وليس Supabase Storage — الرابط فقط في DB  
- رفع صورة الفصل: **اضغط الصورة** (بدون أيقونة كاميرا) — للأدوار: مدير/رائد/وكيل/معلم  
- مكوّنات: `StudentRankList` · `ClassRankList` · `ClassPhotoClickable` · `LeaderboardShared` · `DualLeaderboardPanel` · `GamingPodium`  
- ملاحظة: تجربة «مضمار السباق» (v2.8.22) أُلغيت في v2.8.23  
- البيانات: `fetchDisplayLeaderboard` / `useLeaderboardData`

### 8.2 المسابقة اليومية
`/class/:slug` · `/answer/:slug` · `/competition/admin` · ElevenLabs · Realtime.  
`src/lib/competition/` · `src/pages/competition/` · `android-apk/`

### 8.3 الأكاديمي
واجبات، خطط، جداول، مراجعات، ملاحظات، تصدير، قوالب CRUD.  
`src/lib/academic/` · `src/pages/academic/` · `src/pages/principal/academic/`  
جدول قوالب: `academic_message_templates` (103)  
نطاق مرحلة: `stageScope.ts` · `gradeBridge.ts` · `staff_education_level`

### 8.3b حضور الوكيل + متابعة المدير (v2.8.14–15)
| الدور | المسار | الوظيفة |
|--------|--------|---------|
| وكيل | `/academic/attendance` | تسجيل يومي لمرحلته (صف→فصل→حضور/غياب→تحضير الكل→حفظ) + حالة الفصول |
| مدير | `/principal/academic/attendance` | مكتمل/متبقي · تقارير · تذكير واتساب للوكلاء |

- حفظ: RPC `save_class_daily_attendance` · جدول `attendance_class_sessions`  
- ملفات: `DeputyAttendancePage.tsx` · `PrincipalAttendanceMonitorPage.tsx` · `classAttendance.ts`  
- SQL: `fix-deputy-class-attendance.sql` / هجرة **122**

### 8.3c طلاب الوكيل/المدير + نقل فصل (v2.8.17)
| الدور | المسار | النطاق |
|--------|--------|--------|
| وكيل | `/academic/students` | مرحلته فقط |
| مدير | `/principal/academic/students` | كل المدرسة |

- إجمالي أعلى الصفحة يتغير حسب: مرحلة → صف → فصل  
- نقل فصل: RPC `transfer_student_class` — النقاط الفردية في `points_ledger` تبقى مع `student_id`  
- UI مشترك: `StaffStudentsPanel` · lib: `staffStudents.ts`  
- SQL: `fix-transfer-student-class.sql` / هجرة **123**

### 8.4 الاختبارات
بنك أسئلة، بناء، نتائج، تحليلات.  
`src/pages/supervisor/` · `src/pages/student/TakeExamPage.tsx`

### 8.5 AI للمعلم
`/teacher/ai-assistant` · `/principal/ai-settings`  
Edge: `ai-generate`, `ai-credits`, `ai-monthly-reset`, `ai-knowledge-ingest`  
RAG: embeddings + chunks · `/dev/knowledge`

### 8.6 WhatsApp
API: `academic_config.whatsapp_api_url` → غالباً `https://wpp.northelite0.com`  
`/principal/academic/whatsapp-reminders` · Jobs: `whatsapp_reminder`, `academic_reminder`  
علم: `platform_system_flags.whatsapp_send_enabled`

### 8.7 GEM — مراقبة الأخطاء
`platform_errors` · `report_platform_error` · listeners + `PlatformErrorBoundary`  
`/dev/errors` · Edge `dev-error-whatsapp` · هجرات 093, 099, 104–106, **109**  
`src/lib/platformErrors.ts` · `src/lib/errorDiagnostics.ts`

### 8.8 الدعم الفني
`/support` (مستخدم) · `/dev/support` (مطور)  
`platform_support_tickets` · هجرات 107–108

### 8.9 Jobs & Schedules
`platform_jobs`, `platform_schedules` · `jobs-worker` · RPCs enqueue/claim/tick  
هجرات 092, 103

### 8.10 قاعدة المعرفة العامة
`knowledge-base/` (12 MD) · `npm run build-docs` · v2.5.0+

### 8.11 أدوات داخلية
| الأداة | المسار | الغرض |
|--------|--------|--------|
| محاكي QA | `/qa/simulator` | فحص مسارات + اختبارات — principal/admin |
| جولة فيديو | `/promo-tour` | مؤشر وهمي على الشاشات الحقيقية |
| Sandbox | `/dev/sandbox` | اختبار API للمطور |

**جولة Promo (`src/lib/promoTour.ts`):**
- تفعيل: `/promo-tour` ثم redirect للوحة
- Overlay: `PromoTourOverlay` في `FirstLoginGate`
- `PRINCIPAL_TOUR` يزور مسارات — **بعضها admin-only** → 403 للمدير (انظر §17)

---

## 9) مساحة المطور `/dev`

| المسار | الوظيفة |
|--------|---------|
| `/dev` | لوحة |
| `/dev/health` | صحة |
| `/dev/errors` | GEM + محاكاة أخطاء |
| `/dev/support` | شكاوى/طلبات |
| `/dev/jobs`, `/dev/queue`, `/dev/schedules` | مهام |
| `/dev/db` | DB explorer RO |
| `/dev/knowledge`, `/dev/pipeline` | RAG |
| `/dev/sandbox`, `/dev/debug` | اختبار |
| `/dev/tools/feature-flags`, `/permissions`, `/cache` | أعلام |
| `/dev/version`, `/environment`, `/backup` | إصدار/بيئة |
| `/dev/monitor/*` | WhatsApp, Supabase, Realtime, AI |

Layout: `DevLayout` · Nav: `src/lib/devNav.ts`

---

## 10) Supabase

### العميل
`src/lib/supabase.ts` ← `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`

### Migrations (123+)
| المجال | أرقام |
|--------|-------|
| أساس | 001–022 |
| حضور/مشرف/اختبارات | 023–038 |
| مسابقة/push | 039–054 |
| أكاديمي | 055–067 |
| تقييم/عائلة/Google | 068–080 |
| AI + RAG | 081–088, 101 |
| مطور منصة | 089–091 |
| Jobs/أخطاء | 092–093, 099 |
| أدوات dev | 094–098 |
| موجة 3–4 | 100–102 |
| موجة 5 schedules | 103 |
| تنبيهات WA | 104–106 |
| دعم + مطور | 107–108 |
| جودة أخطاء | **109** |
| إصلاح بوابة طالب | **110** |
| OTP جوال / دخول معلم | **111** |
| تسجيل معلم بالجوال OTP | **112** |
| حسابات جماعية بدون onboarding عائلة | **113** |
| مزامنة فصول المعلم + مطابقة RLS | **114** |
| توحيد تسميات الصف | **115** |
| نشاط يدوي + شواهد | **116** |
| بطاقة طالب عامة | **117–118** |
| إشعارات للمستخدم فقط | **119** |
| إكمال ملف معلم + جوال بعد Google | **120** |
| RLS غياب الوكيل | **121** |
| غياب فصول الوكيل + جلسات يومية | **122** |
| نقل طالب بين الفصول | **123** |

**دائماً:** راجع أحدث ملف في `supabase/migrations/` وملفات `supabase/fix-*.sql` للتشغيل اليدوي على الإنتاج.

### Edge Functions
`ai-generate` · `ai-knowledge-ingest` · `ai-credits` · `ai-monthly-reset`  
`create-user` (يدعم `staff_education_level`) · `register-user` · `delete-user` · `admin-update-user`  
`create-staff-invite` · `accept-staff-invite` · `bulk-create-class-accounts`  
`jobs-worker` · `dev-error-whatsapp` · **`auth-phone-otp`** · **`setup-whatsapp-phone`**  
`send-web-push` · `weekly-parent-digest` · `send-sms-alert`

### جداول رئيسية (عيّنة)
`users` (يشمل `staff_education_level`, `phone`, …), `students`, `teachers`, `classes`  
`points_ledger` (نقاط فردية مرتبطة بـ `student_id` — لا تُمس عند نقل الفصل), `activities`, `attendance`  
`attendance_class_sessions` (اكتمال غياب فصل ليوم)  
`questions`, `exams`, `exam_results`  
`academic_*` (homework, weekly_plans, schedules, …)  
`competition`: `questions`, `answers`, `scores` (مسابقة يومية)  
`platform_jobs`, `platform_errors`, `platform_support_tickets`  
`ai_generations`, `ai_knowledge_chunks`  
`school_settings` (flags, dev profile, feature_visibility)

RLS مفعّل · الدور: `get_my_role()`  
RPCs مهمة: `save_class_daily_attendance` · `transfer_student_class` · `grade_belongs_to_edu_level` · `complete_teacher_profile` (جوال)

---

## 11) فهرس `src/lib/` (أين تبحث)

| المجال | ملفات |
|--------|--------|
| Auth | `auth.ts` (`getLoginPathForRole`), `familyOnboarding.ts`, `staffInvite.ts`, `authPhoneOtp.ts` |
| أكاديمي | `lib/academic/*` (`stageScope`, `classAttendance`, `staffStudents`, `gradeBridge`) |
| AI | `lib/ai/*` |
| نقاط/تقارير | `classReport.ts`, `pointsPolicy.ts`, `classPoints.ts`, `pointsEvidence.ts` |
| نطاق معلم | `teacherScope.ts`, `teacherOlympiadAccess.ts`, `teacherMode.ts` |
| منصة dev | `platformJobs.ts`, `platformErrors.ts`, `platformSupport.ts`, `platformDevTools.ts`, `devNav.ts` |
| واتساب | `whatsappReminder.ts` |
| مسابقة | `lib/competition/*` |
| جولة promo | `promoTour.ts` |
| QA | `lib/qa/catalog.ts`, `runTests.ts` |
| أخطاء UX | `errorDiagnostics.ts`, `errors.ts`, `platformErrors.ts` |
| PWA/SPA | `spaPathRecovery.ts`, `pwaPlatform.ts` |
| Branding | `branding.ts` |
| BenQ | `Docs/BENQ_INSTALL_CHECKLIST.md` · `android-apk/` |

---

## 12) Auth & Onboarding

### شاشات الدخول (v2.6.0+)
| المسار | الجمهور | الطريقة |
|--------|---------|---------|
| `/login` | طالب / ولي أمر | إيميل + كلمة مرور (بدون رابط ظاهر لدخول الطاقم أو إنشاء حساب) |
| `/login/staff` | طاقم | **معلم:** جوال + OTP واتساب · **إدارة:** إيميل/كلمة مرور + Google · **نسيت كلمة المرور:** جوال + OTP ثم كلمة جديدة |
| `/force-password-change` | أول دخول | تغيير كلمة المرور المؤقتة |
| `/setup-whatsapp` | طالب/ولي بلا جوال | حفظ رقم واتساب + رسالة ترحيب (تنبيه إن الرقم بلا واتساب) |
| `/register` | مغلق | يحوّل إلى `/login` — لا تسجيل عام لطلاب/أولياء |
| `/register/teacher` | معلمون | كود تفعيل ثم **Google أو جوال+OTP واتساب** · جمع اسم/جوال قبل Google ثم `complete_teacher_profile` |

- Edge: `auth-phone-otp` · **`setup-whatsapp-phone`**
- بعد أول دخول: كلمة المرور → واتساب (إن لم يُحفظ جوال) → اللوحة
- **خروج الطاقم → `/login/staff`** · خروج عائلة → `/login` (v2.8.18) · `ProtectedRoute` يستخدم `getPreferredLoginPath` عند انتهاء الجلسة

### باقي التدفق
1. **Register** `/register` — مغلق للعائلات · `/register/teacher` للمعلم.
2. **Onboarding Google** `/onboarding` — اختيار دور عائلة (طالب/ولي) إن لزم.
3. **First login** — `ForcePasswordChangePage` → `SetupWhatsAppPage` (طالب/ولي) · `FirstLoginGate`.
4. **Teacher academic setup** — `/academic/teacher-setup` قبل الأكاديمي.
5. **إنشاء مستخدم إداري** — `AddUserModal` + `create-user` · للوكيل: **مرحلة إلزامية** (`staff_education_level`).

Store: `src/stores/authStore.ts`

---

## 13) متغيرات البيئة

### Frontend (`.env`)
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_ELEVENLABS_API_KEY=
VITE_ELEVENLABS_VOICE_ID=
VITE_HOSTINGER_UPLOAD_URL=
VITE_HOSTINGER_UPLOAD_TOKEN=
VITE_WHATSAPP_API_URL=
```

### Supabase Secrets (Edge)
`OPENROUTER_API_KEY` · `SUPABASE_SERVICE_ROLE_KEY` · مزودو AI

---

## 14) النشر

1. `npm run build` → `dist/`
2. رفع Hostinger + `.htaccess` + `404.html`
3. تطبيق migrations الجديدة على Supabase SQL Editor
4. نشر Edge Functions المتأثرة
5. VPS WhatsApp: `deploy-whatsapp-vps.sh`

---

## 15) اتفاقيات التطوير

- RTL أولاً · navy + gold · لوحات المدير/الرائد: زجاج داكن بهوية المنصة (`dashboard/glass`) · Horizon cards حيث وُجدت
- Vite alias: **`@/` → src** فقط — لا `'@': '/src'`
- إصدارات: ZIP + VERSION.md
- لا commit إلا بطلب المستخدم
- تحديث **هذا الملف** مع كل تغيير معماري

---

## 16) دليل «أين أبدأ؟»

| الطلب | ابدأ من |
|--------|---------|
| Route/شاشة | `router/index.tsx`, `ROLE_NAV`, `pages/` |
| أكاديمي | `lib/academic/` |
| غياب وكيل/مدير | `classAttendance.ts`, `DeputyAttendancePage`, `PrincipalAttendanceMonitorPage` |
| طلاب + نقل فصل | `staffStudents.ts`, `StaffStudentsPanel`, RPC `transfer_student_class` |
| مرحلة وكيل | `users.staff_education_level`, `stageScope.ts`, `AddUserModal` |
| AI | `lib/ai/`, `supabase/functions/ai-*` |
| أخطاء | `platformErrors.ts`, `/dev/errors` |
| دعم | `platformSupport.ts` |
| Jobs | `platformJobs.ts`, `jobs-worker` |
| صلاحيات | `ProtectedRoute`, migrations RLS |
| دخول/خروج طاقم | `auth.ts` (`getLoginPathForRole`), `StaffLoginPage`, `authStore.logout` |
| جولة فيديو | `promoTour.ts`, `PromoTourOverlay.tsx` |
| لوحة المتصدرين | `components/leaderboard/*`, `/board/leaderboard`, `/display/leaderboard` |
| BenQ APK | `android-apk/`, `Docs/BENQ_INSTALL_CHECKLIST.md` |

---

## 17) مشاكل معروفة / فخاخ

1. **`PRINCIPAL_TOUR` و 403:** جولة `/promo-tour` للمدير تزور `/admin/leaderboard`, `/admin/points`, `/admin/attendance`, `/admin/reports`, `/points/grant` — هذه **admin/teacher** فقط. **الإصلاح المطلوب:** بناء الجولة من `ROLE_NAV.principal` + مسارات principal المسموحة.
2. **`activity_leader`:** دور legacy — يُعامل مثل `admin` في Router.
3. **`AcademicSetupGate`:** قد يمنع المدير من بعض صفحات أكاديمي إن لم يُكمل إعداداً — تحقق عند QA.
4. **Embed Supabase:** استخدم `students!student_id` الصريح (هجرة 110).
5. **وكيل بلا مرحلة:** بدون `staff_education_level` تتعطل شاشات الغياب/الطلاب — عيّن المرحلة من إدارة المستخدمين.
6. **نقل طالب بلا SQL 123:** زر النقل يفشل إن لم تُنفَّذ `fix-transfer-student-class.sql` (الوكيل لا يملك UPDATE مباشر على `students`).
7. **نشر واجهة مطلوب:** تغييرات `/login/staff` بعد الخروج والطلاب/الغياب تحتاج رفع `dist/` على Hostinger بعد البناء.
8. **تبويب زمني للمتصدرين:** أسبوعي/شهري/فصلي في الواجهة فقط — لا يفلتر `points_ledger` بعد (`TODO`).

---

## 18) لقطة إصدارات (v2.6 → v2.8)

| الإصدار | أبرز التغييرات |
|---------|----------------|
| v2.6.0–2.6.4 | شاشتا دخول · OTP واتساب · إغلاق تسجيل العائلة · UX معلم |
| v2.6.5–2.6.7 | دليل QA يدوي + `manual-qa.html` |
| v2.7.x | لوحات زجاج · مزامنة فصول معلم · توحيد أسماء الصفوف |
| v2.8.0 | نشاط يدوي + شواهد (116) |
| v2.8.9 | إخفاء أولمبياد للمعلم الثانوي فقط |
| v2.8.10–13 | إصلاحات OTP/جوال معلم · إكمال ملف بعد Google (120) |
| v2.8.14–15 | غياب الوكيل لمرحلته + متابعة المدير + واتساب (122) |
| v2.8.16 | مرحلة الوكيل إلزامية عند إنشاء المستخدم |
| **v2.8.17** | طلاب الوكيل/المدير + نقل فصل مع بقاء النقاط (123) |
| **v2.8.18** | خروج الطاقم → `/login/staff` |
| **v2.8.19** | إعادة تصميم لوحة المتصدرين المقسومة (منصة + نسبية + فارغة تحفيزية) |
| **v2.8.21** | منصة أسطوانية ثلاثية الأبعاد + قائمة زجاجية (مرجع بصري) |
| v2.8.22 | مضمار سباق (أُلغي) |
| **v2.8.23** | الرجوع لتصميم المنصة الأسطوانية |
| **v2.8.24** | صور طلاب/فصول على لوحة المتصدرين |
| **v2.8.25** | رفع صورة الفصل بالضغط على الصورة (بدون كاميرا) |
| **v2.8.26** | مفتاح Storage ASCII (أُلغي لاحقاً لصالح Hostinger) |
| **v2.8.27** | صور الطلاب/الفصول عبر Hostinger PHP بدل Supabase Storage |
| **v2.8.28** | مواد الملف التعليمي حسب الصف + دخول الطاقم في تطبيق PWA |

للتفاصيل الكاملة: `VERSION.md`.


---

## 19) ملخص جملة واحدة

> **أولمبياد النخبة:** منصة مدرسية عربية RTL — React/Vite على Hostinger، Supabase للبيانات، WhatsApp على VPS — تجمع نقاط أولمبياد + أكاديمي + غياب وكيل/مدير + طلاب/نقل فصول + اختبارات + مسابقة + AI + PWA، مع مساحة مطور `/dev` وقاعدة معرفة `knowledge-base/`.

---

**— نهاية الملف الشامل — حدّث التاريخ والإصدار و§17–§18 مع كل تغيير منتج —**
