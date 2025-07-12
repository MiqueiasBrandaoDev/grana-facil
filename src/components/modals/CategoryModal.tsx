import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, Tag, DollarSign, Save, X } from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ open, onOpenChange }) => {
  const { addCategory } = useCategories();
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'expense' as 'income' | 'expense',
    icon: '💰',
    color: '#3B82F6',
    budget: ''
  });
  
  const [loading, setLoading] = useState(false);

  const iconOptions = [
    '💰', '🏠', '🚗', '🍕', '🛒', '💊', '🎓', '✈️', '🎬', '👕',
    '⚡', '📱', '🎮', '🏋️', '💄', '🐕', '🎁', '🚌', '☕', '📚',
    '💼', '💎', '🔧', '🌟', '🎯', '🏆', '🎨', '🎵', '🍔', '🎈'
  ];

  const colorOptions = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome da categoria é obrigatório');
      return;
    }
    
    if (!formData.budget || parseFloat(formData.budget) <= 0) {
      toast.error('Orçamento deve ser maior que zero');
      return;
    }

    try {
      setLoading(true);
      
      const categoryData = {
        name: formData.name.trim(),
        type: formData.type,
        icon: formData.icon,
        color: formData.color,
        budget: parseFloat(formData.budget)
      };

      await addCategory(categoryData);
      
      toast.success('Categoria criada com sucesso!');
      
      // Reset form
      setFormData({
        name: '',
        type: 'expense',
        icon: '💰',
        color: '#3B82F6',
        budget: ''
      });
      
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao criar categoria:', error);
      toast.error('Erro ao criar categoria');
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
      <DialogContent className="sm:max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-primary" />
            Nova Categoria
          </DialogTitle>
          <DialogDescription>
            Crie uma nova categoria para organizar suas transações financeiras.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Categoria *</Label>
            <Input
              id="name"
              placeholder="Ex: Alimentação, Transporte..."
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
          </div>

          {/* Tipo */}
          <div className="space-y-2">
            <Label>Tipo de Categoria *</Label>
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
          </div>

          {/* Ícone */}
          <div className="space-y-2">
            <Label>Ícone</Label>
            <div className="grid grid-cols-6 gap-2">
              {iconOptions.map((icon) => (
                <Button
                  key={icon}
                  type="button"
                  variant={formData.icon === icon ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFormData(prev => ({ ...prev, icon }))}
                  className="h-10 w-10 p-0"
                >
                  <span className="text-lg">{icon}</span>
                </Button>
              ))}
            </div>
          </div>

          {/* Cor */}
          <div className="space-y-2">
            <Label>Cor</Label>
            <div className="flex gap-2 flex-wrap">
              {colorOptions.map((color) => (
                <Button
                  key={color}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, color }))}
                  className="h-8 w-8 p-0 rounded-full border-2"
                  style={{ 
                    backgroundColor: color,
                    borderColor: formData.color === color ? '#000' : 'transparent'
                  }}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: formData.color }}
              />
              <span>Cor selecionada: {formData.color}</span>
            </div>
          </div>

          {/* Orçamento */}
          <div className="space-y-2">
            <Label htmlFor="budget">
              Orçamento {formData.type === 'income' ? 'Esperado' : 'Mensal'} *
            </Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="budget"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={formData.budget}
                onChange={(e) => setFormData(prev => ({ ...prev, budget: e.target.value }))}
                className="pl-10"
                required
              />
            </div>
            {formData.budget && (
              <p className="text-sm text-muted-foreground">
                {formatCurrency(formData.budget)}
              </p>
            )}
          </div>


          {/* Preview */}
          <div className="p-3 border rounded-lg bg-accent/20">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: formData.color }}
              >
                <span className="text-lg">{formData.icon}</span>
              </div>
              <div>
                <h3 className="font-medium">{formData.name || 'Nome da Categoria'}</h3>
                <p className="text-sm text-muted-foreground">
                  {formData.type === 'income' ? 'Receita' : 'Despesa'} • 
                  {formData.budget ? formatCurrency(formData.budget) : 'R$ 0,00'}
                </p>
              </div>
            </div>
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
              {loading ? 'Criando...' : 'Criar Categoria'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CategoryModal;