export const LIFECYCLE_STAGES = [
  { value: 'proposed', label: 'مقترح' },
  { value: 'review', label: 'مراجعة' },
  { value: 'approved', label: 'موافق عليه' },
  { value: 'active', label: 'نشط' },
  { value: 'evaluation', label: 'تقييم' },
  { value: 'archived', label: 'أرشيف' },
] as const;

export type LifecycleStage = (typeof LIFECYCLE_STAGES)[number]['value'];

export function getLifecycleLabel(stage: string): string {
  return LIFECYCLE_STAGES.find((s) => s.value === stage)?.label ?? stage;
}
