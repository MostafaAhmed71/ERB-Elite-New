import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { SplitLeaderboardPanel } from '../../components/leaderboard/SplitLeaderboardPanel';
import { PLATFORM_NAME } from '../../lib/branding';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { fetchDisplayLeaderboard } from '../../lib/leaderboardDisplay';
import { useQuery } from '@tanstack/react-query';

const REFRESH_MS = 60_000;

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-left">
      <p className="text-white/70 text-sm lg:text-base font-mono tabular-nums">
        {now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })}
      </p>
      <p className="text-white/35 text-[10px] lg:text-xs">
        {now.toLocaleDateString('ar-SA', { weekday: 'long', month: 'short', day: 'numeric' })}
      </p>
    </div>
  );
}

/** شاشة كبيرة — لوحة المتصدرين فقط (بدون قوائم أو تحدي الأسبوع) */
export function LeaderboardBoardPage() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['display-leaderboard'],
    queryFn: fetchDisplayLeaderboard,
    refetchInterval: REFRESH_MS,
  });

  useEffect(() => {
    const timer = setInterval(() => {
      void refetch();
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [refetch]);

  const liveStudents = data?.students ?? [];
  const liveClasses = data?.classes ?? [];
  const students = liveStudents;
  const classes = liveClasses;
  const isEmpty = liveStudents.length === 0 && liveClasses.length === 0;

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-navy-950 flex items-center justify-center" dir="rtl">
        <TapHandLoader label="جاري تحميل لوحة المتصدرين..." fullScreen />
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-navy-950 text-white overflow-hidden" dir="rtl">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(191,160,84,0.1),transparent_50%)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_bottom_left,rgba(59,130,246,0.08),transparent_45%)]" />

      <header className="relative z-10 shrink-0 flex items-center justify-between gap-4 px-5 lg:px-10 py-3 lg:py-4 border-b border-white/10 bg-navy-950/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-gold-400/15 border border-gold-400/30 flex items-center justify-center">
            <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-gold-400" />
          </div>
          <div>
            <h1 className="text-base lg:text-xl font-black">{PLATFORM_NAME}</h1>
            <p className="text-white/45 text-xs lg:text-sm">لوحة المتصدرين</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isEmpty && (
            <span className="text-xs px-3 py-1 rounded-full bg-white/10 text-white/50 border border-white/15">
              لا توجد بيانات بعد
            </span>
          )}
          <LiveClock />
        </div>
      </header>

      <main className="relative z-10 flex-1 min-h-0 px-3 lg:px-6 py-3 lg:py-4">
        <SplitLeaderboardPanel students={students} classes={classes} className="h-full" />
      </main>
    </div>
  );
}
