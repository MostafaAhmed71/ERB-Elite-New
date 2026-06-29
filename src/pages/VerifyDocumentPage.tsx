import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import { verifyDocumentCode } from '../lib/documentSignature';
import { TapHandLoader } from '../components/ui/TapHandLoader';

/** P8 — التحقق من توقيع وثيقة */
export function VerifyDocumentPage() {
  const { code } = useParams<{ code: string }>();

  const { data, isLoading } = useQuery({
    queryKey: ['verify-doc', code],
    queryFn: () => verifyDocumentCode(code ?? ''),
    enabled: !!code,
  });

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6" dir="rtl">
      <div className="glass-card max-w-md w-full p-8 text-center space-y-4">
        {isLoading ? (
          <TapHandLoader label="جاري التحقق..." />
        ) : !data ? (
          <>
            <AlertCircle className="w-12 h-12 text-red-400 mx-auto" />
            <h1 className="text-white font-bold text-lg">رمز غير صالح</h1>
            <p className="text-white/40 text-sm">لم يُعثر على وثيقة بهذا الرمز</p>
          </>
        ) : (
          <>
            <ShieldCheck className="w-12 h-12 text-emerald-400 mx-auto" />
            <h1 className="text-white font-bold text-lg">وثيقة موثّقة — P8</h1>
            <p className="text-emerald-400 font-mono text-sm">{data.verify_code}</p>
            <p className="text-white/50 text-xs">النوع: {data.doc_type}</p>
            <p className="text-white/30 text-[10px] font-mono break-all">{data.payload_hash}</p>
            <p className="text-white/40 text-xs">
              {new Date(data.created_at).toLocaleString('ar-SA')}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
