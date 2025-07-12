import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';
import { Tables } from '@/integrations/supabase/types';

type Bill = Tables<'bills'>;
type BillInsert = Tables<'bills'>['Insert'];

export interface BillsSummary {
  pendingBills: number;
  totalPendingAmount: number;
  overdueBills: number;
  dueTodayBills: number;
  loading: boolean;
  error: string | null;
}

const BILLS_QUERY_KEY = ['bills'];

const fetchBills = async (): Promise<Bill[]> => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('bills')
    .select('*')
    .eq('user_id', user.id)
    .order('due_date', { ascending: true });

  if (error) throw error;
  return data || [];
};

const calculateSummary = (bills: Bill[]): Omit<BillsSummary, 'loading' | 'error'> => {
  const today = new Date().toISOString().split('T')[0];
  const pendingBills = bills.filter(bill => bill.status === 'pending');
  const overdue = pendingBills.filter(bill => bill.due_date < today);
  const dueToday = pendingBills.filter(bill => bill.due_date === today);
  const totalAmount = pendingBills.reduce((sum, bill) => sum + bill.amount, 0);

  return {
    pendingBills: pendingBills.length,
    totalPendingAmount: totalAmount,
    overdueBills: overdue.length,
    dueTodayBills: dueToday.length
  };
};

export const useBills = () => {
  const queryClient = useQueryClient();

  const {
    data: bills = [],
    isLoading: loading,
    error
  } = useQuery({
    queryKey: BILLS_QUERY_KEY,
    queryFn: fetchBills,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });

  const summary: BillsSummary = {
    ...calculateSummary(bills),
    loading,
    error: error instanceof Error ? error.message : null
  };

  const addBillMutation = useMutation({
    mutationFn: async (bill: Omit<BillInsert, 'user_id'>) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('bills')
        .insert([{ ...bill, user_id: user.id }])
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw new Error(`Erro ao salvar conta: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLS_QUERY_KEY });
    }
  });

  const updateBillMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<BillInsert> }) => {
      const { data, error } = await supabase
        .from('bills')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw new Error(`Erro ao atualizar conta: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLS_QUERY_KEY });
    }
  });

  const deleteBillMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw new Error(`Erro ao excluir conta: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLS_QUERY_KEY });
    }
  });

  const markAsPaidMutation = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase
        .from('bills')
        .update({ status: 'paid' })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw new Error(`Erro ao marcar conta como paga: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: BILLS_QUERY_KEY });
    }
  });

  return {
    bills,
    summary,
    addBill: addBillMutation.mutateAsync,
    updateBill: (id: string, updates: Partial<BillInsert>) =>
      updateBillMutation.mutateAsync({ id, updates }),
    deleteBill: deleteBillMutation.mutateAsync,
    markAsPaid: markAsPaidMutation.mutateAsync,
    refreshBills: () => queryClient.invalidateQueries({ queryKey: BILLS_QUERY_KEY })
  };
};