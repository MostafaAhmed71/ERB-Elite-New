import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { HelpCircle, Plus, Pencil, Trash2, Copy, GitCompare } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { GradeSubjectPicker, skillsForGradeSubject } from '../../components/supervisor/GradeSubjectPicker';
import { useGradeClassCatalog, useSyncedGrade } from '../../hooks/useGradeClassCatalog';
import type { DbQuestion, DbSkill, QuestionType } from '../../types';
import { toast } from 'react-hot-toast';
import { BarsLoader } from '../../components/ui/BarsLoader';
import { QUESTION_TYPE_LABELS, parseMatchingOptions, serializeMatchingAnswer } from '../../lib/questionGrading';
import { QuestionImportPanel } from '../../components/supervisor/QuestionImportPanel';
import { QuestionPsychometricBanner } from '../../components/supervisor/QuestionPsychometricBanner';
import { QuestionVersionComparePanel } from '../../components/supervisor/QuestionVersionComparePanel';
import { AiQuestionSuggestPanel } from '../../components/supervisor/AiQuestionSuggestPanel';
import { QtiExchangePanel } from '../../components/supervisor/QtiExchangePanel';
import { getQuestionRepoStats } from '../../lib/platformAudit';

interface QuestionForm {
  skill_id: string;
  type: QuestionType;
  question_text: string;
  options: string[];
  matchingPairs: { left: string; right: string }[];
  correct_answer: string;
  difficulty: 'easy' | 'medium' | 'hard';
  sub_skill_label: string;
}

function buildCorrectAnswer(form: QuestionForm): string {
  if (form.type === 'MATCHING') {
    const map: Record<string, string> = {};
    for (const p of form.matchingPairs) {
      if (p.left.trim() && p.right.trim()) map[p.left.trim()] = p.right.trim();
    }
    return serializeMatchingAnswer(map);
  }
  return form.correct_answer;
}

function buildOptionsPayload(form: QuestionForm) {
  if (form.type === 'MCQ') return form.options.filter((o) => o.trim());
  if (form.type === 'MATCHING') return { pairs: form.matchingPairs.filter((p) => p.left.trim() && p.right.trim()) };
  return null;
}

const DIFFICULTY_LABELS = { easy: 'سهل', medium: 'متوسط', hard: 'صعب' };
const DIFFICULTY_COLORS = {
  easy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  medium: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  hard: 'bg-red-500/15 text-red-300 border-red-500/25',
};

function QuestionModal({ question, skills, onClose, onSuccess }: {
  question: DbQuestion | null; skills: DbSkill[];
  onClose: () => void; onSuccess: () => void;
}) {
  const { user } = useAuthStore();
  const isEdit = !!question;
  const initialMatching = question?.type === 'MATCHING' ? parseMatchingOptions(question.options).pairs : [
    { left: '', right: '' },
    { left: '', right: '' },
  ];
  const [form, setForm] = useState<QuestionForm>({
    skill_id: question?.skill_id ?? skills[0]?.id ?? '',
    type: question?.type ?? 'MCQ',
    question_text: question?.question_text ?? '',
    options: Array.isArray(question?.options) ? (question!.options as string[]) : ['', '', '', ''],
    matchingPairs: initialMatching.length > 0 ? initialMatching : [{ left: '', right: '' }],
    correct_answer: question?.correct_answer ?? '',
    difficulty: question?.difficulty ?? 'medium',
    sub_skill_label: question?.sub_skill_label ?? '',
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const payload = {
        skill_id: form.skill_id,
        type: form.type,
        question_text: form.question_text,
        options: buildOptionsPayload(form),
        correct_answer: buildCorrectAnswer(form),
        difficulty: form.difficulty,
        sub_skill_label: form.sub_skill_label.trim() || null,
        created_by: user!.id,
      };
      if (isEdit) {
        const { error } = await supabase.from('questions').update(payload).eq('id', question!.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('questions').insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success(isEdit ? 'تم التحديث' : 'تم الإنشاء'); onSuccess(); },
    onError: (e: Error) => toast.error(e.message),
  });

  const setOption = (i: number, val: string) => {
    const opts = [...form.options];
    opts[i] = val;
    setForm({ ...form, options: opts });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto" dir="rtl">
      <div className="bg-navy-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl my-6 animate-scale-in">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-white font-bold flex items-center gap-2"><HelpCircle className="w-5 h-5 text-gold-400" />{isEdit ? 'تعديل سؤال' : 'إضافة سؤال'}</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80">✕</button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-white/60 text-sm">المهارة</label>
              <select value={form.skill_id} onChange={e => setForm({ ...form, skill_id: e.target.value })} required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none">
                <option value="" className="bg-navy-900">اختر مهارة</option>
                {skills.map(s => <option key={s.id} value={s.id} className="bg-navy-900">{s.skill_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-white/60 text-sm">النوع</label>
              <select value={form.type} onChange={e => {
                const t = e.target.value as QuestionType;
                setForm({ ...form, type: t, correct_answer: '', matchingPairs: [{ left: '', right: '' }, { left: '', right: '' }] });
              }}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none">
                {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                  <option key={t} value={t} className="bg-navy-900">{QUESTION_TYPE_LABELS[t]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-white/60 text-sm">نص السؤال</label>
            <textarea value={form.question_text} onChange={e => setForm({ ...form, question_text: e.target.value })}
              required rows={3} placeholder="اكتب السؤال هنا..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm resize-none" />
          </div>

          {form.type === 'MCQ' && (
            <div className="space-y-2">
              <label className="text-white/60 text-sm">خيارات الإجابة</label>
              {form.options.map((opt, i) => (
                <input key={i} value={opt} onChange={e => setOption(i, e.target.value)}
                  placeholder={`الخيار ${i + 1}`}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm" />
              ))}
            </div>
          )}

          {form.type === 'MATCHING' && (
            <div className="space-y-2">
              <label className="text-white/60 text-sm">أزواج الربط (يسار ← يمين)</label>
              {form.matchingPairs.map((pair, i) => (
                <div key={i} className="flex gap-2">
                  <input value={pair.left} onChange={(e) => {
                    const pairs = [...form.matchingPairs];
                    pairs[i] = { ...pairs[i], left: e.target.value };
                    setForm({ ...form, matchingPairs: pairs });
                  }} placeholder="عمود أ" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
                  <input value={pair.right} onChange={(e) => {
                    const pairs = [...form.matchingPairs];
                    pairs[i] = { ...pairs[i], right: e.target.value };
                    setForm({ ...form, matchingPairs: pairs });
                  }} placeholder="عمود ب" className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm" />
                </div>
              ))}
              <button type="button" onClick={() => setForm({ ...form, matchingPairs: [...form.matchingPairs, { left: '', right: '' }] })}
                className="text-cyan-400 text-xs">+ إضافة زوج</button>
            </div>
          )}

          {(form.type === 'FILL_BLANK' || form.type === 'SHORT_ANSWER') && (
            <div className="space-y-1.5">
              <label className="text-white/60 text-sm">الإجابة النموذجية</label>
              <input value={form.correct_answer} onChange={(e) => setForm({ ...form, correct_answer: e.target.value })} required
                placeholder={form.type === 'FILL_BLANK' ? 'الكلمة أو العبارة الصحيحة' : 'الإجابة المتوقعة'}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-white/60 text-sm">مهارة فرعية / معيار منهجي (اختياري)</label>
            <input value={form.sub_skill_label} onChange={(e) => setForm({ ...form, sub_skill_label: e.target.value })}
              placeholder="مثال: تطبيق قاعدة الضرب"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {form.type !== 'FILL_BLANK' && form.type !== 'SHORT_ANSWER' && form.type !== 'MATCHING' && (
            <div className="space-y-1.5">
              <label className="text-white/60 text-sm">الإجابة الصحيحة</label>
              {form.type === 'TF' ? (
                <select value={form.correct_answer} onChange={e => setForm({ ...form, correct_answer: e.target.value })} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none">
                  <option value="" className="bg-navy-900">اختر</option>
                  <option value="true" className="bg-navy-900">صح</option>
                  <option value="false" className="bg-navy-900">خطأ</option>
                </select>
              ) : (
                <select value={form.correct_answer} onChange={e => setForm({ ...form, correct_answer: e.target.value })} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none">
                  <option value="" className="bg-navy-900">اختر الإجابة</option>
                  {form.options.filter(o => o.trim()).map((opt, i) => (
                    <option key={i} value={opt} className="bg-navy-900">{opt}</option>
                  ))}
                </select>
              )}
            </div>
            )}
            <div className="space-y-1.5">
              <label className="text-white/60 text-sm">الصعوبة</label>
              <select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none">
                <option value="easy" className="bg-navy-900">سهل</option>
                <option value="medium" className="bg-navy-900">متوسط</option>
                <option value="hard" className="bg-navy-900">صعب</option>
              </select>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-white/10 text-white/60 hover:text-white text-sm">إلغاء</button>
            <button type="submit" disabled={mutation.isPending || skills.length === 0}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 font-semibold text-sm disabled:opacity-60">
              {mutation.isPending ? 'جاري...' : isEdit ? 'حفظ' : 'إنشاء'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function QuestionBankPage() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { data: catalog } = useGradeClassCatalog();
  const [activeGrade, setActiveGrade] = useSyncedGrade(catalog?.grades ?? []);
  const [activeSubject, setActiveSubject] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editQ, setEditQ] = useState<DbQuestion | null>(null);
  const [skillFilter, setSkillFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [compareQuestion, setCompareQuestion] = useState<DbQuestion | null>(null);

  const { data: skills = [] } = useQuery({
    queryKey: ['skills'],
    queryFn: async () => { const { data, error } = await supabase.from('skills').select('*').order('skill_name'); if (error) throw error; return data as DbSkill[]; },
  });

  const { data: repoStats } = useQuery({
    queryKey: ['question-repo-stats'],
    queryFn: getQuestionRepoStats,
    retry: false,
    staleTime: 60_000,
  });

  const subjectSkills = activeSubject
    ? skillsForGradeSubject(skills, activeGrade, activeSubject)
    : [];

  const skillIds = subjectSkills.map(s => s.id);

  const { data: questions = [], isLoading } = useQuery({
    queryKey: ['questions', activeGrade, activeSubject, skillFilter, typeFilter],
    queryFn: async () => {
      if (!activeSubject || skillIds.length === 0) return [];
      let q = supabase
        .from('questions')
        .select('*, skills:skill_id(subject_name, skill_name, grade)')
        .in('skill_id', skillIds)
        .order('created_at', { ascending: false });
      if (skillFilter) q = q.eq('skill_id', skillFilter);
      if (typeFilter) q = q.eq('type', typeFilter);
      const { data, error } = await q;
      if (error) throw error;
      return data as (DbQuestion & { skills: { subject_name: string; skill_name: string; grade: string } | null })[];
    },
    enabled: !!activeSubject && skillIds.length > 0,
  });

  const questionCountBySubject = (grade: string, subjectName: string) => {
    const ids = new Set(skillsForGradeSubject(skills, grade, subjectName).map(s => s.id));
    return skills.filter(s => ids.has(s.id)).length > 0
      ? `${skills.filter(s => ids.has(s.id)).length} مهارة`
      : 'لا مهارات';
  };

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => { const { error } = await supabase.from('questions').delete().eq('id', id); if (error) throw error; },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['questions'] }); toast.success('تم الحذف'); },
    onError: () => toast.error('لا يمكن حذف سؤال مرتبط باختبار'),
  });

  const versionMutation = useMutation({
    mutationFn: async (q: DbQuestion) => {
      const parentId = q.parent_question_id ?? q.id;
      const { data: siblings, error: sErr } = await supabase
        .from('questions')
        .select('version_number')
        .or(`id.eq.${parentId},parent_question_id.eq.${parentId}`);
      if (sErr) throw sErr;
      const maxVer = Math.max(...(siblings ?? []).map((s) => s.version_number ?? 1), q.version_number ?? 1);
      const { error } = await supabase.from('questions').insert({
        skill_id: q.skill_id,
        type: q.type,
        question_text: q.question_text,
        options: q.options,
        correct_answer: q.correct_answer,
        difficulty: q.difficulty,
        sub_skill_label: q.sub_skill_label,
        parent_question_id: parentId,
        version_number: maxVer + 1,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questions'] });
      toast.success('تم إنشاء إصدار جديد v+1');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSubjectChange = (subject: string) => {
    setActiveSubject(subject);
    setSkillFilter('');
    setTypeFilter('');
  };

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <HelpCircle className="w-6 h-6 text-gold-400" /> مستودع الأسئلة
          </h1>
          <p className="text-sm text-white/50 mt-1">
            بنك الأسئلة المدرسي — استيراد · إصدارات · QTI · اقتراحات AI
            {repoStats ? (
              <span className="text-white/70">
                {' '}· {repoStats.total} سؤال · {repoStats.skills_with_questions} مهارة · {repoStats.recent_7d} خلال أسبوع
              </span>
            ) : null}
          </p>
        </div>
        {activeSubject && (
          <button
            onClick={() => { setEditQ(null); setShowModal(true); }}
            disabled={subjectSkills.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 rounded-xl font-semibold text-sm disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> إضافة سؤال — {activeSubject}
          </button>
        )}
      </div>

      <QuestionPsychometricBanner />

      <GradeSubjectPicker
        activeGrade={activeGrade}
        activeSubject={activeSubject}
        onGradeChange={(g) => { setActiveGrade(g); setActiveSubject(null); setSkillFilter(''); }}
        onSubjectChange={handleSubjectChange}
        getSubjectBadge={questionCountBySubject}
      />

      {!activeSubject ? (
        <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-12 text-center">
          <HelpCircle className="w-12 h-12 text-white/10 mx-auto mb-3" />
          <p className="text-white/40 text-sm">اختر الصف ثم المادة لعرض وإدارة الأسئلة</p>
        </div>
      ) : subjectSkills.length === 0 ? (
        <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-12 text-center">
          <p className="text-white/40 text-sm">لا توجد مهارات لهذه المادة. أضف مهارات من صفحة «إدارة المهارات» أولاً.</p>
        </div>
      ) : (
        <>
          <QuestionImportPanel
            skills={subjectSkills}
            subjectLabel={`${activeGrade} — ${activeSubject}`}
            defaultSkillId={subjectSkills.length === 1 ? subjectSkills[0].id : skillFilter || undefined}
          />

          <AiQuestionSuggestPanel
            skills={subjectSkills}
            defaultSkillId={subjectSkills.length === 1 ? subjectSkills[0].id : skillFilter || undefined}
          />

          <QtiExchangePanel
            questions={questions}
            skills={subjectSkills}
            subjectLabel={`${activeGrade} — ${activeSubject}`}
            defaultSkillId={subjectSkills.length === 1 ? subjectSkills[0].id : skillFilter || undefined}
          />

          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-white/50 text-sm">
              {activeGrade} — {activeSubject}
              <span className="text-white/30 mr-2">({questions.length} سؤال)</span>
            </p>
            <div className="flex gap-3 flex-wrap">
              <select value={skillFilter} onChange={e => setSkillFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none">
                <option value="" className="bg-navy-900">كل المهارات</option>
                {subjectSkills.map(s => <option key={s.id} value={s.id} className="bg-navy-900">{s.skill_name}</option>)}
              </select>
              <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-gold-400/50 text-sm appearance-none">
                <option value="" className="bg-navy-900">كل الأنواع</option>
                <option value="MCQ" className="bg-navy-900">اختيار متعدد</option>
                <option value="TF" className="bg-navy-900">صح / خطأ</option>
                <option value="FILL_BLANK" className="bg-navy-900">إكمال فراغ</option>
                <option value="MATCHING" className="bg-navy-900">ربط</option>
                <option value="SHORT_ANSWER" className="bg-navy-900">مقالي قصير</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="py-10 flex justify-center">
              <BarsLoader label="جاري تحميل الأسئلة..." />
            </div>
          ) : questions.length === 0 ? (
            <div className="bg-navy-900/50 border border-white/5 rounded-2xl p-10 text-center text-white/30 text-sm">
              لا توجد أسئلة لهذه المادة بعد
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map(q => (
                <div key={q.id} className="bg-navy-900/50 border border-white/5 rounded-2xl p-4 group hover:border-white/10 transition-all">
                  <div className="flex items-start gap-3">
                    <span className={clsx('px-2.5 py-1 rounded-full text-xs border flex-shrink-0 mt-0.5', DIFFICULTY_COLORS[q.difficulty])}>
                      {DIFFICULTY_LABELS[q.difficulty]}
                    </span>
                    <span className={clsx('px-2.5 py-1 rounded-full text-xs border flex-shrink-0 mt-0.5',
                      q.type === 'MCQ' ? 'bg-blue-500/15 text-blue-300 border-blue-500/25' : 'bg-purple-500/15 text-purple-300 border-purple-500/25'
                    )}>{QUESTION_TYPE_LABELS[q.type] ?? q.type}</span>
                    {(q.version_number ?? 1) > 1 && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-white/5 text-white/40 border border-white/10">v{q.version_number}</span>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm leading-relaxed">{q.question_text}</p>
                      <p className="text-white/30 text-xs mt-1">
                        {(q.skills as { skill_name: string } | null)?.skill_name}
                        {q.sub_skill_label ? ` — ${q.sub_skill_label}` : ''}
                      </p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button type="button" onClick={() => setCompareQuestion(q)} title="مقارنة الإصدارات"
                        className="p-1.5 rounded-lg bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 transition-all"><GitCompare className="w-3.5 h-3.5" /></button>
                      <button type="button" onClick={() => versionMutation.mutate(q)} title="إصدار جديد"
                        className="p-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 transition-all"><Copy className="w-3.5 h-3.5" /></button>
                      <button onClick={() => { setEditQ(q); setShowModal(true); }}
                        className="p-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 transition-all"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteMutation.mutate(q.id)}
                        className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-all"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showModal && activeSubject && (
        <QuestionModal question={editQ} skills={subjectSkills}
          onClose={() => { setShowModal(false); setEditQ(null); }}
          onSuccess={() => { queryClient.invalidateQueries({ queryKey: ['questions'] }); setShowModal(false); }} />
      )}

      {compareQuestion && (
        <QuestionVersionComparePanel
          question={compareQuestion}
          onClose={() => setCompareQuestion(null)}
        />
      )}
    </div>
  );
}
