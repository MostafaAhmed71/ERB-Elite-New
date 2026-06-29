import { Fragment, useMemo, useState } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import {
  X,
  Target,
  ClipboardList,
  TrendingUp,
  Lightbulb,
  ShieldAlert,
  BookOpen,
  UserCheck,
  UserX,
} from 'lucide-react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import {
  buildStudentExamTimeline,
  suggestLearningPath,
  EXAM_TYPE_LABELS,
  type SkillWeakness,
} from '../../lib/examAnalytics';
import type { DbExamResult, DbStudent } from '../../types';
import { RtiPanel } from './RtiPanel';
import clsx from 'clsx';

type ExamResultRow = DbExamResult & {
  exams: {
    title: string;
    subject_name: string | null;
    grade: string | null;
    exam_type?: string | null;
  } | null;
};

export interface StudentDetailData extends DbStudent {
  avgPct: number | null;
  examsTaken: number;
  results: ExamResultRow[];
  weaknesses: SkillWeakness[];
  attendancePresent?: number;
  attendanceAbsent?: number;
}

type TabId = 'overview' | 'weaknesses' | 'exams' | 'rti';

const TABS: { id: TabId; label: string; icon: typeof TrendingUp }[] = [
  { id: 'overview', label: 'نظرة عامة', icon: TrendingUp },
  { id: 'weaknesses', label: 'نقاط الضعف', icon: Target },
  { id: 'exams', label: 'الاختبارات', icon: ClipboardList },
  { id: 'rti', label: 'التدخل', icon: ShieldAlert },
];

function scoreColor(pct: number) {
  if (pct >= 80) return 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30';
  if (pct >= 60) return 'text-amber-300 bg-amber-500/15 border-amber-500/30';
  return 'text-red-300 bg-red-500/15 border-red-500/30';
}

function scoreBarColor(pct: number) {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}

type Props = {
  student: StudentDetailData;
  onClose: () => void;
};

export function StudentDetailModal({ student, onClose }: Props) {
  const timeline = buildStudentExamTimeline(student.results);
  const path = suggestLearningPath(student.weaknesses);
  const showRti =
    student.avgPct === null || student.avgPct < 50 || student.weaknesses.length >= 3;

  const visibleTabs = useMemo(
    () => TABS.filter((t) => t.id !== 'rti' || showRti),
    [showRti],
  );
  const [activeTab, setActiveTab] = useState<TabId>('overview');

  const chartData = timeline.map((pt, i) => ({
    idx: i + 1,
    pct: pt.pct,
    title: pt.title,
    subject: pt.subject_name,
    type: EXAM_TYPE_LABELS[pt.exam_type],
  }));

  return (
    <Transition show as={Fragment}>
      <Dialog onClose={onClose} className="relative z-50">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/70 backdrop-blur-md" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              className="w-full sm:max-w-3xl max-h-[92vh] sm:max-h-[88vh] flex flex-col bg-navy-950 border border-white/10 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden"
              dir="rtl"
            >
              {/* Header */}
              <div className="relative flex-shrink-0 overflow-hidden border-b border-white/10">
                <div className="absolute inset-0 bg-gradient-to-l from-cyan-950/50 via-navy-900 to-navy-950" />
                <div className="absolute -top-10 -left-10 w-40 h-40 bg-gold-500/10 rounded-full blur-3xl" />
                <div className="relative px-5 pt-5 pb-4">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-950 text-xl font-bold shadow-lg shadow-gold-500/20 flex-shrink-0">
                      {student.full_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0 pt-0.5">
                      <h2 className="text-white font-bold text-lg leading-tight truncate">
                        {student.full_name}
                      </h2>
                      <p className="text-white/45 text-sm mt-1">
                        {student.grade} — فصل {student.class_name}
                      </p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/55">
                          {student.examsTaken} اختبار
                        </span>
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-white/55">
                          {student.weaknesses.length} نقطة ضعف
                        </span>
                        {student.attendancePresent !== undefined && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
                            {student.attendancePresent} حضور
                          </span>
                        )}
                        {student.attendanceAbsent !== undefined && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-300">
                            {student.attendanceAbsent} غياب
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                      aria-label="إغلاق"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  {student.avgPct !== null && (
                    <div className="mt-4 flex items-center gap-4 p-3 rounded-xl bg-black/20 border border-white/8">
                      <div className="relative w-16 h-16 flex-shrink-0">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
                          <circle
                            cx="18"
                            cy="18"
                            r="15.5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="3"
                            strokeLinecap="round"
                            strokeDasharray={`${student.avgPct} 100`}
                            className={clsx(
                              student.avgPct >= 80 ? 'text-emerald-400' : student.avgPct >= 60 ? 'text-amber-400' : 'text-red-400',
                            )}
                          />
                        </svg>
                        <span className="absolute inset-0 flex items-center justify-center text-white font-bold text-sm">
                          {student.avgPct}%
                        </span>
                      </div>
                      <div>
                        <p className="text-white/50 text-xs">المتوسط العام</p>
                        <p className="text-white font-semibold text-sm mt-0.5">
                          {student.avgPct >= 80 ? 'أداء ممتاز' : student.avgPct >= 60 ? 'أداء جيد' : 'يحتاج دعم'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div className="flex-shrink-0 flex gap-1 px-4 py-2 border-b border-white/5 bg-navy-900/80 overflow-x-auto">
                {visibleTabs.map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                      activeTab === tab.id
                        ? 'bg-gold-500/15 text-gold-300 border border-gold-500/25'
                        : 'text-white/45 hover:text-white/70 hover:bg-white/5 border border-transparent',
                    )}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                    {tab.id === 'weaknesses' && student.weaknesses.length > 0 && (
                      <span className="bg-red-500/20 text-red-300 px-1.5 rounded-full text-[10px]">
                        {student.weaknesses.length}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
                {activeTab === 'overview' && (
                  <>
                    {student.attendancePresent !== undefined && student.attendanceAbsent !== undefined && (
                      <div className="grid grid-cols-2 gap-2">
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
                          <UserCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                          <div>
                            <p className="text-white/40 text-[10px]">أيام الحضور</p>
                            <p className="text-emerald-400 font-bold text-lg tabular-nums">{student.attendancePresent}</p>
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                          <UserX className="w-4 h-4 text-red-400 flex-shrink-0" />
                          <div>
                            <p className="text-white/40 text-[10px]">أيام الغياب</p>
                            <p className="text-red-400 font-bold text-lg tabular-nums">{student.attendanceAbsent}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {chartData.length > 0 ? (
                      <div className="rounded-xl border border-white/8 bg-white/[0.02] p-4">
                        <p className="text-white/60 text-xs font-medium mb-3 flex items-center gap-2">
                          <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                          تطور الأداء
                        </p>
                        <div className="h-44">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                              <XAxis dataKey="idx" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} />
                              <YAxis domain={[0, 100]} tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }} width={32} />
                              <Tooltip
                                contentStyle={{
                                  background: '#0a1020',
                                  border: '1px solid rgba(255,255,255,0.1)',
                                  borderRadius: 10,
                                  fontSize: 12,
                                }}
                                formatter={(v: number) => [`${v}%`, 'النتيجة']}
                                labelFormatter={(_, payload) => {
                                  const p = payload?.[0]?.payload;
                                  return p ? `${p.title} (${p.subject})` : '';
                                }}
                              />
                              <Line
                                type="monotone"
                                dataKey="pct"
                                stroke="#22d3ee"
                                strokeWidth={2.5}
                                dot={{ r: 4, fill: '#22d3ee', strokeWidth: 0 }}
                                activeDot={{ r: 6 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-white/30 text-sm">
                        لا توجد نتائج اختبارات بعد
                      </div>
                    )}

                    {path.length > 0 && (
                      <div className="rounded-xl border border-cyan-500/15 bg-cyan-500/5 p-4">
                        <p className="text-cyan-300 text-sm font-medium mb-2 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          مسار تعلم مقترح
                        </p>
                        <ul className="space-y-2">
                          {path.slice(0, 4).map((line) => (
                            <li key={line} className="text-white/60 text-xs leading-relaxed flex gap-2">
                              <span className="text-cyan-500/60 flex-shrink-0">•</span>
                              <span>{line}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {student.weaknesses.length > 0 && (
                      <div>
                        <p className="text-white/50 text-xs mb-2">أبرز نقاط الضعف</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {student.weaknesses.slice(0, 4).map((w) => (
                            <div
                              key={w.skill_id}
                              className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <p className="text-white text-xs font-medium truncate">{w.skill_name}</p>
                                <p className="text-white/30 text-[10px] truncate">{w.subject_name}</p>
                              </div>
                              <span className={clsx('text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0', scoreColor(w.mastery_pct))}>
                                {w.mastery_pct}%
                              </span>
                            </div>
                          ))}
                        </div>
                        {student.weaknesses.length > 4 && (
                          <button
                            type="button"
                            onClick={() => setActiveTab('weaknesses')}
                            className="text-cyan-400 text-xs mt-2 hover:underline"
                          >
                            عرض الكل ({student.weaknesses.length})
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}

                {activeTab === 'weaknesses' && (
                  student.weaknesses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <Target className="w-10 h-10 text-emerald-500/30 mb-3" />
                      <p className="text-white/50 text-sm">لا توجد مهارات ضعيفة</p>
                      <p className="text-white/25 text-xs mt-1">أداء جيد في جميع المهارات المقاسة</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {student.weaknesses.map((w) => (
                        <div
                          key={w.skill_id}
                          className="p-4 rounded-xl bg-navy-900/60 border border-white/8 hover:border-red-500/20 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2 mb-3">
                            <div className="min-w-0">
                              <p className="text-white text-sm font-medium">{w.skill_name}</p>
                              <p className="text-white/35 text-xs mt-0.5 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" />
                                {w.subject_name}
                              </p>
                            </div>
                            <span className={clsx('text-xs font-bold px-2.5 py-1 rounded-full border flex-shrink-0', scoreColor(w.mastery_pct))}>
                              {w.mastery_pct}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className={clsx('h-full rounded-full transition-all', scoreBarColor(w.mastery_pct))}
                              style={{ width: `${w.mastery_pct}%` }}
                            />
                          </div>
                          <p className="text-white/25 text-[10px] mt-2">
                            {w.wrong} خطأ من {w.total} محاولة
                          </p>
                        </div>
                      ))}
                    </div>
                  )
                )}

                {activeTab === 'exams' && (
                  student.results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <ClipboardList className="w-10 h-10 text-white/10 mb-3" />
                      <p className="text-white/50 text-sm">لم يُجرِ الطالب اختبارات بعد</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {student.results.map((res) => {
                        const p = res.max_score > 0 ? Math.round((Number(res.score) / res.max_score) * 100) : 0;
                        return (
                          <div
                            key={res.id}
                            className="p-4 rounded-xl bg-navy-900/50 border border-white/8 hover:border-white/12 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-white text-sm font-medium truncate">{res.exams?.title ?? 'اختبار'}</p>
                                <p className="text-white/35 text-xs mt-0.5">{res.exams?.subject_name ?? '—'}</p>
                              </div>
                              <span className={clsx('font-bold text-sm px-2.5 py-1 rounded-lg border flex-shrink-0', scoreColor(p))}>
                                {p}%
                              </span>
                            </div>
                            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                              <div className={clsx('h-full rounded-full', scoreBarColor(p))} style={{ width: `${p}%` }} />
                            </div>
                            <p className="text-white/25 text-[10px] mt-2">
                              {Number(res.score)}/{res.max_score} —{' '}
                              {new Date(res.submitted_at).toLocaleDateString('ar-SA')}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {activeTab === 'rti' && showRti && (
                  <RtiPanel studentId={student.id} studentName={student.full_name} />
                )}
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
