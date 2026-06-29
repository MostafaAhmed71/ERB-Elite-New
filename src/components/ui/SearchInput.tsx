import { Search } from 'lucide-react';
import clsx from 'clsx';

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function SearchInput({
  value,
  onChange,
  placeholder = 'بحث...',
  className,
  disabled,
}: SearchInputProps) {
  return (
    <div className={clsx('relative flex-1 min-w-48', className)}>
      <Search className="absolute top-1/2 -translate-y-1/2 right-3 w-4 h-4 text-white/30 pointer-events-none" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full bg-navy-900/50 border border-white/10 rounded-xl px-4 pr-10 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/40 text-sm transition-colors"
      />
    </div>
  );
}

type SelectFilterProps = {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  className?: string;
};

export function SelectFilter({
  value,
  onChange,
  options,
  placeholder = 'الكل',
  className,
}: SelectFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={clsx(
        'bg-navy-900/50 border border-white/10 rounded-xl px-3 py-2.5 text-white',
        'focus:outline-none focus:border-gold-400/50 text-sm appearance-none min-w-[140px]',
        className
      )}
    >
      <option value="" className="bg-navy-950">{placeholder}</option>
      {options.map((opt) => (
        <option key={opt.value} value={opt.value} className="bg-navy-950">
          {opt.label}
        </option>
      ))}
    </select>
  );
}
