import type { PointsStatus } from '../types';

/** تسميات مبسّطة لحالات النقاط — للطالب وولي الأمر */
export const POINTS_STATUS_LABELS: Record<PointsStatus, string> = {
  pending: 'بانتظار موافقة رائد النشاط',
  pending_principal: 'بانتظار موافقة المدير',
  approved: 'معتمد',
  rejected: 'مرفوض',
};

export function getPointsStatusLabel(status: string): string {
  return POINTS_STATUS_LABELS[status as PointsStatus] ?? status;
}
