import clsx from 'clsx';
import { Star } from 'lucide-react';

type Props = {
  value: number;
  onChange: (stars: number) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
};

export function StarScoreInput({ value, onChange, disabled, size = 'md' }: Props) {
  const icon = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
  return (
    <div className="flex items-center gap-0.5" dir="ltr">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={disabled}
          onClick={() => onChange(n)}
          className={clsx(
            'p-0.5 rounded transition-colors',
            disabled ? 'cursor-not-allowed opacity-50' : 'hover:scale-110',
          )}
          aria-label={`${n} نجوم`}
        >
          <Star
            className={clsx(icon, n <= value ? 'fill-gold-400 text-gold-400' : 'text-white/25')}
            strokeWidth={1.5}
          />
        </button>
      ))}
    </div>
  );
}
