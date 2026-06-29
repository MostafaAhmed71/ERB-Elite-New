import { ChevronLeft } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { HumaaansIllustration } from '../ui/HumaaansIllustration';
import type { TourStep } from '../../lib/onboarding';

type OnboardingTourProps = {
  open: boolean;
  step: number;
  steps: TourStep[];
  onNext: () => void;
  onSkip: () => void;
};

export function OnboardingTour({ open, step, steps, onNext, onSkip }: OnboardingTourProps) {
  if (steps.length === 0) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;

  return (
    <Modal open={open} onClose={onSkip} size="md" showClose={false}>
      <div className="p-6 space-y-5">
        <HumaaansIllustration
          id="onboarding"
          className="w-full max-h-36 mx-auto"
        />

        <div>
          <p className="text-white/40 text-xs">
            الخطوة {step + 1} من {steps.length}
          </p>
          <h2 className="text-white font-bold text-lg">{current.title}</h2>
        </div>

        <p className="text-white/70 text-sm leading-relaxed">{current.description}</p>

        {current.hint && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-3 text-white/50 text-xs leading-relaxed">
            💡 {current.hint}
          </div>
        )}

        <div className="flex gap-1.5 justify-center">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-gold-400' : 'w-1.5 bg-white/20'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-white/40 hover:text-white/70 text-sm transition-colors"
          >
            تخطي الجولة
          </button>
          <Button onClick={onNext} icon={!isLast ? <ChevronLeft className="w-4 h-4" /> : undefined}>
            {isLast ? 'ابدأ الآن' : 'التالي'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
