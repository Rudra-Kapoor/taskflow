import { Skeleton } from '@/components/ui';

const TITLE_WIDTHS = [62, 48, 70, 55, 66, 44, 58, 50];

/** Placeholder rows while the first page of results loads. */
export function TaskResultsSkeleton({ rows = 8 }) {
  return (
    <ul className="divide-y divide-line" aria-label="Loading tasks">
      {Array.from({ length: rows }, (_, index) => (
        <li key={index} className="flex items-center gap-4 px-4 py-4 sm:px-5" aria-hidden="true">
          <Skeleton className="h-3.5 w-12 shrink-0" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-3.5" style={{ width: `${TITLE_WIDTHS[index % 8]}%` }} />
            <Skeleton className="h-3 w-32" />
          </div>
          <Skeleton className="hidden h-5 w-20 rounded-md md:block" />
          <Skeleton className="hidden h-5 w-16 rounded-md md:block" />
          <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
          <Skeleton className="hidden h-3.5 w-14 md:block" />
        </li>
      ))}
    </ul>
  );
}
