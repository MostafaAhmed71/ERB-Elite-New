import { Fragment } from 'react';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { Share, PlusSquare, Compass, X, Smartphone } from 'lucide-react';
import { PLATFORM_ICON, PLATFORM_NAME, PLATFORM_NAME_SHORT } from '../../lib/branding';
import { isIosSafari } from '../../lib/pwaPlatform';

type Props = {
  open: boolean;
  onClose: () => void;
};

const STEPS_SAFARI = [
  {
    icon: Share,
    title: 'اضغط زر المشاركة',
    description: 'الزر المربّع مع السهم في أسفل شاشة Safari (أو أعلى الشاشة في iPad).',
  },
  {
    icon: PlusSquare,
    title: 'إضافة إلى الشاشة الرئيسية',
    description: 'مرّر القائمة للأسفل واختر «إضافة إلى الشاشة الرئيسية».',
  },
  {
    icon: Smartphone,
    title: 'اضغط «إضافة»',
    description: `ستظهر أيقونة ${PLATFORM_NAME_SHORT} على شاشتك الرئيسية مثل أي تطبيق.`,
  },
];

const STEPS_OTHER_BROWSER = [
  {
    icon: Compass,
    title: 'افتح الرابط في Safari',
    description: 'على iPhone، التثبيت يعمل من Safari فقط — انسخ الرابط وافتحه في Safari.',
  },
  ...STEPS_SAFARI,
];

export function IosInstallGuide({ open, onClose }: Props) {
  const inSafari = isIosSafari();
  const steps = inSafari ? STEPS_SAFARI : STEPS_OTHER_BROWSER;

  return (
    <Transition show={open} as={Fragment}>
      <Dialog onClose={onClose} className="relative z-[80]">
        <TransitionChild
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/75 backdrop-blur-md" aria-hidden="true" />
        </TransitionChild>

        <div className="fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enterTo="opacity-100 translate-y-0 sm:scale-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 translate-y-0 sm:scale-100"
            leaveTo="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <DialogPanel
              className="w-full sm:max-w-md max-h-[92vh] flex flex-col bg-navy-950 border border-white/10 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden"
              dir="rtl"
            >
              <div className="px-5 py-4 border-b border-white/10 bg-gradient-to-l from-gold-950/30 to-navy-950">
                <div className="flex items-start gap-3">
                  <img
                    src={PLATFORM_ICON}
                    alt=""
                    className="w-12 h-12 rounded-full object-cover border-2 border-gold-500/30 shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <h2 className="text-white font-bold text-base">تثبيت على iPhone</h2>
                    <p className="text-white/50 text-xs mt-1 leading-relaxed">
                      {inSafari
                        ? `اتبع الخطوات لإضافة ${PLATFORM_NAME} إلى شاشتك الرئيسية.`
                        : 'يجب استخدام Safari — Chrome على iPhone لا يدعم التثبيت المباشر.'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10"
                    aria-label="إغلاق"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-3">
                {!inSafari && (
                  <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-200 text-xs leading-relaxed">
                    انسخ رابط الموقع من شريط العنوان، افتح تطبيق <strong>Safari</strong>، والصق الرابط ثم
                    أكمل الخطوات أدناه.
                  </div>
                )}

                {steps.map((step, i) => (
                  <div
                    key={step.title}
                    className="flex items-start gap-3 p-3 rounded-xl bg-navy-900/60 border border-white/8"
                  >
                    <div className="w-9 h-9 rounded-xl bg-gold-500/15 border border-gold-500/25 flex items-center justify-center shrink-0">
                      <step.icon className="w-4 h-4 text-gold-400" />
                    </div>
                    <div>
                      <p className="text-white/40 text-[10px] font-bold mb-0.5">الخطوة {i + 1}</p>
                      <p className="text-white font-semibold text-sm">{step.title}</p>
                      <p className="text-white/50 text-xs mt-1 leading-relaxed">{step.description}</p>
                    </div>
                  </div>
                ))}

                <p className="text-white/30 text-[10px] text-center pt-2 leading-relaxed">
                  Apple لا تسمح بتثبيت تلقائي مثل Android — هذه الطريقة الرسمية الوحيدة بدون App Store.
                </p>
              </div>

              <div className="p-4 border-t border-white/10 pb-safe">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-3 rounded-xl bg-gold-500 text-navy-950 font-bold text-sm hover:bg-gold-400 transition-colors"
                >
                  فهمت
                </button>
              </div>
            </DialogPanel>
          </TransitionChild>
        </div>
      </Dialog>
    </Transition>
  );
}
