import { Users } from 'lucide-react';
import type { DbStudent } from '../../types';

type Props = {
  children: DbStudent[];
  selectedChildId: string;
  onChange: (id: string) => void;
};

export function ParentChildSelector({ children, selectedChildId, onChange }: Props) {
  if (children.length <= 1) return null;

  return (
    <div className="glass-card p-4 flex items-center justify-between gap-3 flex-wrap" dir="rtl">
      <span className="text-white text-sm font-medium flex items-center gap-2">
        <Users className="w-4 h-4 text-gold-400" />
        الابن المتابع:
      </span>
      <select
        value={selectedChildId}
        onChange={(e) => onChange(e.target.value)}
        className="bg-navy-950 border border-white/10 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-gold-400/50 text-sm"
      >
        {children.map((c) => (
          <option key={c.id} value={c.id}>
            {c.full_name} ({c.grade})
          </option>
        ))}
      </select>
    </div>
  );
}
