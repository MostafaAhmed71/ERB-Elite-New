import { Component, type ErrorInfo, type ReactNode } from 'react';
import { reportPlatformError } from '../../lib/platformErrors';

type Props = { children: ReactNode };
type State = { hasError: boolean; message: string };

/** يلتقط أعطال React قبل أن يبلّغ المستخدم */
export class PlatformErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error?.message || 'خطأ غير متوقع' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    void reportPlatformError({
      source: 'frontend',
      severity: 'critical',
      message: error?.message || 'React render error',
      stack: error?.stack?.slice(0, 8000),
      errorName: error?.name || 'ReactError',
      context: {
        componentStack: info.componentStack?.slice(0, 2000),
        boundary: 'PlatformErrorBoundary',
        error_name: error?.name || 'ReactError',
      },
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-dvh flex items-center justify-center bg-navy-950 px-4"
          dir="rtl"
        >
          <div className="max-w-md text-center space-y-3">
            <p className="text-white font-semibold text-lg">حدث خطأ غير متوقع</p>
            <p className="text-sm text-white/60">
              سُجِّل الخطأ تلقائياً لدى مطور المنصة. يمكنك إعادة تحميل الصفحة.
            </p>
            <p className="text-xs text-white/40 line-clamp-3">{this.state.message}</p>
            <button
              type="button"
              className="mt-2 px-4 py-2 rounded-xl bg-gold-500/20 text-gold-200 text-sm border border-gold-500/30"
              onClick={() => window.location.reload()}
            >
              إعادة التحميل
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
