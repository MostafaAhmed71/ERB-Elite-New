import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Clock } from 'lucide-react';
import {
  CompetitionOptions,
  CompetitionScoreboard,
  CompetitionTimer,
} from '../../components/competition';
import { Button } from '../../components/ui/Button';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { useCompLeaderboard } from '../../hooks/competition/useCompLeaderboard';
import { useCompSettings } from '../../hooks/competition/useCompSettings';
import { useQuestion } from '../../hooks/competition/useQuestion';
import { useTimer } from '../../hooks/competition/useTimer';
import { showError, showSuccess } from '../../lib/toast';
import { bustCompetitionCaches } from '../../lib/competition/bustCompCache';
import {
  formatCountdown,
  formatStartTime,
  getAnswerWindow,
  getClassAnswer,
  getCompClassBySlug,
  getQuestionStartAt,
  getRiyadhDateString,
  getScheduleStatus,
  submitCompAnswer,
  type CompClass,
} from '../../lib/competition';

function isDemoMode() {
  return new URLSearchParams(window.location.search).get('demo') === '1';
}

/** إبلاغ تطبيق Android بموعد الفتح التلقائي */
function syncAndroidAlarm(hour: number, minute: number) {
  try {
    const bridge = (window as unknown as {
      EliteCompetition?: { scheduleAlarm: (h: number, m: number) => void };
    }).EliteCompetition;
    bridge?.scheduleAlarm(hour, minute);
  } catch {
    /* ليس داخل APK */
  }
}

export function ClassScreenPage() {
  const { slug = '' } = useParams();
  const [klass, setKlass] = useState<CompClass | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const [showBoard, setShowBoard] = useState(false);

  const { data: settings, settingsReady } = useCompSettings();
  const todayStr = getRiyadhDateString();
  const { question, loading: qLoading } = useQuestion({ dateStr: todayStr, pollMs: 5_000 });
  const { rows, loading: lbLoading } = useCompLeaderboard();

  const dateStr = question?.scheduled_date ?? todayStr;
  const startLabel = formatStartTime(settings);
  const { start, end } = getAnswerWindow(dateStr, settings);
  const now = new Date(nowTick);
  const status = isDemoMode() ? 'open' : getScheduleStatus(now, dateStr, settings);
  const windowOpen = status === 'open';
  const waitMs = Math.max(0, start.getTime() - nowTick);

  useEffect(() => {
    void (async () => {
      const reloaded = await bustCompetitionCaches();
      if (reloaded) window.location.reload();
    })();
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const c = await getCompClassBySlug(slug);
        if (!cancelled) {
          if (!c) setLoadError('الفصل غير موجود');
          else setKlass(c);
        }
      } catch (e) {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'خطأ');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!settingsReady || !settings) return;
    syncAndroidAlarm(settings.start_hour, settings.start_minute);
    (window as unknown as { __compAlarm?: { hour: number; minute: number } }).__compAlarm = {
      hour: settings.start_hour,
      minute: settings.start_minute,
    };
  }, [settingsReady, settings]);

  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 250);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (!question || !klass) return;
    let cancelled = false;
    (async () => {
      try {
        const ans = await getClassAnswer(question.id, klass.id);
        if (!cancelled && ans) {
          setSelected(ans.selected_answer);
          setSubmitted(true);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [question, klass]);

  // في الوضع التجريبي نثبت نهاية ثابتة عند أول دخول
  const [demoDeadline] = useState(() =>
    isDemoMode() ? Date.now() + 300_000 : null,
  );

  const endsAt = isDemoMode() ? demoDeadline : windowOpen ? end.getTime() : null;

  const { remainingMs: timerMs, done: timerDone } = useTimer({
    endsAt,
    running: windowOpen && endsAt != null && !showBoard,
  });

  useEffect(() => {
    if (windowOpen && timerDone && !isDemoMode()) setShowBoard(true);
  }, [windowOpen, timerDone]);

  useEffect(() => {
    if (status === 'after' && !isDemoMode()) setShowBoard(true);
  }, [status]);

  const { done: lbDone } = useTimer({
    durationMs: (settings.leaderboard_seconds ?? 30) * 1000,
    running: showBoard && status !== 'before',
  });

  async function confirmAnswer() {
    if (selected == null || !question || !klass || submitted) return;
    setSubmitting(true);
    try {
      await submitCompAnswer({
        questionId: question.id,
        classId: klass.id,
        selectedAnswer: selected,
        correctAnswer: question.correct_answer,
      });
      setSubmitted(true);
      showSuccess('تم تسجيل إجابة الفصل');
    } catch (e) {
      showError(e instanceof Error ? e : new Error('فشل إرسال الإجابة'));
    } finally {
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <div className="theme-force-dark h-dvh bg-[#0D1B2A] text-red-300 flex items-center justify-center" dir="rtl">
        {loadError}
      </div>
    );
  }

  if (!klass || qLoading || !settingsReady) {
    return (
      <div className="theme-force-dark h-dvh bg-[#0D1B2A] flex items-center justify-center overflow-hidden" dir="rtl">
        <TapHandLoader label="جاري مزامنة وقت العرض..." fullScreen />
      </div>
    );
  }

  const startAt = getQuestionStartAt(dateStr, settings);
  const canAnswer = windowOpen && Boolean(question) && !submitted && !showBoard && !timerDone;
  const showQuestion = windowOpen && Boolean(question) && !showBoard;
  const showIdleAfter = !isDemoMode() && status === 'after' && !showBoard;

  return (
    <div className="theme-force-dark h-dvh w-screen overflow-hidden bg-[#0D1B2A] text-white relative" dir="rtl">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(244,196,48,0.15),transparent_50%)]" />

      <header className="relative z-10 flex items-center justify-between px-6 py-4">
        <div>
          <p className="text-gold-300/80 text-sm font-bold">المسابقة الفصلية</p>
          <h1 className="text-2xl md:text-3xl font-black">{klass.name}</h1>
        </div>
        <p className="text-white/40 text-sm tabular-nums hidden md:block">
          يبدأ{' '}
          {startAt.toLocaleTimeString('ar-SA', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Asia/Riyadh',
          })}
        </p>
      </header>

      <main className="relative z-10 h-[calc(100%-5rem)] flex flex-col items-center justify-center px-4 md:px-16 pb-8 overflow-y-auto">
        {status === 'before' && !isDemoMode() && (
          <div className="text-center space-y-4">
            <p className="text-white/50 text-xl">لم يحن موعد السؤال بعد</p>
            <p className="text-6xl md:text-8xl font-black text-gold-300 tabular-nums">
              {formatCountdown(waitMs)}
            </p>
            <p className="text-white/35 text-sm">
              يظهر السؤال الساعة <span className="text-gold-300 font-bold">{startLabel}</span>
              {' · '} لمدة {settings.answer_session_seconds} ثانية
            </p>
            {!question && (
              <p className="text-amber-300/80 text-sm">لا يوجد سؤال مجدول لتاريخ اليوم</p>
            )}
          </div>
        )}

        {showIdleAfter && (
          <div className="text-center space-y-3">
            <p className="text-3xl font-black text-white/80">انتهت نافذة سؤال اليوم</p>
            <p className="text-white/40 text-sm">
              كان الموعد {startLabel} · لمدة {settings.answer_session_seconds} ثانية
            </p>
          </div>
        )}

        {showQuestion && (
          <div className="w-full max-w-2xl space-y-5">
            <div className="text-center space-y-2">
              <p className="text-gold-300/70 text-sm font-bold">{question!.subject}</p>
              <p className="text-2xl md:text-4xl font-black leading-relaxed">
                {question!.question_text}
              </p>
            </div>

            <div className="flex justify-center items-center gap-2">
              <Clock className="w-5 h-5 text-gold-300" />
              <CompetitionTimer remainingMs={timerMs} size="lg" />
            </div>

            {submitted ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold py-4">
                <CheckCircle2 className="w-6 h-6" />
                تم تسجيل إجابة فصلكم
              </div>
            ) : (
              <>
                <CompetitionOptions
                  options={question!.options}
                  selected={selected}
                  disabled={submitting}
                  onSelect={(i) => {
                    if (!canAnswer) return;
                    setSelected(i);
                  }}
                />
                <Button
                  type="button"
                  size="lg"
                  className="w-full min-h-14 text-lg touch-manipulation"
                  disabled={selected == null || !canAnswer || submitting}
                  loading={submitting}
                  onClick={() => void confirmAnswer()}
                >
                  تأكيد الإجابة
                </Button>
                <p className="text-center text-white/35 text-xs">اضغط اختياراً ثم «تأكيد الإجابة»</p>
              </>
            )}
          </div>
        )}

        {windowOpen && !question && (
          <p className="text-white/50 text-2xl">لا يوجد سؤال مجدول لليوم</p>
        )}

        {showBoard && (
          <div className="w-full max-w-3xl space-y-6">
            <h2 className="text-center text-3xl md:text-4xl font-black text-gold-300">
              الترتيب الحالي
            </h2>
            {lbLoading ? (
              <TapHandLoader label="تحديث الترتيب..." />
            ) : (
              <CompetitionScoreboard rows={rows} highlightSlug={slug} />
            )}
            {lbDone && (
              <p className="text-center text-white/40 text-sm">انتهت جولة اليوم</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
