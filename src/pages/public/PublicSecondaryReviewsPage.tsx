import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import type { LucideIcon } from 'lucide-react';
import {
  ArrowRight, CalendarDays, ClipboardList, FileCheck, FileQuestion, GraduationCap, Layers, Sparkles,
} from 'lucide-react';
import { PublishedExamReviewsList } from '../../components/academic/PublishedExamReviewsList';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { academicExamReviewService } from '../../lib/academic/adminService';
import {
  EXAM_REVIEW_TYPES,
  EXAM_REVIEW_TYPE_LABELS,
  HIGH_GRADES,
  formatGradeLabel,
} from '../../lib/academic/constants';
import type { AcademicExamReviewType } from '../../lib/academic/types';
import { PLATFORM_ICON, PLATFORM_NAME } from '../../lib/branding';

const ALL_TYPES = 'all';

const TYPE_ICONS: Record<AcademicExamReviewType, LucideIcon> = {
  exam: ClipboardList,
  solvedReview: FileCheck,
  unsolvedReview: FileQuestion,
  testSchedule: CalendarDays,
};

type Step = 'welcome' | 'grade' | 'type' | 'files';

function parseGrade(raw: string | null): number | null {
  const n = Number(raw);
  return HIGH_GRADES.includes(n) ? n : null;
}

function parseType(raw: string | null): AcademicExamReviewType | typeof ALL_TYPES | null {
  if (raw === ALL_TYPES) return ALL_TYPES;
  return EXAM_REVIEW_TYPES.includes(raw as AcademicExamReviewType) ? (raw as AcademicExamReviewType) : null;
}

function gradeShortLabel(g: number) {
  return formatGradeLabel('high', g).replace('الصف ', '');
}

function filesCountLabel(n: number) {
  if (n === 0) return 'لا توجد ملفات';
  if (n === 1) return 'ملف واحد';
  if (n === 2) return 'ملفان';
  if (n <= 10) return `${n} ملفات`;
  return `${n} ملفاً`;
}

function StepDots({ step }: { step: Step }) {
  const order: Step[] = ['grade', 'type', 'files'];
  const labels = ['الصف', 'نوع المراجعة', 'الملفات'];
  const current = order.indexOf(step);
  return (
    <ol className="flex items-center gap-2 mb-6" aria-label="خطوات">
      {order.map((s, i) => (
        <li key={s} className="flex items-center gap-2 flex-1 min-w-0">
          <span
            className={clsx(
              'w-7 h-7 shrink-0 rounded-full flex items-center justify-center text-xs font-bold border',
              i < current && 'bg-amber-100 border-amber-300 text-amber-800',
              i === current && 'bg-gold-500 border-gold-500 text-white',
              i > current && 'bg-white border-slate-200 text-slate-400',
            )}
          >
            {i + 1}
          </span>
          <span className={clsx('text-xs truncate', i === current ? 'text-slate-900 font-semibold' : 'text-slate-400')}>
            {labels[i]}
          </span>
          {i < order.length - 1 && <span className="flex-1 h-px bg-slate-200 min-w-[12px]" />}
        </li>
      ))}
    </ol>
  );
}

function ChoiceCard({
  icon: Icon,
  title,
  hint,
  onClick,
  disabled,
}: {
  icon: LucideIcon;
  title: string;
  hint: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group w-full flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-right shadow-sm transition-all hover:border-amber-300 hover:shadow-md active:scale-[0.99] disabled:opacity-40 disabled:pointer-events-none"
    >
      <span className="w-12 h-12 shrink-0 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 group-hover:bg-amber-100">
        <Icon className="w-6 h-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-slate-900 font-bold text-base sm:text-lg">{title}</span>
        <span className="block text-slate-500 text-xs mt-0.5">{hint}</span>
      </span>
      <ArrowRight className="w-5 h-5 text-slate-300 rotate-180 group-hover:text-amber-500" />
    </button>
  );
}

/** صفحة عامة بدون تسجيل دخول — ترحيب ← الصف ← نوع المراجعة ← الملفات */
export function PublicSecondaryReviewsPage() {
  const [params, setParams] = useSearchParams();
  const grade = parseGrade(params.get('grade'));
  const type = grade ? parseType(params.get('type')) : null;

  const step: Step = grade
    ? type ? 'files' : 'type'
    : params.get('step') === 'grade' ? 'grade' : 'welcome';

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ['published-academic-reviews'],
    queryFn: academicExamReviewService.listPublished,
  });

  const highReviews = useMemo(() => reviews.filter((r) => r.education_level === 'high'), [reviews]);

  const countByGrade = useMemo(() => {
    const map = new Map<number, number>();
    for (const r of highReviews) map.set(r.grade, (map.get(r.grade) ?? 0) + 1);
    return map;
  }, [highReviews]);

  const typesForGrade = useMemo(() => {
    if (!grade) return [];
    const counts = new Map<AcademicExamReviewType, number>();
    for (const r of highReviews) {
      if (r.grade === grade) counts.set(r.type, (counts.get(r.type) ?? 0) + 1);
    }
    return EXAM_REVIEW_TYPES
      .filter((t) => counts.has(t))
      .map((t) => ({ type: t, count: counts.get(t)! }));
  }, [highReviews, grade]);

  const go = (next: Record<string, string>) => setParams(next);

  const goBack = () => {
    if (step === 'files') go({ grade: String(grade) });
    else if (step === 'type') go({ step: 'grade' });
    else go({});
  };

  if (step === 'welcome') {
    return (
      <PublicShell>
        <div className="min-h-[80dvh] flex flex-col items-center justify-center text-center gap-6">
          <img
            src={PLATFORM_ICON}
            alt={PLATFORM_NAME}
            className="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl object-cover border border-slate-200 bg-white shadow-xl animate-float"
          />
          <div className="space-y-2">
            <p className="text-amber-600 text-sm font-semibold inline-flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" /> {PLATFORM_NAME}
            </p>
            <h1 className="text-2xl sm:text-4xl font-bold leading-snug text-slate-900">
              أهلاً بك في مراجعات
              <br />
              المرحلة الثانوية
            </h1>
            <p className="text-slate-600 text-sm sm:text-base max-w-md mx-auto leading-relaxed">
              كل المراجعات والاختبارات وجداول الاختبارات التي تنشرها إدارة المدرسة في مكان واحد —
              اعرضها أو حمّلها بخطوتين فقط.
            </p>
          </div>
          <button
            type="button"
            onClick={() => go({ step: 'grade' })}
            className="inline-flex items-center gap-2 rounded-2xl bg-gold-500 hover:bg-gold-600 text-white font-bold text-lg px-10 py-3.5 shadow-lg shadow-gold-500/30 transition-colors"
          >
            ابدأ
            <ArrowRight className="w-5 h-5 rotate-180" />
          </button>
        </div>
      </PublicShell>
    );
  }

  return (
    <PublicShell>
      <header className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={goBack}
          className="w-10 h-10 shrink-0 rounded-xl border border-slate-200 bg-white shadow-sm flex items-center justify-center text-slate-600 hover:text-amber-600"
          aria-label="رجوع"
        >
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <p className="text-slate-500 text-xs truncate">مراجعات المرحلة الثانوية</p>
          <h1 className="text-lg sm:text-xl font-bold leading-snug truncate text-slate-900">
            {step === 'grade' && 'اختر صفك'}
            {step === 'type' && grade && `${formatGradeLabel('high', grade)} — اختر نوع المراجعة`}
            {step === 'files' && grade && formatGradeLabel('high', grade)}
          </h1>
        </div>
      </header>

      <StepDots step={step} />

      {isLoading && step !== 'files' ? (
        <TapHandLoader label="جاري التحميل..." />
      ) : step === 'grade' ? (
        <div className="space-y-3">
          {HIGH_GRADES.map((g) => (
            <ChoiceCard
              key={g}
              icon={GraduationCap}
              title={gradeShortLabel(g)}
              hint={filesCountLabel(countByGrade.get(g) ?? 0)}
              onClick={() => go({ grade: String(g) })}
            />
          ))}
        </div>
      ) : step === 'type' ? (
        typesForGrade.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-8 text-center space-y-3">
            <p className="text-slate-600">لم تُنشر مراجعات لهذا الصف بعد</p>
            <button type="button" onClick={goBack} className="text-amber-600 text-sm font-semibold hover:underline">
              اختر صفاً آخر
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {typesForGrade.map(({ type: t, count }) => (
              <ChoiceCard
                key={t}
                icon={TYPE_ICONS[t]}
                title={EXAM_REVIEW_TYPE_LABELS[t]}
                hint={filesCountLabel(count)}
                onClick={() => go({ grade: String(grade), type: t })}
              />
            ))}
            {typesForGrade.length > 1 && (
              <ChoiceCard
                icon={Layers}
                title="عرض الكل"
                hint={filesCountLabel(typesForGrade.reduce((s, x) => s + x.count, 0))}
                onClick={() => go({ grade: String(grade), type: ALL_TYPES })}
              />
            )}
          </div>
        )
      ) : (
        grade && (
          <PublishedExamReviewsList
            key={`${grade}-${type}`}
            lockLevel="high"
            lockGrade={grade}
            lockType={type && type !== ALL_TYPES ? type : undefined}
            scopeTitle={type && type !== ALL_TYPES ? EXAM_REVIEW_TYPE_LABELS[type] : 'كل الأنواع'}
            lockLabel={formatGradeLabel('high', grade)}
            tone="light"
          />
        )
      )}
    </PublicShell>
  );
}

function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-slate-50 text-slate-900 font-cairo" dir="rtl">
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          background:
            'radial-gradient(ellipse 80% 50% at 10% 0%, rgba(240,180,41,0.16) 0%, transparent 55%), radial-gradient(ellipse 60% 40% at 90% 10%, rgba(117,81,255,0.08) 0%, transparent 50%)',
        }}
      />
      <div className="relative mx-auto w-full max-w-2xl px-4 py-6 sm:py-10">{children}</div>
    </div>
  );
}
