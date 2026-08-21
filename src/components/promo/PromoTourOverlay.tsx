import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  buildPromoTourSteps,
  getPromoScrollRoot,
  getPromoTourIndex,
  isPromoTourActive,
  setPromoTourIndex,
  stopPromoTourStorage,
  type PromoAction,
  type PromoTourStep,
} from '../../lib/promoTour';
import { useAuthStore } from '../../stores/authStore';

type Props = {
  forceActive?: boolean;
};

function sleep(ms: number, signal: { cancelled: boolean }) {
  return new Promise<void>((resolve) => {
    const t = window.setTimeout(() => resolve(), ms);
    const check = window.setInterval(() => {
      if (signal.cancelled) {
        window.clearTimeout(t);
        window.clearInterval(check);
        resolve();
      }
    }, 80);
  });
}

function animateScroll(
  root: HTMLElement,
  to: number,
  durationMs: number,
  signal: { cancelled: boolean },
) {
  return new Promise<void>((resolve) => {
    const isDoc = root === document.documentElement || root === document.body;
    const start = isDoc ? window.scrollY : root.scrollTop;
    const change = to - start;
    if (Math.abs(change) < 2 || durationMs <= 0) {
      if (isDoc) window.scrollTo(0, to);
      else root.scrollTop = to;
      resolve();
      return;
    }
    const t0 = performance.now();
    const tick = (now: number) => {
      if (signal.cancelled) {
        resolve();
        return;
      }
      const p = Math.min(1, (now - t0) / durationMs);
      const eased = 1 - Math.pow(1 - p, 3);
      const y = start + change * eased;
      if (isDoc) window.scrollTo(0, y);
      else root.scrollTop = y;
      if (p < 1) requestAnimationFrame(tick);
      else resolve();
    };
    requestAnimationFrame(tick);
  });
}

function queryFirst(selector: string): Element | null {
  try {
    return document.querySelector(selector);
  } catch {
    return null;
  }
}

export function PromoTourOverlay({ forceActive = false }: Props) {
  const { role } = useAuthStore();
  const navigate = useNavigate();
  const [active, setActive] = useState(() => forceActive || isPromoTourActive());
  const [paused, setPaused] = useState(false);
  const [stepIndex, setStepIndex] = useState(() => getPromoTourIndex());
  const [hudVisible, setHudVisible] = useState(true);
  const [caption, setCaption] = useState('جاري بدء الجولة…');
  const [highlightBox, setHighlightBox] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);

  const cursorRef = useRef<HTMLDivElement>(null);
  const clickRingRef = useRef<HTMLDivElement>(null);
  const runIdRef = useRef(0);
  const pausedRef = useRef(false);
  const signalRef = useRef({ cancelled: false });

  const steps = useMemo(() => buildPromoTourSteps(role), [role]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  const stopTour = useCallback(() => {
    signalRef.current.cancelled = true;
    runIdRef.current += 1;
    stopPromoTourStorage();
    setActive(false);
    setHighlightBox(null);
  }, []);

  const moveCursorTo = useCallback((x: number, y: number, durationMs = 900) => {
    const el = cursorRef.current;
    if (!el) return;
    el.style.transition = `transform ${durationMs}ms cubic-bezier(0.22, 1, 0.36, 1)`;
    el.style.transform = `translate(${x}px, ${y}px)`;
  }, []);

  const pulseClick = useCallback(() => {
    const ring = clickRingRef.current;
    if (!ring) return;
    ring.classList.remove('promo-click');
    void ring.offsetWidth;
    ring.classList.add('promo-click');
  }, []);

  const waitWhilePaused = useCallback(async (signal: { cancelled: boolean }) => {
    while (pausedRef.current && !signal.cancelled) {
      await sleep(120, signal);
    }
  }, []);

  const pointAt = useCallback(
    async (selector?: string, fallback: 'center' | 'main' = 'main') => {
      let target: Element | null = null;
      if (selector) {
        for (const part of selector.split(',').map((s) => s.trim())) {
          target = queryFirst(part);
          if (target) break;
        }
      }
      if (target) {
        const rect = target.getBoundingClientRect();
        moveCursorTo(rect.left + Math.min(rect.width * 0.55, 120), rect.top + Math.min(rect.height * 0.5, 40), 950);
        return;
      }
      if (fallback === 'center') {
        moveCursorTo(window.innerWidth * 0.5, window.innerHeight * 0.4, 800);
      } else {
        const main = queryFirst('main') ?? queryFirst('[role="main"]');
        if (main) {
          const rect = main.getBoundingClientRect();
          moveCursorTo(rect.left + rect.width * 0.45, Math.min(rect.top + 160, window.innerHeight * 0.45), 850);
        } else {
          moveCursorTo(window.innerWidth * 0.55, window.innerHeight * 0.4, 800);
        }
      }
    },
    [moveCursorTo],
  );

  const runHighlight = useCallback(async (selector: string, ms: number, signal: { cancelled: boolean }) => {
    const el = queryFirst(selector.split(',')[0].trim());
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setHighlightBox({
      top: rect.top - 6,
      left: rect.left - 6,
      width: rect.width + 12,
      height: Math.min(rect.height + 12, window.innerHeight * 0.55),
    });
    await sleep(ms, signal);
    setHighlightBox(null);
  }, []);

  const runAction = useCallback(
    async (action: PromoAction, signal: { cancelled: boolean }) => {
      await waitWhilePaused(signal);
      if (signal.cancelled) return;

      switch (action.type) {
        case 'caption':
          setCaption(action.text);
          break;
        case 'wait':
          await sleep(action.ms, signal);
          break;
        case 'navigate':
          navigate(action.path);
          await sleep(650, signal);
          break;
        case 'scroll': {
          const root = getPromoScrollRoot();
          const isDoc = root === document.documentElement || root === document.body;
          const current = isDoc ? window.scrollY : root.scrollTop;
          const max = isDoc
            ? Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
            : Math.max(0, root.scrollHeight - root.clientHeight);
          const target =
            action.to != null
              ? Math.max(0, Math.min(action.to, max))
              : Math.max(0, Math.min(current + (action.by ?? 280), max));
          await animateScroll(root, target, action.durationMs ?? 900, signal);
          // Keep cursor roughly over content while scrolling
          moveCursorTo(window.innerWidth * 0.58, window.innerHeight * 0.48, 500);
          break;
        }
        case 'scrollTo': {
          const el = queryFirst(action.selector.split(',')[0].trim());
          if (!el) break;
          const root = getPromoScrollRoot();
          const isDoc = root === document.documentElement || root === document.body;
          const rect = el.getBoundingClientRect();
          const current = isDoc ? window.scrollY : root.scrollTop;
          const next = current + rect.top + (action.offset ?? -40);
          await animateScroll(root, Math.max(0, next), action.durationMs ?? 900, signal);
          await pointAt(action.selector, 'main');
          break;
        }
        case 'point':
          await pointAt(action.selector, action.fallback ?? 'main');
          await sleep(350, signal);
          break;
        case 'click': {
          await pointAt(action.selector, 'main');
          await sleep(280, signal);
          pulseClick();
          if (action.real) {
            const el = queryFirst(action.selector) as HTMLElement | null;
            el?.click();
          }
          await sleep(320, signal);
          break;
        }
        case 'highlight':
          await runHighlight(action.selector, action.ms ?? 1000, signal);
          break;
        default:
          break;
      }
    },
    [navigate, moveCursorTo, pointAt, pulseClick, runHighlight, waitWhilePaused],
  );

  const runStep = useCallback(
    async (step: PromoTourStep, signal: { cancelled: boolean }) => {
      setCaption(step.caption);
      for (const action of step.actions) {
        if (signal.cancelled) return;
        await runAction(action, signal);
      }
    },
    [runAction],
  );

  const runTourLoop = useCallback(
    async (startAt: number) => {
      const myRun = ++runIdRef.current;
      signalRef.current = { cancelled: false };
      const signal = signalRef.current;

      let i = startAt;
      while (!signal.cancelled && runIdRef.current === myRun && steps.length) {
        const safe = ((i % steps.length) + steps.length) % steps.length;
        setStepIndex(safe);
        setPromoTourIndex(safe);
        await runStep(steps[safe], signal);
        if (signal.cancelled || runIdRef.current !== myRun) return;
        i = safe + 1;
      }
    },
    [runStep, steps],
  );

  // Boot
  useEffect(() => {
    if (!forceActive && !isPromoTourActive()) {
      setActive(false);
      return;
    }
    setActive(true);
    if (!steps.length) {
      setCaption('لا توجد شاشات لهذا الدور — سجّل دخول كطالب أو مدير');
      return;
    }
    moveCursorTo(window.innerWidth * 0.5, window.innerHeight * 0.35, 0);
    void runTourLoop(getPromoTourIndex());
    return () => {
      signalRef.current.cancelled = true;
      runIdRef.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role, forceActive, steps.length]);

  // Keyboard
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        stopTour();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        setPaused((p) => !p);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        signalRef.current.cancelled = true;
        const next = stepIndex + 1;
        setPromoTourIndex(next);
        void runTourLoop(next);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        signalRef.current.cancelled = true;
        const prev = Math.max(0, stepIndex - 1);
        setPromoTourIndex(prev);
        void runTourLoop(prev);
      } else if (e.key === 'h' || e.key === 'H' || e.key === 'ا') {
        e.preventDefault();
        setHudVisible((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, runTourLoop, stepIndex, stopTour]);

  if (!active) return null;

  const total = steps.length || 1;
  const progress = ((stepIndex + 1) / total) * 100;
  const currentLabel = steps[stepIndex]?.label ?? '—';

  return (
    <>
      <style>{`
        .promo-cursor {
          position: fixed; top: 0; left: 0; width: 28px; height: 28px;
          z-index: 99999; pointer-events: none; will-change: transform;
        }
        .promo-cursor-pointer {
          width: 0; height: 0;
          border-left: 14px solid #F4C430;
          border-top: 10px solid transparent;
          border-bottom: 10px solid transparent;
          filter: drop-shadow(0 2px 8px rgba(0,0,0,0.5));
          transform: rotate(-18deg);
        }
        .promo-cursor-ring {
          position: absolute; inset: -10px;
          border: 2px solid rgba(244,196,48,0.55);
          border-radius: 50%; opacity: 0;
        }
        .promo-cursor-ring.promo-click { animation: promoClickPulse 0.45s ease-out; }
        @keyframes promoClickPulse {
          0% { opacity: 1; transform: scale(0.55); }
          100% { opacity: 0; transform: scale(1.7); }
        }
        .promo-caption {
          position: fixed; left: 50%; bottom: 18px; transform: translateX(-50%);
          z-index: 99998; max-width: min(920px, calc(100vw - 24px)); width: 100%;
          background: rgba(30, 58, 95, 0.94);
          border: 1px solid rgba(244, 196, 48, 0.28);
          color: #fff; border-radius: 16px; padding: 12px 18px;
          text-align: center; font-family: Tajawal, Cairo, sans-serif;
          font-weight: 700; font-size: clamp(0.95rem, 1.6vw, 1.15rem);
          box-shadow: 0 12px 40px rgba(0,0,0,0.35); direction: rtl; pointer-events: none;
        }
        .promo-caption strong { color: #F4C430; }
        .promo-hud {
          position: fixed; top: 12px; left: 12px; z-index: 99998;
          display: flex; flex-wrap: wrap; gap: 8px; align-items: center;
          pointer-events: auto; font-family: Tajawal, Cairo, sans-serif; direction: rtl;
        }
        .promo-hud button, .promo-hud span {
          background: rgba(13, 27, 42, 0.88);
          border: 1px solid rgba(255,255,255,0.12);
          color: #fff; border-radius: 999px; padding: 6px 12px;
          font-size: 12px; font-weight: 700;
        }
        .promo-hud button { cursor: pointer; }
        .promo-hud button:hover { border-color: #F4C430; color: #F4C430; }
        .promo-progress {
          position: fixed; top: 0; left: 0; height: 3px; background: #F4C430;
          z-index: 99999; transition: width 0.4s ease; pointer-events: none;
        }
        .promo-highlight {
          position: fixed; z-index: 99990; pointer-events: none;
          border: 2px solid #F4C430; border-radius: 14px;
          box-shadow: 0 0 0 9999px rgba(13, 27, 42, 0.35), 0 0 24px rgba(244,196,48,0.35);
          transition: all 0.35s ease;
        }
      `}</style>

      <div className="promo-progress" style={{ width: `${progress}%` }} />

      {highlightBox && (
        <div
          className="promo-highlight"
          style={{
            top: highlightBox.top,
            left: highlightBox.left,
            width: highlightBox.width,
            height: highlightBox.height,
          }}
        />
      )}

      {hudVisible && (
        <div className="promo-hud">
          <span>
            جولة كاملة · {stepIndex + 1}/{total} · {currentLabel}
          </span>
          <button type="button" onClick={() => setPaused((p) => !p)}>
            {paused ? '▶ متابعة' : '⏸ إيقاف مؤقت'}
          </button>
          <button
            type="button"
            onClick={() => {
              signalRef.current.cancelled = true;
              const next = stepIndex + 1;
              setPromoTourIndex(next);
              void runTourLoop(next);
            }}
          >
            التالي
          </button>
          <button type="button" onClick={stopTour}>إيقاف (Esc)</button>
          <button type="button" onClick={() => setHudVisible(false)}>إخفاء (H)</button>
        </div>
      )}

      <div className="promo-caption" aria-live="polite">
        {caption}
        {paused ? (
          <>
            {' · '}
            <strong>متوقف مؤقتًا</strong>
          </>
        ) : null}
      </div>

      <div className="promo-cursor" ref={cursorRef} aria-hidden="true">
        <div className="promo-cursor-pointer" />
        <div className="promo-cursor-ring" ref={clickRingRef} />
      </div>
    </>
  );
}
