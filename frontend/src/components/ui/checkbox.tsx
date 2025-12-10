import { cn } from '@/lib/utils';
import * as React from 'react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> { }

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      type="checkbox"
      className={cn(
        'h-4 w-4 rounded border border-input text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        className
      )}
      {...props}
    />
  )
);
Checkbox.displayName = 'Checkbox';


