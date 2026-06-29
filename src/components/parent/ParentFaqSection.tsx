import { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import clsx from 'clsx';

const FAQ_ITEMS = [
  {
    q: 'كيف تُحسب نقاط ابني؟',
    a: 'إجمالي النقاط = مجموع كل النقاط المعتمدة في سجل التميز. فقط ما يعتمده رائد النشاط يدخل في الرصيد.',
  },
  {
    q: 'لماذا نقاط ابني «بانتظار موافقة رائد النشاط»؟',
    a: 'كل منح من المعلم يمر بمراجعة رائد النشاط قبل أن تدخل في رصيد الابن المعتمد.',
  },
  {
    q: 'هل يمكنني تعديل بيانات الابن من هنا؟',
    a: 'لا. حساب ولي الأمر للمتابعة فقط. أي تعديل يتم عبر إدارة المدرسة.',
  },
  {
    q: 'كيف أتابع نتائج الاختبارات؟',
    a: 'من قائمة «نتائج الاختبارات» أو من لوحة الرئيسية حيث يظهر آخر اختبار.',
  },
  {
    q: 'ماذا أرى وماذا لا أرى؟',
    a: 'ترى: إجمالي النقاط، المحاور، الحضور، الاختبارات، والشارات. لا ترى: منح نقاط، تعديل سجلات، أو بيانات طلاب آخرين بأسمائهم.',
  },
];

export function ParentFaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <div className="glass-card p-5 space-y-3" dir="rtl">
      <h3 className="text-white font-semibold text-sm flex items-center gap-2">
        <HelpCircle className="w-4 h-4 text-gold-400" />
        أسئلة شائعة لولي الأمر
      </h3>
      <div className="space-y-2">
        {FAQ_ITEMS.map((item, i) => (
          <div key={i} className="border border-white/5 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenIndex(openIndex === i ? null : i)}
              className="w-full flex items-center justify-between gap-2 px-4 py-3 text-right text-xs text-white/80 hover:bg-white/3 transition-colors"
            >
              {item.q}
              <ChevronDown className={clsx('w-4 h-4 shrink-0 transition-transform', openIndex === i && 'rotate-180')} />
            </button>
            {openIndex === i && (
              <p className="px-4 pb-3 text-[11px] text-white/50 leading-relaxed">{item.a}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
