import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { QrCode, ShieldAlert, CheckCircle, Lock, User, Award, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { getApprovedPointsTotal, getLevelInfo, type PointEntry } from '../../lib/calculations';
import { TapHandLoader } from '../ui/TapHandLoader';
import clsx from 'clsx';
import { PLATFORM_NAME, PLATFORM_NAME_SHORT } from '../../lib/branding';

export function StudentCardPage() {
  const { studentId, qrToken } = useParams<{ studentId?: string; qrToken?: string }>();
  const { user: currentUser, role: currentRole } = useAuthStore();
  const [passcode, setPasscode] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [gateError, setGateError] = useState<string | null>(null);

  // 1. Fetch Student Card Data
  const { data: student, isLoading, error } = useQuery({
    queryKey: ['public', 'student', 'card', studentId, qrToken],
    queryFn: async () => {
      let resolvedId = studentId;
      if (qrToken) {
        const { data: sid, error: rpcErr } = await supabase.rpc('get_student_id_by_qr_token', { p_token: qrToken });
        if (rpcErr || !sid) throw rpcErr ?? new Error('رمز غير صالح');
        resolvedId = sid as string;
      }
      if (!resolvedId) return null;
      const { data: sData, error: sErr } = await supabase
        .from('students')
        .select('*')
        .eq('id', resolvedId)
        .single();
      if (sErr) throw sErr;

      const { data: ledger, error: lErr } = await supabase
        .from('points_ledger')
        .select('points, status, activity_id, activities(category)')
        .eq('student_id', resolvedId)
        .eq('status', 'approved');
      if (lErr) throw lErr;

      const score = getApprovedPointsTotal((ledger || []) as unknown as PointEntry[]);
      const level = getLevelInfo(score);

      return {
        ...sData,
        score,
        level,
      };
    },
    enabled: !!(studentId || qrToken),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950 text-white" dir="rtl">
        <TapHandLoader label="جاري تحميل بطاقة الطالب..." fullScreen />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950 text-white p-6" dir="rtl">
        <div className="bg-navy-900 border border-red-500/20 max-w-sm w-full p-6 rounded-2xl text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold">فشل تحميل بطاقة الطالب</h2>
          <p className="text-white/40 text-xs">تأكد من صحة الرابط أو رمز الاستجابة QR الممسوح.</p>
        </div>
      </div>
    );
  }

  // Determine if user has direct access
  const isOwner = currentUser && student.user_id === currentUser.id;
  const isAdmin = currentRole === 'admin' || currentRole === 'activity_leader';
  const hasDirectAccess = isOwner || isAdmin || unlocked;

  const handleGateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGateError(null);
    // Validate passcode (use student's admission number as validation passcode)
    if (passcode.trim() === student.admission_number) {
      setUnlocked(true);
      toastSuccess();
    } else {
      setGateError('الرقم الأكاديمي المدخل غير صحيح');
    }
  };

  const toastSuccess = () => {
    // Just a placeholder helper since toast isn't imported
  };

  const scorePercent = student.level.nextMin
    ? Math.round(((student.score - student.level.min) / (student.level.nextMin - student.level.min)) * 100)
    : 100;

  const qrCodeApi = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(window.location.href)}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-950 text-white p-4 font-cairo" dir="rtl">
      {!hasDirectAccess ? (
        /* passcode gate screen */
        <div className="bg-navy-900 border border-white/5 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-gold-400/10 rounded-2xl flex items-center justify-center mx-auto text-gold-400">
              <Lock className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold">بوابة التحقق من الهوية</h2>
            <p className="text-white/40 text-xs">تتطلب هذه البطاقة إدخال الرقم الأكاديمي للطالب لعرض الرصيد الكامل.</p>
          </div>

          <div className="p-4 bg-white/3 border border-white/5 rounded-2xl text-center">
            <h3 className="text-white font-bold text-sm">{student.full_name}</h3>
            <p className="text-white/40 text-xs mt-1">{student.grade} • {student.class_name}</p>
          </div>

          <form onSubmit={handleGateSubmit} className="space-y-4">
            {gateError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                {gateError}
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-white/60 text-xs">أدخل الرقم الأكاديمي للطالب</label>
              <input
                type="text"
                required
                value={passcode}
                onChange={e => setPasscode(e.target.value)}
                placeholder="الرقم الأكاديمي (مثال: 1448001)"
                className="w-full bg-navy-950 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-gold-400 text-navy-950 font-bold text-sm hover:shadow-lg hover:shadow-gold-500/20 transition-all"
            >
              عرض رصيد التميز
            </button>
          </form>
        </div>
      ) : (
        /* profile display screen */
        <div className="bg-navy-900 border border-white/5 w-full max-w-sm rounded-3xl p-6 shadow-2xl space-y-6 relative overflow-hidden">
          {/* Card branding header */}
          <div className="flex justify-between items-start border-b border-white/5 pb-4">
            <div>
              <h2 className="text-white font-black text-lg leading-tight">{student.full_name}</h2>
              <p className="text-white/40 text-xs mt-1">{student.grade} • {student.class_name}</p>
              <p className="text-white/20 text-[10px] font-mono mt-0.5">الرقم: {student.admission_number}</p>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full border border-gold-500/20 bg-gold-500/5 text-gold-400 font-bold">
              {PLATFORM_NAME_SHORT}
            </span>
          </div>

          {/* QR and Points section */}
          <div className="flex justify-between items-center gap-4 py-2">
            <div className="space-y-3 flex-1">
              <div>
                <span className="text-white/40 text-[10px]">إجمالي نقاط التميز</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <h3 className="text-3xl font-black text-gold-400 font-mono">{student.score}</h3>
                  <span className="text-white/40 text-xs">نقطة</span>
                </div>
              </div>
              <div>
                <span className="text-white/40 text-[10px]">مستوى التميز الحالي</span>
                <p className={clsx('text-xs font-bold mt-0.5', student.level.color)}>{student.level.name}</p>
              </div>
            </div>
            <div className="w-24 h-24 bg-white p-1.5 rounded-2xl shrink-0 shadow-lg shadow-black/30">
              <img src={qrCodeApi} alt="QR Code" className="w-full h-full object-contain" />
            </div>
          </div>

          {/* Progress to next level */}
          <div className="space-y-1.5 pt-2">
            <div className="flex justify-between text-[10px] text-white/50">
              <span>تقدم مستوى {PLATFORM_NAME_SHORT}</span>
              <span>{student.level.nextMin ? `${student.score} / ${student.level.nextMin} ن` : 'الحد الأقصى'}</span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div className={clsx('h-full transition-all duration-300', student.level.progressBg)} style={{ width: `${scorePercent}%` }} />
            </div>
          </div>

          {/* Card footer verification */}
          <div className="text-center text-[9px] border-t border-white/5 pt-4 text-white/20 flex items-center justify-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            بطاقة ذكية معتمدة ومسجلة في {PLATFORM_NAME}
          </div>
        </div>
      )}
    </div>
  );
}
