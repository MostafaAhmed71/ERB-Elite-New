import { useStudentParentNotifications } from '../../hooks/useStudentParentNotifications';

/** مكوّن خفي — إشعارات فورية للطالب وولي الأمر */
export function StudentParentRealtime() {
  useStudentParentNotifications(true);
  return null;
}
