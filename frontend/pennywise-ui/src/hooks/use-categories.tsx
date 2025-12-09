import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  categoryApi,
  type Category,
  type CreateCategory,
  type UpdateCategory,
} from '@/lib/api';

interface CategoriesContextValue {
  categories: Category[];
  isLoading: boolean;
  isSaving: boolean;
  deletingId: number | null;
  error?: string;
  refresh: () => Promise<void>;
  createCategory: (payload: CreateCategory) => Promise<Category>;
  updateCategory: (id: number, payload: UpdateCategory) => Promise<Category>;
  deleteCategory: (id: number) => Promise<void>;
}

const CategoriesContext = createContext<CategoriesContextValue | undefined>(
  undefined,
);

function getErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}

export function CategoriesProvider({ children }: { children: ReactNode }) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | undefined>();

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(undefined);
      const data = await categoryApi.getAll();
      setCategories(data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createCategory = useCallback(
    async (payload: CreateCategory) => {
      try {
        setIsSaving(true);
        setError(undefined);
        const created = await categoryApi.create(payload);
        setCategories((prev) => [...prev, created]);
        return created;
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const updateCategory = useCallback(
    async (id: number, payload: UpdateCategory) => {
      try {
        setIsSaving(true);
        setError(undefined);
        const updated = await categoryApi.update(id, payload);
        setCategories((prev) =>
          prev.map((category) => (category.id === id ? updated : category)),
        );
        return updated;
      } catch (err) {
        setError(getErrorMessage(err));
        throw err;
      } finally {
        setIsSaving(false);
      }
    },
    [],
  );

  const deleteCategory = useCallback(async (id: number) => {
    try {
      setDeletingId(id);
      setError(undefined);
      await categoryApi.delete(id);
      setCategories((prev) => prev.filter((category) => category.id !== id));
    } catch (err) {
      setError(getErrorMessage(err));
      throw err;
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <CategoriesContext.Provider
      value={{
        categories,
        isLoading,
        isSaving,
        deletingId,
        error,
        refresh,
        createCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </CategoriesContext.Provider>
  );
}

export function useCategories() {
  const context = useContext(CategoriesContext);
  if (!context) {
    throw new Error('useCategories must be used within a CategoriesProvider');
  }
  return context;
}
