import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Clock,
  Copy,
  ExternalLink,
  Link2,
  Power,
  Save,
  Settings2,
  Trash2,
  Trophy,
} from 'lucide-react';
import clsx from 'clsx';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Panel } from '../../components/ui/Card';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { showError, showSuccess } from '../../lib/toast';
import { COMP_SETTINGS_KEY, useCompSettings } from '../../hooks/competition/useCompSettings';
import {
  COMP_SUBJECTS,
  deleteCompQuestion,
  fetchDailyResults,
  formatStartTime,
  getRiyadhDateString,
  listCompClasses,
  listCompQuestions,
  setQuestionActive,
  updateCompSettings,
  upsertCompQuestion,
  type CompQuestion,
  type CompSettings,
} from '../../lib/competition';

type Tab = 'schedule' | 'question' | 'list' | 'links';

const EMPTY_FORM = {
  question_text: '',
  subject: COMP_SUBJECTS[0] as string,
  option0: '',
  option1: '',
  option2: '',
  option3: '',
  correct_answer: 0,
  scheduled_date: getRiyadhDateString(),
  is_active: false,
};

function copyText(text: string) {
  void navigator.clipboard.writeText(text);
  showSuccess('تم النسخ');
}

export function CompAdminPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>('schedule');
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [subjectFilter, setSubjectFilter] = useState('');
  const [resultsQuestionId, setResultsQuestionId] = useState<string | null>(null);

  const { data: settings, isLoading: settingsLoading } = useCompSettings();
  const [scheduleDraft, setScheduleDraft] = useState<CompSettings | null>(null);
  const draft = scheduleDraft ?? settings;

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['comp', 'questions', subjectFilter],
    queryFn: () => listCompQuestions(subjectFilter || undefined),
  });

  const { data: classes = [] } = useQuery({
    queryKey: ['comp', 'classes'],
    queryFn: listCompClasses,
  });

  const { data: dailyResults = [], isLoading: resultsLoading } = useQuery({
    queryKey: ['comp', 'daily-results', resultsQuestionId],
    queryFn: () => fetchDailyResults(resultsQuestionId!),
    enabled: Boolean(resultsQuestionId),
  });

  const optionsTuple = useMemo(
    () => [form.option0, form.option1, form.option2, form.option3] as [string, string, string, string],
    [form.option0, form.option1, form.option2, form.option3],
  );

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  const saveSettingsMutation = useMutation({
    mutationFn: () => {
      if (!draft) throw new Error('لا توجد إعدادات');
      return updateCompSettings({
        start_hour: draft.start_hour,
        start_minute: draft.start_minute,
        answer_window_seconds: draft.answer_window_seconds,
        answer_session_seconds: draft.answer_session_seconds,
        mascot_seconds: draft.mascot_seconds,
        leaderboard_seconds: draft.leaderboard_seconds,
      });
    },
    onSuccess: (saved) => {
      showSuccess(`تم حفظ وقت الظهور: ${formatStartTime(saved)}`);
      setScheduleDraft(null);
      void qc.invalidateQueries({ queryKey: COMP_SETTINGS_KEY });
    },
    onError: (e: Error) =>
      showError(
        e.message.includes('comp_settings')
          ? 'طبّق migration 071_comp_settings.sql على Supabase أولاً'
          : e,
      ),
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!form.question_text.trim()) throw new Error('أدخل نص السؤال');
      if (optionsTuple.some((o) => !o.trim())) throw new Error('أكمل الخيارات الأربعة');

      const saved = await upsertCompQuestion(
        {
          question_text: form.question_text.trim(),
          subject: form.subject,
          options: optionsTuple,
          correct_answer: form.correct_answer,
          scheduled_date: form.scheduled_date,
          is_active: form.is_active,
        },
        editingId ?? undefined,
      );

      if (form.is_active) await setQuestionActive(saved.id, true);
      return saved;
    },
    onSuccess: () => {
      showSuccess(editingId ? 'تم تحديث السؤال' : 'تم حفظ السؤال');
      setForm({ ...EMPTY_FORM, scheduled_date: getRiyadhDateString() });
      setEditingId(null);
      setTab('list');
      void qc.invalidateQueries({ queryKey: ['comp', 'questions'] });
    },
    onError: (e: Error) => showError(e),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCompQuestion,
    onSuccess: () => {
      showSuccess('تم حذف السؤال');
      void qc.invalidateQueries({ queryKey: ['comp', 'questions'] });
    },
    onError: (e: Error) => showError(e),
  });

  const activateMutation = useMutation({
    mutationFn: ({ id, active }: { id: string; active: boolean }) => setQuestionActive(id, active),
    onSuccess: () => {
      showSuccess('تم تحديث التفعيل');
      void qc.invalidateQueries({ queryKey: ['comp', 'questions'] });
    },
    onError: (e: Error) => showError(e),
  });

  function loadForEdit(q: CompQuestion) {
    setEditingId(q.id);
    setForm({
      question_text: q.question_text,
      subject: q.subject,
      option0: q.options[0] ?? '',
      option1: q.options[1] ?? '',
      option2: q.options[2] ?? '',
      option3: q.options[3] ?? '',
      correct_answer: q.correct_answer,
      scheduled_date: q.scheduled_date,
      is_active: q.is_active,
    });
    setTab('question');
  }

  function patchDraft(partial: Partial<CompSettings>) {
    if (!draft) return;
    setScheduleDraft({ ...draft, ...partial });
  }

  const tabs: { id: Tab; label: string; icon: typeof Clock }[] = [
    { id: 'schedule', label: 'وقت الظهور', icon: Clock },
    { id: 'question', label: 'سؤال جديد', icon: Save },
    { id: 'list', label: 'الأسئلة', icon: Trophy },
    { id: 'links', label: 'روابط الشاشات', icon: Link2 },
  ];

  if (isLoading || settingsLoading || !draft) {
    return <TapHandLoader label="جاري تحميل لوحة المسابقة..." fullScreen />;
  }

  return (
    <div className="space-y-6" dir="rtl">
      <PageHeader
        title="المسابقة الفصلية اليومية"
        subtitle={`وقت الظهور الحالي: ${formatStartTime(settings!)} · توقيت السعودية`}
        actions={
          <a
            href="/competition/leaderboard"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-gold-300 hover:text-gold-200"
          >
            <ExternalLink className="w-4 h-4" />
            شاشة الترتيب
          </a>
        }
      />

      <div className="rounded-2xl border border-gold-400/25 bg-gradient-to-l from-gold-400/10 to-transparent px-5 py-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gold-400/20 border border-gold-400/30 flex items-center justify-center">
            <Clock className="w-5 h-5 text-gold-300" />
          </div>
          <div>
            <p className="text-white/50 text-xs">يظهر السؤال يومياً الساعة</p>
            <p className="text-2xl font-black text-gold-300 tabular-nums">
              {formatStartTime(settings!)}
            </p>
          </div>
        </div>
        <Button type="button" variant="secondary" size="sm" onClick={() => setTab('schedule')}>
          <Settings2 className="w-4 h-4" />
          تعديل الوقت
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={clsx(
              'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold border transition-all',
              tab === id
                ? 'bg-gold-400/20 border-gold-400/40 text-gold-200'
                : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10',
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'schedule' && (
        <Panel className="space-y-5">
          <h2 className="text-lg font-bold text-white">ضبط توقيت العرض والإجابة</h2>
          <p className="text-sm text-white/50">
            من يدخل أثناء النافذة يرى الوقت المتبقي فقط — لا يُعاد الموقت من البداية.
          </p>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <label className="block space-y-1">
              <span className="text-sm text-white/60">ساعة الظهور (0–23)</span>
              <input
                type="number"
                min={0}
                max={23}
                className="w-full rounded-xl bg-navy-900 border border-white/10 px-3 py-2.5 text-white text-lg font-bold"
                value={draft.start_hour}
                onChange={(e) => patchDraft({ start_hour: Number(e.target.value) })}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-white/60">الدقيقة (0–59)</span>
              <input
                type="number"
                min={0}
                max={59}
                className="w-full rounded-xl bg-navy-900 border border-white/10 px-3 py-2.5 text-white text-lg font-bold"
                value={draft.start_minute}
                onChange={(e) => patchDraft({ start_minute: Number(e.target.value) })}
              />
            </label>
            <div className="rounded-xl bg-navy-900/80 border border-white/10 px-4 py-3 flex flex-col justify-center">
              <span className="text-xs text-white/45">المعاينة</span>
              <span className="text-3xl font-black text-gold-300 tabular-nums">
                {formatStartTime(draft)}
              </span>
            </div>
            <label className="block space-y-1">
              <span className="text-sm text-white/60">مدة نافذة الإجابة (ثانية)</span>
              <input
                type="number"
                min={30}
                max={900}
                className="w-full rounded-xl bg-navy-900 border border-white/10 px-3 py-2.5 text-white"
                value={draft.answer_session_seconds}
                onChange={(e) => {
                  const n = Number(e.target.value);
                  patchDraft({ answer_session_seconds: n, answer_window_seconds: n });
                }}
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-white/60">مدة عرض الترتيب (ثانية)</span>
              <input
                type="number"
                min={5}
                max={300}
                className="w-full rounded-xl bg-navy-900 border border-white/10 px-3 py-2.5 text-white"
                value={draft.leaderboard_seconds}
                onChange={(e) => patchDraft({ leaderboard_seconds: Number(e.target.value) })}
              />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={saveSettingsMutation.isPending}
              loading={saveSettingsMutation.isPending}
              onClick={() => saveSettingsMutation.mutate()}
            >
              <Save className="w-4 h-4" />
              حفظ التوقيت
            </Button>
            <Button type="button" variant="ghost" onClick={() => setScheduleDraft(null)}>
              إعادة للمحفوظ
            </Button>
          </div>
        </Panel>
      )}

      {tab === 'question' && (
        <Panel className="space-y-4">
          <h2 className="text-lg font-bold text-white">
            {editingId ? 'تعديل سؤال' : 'إضافة سؤال جديد'}
          </h2>

          <label className="block space-y-1">
            <span className="text-sm text-white/60">نص السؤال</span>
            <textarea
              className="w-full rounded-xl bg-navy-900 border border-white/10 px-3 py-2 text-white min-h-24"
              value={form.question_text}
              onChange={(e) => setForm((f) => ({ ...f, question_text: e.target.value }))}
            />
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block space-y-1">
              <span className="text-sm text-white/60">المادة</span>
              <select
                className="w-full rounded-xl bg-navy-900 border border-white/10 px-3 py-2 text-white"
                value={form.subject}
                onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
              >
                {COMP_SUBJECTS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-white/60">التاريخ المجدول</span>
              <input
                type="date"
                className="w-full rounded-xl bg-navy-900 border border-white/10 px-3 py-2 text-white"
                value={form.scheduled_date}
                onChange={(e) => setForm((f) => ({ ...f, scheduled_date: e.target.value }))}
              />
            </label>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <label key={i} className="block space-y-1">
                <span className="text-sm text-white/60">الخيار {i + 1}</span>
                <input
                  className="w-full rounded-xl bg-navy-900 border border-white/10 px-3 py-2 text-white"
                  value={form[`option${i}` as 'option0' | 'option1' | 'option2' | 'option3']}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, [`option${i}`]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>

          <label className="block space-y-1 max-w-xs">
            <span className="text-sm text-white/60">الإجابة الصحيحة</span>
            <select
              className="w-full rounded-xl bg-navy-900 border border-white/10 px-3 py-2 text-white"
              value={form.correct_answer}
              onChange={(e) => setForm((f) => ({ ...f, correct_answer: Number(e.target.value) }))}
            >
              {[0, 1, 2, 3].map((i) => (
                <option key={i} value={i}>الخيار {i + 1}</option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-2 text-sm text-white/80">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
            />
            تفعيل السؤال فوراً
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              disabled={saveMutation.isPending}
              loading={saveMutation.isPending}
              onClick={() => saveMutation.mutate()}
            >
              <Save className="w-4 h-4" />
              حفظ السؤال
            </Button>
            {editingId && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setEditingId(null);
                  setForm({ ...EMPTY_FORM, scheduled_date: getRiyadhDateString() });
                }}
              >
                إلغاء التعديل
              </Button>
            )}
          </div>
        </Panel>
      )}

      {tab === 'list' && (
        <Panel className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-white">جدول الأسئلة</h2>
            <select
              className="rounded-xl bg-navy-900 border border-white/10 px-3 py-2 text-white text-sm"
              value={subjectFilter}
              onChange={(e) => setSubjectFilter(e.target.value)}
            >
              <option value="">كل المواد</option>
              {COMP_SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="text-white/50 border-b border-white/10">
                <tr>
                  <th className="py-2 px-2">التاريخ</th>
                  <th className="py-2 px-2">المادة</th>
                  <th className="py-2 px-2">السؤال</th>
                  <th className="py-2 px-2">نشط</th>
                  <th className="py-2 px-2">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {questions.map((q) => (
                  <tr key={q.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="py-2 px-2 whitespace-nowrap">{q.scheduled_date}</td>
                    <td className="py-2 px-2">{q.subject}</td>
                    <td className="py-2 px-2 max-w-xs truncate">{q.question_text}</td>
                    <td className="py-2 px-2">{q.is_active ? '✓' : '—'}</td>
                    <td className="py-2 px-2">
                      <div className="flex flex-wrap gap-1">
                        <Button type="button" size="sm" variant="ghost" onClick={() => loadForEdit(q)}>
                          تعديل
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            activateMutation.mutate({ id: q.id, active: !q.is_active })
                          }
                        >
                          <Power className="w-3.5 h-3.5" />
                          {q.is_active ? 'إيقاف' : 'تفعيل'}
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => setResultsQuestionId(q.id)}
                        >
                          نتائج
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            if (confirm('حذف هذا السؤال؟')) deleteMutation.mutate(q.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {questions.length === 0 && (
              <p className="text-center text-white/40 py-8">لا توجد أسئلة بعد</p>
            )}
          </div>

          {resultsQuestionId && (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white">نتائج السؤال</h3>
                <Button type="button" variant="ghost" size="sm" onClick={() => setResultsQuestionId(null)}>
                  إغلاق
                </Button>
              </div>
              {resultsLoading ? (
                <TapHandLoader label="جاري التحميل..." />
              ) : (
                <ul className="space-y-2">
                  {dailyResults.map((r) => (
                    <li
                      key={r.class_id}
                      className="flex items-center justify-between rounded-lg bg-navy-900/60 px-3 py-2 text-sm"
                    >
                      <span className="font-bold">{r.class_name}</span>
                      <span className={r.is_correct ? 'text-emerald-400' : 'text-red-300'}>
                        {r.is_correct ? 'صحيح' : 'خطأ'} — خيار {r.selected_answer + 1}
                      </span>
                    </li>
                  ))}
                  {dailyResults.length === 0 && (
                    <p className="text-white/40 text-center py-2">لا إجابات بعد</p>
                  )}
                </ul>
              )}
            </div>
          )}
        </Panel>
      )}

      {tab === 'links' && (
        <Panel className="space-y-4">
          <h2 className="text-lg font-bold text-white">روابط شاشات الفصول</h2>
          <div className="space-y-2">
            {classes.map((c) => {
              const classUrl = `${origin}/class/${c.url_slug}`;
              const answerUrl = `${origin}/answer/${c.url_slug}`;
              return (
                <div
                  key={c.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 space-y-2"
                >
                  <p className="font-bold text-white">{c.name}</p>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Button type="button" size="sm" variant="secondary" onClick={() => copyText(classUrl)}>
                      <Copy className="w-3.5 h-3.5" /> شاشة الفصل
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => copyText(answerUrl)}>
                      <Copy className="w-3.5 h-3.5" /> إجابة الممثل
                    </Button>
                    <a
                      href={answerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-gold-300 hover:bg-white/5"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> فتح الإجابة
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
}
