import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, icon, ...props }, ref) => {
    return (
      <div className="relative w-full flex items-center">
        {icon && <div className="absolute left-4 text-muted-foreground pointer-events-none">{icon}</div>}
        <input
          type={type}
          className={cn(
            'flex h-12 w-full rounded-full border-2 border-border bg-background px-5 py-2 text-base text-foreground shadow-inner placeholder:text-muted-foreground focus-visible:outline-none focus-visible:border-[var(--theme-primary,#5B5BF0)] focus-visible:ring-2 focus-visible:ring-[var(--theme-primary,#5B5BF0)]/20 disabled:cursor-not-allowed disabled:opacity-50 transition-all',
            icon && 'pl-11',
            className
          )}
          ref={ref}
          {...props}
        />
      </div>
    );
  }
);
Input.displayName = 'Input';
