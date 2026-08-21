import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import {
  isTourCompleted,
  markTourCompleted,
  TOUR_STEPS,
} from '../../lib/onboarding';
import type { TourStep } from '../../lib/onboarding';
import { OnboardingTour } from './OnboardingTour';

type OnboardingContextValue = {
  startTour: () => void;
};

const OnboardingContext = createContext<OnboardingContextValue>({ startTour: () => {} });

export function useOnboardingContext() {
  return useContext(OnboardingContext);
}

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const { role } = useAuthStore();
  const [tourOpen, setTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0);

  const steps: TourStep[] = role ? TOUR_STEPS[role] ?? [] : [];

  const startTour = useCallback(() => {
    if (steps.length === 0) return;
    setTourStep(0);
    setTourOpen(true);
  }, [steps.length]);

  useEffect(() => {
    if (!role || steps.length === 0 || isTourCompleted(role)) return;
    try {
      if (sessionStorage.getItem('northElitePromoTour') === '1') return;
    } catch {
      /* ignore */
    }
    const timer = setTimeout(() => {
      setTourStep(0);
      setTourOpen(true);
    }, 600);
    return () => clearTimeout(timer);
  }, [role, steps.length]);

  const nextStep = useCallback(() => {
    if (tourStep < steps.length - 1) {
      setTourStep((s) => s + 1);
    } else {
      if (role) markTourCompleted(role);
      setTourOpen(false);
      setTourStep(0);
    }
  }, [tourStep, steps.length, role]);

  const skipTour = useCallback(() => {
    if (role) markTourCompleted(role);
    setTourOpen(false);
    setTourStep(0);
  }, [role]);

  return (
    <OnboardingContext.Provider value={{ startTour }}>
      {children}
      <OnboardingTour
        open={tourOpen}
        step={tourStep}
        steps={steps}
        onNext={nextStep}
        onSkip={skipTour}
      />
    </OnboardingContext.Provider>
  );
}
