import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { CreditCard, DollarSign, Calendar, Repeat, Save, X } from 'lucide-react';
import { useBills } from '@/hooks/useBills';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface EditBillModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bill: {
    id: string;
    type: 'payable' | 'receivable';
    title: string;
    description?: string;
    amount: number;
    due_date: string;
    status: 'pending' | 'paid' | 'overdue';
    is_recurring: boolean;
    recurring_interval?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  } | null;
}

const EditBillModal: React.FC<EditBillModalProps> = ({ 
  open, 
  onOpenChange, 
  bill 
}) => {
  const { updateBill } = useBills();
  
  const [formData, setFormData] = useState({
    type: 'payable' as 'payable' | 'receivable',
    title: '',
    description: '',
    amount: '',
    due_date: '',
    status: 'pending' as 'pending' | 'paid' | 'overdue',
    is_recurring: false,
    recurring_interval: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly'
  });
  
  const [loading, setLoading] = useState(false);


  // Populate form when bill changes
  useEffect(() => {
    if (bill && open) {
      setFormData({
        type: bill.type || 'payable',
        title: bill.title || '',
        description: bill.description || '',
        amount: bill.amount?.toString() || '',
        due_date: bill.due_date || '',
        status: bill.status || 'pending',
        is_recurring: bill.is_recurring || false,
        recurring_interval: bill.recurring_interval || 'monthly'
      });
    }
  }, [bill, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Nome da conta é obrigatório');
      return;
    }
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }

    if (!formData.due_date) {
      toast.error('Data de vencimento é obrigatória');
      return;
    }

    try {
      setLoading(true);
      
      const billData = {
        type: formData.type,
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        amount: parseFloat(formData.amount),
        due_date: formData.due_date,
        status: formData.status,
        is_recurring: formData.is_recurring,
        recurring_interval: formData.is_recurring ? formData.recurring_interval : null
      };

      await updateBill(bill.id, billData);
      
      toast.success('Conta atualizada com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar conta:', error);
      toast.error('Erro ao atualizar conta');
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

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Intl.DateTimeFormat('pt-BR').format(new Date(dateString));
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            Editar Conta {formData.type === 'payable' ? 'a Pagar' : 'a Receber'}
          </DialogTitle>
          <DialogDescription>
            Atualize os dados da sua conta {formData.type === 'payable' ? 'a pagar' : 'a receber'}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="title">Nome da Conta *</Label>
            <Input
              id="title"
              placeholder="Ex: Conta de Luz, Fatura Cartão..."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
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

          {/* Data de Vencimento */}
          <div className="space-y-2">
            <Label htmlFor="due_date">Data de Vencimento *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                className="pl-10"
                required
              />
            </div>
            {formData.due_date && (
              <p className="text-sm text-muted-foreground">
                {formatDate(formData.due_date)}
              </p>
            )}
          </div>


          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as 'pending' | 'paid' | 'overdue' }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">{formData.type === 'payable' ? 'Pago' : 'Recebido'}</SelectItem>
                <SelectItem value="overdue">Em Atraso</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conta Recorrente */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="is_recurring">Conta Recorrente</Label>
              <p className="text-sm text-muted-foreground">
                Esta conta se repete periodicamente
              </p>
            </div>
            <Switch
              id="is_recurring"
              checked={formData.is_recurring}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_recurring: checked }))}
            />
          </div>

          {/* Frequência (se recorrente) */}
          {formData.is_recurring && (
            <div className="space-y-2">
              <Label htmlFor="frequency">Frequência</Label>
              <Select 
                value={formData.recurring_interval} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, recurring_interval: value as 'daily' | 'weekly' | 'monthly' | 'yearly' }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">
                    <div className="flex items-center gap-2">
                      <Repeat className="w-4 h-4" />
                      Diário
                    </div>
                  </SelectItem>
                  <SelectItem value="weekly">
                    <div className="flex items-center gap-2">
                      <Repeat className="w-4 h-4" />
                      Semanal
                    </div>
                  </SelectItem>
                  <SelectItem value="monthly">
                    <div className="flex items-center gap-2">
                      <Repeat className="w-4 h-4" />
                      Mensal
                    </div>
                  </SelectItem>
                  <SelectItem value="yearly">
                    <div className="flex items-center gap-2">
                      <Repeat className="w-4 h-4" />
                      Anual
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Input
              id="description"
              placeholder="Detalhes adicionais..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
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
              className="flex-1 bg-primary hover:bg-primary/90"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Atualizando...' : 'Atualizar Conta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditBillModal;