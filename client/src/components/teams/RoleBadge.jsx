import { cn } from '@/lib/cn';
import { ROLE_META } from '@/lib/constants';

const SIZES = {
  sm: 'h-5 px-1.5 text-[11px]',
  md: 'h-6 px-2 text-xs',
};

/**
 * Team role as an outlined tag (Owner / Admin / Member). The owner reads in ink, the other roles
 * in muted text: hierarchy through weight, not colour.
 */
export function RoleBadge({ role, size = 'sm', className }) {
  const meta = ROLE_META[role];
  if (!meta) return null;

  return (
    <span
      className={cn(
        'inline-flex max-w-full shrink-0 items-center whitespace-nowrap rounded border font-medium leading-none',
        role === 'owner' ? 'border-fg/30 text-fg' : 'border-line-strong text-fg-muted',
        SIZES[size] ?? SIZES.sm,
        className,
      )}
    >
      {meta.label}
    </span>
  );
}
