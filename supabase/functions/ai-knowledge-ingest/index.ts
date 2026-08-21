/**
 * ai-knowledge-ingest — استخراج نص من ملف معرفة المدرسة + تقسيم + embeddings
 *
 * POST JSON: { doc_id: string }
 * Auth: principal/admin/platform_developer JWT أو service role
 *
 * Secrets: OPENAI_API_KEY أو OPENROUTER_API_KEY (embeddings)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import JSZip from 'https://esm.sh/jszip@3.10.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** يمنع PostgreSQL: unsupported Unicode escape sequence (\u0000 وغيرها) */
function sanitizeForDb(text: string): string {
  let out = '';
  for (const ch of text) {
    const c = ch.codePointAt(0) ?? 0;
    if (c === 0 || c === 0xfffe || c === 0xffff) continue;
    if (c < 32 && c !== 9 && c !== 10 && c !== 13) continue;
    if (c >= 0xd800 && c <= 0xdfff) continue;
    out += ch;
  }
  return out
    .replace(/\uFFFD/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[^\S\n]{2,}/g, ' ')
    .trim();
}

function chunkText(text: string, size = 1000, overlap = 150): string[] {
  const clean = sanitizeForDb(text.replace(/\r/g, '').replace(/\n{3,}/g, '\n\n'));
  if (!clean) return [];
  const chunks: string[] = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(clean.length, i + size);
    const piece = sanitizeForDb(clean.slice(i, end));
    if (piece.length > 40) chunks.push(piece);
    if (end >= clean.length) break;
    i = Math.max(i + 1, end - overlap);
  }
  return chunks;
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

async function extractDocx(bytes: Uint8Array): Promise<string> {
  const zip = await JSZip.loadAsync(bytes);
  const docXml = await zip.file('word/document.xml')?.async('string');
  if (!docXml) throw new Error('ملف Word غير صالح');
  const texts = [...docXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)].map((m) => m[1]);
  return sanitizeForDb(decodeXmlEntities(texts.join(' ')));
}

function decodePdfLiteral(inner: string): string {
  return inner
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '')
    .replace(/\\t/g, ' ')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\')
    .replace(/\\([0-7]{1,3})/g, (_, oct: string) => {
      const n = parseInt(oct, 8);
      return n > 0 ? String.fromCharCode(n) : '';
    });
}

function decodePdfHex(hex: string): string {
  const clean = hex.replace(/[^0-9a-fA-F]/g, '');
  if (clean.length < 4 || clean.length % 2 !== 0) return '';
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }

  // UTF-16BE
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let s = '';
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      const cp = (bytes[i] << 8) | bytes[i + 1];
      if (cp) s += String.fromCharCode(cp);
    }
    return s;
  }
  // UTF-16LE
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) {
    let s = '';
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      const cp = (bytes[i + 1] << 8) | bytes[i];
      if (cp) s += String.fromCharCode(cp);
    }
    return s;
  }
  // كثير من PDFs العربية: UTF-16BE بدون BOM (أزواج 06xx)
  let utf16Hits = 0;
  for (let i = 0; i + 1 < Math.min(bytes.length, 40); i += 2) {
    if (bytes[i] === 0x06 || bytes[i] === 0x00) utf16Hits++;
  }
  if (utf16Hits >= 4 && bytes.length % 2 === 0) {
    let s = '';
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      const cp = (bytes[i] << 8) | bytes[i + 1];
      if (cp) s += String.fromCharCode(cp);
    }
    if (/[\u0600-\u06FF]/.test(s)) return s;
  }

  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

async function extractPdf(bytes: Uint8Array): Promise<string> {
  const raw = new TextDecoder('latin1').decode(bytes);
  const parts: string[] = [];

  // سلاسل hex: <FEFF0607...> شائعة في العربية
  const hexRe = /<([0-9A-Fa-f \t\r\n]{8,})>/g;
  let hm: RegExpExecArray | null;
  while ((hm = hexRe.exec(raw)) !== null) {
    const decoded = decodePdfHex(hm[1]);
    if (/[\u0600-\u06FFa-zA-Z]{2,}/.test(decoded)) parts.push(decoded);
  }

  // سلاسل نصية: (....)
  const litRe = /\((?:\\.|[^\\)]){2,}\)/g;
  let m: RegExpExecArray | null;
  while ((m = litRe.exec(raw)) !== null) {
    const inner = decodePdfLiteral(m[0].slice(1, -1));
    if (/[\u0600-\u06FFa-zA-Z]{3,}/.test(inner)) parts.push(inner);
  }

  const text = sanitizeForDb(parts.join('\n'));
  if (text.length < 80) {
    throw new Error(
      'تعذّر استخراج نص كافٍ من هذا الـ PDF (قد يكون صورة ممسوحة). جرّب DOCX أو TXT، أو PDF فيه نص قابل للنسخ.',
    );
  }
  return text;
}

async function embedTexts(texts: string[], apiKey: string, viaOpenRouter: boolean): Promise<number[][]> {
  const url = viaOpenRouter
    ? 'https://openrouter.ai/api/v1/embeddings'
    : 'https://api.openai.com/v1/embeddings';
  const model = viaOpenRouter ? 'openai/text-embedding-3-small' : 'text-embedding-3-small';
  const out: number[][] = [];
  const batchSize = 16;
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize).map((t) => sanitizeForDb(t).slice(0, 7000));
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        ...(viaOpenRouter
          ? { 'HTTP-Referer': 'https://northelite.tech', 'X-Title': 'ERB Elite RAG' }
          : {}),
      },
      body: JSON.stringify({ model, input: batch }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || `embeddings failed (${res.status})`);
    }
    const sorted = [...(data.data ?? [])].sort(
      (a: { index: number }, b: { index: number }) => a.index - b.index,
    );
    for (const row of sorted) out.push(row.embedding as number[]);
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const openaiKey = Deno.env.get('OPENAI_API_KEY') ?? '';
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY') ?? '';
    if (!supabaseUrl || !serviceKey) return json(503, { error: 'Supabase not configured' });

    const authHeader = req.headers.get('Authorization') ?? '';
    if (!authHeader.startsWith('Bearer ')) return json(401, { error: 'Unauthorized' });

    const userClient = createClient(supabaseUrl, anonKey || serviceKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const token = authHeader.replace(/^Bearer\s+/i, '');
    const isService = token === serviceKey;
    if (!isService) {
      const { data: userData } = await userClient.auth.getUser();
      if (!userData.user) return json(401, { error: 'Unauthorized' });
      const { data: profile } = await admin
        .from('users')
        .select('role')
        .eq('id', userData.user.id)
        .maybeSingle();
      if (!profile || !['principal', 'admin', 'platform_developer'].includes(profile.role)) {
        return json(403, { error: 'صلاحية غير كافية' });
      }
    }

    const body = await req.json();
    const docId = String(body.doc_id || '').trim();
    if (!docId) return json(400, { error: 'doc_id مطلوب' });

    const { data: doc, error: docErr } = await admin
      .from('ai_knowledge_docs')
      .select('*')
      .eq('id', docId)
      .maybeSingle();
    if (docErr || !doc) return json(404, { error: 'المستند غير موجود' });

    await admin
      .from('ai_knowledge_docs')
      .update({ status: 'processing', error_message: null, updated_at: new Date().toISOString() })
      .eq('id', docId);

    const { data: fileData, error: dlErr } = await admin.storage
      .from('ai-knowledge')
      .download(doc.file_path);
    if (dlErr || !fileData) {
      await admin
        .from('ai_knowledge_docs')
        .update({ status: 'failed', error_message: dlErr?.message || 'download failed' })
        .eq('id', docId);
      return json(500, { error: 'فشل تنزيل الملف' });
    }

    const bytes = new Uint8Array(await fileData.arrayBuffer());
    const mime = String(doc.mime_type || '');
    const name = String(doc.file_name || '').toLowerCase();

    let text = '';
    try {
      if (mime.includes('word') || name.endsWith('.docx')) {
        text = await extractDocx(bytes);
      } else if (mime.includes('pdf') || name.endsWith('.pdf')) {
        text = await extractPdf(bytes);
      } else {
        text = sanitizeForDb(new TextDecoder('utf-8', { fatal: false }).decode(bytes));
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'extract failed';
      await admin
        .from('ai_knowledge_docs')
        .update({ status: 'needs_review', error_message: msg, updated_at: new Date().toISOString() })
        .eq('id', docId);
      return json(422, { error: msg });
    }

    const chunks = chunkText(text);
    if (!chunks.length) {
      await admin
        .from('ai_knowledge_docs')
        .update({ status: 'needs_review', error_message: 'لا يوجد نص قابل للفهرسة' })
        .eq('id', docId);
      return json(422, { error: 'لا يوجد نص قابل للفهرسة' });
    }

    const viaOpenRouter = !openaiKey && !!openRouterKey;
    const embedKey = openaiKey || openRouterKey;
    if (!embedKey) {
      await admin
        .from('ai_knowledge_docs')
        .update({
          status: 'failed',
          error_message: 'يلزم OPENAI_API_KEY أو OPENROUTER_API_KEY للـ embeddings',
        })
        .eq('id', docId);
      return json(503, { error: 'مفتاح embeddings غير مضبوط' });
    }

    let embeddings: number[][];
    try {
      embeddings = await embedTexts(chunks, embedKey, viaOpenRouter);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'embed failed';
      await admin
        .from('ai_knowledge_docs')
        .update({ status: 'failed', error_message: msg })
        .eq('id', docId);
      return json(502, { error: msg });
    }

    await admin.from('ai_knowledge_chunks').delete().eq('doc_id', docId);

    const rows = chunks.map((content, chunk_index) => ({
      doc_id: docId,
      chunk_index,
      content,
      embedding: embeddings[chunk_index],
    }));

    // إدراج على دفعات لتقليل حجم الطلب
    for (let i = 0; i < rows.length; i += 40) {
      const slice = rows.slice(i, i + 40);
      const { error: insErr } = await admin.from('ai_knowledge_chunks').insert(slice);
      if (insErr) {
        await admin
          .from('ai_knowledge_docs')
          .update({ status: 'failed', error_message: insErr.message })
          .eq('id', docId);
        return json(500, { error: insErr.message });
      }
    }

    await admin
      .from('ai_knowledge_docs')
      .update({
        status: 'ready',
        chunk_count: rows.length,
        error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', docId);

    return json(200, { ok: true, doc_id: docId, chunk_count: rows.length });
  } catch (e) {
    return json(500, { error: e instanceof Error ? e.message : 'خطأ غير متوقع' });
  }
});
