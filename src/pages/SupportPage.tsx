import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Headset, Send } from 'lucide-react';
import { RolePageShell } from '../components/ui/RolePageShell';
import { PageHeader } from '../components/ui/PageHeader';
import { HorizonCard } from '../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../components/ui/Button';
import { PlatformDeveloperCard } from '../components/support/PlatformDeveloperCard';
import {
  listMySupportTickets,
  submitSupportTicket,
  SUPPORT_KIND_LABELS,
  SUPPORT_STATUS_LABELS,
  type SupportTicketKind,
  type SupportTicketPriority,
} from '../lib/platformSupport';
import { showError, showSuccess } from '../lib/toast';
import { useLocation } from 'react-router-dom';

export function SupportPage() {
  const qc = useQueryClient();
  const location = useLocation();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [priority, setPriority] = useState<SupportTicketPriority>('normal');
  const [kind, setKind] = useState<SupportTicketKind>('request');

  const ticketsQuery = useQuery({
    queryKey: ['support', 'mine'],
    queryFn: listMySupportTickets,
    retry: false,
  });

  const submitMut = useMutation({
    mutationFn: () =>
      submitSupportTicket({
        subject,
        message,
        page_path: location.pathname,
        priority,
        kind,
      }),
    onSuccess: () => {
      showSuccess('أُرسل طلبك بنجاح — سيتم التواصل معك قريباً');
      setSubject('');
      setMessage('');
      setKind('request');
      qc.invalidateQueries({ queryKey: ['support', 'mine'] });
    },
    onError: (e: Error) => showError(e),
  });

  const missing =
    ticketsQuery.error?.message?.includes('platform_support_tickets')
    || ticketsQuery.error?.message?.includes('schema cache')
    || ticketsQuery.error?.message?.includes('submit_support_ticket');

  return (
    <RolePageShell>
      <PageHeader
        title="الدعم الفني"
        subtitle="تواصل مع مطور المنصة داخل النظام"
        icon={Headset}
      />

      <PlatformDeveloperCard compact className="mb-4" />

      {missing && (
        <HorizonCard className="mb-4 border border-amber-500/30 bg-amber-500/5">
          <p className="text-sm text-amber-100">
            طبّق الهجرة <code className="text-xs">107_tech_support_and_developer_profile.sql</code> أولاً.
          </p>
        </HorizonCard>
      )}

      <HorizonCard className="mb-4 space-y-3">
        <p className="text-sm font-semibold text-white">أرسل شكوى أو طلباً</p>
        <div className="grid sm:grid-cols-2 gap-2">
          <label className="block text-xs text-surface-muted">
            النوع
            <select
              className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
              value={kind}
              onChange={(e) => setKind(e.target.value as SupportTicketKind)}
            >
              {(Object.keys(SUPPORT_KIND_LABELS) as SupportTicketKind[]).map((k) => (
                <option key={k} value={k}>{SUPPORT_KIND_LABELS[k]}</option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-surface-muted">
            الأولوية
            <select
              className="mt-1 w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
              value={priority}
              onChange={(e) => setPriority(e.target.value as SupportTicketPriority)}
            >
              <option value="low">منخفضة</option>
              <option value="normal">عادية</option>
              <option value="high">عالية</option>
              <option value="urgent">عاجلة</option>
            </select>
          </label>
        </div>
        <input
          className="w-full rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white"
          placeholder="الموضوع (مثال: لا يظهر الواجب)"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
        />
        <textarea
          className="w-full min-h-[140px] rounded-xl bg-black/30 border border-white/10 px-3 py-2.5 text-sm text-white"
          placeholder="اشرح المشكلة بالتفصيل — ماذا حاولت؟ أين ظهرت؟"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <Button
          disabled={submitMut.isPending || subject.trim().length < 3 || message.trim().length < 5 || !!missing}
          onClick={() => submitMut.mutate()}
        >
          <Send className="w-4 h-4 ml-1" />
          إرسال لمطور المنصة
        </Button>
      </HorizonCard>

      <HorizonCard>
        <p className="text-sm font-semibold text-white mb-3">طلباتي السابقة</p>
        {(ticketsQuery.data ?? []).length === 0 ? (
          <p className="text-xs text-surface-muted">لا طلبات بعد.</p>
        ) : (
          <ul className="space-y-2">
            {(ticketsQuery.data ?? []).map((t) => (
              <li
                key={t.id}
                className="rounded-xl border border-white/8 bg-white/[0.02] p-3"
              >
                <div className="flex flex-wrap justify-between gap-2">
                  <p className="text-sm font-medium text-white">{t.subject}</p>
                  <div className="flex gap-1">
                    {t.ticket_kind && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gold-500/10 text-gold-200">
                        {SUPPORT_KIND_LABELS[t.ticket_kind]}
                      </span>
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/5 text-white/60">
                      {SUPPORT_STATUS_LABELS[t.status] ?? t.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-surface-muted mt-1 line-clamp-2">{t.message}</p>
                <p className="text-[10px] text-white/35 mt-2">
                  {new Date(t.created_at).toLocaleString('ar-SA')}
                </p>
              </li>
            ))}
          </ul>
        )}
      </HorizonCard>
    </RolePageShell>
  );
}
