import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Bell, Wifi, WifiOff, Copy, MessageCircle, Plus, Trash2 } from 'lucide-react';
import { academicConfigService } from '../../../lib/academic/adminService';
import {
  clearWhatsAppApiCache,
  fetchWhatsAppServerStatus,
} from '../../../lib/whatsappReminder';
import {
  AcademicLayout,
  AcademicPageHeader,
  academicInputClass,
  academicBtnPrimary,
  academicBtnSecondary,
} from '../../../components/academic/AcademicUi';
import type { AcademicAutoReminderSettings, AcademicEducationLevel, AcademicSemester, AcademicWeekCalendarsConfig } from '../../../lib/academic/types';
import { DEFAULT_AUTO_REMINDER_SETTINGS, EMPTY_WEEK_CALENDARS } from '../../../lib/academic/types';
import { SEMESTER_LABELS, weekOptionsForSemester } from '../../../lib/academic/constants';
import { SemesterWeekCalendarEditor } from '../../../components/academic/SemesterWeekCalendarEditor';

const WEEKDAY_OPTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'الأحد' },
  { value: 1, label: 'الإثنين' },
  { value: 2, label: 'الثلاثاء' },
  { value: 3, label: 'الأربعاء' },
  { value: 4, label: 'الخميس' },
  { value: 5, label: 'الجمعة' },
  { value: 6, label: 'السبت' },
];

export function PrincipalAcademicSettingsPage() {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [teacherCode, setTeacherCode] = useState('');
  const [levels, setLevels] = useState<AcademicEducationLevel[]>(['middle', 'high']);
  const [whatsappUrl, setWhatsappUrl] = useState('');
  const [reminders, setReminders] = useState<AcademicAutoReminderSettings>({
    ...DEFAULT_AUTO_REMINDER_SETTINGS,
  });
  const [weekCalendars, setWeekCalendars] = useState<AcademicWeekCalendarsConfig>(EMPTY_WEEK_CALENDARS);

  const teacherRegisterUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/register/teacher` : '/register/teacher';

  useQuery({
    queryKey: ['academic-settings'],
    queryFn: async () => {
      setCode(await academicConfigService.getParentActivationCode());
      setTeacherCode(await academicConfigService.getTeacherSignupCode());
      setLevels(await academicConfigService.getEnabledLevels());
      setWhatsappUrl(await academicConfigService.getWhatsAppApiUrl());
      setReminders(await academicConfigService.getAutoReminderSettings());
      setWeekCalendars(await academicConfigService.getSemesterWeekCalendars());
      return true;
    },
  });

  const { data: waStatus, refetch: refetchWa } = useQuery({
    queryKey: ['whatsapp-server-status', whatsappUrl],
    queryFn: () => fetchWhatsAppServerStatus(),
    enabled: !!whatsappUrl.trim(),
    refetchInterval: 30000,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      await academicConfigService.update('parent_activation_code', code);
      await academicConfigService.update('teacher_signup_code', teacherCode.trim().toUpperCase());
      await academicConfigService.update('enabled_education_levels', levels);
      await academicConfigService.saveWhatsAppApiUrl(whatsappUrl);
      await academicConfigService.saveAutoReminderSettings(reminders);
      await academicConfigService.saveSemesterWeekCalendars(weekCalendars);
      clearWhatsAppApiCache();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['academic-settings'] });
      qc.invalidateQueries({ queryKey: ['semester-week-calendars'] });
      qc.invalidateQueries({ queryKey: ['whatsapp-server-status'] });
      toast.success('تم حفظ الإعدادات — مواعيد التذكير تُطبَّق تلقائياً خلال دقيقة');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (l: AcademicEducationLevel) => {
    setLevels(levels.includes(l) ? levels.filter((x) => x !== l) : [...levels, l]);
  };

  const toggleReminder = (key: 'enabled' | 'homework_enabled' | 'weekly_plan_enabled') => {
    setReminders((r) => ({ ...r, [key]: !r[key] }));
  };

  const copyTeacherLink = async () => {
    try {
      await navigator.clipboard.writeText(teacherRegisterUrl);
      toast.success('تم نسخ رابط تسجيل المعلمين');
    } catch {
      toast.error('تعذّر النسخ — انسخ الرابط يدوياً');
    }
  };

  const updateHomeworkTime = (index: number, value: string) => {
    setReminders((r) => {
      const homework_times = [...r.homework_times];
      homework_times[index] = value;
      return { ...r, homework_times };
    });
  };

  const addHomeworkTime = () => {
    setReminders((r) => ({
      ...r,
      homework_times: [...r.homework_times, '12:00'],
    }));
  };

  const removeHomeworkTime = (index: number) => {
    setReminders((r) => ({
      ...r,
      homework_times: r.homework_times.filter((_, i) => i !== index),
    }));
  };

  const updatePlanSlot = (index: number, patch: Partial<{ weekday: number; time: string }>) => {
    setReminders((r) => {
      const weekly_plan_slots = r.weekly_plan_slots.map((s, i) =>
        i === index ? { ...s, ...patch } : s,
      );
      return { ...r, weekly_plan_slots };
    });
  };

  const addPlanSlot = () => {
    setReminders((r) => ({
      ...r,
      weekly_plan_slots: [...r.weekly_plan_slots, { weekday: 3, time: '12:00' }],
    }));
  };

  const removePlanSlot = (index: number) => {
    setReminders((r) => ({
      ...r,
      weekly_plan_slots: r.weekly_plan_slots.filter((_, i) => i !== index),
    }));
  };

  return (
    <AcademicLayout size="lg">
      <AcademicPageHeader title="إعدادات أكاديمية" backTo="/principal/academic" />
      <div className="horizon-card rounded-[20px] bg-[#111c44] p-5 space-y-6">
        <label className="text-sm text-[#A3AED0] block">كود تفعيل المراجعات لولي الأمر
          <input className={academicInputClass} dir="ltr" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
        </label>

        <div className="border-t border-white/10 pt-5 space-y-3">
          <p className="text-white font-semibold text-sm">تسجيل المعلمين عبر Google</p>
          <p className="text-[#A3AED0] text-xs leading-relaxed">
            شارك الرابط مع المعلمين مع كود التفعيل. بعد Google يكملون الاسم والجوال ثم الصفوف والمواد والجدول.
          </p>
          <label className="text-sm text-[#A3AED0] block">
            كود تفعيل تسجيل المعلمين
            <input
              className={academicInputClass}
              dir="ltr"
              value={teacherCode}
              onChange={(e) => setTeacherCode(e.target.value.toUpperCase())}
            />
          </label>
          <div className="flex flex-wrap gap-2 items-center">
            <input className={academicInputClass} dir="ltr" readOnly value={teacherRegisterUrl} />
            <button type="button" className={academicBtnSecondary} onClick={copyTeacherLink}>
              <Copy className="w-4 h-4" />
              نسخ الرابط
            </button>
          </div>
        </div>

        <div>
          <p className="text-sm text-[#A3AED0] mb-2">المراحل المفعّلة</p>
          <div className="flex gap-2">
            {(['middle', 'high'] as AcademicEducationLevel[]).map((l) => (
              <button key={l} type="button" className={`px-3 py-1 rounded-full text-sm ${levels.includes(l) ? 'bg-gold-500 text-navy-950' : 'bg-white/10 text-white'}`} onClick={() => toggle(l)}>
                {l === 'middle' ? 'متوسط' : 'ثانوي'}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-white/10 pt-5 space-y-3">
          <p className="text-white font-semibold text-sm">خادم واتساب (VPS)</p>
          <input
            className={academicInputClass}
            dir="ltr"
            placeholder="https://wpp.northelite0.com"
            value={whatsappUrl}
            onChange={(e) => setWhatsappUrl(e.target.value.trim())}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={academicBtnSecondary}
              onClick={async () => {
                clearWhatsAppApiCache();
                await academicConfigService.saveWhatsAppApiUrl(whatsappUrl);
                const s = await refetchWa();
                if (s.data?.connected) toast.success('واتساب متصل وجاهز للإرسال');
                else if (s.data?.status === 'offline') toast.error('تعذّر الاتصال بالخادم');
                else toast.error('الخادم يعمل لكن واتساب غير مربوط');
              }}
            >
              اختبار الاتصال
            </button>
            {waStatus?.connected && waStatus.supportsTextReminders && (
              <span className="inline-flex items-center gap-1 text-[#25D366] text-xs font-medium">
                <Wifi className="w-3.5 h-3.5" />
                متصل — إرسال تلقائي جاهز
              </span>
            )}
            {waStatus?.status === 'offline' && (
              <span className="inline-flex items-center gap-1 text-red-300 text-xs">
                <WifiOff className="w-3.5 h-3.5" />
                لا يوجد اتصال بالخادم
              </span>
            )}
            <Link to="/principal/academic/whatsapp-reminders" className={academicBtnSecondary}>
              <MessageCircle className="w-4 h-4" />
              إرسال تذكير الآن
            </Link>
          </div>
        </div>

        <SemesterWeekCalendarEditor value={weekCalendars} onChange={setWeekCalendars} />

        <div className="border-t border-white/10 pt-5 space-y-4">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Bell className="w-4 h-4 text-gold-400" />
            التذكير التلقائي عبر واتساب
          </div>
          <p className="text-[#A3AED0] text-xs leading-relaxed">
            يعمل على خادم VPS (جدولة يومية). أسبوع الخطة يُؤخذ تلقائياً من{' '}
            <strong className="text-white/80">تقويم الأسابيع</strong> أعلاه إن وُجد،
            وإلا من الفصل/الأسبوع أدناه. الإرسال اليدوي من شاشة المراقبة أو «تذكيرات واتساب».
          </p>
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
            <input type="checkbox" checked={reminders.enabled} onChange={() => toggleReminder('enabled')} className="rounded" />
            تفعيل التذكير التلقائي
          </label>
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer mr-4">
            <input type="checkbox" checked={reminders.homework_enabled} disabled={!reminders.enabled} onChange={() => toggleReminder('homework_enabled')} className="rounded" />
            تذكير الواجبات (أحد–خميس)
          </label>
          <label className="flex items-center gap-2 text-sm text-white cursor-pointer mr-4">
            <input type="checkbox" checked={reminders.weekly_plan_enabled} disabled={!reminders.enabled} onChange={() => toggleReminder('weekly_plan_enabled')} className="rounded" />
            تذكير الخطة الأسبوعية
          </label>
          <div className="grid sm:grid-cols-2 gap-3 max-w-md">
            <label className="block text-sm text-[#A3AED0]">
              الفصل للخطة
              <select
                className={academicInputClass}
                value={reminders.semester}
                disabled={!reminders.enabled}
                onChange={(e) => setReminders((r) => ({ ...r, semester: +e.target.value as AcademicSemester }))}
              >
                {(Object.entries(SEMESTER_LABELS) as [string, string][]).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-[#A3AED0]">
              رقم الأسبوع (احتياطي إن لم يُضبط التقويم)
              <select
                className={academicInputClass}
                value={reminders.week_number}
                disabled={!reminders.enabled}
                onChange={(e) => setReminders((r) => ({ ...r, week_number: +e.target.value }))}
              >
                {weekOptionsForSemester(reminders.semester).map((w) => (
                  <option key={w} value={w}>الأسبوع {w}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-white text-sm font-semibold">أوقات تذكير الواجبات</p>
              <span className="text-[#A3AED0] text-[11px]">أيام الأحد–الخميس فقط · توقيت السعودية</span>
            </div>
            <div className="space-y-2">
              {reminders.homework_times.map((t, i) => (
                <div key={`hw-${i}`} className="flex items-center gap-2">
                  <input
                    type="time"
                    className={academicInputClass}
                    dir="ltr"
                    disabled={!reminders.enabled || !reminders.homework_enabled}
                    value={t}
                    onChange={(e) => updateHomeworkTime(i, e.target.value)}
                  />
                  <button
                    type="button"
                    className={academicBtnSecondary}
                    disabled={!reminders.enabled || reminders.homework_times.length <= 1}
                    onClick={() => removeHomeworkTime(i)}
                    title="حذف الوقت"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={academicBtnSecondary}
              disabled={!reminders.enabled || !reminders.homework_enabled}
              onClick={addHomeworkTime}
            >
              <Plus className="w-4 h-4" />
              إضافة وقت
            </button>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-white text-sm font-semibold">مواعيد تذكير الخطة الأسبوعية</p>
              <span className="text-[#A3AED0] text-[11px]">اختر اليوم والوقت · توقيت السعودية</span>
            </div>
            <div className="space-y-2">
              {reminders.weekly_plan_slots.map((slot, i) => (
                <div key={`plan-${i}`} className="flex flex-wrap items-center gap-2">
                  <select
                    className={academicInputClass}
                    disabled={!reminders.enabled || !reminders.weekly_plan_enabled}
                    value={slot.weekday}
                    onChange={(e) => updatePlanSlot(i, { weekday: +e.target.value })}
                  >
                    {WEEKDAY_OPTIONS.map((d) => (
                      <option key={d.value} value={d.value}>{d.label}</option>
                    ))}
                  </select>
                  <input
                    type="time"
                    className={academicInputClass}
                    dir="ltr"
                    disabled={!reminders.enabled || !reminders.weekly_plan_enabled}
                    value={slot.time}
                    onChange={(e) => updatePlanSlot(i, { time: e.target.value })}
                  />
                  <button
                    type="button"
                    className={academicBtnSecondary}
                    disabled={!reminders.enabled || reminders.weekly_plan_slots.length <= 1}
                    onClick={() => removePlanSlot(i)}
                    title="حذف الموعد"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className={academicBtnSecondary}
              disabled={!reminders.enabled || !reminders.weekly_plan_enabled}
              onClick={addPlanSlot}
            >
              <Plus className="w-4 h-4" />
              إضافة موعد
            </button>
          </div>
        </div>

        <button
          type="button"
          className={academicBtnPrimary}
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
        >
          {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
        </button>
      </div>
    </AcademicLayout>
  );
}
