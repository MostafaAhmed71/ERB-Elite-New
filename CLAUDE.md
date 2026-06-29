# CLAUDE.md — منصة المسابقة الفصلية اليومية

## نظرة عامة على المشروع

منصة ويب تفاعلية للمسابقة اليومية بين فصول المرحلة المتوسطة (12 فصلاً).
كل يوم الساعة 8:50 صباحاً يظهر سؤال موحد على شاشة كل فصل، تجيب عليه الفصول وتتنافس على الترتيب.

---

## التقنيات المستخدمة

| الطبقة | التقنية |
|---|---|
| Frontend | React.js (Vite) |
| Backend / Database | Supabase (PostgreSQL + Realtime + Auth) |
| Hosting | Hostinger (Static Hosting) |
| TTS | ElevenLabs API |
| Animation | Lottie / CSS Animation |
| Android TV APK | Kotlin + AlarmManager |

---

## هيكل المشروع

```
/
├── public/
│   └── mascot/          # ملفات الشخصية الكارتونية
├── src/
│   ├── components/      # المكونات المشتركة
│   ├── pages/
│   │   ├── ClassScreen.jsx        # شاشة الفصل (السؤال + الترتيب)
│   │   ├── RepresentativeScreen.jsx # شاشة ممثل الفصل للإجابة
│   │   ├── Leaderboard.jsx        # شاشة الترتيب الخارجية
│   │   └── AdminDashboard.jsx     # لوحة تحكم المدير
│   ├── lib/
│   │   └── supabase.js            # إعداد Supabase client
│   ├── hooks/
│   │   ├── useQuestion.js         # hook للسؤال اليومي
│   │   ├── useLeaderboard.js      # hook للترتيب اللحظي
│   │   └── useTimer.js            # hook للعداد التنازلي
│   ├── utils/
│   │   └── elevenlabs.js          # دوال ElevenLabs TTS
│   └── App.jsx
├── android-apk/                   # مشروع Kotlin للـ APK
│   └── app/src/main/
│       ├── MainActivity.kt
│       ├── SchedulerService.kt    # AlarmManager
│       └── SetupActivity.kt       # شاشة اختيار الفصل
└── CLAUDE.md
```

---

## قاعدة البيانات — Supabase

### الجداول المطلوبة

#### 1. جدول `classes` — الفصول
```sql
CREATE TABLE classes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,           -- "أول أ"
  grade INTEGER NOT NULL,       -- 1, 2, 3
  section TEXT NOT NULL,        -- "أ", "ب", "ج", "د"
  url_slug TEXT UNIQUE NOT NULL, -- "grade1-a"
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- إدخال الفصول الـ 12
INSERT INTO classes (name, grade, section, url_slug) VALUES
('أول أ', 1, 'أ', 'grade1-a'),
('أول ب', 1, 'ب', 'grade1-b'),
('أول ج', 1, 'ج', 'grade1-c'),
('أول د', 1, 'د', 'grade1-d'),
('ثاني أ', 2, 'أ', 'grade2-a'),
('ثاني ب', 2, 'ب', 'grade2-b'),
('ثاني ج', 2, 'ج', 'grade2-c'),
('ثاني د', 2, 'د', 'grade2-d'),
('ثالث أ', 3, 'أ', 'grade3-a'),
('ثالث ب', 3, 'ب', 'grade3-b'),
('ثالث ج', 3, 'ج', 'grade3-c'),
('ثالث د', 3, 'د', 'grade3-d');
```

#### 2. جدول `questions` — الأسئلة
```sql
CREATE TABLE questions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_text TEXT NOT NULL,
  subject TEXT NOT NULL,         -- "رياضيات", "علوم", "إنجليزي", "عربي"
  options JSONB NOT NULL,        -- ["خيار1", "خيار2", "خيار3", "خيار4"]
  correct_answer INTEGER NOT NULL, -- 0, 1, 2, 3
  scheduled_date DATE UNIQUE NOT NULL,
  audio_url TEXT,                -- رابط الصوت بعد توليده من ElevenLabs
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 3. جدول `answers` — الإجابات
```sql
CREATE TABLE answers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID REFERENCES questions(id),
  class_id UUID REFERENCES classes(id),
  selected_answer INTEGER NOT NULL, -- 0, 1, 2, 3
  is_correct BOOLEAN NOT NULL,
  answered_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(question_id, class_id)    -- فصل واحد يجيب مرة واحدة فقط
);
```

#### 4. جدول `scores` — النقاط التراكمية
```sql
CREATE TABLE scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  class_id UUID REFERENCES classes(id) UNIQUE,
  total_points INTEGER DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- إدخال صف لكل فصل
INSERT INTO scores (class_id)
SELECT id FROM classes;
```

### Supabase Realtime
- فعّل Realtime على جدول `answers` و `scores`
- الـ Frontend يستمع للتغييرات لحظياً بدون polling

### Row Level Security (RLS)
```sql
-- الكل يقرأ الأسئلة والنقاط
ALTER TABLE questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_questions" ON questions FOR SELECT USING (true);

ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_scores" ON scores FOR SELECT USING (true);

-- الكل يكتب الإجابات (ممثل الفصل)
ALTER TABLE answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert_answers" ON answers FOR INSERT WITH CHECK (true);

-- النقاط تُحدَّث عبر Supabase Function فقط
```

### Supabase Function — تحديث النقاط تلقائياً
```sql
CREATE OR REPLACE FUNCTION update_score_on_answer()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_correct THEN
    UPDATE scores
    SET total_points = total_points + 1,
        last_updated = NOW()
    WHERE class_id = NEW.class_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_answer_insert
AFTER INSERT ON answers
FOR EACH ROW EXECUTE FUNCTION update_score_on_answer();
```

---

## الصفحات والـ Routes

```
/class/:slug          → ClassScreen       (شاشة الفصل على BenQ)
/answer/:slug         → RepresentativeScreen (شاشة ممثل الفصل على موبايله)
/leaderboard          → Leaderboard       (الشاشة الخارجية)
/admin                → AdminDashboard    (لوحة تحكم المدير — محمية بكلمة سر)
```

---

## تفاصيل كل صفحة

### 1. ClassScreen — `/class/:slug`
شاشة تعمل على BenQ Android TV داخل كل فصل.

**المراحل الزمنية:**
1. **الانتظار** — شاشة فارغة أو شعار المدرسة حتى الساعة 8:50
2. **ظهور الشخصية** (5 ثوانٍ) — أنيميشن درامي للمعلم الكارتوني
3. **قراءة السؤال** — ElevenLabs يقرأ السؤال والاختيارات والنص يظهر متزامناً
4. **العداد التنازلي** — 60 ثانية، يبدأ بعد انتهاء الصوت
5. **شاشة الترتيب** — تظهر لمدة 30 ثانية بعد انتهاء الوقت
6. **الإغلاق** — APK يغلق المتصفح

**متطلبات مهمة:**
- الصفحة تعرف فصلها من `slug` في الـ URL
- تستمع لـ Supabase Realtime لتحديث الترتيب فوراً
- لا تسمح بالإجابة من هذه الشاشة (للعرض فقط)
- تصميم Fullscreen بدون scrollbar

### 2. RepresentativeScreen — `/answer/:slug`
شاشة يفتحها ممثل الفصل على موبايله أو تابلته.

**المحتوى:**
- اسم الفصل في الأعلى
- السؤال بخط كبير
- 4 أزرار للاختيارات
- بعد الضغط: تأكيد الإجابة وعدم السماح بالتغيير
- إذا انتهى الوقت: رسالة "انتهى وقت الإجابة"
- إذا أجاب فصل آخر بنفس السؤال: يرفض الإجابة المكررة

### 3. Leaderboard — `/leaderboard`
شاشة الترتيب الخارجية — تعمل طول اليوم.

**المحتوى:**
- ترتيب الـ 12 فصل بالنقاط التراكمية
- تتحدث لحظياً عبر Supabase Realtime
- تصميم كبير واحترافي يشبه شاشات البطولات
- ميداليات للمراكز الأولى (ذهب، فضة، برونز)
- تحديث تلقائي بدون reload

### 4. AdminDashboard — `/admin`
لوحة تحكم المدير — محمية بـ Supabase Auth.

**الوظائف:**
- تسجيل الدخول بالإيميل وكلمة السر
- إضافة سؤال جديد (النص + 4 خيارات + الإجابة الصحيحة + التاريخ + المادة)
- معاينة الصوت قبل الحفظ (استدعاء ElevenLabs وتشغيل الصوت)
- حفظ الصوت على Supabase Storage
- عرض جدول الأسئلة السابقة والقادمة
- عرض النتائج اليومية لكل فصل
- تصفية الأسئلة حسب المادة

---

## ElevenLabs TTS

### الإعداد
```javascript
// src/utils/elevenlabs.js
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const VOICE_ID = 'YOUR_ARABIC_VOICE_ID'; // صوت عربي من ElevenLabs

export async function generateSpeech(text) {
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    }
  );
  return await response.blob();
}
```

### آلية العمل
1. المدير يضيف السؤال في لوحة التحكم
2. يضغط "معاينة الصوت" → يستدعي ElevenLabs ويشغل الصوت مباشرة
3. يضغط "حفظ" → يُولَّد الصوت ويُرفع على Supabase Storage
4. يُحفظ رابط الصوت في `questions.audio_url`
5. وقت العرض → الشاشة تشغل الصوت من الرابط المحفوظ (لا تستدعي API مجدداً)

### نص القراءة
```javascript
function buildSpeechText(question) {
  return `
    استعدوا... التحدي بدأ!
    السؤال: ${question.question_text}
    الخيار الأول: ${question.options[0]}
    الخيار الثاني: ${question.options[1]}
    الخيار الثالث: ${question.options[2]}
    الخيار الرابع: ${question.options[3]}
    الوقت بدأ!
  `;
}
```

---

## الشخصية الكارتونية (Mascot)

- معلم سعودي كارتوني — ثوب أبيض، شماغ أحمر، عقال، لحية خفيفة
- شعار المدرسة على جيب الثوب
- الملفات في `/public/mascot/`
- الأنيميشن بـ CSS أو Lottie JSON

**تسلسل الأنيميشن:**
1. يدخل من اليمين بشكل مفاجئ (slide-in)
2. يشير بإصبعه للأمام مع تعبير حماسي
3. يبقى ظاهراً أثناء قراءة السؤال
4. يخرج بعد انتهاء الصوت (slide-out)

---

## Android TV APK

### الملفات المطلوبة
```kotlin
// SetupActivity.kt — شاشة الإعداد الأولى
// تعرض قائمة الفصول الـ 12
// تحفظ الاختيار في SharedPreferences
// لا تظهر مجدداً بعد الحفظ

// SchedulerService.kt — الخدمة الخلفية
// تعمل عند تشغيل الجهاز (BOOT_COMPLETED)
// تضبط AlarmManager على 8:50 صباحاً يومياً
// عند الإطلاق: تفتح Chrome على URL الفصل

// MainActivity.kt
// تتحقق إذا كان الفصل محدداً
// إذا لا → تفتح SetupActivity
// إذا نعم → تبدأ SchedulerService وتغلق نفسها
```

### فتح Chrome برمجياً
```kotlin
fun openClassScreen(context: Context, slug: String) {
  val url = "https://yourschool.com/class/$slug"
  val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
  intent.setPackage("com.android.chrome")
  intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
  context.startActivity(intent)
}
```

### إغلاق Chrome بعد 90 ثانية
```kotlin
Handler(Looper.getMainLooper()).postDelayed({
  val closeIntent = Intent(Intent.ACTION_MAIN)
  closeIntent.addCategory(Intent.CATEGORY_HOME)
  closeIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
  context.startActivity(closeIntent)
}, 90_000L) // 90 ثانية (60 سؤال + 30 ترتيب)
```

---

## متغيرات البيئة

```env
# .env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_ELEVENLABS_API_KEY=your-elevenlabs-key
```

---

## الألوان والتصميم

```css
:root {
  --primary: #1E3A5F;      /* أزرق داكن */
  --gold: #F4C430;         /* ذهبي */
  --white: #FFFFFF;
  --danger: #C0392B;       /* أحمر للتنبيه */
  --success: #27AE60;      /* أخضر للإجابة الصحيحة */
  --bg-dark: #0D1B2A;      /* خلفية داكنة */
}

/* الخط */
@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700;900&display=swap');

body {
  font-family: 'Tajawal', sans-serif;
  direction: rtl;
}
```

---

## ترتيب التنفيذ المقترح

### المرحلة 1 — البنية الأساسية
- [ ] إنشاء مشروع Supabase وتنفيذ SQL الجداول
- [ ] إنشاء مشروع React بـ Vite
- [ ] إعداد Supabase Client
- [ ] بناء لوحة تحكم المدير (إضافة أسئلة)
- [ ] تكامل ElevenLabs (توليد ومعاينة الصوت)

### المرحلة 2 — شاشات الفصل
- [ ] بناء ClassScreen مع العداد التنازلي
- [ ] بناء RepresentativeScreen مع منع التكرار
- [ ] تكامل Supabase Realtime للترتيب اللحظي
- [ ] إضافة أنيميشن الشخصية الكارتونية
- [ ] تشغيل الصوت متزامناً مع النص

### المرحلة 3 — شاشة الترتيب
- [ ] بناء Leaderboard الخارجية
- [ ] تحديث لحظي بدون reload
- [ ] تصميم احترافي بالميداليات

### المرحلة 4 — Android TV APK
- [ ] إنشاء مشروع Kotlin
- [ ] SetupActivity لاختيار الفصل
- [ ] SchedulerService بـ AlarmManager
- [ ] فتح وإغلاق Chrome تلقائياً
- [ ] اختبار على شاشة BenQ فعلية

### المرحلة 5 — الاختبار والإطلاق
- [ ] اختبار التزامن على 12 شاشة
- [ ] رفع المشروع على Hostinger
- [ ] اختبار الـ APK على جميع الشاشات
- [ ] تدريب المدير على لوحة التحكم

---

## ملاحظات مهمة لـ Claude Code

1. **RTL أولاً** — كل الواجهات من اليمين لليسار، استخدم `dir="rtl"` على `<html>`
2. **Fullscreen على ClassScreen** — لا scrollbar، لا header، تملأ الشاشة كاملاً
3. **الصوت يُولَّد مرة واحدة** — لا تستدعي ElevenLabs API وقت العرض، استخدم الرابط المحفوظ
4. **Supabase Realtime** — استخدم `supabase.channel()` للاستماع للتغييرات اللحظية
5. **منع الإجابة المكررة** — تحقق من `UNIQUE(question_id, class_id)` قبل الإدراج
6. **الوقت** — استخدم توقيت السعودية (UTC+3) في كل العمليات الزمنية
7. **الشاشة الخارجية** — تعمل 24/7 بدون تدخل، تحدّث نفسها تلقائياً
8. **APK** — يعمل على Android TV 7.0+ ويدعم Chrome كمتصفح افتراضي
