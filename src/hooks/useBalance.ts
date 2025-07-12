import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';

export interface BalanceInfo {
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlyNet: number;
  loading: boolean;
  error: string | null;
}

export const useBalance = () => {
  const [balanceInfo, setBalanceInfo] = useState<BalanceInfo>({
    currentBalance: 0,
    monthlyIncome: 0,
    monthlyExpenses: 0,
    monthlyNet: 0,
    loading: true,
    error: null
  });

  const fetchBalance = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setBalanceInfo(prev => ({ ...prev, error: 'Usuário não autenticado', loading: false }));
        return;
      }

      // Buscar todas as transações do usuário
      const { data: transactions, error: transactionError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'completed');

      if (transactionError) {
        throw transactionError;
      }

      // Calcular saldo atual
      const currentBalance = transactions?.reduce((sum, transaction) => {
        return sum + (transaction.type === 'income' ? transaction.amount : -Math.abs(transaction.amount));
      }, 0) || 0;

      // Filtrar transações do mês atual
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyTransactions = transactions?.filter(t => 
        t.transaction_date.startsWith(currentMonth)
      ) || [];

      // Calcular receitas e despesas mensais
      const monthlyIncome = monthlyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);

      const monthlyExpenses = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);

      const monthlyNet = monthlyIncome - monthlyExpenses;

      setBalanceInfo({
        currentBalance,
        monthlyIncome,
        monthlyExpenses,
        monthlyNet,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Erro ao buscar saldo:', error);
      setBalanceInfo(prev => ({
        ...prev,
        error: 'Erro ao carregar saldo',
        loading: false
      }));
    }
  }, []);

  useEffect(() => {
    fetchBalance();
  }, [fetchBalance]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);

  return {
    ...balanceInfo,
    formatCurrency,
    refreshBalance: fetchBalance
  };
};