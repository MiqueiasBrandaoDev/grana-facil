import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';
import { Tables } from '@/integrations/supabase/types';

type Category = Tables<'categories'>;
type CategoryInsert = Tables<'categories'>['Insert'];

const CATEGORIES_QUERY_KEY = ['categories'];

const fetchCategories = async (): Promise<Category[]> => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  if (error) throw error;
  return data || [];
};

export const useCategories = () => {
  const queryClient = useQueryClient();

  const {
    data: categories = [],
    isLoading: loading,
    error
  } = useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });

  const addCategoryMutation = useMutation({
    mutationFn: async (category: Omit<CategoryInsert, 'user_id'>) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('categories')
        .insert([{ ...category, user_id: user.id }])
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw new Error(`Erro ao salvar categoria: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<CategoryInsert> }) => {
      const { data, error } = await supabase
        .from('categories')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw new Error(`Erro ao atualizar categoria: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw new Error(`Erro ao excluir categoria: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    }
  });

  const createDefaultCategoriesMutation = useMutation({
    mutationFn: async () => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { error } = await supabase
        .rpc('create_default_categories', { user_id: user.id });

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw new Error(`Erro ao criar categorias padrão: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY });
    }
  });

  return {
    categories,
    loading,
    error: error instanceof Error ? error.message : null,
    addCategory: addCategoryMutation.mutateAsync,
    updateCategory: (id: string, updates: Partial<CategoryInsert>) =>
      updateCategoryMutation.mutateAsync({ id, updates }),
    deleteCategory: deleteCategoryMutation.mutateAsync,
    createDefaultCategories: createDefaultCategoriesMutation.mutateAsync,
    refreshCategories: () => queryClient.invalidateQueries({ queryKey: CATEGORIES_QUERY_KEY })
  };
};