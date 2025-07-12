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

  const monthlyBalance = monthlyNet;
  const balanceType = monthlyBalance > 0 ? 'positive' : monthlyBalance < 0 ? 'negative' : 'neutral';

  // Função para refresh completo dos dados
  const handleTransactionAdded = () => {
    refreshBalance();
    refreshTransactions();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Visão geral das suas finanças</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90 transition-opacity"
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
            Bem-vindo ao GranaFacil!
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Comece adicionando suas transações financeiras para ter controle total das suas finanças.
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              className="bg-gradient-primary hover:opacity-90"
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
              onClick={() => setShowGoalModal(true)}
            >
              <Target className="w-4 h-4 mr-2" />
              Criar Meta Financeira
            </Button>
          </div>
        </div>
      )}

      {/* Financial Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col gap-2 hover:bg-success/10"
            onClick={() => {
              setTransactionType('income');
              setShowTransactionModal(true);
            }}
          >
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="text-sm">Adicionar Receita</span>
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
            <span className="text-sm">Registrar Gasto</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col gap-2 hover:bg-primary/10"
            onClick={() => setShowBillModal(true)}
          >
            <CreditCard className="w-5 h-5 text-primary" />
            <span className="text-sm">Pagar Conta</span>
          </Button>
          
          <Button 
            variant="outline" 
            className="h-auto p-4 flex flex-col gap-2 hover:bg-accent/10"
            onClick={() => setShowGoalModal(true)}
          >
            <Target className="w-5 h-5 text-accent" />
            <span className="text-sm">Nova Meta</span>
          </Button>
        </div>
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