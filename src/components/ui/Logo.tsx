import clsx from 'clsx';
import { PLATFORM_ICON, PLATFORM_NAME_SHORT, PLATFORM_YEAR } from '../../lib/branding';

const ICON_SIZES = { sm: 36, md: 40, lg: 64 } as const;

type LogoSize = keyof typeof ICON_SIZES;

interface LogoIconProps {
  size?: LogoSize;
  className?: string;
}

/** شعار المنصة */
export function LogoIcon({ size = 'md', className }: LogoIconProps) {
  const px = ICON_SIZES[size];
  return (
    <img
      src={PLATFORM_ICON}
      alt=""
      width={px}
      height={px}
      className={clsx('rounded-xl object-cover shrink-0', className)}
      aria-hidden
    />
  );
}

interface LogoProps {
  size?: LogoSize;
  showText?: boolean;
  className?: string;
  textClassName?: string;
}

export function Logo({ size = 'md', showText = false, className, textClassName }: LogoProps) {
  return (
    <div className={clsx('flex items-center gap-3 min-w-0', className)}>
      <LogoIcon
        size={size}
        className={clsx(
          size === 'lg' ? 'shadow-lg shadow-gold-500/25' : 'shadow-lg shadow-gold-500/20',
        )}
      />
      {showText && (
        <div className={clsx('leading-tight min-w-0', textClassName)}>
          <span className="text-white font-bold text-sm block truncate">{PLATFORM_NAME_SHORT}</span>
          <span className="text-gold-400 font-bold text-xs block">{PLATFORM_YEAR}</span>
        </div>
      )}
    </div>
  );
}
