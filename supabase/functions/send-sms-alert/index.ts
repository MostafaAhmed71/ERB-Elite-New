/**
 * send-sms-alert — إرسال SMS أو WhatsApp عبر Twilio
 *
 * متغيرات البيئة:
 * - SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 * - TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
 * - TWILIO_SMS_FROM (مثل +9665xxxxxxx)
 * - TWILIO_WHATSAPP_FROM (مثل whatsapp:+14155238886) — اختياري
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SmsBody = {
  log_id?: string;
  phone: string;
  message: string;
  channel?: 'sms' | 'whatsapp';
  school_name?: string;
};

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('966')) return '+' + digits;
  if (digits.startsWith('0')) return '+966' + digits.slice(1);
  if (digits.length === 9) return '+966' + digits;
  return phone.startsWith('+') ? phone : '+' + digits;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const smsFrom = Deno.env.get('TWILIO_SMS_FROM');
    const whatsappFrom = Deno.env.get('TWILIO_WHATSAPP_FROM');

    if (!serviceKey || !supabaseUrl || !twilioSid || !twilioToken || !smsFrom) {
      return new Response(
        JSON.stringify({ error: 'SMS not configured — missing Twilio keys' }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      );
    }

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.includes(serviceKey)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = (await req.json()) as SmsBody;
    if (!payload.phone || !payload.message) {
      return new Response(JSON.stringify({ error: 'phone and message required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const channel = payload.channel ?? 'sms';
    const to = normalizePhone(payload.phone);
    const prefix = payload.school_name ? `[${payload.school_name}] ` : '';
    const bodyText = prefix + payload.message;

    const from =
      channel === 'whatsapp' && whatsappFrom
        ? whatsappFrom
        : smsFrom;

    const toFormatted = channel === 'whatsapp' ? `whatsapp:${to}` : to;

    const form = new URLSearchParams();
    form.set('To', toFormatted);
    form.set('From', from);
    form.set('Body', bodyText);

    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + btoa(`${twilioSid}:${twilioToken}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      },
    );

    const supabase = createClient(supabaseUrl, serviceKey);
    const status = twilioRes.ok ? 'sent' : 'failed';
    const errText = twilioRes.ok ? null : await twilioRes.text();

    if (payload.log_id) {
      await supabase
        .from('sms_alert_log')
        .update({ status, error_msg: errText?.slice(0, 500) ?? null })
        .eq('id', payload.log_id);
    }

    if (!twilioRes.ok) {
      return new Response(JSON.stringify({ error: errText }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ sent: true, channel }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
