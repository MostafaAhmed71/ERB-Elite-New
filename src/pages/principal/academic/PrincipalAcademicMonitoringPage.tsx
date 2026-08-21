import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { BookOpen, Calendar, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, UserX, Users } from 'lucide-react';
import { academicAdminService } from '../../../lib/academic/adminService';
import type { AcademicSemester, TeacherActivityEntry } from '../../../lib/academic/types';
import {
  AcademicLayout,
  AcademicPageHeader,
  AcademicBadge,
  academicInputClass,
} from '../../../components/academic/AcademicUi';
import { TapHandLoader } from '../../../components/ui/TapHandLoader';
import {
  SEMESTER_LABELS,
  weekOptionsForSemester,
  clampWeekToSemester,
  getDefaultSemesterWeek,
  formatSemesterWeek,
} from '../../../lib/academic/constants';
import {
  WhatsAppReminderToolbar,
  WhatsAppTeacherButton,
} from '../../../components/academic/WhatsAppReminderToolbar';
import {
  buildHomeworkReminderMessage,
  buildWeeklyPlanReminderMessage,
  buildObservationReminderMessage,
} from '../../../lib/whatsappReminder';

type Tab = 'homework' | 'weekly' | 'observation';

function todayIso() {
  return new Date().toISOString().split('T')[0];
}

function shiftDate(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function formatArDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function SummaryBar({
  completed,
  total,
  completedLabel,
  missingLabel,
}: {
  completed: number;
  total: number;
  completedLabel: string;
  missingLabel: string;
}) {
  const missing = total - completed;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.06] p-4 mb-5">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-2">
          <AcademicBadge variant="success">{completedLabel}: {completed}</AcademicBadge>
          <AcademicBadge variant="warning">{missingLabel}: {missing}</AcademicBadge>
          <AcademicBadge variant="info">من {total} معلم</AcademicBadge>
        </div>
        <span className="text-gold-400 font-bold text-sm tabular-nums">{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-white/10 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-l from-gold-500 to-[#01B574] transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function TeacherListPanel({
  title,
  icon: Icon,
  teachers,
  variant,
  emptyText,
  showWhatsApp,
  buildMessage,
}: {
  title: string;
  icon: typeof CheckCircle2;
  teachers: TeacherActivityEntry[];
  variant: 'success' | 'warning';
  emptyText: string;
  showWhatsApp?: boolean;
  buildMessage?: (teacher: TeacherActivityEntry) => string;
}) {
  const isSuccess = variant === 'success';
  return (
    <div
      className={clsx(
        'rounded-2xl border overflow-hidden flex flex-col min-h-[280px]',
        isSuccess ? 'border-[#01B574]/25 bg-[#01B574]/5' : 'border-amber-500/25 bg-amber-500/5',
      )}
    >
      <div
        className={clsx(
          'px-4 py-3 border-b flex items-center gap-2 font-bold text-sm',
          isSuccess ? 'border-[#01B574]/20 text-[#01B574]' : 'border-amber-500/20 text-amber-300',
        )}
      >
        <Icon className="w-4 h-4 shrink-0" />
        {title}
        <span className="mr-auto text-xs font-semibold opacity-80">({teachers.length})</span>
      </div>
      <ul className="flex-1 overflow-y-auto max-h-[min(52vh,420px)] p-2 space-y-1.5">
        {teachers.length === 0 ? (
          <li className="text-center text-[#A3AED0] text-sm py-8 px-4">{emptyText}</li>
        ) : (
          teachers.map((t) => (
            <li
              key={t.teacher_id}
              className={clsx(
                'rounded-xl px-3 py-2.5 border flex items-start gap-2',
                isSuccess
                  ? 'bg-white/[0.04] border-[#01B574]/15'
                  : 'bg-white/[0.03] border-amber-500/15',
              )}
            >
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-sm">{t.teacher_name}</p>
                {t.summary && (
                  <p className="text-[#A3AED0] text-xs mt-1 leading-relaxed">{t.summary}</p>
                )}
              </div>
              {showWhatsApp && buildMessage && (
                <WhatsAppTeacherButton teacher={t} buildMessage={buildMessage} />
              )}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function PrincipalAcademicMonitoringPage() {
  const planDefaults = getDefaultSemesterWeek();
  const [tab, setTab] = useState<Tab>('homework');
  const [hwDate, setHwDate] = useState(todayIso);
  const [semester, setSemester] = useState<AcademicSemester>(planDefaults.semester);
  const [week, setWeek] = useState(planDefaults.week);

  const { data: hwMonitoring, isLoading: hwLoading } = useQuery({
    queryKey: ['academic-monitoring-hw', hwDate],
    queryFn: () => academicAdminService.getHomeworkDayMonitoring(hwDate),
    enabled: tab === 'homework',
  });

  const { data: planMonitoring, isLoading: planLoading } = useQuery({
    queryKey: ['academic-monitoring-plan', semester, week],
    queryFn: () => academicAdminService.getWeeklyPlanWeekMonitoring(semester, week),
    enabled: tab === 'weekly',
  });

  const { data: obsMonitoring, isLoading: obsLoading } = useQuery({
    queryKey: ['academic-monitoring-obs'],
    queryFn: () => academicAdminService.getObservationReportMonitoring(),
    enabled: tab === 'observation',
  });

  const isLoading =
    tab === 'homework' ? hwLoading : tab === 'weekly' ? planLoading : obsLoading;

  const hwDateLabel = formatArDate(hwDate);
  const weekLabel = formatSemesterWeek(semester, week);

  const hwMessage = (t: TeacherActivityEntry) =>
    buildHomeworkReminderMessage(t.teacher_name, hwDateLabel);
  const planMessage = (t: TeacherActivityEntry) =>
    buildWeeklyPlanReminderMessage(t.teacher_name, weekLabel);
  const obsMessage = (t: TeacherActivityEntry) =>
    buildObservationReminderMessage(t.teacher_name, obsMonitoring?.pending_requests ?? 0);

  return (
    <AcademicLayout size="6xl">
      <AcademicPageHeader
        title="مراقبة نشاط المعلمين"
        subtitle="متابعة الواجبات والخطة الأسبوعية وتقارير ملاحظات أولياء الأمور — مع تذكير واتساب للمعلمين"
        backTo="/principal/academic"
      />

      <div className="flex flex-wrap gap-2 mb-5">
        {([
          ['homework', 'الواجبات', BookOpen],
          ['weekly', 'الخطة الأسبوعية', Calendar],
          ['observation', 'ملاحظات ولي الأمر', ClipboardList],
        ] as const).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              'flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors',
              tab === id ? 'bg-gold-500 text-navy-950' : 'bg-white/10 text-white hover:bg-white/15',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'homework' ? (
        <div className="horizon-card rounded-[20px] bg-[#111c44] p-4 sm:p-5 border border-white/[0.04] mb-5">
          <p className="text-[#A3AED0] text-xs mb-2">تاريخ الواجبات</p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white"
              onClick={() => setHwDate((d) => shiftDate(d, -1))}
              aria-label="اليوم السابق"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <input
              type="date"
              className={clsx(academicInputClass, 'max-w-[200px]')}
              value={hwDate}
              onChange={(e) => setHwDate(e.target.value)}
            />
            <button
              type="button"
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white"
              onClick={() => setHwDate((d) => shiftDate(d, 1))}
              aria-label="اليوم التالي"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              className="text-sm text-gold-400 font-semibold hover:underline mr-2"
              onClick={() => setHwDate(todayIso())}
            >
              اليوم
            </button>
          </div>
          <p className="text-white text-sm mt-3 font-medium">{hwDateLabel}</p>
        </div>
      ) : tab === 'weekly' ? (
        <div className="horizon-card rounded-[20px] bg-[#111c44] p-4 sm:p-5 border border-white/[0.04] mb-5">
          <p className="text-[#A3AED0] text-xs mb-2">الأسبوع الدراسي</p>
          <div className="grid sm:grid-cols-2 gap-3 max-w-md">
            <label className="block">
              <span className="text-[#A3AED0] text-xs mb-1 block">الفصل الدراسي</span>
              <select
                className={academicInputClass}
                value={semester}
                onChange={(e) => {
                  const s = +e.target.value as AcademicSemester;
                  setSemester(s);
                  setWeek((w) => clampWeekToSemester(s, w));
                }}
              >
                {(Object.entries(SEMESTER_LABELS) as [string, string][]).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[#A3AED0] text-xs mb-1 block">الأسبوع</span>
              <select className={academicInputClass} value={week} onChange={(e) => setWeek(+e.target.value)}>
                {weekOptionsForSemester(semester).map((w) => (
                  <option key={w} value={w}>الأسبوع {w}</option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-white text-sm mt-3 font-medium">{weekLabel}</p>
        </div>
      ) : (
        <div className="horizon-card rounded-[20px] bg-[#111c44] p-4 sm:p-5 border border-white/[0.04] mb-5">
          <p className="text-[#A3AED0] text-xs mb-2">طلبات ملاحظات أولياء الأمور</p>
          <div className="flex flex-wrap items-center gap-3">
            <AcademicBadge variant={obsMonitoring?.pending_requests ? 'warning' : 'success'}>
              طلبات معلّقة: {obsMonitoring?.pending_requests ?? '—'}
            </AcademicBadge>
            <p className="text-white/70 text-sm">
              يُذكَّر المعلمون الذين لم يُضيفوا ملاحظاتهم بعد في التقارير
            </p>
          </div>
        </div>
      )}

      {isLoading ? (
        <TapHandLoader label="جاري التحميل..." />
      ) : tab === 'homework' && hwMonitoring ? (
        <>
          <SummaryBar
            completed={hwMonitoring.completed.length}
            total={hwMonitoring.total_teachers}
            completedLabel="قاموا بالواجب"
            missingLabel="لم يقيموا"
          />
          {hwMonitoring.missing.length > 0 && (
            <WhatsAppReminderToolbar
              className="mb-4"
              teachers={hwMonitoring.missing}
              buildMessage={hwMessage}
              label="تذكير واتساب — واجب منزلي"
            />
          )}
          <div className="grid lg:grid-cols-2 gap-4">
            <TeacherListPanel
              title="قاموا بإدخال الواجب"
              icon={CheckCircle2}
              teachers={hwMonitoring.completed}
              variant="success"
              emptyText="لا يوجد معلم أدخل واجباً في هذا التاريخ"
            />
            <TeacherListPanel
              title="لم يقيموا بإدخال الواجب"
              icon={UserX}
              teachers={hwMonitoring.missing}
              variant="warning"
              emptyText="جميع المعلمين أدخلوا واجباتهم — ممتاز!"
              showWhatsApp
              buildMessage={hwMessage}
            />
          </div>
        </>
      ) : tab === 'weekly' && planMonitoring ? (
        <>
          <SummaryBar
            completed={planMonitoring.completed.length}
            total={planMonitoring.total_teachers}
            completedLabel="أدخلوا الخطة"
            missingLabel="لم يدخلوا"
          />
          {planMonitoring.missing.length > 0 && (
            <WhatsAppReminderToolbar
              className="mb-4"
              teachers={planMonitoring.missing}
              buildMessage={planMessage}
              label="تذكير واتساب — خطة أسبوعية"
            />
          )}
          <div className="grid lg:grid-cols-2 gap-4">
            <TeacherListPanel
              title="قاموا بإدخال الخطة الأسبوعية"
              icon={CheckCircle2}
              teachers={planMonitoring.completed}
              variant="success"
              emptyText="لا يوجد معلم أدخل خطة لهذا الأسبوع"
            />
            <TeacherListPanel
              title="لم يقيموا بإدخال الخطة"
              icon={UserX}
              teachers={planMonitoring.missing}
              variant="warning"
              emptyText="جميع المعلمين أدخلوا خططهم — ممتاز!"
              showWhatsApp
              buildMessage={planMessage}
            />
          </div>
        </>
      ) : tab === 'observation' && obsMonitoring ? (
        <>
          <SummaryBar
            completed={obsMonitoring.completed.length}
            total={obsMonitoring.total_teachers}
            completedLabel="أضافوا ملاحظات"
            missingLabel="لم يُضيفوا"
          />
          {obsMonitoring.missing.length > 0 && obsMonitoring.pending_requests > 0 && (
            <WhatsAppReminderToolbar
              className="mb-4"
              teachers={obsMonitoring.missing}
              buildMessage={obsMessage}
              label="تذكير واتساب — تقرير ملاحظات ولي الأمر"
            />
          )}
          <div className="grid lg:grid-cols-2 gap-4">
            <TeacherListPanel
              title="أضافوا ملاحظاتهم في التقارير"
              icon={CheckCircle2}
              teachers={obsMonitoring.completed}
              variant="success"
              emptyText="لا يوجد معلم أضاف ملاحظات بعد"
            />
            <TeacherListPanel
              title="لم يُضيفوا ملاحظاتهم بعد"
              icon={UserX}
              teachers={obsMonitoring.missing}
              variant="warning"
              emptyText={
                obsMonitoring.pending_requests > 0
                  ? 'جميع المعلمين أضافوا ملاحظاتهم — ممتاز!'
                  : 'لا توجد طلبات معلّقة حالياً'
              }
              showWhatsApp={obsMonitoring.pending_requests > 0}
              buildMessage={obsMessage}
            />
          </div>
        </>
      ) : null}

      <p className="text-[#A3AED0] text-xs text-center mt-6 flex items-center justify-center gap-1">
        <Users className="w-3.5 h-3.5" />
        الإرسال اليدوي متاح — والتذكير التلقائي يعمل حسب الجدولة من الإعدادات الأكاديمية
      </p>
    </AcademicLayout>
  );
}
