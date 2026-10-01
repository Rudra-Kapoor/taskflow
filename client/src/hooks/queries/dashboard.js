import { useQuery } from '@tanstack/react-query';
import { getDashboard } from '@/api/dashboard';
import { queryKeys } from '@/lib/queryKeys';

/** `{ stats, statusBreakdown, priorityBreakdown, upcomingTasks }` for the current user. */
export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: ({ signal }) => getDashboard({ signal }),
  });
}
