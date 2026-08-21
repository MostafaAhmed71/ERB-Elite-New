import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { MessageCircle, Send, Wifi, WifiOff } from 'lucide-react';
import type { TeacherActivityEntry } from '../../lib/academic/types';
import {
  fetchWhatsAppServerStatus,
  sendBulkWhatsAppTexts,
  sendWhatsAppText,
} from '../../lib/whatsappReminder';
import { academicBtnPrimary } from './AcademicUi';
import clsx from 'clsx';

type Props = {
  teachers: TeacherActivityEntry[];
  buildMessage: (teacher: TeacherActivityEntry) => string;
  label?: string;
  className?: string;
};

export function WhatsAppReminderToolbar({
  teachers,
  buildMessage,
  label = 'إرسال تذكير واتساب للمعلمين المتأخرين',
  className,
}: Props) {
  const [sending, setSending] = useState(false);
  const [waConnected, setWaConnected] = useState<boolean | null>(null);
  const withPhone = teachers.filter((t) => t.phone?.trim());
  const withoutPhone = teachers.filter((t) => !t.phone?.trim());

  useEffect(() => {
    fetchWhatsAppServerStatus().then((s) => setWaConnected(s.connected && s.supportsTextReminders));
  }, []);

  const sendAll = async () => {
    if (withPhone.length === 0) {
      toast.error('لا يوجد معلمون متأخرون بأرقام جوال مسجّلة');
      return;
    }
    if (!confirm(`إرسال تذكير واتساب تلقائياً إلى ${withPhone.length} معلم؟`)) return;
    setSending(true);
    try {
      const result = await sendBulkWhatsAppTexts(
        withPhone.map((t) => ({ phone: t.phone!, message: buildMessage(t) })),
      );
      if (result.failed > 0) {
        toast.error(
          `فشل ${result.failed}: ${result.errors[0] ?? 'تحقق من رقم الجوال وواتساب'}`,
          { duration: 6000 },
        );
      }
      if (result.sent > 0) {
        toast.success(`تم الإرسال تلقائياً: ${result.sent} ناجح${result.failed ? `، ${result.failed} فشل` : ''}`);
      } else if (result.failed > 0 && result.errors.length) {
        /* error toast already shown */
      }
      setWaConnected(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'فشل الإرسال');
      const status = await fetchWhatsAppServerStatus();
      setWaConnected(status.connected);
    } finally {
      setSending(false);
    }
  };

  if (teachers.length === 0) return null;

  return (
    <div className={clsx('rounded-xl border border-[#25D366]/25 bg-[#25D366]/5 p-3 space-y-2', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className={academicBtnPrimary}
          disabled={sending || withPhone.length === 0}
          onClick={sendAll}
        >
          <Send className="w-4 h-4" />
          {sending ? 'جاري الإرسال...' : `${label} (${withPhone.length})`}
        </button>
        {waConnected === true && (
          <span className="inline-flex items-center gap-1 text-[#25D366] text-xs font-medium">
            <Wifi className="w-3.5 h-3.5" />
            واتساب متصل — إرسال تلقائي
          </span>
        )}
        {waConnected === false && (
          <span className="inline-flex items-center gap-1 text-amber-300 text-xs">
            <WifiOff className="w-3.5 h-3.5" />
            خادم واتساب غير جاهز — راجع الإعدادات الأكاديمية أو حدّث VPS
          </span>
        )}
      </div>
      {withoutPhone.length > 0 && (
        <p className="text-amber-300/90 text-xs">
          {withoutPhone.length} معلم بدون رقم جوال: {withoutPhone.map((t) => t.teacher_name).join('، ')}
          {' '}— أضف الأرقام من إدارة المستخدمين
        </p>
      )}
    </div>
  );
}

export function WhatsAppTeacherButton({
  teacher,
  buildMessage,
}: {
  teacher: TeacherActivityEntry;
  buildMessage: (teacher: TeacherActivityEntry) => string;
}) {
  const [sending, setSending] = useState(false);
  if (!teacher.phone?.trim()) return null;

  return (
    <button
      type="button"
      title="إرسال تذكير واتساب تلقائياً"
      disabled={sending}
      onClick={async () => {
        setSending(true);
        try {
          const result = await sendWhatsAppText(teacher.phone!, buildMessage(teacher));
          if (result.ok) {
            toast.success(`تم إرسال التذكير إلى ${teacher.teacher_name}`);
          } else {
            toast.error(result.error ?? 'فشل الإرسال');
          }
        } catch (e) {
          toast.error(e instanceof Error ? e.message : 'فشل الإرسال');
        } finally {
          setSending(false);
        }
      }}
      className="shrink-0 p-2 rounded-lg text-[#25D366] hover:bg-[#25D366]/10 border border-[#25D366]/20 transition-colors disabled:opacity-50"
    >
      <MessageCircle className={clsx('w-4 h-4', sending && 'animate-pulse')} />
    </button>
  );
}
