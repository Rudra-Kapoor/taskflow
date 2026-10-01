import { useMutation, useQueryClient } from '@tanstack/react-query';
import { changePassword, updateProfile } from '@/api/auth';
import { useAuth } from '@/context/AuthContext';
import { patchUserInCaches } from '@/lib/cache';
import { mutationKeys } from '@/lib/queryKeys';

/** vars `{ name?, title?, avatarColor? }` -> the updated user (also updates `useAuth().user`). */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { setUser } = useAuth();
  return useMutation({
    mutationKey: mutationKeys.auth.updateProfile,
    mutationFn: (data) => updateProfile(data),
    onSuccess: (user) => {
      setUser(user);
      // Names and avatar colours are embedded in tasks, comments, teams...: patch every copy.
      patchUserInCaches(queryClient, user);
    },
  });
}

/**
 * vars `{ currentPassword, newPassword }` -> the new token. Every older token is revoked: this
 * session (and its other tabs) carries on with the new one, other devices are signed out.
 */
export function useChangePassword() {
  const { replaceToken } = useAuth();
  return useMutation({
    mutationKey: mutationKeys.auth.changePassword,
    mutationFn: (data) => changePassword(data),
    onSuccess: (token) => replaceToken(token),
  });
}
