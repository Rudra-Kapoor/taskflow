import { Skeleton } from '@/components/ui';

/** Placeholder for the task dialog while the task loads (same frame as the loaded dialog). */
export function TaskDetailSkeleton() {
  return (
    <div role="status" aria-label="Loading task">
      <div className="-mx-5 mb-7 flex h-14 items-center gap-3 border-b border-line px-5 sm:-mx-8 sm:mb-9 sm:px-8">
        <Skeleton className="h-2 w-2 rounded-[2px]" />
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-3 w-14" />
        <Skeleton className="ml-auto h-7 w-7 rounded-md" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-x-12">
        <div className="space-y-9">
          <div className="space-y-3">
            <Skeleton className="h-8 w-4/5" />
            <Skeleton className="h-8 w-1/2" />
          </div>
          <div className="space-y-2.5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <Skeleton className="h-9 w-56" />
          <div className="flex gap-3">
            <Skeleton className="h-6 w-6 shrink-0 rounded-full" />
            <Skeleton className="h-16 flex-1 rounded-lg" />
          </div>
        </div>
        <div>
          <Skeleton className="mb-3 h-3 w-16" />
          <div className="divide-y divide-line border-y border-line">
            {[1, 2, 3, 4, 5].map((row) => (
              <div key={row} className="flex items-center gap-3 py-3">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-6 flex-1 rounded-md" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
