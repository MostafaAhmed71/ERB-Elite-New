import type { ReactNode } from 'react';
import { ParentContactFooter } from './ParentContactFooter';
import { ParentChildBar } from './ParentChildBar';
import { RolePageShell } from '../ui/RolePageShell';

type Props = {
  children: ReactNode;
  className?: string;
  /** شريط اختيار الابن الموحّد — افتراضي مفعّل */
  showChildBar?: boolean;
};

export function ParentPageShell({ children, className, showChildBar = true }: Props) {
  return (
    <RolePageShell className={className} spaced>
      {showChildBar && <ParentChildBar />}
      {children}
      <ParentContactFooter />
    </RolePageShell>
  );
}
