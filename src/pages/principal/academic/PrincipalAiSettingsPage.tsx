import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import clsx from 'clsx';
import {
  Activity,
  Ban,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Coins,
  Cpu,
  FileText,
  Plus,
  RefreshCw,
  Save,
  Settings2,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useAuthStore } from '../../../stores/authStore';
import { academicAdminService } from '../../../lib/academic/adminService';
import { aiAssistantService, aiCreditsService } from '../../../lib/ai/aiAssistantService';
import type { AiCreditSettings, AiSchoolTemplate } from '../../../lib/ai/types';
import { ACADEMIC_LEVEL_LABELS, formatGradeLabel } from '../../../lib/academic/constants';
import type { AcademicEducationLevel } from '../../../lib/academic/types';
import { academicInputClass } from '../../../components/academic/AcademicUi';
import {
  AiPanel,
  AiSectionLabel,
  AiStudioHeader,
  AiStudioShell,
} from '../../../components/ai/AiStudioShell';

/** نماذج منخفضة التكلفة على OpenRouter (أي مزود عبر بوابة واحدة) */
const OPENROUTER_MODELS: { id: string; label: string }[] = [
  { id: 'deepseek/deepseek-v4-flash', label: 'DeepSeek V4 Flash — الأرخص' },
  { id: 'deepseek/deepseek-chat', label: 'DeepSeek Chat' },
  { id: 'google/gemini-2.0-flash-lite-001', label: 'Gemini 2.0 Flash Lite' },
  { id: 'google/gemini-3.1-flash-lite', label: 'Gemini 3.1 Flash Lite' },
  { id: 'openai/gpt-4.1-nano', label: 'GPT-4.1 Nano' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini' },
  { id: 'anthropic/claude-3.5-haiku', label: 'Claude 3.5 Haiku' },
  { id: 'meta-llama/llama-3.3-70b-instruct', label: 'Llama 3.3 70B' },
];

const DEEPSEEK_MODELS: { id: string; label: string }[] = [
  { id: 'deepseek-chat', label: 'deepseek-chat — الأرخص' },
  { id: 'deepseek-reasoner', label: 'deepseek-reasoner' },
];

const GOOGLE_MODELS: { id: string; label: string }[] = [
  { id: 'gemini-2.0-flash-lite', label: 'gemini-2.0-flash-lite — الأرخص' },
  { id: 'gemini-2.0-flash', label: 'gemini-2.0-flash' },
  { id: 'gemini-2.5-flash', label: 'gemini-2.5-flash' },
  { id: 'gemini-1.5-flash', label: 'gemini-1.5-flash' },
];

const OPENAI_MODELS: { id: string; label: string }[] = [
  { id: 'gpt-4.1-nano', label: 'gpt-4.1-nano — الأرخص' },
  { id: 'gpt-4o-mini', label: 'gpt-4o-mini' },
  { id: 'gpt-4.1-mini', label: 'gpt-4.1-mini' },
];

type AiProviderId = 'openrouter' | 'deepseek' | 'google' | 'openai';

const PROVIDER_OPTIONS: {
  id: AiProviderId;
  label: string;
  short: string;
  hint: string;
  secret: string;
}[] = [
  {
    id: 'openrouter',
    label: 'OpenRouter',
    short: 'بوابة موحّدة',
    hint: 'موصى به — مفتاح واحد لكل النماذج',
    secret: 'OPENROUTER_API_KEY',
  },
  {
    id: 'deepseek',
    label: 'DeepSeek',
    short: 'مباشر',
    hint: 'يخصم من رصيد DeepSeek',
    secret: 'DEEPSEEK_API_KEY',
  },
  {
    id: 'google',
    label: 'Google Gemini',
    short: 'مباشر',
    hint: 'من Google AI Studio',
    secret: 'GOOGLE_AI_API_KEY',
  },
  {
    id: 'openai',
    label: 'OpenAI',
    short: 'مباشر',
    hint: 'من platform.openai.com',
    secret: 'OPENAI_API_KEY',
  },
];

function modelsForProvider(p: AiProviderId) {
  if (p === 'deepseek') return DEEPSEEK_MODELS;
  if (p === 'google') return GOOGLE_MODELS;
  if (p === 'openai') return OPENAI_MODELS;
  return OPENROUTER_MODELS;
}

function defaultModelFor(p: AiProviderId) {
  return modelsForProvider(p)[0]?.id ?? 'deepseek/deepseek-v4-flash';
}

const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold bg-gradient-to-l from-gold-500 to-gold-400 text-navy-950 shadow-lg shadow-gold-500/20 hover:brightness-110 disabled:opacity-40 transition-all';
const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold border border-white/10 text-[#A3AED0] hover:text-white hover:bg-white/[0.05] disabled:opacity-40 transition-colors';

export function PrincipalAiSettingsPage() {
  const qc = useQueryClient();
  const { user } = useAuthStore();
  const [templateDraft, setTemplateDraft] = useState<Partial<AiSchoolTemplate>>({
    title: '',
    body: '',
    is_active: true,
  });
  const [settingsDraft, setSettingsDraft] = useState<Partial<AiCreditSettings>>({});
  const [bonusTeacherId, setBonusTeacherId] = useState('');
  const [bonusAmount, setBonusAmount] = useState(50);
  const [bonusNote, setBonusNote] = useState('');
  const [knowledgeTitle, setKnowledgeTitle] = useState('');
  const [knowledgeFile, setKnowledgeFile] = useState<File | null>(null);
  const [knowledgeLevel, setKnowledgeLevel] = useState<'' | AcademicEducationLevel>('');
  const [knowledgeGrade, setKnowledgeGrade] = useState<string>('');
  const [knowledgeSubject, setKnowledgeSubject] = useState('');

  const { data: templates = [], isLoading: loadingTemplates } = useQuery({
    queryKey: ['ai-school-templates'],
    queryFn: () => aiAssistantService.listTemplates(),
  });

  const { data: settings } = useQuery({
    queryKey: ['ai-credit-settings'],
    queryFn: async () => {
      const mine = await aiCreditsService.fetchMine();
      setSettingsDraft(mine.settings ?? {});
      return mine.settings;
    },
  });

  const { data: catalog = [] } = useQuery({
    queryKey: ['ai-credit-catalog'],
    queryFn: () => aiCreditsService.listCatalog(),
  });

  const { data: balances = [] } = useQuery({
    queryKey: ['ai-credit-balances-all'],
    queryFn: () => aiCreditsService.listAllBalances(),
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['academic-teachers-ai'],
    queryFn: () => academicAdminService.listTeachers(),
  });

  const { data: usageStats } = useQuery({
    queryKey: ['ai-usage-stats'],
    queryFn: () => aiCreditsService.usageStats(),
  });

  const { data: knowledgeDocs = [], refetch: refetchKnowledge } = useQuery({
    queryKey: ['ai-knowledge-docs'],
    queryFn: () => aiAssistantService.listKnowledgeDocs(),
  });

  const { data: allSubjects = [] } = useQuery({
    queryKey: ['academic-subjects'],
    queryFn: () => academicAdminService.listSubjects(),
  });

  const subjectOptions = Array.from(
    new Set(allSubjects.filter((s) => s.is_active).map((s) => s.name)),
  ).sort((a, b) => a.localeCompare(b, 'ar'));

  const uploadKnowledgeMut = useMutation({
    mutationFn: async () => {
      if (!knowledgeFile) throw new Error('اختر ملفاً');
      const gradeNum = knowledgeGrade ? Number(knowledgeGrade) : null;
      return aiAssistantService.uploadKnowledgeDoc({
        file: knowledgeFile,
        title: knowledgeTitle || knowledgeFile.name,
        uploaded_by: user?.id,
        education_level: knowledgeLevel || null,
        grade: gradeNum && Number.isFinite(gradeNum) ? gradeNum : null,
        subject: knowledgeSubject || null,
      });
    },
    onSuccess: (doc) => {
      toast.success(doc.status === 'ready' ? 'تم الفهرسة' : `الحالة: ${doc.status}`);
      setKnowledgeFile(null);
      setKnowledgeTitle('');
      setKnowledgeLevel('');
      setKnowledgeGrade('');
      setKnowledgeSubject('');
      refetchKnowledge();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveTemplateMut = useMutation({
    mutationFn: () =>
      aiAssistantService.saveTemplate({
        id: templateDraft.id,
        title: templateDraft.title || 'قالب المدرسة',
        body: templateDraft.body || '',
        is_active: templateDraft.is_active !== false,
        created_by: user?.id,
      }),
    onSuccess: () => {
      toast.success('تم حفظ القالب');
      qc.invalidateQueries({ queryKey: ['ai-school-templates'] });
      setTemplateDraft({ title: '', body: '', is_active: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTemplateMut = useMutation({
    mutationFn: (id: string) => aiAssistantService.deleteTemplate(id),
    onSuccess: () => {
      toast.success('حُذف القالب');
      qc.invalidateQueries({ queryKey: ['ai-school-templates'] });
      setTemplateDraft({ title: '', body: '', is_active: true });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const saveSettingsMut = useMutation({
    mutationFn: () =>
      aiCreditsService.principalAction({
        action: 'update_settings',
        ...settingsDraft,
      }),
    onSuccess: () => {
      toast.success('تم حفظ إعدادات الرصيد');
      qc.invalidateQueries({ queryKey: ['ai-credit-settings'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addBonusMut = useMutation({
    mutationFn: () =>
      aiCreditsService.principalAction({
        action: 'add',
        teacher_id: bonusTeacherId,
        credits: bonusAmount,
        note: bonusNote,
      }),
    onSuccess: () => {
      toast.success('تم تحديث الرصيد');
      qc.invalidateQueries({ queryKey: ['ai-credit-balances-all'] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const activeProvider = (settingsDraft.ai_provider ?? settings?.ai_provider ?? 'openrouter') as AiProviderId;
  const activeTeachers = balances.filter((b) => !b.ai_disabled).length;
  const totalUsed = balances.reduce((s, b) => s + (b.used_credit ?? 0), 0);

  return (
    <AiStudioShell>
      <div className="mx-auto w-full max-w-6xl">
        <AiStudioHeader
          title="استوديو الذكاء الاصطناعي"
          subtitle="إدارة المزود، القوالب، والرصيد للمعلمين"
          backTo="/principal/academic"
          badge="Admin"
        />

        {/* Stats strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'المعلمون النشطون', value: activeTeachers, icon: Users },
            { label: 'إجمالي الاستهلاك', value: totalUsed, icon: Coins },
            { label: 'القوالب', value: templates.length, icon: FileText },
            { label: 'المهام', value: catalog.length, icon: Settings2 },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl border border-white/[0.07] bg-white/[0.03] px-4 py-3"
            >
              <div className="flex items-center gap-2 text-[#A3AED0] text-[11px] font-medium mb-1">
                <s.icon className="w-3.5 h-3.5" />
                {s.label}
              </div>
              <p className="text-white text-xl font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="space-y-5">
          {/* Advanced usage analytics — last 30 days */}
          <AiPanel>
            <AiSectionLabel icon={BarChart3}>إحصائيات الاستخدام (30 يوماً)</AiSectionLabel>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-4">
              {[
                {
                  label: 'النقاط',
                  value: usageStats?.total_credits ?? 0,
                  hint: 'Credits',
                },
                {
                  label: 'Tokens',
                  value: usageStats?.total_tokens ?? 0,
                  hint: 'إجمالي الرموز',
                },
                {
                  label: 'التكلفة ≈',
                  value: `$${(usageStats?.total_cost_usd ?? 0).toFixed(3)}`,
                  hint: 'تقدير USD',
                },
                {
                  label: 'نجاح / فشل',
                  value: `${usageStats?.success_count ?? 0} / ${usageStats?.failed_count ?? 0}`,
                  hint: usageStats?.avg_execution_ms
                    ? `متوسط ${Math.round(usageStats.avg_execution_ms)}ms`
                    : 'عمليات',
                },
              ].map((card) => (
                <div
                  key={card.label}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-3"
                >
                  <p className="text-[11px] text-[#A3AED0] font-medium">{card.label}</p>
                  <p className="text-white text-lg font-bold tabular-nums mt-0.5">{card.value}</p>
                  <p className="text-[10px] text-[#A3AED0]/70 mt-0.5">{card.hint}</p>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <div className="rounded-xl border border-white/[0.06] p-3">
                <p className="text-xs font-semibold text-white mb-2 inline-flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-gold-400" />
                  أكثر العمليات
                </p>
                <ul className="space-y-1.5">
                  {(usageStats?.top_tasks ?? []).slice(0, 5).map((t) => (
                    <li key={t.task_code} className="flex justify-between gap-2 text-[11px]">
                      <span className="text-[#A3AED0] truncate font-mono" dir="ltr">{t.task_code}</span>
                      <span className="text-white tabular-nums shrink-0">{t.cnt} · {t.credits}ن</span>
                    </li>
                  ))}
                  {!usageStats?.top_tasks?.length && (
                    <li className="text-[11px] text-[#A3AED0]">لا بيانات بعد</li>
                  )}
                </ul>
              </div>
              <div className="rounded-xl border border-white/[0.06] p-3">
                <p className="text-xs font-semibold text-white mb-2 inline-flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-gold-400" />
                  أكثر المعلمين
                </p>
                <ul className="space-y-1.5">
                  {(usageStats?.top_teachers ?? []).slice(0, 5).map((t) => (
                    <li key={t.teacher_id} className="flex justify-between gap-2 text-[11px]">
                      <span className="text-[#A3AED0] truncate">{t.full_name || '—'}</span>
                      <span className="text-white tabular-nums shrink-0">{t.cnt} · {t.credits}ن</span>
                    </li>
                  ))}
                  {!usageStats?.top_teachers?.length && (
                    <li className="text-[11px] text-[#A3AED0]">لا بيانات بعد</li>
                  )}
                </ul>
              </div>
              <div className="rounded-xl border border-white/[0.06] p-3">
                <p className="text-xs font-semibold text-white mb-2 inline-flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-gold-400" />
                  أكثر المواد
                </p>
                <ul className="space-y-1.5">
                  {(usageStats?.top_subjects ?? []).slice(0, 5).map((s) => (
                    <li key={s.subject} className="flex justify-between gap-2 text-[11px]">
                      <span className="text-[#A3AED0] truncate">{s.subject}</span>
                      <span className="text-white tabular-nums shrink-0">{s.cnt}</span>
                    </li>
                  ))}
                  {!usageStats?.top_subjects?.length && (
                    <li className="text-[11px] text-[#A3AED0]">لا بيانات بعد</li>
                  )}
                </ul>
              </div>
            </div>
          </AiPanel>

          {/* Provider + settings */}
          <AiPanel>
            <AiSectionLabel icon={Cpu}>مزود النموذج</AiSectionLabel>
            <p className="text-[#A3AED0] text-xs mb-4 leading-relaxed">
              اختر المزود كما في تطبيقات الذكاء الشهيرة — ثم حدّد النموذج المناسب للتكلفة والجودة.
            </p>

            <div className="grid sm:grid-cols-2 gap-2.5 mb-5">
              {PROVIDER_OPTIONS.map((p) => {
                const selected = activeProvider === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      setSettingsDraft((s) => ({
                        ...s,
                        ai_provider: p.id,
                        openrouter_model: defaultModelFor(p.id),
                      }))
                    }
                    className={clsx(
                      'text-right rounded-2xl border p-3.5 transition-all duration-200',
                      selected
                        ? 'border-gold-500/45 bg-gold-500/10 shadow-[0_0_0_1px_rgba(240,180,41,0.12)]'
                        : 'border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-white text-sm font-bold">{p.label}</p>
                        <p className="text-[11px] text-[#A3AED0] mt-0.5">{p.short} · {p.hint}</p>
                        <p className="text-[10px] text-[#A3AED0]/70 mt-1.5 font-mono" dir="ltr">
                          {p.secret}
                        </p>
                      </div>
                      {selected && <CheckCircle2 className="w-5 h-5 text-gold-400 shrink-0" />}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="grid sm:grid-cols-2 gap-3 max-w-3xl">
              <label className="text-xs text-[#A3AED0] block sm:col-span-2">
                النموذج
                <select
                  className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
                  dir="ltr"
                  value={
                    settingsDraft.openrouter_model ??
                    settings?.openrouter_model ??
                    defaultModelFor(activeProvider)
                  }
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, openrouter_model: e.target.value }))
                  }
                >
                  {modelsForProvider(activeProvider).map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </label>

              {activeProvider === 'openrouter' && (
                <label className="text-xs text-[#A3AED0] block sm:col-span-2">
                  معرّف نموذج مخصص (OpenRouter) — اختياري
                  <input
                    className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
                    dir="ltr"
                    placeholder="مثال: qwen/qwen-2.5-7b-instruct"
                    onBlur={(e) => {
                      const v = e.target.value.trim();
                      if (!v) return;
                      if (/^(sk-|sk-or-)/i.test(v) || (v.length > 48 && !v.includes('/'))) {
                        e.target.value = '';
                        return;
                      }
                      setSettingsDraft((s) => ({ ...s, openrouter_model: v }));
                    }}
                  />
                </label>
              )}

              <label className="text-xs text-[#A3AED0] block">
                الرصيد الشهري الافتراضي
                <input
                  type="number"
                  className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
                  value={settingsDraft.default_monthly_credit ?? settings?.default_monthly_credit ?? 100}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      default_monthly_credit: Number(e.target.value) || 100,
                    }))
                  }
                />
              </label>
              <label className="text-xs text-[#A3AED0] block">
                الحد الأقصى لنقاط العملية
                <input
                  type="number"
                  className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
                  value={settingsDraft.max_credit_per_request ?? settings?.max_credit_per_request ?? 30}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      max_credit_per_request: Number(e.target.value) || 30,
                    }))
                  }
                />
              </label>
              <label className="text-xs text-[#A3AED0] block">
                وضع الفوترة
                <select
                  className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
                  value={settingsDraft.billing_mode ?? settings?.billing_mode ?? 'fixed'}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      billing_mode: e.target.value as 'fixed' | 'tokens',
                    }))
                  }
                >
                  <option value="fixed">ثابت (كتالوج المهام)</option>
                  <option value="tokens">حسب Tokens</option>
                </select>
              </label>
              <label className="text-xs text-[#A3AED0] block">
                Tokens لكل نقطة
                <input
                  type="number"
                  className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
                  value={settingsDraft.tokens_per_credit ?? settings?.tokens_per_credit ?? 2000}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      tokens_per_credit: Number(e.target.value) || 2000,
                    }))
                  }
                />
              </label>
              <label className="text-xs text-[#A3AED0] block sm:col-span-2">
                تقدير دولار لكل مليون Token
                <input
                  type="number"
                  step="0.01"
                  className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
                  value={settingsDraft.usd_per_1m_tokens ?? settings?.usd_per_1m_tokens ?? 0.15}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({
                      ...s,
                      usd_per_1m_tokens: Number(e.target.value) || 0.15,
                    }))
                  }
                />
              </label>

              <label className="flex items-center gap-2.5 text-sm text-white rounded-xl border border-white/[0.07] px-3 py-2.5 bg-white/[0.02]">
                <input
                  type="checkbox"
                  className="accent-gold-500"
                  checked={settingsDraft.allow_regenerate ?? settings?.allow_regenerate ?? true}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, allow_regenerate: e.target.checked }))
                  }
                />
                السماح بإعادة التوليد
              </label>
              <label className="flex items-center gap-2.5 text-sm text-white rounded-xl border border-white/[0.07] px-3 py-2.5 bg-white/[0.02]">
                <input
                  type="checkbox"
                  className="accent-gold-500"
                  checked={settingsDraft.allow_bonus ?? settings?.allow_bonus ?? true}
                  onChange={(e) =>
                    setSettingsDraft((s) => ({ ...s, allow_bonus: e.target.checked }))
                  }
                />
                السماح برصيد إضافي
              </label>
            </div>

            <button
              type="button"
              className={clsx(btnPrimary, 'mt-5')}
              disabled={saveSettingsMut.isPending}
              onClick={() => saveSettingsMut.mutate()}
            >
              <Save className="w-4 h-4" />
              حفظ الإعدادات
            </button>
          </AiPanel>

          {/* Knowledge / RAG */}
          <AiPanel>
            <AiSectionLabel icon={BookOpen}>قاعدة المعرفة (RAG)</AiSectionLabel>
            <p className="text-[#A3AED0] text-xs mb-4 leading-relaxed">
              ارفع دليل المعلم أو سياسة المدرسة أو توزيع المنهج (PDF / Word / TXT). حدّد المرحلة والصف
              والمادة لتوجيه الاسترجاع، أو اتركها «الكل» للملفات العامة. يُفضَّل DOCX/TXT إن فشل PDF.
            </p>

            <div className="grid sm:grid-cols-3 gap-2.5 mb-3">
              <label className="text-xs text-[#A3AED0] block">
                المرحلة
                <select
                  className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
                  value={knowledgeLevel}
                  onChange={(e) => {
                    setKnowledgeLevel(e.target.value as '' | AcademicEducationLevel);
                    setKnowledgeGrade('');
                  }}
                >
                  <option value="">كل المراحل</option>
                  <option value="middle">{ACADEMIC_LEVEL_LABELS.middle}</option>
                  <option value="high">{ACADEMIC_LEVEL_LABELS.high}</option>
                </select>
              </label>
              <label className="text-xs text-[#A3AED0] block">
                الصف
                <select
                  className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
                  value={knowledgeGrade}
                  onChange={(e) => setKnowledgeGrade(e.target.value)}
                >
                  <option value="">كل الصفوف</option>
                  {([1, 2, 3] as const).map((g) => (
                    <option key={g} value={String(g)}>
                      {knowledgeLevel
                        ? formatGradeLabel(knowledgeLevel, g)
                        : `الصف ${g}`}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-[#A3AED0] block">
                المادة
                <select
                  className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
                  value={knowledgeSubject}
                  onChange={(e) => setKnowledgeSubject(e.target.value)}
                >
                  <option value="">كل المواد</option>
                  {subjectOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="grid sm:grid-cols-[1fr_auto] gap-2.5 mb-4">
              <input
                className={clsx(academicInputClass, '!rounded-xl')}
                placeholder="عنوان المستند"
                value={knowledgeTitle}
                onChange={(e) => setKnowledgeTitle(e.target.value)}
              />
              <label className={clsx(btnSecondary, 'cursor-pointer')}>
                <Upload className="w-3.5 h-3.5" />
                {knowledgeFile ? knowledgeFile.name.slice(0, 18) : 'اختيار ملف'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx,.txt,.md,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,text/markdown"
                  onChange={(e) => setKnowledgeFile(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
            <button
              type="button"
              className={clsx(btnPrimary, 'mb-4')}
              disabled={!knowledgeFile || uploadKnowledgeMut.isPending}
              onClick={() => uploadKnowledgeMut.mutate()}
            >
              <Plus className="w-4 h-4" />
              رفع وفهرسة
            </button>

            <ul className="space-y-2">
              {knowledgeDocs.map((d) => {
                const scopeParts = [
                  d.education_level
                    ? ACADEMIC_LEVEL_LABELS[d.education_level as AcademicEducationLevel] ?? d.education_level
                    : 'كل المراحل',
                  d.grade != null
                    ? (d.education_level
                      ? formatGradeLabel(d.education_level as AcademicEducationLevel, d.grade)
                      : `صف ${d.grade}`)
                    : 'كل الصفوف',
                  d.subject?.trim() || 'كل المواد',
                ];
                return (
                  <li
                    key={d.id}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-3.5 py-3 flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-white text-sm font-semibold truncate">{d.title}</p>
                      <p className="text-[11px] text-[#A3AED0]">
                        {scopeParts.join(' · ')}
                      </p>
                      <p className="text-[11px] text-[#A3AED0]">
                        {d.file_name} · {d.status}
                        {d.chunk_count ? ` · ${d.chunk_count} مقطع` : ''}
                        {d.error_message ? ` · ${d.error_message}` : ''}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={async () => {
                          try {
                            await aiAssistantService.reingestKnowledgeDoc(d.id);
                            toast.success('أُعيدت الفهرسة');
                            refetchKnowledge();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : 'فشل');
                          }
                        }}
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        إعادة فهرسة
                      </button>
                      <button
                        type="button"
                        className={btnSecondary}
                        onClick={async () => {
                          try {
                            await aiAssistantService.deleteKnowledgeDoc(d.id);
                            toast.success('حُذف');
                            refetchKnowledge();
                          } catch (e) {
                            toast.error(e instanceof Error ? e.message : 'فشل');
                          }
                        }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        حذف
                      </button>
                    </div>
                  </li>
                );
              })}
              {!knowledgeDocs.length && (
                <li className="text-[#A3AED0] text-xs py-2">لا ملفات بعد</li>
              )}
            </ul>
          </AiPanel>

          {/* Templates */}
          <AiPanel>
            <AiSectionLabel icon={FileText}>قوالب سياسة المدرسة</AiSectionLabel>
            <p className="text-[#A3AED0] text-xs mb-4">
              يُحقن النص النشط تلقائياً في كل عملية توليد للمعلمين.
            </p>

            {loadingTemplates ? (
              <p className="text-[#A3AED0] text-sm">جاري التحميل…</p>
            ) : (
              <ul className="space-y-2 mb-4">
                {templates.map((t) => (
                  <li
                    key={t.id}
                    className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3.5"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-white text-sm font-semibold">
                        {t.title}{' '}
                        {t.is_active && (
                          <span className="text-[#01B574] text-[11px] font-medium">· نشط</span>
                        )}
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          className={btnSecondary}
                          onClick={() => setTemplateDraft(t)}
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          className={btnSecondary}
                          disabled={deleteTemplateMut.isPending}
                          onClick={() => {
                            if (confirm(`حذف القالب «${t.title}»؟`)) {
                              deleteTemplateMut.mutate(t.id);
                            }
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <pre className="whitespace-pre-wrap text-[#A3AED0] text-xs mt-2 font-sans max-h-28 overflow-y-auto leading-relaxed">
                      {t.body}
                    </pre>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-white/[0.06] pt-4 space-y-2.5">
              <p className="text-white text-sm font-semibold">
                {templateDraft.id ? 'تعديل قالب' : 'قالب جديد'}
              </p>
              <input
                className={clsx(academicInputClass, '!rounded-xl')}
                placeholder="عنوان القالب"
                value={templateDraft.title ?? ''}
                onChange={(e) => setTemplateDraft((d) => ({ ...d, title: e.target.value }))}
              />
              <textarea
                className={clsx(academicInputClass, 'min-h-[120px] resize-y !rounded-xl')}
                placeholder="نص السياسة..."
                value={templateDraft.body ?? ''}
                onChange={(e) => setTemplateDraft((d) => ({ ...d, body: e.target.value }))}
              />
              <label className="flex items-center gap-2 text-sm text-white">
                <input
                  type="checkbox"
                  className="accent-gold-500"
                  checked={templateDraft.is_active !== false}
                  onChange={(e) => setTemplateDraft((d) => ({ ...d, is_active: e.target.checked }))}
                />
                نشط
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={saveTemplateMut.isPending}
                  onClick={() => saveTemplateMut.mutate()}
                >
                  <Save className="w-4 h-4" />
                  حفظ القالب
                </button>
                {templateDraft.id && (
                  <button
                    type="button"
                    className={btnSecondary}
                    onClick={() => setTemplateDraft({ title: '', body: '', is_active: true })}
                  >
                    إلغاء التعديل
                  </button>
                )}
              </div>
            </div>
          </AiPanel>

          {/* Bonus / teacher controls */}
          <AiPanel>
            <AiSectionLabel icon={Coins}>إدارة رصيد المعلمين</AiSectionLabel>
            <div className="grid sm:grid-cols-3 gap-3 mt-1">
              <label className="text-xs text-[#A3AED0] block sm:col-span-2">
                المعلم
                <select
                  className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
                  value={bonusTeacherId}
                  onChange={(e) => setBonusTeacherId(e.target.value)}
                >
                  <option value="">اختر معلماً</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>{t.full_name}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-[#A3AED0] block">
                النقاط (+ إضافة / − خصم)
                <input
                  type="number"
                  className={clsx(academicInputClass, 'mt-1 !rounded-xl')}
                  value={bonusAmount}
                  onChange={(e) => setBonusAmount(Number(e.target.value))}
                />
              </label>
            </div>
            <input
              className={clsx(academicInputClass, 'mt-3 !rounded-xl')}
              placeholder="ملاحظة اختيارية"
              value={bonusNote}
              onChange={(e) => setBonusNote(e.target.value)}
            />
            <div className="flex flex-wrap gap-2 mt-4">
              <button
                type="button"
                className={btnPrimary}
                disabled={!bonusTeacherId || addBonusMut.isPending}
                onClick={() => addBonusMut.mutate()}
              >
                <Plus className="w-4 h-4" />
                تطبيق
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={!bonusTeacherId}
                onClick={async () => {
                  try {
                    await aiCreditsService.principalAction({
                      action: 'set_disabled',
                      teacher_id: bonusTeacherId,
                      disabled: true,
                    });
                    toast.success('تم إيقاف AI للمعلم');
                    qc.invalidateQueries({ queryKey: ['ai-credit-balances-all'] });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'فشل');
                  }
                }}
              >
                <Ban className="w-3.5 h-3.5" />
                إيقاف AI
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={!bonusTeacherId}
                onClick={async () => {
                  try {
                    await aiCreditsService.principalAction({
                      action: 'set_disabled',
                      teacher_id: bonusTeacherId,
                      disabled: false,
                    });
                    toast.success('تم تفعيل AI للمعلم');
                    qc.invalidateQueries({ queryKey: ['ai-credit-balances-all'] });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'فشل');
                  }
                }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                تفعيل AI
              </button>
              <button
                type="button"
                className={btnSecondary}
                disabled={!bonusTeacherId}
                onClick={async () => {
                  try {
                    await aiCreditsService.principalAction({
                      action: 'reset_month',
                      teacher_id: bonusTeacherId,
                    });
                    toast.success('تمت إعادة تعيين الشهر');
                    qc.invalidateQueries({ queryKey: ['ai-credit-balances-all'] });
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : 'فشل');
                  }
                }}
              >
                <RefreshCw className="w-3.5 h-3.5" />
                إعادة تعيين الشهر
              </button>
            </div>
          </AiPanel>

          {/* Balances table */}
          <AiPanel>
            <AiSectionLabel icon={Users}>استهلاك المعلمين</AiSectionLabel>
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full text-sm text-right">
                <thead>
                  <tr className="text-[#A3AED0] text-[11px] border-b border-white/[0.06]">
                    <th className="py-2.5 font-medium">المعلم</th>
                    <th className="font-medium">متبقي</th>
                    <th className="font-medium">مستهلك</th>
                    <th className="font-medium">إضافي</th>
                    <th className="font-medium">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => (
                    <tr key={b.id} className="border-t border-white/[0.04] text-white/90">
                      <td className="py-2.5">{b.teacher_name}</td>
                      <td className="tabular-nums font-semibold">{b.remaining_credit}</td>
                      <td className="tabular-nums">{b.used_credit}</td>
                      <td className="tabular-nums">{b.bonus_credit}</td>
                      <td>
                        <span
                          className={clsx(
                            'inline-flex text-[11px] font-semibold px-2 py-0.5 rounded-md',
                            b.ai_disabled
                              ? 'bg-red-500/15 text-red-300'
                              : 'bg-[#01B574]/15 text-[#01B574]',
                          )}
                        >
                          {b.ai_disabled ? 'موقوف' : 'نشط'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!balances.length && (
                <p className="text-[#A3AED0] text-xs py-6 text-center">
                  لا بيانات بعد — تظهر بعد أول استخدام للمعلمين.
                </p>
              )}
            </div>
          </AiPanel>

          {/* Catalog */}
          <AiPanel>
            <AiSectionLabel icon={Settings2}>تكاليف العمليات</AiSectionLabel>
            <div className="space-y-2 max-h-[420px] overflow-y-auto ai-scroll pe-1">
              {catalog.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center gap-2 border border-white/[0.07] rounded-xl px-3 py-2.5 bg-white/[0.02]"
                >
                  <span className="text-white text-sm flex-1 min-w-[140px] font-medium">
                    {item.task_name}
                  </span>
                  <span className="text-[#A3AED0] text-[11px] font-mono" dir="ltr">
                    {item.task_code}
                  </span>
                  <input
                    type="number"
                    className={clsx(academicInputClass, 'w-24 !rounded-lg !py-1.5')}
                    defaultValue={item.default_credit}
                    onBlur={async (e) => {
                      const val = Number(e.target.value);
                      if (!Number.isFinite(val) || val === item.default_credit) return;
                      try {
                        await aiCreditsService.principalAction({
                          action: 'update_catalog',
                          task_code: item.task_code,
                          default_credit: val,
                          is_active: item.is_active,
                        });
                        toast.success('تم تحديث التكلفة');
                        qc.invalidateQueries({ queryKey: ['ai-credit-catalog'] });
                        qc.invalidateQueries({ queryKey: ['ai-prompts'] });
                      } catch (err) {
                        toast.error(err instanceof Error ? err.message : 'فشل');
                      }
                    }}
                  />
                </div>
              ))}
            </div>
          </AiPanel>
        </div>
      </div>
    </AiStudioShell>
  );
}
