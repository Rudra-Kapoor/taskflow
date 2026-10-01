import { Card, Skeleton } from '@/components/ui';

const CARDS_PER_COLUMN = [3, 2, 3];
const LIST_ROWS = [72, 54, 64, 80, 48, 60];

function CardSkeleton({ wide }) {
  return (
    <div className="mb-2 rounded-lg border border-line bg-surface p-3 shadow-xs dark:bg-surface-hover">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-5 w-5 rounded-md" />
      </div>
      <Skeleton className="mt-2.5 h-3.5 w-11/12" />
      {wide && <Skeleton className="mt-1.5 h-3.5 w-2/3" />}
      <div className="mt-3 flex items-center gap-2">
        <Skeleton className="h-5 w-16 rounded-md" />
        <Skeleton className="ml-auto h-6 w-6 rounded-full" />
      </div>
    </div>
  );
}

/** Three columns of placeholder cards (while the tasks load). */
export function BoardColumnsSkeleton() {
  return (
    <div className="-mx-4 flex gap-3 overflow-hidden px-4 sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:px-0 xl:gap-5">
      {CARDS_PER_COLUMN.map((count, column) => (
        <div
          key={column}
          className="w-[76vw] max-w-[21rem] shrink-0 rounded-xl border border-line/70 bg-surface-muted p-2 md:w-auto md:max-w-none dark:border-line/50"
        >
          <div className="flex h-10 items-center gap-2 px-1.5">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          {Array.from({ length: count }, (_, index) => (
            <CardSkeleton key={index} wide={(index + column) % 2 === 0} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** Placeholder rows shaped like the list view (table from `md`, stacked cards below). */
export function ListViewSkeleton() {
  return (
    <>
      <Card padding={false} className="hidden overflow-hidden md:block">
        <div className="flex h-10 items-center gap-6 border-b border-line bg-surface-muted/60 px-5">
          {['w-8', 'w-24', 'w-14', 'w-14', 'w-16', 'w-16'].map((width, index) => (
            <Skeleton key={index} className={`h-3 ${width} ${index === 1 ? 'flex-1' : ''}`} />
          ))}
        </div>
        <div className="divide-y divide-line">
          {LIST_ROWS.map((width, index) => (
            <div key={index} className="flex h-12 items-center gap-6 px-5">
              <Skeleton className="h-3 w-12" />
              <div className="flex-1">
                <Skeleton className="h-3.5" style={{ width: `${width}%` }} />
              </div>
              <Skeleton className="h-5 w-24 rounded-md" />
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-28 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-md" />
            </div>
          ))}
        </div>
      </Card>
      <ul className="space-y-2 md:hidden">
        {LIST_ROWS.slice(0, 4).map((width, index) => (
          <li key={index} className="card p-3.5">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-12" />
              <Skeleton className="h-5 w-5 rounded-md" />
            </div>
            <Skeleton className="mt-2 h-3.5" style={{ width: `${width}%` }} />
            <div className="mt-3 flex items-center gap-2">
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-14 rounded-md" />
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
      className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-5 sm:gap-6"
      role="status"
      aria-label="Loading board"
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="flex-1 space-y-2.5 pt-1">
          <Skeleton className="h-6 w-56 max-w-full" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
          <Skeleton className="h-3.5 w-full max-w-xl" />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-full rounded-lg sm:w-56" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
          <Skeleton className="h-9 w-32 rounded-lg" />
        </div>
        <Skeleton className="h-3 w-20" />
      </div>

      {view === 'list' ? <ListViewSkeleton /> : <BoardColumnsSkeleton />}
    </div>
  );
}
