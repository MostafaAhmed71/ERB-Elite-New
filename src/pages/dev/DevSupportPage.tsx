import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Headset, Inbox, MessageSquareWarning, Phone, RefreshCw, Search } from 'lucide-react';
import { RolePageShell } from '../../components/ui/RolePageShell';
import { PageHeader } from '../../components/ui/PageHeader';
import { HorizonCard } from '../../components/dashboard/horizon/HorizonDashboard';
import { Button } from '../../components/ui/Button';
import { HubTabs, type HubTabItem } from '../../components/ui/HubTabs';
import { TapHandLoader } from '../../components/ui/TapHandLoader';
import { EmptyState } from '../../components/ui/EmptyState';
import { supabase } from '../../lib/supabase';
import {
  listAllSupportTickets,
  SUPPORT_KIND_LABELS,
  SUPPORT_PRIORITY_LABELS,
  SUPPORT_STATUS_LABELS,
  updateSupportTicketStatus,
  type SupportTicket,
  type SupportTicketKind,
  type SupportTicketStatus,
} from '../../lib/platformSupport';
import { showError, showSuccess } from '../../lib/toast';
import clsx from 'clsx';

type Filter = 'open' | 'complaint' | 'request' | 'all' | SupportTicketStatus;

const FILTERS: HubTabItem<Filter>[] = [
  { id: 'open', label: 'بانتظار الرد' },
  { id: 'complaint', label: 'شكاوى' },
  { id: 'request', label: 'طلبات' },
  { id: 'in_progress', label: 'قيد المعالجة' },
  { id: 'resolved', label: 'تم الحل' },
  { id: 'all', label: 'الكل' },
];

function kindTone(kind?: string) {
  if (kind === 'complaint') return 'bg-red-500/15 text-red-200 border-red-500/25';
  if (kind === 'inquiry') return 'bg-sky-500/15 text-sky-200 border-sky-500/25';
  return 'bg-gold-500/15 text-gold-200 border-gold-500/25';
}

export function DevSupportPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<Filter>('open');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');

  const listQuery = useQuery({
    queryKey: ['dev', 'support', 'inbox'],
    queryFn: () => listAllSupportTickets('all'),
    refetchInterval: 12_000,
    retry: false,
  });

  useEffect(() => {
    const channel = supabase
      .channel('dev-support-inbox')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'platform_support_tickets' },
        () => {
          qc.invalidateQueries({ queryKey: ['dev', 'support'] });
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [qc]);

  const all = listQuery.data ?? [];

  const stats = useMemo(() => {
    const open = all.filter((t) => t.status === 'open').length;
    const progress = all.filter((t) => t.status === 'in_progress').length;
    const complaints = all.filter((t) => (t.ticket_kind ?? 'request') === 'complaint').length;
    const requests = all.filter((t) => (t.ticket_kind ?? 'request') === 'request').length;
    return { open, progress, complaints, requests, total: all.length };
  }, [all]);

  const filtered = useMemo(() => {
    let rows = all;
    if (filter === 'open') rows = rows.filter((t) => t.status === 'open');
    else if (filter === 'complaint') rows = rows.filter((t) => (t.ticket_kind ?? 'request') === 'complaint');
    else if (filter === 'request') {
      rows = rows.filter((t) => {
        const k = t.ticket_kind ?? 'request';
        return k === 'request' || k === 'inquiry';
      });
    } else if (filter !== 'all') rows = rows.filter((t) => t.status === filter);

    const q = search.trim().toLowerCase();
    if (q) {
      rows = rows.filter((t) =>
        [t.subject, t.message, t.user_name, t.user_phone, t.user_role]
          .filter(Boolean)
          .some((x) => String(x).toLowerCase().includes(q)),
      );
    }
    return rows;
  }, [all, filter, search]);

  const selected = filtered.find((t) => t.id === selectedId)
    ?? all.find((t) => t.id === selectedId)
    ?? null;

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SupportTicketStatus }) =>
      updateSupportTicketStatus(id, status, notes || undefined),
    onSuccess: () => {
      showSuccess('حُدّثت التذكرة');
      qc.invalidateQueries({ queryKey: ['dev', 'support'] });
    },
    onError: (e: Error) => showError(e),
  });

  const missing =
    listQuery.error?.message?.includes('platform_support_tickets')
    || listQuery.error?.message?.includes('schema cache');

  return (
    <RolePageShell>
      <PageHeader
        title="صندوق الشكاوى والطلبات"
        subtitle="استقبال ومتابعة بلاغات الدعم الفني من مستخدمي المنصة"
        icon={Inbox}
        actions={
          <Button
            size="sm"
            variant="secondary"
            disabled={listQuery.isFetching}
            onClick={() => qc.invalidateQueries({ queryKey: ['dev', 'support'] })}
          >
            <RefreshCw className={clsx('w-3.5 h-3.5 ml-1', listQuery.isFetching && 'animate-spin')} />
            تحديث
          </Button>
        }
      />

      {missing && (
        <HorizonCard className="mb-4 border border-amber-500/30 bg-amber-500/5">
          <p className="text-sm text-amber-100">
            طبّق الهجرات <code className="text-xs">107</code> ثم <code className="text-xs">108</code>.
          </p>
        </HorizonCard>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
        {[
          { label: 'بانتظار الرد', value: stats.open, tone: 'text-amber-200' },
          { label: 'قيد المعالجة', value: stats.progress, tone: 'text-sky-200' },
          { label: 'شكاوى', value: stats.complaints, tone: 'text-red-200' },
          { label: 'طلبات', value: stats.requests, tone: 'text-gold-200' },
        ].map((s) => (
          <HorizonCard key={s.label} padding="sm" className="border border-white/5">
            <p className="text-[10px] text-surface-muted">{s.label}</p>
            <p className={clsx('text-xl font-bold tabular-nums mt-1', s.tone)}>{s.value}</p>
          </HorizonCard>
        ))}
      </div>

      <div className="mb-3 relative">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-white/35" />
        <input
          className="w-full rounded-xl bg-black/30 border border-white/10 pr-10 pl-3 py-2.5 text-sm text-white"
          placeholder="بحث بالاسم، الجوال، أو نص الشكوى…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <HubTabs tabs={FILTERS} activeId={filter} onChange={setFilter} className="mb-4" ariaLabel="تصفية الشكاوى" />

      {listQuery.isLoading ? (
        <TapHandLoader label="جاري تحميل الصندوق…" />
      ) : (
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 space-y-2 max-h-[70vh] overflow-y-auto pe-1">
            {filtered.length === 0 ? (
              <EmptyState
                icon={MessageSquareWarning}
                title="لا بلاغات هنا"
                description="عند إرسال المستخدمين من /support ستظهر هنا فوراً"
              />
            ) : (
              filtered.map((t) => (
                <TicketRow
                  key={t.id}
                  ticket={t}
                  active={selectedId === t.id}
                  onSelect={() => {
                    setSelectedId(t.id);
                    setNotes(t.admin_notes ?? '');
                  }}
                />
              ))
            )}
          </div>

          <HorizonCard className="lg:col-span-3 min-h-[320px]">
            {!selected ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10">
                <Headset className="w-10 h-10 text-white/20 mb-3" />
                <p className="text-sm text-surface-muted">اختر شكوى أو طلباً من القائمة لعرض التفاصيل والرد</p>
              </div>
            ) : (
              <TicketDetail
                ticket={selected}
                notes={notes}
                setNotes={setNotes}
                pending={statusMut.isPending}
                onStatus={(status) => statusMut.mutate({ id: selected.id, status })}
              />
            )}
          </HorizonCard>
        </div>
      )}
    </RolePageShell>
  );
}

function TicketRow({
  ticket: t,
  active,
  onSelect,
}: {
  ticket: SupportTicket;
  active: boolean;
  onSelect: () => void;
}) {
  const kind = (t.ticket_kind ?? 'request') as SupportTicketKind;
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        'w-full text-right rounded-xl border p-3 transition-colors',
        active
          ? 'border-gold-500/40 bg-gold-500/10'
          : 'border-white/8 bg-white/[0.02] hover:bg-white/[0.04]',
      )}
    >
      <div className="flex flex-wrap items-center gap-1.5 mb-1">
        <span className={clsx('text-[10px] px-2 py-0.5 rounded-full border', kindTone(kind))}>
          {SUPPORT_KIND_LABELS[kind] ?? kind}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/50">
          {SUPPORT_STATUS_LABELS[t.status]}
        </span>
        {t.priority === 'urgent' || t.priority === 'high' ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full border border-red-500/30 text-red-200">
            {SUPPORT_PRIORITY_LABELS[t.priority]}
          </span>
        ) : null}
      </div>
      <p className="text-sm font-semibold text-white truncate">{t.subject}</p>
      <p className="text-[11px] text-surface-muted mt-1 truncate">
        {t.user_name || '—'} · {t.user_phone || 'بلا جوال'}
      </p>
      <p className="text-[10px] text-white/35 mt-1">
        {new Date(t.created_at).toLocaleString('ar-SA')}
      </p>
    </button>
  );
}

function TicketDetail({
  ticket: selected,
  notes,
  setNotes,
  pending,
  onStatus,
}: {
  ticket: SupportTicket;
  notes: string;
  setNotes: (v: string) => void;
  pending: boolean;
  onStatus: (s: SupportTicketStatus) => void;
}) {
  const kind = (selected.ticket_kind ?? 'request') as SupportTicketKind;
  const phoneDigits = (selected.user_phone || '').replace(/\D/g, '');
  const wa = phoneDigits
    ? `https://wa.me/${phoneDigits.startsWith('0') ? `966${phoneDigits.slice(1)}` : phoneDigits}`
    : null;

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap gap-1.5">
        <span className={clsx('text-[10px] px-2 py-0.5 rounded-full border', kindTone(kind))}>
          {SUPPORT_KIND_LABELS[kind]}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/60">
          {SUPPORT_STATUS_LABELS[selected.status]}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 text-white/60">
          {SUPPORT_PRIORITY_LABELS[selected.priority] ?? selected.priority}
        </span>
      </div>

      <p className="font-semibold text-white text-lg">{selected.subject}</p>
      <p className="text-white/80 whitespace-pre-wrap leading-relaxed rounded-xl bg-black/20 border border-white/5 p-3">
        {selected.message}
      </p>

      <dl className="grid grid-cols-2 gap-2 text-[11px] text-white/55">
        <dt>المستخدم</dt>
        <dd className="text-white/85">{selected.user_name || '—'}</dd>
        <dt>الجوال</dt>
        <dd className="text-white/85 font-mono" dir="ltr">{selected.user_phone || '—'}</dd>
        <dt>الدور</dt>
        <dd className="text-white/85">{selected.user_role || '—'}</dd>
        <dt>البريد</dt>
        <dd className="text-white/85 truncate">{selected.user_email || '—'}</dd>
        <dt>الصفحة</dt>
        <dd className="text-white/85 font-mono truncate">{selected.page_path || '—'}</dd>
        <dt>الوقت</dt>
        <dd className="text-white/85">{new Date(selected.created_at).toLocaleString('ar-SA')}</dd>
      </dl>

      <div className="flex flex-wrap gap-2">
        {selected.user_phone && (
          <a
            href={`tel:${phoneDigits}`}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border border-white/10 text-white/80 hover:bg-white/5"
          >
            <Phone className="w-3.5 h-3.5" />
            اتصال
          </a>
        )}
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/10"
          >
            واتساب المستخدم
          </a>
        )}
      </div>

      <textarea
        className="w-full min-h-[80px] rounded-xl bg-black/30 border border-white/10 px-3 py-2 text-sm text-white"
        placeholder="ملاحظاتك الداخلية على البلاغ…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => onStatus('in_progress')}>
          بدء المعالجة
        </Button>
        <Button size="sm" disabled={pending} onClick={() => onStatus('resolved')}>
          تم الحل
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => onStatus('closed')}>
          إغلاق
        </Button>
        {selected.status !== 'open' && (
          <Button size="sm" variant="secondary" disabled={pending} onClick={() => onStatus('open')}>
            إعادة فتح
          </Button>
        )}
      </div>
    </div>
  );
}
