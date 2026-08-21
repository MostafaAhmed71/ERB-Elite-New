/**
 * WhatsApp Unified Server (OTP + تذكيرات + نتائج OMR)
 * WPPConnect — ملف واحد لكل المهام على الـ VPS
 *
 * تشغيل: node whatsapp-server.js
 * المنفذ الافتراضي: 3001
 *
 * المسارات:
 *   GET  /status | /health | /getconnectionstatus | /qr | /qr-json
 *   POST /send-text | /sendText | /{session}/sendText
 *   POST /send-bulk-text | /send-image | /send-result | /send-bulk
 *   POST /pair-phone | /logout | /reset | /reconnect
 */

import wppconnect from '@wppconnect-team/wppconnect';
import express from 'express';
import cors from 'cors';
import { createCanvas } from '@napi-rs/canvas';
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3001;
const HOST = process.env.HOST || '0.0.0.0';
/** اسم الجلسة — على VPS الحالي استخدم control-school (لا تغيّره إن كانت التوكنات موجودة) */
const SESSION_NAME =
  process.env.OPENWA_SESSION || process.env.SESSION_NAME || 'control-school';
const SESSION_TOKEN_DIR = path.join(__dirname, 'tokens', SESSION_NAME);

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

let wppClient = null;
/** disconnected | connecting | qr | connected */
let sessionStatus = 'disconnected';
let rawWppStatus = '';
let latestQRBase64 = '';
let latestPairingCode = '';
let pairingPhone = '';
let isStarting = false;
let startupError = '';

function isConnected() {
  return !!wppClient && sessionStatus === 'connected';
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function uniqueIds(ids) {
  return [...new Set(ids.filter(Boolean))];
}

/* ─────────── Chrome / Chromium ─────────── */
function resolveChromeExecutable() {
  const candidates = [
    process.env.CHROME_PATH,
    process.env.PUPPETEER_EXECUTABLE_PATH,
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
    '/snap/chromium/current/usr/lib/chromium-browser/chrome',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google', 'Chrome', 'Application', 'chrome.exe'),
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Microsoft', 'Edge', 'Application', 'msedge.exe'),
  ].filter(Boolean);

  if (process.platform !== 'win32') {
    try {
      const snapRoot = '/snap/chromium';
      if (fs.existsSync(snapRoot)) {
        for (const ver of fs.readdirSync(snapRoot)) {
          const p = path.join(snapRoot, ver, 'usr/lib/chromium-browser/chrome');
          if (fs.existsSync(p)) candidates.push(p);
        }
      }
    } catch {
      /* ignore */
    }
  }

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

async function killSessionBrowsers() {
  const tokenNeedle = SESSION_TOKEN_DIR.replace(/\\/g, '/');
  if (process.platform === 'win32') {
    try {
      await execAsync(`taskkill /F /IM chrome.exe /T 2>nul`);
      await execAsync(`taskkill /F /IM msedge.exe /T 2>nul`);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    await execAsync(`pkill -f "${tokenNeedle}" 2>/dev/null || true`);
    await execAsync(`pkill -f "${SESSION_NAME}" 2>/dev/null || true`);
  } catch {
    /* ignore */
  }
  await sleep(800);
}

/* ─────────── Phone / LID helpers (OTP-safe) ─────────── */
function normalizeChatId(value) {
  if (!value || typeof value !== 'string') return null;
  if (value.endsWith('@c.us') || value.endsWith('@g.us') || value.endsWith('@lid')) {
    return value;
  }

  const digits = value.replace(/\D/g, '');
  if (!digits) return null;

  if (digits.startsWith('966') && digits.length >= 12) {
    return `${digits}@c.us`;
  }
  if (digits.startsWith('05') && digits.length === 10) {
    return `966${digits.slice(1)}@c.us`;
  }
  if (digits.startsWith('5') && digits.length === 9) {
    return `966${digits}@c.us`;
  }
  return `${digits}@c.us`;
}

function formatPhone(phone) {
  const id = normalizeChatId(String(phone));
  if (!id) throw new Error('رقم الهاتف غير صالح');
  return id;
}

function extractLidId(entry) {
  if (!entry) return null;
  const candidates = [
    entry?.lid?._serialized,
    entry?.lid?.id?._serialized,
    entry?.lid?.id,
    typeof entry?.lid === 'string' ? entry.lid : null,
    entry?.lidUser ? `${entry.lidUser}@lid` : null,
    entry?.user ? (String(entry.user).includes('@') ? entry.user : null) : null,
  ];
  for (const c of candidates) {
    if (!c) continue;
    const s = String(c);
    if (s.endsWith('@lid')) return s;
    if (/^\d+$/.test(s)) return `${s}@lid`;
  }
  return null;
}

function isMessageLookupGhostError(error) {
  const msg = error instanceof Error ? error.message : String(error || '');
  const stack = error instanceof Error ? String(error.stack || '') : '';
  const blob = `${msg}\n${stack}`;
  // WPPConnect غالباً يُرسل الرسالة ثم يفشل في قراءة الرسالة المُرجَعة (wapi.js)
  return (
    /Message .+ not found/i.test(blob)
    || /message not found/i.test(blob)
    || /getMessageById/i.test(blob)
    || /wapi\.js/i.test(blob)
    || /Object\.e\s*\(/i.test(blob)
    || /serialize/i.test(msg)
    || /Cannot read propert.*(id|_serialized|ack)/i.test(blob)
  );
}

function isFailedSendResult(result) {
  return !!(result && (result.isSendFailure === true || result.ack === -1));
}

function isSessionBrokenError(err) {
  const msg = (err?.message || String(err)).toLowerCase();
  return (
    msg.includes('detached frame') ||
    msg.includes('target closed') ||
    msg.includes('session closed') ||
    msg.includes('protocol error') ||
    msg.includes('connection closed') ||
    msg.includes('browser has disconnected') ||
    msg.includes('page has been closed')
  );
}

function humanizeServerSendError(err) {
  if (isMessageLookupGhostError(err)) {
    return 'أُرسلت الرسالة (تحذير تقني من واتساب بعد التسليم)';
  }
  const msg = err instanceof Error ? err.message : String(err || '');
  if (/wapi\.js|Object\.e\s*\(/i.test(msg)) {
    return 'أُرسلت الرسالة (تحذير تقني من واتساب بعد التسليم)';
  }
  return msg || 'فشل الإرسال';
}

async function resolveSendTargets(rawPhone) {
  const pnId = normalizeChatId(String(rawPhone));
  if (!pnId) throw new Error('رقم الهاتف غير صالح');

  const status = await wppClient.checkNumberStatus(pnId);
  if (!status?.canReceiveMessage || !status?.id?._serialized) {
    throw new Error('هذا الرقم غير متاح على واتساب');
  }

  const resolvedId = status.id._serialized;
  let lidId = resolvedId.endsWith('@lid') ? resolvedId : null;

  try {
    if (typeof wppClient.getPnLidEntry === 'function') {
      const entry = await wppClient.getPnLidEntry(pnId);
      const fromEntry = extractLidId(entry);
      if (fromEntry) lidId = fromEntry;
    }
  } catch (err) {
    console.warn('[WPP] getPnLidEntry skipped:', err instanceof Error ? err.message : err);
  }

  try {
    const statusLid = status?.lid?._serialized || status?.lid || status?.id?.lid;
    if (statusLid) {
      const s = String(statusLid);
      lidId = s.includes('@') ? s : `${s}@lid`;
    }
  } catch {
    /* ignore */
  }

  let migrated = false;
  try {
    if (typeof wppClient.isLidMigrated === 'function') {
      migrated = !!(await wppClient.isLidMigrated());
    }
  } catch {
    /* ignore */
  }

  let targets;
  if (migrated && lidId) {
    targets = [lidId];
  } else if (lidId) {
    targets = uniqueIds([lidId, pnId]);
  } else {
    targets = uniqueIds([resolvedId, pnId]);
  }

  console.log(
    `[WPP] resolve pn=${pnId} resolved=${resolvedId} lid=${lidId} migrated=${migrated} targets=${targets.join(',')}`,
  );
  return { pnId, resolvedId, lidId, migrated, targets };
}

async function trySendText(chatId, message) {
  const optionSets = [
    { createChat: true, waitForAck: true },
    { createChat: true },
    undefined,
  ];
  let lastError;
  for (const options of optionSets) {
    try {
      if (options) return await wppClient.sendText(chatId, message, options);
      return await wppClient.sendText(chatId, message);
    } catch (error) {
      lastError = error;
      const msg = error instanceof Error ? error.message : String(error);
      if (/options|argument|parameter|is not a function/i.test(msg)) continue;
      throw error;
    }
  }
  throw lastError;
}

async function sendTextWithRetry(targets, message) {
  let lastError;
  let lastResult = null;
  let lastChatId = targets[0];

  for (const chatId of targets) {
    lastChatId = chatId;
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        console.log(`[WPP] sendText try chatId=${chatId} attempt=${attempt}`);
        const result = await trySendText(chatId, message);

        if (isFailedSendResult(result)) {
          lastResult = result;
          lastError = new Error(`واتساب رفض الإرسال (isSendFailure) إلى ${chatId}`);
          console.warn(`[WPP] ${lastError.message}`);
          await sleep(500);
          continue;
        }

        return { result, softOk: false, chatId };
      } catch (error) {
        lastError = error;
        const ghost = isMessageLookupGhostError(error);
        console.warn(
          `[WPP] sendText attempt ${attempt} chatId=${chatId} ghost=${ghost}:`,
          error instanceof Error ? error.message : error,
        );

        // الرسالة غالباً وصلت — خطأ القراءة بعد الإرسال لا يُعد فشلاً
        if (ghost) {
          return {
            result: null,
            softOk: true,
            warning: error instanceof Error ? error.message : String(error),
            chatId,
          };
        }
      }
    }
  }

  if (isFailedSendResult(lastResult)) {
    throw new Error(
      'واتساب رفض تسليم الرسالة (isSendFailure). جرّب رسالة يدوية من جوال الجلسة ثم أعد المحاولة، أو أعد ربط QR.',
    );
  }
  throw lastError || new Error('فشل إرسال الرسالة النصية');
}

/** إرسال نص مع LID + استعادة الجلسة عند انقطاع Chromium */
async function sendTextSafe(rawPhone, message, maxRetries = 2) {
  let lastErr;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (!isConnected()) await softRecoverSession();
      const { targets, resolvedId, pnId } = await resolveSendTargets(rawPhone);
      const out = await sendTextWithRetry(targets, String(message));
      return { ...out, resolvedId, pnId };
    } catch (err) {
      lastErr = err;
      if (isSessionBrokenError(err) && attempt < maxRetries) {
        console.warn(`⚠️ جلسة منفصلة — إعادة محاولة ${attempt + 1}/${maxRetries}...`);
        await softRecoverSession();
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

/* ─────────── Session lifecycle ─────────── */
async function startWhatsApp(phoneNumber = null) {
  if (isStarting) {
    console.log('⏳ تهيئة واتساب قيد التنفيذ — تخطي');
    return wppClient;
  }
  isStarting = true;

  console.log(
    phoneNumber
      ? `🟡 تهيئة واتساب للربط بالرقم: ${phoneNumber}...`
      : `🟡 تهيئة واتساب (جلسة: ${SESSION_NAME})...`,
  );
  sessionStatus = 'connecting';
  pairingPhone = phoneNumber;
  latestPairingCode = '';
  startupError = '';

  try {
    const chromePath = resolveChromeExecutable();
    if (!chromePath) {
      throw new Error(
        'لم يُعثر على Google Chrome أو Chromium. ثبّت Chrome أو شغّل: npm run install-browser',
      );
    }
    console.log('🌐 المتصفح:', chromePath);

    const client = await wppconnect.create({
      session: SESSION_NAME,
      catchQR: (base64Qr) => {
        sessionStatus = 'qr';
        latestQRBase64 = base64Qr;
        latestPairingCode = '';
        console.log('🔳 QR Code جاهز');
      },
      phoneNumber: pairingPhone || undefined,
      catchLinkCode: (code) => {
        sessionStatus = 'qr';
        latestPairingCode = code;
        latestQRBase64 = '';
        console.log('🔢 Pairing Code:', code);
      },
      statusFind: (statusSession) => {
        rawWppStatus = statusSession;
        console.log('📱 حالة واتساب:', statusSession);
        if (
          statusSession === 'isLogged' ||
          statusSession === 'qrReadSuccess' ||
          statusSession === 'inChat'
        ) {
          sessionStatus = 'connected';
          latestQRBase64 = '';
          latestPairingCode = '';
        } else if (statusSession === 'notLogged' || statusSession === 'qrReadFail') {
          sessionStatus = 'qr';
        } else if (
          statusSession === 'browserClose' ||
          statusSession === 'disconnectedMobile' ||
          statusSession === 'serverClose'
        ) {
          sessionStatus = 'disconnected';
        }
      },
      headless: true,
      useChrome: true,
      puppeteerOptions: {
        executablePath: chromePath,
        userDataDir: SESSION_TOKEN_DIR,
      },
      tokenStore: 'file',
      folderNameToken: path.join(__dirname, 'tokens'),
      logQR: false,
      autoClose: 0,
      protocolTimeout: 120000,
      browserArgs: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--disable-gpu',
        '--disable-extensions',
      ],
    });

    wppClient = client;
    sessionStatus = 'connected';
    startupError = '';
    client.startPhoneWatchdog?.(30000);
    console.log(`✅ تم الاتصال بواتساب — جلسة "${SESSION_NAME}"`);
    return client;
  } catch (err) {
    sessionStatus = 'disconnected';
    startupError = err instanceof Error ? err.message : String(err);
    console.error('❌ فشل الاتصال:', startupError);
    throw err;
  } finally {
    isStarting = false;
  }
}

async function softRecoverSession() {
  console.log('🔄 استعادة جلسة واتساب...');
  if (wppClient) {
    try {
      await wppClient.close();
    } catch {
      /* ignore */
    }
    wppClient = null;
  }
  await killSessionBrowsers();
  sessionStatus = 'disconnected';
  isStarting = false;
  await sleep(2500);
  await startWhatsApp(pairingPhone || null);
  if (!isConnected()) {
    throw new Error('تعذّر استعادة جلسة واتساب — افتح /qr وامسح الرمز من جديد');
  }
}

async function logoutAndRestart({ phone = null, delayMs = 1200 } = {}) {
  console.log(phone ? `🔴 تسجيل خروج — ربط بالرقم: ${phone}` : '🔴 تسجيل خروج — جلسة جديدة (QR)...');

  if (wppClient) {
    try {
      await wppClient.logout();
    } catch {
      /* ignore */
    }
    try {
      await wppClient.close();
    } catch {
      /* ignore */
    }
    wppClient = null;
  }

  await killSessionBrowsers();

  sessionStatus = 'disconnected';
  latestQRBase64 = '';
  latestPairingCode = '';
  pairingPhone = phone || '';
  isStarting = false;
  startupError = '';

  if (fs.existsSync(SESSION_TOKEN_DIR)) {
    try {
      fs.rmSync(SESSION_TOKEN_DIR, { recursive: true, force: true });
    } catch (e) {
      console.warn('⚠️ تعذّر حذف مجلد الجلسة:', e.message);
    }
  }

  await sleep(delayMs);
  startWhatsApp(phone || null).catch((e) => console.error('❌ بدء بعد logout:', e.message));
}

/* ─────────── Result image (OMR) ─────────── */
function generateResultImage(result) {
  const W = 800;
  const H = 500;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  const passed = parseFloat(result.percentage) >= 50;
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, passed ? '#0f4c75' : '#6b0f0f');
  grad.addColorStop(1, passed ? '#1b262c' : '#1a0000');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 30;
  ctx.fillStyle = 'rgba(255,255,255,0.07)';
  roundRect(ctx, 40, 40, W - 80, H - 80, 20);
  ctx.restore();

  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = 'bold 18px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('نتيجة الاختبار', W / 2, 90);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px Arial';
  ctx.fillText(result.examTitle || 'اختبار OMR', W / 2, 125);

  ctx.font = 'bold 30px Arial';
  ctx.fillStyle = '#ffe082';
  ctx.fillText(result.studentName || 'الطالب', W / 2, 185);

  const scoreText = `${result.score} / ${result.total}`;
  const pctText = `${result.percentage}%`;
  const badgeColor = passed ? '#00c853' : '#f44336';

  ctx.beginPath();
  ctx.arc(W / 2, 290, 80, 0, Math.PI * 2);
  ctx.fillStyle = badgeColor;
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 36px Arial';
  ctx.fillText(scoreText, W / 2, 283);
  ctx.font = 'bold 20px Arial';
  ctx.fillText(pctText, W / 2, 313);

  ctx.font = 'bold 26px Arial';
  ctx.fillStyle = passed ? '#a5d6a7' : '#ef9a9a';
  ctx.fillText(passed ? '✓ ناجح' : '✗ راسب', W / 2, 400);

  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '14px Arial';
  ctx.fillText(new Date(result.timestamp || Date.now()).toLocaleDateString('ar-SA'), W / 2, 445);

  return canvas.toBuffer('image/png');
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function requireConnected(res) {
  if (!isConnected()) {
    res.status(503).json({
      ok: false,
      success: false,
      error: 'واتساب غير متصل — افتح /qr وامسح الكود',
      status: sessionStatus,
      startupError,
    });
    return false;
  }
  return true;
}

/* ─────────── Status / QR ─────────── */
function statusPayload() {
  return {
    ok: true,
    success: true,
    status: sessionStatus,
    connected: isConnected(),
    session: SESSION_NAME,
    rawStatus: rawWppStatus || sessionStatus,
    startupError: startupError || null,
    version: 3,
    features: [
      'send-text',
      'send-bulk-text',
      'send-result',
      'send-bulk',
      'send-image',
      'otp',
      'lid',
    ],
  };
}

app.get('/status', (_req, res) => res.json(statusPayload()));
app.get('/health', (_req, res) => res.json(statusPayload()));
app.get('/getconnectionstatus', (_req, res) =>
  res.json({
    ok: isConnected(),
    session: SESSION_NAME,
    status: sessionStatus,
    startupError: startupError || null,
  }),
);

app.get('/qr-json', (_req, res) => {
  res.json({
    status: sessionStatus,
    qr: latestQRBase64,
    pairingCode: latestPairingCode,
    connected: isConnected(),
  });
});

app.get('/qr', (_req, res) => {
  if (isConnected()) {
    return res.send(`
      <html dir="rtl" style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
        <h2 style="color: green;">✅ الواتساب متصل الآن!</h2>
        <p>الجلسة: <b>${SESSION_NAME}</b> — جاهز لإرسال OTP والتذكيرات والنتائج.</p>
        <script>setTimeout(() => location.reload(), 30000);</script>
      </html>
    `);
  }

  if (latestPairingCode) {
    return res.send(`
      <html dir="rtl" style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
        <h2>كود الربط</h2>
        <p style="font-size: 42px; letter-spacing: 8px; font-weight: bold;">${latestPairingCode}</p>
        <p>أدخل الكود في واتساب → الأجهزة المرتبطة</p>
        <script>setTimeout(() => location.reload(), 15000);</script>
      </html>
    `);
  }

  if (latestQRBase64 && sessionStatus !== 'disconnected') {
    return res.send(`
      <html dir="rtl" style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
        <h2>امسح الـ QR Code لتفعيل الإرسال</h2>
        <p style="color: gray;">التحديث التلقائي كل دقيقة</p>
        <img src="${latestQRBase64}" width="280" height="280" style="border: 1px solid #ccc; padding: 15px; border-radius: 10px;" />
        <script>setTimeout(() => location.reload(), 60000);</script>
      </html>
    `);
  }

  res.send(`
    <html dir="rtl" style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
      <h2 style="color: orange;">⏳ جاري إعداد الواتساب...</h2>
      <p>${startupError ? `خطأ: ${startupError}` : 'انتظر بضع ثوانٍ'}</p>
      <script>setTimeout(() => location.reload(), 3000);</script>
    </html>
  `);
});

/* ─────────── Session admin ─────────── */
app.post('/pair-phone', async (req, res) => {
  let { phone } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'رقم الجوال مطلوب' });

  try {
    let cleanPhone = String(phone).replace(/\D/g, '');
    if (cleanPhone.startsWith('05')) cleanPhone = '966' + cleanPhone.slice(1);
    else if (cleanPhone.startsWith('5') && cleanPhone.length === 9) cleanPhone = '966' + cleanPhone;

    await logoutAndRestart({ phone: cleanPhone });
    res.json({ success: true, ok: true, message: 'جاري توليد كود الربط...' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/logout', async (_req, res) => {
  try {
    await logoutAndRestart();
    res.json({ success: true, ok: true, message: 'تم تسجيل الخروج. امسح QR أو أدخل رقماً جديداً.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/reset', async (_req, res) => {
  try {
    await logoutAndRestart();
    res.json({ success: true, ok: true, message: 'تم إعادة التعيين، جاري التشغيل...' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/logout', async (_req, res) => {
  try {
    res.send(`
      <html dir="rtl" style="font-family: Arial, sans-serif; text-align: center; margin-top: 50px;">
        <h2 style="color: red;">👋 تم تسجيل الخروج</h2>
        <p>سيتم تحويلك لمسح الرمز الجديد...</p>
        <script>setTimeout(() => location.href = '/qr', 3000);</script>
      </html>
    `);
    await logoutAndRestart({ delayMs: 1000 });
  } catch (err) {
    res.status(500).send('خطأ في تسجيل الخروج: ' + err.message);
  }
});

app.post('/reconnect', async (_req, res) => {
  try {
    await softRecoverSession();
    res.json({ success: true, ok: true, connected: isConnected() });
  } catch (err) {
    sessionStatus = 'disconnected';
    res.status(503).json({ error: err.message });
  }
});

/* ─────────── Send text (OTP + تذكيرات) ─────────── */
async function handleSendText(req, res) {
  const body = req.body || {};
  const phone = body.phone || body.to || body?.args?.to;
  const message = body.message || body.content || body?.args?.content;

  if (!phone || !message) {
    return res.status(400).json({ error: 'phone/to و message/content مطلوبة' });
  }
  if (!requireConnected(res)) return;

  try {
    console.log(`[WPP] /send-text target=${String(phone)}`);
    const out = await sendTextSafe(String(phone), String(message));
    console.log(`[WPP] sendText ok chatId=${out.chatId} softOk=${!!out.softOk}`);
    res.json({
      ok: true,
      success: true,
      softOk: !!out.softOk,
      warning: out.warning || null,
      id: out.result?.id || null,
      chatId: out.chatId,
      resolvedId: out.resolvedId,
      message: `تم الإرسال إلى ${phone}`,
      result: out.result ?? null,
    });
  } catch (err) {
    console.error('❌ خطأ في الإرسال:', err.message);
    if (isMessageLookupGhostError(err)) {
      return res.json({
        ok: true,
        success: true,
        softOk: true,
        warning: err.message,
        message: `تم الإرسال إلى ${phone} (تحذير تقني بعد التسليم)`,
      });
    }
    const status = isSessionBrokenError(err) ? 503 : 500;
    res.status(status).json({
      ok: false,
      success: false,
      error: isSessionBrokenError(err)
        ? 'انقطعت جلسة واتساب — أعد المحاولة أو امسح QR من /qr'
        : humanizeServerSendError(err),
    });
  }
}

app.post('/send-text', handleSendText);
app.post('/sendText', handleSendText);
app.post(`/${SESSION_NAME}/sendText`, handleSendText);

/* ─────────── التحقق من وجود الرقم على واتساب ─────────── */
app.post('/check-number', async (req, res) => {
  const body = req.body || {};
  const phone = body.phone || body.to || body?.args?.to;
  if (!phone) {
    return res.status(400).json({ ok: false, exists: false, error: 'phone مطلوب' });
  }
  if (!requireConnected(res)) return;

  try {
    const pnId = normalizeChatId(String(phone));
    if (!pnId) {
      return res.status(400).json({ ok: false, exists: false, error: 'رقم الهاتف غير صالح' });
    }
    const status = await wppClient.checkNumberStatus(pnId);
    const exists = !!(status?.canReceiveMessage && status?.id?._serialized);
    if (!exists) {
      return res.json({
        ok: false,
        exists: false,
        error: 'هذا الرقم غير متاح على واتساب',
      });
    }
    return res.json({
      ok: true,
      exists: true,
      id: status.id._serialized,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/غير متاح|not exist|not registered|canReceiveMessage/i.test(msg)) {
      return res.json({ ok: false, exists: false, error: 'هذا الرقم غير متاح على واتساب' });
    }
    return res.status(500).json({
      ok: false,
      exists: false,
      error: humanizeServerSendError(err),
    });
  }
});

app.post('/send-bulk-text', async (req, res) => {
  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: 'قائمة الرسائل فارغة' });
  }
  if (!requireConnected(res)) return;

  const report = [];
  for (const item of messages) {
    if (!item?.phone || !item?.message) {
      report.push({ phone: item?.phone, status: 'skip', reason: 'بيانات ناقصة' });
      continue;
    }
    try {
      const out = await sendTextSafe(item.phone, item.message);
      report.push({
        phone: item.phone,
        status: 'sent',
        softOk: !!out.softOk,
        warning: out.warning || null,
      });
      await sleep(1500);
    } catch (err) {
      // احتياطي: إن مرّ الخطأ رغم الكشف — لا نعرض مسار wapi.js للمستخدم كفشل حقيقي
      if (isMessageLookupGhostError(err)) {
        report.push({
          phone: item.phone,
          status: 'sent',
          softOk: true,
          warning: err instanceof Error ? err.message : String(err),
        });
        await sleep(1500);
        continue;
      }
      report.push({
        phone: item.phone,
        status: 'error',
        reason: isSessionBrokenError(err)
          ? 'انقطعت جلسة واتساب — أعد المحاولة أو امسح QR'
          : humanizeServerSendError(err),
      });
    }
  }

  const sent = report.filter((r) => r.status === 'sent').length;
  const failed = report.length - sent;
  res.json({ success: true, ok: true, sent, failed, total: messages.length, report });
});

/* ─────────── Send image / results ─────────── */
app.post('/send-image', async (req, res) => {
  const { phone, imageBase64, base64, caption, message } = req.body || {};
  const img = imageBase64 || base64;
  if (!phone || !img) {
    return res.status(400).json({ error: 'phone و imageBase64 مطلوبان' });
  }
  if (!requireConnected(res)) return;

  try {
    const { targets } = await resolveSendTargets(String(phone));
    let lastErr;
    for (const chatId of targets) {
      try {
        const result = await wppClient.sendImageFromBase64(
          chatId,
          String(img),
          'image.png',
          String(caption || message || ''),
        );
        return res.json({
          ok: true,
          success: true,
          id: result?.id || null,
          chatId,
          message: `تم إرسال الصورة لـ ${phone}`,
          result,
        });
      } catch (err) {
        lastErr = err;
      }
    }
    throw lastErr || new Error('فشل إرسال الصورة');
  } catch (err) {
    console.error('❌ خطأ في الإرسال:', err.message);
    res.status(500).json({ ok: false, error: err.message });
  }
});

app.post('/send-result', async (req, res) => {
  const { phone, result } = req.body || {};
  if (!phone) return res.status(400).json({ error: 'رقم الجوال مطلوب' });
  if (!result) return res.status(400).json({ error: 'بيانات النتيجة مطلوبة' });
  if (!requireConnected(res)) return;

  try {
    const passed = parseFloat(result.percentage) >= 50;
    const msg =
      `📊 *نتيجة الاختبار*\n` +
      `👤 *الطالب:* ${result.studentName}\n` +
      `📝 *الاختبار:* ${result.examTitle || 'OMR'}\n` +
      `✏️ *الدرجة:* ${result.score} من ${result.total}\n` +
      `📈 *النسبة:* ${result.percentage}%\n` +
      `${passed ? '✅ *النتيجة: ناجح*' : '❌ *النتيجة: راسب*'}`;

    await sendTextSafe(phone, msg);

    const imgBuffer = generateResultImage(result);
    const base64Img = `data:image/png;base64,${imgBuffer.toString('base64')}`;
    const { targets } = await resolveSendTargets(String(phone));
    await wppClient.sendImageFromBase64(
      targets[0],
      base64Img,
      'result.png',
      `نتيجة ${result.studentName}`,
    );

    console.log(`✅ أُرسلت نتيجة ${result.studentName} إلى ${phone}`);
    res.json({ success: true, ok: true, message: `تم الإرسال إلى ${phone}` });
  } catch (err) {
    console.error('❌ خطأ في الإرسال:', err.message);
    res.status(500).json({ error: err.message });
  }
});

app.post('/send-bulk', async (req, res) => {
  const { results } = req.body || {};
  if (!Array.isArray(results) || results.length === 0) {
    return res.status(400).json({ error: 'القائمة فارغة' });
  }
  if (!requireConnected(res)) return;

  const report = [];
  for (const item of results) {
    if (!item.phone || !item.result) {
      report.push({ name: item.result?.studentName || '?', status: 'skip', reason: 'لا يوجد رقم' });
      continue;
    }
    try {
      const passed = parseFloat(item.result.percentage) >= 50;
      const msg =
        `📊 *نتيجة الاختبار*\n` +
        `👤 *الطالب:* ${item.result.studentName}\n` +
        `📝 *الاختبار:* ${item.result.examTitle || 'OMR'}\n` +
        `✏️ *الدرجة:* ${item.result.score} من ${item.result.total}\n` +
        `📈 *النسبة:* ${item.result.percentage}%\n` +
        `${passed ? '✅ ناجح' : '❌ راسب'}`;

      await sendTextSafe(item.phone, msg);
      const imgBuffer = generateResultImage(item.result);
      const base64Img = `data:image/png;base64,${imgBuffer.toString('base64')}`;
      const { targets } = await resolveSendTargets(String(item.phone));
      await wppClient.sendImageFromBase64(
        targets[0],
        base64Img,
        'result.png',
        `نتيجة ${item.result.studentName}`,
      );

      report.push({ name: item.result.studentName, phone: item.phone, status: 'sent' });
      await sleep(1500);
    } catch (err) {
      report.push({
        name: item.result?.studentName,
        phone: item.phone,
        status: 'error',
        reason: err.message,
      });
    }
  }

  const sent = report.filter((r) => r.status === 'sent').length;
  res.json({ success: true, ok: true, sent, total: results.length, report });
});

/* ─────────── Start ─────────── */
const server = app.listen(PORT, HOST, () => {
  console.log(`\n🚀 WhatsApp Unified Server على http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
  console.log(`📱 الجلسة: ${SESSION_NAME}`);
  console.log(`📱 QR:     GET  /qr`);
  console.log(`📊 الحالة: GET  /status`);
  console.log(`📤 إرسال:  POST /send-text | /send-bulk-text | /send-result | /send-image\n`);
  startWhatsApp().catch(console.error);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n⚠️ المنفذ ${PORT} مستخدم بالفعل — خادم واتساب يعمل من نسخة أخرى.\n` +
        `   • Linux: fuser -k ${PORT}/tcp && pm2 restart wppconnect\n` +
        `   • أو: pm2 restart all\n`,
    );
    process.exit(1);
  }
  throw err;
});
