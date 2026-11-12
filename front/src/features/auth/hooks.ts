import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from './api';

export const authKeys = {
  profile: ['auth', 'profile'] as const,
};

export function useUserProfile(enabled = true) {
  return useQuery({ queryKey: authKeys.profile, queryFn: authApi.profile, enabled });
}

export function useUpdateUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (profile) => queryClient.setQueryData(authKeys.profile, profile),
  });
}
