import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Target, DollarSign, Calendar, Save, X } from 'lucide-react';
import { useGoals } from '@/hooks/useGoals';
import { toast } from 'sonner';

interface GoalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const GoalModal: React.FC<GoalModalProps> = ({ 
  open, 
  onOpenChange
}) => {
  const { addGoal } = useGoals();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    target_amount: '',
    current_amount: '0',
    target_date: '',
    category: 'savings',
    priority: 'medium' as 'low' | 'medium' | 'high',
    status: 'active' as 'active' | 'paused' | 'completed'
  });
  
  const [loading, setLoading] = useState(false);

  const categories = [
    { value: 'savings', label: 'Poupança' },
    { value: 'emergency', label: 'Reserva de Emergência' },
    { value: 'travel', label: 'Viagem' },
    { value: 'house', label: 'Casa/Moradia' },
    { value: 'car', label: 'Veículo' },
    { value: 'education', label: 'Educação' },
    { value: 'health', label: 'Saúde' },
    { value: 'investment', label: 'Investimento' },
    { value: 'retirement', label: 'Aposentadoria' },
    { value: 'other', label: 'Outros' }
  ];

  const priorities = [
    { value: 'low', label: 'Baixa', color: 'text-muted-foreground' },
    { value: 'medium', label: 'Média', color: 'text-primary' },
    { value: 'high', label: 'Alta', color: 'text-destructive' }
  ];

  // Data mínima é hoje
  const minDate = new Date().toISOString().split('T')[0];

  // Resetar form quando modal abrir
  useEffect(() => {
    if (open) {
      setFormData({
        name: '',
        description: '',
        target_amount: '',
        current_amount: '0',
        target_date: '',
        category: 'savings',
        priority: 'medium',
        status: 'active'
      });
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
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
        title: formData.name.trim(),
        description: formData.description.trim() || null,
        target_amount: parseFloat(formData.target_amount),
        current_amount: parseFloat(formData.current_amount) || 0,
        target_date: formData.target_date,
        status: formData.status
      };

      await addGoal(goalData);
      
      toast.success('Meta criada com sucesso!');
      
      // Reset form
      setFormData({
        name: '',
        description: '',
        target_amount: '',
        current_amount: '0',
        target_date: '',
        category: 'savings',
        priority: 'medium',
        status: 'active'
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar meta:', error);
      toast.error('Erro ao criar meta');
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
    const currentAmount = parseFloat(formData.current_amount) || 0;
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
            Nova Meta Financeira
          </DialogTitle>
          <DialogDescription>
            Defina uma nova meta financeira e acompanhe seu progresso.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Meta *</Label>
            <Input
              id="name"
              placeholder="Ex: Reserva de Emergência, Viagem Europa..."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          {/* Categoria */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category.value} value={category.value}>
                    {category.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Valor da Meta */}
          <div className="space-y-2">
            <Label htmlFor="target_amount">Valor da Meta *</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="target_amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.target_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, target_amount: e.target.value }))}
                className="pl-10"
                required
              />
            </div>
            {formData.target_amount && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(formData.target_amount)}
              </p>
            )}
          </div>

          {/* Valor Atual */}
          <div className="space-y-2">
            <Label htmlFor="current_amount">Valor Atual</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="current_amount"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.current_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, current_amount: e.target.value }))}
                className="pl-10"
              />
            </div>
            {formData.current_amount && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(formData.current_amount)}
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

          {/* Prioridade */}
          <div className="space-y-2">
            <Label htmlFor="priority">Prioridade</Label>
            <Select 
              value={formData.priority} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, priority: value as any }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((priority) => (
                  <SelectItem key={priority.value} value={priority.value}>
                    <span className={priority.color}>{priority.label}</span>
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

          {/* Cálculo Mensal */}
          {formData.target_amount && formData.target_date && (
            <div className="p-3 border rounded-lg bg-accent/20">
              <h4 className="text-sm font-medium mb-2">Planejamento</h4>
              <div className="space-y-1 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Meta:</span>
                  <span>{formatCurrency(formData.target_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Atual:</span>
                  <span>{formatCurrency(formData.current_amount || '0')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Faltam:</span>
                  <span>{formatCurrency((parseFloat(formData.target_amount) - parseFloat(formData.current_amount || '0')).toString())}</span>
                </div>
                <div className="flex justify-between font-medium text-foreground">
                  <span>Por mês:</span>
                  <span>{formatCurrency(calculateMonthlyTarget().toString())}</span>
                </div>
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
              {loading ? 'Criando...' : 'Criar Meta'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GoalModal;