import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ShieldAlert,
  CheckCircle,
  Award,
  LogIn,
  User,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';
import { getLevelInfo } from '../../lib/calculations';
import { TapHandLoader } from '../ui/TapHandLoader';
import { Button } from '../ui/Button';
import { showSuccess, showError } from '../../lib/toast';
import { parsePointsGrantError } from '../../lib/teacherScope';
import { logAction, parseRoleFromMetadata } from '../../lib/auth';
import { AXES_KEYS } from '../../lib/pointsReference';
import { ensureManualTeacherActivity, buildManualActivityNote } from '../../lib/pointsEvidence';
import type { DbActivity } from '../../types';
import clsx from 'clsx';
import { PLATFORM_NAME, PLATFORM_NAME_SHORT } from '../../lib/branding';
import { getStudentQRUrl } from '../../lib/qr';
import { ACADEMIC_LEVEL_LABELS } from '../../lib/academic/constants';

type LedgerRow = {
  id: string;
  points: number;
  note: string | null;
  created_at: string;
  activity_name: string;
  category: string;
};

type PublicCard = {
  id: string;
  full_name: string;
  grade: string;
  class_name: string;
  admission_number: string;
  photo_url: string | null;
  user_id: string | null;
  qr_token: string | null;
  score: number;
  axes: Record<string, number>;
  ledger: LedgerRow[];
};

const AXIS_ORDER = ['activity', 'behavior', 'achievement', 'initiative', 'attendance'] as const;

const CATEGORY_COLORS: Record<string, string> = {
  activity: 'text-blue-300',
  behavior: 'text-emerald-300',
  achievement: 'text-purple-300',
  initiative: 'text-amber-300',
  attendance: 'text-cyan-300',
};

export function StudentCardPage() {
  const { studentId, qrToken } = useParams<{ studentId?: string; qrToken?: string }>();
  const { user, role, session, initialized } = useAuthStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (session && !user) {
      void useAuthStore.getState().refreshUser();
    }
  }, [session, user]);

  const [activitySource, setActivitySource] = useState<'catalog' | 'manual'>('catalog');
  const [manualActivityName, setManualActivityName] = useState('');
  const [selectedActivity, setSelectedActivity] = useState('');
  const [customPoints, setCustomPoints] = useState<number | ''>('');
  const [note, setNote] = useState('');

  // نستخدم المستخدم الحالي أو بيانات الجلسة كاحتياط في حال لم يُجلب البروفايل بعد
  const authUser =
    user ??
    (session?.user
      ? {
          id: session.user.id,
          full_name:
            (session.user.user_metadata?.full_name as string) ||
            session.user.email ||
            'المستخدم',
          role: role ?? parseRoleFromMetadata(session.user.user_metadata?.role) ?? 'teacher',
        }
      : null);

  const effectiveRole =
    user?.role ?? role ?? parseRoleFromMetadata(session?.user?.user_metadata?.role);

  const canGrant =
    !!authUser &&
    ['teacher', 'admin', 'activity_leader', 'principal', 'deputy'].includes(
      effectiveRole ?? '',
    );
  const canDirectApprove =
    ['admin', 'activity_leader', 'principal', 'deputy'].includes(effectiveRole ?? '');

  const {
    data: student,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['public', 'student', 'card', studentId, qrToken],
    queryFn: async (): Promise<(PublicCard & { level: ReturnType<typeof getLevelInfo> }) | null> => {
      const { data, error: rpcErr } = await supabase.rpc('get_public_student_card', {
        p_student_id: studentId ?? null,
        p_qr_token: qrToken ?? null,
      });

      if (rpcErr) throw rpcErr;
      if (!data) return null;

      const card = data as PublicCard;
      const score = Number(card.score) || 0;
      return {
        ...card,
        score,
        axes: (card.axes && typeof card.axes === 'object' ? card.axes : {}) as Record<string, number>,
        ledger: Array.isArray(card.ledger) ? card.ledger : [],
        level: getLevelInfo(score),
      };
    },
    enabled: !!(studentId || qrToken),
  });

  const { data: activities = [] } = useQuery({
    queryKey: ['activities', 'active', 'card-grant'],
    queryFn: async () => {
      const { data, error: aErr } = await supabase
        .from('activities')
        .select('*')
        .eq('is_active', true)
        .order('name');
      if (aErr) throw aErr;
      return (data as DbActivity[]).filter(
        (a) => a.id !== 'e1111111-1111-4111-8111-111111111101',
      );
    },
    enabled: canGrant,
  });

  const selectedActivityData = activities.find((a) => a.id === selectedActivity);
  const isManual = activitySource === 'manual';
  const pointsToApply = isManual
    ? (customPoints !== '' ? Number(customPoints) : 0)
    : (customPoints !== '' ? Number(customPoints) : (selectedActivityData?.default_points ?? 0));

  const grantMutation = useMutation({
    mutationFn: async () => {
      if (!authUser || !student) throw new Error('غير مصرح');
      if (pointsToApply <= 0) throw new Error('النقاط يجب أن تكون أكبر من صفر');

      let activityId = selectedActivity;
      let ledgerNote = note.trim() || null;

      if (isManual) {
        const name = manualActivityName.trim();
        if (!name) throw new Error('أدخل اسم النشاط أو الإنجاز اليدوي');
        if (customPoints === '' || Number(customPoints) <= 0) {
          throw new Error('حدد عدد النقاط للنشاط اليدوي');
        }
        activityId = await ensureManualTeacherActivity();
        ledgerNote = buildManualActivityNote(name, note);
      } else {
        if (!activityId) throw new Error('اختر نشاطاً');
      }

      const now = new Date().toISOString();
      const row = {
        student_id: student.id,
        granted_by: authUser.id,
        activity_id: activityId,
        points: pointsToApply,
        note: ledgerNote,
        source: 'qr' as const,
        status: (canDirectApprove ? 'approved' : 'pending') as 'approved' | 'pending',
        approved_by: canDirectApprove ? authUser.id : null,
        approved_at: canDirectApprove ? now : null,
        first_approved_by: canDirectApprove ? authUser.id : null,
        first_approved_at: canDirectApprove ? now : null,
        rejection_reason: null,
        academic_year: new Date().getFullYear().toString(),
      };

      const { error: insertErr } = await supabase.from('points_ledger').insert([row]);
      if (insertErr) throw new Error(parsePointsGrantError(insertErr.message));

      await logAction('POINTS_GRANTED', 'points_ledger', undefined, {
        students: 1,
        activity: activityId,
        points: pointsToApply,
        source: 'qr_card',
        manual: isManual,
      });
    },
    onSuccess: () => {
      showSuccess(
        canDirectApprove
          ? `تم منح ${pointsToApply} نقطة بنجاح`
          : `تم إرسال طلب منح ${pointsToApply} نقطة — بانتظار الاعتماد`,
      );
      setNote('');
      setCustomPoints('');
      setManualActivityName('');
      queryClient.invalidateQueries({ queryKey: ['public', 'student', 'card', studentId, qrToken] });
      queryClient.invalidateQueries({ queryKey: ['teacher', 'budget'] });
    },
    onError: (e: Error) => showError(e),
  });

  const axisRows = useMemo(() => {
    if (!student) return [];
    return AXIS_ORDER.map((key) => ({
      key,
      label: AXES_KEYS[key] ?? key,
      value: Number(student.axes?.[key] ?? 0),
    })).filter((r) => r.value > 0 || ['activity', 'behavior', 'achievement', 'initiative'].includes(r.key));
  }, [student]);

  if (isLoading || !initialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950 text-white" dir="rtl">
        <TapHandLoader label="جاري تحميل بطاقة الطالب..." fullScreen />
      </div>
    );
  }

  if (error || !student) {
    const detail =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error && 'message' in error
          ? String((error as { message: string }).message)
          : null;
    const needsMigration =
      !!detail &&
      (detail.includes('get_public_student_card') ||
        detail.includes('schema cache') ||
        detail.includes('Could not find the function'));

    return (
      <div className="min-h-screen flex items-center justify-center bg-navy-950 text-white p-6" dir="rtl">
        <div className="bg-navy-900 border border-red-500/20 max-w-sm w-full p-6 rounded-2xl text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-lg font-bold">فشل تحميل بطاقة الطالب</h2>
          <p className="text-white/40 text-xs leading-relaxed">
            {needsMigration
              ? 'يلزم تطبيق SQL بطاقة الطالب من Supabase (fix-public-student-card.sql).'
              : 'تأكد من صحة الرابط أو رمز الاستجابة QR الممسوح.'}
          </p>
        </div>
      </div>
    );
  }

  const scorePercent = student.level.nextMin
    ? Math.round(
        ((student.score - student.level.min) / (student.level.nextMin - student.level.min)) * 100,
      )
    : 100;

  const cardUrl = getStudentQRUrl(student.id, student.qr_token);
  const qrCodeApi = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(cardUrl)}`;
  const grantDeepLink = `/points/grant?studentId=${encodeURIComponent(student.id)}`;

  const ledgerBlock = (
    <div className="bg-navy-900 border border-white/5 rounded-3xl p-5 space-y-3">
      <h3 className="text-sm font-bold text-white flex items-center gap-2">
        <Award className="w-4 h-4 text-gold-400" />
        سجل الطالب
        <span className="text-white/35 text-xs font-normal">({student.ledger.length})</span>
      </h3>
      {student.ledger.length === 0 ? (
        <p className="text-white/35 text-xs text-center py-4">لا توجد نقاط معتمدة بعد</p>
      ) : (
        <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
          {student.ledger.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="text-white text-xs font-medium truncate">{row.activity_name}</p>
                <p className="text-white/35 text-[10px] mt-0.5">
                  {new Date(row.created_at).toLocaleDateString('ar-SA', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                  {row.note ? ` • ${row.note}` : ''}
                </p>
              </div>
              <span
                className={clsx(
                  'font-mono text-sm font-bold shrink-0',
                  row.points >= 0 ? 'text-emerald-400' : 'text-red-400',
                )}
              >
                {row.points > 0 ? `+${row.points}` : row.points}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  const grantBlock = (
    <div className="bg-navy-900 border border-gold-500/20 rounded-3xl p-5 space-y-4">
      <div>
        <h3 className="text-sm font-bold text-gold-300 flex items-center gap-2">
          <Award className="w-4 h-4" />
          منح نقاط للطالب
        </h3>
        <p className="text-white/40 text-[11px] mt-1">
          {effectiveRole === 'principal'
            ? 'كمدير المدرسة — تُعتمد النقاط فوراً'
            : effectiveRole === 'deputy'
            ? (() => {
                const lvl = user?.staff_education_level;
                const lvlLabel = lvl ? ` (${ACADEMIC_LEVEL_LABELS[lvl as keyof typeof ACADEMIC_LEVEL_LABELS] ?? lvl})` : '';
                return `كوكيل المدرسة${lvlLabel} — تُعتمد النقاط فوراً لطلاب مرحلتك`;
              })()
            : canDirectApprove
            ? 'كرائد نشاط / إدارة — تُعتمد النقاط فوراً'
            : 'كمعلم — يُرسل الطلب للاعتماد'}
        </p>
      </div>

      {/* التبديل بين أنشطة الكتالوج والنشاط اليدوي */}
      <div className="grid grid-cols-2 gap-1.5 p-1 bg-white/[0.04] border border-white/10 rounded-2xl">
        <button
          type="button"
          onClick={() => setActivitySource('catalog')}
          className={clsx(
            'py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5',
            activitySource === 'catalog'
              ? 'bg-gold-500/20 text-gold-300 border border-gold-500/30 shadow-sm'
              : 'text-white/60 hover:text-white/90',
          )}
        >
          <Award className="w-3.5 h-3.5" />
          <span>من الأنشطة</span>
        </button>
        <button
          type="button"
          onClick={() => setActivitySource('manual')}
          className={clsx(
            'py-2 px-3 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5',
            activitySource === 'manual'
              ? 'bg-gold-500/20 text-gold-300 border border-gold-500/30 shadow-sm'
              : 'text-white/60 hover:text-white/90',
          )}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>نشاط يدوي مخصص</span>
        </button>
      </div>

      {activitySource === 'catalog' ? (
        <>
          <div className="space-y-1.5">
            <label className="text-white/55 text-xs">النشاط المسجل</label>
            <select
              value={selectedActivity}
              onChange={(e) => setSelectedActivity(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm appearance-none focus:border-gold-500/50 focus:outline-none"
            >
              <option value="" className="bg-navy-900">
                اختر نشاطاً...
              </option>
              {activities.map((a) => (
                <option key={a.id} value={a.id} className="bg-navy-900">
                  {a.name} ({a.default_points} نقطة)
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-white/55 text-xs">
              النقاط {selectedActivityData && <span className="text-white/35">(الافتراضي: {selectedActivityData.default_points})</span>}
            </label>
            <input
              type="number"
              min={1}
              value={customPoints}
              onChange={(e) =>
                setCustomPoints(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder={
                selectedActivityData ? String(selectedActivityData.default_points) : '0'
              }
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-gold-500/50 focus:outline-none font-mono"
            />
          </div>
        </>
      ) : (
        <>
          <div className="space-y-1.5">
            <label className="text-white/70 text-xs font-medium">
              اسم النشاط أو الإنجاز اليدوي <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={manualActivityName}
              onChange={(e) => setManualActivityName(e.target.value)}
              placeholder="مثال: تميز في الإذاعة، مساعدة زميل، مبادرة صفية..."
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-gold-500/50 focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-white/70 text-xs font-medium">
              عدد النقاط <span className="text-red-400">*</span>
            </label>
            <input
              type="number"
              min={1}
              value={customPoints}
              onChange={(e) =>
                setCustomPoints(e.target.value === '' ? '' : Number(e.target.value))
              }
              placeholder="مثال: 10"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-gold-500/50 focus:outline-none font-mono"
            />
          </div>
        </>
      )}

      <div className="space-y-1.5">
        <label className="text-white/55 text-xs">ملاحظة أو سبب المنح (اختياري)</label>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="تفاصيل إضافية عن المنح..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-white text-sm focus:border-gold-500/50 focus:outline-none"
        />
      </div>

      <Button
        className="w-full"
        size="lg"
        loading={grantMutation.isPending}
        disabled={
          isManual
            ? (!manualActivityName.trim() || pointsToApply <= 0)
            : (!selectedActivity || pointsToApply <= 0)
        }
        onClick={() => grantMutation.mutate()}
      >
        منح {pointsToApply > 0 ? `${pointsToApply} نقطة` : 'النقاط'}
      </Button>

      <Link
        to={grantDeepLink}
        className="block text-center text-xs text-gold-400/80 hover:text-gold-300"
      >
        فتح صفحة المنح الكاملة ←
      </Link>
    </div>
  );

  // معلم / رائد: سجل + منح فقط (بدون بطاقة QR)
  if (canGrant) {
    return (
      <div className="min-h-screen bg-navy-950 text-white p-4 font-cairo pb-10" dir="rtl">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="bg-navy-900 border border-white/5 rounded-3xl p-5 space-y-4">
            <div className="flex items-start gap-3">
              {student.photo_url ? (
                <img
                  src={student.photo_url}
                  alt=""
                  className="w-12 h-12 rounded-xl object-cover border border-white/10 shrink-0"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-gold-500/15 border border-gold-500/20 flex items-center justify-center shrink-0">
                  <User className="w-6 h-6 text-gold-400" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-white/40 text-[10px] mb-0.5">سجل الطالب</p>
                <h2 className="text-white font-bold text-base leading-tight truncate">
                  {student.full_name}
                </h2>
                <p className="text-white/45 text-xs mt-1">
                  {student.grade} • {student.class_name} • {student.admission_number}
                </p>
              </div>
              <div className="text-left shrink-0">
                <p className="text-gold-400 font-black font-mono text-xl leading-none">
                  {student.score}
                </p>
                <p className="text-white/35 text-[10px] mt-0.5">نقطة</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {axisRows.map((row) => (
                <div
                  key={row.key}
                  className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
                >
                  <p className="text-white/40 text-[10px]">{row.label}</p>
                  <p className={clsx('text-sm font-bold font-mono mt-0.5', CATEGORY_COLORS[row.key])}>
                    {row.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {ledgerBlock}
          {grantBlock}
        </div>
      </div>
    );
  }

  // زائر / طالب / ولي: البطاقة العامة + السجل
  return (
    <div className="min-h-screen bg-navy-950 text-white p-4 font-cairo pb-10" dir="rtl">
      <div className="max-w-lg mx-auto space-y-4">
        <div className="bg-navy-900 border border-white/5 rounded-3xl p-5 shadow-2xl space-y-5 overflow-hidden">
          <div className="flex justify-between items-start gap-3 border-b border-white/5 pb-4">
            <div className="flex items-start gap-3 min-w-0">
              {student.photo_url ? (
                <img
                  src={student.photo_url}
                  alt=""
                  className="w-14 h-14 rounded-2xl object-cover border border-white/10 shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-gold-500/15 border border-gold-500/20 flex items-center justify-center shrink-0">
                  <User className="w-7 h-7 text-gold-400" />
                </div>
              )}
              <div className="min-w-0">
                <h2 className="text-white font-black text-lg leading-tight truncate">
                  {student.full_name}
                </h2>
                <p className="text-white/45 text-xs mt-1">
                  {student.grade} • {student.class_name}
                </p>
                <p className="text-white/25 text-[10px] font-mono mt-0.5">
                  الرقم: {student.admission_number}
                </p>
              </div>
            </div>
            <span className="text-[10px] px-2.5 py-1 rounded-full border border-gold-500/20 bg-gold-500/5 text-gold-400 font-bold shrink-0">
              {PLATFORM_NAME_SHORT}
            </span>
          </div>

          <div className="flex justify-between items-center gap-4">
            <div className="space-y-3 flex-1">
              <div>
                <span className="text-white/40 text-[10px]">إجمالي نقاط التميز</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <h3 className="text-3xl font-black text-gold-400 font-mono">{student.score}</h3>
                  <span className="text-white/40 text-xs">نقطة</span>
                </div>
              </div>
              <div>
                <span className="text-white/40 text-[10px]">المستوى</span>
                <p className={clsx('text-xs font-bold mt-0.5', student.level.color)}>
                  {student.level.name}
                </p>
              </div>
            </div>
            <div className="w-24 h-24 bg-white p-1.5 rounded-2xl shrink-0 shadow-lg shadow-black/30">
              <img src={qrCodeApi} alt="QR" className="w-full h-full object-contain" />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-[10px] text-white/50">
              <span>تقدم المستوى</span>
              <span>
                {student.level.nextMin
                  ? `${student.score} / ${student.level.nextMin} ن`
                  : 'الحد الأقصى'}
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
              <div
                className={clsx('h-full transition-all duration-300', student.level.progressBg)}
                style={{ width: `${Math.min(100, Math.max(0, scorePercent))}%` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {axisRows.map((row) => (
              <div
                key={row.key}
                className="rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2"
              >
                <p className="text-white/40 text-[10px]">{row.label}</p>
                <p className={clsx('text-sm font-bold font-mono mt-0.5', CATEGORY_COLORS[row.key])}>
                  {row.value}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center text-[9px] border-t border-white/5 pt-3 text-white/20 flex items-center justify-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            بطاقة معتمدة في {PLATFORM_NAME}
          </div>
        </div>

        {ledgerBlock}

        <div className="bg-navy-900 border border-white/10 rounded-3xl p-5 text-center space-y-3">
          <p className="text-white/55 text-xs leading-relaxed">
            لمنح نقاط لهذا الطالب سجّل دخولك (كمعلم، رائد نشاط، وكيل أو مدير) للمتابعة.
          </p>
          <Link
            to={`/login/staff?redirect=${encodeURIComponent(
              window.location.pathname + window.location.search,
            )}`}
          >
            <Button variant="secondary" size="md" icon={<LogIn className="w-4 h-4" />}>
              تسجيل الدخول للمنح
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
