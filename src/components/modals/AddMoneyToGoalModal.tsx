import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DollarSign, Plus, X, TrendingUp } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { useGoalContributions } from '@/hooks/useGoalContributions';
import { toast } from 'sonner';

interface AddMoneyToGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: any;
}

const AddMoneyToGoalModal: React.FC<AddMoneyToGoalModalProps> = ({ 
  open, 
  onOpenChange, 
  goal 
}) => {
  const { addContribution } = useGoalContributions();
  
  const [formData, setFormData] = useState({
    amount: '',
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      toast.error('Valor deve ser maior que zero');
      return;
    }

    const amountToAdd = parseFloat(formData.amount);
    const newCurrentAmount = (goal?.current_amount || 0) + amountToAdd;

    try {
      setLoading(true);
      
      // Adicionar contribuição (isso já atualiza o valor da meta também)
      await addContribution({
        goalId: goal.id,
        contribution: {
          amount: amountToAdd,
          notes: formData.notes.trim() || undefined
        }
      });
      
      toast.success(`${formatCurrency(amountToAdd)} adicionado à meta!`);
      
      // Reset form
      setFormData({
        amount: '',
        notes: ''
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao adicionar dinheiro à meta:', error);
      toast.error('Erro ao adicionar dinheiro');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const calculateProgress = (current: number, target: number) => {
    if (target <= 0) return 0;
    return Math.min((current / target) * 100, 100);
  };

  const getNewProgress = () => {
    if (!formData.amount || !goal) return goal?.current_amount || 0;
    const amountToAdd = parseFloat(formData.amount) || 0;
    return (goal.current_amount || 0) + amountToAdd;
  };

  const newCurrentAmount = getNewProgress();
  const newProgressPercentage = calculateProgress(newCurrentAmount, goal?.target_amount || 0);
  const currentProgressPercentage = calculateProgress(goal?.current_amount || 0, goal?.target_amount || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-success" />
            Adicionar Dinheiro à Meta
          </DialogTitle>
          <DialogDescription>
            Adicione dinheiro à meta "{goal?.title}" e acompanhe seu progresso.
          </DialogDescription>
        </DialogHeader>

        {/* Current Progress */}
        {goal && (
          <div className="p-4 border rounded-lg bg-accent/20">
            <h4 className="text-sm font-medium mb-3">Situação Atual</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Progresso:</span>
                <span className="font-medium">{currentProgressPercentage.toFixed(1)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor Atual:</span>
                <span className="font-medium text-success">
                  {formatCurrency(goal.current_amount || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Meta:</span>
                <span className="font-medium">
                  {formatCurrency(goal.target_amount || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Faltam:</span>
                <span className="font-medium text-destructive">
                  {formatCurrency(Math.max(0, (goal.target_amount || 0) - (goal.current_amount || 0)))}
                </span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Valor a Adicionar */}
          <div className="space-y-2">
            <Label htmlFor="amount">Valor a Adicionar *</Label>
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
                {formatCurrency(parseFloat(formData.amount))}
              </p>
            )}
          </div>

          {/* Preview do Novo Progresso */}
          {formData.amount && parseFloat(formData.amount) > 0 && (
            <div className="p-3 border rounded-lg bg-success/10">
              <h4 className="text-sm font-medium mb-2 text-success">Novo Progresso</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Novo Valor:</span>
                  <span className="font-medium text-success">
                    {formatCurrency(newCurrentAmount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Novo Progresso:</span>
                  <span className="font-medium text-success">
                    {newProgressPercentage.toFixed(1)}%
                  </span>
                </div>
                {newCurrentAmount >= (goal?.target_amount || 0) && (
                  <div className="text-center p-2 mt-2 bg-success text-success-foreground rounded">
                    🎉 Meta atingida! Parabéns!
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Ex: Salário do mês, venda de item, economia..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
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
              className="flex-1 bg-success hover:bg-success/90"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : (
                <Plus className="w-4 h-4 mr-2" />
              )}
              {loading ? 'Adicionando...' : 'Adicionar Dinheiro'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddMoneyToGoalModal;