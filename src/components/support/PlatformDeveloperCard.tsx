import { useQuery } from '@tanstack/react-query';
import { Code2, MessageCircle, Phone, UserRound } from 'lucide-react';
import {
  DEFAULT_DEVELOPER_PROFILE,
  developerTelLink,
  developerWhatsAppLink,
  fetchPlatformDeveloperProfile,
} from '../../lib/platformDeveloper';
import clsx from 'clsx';

type Props = {
  className?: string;
  compact?: boolean;
  waPrefill?: string;
};

/** بطاقة احترافية لبيانات مطور المنصة */
export function PlatformDeveloperCard({ className, compact, waPrefill }: Props) {
  const { data: profile = DEFAULT_DEVELOPER_PROFILE } = useQuery({
    queryKey: ['platform-developer-profile'],
    queryFn: fetchPlatformDeveloperProfile,
    staleTime: 1000 * 60 * 30,
  });

  if (profile.show_on_platform === false) return null;

  if (compact) {
    return (
      <div
        className={clsx(
          'rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-center',
          className,
        )}
        dir="rtl"
      >
        <p className="text-[10px] text-white/40">{profile.title}</p>
        <p className="text-sm font-semibold text-white mt-0.5">{profile.display_name}</p>
        <a
          href={developerTelLink(profile)}
          className="inline-flex items-center gap-1 mt-1 text-xs text-gold-300 hover:text-gold-200"
          dir="ltr"
        >
          <Phone className="w-3 h-3" />
          {profile.phone}
        </a>
      </div>
    );
  }

  return (
    <div
      className={clsx(
        'relative overflow-hidden rounded-2xl border border-gold-500/25 bg-gradient-to-br from-navy-900 via-[#122548] to-navy-950 p-5',
        className,
      )}
      dir="rtl"
    >
      <div className="absolute -left-8 -top-8 w-32 h-32 rounded-full bg-gold-500/10 blur-2xl pointer-events-none" />
      <div className="relative flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="w-14 h-14 rounded-2xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center shrink-0">
          <Code2 className="w-7 h-7 text-gold-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] uppercase tracking-wide text-gold-400/90 font-semibold">
            {profile.title}
          </p>
          <h3 className="text-xl font-bold text-white mt-0.5 flex items-center gap-2">
            <UserRound className="w-5 h-5 text-white/40" />
            {profile.display_name}
          </h3>
          <p className="text-sm text-white/55 mt-1 leading-relaxed">{profile.tagline}</p>
          <p className="text-sm text-gold-200/90 mt-2 font-mono" dir="ltr">
            {profile.phone}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <a
            href={developerTelLink(profile)}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            اتصال
          </a>
          <a
            href={developerWhatsAppLink(
              profile,
              waPrefill || 'السلام عليكم، أحتاج دعماً فنياً على منصة ERB Elite',
            )}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-500/20 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/30 transition-colors"
          >
            <MessageCircle className="w-3.5 h-3.5" />
            واتساب
          </a>
        </div>
      </div>
    </div>
  );
}
