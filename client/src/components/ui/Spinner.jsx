import { cn } from '@/lib/cn';

const SIZES = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-8 w-8',
};

/** Circular loading indicator; inherits the current text colour. */
export function Spinner({ size = 'md', className, label }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={cn('shrink-0 animate-spin', SIZES[size] ?? SIZES.md, className)}
      role={label ? 'status' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle
        cx="12"
        cy="12"
        r="9.5"
        stroke="currentColor"
        strokeWidth="2.5"
        className="opacity-20"
      />
      <path
        d="M21.5 12A9.5 9.5 0 0 0 12 2.5"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
