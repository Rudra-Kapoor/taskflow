import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  addMember,
  createTeam,
  deleteTeam,
  getTeam,
  getTeams,
  removeMember,
  updateMemberRole,
  updateTeam,
} from '@/api/teams';
import { useAuth } from '@/context/AuthContext';
import { removeTeamFromCaches, setTeamInCache } from '@/lib/cache';
import { getId } from '@/lib/ids';
import { mutationKeys, queryKeys } from '@/lib/queryKeys';

/**
 * After a team changed: its list entry, the project details embedding its members and people
 * searches (they hide the team's current members).
 */
function refreshTeamAggregates(queryClient) {
  queryClient.invalidateQueries({ queryKey: queryKeys.teams.list() });
  queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  queryClient.invalidateQueries({ queryKey: queryKeys.users.searches() });
}

/** Mutation hook whose response is the saved Team: written to the detail cache, lists refreshed. */
function useTeamMutation({ mutationKey, mutationFn }) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationKey,
    mutationFn,
    onSuccess: (team) => {
      setTeamInCache(queryClient, team, { currentUserId: user?._id, seed: true });
      refreshTeamAggregates(queryClient);
    },
  });
}

/** Teams the user belongs to. */
export function useTeams() {
  return useQuery({
    queryKey: queryKeys.teams.list(),
    queryFn: ({ signal }) => getTeams({ signal }),
  });
}

/** One team with its members and the caller's `myRole`. */
export function useTeam(teamId) {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: queryKeys.teams.detail(teamId),
    queryFn: ({ signal }) => getTeam(teamId, { signal }),
    enabled: Boolean(teamId),
    // The list holds the same Team shape: show it while the detail loads.
    placeholderData: () => {
      const team = queryClient
        .getQueryData(queryKeys.teams.list())
        ?.find?.((item) => item._id === teamId);
      return Array.isArray(team?.members) ? team : undefined;
    },
  });
}

/** vars `{ name, description? }` -> the created team. */
export function useCreateTeam() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationKey: mutationKeys.teams.create,
    mutationFn: (data) => createTeam(data),
    onSuccess: (team) => {
      setTeamInCache(queryClient, team, { currentUserId: user?._id, seed: true });
      queryClient.invalidateQueries({ queryKey: queryKeys.teams.list() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}

/** vars `{ name?, description? }` -> the updated team. */
export function useUpdateTeam(teamId) {
  return useTeamMutation({
    mutationKey: mutationKeys.teams.update,
    mutationFn: (data) => updateTeam(teamId, data),
  });
}

/** vars `teamId`. Deletes the team with its projects, tasks and activity. */
export function useDeleteTeam() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: mutationKeys.teams.delete,
    mutationFn: (teamId) => deleteTeam(teamId),
    onSuccess: (_data, teamId) => removeTeamFromCaches(queryClient, teamId),
  });
}

/** vars `{ email, role }` -> the updated team. */
export function useAddMember(teamId) {
  return useTeamMutation({
    mutationKey: mutationKeys.teams.addMember,
    mutationFn: ({ email, role }) => addMember(teamId, { email, role }),
  });
}

/** vars `{ userId, role }` -> the updated team. */
export function useUpdateMemberRole(teamId) {
  return useTeamMutation({
    mutationKey: mutationKeys.teams.updateMemberRole,
    mutationFn: ({ userId, role }) => updateMemberRole(teamId, userId, role),
  });
}

/** vars `userId`. Removing yourself means leaving the team. */
export function useRemoveMember(teamId) {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationKey: mutationKeys.teams.removeMember(teamId),
    mutationFn: (userId) => removeMember(teamId, userId),
    onSuccess: (_data, userId) => {
      if (userId === user?._id) {
        removeTeamFromCaches(queryClient, teamId);
        return;
      }
      queryClient.setQueryData(queryKeys.teams.detail(teamId), (team) =>
        team?.members
          ? { ...team, members: team.members.filter((member) => getId(member.user) !== userId) }
          : team,
      );
      refreshTeamAggregates(queryClient);
      // The removed member's tasks in the team's projects were unassigned.
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard });
    },
  });
}
