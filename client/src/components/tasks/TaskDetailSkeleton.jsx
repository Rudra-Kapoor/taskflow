import { Skeleton } from '@/components/ui';

/** Placeholder for the task dialog while the task loads. */
export function TaskDetailSkeleton() {
  return (
    <div role="status" aria-label="Loading task">
      <div className="-mx-5 -mt-5 mb-5 flex h-14 items-center gap-3 border-b border-line px-5 sm:-mx-6 sm:px-6">
        <Skeleton className="h-3 w-3 rounded" />
        <Skeleton className="h-3.5 w-28" />
        <Skeleton className="h-3.5 w-14" />
        <Skeleton className="ml-auto h-7 w-7 rounded-md" />
        <Skeleton className="h-7 w-7 rounded-md" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20.5rem] lg:gap-8">
        <div className="space-y-6">
          <div className="space-y-2.5">
            <Skeleton className="h-6 w-4/5" />
            <Skeleton className="h-6 w-1/2" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-11/12" />
            <Skeleton className="h-3.5 w-2/3" />
          </div>
          <Skeleton className="h-9 w-56" />
          <div className="flex gap-3">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <Skeleton className="h-16 flex-1 rounded-xl" />
          </div>
        </div>
        <div className="space-y-3 rounded-xl border border-line p-4">
          {[1, 2, 3, 4, 5].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-7 flex-1 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
