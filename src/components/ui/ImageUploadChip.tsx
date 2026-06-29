import { useRef, useState } from 'react';
import clsx from 'clsx';
import { Camera, Loader2 } from 'lucide-react';

type ImageUploadChipProps = {
  label: string;
  imageUrl?: string | null;
  fallback?: React.ReactNode;
  onUpload: (file: File) => Promise<void>;
  shape?: 'circle' | 'rounded';
  size?: 'sm' | 'md' | 'lg';
};

const SIZE = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-20 h-20',
};

export function ImageUploadChip({
  label,
  imageUrl,
  fallback,
  onUpload,
  shape = 'circle',
  size = 'md',
}: ImageUploadChipProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setLoading(true);
    try {
      await onUpload(file);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="flex items-center gap-3 min-w-0">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={loading}
        className={clsx(
          'relative shrink-0 overflow-hidden border border-white/10 bg-white/5 hover:border-gold-400/40 transition-colors group',
          SIZE[size],
          shape === 'circle' ? 'rounded-full' : 'rounded-xl'
        )}
        title={`رفع صورة — ${label}`}
      >
        {imageUrl ? (
          <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white/30">{fallback}</div>
        )}
        <span className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          {loading ? (
            <Loader2 className="w-4 h-4 text-white animate-spin" />
          ) : (
            <Camera className="w-4 h-4 text-white" />
          )}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <span className="text-sm text-white truncate">{label}</span>
    </div>
  );
}
