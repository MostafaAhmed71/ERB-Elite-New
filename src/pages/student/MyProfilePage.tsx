import { useQuery } from '@tanstack/react-query';
import { User, Award, CalendarCheck, ClipboardList, TrendingUp, Calendar, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { ATTENDANCE_LABELS, ATTENDANCE_COLORS } from '../../types';
import { getPointsStatusLabel } from '../../lib/pointsStatusLabels';
import clsx from 'clsx';
import { motion } from 'framer-motion';
import { BarsLoader } from '../../components/ui/BarsLoader';

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 20 } },
};

export function MyProfilePage() {
  const { user } = useAuthStore();

  // 1. Fetch Student Profile
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

  // 2. Fetch Points Ledger History
  const { data: points = [], isLoading: pointsLoading } = useQuery({
    queryKey: ['student', 'points', profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      const { data, error } = await supabase
        .from('points_ledger')
        .select(`
          *,
          activities (
            name,
            category
          ),
          granted_by_user:users!points_ledger_granted_by_fkey (
            full_name
          )
        `)
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  // 3. Fetch Attendance History
  const { data: attendance = [], isLoading: attendanceLoading } = useQuery({
    queryKey: ['student', 'attendance', profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      const { data, error } = await supabase
        .from('attendance')
        .select('*')
        .eq('student_id', profile.id)
        .order('date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  // 4. Fetch Exam Results
  const { data: examResults = [], isLoading: examsLoading } = useQuery({
    queryKey: ['student', 'exams', profile?.id],
    queryFn: async () => {
      if (!profile) return [];
      const { data, error } = await supabase
        .from('exam_results')
        .select(`
          *,
          exams (
            title
          )
        `)
        .eq('student_id', profile.id)
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile,
  });

  const totalPoints = points
    .filter(p => p.status === 'approved')
    .reduce((sum, item) => sum + item.points, 0);

  const pendingPoints = points
    .filter(p => p.status === 'pending')
    .reduce((sum, item) => sum + item.points, 0);

  const attendanceSummary = {
    present: attendance.filter(a => a.status === 'present').length,
    absent: attendance.filter(a => a.status === 'absent').length,
    late: attendance.filter(a => a.status === 'late').length,
  };

  const isLoading = profileLoading || pointsLoading || attendanceLoading || examsLoading;

  if (isLoading) {
    return <BarsLoader label="جاري تحميل ملفك..." fullScreen />;
  }

  if (!profile) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center text-center p-6 bg-navy-900/50 border border-white/5 rounded-2xl" dir="rtl">
        <AlertCircle className="w-12 h-12 text-gold-400 mb-3" />
        <h2 className="text-white font-bold text-lg">لم يتم العثور على ملف تعريف الطالب</h2>
        <p className="text-white/40 text-sm mt-1">يرجى مراجعة إدارة المدرسة لربط بريدك بملفك الأكاديمي.</p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
      dir="rtl"
    >
      {/* Student Profile Header */}
      <motion.div
        variants={itemVariants}
        className="bg-gradient-to-l from-navy-800/50 to-transparent border border-white/5 rounded-2xl p-6 relative overflow-hidden"
      >
        <div className="flex flex-col sm:flex-row items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold-400 to-gold-600 flex items-center justify-center text-navy-950 text-4xl font-bold shadow-xl shadow-gold-500/20">
            {profile.full_name.charAt(0)}
          </div>
          <div className="text-center sm:text-right">
            <h1 className="text-2xl font-bold text-white">{profile.full_name}</h1>
            <p className="text-gold-400 text-sm mt-1 font-medium">{profile.grade} — {profile.class_name}</p>
            <p className="text-white/40 text-xs mt-1 font-mono">الرقم الأكاديمي: {profile.admission_number}</p>
            {profile.link_code && (
              <p className="text-emerald-300/90 text-sm mt-2 font-mono tracking-widest" dir="ltr">
                كود ولي الأمر: {profile.link_code}
              </p>
            )}
          </div>
        </div>
      </motion.div>

      {/* KPI Stats Grid */}
      <motion.div
        variants={containerVariants}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        {/* Approved Points */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4, scale: 1.02 }}
          className="bg-navy-900/50 border border-white/5 rounded-2xl p-5 relative overflow-hidden backdrop-blur"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/50 text-xs mb-1">النقاط المعتمدة</p>
              <h2 className="text-3xl font-bold text-gold-400">{totalPoints} ن</h2>
              {pendingPoints > 0 && (
                <p className="text-xs text-white/40 mt-1">({pendingPoints} ن قيد الانتظار)</p>
              )}
            </div>
            <div className="w-10 h-10 rounded-xl bg-gold-500/10 border border-gold-500/20 flex items-center justify-center text-gold-400">
              <Award className="w-5 h-5" />
            </div>
          </div>
        </motion.div>

        {/* Attendance Percentage */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4, scale: 1.02 }}
          className="bg-navy-900/50 border border-white/5 rounded-2xl p-5 relative overflow-hidden backdrop-blur"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/50 text-xs mb-1">نسبة الحضور</p>
              <h2 className="text-3xl font-bold text-emerald-400">
                {attendance.length > 0
                  ? `${Math.round(((attendanceSummary.present + attendanceSummary.late * 0.7) / attendance.length) * 100)}%`
                  : '—'}
              </h2>
              <p className="text-xs text-white/40 mt-1">حاضر: {attendanceSummary.present} | متأخر: {attendanceSummary.late} | غائب: {attendanceSummary.absent}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <CalendarCheck className="w-5 h-5" />
            </div>
          </div>
        </motion.div>

        {/* Exams Completed */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -4, scale: 1.02 }}
          className="bg-navy-900/50 border border-white/5 rounded-2xl p-5 relative overflow-hidden backdrop-blur"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-white/50 text-xs mb-1">الاختبارات المكتملة</p>
              <h2 className="text-3xl font-bold text-purple-400">{examResults.length} اختبار</h2>
              <p className="text-xs text-white/40 mt-1">معدل الدرجات: {
                examResults.length > 0
                  ? `${(examResults.reduce((acc, curr) => acc + (curr.score / curr.max_score), 0) / examResults.length * 100).toFixed(0)}%`
                  : '—'
              }</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <ClipboardList className="w-5 h-5" />
            </div>
          </div>
        </motion.div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Points Ledger Card */}
        <motion.div
          variants={itemVariants}
          className="bg-navy-900/50 border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col"
        >
          <h3 className="text-white font-semibold text-base mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
            <Award className="w-4 h-4 text-gold-400" /> سجل نقاط التميز
          </h3>
          <motion.div
            variants={containerVariants}
            className="flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-1"
          >
            {points.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-white/20 text-sm">لم تحصل على أي نقاط بعد</div>
            ) : (
              points.map((p) => (
                <motion.div
                  key={p.id}
                  variants={itemVariants}
                  whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                  className="p-3 bg-white/3 border border-white/5 rounded-xl flex items-center justify-between gap-3 text-sm transition-colors"
                >
                  <div className="space-y-1">
                    <p className="text-white font-medium">{p.activities?.name ?? 'نشاط عام'}</p>
                    <p className="text-xs text-white/40">بواسطة: {p.granted_by_user?.full_name ?? 'معلم'} • {new Date(p.created_at).toLocaleDateString('ar-EG')}</p>
                    {p.note && <p className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded italic">{p.note}</p>}
                  </div>
                  <div className="text-left shrink-0">
                    <span className={clsx('text-base font-bold', p.status === 'approved' ? 'text-gold-400' : 'text-white/30')}>
                      {p.points > 0 ? `+${p.points}` : p.points} ن
                    </span>
                    <p className={clsx('text-[10px] mt-1 px-1.5 py-0.5 rounded border inline-block',
                      p.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                      p.status === 'rejected' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                      'bg-white/5 text-white/40 border-white/10'
                    )}>
                      {getPointsStatusLabel(p.status)}
                    </p>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        </motion.div>

        {/* Exams / Results Card */}
        <motion.div
          variants={itemVariants}
          className="bg-navy-900/50 border border-white/5 rounded-2xl p-6 shadow-xl flex flex-col"
        >
          <h3 className="text-white font-semibold text-base mb-4 flex items-center gap-2 border-b border-white/5 pb-3">
            <ClipboardList className="w-4 h-4 text-purple-400" /> نتائج الاختبارات الأكاديمية
          </h3>
          <motion.div
            variants={containerVariants}
            className="flex-1 overflow-y-auto max-h-[350px] space-y-3 pr-1"
          >
            {examResults.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-white/20 text-sm">لا توجد نتائج اختبارات مسجلة بعد</div>
            ) : (
              examResults.map((res) => {
                const percent = Math.round((res.score / res.max_score) * 100);
                return (
                  <motion.div
                    key={res.id}
                    variants={itemVariants}
                    whileHover={{ scale: 1.01, backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                    className="p-3 bg-white/3 border border-white/5 rounded-xl space-y-2 text-sm transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-white font-medium">{res.exams?.title ?? 'اختبار'}</p>
                      <span className="text-xs text-white/40">{new Date(res.submitted_at).toLocaleDateString('ar-EG')}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-white/50">الدرجة: <strong className="text-white">{res.score}</strong> من {res.max_score}</span>
                      <span className={clsx('font-bold', percent >= 90 ? 'text-emerald-400' : percent >= 75 ? 'text-blue-400' : percent >= 50 ? 'text-yellow-400' : 'text-red-400')}>{percent}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percent}%` }}
                        transition={{ duration: 0.8, ease: 'easeOut' }}
                        className={clsx('h-full', percent >= 90 ? 'bg-emerald-400' : percent >= 75 ? 'bg-blue-400' : percent >= 50 ? 'bg-yellow-400' : 'bg-red-400')}
                      />
                    </div>
                  </motion.div>
                );
              })
            )}
          </motion.div>
        </motion.div>
      </div>
    </motion.div>
  );
}
