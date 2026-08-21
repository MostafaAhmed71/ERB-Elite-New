import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { CompetitionScoreboard } from '../../components/competition';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { useCompLeaderboard } from '../../hooks/competition/useCompLeaderboard';
import { PLATFORM_NAME } from '../../lib/branding';

function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="text-left">
      <p className="text-white/70 text-sm lg:text-base font-mono tabular-nums">
        {now.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Riyadh' })}
      </p>
      <p className="text-white/35 text-[10px] lg:text-xs">
        {now.toLocaleDateString('ar-SA', {
          weekday: 'long',
          month: 'short',
          day: 'numeric',
          timeZone: 'Asia/Riyadh',
        })}
      </p>
    </div>
  );
}

export function CompLeaderboardPage() {
  const { rows, loading, error } = useCompLeaderboard();

  if (loading && rows.length === 0) {
    return (
      <div className="min-h-dvh bg-[#0D1B2A] flex items-center justify-center" dir="rtl">
        <TapHandLoader label="جاري تحميل ترتيب المسابقة..." fullScreen />
      </div>
    );
  }

  return (
    <div className="h-dvh flex flex-col bg-[#0D1B2A] text-white overflow-hidden" dir="rtl">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(244,196,48,0.12),transparent_50%)]" />

      <header className="relative z-10 shrink-0 flex items-center justify-between gap-4 px-5 lg:px-10 py-3 lg:py-4 border-b border-white/10 bg-[#0D1B2A]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-gold-400/15 border border-gold-400/30 flex items-center justify-center">
            <Trophy className="w-5 h-5 lg:w-6 lg:h-6 text-gold-400" />
          </div>
          <div>
            <h1 className="text-base lg:text-xl font-black">{PLATFORM_NAME}</h1>
            <p className="text-white/45 text-xs lg:text-sm">ترتيب المسابقة الفصلية اليومية</p>
          </div>
        </div>
        <LiveClock />
      </header>

      <main className="relative z-10 flex-1 overflow-y-auto px-4 lg:px-10 py-6">
        {error && <p className="text-center text-amber-300 mb-4 text-sm">{error}</p>}
        <CompetitionScoreboard rows={rows} />
        <p className="text-center text-white/30 text-xs mt-8">
          نقاط المسابقة منفصلة عن أولمبياد النخبة · تحديث لحظي
        </p>
      </main>
    </div>
  );
}
