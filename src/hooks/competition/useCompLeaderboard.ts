import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { fetchCompLeaderboard } from '../../lib/competition/api';
import type { CompLeaderboardRow } from '../../lib/competition/types';

const POLL_MS = 8_000;

export function useCompLeaderboard() {
  const [rows, setRows] = useState<CompLeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => undefined);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const data = await fetchCompLeaderboard();
      setRows(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل جلب الترتيب');
    } finally {
      setLoading(false);
    }
  }, []);

  refreshRef.current = refresh;

  useEffect(() => {
    void refresh();
    const poll = window.setInterval(() => {
      void refreshRef.current();
    }, POLL_MS);

    // تأخير الاشتراك لتجنب إغلاق WebSocket فوراً في React Strict Mode
    let channel: ReturnType<typeof supabase.channel> | null = null;
    const subscribeTimer = window.setTimeout(() => {
      const name = `comp-scores-${Math.random().toString(36).slice(2, 9)}`;
      channel = supabase
        .channel(name)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'comp_scores' },
          () => {
            void refreshRef.current();
          },
        )
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'comp_answers' },
          () => {
            void refreshRef.current();
          },
        )
        .subscribe();
    }, 750);

    return () => {
      window.clearInterval(poll);
      window.clearTimeout(subscribeTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return { rows, loading, error, refresh };
}
