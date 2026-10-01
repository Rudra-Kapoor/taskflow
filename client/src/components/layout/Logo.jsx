import { Link } from 'react-router-dom';
import { cn } from '@/lib/cn';

const SIZES = {
  sm: { mark: 'h-4 w-4', text: 'text-[15px]', gap: 'gap-2' },
  md: { mark: 'h-[18px] w-[18px]', text: 'text-[17px]', gap: 'gap-2' },
  lg: { mark: 'h-[22px] w-[22px]', text: 'text-[22px]', gap: 'gap-2.5' },
};

/**
 * The TaskFlow mark: a vermilion block with its top-right cell lifted out, a task on the move.
 * Same drawing as public/favicon.svg.
 */
function LogoMark({ className }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M4.5 2H10a1.5 1.5 0 0 1 1.5 1.5V7A1.5 1.5 0 0 0 13 8.5h3.5A1.5 1.5 0 0 1 18 10v5.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 2 15.5v-11A2.5 2.5 0 0 1 4.5 2Z" />
      <rect x="13" y="2" width="5" height="5" rx="1.25" />
    </svg>
  );
}

/**
 * TaskFlow brand: vermilion mark + lowercase "taskflow" wordmark.
 * `variant="inverted"` is for dark / coloured backgrounds; pass `to` to make it a home link.
 */
export function Logo({ size = 'md', showText = true, variant = 'default', to, className }) {
  const sizing = SIZES[size] ?? SIZES.md;
  const inverted = variant === 'inverted';

  const content = (
    <>
      <LogoMark className={cn('shrink-0 text-brand-500', sizing.mark)} />
      {showText && (
        <span
          className={cn(
            'font-semibold leading-none tracking-[-0.03em]',
            sizing.text,
            inverted ? 'text-white' : 'text-fg',
          )}
        >
          taskflow
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        aria-label="TaskFlow home"
        className={cn('focus-ring inline-flex items-center rounded-md', sizing.gap, className)}
      >
        {content}
      </Link>
    );
  }

  return <span className={cn('inline-flex items-center', sizing.gap, className)}>{content}</span>;
}
