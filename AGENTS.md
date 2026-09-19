# ERB Elite — Agent Guidelines & Mandatory Policies

## 1. Mandatory Pre-Modification Full Backup Policy (قاعدة النسخ الاحتياطي الإلزامي)

> [!CRITICAL]
> **قبل إجراء أي تعديل كبير في المشروع (Major Modification / Architecture Change / Batch Refactoring / DB Migrations / Version Rollback):**
>
> 1. **أخذ نسخة احتياطية كاملة للمشروع فوراً ودائماً:**
>    يجب على المساعد الذكي تشغيل أمر أخذ نسخة احتياطية كاملة لجميع ملفات المشروع وحفظها في مجلد `Versions/` قبل لمس أو تعديل أي سطر برمجي:
>    ```bash
>    git archive -o "Versions/YYYY-MM-DD_v<VERSION>_<DescriptiveName>.zip" HEAD
>    ```
> 2. **التحقق من وجود وحجم ملف النسخة:**
>    التأكد من إنشاء ملف الـ ZIP في مجلد `Versions/` بنجاح وتجاوز حجمه 1 ميجابايت على الأقل (Full Project Snapshot وليس ملفات جزئية فقط).
> 3. **عدم المساس بالملفات الحساسة:**
>    يُمنع منعاً باتاً تضمين مفاتيح OAuth أو أسرار API (مثل `client_secret*.json` أو `.env`) داخل أي مستودع عام في GitHub.
> 4. **توثيق التغييرات:**
>    توثيق أي تعديل كبير في ملف `VERSION.md` مع توضيح رقم الإصدار الجديد وتاريخه وأسباب التعديل.

---

## 2. Project Architecture & Standards

- **Core Stack:** React (TypeScript) + Vite + Tailwind CSS + Supabase.
- **Error Monitoring:** يتم رصد كافة أخطاء الواجهة والـ API تلقائياً عبر `src/lib/platformErrors.ts` ومراجعتها وتصديرها من صفحة `/dev/errors`.
- **Database Safety:** عند إجراء عمليات مسح أو حذف في جداول Supabase، يجب دائماً استخدام شرط `WHERE true;` لتفادي أخطاء حماية `safeupdate`.
