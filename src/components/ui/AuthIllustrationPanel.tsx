import clsx from 'clsx';
import { motion } from 'framer-motion';
import type { IllustrationId } from '../../lib/illustrations';
import { HumaaansIllustration } from './HumaaansIllustration';
import { Logo } from './Logo';

type AuthIllustrationPanelProps = {
  illustration: IllustrationId;
  title: string;
  subtitle: string;
  className?: string;
};

export function AuthIllustrationPanel({
  illustration,
  title,
  subtitle,
  className,
}: AuthIllustrationPanelProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -30 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: 'easeOut' }}
      className={clsx(
        'relative flex flex-col justify-between p-10 xl:p-14 overflow-hidden',
        className,
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-navy-900 via-navy-950 to-navy-950" />
      <div className="absolute -top-24 -left-24 w-80 h-80 bg-gold-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-600/8 rounded-full blur-3xl" />
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />

      <div className="relative z-10">
        <Logo size="sm" showText />
      </div>

      <div className="relative z-10 flex-1 flex flex-col items-center justify-center py-8">
        <HumaaansIllustration
          id={illustration}
          animate
          className="w-full max-w-sm h-auto drop-shadow-2xl"
        />
      </div>

      <div className="relative z-10 space-y-2">
        <h2 className="text-2xl xl:text-3xl font-bold text-white leading-snug">{title}</h2>
        <p className="text-white/50 text-sm xl:text-base leading-relaxed max-w-md">{subtitle}</p>
      </div>
    </motion.div>
  );
}
