import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { CompetitionOptions } from '../../components/competition';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { Button } from '../../components/ui/Button';
import { useCompSettings } from '../../hooks/competition/useCompSettings';
import { useQuestion } from '../../hooks/competition/useQuestion';
import { useTimer } from '../../hooks/competition/useTimer';
import { bustCompetitionCaches } from '../../lib/competition/bustCompCache';
import {
  formatCountdown,
  formatStartTime,
  getAnswerWindow,
  getClassAnswer,
  getCompClassBySlug,
  getRiyadhDateString,
  getScheduleStatus,
  submitCompAnswer,
  type CompAnswer,
  type CompClass,
} from '../../lib/competition';

export function AnswerScreenPage() {
  const { slug = '' } = useParams();
  const [klass, setKlass] = useState<CompClass | null>(null);
  const [classLoading, setClassLoading] = useState(true);
  const [classError, setClassError] = useState<string | null>(null);
  const { data: settings, settingsReady } = useCompSettings();
  const todayStr = getRiyadhDateString();
  const { question, loading: qLoading, error: qError } = useQuestion({
    dateStr: todayStr,
    pollMs: 5_000,
  });

  const [selected, setSelected] = useState<number | null>(null);
  const [existing, setExisting] = useState<CompAnswer | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());

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
        setClassLoading(true);
        const c = await getCompClassBySlug(slug);
        if (!cancelled) {
          if (!c) setClassError('الفصل غير موجود');
          else setKlass(c);
        }
      } catch (e) {
        if (!cancelled) setClassError(e instanceof Error ? e.message : 'خطأ في تحميل الفصل');
      } finally {
        if (!cancelled) setClassLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    const t = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!question || !klass) return;
    let cancelled = false;
    (async () => {
      try {
        const ans = await getClassAnswer(question.id, klass.id);
        if (!cancelled && ans) {
          setExisting(ans);
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

  const dateStr = question?.scheduled_date ?? todayStr;
  const startLabel = formatStartTime(settings);
  const now = new Date(nowTick);
  const status = getScheduleStatus(now, dateStr, settings);
  const windowOpen = status === 'open';
  const { start, end } = getAnswerWindow(dateStr, settings);
  const { remainingMs } = useTimer({
    endsAt: windowOpen ? end.getTime() : null,
    running: windowOpen && !submitted,
  });
  const waitMs = Math.max(0, start.getTime() - nowTick);

  async function confirmAnswer() {
    if (selected == null || !question || !klass) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const ans = await submitCompAnswer({
        questionId: question.id,
        classId: klass.id,
        selectedAnswer: selected,
        correctAnswer: question.correct_answer,
      });
      setExisting(ans);
      setSubmitted(true);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'فشل إرسال الإجابة');
    } finally {
      setSubmitting(false);
    }
  }

  if (classLoading || qLoading || !settingsReady) {
    return (
      <div className="min-h-dvh bg-[#0D1B2A] flex items-center justify-center" dir="rtl">
        <TapHandLoader label="جاري التحميل..." fullScreen />
      </div>
    );
  }

  if (classError || !klass) {
    return (
      <div className="min-h-dvh bg-[#0D1B2A] text-white flex items-center justify-center p-6" dir="rtl">
        <p className="text-lg text-red-300">{classError ?? 'فصل غير معروف'}</p>
      </div>
    );
  }

  const locked = submitted || Boolean(existing) || !windowOpen;

  return (
    <div className="min-h-dvh bg-[#0D1B2A] text-white overflow-x-hidden" dir="rtl">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(244,196,48,0.12),transparent_55%)]" />

      <header className="relative z-10 px-4 pt-safe py-4 border-b border-white/10">
        <p className="text-gold-300 text-sm font-bold">ممثل الفصل</p>
        <h1 className="text-2xl font-black">{klass.name}</h1>
      </header>

      <main className="relative z-10 max-w-lg mx-auto px-4 py-6 space-y-6">
        {qError && (
          <div className="flex items-center gap-2 text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 text-sm">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {qError}
          </div>
        )}

        {!question && (
          <p className="text-center text-white/50 py-16 text-lg">لا يوجد سؤال مجدول لليوم</p>
        )}

        {question && status === 'before' && (
          <div className="text-center space-y-4 py-10">
            <p className="text-white/50">لم يحن موعد السؤال بعد</p>
            <p className="text-5xl font-black text-gold-300 tabular-nums">{formatCountdown(waitMs)}</p>
            <p className="text-white/40 text-sm">يظهر السؤال الساعة {startLabel}</p>
          </div>
        )}

        {question && status === 'after' && (
          <div className="rounded-xl bg-red-500/15 border border-red-400/30 text-red-200 text-center py-6 font-bold">
            انتهى وقت الإجابة
          </div>
        )}

        {question && windowOpen && (
          <>
            <div className="rounded-2xl bg-white/5 border border-white/10 p-5 space-y-2">
              <p className="text-xs text-white/45">{question.subject}</p>
              <p className="text-xl md:text-2xl font-black leading-relaxed">{question.question_text}</p>
            </div>

            {!submitted && (
              <div className="flex items-center justify-center gap-2 text-gold-300">
                <Clock className="w-5 h-5" />
                <span className="font-black tabular-nums text-2xl">
                  {Math.ceil(remainingMs / 1000)}ث
                </span>
              </div>
            )}

            <CompetitionOptions
              options={question.options}
              selected={selected}
              disabled={submitting || submitted || Boolean(existing)}
              onSelect={(i) => {
                if (locked || submitting) return;
                setSelected(i);
              }}
            />

            {submitError && (
              <p className="text-red-300 text-sm text-center">{submitError}</p>
            )}

            {submitted || existing ? (
              <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold py-2">
                <CheckCircle2 className="w-6 h-6" />
                تم تسجيل إجابة فصلكم
              </div>
            ) : (
              <Button
                type="button"
                size="lg"
                className="w-full"
                disabled={selected == null || locked || submitting}
                loading={submitting}
                onClick={() => void confirmAnswer()}
              >
                تأكيد الإجابة
              </Button>
            )}
          </>
        )}
      </main>
    </div>
  );
}
