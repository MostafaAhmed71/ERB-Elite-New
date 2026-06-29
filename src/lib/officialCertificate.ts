import { supabase } from './supabase';
import { saveSchoolSetting } from './schoolConfig';
import { signOfficialDocument, buildVerifyUrl } from './documentSignature';
import { printHtmlReport } from './exportPdf';
import { PLATFORM_NAME } from './branding';
import type { LevelCertificateData } from './levelCertificate';

export type OfficialCertificateConfig = {
  principal_name: string;
  school_name: string;
  seal_text: string;
};

export type StoredCertificate = {
  id: string;
  level_name: string;
  level_min: number;
  points_at_upgrade: number;
  certificate_code: string;
  created_at: string;
};

const DEFAULT_OFFICIAL: OfficialCertificateConfig = {
  principal_name: 'مدير المدرسة',
  school_name: 'مدرسة النخبة المتوسطة',
  seal_text: 'ختم رسمي',
};

export async function fetchOfficialCertificateConfig(): Promise<OfficialCertificateConfig> {
  const { data, error } = await supabase
    .from('school_settings')
    .select('value')
    .eq('key', 'official_certificate_config')
    .maybeSingle();
  if (error) throw error;
  const v = data?.value as Partial<OfficialCertificateConfig> | null;
  return { ...DEFAULT_OFFICIAL, ...v };
}

export async function saveOfficialCertificateConfig(config: OfficialCertificateConfig): Promise<void> {
  await saveSchoolSetting('official_certificate_config', config);
}

export async function fetchStudentCertificates(studentId: string): Promise<StoredCertificate[]> {
  const { data, error } = await supabase
    .from('student_level_certificates')
    .select('id, level_name, level_min, points_at_upgrade, certificate_code, created_at')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as StoredCertificate[];
}

/** G6 — شهادة رسمية بتنسيق المدرسة */
export async function printOfficialLevelCertificate(
  data: LevelCertificateData,
  config: OfficialCertificateConfig,
) {
  const dateStr = new Date(data.issuedAt).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let sigBlock = '';
  try {
    const sig = await signOfficialDocument('level_certificate', {
      student: data.studentName,
      level: data.levelName,
      code: data.certificateCode,
      points: data.totalPoints,
    });
    sigBlock = `
      <p style="text-align:center;font-size:10px;color:#888;margin-top:20px;border-top:1px dashed #ccc;padding-top:12px;">
        P8 — توقيع رقمي: <strong>${sig.verify_code}</strong><br/>
        <span style="font-size:9px;">تحقق: ${buildVerifyUrl(sig.verify_code)}</span>
      </p>`;
  } catch {
    /* signing optional until migration 052 */
  }

  printHtmlReport(
    `شهادة رسمية — ${data.levelName}`,
    `
      <div style="border:4px double #1E3A5F;padding:32px 24px;max-width:640px;margin:0 auto;font-family:Tajawal,sans-serif;">
        <div style="text-align:center;border-bottom:2px solid #bfa054;padding-bottom:16px;margin-bottom:24px;">
          <p style="font-size:12px;color:#666;margin:0;">${config.school_name}</p>
          <p style="font-size:10px;color:#999;margin:4px 0 0;">${PLATFORM_NAME}</p>
        </div>
        <h1 style="text-align:center;font-size:24px;color:#1E3A5F;margin:0 0 8px;">شهادة ترقية مستوى التميز</h1>
        <p style="text-align:center;font-size:13px;color:#555;margin:0 0 24px;">G6 — وثيقة رقمية رسمية</p>
        <p style="text-align:center;font-size:14px;color:#444;">يشهد ${config.principal_name} بأن الطالب/ة</p>
        <p style="text-align:center;font-size:28px;font-weight:bold;color:#1E3A5F;margin:12px 0;">${data.studentName}</p>
        <p style="text-align:center;font-size:13px;color:#666;">${data.grade} — ${data.className}</p>
        <p style="text-align:center;font-size:15px;color:#333;margin-top:24px;line-height:1.8;">
          قد حقق/ت مستوى <strong style="color:#b8860b;font-size:17px;">${data.levelName}</strong>
          <br/>بإجمالي <strong>${data.totalPoints}</strong> نقطة معتمدة في برنامج التميز
        </p>
        <div style="display:flex;justify-content:space-between;align-items:flex-end;margin-top:40px;padding-top:16px;">
          <div style="text-align:center;width:140px;">
            <div style="width:80px;height:80px;border:2px dashed #bfa054;border-radius:50%;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#b8860b;">${config.seal_text}</div>
            <p style="font-size:10px;color:#888;margin:0;">ختم المدرسة</p>
          </div>
          <div style="text-align:center;">
            <p style="font-size:11px;color:#666;margin:0;">${dateStr}</p>
            <p style="font-size:10px;color:#aaa;margin:4px 0 0;font-family:monospace;">${data.certificateCode}</p>
          </div>
          <div style="text-align:center;width:140px;">
            <p style="font-size:12px;color:#333;border-top:1px solid #ccc;padding-top:8px;margin:0;">${config.principal_name}</p>
            <p style="font-size:10px;color:#888;margin:4px 0 0;">مدير المدرسة</p>
          </div>
        </div>
      </div>
      ${sigBlock}
    `,
  );
}
