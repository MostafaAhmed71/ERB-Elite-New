# بناء وثائق قاعدة المعرفة (build-docs)

سكريبت تلقائي يحوّل ملفات `knowledge-base/*.md` إلى HTML وPDF وملف موحّد وZIP جاهز للرفع.

---

## الأمر الوحيد

من جذر المشروع:

```bash
npm run build-docs
```

عند أول تشغيل تأكد أن الحزم مثبتة:

```bash
npm install
```

---

## ماذا ينتج الأمر؟

| المخرج | المسار |
|--------|--------|
| HTML لكل ملف | `dist/html/*.html` + `dist/html/KnowledgeBase.html` |
| PDF لكل ملف | `dist/pdf/*.pdf` |
| PDF موحّد (غلاف + TOC + أرقام صفحات) | `dist/pdf/KnowledgeBase.pdf` |
| نسخة سريعة للموحّد | `dist/KnowledgeBase.pdf` |
| أرشيف كامل | `Olympiad-Knowledge-Base.zip` |

محتوى الـ ZIP:

- `markdown/` — كل ملفات Markdown
- `html/` — كل ملفات HTML
- `pdf/` — كل ملفات PDF
- `KnowledgeBase.pdf` — الملف الموحّد في جذر الأرشيف

---

## ترتيب الملف الموحّد

1. README  
2. USER_GUIDE  
3. STUDENT_GUIDE  
4. TEACHER_GUIDE  
5. FAQ  
6. SUBSCRIPTIONS  
7. PLATFORM_FEATURES  
8. SUPPORT  
9. AI_AGENT_CONTEXT  
10. TERMS  
11. PRIVACY  
12. CONTACT  

---

## الشعار

يُبحث عن الشعار بهذا الترتيب:

1. `./logo.png`
2. `./public/logo.png`
3. `./knowledge-base/logo.png`
4. `./build/assets/logo.png`
5. `./public/icon.jpeg` (احتياطي)

ضع ملفك باسم `logo.png` في أحد هذه المواقع لإظهاره في الترويسة والغلاف.

---

## المتطلبات

- Node.js 18+
- أنظمة مدعومة: **Windows / macOS / Linux**
- الحزم (تُضاف عبر `package.json` / `npm install`):
  - `markdown-it`
  - `markdown-it-anchor`
  - `markdown-it-multimd-table`
  - `puppeteer` (طباعة PDF)
  - `pdf-lib` (تحقق من صحة PDF)
  - `archiver` (ZIP)

---

## ملاحظات

- المخرجات داخل `dist/` وملف ZIP في الجذر — عادةً غير مُتتبَّعة في Git.
- السكربت لا يحذف بقية مخرجات Vite داخل `dist/`؛ يكتب فقط إلى `dist/html` و`dist/pdf`.
- إن فشل Puppeteer على Linux بسبب مكتبات النظام، ثبّت اعتمادات Chromium الرسمية لبيئتك أو شغّل البناء على جهاز سطح مكتب.

---

## الملفات في هذا المجلد

| ملف | الدور |
|-----|--------|
| `build-docs.mjs` | السكربت الرئيسي |
| `docs.css` | تنسيق الطباعة والعربية RTL |
| `README.md` | هذا الشرح |
| `assets/` | مكان اختياري لـ `logo.png` |
