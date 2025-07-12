import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';

export interface GoalContribution {
  id: string;
  amount: number;
  notes?: string;
  created_at: string;
}

type GoalContributionInsert = Omit<GoalContribution, 'id' | 'created_at'>;

const GOALS_QUERY_KEY = ['goals'];

// Generate a simple UUID v4
const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const fetchGoalContributions = async (goalId: string): Promise<GoalContribution[]> => {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  const { data, error } = await supabase
    .from('goals')
    .select('contributions')
    .eq('id', goalId)
    .eq('user_id', user.id)
    .single();

  if (error) {
    console.error('Erro ao buscar contribuições:', error);
    return [];
  }

  const contributions = data?.contributions || [];
  
  // Sort by created_at descending (most recent first)
  return contributions.sort((a: GoalContribution, b: GoalContribution) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

export const useGoalContributions = (goalId?: string) => {
  const queryClient = useQueryClient();

  const {
    data: contributions = [],
    isLoading: loading,
    error
  } = useQuery({
    queryKey: goalId ? [...GOALS_QUERY_KEY, 'contributions', goalId] : [...GOALS_QUERY_KEY, 'contributions'],
    queryFn: () => goalId ? fetchGoalContributions(goalId) : Promise.resolve([]),
    enabled: !!goalId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    refetchOnWindowFocus: false,
  });

  const addContributionMutation = useMutation({
    mutationFn: async ({ goalId, contribution }: { goalId: string, contribution: GoalContributionInsert }) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // First, get the current goal with its contributions
      const { data: currentGoal, error: fetchError } = await supabase
        .from('goals')
        .select('contributions, current_amount')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar meta atual:', fetchError);
        throw new Error(`Erro ao buscar meta: ${fetchError.message}`);
      }

      // Create new contribution with ID and timestamp
      const newContribution: GoalContribution = {
        id: generateId(),
        amount: contribution.amount,
        notes: contribution.notes,
        created_at: new Date().toISOString()
      };

      // Add to existing contributions array
      const currentContributions = currentGoal?.contributions || [];
      const updatedContributions = [newContribution, ...currentContributions];

      // Calculate new current amount
      const newCurrentAmount = (currentGoal?.current_amount || 0) + contribution.amount;

      // Update the goal with new contribution and current amount
      const { data, error } = await supabase
        .from('goals')
        .update({
          contributions: updatedContributions,
          current_amount: newCurrentAmount
        })
        .eq('id', goalId)
        .eq('user_id', user.id)
        .select()
        .single();

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw new Error(`Erro ao salvar contribuição: ${error.message}`);
      }

      return newContribution;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    }
  });

  const deleteContributionMutation = useMutation({
    mutationFn: async ({ goalId, contributionId }: { goalId: string, contributionId: string }) => {
      const user = await getCurrentUser();
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      // First, get the current goal with its contributions
      const { data: currentGoal, error: fetchError } = await supabase
        .from('goals')
        .select('contributions, current_amount')
        .eq('id', goalId)
        .eq('user_id', user.id)
        .single();

      if (fetchError) {
        console.error('Erro ao buscar meta atual:', fetchError);
        throw new Error(`Erro ao buscar meta: ${fetchError.message}`);
      }

      const currentContributions = currentGoal?.contributions || [];
      
      // Find the contribution to delete
      const contributionToDelete = currentContributions.find((c: GoalContribution) => c.id === contributionId);
      if (!contributionToDelete) {
        throw new Error('Contribuição não encontrada');
      }

      // Remove the contribution from array
      const updatedContributions = currentContributions.filter((c: GoalContribution) => c.id !== contributionId);

      // Calculate new current amount (subtract the deleted contribution)
      const newCurrentAmount = Math.max(0, (currentGoal?.current_amount || 0) - contributionToDelete.amount);

      // Update the goal
      const { error } = await supabase
        .from('goals')
        .update({
          contributions: updatedContributions,
          current_amount: newCurrentAmount
        })
        .eq('id', goalId)
        .eq('user_id', user.id);

      if (error) {
        console.error('Erro detalhado do Supabase:', error);
        throw new Error(`Erro ao excluir contribuição: ${error.message}`);
      }

      return contributionToDelete;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GOALS_QUERY_KEY });
    }
  });

  return {
    contributions,
    loading,
    error: error instanceof Error ? error.message : null,
    addContribution: ({ goalId, contribution }: { goalId: string, contribution: GoalContributionInsert }) =>
      addContributionMutation.mutateAsync({ goalId, contribution }),
    deleteContribution: ({ goalId, contributionId }: { goalId: string, contributionId: string }) =>
      deleteContributionMutation.mutateAsync({ goalId, contributionId }),
    refreshContributions: () => queryClient.invalidateQueries({ 
      queryKey: goalId ? [...GOALS_QUERY_KEY, 'contributions', goalId] : [...GOALS_QUERY_KEY, 'contributions'] 
    })
  };
};