import { tagApi, type CreateTag, type Tag, type UpdateTag } from '@/lib/api';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './use-auth';

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export function useTags() {
  const { user, isLoading: isAuthLoading, isAuthenticated } = useAuth();
  const [tags, setTags] = useState<Tag[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      setIsLoading(true);
      setError(undefined);
      const data = await tagApi.getAll(user.id);
      setTags(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    // Wait for auth to finish loading and user to be authenticated before fetching
    if (!isAuthLoading && isAuthenticated && user) {
      void refresh();
    }
  }, [refresh, isAuthLoading, isAuthenticated, user]);

  const createTag = useCallback(
    async (payload: CreateTag) => {
      if (!user) throw new Error('User not authenticated');
      try {
        setIsSaving(true);
        setError(undefined);
        const created = await tagApi.create(user.id, payload);
        setTags((prev) => [...prev, created]);
        return created;
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [user]
  );

  const updateTag = useCallback(
    async (id: number, payload: UpdateTag) => {
      if (!user) throw new Error('User not authenticated');
      try {
        setIsSaving(true);
        setError(undefined);
        const updated = await tagApi.update(id, user.id, payload);
        setTags((prev) => prev.map((tag) => (tag.id === id ? updated : tag)));
        return updated;
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [user]
  );

  const deleteTag = useCallback(
    async (id: number) => {
      if (!user) throw new Error('User not authenticated');
      try {
        setDeletingId(id);
        setError(undefined);
        await tagApi.delete(id, user.id);
        setTags((prev) => prev.filter((tag) => tag.id !== id));
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setDeletingId(null);
      }
    },
    [user]
  );

  return {
    tags,
    isLoading,
    isSaving,
    deletingId,
    error,
    refresh,
    createTag,
    updateTag,
    deleteTag,
  };
}
