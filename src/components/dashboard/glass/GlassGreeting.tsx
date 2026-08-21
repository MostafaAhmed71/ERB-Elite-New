import { CalendarDays } from 'lucide-react';

type GlassGreetingProps = {
  firstName: string;
  subtitle: string;
  badge?: string;
};

function dayGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'صباح الخير';
  if (h < 17) return 'مساء الخير';
  return 'مساء النور';
}

function todayRangeLabel(): string {
  try {
    return new Intl.DateTimeFormat('ar-SA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    }).format(new Date());
  } catch {
    return new Date().toLocaleDateString('ar');
  }
}

export function GlassGreeting({ firstName, subtitle, badge }: GlassGreetingProps) {
  const name = firstName.trim() || 'أهلاً';
  return (
    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
      <div className="min-w-0">
        {badge && (
          <span className="glass-pill mb-2 !text-[#f0b429] !bg-[rgba(230,170,50,0.12)] !border-[rgba(230,170,50,0.28)]">
            {badge}
          </span>
        )}
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight font-cairo">
          {dayGreeting()}، {name}
        </h1>
        <p className="mt-1.5 text-sm text-[#A3AED0] leading-relaxed max-w-2xl font-cairo">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2 flex-wrap shrink-0">
        <span className="glass-pill">
          <CalendarDays className="w-3.5 h-3.5 text-[#f0b429]" />
          {todayRangeLabel()}
        </span>
        <span className="glass-pill">
          <span className="w-2 h-2 rounded-full bg-[#01B574] animate-pulse" />
          متصل
        </span>
      </div>
    </div>
  );
}
