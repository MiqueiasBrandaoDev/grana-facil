import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export interface Card {
  id: string;
  user_id: string;
  nickname: string;
  due_day: number;
  limit_amount?: number;
  is_active: boolean;
  current_invoice_paid: boolean;
  created_at: string;
  updated_at: string;
}

export interface CardPurchase {
  id: string;
  card_id: string;
  description: string;
  amount: number;
  category_id?: string;
  purchase_date: string;
  installments: number;
  current_installment: number;
  invoice_month: number;
  invoice_year: number;
  is_paid: boolean;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CardWithPurchases extends Card {
  pending_amount: number;
  total_spent: number;
  pending_purchases: number;
}

export interface CreateCardData {
  nickname: string;
  due_day: number;
  limit_amount?: number;
}

export interface CreatePurchaseData {
  card_id: string;
  description: string;
  amount: number;
  category_id?: string;
  purchase_date?: string;
  installments?: number;
}

export function useCards() {
  return useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_spending_summary')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching cards:', error);
        throw error;
      }

      return data as CardWithPurchases[];
    },
  });
}

export function useCard(cardId: string) {
  return useQuery({
    queryKey: ['card', cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('id', cardId)
        .single();

      if (error) {
        console.error('Error fetching card:', error);
        throw error;
      }

      return data as Card;
    },
    enabled: !!cardId,
  });
}

export function useCardPurchases(cardId: string) {
  return useQuery({
    queryKey: ['card-purchases', cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_purchases_with_details')
        .select('*')
        .eq('card_id', cardId)
        .order('purchase_date', { ascending: false });

      if (error) {
        console.error('Error fetching card purchases:', error);
        throw error;
      }

      return data;
    },
    enabled: !!cardId,
  });
}

export function useCreateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardData: CreateCardData) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('cards')
        .insert({
          ...cardData,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating card:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      toast({
        title: 'Cartão criado',
        description: 'Cartão criado com sucesso!',
      });
    },
    onError: (error) => {
      console.error('Error creating card:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao criar cartão. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useUpdateCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...cardData }: Partial<Card> & { id: string }) => {
      const { data, error } = await supabase
        .from('cards')
        .update(cardData)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating card:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      toast({
        title: 'Cartão atualizado',
        description: 'Cartão atualizado com sucesso!',
      });
    },
    onError: (error) => {
      console.error('Error updating card:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar cartão. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useDeleteCard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardId: string) => {
      const { error } = await supabase
        .from('cards')
        .delete()
        .eq('id', cardId);

      if (error) {
        console.error('Error deleting card:', error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      toast({
        title: 'Cartão excluído',
        description: 'Cartão excluído com sucesso!',
      });
    },
    onError: (error) => {
      console.error('Error deleting card:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao excluir cartão. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useCreatePurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (purchaseData: CreatePurchaseData) => {
      // Buscar informações do cartão para calcular a fatura
      const { data: card, error: cardError } = await supabase
        .from('cards')
        .select('due_day')
        .eq('id', purchaseData.card_id)
        .single();

      if (cardError) {
        throw cardError;
      }

      // Calcular período da fatura
      const purchaseDate = new Date(purchaseData.purchase_date || new Date());
      const dueDay = card.due_day;
      const purchaseDay = purchaseDate.getDate();
      
      let invoiceMonth = purchaseDate.getMonth() + 1;
      let invoiceYear = purchaseDate.getFullYear();

      // Se a compra foi depois do dia de vencimento, vai para a próxima fatura
      if (purchaseDay > dueDay) {
        if (invoiceMonth === 12) {
          invoiceMonth = 1;
          invoiceYear += 1;
        } else {
          invoiceMonth += 1;
        }
      }

      // Limpar category_id se estiver vazio ou for "none"
      const cleanPurchaseData = {
        ...purchaseData,
        category_id: purchaseData.category_id && 
                     purchaseData.category_id.trim() !== '' && 
                     purchaseData.category_id !== 'none' && 
                     purchaseData.category_id !== 'loading' && 
                     purchaseData.category_id !== 'empty' 
                     ? purchaseData.category_id : null,
        purchase_date: purchaseDate.toISOString().split('T')[0],
        installments: purchaseData.installments || 1,
        current_installment: 1,
        invoice_month: invoiceMonth,
        invoice_year: invoiceYear,
      };

      const { data, error } = await supabase
        .from('card_purchases')
        .insert(cleanPurchaseData)
        .select()
        .single();

      if (error) {
        console.error('Error creating purchase:', error);
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['card-purchases'] });
      toast({
        title: 'Compra registrada',
        description: 'Compra registrada com sucesso!',
      });
    },
    onError: (error) => {
      console.error('Error creating purchase:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao registrar compra. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useMarkInvoiceAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cardId: string) => {
      // Buscar todas as compras não pagas do cartão
      const { data: purchases, error: purchasesError } = await supabase
        .from('card_purchases')
        .select('*')
        .eq('card_id', cardId)
        .eq('is_paid', false);

      if (purchasesError) {
        throw purchasesError;
      }

      if (purchases && purchases.length > 0) {
        // Criar uma transação de pagamento da fatura
        const totalAmount = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Usuário não autenticado');
        }

        const { data: transaction, error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            amount: totalAmount, // Valor positivo para despesa
            description: `Pagamento fatura cartão`,
            type: 'expense',
            transaction_date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (transactionError) {
          console.error('Error creating transaction:', transactionError);
          throw transactionError;
        }

        // Marcar todas as compras como pagas e associar à transação
        const { error: updateError } = await supabase
          .from('card_purchases')
          .update({ 
            is_paid: true,
            transaction_id: transaction.id 
          })
          .eq('card_id', cardId)
          .eq('is_paid', false);

        if (updateError) {
          throw updateError;
        }
      }

      // Por último, resetar o status do cartão para próxima fatura
      const { error: cardError } = await supabase
        .from('cards')
        .update({ current_invoice_paid: false })
        .eq('id', cardId);

      if (cardError) {
        throw cardError;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['card-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['total-card-spending'] });
      toast({
        title: 'Fatura paga',
        description: 'Fatura marcada como paga e transação criada! Cartão pronto para próxima fatura.',
      });
    },
    onError: (error) => {
      console.error('Error marking invoice as paid:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao marcar fatura como paga. Tente novamente.',
        variant: 'destructive',
      });
    },
  });
}

export function useTotalCardSpending() {
  return useQuery({
    queryKey: ['total-card-spending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_spending_summary')
        .select('pending_amount');

      if (error) {
        console.error('Error fetching total card spending:', error);
        throw error;
      }

      const total = data?.reduce((sum, card) => sum + (card.pending_amount || 0), 0) || 0;
      return total;
    },
  });
}