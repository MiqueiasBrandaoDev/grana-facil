import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { TrendingUp, TrendingDown, Calendar, DollarSign, Save, X } from 'lucide-react';
import { useTransactions } from '@/hooks/useTransactions';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface TransactionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type?: 'income' | 'expense';
  onTransactionAdded?: () => void; // Callback para refresh
}

const TransactionModal: React.FC<TransactionModalProps> = ({ 
  open, 
  onOpenChange, 
  type,
  onTransactionAdded 
}) => {
  const { addTransaction } = useTransactions();
  
  const [formData, setFormData] = useState({
    type: type || 'expense',
    description: '',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    notes: ''
  });

  // Atualizar o tipo quando a prop type mudar
  useEffect(() => {
    if (type && type !== formData.type) {
      setFormData(prev => ({ ...prev, type }));
    }
  }, [type, formData.type]);

  // Resetar form quando modal abrir
  useEffect(() => {
    if (open) {
      setFormData({
        type: type || 'expense',
        description: '',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
    }
  }, [open, type]);
  
  const [loading, setLoading] = useState(false);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      toast.error('Descrição é obrigatória');
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }

    try {
      setLoading(true);
      
      const transactionData: any = {
        type: formData.type as 'income' | 'expense',
        description: formData.description.trim(),
        amount: parseFloat(formData.amount),
        category_id: null, // IA vai categorizar depois
        payment_method: 'other', // Campo padrão
        transaction_date: formData.transaction_date,
        status: 'completed' as const // Sempre concluído
      };

      // Só adicionar notes se não estiver vazio (após migration ser aplicada)
      if (formData.notes.trim()) {
        transactionData.notes = formData.notes.trim();
      }

      await addTransaction(transactionData);
      
      toast.success(`${formData.type === 'income' ? 'Receita' : 'Despesa'} adicionada com sucesso!`);
      
      // Chamar callback para refresh de dados
      if (onTransactionAdded) {
        onTransactionAdded();
      }
      
      // Reset form
      setFormData({
        type: type || 'expense',
        description: '',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao adicionar transação:', error);
      toast.error('Erro ao adicionar transação');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string) => {
    const number = parseFloat(value);
    if (isNaN(number)) return '';
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(number);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {formData.type === 'income' ? (
              <TrendingUp className="w-5 h-5 text-success" />
            ) : (
              <TrendingDown className="w-5 h-5 text-destructive" />
            )}
            Nova {formData.type === 'income' ? 'Receita' : 'Despesa'}
          </DialogTitle>
          <DialogDescription>
            Adicione uma nova {formData.type === 'income' ? 'receita' : 'despesa'} ao seu controle financeiro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tipo da Transação */}
          {!type && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant={formData.type === 'income' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormData(prev => ({ ...prev, type: 'income' }))}
                className={formData.type === 'income' ? 'bg-success hover:bg-success/90' : ''}
              >
                <TrendingUp className="w-4 h-4 mr-2" />
                Receita
              </Button>
              <Button
                type="button"
                variant={formData.type === 'expense' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFormData(prev => ({ ...prev, type: 'expense' }))}
                className={formData.type === 'expense' ? 'bg-destructive hover:bg-destructive/90' : ''}
              >
                <TrendingDown className="w-4 h-4 mr-2" />
                Despesa
              </Button>
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Input
              id="description"
              placeholder="Ex: Compra no supermercado"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              required
            />
          </div>

          {/* Valor */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                className="pl-10"
                required
              />
            </div>
            {formData.amount && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(formData.amount)}
              </p>
            )}
          </div>

          {/* Data */}
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => setFormData(prev => ({ ...prev, transaction_date: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Informações adicionais..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={cn(
                "flex-1",
                formData.type === 'income' 
                  ? "bg-success hover:bg-success/90" 
                  : "bg-destructive hover:bg-destructive/90"
              )}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default TransactionModal;