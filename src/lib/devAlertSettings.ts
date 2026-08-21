import { supabase } from './supabase';

export type DevAlertSettings = {
  enabled: boolean;
  whatsapp_phone: string;
  min_severity: 'warning' | 'error' | 'critical';
  include_warning: boolean;
};

export const DEFAULT_DEV_ALERT_SETTINGS: DevAlertSettings = {
  enabled: true,
  whatsapp_phone: '',
  min_severity: 'error',
  include_warning: false,
};

export async function getDevAlertSettings(): Promise<DevAlertSettings> {
  const { data, error } = await supabase.rpc('dev_get_alert_settings');
  if (error) throw error;
  const raw = (data ?? {}) as Partial<DevAlertSettings>;
  return {
    ...DEFAULT_DEV_ALERT_SETTINGS,
    ...raw,
    whatsapp_phone: String(raw.whatsapp_phone ?? ''),
    min_severity: (raw.min_severity as DevAlertSettings['min_severity']) || 'error',
  };
}

export async function saveDevAlertSettings(settings: DevAlertSettings): Promise<void> {
  const { error } = await supabase.rpc('dev_upsert_alert_settings', {
    p_value: {
      enabled: settings.enabled,
      whatsapp_phone: settings.whatsapp_phone,
      min_severity: settings.min_severity,
      include_warning: settings.include_warning,
    },
  });
  if (error) throw error;
}

export type SimulateErrorScenario = 'teacher_homework' | 'parent_portal' | 'api_500';

/** محاكاة خطأ مستخدم حقيقي → يسجّل + يرسل واتساب (اسم + جوال + مشكلة) */
export async function simulateRealisticUserError(
  scenario: SimulateErrorScenario = 'teacher_homework',
): Promise<string> {
  const { data, error } = await supabase.rpc('dev_simulate_user_error', {
    p_scenario: scenario,
  });
  if (error) throw error;
  const id = data as string;
  // تأكيد الإرسال الفوري من الواجهة
  await notifyDevWhatsAppForError(id);
  return id;
}

/** استدعاء فوري بعد تسجيل خطأ — لا يرمي؛ يشغّل العامل كاحتياطي */
export async function notifyDevWhatsAppForError(errorId: string | null | undefined): Promise<void> {
  if (!errorId) return;
  try {
    const { error } = await supabase.functions.invoke('dev-error-whatsapp', {
      body: { error_id: errorId },
    });
    if (error) console.warn('[devAlert] edge', error.message);
  } catch (e) {
    console.warn('[devAlert] notify failed', e);
  }
  // احتياطي: معالجة طابور التنبيه إن فشل الاستدعاء المباشر
  try {
    const { invokeJobsWorker } = await import('./platformJobs');
    await invokeJobsWorker(3);
  } catch {
    /* ignore */
  }
}
