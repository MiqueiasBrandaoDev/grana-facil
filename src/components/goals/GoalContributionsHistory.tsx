import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { History, X, TrendingUp, Calendar, FileText } from 'lucide-react';
import { useGoalContributions } from '@/hooks/useGoalContributions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface GoalContributionsHistoryProps {
  goalId: string;
  goal: any;
  className?: string;
}

const GoalContributionsHistory: React.FC<GoalContributionsHistoryProps> = ({ 
  goalId, 
  goal,
  className 
}) => {
  const { contributions, loading, deleteContribution } = useGoalContributions(goalId);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleDeleteContribution = async (contributionId: string, amount: number) => {
    try {
      setDeletingId(contributionId);
      
      // Excluir a contribuição (isso já remove o valor da meta também)
      await deleteContribution({
        goalId: goal.id,
        contributionId: contributionId
      });
      
      toast.success(`Contribuição de ${formatCurrency(amount)} removida!`);
    } catch (error) {
      console.error('Erro ao excluir contribuição:', error);
      toast.error('Erro ao excluir contribuição');
    } finally {
      setDeletingId(null);
    }
  };

  const totalContributed = contributions.reduce((sum, contrib) => sum + contrib.amount, 0);

  if (loading) {
    return (
      <Card className={cn("p-4", className)}>
        <div className="flex items-center justify-center h-20">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-4", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-primary" />
            <h3 className="font-semibold text-lg">Histórico de Contribuições</h3>
          </div>
          {contributions.length > 0 && (
            <Badge variant="secondary" className="text-sm">
              {contributions.length} {contributions.length === 1 ? 'contribuição' : 'contribuições'}
            </Badge>
          )}
        </div>

        {/* Summary */}
        {contributions.length > 0 && (
          <div className="p-3 border rounded-lg bg-accent/20">
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">Total Contribuído:</span>
              <span className="font-semibold text-success">
                {formatCurrency(totalContributed)}
              </span>
            </div>
          </div>
        )}

        {/* Contributions List */}
        {contributions.length > 0 ? (
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {contributions.map((contribution) => (
              <div 
                key={contribution.id} 
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="w-8 h-8 rounded-full bg-success/20 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-success" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-success">
                        +{formatCurrency(contribution.amount)}
                      </span>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="w-3 h-3" />
                        {formatDate(contribution.created_at)}
                      </div>
                    </div>
                    
                    {contribution.notes && (
                      <div className="flex items-start gap-1 text-xs text-muted-foreground">
                        <FileText className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        <span className="line-clamp-2">{contribution.notes}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Delete Button */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 w-8 p-0"
                      disabled={deletingId === contribution.id}
                    >
                      {deletingId === contribution.id ? (
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-destructive" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Excluir Contribuição</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja excluir esta contribuição de {formatCurrency(contribution.amount)}?
                        {contribution.notes && (
                          <div className="mt-2 p-2 bg-accent rounded text-sm">
                            <strong>Nota:</strong> {contribution.notes}
                          </div>
                        )}
                        <div className="mt-2 text-warning">
                          ⚠️ Esta ação removerá o valor da meta e não pode ser desfeita.
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={() => handleDeleteContribution(contribution.id, contribution.amount)}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        Excluir Contribuição
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ))}
          </div>
        ) : (
          /* Empty State */
          <div className="text-center py-8">
            <History className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-muted-foreground mb-1">Nenhuma contribuição ainda</p>
            <p className="text-sm text-muted-foreground">
              Use o botão "+ Dinheiro" para começar a contribuir para esta meta
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default GoalContributionsHistory;