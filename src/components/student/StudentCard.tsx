import clsx from 'clsx';
import QRCode from 'react-qr-code';
import { User } from 'lucide-react';
import { PLATFORM_ICON, PLATFORM_NAME, PLATFORM_NAME_SHORT, PLATFORM_TAGLINE } from '../../lib/branding';

export type StudentCardProps = {
  studentName: string;
  grade: string;
  /** الفصل الدراسي */
  studentClass: string;
  admissionNumber: string;
  photoUrl?: string | null;
  /** شعار مضمّن كـ data URL عند التصدير */
  platformIconUrl?: string;
  /** خط نظامي عند تصدير PNG (بدون Google Fonts) */
  useSystemFont?: boolean;
  /** قيمة QR — الافتراضي رقم القيد */
  qrValue?: string;
  /** كلاس Tailwind اختياري للحاوية */
  wrapperClassName?: string;
  /** عرض بحجم الطباعة CR80 بدون تكبير */
  printSize?: boolean;
};

const ROYAL_BLUE = '#1B3B86';
const GOLD = '#BFA054';

export function StudentCard({
  studentName,
  grade,
  studentClass,
  admissionNumber,
  photoUrl,
  platformIconUrl,
  qrValue,
  wrapperClassName,
  printSize = false,
  useSystemFont = false,
}: StudentCardProps) {
  const qrPayload = qrValue ?? admissionNumber;
  const initials = studentName.trim().charAt(0) || 'ط';
  const qrSize = printSize ? 40 : 56;

  return (
    <article
      dir="rtl"
      className={clsx(
        'relative grid overflow-hidden rounded-2xl bg-white',
        'shadow-[0_14px_44px_rgba(27,59,134,0.22)]',
        'border border-[#BFA054]/25',
        printSize
          ? 'h-[86mm] w-[54mm] grid-rows-[auto_minmax(0,1fr)_auto_auto]'
          : 'w-[214px] grid-rows-[auto_auto_auto_auto]',
        wrapperClassName
      )}
      style={{ fontFamily: useSystemFont ? 'Arial, Helvetica, sans-serif' : 'Cairo, sans-serif' }}
      aria-label={`بطاقة هوية ${studentName}`}
    >
      {/* ترويسة */}
      <header
        className="relative shrink-0 px-2.5 pt-2 pb-1.5 text-center text-white"
        style={{ background: `linear-gradient(165deg, ${ROYAL_BLUE} 0%, #152d6b 100%)` }}
      >
        <div
          className="absolute inset-x-0 top-0 h-0.5"
          style={{ background: `linear-gradient(90deg, transparent, ${GOLD}, transparent)` }}
        />
        <div className="flex items-center justify-center gap-1.5">
          <img
            src={platformIconUrl ?? PLATFORM_ICON}
            alt=""
            crossOrigin="anonymous"
            className="h-6 w-6 shrink-0 rounded-md object-cover ring-1 ring-white/25"
          />
          <div className="min-w-0 text-right">
            <p className="truncate text-[9px] font-bold leading-tight">
              {printSize ? PLATFORM_NAME_SHORT : PLATFORM_NAME}
            </p>
            <p className="truncate text-[6px] text-white/70">{PLATFORM_TAGLINE}</p>
          </div>
        </div>
        <p className="mt-1 text-[7px] font-semibold tracking-wide text-[#BFA054]">
          بطاقة هوية طالب
        </p>
      </header>

      {/* بيانات الطالب */}
      <div
        className={clsx(
          'flex flex-col items-center bg-white px-2.5 pt-2',
          printSize ? 'min-h-0 overflow-hidden pb-0.5' : 'pb-1'
        )}
      >
        <div
          className="relative mb-1.5 shrink-0 rounded-lg p-0.5"
          style={{
            background: `linear-gradient(135deg, ${GOLD}, #d4b76a, ${GOLD})`,
            boxShadow: '0 3px 10px rgba(191,160,84,0.3)',
          }}
        >
          <div
            className={clsx(
              'overflow-hidden rounded-[8px] bg-white',
              printSize ? 'h-[12mm] w-[12mm]' : 'h-[58px] w-[58px]'
            )}
          >
            {photoUrl ? (
              <img
                src={photoUrl}
                alt={studentName}
                crossOrigin="anonymous"
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className="flex h-full w-full items-center justify-center"
                style={{ background: `linear-gradient(145deg, ${ROYAL_BLUE}15, ${GOLD}20)` }}
              >
                {initials.length <= 2 ? (
                  <span
                    className={clsx('font-black', printSize ? 'text-base' : 'text-xl')}
                    style={{ color: ROYAL_BLUE }}
                  >
                    {initials}
                  </span>
                ) : (
                  <User
                    className={clsx(printSize ? 'h-5 w-5' : 'h-7 w-7')}
                    style={{ color: ROYAL_BLUE }}
                    aria-hidden
                  />
                )}
              </div>
            )}
          </div>
        </div>

        <h2
          className="mb-1 max-w-full shrink-0 truncate text-center text-[11px] font-extrabold leading-tight"
          style={{ color: ROYAL_BLUE }}
        >
          {studentName}
        </h2>

        <dl className="w-full shrink-0 space-y-0.5 text-[8px]">
          <div className="flex items-center justify-between gap-1.5 rounded bg-[#1B3B86]/5 px-1.5 py-0.5">
            <dt className="font-semibold text-[#1B3B86]/70">الصف</dt>
            <dd className="truncate font-bold text-[#1B3B86]">{grade}</dd>
          </div>
          <div className="flex items-center justify-between gap-1.5 rounded bg-[#1B3B86]/5 px-1.5 py-0.5">
            <dt className="font-semibold text-[#1B3B86]/70">الفصل</dt>
            <dd className="truncate font-bold text-[#1B3B86]">{studentClass}</dd>
          </div>
          <div className="flex items-center justify-between gap-1.5 rounded border border-[#BFA054]/35 bg-[#BFA054]/10 px-1.5 py-0.5">
            <dt className="shrink-0 font-semibold text-[#1B3B86]/80">رقم القيد</dt>
            <dd className="truncate font-mono text-[9px] font-bold tracking-wide" style={{ color: ROYAL_BLUE }}>
              {admissionNumber}
            </dd>
          </div>
        </dl>
      </div>

      {/* QR — صف مستقل لضمان ظهوره كاملاً */}
      <div className="flex shrink-0 justify-center bg-white px-2 pb-1 pt-0.5">
        <div
          className="rounded-md border border-[#BFA054]/30 bg-white p-0.5 shadow-sm"
          style={{ width: qrSize + 4, height: qrSize + 4 }}
        >
          <QRCode
            value={qrPayload}
            size={qrSize}
            level="M"
            fgColor={ROYAL_BLUE}
            bgColor="#FFFFFF"
            title={`QR ${admissionNumber}`}
            style={{ height: 'auto', maxWidth: '100%', width: '100%' }}
          />
        </div>
      </div>

      {/* شريط سفلي */}
      <footer
        className="shrink-0 truncate px-1 py-0.5 text-center text-[5px] font-medium leading-tight text-white/90"
        style={{ backgroundColor: ROYAL_BLUE }}
      >
        امسح للرصد · {PLATFORM_NAME_SHORT}
      </footer>
    </article>
  );
}
