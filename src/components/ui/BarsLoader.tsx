import './BarsLoader.css';

type BarsLoaderProps = {
  label?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  compact?: boolean;
  className?: string;
};

export function BarsLoader({
  label = 'جاري التحميل...',
  fullScreen = false,
  overlay = false,
  compact = false,
  className = '',
}: BarsLoaderProps) {
  const content = (
    <div
      className={`bars-loader ${compact ? 'bars-loader--compact' : ''} ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <section className="bars-loader__track" aria-hidden>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bars-loader__slider"
            style={{ '--i': i } as React.CSSProperties}
          />
        ))}
      </section>
      {label && !compact && <span className="bars-loader__label">{label}</span>}
    </div>
  );

  if (overlay) {
    return (
      <div className="bars-loader-overlay" dir="rtl">
        {content}
      </div>
    );
  }

  if (fullScreen) {
    return (
      <div className="bars-loader-fullscreen" dir="rtl">
        {content}
      </div>
    );
  }

  return content;
}
