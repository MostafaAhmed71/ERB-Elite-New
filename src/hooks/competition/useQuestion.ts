import { useCallback, useEffect, useState } from 'react';
import { getActiveOrTodayQuestion, getTodayQuestion } from '../../lib/competition/api';
import type { CompQuestion } from '../../lib/competition/types';

export function useQuestion(options?: { dateStr?: string; pollMs?: number }) {
  const [question, setQuestion] = useState<CompQuestion | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      setError(null);
      const q = options?.dateStr
        ? await getTodayQuestion(options.dateStr)
        : await getActiveOrTodayQuestion();
      setQuestion(q);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشل جلب السؤال');
    } finally {
      setLoading(false);
    }
  }, [options?.dateStr]);

  useEffect(() => {
    void refresh();
    const pollMs = options?.pollMs ?? 15_000;
    const t = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(t);
  }, [refresh, options?.pollMs]);

  return { question, loading, error, refresh };
}
