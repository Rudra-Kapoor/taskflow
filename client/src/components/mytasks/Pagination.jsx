import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatNumber } from '@/lib/format';

/** "Page 2 of 5 · 93 tasks" with Previous / Next. Hidden when there is nothing to page. */
export function Pagination({ page, totalPages, total, noun = 'item', onPageChange, className }) {
  if (!total) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        'flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-line px-4 py-2.5 sm:px-5',
        className,
      )}
    >
      <p className="text-xs text-fg-muted">
        Page <span className="font-mono tabular-nums text-fg">{formatNumber(page)}</span> of{' '}
        <span className="font-mono tabular-nums text-fg">
          {formatNumber(Math.max(totalPages, 1))}
        </span>
        <span className="mx-2 text-fg-subtle" aria-hidden="true">
          ·
        </span>
        <span className="font-mono tabular-nums">{formatNumber(total)}</span>{' '}
        {total === 1 ? noun : `${noun}s`}
      </p>
      {totalPages > 1 && (
        <div className="-mr-2 flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            icon={ChevronLeft}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="ghost"
            size="sm"
            iconRight={ChevronRight}
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </nav>
  );
}
