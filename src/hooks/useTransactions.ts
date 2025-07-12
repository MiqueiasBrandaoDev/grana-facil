import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';
import { Tables } from '@/integrations/supabase/types';

type Transaction = Tables<'transactions'>;
type TransactionInsert = Tables<'transactions'>['Insert'];

export interface TransactionWithCategory extends Transaction {
  category_name?: string;
  category_color?: string;
  category_icon?: string;
}

const TRANSACTIONS_QUERY_KEY = ['transactions'];

const fetchTransactions = async (): Promise<TransactionWithCategory[]> => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  // Tentar buscar da view primeiro, se falhar, usar query manual
  let data, error;
  
  try {
    const result = await supabase
      .from('transactions_with_category')
      .select('*')
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(50);
    
    data = result.data;
    error = result.error;
  } catch {
    // Se a view não existir, fazer query manual
    const transactionsResult = await supabase
      .from('transactions')
      .select(`
        *,
        categories (
          name,
          color,
          icon
        )
      `)
      .eq('user_id', user.id)
      .order('transaction_date', { ascending: false })
      .limit(50);

    if (transactionsResult.error) throw transactionsResult.error;

    // Transformar dados para o formato esperado
    data = transactionsResult.data?.map(t => ({
      ...t,
      category_name: t.categories?.name || null,
      category_color: t.categories?.color || null,
      category_icon: t.categories?.icon || null
    })) || [];
  }

  if (error) throw error;
  return data || [];
};

export const useTransactions = () => {
  const queryClient = useQueryClient();

  const {
    data: transactions = [],
    isLoading: loading,
    error
  } = useQuery({
    queryKey: TRANSACTIONS_QUERY_KEY,
    queryFn: fetchTransactions,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });

  const addTransactionMutation = useMutation({
    mutationFn: async (transaction: Omit<TransactionInsert, 'user_id'>) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Usuário não autenticado. Faça login para continuar.');
      }

      const transactionData = {
        ...transaction,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('transactions')
        .insert([transactionData])
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw new Error(`Erro ao salvar transação: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      // Invalidar cache para refetch automático
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
    }
  });

  const updateTransactionMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<TransactionInsert> }) => {
      const { data, error } = await supabase
        .from('transactions')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
    }
  });

  const deleteTransactionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY });
    }
  });

  return {
    transactions,
    loading,
    error: error instanceof Error ? error.message : null,
    addTransaction: addTransactionMutation.mutateAsync,
    updateTransaction: (id: string, updates: Partial<TransactionInsert>) => 
      updateTransactionMutation.mutateAsync({ id, updates }),
    deleteTransaction: deleteTransactionMutation.mutateAsync,
    refreshTransactions: () => queryClient.invalidateQueries({ queryKey: TRANSACTIONS_QUERY_KEY })
  };
};