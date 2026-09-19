# ERB-Elite — Version History

## Version: v2.16.0
**Date:** 2026-09-19

### Changes
- إضافة نظام النسخ الاحتياطي الشامل للبيانات لرائد النشاط والمسؤول والمدير (`/admin/backup` و `/principal/backup`).
- دعم تصدير كامل البيانات إلى ملف إكسيل متعدد الصفحات (`.xlsx`) وملف كائنات مهيكل (`.json`).
- شمول 16 قطاعاً وقاعدة بيانات: الطلاب، المستخدمين، الحسابات المولدة وكلمات المرور، سجل النقاط، الأنشطة، التحاضير والخطط الدراسية، الواجبات، مراجعات الاختبارات، جداول الحصص الأسبوعية، توزيع المعلمين، جلسات الحضور، وإعدادات المدرسة.
- واجهة تحكم تفاعلية مع شريط تقدم لحظي وإحصائيات مباشرة لكل جدول ومتابعة توقيت آخر نسخة احتياطية.

### Files Modified / Created
- `src/lib/systemBackupService.ts` ← **[NEW]**
- `src/pages/admin/AdminBackupPage.tsx` ← **[NEW]**
- `src/router/index.tsx`
- `src/types/index.ts`
- `src/lib/navGroups.ts`
- `src/layouts/AppLayout.tsx`
- `src/components/ui/MobileRoleDock.tsx`
- `src/components/admin/AdminDashboard.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.15.0 → الجديد: v2.16.0 (Minor — نظام النسخ الاحتياطي المتكامل للمنصة)

---

## Version: v2.15.0
**Date:** 2026-09-16

### Changes (Bug Fix Audit — Phase 1 & 2)
- BUG-001: توحيد دالة `withTimeout` في `src/lib/utils/asyncUtils.ts` — حذف التعريف المكرر من authStore وauth
- BUG-003: إعادة ضبط `initPromise = null` عند فشل تهيئة المصادقة للسماح بإعادة المحاولة
- BUG-004: إصلاح كلاس CSS `py-0.2` غير الصالح في Tailwind إلى `py-px` في ملفين
- BUG-006: توحيد مفتاح cache لـ `display_leaderboard_rpc` + إضافته لـ REALTIME_SUBSCRIPTIONS
- BUG-007: إضافة `withTimeout` ومعالجة أخطاء كاملة لـ `refreshUser` في authStore
- BUG-008: إصلاح `periodStart` لاستخدام توقيت السعودية (Asia/Riyadh) بدلاً من توقيت المتصفح
- BUG-011: تأخير تقييم `allowedRoles` في `ProtectedRoute` حتى اكتمال جلب الملف الشخصي
- IMP-006: إضافة `client_secret*.json` لـ `.gitignore` لحماية مفاتيح OAuth
- تحديث `vite.config.ts` لاستثناء `Versions/**` و`*.zip` من مراقب الملفات (EBUSY fix)

### Files Modified
- `src/lib/utils/asyncUtils.ts` ← **[NEW]**
- `src/stores/authStore.ts`
- `src/lib/auth.ts`
- `src/router/ProtectedRoute.tsx`
- `src/lib/teacherScope.ts`
- `src/lib/realtimeConfig.ts`
- `src/components/student/ClassRankSection.tsx`
- `src/components/student/StudentDashboard.tsx`
- `.gitignore`
- `vite.config.ts`
- `VERSION.md`

### Version bump
- السابق: v2.14.6 → الجديد: v2.15.0 (Minor — إصلاح 7 مشاكل + ميزة توحيد utils)

---

## Version: v2.14.6
**Date:** 2026-09-11

### Changes
- خيار تصدير PDF على ورق A4: 9 بطاقات في الصفحة (3×3)

### Files Modified
- `src/lib/exportStudentCardsZip.ts`
- `src/components/admin/AdminStudentCardsTab.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.14.5 → الجديد: v2.14.6 (Patch)

---

## Version: v2.14.5
**Date:** 2026-09-11

### Changes
- تصدير PDF جاهز للطباعة بحجم بطاقة الهوية CR80 (54×86 مم) — صفحة لكل بطاقة
- تحسين الطباعة من المتصفح لنفس الحجم
- جودة PNG أعلى (~300 DPI) للتصدير

### Files Modified
- `src/lib/exportStudentCardsZip.ts`
- `src/components/admin/AdminStudentCardsTab.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.14.4 → الجديد: v2.14.5 (Patch)

---

## Version: v2.14.4
**Date:** 2026-09-11

### Changes
- تحسين تصميم بطاقة الهوية: شريط ذهبي، إطار كحلي، حقول أوضح بخطوط فاصلة، QR بإطار أنيق

### Files Modified
- `src/components/student/StudentCard.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.14.3 → الجديد: v2.14.4 (Patch)

---

## Version: v2.14.3
**Date:** 2026-09-11

### Changes
- زر PNG في بطاقات الهوية: نص أبيض ثابت على خلفية كحلية واضحة

### Files Modified
- `src/components/admin/AdminStudentCardsTab.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.14.2 → الجديد: v2.14.3 (Patch)

---

## Version: v2.14.2
**Date:** 2026-09-11

### Changes
- بطاقة الطالب: تكبير خط الاسم والصف والفصل وإنزالها قليلاً للأسفل

### Files Modified
- `src/components/student/StudentCard.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.14.1 → الجديد: v2.14.2 (Patch)

---

## Version: v2.14.1
**Date:** 2026-09-11

### Changes
- توضيح نص خيار «تطبيق الحد الافتراضي على جميع المعلمين» وتحسين تباينه
- تحديث ألوان صفحة حدود المعلمين لتستخدم متغيرات الثيم (وضع فاتح/داكن)

### Files Modified
- `src/components/admin/TeacherLimitsSettings.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.14.0 → الجديد: v2.14.1 (Patch)

---

## Version: v2.14.0
**Date:** 2026-09-11

### Changes
- فحص شامل لتباين الوضع الفاتح وإصلاح النصوص المختفية فوق الخلفيات الملونة/الكحلية
- تعزيز `theme.css`: استثناءات `text-on-contrast`، تحويل الخلفيات الـ hex الداكنة، حدود سوداء
- لمسة تصميم: شريط ذهبي أعلى البطاقات، ظل ذهبي خفيف عند المرور، أفاتار بهوية كحلي بدل بنفسجي
- شريط الجوال السفلي متوافق مع الوضع الفاتح
- شاشات المسابقة محمية بـ `theme-force-dark`
- أزرار/ترويسات/تبديل وضع المعلم/تبويبات الإدارة بألوان الهوية وتباين صحيح

### Files Modified
- `src/styles/theme.css`
- `src/index.css`
- `src/components/ui/Button.tsx`
- `src/components/ui/PageHeader.tsx`
- `src/components/ui/MobileRoleDock.tsx`
- `src/components/theme/ThemeAppearanceControl.tsx` (سابق)
- `src/components/dashboard/horizon/HorizonDashboard.tsx`
- `src/components/academic/AcademicUi.tsx`
- `src/components/teacher/TeacherModeToggle.tsx`
- `src/components/teacher/ModeWorkspaceBanner.tsx`
- `src/components/users/BulkAccountGenerator.tsx` + جداول/صفحات الأفاتار
- `src/layouts/AppLayout.tsx`
- `src/pages/competition/*Screen*.tsx`, `CompLeaderboardPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.13.0 → الجديد: v2.14.0 (Minor)
- نسخة استرجاع: `Versions/2026-09-11_v2.14.0_BeforeLightContrastAudit.zip`

---
## Version: v2.13.0
**Date:** 2026-09-11

### Changes
- تحسين الوضع الفاتح: تباين أوضح، حدود سوداء، خلفية بيضاء بلا شبكة
- إصلاح نص أبيض على خلفية كحلية (اختيار المظهر والأيقونات الملونة)
- إزالة `content-grid-bg` من التخطيطات

### Files Modified
- `src/styles/theme.css`
- `src/index.css`
- `src/components/theme/ThemeAppearanceControl.tsx`
- `src/components/dashboard/horizon/HorizonDashboard.tsx`
- `src/layouts/AppLayout.tsx`
- `src/layouts/DevLayout.tsx`
- `src/App.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.12.2 → الجديد: v2.13.0 (Minor)
- نسخة استرجاع: `Versions/2026-09-11_v2.13.0_BeforeLightModeContrastFix.zip`

---
## Version: v2.12.2
**Date:** 2026-09-11

### Changes
- إزالة شبكة المربعات من خلفية الصفحات (وضع فاتح وداكن)

### Files Modified
- `src/index.css`
- `src/styles/theme.css`
- `VERSION.md`

### Version bump
- السابق: v2.12.1 → الجديد: v2.12.2 (Patch)

---

## Version: v2.12.1
**Date:** 2026-09-11

### Changes
- إصلاح تباين بطاقة الهوية في الوضع الفاتح (نص أبيض ثابت على الشارات الكحلية)
- حدود البطاقة وإطارات QR والنصوص على الأبيض أصبحت سوداء بدل الرمادي/الكحلي الباهت
- حدود الوضع الفاتح العامة أصبحت سوداء للتماشي مع الخلفية البيضاء
- حذف `public/id-card/reference.png` الذي كان يسبب تعطل Vite (EBUSY)

### Files Modified
- `src/components/student/StudentCard.tsx`
- `src/styles/theme.css`
- `VERSION.md`

### Version bump
- السابق: v2.12.0 → الجديد: v2.12.1 (Patch)

---

### Changes
- إعادة تصميم بطاقة الهوية وفق قالب المدرسة الرسمي (إطار كحلي، شعاران، شارات عنوان)
- المحتوى: الاسم + الصف + الفصل + QR بإطارات زاوية + توقيع مدير المدرسة
- إضافة أصول الشعارات في `public/id-card/`

### Files Modified
- `src/components/student/StudentCard.tsx`
- `src/lib/exportStudentCardsZip.ts`
- `public/id-card/logo-left.png` (جديد)
- `public/id-card/logo-right.png` (جديد)
- `VERSION.md`

### Version bump
- السابق: v2.11.0 → الجديد: v2.12.0 (Minor)
- نسخة استرجاع: `Versions/2026-09-11_v2.12.0_BeforeSchoolIdCardDesign.zip`

---
## Version: v2.11.0
**Date:** 2026-09-11

### Changes
- بطاقة الهوية أصبحت بسيطة: اسم الطالب + الصف + الفصل + QR فقط
- إزالة البنر والشعار والصورة ورقم القيد والشريط السفلي من البطاقة
- توحيد طباعة تبويب QR مع نفس التصميم المبسط
- تسريع تصدير PNG (بدون جلب صور أو شعار المنصة)

### Files Modified
- `src/components/student/StudentCard.tsx`
- `src/components/student/StudentCardPanel.tsx`
- `src/components/admin/AdminStudentCardsTab.tsx`
- `src/components/shared/StudentQRGenerator.tsx`
- `src/lib/exportStudentCardsZip.ts`
- `VERSION.md`

### Version bump
- السابق: v2.10.2 → الجديد: v2.11.0 (Minor)
- نسخة استرجاع: `Versions/2026-09-11_v2.11.0_BeforeMinimalIdCard.zip`

---
## Version: v2.10.2
**Date:** 2026-09-06

### Changes
- إصلاح المنح اليدوي: إنشاء/تفعيل نشاط «نشاط يدوي» تلقائياً قبل الإدراج
- ملف SQL جاهز للتشغيل: `fix-ensure-manual-teacher-activity.sql`
- دالة `ensure_manual_teacher_activity()` في قاعدة البيانات

### Files Modified
- `supabase/migrations/134_ensure_manual_teacher_activity.sql` (جديد)
- `supabase/fix-ensure-manual-teacher-activity.sql` (جديد)
- `supabase/fix-manual-activity-evidence.sql`
- `src/lib/pointsEvidence.ts`
- `src/pages/points/GrantPointsPage.tsx`
- `src/lib/teacherScope.ts`
- `VERSION.md`

### Version bump
- السابق: v2.10.1 → الجديد: v2.10.2 (Patch)

### مطلوب على قاعدة البيانات
شغّل في Supabase SQL Editor:
`supabase/fix-ensure-manual-teacher-activity.sql`

---

## Version: v2.10.1
**Date:** 2026-09-06

### Changes
- إصلاح حد النشاط/طالب: احتساب المنح الموجبة فقط — الخصم لم يعد يمنع إعادة منح نفس النشاط
- تحسين رسائل فشل `points_ledger` (حد النشاط، الشواهد، المفتاح الأجنبي)
- المنح اليدوي: عدم إرسال `evidence_urls` فارغاً لتفادي فشل الإدراج عند عدم مزامنة العمود
- إضافة **خصم جماعي للفصل** في صفحة النقاط الجماعية (`/admin/bulk-grant`)

### Files Modified
- `supabase/migrations/133_fix_activity_term_limit_grants_only.sql` (جديد)
- `supabase/fix-activity-term-limit-grants-only.sql` (جديد — تشغيل يدوي)
- `src/lib/teacherScope.ts`
- `src/pages/points/GrantPointsPage.tsx`
- `src/pages/admin/ClassBulkGrantPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.10.0 → الجديد: v2.10.1 (Patch)

### Rollback
- `Versions/2026-09-06_v2.10.0_BeforePointsLimitAndBulkDeduct.zip`

### مطلوب على قاعدة البيانات
شغّل على Supabase SQL Editor:
`supabase/fix-activity-term-limit-grants-only.sql`
أو طبّق migration `133`.

---

## Version: v2.10.0
**Date:** 2026-09-05

### Changes
- إضافة نظام مظهر مركزي (فاتح / داكن / حسب الجهاز) مع حفظ الاختيار ومنع وميض الثيم عند التحميل
- جعل Light Mode الوضع الافتراضي بهوية كحلي + ذهبي وأسطح بيضاء نظيفة (بدون تدرجات)
- الإبقاء على Dark Mode بالكامل مع Theme Tokens وCSS Variables
- عنصر اختيار المظهر في الهيدر والشريط الجانبي وصفحات الدخول

### Files Modified
- `src/styles/theme.css` (جديد)
- `src/lib/theme.ts` (جديد)
- `src/stores/themeStore.ts` (جديد)
- `src/components/theme/ThemeProvider.tsx` (جديد)
- `src/components/theme/ThemeAppearanceControl.tsx` (جديد)
- `src/index.css`
- `tailwind.config.js`
- `index.html`
- `src/App.tsx`
- `src/layouts/AppLayout.tsx`
- `src/layouts/DevLayout.tsx`
- `src/components/ui/Button.tsx`
- `src/components/ui/PageHeader.tsx`
- `src/components/dashboard/glass/glass.css`
- `src/pages/LoginPage.css`
- `src/pages/LoginPage.tsx`
- `src/pages/StaffLoginPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.9.0 → الجديد: v2.10.0 (Minor — ميزة المظهر الفاتح)

### Rollback
- `Versions/2026-09-05_v2.9.0_BeforeLightTheme.zip`

---

## Version: v2.9.0
**Date:** 2026-09-05

### Changes
- تصدير أسماء الطلاب إلى Excel (اسم الطالب، رقم الهوية، الصف، الفصل) من دليل العائلة ومن قائمة طلاب الإدارة/الوكيل
- أولمبياد رائد النشاط مقصور على المرحلة المتوسطة فقط: QR، بطاقات التعريف، الصور، المنح الجماعي، حضور الفعاليات، ومنح النقاط

### Files Modified
- `src/lib/olympiadMiddleScope.ts` (جديد)
- `src/components/users/FamilyDirectoryPanel.tsx`
- `src/components/academic/StaffStudentsPanel.tsx`
- `src/components/shared/StudentQRGenerator.tsx`
- `src/components/admin/AdminStudentCardsTab.tsx`
- `src/components/admin/ProfileImagesTab.tsx`
- `src/components/admin/EventCheckInPanel.tsx`
- `src/pages/admin/AdminIdCardsHubPage.tsx`
- `src/pages/admin/ClassBulkGrantPage.tsx`
- `src/pages/points/GrantPointsPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.55 → الجديد: v2.9.0 (Minor — ميزة تصدير + تقييد نطاق الأولمبياد)

### Rollback
- `Versions/2026-09-05_v2.8.55_BeforeMiddleOlympiadExport.zip`

---

## Version: v2.8.55
**Date:** 2026-09-02

### Changes
- إزالة إعلان «تحديث المنصة» من لوحة الشؤون الأكاديمية

### Files Modified
- `src/pages/academic/AcademicStaffHubPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.54 → الجديد: v2.8.55 (Patch)

---

## Version: v2.8.54
**Date:** 2026-09-02

### Changes
- PWA: يفتح مباشرة على دخول الطاقم — بدون صفحة اختيار أو ظهور شاشة ولي الأمر/الطالب
- فصل الشاشات: إزالة رابط «دخول الطالب/ولي الأمر» من شاشة الطاقم
- ولي الأمر/الطالب يدخلون من `/login` فقط (رابط مباشر)

### Files Modified
- `src/lib/auth.ts`
- `src/router/index.tsx`
- `src/pages/StaffLoginPage.tsx`
- `vite.config.ts`
- `src/pages/AppLaunchPage.tsx` (حُذف)
- `VERSION.md`

### Version bump
- السابق: v2.8.53 → الجديد: v2.8.54 (Patch)

---

## Version: v2.8.53
**Date:** 2026-09-02

### Changes
- PWA: صفحة اختيار الدخول (`/start`) — طاقم أو عائلة بدل توجيه الجميع لولي الأمر/الطالب
- `start_url` للتطبيق المثبّت → `/start` مع اختصارات دخول الطاقم والعائلة
- تذكّر آخر نوع دخول (طاقم/عائلة) في localStorage

### Files Modified
- `src/pages/AppLaunchPage.tsx` (جديد)
- `src/lib/auth.ts`
- `src/router/index.tsx`
- `vite.config.ts`
- `VERSION.md`

### Version bump
- السابق: v2.8.52 → الجديد: v2.8.53 (Minor)

---

## Version: v2.8.52
**Date:** 2026-09-02

### Changes
- إصلاح: تغيير تاريخ الواجب ليوم بلا حصص يُظهر «ليس لديك حصص» بدل نموذج كامل
- إيقاف الرجوع لكل الفصول في أيام العطلة أو الأيام بدون حصص

### Files Modified
- `src/lib/academic/scheduleDayHelpers.ts`
- `src/pages/academic/AcademicHomeworkPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.51 → الجديد: v2.8.52 (Patch)

---

## Version: v2.8.51
**Date:** 2026-09-02

### Changes
- إصلاح: ظهور المادة في الواجبات — عرض مواد الجدول مباشرة + مطابقة أسماء الأيام

### Files Modified
- `src/lib/academic/subjectHelpers.ts`
- `src/lib/academic/scheduleDayHelpers.ts`
- `src/pages/academic/AcademicHomeworkPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.50 → الجديد: v2.8.51 (Patch)

---

## Version: v2.8.50
**Date:** 2026-09-02

### Changes
- ربط الواجبات بالجدول الدراسي: المواد والفصول حسب حصص اليوم المختار
- رسالة «ليس لديك حصص اليوم» عند عدم وجود حصص (أو يوم عطلة)
- توجيه لإعداد الجدول الدراسي إن لم يُسجَّل بعد

### Files Modified
- `src/lib/academic/scheduleDayHelpers.ts` (جديد)
- `src/pages/academic/AcademicHomeworkPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.49 → الجديد: v2.8.50 (Minor)

### Backup
- `Versions/2026-09-02_v2.8.49_HomeworkScheduleLink.zip`

---

## Version: v2.8.49
**Date:** 2026-09-02

### Changes
- صفحة «خططي»: زر حذف لكل خطة مع تأكيد — يحذف حصص المعلم فقط في الخطة المشتركة

### Files Modified
- `src/pages/academic/AcademicMyWeeklyPlansPage.tsx`
- `src/lib/academic/weeklyPlanService.ts`
- `VERSION.md`

### Version bump
- السابق: v2.8.48 → الجديد: v2.8.49 (Patch)

---

## Version: v2.8.48
**Date:** 2026-09-02

### Changes
- إصلاح SQL: دمج خطط أسبوعية مكررة قبل إنشاء الفهرس الفريد (خطأ 23505)
- إصلاح `teacher_teaches_academic_class`: استخدام `grades_with_sections` بدل `grade`/`sections` غير الموجودين

### Files Modified
- `supabase/fix-weekly-plan-save.sql`
- `supabase/fix-weekly-plan-dedupe.sql` (جديد)
- `supabase/migrations/132_dedupe_weekly_plans.sql` (جديد)
- `VERSION.md`

### Version bump
- السابق: v2.8.47 → الجديد: v2.8.48 (Patch)

---

## Version: v2.8.47
**Date:** 2026-09-02

### Changes
- إصلاح «خططي»: الخطط المحفوظة تظهر بعد الحفظ عبر RPC `list_my_weekly_plans` + تصفية أدق
- بعد حفظ الخطة يُوجَّه المعلم تلقائياً إلى صفحة «خططي»
- تحسين فلاتر المرحلة/الصف/الأسبوع وإعادة جلب البيانات عند فتح الصفحة

### Files Modified
- `src/lib/academic/weeklyPlanHelpers.ts`
- `src/lib/academic/weeklyPlanService.ts`
- `src/lib/academic/supabaseError.ts`
- `src/pages/academic/AcademicWeeklyPlansPage.tsx`
- `src/pages/academic/AcademicMyWeeklyPlansPage.tsx`
- `supabase/migrations/131_list_my_weekly_plans.sql`
- `supabase/fix-weekly-plan-save.sql`
- `VERSION.md`

### Version bump
- السابق: v2.8.46 → الجديد: v2.8.47 (Patch)

---

## Version: v2.8.46
**Date:** 2026-09-02

### Changes
- نسخ «المواضيع متشابهة»: المطابقة بالمادة فقط — كل حصص نفس المادة في الفصول الأخرى تحصل على الموضوع

### Files Modified
- `src/lib/academic/weeklyPlanHelpers.ts`
- `src/pages/academic/AcademicWeeklyPlansPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.45 → الجديد: v2.8.46 (Patch)

---

## Version: v2.8.45
**Date:** 2026-09-02

### Changes
- وضع «المواضيع متشابهة»: نسخ أوسع (اليوم+الحصة) + معاينة قبل الحفظ + تنبيه إن لم تُنسخ لفصل

### Files Modified
- `src/lib/academic/weeklyPlanHelpers.ts`
- `src/pages/academic/AcademicWeeklyPlansPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.44 → الجديد: v2.8.45 (Patch)

---

## Version: v2.8.44
**Date:** 2026-09-02

### Changes
- صفحة الخطط الأسبوعية للمعلم: إنشاء/تعديل فقط — إخفاء قائمة الخطط السابقة (تظهر في «خططي»)

### Files Modified
- `src/pages/academic/AcademicWeeklyPlansPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.43 → الجديد: v2.8.44 (Patch)

---

## Version: v2.8.43
**Date:** 2026-09-02

### Changes
- «خططي»: شاشة كاملة `/academic/my-weekly-plans` بفلاتر المرحلة والصف والفصل والأسبوع + بحث نصي (بدلاً من نافذة منبثقة)

### Files Modified
- `src/pages/academic/AcademicMyWeeklyPlansPage.tsx` (جديد)
- `src/pages/academic/AcademicWeeklyPlansPage.tsx`
- `src/router/index.tsx`
- `src/components/academic/TeacherMyWeeklyPlansModal.tsx` (حُذف)
- `VERSION.md`

### Version bump
- السابق: v2.8.42 → الجديد: v2.8.43 (Patch)

---

## Version: v2.8.42
**Date:** 2026-09-02

### Changes
- الخطة الأسبوعية: زر «خططي» يعرض خطط المعلم مجمّعة حسب الصف والفصل والأسبوع
- إصلاح حفظ الخطة (دمج الحصص + التحقق من الحفظ + رسالة نجاح واضحة)
- إصلاح مسح إدخال المواضيع عند وضع «كل فصل على حدة»

### Files Modified
- `src/pages/academic/AcademicWeeklyPlansPage.tsx`
- `src/lib/academic/weeklyPlanService.ts`
- `src/lib/academic/weeklyPlanHelpers.ts`
- `src/components/academic/TeacherMyWeeklyPlansModal.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.41 → الجديد: v2.8.42 (Patch)

---

## Version: v2.8.41
**Date:** 2026-08-24

### Changes
- الخطة الأسبوعية: اختيار الصف ثم إدخال حصص كل الفصول في شاشة واحدة، أو نسخ المواضيع المتشابهة للحصص المطابقة فقط

### Files Modified
- `src/pages/academic/AcademicWeeklyPlansPage.tsx`
- `src/lib/academic/weeklyPlanHelpers.ts`
- `VERSION.md`

### Version bump
- السابق: v2.8.40 → الجديد: v2.8.41 (Minor)

---

## Version: v2.8.40
**Date:** 2026-08-24

### Changes
- تحديث نص إعلان المعلمين (واتساب فردي + جروبات) ليشمل وصول التحديث دون إعادة تثبيت التطبيق

### Files Modified
- `src/lib/whatsappReminder.ts`
- `src/pages/academic/AcademicStaffHubPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.39 → الجديد: v2.8.40 (Patch)

---

## Version: v2.8.39
**Date:** 2026-08-24

### Changes
- إجبار وصول التحديث بعد الرفع: منع كاش index/SW على الاستضافة، تفعيل Service Worker فوراً، وإعادة تحميل التطبيق المثبت (بما فيه آيفون) دون حذفه

### Files Modified
- `src/sw.ts`
- `src/components/pwa/PwaManager.tsx`
- `public/.htaccess`
- `vite.config.ts`
- `VERSION.md`

### Version bump
- السابق: v2.8.38 → الجديد: v2.8.39 (Patch)

---

## Version: v2.8.38
**Date:** 2026-08-24

### Changes
- رسالة جاهزة للمعلمين عن الإصلاحات والإضافات: قالب واتساب «تحديث المنصة» وإعلان في لوحة الشؤون الأكاديمية

### Files Modified
- `src/lib/whatsappReminder.ts`
- `src/pages/principal/academic/PrincipalWhatsAppRemindersPage.tsx`
- `src/pages/academic/AcademicStaffHubPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.37 → الجديد: v2.8.38 (Patch)

---

## Version: v2.8.37
**Date:** 2026-08-24

### Changes
- زر حذف كل مهام طابور المنصة من صفحات Jobs و Queue

### Files Modified
- `src/pages/dev/DevJobsPage.tsx`
- `src/pages/dev/DevQueuePage.tsx`
- `src/lib/platformJobs.ts`
- `supabase/migrations/130_purge_platform_jobs.sql`
- `supabase/fix-purge-platform-jobs.sql`
- `VERSION.md`

### Version bump
- السابق: v2.8.36 → الجديد: v2.8.37 (Patch)

---

## Version: v2.8.36
**Date:** 2026-08-24

### Changes
- مسح سجل أخطاء شاشة المطوّر بالكامل للبدء من صفر (SQL + زر مسح السجل)

### Files Modified
- `src/pages/dev/DevErrorsPage.tsx`
- `src/lib/platformErrors.ts`
- `supabase/migrations/129_purge_platform_errors.sql`
- `supabase/fix-purge-platform-errors.sql`
- `VERSION.md`

### Version bump
- السابق: v2.8.35 → الجديد: v2.8.36 (Patch)

---

## Version: v2.8.35
**Date:** 2026-08-24

### Changes
- مراجعة 270 خطأ من شاشة المطوّر: إصلاح أيقونة الدخول، منع استخدام مفتاح API كنموذج ذكاء، وتصفية ضجيج الإضافات وأخطاء المستخدم المتوقعة

### Files Modified
- `public/icon.jpeg`
- `public/icon.png`
- `src/lib/platformErrors.ts`
- `src/pages/principal/academic/PrincipalAiSettingsPage.tsx`
- `supabase/functions/ai-generate/index.ts`
- `VERSION.md`

### Version bump
- السابق: v2.8.34 → الجديد: v2.8.35 (Patch)

---

## Version: v2.8.34
**Date:** 2026-08-24

### Changes
- دخول المعلم: جوال (واتساب) أو حساب جيميل فقط — بدون إدخال بريد وكلمة مرور يدوياً

### Files Modified
- `src/pages/StaffLoginPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.33 → الجديد: v2.8.34 (Patch)

---

## Version: v2.8.33
**Date:** 2026-08-24

### Changes
- منع أكثر من جدول دراسي لنفس الفصل لنفس المعلم: الحفظ يعدّل الجدول الموجود، مع قيد فريد في قاعدة البيانات

### Files Modified
- `src/pages/academic/AcademicSchedulePage.tsx`
- `src/lib/academic/teacherService.ts`
- `supabase/migrations/128_unique_teacher_class_schedule.sql`
- `supabase/fix-unique-teacher-class-schedule.sql`
- `VERSION.md`

### Version bump
- السابق: v2.8.32 → الجديد: v2.8.33 (Patch)

---

## Version: v2.8.32
**Date:** 2026-08-24

### Changes
- حذف الخطة الأسبوعية يحذف الخطة كاملة وليس الحصص فقط

### Files Modified
- `src/pages/academic/AcademicWeeklyPlansPage.tsx`
- `src/lib/academic/weeklyPlanService.ts`
- `supabase/migrations/127_delete_weekly_plan.sql`
- `supabase/fix-weekly-plan-delete.sql`
- `VERSION.md`

### Version bump
- السابق: v2.8.31 → الجديد: v2.8.32 (Patch)

---

## Version: v2.8.31
**Date:** 2026-08-24

### Changes
- شاشة مراقبة الأخطاء للمطور: نسخ جميع الأخطاء (حسب التصفية) أو خطأ واحد إلى الحافظة بصيغة جاهزة للصق وحلّها

### Files Modified
- `src/pages/dev/DevErrorsPage.tsx`
- `src/lib/platformErrors.ts`
- `VERSION.md`

### Version bump
- السابق: v2.8.30 → الجديد: v2.8.31 (Patch)

---

## Version: v2.8.31
**Date:** 2026-08-24

### Changes
- إصلاح رسالة «عمود الفصل الدراسي غير موجود» عند حفظ الخطة — السبب دالة 067 وليس عمود 058
- مسار احتياطي للحفظ إن لم تُثبت الدالة بعد
- ملف SQL جاهز: `supabase/fix-weekly-plan-save.sql`

### Files Modified
- `src/lib/academic/supabaseError.ts`
- `src/lib/academic/weeklyPlanService.ts`
- `supabase/fix-weekly-plan-save.sql`
- `VERSION.md`

### Version bump
- السابق: v2.8.30 → الجديد: v2.8.31 (Patch)

---

## Version: v2.8.30
**Date:** 2026-08-24

### Changes
- تبويب المعلم: دخول بجوجل أو البريد (جيميل) بالإضافة لواتساب
- الخطط الأسبوعية: اختيار الفصل والأسبوع بحرية (لم يعد ثابتاً بالأسبوع الحالي)
- تعديل الملف التعليمي بعد الإنشاء (مواد/صفوف/فصول) من لوحة الأكاديمي
- الجدول الدراسي: نصاب كل فصل + النصاب الجماعي (عدد الحصص)

### Files Modified
- `src/pages/StaffLoginPage.tsx`
- `src/pages/academic/AcademicWeeklyPlansPage.tsx`
- `src/pages/academic/AcademicTeacherSetupPage.tsx`
- `src/pages/academic/AcademicStaffHubPage.tsx`
- `src/pages/academic/AcademicSchedulePage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.29 → الجديد: v2.8.30 (Patch)

---

## Version: v2.8.29
**Date:** 2026-08-23

### Changes
- إزالة رابط دخول الطاقم من شاشة دخول الطلاب/أولياء الأمور

### Files Modified
- `src/pages/LoginPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.28 → الجديد: v2.8.29 (Patch)

---

## Version: v2.8.28
**Date:** 2026-08-23

### Changes
- إعداد الملف التعليمي: اختيار المادة مرتبط بالصف فقط (لا تُعمَّم على كل الصفوف)
- تثبيت PWA للمعلمين: تذكر شاشة دخول الطاقم (`/login/staff`) بدل دخول الطلاب

### Files Modified
- `src/pages/academic/AcademicTeacherSetupPage.tsx`
- `src/lib/academic/subjectHelpers.ts` · `types.ts`
- `src/pages/academic/AcademicSchedulePage.tsx` · `AcademicHomeworkPage.tsx` · `AcademicExamReviewsPage.tsx` · `AcademicLessonTopicsPage.tsx`
- `src/lib/academic/olympiadSyncService.ts` · `adminService.ts` · `src/lib/teacherAnalytics.ts`
- `src/lib/auth.ts` · `src/stores/authStore.ts` · `src/pages/LoginPage.tsx` · `src/pages/StaffLoginPage.tsx`
- `supabase/migrations/126_teacher_subjects_by_grade.sql`
- `supabase/fix-academic-subjects-by-grade.sql`
- `VERSION.md`

### Version bump
- السابق: v2.8.27 → الجديد: v2.8.28 (Patch)

---

## Version: v2.8.27
**Date:** 2026-08-21

### Changes
- رفع صور الطلاب/الفصول عبر Hostinger (`upload-school-media.php`) بدل Supabase Storage
- الرابط العام فقط يُحفظ في Supabase (`photo_url` / `class_profiles`)

### Files Modified
- `public/api/upload-school-media.php` (new)
- `public/uploads/school-media/.gitkeep`
- `src/lib/hostingerUpload.ts`
- `src/lib/mediaUpload.ts`
- `.env.example` · `Docs/AI_PLATFORM_CONTEXT.md` · `VERSION.md`

### Version bump
- السابق: v2.8.26 → الجديد: v2.8.27 (Patch)

---

## Version: v2.8.26
**Date:** 2026-08-21

### Changes
- إصلاح رفع صورة الفصل: مفتاح Storage ASCII بدل العربية/المسافات (`Invalid key`)

### Files Modified
- `src/lib/mediaUpload.ts`
- `VERSION.md`

### Version bump
- السابق: v2.8.25 → الجديد: v2.8.26 (Patch)

---

## Version: v2.8.25
**Date:** 2026-08-21

### Changes
- رفع صورة الفصل بالضغط على الصورة مباشرة (بدون أيقونة كاميرا)
- توسيع صلاحية الرفع: وكيل ومعلم (هجرة 125)

### Files Modified
- `src/components/leaderboard/ClassPhotoClickable.tsx` (new)
- حذف `ClassPhotoUploadButton.tsx`
- `ClassRankList.tsx` · `GamingPodium.tsx` · `SplitLeaderboardPanel.tsx`
- `supabase/migrations/125_class_photo_upload_roles.sql`
- `Docs/AI_PLATFORM_CONTEXT.md` · `VERSION.md`

### Version bump
- السابق: v2.8.24 → الجديد: v2.8.25 (Patch)

---

## Version: v2.8.24
**Date:** 2026-08-21

### Changes
- لوحة المتصدرين: عرض صورة الطالب (مع fallback) بدل الحرف فقط
- رفع صورة الفصل من نفس شاشة الصدارة (منصة + قائمة) للرائد/المدير/الوكيل
- جلب صور الفصول في `fetchDisplayLeaderboard` من `class_profiles`

### Files Modified
- `src/components/leaderboard/GamingPodium.tsx`
- `src/components/leaderboard/ClassRankList.tsx`
- `src/components/leaderboard/ClassPhotoUploadButton.tsx` (new)
- `src/components/leaderboard/StudentRankList.tsx`
- `src/components/leaderboard/SplitLeaderboardPanel.tsx`
- `src/lib/leaderboardDisplay.ts`
- `VERSION.md`

### Version bump
- السابق: v2.8.23 → الجديد: v2.8.24 (Patch)

---

## Version: v2.8.23
**Date:** 2026-08-21

### Changes
- التراجع عن مضمار السباق وإعادة تصميم المنصة الأسطوانية + القائمة الزجاجية (v2.8.21)

### Files Modified
- `src/components/leaderboard/SplitLeaderboardPanel.tsx`
- `src/components/leaderboard/DualLeaderboardPanel.tsx`
- حذف `RaceTrack.tsx` و `leaderboardRaceTargets.ts`
- `Docs/AI_PLATFORM_CONTEXT.md`
- `VERSION.md`

### Version bump
- السابق: v2.8.22 → الجديد: v2.8.23 (Patch — revert UX)

---

## Version: v2.8.22
**Date:** 2026-08-21

### Changes
- لوحة المتصدرين بمفهوم «مضمار سباق» أفقي حي (عدّاءون يتحركون حسب نسبة النقاط للهدف)
- أهداف قابلة للضبط عبر `school_settings.leaderboard_race_targets` (هجرة 124) — تعديل من الرائد/المدير
- أسلوب بصري مقصود مختلف عن navy/gold لباقي المنصة (cyan/violet race)

### Files Modified
- `src/components/leaderboard/RaceTrack.tsx` (new)
- `src/components/leaderboard/SplitLeaderboardPanel.tsx`
- `src/components/leaderboard/DualLeaderboardPanel.tsx`
- `src/lib/leaderboardRaceTargets.ts` (new)
- `supabase/migrations/124_leaderboard_race_targets.sql`
- `supabase/fix-leaderboard-race-targets.sql`
- `Docs/AI_PLATFORM_CONTEXT.md`
- `VERSION.md`

### Deploy
شغّل: `supabase/fix-leaderboard-race-targets.sql`

### Version bump
- السابق: v2.8.21 → الجديد: v2.8.22 (Minor — مفهوم عرض جديد)

---

## Version: v2.8.21
**Date:** 2026-08-21

### Changes
- لوحة المتصدرين بتصميم منصة أسطوانية ثلاثية (ذهبي/برونزي/فضي) + قائمة صفوف زجاجية دائرية بأسلوب المرجع البصري

### Files Modified
- `src/components/leaderboard/GamingPodium.tsx` (new)
- `src/components/leaderboard/StudentRankList.tsx`
- `src/components/leaderboard/ClassRankList.tsx`
- `src/components/leaderboard/SplitLeaderboardPanel.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.20 → الجديد: v2.8.21 (Patch — تصميم بصري)

---

## Version: v2.8.20
**Date:** 2026-08-21

### Changes
- إزالة زر «امنح نقاطاً الآن» من الحالة الفارغة في لوحة المتصدرين

### Files Modified
- `src/components/leaderboard/LeaderboardShared.tsx`
- `Docs/AI_PLATFORM_CONTEXT.md`
- `VERSION.md`

### Version bump
- السابق: v2.8.19 → الجديد: v2.8.20 (Patch)

---

## Version: v2.8.19
**Date:** 2026-08-21

### Changes
- إعادة تصميم لوحة المتصدرين المقسومة: منصة تتويج أوضح (كأس للمركز 1) · قائمة من 4+ · شريط تقدم نسبي من أعلى درجة · حالة فارغة تحفيزية + زر منح نقاط · تبويب أسبوعي/شهري/فصلي (UI فقط) · حركة layout · فاصل بين النصفين

### Files Modified
- `src/components/leaderboard/SplitLeaderboardPanel.tsx`
- `src/components/leaderboard/StudentRankList.tsx`
- `src/components/leaderboard/ClassRankList.tsx`
- `src/components/leaderboard/DualLeaderboardPanel.tsx`
- `src/components/leaderboard/LeaderboardShared.tsx` (new)
- `src/components/leaderboard/types.ts`
- `Docs/AI_PLATFORM_CONTEXT.md`
- `VERSION.md`

### Version bump
- السابق: v2.8.18 → الجديد: v2.8.19 (Patch — UX لوحة المتصدرين)

---

## Version: v2.8.18
**Date:** 2026-08-21

### Changes
- تسجيل الخروج للطاقم (معلم/وكيل/مدير/إدارة…) يوجّه إلى `/login/staff` بدل `/login`
- الطالب وولي الأمر يبقون على `/login`
- تحديث `Docs/AI_PLATFORM_CONTEXT.md` إلى v2.8.18

### Files Modified
- `src/lib/auth.ts`
- `src/stores/authStore.ts`
- `src/router/ProtectedRoute.tsx`
- `src/layouts/AppLayout.tsx`
- `src/components/ui/MobileRoleDock.tsx`
- `src/layouts/DevLayout.tsx`
- `Docs/AI_PLATFORM_CONTEXT.md`
- `VERSION.md`

### Version bump
- السابق: v2.8.17 → الجديد: v2.8.18 (Patch)

---

## Version: v2.8.17
**Date:** 2026-08-21

### Changes
- تبويب طلاب للوكيل (`/academic/students`): مرحلة الوكيل فقط، إجمالي حسب المرحلة/الصف/الفصل، نقل بين الفصول
- تبويب طلاب للمدير (`/principal/academic/students`): كل المدرسة بنفس المنطق
- النقاط الفردية المعتمدة تبقى مع الطالب بعد النقل (مرتبطة بـ student_id)
- RPC `transfer_student_class` — الوكيل لا ينقل خارج مرحلته

### Files Modified
- `src/components/academic/StaffStudentsPanel.tsx` (new)
- `src/pages/deputy/DeputyStudentsPage.tsx` (new)
- `src/pages/principal/academic/PrincipalStudentsRosterPage.tsx` (new)
- `src/lib/academic/staffStudents.ts` (new)
- `supabase/fix-transfer-student-class.sql` + migration 123
- router, nav, hubs, mobileDock, VERSION.md

### Version bump
- السابق: v2.8.16 → الجديد: v2.8.17 (Minor — ميزة)

### Deploy
شغّل في SQL Editor:
`supabase/fix-transfer-student-class.sql`
ثم ارفع الواجهة.

---

## Version: v2.8.16
**Date:** 2026-08-21

### Changes
- إضافة/تعديل مستخدم: تحديد مرحلة الوكيل (متوسط/ثانوي) إلزامي — ليظهر له فصول مرحلته فقط
- عرض المرحلة في جدول المستخدمين · حفظ عبر create-user

### Files Modified
- `src/components/users/AddUserModal.tsx`
- `src/components/users/UserTable.tsx`
- `src/lib/auth.ts`
- `supabase/functions/create-user/index.ts`
- `VERSION.md`

### Version bump
- السابق: v2.8.15 → الجديد: v2.8.16 (Patch)

### Deploy
```bash
supabase functions deploy create-user
```
# ثم ارفع الواجهة

---

## Version: v2.8.15
**Date:** 2026-08-21

### Changes
- غياب الوكيل لمرحلته فقط: تبويب تسجيل يومي (صف/فصل، حضور/غياب، تحضير الكل، حفظ) + تبويب حالة الفصول
- عند الحفظ: جلسة فصل + إشعار للمديرين داخل المنصة
- المدير: `/principal/academic/attendance` متابعة مكتمل/متبقي، تقارير، تذكير واتساب للوكلاء بالفصول المتبقية

### Files Modified
- `src/pages/deputy/DeputyAttendancePage.tsx`
- `src/pages/principal/academic/PrincipalAttendanceMonitorPage.tsx` (new)
- `src/lib/academic/classAttendance.ts` (new)
- `src/router/index.tsx`
- `src/types/index.ts`
- `src/lib/navGroups.ts`
- `src/pages/principal/academic/PrincipalAcademicHubPage.tsx`
- `supabase/fix-deputy-class-attendance.sql` (new)
- `supabase/migrations/122_deputy_class_attendance.sql` (new)
- `VERSION.md`

### Version bump
- السابق: v2.8.14 → الجديد: v2.8.15 (Minor — غياب يومي وكيل/مدير)

### Deploy
1. شغّل في Supabase SQL Editor: `supabase/fix-deputy-class-attendance.sql`
2. ارفع بناء الواجهة

---

## Version: v2.8.14
**Date:** 2026-08-21

### Changes
- الوكيل: تسجيل حضور/غياب يومي لفصول مرحلته (`/academic/attendance`) مع تصفية صف/فصل
- RLS: إضافة `deputy` لسياسة الحضور

### Files Modified
- `src/pages/attendance/AttendancePage.tsx`
- `src/pages/deputy/DeputyAttendancePage.tsx` (new)
- `src/lib/academic/stageScope.ts` (new)
- `src/router/index.tsx`
- `src/types/index.ts`
- `src/lib/navGroups.ts`
- `src/lib/mobileDock.ts`
- `src/pages/academic/AcademicStaffHubPage.tsx`
- `src/pages/deputy/DeputyDashboard.tsx`
- `supabase/fix-deputy-attendance-rls.sql` (new)
- `supabase/migrations/121_deputy_attendance_rls.sql` (new)
- `VERSION.md`

### Version bump
- السابق: v2.8.13 → الجديد: v2.8.14 (Minor — غياب الوكيل)

### Deploy
1. شغّل في Supabase SQL Editor: `supabase/fix-deputy-attendance-rls.sql`
2. ارفع بناء الواجهة

---

## Version: v2.8.13
**Date:** 2026-08-21

### Changes
- تسجيل المعلم عبر Google يطلب الاسم والجوال قبل التحويل ويربطهما بعد العودة (دخول واتساب + استرجاع كلمة المرور)
- توضيح شاشات الإكمال واسترجاع كلمة المرور لحسابات Google
- تطبيع رقم الجوال في `complete_teacher_profile` + منع التكرار

### Files Modified
- `src/lib/teacherSignup.ts`
- `src/pages/TeacherRegisterPage.tsx`
- `src/pages/AuthCallbackPage.tsx`
- `src/pages/teacher/TeacherOnboardingPage.tsx`
- `src/pages/StaffLoginPage.tsx`
- `supabase/functions/auth-phone-otp/index.ts`
- `supabase/fix-complete-teacher-profile-phone.sql` (new)
- `supabase/migrations/120_complete_teacher_profile_phone.sql` (new)
- `VERSION.md`

### Version bump
- السابق: v2.8.12 → الجديد: v2.8.13 (Minor-ish patch — Google + جوال)

### Deploy
1. شغّل في Supabase SQL Editor: `supabase/fix-complete-teacher-profile-phone.sql`
2. `supabase functions deploy auth-phone-otp`
3. ارفع بناء الواجهة على Hostinger

---

## Version: v2.8.12
**Date:** 2026-08-21

### Changes
- إصلاح رسالة خاطئة «الدالة غير منشورة» عند جوال غير مسجّل (كان HTTP 404 يُفسَّر كغياب الدالة)

### Files Modified
- `src/lib/authPhoneOtp.ts`
- `supabase/functions/auth-phone-otp/index.ts`
- `VERSION.md`

### Version bump
- السابق: v2.8.11 → الجديد: v2.8.12 (Patch)

### Deploy
```bash
supabase functions deploy auth-phone-otp
```
# ثم أعد بناء/رفع الواجهة على Hostinger

---

## Version: v2.8.11
**Date:** 2026-08-21

### Changes
- شاشة دخول الطاقم: تمييز زر «تسجيل معلم جديد»
- دخول المعلم بالجوال: إن لم يكن الرقم مسجّلاً تظهر رسالة واضحة مع رابط إنشاء حساب — دون الانتقال لشاشة OTP

### Files Modified
- `supabase/functions/auth-phone-otp/index.ts`
- `src/lib/authPhoneOtp.ts`
- `src/pages/StaffLoginPage.tsx`
- `src/pages/LoginPage.css`
- `VERSION.md`

### Version bump
- السابق: v2.8.10 → الجديد: v2.8.11 (Patch — UX دخول المعلم)

### Deploy
```bash
supabase functions deploy auth-phone-otp
```

---

## Version: v2.8.10
**Date:** 2026-08-21

### Changes
- إصلاح تسجيل المعلم بالجوال: استعادة حساب Auth اليتيم عند تكرار البريد الاصطناعي + رسالة عربية واضحة + عدم حرق OTP قبل نجاح الإنشاء

### Files Modified
- `supabase/functions/auth-phone-otp/index.ts`
- `src/pages/TeacherRegisterPage.tsx`
- `src/lib/errors.ts`
- `VERSION.md`

### Version bump
- السابق: v2.8.9 → الجديد: v2.8.10 (Patch — تسجيل معلم OTP)

### Deploy
```bash
supabase functions deploy auth-phone-otp
```

---

## Version: v2.8.9
**Date:** 2026-08-21

### Changes
- الأولمبياد لمعلمي المرحلة المتوسطة فقط — معلمو الثانوية يبقون في الوضع الأكاديمي دون تبديل أولمبياد
- قائمة تركيب BenQ للفنيين (12 فصلاً)

### Files Modified
- `src/lib/teacherOlympiadAccess.ts` (new)
- `src/hooks/useTeacherOlympiadAccess.ts` (new)
- `src/components/teacher/TeacherModeToggle.tsx`
- `src/layouts/AppLayout.tsx`
- `src/pages/teacher/TeacherDashboard.tsx`
- `src/components/ui/MobileRoleDock.tsx`
- `Docs/BENQ_INSTALL_CHECKLIST.md` (new)
- `VERSION.md`

### Version bump
- السابق: v2.8.8 → الجديد: v2.8.9 (Patch — قيد أولمبياد المتوسط + قائمة BenQ)

---

## Version: v2.8.8
**Date:** 2026-08-20

### Changes
- إصلاح الإشعارات: جلب/تحديث حسب `user_id` للمستخدم الحالي فقط + مفاتيح كاش منفصلة لكل مستخدم
- تشديد RLS على جدول `notifications` (FORCE + سياسات الملكية فقط)

### Files Modified
- `src/lib/notifications.ts`
- `src/components/ui/NotificationBell.tsx`
- `supabase/migrations/119_notifications_own_only.sql` (new)
- `supabase/fix-notifications-own-only.sql` (new)
- `VERSION.md`

### Version bump
- السابق: v2.8.7 → الجديد: v2.8.8 (Patch — عزل الإشعارات)

---

## Version: v2.8.7
**Date:** 2026-08-20

### Changes
- معلم/رائد عند مسح QR: سجل الطالب + نموذج منح فقط (بدون بطاقة QR)
- الزائر يبقى يرى البطاقة العامة + السجل

### Files Modified
- `src/components/shared/StudentCardPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.6 → الجديد: v2.8.7 (Patch — عرض QR حسب الدور)

---

## Version: v2.8.6
**Date:** 2026-08-20

### Changes
- بطاقة QR تعرض بيانات الطالب كاملة + المحاور + سجل النقاط المعتمد
- المعلم/الرائد بعد تسجيل الدخول يمنحان نقاطاً مباشرة من البطاقة

### Files Modified
- `supabase/migrations/118_public_student_card_ledger.sql` (new)
- `supabase/fix-public-student-card.sql`
- `src/components/shared/StudentCardPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.5 → الجديد: v2.8.6 (Minor UX — بطاقة QR + منح)

---

## Version: v2.8.5
**Date:** 2026-08-20

### Changes
- إصلاح بطاقة الطالب عند مسح QR: RPC عام `get_public_student_card` يتجاوز RLS
- إصلاح تحليل روابط `/card/t/...` في مسح المنح السريع

### Files Modified
- `supabase/migrations/117_public_student_card_rpc.sql` (new)
- `supabase/fix-public-student-card.sql` (new)
- `src/components/shared/StudentCardPage.tsx`
- `src/components/teacher/QRQuickGrant.tsx`
- `src/lib/qr.ts`
- `src/types/database.types.ts`
- `VERSION.md`

### Version bump
- السابق: v2.8.4 → الجديد: v2.8.5 (Patch — بطاقة QR)

---

## Version: v2.8.4
**Date:** 2026-08-20

### Changes
- إزالة سرد صفوف/فصول المعلم من عناوين منح النقاط والمنح الجماعي وإدارة الطلاب

### Files Modified
- `src/pages/points/GrantPointsPage.tsx`
- `src/pages/teacher/StudentsPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.3 → الجديد: v2.8.4 (Patch — عناوين الصفحات)

---

## Version: v2.8.3
**Date:** 2026-08-20

### Changes
- إصلاح رفع الشواهد: استخدام نفس نطاق Hostinger من `VITE_HOSTINGER_UPLOAD_URL` + رسالة أوضح إن لم يُرفع السكربت

### Files Modified
- `src/lib/hostingerUpload.ts`
- `public/api/upload-points-evidence.php`
- `VERSION.md`

### Version bump
- السابق: v2.8.2 → الجديد: v2.8.3 (Patch — رفع الشواهد)

---

## Version: v2.8.2
**Date:** 2026-08-20

### Changes
- قوالب جاهزة وRubric سلوكي قابلان للطي بسهم (مغلقان افتراضياً)

### Files Modified
- `src/pages/points/GrantPointsPage.tsx`
- `src/components/teacher/BehavioralRubricPanel.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.8.1 → الجديد: v2.8.2 (Patch — UX طي القوالب)

---

## Version: v2.8.1
**Date:** 2026-08-20

### Changes
- شواهد المنح تُرفع إلى Hostinger (مثل مراجعات PDF) ويُحفظ الرابط فقط في Supabase
- سكربت `public/api/upload-points-evidence.php` + مجلد `uploads/points-evidence`

### Files Modified
- `src/lib/hostingerUpload.ts`
- `src/lib/pointsEvidence.ts`
- `public/api/upload-points-evidence.php` (new)
- `public/uploads/points-evidence/` (new)
- `supabase/migrations/116_manual_activity_evidence.sql`
- `supabase/fix-manual-activity-evidence.sql`
- `Docs/AI_PLATFORM_CONTEXT.md`
- `VERSION.md`

### Version bump
- السابق: v2.8.0 → الجديد: v2.8.1 (Patch — رفع الشواهد عبر Hostinger)

---

## Version: v2.8.0
**Date:** 2026-08-20

### Changes
- إصلاح تمييز القائمة: منح فردي / جماعي لا يُظللان معاً؛ الوضع يتبع `?bulk=1` في الرابط
- نشاط يدوي للمعلم: اسم + نقاط + شواهد اختيارية (صور/PDF)
- هجرة `116_manual_activity_evidence.sql` + عرض الشواهد في شاشة الاعتماد

### Files Modified
- `src/layouts/AppLayout.tsx`
- `src/lib/navActive.ts` (new)
- `src/lib/pointsEvidence.ts` (new)
- `src/pages/points/GrantPointsPage.tsx`
- `src/pages/points/ApprovePointsPage.tsx`
- `src/types/database.types.ts`
- `supabase/migrations/116_manual_activity_evidence.sql` (new)
- `supabase/fix-manual-activity-evidence.sql` (new)
- `VERSION.md`

### Version bump
- السابق: v2.7.5 → الجديد: v2.8.0 (Minor — نشاط يدوي + شواهد)

---

## Version: v2.7.5
**Date:** 2026-08-20

### Changes
- إصلاح مطابقة الصف: «الاول متوسط» ≡ «أول متوسط» (كان `\b` في JS لا يعمل مع العربية)
- توحيد «المتوسط/الثانوي» مع/بدون الـ في الواجهة وSQL

### Files Modified
- `src/lib/academic/gradeBridge.ts`
- `supabase/migrations/115_fix_norm_grade_label.sql` (new)
- `supabase/fix-grade-normalize.sql` (new)
- `supabase/migrations/114_teacher_classes_sync_and_match.sql`
- `supabase/fix-teacher-classes-sync.sql`
- `VERSION.md`

### Version bump
- السابق: v2.7.4 → الجديد: v2.7.5 (Patch — مطابقة أسماء الصفوف)

---

## Version: v2.7.4
**Date:** 2026-08-20

### Changes
- إصلاح «لم يُسند فصل» للمعلم: مزامنة تلقائية من الإعداد الأكاديمي + زر «مزامنة فصولي»
- هجرة `114_teacher_classes_sync_and_match.sql`: إنشاء ملف معلم إن فُقد + مطابقة مرنة للصف/الفصل في RLS

### Files Modified
- `supabase/migrations/114_teacher_classes_sync_and_match.sql` (new)
- `supabase/fix-teacher-classes-sync.sql` (new)
- `src/lib/teacherScope.ts`
- `src/lib/academic/olympiadSyncService.ts`
- `src/pages/points/GrantPointsPage.tsx`
- `src/pages/teacher/StudentsPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.7.3 → الجديد: v2.7.4 (Patch — فصول المعلم)

---

## Version: v2.7.3
**Date:** 2026-08-20

### Changes
- منح جماعي للمعلم: وضع الفصل يمنح كل طلاب الفصل دون عرض قائمة الاختيار اليدوي

### Files Modified
- `src/pages/points/GrantPointsPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.7.2 → الجديد: v2.7.3 (Patch — UX منح جماعي للمعلم)

---

## Version: v2.7.2
**Date:** 2026-08-20

### Changes
- إعادة ضبط لوحات المدير/الرائد لهوية المنصة: خلفية navy داكنة، بطاقات Horizon زجاجية، ذهبي/بنفسجي المنصة، خط Cairo
- إزالة المظهر الفاتح والكرات الزخرفية الشاذة

### Files Modified
- `src/components/dashboard/glass/*`
- `VERSION.md`
- `Docs/AI_PLATFORM_CONTEXT.md`

### Version bump
- السابق: v2.7.1 → الجديد: v2.7.2 (Patch — توافق الهوية البصرية)

---

## Version: v2.7.1
**Date:** 2026-08-20

### Changes
- مطابقة أقرب للصورة المرجعية: زجاج فاتح (خلفية بنفسجية ضبابية، بطاقات بيضاء شفافة، نص داكن)
- كرات زخرفية متحركة · قائمة مهام فاتحة · شبكة إجراءات سريعة 2×3 · مخططات بألوان فاتحة

### Files Modified
- `src/components/dashboard/glass/*`
- `src/components/admin/AdminDashboard.tsx`
- `src/pages/principal/PrincipalDashboard.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.7.0 → الجديد: v2.7.1 (Patch — تصحيح المطابقة البصرية للمرجع)

---

## Version: v2.7.0
**Date:** 2026-08-20

### Changes
- إعادة تصميم لوحتي المدير (`PrincipalDashboard`) والرائد (`AdminDashboard`) بأسلوب زجاجي بنفسجي/نيلي كالمرجع
- طقم مشترك `src/components/dashboard/glass/` (Shell · KPI · Charts · Quick Actions)
- نسخة استرجاع: `Versions/2026-08-20_v2.6.16_BeforeGlassDashboards.zip`

### Files Modified
- `src/components/dashboard/glass/*` (new)
- `src/components/admin/AdminDashboard.tsx`
- `src/pages/principal/PrincipalDashboard.tsx`
- `Docs/AI_PLATFORM_CONTEXT.md`
- `VERSION.md`

### Version bump
- السابق: v2.6.16 → الجديد: v2.7.0 (Minor — إعادة تصميم لوحات المدير والرائد)

---

## Version: v2.6.16
**Date:** 2026-08-20

### Changes
- شريط جانبي أوضح على الجوال: إخفاء «ترتيب القائمة»، دعم فني كأيقونة مدمجة بدل زر عريض

### Files Modified
- `src/layouts/AppLayout.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.6.15 → الجديد: v2.6.16 (Patch — UX جوال للشريط الجانبي)

---

## Version: v2.6.15
**Date:** 2026-08-20

### Changes
- إصلاح `setup-whatsapp-phone` 400: إلغاء التحقق المسبق الخاطئ؛ الاعتماد على الإرسال الفعلي
- إنشاء صف `users` إن فُقد للحسابات المولَّدة؛ رسائل أوضح (NO_WHATSAPP / WA_OFFLINE)

### Files Modified
- `supabase/functions/setup-whatsapp-phone/index.ts`
- `src/lib/setupWhatsAppPhone.ts`
- `VERSION.md`

### Version bump
- السابق: v2.6.14 → الجديد: v2.6.15 (Patch — إصلاح رفض واتساب الخاطئ)

---

## Version: v2.6.14
**Date:** 2026-08-20

### Changes
- بعد تغيير كلمة المرور (أول دخول): شاشة إدخال رقم واتساب + رسالة ترحيب
- تنبيه إن الرقم لا يوجد عليه واتساب
- Edge `setup-whatsapp-phone` + مسار `/check-number` في خادم واتساب

### Files Modified
- `src/pages/SetupWhatsAppPage.tsx` (new)
- `src/pages/SetupWhatsAppPage.css` (new)
- `src/lib/setupWhatsAppPhone.ts` (new)
- `src/pages/ForcePasswordChangePage.tsx`
- `src/router/FirstLoginGate.tsx`
- `src/router/index.tsx`
- `src/layouts/AppLayout.tsx`
- `src/lib/teacherMode.ts`
- `src/router/AcademicSetupGate.tsx`
- `supabase/functions/setup-whatsapp-phone/index.ts` (new)
- `whatsapp-server.js`
- `wppconnect-master/whatsapp-server.js`
- `deploy/deploy-setup-whatsapp-phone.sh` (new)
- `VERSION.md`

### Version bump
- السابق: v2.6.13 → الجديد: v2.6.14 (Minor-ish Patch — ميزة واتساب أول دخول)

---

## Version: v2.6.13
**Date:** 2026-08-20

### Changes
- إعادة تصميم شاشة تغيير كلمة المرور لأول دخول: ترحيب، مقياس قوة، تحقق تطابق، هوية المنصة

### Files Modified
- `src/pages/ForcePasswordChangePage.tsx`
- `src/pages/ForcePasswordChangePage.css` (new)
- `VERSION.md`

### Version bump
- السابق: v2.6.12 → الجديد: v2.6.13 (Patch — تصميم أول دخول)

---

## Version: v2.6.12
**Date:** 2026-08-20

### Changes
- حسابات الطلاب/أولياء المولَّدة إدارياً لا تمر بشاشة اختيار الدور القديمة (`onboarding_completed`)
- Migration `113` + إصلاح سريع SQL + تحديث create-user / bulk-create

### Files Modified
- `supabase/migrations/113_bulk_accounts_skip_family_onboarding.sql` (new)
- `supabase/fix-bulk-onboarding-skip.sql` (new)
- `supabase/functions/create-user/index.ts`
- `supabase/functions/bulk-create-class-accounts/index.ts`
- `src/lib/auth.ts`
- `src/pages/OnboardingPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.6.11 → الجديد: v2.6.12 (Patch — إصلاح onboarding بعد التوليد)

---

## Version: v2.6.11
**Date:** 2026-08-20

### Changes
- إصلاح كسر التطوير: إلغاء Service Worker/الكاش على localhost + عدم تسجيل PWA SW إلا في الإنتاج (يحل Invalid hook call و WebSocket 400)

### Files Modified
- `src/main.tsx`
- `src/lib/devServiceWorkerCleanup.ts` (new)
- `src/components/pwa/PwaManager.tsx`
- `index.html`
- `VERSION.md`

### Version bump
- السابق: v2.6.10 → الجديد: v2.6.11 (Patch — إصلاح SW في التطوير)

---

## Version: v2.6.10
**Date:** 2026-08-20

### Changes
- تعتيم ألوان `manual-qa.html` (خلفية داكنة + كروت كحلي/ذهبي بدل الواجهة الفاتحة)

### Files Modified
- `public/manual-qa.html`
- `VERSION.md`

### Version bump
- السابق: v2.6.9 → الجديد: v2.6.10 (Patch — ألوان QA)

---

## Version: v2.6.9
**Date:** 2026-08-20

### Changes
- إعادة تصميم كاملة لـ `manual-qa.html`: واجهة فاتحة نظيفة، بطاقة واحدة، زرّان (نجح/فشل)

### Files Modified
- `public/manual-qa.html`
- `VERSION.md`

### Version bump
- السابق: v2.6.8 → الجديد: v2.6.9 (Patch — إعادة تصميم QA)

---

## Version: v2.6.8
**Date:** 2026-08-20

### Changes
- تحسين تصميم شاشة البند في `manual-qa.html`: تخطيط أزرار متوازن، بطاقة منقسمة، رابط فتح المسار، أجهزة كأزرار

### Files Modified
- `public/manual-qa.html`
- `VERSION.md`

### Version bump
- السابق: v2.6.7 → الجديد: v2.6.8 (Patch — تصميم QA)

---

## Version: v2.6.7
**Date:** 2026-08-20

### Changes
- إعادة تصميم `manual-qa.html`: شاشة رئيسية حماسية، جلسة واحدة، بند واحد بزرّين كبيرين، تقدم دائري

### Files Modified
- `public/manual-qa.html`
- `VERSION.md`

### Version bump
- السابق: v2.6.6 → الجديد: v2.6.7 (Patch — UX دليل الاختبار)

---

## Version: v2.6.6
**Date:** 2026-08-20

### Changes
- صفحة HTML تفاعلية للاختبار اليدوي: جلسات A–L، نجح/فشل/لم أستطع، سجل مشاكل، حفظ تلقائي، تصدير/استيراد JSON

### Files Modified
- `public/manual-qa.html` (new)
- `Docs/MANUAL_QA_FULL_CHECKLIST.md`
- `Docs/AI_PLATFORM_CONTEXT.md`
- `VERSION.md`

### Version bump
- السابق: v2.6.5 → الجديد: v2.6.6 (Patch — أداة QA تفاعلية)

---

## Version: v2.6.5
**Date:** 2026-08-20

### Changes
- دليل اختبار يدوي شامل: `Docs/MANUAL_QA_FULL_CHECKLIST.md` (جلسات A–L، سجل مشاكل، ملخص إطلاق)

### Files Modified
- `Docs/MANUAL_QA_FULL_CHECKLIST.md` (new)
- `Docs/AI_PLATFORM_CONTEXT.md`
- `VERSION.md`

### Version bump
- السابق: v2.6.4 → الجديد: v2.6.5 (Patch — توثيق QA)

---

## Version: v2.6.4
**Date:** 2026-08-20

### Changes
- إعادة تصميم تسجيل المعلم: شاشات منفصلة (كود · اختيار طريقة · بيانات · OTP) مع أنيميشن
- OTP احترافي (6 خانات) والتحقق التلقائي عند اكتمال الرمز بدون زر «تحقق»

### Files Modified
- `src/pages/TeacherRegisterPage.tsx`
- `src/pages/TeacherRegisterPage.css` (new)
- `VERSION.md`

### Version bump
- السابق: v2.6.3 → الجديد: v2.6.4 (Patch — UX تسجيل معلم)

---

## Version: v2.6.3
**Date:** 2026-08-20

### Changes
- إصلاح استدعاء OTP: `fetch` مباشر بدل `functions.invoke` + رسالة أوضح إن لم تُنشر الدالة
- `verify_jwt = false` لدالة `auth-phone-otp` (دخول عام قبل الجلسة)

### Files Modified
- `src/lib/authPhoneOtp.ts`
- `src/lib/errors.ts`
- `supabase/config.toml`
- `VERSION.md`

### Deploy (إلزامي لعمل OTP)
```bash
supabase functions deploy auth-phone-otp
supabase functions deploy register-user
```
وطبّق الهجرات 111 و 112 إن لم تُطبَّقا.

### Version bump
- السابق: v2.6.2 → الجديد: v2.6.3 (Patch)

---

## Version: v2.6.2
**Date:** 2026-08-20

### Changes
- إخفاء/إغلاق إنشاء حساب طالب وولي أمر من الواجهة (`/register` → تحويل لـ `/login`؛ Edge `register-user` يرفض)
- تسجيل معلم اختياري: Google **أو** رقم جوال + OTP واتساب بعد كود التفعيل
- هجرة `112_teacher_phone_signup_otp.sql` (purpose `teacher_signup` + `user_id` اختياري)

### Files Modified / Added
- `src/pages/LoginPage.tsx`
- `src/pages/RegisterPage.tsx`
- `src/pages/TeacherRegisterPage.tsx`
- `src/lib/authPhoneOtp.ts`
- `supabase/functions/auth-phone-otp/index.ts`
- `supabase/functions/register-user/index.ts`
- `supabase/migrations/112_teacher_phone_signup_otp.sql`
- `Docs/AI_PLATFORM_CONTEXT.md`
- `VERSION.md`

### Deploy notes
1. طبّق `111` ثم `112` إن لم تُطبَّقا
2. أعد نشر `auth-phone-otp` و`register-user`
3. `npm run build` وارفع `dist`

### Version bump
- السابق: v2.6.1 → الجديد: v2.6.2 (Patch)

---

## Version: v2.6.1
**Date:** 2026-08-20

### Changes
- إخفاء رابط دخول الطاقم من شاشة العائلة `/login` حتى لا يظهر للمستخدم العادي خيار الاختيار

### Files Modified
- `src/pages/LoginPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.6.0 → الجديد: v2.6.1 (Patch)

---

## Version: v2.6.0
**Date:** 2026-08-20

### Changes
- شاشتا دخول منفصلتان: عائلة `/login` · طاقم `/login/staff`
- دخول المعلم برقم الجوال + OTP عبر واتساب (Edge `auth-phone-otp`)
- نسيان كلمة المرور للطاقم: جوال → OTP واتساب → كلمة مرور جديدة
- هجرة `111_auth_phone_otp.sql` لتخزين رموز OTP (service_role فقط)

### Files Modified / Added
- `src/pages/LoginPage.tsx` — عائلة فقط
- `src/pages/StaffLoginPage.tsx` (new)
- `src/lib/authPhoneOtp.ts` (new)
- `src/pages/LoginPage.css`
- `src/router/index.tsx`
- `src/pages/TeacherRegisterPage.tsx`
- `supabase/migrations/111_auth_phone_otp.sql`
- `supabase/functions/auth-phone-otp/index.ts`
- `Docs/AI_PLATFORM_CONTEXT.md`
- `VERSION.md`

### Deploy notes
1. طبّق `supabase/migrations/111_auth_phone_otp.sql` على Supabase
2. انشر Edge Function: `auth-phone-otp`
3. تأكد أن خادم واتساب متصل و`users.phone` معبّأ للمعلمين
4. `npm run build` ثم ارفع `dist`

### Version bump
- السابق: v2.5.4 → الجديد: v2.6.0 (Minor — ميزة دخول)

### Restore ZIP
`Versions/2026-08-20_v2.5.4_BeforeDualLoginOtp.zip`

---

## Version: v2.5.4
**Date:** 2026-08-20

### Changes
- توسيع **`Docs/AI_PLATFORM_CONTEXT.md`** ليكون الملف الشامل الوحيد للذكاء الاصطناعي (أدوار، مسارات، صلاحيات، lib، migrations، مشاكل معروفة)
- قاعدة Cursor: `.cursor/rules/ai-platform-context-maintenance.mdc` — تحديث الملف مع كل تعديل
- ربط `knowledge-base/AI_AGENT_CONTEXT.md` بالملف الشامل للمطورين

### Files Modified
- `Docs/AI_PLATFORM_CONTEXT.md`
- `.cursor/rules/ai-platform-context-maintenance.mdc`
- `knowledge-base/AI_AGENT_CONTEXT.md`
- `VERSION.md`

### Version bump
- السابق: v2.5.3 → الجديد: v2.5.4 (Patch — توثيق AI شامل)

---

## Version: v2.5.3
**Date:** 2026-08-05

### Changes
- إصلاح تعارض Vite alias `@` مع `@microsoft/clarity` (scoped packages)

### Files Modified
- `vite.config.ts`
- `VERSION.md`

### Version bump
- السابق: v2.5.2 → الجديد: v2.5.3 (Patch)

---

## Version: v2.5.2
**Date:** 2026-08-05

### Changes
- إضافة تتبع Microsoft Clarity عبر `@microsoft/clarity` (Project ID: `xxrcpnz5j0`) في `src/main.tsx`

### Files Modified
- `src/main.tsx`
- `package.json`
- `VERSION.md`
- `Docs/AI_PLATFORM_CONTEXT.md`

### Version bump
- السابق: v2.5.1 → الجديد: v2.5.2 (Patch — Clarity analytics)

---

## Version: v2.5.1
**Date:** 2026-08-02

### Changes
- نظام `npm run build-docs`: تحويل `knowledge-base/` إلى HTML + PDF + ملف موحّد + ZIP
- غلاف احترافي، جدول محتويات، أرقام صفحات، شعار (logo.png / icon.jpeg)
- مخرجات: `dist/html` · `dist/pdf` · `Olympiad-Knowledge-Base.zip`

### Files Modified
- `build/build-docs.mjs`, `build/docs.css`, `build/README.md`
- `package.json`, `.gitignore`
- `VERSION.md`

### Version bump
- السابق: v2.5.0 → الجديد: v2.5.1 (Patch — بناء وثائق المعرفة)

### Deploy notes
1. `npm install`
2. `npm run build-docs`
3. ارفع `Olympiad-Knowledge-Base.zip` أو `dist/pdf/KnowledgeBase.pdf`

---

## Version: v2.5.0
**Date:** 2026-08-02

### Changes
- إضافة قاعدة معرفة كاملة `knowledge-base/` (12 ملف Markdown عربي) جاهزة لـ Meta Business AI / RAG
- يشمل: أدلة مستخدم/طالب/معلم، FAQ (+130)، دعم فني، مميزات، اشتراكات، شروط، خصوصية، تواصل، وتعليمات وكيل AI

### Files Modified
- `knowledge-base/*` (جديد)
- `VERSION.md`, `Docs/AI_PLATFORM_CONTEXT.md`

### Version bump
- السابق: v2.4.6 → الجديد: v2.5.0 (Minor — قاعدة معرفة للمنصة)

### Deploy notes
1. حدّث placeholders في الملفات (`{{SCHOOL_NAME}}`, `{{PLATFORM_URL}}`, `{{SUPPORT_*}}`)
2. ارفع المجلد إلى نظام الـ AI / RAG مع إعطاء أولوية لـ `AI_AGENT_CONTEXT.md`
3. لا يتطلب ترحيل DB لتشغيل الواجهة

---

## Version: v2.4.8
**Date:** 2026-08-02

### Changes
- إضافة ثلاثة ملفات عربية شاملة لقاعدة المعرفة: الأسئلة الشائعة (130 سؤالاً)، دليل تشخيص الدعم (26 مشكلة)، وشرح مميزات المنصة

### Files Modified
- `knowledge-base/FAQ.md`
- `knowledge-base/SUPPORT.md`
- `knowledge-base/PLATFORM_FEATURES.md`
- `VERSION.md`

### Version bump
- السابق: v2.4.7 → الجديد: v2.4.8 (Patch — وثائق FAQ/SUPPORT/FEATURES)

---

## Version: v2.4.7
**Date:** 2026-08-02

### Changes
- إضافة ثلاثة أدلة عربية شاملة لقاعدة المعرفة: دليل المستخدم، دليل الطالب، دليل المعلم

### Files Modified
- `knowledge-base/USER_GUIDE.md`
- `knowledge-base/STUDENT_GUIDE.md`
- `knowledge-base/TEACHER_GUIDE.md`
- `VERSION.md`

### Version bump
- السابق: v2.4.6 → الجديد: v2.4.7 (Patch — وثائق قاعدة المعرفة)

### Deploy notes
1. لا يتطلب ترحيل قاعدة بيانات أو بناء واجهة
2. حدّث placeholders في الأدلة (`{{PLATFORM_URL}}`, `{{SUPPORT_*}}`, `{{SCHOOL_NAME}}`) قبل النشر الرسمي إن لزم

---

## Version: v2.4.6
**Date:** 2026-08-02

### Changes
- إصلاح اقتراحات الأنشطة: `students!student_id` لتفادي غموض العلاقة مع جدول التصويت
- إصلاح `portal_list_weekly_plans`: إزالة ترتيب `wp.subject` (العمود غير موجود)

### Files Modified
- `src/components/student/ActivitySuggestionsPanel.tsx`
- `src/lib/activitySuggestions.ts`
- `supabase/migrations/110_fix_student_portal_queries.sql`
- `VERSION.md`

### Version bump
- السابق: v2.4.5 → الجديد: v2.4.6 (Patch — أخطاء بوابة الطالب)

### Deploy notes
1. نفّذ `110_fix_student_portal_queries.sql` في Supabase SQL Editor
2. `npm run build` ونشر `dist`

---

## Version: v2.4.5
**Date:** 2026-08-02

### Changes
- إزالة بطاقة مطور المنصة من الشريط الجانبي (كانت تأخذ مساحة كبيرة)
- زر **خروج** ثابت في ترويسة كل الشاشات (مدرسي + /dev)
- تسجيل الخروج من قائمة «المزيد» على الجوال
- قائمة مطور المنصة: مجموعات قابلة للطي + شريط أضيق

### Files Modified
- `src/layouts/AppLayout.tsx`, `src/layouts/DevLayout.tsx`
- `src/components/ui/MobileRoleDock.tsx`, `src/components/ui/NavSection.tsx`
- `src/pages/SupportPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.4.4 → الجديد: v2.4.5 (Patch — خروج + تقليص بطاقة المطور)

---

## Version: v2.4.4
**Date:** 2026-08-02

### Changes
- جودة تنبيهات الأخطاء: لا `[object Object]` · رسالة + اسم خطأ + Stack مختصر
- أخطاء API: Endpoint · Method · Parameters · Status · Response Body
- Request ID + Correlation ID لكل عملية/جلسة
- دمج التكرارات في Incident واحد مع عدّاد · تنبيه عند الجديد أو عتبات (5/10/25…)
- Possible Cause تلقائي + Severity: Critical / High / Medium / Low
- رابط مباشر `/dev/errors?id=…` داخل إشعار واتساب

### Files Modified
- `src/lib/errorDiagnostics.ts` (جديد)
- `src/lib/platformErrors.ts`, `src/lib/toast.ts`, `src/App.tsx`
- `src/pages/dev/DevErrorsPage.tsx`, `src/components/dev/PlatformErrorBoundary.tsx`
- `supabase/migrations/109_error_alert_quality.sql`
- `supabase/functions/dev-error-whatsapp/index.ts`, `supabase/functions/jobs-worker/index.ts`
- `VERSION.md`, `Docs/AI_PLATFORM_CONTEXT.md`

### Version bump
- السابق: v2.4.3 → الجديد: v2.4.4 (Patch — جودة تنبيهات الأخطاء)

### Deploy notes
1. طبّق `supabase/migrations/109_error_alert_quality.sql` على Supabase
2. انشر Edge: `dev-error-whatsapp` (واختياري `jobs-worker`)
3. `npm run build` ونشر `dist`
4. اختياري: في `platform_dev_alerts` أضف `"dashboard_base_url":"https://your-domain.com"` لروابط صحيحة في واتساب

---

## Version: v2.4.3
**Date:** 2026-08-02

### Changes
- جوال المساعد الذكي: تبويب مضغوط (3 + المزيد) · ترويسة أخف · مساحة أسفل للشريط
- الجدول الدراسي: تحرير **يوم بيوم** على الجوال + تقييد بفصول المعلم
- إدارة الطلاب: شرائح صف/فصل · بطاقات أوضح مع ملف/منح

### Files Modified
- `src/components/ai/AiStudioShell.tsx`, `src/pages/teacher/TeacherAiAssistantPage.tsx`
- `src/pages/academic/AcademicSchedulePage.tsx`
- `src/pages/teacher/StudentsPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.4.2 → الجديد: v2.4.3 (Patch — جوال المعلم)

---

## Version: v2.4.2
**Date:** 2026-08-02

### Changes
- منح النقاط للمعلم: قائمة الصفوف/الفصول من **تعييناته فقط** (لا كتالوج المدرسة كاملاً)
- مطابقة مرنة لأسماء الصفوف (أول متوسط ≈ الأول المتوسط) حتى يظهر الطلاب
- صفحة الطلاب: تقييد بفصول المعلم + بطاقات جوال بدل جدول مقطوع
- الجدول الدراسي: صفوف/فصول من التعيينات عند وجودها

### Files Modified
- `src/lib/academic/gradeBridge.ts`, `src/lib/teacherScope.ts`
- `src/pages/points/GrantPointsPage.tsx`
- `src/pages/teacher/StudentsPage.tsx`
- `src/pages/academic/AcademicSchedulePage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.4.1 → الجديد: v2.4.2 (Patch)

### Deploy notes
1. `npm run build` ونشر `dist`
2. إن بقي قائمة طلاب فارغة بعد اختيار فصل مسند: راجع تطابق `teacher_classes` مع `students.grade/class_name` في قاعدة البيانات

---

## Version: v2.4.1
**Date:** 2026-08-02

### Changes
- إعادة كتابة `Docs/PRE_LAUNCH_ROLE_REVIEW.md`: خريطة المنصة، شرح واضح لكل دور (من هو / يوم نموذجي / كل الميزات والمسارات) ثم قوائم تحقق الإطلاق

### Files Modified
- `Docs/PRE_LAUNCH_ROLE_REVIEW.md`
- `Docs/AI_PLATFORM_CONTEXT.md`
- `VERSION.md`

### Version bump
- السابق: v2.4.0 → الجديد: v2.4.1 (Patch — توثيق)

---

## Version: v2.4.0
**Date:** 2026-08-02

### Changes
- شريط سفلي للجوال: اختصارات أغنى + زر **المزيد** (ورقة بكل الصفحات المفلترة)
- الشريط يتبع وضع أولمبياد/أكاديمي للمعلم ومدير المدرسة
- مراقبة أخطاء موسّعة: توست · React Query · HTTP 4xx · 404 ناعم → `/dev/errors` فلتر **جودة / خفيفة** (واتساب يبقى ≥ error)
- صقل جوال المعلم: أدوات AI مطوية · أهداف لمس · تلميح سحب للخطة الأسبوعية
- وثيقة مراجعة إطلاق حسب الدور: `Docs/PRE_LAUNCH_ROLE_REVIEW.md`
- كتالوج QA يشمل الوكيل والمراجع والدعم وسيناريوهات academic-week / support-ticket

### Files Modified
- `src/lib/mobileDock.ts` (جديد), `src/components/ui/MobileRoleDock.tsx`
- `src/lib/platformErrors.ts`, `src/lib/toast.ts`, `src/App.tsx`
- `src/pages/dev/DevErrorsPage.tsx`, `src/pages/RouteErrorPage.tsx`
- `src/components/ai/AiStudioShell.tsx`, `src/pages/teacher/TeacherAiAssistantPage.tsx`
- `src/pages/teacher/TeacherLessonPlanPage.tsx`, `src/components/academic/WeeklyPlanWeekGrid.tsx`
- `src/lib/qa/catalog.ts`, `Docs/PRE_LAUNCH_ROLE_REVIEW.md`, `Docs/AI_PLATFORM_CONTEXT.md`
- `VERSION.md`

### Version bump
- السابق: v2.3.3 → الجديد: v2.4.0 (Minor — جوال + مراقبة جودة + وثيقة إطلاق)

### Rollback
- `Versions/2026-08-02_v2.3.3_BeforeMobileQAErrors.zip`

### Deploy notes
1. `npm run build` ثم نشر `dist` على Hostinger
2. لا هجرات إلزامية لهذه النسخة (يعتمد على `platform_errors` الموجود)
3. راجع `Docs/PRE_LAUNCH_ROLE_REVIEW.md` قبل الإطلاق للمدرسة

---

## Version: v2.3.3
**Date:** 2026-08-02

### Changes
- إصلاح 403 لولي الأمر: زر المهمة التالية كان يوجّه لمسارات الطالب (`/student/academic`) → `/unauthorized`
- روابط المهمة التالية أصبحت حسب الجمهور (ولي أمر → `/parent/academic…` ونتائج الاختبارات)
- شريط الجوال: «اختبارات» ولي الأمر → `/exams/results` بدل مسار غير موجود

### Files Modified
- `src/lib/wave3Ops.ts`
- `src/components/student/StudentNextTaskCard.tsx`
- `src/components/parent/ParentDashboard.tsx`
- `src/components/ui/MobileRoleDock.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.3.2 → الجديد: v2.3.3 (Patch)

### Deploy notes
1. `npm run build` ثم نشر `dist` على Hostinger

---

## Version: v2.3.2
**Date:** 2026-08-02

### Changes
- إصلاح: صفحة `/support` (الدعم الفني) كانت تُعاد توجيهها فوراً للوحة الرئيسية للمعلم/المدير بسبب فلتر وضعي أولمبياد/أكاديمي
- المسار أصبح محايداً ومتاحاً في كلا الوضعين (قائمة + زر الشريط الجانبي)

### Files Modified
- `src/lib/teacherMode.ts`
- `src/layouts/AppLayout.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.3.1 → الجديد: v2.3.2 (Patch — إصلاح تنقل)

### Deploy notes
1. أعد بناء الواجهة (`npm run build`) وانشر `dist` على Hostinger
2. لا هجرات جديدة — تنبيه واتساب للأخطاء لا يُطلق عند إعادة توجيه صامتة (سلوك متوقع)

---

## Version: v2.3.1
**Date:** 2026-08-02

### Changes
- صندوق **الشكاوى والطلبات** للمطور على `/dev/support` (إحصاءات · بحث · Realtime · تصنيف)
- نوع البلاغ: شكوى / طلب / استفسار (هجرة 108)

### Files Modified
- `supabase/migrations/108_support_ticket_kind.sql`
- `src/pages/dev/DevSupportPage.tsx`, `DeveloperDashboard.tsx`
- `src/pages/SupportPage.tsx`
- `src/lib/platformSupport.ts`, `devNav.ts`
- `VERSION.md`

### Version bump
- السابق: v2.3.0 → الجديد: v2.3.1 (Patch)

### Deploy notes
1. طبّق `107` ثم `108`
2. افتح `/dev/support` كـ platform_developer

---

## Version: v2.3.0
**Date:** 2026-08-01

### Changes
- **خدمة الدعم الفني** داخل المنصة (`/support`) مع إشعار واتساب فوري للمطور
- بطاقة احترافية: مطور المنصة **مصطفى أحمد** · الجوال **0543641209**
- لوحة مطور: `/dev/support` لإدارة التذاكر
- هجرة `107_tech_support_and_developer_profile.sql`

### Files Modified
- `supabase/migrations/107_tech_support_and_developer_profile.sql`
- `src/lib/platformDeveloper.ts`, `platformSupport.ts`
- `src/components/support/PlatformDeveloperCard.tsx`
- `src/pages/SupportPage.tsx`, `src/pages/dev/DevSupportPage.tsx`
- `src/types/index.ts`, `src/lib/navGroups.ts`, `src/lib/devNav.ts`
- `src/layouts/AppLayout.tsx`, `DevLayout.tsx`, `src/router/index.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.2.3 → الجديد: v2.3.0 (Minor — Tech Support)

### Rollback ZIP
- `Versions/2026-08-01_v2.2.3_BeforeTechSupport.zip`

### Deploy notes
1. طبّق `107_tech_support_and_developer_profile.sql`
2. تأكد من نشر `dev-error-whatsapp` و`jobs-worker`
3. جرّب `/support` كمستخدم مدرسي ثم راجع واتساب `0543641209`

---

## Version: v2.2.3
**Date:** 2026-08-01

### Changes
- زر **محاكاة حقيقية** في `/dev/errors` (معلم / ولي أمر / API 500) مع اسم وجوال ومشكلة
- RPC `dev_simulate_user_error` (هجرة 106)

### Files Modified
- `supabase/migrations/106_dev_simulate_user_error.sql`
- `src/lib/devAlertSettings.ts`
- `src/pages/dev/DevErrorsPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.2.2 → الجديد: v2.2.3 (Patch)

### Deploy notes
1. طبّق `106_dev_simulate_user_error.sql` (بعد 104–105)
2. `/dev/errors` → احفظ رقمك → «تشغيل المحاكاة»

---

## Version: v2.2.2
**Date:** 2026-08-01

### Changes
- متابعة لحظية أقوى للأخطاء قبل بلاغ المستخدم (fetch 5xx، ErrorBoundary، إشعارات سطح المكتب في `/dev`)
- رسالة واتساب تتضمن **جوال المستخدم** + اسمه والمشكلة
- عمود `user_phone` على `platform_errors` (هجرة 105)

### Files Modified
- `supabase/migrations/105_error_alerts_user_phone_realtime.sql`
- `supabase/functions/dev-error-whatsapp/index.ts`
- `src/lib/platformErrors.ts`, `devAlertSettings.ts`
- `src/components/dev/PlatformErrorBoundary.tsx`, `DevCriticalErrorBanner.tsx`
- `src/pages/dev/DevErrorsPage.tsx`, `src/App.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.2.1 → الجديد: v2.2.2 (Patch)

### Deploy notes
1. طبّق `104` ثم `105`
2. `supabase functions deploy dev-error-whatsapp`
3. احفظ رقمك في `/dev/errors` واسمح بإشعارات المتصفح

---

## Version: v2.2.1
**Date:** 2026-08-01

### Changes
- تنبيه واتساب تلقائي لمطور المنصة عند أخطاء المستخدمين (الاسم + المشكلة)
- رقم الجوال من إعدادات المنصة (`platform_dev_alerts`) — مستقل عن حساب المطور
- Edge `dev-error-whatsapp` + مهمة `dev_whatsapp_alert` + واجهة حفظ الرقم في `/dev/errors`

### Files Modified
- `supabase/migrations/104_dev_whatsapp_error_alerts.sql`
- `supabase/functions/dev-error-whatsapp/index.ts`
- `supabase/functions/jobs-worker/index.ts`
- `src/lib/devAlertSettings.ts`, `platformErrors.ts`, `platformJobs.ts`
- `src/pages/dev/DevErrorsPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.2.0 → الجديد: v2.2.1 (Patch — تنبيهات مطور واتساب)

### Deploy notes
1. طبّق `104_dev_whatsapp_error_alerts.sql`
2. `supabase functions deploy dev-error-whatsapp`
3. `supabase functions deploy jobs-worker`
4. افتح `/dev/errors` واحفظ رقم واتسابك ثم جرّب «اختبار حرج»

---

## Version: v2.2.0
**Date:** 2026-08-01

### Changes
- **موجة 5 — إغلاق المؤجّلات:**
  - محرك جداول موحّد `platform_schedules` + `tick_platform_schedules` + واجهة `/dev/schedules`
  - محرّر قوالب رسائل CRUD (`academic_message_templates`) على `/academic/templates/editor` + حذف قوالب AI
  - واتساب حي افتراضي من `jobs-worker` (dry_run اختياري) مع احترام `whatsapp_send_enabled`
  - العامل يستدعي tick الجداول تلقائياً قبل claim

### Files Modified
- `supabase/migrations/103_wave5_cron_templates_whatsapp.sql`
- `supabase/functions/jobs-worker/index.ts`
- `src/lib/platformSchedules.ts`, `platformJobs.ts`, `academicMessageTemplates.ts`
- `src/lib/ai/aiAssistantService.ts`
- `src/pages/dev/DevSchedulesPage.tsx`, `DevJobsPage.tsx`
- `src/pages/academic/AcademicTemplatesEditorPage.tsx`, `AcademicTemplatesHubPage.tsx`
- `src/pages/principal/academic/PrincipalAiSettingsPage.tsx`
- `src/router/index.tsx`
- `Docs/SCHOOL_PLATFORM_ROADMAP.md`
- `VERSION.md`

### Version bump
- السابق: v2.1.1 → الجديد: v2.2.0 (Minor — Wave 5)

### Rollback ZIP
- `Versions/2026-08-01_v2.1.1_BeforeWave5Remaining.zip`

### Deploy notes
1. طبّق `103_wave5_cron_templates_whatsapp.sql`
2. `supabase functions deploy jobs-worker`
3. `/dev/schedules` → Tick الآن · فعّل جداول واتساب بحذر
4. `/academic/templates/editor` لمحرّر القوالب

---

## Version: v2.1.1
**Date:** 2026-08-01

### Changes
- إصلاح استدعاء `create-user`: CORS أوسع + استدعاء `fetch` مباشر بدلاً من الاعتماد فقط على `functions.invoke`
- رسائل خطأ أوضح من الدالة (توكن/صلاحية/إعدادات الخادم)

### Files Modified
- `supabase/functions/create-user/index.ts`
- `src/lib/auth.ts`
- `VERSION.md`

### Version bump
- السابق: v2.1.0 → الجديد: v2.1.1 (Patch — إصلاح إنشاء المستخدم)

### Deploy notes
- تم نشر Edge: `create-user` على المشروع `gjgezdbbnezsvsmygpcd`
- حدّث الواجهة (reload/build) ثم أعد تسجيل الدخول وجرّب إنشاء مستخدم

---

## Version: v2.1.0
**Date:** 2026-08-01

### Changes
- تحديث Roadmap: جدول **أساس مكتمل / عمق متبقي** + **موجة 4** موثّقة
- عمق موجة 4:
  - **G+** اختبار استرجاع معرفة نصي (`102` + `/dev/knowledge`)
  - **H+** ملخص AI للمدير على التنفيذي
  - **E+/W** تنبيه أخطاء حرجة في صحة التشغيل
  - **V+** VirtualizedList في Audit
  - **X+** تفضيل رقمي على صفحة التصدير الأكاديمي
  - تأكيد أقوى لحذف/إعادة فهرسة المعرفة

### Files Modified
- `Docs/SCHOOL_PLATFORM_ROADMAP.md`
- `supabase/migrations/102_wave4_knowledge_probe.sql`
- `src/lib/platformKnowledge.ts`
- `src/pages/dev/DevKnowledgePage.tsx`, `DevAuditPage.tsx`, `DevVersionPage.tsx`
- `src/components/principal/PrincipalAiUsageSummaryCard.tsx`, `SchoolOpsHealthCard.tsx`
- `src/pages/principal/PrincipalExecutivePage.tsx`
- `src/pages/academic/AcademicExportPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v2.0.1 → الجديد: v2.1.0 (Minor — Wave 4 operational depth)

### Rollback ZIP
- `Versions/2026-08-01_v2.0.1_BeforeWave4Depth.zip`

### Deploy notes
1. طبّق **101** (إن لم يُطبَّق) ثم **102**
2. افتح `/dev/knowledge` وجرّب «اختبار استرجاع»
3. راجع التنفيذي كمدير: ملخص AI + تنبيه حرج إن وُجد

---

## Version: v2.0.1
**Date:** 2026-08-01

### Changes
- إصلاح HTTP 400 على `dev_ai_generations_recent`: `credits_used` كان NUMERIC بينما العمود INT
- Migration `101_fix_dev_ai_generations_recent.sql` (+ تصحيح تعريف في 094 للتثبيتات الجديدة)

### Files Modified
- `supabase/migrations/101_fix_dev_ai_generations_recent.sql`
- `supabase/migrations/094_dev_ai_knowledge_usage.sql`
- `VERSION.md`

### Version bump
- السابق: v2.0.0 → الجديد: v2.0.1 (Patch — RPC type mismatch)

### Deploy notes
1. طبّق **101** فوراً ثم أعد تحميل `/dev/ai/usage`

---

## Version: v2.0.0
**Date:** 2026-08-01

### Changes
- إغلاق **UX Modernization Initiative v2.0** (Phases 9–11):
  - **Phase 9:** توسيع `MobileRoleDock` لمعظم الأدوار المدرسية + صقل بوابة الطالب (EmptyState)
  - **Phase 10:** EmptyState لمتتجر، أدلة شاشات (`/dev`, `/academic/templates`, `/parent/academic`)
  - **Phase 11:** `Docs/ROUTE_REDIRECT_AUDIT.md` + تجميد IA في `AI_PLATFORM_CONTEXT.md` + تحديث خطة UX
- تعميق تشغيلي مصاحب:
  - مراقبة Realtime حية (مسبار اشتراك)
  - Schedules: إدراج Jobs تجريبية (dry-run) من الواجهة

### Files Modified
- `src/components/ui/MobileRoleDock.tsx`
- `src/components/student/StudentDashboard.tsx`
- `src/pages/student/RewardsStorePage.tsx`
- `src/pages/dev/DevRealtimeMonitorPage.tsx`, `DevSchedulesPage.tsx`, `DevVersionPage.tsx`
- `src/lib/roleScreenGuides.ts`
- `Docs/ROUTE_REDIRECT_AUDIT.md`, `UX_MODERNIZATION_V2_PLAN.md`, `AI_PLATFORM_CONTEXT.md`
- `Docs/SCHOOL_PLATFORM_ROADMAP.md`, `VERSION.md`

### Version bump
- السابق: v1.42.0 → الجديد: **v2.0.0** (Major — إغلاق مبادرة UX v2)

### Rollback ZIP
- `Versions/2026-08-01_v1.42.0_BeforeUXPhases9-11.zip`

### Deploy notes
1. لا migration جديد في هذه الدفعة (099–100 من الإصدارات السابقة إن لم تُطبَّق)
2. اختبر الشريط السفلي على جوال لأدوار: طالب، ولي، معلم، مدير، مشرف
3. `/dev/monitor/realtime` و `/dev/schedules` للمطور

---

## Version: v1.42.0
**Date:** 2026-08-01

### Changes
- إكمال فجوات المراحل المتبقية بعد Wave 2/3 foundations:
  - **Debug Mode** طبقة عائمة (شبكة/سجلات/تنقل) للمطور فقط
  - **F** موافقة/رفض `needs_review` في Pipeline
  - **N** تعميق Jobs التذكير + استدعاء `weekly-parent-digest` عند live
  - **O** تفضيلات إشعارات ولي الأمر قابلة للحفظ
  - **W** ملخص صحة تشغيل أغنى + drill للمدير/المطور
  - **V** `VirtualizedList` على مركز الأخطاء
  - **X** مشاركة رقمية (نسخ بوابة ولي الأمر) في مركز القوالب
  - **U/R/S** صقل سياقي (خطر طلاب، طقس إغلاق، مهمة تالية)
  - Migration `100_remaining_phases_f_n_w_o.sql`

### Files Modified
- `supabase/migrations/100_remaining_phases_f_n_w_o.sql`
- `supabase/functions/jobs-worker/index.ts`
- `src/lib/devDebugMode.ts`, `wave3Ops.ts`, `platformKnowledge.ts`
- `src/components/dev/DevDebugOverlay.tsx`
- `src/components/ui/VirtualizedList.tsx`
- `src/layouts/AppLayout.tsx`, `DevLayout.tsx`, `authStore.ts`
- صفحات: Pipeline، Jobs، Errors، Debug، Version، Templates
- Parent prefs، SchoolOpsHealth، DayCloseWeather، SupervisorAnalytics
- `Docs/SCHOOL_PLATFORM_ROADMAP.md`, `VERSION.md`

### Version bump
- السابق: v1.41.0 → الجديد: v1.42.0 (Minor — remaining phases depth)

### Rollback ZIP
- `Versions/2026-08-01_v1.41.0_BeforeRemainingPhases.zip`

### Deploy notes
1. طبّق **099** ثم **100**
2. أعد نشر `jobs-worker`
3. جرّب `/dev/debug` ثم تصفّح أي صفحة كمطور — يجب ظهور الطبقة العائمة
4. جرّب موافقة مستند في `/dev/pipeline` وتفضيلات ولي الأمر

---

## Version: v1.41.0
**Date:** 2026-08-01

### Changes
- **Global Error Monitoring & Diagnostics (E2 / GEM)** لمطور المنصة:
  - Migration `099_global_error_monitoring.sql`: مصادر أوسع، fingerprint، occurrence، status workflow، analytics RPC، Realtime
  - توسيع `platformErrors.ts` (جلسة، جهاز، مسار، معدل، دمج تكرار)
  - لوحة `/dev/errors` كاملة: إحصائيات، تحليلات، بحث/فلترة، تفاصيل، New→Investigating→Fixed→Ignored
  - شريط تنبيه حرج لحظي في `DevLayout`
  - تسجيل أخطاء AI من العميل + فشل Jobs من `jobs-worker`
  - تحديث Roadmap (قسم د + مرحلة E2)

### Files Modified
- `supabase/migrations/099_global_error_monitoring.sql`
- `supabase/functions/jobs-worker/index.ts`
- `src/lib/platformErrors.ts`, `src/lib/ai/aiAssistantService.ts`, `src/lib/devNav.ts`
- `src/pages/dev/DevErrorsPage.tsx`, `DevVersionPage.tsx`, `DeveloperDashboard.tsx`
- `src/components/dev/DevCriticalErrorBanner.tsx`
- `src/layouts/DevLayout.tsx`
- `Docs/SCHOOL_PLATFORM_ROADMAP.md`, `VERSION.md`

### Version bump
- السابق: v1.40.0 → الجديد: v1.41.0 (Minor — GEM for Platform Developer)

### Rollback ZIP
- `Versions/2026-08-01_v1.40.0_BeforeGlobalErrorMonitoring.zip`

### Deploy notes
1. طبّق **099** (بعد 093 إن لم يُطبَّق)
2. أعد نشر `jobs-worker`
3. افتح `/dev/errors` كمطور منصة وجرّب «اختبار حرج»

---

## Version: v1.40.0
**Date:** 2026-08-01

### Changes
- موجة 3 — أسس **L–Y** فوق الموجود (بدون اختراع نطاقات):
  - **L** مركز قوالب `/academic/templates`
  - **M** مصادر RAG ظاهرة في مساعد المعلم + `knowledge_sources` من `ai-generate`
  - **N** أنواع Jobs: `whatsapp_reminder` / `academic_reminder` / `parent_digest` في `jobs-worker`
  - **O** بطاقة إشعارات ولي الأمر
  - **P** لوحة أوامر Ctrl/Cmd+K
  - **Q/R/W** صحة تشغيل + طقس إغلاق على التقرير التنفيذي
  - **S** مهمة الطالب التالية (طالب + ولي)
  - **T** شريط تنقل سفلي للجوال
  - **U** جسر تحليل→إجراء في مركز التحليلات
  - **X** تفضيل المشاركة الرقمية في مركز القوالب
  - Migration `098_wave3_school_ops_health.sql`

### Files Modified
- `supabase/migrations/098_wave3_school_ops_health.sql`
- `supabase/functions/jobs-worker/index.ts`, `ai-generate/index.ts`
- `src/lib/wave3Ops.ts`, `platformJobs.ts`, `platformDevTools.ts`, `ai/types.ts`
- `src/components/ui/CommandPalette.tsx`, `MobileRoleDock.tsx`
- `src/components/principal/SchoolOpsHealthCard.tsx`, `dashboard/DayCloseWeatherCard.tsx`
- `src/components/student/StudentNextTaskCard.tsx`, `parent/ParentNotificationPrefsCard.tsx`
- صفحات/لوحات: Executive، Student/Parent Dashboard، Analytics Hub، AI Assistant، AppLayout
- `AcademicTemplatesHubPage.tsx`, router, nav, `VERSION.md`

### Version bump
- السابق: v1.39.1 → الجديد: v1.40.0 (Minor — Wave 3 school-value foundations)

### Rollback ZIP
- `Versions/2026-08-01_v1.39.1_BeforeWave3LO.zip`

### Deploy notes
1. طبّق **098** (+ 097 إن لزم)
2. أعد نشر `jobs-worker` و`ai-generate`
3. جرّب Ctrl+K، `/academic/templates`، التقرير التنفيذي، مهمة الطالب التالية

---

## Version: v1.39.1
**Date:** 2026-08-01

### Changes
- إصلاح `SYSTEM_FLAGS_FORBIDDEN` عند تطبيق بذرة `platform_system_flags` في migration 096
- تجاوز حارس `school_settings` عبر `app.bypass_school_settings_guard` للبذرة ومسارات المطور
- Migration إضافي `097_fix_system_flags_guard.sql` إن فُتحت 096 جزئياً

### Files Modified
- `supabase/migrations/096_dev_tools_sandbox_db.sql`
- `supabase/migrations/097_fix_system_flags_guard.sql`
- `VERSION.md`

### Version bump
- السابق: v1.39.0 → الجديد: v1.39.1 (Patch — migration guard fix)

---

## Version: v1.39.0
**Date:** 2026-08-01

### Changes
- إكمال أساس أدوات `/dev` المتبقية (بعد C–K):
  - Migration `096_dev_tools_sandbox_db.sql`: DB Explorer RO، سجل Sandbox، أعلام نظام، صلاحية Feature Flags للمطور
  - صفحات حية: Sandbox، DB Explorer، Feature Flags، Schedules، Permissions، Logs، Cache، Backup
  - مراقبون: Performance، Realtime، Supabase، AI services
  - مكتبة `src/lib/platformDevTools.ts`
  - إزالة stubs — كل مسارات DEV_NAV الأساسية حية

### Files Modified
- `supabase/migrations/096_dev_tools_sandbox_db.sql`
- `src/lib/platformDevTools.ts`, `src/lib/featureVisibility.ts`
- `src/pages/dev/DevSandboxPage.tsx`, `DevDbExplorerPage.tsx`, `DevFeatureFlagsPage.tsx`, …
- `src/pages/dev/DevSchedulesPage.tsx`, `DevPermissionsPage.tsx`, `DevLogsPage.tsx`, `DevCachePage.tsx`, `DevBackupPage.tsx`
- `src/pages/dev/DevPerformancePage.tsx`, `DevRealtimeMonitorPage.tsx`, `DevSupabaseMonitorPage.tsx`, `DevAiServicesMonitorPage.tsx`
- `src/router/index.tsx`, `DeveloperDashboard.tsx`, `DevVersionPage.tsx`, `VERSION.md`
- حذف `devStubs.tsx`

### Version bump
- السابق: v1.38.0 → الجديد: v1.39.0 (Minor — Developer Workspace tools complete foundation)

### Rollback ZIP
- `Versions/2026-08-01_v1.38.0_BeforeDevToolsSandboxDb.zip`

### Deploy notes
1. طبّق migration **096**
2. جرّب `/dev/sandbox`، `/dev/db`، `/dev/tools/feature-flags`

---

## Version: v1.38.0
**Date:** 2026-08-01

### Changes
- موجة 2 — **I Question Repository** + **J Import/Export** + **K Audit Center**:
  - Migration `095_questions_import_audit.sql`: قراءة تدقيق للمطور، توسيع امتثال P7، `question_repo_stats`، `dev_audit_stats`، `dev_import_export_overview`
  - مدرسة: مستودع الأسئلة (`/questions` بإحصاءات)، مركز استيراد/تصدير `/principal/import-export`
  - مطور: `/dev/questions`، `/dev/import-export`، `/dev/audit` (حي)
  - مكتبة `src/lib/platformAudit.ts`

### Files Modified
- `supabase/migrations/095_questions_import_audit.sql`
- `src/lib/platformAudit.ts`, `src/lib/devNav.ts`, `src/lib/navGroups.ts`, `src/types/index.ts`
- `src/pages/dev/DevAuditPage.tsx`, `DevQuestionsMonitorPage.tsx`, `DevImportExportPage.tsx`
- `src/pages/principal/ImportExportCenterPage.tsx`, `src/pages/supervisor/QuestionBankPage.tsx`
- `src/pages/dev/DeveloperDashboard.tsx`, `devStubs.tsx`, `DevVersionPage.tsx`
- `src/layouts/AppLayout.tsx`, `src/layouts/DevLayout.tsx`, `src/router/index.tsx`
- `VERSION.md`

### Version bump
- السابق: v1.37.0 → الجديد: v1.38.0 (Minor — Questions + Import/Export + Audit foundations)

### Rollback ZIP
- `Versions/2026-08-01_v1.37.0_BeforeQuestionsImportAudit.zip`

### Deploy notes
1. طبّق migration **095** (مع 092–094 إن لم تُطبَّق)
2. تحقق: `/questions`، `/principal/import-export`، `/dev/audit`، `/dev/questions`، `/dev/import-export`

---

## Version: v1.37.0
**Date:** 2026-08-01

### Changes
- موجة 2 — **F Content Pipeline** + **G Knowledge** + **H AI Usage** (أساس حي):
  - Migration `094_dev_ai_knowledge_usage.sql`: توسيع `ai_usage_stats` للمطور، `dev_ai_generations_recent`، `dev_knowledge_pipeline_stats`، سياسات معرفة/تخزين للمطور
  - Edge `ai-knowledge-ingest`: صلاحية `platform_developer` لإعادة الفهرسة
  - صفحات حية: `/dev/pipeline`، `/dev/knowledge`، `/dev/ai/usage`
  - مكتبة `src/lib/platformKnowledge.ts`

### Files Modified
- `supabase/migrations/094_dev_ai_knowledge_usage.sql`
- `supabase/functions/ai-knowledge-ingest/index.ts`
- `src/lib/platformKnowledge.ts`, `src/lib/devNav.ts`
- `src/pages/dev/DevPipelinePage.tsx`, `DevKnowledgePage.tsx`, `DevAiUsagePage.tsx`
- `src/pages/dev/DeveloperDashboard.tsx`, `devStubs.tsx`, `DevVersionPage.tsx`
- `src/router/index.tsx`, `VERSION.md`

### Version bump
- السابق: v1.36.0 → الجديد: v1.37.0 (Minor — Pipeline + Knowledge + AI Usage foundations)

### Rollback ZIP
- `Versions/2026-08-01_v1.36.0_BeforePipelineKnowledgeAi.zip`

### Deploy notes
1. طبّق migrations **092–094** على Supabase
2. أعد نشر Edge: `ai-knowledge-ingest` (+ `jobs-worker` إن لم يُنشر)
3. تحقق من `/dev/pipeline` و`/dev/knowledge` و`/dev/ai/usage`

---

## Version: v1.36.0
**Date:** 2026-08-01

### Changes
- موجة 2 — **D File Center** + **E Error Center** (أساس):
  - Migration `093_platform_files_and_errors.sql`: فهرس ملفات، استعراض Storage للمطور، جدول `platform_errors` + RPC
  - صفحات حية: `/dev/files`, `/dev/storage`, `/dev/errors`
  - التقاط أخطاء الواجهة (`installPlatformErrorListeners`) + تبليغ من `RouteErrorPage`
  - صحة النظام تعرض ملخص الأخطاء المفتوحة

### Files Modified
- `supabase/migrations/093_platform_files_and_errors.sql`
- `src/lib/platformFiles.ts`, `src/lib/platformErrors.ts`
- `src/pages/dev/DevFilesPage.tsx`, `DevStoragePage.tsx`, `DevErrorsPage.tsx`
- `src/pages/dev/DevHealthPage.tsx`, `DeveloperDashboard.tsx`, `devStubs.tsx`
- `src/pages/RouteErrorPage.tsx`, `src/main.tsx`, `src/router/index.tsx`
- `src/pages/dev/DevVersionPage.tsx`, `VERSION.md`

### Version bump
- السابق: v1.35.0 → الجديد: v1.36.0 (Minor — Files + Errors foundations)

### Rollback ZIP
- `Versions/2026-08-01_v1.35.0_BeforeFilesAndErrors.zip`

### Deploy notes
1. طبّق migrations **092** و**093** على Supabase
2. انشر `jobs-worker` إن لم يُنشر
3. تحقق من `/dev/files` و`/dev/errors`

---

## Version: v1.35.0
**Date:** 2026-08-01

### Changes
- موجة 2 — بداية **C0 تغذية + C Jobs**:
  - Migration `092_platform_jobs.sql`: جداول `platform_jobs` / `platform_job_events` + RPC (enqueue/cancel/retry/claim/complete)
  - Edge Function `jobs-worker` لأنواع `ping` و`health_check`
  - صفحات حية: `/dev/health`, `/dev/jobs`, `/dev/queue`, `/dev/monitor/whatsapp`
  - مكتبة `src/lib/platformJobs.ts`

### Files Modified
- `supabase/migrations/092_platform_jobs.sql`
- `supabase/functions/jobs-worker/index.ts`
- `src/lib/platformJobs.ts`
- `src/pages/dev/DevHealthPage.tsx`
- `src/pages/dev/DevJobsPage.tsx`
- `src/pages/dev/DevQueuePage.tsx`
- `src/pages/dev/DevWhatsAppMonitorPage.tsx`
- `src/pages/dev/devStubs.tsx`
- `src/pages/dev/DeveloperDashboard.tsx`
- `src/pages/dev/DevVersionPage.tsx`
- `src/router/index.tsx`
- `VERSION.md`

### Version bump
- السابق: v1.34.0 → الجديد: v1.35.0 (Minor — Platform Jobs foundation + /dev health)

### Rollback ZIP
- `Versions/2026-08-01_v1.34.0_BeforePlatformJobsC0C.zip`

### Deploy notes
1. طبّق migration **092** على Supabase
2. انشر Edge Function: `jobs-worker`
3. من `/dev/jobs`: أنشئ مهمة `ping` ثم «تشغيل العامل»

---

## Version: v1.34.0
**Date:** 2026-08-01

### Changes
- UX Phase 5: بوابة ولي الأمر — شريط ابن ثابت (`ParentChildBar`)، حفظ الاختيار في localStorage، لوحة مختصرة نحو المراكز
- UX Phase 6: مساحة عمل المعلم/المدير — `ModeWorkspaceBanner`، التبديل يعيد دائماً لـ `/dashboard`، توضيح «مساحة العمل» في السايدبار
- UX Phase 7: قيادة المدير/رائد النشاط — أقسام أوامر (`CommandSection`)، قائمة مدير أقصر عبر Hubs، أدوات الإدارة مجمّعة (تشغيل/عرض/تقارير)
- UX Phase 8: مشرف — قائمة أقصر (تحليلات + أكاديمي Hub)، روابط تقارير الفصول من مركز التحليلات، مدخل أكاديمي أوضح في اللوحة
- المسارات القديمة تبقى متاحة عبر الـ Hubs والروابط السريعة

### Files Modified
- `src/components/parent/ParentChildBar.tsx`, `ParentPageShell.tsx`, `ParentDashboard.tsx`
- `src/stores/parentChildStore.ts`
- `src/pages/parent/*` (Hub، ملف، حضور، نتائج، واجبات)
- `src/components/teacher/ModeWorkspaceBanner.tsx`
- `src/lib/teacherMode.ts`, `src/layouts/AppLayout.tsx`
- `src/pages/teacher/TeacherDashboard.tsx`, `src/pages/academic/AcademicStaffHubPage.tsx`
- `src/components/shared/CommandSection.tsx`
- `src/pages/principal/PrincipalDashboard.tsx`
- `src/components/admin/AdminDashboard.tsx`
- `src/pages/supervisor/SupervisorDashboard.tsx`
- `src/components/supervisor/SupervisorAnalyticsHub.tsx`
- `src/types/index.ts`, `src/lib/navGroups.ts`
- `src/pages/dev/DevVersionPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v1.33.0 → الجديد: v1.34.0 (Minor — UX Phases 5–8)

### Rollback ZIP
- `Versions/2026-08-01_v1.33.0_BeforeUXPhases5to8.zip`
- (أيضاً) `Versions/2026-08-01_v1.33.0_BeforeUXPhases5to6.zip`

---

## Version: v1.33.0
**Date:** 2026-08-01

### Changes
- UX Phase 2: تجميع القائمة الجانبية عبر `navGroups` + `NavSection` في `AppLayout`
- UX Phase 3: دمج مداخل ناعمة —
  - مشرف: عنصر واحد «مركز التحليلات» → `/analytics`
  - إدارة/مدير: «مركز تقارير الأولمبياد» → `/admin/reports-hub`
  - ولي أمر: «أكاديمي الأبناء» → `/parent/academic` (تبويبات + المسارات القديمة تعمل)
- UX Phase 4: صندوق «مهام اليوم» (`DailyOpsInbox`) على لوحات المدير/المعلم/المشرف/رائد النشاط + لوحة وكيل جديدة (`DeputyDashboard`)
- المسارات القديمة للتقارير والأكاديمي لولي الأمر تبقى متاحة

### Files Modified
- `src/lib/navGroups.ts`
- `src/layouts/AppLayout.tsx`
- `src/types/index.ts` (ROLE_NAV)
- `src/pages/admin/OlympiadReportsHubPage.tsx`
- `src/pages/parent/ParentAcademicHubPage.tsx`
- `src/pages/deputy/DeputyDashboard.tsx`
- `src/components/shared/DailyOpsInbox.tsx`
- `src/router/index.tsx`
- `src/pages/DashboardPage.tsx`
- `src/pages/principal/PrincipalDashboard.tsx`
- `src/pages/teacher/TeacherDashboard.tsx`
- `src/pages/supervisor/SupervisorDashboard.tsx`
- `src/components/admin/AdminDashboard.tsx`
- `VERSION.md`

### Version bump
- السابق: v1.32.2 → الجديد: v1.33.0 (Minor — UX Phases 2–4: IA + Hubs + Daily Ops)

### Rollback ZIP
- `Versions/2026-08-01_v1.32.2_BeforeUXPhases2to4.zip`

---

## Version: v1.32.2
**Date:** 2026-08-01

### Changes
- إزالة الخيار المؤقت «مطور المنصة» من شاشة اختيار الدور بعد Google
- حذف RPC `claim_platform_developer_temp` عبر migration 091
- الإبقاء على دور `platform_developer` ومساحة `/dev` للحساب المنشأ

### Files Modified
- `src/pages/OnboardingPage.tsx`
- `src/pages/OnboardingRole.css`
- `src/lib/familyOnboarding.ts`
- `supabase/migrations/091_drop_temp_claim_platform_developer.sql`
- `src/pages/dev/DevVersionPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v1.32.1 → الجديد: v1.32.2 (Patch — تنظيف المسار المؤقت)

---

## Version: v1.32.1
**Date:** 2026-08-01

### Changes
- مؤقت: إضافة خيار «مطور المنصة» في شاشة اختيار الدور بعد تسجيل Google
- RPC `claim_platform_developer_temp` (migration 090) — يُحذف بعد إنشاء الحساب النهائي
- علم `TEMP_SHOW_PLATFORM_DEVELOPER_ON_GOOGLE_ONBOARDING` لسهولة الإزالة لاحقاً

### Files Modified
- `supabase/migrations/090_temp_claim_platform_developer.sql`
- `src/lib/familyOnboarding.ts`
- `src/pages/OnboardingPage.tsx`
- `src/pages/OnboardingRole.css`
- `VERSION.md`

### Version bump
- السابق: v1.32.0 → الجديد: v1.32.1 (Patch — خيار مؤقت لاختيار دور المطور عبر Google)

---

## Version: v1.32.0
**Date:** 2026-08-01

### Changes
- تنفيذ مرحلة C0: دور **Platform Developer** (`platform_developer`) ومساحة `/dev` المنفصلة عن الإدارة المدرسية
- Migration `089_platform_developer_role.sql` + سكربت `scripts/create-platform-developer.sql`
- `DevLayout` + `DEV_NAV` + لوحة مطور + Version/Environment/Debug Mode + هياكل أدوات الخارطة
- توجيه الدخول إلى `/dev`؛ الدور غير قابل للتسجيل العام أو اختيار المدير
- ZIP: `Versions/2026-08-01_v1.31.0_BeforePlatformDeveloper.zip`

### Files Modified
- `supabase/migrations/089_platform_developer_role.sql`
- `scripts/create-platform-developer.sql`
- `src/types/database.types.ts`, `src/types/index.ts`
- `src/lib/auth.ts`, `src/lib/nav.ts`, `src/lib/devNav.ts`
- `src/lib/featureCatalog.ts`, `src/lib/userGuides.ts`
- `src/layouts/DevLayout.tsx`
- `src/pages/dev/*`, `src/pages/DashboardPage.tsx`, `src/pages/RegisterPage.tsx`
- `src/router/index.tsx`
- `Docs/AI_PLATFORM_CONTEXT.md`, `VERSION.md`

### Version bump
- السابق: v1.31.0 → الجديد: v1.32.0 (Minor — دور مطور المنصة + Developer Workspace)

---

## Version: v1.31.0
**Date:** 2026-08-01

### Changes
- UX Modernization Phase 1 — Design System Foundation:
  - توكنات سطح مشتركة (`--surface-card`, `--text-muted`, …) في `index.css`
  - مكوّنات مشتركة: `RolePageShell`, `HubTabs`, `NavSection`
  - محاذاة Horizon + AcademicUi مع التوكنات
  - تبني HubTabs/RolePageShell في مركز النقاط وParentPageShell
- ZIP استرجاع: `Versions/2026-08-01_v1.30.2_BeforeUXPhase1.zip`

### Files Modified
- `src/index.css`
- `src/components/ui/RolePageShell.tsx`
- `src/components/ui/HubTabs.tsx`
- `src/components/ui/NavSection.tsx`
- `src/components/ui/index.ts`
- `src/components/dashboard/horizon/HorizonDashboard.tsx`
- `src/components/academic/AcademicUi.tsx`
- `src/components/parent/ParentPageShell.tsx`
- `src/pages/admin/PointsHubPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v1.30.2 → الجديد: v1.31.0 (Minor — بداية تنفيذ UX Phase 1)

---

## Version: v1.30.2
**Date:** 2026-08-01

### Changes
- تحديث Developer Workspace في `Docs/SCHOOL_PLATFORM_ROADMAP.md` بثلاث أدوات معتمدة:
  - Developer Sandbox (`/dev/sandbox`)
  - Debug Mode (للمطور فقط)
  - Database Explorer قراءة فقط (`/dev/db`)
- تأكيد الضوابط: لا كتابة من المستكشف، لا خلط مع أدوات إدارة المدرسة (بدون تنفيذ كود)

### Files Modified
- `Docs/SCHOOL_PLATFORM_ROADMAP.md`
- `VERSION.md`

### Version bump
- السابق: v1.30.1 → الجديد: v1.30.2 (Patch — توثيق أدوات مطور إضافية)

---

## Version: v1.30.1
**Date:** 2026-08-01

### Changes
- تحديث `Docs/SCHOOL_PLATFORM_ROADMAP.md`: إضافة دور **Platform Developer (`platform_developer`)** وDeveloper Workspace
- تحديد مكان الدور في المعمارية، فصل الصلاحيات عن الإدارة المدرسية، وكتالوج صفحات `/dev/*`
- إدراج المرحلة **C0** قبل أدوات البنية التحتية (بدون تنفيذ كود)

### Files Modified
- `Docs/SCHOOL_PLATFORM_ROADMAP.md`
- `VERSION.md`

### Version bump
- السابق: v1.30.0 → الجديد: v1.30.1 (Patch — توثيق دور المطور في الخارطة المعتمدة)

---

## Version: v1.30.0
**Date:** 2026-08-01

### Changes
- تحديث واعتماد `Docs/SCHOOL_PLATFORM_ROADMAP.md` كأساس للتطوير مع إضافة ركائز البنية التحتية وإعادة ترتيب الأولويات:
  - AI Knowledge Center، Question Repository، Content Processing Pipeline
  - Background Jobs & Task Manager، Import/Export Center، File Management Center
  - AI Usage Dashboard، System Error Center، Audit Center
- ثلاث موجات تنفيذ: تجربة يومية → بنية تحتية → قيمة يومية (بدون تنفيذ كود في هذا الإصدار)

### Files Modified
- `Docs/SCHOOL_PLATFORM_ROADMAP.md`
- `VERSION.md`

### Version bump
- السابق: v1.29.0 → الجديد: v1.30.0 (Minor — توسيع خارطة الطريق المعتمدة)

---

## Version: v1.29.0
**Date:** 2026-08-01

### Changes
- اعتماد خطة تنفيذ مبادرة UX Modernization Initiative v2.0 (تحليل شامل + مراحل تنفيذ بدون كود)

### Files Modified
- `Docs/UX_MODERNIZATION_V2_PLAN.md`
- `VERSION.md`

### Version bump
- السابق: v1.28.5 → الجديد: v1.29.0 (Minor — وثيقة مبادرة UX كبيرة، بدون تغيير سلوك المنصة)

---

## Version: v1.28.5
**Date:** 2026-08-01

### Changes
- إضافة ملف سياق شامل للمنصة للاستخدام مع أي مساعد ذكاء اصطناعي (`Docs/AI_PLATFORM_CONTEXT.md`)

### Files Modified
- `Docs/AI_PLATFORM_CONTEXT.md`
- `VERSION.md`

### Version bump
- السابق: v1.28.4 → الجديد: v1.28.5 (توثيق)

---

## Version: v1.28.4
**Date:** 2026-08-01

### Changes
- إصلاح رسالة خطأ وهمية بعد إرسال تذكير واتساب (WPPConnect wapi.js) رغم وصول الرسالة

### Files Modified
- `whatsapp-server.js`
- `wppconnect-master/whatsapp-server.js`
- `src/lib/whatsappReminder.ts`
- `VERSION.md`

### Version bump
- السابق: v1.28.3 → الجديد: v1.28.4 (إصلاح)

---

## Version: v1.28.3
**Date:** 2026-08-01

### Changes
- توضيح إعداد Hostinger فقط (بدون VPS): تقوية `.htaccess` و`404.html` لمسار SPA

### Files Modified
- `public/.htaccess`
- `public/404.html`
- `VERSION.md`

### Version bump
- السابق: v1.28.2 → الجديد: v1.28.3 (إصلاح)

---

## Version: v1.28.2
**Date:** 2026-08-01

### Changes
- إصلاح Page Not Found عند تحديث الصفحة على Hostinger (تقوية `.htaccess` + `index.php` احتياطي)

### Files Modified
- `public/.htaccess`
- `public/index.php`
- `VERSION.md`

### Version bump
- السابق: v1.28.1 → الجديد: v1.28.2 (إصلاح)

---

## Version: v1.28.1
**Date:** 2026-08-01

### Changes
- رفع حد precache في PWA إلى 8MB لإصلاح فشل `npm run build` بعد تضخم الحزمة الرئيسية

### Files Modified
- `vite.config.ts`
- `VERSION.md`

### Version bump
- السابق: v1.28.0 → الجديد: v1.28.1 (إصلاح)

---

## Version: v1.28.0
**Date:** 2026-08-01

### Changes
- إصلاح فشل فهرسة PDF في RAG (`unsupported Unicode escape`) بتنظيف النص وتحسين استخراج العربية
- إضافة تحديد المرحلة والصف والمادة لمستندات قاعدة المعرفة مع فلترة الاسترجاع

### Files Modified
- `supabase/migrations/088_ai_knowledge_scope.sql`
- `supabase/functions/ai-knowledge-ingest/index.ts`
- `supabase/functions/ai-generate/index.ts`
- `src/lib/ai/types.ts`
- `src/lib/ai/aiAssistantService.ts`
- `src/pages/principal/academic/PrincipalAiSettingsPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v1.27.3 → الجديد: v1.28.0 (ميزة)

---

## Version: v1.27.3
**Date:** 2026-08-01

### Changes
- إصلاح ربط صفوف/فصول المعلم في المساعد الذكي: مصادر متعددة (إعداد + إسناد مدير + جداول + أولمبياد) وتحليل أوثق لمفاتيح الفصول

### Files Modified
- `src/lib/academic/teacherSetupHelpers.ts`
- `src/lib/ai/aiPrefill.ts`
- `src/pages/teacher/TeacherAiAssistantPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v1.27.2 → الجديد: v1.27.3 (إصلاح)

---

## Version: v1.27.2
**Date:** 2026-08-01

### Changes
- ربط المساعد الذكي بمواد وصفوف وفصول المعلم من الإعداد الأكاديمي (قوائم اختيار + عدد الطلاب)

### Files Modified
- `src/lib/ai/aiPrefill.ts`
- `src/lib/ai/types.ts`
- `src/pages/teacher/TeacherAiAssistantPage.tsx`
- `supabase/functions/ai-generate/index.ts` (حقل المرحلة في البرومبت)
- `VERSION.md`

### Version bump
- السابق: v1.27.1 → الجديد: v1.27.2 (تحسين)

---

## Version: v1.27.1
**Date:** 2026-08-01

### Changes
- إصلاح ارتداد تبويب مساعد الذكاء إلى لوحة التحكم: متاح في وضعَي أولمبياد وأكاديمي + انتظار hydrate لوضع العمل قبل إعادة التوجيه

### Files Modified
- `src/lib/teacherMode.ts`
- `src/layouts/AppLayout.tsx`
- `src/stores/teacherModeStore.ts`
- `VERSION.md`

### Version bump
- السابق: v1.27.0 → الجديد: v1.27.1 (إصلاح)

---

## Version: v1.27.0
**Date:** 2026-08-01

### Changes
- RAG: جداول المعرفة + embeddings + Edge `ai-knowledge-ingest`
- رفع ملفات PDF/Word/TXT من المدير وحقن المقتطفات في `ai-generate`

### Files Modified
- `supabase/migrations/087_ai_rag_knowledge.sql` (جديد)
- `supabase/functions/ai-knowledge-ingest/index.ts` (جديد)
- `supabase/functions/ai-generate/index.ts`
- `src/lib/ai/types.ts`
- `src/lib/ai/aiAssistantService.ts`
- `src/pages/principal/academic/PrincipalAiSettingsPage.tsx`
- `VERSION.md`

### Ops
- تطبيق SQL 085–087
- Deploy: `ai-generate` + `ai-credits` + `ai-monthly-reset` + `ai-knowledge-ingest`
- Embedding: `OPENAI_API_KEY` أو `OPENROUTER_API_KEY`

### Version bump
- السابق: v1.26.1 → الجديد: v1.27.0

---

## Version: v1.26.1
**Date:** 2026-08-01

### Changes
- إعادة تصميم واجهة مساعد الذكاء (معلم + مدير) بأسلوب تطبيقات AI الشهيرة
- شريط جانبي، لوحة نتائج، composer، اقتراحات سريعة، أنيميشن Orb، بطاقات اختيار المزود
- لوحة إحصائيات المدير ضمن التصميم الجديد مع الإبقاء على فوترة Tokens

### Files Modified
- `src/components/ai/AiStudioShell.tsx` (جديد)
- `src/components/ai/index.ts` (جديد)
- `src/pages/teacher/TeacherAiAssistantPage.tsx`
- `src/pages/principal/academic/PrincipalAiSettingsPage.tsx`
- `src/index.css`
- `VERSION.md`

### Version bump
- السابق: v1.26.0 → الجديد: v1.26.1 (تحسين واجهة)
- نسخة الاسترجاع: `Versions/2026-08-01_v1.23.4_AiAssistantUiRedesign.zip`

---

## Version: v1.26.0
**Date:** 2026-08-01

### Changes
- وضع فوترة Tokens: `billing_mode` + `tokens_per_credit` + تقدير دولار في المعاملات والإحصائيات
- المدير يبدّل بين فوترة ثابتة وTokens من الإعدادات

### Files Modified
- `supabase/migrations/086_ai_token_billing.sql` (جديد)
- `supabase/functions/ai-generate/index.ts`
- `supabase/functions/ai-credits/index.ts`
- `src/lib/ai/types.ts`
- `src/pages/principal/academic/PrincipalAiSettingsPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v1.25.0 → الجديد: v1.26.0

---

## Version: v1.25.0
**Date:** 2026-08-01

### Changes
- تصدير نتيجة المساعد إلى Word و PowerPoint و PDF من لوحة النتيجة

### Files Modified
- `src/lib/ai/exportGenerated.ts` (جديد)
- `src/pages/teacher/TeacherAiAssistantPage.tsx`
- `package.json` / `package-lock.json` (docx, pptxgenjs)
- `VERSION.md`

### Version bump
- السابق: v1.24.0 → الجديد: v1.25.0 (ميزة تصدير)

---

## Version: v1.24.0
**Date:** 2026-08-01

### Changes
- مشاركة البرومبتات بين المعلمين (جدول + تبويب مشاركات)
- أدوات تحسين / ترجمة / إعادة صياغة تكتب داخل محرر البرومبت الحر مع تراجع
- تعبئة تلقائية كاملة من إعداد المعلم والخطط وعدد الطلاب
- Edge Function `ai-monthly-reset` لإعادة تعيين الرصيد الشهري
- لوحة إحصائيات متقدمة للمدير (نقاط، Tokens، تكلفة، أكثر العمليات/المعلمين/المواد)

### Files Modified
- `supabase/migrations/085_ai_wave_a_share_stats_cron.sql` (جديد)
- `supabase/functions/ai-monthly-reset/index.ts` (جديد)
- `supabase/functions/ai-generate/index.ts`
- `src/lib/ai/types.ts`
- `src/lib/ai/aiAssistantService.ts`
- `src/lib/ai/aiPrefill.ts` (جديد)
- `src/pages/teacher/TeacherAiAssistantPage.tsx`
- `src/pages/principal/academic/PrincipalAiSettingsPage.tsx`
- `VERSION.md`

### Version bump
- السابق: v1.23.3 → الجديد: v1.24.0 (ميزات جديدة من PRD موجة أ)

---

## Version: v1.23.3
**Date:** 2026-08-01

### Changes
- تبديل المزود من شاشة المدير: OpenRouter / DeepSeek / Google Gemini / OpenAI + نموذج مخصص عبر OpenRouter

### Files Modified
- `supabase/migrations/084_ai_more_providers.sql` (جديد)
- `supabase/functions/ai-generate/index.ts`
- `src/pages/principal/academic/PrincipalAiSettingsPage.tsx`
- `src/lib/ai/types.ts`
- `VERSION.md`

### Secrets حسب المزود
| المزود | السر |
|--------|------|
| OpenRouter | `OPENROUTER_API_KEY` |
| DeepSeek | `DEEPSEEK_API_KEY` |
| Google Gemini | `GOOGLE_AI_API_KEY` أو `GEMINI_API_KEY` |
| OpenAI | `OPENAI_API_KEY` |

---

## Version: v1.23.2
**Date:** 2026-08-01

### Changes
- المدير يبدّل مزود الذكاء: OpenRouter أو DeepSeek مباشر من الإعدادات

### Files Modified
- `supabase/migrations/083_ai_provider_switch.sql` (جديد)
- `supabase/functions/ai-generate/index.ts`
- `supabase/functions/ai-credits/index.ts`
- `src/pages/principal/academic/PrincipalAiSettingsPage.tsx`
- `src/lib/ai/types.ts`
- `VERSION.md`

### Version bump
- **v1.23.1 → v1.23.2** (Patch — تبديل المزود)

### Secrets
```bash
# للمزود OpenRouter:
supabase secrets set OPENROUTER_API_KEY=sk-or-...
# للمزود DeepSeek المباشر:
supabase secrets set DEEPSEEK_API_KEY=sk-...
supabase functions deploy ai-generate
```

---

## Version: v1.23.1
**Date:** 2026-08-01

### Changes
- النموذج الافتراضي للمساعد: `deepseek/deepseek-v4-flash` (أرخص)، مع قائمة نماذج رخيصة في إعدادات المدير

### Files Modified
- `supabase/migrations/081_ai_teacher_assistant.sql`
- `supabase/migrations/082_ai_cheap_model.sql` (جديد)
- `supabase/functions/ai-generate/index.ts`
- `src/pages/principal/academic/PrincipalAiSettingsPage.tsx`
- `VERSION.md`

### Version bump
- **v1.23.0 → v1.23.1** (Patch — تقليل تكلفة النماذج)

---

## Version: v1.23.0
**Date:** 2026-08-01

### Changes
- مساعد المعلم الذكي: برومبتات جاهزة، برومبت حر، سجل، مفضلة، رصيد (100)، قوالب المدير عبر OpenRouter

### Files Modified
- `supabase/migrations/081_ai_teacher_assistant.sql` (جديد)
- `supabase/functions/ai-generate/index.ts` (جديد)
- `supabase/functions/ai-credits/index.ts` (جديد)
- `src/lib/ai/*` (جديد)
- `src/pages/teacher/TeacherAiAssistantPage.tsx` (جديد)
- `src/pages/principal/academic/PrincipalAiSettingsPage.tsx` (جديد)
- `src/router/index.tsx`
- `src/types/index.ts`
- `src/lib/teacherMode.ts`
- `src/pages/principal/academic/PrincipalAcademicHubPage.tsx`
- `VERSION.md`

### Version bump
- **v1.22.4 → v1.23.0** (Minor — ميزة مساعد المعلم الذكي)

### Deploy / Secrets
```bash
# 1) نفّذ migration 081 على Supabase
# 2) اضبط المفتاح:
supabase secrets set OPENROUTER_API_KEY=sk-or-...
# 3) انشر الدوال:
supabase functions deploy ai-generate
supabase functions deploy ai-credits
```

المسارات:
- معلم: `/teacher/ai-assistant`
- مدير: `/principal/ai-settings`

---

## Version: v1.22.4
**Date:** 2026-08-01

### Changes
- تحويل وثيقة PRD لمساعد المعلم الذكي ونظام رصيد الذكاء الاصطناعي إلى ملف Markdown منظم داخل Docs

### Files Modified
- `Docs/مساعد-المعلم-الذكي-PRD.md` (جديد — كان الملف `md` بدون امتداد)
- `md` (حُذف)
- `VERSION.md`

### Version bump
- **v1.22.3 → v1.22.4** (Patch — توثيق فقط)

---

## Version: v1.22.3
**Date:** 2026-08-01

### Changes
- المدير يضبط أوقات التذكير التلقائي من الإعدادات الأكاديمية (واجبات + خطة أسبوعية) دون إعادة نشر يدوية كل مرة

### Files Modified
- `src/lib/academic/types.ts`
- `src/lib/academic/adminService.ts`
- `src/pages/principal/academic/PrincipalAcademicSettingsPage.tsx`
- `scripts/reminder-scheduler/reminder-scheduler.mjs`
- `VERSION.md`

### Version bump
- **v1.22.2 → v1.22.3** (Minor-patch — إعداد مواعيد التذكير من المدير)

### Deploy
بعد رفع الواجهة، حدّث المجدول على VPS مرة واحدة:
```bash
bash deploy/deploy-reminder-scheduler.sh
```
ثم أي تعديل للمواعيد من الإعدادات يُطبَّق خلال دقيقة.

---

## Version: v1.22.2
**Date:** 2026-08-01

### Changes
- إصلاح التذكير التلقائي للواجبات/الخطط: أسبوع من التقويم، منطق النقص مطابق للمراقبة، إعادة محاولة بعد الفشل، فحص واتساب قبل الإرسال

### Files Modified
- `scripts/reminder-scheduler/reminder-scheduler.mjs`
- `deploy/deploy-reminder-scheduler.sh` (جديد)
- `src/pages/principal/academic/PrincipalAcademicSettingsPage.tsx`
- `VERSION.md`

### Version bump
- **v1.22.1 → v1.22.2** (Patch — إصلاح التذكير التلقائي)

### Deploy VPS
```bash
bash deploy/deploy-reminder-scheduler.sh
# فحص:
# ssh root@VPS 'cd /opt/academic-reminder-scheduler && node reminder-scheduler.mjs --once --slot=status'
# إرسال فوري للاختبار:
# ssh root@VPS 'cd /opt/academic-reminder-scheduler && node reminder-scheduler.mjs --once --slot=hw --force'
```

---

## Version: v1.22.1
**Date:** 2026-07-31

### Changes
- إصلاح بناء TypeScript: استبدال `replaceAll` بطريقة متوافقة مع target الحالي

### Files Modified
- `src/lib/whatsappReminder.ts`
- `VERSION.md`

### Version bump
- **v1.22.0 → v1.22.1** (Patch — إصلاح البناء)

---

## Version: v1.22.0
**Date:** 2026-07-31

### Changes
- شاشة مدير جديدة لإرسال أي نوع تذكير واتساب (قوالب + نص حر + اختيار المعلمين)

### Files Modified
- `src/pages/principal/academic/PrincipalWhatsAppRemindersPage.tsx` (جديد)
- `src/lib/whatsappReminder.ts`
- `src/pages/principal/academic/PrincipalAcademicHubPage.tsx`
- `src/pages/principal/academic/PrincipalAcademicSettingsPage.tsx`
- `src/router/index.tsx`
- `src/types/index.ts`
- `VERSION.md`

### Version bump
- **v1.21.7 → v1.22.0** (Minor — ميزة إرسال تذكيرات واتساب من لوحة المدير)

---

## Version: v1.21.7
**Date:** 2026-07-31

### Changes
- دمج خادم واتساب في ملف واحد: OTP (LID) + تذكيرات المنصة + نتائج OMR + QR/Pairing

### Files Modified
- `wppconnect-master/whatsapp-server.js`
- `whatsapp-server.js`
- `VERSION.md`

### Version bump
- **v1.21.6 → v1.21.7** (Minor-patch — دمج خادم واتساب للـ VPS)

### Deploy
```bash
./deploy-whatsapp-vps.sh
# أو يدوياً:
# scp wppconnect-master/whatsapp-server.js root@VPS:/opt/wppconnect/whatsapp-server.js
# ssh root@VPS 'cd /opt/wppconnect && pm2 restart all'
```

---

## Version: v1.21.6
**Date:** 2026-07-31

### Changes
- إصلاح أخطاء TypeScript التي تمنع `npm run build` (دليل المراجع + queryFn لتقييم الوكيل)

### Files Modified
- `src/lib/userGuides.ts`
- `src/pages/academic/DeputyTeacherEvaluationPage.tsx`
- `VERSION.md`

### Version bump
- **v1.21.5 → v1.21.6** (Patch — إصلاح البناء)

---

## Version: v1.21.5
**Date:** 2026-07-31

### Changes
- إصلاح حلقة توجيه لا نهائية بين `/teacher/onboarding` و`/dashboard` في الوضع الأكاديمي

### Files Modified
- `src/lib/teacherMode.ts`
- `src/layouts/AppLayout.tsx`
- `VERSION.md`

### Version bump
- **v1.21.4 → v1.21.5** (Patch — إصلاح Maximum update depth)

---

## Version: v1.21.4
**Date:** 2026-07-31

### Changes
- تحميل مباشر لملفات المراجعات عبر Blob (يعمل عبر نطاق مختلف)
- سكربت تنزيل إجباري + CORS على مجلد الرفع في Hostinger

### Files Modified
- `src/lib/downloadFile.ts`
- `src/pages/academic/AcademicExamReviewsPage.tsx`
- `src/components/academic/PublishedExamReviewsList.tsx`
- `public/uploads/exam-reviews/download.php`
- `public/uploads/exam-reviews/.htaccess`
- `VERSION.md`

### Version bump
- **v1.21.3 → v1.21.4** (Patch — تحميل PDF مباشر)

---

## Version: v1.21.3
**Date:** 2026-07-31

### Changes
- شاشة المراجع: معاينة PDF داخل الصفحة + زر تحميل
- تبويب «كل الطلبات والإجراءات» بعد الإرسال أو طلب التعديل

### Files Modified
- `src/pages/academic/AcademicExamReviewsPage.tsx`
- `src/lib/academic/adminService.ts`
- `VERSION.md`

### Version bump
- **v1.21.2 → v1.21.3** (Patch — تحسين واجهة المراجع)

---

## Version: v1.21.2
**Date:** 2026-07-31

### Changes
- إصلاح مسارات الاستيراد في صفحة إعداد المعلم (Vite overlay)
- إصلاح 403 عند إنشاء دورة تقييم المعلم لغير المدير عبر RPC

### Files Modified
- `src/pages/teacher/TeacherOnboardingPage.tsx`
- `src/lib/teacherEvaluation/service.ts`
- `supabase/migrations/080_ensure_teacher_eval_cycle.sql`
- `VERSION.md`

### Version bump
- **v1.21.1 → v1.21.2** (Patch — إصلاح استيراد + دورة التقييم)

---

## Version: v1.21.1
**Date:** 2026-07-31

### Changes
- رفع ملفات المراجعات إلى Hostinger بدل Supabase Storage (الرابط فقط في قاعدة البيانات)
- سكربت PHP: `public/api/upload-exam-review.php` + مجلد `uploads/exam-reviews`

### Files Modified
- `src/lib/hostingerUpload.ts`
- `src/lib/academic/adminService.ts`
- `public/api/upload-exam-review.php`
- `public/uploads/exam-reviews/.htaccess`
- `.env.example`
- `VERSION.md`

### Version bump
- **v1.21.0 → v1.21.1** (Patch — رفع المراجعات على Hostinger)

---

## Version: v1.21.0
**Date:** 2026-07-31

### Changes
- رابط تسجيل معلمين محمي بكود: `/register/teacher` ثم Google
- بعد التسجيل: الاسم والجوال → الإعداد الأكاديمي → الجدول الدراسي
- إعدادات المدير: كود تسجيل المعلمين + نسخ الرابط
- RPC آمن `claim_teacher_signup` / `complete_teacher_profile`

### Files Modified
- `supabase/migrations/079_teacher_google_signup.sql`
- `src/lib/teacherSignup.ts`
- `src/pages/TeacherRegisterPage.tsx`
- `src/pages/teacher/TeacherOnboardingPage.tsx`
- `src/pages/AuthCallbackPage.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/principal/academic/PrincipalAcademicSettingsPage.tsx`
- `src/lib/auth.ts`
- `src/lib/academic/adminService.ts`
- `src/router/index.tsx`
- `src/router/AcademicSetupGate.tsx`
- `src/router/OnboardingGate.tsx`
- `VERSION.md`

### Version bump
- **v1.20.0 → v1.21.0** (Minor — تسجيل معلمين عبر Google بكود تفعيل)

### Rollback
- `Versions/2026-07-31_v1.20.0_BeforeTeacherGoogleSignup.zip`

---

## Version: v1.20.0
**Date:** 2026-07-31

### Changes
- دور جديد «المراجع» لمراجعة ملفات المعلمين قبل المدير
- مسار اعتماد المراجعات: معلم → مراجع → مدير (اعتماد ورفع) → نشر
- نفس القائمة المنشورة لولي الأمر والطالب (`/student/academic/reviews`)
- إعادة رفع الملف من المعلم عند «يحتاج تعديل»

### Files Modified
- `supabase/migrations/078_reviewer_role_exam_reviews.sql`
- `src/lib/academic/adminService.ts`
- `src/lib/academic/types.ts`
- `src/lib/academic/constants.ts`
- `src/pages/academic/AcademicExamReviewsPage.tsx`
- `src/pages/reviewer/ReviewerDashboard.tsx`
- `src/components/academic/PublishedExamReviewsList.tsx`
- `src/pages/parent/ParentAcademicReviewsPage.tsx`
- `src/pages/student/StudentAcademicReviewsPage.tsx`
- `src/pages/student/StudentAcademicPage.tsx`
- `src/pages/DashboardPage.tsx`
- `src/router/index.tsx`
- `src/types/index.ts`
- `src/types/database.types.ts`
- `src/lib/auth.ts`
- `src/lib/featureCatalog.ts`
- `src/lib/unifiedDashboard.ts`
- `VERSION.md`

### Version bump
- **v1.19.2 → v1.20.0** (Minor — مسار اعتماد المراجعات + دور المراجع)

### Rollback
- `Versions/2026-07-31_v1.19.2_BeforeReviewerWorkflow.zip`

---

## Version: v1.19.2
**Date:** 2026-07-31

### Changes
- تفاصيل الطلب: عرض قسم «المواد المختارة» بشكل واضح أعلى تفاصيل المعلمين

### Files Modified
- `src/pages/academic/AcademicObservationInboxPage.tsx`
- `VERSION.md`

### Version bump
- **v1.19.1 → v1.19.2** (Patch — إظهار المواد في تفاصيل الطلب)

---

## Version: v1.19.1
**Date:** 2026-07-31

### Changes
- التقارير المحفوظة: زر «عرض تفاصيل الطلب» بدل «فتح في إدارة الطلبات»
- إصلاح ظهور الطلب مكتمل كمعلّق على «قيد الإفادة» (إكمال تلقائي + إصلاح الطلبات العالقة)
- فتح الطلب مباشرة من الرابط `?request=` في صندوق التقارير

### Files Modified
- `src/pages/academic/AcademicReportsPage.tsx`
- `src/pages/academic/AcademicObservationInboxPage.tsx`
- `src/lib/academic/adminService.ts`
- `supabase/migrations/077_finalize_observation_completion.sql`
- `VERSION.md`

### Version bump
- **v1.19.0 → v1.19.1** (Patch — إصلاح حالة الطلب المكتمل + زر التفاصيل)

---

## Version: v1.19.0
**Date:** 2026-07-31

### Changes
- شاشة تقارير ملاحظات الطلاب (مدير/مشرف/وكيل): تفاصيل الطلب، من أكمل ومن تبقّى
- تعديل المواد/المعلمين بعد الإرسال، حذف الطلب، إنشاء طلب بدون ولي أمر
- تذكير واتساب فردي وجماعي للمعلمين المتبقّين
- تحسين واجهة التقارير المحفوظة

### Files Modified
- `src/pages/academic/AcademicObservationInboxPage.tsx`
- `src/pages/academic/AcademicReportsPage.tsx`
- `src/lib/academic/adminService.ts`
- `src/lib/whatsappReminder.ts`
- `src/pages/academic/AcademicStaffHubPage.tsx`
- `src/types/index.ts`
- `VERSION.md`

### Version bump
- **v1.18.4 → v1.19.0** (Minor — إدارة كاملة لطلبات الملاحظات)

---


## Version: v1.18.4
**Date:** 2026-07-31

### Changes
- إعادة تسمية واجهة المعلم: «طلبات ملاحظات الطلاب» بدل «مهام الملاحظات»
- تصميم محسّن: بطاقات إحصائية، تقييم بالشرائح، لوحات سلوكي/أكاديمي منفصلة

### Files Modified
- `src/pages/academic/TeacherObservationTasksPage.tsx`
- `src/pages/teacher/TeacherDashboard.tsx`
- `src/pages/academic/AcademicStaffHubPage.tsx`
- `src/types/index.ts`
- `src/lib/featureCatalog.ts`
- `VERSION.md`

### Version bump
- **v1.18.3 → v1.18.4** (Patch — تسمية وتصميم واجهة المعلم)

---

## Version: v1.18.3
**Date:** 2026-07-31

### Changes
- تقرير الملاحظة: تقييم سلوكي + تقييم أكاديمي (ممتاز → ضعيف) مع تعليقات اختيارية
- عرض منظم للتقييمين لدى المعلم وولي الأمر وإدارة المدرسة والطباعة

### Files Modified
- `src/lib/academic/types.ts`
- `src/lib/academic/observationHelpers.ts`
- `src/lib/academic/adminService.ts`
- `src/components/academic/ObservationEntriesList.tsx`
- `src/pages/academic/TeacherObservationTasksPage.tsx`
- `src/pages/academic/AcademicReportDetailPage.tsx`
- `src/pages/academic/AcademicReportsPage.tsx`
- `src/pages/parent/ParentAcademicRequestsPage.tsx`
- `VERSION.md`

### Version bump
- **v1.18.2 → v1.18.3** (Patch — تقييم سلوكي وأكاديمي)

---

## Version: v1.18.2
**Date:** 2026-07-31

### Changes
- إنشاء معلم: اختيار المادة من قائمة منسدلة من المواد الأكاديمية المسجّلة
- لوحة المعلم (الوضع الأكاديمي): بطاقة «مهام الملاحظات» + تنبيه للطلبات المعلّقة

### Files Modified
- `src/components/users/AddUserModal.tsx`
- `src/pages/teacher/TeacherDashboard.tsx`
- `src/lib/featureCatalog.ts`
- `VERSION.md`

### Version bump
- **v1.18.1 → v1.18.2** (Patch — قائمة المواد ولوحة المعلم)

---

## Version: v1.18.1
**Date:** 2026-07-31

### Changes
- إسناد المواد: اختيار الفصول إلزامي مع الصف والمواد
- صندوق الملاحظات: اختيار المواد أولاً ثم معلمو المادة في الصف+الفصل فقط
- إصلاح ظهور المعلمين الجدد في قائمة الإسناد (تحديث القائمة + تفعيل الحسابات المعطّلة)
- توضيح أن «مزامنة النقاط» لا تضيف معلمين للقائمة

### Files Modified
- `src/pages/principal/academic/PrincipalAcademicAssignmentsPage.tsx`
- `src/pages/academic/AcademicObservationInboxPage.tsx`
- `src/lib/academic/adminService.ts`
- `src/pages/principal/UsersPage.tsx`
- `VERSION.md`

### Version bump
- **v1.18.0 → v1.18.1** (Patch — فلترة الفصل/المادة وإصلاح قائمة المعلمين)

---

## Version: v1.18.0
**Date:** 2026-07-31

### Changes
- صندوق طلبات الملاحظة للمدير والوكيل والمشرف التربوي: استلام الطلبات وإرسالها لمعلمي الفصل
- شاشة مهام الملاحظات للمعلم لإضافة إفادته
- حالة طلب جديدة `assigned` + جدول تكليفات المعلمين
- تتبع ولي الأمر يشمل مرحلة إفادة المعلمين
- إشعار داخل المنصة للمعلمين عند الإرسال

### Setup
نفّذ migration:
`supabase/migrations/076_observation_teacher_dispatch.sql`

### Files Modified
- `supabase/migrations/076_observation_teacher_dispatch.sql`
- `src/pages/academic/AcademicObservationInboxPage.tsx`
- `src/pages/academic/TeacherObservationTasksPage.tsx`
- `src/pages/academic/AcademicStaffHubPage.tsx`
- `src/pages/academic/AcademicReportsPage.tsx`
- `src/pages/parent/ParentAcademicRequestsPage.tsx`
- `src/lib/academic/adminService.ts`
- `src/lib/academic/types.ts`
- `src/router/index.tsx`
- `src/types/index.ts`
- `VERSION.md`

### Version bump
- **v1.17.6 → v1.18.0** (Minor — مسار إرسال الملاحظات للمعلمين)

### Restore point
- `Versions/2026-07-31_v1.17.6_BeforeObservationDispatch.zip`

---

## Version: v1.17.6
**Date:** 2026-07-31

### Changes
- شاشة «طلباتي» لولي الأمر: عرض الطلاب المقدَّمين في كل طلب
- شريط تتبع حالة الطلب (تم الإرسال ← قيد المراجعة ← تمت المعالجة/مرفوض)
- عرض تقرير الملاحظة عند اكتمال المعالجة
- روابط من لوحة ولي الأمر وصفحة النجاح بعد الإرسال

### Files Modified
- `src/pages/parent/ParentAcademicRequestsPage.tsx`
- `src/pages/parent/ParentAcademicObservationPage.tsx`
- `src/lib/academic/adminService.ts`
- `src/lib/academic/types.ts`
- `src/router/index.tsx`
- `src/types/index.ts`
- `src/components/parent/ParentDashboard.tsx`
- `src/lib/featureCatalog.ts`
- `VERSION.md`

### Version bump
- **v1.17.5 → v1.17.6** (Patch — متابعة طلبات الملاحظة)

---

## Version: v1.17.5
**Date:** 2026-07-31

### Changes
- طلب ملاحظة طالب: اختيار الابن من قائمة منسدلة (الاسم + الصف + الفصل) بدل الإدخال اليدوي
- رقم الجوال من ملف ولي الأمر إن وُجد (بدون طلبه مجدداً)

### Files Modified
- `src/pages/parent/ParentAcademicObservationPage.tsx`
- `src/lib/academic/types.ts`
- `VERSION.md`

### Version bump
- **v1.17.4 → v1.17.5** (Patch — تحسين نموذج ولي الأمر)

---

## Version: v1.17.4
**Date:** 2026-07-31

### Changes
- إصلاح وميض شاشة تسجيل الدخول بعد Google: العودة عبر `/auth/callback` مع شاشة تحميل فقط
- توجيه SPA بـ `navigate` بدل إعادة تحميل كاملة قدر الإمكان

### Setup
أضف في Supabase → Authentication → URL Configuration → Redirect URLs:
`http://localhost:5173/auth/callback`
و`https://your-domain.com/auth/callback`

### Files Modified
- `src/pages/AuthCallbackPage.tsx`
- `src/pages/LoginPage.tsx`
- `src/lib/auth.ts`
- `src/router/index.tsx`
- `src/stores/authStore.ts`
- `VERSION.md`

### Version bump
- **v1.17.3 → v1.17.4** (Patch — إصلاح مسار OAuth)

---

## Version: v1.17.3
**Date:** 2026-07-31

### Changes
- تحسين نص توضيح بطاقة الطالب/ولي الأمر في شاشة اختيار الدور

### Files Modified
- `src/lib/familyOnboarding.ts`
- `VERSION.md`

### Version bump
- **v1.17.2 → v1.17.3** (Patch — نص واجهة)

---

## Version: v1.17.2
**Date:** 2026-07-31

### Changes
- إعادة تصميم شاشة اختيار الدور في `/onboarding` (بطاقتان بصريتان بدل أزرار مملة)

### Files Modified
- `src/pages/OnboardingPage.tsx`
- `src/pages/OnboardingRole.css`
- `src/lib/familyOnboarding.ts`
- `VERSION.md`

### Version bump
- **v1.17.1 → v1.17.2** (Patch — تحسين واجهة)

---

## Version: v1.17.1
**Date:** 2026-07-31

### Changes
- إضافة طالب **يدوياً** بدون بريد أو كلمة مرور (سجل قائمة فقط)
- نموذج في صفحة إدارة قائمة الطلاب + نفس السلوك عند اختيار دور طالب في إضافة مستخدم
- الطالب يربط حسابه لاحقاً برقم الهوية كما في التدفق المعتمد

### Files Modified
- `src/lib/studentRoster.ts`
- `src/components/users/AddStudentRosterForm.tsx`
- `src/pages/principal/BulkUploadPage.tsx`
- `src/components/users/AddUserModal.tsx`
- `VERSION.md`

### Version bump
- **v1.17.0 → v1.17.1** (Patch — إضافة يدوية للطلاب)

---

## Version: v1.17.0
**Date:** 2026-07-31

### Changes
- زر **تصفير قاعدة البيانات** لمدير المدرسة في `/principal/settings` (تبويب السنة الدراسية)
- يتطلب كتابة «تصفير» + تأكيد صريح؛ يبقي حساب المدير الحالي وإعدادات النظام
- إزالة الحسابات التجريبية من الواجهة ولوحات المتصدرين (لا fallback وهمي)
- حذف ملفات seed التجريبية و`promo-demo.html`
- نماذج Excel أصبحت بأسماء «مثال» فقط

### Setup
نفّذ في Supabase SQL Editor:
`supabase/migrations/075_reset_school_data.sql`

### Files Modified
- `supabase/migrations/075_reset_school_data.sql`
- `src/lib/resetSchoolData.ts`
- `src/components/principal/DatabaseResetPanel.tsx`
- `src/components/principal/AcademicYearPanel.tsx`
- `src/pages/LoginPage.tsx`
- `src/pages/leaderboard/LeaderboardBoardPage.tsx`
- `src/pages/leaderboard/LeaderboardDisplayPage.tsx`
- `src/lib/qa/catalog.ts` + `src/pages/qa/QaSimulatorPage.tsx`
- `src/lib/studentImport.ts` + `src/lib/attendanceImport.ts`
- `src/components/users/BulkAccountGenerator.tsx`
- `src/lib/errors.ts`
- حذف: `public/promo-demo.html`, `supabase/seed/demo_*.sql`, `supabase/seed-demo-users.sql`
- `VERSION.md`

### Version bump
- **v1.16.1 → v1.17.0** (Minor — أداة صيانة + تنظيف بيانات تجريبية)

### Restore ZIP
`Versions/2026-07-31_v1.16.1_BeforeDbResetAndDemoCleanup.zip`

---

## Version: v1.16.1
**Date:** 2026-07-31

### Changes
- تسجيل الطالب لم يعد حراً: يعتمد على **رفع الإدارة** ثم التحقق برقم الهوية
- بعد التحقق تظهر بيانات الطالب (الاسم/الصف/الفصل) ويكمل بإدخال رقم الجوال فقط
- الرفع الجماعي يحفظ `national_id` مع رقم الهوية
- إزالة إنشاء سجل طالب عند التسجيل العام

### Setup
نفّذ في Supabase SQL Editor:
`supabase/migrations/074_student_claim_by_national_id.sql`
(بعد تنفيذ 073 إن لم يُنفَّذ)

### Files Modified
- `supabase/migrations/074_student_claim_by_national_id.sql`
- `src/lib/familyOnboarding.ts`
- `src/pages/OnboardingPage.tsx`
- `src/pages/RegisterPage.tsx`
- `src/pages/principal/BulkUploadPage.tsx`
- `src/lib/auth.ts`
- `src/lib/errors.ts`
- `VERSION.md`

### Version bump
- **v1.16.0 → v1.16.1** (Patch — تأمين تسجيل الطلاب)

---

## Version: v1.16.0
**Date:** 2026-07-31

### Changes
- إكمال الحساب بعد التسجيل/Google: اختيار الدور (طالب / ولي أمر)
- للطالب: اسم، صف، فصل، جوال، هوية → إنشاء **كود ربط** لأولياء الأمور
- لولي الأمر: إدخال كود الطالب ثم الاسم والجوال والهوية (مع دعم أكثر من طالب)
- صفحة `/parent/link-child` لربط أبناء إضافيين
- تبويب **الطلاب وأولياء الأمور** في إدارة المستخدمين (نسخ/واتساب/إعادة توليد الكود)
- Migration `073_family_onboarding.sql`

### Setup
نفّذ في Supabase SQL Editor محتوى:
`supabase/migrations/073_family_onboarding.sql`

### Files Modified
- `supabase/migrations/073_family_onboarding.sql`
- `src/lib/familyOnboarding.ts`
- `src/lib/auth.ts`
- `src/stores/authStore.ts`
- `src/pages/OnboardingPage.tsx`
- `src/router/OnboardingGate.tsx` + `src/router/index.tsx`
- `src/components/users/FamilyDirectoryPanel.tsx`
- `src/pages/admin/AdminUsersHub.tsx`
- `src/pages/principal/UsersPage.tsx`
- `src/pages/parent/ParentLinkChildPage.tsx`
- `src/types/database.types.ts` + `src/types/index.ts`
- `VERSION.md`

### Version bump
- **v1.15.0 → v1.16.0** (Minor — ميزة onboarding وربط العائلات)

### Restore ZIP
`Versions/2026-07-31_v1.15.0_BeforeFamilyOnboarding.zip`

---

## Version: v1.15.0
**Date:** 2026-07-31

### Changes
- إضافة تسجيل الدخول عبر **Google** في صفحة `/login`
- تخطّي تغيير كلمة المرور الإجباري لحسابات OAuth
- تحديث `handle_new_user` لدعم اسم وصورة Google وعدم فرض أول دخول
- رسائل خطأ عربية عند تعطيل مزوّد Google في Supabase

### Setup (مطلوب على Supabase / Google Cloud)
1. Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client (Web)
2. Authorized redirect URI: `https://<PROJECT_REF>.supabase.co/auth/v1/callback`
3. Supabase → Authentication → Providers → Google → تفعيل + Client ID/Secret
4. Supabase → Authentication → URL Configuration:
   - Site URL = عنوان المنصة
   - Redirect URLs تشمل `http://localhost:5173/login` و`http://localhost:5173/auth/callback` وعنوان الإنتاج
5. نفّذ migration: `supabase/migrations/072_google_oauth_handle_new_user.sql`

### Files Modified
- `src/lib/auth.ts`
- `src/lib/errors.ts`
- `src/stores/authStore.ts`
- `src/pages/LoginPage.tsx`
- `src/pages/LoginPage.css`
- `src/components/auth/GoogleGlyph.tsx`
- `supabase/migrations/072_google_oauth_handle_new_user.sql`
- `.env.example`
- `VERSION.md`

### Version bump
- **v1.14.3 → v1.15.0** (Minor — ميزة تسجيل دخول جديدة)

### Restore ZIP
`Versions/2026-07-31_v1.14.3_BeforeGoogleLogin.zip`

---

## Version: v1.14.3
**Date:** 2026-07-31

### Changes
- إصلاح `Permission denied` عند تشغيل Vite على قرص `/mnt/E` (لا يدعم بت التنفيذ)
- سكربتات npm تستدعي الأدوات عبر `node` بدل ملفات `.bin`

### Files Modified
- `package.json`
- `VERSION.md`

### Version bump
- **v1.14.2 → v1.14.3** (Patch — إصلاح تشغيل التطوير)

---

## Version: v1.14.2
**Date:** 2026-07-25

### Changes
- تشخيص جذري: Service Worker في التطوير كان يخزّن شاشة قديمة غير قابلة للضغط
- تعطيل PWA في وضع التطوير + مسح كاش المسابقة تلقائياً
- الـ APK يجلب وقت الظهور من Supabase مباشرة (لا يعتمد على 8:50 القديم)
- شاشة الفصل: منطق توقيت أوضح + أزرار اختيار تعمل باللمس
- WebView بدون كاش؛ المنفذ 5173 صار `strictPort`
- المدة الافتراضية للجلسة 300 ثانية (5 دقائق)

### Files Modified
- `vite.config.ts`
- `src/pages/competition/ClassScreenPage.tsx`
- `src/pages/competition/AnswerScreenPage.tsx`
- `src/lib/competition/bustCompCache.ts`
- `src/lib/competition/types.ts`
- `src/components/competition/CompetitionOptions.tsx`
- `android-apk/app/src/main/java/sa/elite/competition/**`
- `VERSION.md`

### Version bump
- **v1.14.1 → v1.14.2** (Patch — إصلاح تشغيلي حرج)

### APK
`android-apk/app/build/outputs/apk/release/app-release.apk` (v1.4.0)

---

## Version: v1.14.1
**Date:** 2026-07-25

### Changes
- شاشة الفصل أصبحت **قابلة لاختيار الإجابة** (أزرار + تأكيد)
- تحسين الفتح التلقائي: `setAlarmClock` + إذن المنبّهات الدقيقة + مزامنة الوقت من الويب إلى APK
- عند المنبّه يفتح التطبيق مباشرة على شاشة السؤال للإجابة

### Files Modified
- `src/pages/competition/ClassScreenPage.tsx`
- `android-apk/app/src/main/java/sa/elite/competition/**`
- `VERSION.md`

### Version bump
- **v1.14.0 → v1.14.1** (Patch)

### APK
`android-apk/app/build/outputs/apk/release/app-release.apk`

---

## Version: v1.14.0
**Date:** 2026-07-25

### Changes
- إزالة الشخصية الكارتونية من شاشة الفصل
- إزالة توليد/معاينة الصوت (ElevenLabs) من لوحة المسابقة
- المؤقت يعرض **الوقت المتبقي** حتى نهاية نافذة الإجابة (لا يُعاد من الصفر عند الدخول المتأخر)
- أيقونة التطبيق من `public/icon.jpeg`
- بناء **APK إصدار release موقّع** (وليس debug)

### Files Modified
- `src/pages/competition/ClassScreenPage.tsx`
- `src/pages/competition/CompAdminPage.tsx`
- `src/lib/competition/index.ts` (حذف elevenlabs)
- `src/components/competition/**`
- `android-apk/**`
- `VERSION.md`

### Version bump
- **v1.13.0 → v1.14.0** (Minor)

### APK Release
`android-apk/app/build/outputs/apk/release/app-release.apk`

---

## Version: v1.13.0
**Date:** 2026-07-25

### Changes
- APK: فتح تلقائي يومي عند وقت السؤال (AlarmManager + إشعار) حتى لو التطبيق مغلق
- APK: وضع **شاشة الإجابة** افتراضياً لاختيار الإجابة من الهاتف (شاشة الفصل للعرض فقط)
- إعادة بناء التطبيق بعد الإعدادات

### Files Modified
- `android-apk/**`
- `VERSION.md`

### Version bump
- **v1.12.4 → v1.13.0** (Minor — فتح تلقائي + وضع إجابة)

### APK
`android-apk/app/build/outputs/apk/debug/app-debug.apk`

---

## Version: v1.12.4
**Date:** 2026-07-25

### Changes
- السؤال يظهر فقط داخل نافذة الوقت المحددة (قبلها عدّاد · بعدها انتهاء)
- إخفاء نص السؤال في شاشة الإجابة قبل الموعد
- تعطيل الوضع التجريبي افتراضياً في الـ APK (`?demo=1` كان يتجاوز الوقت)

### Files Modified
- `src/lib/competition/time.ts`
- `src/pages/competition/ClassScreenPage.tsx`
- `src/pages/competition/AnswerScreenPage.tsx`
- `android-apk/app/src/main/java/sa/elite/competition/SetupActivity.kt`
- `android-apk/app/src/main/res/layout/activity_setup.xml`
- `VERSION.md`

### Version bump
- **v1.12.3 → v1.12.4** (Patch)

---

## Version: v1.12.3
**Date:** 2026-07-25

### Changes
- إصلاح رسالة خطأ مضللة عند حفظ سؤال المسابقة: تكرار التاريخ لم يعد يظهر كـ «بريد مستخدم مسبقاً»

### Files Modified
- `src/lib/errors.ts`
- `src/lib/competition/api.ts`
- `VERSION.md`

### Version bump
- **v1.12.2 → v1.12.3** (Patch)

---

## Version: v1.12.2
**Date:** 2026-07-25

### Changes
- إصلاح شاشة الفصل: السؤال يظهر فقط داخل نافذة الوقت المحددة من الإدارة
- قبل الموعد → عدّاد انتظار · بعد انتهاء النافذة → رسالة انتهاء (بدون إعادة العرض)
- عدم استخدام وقت 8:50 الافتراضي قبل تحميل إعدادات السيرفر

### Files Modified
- `src/pages/competition/ClassScreenPage.tsx`
- `src/hooks/competition/useCompSettings.ts`
- `src/pages/competition/AnswerScreenPage.tsx`
- `VERSION.md`

### Version bump
- **v1.12.1 → v1.12.2** (Patch — إصلاح توقيت الظهور)

---

## Version: v1.12.1
**Date:** 2026-07-25

### Changes
- استخدام شخصية أولمبياد النخبة (`public/i.jpeg`) في شاشة الفصل بدل SVG الافتراضي

### Files Modified
- `src/components/competition/CompetitionMascot.tsx`
- `public/mascot/teacher.jpeg` (نسخة من i.jpeg)
- `public/mascot/README.md`
- `VERSION.md`

### Version bump
- **v1.12.0 → v1.12.1** (Patch — أصول الشخصية)

---

## Version: v1.12.0
**Date:** 2026-07-25

### Changes
- وقت ظهور السؤال **قابل للتعديل من الإدارة** (ساعة/دقيقة + مدد العرض) عبر جدول `comp_settings`
- تحسين شاشة `/competition/admin`: تبويبات (وقت الظهور · سؤال · قائمة · روابط)
- تطبيق Android APK لعرض شاشة الفصل على الهاتف (`android-apk/`)
- الشاشات العامة تقرأ التوقيت من الإعدادات بدل 8:50 الثابت

### Files Modified
- `supabase/migrations/071_comp_settings.sql` (new)
- `src/lib/competition/**`
- `src/hooks/competition/useCompSettings.ts` (new)
- `src/pages/competition/CompAdminPage.tsx`
- `src/pages/competition/ClassScreenPage.tsx`
- `src/pages/competition/AnswerScreenPage.tsx`
- `android-apk/**` (new)
- `VERSION.md`

### Version bump
- **v1.11.0 → v1.12.0** (Minor — توقيت إداري + APK تجريبي)

### Restore
- `Versions/2026-07-25_v1.12.0_CompScheduleAndApk.zip`

### Migration مطلوب على Supabase
- `071_comp_settings.sql`

### APK
```powershell
cd android-apk
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew.bat assembleDebug
# الناتج: app/build/outputs/apk/debug/app-debug.apk
```

---

## Version: v1.11.0
**Date:** 2026-07-25

### Changes
- وحدة **المسابقة الفصلية اليومية** داخل ERB Elite على جداول `comp_*`
- مسارات عامة: `/class/:slug` · `/answer/:slug` · `/competition/leaderboard`
- لوحة إدارة: `/competition/admin` (مدير / رائد نشاط / مدير مدرسة)
- ElevenLabs لتوليد ومعاينة صوت الأسئلة + رفع إلى Storage `question-audio`
- نقاط المسابقة منفصلة عن الأولمبياد (`comp_scores`) — الدمج لاحقاً
- بدون APK في هذه المرحلة

### Files Modified
- `src/lib/competition/**` (new)
- `src/hooks/competition/**` (new)
- `src/components/competition/**` (new)
- `src/pages/competition/**` (new)
- `src/router/index.tsx`
- `src/types/index.ts`
- `src/layouts/AppLayout.tsx`
- `src/lib/teacherMode.ts`
- `public/mascot/README.md` (new)
- `.env.example` (new/updated)
- `VERSION.md`

### Version bump
- **v1.10.0 → v1.11.0** (Minor — ميزة المسابقة الفصلية)

### Restore
- `Versions/2026-07-25_v1.11.0_DailyCompetitionModule.zip`

### Migration
- يتطلب تطبيق `supabase/migrations/039_daily_competition.sql` إن لم يُطبَّق مسبقاً

### Env
- `VITE_ELEVENLABS_API_KEY`
- `VITE_ELEVENLABS_VOICE_ID`

---

## Version: v1.10.0
**Date:** 2026-07-25

### Changes
- تطبيق معايير تصميم Chapter 3 على **كل** الـ Chapters (1–14)
- Lucide SVG بدل أي إيموجي، SignatureBackground (نجوم) في كل مشهد
- تنويع layouts: نص+أيقونة، شبكة كروت، timeline، قوائم، تدفق، أشرطة حية
- التحقق من تسلسل الإطارات بدون فجوات (0→19800)

### Files Modified
- `ELite/src/full-video/chapters/*`
- `ELite/src/full-video/components/InfoCard.tsx`
- `ELite/src/full-video/components/SceneWrapper.tsx`
- `ELite/src/full-video/SamplePreview.tsx`
- `VERSION.md`

### Version bump
- **v1.9.3 → v1.10.0** (Minor — توحيد تصميم كل المشاهد)

### Restore
- `Versions/2026-07-25_v1.10.0_AllChaptersMGRedesign.zip`

---

## Version: v1.9.3
**Date:** 2026-07-25

### Changes
- استبدال خلفية الـ grid بـ **SignatureBackground** (كوكبة نجوم)
- Pulse عشوائي لكل نجمة + نقاط ذهبية للتميز
- دمج المكوّن في `SceneWrapper` و`BackgroundLayer` لكل المشاهد

### Files Modified
- `ELite/src/full-video/components/SignatureBackground.tsx` (new)
- `ELite/src/full-video/components/BackgroundLayer.tsx`
- `ELite/src/full-video/components/SceneWrapper.tsx`
- `ELite/src/full-video/components/index.ts`
- `VERSION.md`

### Version bump
- **v1.9.2 → v1.9.3** (Patch — هوية خلفية النخبة)

---

## Version: v1.9.2
**Date:** 2026-07-25

### Changes
- إعادة تصميم **RolesOverview** فقط حسب مواصفات الموشن الجديدة
- بدون إيموجي — أيقونات Lucide SVG
- خلفية: شبكة parallax + أشكال هندسية خفيفة + شريط Accent
- Layout غير متماثل (قائمة أدوار + لوحة تفاصيل)
- Composition معاينة: `RolesOverviewPreview`

### Files Modified
- `ELite/src/full-video/chapters/RolesOverview.tsx`
- `ELite/src/full-video/components/BackgroundLayer.tsx` (new)
- `ELite/src/full-video/components/TitleBlock.tsx` (new)
- `ELite/src/full-video/components/MgIcon.tsx` (new)
- `ELite/src/full-video/index.tsx`
- `ELite/package.json`
- `VERSION.md`

### Version bump
- **v1.9.1 → v1.9.2** (Patch — عيّنة تصميم Chapter 3)

### Restore
- `Versions/2026-07-25_v1.9.2_RolesOverviewRedesign.zip`

---

## Version: v1.9.1
**Date:** 2026-07-25

### Changes
- إكمال الـ 14 Chapter في `FullVideo` حسب الخطة (~11 دقيقة / 19800 frame)
- ربط التسلسل من Intro حتى Outro مع نظام النقاط والأدوار ورحلة اليوم

### Files Modified
- `ELite/src/full-video/chapters/**` (new)
- `ELite/src/full-video/FullVideo.tsx`
- `VERSION.md`

### Version bump
- **v1.9.0 → v1.9.1** (Patch — إكمال Chapters الفيديو)

### Preview
- Studio → Composition **FullVideo** (بدون تصدير كامل الآن)

---

## Version: v1.9.0
**Date:** 2026-07-25

### Changes
- بدء تنفيذ خطة الفيديو التعليمي الكامل (~11 دقيقة) حسب `Docs/خطة-فيديو-اولمبياد-النخبة.md`
- Setup الأساس فقط: `theme` + مكونات مشتركة + `FullVideo` + عيّنة `SamplePreview` (ثانيتان)
- الخط Cairo عبر `@remotion/google-fonts`

### Files Modified
- `Docs/خطة-فيديو-اولمبياد-النخبة.md` (copied)
- `ELite/src/full-video/**` (new)
- `ELite/src/Root.tsx`
- `ELite/package.json`
- `VERSION.md`

### Version bump
- **v1.8.4 → v1.9.0** (Minor — أساس فيديو FullVideo)

### Restore
- `Versions/2026-07-25_v1.9.0_FullVideoFoundation.zip`

### Next
- Chapter 1 Intro فقط في رسالة لاحقة (حسب استراتيجية الخطة)

---

## Version: v1.8.4
**Date:** 2026-07-25

### Changes
- إضافة دليل عربي شامل يشرح المنصة بالكامل لكل الأدوار

### Files Modified
- `Docs/شرح-المنصة-الكامل.md` (new)
- `VERSION.md`

### Version bump
- **v1.8.3 → v1.8.4** (Patch — توثيق المنصة)

---

## Version: v1.8.3
**Date:** 2026-07-25

### Changes
- إعادة بناء الموشن بالكامل: رسالة واحدة في كل لقطة (chapter → عنوان → سطر)
- إزالة الجزيئات/المسح الضوئي/الانتقالات الصاخبة
- خلفية كحلية هادئة + ذهبي هادئ
- انتقالات fade فقط بإيقاع أبطأ

### Files Modified
- `ELite/src/platform-explainer/SceneFrame.tsx`
- `ELite/src/platform-explainer/SoftAtmosphere.tsx`
- `ELite/src/platform-explainer/PlatformExplainer.tsx`
- `ELite/src/platform-explainer/scenes.ts`
- `VERSION.md`

### Version bump
- **v1.8.2 → v1.8.3** (Patch — إعادة تصميم جذرية للإيقاع البصري)

---

## Version: v1.8.2
**Date:** 2026-07-25

### Changes
- استبدال العلامة بـ **أولمبياد النخبة 144هـ**
- لوحة ألوان سينمائية جديدة (ليلي نبيذي + ذهبي + تدرجات حسب الدور)
- انتقالات متنوعة: fade / slide / wipe
- لمسات إبداعية: عناوين كلمة بكلمة، وميض العلامة، غبار ضوئي، مسح إضاءة ناعم

### Files Modified
- `ELite/src/platform-explainer/scenes.ts`
- `ELite/src/platform-explainer/SceneFrame.tsx`
- `ELite/src/platform-explainer/SoftAtmosphere.tsx`
- `ELite/src/platform-explainer/PlatformExplainer.tsx`
- `ELite/README.md`
- `VERSION.md`

### Version bump
- **v1.8.1 → v1.8.2** (Patch — هوية وموشن محسّنان)

---

## Version: v1.8.1
**Date:** 2026-07-25

### Changes
- إعادة تصميم فيديو الشرح كموشن جرافيك سينمائي (طباعة + إضاءة ناعمة)
- إزالة الشبكات/الأشكال الهندسية/الصناديق والحدود
- انتقالات fade ناعمة بين المشاهد (`@remotion/transitions`)
- بدون تصدير — للمعاينة في Remotion Studio

### Files Modified
- `ELite/src/platform-explainer/SceneFrame.tsx`
- `ELite/src/platform-explainer/SoftAtmosphere.tsx` (new)
- `ELite/src/platform-explainer/PlatformExplainer.tsx`
- `ELite/package.json`
- `VERSION.md`

### Version bump
- **v1.8.0 → v1.8.1** (Patch — تحسين تصميم الموشن)

### Restore
- `Versions/2026-07-25_v1.8.1_MotionGraphicsRedesign.zip`

---

## Version: v1.8.0
**Date:** 2026-07-25

### Changes
- فيديو شرح تفصيلي للمنصة لكل الأدوار عبر Remotion (`ELite/`)
- Composition: `PlatformExplainer` (11 مشهداً + سكربت VO عربي)
- سكربت ElevenLabs لتوليد التعليق الصوتي ومزامنة المدة تلقائياً
- توثيق المعاينة والتصدير في `ELite/README.md` و `ELite/VOICEOVER.md`

### Files Modified
- `ELite/src/platform-explainer/*` (new)
- `ELite/src/Root.tsx`
- `ELite/src/Composition.tsx`
- `ELite/src/get-audio-duration.ts` (new)
- `ELite/scripts/generate-voiceover.mjs` (new)
- `ELite/package.json`
- `ELite/README.md`
- `ELite/VOICEOVER.md` (new)
- `VERSION.md`

### Version bump
- **v1.7.3 → v1.8.0** (Minor — فيديو شرح المنصة الكامل)

### Restore
- `Versions/2026-07-25_v1.8.0_PlatformExplainerVideo.zip`

---

## Version: v1.7.3
**Date:** 2026-07-13

### Changes
- إصلاح ظهور ملف الطالب: سياسة RLS كانت تسبب recursion + ربط `user_id`
- RPC `get_my_student_profile` كاحتياط
- الواجهة تجرّب الجدول ثم الـ RPC

### Files Modified
- `supabase/fix-student-profile-link.sql`
- `src/components/student/StudentDashboard.tsx`
- `src/pages/student/MyProfilePage.tsx`
- `VERSION.md`

### Version bump
- **v1.7.2 → v1.7.3** (Patch — إصلاح ملف تعريف الطالب)

---

## Version: v1.7.2
**Date:** 2026-07-13

### Changes
- **بذرة تجربة طالب كاملة**: نقاط (~450)، حضور، متصدرون، شهادات، متجر مكافآت، اختبارات
- صلاحيات RLS للطالب: رؤية زملاء الفصل + النقاط المعتمدة للترتيب + نقاط الفصول
- ملف: `supabase/seed/demo_student_full_experience.sql`

### Files Modified
- `supabase/seed/demo_student_full_experience.sql` (new)
- `supabase/fix-student-login-now.sql`
- `VERSION.md`

### Version bump
- **v1.7.1 → v1.7.2** (Patch — بيانات عرض كاملة لحساب الطالب)

---

## Version: v1.7.1
**Date:** 2026-07-13

### Changes
- **جولة فيديو كاملة**: سكرول داخل الصفحة + مؤشر يتحرك وينقر + تمييز عناصر (تجربة مستخدم حقيقية)
- **جولة الطالب** مفصّلة لكل شاشاته: لوحتي، أكاديمي، اختبارات، محفظة، مكافآت، متصدرون، ملفي
- **بذرة بيانات تجريبية للطالب**: `supabase/seed/demo_student_promo.sql` (نقاط، حضور، زملاء للترتيب)
- حساب العرض: `student@elite1448.demo` / `Elite1448!`

### Files Modified
- `src/lib/promoTour.ts`
- `src/components/promo/PromoTourOverlay.tsx`
- `src/layouts/AppLayout.tsx` (`data-promo-scroll` على main)
- `supabase/seed/demo_student_promo.sql` (new)
- `public/promo-demo.html`
- `Versions/2026-07-13_v1.7.0_PreFullTourAndStudentDemo.zip`
- `VERSION.md`

### Version bump
- **v1.7.0 → v1.7.1** (Patch — جولة UX كاملة + بيانات طالب تجريبية)

---

## Version: v1.7.0
**Date:** 2026-07-13

### Changes
- **جولة المنصة الحقيقية لتسجيل الفيديو** — بدل الصفحة الوهمية
- المسار `/promo-tour` يفعّل جولة تلقائية على الشاشات الفعلية حسب دور الحساب
- مؤشر ماوس وهمي + شريط تعليقات + شريط تقدّم
- تحكم: Esc إيقاف · مسافة إيقاف مؤقت · ← التالي · H إخفاء لوحة التحكم (لـ OBS)
- حساب المدير يعرض جولة شاملة (نقاط، متصدرون، أكاديمي، تقييم، مستخدمون…)

### Files Modified
- `src/lib/promoTour.ts` (new)
- `src/components/promo/PromoTourOverlay.tsx` (new)
- `src/pages/promo/PromoTourStartPage.tsx` (new)
- `src/router/FirstLoginGate.tsx`
- `src/router/index.tsx`
- `src/components/onboarding/OnboardingProvider.tsx`
- `public/promo-demo.html`
- `Versions/2026-07-13_v1.6.2_PreRealPromoTour.zip`
- `VERSION.md`

### Version bump
- **v1.6.2 → v1.7.0** (Minor — جولة فيديو على المنصة الحقيقية)

---

## Version: v1.6.2
**Date:** 2026-07-13

### Changes
- **صفحة عرض تعريفي** `promo-demo.html` لتسجيل فيديو موشن جرافيك عن منصة North Elite
- تبويبات: طالب / معلم / ولي أمر مع بيانات وهمية
- أنيميشن GSAP + عدّاد أرقام تصاعدي + مؤشر ماوس وهمي يتنقّل تلقائياً
- هوية بصرية RTL (Tajawal) جاهزة لتسجيل OBS

### Files Modified
- `public/promo-demo.html` (new)
- `Versions/2026-07-13_v1.6.1_PrePromoDemo.zip` (restore point)
- `VERSION.md`

### Version bump
- **v1.6.1 → v1.6.2** (Patch — صفحة عرض تسويقي لتسجيل الفيديو)

---

## Version: v1.6.1
**Date:** 2026-07-06

### Changes
- **رابط شاشة كبيرة منفصل** `/display/leaderboard` — يعرض لوحة المتصدرين فقط (طلاب + فصول) بملء الشاشة
- بدون قوائم جانبية أو تحدي الأسبوع أو أزرار تحكم
- **عام** — لا يتطلب تسجيل دخول (RPC `display_leaderboard`)
- تحديث تلقائي كل 60 ثانية

### Files Modified
- `supabase/migrations/070_public_leaderboard_display.sql` (new)
- `src/pages/leaderboard/LeaderboardBoardPage.tsx` (new)
- `src/lib/leaderboardDisplay.ts` (new)
- `src/router/index.tsx`
- `src/components/admin/Leaderboard.tsx`
- `src/components/admin/AdminDashboard.tsx`
- `src/lib/qa/catalog.ts`

### Version bump
- **v1.6.0 → v1.6.1** (Patch — رابط شاشة كبيرة للوحة فقط)

### Migration مطلوب على Supabase
- `070_public_leaderboard_display.sql`

---

## Version: v1.6.0
**Date:** 2026-07-03

### Changes
- **نظام تقييم المعلمين** — بنود قابلة للتخصيص مقسمة إلى محاور (إجمالي 100 درجة)
- **أوزان مصادر التقييم**: مدير 50% · وكيل/مشرف 20% · طلاب 15% · أولياء 10% · ذاتي 5%
- تقييم بنجوم 1–5 أو درجة مباشرة أو يدوي (استبيانات خارج المنصة)
- **لوحة متصدرين** + **معلم الشهر** + خصومات (غياب، تأخير، شكاوى، مخالفات)
- تقرير لكل معلم: نقاط القوة، بنود التحسين، سجل تراكمي
- صفحات: المدير (إعداد + تقييم الشهر) · المعلم (ذاتي + تقرير) · الوكيل/المشرف (تقييم 20%)

### Files Modified
- `supabase/migrations/068_teacher_evaluation.sql` (new)
- `src/lib/teacherEvaluation/*` (new)
- `src/components/teacherEvaluation/*` (new)
- `src/pages/principal/evaluation/*` (new)
- `src/pages/teacher/TeacherEvaluationPage.tsx` (new)
- `src/pages/academic/DeputyTeacherEvaluationPage.tsx` (new)
- `src/router/index.tsx`, `src/types/index.ts`, `src/lib/teacherMode.ts`

### Version bump
- **v1.5.5 → v1.6.0** (Minor — ميزة تقييم المعلمين)

### Migration مطلوب على Supabase
- `068_teacher_evaluation.sql`

---

## Version: v1.5.5
**Date:** 2026-07-03

### Changes
- **مواعيد الأسابيع** — توليد تلقائي لـ 20/22 أسبوع بـ **5 أيام دراسية** لكل أسبوع (بدل 7 أيام تقويمية)
- ثابت `SCHOOL_DAYS_PER_WEEK = 5` في الإعدادات الأكاديمية

### Files Modified
- `src/lib/academic/constants.ts`
- `src/lib/academic/semesterWeekCalendar.ts`
- `src/components/academic/SemesterWeekCalendarEditor.tsx`

### Version bump
- **v1.5.4 → v1.5.5** (Patch — تصحيح حساب أيام الأسبوع في التوليد التلقائي)

---

## Version: v1.5.4
**Date:** 2026-07-03

### Changes
- **تبديل الوضع للمدير** — نفس زرّي «وضع أولمبياد» و«وضع أكاديمي» للمعلم:
  - القائمة الجانبية تُصفّى حسب الوضع (أولمبياد: تنفيذية، مستخدمين، تقارير... | أكاديمي: مراقبة، شؤون أكاديمية، تصدير...)
  - لوحة المدير تعرض إحصائيات وإجراءات الوضع المختار فقط
  - يُحفظ الاختيار تلقائياً

### Files Modified
- `src/lib/teacherMode.ts` (دعم مسارات المدير + `roleUsesAppMode`)
- `src/layouts/AppLayout.tsx`
- `src/pages/principal/PrincipalDashboard.tsx`

### Version bump
- **v1.5.3 → v1.5.4** (Patch)

---

## Version: v1.5.3
**Date:** 2026-07-03

### Changes
- **صفحة تصدير الخطة الأسبوعية (المدير/الوكيل)** — نفس عرض المراقبة الكامل:
  - جلب جداول كل المعلمين مع أسمائهم
  - جدول كامل لكل الأيام والحصص (مُدخلة / فارغة / لا حصة)
  - الضغط على الحصة الفارغة يُظهر اسم المعلم المسؤول الذي لم يُدخل موضوعها
  - شارات: `مُدخلة/مجدولة` + عدد الحصص الفارغة + أسماء المساهمين

### Files Modified
- `src/lib/academic/classScheduleSlots.ts` (new — مشترك)
- `src/components/academic/WeeklyPlanFullGrid.tsx` (new — `WeeklyPlanMonitorView`)
- `src/components/academic/WeeklyPlanHistoryCard.tsx` (refactor)
- `src/pages/academic/AcademicExportPage.tsx`
- `src/pages/academic/AcademicWeeklyPlansPage.tsx`

### Version bump
- **v1.5.2 → v1.5.3** (Patch — جدول كامل في تصدير الخطة للمدير)

---

## Version: v1.5.2
**Date:** 2026-07-03

### Changes
- **تبديل وضع المعلم** — زرّان: «وضع أولمبياد» و«وضع أكاديمي»
  - في الوضع الأول: القائمة الجانبية والرئيسية تعرض أولمبياد النقاط فقط (منح، طلاب، تحليلات...)
  - في الوضع الثاني: القائمة والرئيسية تعرض الشؤون الأكاديمية فقط (واجبات، خطط، جدول...)
  - يُحفظ الاختيار تلقائياً ويُعاد توجيه المعلم للرئيسية عند التبديل من صفحة لا تنتمي للوضع الجديد

### Files Modified
- `src/lib/teacherMode.ts` (new)
- `src/stores/teacherModeStore.ts` (new)
- `src/components/teacher/TeacherModeToggle.tsx` (new)
- `src/layouts/AppLayout.tsx`
- `src/pages/teacher/TeacherDashboard.tsx`

### Version bump
- **v1.5.1 → v1.5.2** (Minor — تبديل وضع المعلم)

---

## Version: v1.5.1
**Date:** 2026-07-03

### Changes
- **حذف الشريط السفلي للجوال** بالكامل (التنقل عبر زر القائمة العلوي)
- **إصلاح «وصول مرفوض»** على المركز الأكاديمي/الخطط/الواجبات — كان بسبب تكرار مسارات التوجيه بين المشرف والطاقم؛ دُمجت الصفحات المشتركة لكل الأدوار الأكاديمية
- **إزالة صورة «قالب رسمي»** من كل بطاقة في صفحة تصدير القوالب
- **الخطة الأسبوعية — جدول كامل**: عرض كل الأيام وكل الحصص بدل المكتملة فقط
  - تمييز الحصص الفارغة (المجدولة لكنها غير مُدخلة)
  - **زر عند الحصة الفارغة يُظهر اسم المعلم المسؤول** الذي لم يُدخل موضوعها
  - شارة عدد الحصص الفارغة ومفتاح ألوان توضيحي

### Files Modified
- `src/layouts/AppLayout.tsx` (حذف الشريط السفلي)
- `src/components/layout/MobileBottomNav.tsx` (حُذف)
- `src/index.css`
- `src/router/index.tsx` (إصلاح تكرار المسارات)
- `src/pages/academic/AcademicExportPage.tsx` (إزالة صورة القالب)
- `src/components/academic/WeeklyPlanHistoryCard.tsx` (الجدول الكامل + الحصص الفارغة)
- `src/lib/academic/weeklyPlanHelpers.ts` (`buildWeeklyGrid`)
- `src/lib/academic/teacherService.ts` (`listAllSchedulesWithTeacher`)
- `src/pages/academic/AcademicWeeklyPlansPage.tsx` (تمرير جداول الفصل للبطاقة)

### Version bump
- **v1.5.0 → v1.5.1** (Patch — إصلاحات + تحسين عرض الخطة)

---

## Version: v1.5.0
**Date:** 2026-07-02

### Changes
- **خطة أسبوعية مشتركة للفصل** — صف واحد لكل (فصل + أسبوع) بدل خطة منفصلة لكل معلم
- **كل معلم يعدّل حصصه فقط** داخل الخطة المشتركة (حسب جدوله الدراسي)
- **منع التعارض** — تحذير عند الحفظ إذا الحصة محجوزة لمعلم آخر مع ذكر اسمه (واجهة + قاعدة بيانات)
- ترحيل البيانات القديمة: دمج الخطط المكررة وإضافة `teacher_id` لكل حصة
- RPC `save_class_weekly_plan_slots` للحفظ الآمن عبر RLS

### Files Modified
- `supabase/migrations/067_shared_weekly_plans.sql` (new)
- `src/lib/academic/weeklyPlanService.ts`
- `src/lib/academic/weeklyPlanHelpers.ts` (new)
- `src/lib/academic/types.ts`
- `src/lib/academic/adminService.ts`
- `src/pages/academic/AcademicWeeklyPlansPage.tsx`
- `src/components/academic/WeeklyPlanHistoryCard.tsx`
- `src/pages/student/StudentAcademicPage.tsx`

### Version bump
- **v1.4.2 → v1.5.0** (Minor — ميزة خطة مشتركة + منع تعارض الحصص)

### Migration مطلوب على Supabase
- `067_shared_weekly_plans.sql`

---

## Version: v1.4.2
**Date:** 2026-07-02

### Changes
- **إصلاح مظهر الجداول على الجوال**:
  - مكوّن `AcademicDataView` — جدول على الحاسب + **بطاقات على الجوال**
  - نتائج اختبارات المرحلة → بطاقات على الجوال
  - الخطة الأسبوعية للطالب → بطاقات مجمّعة حسب اليوم
  - تحسين عام لكل الجداول: تقليل الحشو والخط + تمرير أفقي نظيف على الشاشات الصغيرة

### Files Modified
- `src/components/academic/AcademicUi.tsx` (AcademicDataView)
- `src/pages/academic/DeputyExamResultsPage.tsx`
- `src/pages/student/StudentAcademicPage.tsx`
- `src/index.css`

### Version bump
- **v1.4.1 → v1.4.2** (Patch — إصلاح مظهر الجداول)

---

## Version: v1.4.1
**Date:** 2026-07-02

### Changes
- **تحسين شامل لواجهة الجوال**:
  - شريط تنقل سفلي ثابت (أهم 4 روابط + «المزيد»)
  - تقليل الحشو المزدوج وتحسين العناوين والأزرار على الشاشات الصغيرة
  - حقول إدخال وأزرار بارتفاع لمس 48px
  - جداول أكاديمية قابلة للتمرير الأفقي
  - بطاقات ولوحات بأحجام متجاوبة (Horizon + Academic)
  - رأس الصفحة مضغوط على الجوال مع إخفاء أزرار ثانوية

### Files Modified
- `src/components/layout/MobileBottomNav.tsx` (new)
- `src/layouts/AppLayout.tsx`
- `src/index.css`
- `src/components/academic/AcademicUi.tsx`
- `src/components/dashboard/horizon/HorizonDashboard.tsx`
- `src/components/ui/Card.tsx`, `PageHeader.tsx`
- `src/pages/teacher/TeacherDashboard.tsx`
- `src/pages/principal/PrincipalDashboard.tsx`
- `src/pages/supervisor/SupervisorDashboard.tsx`
- `src/pages/academic/AcademicStaffHubPage.tsx`, `AcademicHomeworkPage.tsx`

### Version bump
- **v1.4.0 → v1.4.1** (Patch — تحسين تجربة الجوال)

---

## Version: v1.4.0
**Date:** 2026-07-02

### Changes
- **المرحلة 3 — دمج لوحات التحكم والقوائم**:
  - **المعلم**: لوحة موحّدة بقسمين (أولمبياد + أكاديمي) + روابط مباشرة في القائمة الجانبية
  - **المدير**: مؤشرات أكاديمية في الرئيسية (واجبات اليوم، مراجعات، طلبات) + تنبيه معلمين بلا واجب
  - **المشرف**: عرض أكاديمي للقراءة فقط (واجبات، خطط، بحث) + مؤشرات في لوحة المتابعة
  - فصل مسارات المشرف عن مسارات التعديل الأكاديمية

### Files Modified
- `src/lib/unifiedDashboard.ts` (new)
- `src/lib/academic/roleHelpers.ts` (new)
- `src/pages/teacher/TeacherDashboard.tsx`
- `src/pages/principal/PrincipalDashboard.tsx`
- `src/pages/supervisor/SupervisorDashboard.tsx`
- `src/pages/academic/AcademicStaffHubPage.tsx`
- `src/pages/academic/AcademicHomeworkPage.tsx`
- `src/pages/academic/AcademicWeeklyPlansPage.tsx`
- `src/pages/academic/AcademicSearchPage.tsx`
- `src/router/index.tsx`, `src/types/index.ts`
- `src/layouts/AppLayout.tsx`, `src/lib/featureCatalog.ts`

### Version bump
- **v1.3.1 → v1.4.0** (Minor — دمج لوحات النظامين)

### نسخة استرجاع
- `Versions/2026-07-02_v1.3.1_PrePhase3Merge.zip`

---

## Version: v1.3.1
**Date:** 2026-07-02

### Changes
- **المرحلة 2 — بوابات أكاديمية للطالب وولي الأمر + نتائج الوكيل**:
  - **الطالب** `/student/academic`: واجب اليوم + سابق + خطة أسبوعية **لفصله فقط**
  - **ولي الأمر** `/parent/academic/homework`: واجبات **جميع الأبناء** (14 يوماً)
  - **الوكيل** `/academic/exam-results`: ملخص نتائج اختبارات مرحلته (عرض فقط)
  - دوال RPC آمنة: `portal_list_homeworks`, `portal_list_weekly_plans`, `deputy_level_exam_summary`
  - تحويل صيغة الصف (`أول متوسط` / `الأول المتوسط`) داخل قاعدة البيانات

### Files Modified
- `supabase/migrations/066_academic_portal.sql` (new)
- `src/lib/academic/portalService.ts` (new)
- `src/pages/student/StudentAcademicPage.tsx` (new)
- `src/pages/parent/ParentAcademicHomeworkPage.tsx` (new)
- `src/pages/academic/DeputyExamResultsPage.tsx` (new)
- `src/router/index.tsx`, `src/types/index.ts`
- `src/components/student/StudentDashboard.tsx`
- `src/components/parent/ParentDashboard.tsx`
- `src/pages/academic/AcademicStaffHubPage.tsx`

### Version bump
- **v1.3.0 → v1.3.1** (Minor — بوابات أكاديمية)

### مطلوب على Supabase
- تطبيق migration `066_academic_portal.sql`

---

## Version: v1.3.0
**Date:** 2026-07-02

### Changes
- **المرحلة 1 — دمج الأكاديمي مع الأولمبياد (مزامنة تلقائية)**:
  - جدول تحويل الصفوف: أكاديمي ↔ أولمبياد (`أول متوسط` / `الأول المتوسط` …)
  - عند حفظ إعداد الملف التعليمي → مزامنة `teacher_classes` + `teacher_subjects`
  - عند إسناد المدير للمواد → نفس المزامنة
  - دالة RPC `apply_teacher_olympiad_sync` (migration 065)
  - زر «مزامنة كل المعلمين» في إسناد المواد للمدير
  - تحليلات المادة تستخدم صيغة الصف الموحّدة

### Files Modified
- `supabase/migrations/065_academic_olympiad_sync.sql` (new)
- `src/lib/academic/gradeBridge.ts` (new)
- `src/lib/academic/olympiadSyncService.ts` (new)
- `src/lib/academic/teacherService.ts`
- `src/lib/academic/adminService.ts`
- `src/lib/teacherAnalytics.ts`
- `src/pages/principal/academic/PrincipalAcademicAssignmentsPage.tsx`
- `src/pages/teacher/TeacherAnalyticsPage.tsx`

### Version bump
- **v1.2.7 → v1.3.0** (Minor — مزامنة الأنظمة)

### مطلوب على Supabase
- تطبيق migration `065_academic_olympiad_sync.sql`

---

## Version: v1.2.7
**Date:** 2026-07-02

### Changes
- **تحليلات مادتي (المعلم)**: ربط الشاشة بالوحدة الأكاديمية
  - عند غياب الربط في نظام الاختبارات (`teacher_subjects`)، تُشتقّ المواد
    من إسناد المدير الأكاديمي ثم من إعداد المعلم لملفه التعليمي
  - لم تعد تظهر رسالة «لم يُربَط حسابك بمادة» للمعلم الذي أكمل إعداد ملفه
  - رسالة أوضح عند اختيار مادة بلا بيانات اختبارات بعد

### ملاحظة
- الأرقام التفصيلية (المتوسط/المهارات) تتطلب وجود نتائج اختبارات لطلاب
  الفصول في نظام الاختبارات؛ الاشتقاق الأكاديمي يوفّر قائمة المواد فقط

### Files Modified
- `src/lib/teacherAnalytics.ts`
- `src/pages/teacher/TeacherAnalyticsPage.tsx`

### Version bump
- **v1.2.6 → v1.2.7** (Patch — ربط التحليلات بالوحدة الأكاديمية)

---

## Version: v1.2.6
**Date:** 2026-07-02

### Changes
- **قائمة الواجبات للمعلم — تصميم متجاوب**:
  - بطاقات مقروءة على الهاتف (بدل الجدول الأفقي المزدحم)
  - كل بطاقة: المادة + الموضوع + التاريخ + شارات (الصف/الفصول/الصفحات) + أزرار تعديل/حذف
  - يبقى الجدول كما هو على الشاشات الأكبر (md+)

### Files Modified
- `src/pages/academic/AcademicHomeworkPage.tsx`

### Version bump
- **v1.2.5 → v1.2.6** (Patch — تحسين واجهة الهاتف)

---

## Version: v1.2.5
**Date:** 2026-07-02

### Changes
- **إعادة تصميم بطاقة الواجب** في القالب بشكل احترافي:
  - رأس ملوّن يجمع رقم الحصة + اسم المادة + شارة الصفحات (بدل الرقم الطافي)
  - الموضوع في الجسم + نص الواجب في حاوية ملوّنة بارزة بمساحة أكبر
  - اسم المعلم في تذييل خفيف أسفل البطاقة
  - التفاف النص الطويل (`word-break`) بدل قصّه على سطر واحد
  - زوايا مستديرة + ظل خفيف
- رفع الارتفاع الافتراضي للبطاقة (112 → 150) لملء الفراغ وتحسين القراءة

### Files Modified
- `src/lib/academic/exportTemplates.ts`
- `src/lib/academic/exportTemplateConfig.ts`

### Version bump
- **v1.2.4 → v1.2.5** (Patch — تحسين قالب التصدير)

---

## Version: v1.2.4
**Date:** 2026-07-02

### Changes
- **قالب الواجب**: إعادة ترتيب عناصر البطاقة
  - اسم المادة في حاوية ملوّنة أعلى البطاقة (مثل شريط الواجب سابقاً)
  - نص الواجب في جسم البطاقة (مساحة أكبر)
  - اسم المعلم في الشريط السفلي بدل نص الواجب

### Files Modified
- `src/lib/academic/exportTemplates.ts`

### Version bump
- **v1.2.3 → v1.2.4** (Patch — تحسين قالب التصدير)

---

## Version: v1.2.3
**Date:** 2026-07-02

### Changes
- **إعادة تصميم شاشة إعداد الملف التعليمي** بمظهر احترافي:
  - مؤشر خطوات حديث بأيقونات وحالات (نشط/مكتمل)
  - بطاقات اختيار كبيرة بدل الشرائح المسطحة + شرائح للفصول والمواد
  - عنوان ووصف لكل خطوة + شاشة ترحيب محسّنة
  - تحقق قبل الانتقال (لا يمكن التقدّم دون اختيار)
  - ملخص مباشر للاختيارات وعدّاد الخطوات

### Files Modified
- `src/pages/academic/AcademicTeacherSetupPage.tsx`

### Version bump
- **v1.2.2 → v1.2.3** (Patch — تحسين واجهة)

---

## Version: v1.2.2
**Date:** 2026-07-02

### Changes
- **إصلاح**: ظهور «إعداد الملف التعليمي» للمعلم بعد كل نشر/إعادة تحميل
  - السبب: `AcademicSetupGate` كان يوجّه للإعداد أثناء الفجوة التي يكون فيها
    `role = teacher` قبل اكتمال تحميل بيانات المستخدم (`user`)
  - الحل: انتظار تحميل ملف المستخدم قبل قرار التوجيه

### Files Modified
- `src/router/AcademicSetupGate.tsx`

### Version bump
- **v1.2.1 → v1.2.2** (Patch — إصلاح توجيه خاطئ)

---

## Version: v1.2.1
**Date:** 2026-07-02

### Changes
- **الواجب المنزلي**: حقل الموضوع + حقل أرقام الصفحات (واحد أو أكثر) عند إنشاء/تعديل الواجب
- دعم إدخال صفحات متعددة: `45` أو `45، 46` أو نطاق `45-48`
- عرض الصفحات في جدول الواجبات وقالب التصدير

### Files Modified
- `supabase/migrations/064_homework_page_numbers.sql` (new)
- `src/lib/academic/homeworkHelpers.ts` (new)
- `src/lib/academic/types.ts`
- `src/lib/academic/homeworkService.ts`
- `src/lib/academic/exportTemplates.ts`
- `src/pages/academic/AcademicHomeworkPage.tsx`

### Version bump
- **v1.2.0 → v1.2.1** (Patch — تحسين نموذج الواجب)

---

## Version: v1.2.0
**Date:** 2026-06-30

### Changes
- **جدول دراسي كامل**: شبكة أيام × حصص مع إنشاء/تعديل/حذف
- **مواضيع الدروس**: تعديل وحذف حسب المادة والصف
- **تصدير PDF**: معاينة HTML + تصدير واجبات وخطط أسبوعية (html-to-image + jsPDF)
- **تفاصيل التواصل**: `/academic/communication/:id` مع طباعة
- **تقارير الملاحظات**: إنشاء تقرير من طلب ولي أمر + `/academic/reports/:id`
- **إدارة المواد**: تعديل الاسم و«متاح لأولياء الأمور»
- **إدارة الموظفين**: تعيين مرحلة الوكيل (`staff_education_level`)
- **إسناد المواد** + **مراقبة نشاط المعلمين** في `/principal/academic/*`
- **قائمة الوكيل**: مراجعات، تقارير، تواصل
- **featureCatalog**: دور `deputy` + ودجات أكاديمية

### Files Modified
- `src/pages/academic/*` (Schedule, Export, Reports, Communication, LessonTopics, detail pages)
- `src/pages/principal/academic/*` (Hub, Subjects, Staff, Assignments, Monitoring)
- `src/lib/academic/adminService.ts`, `exportService.ts`
- `src/router/index.tsx`, `src/types/index.ts`, `src/lib/featureCatalog.ts`

### Version bump
- **v1.1.0 → v1.2.0** (Minor — إكمال ميزات الشؤون الأكاديمية)

---

## Version: v1.1.0
**Date:** 2026-06-30

### Changes
- دمج وحدة **الشؤون الأكاديمية** من `school-management-react` في ERB Elite
- إضافة دور **الوكيل** (`deputy`) مع صلاحيات المرحلة
- جداول أكاديمية جديدة: واجبات، خطط أسبوعية، جداول، مواضيع، مراجعات PDF، تقارير ملاحظات، تواصل
- مسارات `/academic/*` للمعلم والوكيل والمدير
- مسارات `/principal/academic/*` للإدارة الأكاديمية
- دمج بوابة ولي الأمر: طلب ملاحظة + مراجعات بكود تفعيل
- معالج إعداد المعلم `/academic/teacher-setup`
- مراجعات PDF منفصلة عن اختبارات أولمبياد (`/exams`)

### Files Modified
- `supabase/migrations/055_academic_staff_module.sql` (new)
- `src/lib/academic/*` (new)
- `src/pages/academic/*` (new)
- `src/pages/principal/academic/*` (new)
- `src/pages/parent/ParentAcademic*.tsx` (new)
- `src/router/index.tsx`, `src/router/AcademicSetupGate.tsx`
- `src/types/index.ts`, `src/types/database.types.ts`
- `src/lib/auth.ts`, `src/lib/featureCatalog.ts`
- `src/pages/DashboardPage.tsx`, `src/pages/teacher/TeacherDashboard.tsx`
- `src/components/parent/ParentDashboard.tsx`
- `Versions/2026-06-30_v1.0.0_PreAcademicMerge.zip` (restore point)

### Version bump
- **v1.0.0 → v1.1.0** (Minor — ميزات جديدة للموظفين وأولياء الأمور)

---

## Version: v1.0.0
**Date:** 2026-06-29

### Changes
- **MIGRATION**: Moved from `E:\Attendance\ERB Elite` to standalone `E:\ERB Elite`.
- Initial snapshot taken before GitHub push.
- Restore Point created at `Versions/2026-06-29_v1.0.0_InitialSnapshot.zip` (2691.2 KB, 1010 files).
- Project description: **School ERP system — React 19 + TypeScript + Vite + Supabase**

### Migration Notes
- **Previous location**: `E:\Attendance\ERB Elite`
- **New location**: `E:\ERB Elite`
- **Reason**: Project extracted from parent Flutter `Attendance/` to be standalone.
- **Pre-migration Restore Point**: `E:\Attendance\Versions\2026-06-29_v1.0.0_PreErpEliteMigration.zip` (4.96 MB, 760 files).

### Files Modified
- `Versions/2026-06-29_v1.0.0_InitialSnapshot.zip` (new — Restore Point)
- `VERSION.md` (new)

### GitHub
- Repo target: `https://github.com/MostafaAhmed71/ERB-Elite`
- Visibility: Public (for freelancing portfolio)

---

## Previous History
- Project originally developed inside `E:\Attendance\` as a sub-folder.
- See `README.md` for the full project documentation.
