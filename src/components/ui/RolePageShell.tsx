import clsx from 'clsx';
import type { ReactNode } from 'react';

type RolePageShellProps = {
  children: ReactNode;
  className?: string;
  /** تباعد عمودي افتراضي بين أقسام الصفحة */
  spaced?: boolean;
};

/**
 * غلاف صفحة موحّد لكل الأدوار — بدون منطق أعمال.
 * يوحّد RTL والتباعد والحد الأدنى للعرض مع الطبقات البصرية المشتركة.
 */
export function RolePageShell({ children, className, spaced = true }: RolePageShellProps) {
  return (
    <div
      dir="rtl"
      className={clsx(
        'relative w-full min-w-0',
        spaced && 'space-y-4 sm:space-y-6',
        className,
      )}
    >
      {children}
    </div>
  );
}
