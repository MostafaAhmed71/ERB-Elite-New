# تدقيق المسارات والـ Redirects — UX Phase 11

تاريخ التجميد: **2026-08-01** · إصدار الإغلاق: **v2.0.0**

هذا الملحق يثبت الوجهات النهائية بعد مبادرة UX Modernization v2.0.
لا تُحذف صفحات قديمة في نفس الدفعة؛ يُفضَّل `Navigate replace` للإبقاء على الإشارات المرجعية.

## Redirects المعتمدة في `src/router/index.tsx`

| مسار قديم / اختصار | الوجهة النهائية | ملاحظة |
|--------------------|-----------------|--------|
| `/admin/users` tab bulk (مسار مساعد) | `/admin/users?tab=bulk` | إنشاء جماعي |
| `/analytics` (بدون تبويب) | `/analytics/class` | Hub المشرف |
| مسار امتحانات طالب مختصر | `/student/exams` | توحيد المدخل |
| مسار ولي أمر مختصر للواجب | `/parent/academic/homework` | داخل Hub الأكاديمي |

## مداخل Hub الأساسية (بدون كسر URL الفرعي)

| المدخل | الجمهور | الوجهة |
|--------|---------|--------|
| `/analytics/*` | مشرف (+ أدوار مخوّلة) | Supervisor Analytics Hub |
| `/parent/academic/*` | ولي أمر | Parent Academic Hub |
| `/academic` / `/academic/templates` | طاقم أكاديمي | Staff hub + قوالب |
| `/points` | admin / activity_leader | Points Hub |
| `/dev/*` | `platform_developer` فقط | DevLayout — لا يظهر في ROLE_NAV المدرسي |

## تنقل الجوال (Phase 9)

شريط `MobileRoleDock` لأدوار: teacher، parent، student، principal، admin، activity_leader، supervisor، deputy.  
لا يظهر داخل `/dev`.

## قواعد ما بعد التجميد

1. أي مسار جديد للمدرسة يمر عبر ROLE_NAV + FeatureGate عند الحاجة.
2. أدوات خطرة تبقى تحت `/dev` فقط.
3. تحديث هذا الملف عند إضافة Redirect دائم جديد.
4. مصدر الحقيقة للسياق: `Docs/AI_PLATFORM_CONTEXT.md` + `Docs/SCHOOL_PLATFORM_ROADMAP.md`.
