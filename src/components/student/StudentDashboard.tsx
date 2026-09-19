import { AlertCircle, TrendingUp, HelpCircle, QrCode, ClipboardList, Gift, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../stores/authStore';
import { useStudentMetrics } from '../../hooks/useStudentMetrics';
import { LEVELS } from '../../lib/calculations';
import { AchievementBadges } from './AchievementBadges';
import { ActivitySuggestionsPanel } from './ActivitySuggestionsPanel';
import { StudentCardPanel } from './StudentCardPanel';
import { PendingPointsBanner } from './PendingPointsBanner';
import { WeeklyGoalWidget } from './WeeklyGoalWidget';
import { ScoreExplanationSection } from './ScoreExplanationSection';
import { WeakAxisTip } from './WeakAxisTip';
import { PersonalLearningPath } from './PersonalLearningPath';
import { PeerEncouragementPanel } from './PeerEncouragementPanel';
import { StreakWidget } from './StreakWidget';
import { LevelCertificateModal } from './LevelCertificateModal';
import { SeasonalAchievementsPanel } from './SeasonalAchievementsPanel';
import { CertificateWallet } from './CertificateWallet';
import { ClassRankSection } from './ClassRankSection';
import { WeeklyClassChallenge } from './WeeklyClassChallenge';
import { ExamReminderBanner } from './ExamReminderBanner';
import { StudentOnboardingTour } from './StudentOnboardingTour';
import { ClassAverageComparison } from '../shared/ClassAverageComparison';
import { UpcomingExamsWidget } from '../shared/UpcomingExamsWidget';
import { ActivityTimeline } from '../shared/ActivityTimeline';
import { FeatureGate } from '../shared/FeatureGate';
import { StudentNextTaskCard } from './StudentNextTaskCard';
import { containerVariants, itemVariants } from '../../lib/motionVariants';
import { PLATFORM_NAME, PLATFORM_NAME_SHORT } from '../../lib/branding';
import { PageHeader, TapHandLoader, EmptyState } from '../ui';
import { Panel, SectionTitle } from '../ui/Card';
import { getPointsStatusLabel } from '../../lib/pointsStatusLabels';
import clsx from 'clsx';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';

export function StudentDashboard() {
  const { user } = useAuthStore();

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['student', 'profile', user?.id],
    queryFn: async () => {
      if (!user) return null;

      const direct = await supabase
        .from('students')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (direct.data) return direct.data;

      // احتياط: RPC يتجاوز مشاكل RLS
      const viaRpc = await supabase.rpc('get_my_student_profile');
      if (viaRpc.error) {
        if (direct.error) throw direct.error;
        throw viaRpc.error;
      }
      const row = Array.isArray(viaRpc.data) ? viaRpc.data[0] : viaRpc.data;
      return row ?? null;
    },
    enabled: !!user,
  });

  const metrics = useStudentMetrics(profile?.id);
  const isLoading = profileLoading || metrics.isLoading;

  if (isLoading) {
    return <TapHandLoader label="جاري تحميل لوحتك..." fullScreen />;
  }

  if (!profile) {
    return (
      <div className="py-8" dir="rtl">
        <EmptyState
          icon={AlertCircle}
          title="لم يتم العثور على ملف الطالب"
          description="يرجى الاتصال برائد النشاط أو الإدارة لربط بريدك بالرقم الأكاديمي."
        />
      </div>
    );
  }

  const { totalPoints, level, breakdown, achievements, points, pendingCount, pendingSum, progressPercent, pointsToNext } = metrics;
  const categoryPoints = {
    activity: breakdown.activity,
    behavior: breakdown.behavior,
    achievement: breakdown.achievement,
    initiative: breakdown.initiative,
    attendance: breakdown.attendance,
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6 text-white"
      dir="rtl"
    >
      <StudentOnboardingTour />

      <FeatureGate featureId="widget:student:pending_points">
        <PendingPointsBanner count={pendingCount} sum={pendingSum} />
      </FeatureGate>

      <FeatureGate featureId="widget:student:exam_reminder">
        <ExamReminderBanner grade={profile.grade} studentId={profile.id} />
      </FeatureGate>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PageHeader
            title={profile.full_name}
            subtitle={`مرحباً بك في ${PLATFORM_NAME}`}
            role={`${profile.grade} • ${profile.class_name}`}
            avatar={profile.full_name.charAt(0)}
          />
          <div className="mt-3">
            <StudentNextTaskCard studentId={profile.id} />
          </div>
        </div>

        <FeatureGate featureId="widget:student:qr_card">
        <motion.div variants={itemVariants} className="flex flex-col gap-3">
          <Panel className="p-4 flex flex-col items-center">
            <p className="text-white/50 text-xs mb-3 self-start w-full text-right">بطاقة الهوية الرقمية</p>
            <StudentCardPanel
              studentName={profile.full_name}
              grade={profile.grade}
              studentClass={profile.class_name}
              admissionNumber={profile.admission_number}
              photoUrl={(profile as { photo_url?: string | null }).photo_url ?? user?.avatar_url}
              studentId={profile.id}
              qrToken={(profile as { qr_token?: string | null }).qr_token}
            />
          </Panel>
          <Link
            to={`/card/${profile.id}`}
            className="glass-card glass-card-hover p-4 flex items-center justify-between gap-3 group"
          >
            <div className="space-y-0.5 text-right">
              <h3 className="text-white font-bold text-xs flex items-center gap-1.5 justify-end">
                عرض كامل للبطاقة
                <QrCode className="w-3.5 h-3.5 text-gold-400" />
              </h3>
              <p className="text-white/40 text-[10px]">مشاركة الرابط مع المعلمين</p>
            </div>
            <QrCode className="w-5 h-5 text-white/30 group-hover:text-gold-400 transition-colors" />
          </Link>
        </motion.div>
        </FeatureGate>
      </div>

      <FeatureGate featureId="widget:student:exam_prep_link">
      <motion.div variants={itemVariants}>
        <Link
          to="/student/exams"
          className="block glass-card glass-card-hover p-5 border-purple-500/20 bg-gradient-to-l from-purple-900/30 to-navy-900/40 group"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-purple-400" />
                الاختبارات الأكاديمية
              </h3>
              <p className="text-white/40 text-xs mt-1">اختبارات صفك حسب المادة — ابدأ الاختبار النشط من هنا</p>
            </div>
            <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center text-purple-400 group-hover:bg-purple-500/20 transition-all">
              <ClipboardList className="w-6 h-6" />
            </div>
          </div>
        </Link>
      </motion.div>
      </FeatureGate>

      <motion.div variants={itemVariants}>
        <Link
          to="/student/academic"
          className="block glass-card glass-card-hover p-5 border-gold-500/20 bg-gradient-to-l from-gold-900/20 to-navy-900/40 group"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-gold-400" />
                واجباتي وخطتي الأسبوعية
              </h3>
              <p className="text-white/40 text-xs mt-1">واجب اليوم وخطة فصلك فقط</p>
            </div>
            <div className="w-12 h-12 bg-gold-500/10 rounded-xl flex items-center justify-center text-gold-400 group-hover:bg-gold-500/20 transition-all">
              <BookOpen className="w-6 h-6" />
            </div>
          </div>
        </Link>
      </motion.div>

      <FeatureGate featureId="widget:student:class_challenge">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeeklyClassChallenge />
        <FeatureGate featureId="widget:student:class_average">
          <ClassAverageComparison studentScore={totalPoints} classAverage={metrics.classAverage} />
        </FeatureGate>
      </div>
      </FeatureGate>

      <FeatureGate featureId="widget:student:class_rank">
      <ClassRankSection
        rank={metrics.classRank}
        top3={metrics.top3Classmates}
        currentStudentId={profile.id}
        grade={profile.grade}
        className={profile.class_name}
      />
      </FeatureGate>

      <FeatureGate featureId="widget:student:peer_encouragement">
      <PeerEncouragementPanel
        studentId={profile.id}
        grade={profile.grade}
        className={profile.class_name}
      />
      </FeatureGate>

      <FeatureGate featureId="widget:student:streak">
      <StreakWidget studentId={profile.id} />
      </FeatureGate>

      <FeatureGate featureId="widget:student:seasonal_badges">
      <SeasonalAchievementsPanel studentId={profile.id} />
      </FeatureGate>

      <FeatureGate featureId="widget:student:cert_wallet">
      <CertificateWallet
        studentId={profile.id}
        studentName={profile.full_name}
        grade={profile.grade}
        className={profile.class_name}
      />
      </FeatureGate>

      <LevelCertificateModal
        studentId={profile.id}
        studentName={profile.full_name}
        grade={profile.grade}
        className={profile.class_name}
        totalPoints={totalPoints}
        levelName={level.name}
      />

      <FeatureGate featureId="widget:student:rewards_link">
      <motion.div variants={itemVariants}>
        <Link
          to="/student/rewards"
          className="block glass-card glass-card-hover p-4 border-purple-500/20 bg-gradient-to-l from-purple-900/20 to-transparent group"
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-white font-bold text-sm flex items-center gap-2">
                <Gift className="w-4 h-4 text-purple-400" />
                متجر المكافآت
              </h3>
              <p className="text-white/40 text-[10px] mt-0.5">استبدل نقاطك بمكافآت — G4</p>
            </div>
            <Gift className="w-5 h-5 text-white/30 group-hover:text-purple-400 transition-colors" />
          </div>
        </Link>
      </motion.div>
      </FeatureGate>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="p-6 flex flex-col justify-between gap-4">
          <div>
            <span className="text-white/40 text-xs">إجمالي النقاط</span>
            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-4xl font-black text-gold-400 font-mono tabular-nums">{totalPoints}</h2>
              <span className="text-white/40 text-xs">نقطة</span>
            </div>
            <div className="mt-3 flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="text-white/50">المستوى:</span>
              <span className={clsx('px-2.5 py-0.5 rounded-full border text-[10px] font-bold', level.badgeBg)}>
                {level.name}
              </span>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-white/50">
              <span>تقدمك للمستوى التالي</span>
              <span>{level.nextMin ? `${totalPoints} / ${level.nextMin} ن` : 'الحد الأقصى'}</span>
            </div>
            <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                className={clsx('h-full rounded-full', level.progressBg)}
              />
            </div>
            {level.nextMin && (
              <p className="text-[10px] text-white/30 text-left">يتبقى {pointsToNext} نقطة للمستوى التالي</p>
            )}
          </div>
        </Panel>

        <Panel className="lg:col-span-2 p-6 space-y-3">
          <SectionTitle icon={TrendingUp} className="mb-0">
            خارطة مستويات التميز و{PLATFORM_NAME_SHORT}
          </SectionTitle>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {LEVELS.map((lvl) => {
              const isCurrent = level.name === lvl.name;
              return (
                <motion.div
                  key={lvl.name}
                  whileHover={{ scale: isCurrent ? 1 : 1.03 }}
                  className={clsx(
                    'p-3 rounded-xl border text-center transition-all duration-200',
                    isCurrent
                      ? 'bg-gold-500/10 border-gold-400 text-gold-400 shadow-glow'
                      : 'bg-white/3 border-white/5 text-white/40 hover:border-white/10'
                  )}
                >
                  <p className="text-xs font-bold">{lvl.name}</p>
                  <p className="text-[10px] mt-1 font-mono">{lvl.min}+ نقطة</p>
                </motion.div>
              );
            })}
          </div>
        </Panel>
      </div>

      <FeatureGate featureId="widget:student:weekly_goal">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <WeeklyGoalWidget breakdown={categoryPoints} studentId={profile.id} />
        <FeatureGate featureId="widget:student:weak_axis">
          <WeakAxisTip breakdown={breakdown} />
        </FeatureGate>
      </div>
      </FeatureGate>

      <FeatureGate featureId="widget:student:learning_path">
      <motion.div variants={itemVariants}>
        <PersonalLearningPath studentId={profile.id} breakdown={breakdown} />
      </motion.div>
      </FeatureGate>

      <FeatureGate featureId="widget:student:score_explanation">
      <ScoreExplanationSection />
      </FeatureGate>

      <FeatureGate featureId="widget:student:achievements">
      <motion.div variants={itemVariants}>
        <Panel className="p-6">
          <AchievementBadges achievements={achievements} />
        </Panel>
      </motion.div>
      </FeatureGate>

      <FeatureGate featureId="widget:student:suggestions">
      <motion.div variants={itemVariants}>
        <ActivitySuggestionsPanel />
      </motion.div>
      </FeatureGate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <FeatureGate featureId="widget:student:upcoming_exams">
          <UpcomingExamsWidget grade={profile.grade} studentId={profile.id} />
        </FeatureGate>
        <FeatureGate featureId="widget:student:activity_timeline">
          <ActivityTimeline studentId={profile.id} />
        </FeatureGate>
      </div>

      <FeatureGate featureId="widget:student:points_breakdown">
      <div className="space-y-3">
        <SectionTitle>تفاصيل الرصيد حسب محاور التميز</SectionTitle>
        <motion.div variants={containerVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'النشاط', value: categoryPoints.activity, color: 'text-blue-400' },
            { label: 'السلوك', value: categoryPoints.behavior, color: 'text-emerald-400' },
            { label: 'الإنجاز', value: categoryPoints.achievement, color: 'text-purple-400' },
            { label: 'المبادرة', value: categoryPoints.initiative, color: 'text-amber-400' },
            { label: 'الحضور', value: categoryPoints.attendance, color: 'text-cyan-400', note: 'نقاط الحضور المعتمدة' },
          ].map((cat) => (
            <motion.div
              key={cat.label}
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="glass-card glass-card-hover p-4"
            >
              <p className="text-white/40 text-[10px]">{cat.label}</p>
              <p className={clsx('text-lg font-bold font-mono mt-1 tabular-nums', cat.color)}>{cat.value} ن</p>
              {cat.note && <span className="text-[9px] text-white/20 block mt-1">{cat.note}</span>}
            </motion.div>
          ))}
        </motion.div>
      </div>
      </FeatureGate>

      <FeatureGate featureId="widget:student:points_ledger">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2 p-6 flex flex-col">
          <SectionTitle className="border-b border-white/5 pb-3 mb-4">سجل عمليات رصد التميز</SectionTitle>
          <div className="space-y-3 overflow-y-auto max-h-[280px] pr-1">
            {points.length === 0 ? (
              <div className="p-8 text-center text-white/30 text-xs">لا توجد عمليات رصد مسجلة لك حالياً</div>
            ) : (
              points.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="p-3 bg-white/3 border border-white/5 rounded-xl flex items-center justify-between gap-3 text-xs hover:bg-white/5 transition-colors"
                >
                  <div>
                    <p className="text-white font-bold">{p.activities?.name ?? 'رصد مباشر'}</p>
                    <p className="text-[10px] text-white/40 mt-1">
                      بواسطة: {p.granted_by_user?.full_name ?? 'المعلم'} • {new Date(p.created_at).toLocaleDateString('ar-EG')}
                    </p>
                    {p.note && <p className="text-[10px] text-gold-400/80 bg-white/5 px-2 py-0.5 rounded mt-1 italic">{p.note}</p>}
                  </div>
                  <div className="text-left shrink-0">
                    <p className="font-bold text-sm text-gold-400 tabular-nums">{p.points > 0 ? `+${p.points}` : p.points} ن</p>
                    <span className={clsx('text-[8px] px-1 py-px rounded border mt-1 inline-block',
                      p.status === 'approved' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                      p.status === 'rejected' ? 'bg-red-500/10 border-red-500/20 text-red-400' :
                      'bg-amber-500/10 border-amber-500/20 text-amber-400'
                    )}>
                      {getPointsStatusLabel(p.status)}
                    </span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </Panel>

        <Panel className="p-6 space-y-4">
          <SectionTitle icon={HelpCircle} className="border-b border-white/5 pb-3 mb-0">
            كيف تزيد نقاطك؟
          </SectionTitle>
          <div className="space-y-3 text-xs">
            {[
              { n: '١', text: <><strong>المشاركة النشطة:</strong> تفاعل بجميع الأنشطة المدرسية والرياضية والثقافية داخل المدرسة.</> },
              { n: '٢', text: <><strong>إبراز البطاقة:</strong> قدم بطاقة رمز الاستجابة QR للمعلم ليرصد لك النقاط فوراً.</> },
              { n: '٣', text: <><strong>مراجعة المشرف:</strong> تأكد من اعتماد المشرف للعمليات لتدخل بنصاب رصيدك الفعلي.</> },
            ].map((item, i) => (
              <motion.div
                key={item.n}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 + i * 0.1 }}
                className="flex gap-3"
              >
                <span className="w-5 h-5 rounded-full bg-gold-400 text-navy-950 font-bold flex items-center justify-center shrink-0 text-[10px]">
                  {item.n}
                </span>
                <p className="text-white/60 leading-relaxed">{item.text}</p>
              </motion.div>
            ))}
          </div>
        </Panel>
      </div>
      </FeatureGate>
    </motion.div>
  );
}
