import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';
import { Tables } from '@/integrations/supabase/types';

type Goal = Tables<'goals'>;
type GoalInsert = Tables<'goals'>['Insert'];

export interface GoalsSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  totalTargetAmount: number;
  totalCurrentAmount: number;
  overallProgress: number;
  loading: boolean;
  error: string | null;
}

const GOALS_QUERY_KEY = ['goals'];

const fetchGoals = async (): Promise<Goal[]> => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('goals')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
};

const calculateSummary = (goals: Goal[]): Omit<GoalsSummary, 'loading' | 'error'> => {
  const totalGoals = goals.length;
  const activeGoals = goals.filter(goal => goal.status === 'active').length;
  const completedGoals = goals.filter(goal => goal.status === 'completed').length;
  const totalTarget = goals.reduce((sum, goal) => sum + goal.target_amount, 0);
  const totalCurrent = goals.reduce((sum, goal) => sum + goal.current_amount, 0);
  const progress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  return {
    totalGoals,
    activeGoals,
    completedGoals,
    totalTargetAmount: totalTarget,
    totalCurrentAmount: totalCurrent,
    overallProgress: Math.min(progress, 100)
  };
};

export const useGoals = () => {
  const queryClient = useQueryClient();

  const {
    data: goals = [],
    isLoading: loading,
    error
  } = useQuery({
    queryKey: GOALS_QUERY_KEY,
    queryFn: fetchGoals,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });

  const summary: GoalsSummary = {
    ...calculateSummary(goals),
    loading,
    error: error instanceof Error ? error.message : null
  };

  const addGoalMutation = useMutation({
    mutationFn: async (goal: Omit<GoalInsert, 'user_id'>) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('goals')
        .insert([{ ...goal, user_id: user.id }])
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw new Error(`Erro ao salvar meta: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    }
  });

  const updateGoalProgressMutation = useMutation({
    mutationFn: async ({ goalId, amount }: { goalId: string; amount: number }) => {
      const { error } = await supabase
        .rpc('update_goal_progress', {
          goal_id: goalId,
          amount: amount
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    }
  });

  const updateGoalMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<GoalInsert> }) => {
      const { data, error } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw new Error(`Erro ao atualizar meta: ${error.message}`);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    }
  });

  const deleteGoalMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw new Error(`Erro ao deletar meta: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    }
  });

  return {
    goals,
    summary,
    addGoal: addGoalMutation.mutateAsync,
    updateGoal: (id: string, updates: Partial<GoalInsert>) =>
      updateGoalMutation.mutateAsync({ id, updates }),
    deleteGoal: deleteGoalMutation.mutateAsync,
    updateGoalProgress: (goalId: string, amount: number) =>
      updateGoalProgressMutation.mutateAsync({ goalId, amount }),
    refreshGoals: () => queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY })
  };
};