import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Target, Calendar, Save, X } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { toast } from 'sonner';

interface EditGoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  goal: any;
}

const EditGoalModal: React.FC<EditGoalModalProps> = ({ 
  open, 
  onOpenChange, 
  goal 
}) => {
  const { updateGoal } = useGoals();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    target_amount: '',
    target_date: '',
    status: 'active' as 'active' | 'paused' | 'completed' | 'cancelled'
  });
  
  const [loading, setLoading] = useState(false);

  const statusOptions = [
    { value: 'active', label: 'Ativa', color: 'text-success' },
    { value: 'paused', label: 'Pausada', color: 'text-warning' },
    { value: 'completed', label: 'Concluída', color: 'text-primary' },
    { value: 'cancelled', label: 'Cancelada', color: 'text-destructive' }
  ];

  // Data mínima é hoje
  const minDate = new Date().toISOString().split('T')[0];

  // Populate form when goal changes
  useEffect(() => {
    if (goal && open) {
      setFormData({
        title: goal.title || '',
        description: goal.description || '',
        target_amount: goal.target_amount?.toString() || '',
        target_date: goal.target_date || '',
        status: goal.status || 'active'
      });
    }
  }, [goal, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.title.trim()) {
      toast.error('Nome da meta é obrigatório');
      return;
    }
    
    if (!formData.target_amount || parseFloat(formData.target_amount) <= 0) {
      toast.error('Valor da meta deve ser maior que zero');
      return;
    }

    if (!formData.target_date) {
      toast.error('Data da meta é obrigatória');
      return;
    }

    try {
      setLoading(true);
      
      const goalData = {
        title: formData.title.trim(),
        description: formData.description.trim() || null,
        target_amount: parseFloat(formData.target_amount),
        target_date: formData.target_date,
        status: formData.status
      };

      await updateGoal(goal.id, goalData);
      
      toast.success('Meta atualizada com sucesso!');
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao atualizar meta:', error);
      toast.error('Erro ao atualizar meta');
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

  const calculateMonthsToTarget = () => {
    if (!formData.target_date) return 0;
    const today = new Date();
    const targetDate = new Date(formData.target_date);
    const diffTime = targetDate.getTime() - today.getTime();
    const diffMonths = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 30));
    return Math.max(0, diffMonths);
  };

  const calculateMonthlyTarget = () => {
    const targetAmount = parseFloat(formData.target_amount) || 0;
    const currentAmount = goal?.current_amount || 0;
    const remaining = targetAmount - currentAmount;
    const months = calculateMonthsToTarget();
    
    if (months <= 0 || remaining <= 0) return 0;
    return remaining / months;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Editar Meta Financeira
          </DialogTitle>
          <DialogDescription>
            Atualize as configurações da sua meta financeira.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="title">Nome da Meta *</Label>
            <Input
              id="title"
              placeholder="Ex: Reserva de Emergência, Viagem Europa..."
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              required
            />
          </div>

          {/* Valor da Meta */}
          <div className="space-y-2">
            <Label htmlFor="target_amount">Valor da Meta *</Label>
            <Input
              id="target_amount"
              type="number"
              step="0.01"
              placeholder="0,00"
              value={formData.target_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, target_amount: e.target.value }))}
              required
            />
            {formData.target_amount && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(formData.target_amount)}
              </p>
            )}
          </div>

          {/* Data da Meta */}
          <div className="space-y-2">
            <Label htmlFor="target_date">Data da Meta *</Label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="target_date"
                type="date"
                min={minDate}
                value={formData.target_date}
                onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                className="pl-10"
                required
              />
            </div>
            {formData.target_date && (
              <p className="text-sm text-muted-foreground">
                {formatDate(formData.target_date)} • {calculateMonthsToTarget()} meses
              </p>
            )}
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {statusOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <span className={option.color}>{option.label}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Descreva sua meta e motivação..."
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
            />
          </div>

          {/* Informações Atuais */}
          {goal && (
            <div className="p-3 border rounded-lg bg-accent/20">
              <h4 className="text-sm font-medium mb-2">Situação Atual</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Valor Atual:</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(goal.current_amount?.toString() || '0')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Meta:</span>
                  <span className="font-medium text-foreground">
                    {formatCurrency(formData.target_amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Faltam:</span>
                  <span className="font-medium text-destructive">
                    {formatCurrency((parseFloat(formData.target_amount) - (goal.current_amount || 0)).toString())}
                  </span>
                </div>
                {formData.target_date && (
                  <div className="flex justify-between">
                    <span>Por mês:</span>
                    <span className="font-medium text-primary">
                      {formatCurrency(calculateMonthlyTarget().toString())}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

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
              {loading ? 'Atualizando...' : 'Atualizar Meta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default EditGoalModal;