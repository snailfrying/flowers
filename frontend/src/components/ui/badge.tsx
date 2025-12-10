import { cn } from '@/lib/utils';
import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'secondary';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
        variant === 'secondary'
          ? 'bg-muted text-muted-foreground'
          : 'bg-primary text-primary-foreground',
        className
      )}
      {...props}
    />
  )
);
Badge.displayName = 'Badge';


