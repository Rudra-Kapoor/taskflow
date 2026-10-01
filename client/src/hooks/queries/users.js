import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { searchUsers } from '@/api/users';
import { queryKeys } from '@/lib/queryKeys';

const MIN_QUERY_LENGTH = 2;

/**
 * Users matching `q` (debounce it in the caller) -> `UserPublic[]`. Disabled below two
 * characters; previous results stay visible while the next search loads.
 */
export function useUserSearch(q, { excludeTeam } = {}) {
  const term = (q ?? '').trim();
  const enabled = term.length >= MIN_QUERY_LENGTH;
  return useQuery({
    queryKey: queryKeys.users.search(term, excludeTeam),
    queryFn: ({ signal }) => searchUsers({ q: term, excludeTeam }, { signal }),
    enabled,
    staleTime: 60_000,
    placeholderData: enabled ? keepPreviousData : undefined,
  });
}
