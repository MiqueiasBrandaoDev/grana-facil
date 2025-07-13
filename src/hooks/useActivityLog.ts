import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';

export interface ActivityLogItem {
  id: string;
  type: 'transaction_income' | 'transaction_expense' | 'bill_paid' | 'goal_created';
  title: string;
  description: string;
  amount?: number;
  timestamp: Date;
  icon: string;
  color: string;
}

const fetchActivities = async (): Promise<ActivityLogItem[]> => {
  const user = await getCurrentUser();
  if (!user) return [];

  const activities: ActivityLogItem[] = [];

      // Buscar transações recentes (últimos 10 registros)
      const { data: transactions } = await supabase
        .from('transactions_with_category')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);

      if (transactions) {
        transactions.forEach(transaction => {
          const isIncome = transaction.type === 'income';
          activities.push({
            id: `transaction_${transaction.id}`,
            type: isIncome ? 'transaction_income' : 'transaction_expense',
            title: isIncome ? 'Receita Adicionada' : 'Gasto Registrado',
            description: `${transaction.description} - ${transaction.category_name || 'Sem categoria'}`,
            amount: Math.abs(transaction.amount),
            timestamp: new Date(transaction.created_at),
            icon: isIncome ? 'TrendingUp' : 'TrendingDown',
            color: isIncome ? 'success' : 'destructive'
          });
        });
      }

      // Buscar contas pagas recentes
      const { data: bills } = await supabase
        .from('bills')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'paid')
        .order('updated_at', { ascending: false })
        .limit(3);

      if (bills) {
        bills.forEach(bill => {
          activities.push({
            id: `bill_${bill.id}`,
            type: 'bill_paid',
            title: 'Conta Paga',
            description: `${bill.title} - ${bill.type === 'payable' ? 'Conta a Pagar' : 'Conta a Receber'}`,
            amount: bill.amount,
            timestamp: new Date(bill.updated_at),
            icon: 'CreditCard',
            color: 'primary'
          });
        });
      }

      // Buscar metas criadas recentemente
      const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3);

      if (goals) {
        goals.forEach(goal => {
          activities.push({
            id: `goal_${goal.id}`,
            type: 'goal_created',
            title: 'Nova Meta',
            description: `${goal.title} - Meta: R$ ${goal.target_amount.toFixed(2)}`,
            amount: goal.target_amount,
            timestamp: new Date(goal.created_at),
            icon: 'Target',
            color: 'accent'
          });
        });
      }

  // Ordenar por timestamp e pegar os 8 mais recentes
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return activities.slice(0, 8);
};

export const useActivityLog = () => {
  const {
    data: activities = [],
    isLoading: loading,
    error,
    refetch: refreshActivities
  } = useQuery({
    queryKey: ['activity-log'],
    queryFn: fetchActivities,
    staleTime: 30 * 1000, // 30 segundos
    refetchOnWindowFocus: true,
    refetchInterval: 60 * 1000, // Recarregar a cada minuto
  });

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes < 1 ? 'Agora' : `${diffMinutes}min atrás`;
    } else if (diffHours < 24) {
      return `${diffHours}h atrás`;
    } else if (diffDays < 7) {
      return `${diffDays}d atrás`;
    } else {
      return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
      });
    }
  };

  // Função para formatar erro de forma amigável
  const formatError = (error: unknown): string | null => {
    if (!error) return null;
    
    if (error instanceof Error) {
      if (error.message.includes('406')) {
        return "⚠️ Alguns dados podem estar temporariamente indisponíveis. Tentando novamente...";
      } else if (error.message.includes('network') || error.message.includes('fetch')) {
        return "🌐 Problema de conexão. Verifique sua internet.";
      } else if (error.message.includes('unauthorized') || error.message.includes('401')) {
        return "🔒 Sessão expirou. Faça login novamente.";
      } else {
        return `❌ Erro: ${error.message}`;
      }
    }
    
    return "❓ Erro desconhecido ao carregar atividades.";
  };

  return {
    activities,
    loading,
    error: formatError(error),
    refreshActivities,
    formatCurrency,
    formatTimestamp
  };
};