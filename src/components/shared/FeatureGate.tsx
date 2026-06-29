import type { ReactNode } from 'react';
import { useIsFeatureVisible } from '../../hooks/useFeatureVisibility';

type Props = {
  featureId: string;
  children: ReactNode;
  fallback?: ReactNode;
};

/** يخفي блокاً من الواجهة حسب إعدادات رائد النشاط */
export function FeatureGate({ featureId, children, fallback = null }: Props) {
  const visible = useIsFeatureVisible(featureId);
  if (!visible) return <>{fallback}</>;
  return <>{children}</>;
}
