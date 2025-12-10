import { ReactNode } from 'react';

interface SidepanelLayoutProps {
  children: ReactNode;
}

export function SidepanelLayout({ children }: SidepanelLayoutProps) {
  return (
    <div className="h-screen w-full overflow-hidden">
      {children}
    </div>
  );
}

