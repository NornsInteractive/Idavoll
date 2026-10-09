import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { motion, type HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-bold transition-colors select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-[var(--theme-primary,#5B5BF0)] text-white hover:opacity-90 shadow-md shadow-[var(--theme-primary,#5B5BF0)]/20 active:opacity-100',
        secondary:
          'bg-[#FF6B5E] text-white hover:bg-[#fc5444] shadow-md shadow-rose-500/20',
        tertiary:
          'bg-[#2EC4A6] text-white hover:bg-[#25A98E] shadow-md shadow-teal-500/20',
        outline:
          'border-2 border-[var(--theme-primary,#5B5BF0)] text-[var(--theme-primary,#5B5BF0)] hover:bg-[var(--theme-primary,#5B5BF0)]/10',
        ghost:
          'hover:bg-black/5 dark:hover:bg-white/10 text-foreground',
        surface:
          'bg-card text-card-foreground border border-border hover:bg-muted/80 shadow-sm',
      },
      size: {
        default: 'h-12 px-6 py-3 rounded-full text-base',
        sm: 'h-9 px-4 rounded-full text-sm',
        lg: 'h-14 px-8 rounded-full text-lg',
        icon: 'h-11 w-11 rounded-full p-0 flex items-center justify-center',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends Omit<HTMLMotionProps<'button'>, 'children'>,
    VariantProps<typeof buttonVariants> {
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, children, ...props }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.96 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
