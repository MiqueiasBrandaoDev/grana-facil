import React, { useState } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Target,
  CreditCard,
  PiggyBank,
  AlertTriangle,
  Calendar,
  Plus
} from 'lucide-react';
import FinancialCard from '@/components/dashboard/FinancialCard';
import { Button } from '@/components/ui/button';
import TransactionModal from '@/components/modals/TransactionModal';
import GoalModal from '@/components/modals/GoalModal';
import BillModal from '@/components/modals/BillModal';
import { useBalance } from '@/hooks/useBalance';
import { useTransactions } from '@/hooks/useTransactions';
import { useBills } from '@/hooks/useBills';
import { useGoals } from '@/hooks/useGoals';
import { useActivityLog } from '@/hooks/useActivityLog';

const Dashboard: React.FC = () => {
  // Modal states
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showBillModal, setShowBillModal] = useState(false);
  const [transactionType, setTransactionType] = useState<'income' | 'expense' | undefined>();
  
  const { 
    currentBalance, 
    monthlyIncome, 
    monthlyExpenses, 
    monthlyNet, 
    formatCurrency, 
    loading: balanceLoading,
    error: balanceError,
    refreshBalance
  } = useBalance();

  const { 
    transactions, 
    loading: transactionsLoading,
    refreshTransactions
  } = useTransactions();

  const {
    summary: billsSummary
  } = useBills();

  const {
    summary: goalsSummary
  } = useGoals();

  const {
    activities,
    loading: activitiesLoading,
    refreshActivities,
    formatCurrency: formatActivityCurrency,
    formatTimestamp
  } = useActivityLog();

  const monthlyBalance = monthlyNet;
  const balanceType = monthlyBalance > 0 ? 'positive' : monthlyBalance < 0 ? 'negative' : 'neutral';

  // Função para refresh completo dos dados
  const handleTransactionAdded = () => {
    refreshBalance();
    refreshTransactions();
    refreshActivities();
  };

  if (balanceLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  if (balanceError) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-12 w-12 text-destructive mx-auto mb-4" />
        <p className="text-destructive">Erro ao carregar dados: {balanceError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral das suas finanças</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90 transition-opacity w-full sm:w-auto"
          onClick={() => {
            setTransactionType(undefined);
            setShowTransactionModal(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Transação
        </Button>
      </div>

      {/* Welcome Message */}
      {currentBalance === 0 && transactions.length === 0 && (
        <div className="text-center py-12 bg-gradient-to-r from-primary/5 to-accent/5 rounded-lg border border-primary/10">
          <DollarSign className="h-16 w-16 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">
            Bem-vindo ao Grana Board!
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Comece adicionando suas transações financeiras para ter controle total das suas finanças.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              className="bg-gradient-primary hover:opacity-90 w-full sm:w-auto"
              onClick={() => {
                setTransactionType(undefined);
                setShowTransactionModal(true);
              }}
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Primeira Transação
            </Button>
            <Button 
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => setShowGoalModal(true)}
            >
              <Target className="w-4 h-4 mr-2" />
              Criar Meta Financeira
            </Button>
          </div>
        </div>
      )}

      {/* Financial Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <FinancialCard
          title="Saldo Total"
          value={formatCurrency(currentBalance)}
          change={currentBalance > 0 ? "Saldo positivo" : "Saldo negativo"}
          changeType={currentBalance > 0 ? "positive" : "negative"}
          icon={DollarSign}
          gradient="primary"
        />
        
        <FinancialCard
          title="Receitas do Mês"
          value={formatCurrency(monthlyIncome)}
          change={monthlyIncome > 0 ? "Receitas recebidas" : "Nenhuma receita este mês"}
          changeType={monthlyIncome > 0 ? "positive" : "neutral"}
          icon={TrendingUp}
          gradient="success"
        />
        
        <FinancialCard
          title="Despesas do Mês"
          value={formatCurrency(monthlyExpenses)}
          change={monthlyExpenses > 0 ? "Despesas registradas" : "Nenhuma despesa este mês"}
          changeType={monthlyExpenses > 0 ? "negative" : "neutral"}
          icon={TrendingDown}
        />
        
        <FinancialCard
          title="Economia Mensal"
          value={formatCurrency(monthlyBalance)}
          change={balanceType === 'positive' ? 'Economia positiva' : balanceType === 'negative' ? 'Déficit mensal' : 'Sem movimentação'}
          changeType={balanceType}
          icon={PiggyBank}
          gradient="accent"
        />
      </div>

      {/* Secondary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <FinancialCard
          title="Contas Pendentes"
          value={`${billsSummary.pendingBills} contas`}
          change={formatCurrency(billsSummary.totalPendingAmount)}
          changeType={billsSummary.overdueBills > 0 ? "negative" : "neutral"}
          icon={AlertTriangle}
          className={billsSummary.overdueBills > 0 ? 
            "border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800" : 
            "border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800"
          }
        />
        
        <FinancialCard
          title="Progresso das Metas"
          value={`${goalsSummary.overallProgress.toFixed(1)}% atingido`}
          change={goalsSummary.activeGoals > 0 ? 
            `${goalsSummary.activeGoals} metas ativas` : 
            "Nenhuma meta ativa"
          }
          changeType={goalsSummary.overallProgress >= 100 ? "positive" : "neutral"}
          icon={Target}
        />
        
        <FinancialCard
          title="Transações"
          value={`${transactions.length} registros`}
          change={transactionsLoading ? "Carregando..." : "Este mês"}
          changeType="neutral"
          icon={Calendar}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-xl border p-6">
        <h2 className="text-xl font-semibold mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-4 gap-4">
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col gap-2 hover:bg-success/10"
            onClick={() => {
              setTransactionType('income');
              setShowTransactionModal(true);
            }}
          >
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="text-xs sm:text-sm">Adicionar Receita</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col gap-2 hover:bg-destructive/10"
            onClick={() => {
              setTransactionType('expense');
              setShowTransactionModal(true);
            }}
          >
            <TrendingDown className="w-5 h-5 text-destructive" />
            <span className="text-xs sm:text-sm">Registrar Gasto</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col gap-2 hover:bg-primary/10"
            onClick={() => setShowBillModal(true)}
          >
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="text-xs sm:text-sm">Pagar Conta</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col gap-2 hover:bg-accent/10"
            onClick={() => setShowGoalModal(true)}
          >
            <Target className="w-5 h-5 text-accent" />
            <span className="text-xs sm:text-sm">Nova Meta</span>
          </Button>
        </div>
      </div>

      {/* Activity Log */}
      <div className="bg-card rounded-xl border overflow-hidden">
        <div className="p-6 border-b bg-gradient-to-r from-accent/5 to-primary/5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-foreground">Atividades Recentes</h2>
              <p className="text-sm text-muted-foreground">Suas últimas movimentações financeiras</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">Ao vivo</span>
            </div>
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {activitiesLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground text-sm">Carregando atividades...</p>
            </div>
          ) : activities.length === 0 ? (
            <div className="p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="text-muted-foreground">Nenhuma atividade recente</p>
              <p className="text-sm text-muted-foreground">Comece adicionando transações para ver o histórico aqui</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {activities.map((activity, index) => {
                const IconComponent = activity.icon === 'TrendingUp' ? TrendingUp :
                                   activity.icon === 'TrendingDown' ? TrendingDown :
                                   activity.icon === 'CreditCard' ? CreditCard :
                                   activity.icon === 'Target' ? Target : Calendar;

                return (
                  <div key={activity.id} className="p-4 hover:bg-accent/30 transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                        activity.color === 'success' ? 'bg-success/20 text-success' :
                        activity.color === 'destructive' ? 'bg-destructive/20 text-destructive' :
                        activity.color === 'primary' ? 'bg-primary/20 text-primary' :
                        'bg-accent/20 text-accent'
                      }`}>
                        <IconComponent className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-medium text-sm text-foreground">{activity.title}</h3>
                            <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                              {activity.description}
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-1">
                              {formatTimestamp(activity.timestamp)}
                            </p>
                          </div>
                          
                          {activity.amount && (
                            <div className="text-right shrink-0">
                              <p className={`text-sm font-semibold ${
                                activity.color === 'success' ? 'text-success' :
                                activity.color === 'destructive' ? 'text-destructive' :
                                'text-foreground'
                              }`}>
                                {activity.type === 'transaction_income' ? '+' : activity.type === 'transaction_expense' ? '-' : ''}
                                {formatActivityCurrency(activity.amount)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Indicador visual de novidade para itens recentes */}
                      {index < 2 && (
                        <div className="w-2 h-2 bg-primary rounded-full animate-pulse shrink-0 mt-2"></div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {activities.length > 0 && (
          <div className="p-4 border-t bg-muted/30">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                Mostrando {activities.length} atividades recentes
              </p>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={refreshActivities}
                className="text-xs h-auto p-1 hover:bg-transparent hover:text-primary"
              >
                Atualizar
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <TransactionModal
        open={showTransactionModal}
        onOpenChange={setShowTransactionModal}
        type={transactionType}
        onTransactionAdded={handleTransactionAdded}
      />
      
      <GoalModal
        open={showGoalModal}
        onOpenChange={setShowGoalModal}
      />
      
      <BillModal
        open={showBillModal}
        onOpenChange={setShowBillModal}
        type="payable"
      />
    </div>
  );
};

export default Dashboard;