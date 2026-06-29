import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Save } from 'lucide-react';
import clsx from 'clsx';
import {
  fetchSmsAlertConfig,
  fetchSmsAlertLog,
  saveSmsAlertConfig,
  type SmsAlertConfig,
} from '../../lib/smsAlerts';
import { Button } from '../ui/Button';
import { showSuccess, showError } from '../../lib/toast';

/** G5 — إعداد تنبيهات SMS/واتسApp */
export function SmsAlertsSettingsPanel() {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useQuery({
    queryKey: ['sms-alert-config'],
    queryFn: fetchSmsAlertConfig,
  });
  const { data: log = [] } = useQuery({
    queryKey: ['sms-alert-log'],
    queryFn: () => fetchSmsAlertLog(15),
  });

  const [draft, setDraft] = useState<SmsAlertConfig | null>(null);
  const form = draft ?? config;

  const saveMutation = useMutation({
    mutationFn: saveSmsAlertConfig,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sms-alert-config'] });
      showSuccess('تم حفظ إعدادات SMS');
    },
    onError: (e: Error) => showError(e),
  });

  if (isLoading || !form) {
    return <p className="text-white/40 text-sm">جاري التحميل...</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <MessageSquare className="w-5 h-5 text-green-400" />
        <div>
          <h3 className="text-white font-semibold text-sm">تنبيهات SMS / واتساب — G5</h3>
          <p className="text-white/40 text-xs">يتطلب Edge Function `send-sms-alert` + مفاتيح Twilio على السيرفر</p>
        </div>
      </div>

      <label className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/3 border border-white/10">
        <span className="text-white/70 text-sm">تفعيل التنبيهات النصية</span>
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => setDraft({ ...form, enabled: e.target.checked })}
          className="accent-gold-400"
        />
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className="text-white/50 text-xs">القناة</span>
          <select
            value={form.channel}
            onChange={(e) => setDraft({ ...form, channel: e.target.value as 'sms' | 'whatsapp' })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          >
            <option value="sms" className="bg-navy-950">SMS</option>
            <option value="whatsapp" className="bg-navy-950">WhatsApp (Twilio)</option>
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-white/50 text-xs">اسم المدرسة في الرسالة</span>
          <input
            value={form.school_name}
            onChange={(e) => setDraft({ ...form, school_name: e.target.value })}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white text-sm"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-4">
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={form.absence_alerts}
            onChange={(e) => setDraft({ ...form, absence_alerts: e.target.checked })}
            className="accent-gold-400"
          />
          تنبيه الغياب
        </label>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={form.exam_alerts}
            onChange={(e) => setDraft({ ...form, exam_alerts: e.target.checked })}
            className="accent-gold-400"
          />
          تنبيه نتيجة الاختبار
        </label>
      </div>

      <Button
        size="sm"
        icon={<Save className="w-4 h-4" />}
        disabled={saveMutation.isPending}
        onClick={() => saveMutation.mutate(form)}
      >
        حفظ
      </Button>

      {log.length > 0 && (
        <div className="space-y-2 pt-3 border-t border-white/5">
          <p className="text-white/40 text-xs">آخر الرسائل</p>
          {log.map((row) => (
            <div key={row.id} className="text-[10px] p-2 rounded-lg bg-white/3 border border-white/5">
              <span
                className={clsx(
                  'font-mono',
                  row.status === 'sent' && 'text-emerald-400',
                  row.status === 'failed' && 'text-red-400',
                  row.status === 'queued' && 'text-amber-400',
                )}
              >
                {row.status}
              </span>
              {' · '}
              {row.phone ?? '—'} — {row.message.slice(0, 60)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
