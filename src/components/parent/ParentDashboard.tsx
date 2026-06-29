import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  AlertCircle, Award, CalendarCheck, ClipboardList, User,
} from 'lucide-react';
import clsx from 'clsx';
import { useParentChildren } from '../../hooks/useParentChildren';
import { useStudentMetrics } from '../../hooks/useStudentMetrics';
import { ParentPageShell } from './ParentPageShell';
import { ParentChildSelector } from './ParentChildSelector';
import { ParentWeeklySummary } from './ParentWeeklySummary';
import { ParentMonthlyReport } from './ParentMonthlyReport';
import { ParentAbsenceAlert } from './ParentAbsenceAlert';
import { ParentAbsencePushSetting } from './ParentAbsencePushSetting';
import { ParentCommunicationSuggestions } from './ParentCommunicationSuggestions';
import { ParentProgressComparison } from './ParentProgressComparison';
import { ParentFaqSection } from './ParentFaqSection';
import { ParentVisualGuide } from './ParentVisualGuide';
import { ContactSchoolButton } from './ContactSchoolButton';
import { FeatureGate } from '../shared/FeatureGate';
import { StudentMetricsOverview } from '../shared/StudentMetricsOverview';
import { ClassAverageComparison } from '../shared/ClassAverageComparison';
import { UpcomingExamsWidget } from '../shared/UpcomingExamsWidget';
import { ActivityTimeline } from '../shared/ActivityTimeline';
import { PageHeader, TapHandLoader } from '../ui';
import { containerVariants, itemVariants } from '../../lib/motionVariants';
import { summarizeAttendance } from '../../lib/attendanceScore';
import { useParentChildStore } from '../../stores/parentChildStore';

function ChildSummaryCard({
  child,
  isSelected,
  onSelect,
}: {
  child: { id: string; full_name: string; grade: string; class_name: string };
  isSelected: boolean;
  onSelect: () => void;
}) {
  const metrics = useStudentMetrics(child.id);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'glass-card glass-card-hover p-4 text-right w-full transition-all',
        isSelected && 'ring-2 ring-gold-400/50 border-gold-500/30'
      )}
    >
      <p className="text-white font-bold text-sm">{child.full_name}</p>
      <p className="text-white/40 text-[10px] mt-0.5">{child.grade} — {child.class_name}</p>
      {metrics.isLoading ? (
        <p className="text-white/30 text-xs mt-2">...</p>
      ) : (
        <div className="flex items-center justify-between mt-3 gap-2">
          <span className="text-gold-400 font-bold text-lg font-mono tabular-nums">{metrics.totalPoints}</span>
          <span className={clsx('text-[10px] px-2 py-0.5 rounded-full border', metrics.level.badgeBg)}>
            {metrics.level.name}
          </span>
        </div>
      )}
    </button>
  );
}

export function ParentDashboard() {
  const { children, isLoading, selectedChild, selectedChildId, setSelectedChildId } = useParentChildren();
  const storeSetChild = useParentChildStore((s) => s.setSelectedChildId);
  const metrics = useStudentMetrics(selectedChild?.id);

  if (isLoading) {
    return <TapHandLoader label="جاري تحميل لوحة ولي الأمر..." fullScreen />;
  }

  if (children.length === 0) {
    return (
      <ParentPageShell>
        <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-8 glass-card">
          <AlertCircle className="w-12 h-12 text-gold-400 mb-3" />
          <h2 className="text-white font-bold text-lg">لا يوجد أبناء مرتبطين بحسابك</h2>
          <p className="text-white/40 text-sm mt-1">يرجى مراجعة إدارة المدرسة لربط بيانات الأبناء.</p>
        </div>
      </ParentPageShell>
    );
  }

  const attSummary = summarizeAttendance(
    metrics.attendanceRecords.map((r) => ({
      status: r.status as 'present' | 'absent' | 'late',
    }))
  );

  const lastExam = metrics.lastExam as {
    score: number;
    max_score: number;
    exams?: { title: string; subject_name?: string } | { title: string; subject_name?: string }[];
  } | null;

  const examMeta = lastExam?.exams
    ? Array.isArray(lastExam.exams) ? lastExam.exams[0] : lastExam.exams
    : null;

  return (
    <ParentPageShell>
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <PageHeader
            title="لوحة متابعة الأبناء"
            subtitle="ملخص الابن — قراءة فقط"
            role="ولي الأمر"
            avatar="و"
          />
          <FeatureGate featureId="widget:parent:contact_school">
            <ContactSchoolButton />
          </FeatureGate>
        </div>

        {children.length > 1 && (
          <motion.div variants={itemVariants}>
            <p className="text-white/50 text-xs mb-2">بطاقات الأبناء — اضغط للتبديل</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {children.map((c) => (
                <ChildSummaryCard
                  key={c.id}
                  child={c}
                  isSelected={c.id === selectedChildId}
                  onSelect={() => {
                    setSelectedChildId(c.id);
                    storeSetChild(c.id);
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <ParentChildSelector
          children={children}
          selectedChildId={selectedChildId}
          onChange={(id) => {
            setSelectedChildId(id);
            storeSetChild(id);
          }}
        />

        {selectedChild && (
          <FeatureGate featureId="widget:parent:absence_alert">
            <ParentAbsenceAlert studentId={selectedChild.id} studentName={selectedChild.full_name} />
          </FeatureGate>
        )}

        <FeatureGate featureId="widget:parent:push_settings">
          <ParentAbsencePushSetting />
        </FeatureGate>

        {selectedChild && !metrics.isLoading && (
          <>
            <motion.div variants={itemVariants}>
              <FeatureGate featureId="widget:parent:summary_cards">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="glass-card p-4">
                    <p className="text-white/40 text-[10px]">إجمالي النقاط</p>
                    <p className="text-2xl font-bold text-gold-400 font-mono tabular-nums">{metrics.totalPoints}</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-white/40 text-[10px]">الترتيب في الفصل</p>
                    <p className="text-2xl font-bold text-white font-mono">
                      {metrics.classRank != null ? `#${metrics.classRank}` : '—'}
                    </p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-white/40 text-[10px]">نسبة الحضور</p>
                    <p className="text-2xl font-bold text-emerald-400">{attSummary.ratePct}%</p>
                  </div>
                  <div className="glass-card p-4">
                    <p className="text-white/40 text-[10px]">آخر اختبار</p>
                    <p className="text-sm font-bold text-purple-300 truncate">
                      {lastExam && lastExam.max_score > 0
                        ? `${Math.round((lastExam.score / lastExam.max_score) * 100)}%`
                        : '—'}
                    </p>
                    {examMeta && <p className="text-[10px] text-white/30 truncate">{examMeta.title}</p>}
                  </div>
                </div>
              </FeatureGate>
            </motion.div>

            <motion.div variants={itemVariants}>
              <FeatureGate featureId="widget:parent:metrics_overview">
                <StudentMetricsOverview
                  totalPoints={metrics.totalPoints}
                  level={metrics.level}
                  breakdown={metrics.breakdown}
                  achievements={metrics.achievements}
                  progressPercent={metrics.progressPercent}
                  pointsToNext={metrics.pointsToNext}
                />
              </FeatureGate>
            </motion.div>

            <motion.div variants={itemVariants}>
              <FeatureGate featureId="widget:parent:class_average">
                <ClassAverageComparison studentScore={metrics.totalPoints} classAverage={metrics.classAverage} />
              </FeatureGate>
            </motion.div>

            <motion.div variants={itemVariants}>
              <FeatureGate featureId="widget:parent:progress_compare">
                <ParentProgressComparison points={metrics.points} />
              </FeatureGate>
            </motion.div>

            <motion.div variants={itemVariants}>
              <FeatureGate featureId="widget:parent:communication">
                <ParentCommunicationSuggestions
                  breakdown={metrics.breakdown}
                  points={metrics.points}
                  classAverage={metrics.classAverage}
                  totalPoints={metrics.totalPoints}
                  attendanceRecords={metrics.attendanceRecords}
                  examScorePct={
                    lastExam && lastExam.max_score > 0
                      ? Math.round((lastExam.score / lastExam.max_score) * 100)
                      : null
                  }
                  hasApprovedSuggestion={metrics.hasApprovedSuggestion}
                />
              </FeatureGate>
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <motion.div variants={itemVariants}>
                <FeatureGate featureId="widget:parent:weekly_summary">
                  <ParentWeeklySummary studentId={selectedChild.id} />
                </FeatureGate>
              </motion.div>
              <motion.div variants={itemVariants}>
                <FeatureGate featureId="widget:parent:monthly_report">
                  <ParentMonthlyReport
                    studentId={selectedChild.id}
                    studentName={selectedChild.full_name}
                    grade={selectedChild.grade}
                    className={selectedChild.class_name}
                  />
                </FeatureGate>
              </motion.div>
            </div>

            <motion.div variants={itemVariants}>
              <FeatureGate featureId="widget:parent:upcoming_exams">
                <UpcomingExamsWidget
                  grade={selectedChild.grade}
                  studentId={selectedChild.id}
                  examsLink="/exams/results"
                />
              </FeatureGate>
            </motion.div>

            <motion.div variants={itemVariants}>
              <FeatureGate featureId="widget:parent:activity_timeline">
                <ActivityTimeline studentId={selectedChild.id} />
              </FeatureGate>
            </motion.div>

            <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <FeatureGate featureId="nav:parent:/student-profile">
                <Link to="/student-profile" className="glass-card glass-card-hover p-4 flex items-center gap-3">
                  <User className="w-5 h-5 text-gold-400" />
                  <span className="text-white text-sm">ملف الطالب</span>
                </Link>
              </FeatureGate>
              <FeatureGate featureId="nav:parent:/attendance/view">
                <Link to="/attendance/view" className="glass-card glass-card-hover p-4 flex items-center gap-3">
                  <CalendarCheck className="w-5 h-5 text-emerald-400" />
                  <span className="text-white text-sm">الحضور</span>
                </Link>
              </FeatureGate>
              <FeatureGate featureId="nav:parent:/exams/results">
                <Link to="/exams/results" className="glass-card glass-card-hover p-4 flex items-center gap-3">
                  <ClipboardList className="w-5 h-5 text-purple-400" />
                  <span className="text-white text-sm">نتائج الاختبارات</span>
                </Link>
              </FeatureGate>
            </motion.div>

            <motion.div variants={itemVariants}>
              <FeatureGate featureId="widget:parent:points_explainer">
                <div className="glass-card p-5 space-y-2" dir="rtl">
                  <h3 className="text-white font-semibold text-sm flex items-center gap-2">
                    <Award className="w-4 h-4 text-gold-400" />
                    فهم إجمالي النقاط
                  </h3>
                  <p className="text-white/50 text-xs leading-relaxed">
                    الرقم المعروض هو مجموع النقاط المعتمدة التي منحها المعلمون ورائد النشاط — كما يراها الابن في لوحته. المحاور والحضور معروضة للمتابعة بشكل منفصل.
                  </p>
                </div>
              </FeatureGate>
            </motion.div>

            <motion.div variants={itemVariants}>
              <FeatureGate featureId="widget:parent:visual_guide">
                <ParentVisualGuide />
              </FeatureGate>
            </motion.div>

            <motion.div variants={itemVariants}>
              <FeatureGate featureId="widget:parent:faq">
                <ParentFaqSection />
              </FeatureGate>
            </motion.div>
          </>
        )}

        {selectedChild && metrics.isLoading && (
          <TapHandLoader label="جاري تحميل بيانات الابن..." />
        )}
      </motion.div>
    </ParentPageShell>
  );
}
