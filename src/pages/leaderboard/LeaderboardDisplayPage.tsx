import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Trophy, X, RefreshCw, Maximize2, Minimize2, Zap } from 'lucide-react';
import { SplitLeaderboardPanel } from '../../components/leaderboard/SplitLeaderboardPanel';
import { useLeaderboardData } from '../../components/leaderboard/useLeaderboardData';
import { PLATFORM_NAME } from '../../lib/branding';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { fetchWeeklyAssemblyData } from '../../lib/weeklyAssemblyReport';
import { averagePerStudent } from '../../lib/classReport';
import clsx from 'clsx';

import type { LeaderboardPeriod } from '../../components/leaderboard/types';

type DisplaySlide = 'leaderboard' | 'challenge';

const SLIDE_INTERVAL_MS = 45_000;

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-left hidden md:block">
      <p className="text-white/70 text-sm font-mono tabular-nums">
        {now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <p className="text-white/35 text-[10px]">
        {now.toLocaleDateString('ar-SA', { weekday: 'long', month: 'short', day: 'numeric' })}
      </p>
    </div>
  );
}

/** G2 — وضع شاشة كبيرة للطابور والمتصدرين */
export function LeaderboardDisplayPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly');
  const { students, classes, isLoading, refetch } = useLeaderboardData('', '', period);
  const isEmpty = students.length === 0 && classes.length === 0;
  const [refreshKey, setRefreshKey] = useState(0);
  const [slide, setSlide] = useState<DisplaySlide>('leaderboard');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const { data: assemblyData } = useQuery({
    queryKey: ['big-screen-assembly'],
    queryFn: fetchWeeklyAssemblyData,
    refetchInterval: 60_000,
  });

  const toggleFullscreen = useCallback(async () => {
    if (!document.fullscreenElement) {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      void refetch();
      setRefreshKey((k) => k + 1);
    }, 60_000);
    return () => clearInterval(timer);
  }, [refetch]);

  useEffect(() => {
    const rotate = setInterval(() => {
      setSlide((s) => (s === 'leaderboard' ? 'challenge' : 'leaderboard'));
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(rotate);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-navy-950 flex items-center justify-center" dir="rtl">
        <TapHandLoader label="جاري تحميل لوحة المتصدرين..." fullScreen />
      </div>
    );
  }

  const challenge = assemblyData?.challenge;
  const winner = challenge?.winner;

  return (
    <div className="h-dvh flex flex-col bg-navy-950 text-white overflow-hidden" dir="rtl">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(191,160,84,0.1),transparent_50%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.08),transparent_45%)]" />

      <header className="relative z-10 shrink-0 flex items-center justify-between gap-4 px-5 lg:px-8 py-4 border-b border-white/10 bg-navy-950/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gold-400/15 border border-gold-400/30 flex items-center justify-center">
            <Trophy className="w-5 h-5 text-gold-400" />
          </div>
          <div>
            <h1 className="text-lg lg:text-xl font-black">{PLATFORM_NAME}</h1>
            <p className="text-white/45 text-xs lg:text-sm">
              وضع الشاشة الكبيرة — G2
              <span className="mx-2 text-white/20">|</span>
              {slide === 'leaderboard' ? 'المتصدرون' : 'تحدي الأسبوع'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <LiveClock />
          {isEmpty && (
            <span className="hidden sm:inline text-xs px-3 py-1 rounded-full bg-white/10 text-white/50 border border-white/15">
              لا توجد بيانات بعد
            </span>
          )}
          <div className="flex gap-1 p-1 rounded-xl bg-white/5 border border-white/10">
            {(['leaderboard', 'challenge'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSlide(s)}
                className={clsx(
                  'px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors',
                  slide === s ? 'bg-gold-400/20 text-gold-300' : 'text-white/40 hover:text-white/70',
                )}
              >
                {s === 'leaderboard' ? 'المتصدرون' : 'التحدي'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
            aria-label="ملء الشاشة"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
          <button
            type="button"
            onClick={() => {
              void refetch();
              setRefreshKey((k) => k + 1);
            }}
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
            aria-label="تحديث"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <Link
            to="/admin/leaderboard"
            className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <main key={`${refreshKey}-${slide}`} className="relative z-10 flex-1 min-h-0 px-4 lg:px-6 py-4 lg:py-5">
        {slide === 'leaderboard' ? (
          <SplitLeaderboardPanel
            students={students}
            classes={classes}
            studentPeriod={period}
            classPeriod={period}
            onStudentPeriodChange={setPeriod}
            onClassPeriodChange={setPeriod}
            className="h-full"
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center gap-8">
            <div className="text-center space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-sm">
                <Zap className="w-4 h-4" />
                تحدي الأسبوع — {challenge?.axisLabel ?? 'المبادرة'}
              </div>
              <p className="text-white/40 text-sm">{challenge?.weekLabel}</p>
            </div>

            {winner ? (
              <div className="text-center space-y-4">
                <p className="text-white/50 text-lg">الفصل الفائز</p>
                <p className="text-5xl lg:text-7xl font-black text-gold-400">{winner.label}</p>
                <p className="text-2xl text-white/60 font-mono">
                  {averagePerStudent(winner, 'initiative')} نقطة مبادرة ⌀
                </p>
              </div>
            ) : (
              <p className="text-white/30 text-xl">لا بيانات كافية هذا الأسبوع</p>
            )}

            {challenge && challenge.rankings.length > 1 && (
              <div className="w-full max-w-2xl grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
                {challenge.rankings.slice(1, 5).map((r) => (
                  <div
                    key={r.label}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center"
                  >
                    <p className="text-gold-400/60 text-xs font-mono">#{r.rank}</p>
                    <p className="text-white font-bold text-sm mt-1 truncate">{r.label}</p>
                    <p className="text-white/40 text-xs mt-0.5">{r.score}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
