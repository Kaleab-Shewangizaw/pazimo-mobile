import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';

import {
  deleteAccount,
  fetchNotificationPreferences,
  updateNotificationPreferences,
  updatePassword,
  updateProfile,
} from '@/api/auth';
import { ApiError } from '@/api/client';
import { queryKeys } from '@/queries/keys';
import { useAuthStore } from '@/stores/use-auth-store';
import type { NotificationPreferences } from '@/types/api';

/** Stored preferences only — see the backend's comment on why these don't gate delivery yet. */
export function useNotificationPreferences() {
  const token = useAuthStore((s) => s.token);

  const query = useQuery({
    queryKey: queryKeys.account.notificationPreferences,
    queryFn: fetchNotificationPreferences,
    enabled: Boolean(token),
  });

  return { ...query, preferences: query.data };
}

/** Manual mutation shape — matches `useSetContact`'s, this codebase has no `useMutation` anywhere. */
export function useUpdateNotificationPreferences() {
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = useCallback(
    async (partial: Partial<NotificationPreferences>) => {
      setSubmitting(true);
      setError(null);
      try {
        const updated = await updateNotificationPreferences(partial);
        queryClient.setQueryData(queryKeys.account.notificationPreferences, updated);
        return true;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'That did not go through. Try again.');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [queryClient],
  );

  return { set, submitting, error };
}

/** Full-name edit, refreshing the cached profile in the auth store on success. */
export function useUpdateProfile() {
  const setUser = useAuthStore((s) => s.setUser);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (input: { firstName: string; lastName?: string }) => {
      setSubmitting(true);
      setError(null);
      try {
        const user = await updateProfile(input);
        await setUser(user);
        return true;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not update your name. Try again.');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [setUser],
  );

  return { submit, submitting, error };
}

/** A wrong current password surfaces as a 401 — the caller maps that to its own field-level message. */
export function useUpdatePassword() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(async (input: { currentPassword: string; newPassword: string }) => {
    setSubmitting(true);
    setError(null);
    try {
      await updatePassword(input);
      return true;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update your password. Try again.');
      return false;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return { submit, submitting, error };
}

/** Irreversible. Signs the account out and clears every cached query on success. */
export function useDeleteAccount() {
  const signOut = useAuthStore((s) => s.signOut);
  const queryClient = useQueryClient();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = useCallback(
    async (currentPassword: string) => {
      setSubmitting(true);
      setError(null);
      try {
        await deleteAccount(currentPassword);
        await signOut();
        queryClient.clear();
        return true;
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not delete your account. Try again.');
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [queryClient, signOut],
  );

  return { submit, submitting, error };
}
