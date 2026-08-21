import { useState, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Star } from 'lucide-react';

export type PodiumSlot = {
  id: string;
  title: string;
  subtitle?: string;
  points: number;
  photoUrl?: string | null;
  initial?: string;
  /** لفّ الأفاتار (مثلاً لجعل الضغط يفتح رفع صورة) */
  wrapAvatar?: (avatar: ReactNode) => ReactNode;
};

const RANK_THEME = {
  1: {
    ring: 'ring-gold-400 shadow-[0_0_28px_rgba(191,160,84,0.55)]',
    score: 'text-gold-300',
    cylTop: 'from-gold-300 via-gold-400 to-amber-600',
    cylBody: 'from-gold-400 via-amber-500 to-amber-800',
    cylGlow: 'shadow-[0_0_40px_rgba(191,160,84,0.35)]',
    medal: 'from-gold-300 to-amber-600 border-gold-200/50 text-navy-950',
    height: 'h-[7.5rem] sm:h-[9rem]',
    avatar: 'w-[4.25rem] h-[4.25rem] sm:w-[5rem] sm:h-[5rem] text-2xl',
  },
  2: {
    ring: 'ring-amber-600/80 shadow-[0_0_20px_rgba(180,83,9,0.4)]',
    score: 'text-amber-400',
    cylTop: 'from-amber-500 via-amber-700 to-amber-900',
    cylBody: 'from-amber-600 via-amber-800 to-[#3b1d0a]',
    cylGlow: 'shadow-[0_0_24px_rgba(180,83,9,0.25)]',
    medal: 'from-amber-500 to-amber-800 border-amber-300/40 text-white',
    height: 'h-[5.5rem] sm:h-[6.5rem]',
    avatar: 'w-14 h-14 sm:w-16 sm:h-16 text-xl',
  },
  3: {
    ring: 'ring-slate-300/70 shadow-[0_0_20px_rgba(203,213,225,0.35)]',
    score: 'text-slate-200',
    cylTop: 'from-slate-200 via-slate-400 to-slate-600',
    cylBody: 'from-slate-400 via-slate-600 to-slate-800',
    cylGlow: 'shadow-[0_0_24px_rgba(148,163,184,0.25)]',
    medal: 'from-slate-200 to-slate-500 border-white/40 text-navy-950',
    height: 'h-[4.5rem] sm:h-[5.5rem]',
    avatar: 'w-14 h-14 sm:w-16 sm:h-16 text-xl',
  },
} as const;

function Stars({ accent }: { accent: string }) {
  return (
    <div className="flex items-center justify-center gap-0.5 mb-1">
      {[0, 1, 2].map((i) => (
        <Star
          key={i}
          className={clsx(
            'fill-current',
            i === 1 ? 'w-3.5 h-3.5' : 'w-2.5 h-2.5 opacity-70',
            accent,
          )}
        />
      ))}
    </div>
  );
}

function PodiumAvatarInner({
  photoUrl,
  title,
  initial,
  themeClass,
  ringClass,
}: {
  photoUrl?: string | null;
  title: string;
  initial?: string;
  themeClass: string;
  ringClass: string;
}) {
  const [broken, setBroken] = useState(false);
  const showPhoto = !!photoUrl && !broken;
  return (
    <div
      className={clsx(
        'rounded-full ring-2 overflow-hidden bg-gradient-to-br from-[#1B3B86] to-indigo-800 border border-white/15 flex items-center justify-center font-black text-white',
        themeClass,
        ringClass,
      )}
    >
      {showPhoto ? (
        <img
          src={photoUrl!}
          alt={title}
          className="w-full h-full object-cover"
          onError={() => setBroken(true)}
        />
      ) : (
        initial ?? title.charAt(0)
      )}
    </div>
  );
}

function PodiumColumn({
  slot,
  rank,
  delay,
}: {
  slot: PodiumSlot | undefined;
  rank: 1 | 2 | 3;
  delay: number;
}) {
  const theme = RANK_THEME[rank];
  if (!slot) {
    return <div className="flex-1 max-w-[9.5rem]" />;
  }

  const avatar = (
    <PodiumAvatarInner
      photoUrl={slot.photoUrl}
      title={slot.title}
      initial={slot.initial}
      themeClass={theme.avatar}
      ringClass={theme.ring}
    />
  );

  return (
    <motion.div
      layout
      key={slot.id}
      initial={{ opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: 'spring', stiffness: 260, damping: 22 }}
      className={clsx(
        'flex flex-col items-center flex-1 max-w-[9.5rem]',
        rank === 1 && 'z-[1] -mt-2 sm:-mt-4',
      )}
    >
      <Stars accent={rank === 1 ? 'text-gold-400' : rank === 2 ? 'text-amber-500' : 'text-slate-300'} />

      <div className="mb-2">{slot.wrapAvatar ? slot.wrapAvatar(avatar) : avatar}</div>

      <p className="text-white font-bold text-xs sm:text-sm text-center truncate w-full px-0.5 leading-tight">
        {slot.title}
      </p>
      {slot.subtitle && (
        <p className="text-white/35 text-[10px] truncate w-full text-center mt-0.5">{slot.subtitle}</p>
      )}
      <p className={clsx('font-black tabular-nums text-sm sm:text-base mt-1 mb-2', theme.score)}>
        {slot.points.toLocaleString('ar-SA')}
        <span className="text-[10px] font-semibold text-white/35 mr-1">نقطة</span>
      </p>

      <div className={clsx('relative w-[88%] flex flex-col items-center', theme.height)}>
        <div
          className={clsx(
            'absolute -top-2 left-1/2 -translate-x-1/2 w-[102%] h-4 rounded-[100%] bg-gradient-to-b border border-white/20',
            theme.cylTop,
          )}
        />
        <div
          className={clsx(
            'relative w-full h-full rounded-b-[1.25rem] bg-gradient-to-b border border-white/10 overflow-hidden',
            theme.cylBody,
            theme.cylGlow,
          )}
        >
          <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-white/25 to-transparent pointer-events-none" />
          <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-white/15 to-transparent pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className={clsx(
                'w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-gradient-to-br border-2 flex items-center justify-center font-black text-xl sm:text-2xl shadow-lg',
                theme.medal,
              )}
            >
              {rank}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export function GamingPodium({
  first,
  second,
  third,
}: {
  first?: PodiumSlot;
  second?: PodiumSlot;
  third?: PodiumSlot;
}) {
  if (!first && !second && !third) return null;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#0b1224]/80 backdrop-blur-md px-3 pt-5 pb-4 sm:px-5 sm:pt-6 sm:pb-5">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(191,160,84,0.14),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_20%_80%,rgba(59,130,246,0.08),transparent_40%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_80%_70%,rgba(168,85,247,0.06),transparent_40%)]" />

      <div className="relative flex items-end justify-center gap-1 sm:gap-4 min-h-[15rem] sm:min-h-[17rem]">
        <PodiumColumn slot={second} rank={2} delay={0.05} />
        <PodiumColumn slot={first} rank={1} delay={0} />
        <PodiumColumn slot={third} rank={3} delay={0.1} />
      </div>

      <div className="relative mt-4 text-center space-y-1 px-2">
        <p className="text-gold-400/90 font-black text-[11px] sm:text-xs tracking-wide">
          اصعد لوحة المتصدرين واحصد التميز
        </p>
        <p className="text-white/35 text-[10px] sm:text-[11px] leading-relaxed max-w-md mx-auto">
          كل نقطة معتمدة تقرّبك من القمة — التنافس مستمر طوال العام
        </p>
      </div>
    </div>
  );
}
