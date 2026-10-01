import { cn } from '@/lib/cn';

/** Shimmering placeholder block. Size it with `className` (e.g. "h-4 w-32"). */
export function Skeleton({ className, ...props }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'relative isolate overflow-hidden rounded-md bg-line/60',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer',
        'after:bg-gradient-to-r after:from-transparent after:via-white/60 after:to-transparent',
        'dark:after:via-white/[0.05]',
        className,
      )}
      {...props}
    />
  );
}
