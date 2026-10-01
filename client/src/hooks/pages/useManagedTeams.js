import { useMemo } from 'react';
import { useTeams } from '@/hooks/queries/teams';
import { MANAGER_ROLES } from '@/lib/constants';

const NO_TEAMS = [];

/**
 * The user's teams plus the ones they manage (owner / admin), i.e. where they may create and
 * edit projects. Spreads the `useTeams()` query result.
 */
export function useManagedTeams() {
  const query = useTeams();
  const teams = query.data ?? NO_TEAMS;
  const managedTeams = useMemo(
    () => teams.filter((team) => MANAGER_ROLES.includes(team.myRole)),
    [teams],
  );

  return { ...query, teams, managedTeams, canManageAny: managedTeams.length > 0 };
}
