import { Fragment, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Dialog, DialogPanel, Transition, TransitionChild } from '@headlessui/react';
import { BookOpen, X, HelpCircle } from 'lucide-react';
import { getAdminScreenGuide, type AdminScreenGuide } from '../../lib/adminScreenGuides';
import clsx from 'clsx';

type Props = {
  path?: string;
  guide?: AdminScreenGuide;
  className?: string;
  variant?: 'icon' | 'button';
};

export function ScreenGuideButton({ path, guide: guideProp, className, variant = 'button' }: Props) {
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const guide = guideProp ?? getAdminScreenGuide(path ?? location.pathname);

  if (!guide) return null;

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={clsx(
            'p-2 rounded-xl border border-white/10 bg-white/5 text-white/50 hover:text-gold-400 hover:border-gold-500/30 hover:bg-gold-500/10 transition-all',
            className,
          )}
          aria-label="دليل الشاشة"
          title="دليل الشاشة"
        >
          <HelpCircle className="w-5 h-5" />
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={clsx(
            'inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gold-500/25 bg-gold-500/10 text-gold-300 text-xs font-semibold hover:bg-gold-500/20 hover:border-gold-500/40 transition-all',
            className,
          )}
        >
          <BookOpen className="w-4 h-4" />
          دليل الشاشة
        </button>
      )}

      <Transition show={open} as={Fragment}>
        <Dialog onClose={() => setOpen(false)} className="relative z-[60]">
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/70 backdrop-blur-md" aria-hidden="true" />
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
                className="w-full sm:max-w-lg max-h-[90vh] flex flex-col bg-navy-950 border border-white/10 sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden"
                dir="rtl"
              >
                <div className="flex-shrink-0 px-5 py-4 border-b border-white/10 bg-gradient-to-l from-gold-950/30 to-navy-950">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/25 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-5 h-5 text-gold-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-white font-bold text-base">{guide.title}</h2>
                      <p className="text-white/50 text-sm mt-1 leading-relaxed">{guide.summary}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      className="p-2 rounded-xl text-white/40 hover:text-white hover:bg-white/10 transition-all flex-shrink-0"
                      aria-label="إغلاق"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-5 min-h-0">
                  {guide.sections.map((section) => (
                    <section key={section.title}>
                      <h3 className="text-gold-400/90 text-xs font-bold uppercase tracking-wide mb-3">
                        {section.title}
                      </h3>
                      <div className="space-y-2">
                        {section.items.map((item) => (
                          <div
                            key={item.label}
                            className="p-3 rounded-xl bg-navy-900/60 border border-white/8"
                          >
                            <p className="text-white font-semibold text-sm">{item.label}</p>
                            <p className="text-white/50 text-xs mt-1 leading-relaxed">{item.description}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </Dialog>
      </Transition>
    </>
  );
}
