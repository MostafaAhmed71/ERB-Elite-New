import { supabase } from './supabase';

export const PEER_DAILY_SEND_LIMIT = 3;

export type PeerEncouragementKind = 'thanks' | 'cheer';

export const PEER_KIND_LABELS: Record<PeerEncouragementKind, string> = {
  thanks: 'شكراً',
  cheer: 'تشجيع',
};

export type PeerEncouragementStatus = {
  sentToday: number;
  remainingToday: number;
  encouragedTodayIds: Set<string>;
  recentReceived: Array<{
    id: string;
    kind: PeerEncouragementKind;
    fromName: string;
    created_at: string;
  }>;
};

function mapRpcError(message: string): string {
  if (message.includes('DAILY_SEND_LIMIT')) return 'وصلت للحد اليومي (3 تشجيعات)';
  if (message.includes('ALREADY_SENT_TODAY')) return 'شجّعت هذا الزميل اليوم مسبقاً';
  if (message.includes('SAME_CLASS_ONLY')) return 'يمكنك التشجيع لزملاء فصلك فقط';
  if (message.includes('TARGET_DAILY_LIMIT')) return 'وصل زميلك لحد استقبال التشجيع اليوم';
  if (message.includes('CANNOT_ENCOURAGE_SELF')) return 'لا يمكنك تشجيع نفسك';
  return message;
}

export async function sendPeerEncouragement(
  toStudentId: string,
  kind: PeerEncouragementKind,
): Promise<{ remainingToday: number; toName: string; kind: PeerEncouragementKind }> {
  const { data, error } = await supabase.rpc('send_peer_encouragement', {
    p_to_student_id: toStudentId,
    p_kind: kind,
  });
  if (error) throw new Error(mapRpcError(error.message));
  const result = data as { ok: boolean; remaining_today: number; to_name: string; kind: PeerEncouragementKind };
  return { remainingToday: result.remaining_today, toName: result.to_name, kind: result.kind };
}

export async function fetchPeerEncouragementStatus(
  studentId: string,
): Promise<PeerEncouragementStatus> {
  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);

  const [sentRes, receivedRes] = await Promise.all([
    supabase
      .from('peer_encouragements')
      .select('to_student_id')
      .eq('from_student_id', studentId)
      .gte('created_at', dayStart.toISOString()),
    supabase
      .from('peer_encouragements')
      .select('id, kind, created_at, from_student:from_student_id(full_name)')
      .eq('to_student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(5),
  ]);

  if (sentRes.error) throw sentRes.error;
  if (receivedRes.error) throw receivedRes.error;

  const sentToday = sentRes.data?.length ?? 0;
  const encouragedTodayIds = new Set(
    (sentRes.data ?? []).map((r) => r.to_student_id as string),
  );

  const recentReceived = (receivedRes.data ?? []).map((r) => {
    const from = r.from_student as { full_name: string } | { full_name: string }[] | null;
    const fromName = Array.isArray(from) ? from[0]?.full_name : from?.full_name;
    return {
      id: r.id as string,
      kind: r.kind as PeerEncouragementKind,
      fromName: fromName ?? 'زميل',
      created_at: r.created_at as string,
    };
  });

  return {
    sentToday,
    remainingToday: Math.max(0, PEER_DAILY_SEND_LIMIT - sentToday),
    encouragedTodayIds,
    recentReceived,
  };
}
