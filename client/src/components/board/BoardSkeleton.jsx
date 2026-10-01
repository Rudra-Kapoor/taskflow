import { Card, Skeleton } from '@/components/ui';

const CARDS_PER_COLUMN = [3, 2, 3];
const LIST_ROWS = [72, 54, 64, 80, 48, 60];

function CardSkeleton({ wide }) {
  return (
    <div className="mb-2 rounded-lg border border-line bg-surface px-3 py-2.5 dark:bg-surface-hover">
      <div className="flex items-center justify-between">
        <Skeleton className="h-2.5 w-12" />
        <Skeleton className="h-3.5 w-3.5 rounded-sm" />
      </div>
      <Skeleton className="mt-2.5 h-3.5 w-11/12" />
      {wide && <Skeleton className="mt-1.5 h-3.5 w-2/3" />}
      <div className="mt-3 flex items-center gap-2">
        <Skeleton className="h-3 w-14" />
        <Skeleton className="ml-auto h-6 w-6 rounded-full" />
      </div>
    </div>
  );
}

/** Three lanes of placeholder cards (while the tasks load). */
export function BoardColumnsSkeleton() {
  return (
    <div className="-mx-4 flex gap-3 overflow-hidden px-4 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:px-0 xl:gap-5">
      {CARDS_PER_COLUMN.map((count, column) => (
        <div
          key={column}
          className="w-[78vw] max-w-[20rem] shrink-0 rounded-xl bg-surface-muted px-2 pb-2 md:w-auto md:max-w-none"
        >
          <div className="flex h-11 items-center gap-2.5 px-1.5">
            <Skeleton className="h-2 w-2 rounded-full" />
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-2.5 w-4" />
          </div>
          {Array.from({ length: count }, (_, index) => (
            <CardSkeleton key={index} wide={(index + column) % 2 === 0} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Placeholder rows shaped like the list view (table from `md`, a hairline list below). */
export function ListViewSkeleton() {
  return (
    <>
      <Card padding={false} className="hidden overflow-hidden shadow-none md:block">
        <div className="flex h-10 items-center gap-6 border-b border-line px-5">
          {['w-8', 'w-24', 'w-14', 'w-14', 'w-16', 'w-16'].map((width, index) => (
            <Skeleton key={index} className={`h-2.5 ${width} ${index === 1 ? 'flex-1' : ''}`} />
          ))}
        </div>
        <div className="divide-y divide-line">
          {LIST_ROWS.map((width, index) => (
            <div key={index} className="flex h-12 items-center gap-6 px-5">
              <Skeleton className="h-3 w-12" />
              <div className="flex-1">
                <Skeleton className="h-3.5" style={{ width: `${width}%` }} />
              </div>
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-3.5 w-20" />
            </div>
          ))}
        </div>
      </Card>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface md:hidden">
        {LIST_ROWS.slice(0, 4).map((width, index) => (
          <li key={index} className="px-4 py-3.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-2.5 w-12" />
              <Skeleton className="h-3.5 w-3.5 rounded-sm" />
            </div>
            <Skeleton className="mt-2 h-3.5" style={{ width: `${width}%` }} />
            <div className="mt-3 flex items-center gap-3">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-3 w-14" />
              <Skeleton className="ml-auto h-6 w-6 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}

/** Loading placeholder for the board page: header, toolbar and the board or list content. */
export function BoardSkeleton({ view = 'board' }) {
  return (
    <div
      className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-6 sm:gap-8"
      role="status"
      aria-label="Loading board"
    >
      <div className="space-y-3">
        <Skeleton className="h-2.5 w-44" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-3.5 w-full max-w-xl" />
        <Skeleton className="!mt-5 h-1 w-44" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Skeleton className="h-9 w-full rounded-md sm:w-56" />
        <Skeleton className="h-9 w-32 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </div>

      {view === 'list' ? <ListViewSkeleton /> : <BoardColumnsSkeleton />}
    </div>
  );
}
