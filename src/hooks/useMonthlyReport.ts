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

      // Calcular período do mês atual
      const currentMonth = new Date();
      const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
      const lastDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0, 23, 59, 59);

      let totalIncome = 0;
      let totalExpenses = 0;
      let transactionCount = 0;
      let topCategories: CategorySpending[] = [];

      try {
        // Tentar buscar da view monthly_summary primeiro
        const { data: monthlyData, error: monthlyError } = await supabase
          .from('monthly_summary')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (monthlyData && !monthlyError) {
          totalIncome = monthlyData.total_income || 0;
          totalExpenses = monthlyData.total_expenses || 0;
          transactionCount = monthlyData.transaction_count || 0;
        } else {
          // Fallback: calcular manualmente das transações
          console.log('View monthly_summary não disponível, calculando manualmente...');
          
          const { data: transactions, error: transError } = await supabase
            .from('transactions')
            .select('amount, type')
            .eq('user_id', user.id)
            .gte('transaction_date', firstDayOfMonth.toISOString())
            .lte('transaction_date', lastDayOfMonth.toISOString());

          if (transError) throw transError;

          totalIncome = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
          totalExpenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
          transactionCount = transactions?.length || 0;
        }
      } catch (viewError) {
        console.error('Erro na view monthly_summary, usando fallback:', viewError);
        
        // Fallback completo: buscar transações diretamente
        const { data: transactions, error: transError } = await supabase
          .from('transactions')
          .select('amount, type')
          .eq('user_id', user.id)
          .gte('transaction_date', firstDayOfMonth.toISOString())
          .lte('transaction_date', lastDayOfMonth.toISOString());

        if (transError) throw transError;

        totalIncome = transactions?.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0) || 0;
        totalExpenses = transactions?.filter(t => t.type === 'expense').reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
        transactionCount = transactions?.length || 0;
      }

      // Buscar gastos por categoria (com fallback)
      try {
        const { data: categoryData, error: categoryError } = await supabase
          .rpc('get_monthly_spending_by_category', {
            input_user_id: user.id,
            month_date: new Date().toISOString().slice(0, 10)
          });

        if (categoryData && !categoryError) {
          topCategories = categoryData.sort((a, b) => b.total_spent - a.total_spent).slice(0, 5);
        }
      } catch (rpcError) {
        console.error('Erro na função RPC, usando fallback para categorias:', rpcError);
        
        // Fallback: calcular categorias manualmente
        const { data: categoryTransactions } = await supabase
          .from('transactions')
          .select(`
            amount,
            type,
            categories (name, color, icon, budget)
          `)
          .eq('user_id', user.id)
          .eq('type', 'expense')
          .gte('transaction_date', firstDayOfMonth.toISOString())
          .lte('transaction_date', lastDayOfMonth.toISOString());

        if (categoryTransactions) {
          const categoryMap = new Map();
          
          categoryTransactions.forEach(trans => {
            const categoryName = trans.categories?.name || 'Sem categoria';
            const amount = Math.abs(trans.amount);
            
            if (categoryMap.has(categoryName)) {
              categoryMap.set(categoryName, {
                ...categoryMap.get(categoryName),
                total_spent: categoryMap.get(categoryName).total_spent + amount
              });
            } else {
              categoryMap.set(categoryName, {
                category_name: categoryName,
                category_color: trans.categories?.color || '#6B7280',
                category_icon: trans.categories?.icon || '📂',
                total_spent: amount,
                budget: trans.categories?.budget || 0,
                percentage: 0
              });
            }
          });

          topCategories = Array.from(categoryMap.values())
            .sort((a, b) => b.total_spent - a.total_spent)
            .slice(0, 5)
            .map(cat => ({
              ...cat,
              percentage: cat.budget > 0 ? (cat.total_spent / cat.budget) * 100 : 0
            }));
        }
      }

      const netIncome = totalIncome - totalExpenses;

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
      console.error('Erro crítico ao buscar relatório mensal:', error);
      
      // Mensagem de erro mais clara para o usuário
      let userMessage = "❌ Não foi possível carregar o relatório mensal.";
      
      if (error instanceof Error) {
        if (error.message.includes('406')) {
          userMessage += "\n\n🔧 Problema com os dados do servidor. Nossos sistemas de backup estão funcionando, mas alguns recursos podem estar limitados.";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          userMessage += "\n\n🌐 Problema de conexão. Verifique sua internet e tente novamente.";
        } else {
          userMessage += `\n\n⚠️ Erro técnico: ${error.message}`;
        }
      } else {
        userMessage += "\n\n❓ Erro desconhecido detectado.";
      }
      
      userMessage += "\n\n🔄 Você pode:\n• Recarregar a página\n• Tentar novamente em alguns minutos\n• Contatar o suporte se o problema persistir";
      
      setReport(prev => ({
        ...prev,
        error: userMessage,
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