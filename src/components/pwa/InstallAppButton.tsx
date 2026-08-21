import { useState } from 'react';
import { Download } from 'lucide-react';
import clsx from 'clsx';
import { isIos, isStandalonePwa, isAndroid } from '../../lib/pwaPlatform';
import { IosInstallGuide } from './IosInstallGuide';

type Props = {
  className?: string;
  onAndroidInstall?: () => void;
};

/** زر تثبيت — Android: يستدعي نافذة النظام | iPhone: يفتح دليل Safari */
export function InstallAppButton({ className, onAndroidInstall }: Props) {
  const [iosGuideOpen, setIosGuideOpen] = useState(false);

  if (isStandalonePwa()) return null;

  const handleClick = () => {
    if (isIos()) {
      setIosGuideOpen(true);
      return;
    }
    if (isAndroid() && onAndroidInstall) {
      onAndroidInstall();
    }
  };

  if (!isIos() && !isAndroid()) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        title="تثبيت التطبيق"
        className={clsx(
          'p-2.5 rounded-xl text-white/40 hover:text-gold-400 hover:bg-white/5 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center',
          className,
        )}
        aria-label="تثبيت التطبيق"
      >
        <Download className="w-5 h-5" />
      </button>

      <IosInstallGuide open={iosGuideOpen} onClose={() => setIosGuideOpen(false)} />
    </>
  );
}
