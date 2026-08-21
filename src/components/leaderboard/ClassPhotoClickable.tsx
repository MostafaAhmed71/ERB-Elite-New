import { useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';
import toast from 'react-hot-toast';
import { uploadClassPhoto } from '../../lib/mediaUpload';

type Props = {
  grade: string;
  classNameLabel: string;
  onUploaded: (url: string) => void;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
};

/** الضغط على صورة الفصل يفتح اختيار الملف — بدون أيقونة كاميرا */
export function ClassPhotoClickable({
  grade,
  classNameLabel,
  onUploaded,
  children,
  className,
  disabled,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    try {
      const url = await uploadClassPhoto(grade, classNameLabel, file);
      onUploaded(url);
      toast.success(`تم تحديث صورة فصل ${classNameLabel}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'تعذر رفع الصورة');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void onPick(e.target.files?.[0])}
      />
      <button
        type="button"
        disabled={disabled || busy}
        title="اضغط لتغيير صورة الفصل"
        aria-label={`رفع صورة فصل ${classNameLabel}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!busy) inputRef.current?.click();
        }}
        className={clsx(
          'relative rounded-full p-0 border-0 bg-transparent cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-400/50',
          'disabled:cursor-wait disabled:opacity-70',
          'hover:opacity-90 transition-opacity',
          className,
        )}
      >
        {children}
        {busy && (
          <span className="absolute inset-0 rounded-full bg-navy-950/55 flex items-center justify-center text-[10px] text-white font-bold">
            ...
          </span>
        )}
      </button>
    </>
  );
}
