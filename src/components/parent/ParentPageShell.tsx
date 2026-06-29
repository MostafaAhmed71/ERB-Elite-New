import type { ReactNode } from 'react';
import { ParentContactFooter } from './ParentContactFooter';

type Props = {
  children: ReactNode;
  className?: string;
};

export function ParentPageShell({ children, className }: Props) {
  return (
    <div className={className ?? 'space-y-4'} dir="rtl">
      {children}
      <ParentContactFooter />
    </div>
  );
}
