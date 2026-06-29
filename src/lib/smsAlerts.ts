import { supabase } from './supabase';
import { saveSchoolSetting } from './schoolConfig';

export type SmsAlertConfig = {
  enabled: boolean;
  channel: 'sms' | 'whatsapp';
  absence_alerts: boolean;
  exam_alerts: boolean;
  school_name: string;
};

export type SmsAlertLogRow = {
  id: string;
  phone: string | null;
  message: string;
  channel: string;
  status: string;
  created_at: string;
};

const DEFAULT: SmsAlertConfig = {
  enabled: false,
  channel: 'sms',
  absence_alerts: true,
  exam_alerts: false,
  school_name: 'مدرسة النخبة',
};

export async function fetchSmsAlertConfig(): Promise<SmsAlertConfig> {
  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', 'sms_alert_config')
    .maybeSingle();
  if (error) throw error;
  const v = data?.value as Partial<SmsAlertConfig> | null;
  return { ...DEFAULT, ...v };
}

export async function saveSmsAlertConfig(config: SmsAlertConfig): Promise<void> {
  await saveSchoolSetting('sms_alert_config', config);
}

export async function fetchSmsAlertLog(limit = 20): Promise<SmsAlertLogRow[]> {
  const { data, error } = await supabase
    .from('sms_alert_log')
    .select('id, phone, message, channel, status, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as SmsAlertLogRow[];
}
