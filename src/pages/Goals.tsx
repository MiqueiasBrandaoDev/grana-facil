import React, { useState } from 'react';
import { Target, Plus, TrendingUp, Edit, Trash2, Calendar, DollarSign, PiggyBank } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import GoalModal from '@/components/modals/GoalModal';
import EditGoalModal from '@/components/modals/EditGoalModal';
import AddMoneyToGoalModal from '@/components/modals/AddMoneyToGoalModal';
import GoalContributionsHistory from '@/components/goals/GoalContributionsHistory';
import { useGoals } from '@/hooks/useGoals';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Goals: React.FC = () => {
  const { goals, summary, deleteGoal } = useGoals();
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMoneyModal, setShowAddMoneyModal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState(null);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);

  const formatDate = (dateString: string) => 
    new Intl.DateTimeFormat('pt-BR').format(new Date(dateString));

  const calculateProgress = (current: number, target: number) => {
    if (target <= 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success text-success-foreground';
      case 'paused':
        return 'bg-warning text-warning-foreground';
      case 'cancelled':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-primary text-primary-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'paused':
        return 'Pausada';
      case 'cancelled':
        return 'Cancelada';
      default:
        return 'Ativa';
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      await deleteGoal(goalId);
      toast.success('Meta excluída com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir meta:', error);
      toast.error('Erro ao excluir meta');
    }
  };

  const calculateDaysLeft = (targetDate: string) => {
    const today = new Date();
    const target = new Date(targetDate);
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (summary.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando metas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Metas Financeiras</h1>
          <p className="text-muted-foreground">Defina e acompanhe suas metas de economia</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90 transition-opacity"
          onClick={() => setShowGoalModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      {/* Summary Cards */}
      {goals.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total de Metas</p>
                <p className="text-2xl font-bold">{summary.totalGoals}</p>
              </div>
              <Target className="w-8 h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Metas Ativas</p>
                <p className="text-2xl font-bold text-success">{summary.activeGoals}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-success" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalTargetAmount)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Progresso Geral</p>
                <p className="text-2xl font-bold">{summary.overallProgress.toFixed(1)}%</p>
              </div>
              <div className="w-8 h-8 flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <span className="text-xs font-bold text-primary">{Math.round(summary.overallProgress)}%</span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Goals List */}
      {goals.length > 0 ? (
        <div className="space-y-8">
          {goals.map((goal) => {
            const progress = calculateProgress(goal.current_amount, goal.target_amount);
            const remaining = goal.target_amount - goal.current_amount;
            const daysLeft = goal.target_date ? calculateDaysLeft(goal.target_date) : null;

            return (
              <div key={goal.id} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Goal Info Card */}
                <div className="lg:col-span-2">
                  <Card className="p-6 hover:shadow-lg transition-shadow h-full">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h3 className="font-semibold text-xl text-foreground">
                            {goal.title}
                          </h3>
                          {goal.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {goal.description}
                            </p>
                          )}
                        </div>
                        <Badge className={cn("ml-2", getStatusColor(goal.status))}>
                          {getStatusLabel(goal.status)}
                        </Badge>
                      </div>

                      {/* Progress */}
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Progresso</span>
                          <span className="text-lg font-bold">{progress.toFixed(1)}%</span>
                        </div>
                        <Progress value={progress} className="h-3" />
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span className="font-medium text-success">{formatCurrency(goal.current_amount)}</span>
                          <span className="font-medium">{formatCurrency(goal.target_amount)}</span>
                        </div>
                      </div>

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-4 pt-2">
                        <div className="space-y-1">
                          <span className="text-sm text-muted-foreground">Faltam:</span>
                          <div className="font-semibold text-destructive">
                            {formatCurrency(Math.max(0, remaining))}
                          </div>
                        </div>
                        
                        {goal.target_date && (
                          <div className="space-y-1">
                            <span className="text-sm text-muted-foreground flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              Data Meta:
                            </span>
                            <div>
                              <div className="font-semibold">{formatDate(goal.target_date)}</div>
                              {daysLeft !== null && (
                                <div className={cn(
                                  "text-xs",
                                  daysLeft < 0 ? "text-destructive" : 
                                  daysLeft < 30 ? "text-warning" : "text-success"
                                )}>
                                  {daysLeft < 0 ? `${Math.abs(daysLeft)} dias atrasado` :
                                   daysLeft === 0 ? 'Hoje!' :
                                   `${daysLeft} dias restantes`}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-4 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1"
                          onClick={() => {
                            setSelectedGoal(goal);
                            setShowEditModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Editar
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-success hover:text-success hover:bg-success/10"
                          onClick={() => {
                            setSelectedGoal(goal);
                            setShowAddMoneyModal(true);
                          }}
                        >
                          <PiggyBank className="w-4 h-4 mr-2" />
                          + Dinheiro
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Excluir Meta</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a meta "{goal.title}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteGoal(goal.id)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                </div>

                {/* Contributions History Card */}
                <div className="lg:col-span-1">
                  <GoalContributionsHistory 
                    goalId={goal.id} 
                    goal={goal}
                    className="h-full"
                  />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <Card className="p-12 text-center">
          <Target className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Defina suas Metas</h2>
          <p className="text-muted-foreground mb-6">
            Comece criando sua primeira meta financeira e acompanhe seu progresso.
          </p>
          <Button 
            className="bg-gradient-primary hover:opacity-90"
            onClick={() => setShowGoalModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Primeira Meta
          </Button>
        </Card>
      )}

      {/* Modals */}
      <GoalModal
        open={showGoalModal}
        onOpenChange={setShowGoalModal}
      />
      
      <EditGoalModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        goal={selectedGoal}
      />
      
      <AddMoneyToGoalModal
        open={showAddMoneyModal}
        onOpenChange={setShowAddMoneyModal}
        goal={selectedGoal}
      />
    </div>
  );
};

export default Goals;