import * as React from 'react';
import { cn } from '../../lib/utils';

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  alt?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  status?: 'online' | 'busy' | 'drawing' | 'offline';
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-16 h-16 text-lg',
  xl: 'w-24 h-24 text-2xl',
};

const statusColors = {
  online: 'bg-[#2EC4A6]',
  busy: 'bg-[#FF6B5E]',
  drawing: 'bg-[#5B5BF0]',
  offline: 'bg-muted-foreground',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  alt = 'avatar',
  size = 'md',
  status,
  className,
  ...props
}) => {
  return (
    <div className={cn('relative inline-flex flex-shrink-0 select-none', className)} {...props}>
      <div
        className={cn(
          'rounded-full overflow-hidden flex items-center justify-center font-bold bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 ring-2 ring-background shadow-sm',
          sizeClasses[size]
        )}
      >
        {src ? (
          <img src={src} alt={alt} className="w-full h-full object-cover" />
        ) : (
          alt.slice(0, 2).toUpperCase()
        )}
      </div>

      {status && (
        <span
          className={cn(
            'absolute bottom-0 right-0 block rounded-full ring-2 ring-background',
            size === 'sm' ? 'w-2.5 h-2.5' : size === 'md' ? 'w-3.5 h-3.5' : 'w-4 h-4',
            statusColors[status]
          )}
        />
      )}
    </div>
  );
};
