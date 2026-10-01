import { Link } from 'react-router-dom';
import { SquareKanban } from 'lucide-react';
import { cn } from '@/lib/cn';

const SIZES = {
  sm: { tile: 'h-7 w-7 rounded-lg', icon: 'h-4 w-4', text: 'text-[15px]' },
  md: { tile: 'h-8 w-8 rounded-lg', icon: 'h-[18px] w-[18px]', text: 'text-[17px]' },
  lg: { tile: 'h-10 w-10 rounded-xl', icon: 'h-5 w-5', text: 'text-xl' },
};

/**
 * TaskFlow brand mark: gradient tile + wordmark.
 * `variant="inverted"` is for coloured backgrounds; pass `to` to make it a home link.
 */
export function Logo({ size = 'md', showText = true, variant = 'default', to, className }) {
  const sizing = SIZES[size] ?? SIZES.md;
  const inverted = variant === 'inverted';

  const content = (
    <>
      <span
        className={cn(
          'relative flex shrink-0 items-center justify-center',
          sizing.tile,
          inverted
            ? 'bg-white/15 ring-1 ring-inset ring-white/30 backdrop-blur'
            : 'bg-gradient-to-br from-brand-500 to-violet-600 shadow-sm shadow-brand-600/30 ring-1 ring-inset ring-white/10',
        )}
      >
        <SquareKanban
          className={cn('text-white', sizing.icon)}
          strokeWidth={2.25}
          aria-hidden="true"
        />
      </span>
      {showText && (
        <span
          className={cn(
            'font-bold tracking-tight',
            sizing.text,
            inverted ? 'text-white' : 'text-fg',
          )}
        >
          TaskFlow
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-label="TaskFlow home"
        className={cn('focus-ring inline-flex items-center gap-2.5 rounded-lg', className)}
      >
        {content}
      </Link>
    );
  }

  return <span className={cn('inline-flex items-center gap-2.5', className)}>{content}</span>;
}
