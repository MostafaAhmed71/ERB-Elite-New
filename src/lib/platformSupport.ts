import { supabase } from './supabase';

export type SupportTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';
export type SupportTicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type SupportTicketKind = 'complaint' | 'request' | 'inquiry';

export type SupportTicket = {
  id: string;
  user_id: string;
  user_name: string | null;
  user_role: string | null;
  user_phone: string | null;
  user_email: string | null;
  subject: string;
  message: string;
  page_path: string | null;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  ticket_kind?: SupportTicketKind | null;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
  resolved_at: string | null;
};

export const SUPPORT_STATUS_LABELS: Record<SupportTicketStatus, string> = {
  open: 'مفتوحة',
  in_progress: 'قيد المعالجة',
  resolved: 'تم الحل',
  closed: 'مغلقة',
};

export const SUPPORT_KIND_LABELS: Record<SupportTicketKind, string> = {
  complaint: 'شكوى',
  request: 'طلب',
  inquiry: 'استفسار',
};

export const SUPPORT_PRIORITY_LABELS: Record<SupportTicketPriority, string> = {
  low: 'منخفضة',
  normal: 'عادية',
  high: 'عالية',
  urgent: 'عاجلة',
};

export async function submitSupportTicket(input: {
  subject: string;
  message: string;
  page_path?: string;
  priority?: SupportTicketPriority;
  kind?: SupportTicketKind;
}): Promise<string> {
  const { data, error } = await supabase.rpc('submit_support_ticket', {
    p_subject: input.subject.trim(),
    p_message: input.message.trim(),
    p_page_path: input.page_path ?? (typeof window !== 'undefined' ? window.location.pathname : null),
    p_priority: input.priority ?? 'normal',
    p_kind: input.kind ?? 'request',
  });
  if (error) throw error;
  const id = data as string;

  // تأكيد واتساب فوري من الواجهة (رسالة جاهزة عبر Edge إن وُجدت التذكرة في الطابور)
  try {
    const { data: ticket } = await supabase
      .from('platform_support_tickets')
      .select('user_name, user_role, user_phone, subject, message, page_path')
      .eq('id', id)
      .maybeSingle();

    if (ticket) {
      const msg =
        `🛠️ طلب دعم فني — ERB Elite\n\n` +
        `من: ${ticket.user_name || 'مستخدم'}${ticket.user_role ? ` (${ticket.user_role})` : ''}\n` +
        `جواله: ${ticket.user_phone || 'غير مسجّل'}\n` +
        `الموضوع: ${String(ticket.subject).slice(0, 120)}\n` +
        `التفاصيل: ${String(ticket.message).slice(0, 600)}\n` +
        `الصفحة: ${ticket.page_path || '—'}`;

      await supabase.functions.invoke('dev-error-whatsapp', {
        body: { message: msg },
      });
    }
  } catch {
    /* الطابور احتياطي */
  }

  try {
    const { invokeJobsWorker } = await import('./platformJobs');
    await invokeJobsWorker(3);
  } catch {
    /* ignore */
  }

  return id;
}

export async function listMySupportTickets(): Promise<SupportTicket[]> {
  const { data, error } = await supabase
    .from('platform_support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []) as SupportTicket[];
}

export async function listAllSupportTickets(status?: SupportTicketStatus | 'all'): Promise<SupportTicket[]> {
  let q = supabase
    .from('platform_support_tickets')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (status && status !== 'all') q = q.eq('status', status);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as SupportTicket[];
}

export async function updateSupportTicketStatus(
  id: string,
  status: SupportTicketStatus,
  notes?: string,
): Promise<void> {
  const { error } = await supabase.rpc('dev_update_support_ticket', {
    p_id: id,
    p_status: status,
    p_notes: notes ?? null,
  });
  if (error) throw error;
}
