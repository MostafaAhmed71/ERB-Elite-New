import { printHtmlReport } from './exportPdf';
import { PLATFORM_NAME } from './branding';
import { LEVELS } from './calculations';
import { supabase } from './supabase';

export type LevelCertificateData = {
  studentName: string;
  grade: string;
  className: string;
  levelName: string;
  levelMin: number;
  totalPoints: number;
  certificateCode: string;
  issuedAt: string;
};

export function getLevelIndex(levelName: string): number {
  return LEVELS.findIndex((l) => l.name === levelName);
}

export async function issueLevelCertificate(
  levelName: string,
  levelMin: number,
  totalPoints: number,
): Promise<{ code: string; already: boolean }> {
  const { data, error } = await supabase.rpc('issue_level_certificate', {
    p_level_name: levelName,
    p_level_min: levelMin,
    p_points: totalPoints,
  });
  if (error) throw error;
  const result = data as { code: string; already: boolean };
  return { code: result.code, already: result.already };
}

export function printLevelCertificate(data: LevelCertificateData) {
  printHtmlReport(
    `شهادة ترقية — ${data.levelName}`,
    `
      <div style="text-align:center;padding:24px 0;border:3px double #bfa054;border-radius:12px;margin-bottom:20px;">
        <p style="font-size:11px;color:#888;letter-spacing:2px;">${PLATFORM_NAME}</p>
        <h1 style="font-size:22px;color:#1E3A5F;margin:12px 0;">شهادة ترقية مستوى</h1>
        <p style="font-size:14px;color:#444;">يُشهد بأن الطالب/ة</p>
        <p style="font-size:26px;font-weight:bold;color:#1E3A5F;margin:8px 0;">${data.studentName}</p>
        <p style="font-size:13px;color:#666;">${data.grade} — ${data.className}</p>
        <p style="font-size:15px;margin-top:20px;color:#333;">
          قد وصل/ت إلى مستوى <strong style="color:#b8860b;">${data.levelName}</strong>
        </p>
        <p style="font-size:13px;color:#666;">بإجمالي ${data.totalPoints} نقطة معتمدة</p>
        <p style="font-size:10px;color:#aaa;margin-top:24px;font-family:monospace;">
          رمز الشهادة: ${data.certificateCode}
        </p>
        <p style="font-size:10px;color:#aaa;">${new Date(data.issuedAt).toLocaleDateString('ar-SA')}</p>
      </div>
      <p style="font-size:11px;color:#888;text-align:center;">ST6 — شهادة رقمية قابلة للطباعة والمشاركة</p>
    `,
  );
}
