import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';

export interface CategorySpending {
  category_name: string;
  category_color: string;
  category_icon: string;
  total_spent: number;
  budget: number;
  percentage: number;
}

export interface MonthlyReport {
  totalIncome: number;
  totalExpenses: number;
  netIncome: number;
  transactionCount: number;
  topCategories: CategorySpending[];
  loading: boolean;
  error: string | null;
}

export const useMonthlyReport = () => {
  const [report, setReport] = useState<MonthlyReport>({
    totalIncome: 0,
    totalExpenses: 0,
    netIncome: 0,
    transactionCount: 0,
    topCategories: [],
    loading: true,
    error: null
  });

  const fetchMonthlyReport = useCallback(async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        setReport(prev => ({ ...prev, error: 'Usuário não autenticado', loading: false }));
        return;
      }

      // Buscar resumo mensal
      const currentMonth = new Date();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      
      const { data: monthlyData, error: monthlyError } = await supabase
        .from('monthly_summary')
        .select('*')
        .eq('user_id', user.id)
        .gte('month', firstDayOfMonth.toISOString())
        .lt('month', new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1).toISOString())
        .single();

      if (monthlyError && monthlyError.code !== 'PGRST116') {
        throw monthlyError;
      }

      // Buscar gastos por categoria
      const { data: categoryData, error: categoryError } = await supabase
        .rpc('get_monthly_spending_by_category', {
          input_user_id: user.id,
          month_date: new Date().toISOString().slice(0, 10)
        });

      if (categoryError) {
        throw categoryError;
      }

      const totalIncome = monthlyData?.total_income || 0;
      const totalExpenses = monthlyData?.total_expenses || 0;
      const netIncome = totalIncome - totalExpenses;
      const transactionCount = monthlyData?.transaction_count || 0;

      // Pegar top 5 categorias
      const topCategories = (categoryData || [])
        .sort((a, b) => b.total_spent - a.total_spent)
        .slice(0, 5);

      setReport({
        totalIncome,
        totalExpenses,
        netIncome,
        transactionCount,
        topCategories,
        loading: false,
        error: null
      });

    } catch (error) {
      console.error('Erro ao buscar relatório mensal:', error);
      setReport(prev => ({
        ...prev,
        error: 'Erro ao carregar relatório',
        loading: false
      }));
    }
  }, []);

  useEffect(() => {
    fetchMonthlyReport();
  }, [fetchMonthlyReport]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);

  return {
    ...report,
    formatCurrency,
    refreshReport: fetchMonthlyReport
  };
};