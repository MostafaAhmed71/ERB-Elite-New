import clsx from 'clsx';
import type { ReactNode } from 'react';
import QRCode from 'react-qr-code';

const NAVY = '#0B3A6E';
const GOLD = '#C9A227';
const BLACK = '#111111';
const WHITE = '#FFFFFF';
const LINE = '#1A1A1A';

export const ID_CARD_SCHOOL_NAME = 'متوسطة وثانوية نخبة الشمال الأهلية';
export const ID_CARD_TITLE = 'بطاقة الطالب التعريفية';
export const ID_CARD_PRINCIPAL_TITLE = 'مدير المدرسة';
export const ID_CARD_PRINCIPAL_NAME = 'محمد نصر الدين';
export const ID_CARD_LOGO_LEFT = '/id-card/logo-left.png';
export const ID_CARD_LOGO_RIGHT = '/id-card/logo-right.png';

export type StudentCardProps = {
  studentName: string;
  grade: string;
  studentClass: string;
  admissionNumber: string;
  /** @deprecated لا يُعرض — محفوظ للتوافق */
  photoUrl?: string | null;
  logoLeftUrl?: string;
  logoRightUrl?: string;
  /** @deprecated */
  platformIconUrl?: string;
  useSystemFont?: boolean;
  qrValue?: string;
  wrapperClassName?: string;
  printSize?: boolean;
};

function Pill({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={clsx('mx-auto rounded-full px-3 py-1 text-center font-bold tracking-wide', className)}
      style={{ backgroundColor: NAVY, color: WHITE }}
    >
      {children}
    </div>
  );
}

function FieldRow({
  label,
  value,
  compact,
  emphasize,
}: {
  label: string;
  value: string;
  compact?: boolean;
  emphasize?: boolean;
}) {
  return (
    <div className="w-full" style={{ color: BLACK }}>
      <div
        className={clsx(
          'flex w-full items-baseline gap-2 pb-1',
          emphasize
            ? compact
              ? 'text-[13px] font-black leading-snug'
              : 'text-[15px] font-black leading-snug'
            : compact
              ? 'text-[11px] font-extrabold leading-snug'
              : 'text-[13px] font-extrabold leading-snug'
        )}
      >
        <span className="shrink-0 opacity-70" style={{ color: NAVY }}>
          {label}
        </span>
        <span className="min-w-0 flex-1 text-right break-words">{value}</span>
      </div>
      <div
        className="h-px w-full"
        style={{
          background: `linear-gradient(90deg, transparent, ${LINE} 12%, ${LINE} 88%, transparent)`,
          opacity: 0.35,
        }}
      />
    </div>
  );
}

export function StudentCard({
  studentName,
  grade,
  studentClass,
  admissionNumber,
  logoLeftUrl,
  logoRightUrl,
  qrValue,
  wrapperClassName,
  printSize = false,
  useSystemFont = false,
}: StudentCardProps) {
  const qrPayload = qrValue ?? admissionNumber;
  const qrSize = printSize ? 72 : 102;
  const logoH = printSize ? 26 : 38;

  return (
    <article
      dir="rtl"
      className={clsx(
        'student-id-card relative flex flex-col overflow-hidden',
        printSize
          ? 'h-[86mm] w-[54mm] rounded-[12px] border-[3px] p-0'
          : 'w-[252px] rounded-2xl border-[4px] p-0 shadow-[0_16px_40px_rgba(11,58,110,0.2)]',
        wrapperClassName
      )}
      style={{
        backgroundColor: WHITE,
        borderColor: NAVY,
        color: BLACK,
        fontFamily: useSystemFont ? 'Arial, Helvetica, sans-serif' : 'Cairo, Tajawal, sans-serif',
      }}
      aria-label={`بطاقة هوية ${studentName}`}
    >
      {/* شريط علوي ذهبي */}
      <div
        className="shrink-0"
        style={{
          height: printSize ? 3 : 4,
          background: `linear-gradient(90deg, ${NAVY}, ${GOLD}, ${NAVY})`,
        }}
      />

      <div className={clsx('flex flex-1 flex-col', printSize ? 'px-2 py-1.5' : 'px-3 py-2.5')}>
        {/* ترويسة */}
        <header className={clsx('flex items-center gap-1.5', printSize ? 'mb-1' : 'mb-2')}>
          <img
            src={logoRightUrl ?? ID_CARD_LOGO_RIGHT}
            alt=""
            crossOrigin="anonymous"
            className="shrink-0 object-contain"
            style={{ height: logoH, width: logoH }}
          />
          <p
            className={clsx(
              'min-w-0 flex-1 text-center font-extrabold leading-tight',
              printSize ? 'text-[7.5px]' : 'text-[10px]'
            )}
            style={{ color: NAVY }}
          >
            {ID_CARD_SCHOOL_NAME}
          </p>
          <img
            src={logoLeftUrl ?? ID_CARD_LOGO_LEFT}
            alt=""
            crossOrigin="anonymous"
            className="shrink-0 object-contain"
            style={{ height: logoH, width: logoH }}
          />
        </header>

        <Pill className={printSize ? 'mb-2 text-[6.5px]' : 'mb-3 text-[9px]'}>{ID_CARD_TITLE}</Pill>

        {/* بيانات الطالب — أسفل قليلاً وبخط أوضح */}
        <div
          className={clsx('w-full', printSize ? 'mt-1 mb-2 space-y-2' : 'mt-2 mb-3 space-y-2.5')}
        >
          <FieldRow label="الاسم" value={studentName} compact={printSize} emphasize />
          <FieldRow label="الصف" value={grade} compact={printSize} />
          <FieldRow label="الفصل" value={studentClass} compact={printSize} />
        </div>

        {/* QR */}
        <div className="flex flex-1 items-center justify-center">
          <div
            className="relative rounded-xl p-1.5"
            style={{
              border: `1.5px solid ${NAVY}`,
              boxShadow: `inset 0 0 0 1px ${GOLD}55`,
              backgroundColor: WHITE,
            }}
          >
            <QRCode
              value={qrPayload}
              size={qrSize}
              level="M"
              fgColor={NAVY}
              bgColor={WHITE}
              title={`QR ${admissionNumber}`}
              style={{ height: 'auto', maxWidth: '100%', width: '100%', display: 'block' }}
            />
          </div>
        </div>

        {/* تذييل */}
        <footer className={clsx('mt-auto text-center', printSize ? 'pt-1.5' : 'pt-2.5')}>
          <Pill className={printSize ? 'mb-0.5 text-[6.5px]' : 'mb-1 text-[9px]'}>
            {ID_CARD_PRINCIPAL_TITLE}
          </Pill>
          <p
            className={clsx('font-extrabold', printSize ? 'text-[9px]' : 'text-[11px]')}
            style={{ color: NAVY }}
          >
            {ID_CARD_PRINCIPAL_NAME}
          </p>
        </footer>
      </div>

      {/* شريط سفلي كحلي */}
      <div className="shrink-0" style={{ height: printSize ? 3 : 4, backgroundColor: NAVY }} />
    </article>
  );
}
