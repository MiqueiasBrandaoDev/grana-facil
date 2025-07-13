import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Edit, Trash2, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import CategoryModal from '@/components/modals/CategoryModal';
import EditCategoryModal from '@/components/modals/EditCategoryModal';
import { cn } from '@/lib/utils';
import { useCategories } from '@/hooks/useCategories';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';
import { Tables } from '@/integrations/supabase/types';

type Category = Tables<'categories'>;

interface CategoryWithSpent extends Category {
  spent: number;
}

const Categories: React.FC = () => {
  const { categories, loading, error, deleteCategory, createDefaultCategories } = useCategories();
  const [categoriesWithSpent, setCategoriesWithSpent] = useState<CategoryWithSpent[]>([]);
  const [spentLoading, setSpentLoading] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);

  // Função para buscar gastos reais por categoria
  const fetchCategorySpending = async () => {
    if (!categories.length) return;
    
    try {
      setSpentLoading(true);
      const user = await getCurrentUser();
      if (!user) return;

      // Buscar gastos do mês atual por categoria
      const currentMonth = new Date().toISOString().slice(0, 7);
      
      const categoriesWithSpentData = await Promise.all(
        categories.map(async (category) => {
          const { data: transactions } = await supabase
            .from('transactions')
            .select('amount')
            .eq('user_id', user.id)
            .eq('category_id', category.id)
            .eq('status', 'completed')
            .eq('type', category.type)
            .gte('transaction_date', `${currentMonth}-01`)
            .lt('transaction_date', `${currentMonth}-31`);

          const spent = transactions?.reduce((sum, t) => sum + Math.abs(t.amount), 0) || 0;
          
          return {
            ...category,
            spent
          };
        })
      );

      setCategoriesWithSpent(categoriesWithSpentData);
    } catch (error) {
      console.error('Erro ao buscar gastos por categoria:', error);
    } finally {
      setSpentLoading(false);
    }
  };

  useEffect(() => {
    if (categories.length > 0) {
      fetchCategorySpending();
    }
  }, [categories]);

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);

  const getProgressPercentage = (spent: number, budget: number) => 
    Math.min((spent / budget) * 100, 100);

  const getProgressColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-destructive';
    if (percentage >= 70) return 'bg-amber-500';
    return 'bg-primary';
  };

  const handleEditCategory = (category: Category) => {
    setSelectedCategory(category);
    setShowEditModal(true);
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    try {
      await deleteCategory(categoryId);
      // A lista será atualizada automaticamente devido ao React Query
    } catch (error) {
      console.error('Erro ao excluir categoria:', error);
    }
  };

  // Criar categorias automaticamente se o usuário tiver poucas
  useEffect(() => {
    if (!loading && categories.length > 0 && categories.length < 10) {
      console.log('🏷️ Criando categorias padrão automaticamente...');
      createDefaultCategories().catch(console.error);
    }
  }, [categories.length, loading, createDefaultCategories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando categorias...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive">Erro ao carregar categorias: {error}</p>
      </div>
    );
  }

  const expenseCategories = categoriesWithSpent.filter(cat => cat.type === 'expense');
  const incomeCategories = categoriesWithSpent.filter(cat => cat.type === 'income');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Categorias</h1>
          <p className="text-muted-foreground">Gerencie suas categorias e orçamentos</p>
        </div>
        <Button 
          className="bg-gradient-primary hover:opacity-90 transition-opacity"
          onClick={() => setShowCategoryModal(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          Nova Categoria
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gradient-success p-6 rounded-xl text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/80 text-sm font-medium">Categorias de Receita</p>
              <p className="text-2xl font-bold">{incomeCategories.length}</p>
              <p className="text-sm text-white/70 mt-1">
                Total: {formatCurrency(incomeCategories.reduce((sum, cat) => sum + cat.budget, 0))}
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-white/80" />
          </div>
        </div>

        <div className="bg-card border p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-muted-foreground text-sm font-medium">Categorias de Despesa</p>
              <p className="text-2xl font-bold text-foreground">{expenseCategories.length}</p>
              <p className="text-sm text-muted-foreground mt-1">
                Orçamento: {formatCurrency(expenseCategories.reduce((sum, cat) => sum + cat.budget, 0))}
              </p>
            </div>
            <TrendingDown className="w-8 h-8 text-primary" />
          </div>
        </div>
      </div>

      {/* Expense Categories */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Categorias de Despesa</h2>
          <Badge variant="secondary">{expenseCategories.length} categorias</Badge>
        </div>

        <div className="grid gap-4">
          {expenseCategories.map((category) => {
            const spent = category.spent;
            const percentage = getProgressPercentage(spent, category.budget);
            const isOverBudget = spent > category.budget;
            
            return (
              <div key={category.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{category.icon}</div>
                    <div>
                      <h3 className="font-medium">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(spent)} de {formatCurrency(category.budget)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {isOverBudget && (
                      <Badge variant="destructive" className="text-xs">
                        Acima do orçamento
                      </Badge>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditCategory(category)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCategory(category.id, category.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progresso</span>
                    <span className={cn(
                      "font-medium",
                      isOverBudget ? "text-destructive" : "text-foreground"
                    )}>
                      {percentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={percentage} 
                    className={cn(
                      "h-2",
                      isOverBudget && "bg-destructive/20"
                    )}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Income Categories */}
      <div className="bg-card border rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Categorias de Receita</h2>
          <Badge variant="secondary">{incomeCategories.length} categorias</Badge>
        </div>

        <div className="grid gap-4">
          {incomeCategories.map((category) => {
            const received = category.spent;
            const percentage = getProgressPercentage(received, category.budget);
            
            return (
              <div key={category.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="text-2xl">{category.icon}</div>
                    <div>
                      <h3 className="font-medium">{category.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {formatCurrency(received)} de {formatCurrency(category.budget)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge 
                      variant={percentage >= 100 ? "default" : "secondary"}
                      className={percentage >= 100 ? "bg-success" : ""}
                    >
                      {percentage.toFixed(1)}%
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditCategory(category)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive hover:text-destructive"
                      onClick={() => handleDeleteCategory(category.id, category.name)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modals */}
      <CategoryModal
        open={showCategoryModal}
        onOpenChange={setShowCategoryModal}
      />
      
      <EditCategoryModal
        open={showEditModal}
        onOpenChange={setShowEditModal}
        category={selectedCategory}
      />
    </div>
  );
};

export default Categories;