import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  Bookmark,
  BookmarkPlus,
  ChevronDown,
  ChevronUp,
  Copy,
  FileDown,
  History,
  Languages,
  LayoutGrid,
  MessageSquarePlus,
  Printer,
  RefreshCw,
  Settings2,
  Share2,
  Sparkles,
  Trash2,
  Undo2,
  Users,
  Wallet,
  Wand2,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import {
  countStudentsForClass,
  loadTeacherAiContext,
  type TeacherAiClassOption,
} from '../../lib/ai/aiPrefill';
import { ACADEMIC_LEVEL_LABELS } from '../../lib/academic/constants';
import { exportToPdf, exportToPptx, exportToWord } from '../../lib/ai/exportGenerated';
import { aiAssistantService, aiCreditsService } from '../../lib/ai/aiAssistantService';
import { academicInputClass } from '../../components/academic/AcademicUi';
import {
  AiComposer,
  AiCreditPill,
  AiEmptyHero,
  AiGeneratingState,
  AiNavRail,
  AiPanel,
  AiResultToolbar,
  AiSectionLabel,
  AiStudioHeader,
  AiStudioShell,
  AiSuggestionChip,
  AiToolBtn,
} from '../../components/ai/AiStudioShell';
import {
  AI_CATEGORY_LABELS,
  EMPTY_AI_FORM,
  type AiGenerateForm,
  type AiPromptCategory,
  type AiPromptItem,
} from '../../lib/ai/types';

type Tab = 'prompts' | 'free' | 'shared' | 'history' | 'favorites' | 'credits';

const CATEGORY_ORDER: AiPromptCategory[] = [
  'planning',
  'lesson',
  'activities',
  'assessment',
  'content',
  'communication',
  'other',
];

const TOOL_TASKS = new Set(['improve_prompt', 'rewrite_text', 'translate_prompt']);

function GenerateFormFields({
  form,
  setForm,
  autofilled,
  subjects,
  classes,
  loadingContext,
}: {
  form: AiGenerateForm;
  setForm: (f: AiGenerateForm) => void;
  autofilled?: Partial<Record<keyof AiGenerateForm, boolean>>;
  subjects: string[];
  classes: TeacherAiClassOption[];
  loadingContext?: boolean;
}) {
  const set = (key: keyof AiGenerateForm, value: string) =>
    setForm({ ...form, [key]: value });

  const formLevelCode =
    form.education_level === 'ثانوي' || form.education_level === 'high'
      ? 'high'
      : form.education_level === 'متوسط' || form.education_level === 'middle'
        ? 'middle'
        : null;

  const selectedClassKey =
    classes.find(
      (c) =>
        (!formLevelCode || c.level === formLevelCode)
        && String(c.grade) === (form.grade_number || '')
        && c.section === form.section,
    )?.key
    ?? classes.find(
      (c) => c.gradeLabel === form.grade && c.section === form.section,
    )?.key
    ?? '';

  const applyClass = async (key: string) => {
    const c = classes.find((x) => x.key === key);
    if (!c) return;
    const next: AiGenerateForm = {
      ...form,
      education_level: ACADEMIC_LEVEL_LABELS[c.level],
      grade: c.gradeLabel,
      grade_number: String(c.grade),
      section: c.section,
    };
    const count = await countStudentsForClass(c.level, c.grade, c.section);
    if (count != null) next.student_count = String(count);
    setForm(next);
  };

  const labelFor = (key: string, label: string) => (
    <span className="inline-flex items-center gap-1.5">
      {label}
      {autofilled?.[key as keyof AiGenerateForm] && (
        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[#01B574]/15 text-[#01B574] border border-[#01B574]/30">
          من النظام
        </span>
      )}
    </span>
  );

  const hasTeacherClasses = classes.length > 0;
  const hasTeacherSubjects = subjects.length > 0;
  const contextLoading = loadingContext === true;

  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <label className="text-xs text-[#A3AED0] block sm:col-span-2">
        {labelFor('subject', 'المادة')}
        {hasTeacherSubjects ? (
          <select
            className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
            value={form.subject}
            onChange={(e) => set('subject', e.target.value)}
          >
            {!form.subject && <option value="">اختر المادة</option>}
            {subjects.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        ) : (
          <input
            className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
            value={form.subject}
            onChange={(e) => set('subject', e.target.value)}
            placeholder="أدخل المادة يدوياً"
          />
        )}
      </label>

      <label className="text-xs text-[#A3AED0] block sm:col-span-2">
        {labelFor('grade', 'الصف / الفصل')}
        {contextLoading ? (
          <p className="text-[11px] text-[#A3AED0] mt-2">جاري تحميل صفوفك وفصولك...</p>
        ) : hasTeacherClasses ? (
          <select
            className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
            value={selectedClassKey}
            onChange={(e) => {
              void applyClass(e.target.value);
            }}
          >
            {!selectedClassKey && <option value="">اختر الصف والفصل</option>}
            {classes.map((c) => (
              <option key={c.key} value={c.key}>{c.label}</option>
            ))}
          </select>
        ) : (
          <div className="grid sm:grid-cols-2 gap-2 mt-1">
            <input
              className={clsx(academicInputClass, '!rounded-xl')}
              placeholder="الصف"
              value={form.grade}
              onChange={(e) => set('grade', e.target.value)}
            />
            <input
              className={clsx(academicInputClass, '!rounded-xl')}
              placeholder="الفصل"
              value={form.section}
              onChange={(e) => set('section', e.target.value)}
            />
          </div>
        )}
        {!contextLoading && !hasTeacherClasses && (
          <p className="text-[10px] text-amber-300/90 mt-1">
            لم يُعثر على فصول مرتبطة بحسابك. تأكد من إكمال إعداد الملف التعليمي أو إسناد المدير، ثم أعد تحميل الصفحة.
          </p>
        )}
      </label>

      {(
        [
          ['unit', 'الوحدة'],
          ['lesson', 'الدرس'],
          ['duration', 'زمن الحصة (دقيقة)'],
          ['student_count', 'عدد الطلاب'],
        ] as const
      ).map(([key, label]) => (
        <label key={key} className="text-xs text-[#A3AED0] block">
          {labelFor(key, label)}
          <input
            className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
            value={form[key]}
            onChange={(e) => set(key, e.target.value)}
          />
        </label>
      ))}
      <label className="text-xs text-[#A3AED0] block">
        مستوى الطلاب
        <select
          className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
          value={form.level}
          onChange={(e) => set('level', e.target.value)}
        >
          {['ضعيف', 'متوسط', 'متقدم', 'مختلط'].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-[#A3AED0] block">
        المنهج
        <select
          className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
          value={form.curriculum}
          onChange={(e) => set('curriculum', e.target.value)}
        >
          {['سعودي', 'مصري', 'مخصص'].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-[#A3AED0] block">
        لغة المخرجات
        <select
          className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
          value={form.language}
          onChange={(e) => set('language', e.target.value)}
        >
          {['العربية', 'الإنجليزية', 'ثنائية اللغة'].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-[#A3AED0] block">
        أسلوب الكتابة
        <select
          className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
          value={form.style}
          onChange={(e) => set('style', e.target.value)}
        >
          {['رسمي', 'بسيط', 'احترافي', 'مختصر', 'مفصل'].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>
      <label className="text-xs text-[#A3AED0] block sm:col-span-2">
        شكل المخرج
        <select
          className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
          value={form.output_format}
          onChange={(e) => set('output_format', e.target.value)}
        >
          {['نص', 'جدول', 'قائمة'].map((v) => (
            <option key={v} value={v}>{v}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function TeacherAiAssistantPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>('prompts');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selected, setSelected] = useState<AiPromptItem | null>(null);
  const [form, setForm] = useState<AiGenerateForm>({ ...EMPTY_AI_FORM });
  const [autofilled, setAutofilled] = useState<Partial<Record<keyof AiGenerateForm, boolean>>>({});
  const [freePrompt, setFreePrompt] = useState('');
  const [freePromptBackup, setFreePromptBackup] = useState<string | null>(null);
  const [result, setResult] = useState('');
  const [knowledgeSources, setKnowledgeSources] = useState<
    { doc_id: string; similarity: number; preview: string }[]
  >([]);
  const [generationId, setGenerationId] = useState<string | null>(null);
  const [lastTaskCode, setLastTaskCode] = useState<string | null>(null);
  const [contextOpen, setContextOpen] = useState(false);
  const [showLibrary, setShowLibrary] = useState(true);
  const [teacherSubjects, setTeacherSubjects] = useState<string[]>([]);
  const [teacherClasses, setTeacherClasses] = useState<TeacherAiClassOption[]>([]);

  const { data: prompts = [], isLoading: loadingPrompts } = useQuery({
    queryKey: ['ai-prompts'],
    queryFn: () => aiAssistantService.listPrompts(),
  });

  const { data: creditData, refetch: refetchCredits } = useQuery({
    queryKey: ['ai-credits-mine'],
    queryFn: () => aiCreditsService.fetchMine(),
  });

  const { data: history = [], refetch: refetchHistory } = useQuery({
    queryKey: ['ai-generations'],
    queryFn: () => aiAssistantService.listGenerations(),
    enabled: tab === 'history',
  });

  const { data: favorites = [], refetch: refetchFav } = useQuery({
    queryKey: ['ai-favorites'],
    queryFn: () => aiAssistantService.listFavorites(),
    enabled: tab === 'favorites' || tab === 'prompts',
  });

  const { data: shared = [], refetch: refetchShared } = useQuery({
    queryKey: ['ai-shared-prompts'],
    queryFn: () => aiAssistantService.listSharedPrompts(),
    enabled: tab === 'shared' || tab === 'free',
  });

  const { isLoading: loadingTeacherContext } = useQuery({
    queryKey: ['ai-teacher-setup-prefill', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const ctx = await loadTeacherAiContext(user.id, user.full_name);
      setForm((prev) => ({ ...prev, ...ctx.form }));
      setAutofilled(ctx.meta.autofilled);
      setTeacherSubjects(ctx.subjects);
      setTeacherClasses(ctx.classes);
      return ctx;
    },
    enabled: !!user?.id,
  });

  const filteredPrompts = useMemo(() => {
    if (categoryFilter === 'all') return prompts;
    return prompts.filter((p) => p.category === categoryFilter);
  }, [prompts, categoryFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, AiPromptItem[]>();
    for (const p of filteredPrompts) {
      const list = map.get(p.category) ?? [];
      list.push(p);
      map.set(p.category, list);
    }
    return map;
  }, [filteredPrompts]);

  const starters = useMemo(() => prompts.slice(0, 6), [prompts]);

  const generateMut = useMutation({
    mutationFn: async (opts: {
      task_code: string;
      regenerate?: boolean;
      free?: string;
      asTool?: boolean;
      translateTo?: 'en' | 'ar';
    }) => {
      let free = opts.free ?? freePrompt;
      if (opts.task_code === 'translate_prompt') {
        const target = opts.translateTo === 'en' ? 'الإنجليزية' : 'العربية';
        free = `ترجم النص التالي إلى ${target} فقط بدون شرح:\n\n${free}`;
      }
      return aiAssistantService.generate({
        task_code: opts.task_code,
        form: { ...form, teacher_name: form.teacher_name || user?.full_name || '' },
        free_prompt: free,
        regenerate: opts.regenerate,
      });
    },
    onSuccess: (data, vars) => {
      if (vars.asTool || TOOL_TASKS.has(vars.task_code)) {
        setFreePromptBackup(freePrompt);
        setFreePrompt(data.content);
        toast.success(`تم تحديث البرومبت (−${data.credits_used} نقطة)`);
      } else {
        setResult(data.content);
        setGenerationId(data.generation_id);
        setLastTaskCode(vars.task_code);
        setKnowledgeSources(data.knowledge_sources ?? []);
        setShowLibrary(false);
        toast.success(
          data.knowledge_used
            ? `تم التوليد مع معرفة المدرسة (−${data.credits_used} نقطة)`
            : `تم التوليد (−${data.credits_used} نقطة)`,
        );
      }
      refetchCredits();
      qc.invalidateQueries({ queryKey: ['ai-generations'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const balance = creditData?.balance;
  const billingTokens = creditData?.settings?.billing_mode === 'tokens';

  const shareCurrent = async (text: string, title: string) => {
    if (!user?.id || !text.trim()) return;
    try {
      await aiAssistantService.sharePrompt({
        teacher_id: user.id,
        title,
        prompt_text: text.trim(),
        category: selected?.category,
        subject: form.subject || undefined,
      });
      toast.success('تمت مشاركة البرومبت مع المعلمين');
      refetchShared();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشلت المشاركة');
    }
  };

  const copyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      toast.success('تم النسخ');
    } catch {
      toast.error('تعذّر النسخ');
    }
  };

  const printResult = () => {
    if (!result) return;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`
      <html lang="ar" dir="rtl"><head><title>مساعد المعلم</title>
      <style>body{font-family:Tahoma,sans-serif;padding:24px;white-space:pre-wrap;line-height:1.7}</style>
      </head><body>${result.replace(/</g, '&lt;')}</body></html>
    `);
    w.document.close();
    w.print();
  };

  const exportTitle = selected?.name ?? 'مساعد المعلم';

  const runExport = async (kind: 'word' | 'pptx' | 'pdf') => {
    if (!result.trim()) return;
    try {
      if (kind === 'word') await exportToWord(result, exportTitle);
      else if (kind === 'pptx') await exportToPptx(result, exportTitle);
      else exportToPdf(result, exportTitle);
      toast.success('تم التنزيل');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل التصدير');
    }
  };

  const saveFavorite = async () => {
    if (!user?.id || !result) return;
    try {
      await aiAssistantService.addFavorite({
        teacher_id: user.id,
        generation_id: generationId,
        task_code: lastTaskCode ?? selected?.task_code,
        title: selected?.name ?? 'مخرج مساعد المعلم',
        content: result,
      });
      toast.success('أُضيف للمفضلة');
      refetchFav();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الحفظ');
    }
  };

  const navItems = [
    { id: 'prompts' as const, label: 'المهام', icon: LayoutGrid },
    { id: 'free' as const, label: 'محادثة', icon: MessageSquarePlus },
    { id: 'shared' as const, label: 'مشاركات', icon: Users },
    { id: 'history' as const, label: 'السجل', icon: History },
    { id: 'favorites' as const, label: 'المفضلة', icon: Bookmark },
    { id: 'credits' as const, label: 'الرصيد', icon: Wallet },
  ];

  const firstName = user?.full_name?.split(' ')[0] ?? 'معلم';

  const runSelected = () => {
    if (!selected) {
      toast.error('اختر مهمة أولاً');
      return;
    }
    generateMut.mutate({ task_code: selected.task_code });
  };

  return (
    <AiStudioShell>
      <div className="mx-auto w-full max-w-7xl px-0 sm:px-1">
        <AiStudioHeader
          title="مساعد المعلم"
          subtitle="أنشئ خططاً ودروساً وأنشطة واختبارات بأسلوب احترافي"
          backTo="/dashboard"
          badge="AI"
          actions={
            balance ? (
              <AiCreditPill
                remaining={balance.remaining_credit}
                monthly={balance.monthly_credit}
                bonus={balance.bonus_credit}
                used={balance.used_credit}
                compact
              />
            ) : null
          }
        />

        <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-4 lg:gap-5 items-start">
          {/* ── Sidebar ── */}
          <aside className="lg:sticky lg:top-4 space-y-3">
            <AiPanel padded className="!p-2 sm:!p-2.5">
              <AiNavRail
                items={navItems}
                active={tab}
                onChange={(id) => {
                  setTab(id as Tab);
                  if (id === 'prompts') setShowLibrary(true);
                }}
              />
            </AiPanel>

            {(tab === 'prompts' || tab === 'free') && (
              <AiPanel className="hidden lg:block !p-3">
                <button
                  type="button"
                  className="w-full flex items-center justify-between text-xs font-semibold text-[#A3AED0] hover:text-white transition-colors"
                  onClick={() => setContextOpen((v) => !v)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <Settings2 className="w-3.5 h-3.5" />
                    سياق التوليد
                  </span>
                  {contextOpen ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
                {contextOpen && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06]">
                    <GenerateFormFields
                      form={form}
                      setForm={setForm}
                      autofilled={autofilled}
                      subjects={teacherSubjects}
                      classes={teacherClasses}
                      loadingContext={loadingTeacherContext}
                    />
                  </div>
                )}
                {!contextOpen && (
                  <p className="text-[11px] text-[#A3AED0]/80 mt-2 leading-relaxed">
                    {form.subject || 'مادة'} · {form.grade || 'صف —'} · فصل {form.section || '—'} · {form.language || 'العربية'}
                  </p>
                )}
              </AiPanel>
            )}
          </aside>

          {/* ── Main canvas ── */}
          <main className="min-w-0 space-y-4">
            {billingTokens && (tab === 'prompts' || tab === 'free') && (
              <p className="text-xs text-amber-200/90 rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2">
                وضع الفوترة: حسب الـ Tokens — تكلفة النقاط تعتمد على طول الناتج بعد التوليد.
              </p>
            )}

            {(tab === 'prompts' || tab === 'free') && (
              <>
                {/* Mobile context */}
                <AiPanel className="lg:hidden !p-3">
                  <button
                    type="button"
                    className="w-full flex items-center justify-between text-sm font-semibold text-white"
                    onClick={() => setContextOpen((v) => !v)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Settings2 className="w-4 h-4 text-gold-400" />
                      بيانات الدرس والسياق
                    </span>
                    {contextOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  {contextOpen && (
                    <div className="mt-3">
                      <GenerateFormFields
                        form={form}
                        setForm={setForm}
                        autofilled={autofilled}
                        subjects={teacherSubjects}
                        classes={teacherClasses}
                        loadingContext={loadingTeacherContext}
                      />
                    </div>
                  )}
                </AiPanel>

                {/* Result / empty / generating */}
                <AiPanel className="min-h-[280px] sm:min-h-[460px] !p-0 overflow-hidden flex flex-col">
                  {generateMut.isPending ? (
                    <AiGeneratingState label="المساعد يعمل على طلبك…" />
                  ) : result ? (
                    <div className="flex flex-col flex-1 min-h-0">
                      <div className="flex flex-col gap-2 px-3 sm:px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="ai-orb w-8 h-8 rounded-xl flex items-center justify-center shrink-0">
                            <span className="ai-orb-core" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-semibold truncate">
                              {selected?.name ?? 'المخرج'}
                            </p>
                            <p className="text-[11px] text-[#A3AED0] hidden sm:block">يمكنك التعديل قبل النسخ أو الطباعة</p>
                          </div>
                        </div>
                        <AiResultToolbar>
                          <AiToolBtn icon={Copy} label="نسخ" onClick={copyResult} disabled={!result} />
                          <AiToolBtn icon={Printer} label="طباعة" onClick={printResult} disabled={!result} />
                          <AiToolBtn
                            icon={RefreshCw}
                            label="إعادة"
                            disabled={!result || !lastTaskCode || generateMut.isPending}
                            onClick={() =>
                              lastTaskCode &&
                              generateMut.mutate({ task_code: lastTaskCode, regenerate: true })
                            }
                          />
                          <AiToolBtn icon={BookmarkPlus} label="مفضلة" onClick={saveFavorite} disabled={!result} />
                          <div className="hidden sm:contents">
                            <AiToolBtn icon={FileDown} label="Word" onClick={() => runExport('word')} disabled={!result} />
                            <AiToolBtn icon={FileDown} label="PPT" onClick={() => runExport('pptx')} disabled={!result} />
                            <AiToolBtn icon={FileDown} label="PDF" onClick={() => runExport('pdf')} disabled={!result} />
                            <AiToolBtn
                              icon={Share2}
                              label="مشاركة"
                              disabled={!result || !user?.id}
                              onClick={() => shareCurrent(result, selected?.name ?? 'نتيجة AI مشاركة')}
                            />
                          </div>
                          <details className="sm:hidden relative shrink-0">
                            <summary className="list-none inline-flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-medium text-[#A3AED0] hover:text-white hover:bg-white/[0.06] min-h-[44px] cursor-pointer">
                              تصدير ▾
                            </summary>
                            <div className="absolute left-0 top-full mt-1 z-20 min-w-[160px] rounded-xl border border-white/10 bg-[#0d1b2e] p-1 shadow-xl flex flex-col">
                              <AiToolBtn icon={FileDown} label="Word" onClick={() => runExport('word')} disabled={!result} />
                              <AiToolBtn icon={FileDown} label="PPT" onClick={() => runExport('pptx')} disabled={!result} />
                              <AiToolBtn icon={FileDown} label="PDF" onClick={() => runExport('pdf')} disabled={!result} />
                              <AiToolBtn
                                icon={Share2}
                                label="مشاركة"
                                disabled={!result || !user?.id}
                                onClick={() => shareCurrent(result, selected?.name ?? 'نتيجة AI مشاركة')}
                              />
                            </div>
                          </details>
                        </AiResultToolbar>
                      </div>
                      <textarea
                        className="flex-1 w-full min-h-[240px] sm:min-h-[440px] bg-transparent text-white/95 text-[15px] leading-[1.85] px-4 sm:px-6 py-4 sm:py-5 outline-none resize-y font-sans placeholder:text-[#A3AED0]/50"
                        value={result}
                        onChange={(e) => setResult(e.target.value)}
                        placeholder="ستظهر النتيجة هنا…"
                      />
                      {knowledgeSources.length > 0 && (
                        <div className="px-4 sm:px-6 pb-4 border-t border-white/5">
                          <p className="text-[11px] text-[#A3AED0] mt-3 mb-2">
                            مصادر من قاعدة معرفة المدرسة ({knowledgeSources.length})
                          </p>
                          <ul className="space-y-1.5">
                            {knowledgeSources.map((s, i) => (
                              <li
                                key={`${s.doc_id}-${i}`}
                                className="text-[11px] text-white/60 bg-white/[0.03] rounded-lg px-2.5 py-1.5"
                              >
                                تشابه {Math.round(s.similarity * 100)}% — {s.preview}
                                {s.preview.length >= 120 ? '…' : ''}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ) : tab === 'free' ? (
                    <AiEmptyHero
                      title={`مرحباً ${firstName}`}
                      subtitle="اكتب طلبك بحرية — مثل محادثة مع مساعد ذكي متخصص في التعليم"
                    >
                      <div className="grid sm:grid-cols-2 gap-2.5 text-right">
                        {[
                          'خطة أسبوعية لمادة العلوم للصف الأول متوسط',
                          'أسئلة تقويم تكويني لدرس الكسور',
                          'رسالة لأولياء الأمور عن واجب منزلي',
                          'أنشطة تفاعلية لحصة 45 دقيقة',
                        ].map((hint) => (
                          <button
                            key={hint}
                            type="button"
                            onClick={() => setFreePrompt(hint)}
                            className="rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] px-3.5 py-3 text-xs text-[#A3AED0] hover:text-white transition-colors text-right"
                          >
                            {hint}
                          </button>
                        ))}
                      </div>
                    </AiEmptyHero>
                  ) : showLibrary || !selected ? (
                    <AiEmptyHero
                      title={`مرحباً ${firstName}`}
                      subtitle="اختر مهمة جاهزة من القائمة بالأسفل"
                    >
                      {starters.length > 0 && (
                        <div className="grid sm:grid-cols-2 gap-2.5">
                          {starters.map((p) => (
                            <AiSuggestionChip
                              key={p.id}
                              label={p.name}
                              description={p.description}
                              credit={p.default_credit ?? 1}
                              onClick={() => {
                                setSelected(p);
                                setShowLibrary(true);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </AiEmptyHero>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
                      <div className="ai-orb w-14 h-14 rounded-2xl flex items-center justify-center mb-4">
                        <span className="ai-orb-core" />
                      </div>
                      <p className="text-white text-lg font-bold">{selected.name}</p>
                      {selected.description && (
                        <p className="text-[#A3AED0] text-sm mt-2 max-w-md leading-relaxed">
                          {selected.description}
                        </p>
                      )}
                      <p className="text-gold-400 text-xs font-semibold mt-3">
                        التكلفة: {selected.default_credit ?? 1} نقطة
                      </p>
                      <button
                        type="button"
                        onClick={runSelected}
                        disabled={generateMut.isPending}
                        className="mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold bg-gradient-to-l from-gold-500 to-gold-400 text-navy-950 shadow-lg shadow-gold-500/25 hover:brightness-110 disabled:opacity-40"
                      >
                        <Sparkles className="w-4 h-4" />
                        توليد الآن
                      </button>
                    </div>
                  )}
                </AiPanel>

                {/* Composer / prompt library */}
                {tab === 'free' ? (
                  <AiComposer
                    value={freePrompt}
                    onChange={setFreePrompt}
                    onSubmit={() => generateMut.mutate({ task_code: 'free_prompt' })}
                    placeholder="اكتب طلبك هنا… (Ctrl+Enter للإرسال)"
                    pending={generateMut.isPending}
                    submitLabel="توليد"
                    secondary={
                      <>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#A3AED0] hover:text-white hover:bg-white/[0.06] disabled:opacity-40"
                          disabled={!freePrompt.trim() || generateMut.isPending}
                          onClick={() =>
                            generateMut.mutate({ task_code: 'improve_prompt', free: freePrompt, asTool: true })
                          }
                        >
                          <Wand2 className="w-3.5 h-3.5" />
                          تحسين
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#A3AED0] hover:text-white hover:bg-white/[0.06] disabled:opacity-40"
                          disabled={!freePrompt.trim() || generateMut.isPending}
                          onClick={() =>
                            generateMut.mutate({
                              task_code: 'translate_prompt',
                              free: freePrompt,
                              asTool: true,
                              translateTo: 'en',
                            })
                          }
                        >
                          <Languages className="w-3.5 h-3.5" />
                          EN
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#A3AED0] hover:text-white hover:bg-white/[0.06] disabled:opacity-40"
                          disabled={!freePrompt.trim() || generateMut.isPending}
                          onClick={() =>
                            generateMut.mutate({
                              task_code: 'translate_prompt',
                              free: freePrompt,
                              asTool: true,
                              translateTo: 'ar',
                            })
                          }
                        >
                          <Languages className="w-3.5 h-3.5" />
                          ع
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#A3AED0] hover:text-white hover:bg-white/[0.06] disabled:opacity-40"
                          disabled={!freePrompt.trim() || generateMut.isPending}
                          onClick={() =>
                            generateMut.mutate({ task_code: 'rewrite_text', free: freePrompt, asTool: true })
                          }
                        >
                          إعادة صياغة
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#A3AED0] hover:text-white hover:bg-white/[0.06] disabled:opacity-40"
                          disabled={!freePrompt.trim() || !user?.id}
                          onClick={() => shareCurrent(freePrompt, 'برومبت مشارك')}
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          مشاركة
                        </button>
                        {freePromptBackup != null && (
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-medium text-[#A3AED0] hover:text-white hover:bg-white/[0.06]"
                            onClick={() => {
                              setFreePrompt(freePromptBackup);
                              setFreePromptBackup(null);
                            }}
                          >
                            <Undo2 className="w-3.5 h-3.5" />
                            تراجع
                          </button>
                        )}
                      </>
                    }
                  />
                ) : (
                  <AiPanel className="!p-3 sm:!p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <AiSectionLabel icon={LayoutGrid}>مكتبة المهام</AiSectionLabel>
                      {selected && (
                        <button
                          type="button"
                          onClick={runSelected}
                          disabled={generateMut.isPending}
                          className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold bg-gradient-to-l from-gold-500 to-gold-400 text-navy-950 shadow-md shadow-gold-500/20 hover:brightness-110 disabled:opacity-40"
                        >
                          <Sparkles className="w-4 h-4" />
                          توليد: {selected.name}
                        </button>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className={clsx(
                          'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                          categoryFilter === 'all'
                            ? 'bg-gold-500/15 text-gold-400 border-gold-500/30'
                            : 'text-[#A3AED0] border-white/10 hover:bg-white/[0.04]',
                        )}
                        onClick={() => setCategoryFilter('all')}
                      >
                        الكل
                      </button>
                      {CATEGORY_ORDER.map((c) => (
                        <button
                          key={c}
                          type="button"
                          className={clsx(
                            'px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                            categoryFilter === c
                              ? 'bg-gold-500/15 text-gold-400 border-gold-500/30'
                              : 'text-[#A3AED0] border-white/10 hover:bg-white/[0.04]',
                          )}
                          onClick={() => setCategoryFilter(c)}
                        >
                          {AI_CATEGORY_LABELS[c]}
                        </button>
                      ))}
                    </div>

                    {loadingPrompts ? (
                      <AiGeneratingState label="تحميل المهام…" />
                    ) : (
                      <div className="max-h-[340px] overflow-y-auto space-y-4 pe-1 ai-scroll">
                        {CATEGORY_ORDER.filter((c) => grouped.has(c)).map((cat) => (
                          <div key={cat}>
                            <p className="text-[11px] font-bold tracking-wide text-[#A3AED0]/90 mb-2 uppercase">
                              {AI_CATEGORY_LABELS[cat]}
                            </p>
                            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
                              {(grouped.get(cat) ?? []).map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  onClick={() => setSelected(p)}
                                  className={clsx(
                                    'text-right rounded-xl border px-3 py-2.5 transition-all duration-200',
                                    selected?.id === p.id
                                      ? 'border-gold-500/45 bg-gold-500/10 shadow-[0_0_0_1px_rgba(240,180,41,0.15)]'
                                      : 'border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15',
                                  )}
                                >
                                  <span className="block text-white text-sm font-semibold leading-snug">
                                    {p.name}
                                  </span>
                                  <span className="block text-[11px] text-[#A3AED0] mt-0.5 line-clamp-2">
                                    {p.description}
                                  </span>
                                  <span className="block text-[10px] text-gold-400/90 mt-1.5 font-semibold">
                                    {p.default_credit ?? 1} نقطة
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </AiPanel>
                )}
              </>
            )}

            {tab === 'shared' && (
              <AiPanel className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <AiSectionLabel icon={Users}>مشاركات المعلمين</AiSectionLabel>
                  <AiToolBtn icon={RefreshCw} label="تحديث" onClick={() => refetchShared()} />
                </div>
                {shared.length === 0 && (
                  <p className="text-[#A3AED0] text-sm py-8 text-center">لا مشاركات بعد</p>
                )}
                {shared.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-white text-sm font-semibold">{s.title}</p>
                        <p className="text-[11px] text-[#A3AED0]">
                          {s.teacher_name} · {new Date(s.created_at).toLocaleString('ar-SA')}
                          {s.subject ? ` · ${s.subject}` : ''}
                        </p>
                      </div>
                      {s.teacher_id === user?.id && (
                        <button
                          type="button"
                          className="text-red-300 text-xs"
                          onClick={async () => {
                            await aiAssistantService.deactivateSharedPrompt(s.id);
                            refetchShared();
                          }}
                        >
                          إيقاف
                        </button>
                      )}
                    </div>
                    <pre className="whitespace-pre-wrap text-[#A3AED0] text-xs max-h-32 overflow-y-auto font-sans">
                      {s.prompt_text}
                    </pre>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="text-xs font-semibold text-gold-400 hover:text-gold-300"
                        onClick={() => {
                          setFreePrompt(s.prompt_text);
                          setTab('free');
                        }}
                      >
                        استخدام كبرومبت حر
                      </button>
                      <button
                        type="button"
                        className="text-xs font-semibold text-white hover:text-gold-300"
                        disabled={generateMut.isPending}
                        onClick={() => {
                          setFreePrompt(s.prompt_text);
                          generateMut.mutate({ task_code: 'free_prompt', free: s.prompt_text });
                          setTab('free');
                        }}
                      >
                        توليد مباشرة
                      </button>
                    </div>
                  </div>
                ))}
              </AiPanel>
            )}

            {tab === 'history' && (
              <AiPanel className="space-y-1 !p-2 sm:!p-3">
                <div className="px-2 pt-1 pb-2 flex items-center justify-between">
                  <AiSectionLabel icon={History}>سجل التوليد</AiSectionLabel>
                  <AiToolBtn icon={RefreshCw} label="تحديث" onClick={() => refetchHistory()} />
                </div>
                {history.length === 0 && (
                  <p className="text-[#A3AED0] text-sm px-3 py-8 text-center">لا يوجد سجل بعد</p>
                )}
                {history.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    className="w-full text-right rounded-xl px-3.5 py-3 hover:bg-white/[0.04] transition-colors border border-transparent hover:border-white/[0.06]"
                    onClick={() => {
                      setResult(g.output_content ?? '');
                      setGenerationId(g.id);
                      setLastTaskCode(g.task_code);
                      setShowLibrary(false);
                      setTab('prompts');
                    }}
                  >
                    <span className="block text-white text-sm font-semibold">
                      {g.prompt_name || g.task_code}
                    </span>
                    <span className="block text-[11px] text-[#A3AED0] mt-0.5">
                      {new Date(g.created_at).toLocaleString('ar-SA')} · {g.credits_used} نقطة ·{' '}
                      {g.status}
                    </span>
                  </button>
                ))}
              </AiPanel>
            )}

            {tab === 'favorites' && (
              <AiPanel className="space-y-2">
                <AiSectionLabel icon={Bookmark}>المفضلة</AiSectionLabel>
                {favorites.length === 0 && (
                  <p className="text-[#A3AED0] text-sm py-8 text-center">لا مفضلات بعد</p>
                )}
                {favorites.map((f) => (
                  <div
                    key={f.id}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-white text-sm font-semibold">{f.title || 'مفضلة'}</p>
                      <button
                        type="button"
                        className="inline-flex items-center gap-1 text-red-300/90 text-xs hover:text-red-200"
                        onClick={async () => {
                          await aiAssistantService.removeFavorite(f.id);
                          refetchFav();
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    </div>
                    <pre className="whitespace-pre-wrap text-[#A3AED0] text-xs max-h-36 overflow-y-auto font-sans leading-relaxed">
                      {f.content}
                    </pre>
                    <button
                      type="button"
                      className="text-xs font-semibold text-gold-400 hover:text-gold-300"
                      onClick={() => {
                        setResult(f.content);
                        setShowLibrary(false);
                        setTab('prompts');
                      }}
                    >
                      فتح للتعديل ←
                    </button>
                  </div>
                ))}
              </AiPanel>
            )}

            {tab === 'credits' && (
              <AiPanel className="space-y-5 max-w-lg">
                <AiSectionLabel icon={Wallet}>رصيدك</AiSectionLabel>
                {balance ? (
                  <>
                    <AiCreditPill
                      remaining={balance.remaining_credit}
                      monthly={balance.monthly_credit}
                      bonus={balance.bonus_credit}
                      used={balance.used_credit}
                    />
                    {balance.ai_disabled && (
                      <p className="text-red-300 text-sm rounded-xl border border-red-400/30 bg-red-500/10 px-3 py-2">
                        تم إيقاف المساعد لحسابك — تواصل مع المدير.
                      </p>
                    )}
                    <p className="text-[#A3AED0] text-xs">
                      تاريخ إعادة التعيين:{' '}
                      {balance.reset_date
                        ? new Date(balance.reset_date).toLocaleDateString('ar-SA')
                        : '—'}
                    </p>
                    <div>
                      <p className="text-white text-sm font-semibold mb-2">آخر العمليات</p>
                      <ul className="space-y-0 divide-y divide-white/[0.05]">
                        {(creditData?.history ?? []).map((tx) => (
                          <li
                            key={tx.id}
                            className="text-xs text-[#A3AED0] py-2.5 flex justify-between gap-3"
                          >
                            <span>
                              {new Date(tx.created_at).toLocaleString('ar-SA')} — {tx.action}
                            </span>
                            <span
                              className={clsx(
                                'font-semibold tabular-nums',
                                tx.credits > 0 ? 'text-amber-300' : 'text-[#01B574]',
                              )}
                            >
                              {tx.credits > 0 ? `−${tx.credits}` : tx.credits}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <AiGeneratingState label="تحميل الرصيد…" />
                )}
              </AiPanel>
            )}
          </main>
        </div>
      </div>
    </AiStudioShell>
  );
}
