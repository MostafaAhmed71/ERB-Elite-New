import { useCallback, useEffect, useRef, useState } from 'react';
import { QrCode, Camera, Keyboard, AlertCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { parseStudentQRPayload } from '../../lib/qr';
import type { DbStudent } from '../../types';
import clsx from 'clsx';

type QRQuickGrantProps = {
  students: DbStudent[];
  onStudentFound: (studentId: string) => void;
};

type ScanMode = 'camera' | 'manual';

export function QRQuickGrant({ students, onStudentFound }: QRQuickGrantProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<ScanMode>('camera');
  const [manualInput, setManualInput] = useState('');
  const [error, setError] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const resolveStudent = useCallback(
    (raw: string): DbStudent | null => {
      const trimmed = raw.trim();
      if (!trimmed) return null;

      const parsed = parseStudentQRPayload(trimmed);
      if (parsed?.qrToken) {
        return (
          students.find((s) => (s as DbStudent & { qr_token?: string | null }).qr_token === parsed.qrToken) ??
          null
        );
      }
      if (parsed?.studentId) {
        return students.find((s) => s.id === parsed.studentId) ?? null;
      }

      return (
        students.find(
          (s) =>
            s.admission_number === trimmed ||
            s.admission_number.includes(trimmed),
        ) ?? null
      );
    },
    [students],
  );

  const handleFound = useCallback(
    (student: DbStudent) => {
      onStudentFound(student.id);
      setOpen(false);
      setError('');
      setManualInput('');
    },
    [onStudentFound]
  );

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setScanning(false);
  }, []);

  const startCamera = useCallback(async () => {
    if (!('BarcodeDetector' in window)) {
      setMode('manual');
      setError('المتصفح لا يدعم المسح بالكاميرا — استخدم الإدخال اليدوي');
      return;
    }

    try {
      setError('');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setScanning(true);

      const Detector = window.BarcodeDetector;
      if (!Detector) return;
      const detector = new Detector({ formats: ['qr_code'] });

      const tick = async () => {
        if (!videoRef.current || !streamRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes.length > 0) {
            const student = resolveStudent(codes[0].rawValue);
            if (student) {
              handleFound(student);
              stopCamera();
              return;
            }
            setError('الطالب غير موجود في فصولك');
          }
        } catch {
          // ignore frame errors
        }
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {
      setMode('manual');
      setError('تعذّر الوصول للكاميرا — استخدم الإدخال اليدوي');
    }
  }, [handleFound, resolveStudent, stopCamera]);

  useEffect(() => {
    if (open && mode === 'camera') {
      startCamera();
    }
    if (!open) {
      stopCamera();
    }
    return () => stopCamera();
  }, [open, mode, startCamera, stopCamera]);

  const handleManualSubmit = () => {
    const student = resolveStudent(manualInput);
    if (student) {
      handleFound(student);
    } else {
      setError('لم يُعثر على طالب — تأكد من الرابط أو رقم القيد');
    }
  };

  return (
    <>
      <Button
        variant="secondary"
        size="md"
        icon={<QrCode className="w-4 h-4" />}
        onClick={() => setOpen(true)}
      >
        مسح QR
      </Button>

      <Modal open={open} onClose={() => setOpen(false)} title="منح سريع بمسح البطاقة" size="md">
        <div className="p-5 space-y-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setMode('camera'); setError(''); }}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm transition-all',
                mode === 'camera'
                  ? 'bg-gold-500/15 border-gold-500/25 text-gold-300'
                  : 'border-white/10 text-white/50 hover:text-white/80'
              )}
            >
              <Camera className="w-4 h-4" /> كاميرا
            </button>
            <button
              type="button"
              onClick={() => { setMode('manual'); stopCamera(); setError(''); }}
              className={clsx(
                'flex-1 flex items-center justify-center gap-2 py-2 rounded-xl border text-sm transition-all',
                mode === 'manual'
                  ? 'bg-gold-500/15 border-gold-500/25 text-gold-300'
                  : 'border-white/10 text-white/50 hover:text-white/80'
              )}
            >
              <Keyboard className="w-4 h-4" /> يدوي
            </button>
          </div>

          {mode === 'camera' ? (
            <div className="relative aspect-square max-h-64 mx-auto rounded-2xl overflow-hidden bg-black/40 border border-white/10">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center text-white/40 text-sm">
                  جاري تشغيل الكاميرا...
                </div>
              )}
              <div className="absolute inset-8 border-2 border-gold-400/50 rounded-xl pointer-events-none" />
            </div>
          ) : (
            <div className="space-y-2">
              <label className="text-white/60 text-xs">الصق رابط البطاقة أو أدخل رقم القيد</label>
              <input
                value={manualInput}
                onChange={(e) => { setManualInput(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                placeholder="مثال: /card/... أو رقم القيد"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-gold-400/50 text-sm"
                autoFocus
              />
              <Button className="w-full" onClick={handleManualSubmit}>
                بحث عن الطالب
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-amber-300 text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <p className="text-white/30 text-xs text-center">
            امسح رمز QR من بطاقة الطالب لتحديده تلقائياً
          </p>
        </div>
      </Modal>
    </>
  );
}
