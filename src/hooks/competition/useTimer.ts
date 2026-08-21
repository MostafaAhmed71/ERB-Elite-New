import { useEffect, useState } from 'react';

/**
 * عدّاد تنازلي بالميلي ثانية.
 * مرّر `targetMs` كمدة مطلقة من الآن، أو `endsAt` كطابع زمني.
 */
export function useTimer(options: {
  durationMs?: number;
  endsAt?: number | null;
  running?: boolean;
  onComplete?: () => void;
}) {
  const { durationMs, endsAt, running = true, onComplete } = options;
  const [remainingMs, setRemainingMs] = useState(() => {
    if (endsAt != null) return Math.max(0, endsAt - Date.now());
    return durationMs ?? 0;
  });
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!running) return;

    const deadline =
      endsAt != null
        ? endsAt
        : durationMs != null
          ? Date.now() + durationMs
          : null;

    if (deadline == null) return;

    setDone(false);
    setRemainingMs(Math.max(0, deadline - Date.now()));

    const tick = () => {
      const left = Math.max(0, deadline - Date.now());
      setRemainingMs(left);
      if (left <= 0) {
        setDone(true);
        onComplete?.();
        return false;
      }
      return true;
    };

    if (!tick()) return;

    const id = window.setInterval(() => {
      if (!tick()) window.clearInterval(id);
    }, 200);

    return () => window.clearInterval(id);
    // onComplete intentionally omitted to avoid restart loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs, endsAt, running]);

  return {
    remainingMs,
    done,
    seconds: Math.ceil(remainingMs / 1000),
  };
}
