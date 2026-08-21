import type { UserRole } from '../types';
import { ROLE_LABELS, ROLE_NAV } from '../types';
import { ADMIN_SCREEN_GUIDES, type AdminScreenGuide } from './adminScreenGuides';
import { getRoleScreenGuide } from './roleScreenGuides';

export type GuideStep = {
  label: string;
  description: string;
  steps?: string[];
};

export type GuideSection = {
  title: string;
  items: GuideStep[];
};

export type GuideScreen = {
  path: string;
  label: string;
  summary: string;
  howTo: string[];
  sections?: GuideSection[];
};

export type UserRoleGuide = {
  role: UserRole;
  roleLabel: string;
  title: string;
  subtitle: string;
  introduction: string;
  gettingStarted: string[];
  sections: GuideSection[];
  screens: GuideScreen[];
  faq: { question: string; answer: string }[];
  tips: string[];
};

const SHARED_LOGIN_STEPS = [
  'افتح رابط المنصة في المتصفح (Chrome أو Safari مُفضّل).',
  'أدخل البريد الإلكتروني وكلمة المرور المُسلَّمة من إدارة المدرسة.',
  'عند أول دخول قد يُطلب منك تغيير كلمة المرور — اختر كلمة قوية واحفظها.',
  'بعد الدخول ستُوجَّه تلقائياً للوحة المناسبة لدورك.',
];

function getScreenGuide(path: string): AdminScreenGuide | null {
  return ADMIN_SCREEN_GUIDES[path] ?? getRoleScreenGuide(path) ?? null;
}

function guideToHowTo(guide: AdminScreenGuide): string[] {
  return guide.sections.flatMap((s) => s.items.map((i) => `${i.label}: ${i.description}`));
}

function screensFromNav(
  role: UserRole,
  summaries: Record<string, { summary?: string; howTo?: string[] }> = {},
  extraScreens: Array<Pick<GuideScreen, 'path' | 'label' | 'summary' | 'howTo'>> = []
): GuideScreen[] {
  const fromNav = (ROLE_NAV[role] ?? []).map((item) => {
    const screenGuide = getScreenGuide(item.path);
    const custom = summaries[item.path];
    return {
      path: item.path,
      label: item.label,
      summary: custom?.summary ?? screenGuide?.summary ?? `صفحة ${item.label} في المنصة.`,
      howTo:
        custom?.howTo ??
        (screenGuide ? guideToHowTo(screenGuide) : [`من القائمة الجانبية اختر «${item.label}».`]),
      sections: screenGuide?.sections ?? [],
    };
  });

  const extras: GuideScreen[] = extraScreens.map((s) => {
    const screenGuide = getScreenGuide(s.path);
    return {
      ...s,
      sections: screenGuide?.sections ?? [],
      howTo: s.howTo.length ? s.howTo : screenGuide ? guideToHowTo(screenGuide) : s.howTo,
      summary: s.summary || screenGuide?.summary || s.summary,
    };
  });

  const seen = new Set<string>();
  return [...fromNav, ...extras].filter((s) => {
    if (seen.has(s.path)) return false;
    seen.add(s.path);
    return true;
  });
}

const ACCOUNT_SECURITY_SECTION: GuideSection = {
  title: 'الحساب والأمان',
  items: [
    {
      label: 'تسجيل الدخول',
      description: 'استخدم البريد وكلمة المرور المُسلَّمة من المدرسة — لا تشاركها مع أحد.',
      steps: ['افتح رابط المنصة', 'أدخل البريد وكلمة المرور', 'اضغط دخول'],
    },
    {
      label: 'تغيير كلمة المرور',
      description: 'عند أول دخول أو من «ملفي» — اختر كلمة قوية واحفظها.',
    },
    {
      label: 'تسجيل الخروج',
      description: 'اخرج من الحساب عند استخدام جهاز مشترك.',
    },
  ],
};

const GLOSSARY_SECTION: GuideSection = {
  title: 'مصطلحات البرنامج',
  items: [
    { label: 'المحاور الأربعة', description: 'النشاط، السلوك، الإنجاز، المبادرة — كل نشاط يُصنَّف في أحدها.' },
    { label: 'إجمالي النقاط', description: 'مجموع كل النقاط المعتمدة في سجل التميز.' },
    { label: 'مستوى التميز', description: 'برونزي → فضي → ذهبي → ماسي حسب عتبات النقاط.' },
    { label: 'طلب معلّق', description: 'نقاط سجّلها المعلم وبانتظار اعتماد رائد النشاط.' },
    { label: 'المنح الجماعي', description: 'نقاط تُمنح للفصل كوحدة في ترتيب الفصول.' },
  ],
};

export const USER_ROLE_GUIDES: Record<Exclude<UserRole, 'activity_leader' | 'platform_developer'>, UserRoleGuide> = {
  admin: {
    role: 'admin',
    roleLabel: ROLE_LABELS.admin,
    title: 'دليل رائد النشاط',
    subtitle: 'إدارة البرنامج، النقاط، الحضور، والتقارير',
    introduction:
      'رائد النشاط هو المسؤول عن تشغيل برنامج الأولمبياد: اعتماد نقاط المعلمين، إدارة الأنشطة، متابعة الحضور، وإصدار التقارير. يغطي هذا الدليل كل عناصر القائمة الجانبية مع شرح تفصيلي لكل شاشة وصلاحياتك ومصطلحات البرنامج.',
    gettingStarted: [
      ...SHARED_LOGIN_STEPS,
      'ابدأ من لوحة الرئيسية للاطلاع على الطلبات المعلّقة.',
      'اعتمد نقاط المعلمين يومياً من «مركز النقاط».',
      'راجع إعدادات البرنامج في بداية الفصل الدراسي.',
    ],
    sections: [
      ACCOUNT_SECURITY_SECTION,
      GLOSSARY_SECTION,
      {
        title: 'صلاحيات رائد النشاط',
        items: [
          { label: 'النقاط', description: 'منح، خصم، اعتماد طلبات المعلمين، ومنح جماعي للفصول.' },
          { label: 'الحضور', description: 'رفع ملفات Excel وتسجيل يومي وتقارير الحضور.' },
          { label: 'الأنشطة', description: 'إدارة الكتالوج ومراجعة اقتراحات الطلاب.' },
          { label: 'المستخدمون', description: 'إدارة الحسابات وتوليد حسابات الفصول.' },
          { label: 'التقارير', description: 'تقارير المعلمين والفصول والعدالة والنقاط.' },
          { label: 'الإعدادات', description: 'أوزان المحاور والحدود ومستويات التميز.' },
        ],
      },
      {
        title: 'المهام اليومية',
        items: [
          {
            label: 'اعتماد النقاط',
            description: 'راجع طلبات المعلمين المعلّقة واعتمدها أو ارفضها مع سبب واضح.',
            steps: ['افتح مركز النقاط ← تبويب الموافقة', 'راجع الطلب (طالب، نشاط، نقاط)', 'اضغط اعتماد أو رفض'],
          },
          {
            label: 'متابعة الحضور',
            description: 'ارفع ملف الحضور الأسبوعي أو سجّل الحضور اليومي.',
          },
          {
            label: 'الرد على الاقتراحات',
            description: 'راجع اقتراحات الطلاب للأنشطة واقبل المناسب منها.',
          },
        ],
      },
      {
        title: 'المهام الأسبوعية',
        items: [
          { label: 'لوحة المتصدرين', description: 'اعرض الترتيب في الطابور أو الشاشة الخارجية.' },
          { label: 'تقرير المعلمين', description: 'تأكد أن المعلمين لا يتجاوزون حد النقاط الأسبوعي.' },
          { label: 'مؤشر العدالة', description: 'راقب الفصول التي تحصل على نقاط أقل من المتوسط.' },
        ],
      },
      {
        title: 'بداية الفصل',
        items: [
          { label: 'إعدادات البرنامج', description: 'اضبط أوزان المحاور ومستويات التميز وحدود المعلمين.' },
          { label: 'كتالوج الأنشطة', description: 'راجع الأنشطة وفعّل ما يناسب خطتك.' },
          { label: 'توليد حسابات', description: 'من تبويب المستخدمون — ولّد حسابات الطلاب وأولياء الأمور.' },
          { label: 'بطاقات QR', description: 'اطبع بطاقات الطلاب لتمكين المنح السريع بالمسح.' },
          { label: 'أدلة المستخدم', description: 'صدّر أدلة PDF/HTML لكل فئة ووزّعها على الفريق.' },
        ],
      },
    ],
    screens: screensFromNav('admin', {}, [
      {
        path: '/admin/points-log',
        label: 'سجل النقاط (مباشر)',
        summary: 'سجل تفصيلي لكل عمليات المنح والخصم — من مركز النقاط تبويب السجل.',
        howTo: ['افتح مركز النقاط ← السجل', 'صفِّ حسب التاريخ أو الحالة', 'صدّر للأرشفة عند الحاجة'],
      },
      {
        path: '/admin/add-points',
        label: 'منح يدوي فوري',
        summary: 'منح نقاط باعتماد فوري دون انتظار موافقة — للتكريم السريع.',
        howTo: ['اختر طالباً ونشاطاً', 'حدد النقاط', 'يُعتمد مباشرة ويظهر في رصيد الطالب'],
      },
      {
        path: '/display/leaderboard',
        label: 'شاشة المتصدرين (لوحة فقط)',
        summary: 'رابط مباشر للوحة المتصدرين على الشاشة الكبيرة — بدون تسجيل دخول.',
        howTo: ['افتح الرابط على التلفزيون أو الشاشة الخارجية', 'اتركها مفتوحة — تتحدث كل دقيقة'],
      },
      {
        path: '/board/leaderboard',
        label: 'شاشة العرض الكبيرة G2',
        summary: 'لوحة متصدرين + تحدي الأسبوع مع عناصر تحكم — تتطلب تسجيل دخول.',
        howTo: ['افتح الرابط على الشاشة الكبيرة', 'اتركها مفتوحة طوال اليوم'],
      },
      {
        path: '/login',
        label: 'تسجيل الدخول',
        summary: 'صفحة الدخول للمنصة.',
        howTo: [],
      },
    ]),
    faq: [
      { question: 'لماذا نقاط المعلم معلّقة؟', answer: 'المنح من المعلم يحتاج موافقتك. اعتمدها من مركز النقاط ← الموافقة.' },
      { question: 'كيف أضاعف النقاط أسبوعياً؟', answer: 'من إعدادات البرنامج ← أسبوع النشاط — فعّل المحور أو النشاط المطلوب.' },
      { question: 'الفرق بين منح فردي وجماعي؟', answer: 'الفردي لطالب واحد. الجماعي يسجّل نقاطاً للفصل ككل في ترتيب الفصول.' },
    ],
    tips: [
      'اعتمد النقاط صباحاً قبل طابور الصباح ليظهر الترتيب محدّثاً.',
      'استخدم المنح اليدوي للتكريم الفوري في المناسبات.',
      'راجع مؤشر العدالة شهرياً لضمان عدالة التوزيع بين الفصول.',
    ],
  },

  principal: {
    role: 'principal',
    roleLabel: ROLE_LABELS.principal,
    title: 'دليل مدير المدرسة',
    subtitle: 'إدارة المستخدمين، التقارير التنفيذية، والإشراف العام',
    introduction:
      'مدير المدرسة يشرف على المنصة من المستوى التنفيذي: إدارة الحسابات، رفع بيانات الطلاب، متابعة الأداء العام، وضبط هيكل الصفوف والفصول.',
    gettingStarted: [
      ...SHARED_LOGIN_STEPS,
      'راجع اللوحة التنفيذية لمؤشرات الأداء العامة.',
      'تأكد من اكتمال بيانات الطلاب والمعلمين.',
      'وكّل رائد النشاط بالمهام التشغيلية اليومية.',
    ],
    sections: [
      ACCOUNT_SECURITY_SECTION,
      {
        title: 'صلاحيات مدير المدرسة',
        items: [
          { label: 'إدارة كاملة للمستخدمين', description: 'إنشاء وتعديل كل الأدوار وربط أولياء الأمور.' },
          { label: 'البيانات', description: 'رفع جماعي للطلاب وتوليد الحسابات.' },
          { label: 'الإشراف', description: 'لوحة تنفيذية وتقارير وسجل تدقيق — دون منح نقاط يومي.' },
          { label: 'الهيكل', description: 'الصفوف والفصول وإعدادات المدرسة.' },
        ],
      },
      {
        title: 'إدارة المستخدمين',
        items: [
          {
            label: 'إنشاء حسابات الموظفين',
            description: 'أضف مشرفين ومعلمين ورائد نشاط من إدارة المستخدمين.',
            steps: ['افتح إدارة المستخدمين', 'اضغط إضافة مستخدم أو دعوة موظف', 'حدد الدور والبيانات'],
          },
          {
            label: 'الرفع الجماعي للطلاب',
            description: 'استورد قائمة الطلاب من Excel.',
            steps: ['افتح الرفع الجماعي', 'حمّل القالب واملأه', 'ارفع الملف وراجع المعاينة ثم أكّد'],
          },
          {
            label: 'توليد حسابات الفصل',
            description: 'إنشاء حسابات طلاب وأولياء أمور دفعة واحدة.',
          },
        ],
      },
      {
        title: 'المتابعة والتقارير',
        items: [
          { label: 'اللوحة التنفيذية', description: 'مؤشرات KPIs ورسوم أداء المدرسة.' },
          { label: 'ملف الطالب 360', description: 'عرض شامل لطالب: نقاط، حضور، اختبارات.' },
          { label: 'سجل التدقيق', description: 'مراجعة العمليات الحساسة في النظام.' },
        ],
      },
      {
        title: 'الإعدادات',
        items: [
          { label: 'الصفوف والفصول', description: 'إدارة كتالوج الصفوف والفصول المعتمدة.' },
        ],
      },
    ],
    screens: screensFromNav('principal', {}, [
      {
        path: '/principal/audit-logs',
        label: 'سجل التدقيق',
        summary: 'مراجعة العمليات الحساسة في النظام.',
        howTo: [],
      },
      {
        path: '/principal/student/:studentId',
        label: 'ملف الطالب 360',
        summary: 'عرض شامل لطالب: نقاط، حضور، واختبارات.',
        howTo: [],
      },
    ]),
    faq: [
      { question: 'هل أستطيع منح نقاط؟', answer: 'مدير المدرسة يركز على الإشراف. المنح اليومي لرائد النشاط والمعلمين.' },
      { question: 'كيف أربط ولي أمر بطالب؟', answer: 'عند توليد الحسابات أو إنشاء حساب ولي أمر وربطه بالطالب من إدارة المستخدمين.' },
    ],
    tips: [
      'راجع اللوحة التنفيذية أسبوعياً في اجتماع الإدارة.',
      'احتفظ بنسخة من ملف Excel للطلاب بعد كل رفع جماعي.',
    ],
  },

  supervisor: {
    role: 'supervisor',
    roleLabel: ROLE_LABELS.supervisor,
    title: 'دليل المشرف التربوي',
    subtitle: 'الاختبارات، بنك الأسئلة، والتحليلات',
    introduction:
      'المشرف التربوي يبني الاختبارات الإلكترونية، يدير بنك الأسئلة والمهارات، ويتابع أداء الفصول والطلاب عبر لوحات التحليل.',
    gettingStarted: [
      ...SHARED_LOGIN_STEPS,
      'اربط المواد بكل صف من «المواد حسب الصف».',
      'أنشئ المهارات ثم أضف الأسئلة في بنك الأسئلة.',
      'ابنِ الاختبار وفعّله في الفترة المحددة.',
    ],
    sections: [
      ACCOUNT_SECURITY_SECTION,
      {
        title: 'دورة عمل الاختبارات',
        items: [
          { label: '١ — المواد', description: 'اربط المواد بكل صف.', steps: ['المواد حسب الصف'] },
          { label: '٢ — المهارات', description: 'عرّف المهارات لكل مادة.', steps: ['المهارات'] },
          { label: '٣ — الأسئلة', description: 'ابنِ بنك الأسئلة واربط كل سؤال بمهارة.', steps: ['بنك الأسئلة'] },
          { label: '٤ — الاختبار', description: 'أنشئ الاختبار وحدد الفترة وفعّله.', steps: ['إدارة الاختبارات'] },
          { label: '٥ — التحليل', description: 'راجع الأداء بعد انتهاء الاختبار.', steps: ['أداء الفصل', 'تحليل الأسئلة'] },
        ],
      },
      {
        title: 'بناء الاختبارات',
        items: [
          {
            label: 'بنك الأسئلة',
            description: 'أضف أسئلة اختيار من متعدد أو صح/خطأ واربطها بمهارة وصف.',
            steps: ['افتح بنك الأسئلة', 'اضغط سؤال جديد', 'اختر النوع والمهارة والصعوبة', 'احفظ'],
          },
          {
            label: 'إدارة الاختبارات',
            description: 'أنشئ اختباراً، أضف أسئلة، وحدد موعد البداية والنهاية.',
            steps: ['افتح إدارة الاختبارات', 'اختبار جديد ← صف ومادة', 'أضف أسئلة من البنك', 'فعّل الاختبار'],
          },
        ],
      },
      {
        title: 'متابعة الأداء',
        items: [
          { label: 'أداء الفصل', description: 'متوسط الدرجات وتوزيع الطلاب.' },
          { label: 'تحليل الأسئلة', description: 'أي الأسئلة كان أصعبها على الطلاب.' },
          { label: 'خريطة الكفاءات', description: 'نقاط قوة وضعف الفصل في كل مهارة.' },
          { label: 'طلاب الخطر', description: 'طلاب بأداء منخفض يحتاجون تدخلاً.' },
          { label: 'تقرير النمو', description: 'تتبع التحسّن عبر الوقت.' },
          { label: 'مقارنة الفصول', description: 'مقارنة فصول نفس الصف.' },
        ],
      },
    ],
    screens: screensFromNav('supervisor', {}),
    faq: [
      { question: 'لماذا لا يرى الطالب الاختبار؟', answer: 'تأكد أن الاختبار مفعّل وأن التاريخ ضمن فترة السماح.' },
      { question: 'هل يمكن محاولة ثانية؟', answer: 'لا — كل طالب محاولة واحدة لكل اختبار.' },
      { question: 'كيف أربط السؤال بمهارة؟', answer: 'عند إنشاء السؤال اختر المهارة من القائمة — يجب إنشاء المهارات أولاً.' },
    ],
    tips: [
      'ابنِ بنك أسئلة غني قبل بداية الفصل.',
      'راجع «تحليل الأسئلة» بعد كل اختبار لتحسين الأسئلة القادمة.',
      'استخدم «طلاب الخطر» للتدخل المبكر.',
    ],
  },

  teacher: {
    role: 'teacher',
    roleLabel: ROLE_LABELS.teacher,
    title: 'دليل المعلم',
    subtitle: 'منح النقاط ومتابعة طلاب الفصل',
    introduction:
      'المعلم يمنح نقاطاً لطلاب فصله حسب الأنشطة المعتمدة. تمر الطلبات برائد النشاط للاعتماد ما لم تُمنح مباشرة من الإدارة.',
    gettingStarted: [
      ...SHARED_LOGIN_STEPS,
      'تأكد من فصلك المربوط في حسابك.',
      'افتح «منح النقاط» وابحث عن الطالب.',
      'اختر النشاط وعدد النقاط ثم أرسل الطلب.',
    ],
    sections: [
      ACCOUNT_SECURITY_SECTION,
      GLOSSARY_SECTION,
      {
        title: 'منح النقاط',
        items: [
          {
            label: 'منح فردي',
            description: 'ابحث عن الطالب بالاسم أو رقم القيد.',
            steps: ['افتح منح النقاط', 'ابحث عن الطالب', 'اختر النشاط والنقاط', 'أرسل — تنتظر الاعتماد'],
          },
          {
            label: 'مسح QR',
            description: 'امسح بطاقة الطالب للمنح السريع إن وُجدت.',
          },
          {
            label: 'الحد الأسبوعي',
            description: 'يظهر شريط يوضح متبقي ميزانيتك الأسبوعية — لا تتجاوزه.',
          },
        ],
      },
      {
        title: 'متابعة الفصل',
        items: [
          { label: 'قائمة الطلاب', description: 'عرض طلاب فصلك وملفاتهم السريعة.' },
          { label: 'لوحة الفصل', description: 'ترتيب طلاب فصلك بالنقاط.' },
          { label: 'ملاحظات', description: 'أضف ملاحظة على طالب للمتابعة.' },
        ],
      },
    ],
    screens: screensFromNav('teacher', {}),
    faq: [
      { question: 'لماذا لم تظهر النقاط للطالب؟', answer: 'الطلب معلّق حتى يعتمدها رائد النشاط.' },
      { question: 'لا أجد طالباً', answer: 'تمنح فقط لطلاب فصلك المربوط. تواصل مع الإدارة إن كان الطالب ناقصاً.' },
    ],
    tips: [
      'امنح النقاط فور الملاحظة الإيجابية — لا تؤجل.',
      'استخدم QR في الفصل لتسريع العملية.',
    ],
  },

  student: {
    role: 'student',
    roleLabel: ROLE_LABELS.student,
    title: 'دليل الطالب',
    subtitle: 'لوحتي، النقاط، الاختبارات، والمشاركة',
    introduction:
      'الطالب يتابع نقاطه ومستواه، يحل الاختبارات الإلكترونية، يقترح أنشطة، ويشارك في التصويت على اقتراحات الزملاء.',
    gettingStarted: [
      ...SHARED_LOGIN_STEPS,
      'افتح «لوحتي» لرؤية نقاطك ومستواك.',
      'راجع الاختبارات المتاحة من «اختباراتي».',
      'اقترح نشاطاً جديداً إن أردت المشاركة.',
    ],
    sections: [
      ACCOUNT_SECURITY_SECTION,
      GLOSSARY_SECTION,
      {
        title: 'لوحتي',
        items: [
          { label: 'النقاط والمستوى', description: 'إجمالي نقاطك ومستوى التميز (برونزي، فضي، ذهبي…).' },
          { label: 'المحاور الأربعة', description: 'نشاط، سلوك، إنجاز، مبادرة — كل محور له وزن.' },
          { label: 'الشارات', description: 'إنجازات تحصل عليها عند أهداف معينة.' },
        ],
      },
      {
        title: 'الاختبارات',
        items: [
          {
            label: 'حل اختبار',
            description: 'محاولة واحدة فقط — اقرأ السؤال بعناية قبل الإرسال.',
            steps: ['افتح اختباراتي', 'اختر اختباراً نشطاً', 'أجب على كل الأسئلة', 'اضغط إرسال'],
          },
        ],
      },
      {
        title: 'المشاركة',
        items: [
          { label: 'اقتراح نشاط', description: 'قدّم فكرة نشاط جديد للمدرسة.' },
          { label: 'التصويت', description: 'صوّت على اقتراحات الزملاء.' },
        ],
      },
    ],
    screens: screensFromNav('student', {}, [
      {
        path: '/leaderboard',
        label: 'المتصدرون',
        summary: 'ترتيب الطلاب والفصول على مستوى المدرسة.',
        howTo: [],
      },
      {
        path: '/student/exams/:examId',
        label: 'شاشة حل الاختبار',
        summary: 'الإجابة على أسئلة الاختبار — محاولة واحدة فقط.',
        howTo: [],
      },
      {
        path: '/card/:studentId',
        label: 'بطاقة QR',
        summary: 'بطاقة الهوية الرقمية للمسح السريع.',
        howTo: [],
      },
    ]),
    faq: [
      { question: 'متى تُضاف النقاط؟', answer: 'بعد أن يمنحك المعلم النقاط ويعتمدها رائد النشاط.' },
      { question: 'لماذا لا أستطيع إعادة الاختبار؟', answer: 'كل اختبار محاولة واحدة فقط حسب قواعد البرنامج.' },
    ],
    tips: [
      'تابع لوحتك أسبوعياً لمعرفة نقاط قوتك.',
      'شارك باقتراحات بنّاءة للأنشطة.',
    ],
  },

  deputy: {
    role: 'deputy',
    roleLabel: ROLE_LABELS.deputy,
    title: 'دليل الوكيل',
    subtitle: 'متابعة الشؤون الأكاديمية للمرحلة',
    introduction: 'الوكيل يطلع على واجبات وخطط مرحلته ويصدّر التقارير — بدون إدارة أولمبياد النقاط.',
    gettingStarted: [...SHARED_LOGIN_STEPS, 'افتح «الشؤون الأكاديمية» من القائمة.', 'راجع الواجبات والخطط لمرحلتك.'],
    sections: [ACCOUNT_SECURITY_SECTION, GLOSSARY_SECTION],
    screens: [],
    faq: [{ question: 'لا أرى بيانات مرحلة أخرى', answer: 'صلاحياتك محددة بمرحلتك في ملفك.' }],
    tips: ['استخدم التصدير لإعداد تقارير المرحلة.'],
  },

  reviewer: {
    role: 'reviewer',
    roleLabel: ROLE_LABELS.reviewer,
    title: 'دليل المراجع',
    subtitle: 'مراجعة أوراق الاختبارات قبل اعتماد المدير',
    introduction:
      'المراجع يستلم مراجعات الاختبارات من المعلمين، يراجع الملفات، ويعتمدها أو يطلب تعديلاً قبل وصولها لمدير المدرسة للنشر لأولياء الأمور.',
    gettingStarted: [
      ...SHARED_LOGIN_STEPS,
      'افتح «مراجعات الاختبارات» من القائمة.',
      'راجع الطلبات الجديدة وافتح الملف للمعاينة أو التحميل.',
      'اعتمد الطلب أو أعده للمعلم مع ملاحظة عند الحاجة.',
    ],
    sections: [
      ACCOUNT_SECURITY_SECTION,
      {
        title: 'سير المراجعة',
        items: [
          {
            label: 'استلام الطلب',
            description: 'يصل الطلب من المعلم بحالة انتظار المراجعة.',
          },
          {
            label: 'المعاينة والقرار',
            description: 'افتح الملف، ثم اعتمد أو اطلب تعديلاً مع كتابة ملاحظة واضحة.',
          },
          {
            label: 'بعد الاعتماد',
            description: 'ينتقل الطلب لمدير المدرسة لاعتماده النهائي ونشره لأولياء الأمور.',
          },
        ],
      },
    ],
    screens: screensFromNav('reviewer', {}),
    faq: [
      {
        question: 'أين أجد الطلبات الجديدة؟',
        answer: 'من صفحة مراجعات الاختبارات — تبويب الطلبات المعلّقة أو كل الطلبات والإجراءات.',
      },
      {
        question: 'هل يمكنني النشر لولي الأمر مباشرة؟',
        answer: 'لا — بعد اعتمادك ينتقل الطلب للمدير للنشر.',
      },
    ],
    tips: [
      'اكتب ملاحظات واضحة عند طلب التعديل ليسهل على المعلم التصحيح.',
      'راجع الملف كاملاً قبل الاعتماد.',
    ],
  },

  parent: {
    role: 'parent',
    roleLabel: ROLE_LABELS.parent,
    title: 'دليل ولي الأمر',
    subtitle: 'متابعة الابن: نقاط، حضور، ونتائج',
    introduction:
      'ولي الأمر يطلع على ملف ابنه/ابنته: النقاط، سجل الحضور، ونتائج الاختبارات — دون صلاحية تعديل.',
    gettingStarted: [
      ...SHARED_LOGIN_STEPS,
      'تأكد أن حسابك مربوط بابنك من الإدارة.',
      'افتح «ملف الطالب» لنظرة عامة.',
      'راجع الحضور ونتائج الاختبارات دورياً.',
    ],
    sections: [
      ACCOUNT_SECURITY_SECTION,
      GLOSSARY_SECTION,
      {
        title: 'ماذا يمكنك مشاهدة؟',
        items: [
          { label: 'ملف الطالب', description: 'الاسم، الصف، الفصل، والنقاط الحالية.' },
          { label: 'الحضور', description: 'سجل الحضور والغياب والتأخر.' },
          { label: 'نتائج الاختبارات', description: 'درجات الاختبارات الإلكترونية.' },
        ],
      },
      {
        title: 'ما لا يمكنك فعله',
        items: [
          { label: 'منح نقاط', description: 'المنح للمعلمين والإدارة فقط.' },
          { label: 'تعديل البيانات', description: 'للاستفسار تواصل مع المدرسة.' },
        ],
      },
    ],
    screens: screensFromNav('parent', {}),
    faq: [
      { question: 'لا أرى بيانات ابني', answer: 'تأكد من ربط حسابك بالطالب — تواصل مع إدارة المدرسة.' },
      { question: 'النقاط لم تتحدث', answer: 'قد تكون معلّقة بانتظار اعتماد رائد النشاط.' },
    ],
    tips: [
      'ناقش مع ابنك نتائج الاختبارات بشكل تشجيعي.',
      'تابع الغياب مبكراً عند أي انخفاض في الحضور.',
    ],
  },
};

export function getUserRoleGuide(role: UserRole): UserRoleGuide {
  if (role === 'activity_leader') {
    return {
      ...USER_ROLE_GUIDES.admin,
      role: 'activity_leader',
      roleLabel: ROLE_LABELS.activity_leader,
      title: 'دليل رائد النشاط',
      subtitle: 'إدارة البرنامج، النقاط، الحضور، والتقارير — نسخة رائد النشاط',
    };
  }
  if (role === 'platform_developer') {
    return {
      role: 'platform_developer',
      roleLabel: ROLE_LABELS.platform_developer,
      title: 'دليل مطور المنصة',
      subtitle: 'مساحة /dev للمراقبة والصيانة — ليست إدارة مدرسية',
      introduction:
        'مطور المنصة يدخل إلى /dev فقط. لا يستخدم أدوات المدير أو المعلم. راجع Docs/SCHOOL_PLATFORM_ROADMAP.md وscripts/create-platform-developer.sql.',
      gettingStarted: [
        'طبّق migration 089 على Supabase',
        'أنشئ حساب Auth ثم نفّذ سكربت ربط الدور',
        'سجّل الدخول وافتح /dev',
      ],
      sections: [
        {
          title: 'الصلاحيات',
          items: [
            { label: 'Monitoring', description: 'صحة النظام والأخطاء والوظائف الخلفية.' },
            { label: 'ممنوع', description: 'إدارة طلاب، نقاط، واجبات، أو أي دور مدرسي.' },
          ],
        },
      ],
      screens: [
        {
          path: '/dev',
          label: 'لوحة المطور',
          summary: 'مدخل Developer Workspace',
          howTo: ['سجّل الدخول بحساب platform_developer', 'ستُوجَّه تلقائياً إلى /dev'],
        },
      ],
      faq: [
        {
          question: 'هل يظهر الدور في إضافة مستخدم؟',
          answer: 'لا. يُنشأ يدوياً عبر Auth + سكربت SQL فقط.',
        },
      ],
      tips: [
        'طبّق migration 089 قبل إنشاء الحساب.',
        'لا تخلط حساب المطور مع حساب المدير.',
      ],
    };
  }
  return USER_ROLE_GUIDES[role];
}

export const EXPORTABLE_GUIDE_ROLES: UserRole[] = [
  'principal',
  'admin',
  'activity_leader',
  'supervisor',
  'teacher',
  'student',
  'parent',
];

export function getAllExportableGuides(): UserRoleGuide[] {
  return EXPORTABLE_GUIDE_ROLES.map((r) => getUserRoleGuide(r));
}
