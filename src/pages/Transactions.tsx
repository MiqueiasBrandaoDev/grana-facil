import React, { useState } from 'react';
import { Plus, Search, ArrowUpDown, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import TransactionModal from '@/components/modals/TransactionModal';
import { cn } from '@/lib/utils';
import { useTransactions } from '@/hooks/useTransactions';

const Transactions: React.FC = () => {
  const { transactions, loading, error } = useTransactions();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showTransactionModal, setShowTransactionModal] = useState(false);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(Math.abs(value));

  const formatDate = (dateString: string) => 
    new Intl.DateTimeFormat('pt-BR').format(new Date(dateString));

  const formatPaymentMethod = (method: string) => {
    const methods: { [key: string]: string } = {
      'cash': 'Dinheiro',
      'credit_card': 'Cartão de Crédito',
      'debit_card': 'Cartão de Débito',
      'bank_transfer': 'Transferência',
      'pix': 'PIX',
      'whatsapp': 'WhatsApp'
    };
    return methods[method] || method;
  };

  const filteredTransactions = transactions.filter(transaction => {
    const matchesSearch = transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (transaction.category_name || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === 'all' || transaction.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando transações...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Erro ao carregar transações: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Transações</h1>
          <p className="text-muted-foreground">Gerencie suas receitas e despesas</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90 transition-opacity"
          onClick={() => setShowTransactionModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Transação
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-success p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Total de Receitas</p>
              <p className="text-2xl font-bold">{formatCurrency(totalIncome)}</p>
            </div>
            <TrendingUp className="w-8 h-8 text-white/80" />
          </div>
        </div>

        <div className="bg-card border p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Total de Despesas</p>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(totalExpenses)}</p>
            </div>
            <TrendingDown className="w-8 h-8 text-destructive" />
          </div>
        </div>

        <div className="bg-gradient-card border p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Saldo do Período</p>
              <p className={cn(
                "text-2xl font-bold",
                totalIncome - totalExpenses > 0 ? "text-success" : "text-destructive"
              )}>
                {formatCurrency(totalIncome - totalExpenses)}
              </p>
            </div>
            <ArrowUpDown className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar transações..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              Todas
            </Button>
            <Button
              variant={filterType === 'income' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('income')}
              className={filterType === 'income' ? 'bg-success hover:bg-success/90' : ''}
            >
              Receitas
            </Button>
            <Button
              variant={filterType === 'expense' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('expense')}
              className={filterType === 'expense' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              Despesas
            </Button>
          </div>
        </div>
      </div>

      {/* Transactions List */}
      <div className="bg-card border rounded-xl overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">Histórico de Transações</h2>
          <p className="text-sm text-muted-foreground">{filteredTransactions.length} transações encontradas</p>
        </div>
        
        <div className="divide-y">
          {filteredTransactions.map((transaction) => (
            <div key={transaction.id} className="p-6 hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    transaction.type === 'income' 
                      ? "bg-success/20 text-success" 
                      : "bg-destructive/20 text-destructive"
                  )}>
                    {transaction.type === 'income' ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-foreground">{transaction.description}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">
                        {transaction.category_name || 'Sem categoria'}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatPaymentMethod(transaction.payment_method)}
                      </span>
                      <Badge 
                        variant={transaction.status === 'completed' ? 'default' : 'outline'}
                        className="text-xs"
                      >
                        {transaction.status === 'completed' ? 'Concluído' : 'Pendente'}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                <div className="text-right">
                  <p className={cn(
                    "text-lg font-semibold",
                    transaction.type === 'income' ? "text-success" : "text-destructive"
                  )}>
                    {transaction.type === 'income' ? '+' : '-'}{formatCurrency(transaction.amount)}
                  </p>
                  <p className="text-sm text-muted-foreground">{formatDate(transaction.transaction_date)}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {filteredTransactions.length === 0 && (
          <div className="p-12 text-center">
            <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground mb-2">Nenhuma transação encontrada</p>
            <p className="text-sm text-muted-foreground">
              {searchTerm ? 'Tente buscar por outros termos' : 'Adicione sua primeira transação para começar'}
            </p>
          </div>
        )}
      </div>

      {/* Modal */}
      <TransactionModal
        open={showTransactionModal}
        onOpenChange={setShowTransactionModal}
        onTransactionAdded={() => {
          // Refresh já é feito automaticamente pelo useTransactions
          // Mas podemos adicionar lógica extra se necessário
        }}
      />
    </div>
  );
};

export default Transactions;