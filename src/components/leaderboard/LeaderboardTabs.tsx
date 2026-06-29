import clsx from 'clsx';
import { Users, School } from 'lucide-react';
import type { LeaderboardTab } from './types';

type TabDef = { id: LeaderboardTab; label: string; icon: typeof Users };

const TABS: TabDef[] = [
  { id: 'students', label: 'الطلاب', icon: Users },
  { id: 'classes', label: 'الفصول', icon: School },
];

export function LeaderboardTabs({
  active,
  onChange,
  large,
}: {
  active: LeaderboardTab;
  onChange: (tab: LeaderboardTab) => void;
  large?: boolean;
}) {
  return (
    <div className={clsx('flex gap-1 rounded-xl border border-white/10 bg-navy-900/40 p-1 backdrop-blur-sm', large && 'p-1.5')}>
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={clsx(
            'flex items-center gap-2 rounded-lg font-semibold transition-all',
            large ? 'px-6 py-3 text-sm' : 'px-4 py-2 text-xs',
            active === id
              ? 'bg-gold-400/15 text-gold-300 border border-gold-400/20 shadow-sm'
              : 'text-white/45 hover:text-white/80 border border-transparent'
          )}
        >
          <Icon className={large ? 'w-5 h-5' : 'w-4 h-4'} />
          {label}
        </button>
      ))}
    </div>
  );
}
