import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Heart, HandHeart, Sparkles } from 'lucide-react';
import clsx from 'clsx';
import { supabase } from '../../lib/supabase';
import {
  fetchPeerEncouragementStatus,
  sendPeerEncouragement,
  PEER_DAILY_SEND_LIMIT,
  PEER_KIND_LABELS,
  type PeerEncouragementKind,
} from '../../lib/peerEncouragement';
import { showSuccess, showError } from '../../lib/toast';
import { BarsLoader } from '../ui/BarsLoader';

type Props = {
  studentId: string;
  grade: string;
  className: string;
};

export function PeerEncouragementPanel({ studentId, grade, className }: Props) {
  const queryClient = useQueryClient();

  const { data: classmates = [], isLoading: classmatesLoading } = useQuery({
    queryKey: ['peer-classmates', grade, className, studentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('students')
        .select('id, full_name')
        .eq('grade', grade)
        .eq('class_name', className)
        .eq('is_active', true)
        .neq('id', studentId)
        .order('full_name');
      if (error) throw error;
      return data as { id: string; full_name: string }[];
    },
    enabled: !!studentId,
  });

  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['peer-enc-status', studentId],
    queryFn: () => fetchPeerEncouragementStatus(studentId),
    enabled: !!studentId,
  });

  const sendMutation = useMutation({
    mutationFn: ({ toId, kind }: { toId: string; kind: PeerEncouragementKind }) =>
      sendPeerEncouragement(toId, kind),
    onSuccess: (result) => {
      showSuccess(
        `أُرسل ${PEER_KIND_LABELS[result.kind]} لـ ${result.toName} — متبقي ${result.remainingToday} اليوم`,
      );
      queryClient.invalidateQueries({ queryKey: ['peer-enc-status', studentId] });
      queryClient.invalidateQueries({ queryKey: ['student-metrics'] });
    },
    onError: (e: Error) => showError(e),
  });

  const isLoading = classmatesLoading || statusLoading;
  const remaining = status?.remainingToday ?? PEER_DAILY_SEND_LIMIT;

  if (isLoading) {
    return (
      <div className="glass-card p-5 flex justify-center">
        <BarsLoader compact label="" />
      </div>
    );
  }

  if (classmates.length === 0) return null;

  return (
    <div className="glass-card p-5 space-y-4" dir="rtl">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <h3 className="text-white font-semibold text-sm flex items-center gap-2">
          <Heart className="w-4 h-4 text-pink-400" />
          تشجيع الأقران
          <span className="text-white/30 text-[10px] font-normal">ST4</span>
        </h3>
        <span
          className={clsx(
            'text-[10px] px-2 py-0.5 rounded-full border font-mono',
            remaining > 0
              ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/20'
              : 'text-white/40 bg-white/5 border-white/10',
          )}
        >
          متبقي اليوم: {remaining}/{PEER_DAILY_SEND_LIMIT}
        </span>
      </div>

      <p className="text-white/40 text-xs">
        شجّع زميلك في الفصل — نقطة مبادرة واحدة تُمنح له تلقائياً (حد {PEER_DAILY_SEND_LIMIT} إرسالات يومياً)
      </p>

      <div className="space-y-2 max-h-56 overflow-y-auto">
        {classmates.map((mate) => {
          const alreadySent = status?.encouragedTodayIds.has(mate.id);
          const disabled = remaining <= 0 || alreadySent || sendMutation.isPending;

          return (
            <div
              key={mate.id}
              className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-white/3 border border-white/5"
            >
              <span className="text-white text-xs font-medium truncate">{mate.full_name}</span>
              <div className="flex gap-1 shrink-0">
                {(['thanks', 'cheer'] as const).map((kind) => (
                  <button
                    key={kind}
                    type="button"
                    disabled={disabled}
                    onClick={() => sendMutation.mutate({ toId: mate.id, kind })}
                    className={clsx(
                      'inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium border transition-colors',
                      kind === 'thanks'
                        ? 'text-pink-300 bg-pink-500/10 border-pink-500/20 hover:bg-pink-500/20'
                        : 'text-amber-300 bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20',
                      disabled && 'opacity-40 cursor-not-allowed',
                    )}
                  >
                    {kind === 'thanks' ? (
                      <HandHeart className="w-3 h-3" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    {PEER_KIND_LABELS[kind]}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {status && status.recentReceived.length > 0 && (
        <div className="border-t border-white/5 pt-3 space-y-1.5">
          <p className="text-white/40 text-[10px]">آخر ما وصلك</p>
          {status.recentReceived.map((r) => (
            <p key={r.id} className="text-white/60 text-[11px]">
              <span className="text-pink-300">{PEER_KIND_LABELS[r.kind]}</span>
              {' '}من {r.fromName}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
