import { useQuery } from '@tanstack/react-query';
import { Award, Download } from 'lucide-react';
import {
  fetchOfficialCertificateConfig,
  fetchStudentCertificates,
  printOfficialLevelCertificate,
} from '../../lib/officialCertificate';
import { showError } from '../../lib/toast';
import { Button } from '../ui/Button';

type Props = {
  studentId: string;
  studentName: string;
  grade: string;
  className: string;
};

/** G6 — محفظة الشهادات الرسمية */
export function CertificateWallet({ studentId, studentName, grade, className }: Props) {
  const { data: certs = [], isLoading } = useQuery({
    queryKey: ['cert-wallet', studentId],
    queryFn: () => fetchStudentCertificates(studentId),
    enabled: !!studentId,
  });

  const { data: officialConfig } = useQuery({
    queryKey: ['official-cert-config'],
    queryFn: fetchOfficialCertificateConfig,
  });

  if (isLoading || certs.length === 0) return null;

  const handlePrint = async (cert: typeof certs[0]) => {
    try {
      const config = officialConfig ?? {
        principal_name: 'مدير المدرسة',
        school_name: 'مدرسة النخبة المتوسطة',
        seal_text: 'ختم رسمي',
      };
      printOfficialLevelCertificate(
        {
          studentName,
          grade,
          className,
          levelName: cert.level_name,
          levelMin: cert.level_min,
          totalPoints: cert.points_at_upgrade,
          certificateCode: cert.certificate_code,
          issuedAt: cert.created_at,
        },
        config,
      );
    } catch (e) {
      showError(e instanceof Error ? e : new Error('تعذّر طباعة الشهادة'));
    }
  };

  return (
    <div className="glass-card p-5 space-y-3" dir="rtl">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <Award className="w-4 h-4 text-gold-400" />
        محفظة الشهادات الرسمية — G6
      </h3>
      <div className="space-y-2">
        {certs.map((cert) => (
          <div
            key={cert.id}
            className="flex items-center justify-between gap-3 p-3 rounded-xl bg-white/3 border border-white/5"
          >
            <div>
              <p className="text-white text-sm font-bold">{cert.level_name}</p>
              <p className="text-white/35 text-[10px] font-mono mt-0.5">{cert.certificate_code}</p>
              <p className="text-white/30 text-[10px]">
                {new Date(cert.created_at).toLocaleDateString('ar-SA')}
              </p>
            </div>
            <Button
              size="sm"
              variant="secondary"
              icon={<Download className="w-3.5 h-3.5" />}
              onClick={() => void handlePrint(cert)}
            >
              طباعة
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
