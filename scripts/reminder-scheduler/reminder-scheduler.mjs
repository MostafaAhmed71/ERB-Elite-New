/**
 * Academic WhatsApp auto-reminders (VPS / pm2)
 *
 * Homework (Sun–Thu): 11:00 and 11:30 — teachers without homework today
 * Weekly plan: Wed 11:00, Wed 18:00, Thu 18:00 — teachers without plan this week
 *
 * Week/semester: يُستخرج من semester_week_calendars إن وُجد، وإلا من auto_reminder_settings
 *
 * Env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, WHATSAPP_API_URL
 *      (يقبل أيضاً بادئة VITE_)
 *
 * اختبار يدوي:
 *   node reminder-scheduler.mjs --once --slot=hw
 *   node reminder-scheduler.mjs --once --slot=plan
 *   node reminder-scheduler.mjs --once --slot=status
 */

import { createClient } from '@supabase/supabase-js';
import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
loadEnv();
normalizeEnv();

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
let WHATSAPP_API_URL = (
  process.env.WHATSAPP_API_URL ||
  process.env.VITE_WHATSAPP_API_URL ||
  'https://wpp.northelite0.com'
).replace(/\/$/, '');
const TZ = process.env.TZ || 'Asia/Riyadh';

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const DEFAULT_SETTINGS = {
  enabled: true,
  homework_enabled: true,
  weekly_plan_enabled: true,
  semester: 1,
  week_number: 1,
  homework_times: ['11:00', '11:30'],
  weekly_plan_slots: [
    { weekday: 3, time: '11:00' },
    { weekday: 3, time: '18:00' },
    { weekday: 4, time: '18:00' },
  ],
};

const WEEKDAY_TO_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
const SCHOOL_DAYS = new Set([0, 1, 2, 3, 4]); // أحد–خميس

function pad2(n) {
  return String(n).padStart(2, '0');
}

function normalizeTime(raw) {
  const m = String(raw || '').trim().match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return `${pad2(h)}:${pad2(min)}`;
}

function normalizeSettings(raw) {
  const base = { ...DEFAULT_SETTINGS, ...(raw && typeof raw === 'object' ? raw : {}) };
  const semester = base.semester === 2 ? 2 : 1;
  const week_number = Math.max(1, Number(base.week_number) || 1);

  let homework_times = DEFAULT_SETTINGS.homework_times;
  if (Array.isArray(raw?.homework_times)) {
    homework_times = raw.homework_times.map(normalizeTime).filter(Boolean);
    if (!homework_times.length) homework_times = [...DEFAULT_SETTINGS.homework_times];
  }

  let weekly_plan_slots = DEFAULT_SETTINGS.weekly_plan_slots;
  if (Array.isArray(raw?.weekly_plan_slots)) {
    weekly_plan_slots = raw.weekly_plan_slots
      .map((s) => {
        const time = normalizeTime(s?.time);
        const weekday = Number(s?.weekday);
        if (!time || !Number.isFinite(weekday) || weekday < 0 || weekday > 6) return null;
        return { weekday, time };
      })
      .filter(Boolean);
    if (!weekly_plan_slots.length) weekly_plan_slots = [...DEFAULT_SETTINGS.weekly_plan_slots];
  }

  return {
    enabled: !!base.enabled,
    homework_enabled: !!base.homework_enabled,
    weekly_plan_enabled: !!base.weekly_plan_enabled,
    semester,
    week_number,
    homework_times: [...new Set(homework_times)].sort(),
    weekly_plan_slots,
  };
}

function loadEnv() {
  const candidates = [
    path.join(__dirname, '.env'),
    path.join(__dirname, '../../.env'),
  ];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 1) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (!process.env[k]) process.env[k] = v;
    }
    console.log('Loaded env from', p);
    break;
  }
}

function normalizeEnv() {
  if (!process.env.SUPABASE_URL && process.env.VITE_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY && process.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
    process.env.SUPABASE_SERVICE_ROLE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;
  }
  if (!process.env.WHATSAPP_API_URL && process.env.VITE_WHATSAPP_API_URL) {
    process.env.WHATSAPP_API_URL = process.env.VITE_WHATSAPP_API_URL;
  }
}

function riyadhNow() {
  const d = new Date();
  const date = d.toLocaleDateString('en-CA', { timeZone: TZ });
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'short' }).format(d);
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  return { date, weekday, hour, minute };
}

/** تاريخ Riyadh كـ Date محلي للمقارنة مع تقويم الأسابيع (YYYY-MM-DD) */
function riyadhDateObject(isoDate) {
  const [y, m, d] = String(isoDate).split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function formatArDate(iso) {
  try {
    return new Date(iso + 'T12:00:00').toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: TZ,
    });
  } catch {
    return iso;
  }
}

function buildHomeworkMessage(name, dateLabel) {
  return (
    `السلام عليكم ${name}،\n\n` +
    `تذكير تلقائي من إدارة المدرسة:\n` +
    `يرجى إدخال *الواجب المنزلي* لتاريخ ${dateLabel} عبر تطبيق الشؤون الأكاديمية.\n\n` +
    `شكراً لتعاونكم`
  );
}

function buildPlanMessage(name, weekLabel) {
  return (
    `السلام عليكم ${name}،\n\n` +
    `تذكير تلقائي من إدارة المدرسة:\n` +
    `يرجى إكمال *الخطة الأسبوعية* (${weekLabel}) من التطبيق في أقرب وقت.\n\n` +
    `شكراً لتعاونكم`
  );
}

async function getConfigValue(key) {
  const { data, error } = await supabase
    .from('academic_config')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  if (error) throw error;
  return data?.value;
}

async function getSettings() {
  const value = await getConfigValue('auto_reminder_settings');
  return normalizeSettings(value);
}

async function refreshWhatsAppUrlFromDb() {
  try {
    const value = await getConfigValue('whatsapp_api_url');
    let url = '';
    if (typeof value === 'string') url = value;
    else if (value && typeof value === 'object' && typeof value.url === 'string') url = value.url;
    url = String(url || '').trim().replace(/^"|"$/g, '').replace(/\/$/, '');
    if (url) {
      WHATSAPP_API_URL = url;
      console.log('WhatsApp URL from DB:', WHATSAPP_API_URL);
    }
  } catch (err) {
    console.warn('Could not read whatsapp_api_url from DB:', err.message);
  }
}

function normalizeWeekCalendars(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { calendars: {} };
  const obj = raw;
  const calendars = {};
  for (const sem of [1, 2]) {
    const list = obj.calendars?.[String(sem)] ?? obj.calendars?.[sem];
    if (!Array.isArray(list)) continue;
    calendars[sem] = list
      .filter((w) => w && typeof w.week_number === 'number')
      .map((w) => ({
        week_number: w.week_number,
        start_date: String(w.start_date ?? '').slice(0, 10),
        end_date: String(w.end_date ?? '').slice(0, 10),
      }))
      .filter((w) => w.start_date && w.end_date);
  }
  return { calendars };
}

function isDateInWeekRange(dateObj, range) {
  const t = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate()).getTime();
  const [ys, ms, ds] = range.start_date.split('-').map(Number);
  const [ye, me, de] = range.end_date.split('-').map(Number);
  const s = new Date(ys, ms - 1, ds).getTime();
  const e = new Date(ye, me - 1, de).getTime();
  return t >= s && t <= e;
}

async function resolveActiveSemesterWeek(settings) {
  const { date } = riyadhNow();
  const dateObj = riyadhDateObject(date);

  try {
    const raw = await getConfigValue('semester_week_calendars');
    const config = normalizeWeekCalendars(raw);
    for (const semester of [1, 2]) {
      const weeks = config.calendars[semester];
      if (!weeks?.length) continue;
      for (const range of weeks) {
        if (isDateInWeekRange(dateObj, range)) {
          console.log(
            `[week] from calendar → semester=${semester} week=${range.week_number} (${range.start_date}–${range.end_date})`,
          );
          return {
            semester,
            week: range.week_number,
            source: 'calendar',
            range,
          };
        }
      }
    }
    console.warn('[week] no calendar match for', date, '— fallback to settings');
  } catch (err) {
    console.warn('[week] calendar read failed:', err.message);
  }

  const semester = settings.semester === 2 ? 2 : 1;
  const week = Math.max(1, Number(settings.week_number) || 1);
  console.log(`[week] from settings → semester=${semester} week=${week}`);
  return { semester, week, source: 'settings' };
}

async function listTeachers() {
  const { data, error } = await supabase
    .from('users')
    .select('id, full_name, phone')
    .eq('role', 'teacher')
    .eq('is_active', true);
  if (error) throw error;
  return data ?? [];
}

async function getMissingHomeworkTeachers(date) {
  const teachers = await listTeachers();
  const { data: homeworks, error } = await supabase
    .from('academic_homeworks')
    .select('teacher_id')
    .eq('date', date);
  if (error) throw error;
  const done = new Set((homeworks ?? []).map((h) => h.teacher_id));
  return teachers.filter((t) => !done.has(t.id));
}

/**
 * مطابق لمنطق المراقبة: المعلم مكتمل فقط إذا وُجدت حصة بموضوع درس غير فارغ
 * (في الخطة المشتركة قد يكون المعلم في entries.teacher_id)
 */
async function getMissingPlanTeachers(semester, week) {
  const teachers = await listTeachers();
  const { data: plans, error } = await supabase
    .from('academic_weekly_plans')
    .select('teacher_id, semester, week_number, entries');
  if (error) throw error;

  const done = new Set();
  for (const p of plans ?? []) {
    const planSemester = p.semester ?? 1;
    if (planSemester !== semester || p.week_number !== week) continue;
    const entries = Array.isArray(p.entries) ? p.entries : [];
    for (const entry of entries) {
      if (!entry?.lesson_topic?.trim()) continue;
      const ownerId = entry.teacher_id || p.teacher_id;
      if (ownerId) done.add(ownerId);
    }
  }
  return teachers.filter((t) => !done.has(t.id));
}

/** يُعاد إرسال الفاشل — فقط الناجح يُمنع تكراره لنفس الـ slot */
async function alreadySent(slotKey, teacherId) {
  const { data, error } = await supabase
    .from('academic_reminder_log')
    .select('id, status')
    .eq('slot_key', slotKey)
    .eq('teacher_id', teacherId)
    .eq('status', 'sent')
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function logSend(slotKey, teacherId, phone, type, status, errorMessage = null) {
  const { error } = await supabase.from('academic_reminder_log').upsert(
    {
      slot_key: slotKey,
      teacher_id: teacherId,
      reminder_type: type,
      phone: phone ?? null,
      status,
      error_message: errorMessage,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'slot_key,teacher_id' },
  );
  if (error) console.warn('[log] upsert failed:', error.message);
}

async function checkWhatsAppReady() {
  try {
    const res = await fetch(`${WHATSAPP_API_URL}/status`, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { ok: false, detail: `HTTP ${res.status}` };
    const data = await res.json();
    const connected = !!(data.connected || data.status === 'connected');
    return {
      ok: connected,
      detail: `status=${data.status} connected=${connected} version=${data.version ?? '?'}`,
    };
  } catch (err) {
    return { ok: false, detail: err.message };
  }
}

async function sendBulk(messages) {
  if (!messages.length) return { sent: 0, failed: 0, report: [] };
  const res = await fetch(`${WHATSAPP_API_URL}/send-bulk-text`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal: AbortSignal.timeout(180000),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`WhatsApp API ${res.status}: ${text}`);
  }
  return res.json();
}

async function remindTeachers({ type, slotKey, teachers, buildMessage }) {
  const withPhone = teachers.filter((t) => t.phone?.trim());
  const toSend = [];
  for (const t of withPhone) {
    if (await alreadySent(slotKey, t.id)) continue;
    toSend.push({
      teacher: t,
      phone: t.phone.trim(),
      message: buildMessage(t),
    });
  }
  if (!toSend.length) {
    console.log(
      `[${slotKey}] nothing to send (missing=${teachers.length}, withPhone=${withPhone.length})`,
    );
    return;
  }

  const wa = await checkWhatsAppReady();
  console.log(`[${slotKey}] WhatsApp: ${wa.detail}`);
  if (!wa.ok) {
    console.error(`[${slotKey}] skip send — WhatsApp not connected`);
    for (const item of toSend) {
      await logSend(
        slotKey,
        item.teacher.id,
        item.phone,
        type,
        'failed',
        `واتساب غير متصل: ${wa.detail}`,
      );
    }
    return;
  }

  console.log(`[${slotKey}] sending ${toSend.length} reminders...`);
  try {
    const result = await sendBulk(toSend.map((x) => ({ phone: x.phone, message: x.message })));
    const report = Array.isArray(result.report) ? result.report : [];
    let sent = 0;
    let failed = 0;

    if (report.length) {
      const byPhone = new Map(report.map((r) => [String(r.phone || '').replace(/\D/g, ''), r]));
      for (const item of toSend) {
        const digits = item.phone.replace(/\D/g, '');
        const row = byPhone.get(digits) || byPhone.get(item.phone);
        if (row?.status === 'sent') {
          sent += 1;
          await logSend(slotKey, item.teacher.id, item.phone, type, 'sent');
        } else {
          failed += 1;
          await logSend(
            slotKey,
            item.teacher.id,
            item.phone,
            type,
            'failed',
            row?.reason || 'فشل الإرسال',
          );
        }
      }
    } else {
      const claimedFailed = Number(result.failed ?? 0);
      if (claimedFailed > 0 && Number(result.sent ?? 0) === 0) {
        for (const item of toSend) {
          failed += 1;
          await logSend(slotKey, item.teacher.id, item.phone, type, 'failed', 'فشل جماعي بدون تقرير');
        }
      } else {
        for (const item of toSend) {
          sent += 1;
          await logSend(slotKey, item.teacher.id, item.phone, type, 'sent');
        }
      }
      console.log(
        `[${slotKey}] bulk without detailed report sent=${result.sent ?? sent} failed=${result.failed ?? failed}`,
      );
    }

    console.log(`[${slotKey}] done sent=${sent} failed=${failed}`);
  } catch (err) {
    console.error(`[${slotKey}] bulk failed:`, err.message);
    for (const item of toSend) {
      await logSend(slotKey, item.teacher.id, item.phone, type, 'failed', err.message);
    }
  }

  const noPhone = teachers.filter((t) => !t.phone?.trim());
  if (noPhone.length) {
    console.log(`[${slotKey}] ${noPhone.length} teachers without phone`);
  }
}

async function runHomeworkReminder(timeLabel) {
  const settings = await getSettings();
  if (!settings.enabled || !settings.homework_enabled) {
    console.log(`[hw ${timeLabel}] skipped — disabled in settings`);
    return;
  }

  await refreshWhatsAppUrlFromDb();

  const { date, weekday } = riyadhNow();
  const schoolDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu'];
  if (!schoolDays.includes(weekday)) {
    console.log(`[hw ${timeLabel}] skip — weekend (${weekday})`);
    return;
  }

  const slotKey = `hw:${date}:${timeLabel}`;
  const missing = await getMissingHomeworkTeachers(date);
  console.log(`[hw ${timeLabel}] date=${date} missing=${missing.length}`);
  const dateLabel = formatArDate(date);
  await remindTeachers({
    type: 'homework',
    slotKey,
    teachers: missing,
    buildMessage: (t) => buildHomeworkMessage(t.full_name, dateLabel),
  });
}

async function runWeeklyPlanReminder(slotId, opts = {}) {
  const settings = await getSettings();
  if (!settings.enabled || !settings.weekly_plan_enabled) {
    console.log(`[plan ${slotId}] skipped — disabled in settings`);
    return;
  }

  await refreshWhatsAppUrlFromDb();

  const now = riyadhNow();
  const { date, weekday } = now;
  const weekdayIndex = WEEKDAY_TO_INDEX[weekday];

  if (!opts.force) {
    const m = String(slotId).match(/^d(\d)_(.+)$/);
    if (m) {
      const expectedDay = Number(m[1]);
      const expectedTime = normalizeTime(m[2]);
      const nowTime = `${pad2(now.hour)}:${pad2(now.minute)}`;
      if (weekdayIndex !== expectedDay || nowTime !== expectedTime) {
        console.log(`[plan ${slotId}] skip — today=${weekday} now=${nowTime}`);
        return;
      }
    } else {
      // توافق خلفي مع المعرفات القديمة
      const legacy = {
        wed_11: weekday === 'Wed',
        wed_18: weekday === 'Wed',
        thu_18: weekday === 'Thu',
      };
      if (legacy[slotId] === false) {
        console.log(`[plan ${slotId}] skip — today is ${weekday}`);
        return;
      }
    }
  }

  const active = await resolveActiveSemesterWeek(settings);
  const { semester, week } = active;
  const slotKey = `plan:s${semester}-w${week}:${slotId}:${date}`;
  const weekLabel =
    semester === 2 ? `الفصل الثاني — الأسبوع ${week}` : `الفصل الأول — الأسبوع ${week}`;
  const missing = await getMissingPlanTeachers(semester, week);
  console.log(`[plan ${slotId}] ${weekLabel} source=${active.source} missing=${missing.length}`);
  await remindTeachers({
    type: 'weekly_plan',
    slotKey,
    teachers: missing,
    buildMessage: (t) => buildPlanMessage(t.full_name, weekLabel),
  });
}

async function tickFromSettings() {
  const settings = await getSettings();
  if (!settings.enabled) return;

  const now = riyadhNow();
  const timeLabel = `${pad2(now.hour)}:${pad2(now.minute)}`;
  const weekdayIndex = WEEKDAY_TO_INDEX[now.weekday];

  if (settings.homework_enabled && SCHOOL_DAYS.has(weekdayIndex)) {
    if (settings.homework_times.includes(timeLabel)) {
      console.log(`[tick] homework match ${timeLabel}`);
      await runHomeworkReminder(timeLabel);
    }
  }

  if (settings.weekly_plan_enabled) {
    for (const slot of settings.weekly_plan_slots) {
      if (slot.weekday === weekdayIndex && slot.time === timeLabel) {
        const slotId = `d${slot.weekday}_${slot.time}`;
        console.log(`[tick] weekly plan match ${slotId}`);
        await runWeeklyPlanReminder(slotId, { force: true });
      }
    }
  }
}

async function printStatus() {
  await refreshWhatsAppUrlFromDb();
  const settings = await getSettings();
  const now = riyadhNow();
  const active = await resolveActiveSemesterWeek(settings);
  const wa = await checkWhatsAppReady();
  const missingHw = await getMissingHomeworkTeachers(now.date);
  const missingPlan = await getMissingPlanTeachers(active.semester, active.week);
  console.log('--- status ---');
  console.log('now:', now);
  console.log('settings:', settings);
  console.log('active week:', active);
  console.log('WhatsApp:', WHATSAPP_API_URL, wa.detail);
  console.log('missing homework today:', missingHw.length);
  console.log('missing weekly plan:', missingPlan.length);
  console.log(
    'with phone (hw):',
    missingHw.filter((t) => t.phone?.trim()).length,
  );
  console.log(
    'with phone (plan):',
    missingPlan.filter((t) => t.phone?.trim()).length,
  );
}

async function main() {
  const once = process.argv.includes('--once');
  const slotArg = process.argv.find((a) => a.startsWith('--slot='));
  const force = process.argv.includes('--force');

  console.log('Academic reminder scheduler');
  console.log('WhatsApp:', WHATSAPP_API_URL);
  console.log('Timezone:', TZ);
  await refreshWhatsAppUrlFromDb();

  if (once || slotArg) {
    const slot = slotArg ? slotArg.split('=')[1] : 'hw';
    if (slot === 'status') {
      await printStatus();
      return;
    }
    if (slot === 'hw') {
      if (force) {
        // تجاوز فحص يوم الأسبوع للاختبار فقط
        const settings = await getSettings();
        if (!settings.enabled || !settings.homework_enabled) {
          console.log('homework disabled');
          return;
        }
        const { date } = riyadhNow();
        const slotKey = `hw:${date}:manual`;
        const missing = await getMissingHomeworkTeachers(date);
        await remindTeachers({
          type: 'homework',
          slotKey,
          teachers: missing,
          buildMessage: (t) => buildHomeworkMessage(t.full_name, formatArDate(date)),
        });
      } else {
        await runHomeworkReminder('11:00');
      }
    } else if (slot === 'plan') {
      if (force) {
        const settings = await getSettings();
        if (!settings.enabled || !settings.weekly_plan_enabled) {
          console.log('weekly plan disabled');
          return;
        }
        const { date } = riyadhNow();
        const active = await resolveActiveSemesterWeek(settings);
        const slotKey = `plan:s${active.semester}-w${active.week}:manual:${date}`;
        const weekLabel =
          active.semester === 2
            ? `الفصل الثاني — الأسبوع ${active.week}`
            : `الفصل الأول — الأسبوع ${active.week}`;
        const missing = await getMissingPlanTeachers(active.semester, active.week);
        await remindTeachers({
          type: 'weekly_plan',
          slotKey,
          teachers: missing,
          buildMessage: (t) => buildPlanMessage(t.full_name, weekLabel),
        });
      } else {
        // شغّل أول موعد خطة مضبوط (أو الأربعاء 11 إن لم يوجد)
        const settings = await getSettings();
        const slot = settings.weekly_plan_slots[0] || { weekday: 3, time: '11:00' };
        await runWeeklyPlanReminder(`d${slot.weekday}_${slot.time}`, { force: true });
      }
    } else {
      console.log('Unknown slot. Use --slot=hw | plan | status');
    }
    return;
  }

  cron.schedule(
    '* * * * *',
    () => {
      tickFromSettings().catch((e) => console.error('tick', e));
    },
    { timezone: TZ },
  );
  console.log('Scheduler running — reads times from academic settings every minute');
  printStatus().catch((e) => console.warn('startup status failed:', e.message));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
