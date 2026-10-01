import { cn } from '@/lib/cn';

const SIZES = { sm: 'h-1', md: 'h-1.5', lg: 'h-2' };

/**
 * Thin horizontal progress bar (vermilion by default). `color` is a hex value (e.g. a project colour) or Tailwind bg class.
 */
export function ProgressBar({ value = 0, color = 'bg-brand-500', size = 'sm', label, className }) {
  const percent = Math.min(100, Math.max(0, Number(value) || 0));
  const isHex = typeof color === 'string' && color.startsWith('#');

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(percent)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={cn(
        'w-full overflow-hidden rounded-full bg-fg/[0.08] dark:bg-fg/[0.12]',
        SIZES[size] ?? SIZES.sm,
        className,
      )}
    >
      <div
        className={cn(
          'h-full rounded-full transition-[width] duration-500 ease-out',
          !isHex && color,
        )}
        style={{ width: `${percent}%`, backgroundColor: isHex ? color : undefined }}
      />
    </div>
  );
}
