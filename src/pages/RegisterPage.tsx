import { Navigate } from 'react-router-dom';

/**
 * التسجيل العام لطلاب/أولياء الأمور مُعطّل للواجهة.
 * الحسابات تُنشأ من إدارة المدرسة فقط.
 */
export function RegisterPage() {
  return <Navigate to="/login" replace />;
}
