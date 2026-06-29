import { useEffect, useRef, useState } from 'react';
import { Award, Download, X } from 'lucide-react';
import { LEVELS } from '../../lib/calculations';
import {
  getLevelIndex,
  issueLevelCertificate,
  printLevelCertificate,
} from '../../lib/levelCertificate';
import { showError } from '../../lib/toast';
import { Button } from '../ui/Button';

type Props = {
  studentId: string;
  studentName: string;
  grade: string;
  className: string;
  totalPoints: number;
  levelName: string;
};

export function LevelCertificateModal({
  studentId,
  studentName,
  grade,
  className,
  totalPoints,
  levelName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [certCode, setCertCode] = useState('');
  const [issuedAt, setIssuedAt] = useState('');
  const processedRef = useRef<string | null>(null);

  useEffect(() => {
    const levelIndex = getLevelIndex(levelName);
    if (levelIndex <= 0) return;

    const storageKey = `level_cert_seen_${studentId}`;
    const seenIndex = Number(localStorage.getItem(storageKey) ?? '0');
    if (levelIndex <= seenIndex) return;
    if (processedRef.current === levelName) return;
    processedRef.current = levelName;

    const level = LEVELS[levelIndex];
    void (async () => {
      try {
        const result = await issueLevelCertificate(level.name, level.min, totalPoints);
        setCertCode(result.code);
        setIssuedAt(new Date().toISOString());
        localStorage.setItem(storageKey, String(levelIndex));
        if (!result.already) setOpen(true);
      } catch (e) {
        console.warn('level certificate:', e);
      }
    })();
  }, [studentId, levelName, totalPoints]);

  if (!open) return null;

  const handlePrint = () => {
    try {
      printLevelCertificate({
        studentName,
        grade,
        className,
        levelName,
        levelMin: LEVELS[getLevelIndex(levelName)]?.min ?? 0,
        totalPoints,
        certificateCode: certCode,
        issuedAt: issuedAt || new Date().toISOString(),
      });
    } catch (e) {
      showError(e instanceof Error ? e : new Error('تعذّر طباعة الشهادة'));
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" dir="rtl">
      <div className="glass-card max-w-md w-full p-6 space-y-4 border border-gold-500/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gold-500/15 flex items-center justify-center">
              <Award className="w-6 h-6 text-gold-400" />
            </div>
            <div>
              <p className="text-gold-400 text-[10px] font-semibold">ST6 — ترقية مستوى!</p>
              <h3 className="text-white font-bold text-lg">مبروك {studentName}</h3>
              <p className="text-white/50 text-sm">وصلت لمستوى {levelName}</p>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="text-white/40 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-white/60 text-xs leading-relaxed">
          حصلت على شهادة رقمية رسمية. يمكنك طباعتها أو مشاركتها مع أهلك.
        </p>
        {certCode && (
          <p className="text-center text-white/30 text-[10px] font-mono">رمز: {certCode}</p>
        )}

        <div className="flex gap-2">
          <Button variant="primary" className="flex-1" icon={<Download className="w-4 h-4" />} onClick={handlePrint}>
            تحميل / طباعة الشهادة
          </Button>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            إغلاق
          </Button>
        </div>
      </div>
    </div>
  );
}
