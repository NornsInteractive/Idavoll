import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full px-3 py-1 text-xs font-bold transition-colors select-none',
  {
    variants: {
      variant: {
        default: 'bg-[var(--theme-primary,#5B5BF0)] text-white shadow-sm',
        secondary: 'bg-[#FF6B5E] text-white',
        mint: 'bg-[#2EC4A6] text-white',
        outline: 'border border-border text-foreground',
        subtle: 'bg-[var(--theme-primary,#5B5BF0)]/10 text-[var(--theme-primary,#5B5BF0)] dark:bg-[var(--theme-primary,#5B5BF0)]/20',
        muted: 'bg-muted text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
