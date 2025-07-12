import React, { useState } from 'react';
import { Calendar, Plus, AlertTriangle, Clock, DollarSign, Edit, Trash2, Check, TrendingUp, TrendingDown, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import BillModal from '@/components/modals/BillModal';
import EditBillModal from '@/components/modals/EditBillModal';
import { useBills } from '@/hooks/useBills';
import { useTransactions } from '@/hooks/useTransactions';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const Bills: React.FC = () => {
  const { bills, summary, deleteBill, markAsPaid } = useBills();
  const { addTransaction } = useTransactions();
  const [showBillModal, setShowBillModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'payable' | 'receivable' | 'pending'>('all');

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);

  const formatDate = (dateString: string) => 
    new Intl.DateTimeFormat('pt-BR').format(new Date(dateString));

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-success text-success-foreground';
      case 'overdue':
        return 'bg-destructive text-destructive-foreground';
      default:
        return 'bg-warning text-warning-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Pago';
      case 'overdue':
        return 'Em Atraso';
      default:
        return 'Pendente';
    }
  };


  const getDaysUntilDue = (dueDateString: string) => {
    const today = new Date();
    const dueDate = new Date(dueDateString);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleDeleteBill = async (billId: string, billTitle: string) => {
    try {
      await deleteBill(billId);
      toast.success(`Conta "${billTitle}" excluída com sucesso!`);
    } catch (error) {
      console.error('Erro ao excluir conta:', error);
      toast.error('Erro ao excluir conta');
    }
  };

  const handleMarkAsPaid = async (billId: string, billTitle: string, billType: string, billAmount: number) => {
    try {
      // Marcar conta como paga
      await markAsPaid(billId);
      
      // Criar transação correspondente
      const transactionTitle = billType === 'payable' 
        ? `Conta Paga: ${billTitle}`
        : `Conta Recebida: ${billTitle}`;
      
      const transactionData = {
        type: billType === 'payable' ? 'expense' as const : 'income' as const,
        description: transactionTitle,
        amount: billAmount,
        transaction_date: new Date().toISOString().split('T')[0],
        category_id: null // Vamos deixar sem categoria específica por enquanto
      };
      
      await addTransaction(transactionData);
      
      const actionText = billType === 'payable' ? 'paga' : 'recebida';
      const transactionText = billType === 'payable' ? 'despesa adicionada' : 'receita adicionada';
      
      toast.success(`Conta "${billTitle}" marcada como ${actionText} e ${transactionText} ao histórico!`);
    } catch (error) {
      console.error('Erro ao marcar conta como paga:', error);
      toast.error('Erro ao atualizar status da conta');
    }
  };

  const filteredBills = bills.filter(bill => {
    let matchesType = false;
    
    switch (filterType) {
      case 'all':
        matchesType = true;
        break;
      case 'pending':
        matchesType = bill.status === 'pending' || bill.status === 'overdue';
        break;
      case 'payable':
      case 'receivable':
        matchesType = bill.type === filterType;
        break;
    }
    
    const matchesSearch = 
      bill.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bill.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      '';
    return matchesType && matchesSearch;
  });

  const payableBills = bills.filter(bill => bill.type === 'payable');
  const receivableBills = bills.filter(bill => bill.type === 'receivable');
  const pendingBills = bills.filter(bill => bill.status === 'pending' || bill.status === 'overdue');

  if (summary.loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando contas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Contas</h1>
          <p className="text-muted-foreground">Gerencie suas contas a pagar e a receber</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90 transition-opacity"
          onClick={() => setShowBillModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      {/* Summary Cards */}
      {bills.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Contas Pendentes</p>
                <p className="text-2xl font-bold">{summary.pendingBills}</p>
              </div>
              <Clock className="w-8 h-8 text-warning" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Em Atraso</p>
                <p className="text-2xl font-bold text-destructive">{summary.overdueBills}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Vence Hoje</p>
                <p className="text-2xl font-bold text-warning">{summary.dueTodayBills}</p>
              </div>
              <Calendar className="w-8 h-8 text-warning" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-muted-foreground text-sm font-medium">Total Pendente</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.totalPendingAmount)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-primary" />
            </div>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      {bills.length > 0 && (
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar contas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={filterType === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('all')}
            >
              Todas ({bills.length})
            </Button>
            <Button
              variant={filterType === 'pending' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('pending')}
              className={filterType === 'pending' ? 'bg-warning hover:bg-warning/90 text-warning-foreground' : ''}
            >
              <Clock className="w-4 h-4 mr-2" />
              Não Concluídos ({pendingBills.length})
            </Button>
            <Button
              variant={filterType === 'receivable' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('receivable')}
              className={filterType === 'receivable' ? 'bg-success hover:bg-success/90' : ''}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              A Receber ({receivableBills.length})
            </Button>
            <Button
              variant={filterType === 'payable' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('payable')}
              className={filterType === 'payable' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              <TrendingDown className="w-4 h-4 mr-2" />
              A Pagar ({payableBills.length})
            </Button>
          </div>
        </div>
      )}

      {/* Bills List */}
      {bills.length > 0 ? (
        <div className="space-y-4">
          {filteredBills.length > 0 ? (
            filteredBills.map((bill) => {
              const daysUntilDue = getDaysUntilDue(bill.due_date);
              const isPayable = bill.type === 'payable';
              
              return (
                <Card key={bill.id} className="p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div className={cn(
                        "w-12 h-12 rounded-lg flex items-center justify-center",
                        isPayable ? "bg-destructive/20" : "bg-success/20"
                      )}>
                        {isPayable ? (
                          <TrendingDown className="w-6 h-6 text-destructive" />
                        ) : (
                          <TrendingUp className="w-6 h-6 text-success" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{bill.title}</h3>
                          <Badge className={cn("text-xs", getStatusColor(bill.status))}>
                            {bill.status === 'paid' ? (isPayable ? 'Pago' : 'Recebido') : getStatusLabel(bill.status)}
                          </Badge>
                          <Badge variant="outline" className={cn(
                            "text-xs",
                            isPayable ? "text-destructive" : "text-success"
                          )}>
                            {isPayable ? 'A Pagar' : 'A Receber'}
                          </Badge>
                        </div>
                        
                        {bill.description && (
                          <p className="text-sm text-muted-foreground mb-2">{bill.description}</p>
                        )}
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(bill.due_date)}
                          </span>
                          {daysUntilDue >= 0 ? (
                            <span className={cn(
                              daysUntilDue === 0 ? "text-warning font-medium" :
                              daysUntilDue <= 3 ? (isPayable ? "text-destructive font-medium" : "text-warning font-medium") : ""
                            )}>
                              {daysUntilDue === 0 ? 
                                (isPayable ? 'Vence hoje!' : 'Para receber hoje!') : 
                                `${daysUntilDue} dias para ${isPayable ? 'vencer' : 'receber'}`
                              }
                            </span>
                          ) : (
                            <span className="text-destructive font-medium">
                              {Math.abs(daysUntilDue)} dias em atraso
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className={cn(
                          "text-2xl font-bold",
                          isPayable ? "text-destructive" : "text-success"
                        )}>
                          {formatCurrency(bill.amount)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        {bill.status === 'pending' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="sm"
                                className="bg-success hover:bg-success/90"
                              >
                                <Check className="w-4 h-4 mr-1" />
                                {isPayable ? 'PAGO' : 'RECEBIDO'}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Marcar como {isPayable ? 'Pago' : 'Recebido'}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  Tem certeza que deseja marcar a conta "{bill.title}" como {isPayable ? 'paga' : 'recebida'}?
                                  <br /><br />
                                  <strong>⚠️ Importante:</strong> Esta ação irá automaticamente criar uma {isPayable ? 'despesa' : 'receita'} de {formatCurrency(bill.amount)} no histórico de transações com o título "{isPayable ? 'Conta Paga' : 'Conta Recebida'}: {bill.title}".
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleMarkAsPaid(bill.id, bill.title, bill.type, bill.amount)}
                                  className="bg-success hover:bg-success/90"
                                >
                                  Confirmar {isPayable ? 'Pagamento' : 'Recebimento'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedBill(bill);
                            setShowEditModal(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
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
                              <AlertDialogTitle>Excluir Conta</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir a conta "{bill.title}"? 
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleDeleteBill(bill.id, bill.title)}
                                className="bg-destructive hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })
          ) : (
            <Card className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'Nenhuma conta encontrada com os filtros aplicados' : 'Nenhuma conta encontrada'}
              </p>
            </Card>
          )}
        </div>
      ) : (
        /* Empty State */
        <Card className="p-12 text-center">
          <Calendar className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h2 className="text-2xl font-semibold text-foreground mb-2">Organize suas Contas</h2>
          <p className="text-muted-foreground mb-6">
            Adicione suas contas a pagar e receber para nunca perder um vencimento.
          </p>
          <Button 
            className="bg-gradient-primary hover:opacity-90"
            onClick={() => setShowBillModal(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Primeira Conta
          </Button>
        </Card>
      )}

      {/* Modals */}
      <BillModal
        open={showBillModal}
        onOpenChange={setShowBillModal}
      />
      
      <EditBillModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        bill={selectedBill}
      />
    </div>
  );
};

export default Bills;