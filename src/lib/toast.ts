import toast from 'react-hot-toast';
import { toArabicErrorMessage } from './errors';
import { reportMildIssue } from './platformErrors';

export function showSuccess(message: string) {
  toast.success(message);
}

export function showError(err: unknown, fallback = 'حدث خطأ — حاول مرة أخرى') {
  const msg = toArabicErrorMessage(err);
  const display = msg === 'حدث خطأ غير متوقع' ? fallback : msg;
  toast.error(display);
  reportMildIssue({
    message: display,
    error: err,
    source: 'frontend',
    severity: 'warning',
    context: {
      type: 'toast_error',
    },
  });
}

export function showSaveError(err?: unknown) {
  showError(err, 'فشل الحفظ — تحقق من الاتصال وحاول مرة أخرى');
}

export function showDeleteError(err?: unknown) {
  showError(err, 'فشل الحذف — تحقق من الاتصال وحاول مرة أخرى');
}

export function showLoadError(err?: unknown) {
  showError(err, 'فشل تحميل البيانات — تحقق من الاتصال');
}
