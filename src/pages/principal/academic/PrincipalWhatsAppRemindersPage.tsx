import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  CheckSquare,
  MessageCircle,
  Search,
  Send,
  Square,
  Wifi,
  WifiOff,
} from 'lucide-react';
import { academicAdminService } from '../../../lib/academic/adminService';
import {
  PRINCIPAL_REMINDER_KINDS,
  buildPrincipalReminderDraft,
  fetchWhatsAppServerStatus,
  personalizeReminderMessage,
  sendBulkWhatsAppTexts,
  type PrincipalReminderKind,
} from '../../../lib/whatsappReminder';
import {
  AcademicLayout,
  AcademicPageHeader,
  academicBtnPrimary,
  academicBtnSecondary,
  academicInputClass,
} from '../../../components/academic/AcademicUi';
import { TapHandLoader } from '../../../components/ui/TapHandLoader';
import { formatSemesterWeek, getDefaultSemesterWeek, SEMESTER_LABELS } from '../../../lib/academic/constants';
import type { AcademicSemester } from '../../../lib/academic/types';
import clsx from 'clsx';

function todayIso() {
  return new Date().toISOString().split('T')[0];
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

type TeacherRow = {
  id: string;
  full_name: string;
  email?: string;
  phone?: string | null;
};

export function PrincipalWhatsAppRemindersPage() {
  const defaults = getDefaultSemesterWeek();
  const [kind, setKind] = useState<PrincipalReminderKind>('homework');
  const [dateIso, setDateIso] = useState(todayIso());
  const [semester, setSemester] = useState<AcademicSemester>(defaults.semester);
  const [weekNumber, setWeekNumber] = useState(defaults.week);
  const [pendingCount, setPendingCount] = useState(1);
  const [meetingDetails, setMeetingDetails] = useState('اجتماع هيئة التدريس غداً الساعة 12 ظهراً');
  const [examDetails, setExamDetails] = useState('إعداد/تسليم اختبارات الفترة');
  const [customBody, setCustomBody] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [onlyWithPhone, setOnlyWithPhone] = useState(true);

  const { data: teachers = [], isLoading } = useQuery({
    queryKey: ['academic-teachers-wa'],
    queryFn: () => academicAdminService.listTeachers(),
  });

  const { data: waStatus } = useQuery({
    queryKey: ['whatsapp-server-status-broadcast'],
    queryFn: () => fetchWhatsAppServerStatus(),
    refetchInterval: 30000,
  });

  const weekLabel = formatSemesterWeek(semester, weekNumber);
  const dateLabel = formatArDate(dateIso);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (teachers as TeacherRow[]).filter((t) => {
      if (onlyWithPhone && !t.phone?.trim()) return false;
      if (!q) return true;
      return (
        t.full_name.toLowerCase().includes(q) ||
        (t.phone ?? '').includes(q) ||
        (t.email ?? '').toLowerCase().includes(q)
      );
    });
  }, [teachers, search, onlyWithPhone]);

  const withPhoneSelected = useMemo(
    () =>
      (teachers as TeacherRow[]).filter(
        (t) => selected.has(t.id) && t.phone?.trim(),
      ),
    [teachers, selected],
  );

  const previewMessage = useMemo(() => {
    const draft = buildPrincipalReminderDraft(kind, {
      teacherName: 'أحمد محمد',
      dateLabel,
      weekLabel,
      pendingCount,
      customBody,
      meetingDetails,
      examDetails,
    });
    return personalizeReminderMessage(draft, 'أحمد محمد');
  }, [kind, dateLabel, weekLabel, pendingCount, customBody, meetingDetails, examDetails]);

  const needsExtraField =
    kind === 'general' || kind === 'custom' || kind === 'meeting' || kind === 'exam';

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectFiltered = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      for (const t of filtered) next.add(t.id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const selectAllWithPhone = () => {
    setSelected(
      new Set(
        (teachers as TeacherRow[]).filter((t) => t.phone?.trim()).map((t) => t.id),
      ),
    );
  };

  const send = async () => {
    if (withPhoneSelected.length === 0) {
      toast.error('اختر معلماً واحداً على الأقل برقم جوال');
      return;
    }
    if ((kind === 'custom' || kind === 'general') && !customBody.trim()) {
      toast.error('اكتب نص الرسالة أولاً');
      return;
    }
    if (!confirm(`إرسال واتساب إلى ${withPhoneSelected.length} معلم؟`)) return;

    setSending(true);
    try {
      const items = withPhoneSelected.map((t) => {
        const draft = buildPrincipalReminderDraft(kind, {
          teacherName: t.full_name,
          dateLabel,
          weekLabel,
          pendingCount,
          customBody,
          meetingDetails,
          examDetails,
        });
        return {
          phone: t.phone!,
          message: personalizeReminderMessage(draft, t.full_name),
        };
      });
      const result = await sendBulkWhatsAppTexts(items);
      if (result.sent > 0) {
        toast.success(`تم الإرسال: ${result.sent} ناجح${result.failed ? `، ${result.failed} فشل` : ''}`);
      }
      if (result.failed > 0) {
        toast.error(result.errors[0] ?? `فشل ${result.failed}`, { duration: 6000 });
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الإرسال');
    } finally {
      setSending(false);
    }
  };

  return (
    <AcademicLayout size="lg">
      <AcademicPageHeader
        title="إرسال تذكيرات واتساب"
        subtitle="أي نوع تذكير — اختر القالب أو اكتب نصاً حراً وأرسل للمعلمين"
        backTo="/principal/academic"
      />

      <div className="mb-4 flex flex-wrap items-center gap-2 text-xs">
        {waStatus?.connected && waStatus.supportsTextReminders ? (
          <span className="inline-flex items-center gap-1 text-[#25D366] font-medium">
            <Wifi className="w-3.5 h-3.5" />
            واتساب متصل
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-amber-300">
            <WifiOff className="w-3.5 h-3.5" />
            واتساب غير جاهز — راجع الإعدادات الأكاديمية
          </span>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* نوع الرسالة */}
        <div className="horizon-card rounded-[20px] bg-[#111c44] p-5 space-y-4">
          <p className="text-white font-semibold text-sm flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-[#25D366]" />
            نوع التذكير
          </p>
          <div className="grid sm:grid-cols-2 gap-2">
            {PRINCIPAL_REMINDER_KINDS.map((k) => (
              <button
                key={k.id}
                type="button"
                onClick={() => setKind(k.id)}
                className={clsx(
                  'text-right rounded-xl border px-3 py-2.5 transition-colors',
                  kind === k.id
                    ? 'border-[#25D366]/50 bg-[#25D366]/15 text-white'
                    : 'border-white/10 bg-white/[0.03] text-[#A3AED0] hover:bg-white/[0.06]',
                )}
              >
                <span className="block text-sm font-semibold">{k.label}</span>
                <span className="block text-[11px] opacity-80 mt-0.5">{k.description}</span>
              </button>
            ))}
          </div>

          {(kind === 'homework' || kind === 'attendance') && (
            <label className="text-sm text-[#A3AED0] block">
              التاريخ
              <input
                type="date"
                className={academicInputClass}
                value={dateIso}
                onChange={(e) => setDateIso(e.target.value)}
              />
            </label>
          )}

          {kind === 'weekly_plan' && (
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm text-[#A3AED0] block">
                الفصل الدراسي
                <select
                  className={academicInputClass}
                  value={semester}
                  onChange={(e) => setSemester(+e.target.value as AcademicSemester)}
                >
                  {([1, 2, 3] as AcademicSemester[]).map((s) => (
                    <option key={s} value={s}>
                      {SEMESTER_LABELS[s]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-[#A3AED0] block">
                رقم الأسبوع
                <input
                  type="number"
                  min={1}
                  max={20}
                  className={academicInputClass}
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(+e.target.value || 1)}
                />
              </label>
            </div>
          )}

          {kind === 'observation' && (
            <label className="text-sm text-[#A3AED0] block">
              عدد الطلبات المعلّقة (تقريبي)
              <input
                type="number"
                min={1}
                className={academicInputClass}
                value={pendingCount}
                onChange={(e) => setPendingCount(Math.max(1, +e.target.value || 1))}
              />
            </label>
          )}

          {kind === 'meeting' && (
            <label className="text-sm text-[#A3AED0] block">
              تفاصيل الاجتماع
              <input
                className={academicInputClass}
                value={meetingDetails}
                onChange={(e) => setMeetingDetails(e.target.value)}
              />
            </label>
          )}

          {kind === 'exam' && (
            <label className="text-sm text-[#A3AED0] block">
              تفاصيل الاختبار
              <input
                className={academicInputClass}
                value={examDetails}
                onChange={(e) => setExamDetails(e.target.value)}
              />
            </label>
          )}

          {needsExtraField && (
            <label className="text-sm text-[#A3AED0] block">
              {kind === 'custom' ? 'نص الرسالة الحر' : 'نص إضافي'}
              <textarea
                className={clsx(academicInputClass, 'min-h-[120px] resize-y')}
                dir="rtl"
                placeholder={
                  kind === 'custom'
                    ? 'مثال: السلام عليكم {name}،\nيرجى...\n\n(استخدم {name} لاسم المعلم)'
                    : 'اكتب نص التذكير...'
                }
                value={customBody}
                onChange={(e) => setCustomBody(e.target.value)}
              />
            </label>
          )}

          <div className="rounded-xl border border-white/10 bg-black/20 p-3">
            <p className="text-[#A3AED0] text-xs mb-2">معاينة (مثال باسم أحمد محمد)</p>
            <pre className="whitespace-pre-wrap text-white text-sm font-sans leading-relaxed">
              {previewMessage}
            </pre>
          </div>
        </div>

        {/* المستلمون */}
        <div className="horizon-card rounded-[20px] bg-[#111c44] p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-white font-semibold text-sm">المستلمون</p>
            <span className="text-[#A3AED0] text-xs">
              محدد: {selected.size} — جاهز للإرسال: {withPhoneSelected.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={academicBtnSecondary} onClick={selectAllWithPhone}>
              كل من لديهم جوال
            </button>
            <button type="button" className={academicBtnSecondary} onClick={selectFiltered}>
              تحديد المعروض
            </button>
            <button type="button" className={academicBtnSecondary} onClick={clearSelection}>
              إلغاء التحديد
            </button>
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[160px]">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-white/30" />
              <input
                className={clsx(academicInputClass, 'pr-9')}
                placeholder="بحث بالاسم أو الجوال..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-[#A3AED0] cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={onlyWithPhone}
                onChange={(e) => setOnlyWithPhone(e.target.checked)}
                className="rounded"
              />
              بجوال فقط
            </label>
          </div>

          {isLoading ? (
            <TapHandLoader />
          ) : (
            <ul className="max-h-[420px] overflow-y-auto space-y-1 rounded-xl border border-white/10 p-2">
              {filtered.length === 0 && (
                <li className="text-[#A3AED0] text-sm p-3 text-center">لا يوجد معلمون مطابقون</li>
              )}
              {filtered.map((t) => {
                const hasPhone = !!t.phone?.trim();
                const checked = selected.has(t.id);
                return (
                  <li key={t.id}>
                    <button
                      type="button"
                      onClick={() => toggleOne(t.id)}
                      className={clsx(
                        'w-full flex items-center gap-3 rounded-lg px-3 py-2 text-right transition-colors',
                        checked ? 'bg-[#25D366]/15' : 'hover:bg-white/[0.04]',
                      )}
                    >
                      {checked ? (
                        <CheckSquare className="w-4 h-4 text-[#25D366] shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-white/30 shrink-0" />
                      )}
                      <span className="flex-1 min-w-0">
                        <span className="block text-white text-sm truncate">{t.full_name}</span>
                        <span className="block text-[11px] text-[#A3AED0] dir-ltr truncate" dir="ltr">
                          {hasPhone ? t.phone : 'بدون جوال'}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <button
            type="button"
            className={academicBtnPrimary}
            disabled={sending || withPhoneSelected.length === 0}
            onClick={send}
          >
            <Send className="w-4 h-4" />
            {sending ? 'جاري الإرسال...' : `إرسال واتساب (${withPhoneSelected.length})`}
          </button>
        </div>
      </div>
    </AcademicLayout>
  );
}
