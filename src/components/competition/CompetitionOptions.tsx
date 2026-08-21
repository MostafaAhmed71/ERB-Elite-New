import clsx from 'clsx';

const LABELS = ['أ', 'ب', 'ج', 'د'];

type Props = {
  options: string[];
  selected: number | null;
  disabled?: boolean;
  onSelect: (index: number) => void;
  className?: string;
};

export function CompetitionOptions({ options, selected, disabled, onSelect, className }: Props) {
  return (
    <div className={clsx('grid gap-3 w-full', className)} dir="rtl">
      {options.map((opt, i) => {
        const isSelected = selected === i;
        return (
          <button
            key={i}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(i)}
            className={clsx(
              'flex items-center gap-3 text-right rounded-2xl border px-4 py-4 transition-all min-h-14',
              'touch-manipulation select-none active:scale-[0.98]',
              'disabled:opacity-60 disabled:cursor-not-allowed',
              isSelected
                ? 'bg-gold-400/25 border-gold-400 text-white ring-2 ring-gold-400/40'
                : 'bg-white/5 border-white/15 text-white hover:bg-white/10 hover:border-white/30',
            )}
          >
            <span
              className={clsx(
                'w-10 h-10 rounded-xl flex items-center justify-center font-black shrink-0',
                isSelected ? 'bg-gold-400 text-navy-950' : 'bg-white/10 text-gold-300',
              )}
            >
              {LABELS[i] ?? i + 1}
            </span>
            <span className="text-base md:text-lg font-bold leading-snug flex-1">{opt}</span>
          </button>
        );
      })}
    </div>
  );
}
