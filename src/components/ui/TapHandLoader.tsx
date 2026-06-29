import './TapHandLoader.css';

type TapHandLoaderProps = {
  label?: string;
  fullScreen?: boolean;
  overlay?: boolean;
  className?: string;
};

export function TapHandLoader({
  label = 'جاري التحميل...',
  fullScreen = false,
  overlay = false,
  className = '',
}: TapHandLoaderProps) {
  const content = (
    <div className={`tap-loader ${className}`} role="status" aria-live="polite" aria-busy="true">
      <div className="tap-loader__stage">
        <div className="tap-loader__hand">
          <div className="tap-loader__finger" />
          <div className="tap-loader__finger" />
          <div className="tap-loader__finger" />
          <div className="tap-loader__finger" />
          <div className="tap-loader__palm" />
          <div className="tap-loader__thumb" />
        </div>
      </div>
      {label && <span className="tap-loader__label">{label}</span>}
    </div>
  );

  if (overlay) {
    return (
      <div className="tap-loader-overlay" dir="rtl">
        {content}
      </div>
    );
  }

  if (fullScreen) {
    return (
      <div className="tap-loader-fullscreen" dir="rtl">
        {content}
      </div>
    );
  }

  return content;
}
