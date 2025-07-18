import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
};

const getMonthName = (month: number) => {
  const months = [
    'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ];
  return months[month - 1] || '';
};

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

export interface CardPurchaseGroup {
  id: string;
  card_id: string;
  description: string;
  total_amount: number;
  total_installments: number;
  category_id?: string;
  purchase_date: string;
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
  purchase_group_id?: string;
  installment_number: number;
  invoice_month: number;
  invoice_year: number;
  is_paid: boolean;
  transaction_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CardPurchaseDetailed extends CardPurchase {
  card_nickname: string;
  due_day: number;
  category_name?: string;
  category_color?: string;
  group_description?: string;
  group_total_amount?: number;
  total_installments?: number;
  group_purchase_date?: string;
  display_description: string;
  is_installment: boolean;
}

export interface CardMonthlyInvoice {
  card_id: string;
  user_id: string;
  card_nickname: string;
  due_day: number;
  invoice_month: number;
  invoice_year: number;
  pending_amount: number;
  total_amount: number;
  pending_purchases: number;
  total_purchases: number;
  due_date: string;
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
        .from('card_purchases_detailed')
        .select('*')
        .eq('card_id', cardId)
        .order('purchase_date', { ascending: false });

      if (error) {
        console.error('Error fetching card purchases:', error);
        throw error;
      }

      return data as CardPurchaseDetailed[];
    },
    enabled: !!cardId,
  });
}

export function useCardMonthlyInvoices(cardId: string) {
  return useQuery({
    queryKey: ['card-monthly-invoices', cardId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_monthly_invoices')
        .select('*')
        .eq('card_id', cardId)
        .order('invoice_year', { ascending: false })
        .order('invoice_month', { ascending: false });

      if (error) {
        console.error('Error fetching card monthly invoices:', error);
        throw error;
      }

      return data as CardMonthlyInvoice[];
    },
    enabled: !!cardId,
  });
}

export function useCardInvoicePurchases(cardId: string, month: number, year: number) {
  return useQuery({
    queryKey: ['card-invoice-purchases', cardId, month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('card_purchases_detailed')
        .select('*')
        .eq('card_id', cardId)
        .eq('invoice_month', month)
        .eq('invoice_year', year)
        .order('purchase_date', { ascending: false });

      if (error) {
        console.error('Error fetching card invoice purchases:', error);
        throw error;
      }

      return data as CardPurchaseDetailed[];
    },
    enabled: !!cardId && !!month && !!year,
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

      const purchaseDate = new Date(purchaseData.purchase_date || new Date());
      const installments = purchaseData.installments || 1;
      const dueDay = card.due_day;

      // Limpar category_id
      const cleanCategoryId = purchaseData.category_id && 
                             purchaseData.category_id.trim() !== '' && 
                             purchaseData.category_id !== 'none' && 
                             purchaseData.category_id !== 'loading' && 
                             purchaseData.category_id !== 'empty' 
                             ? purchaseData.category_id : null;

      if (installments === 1) {
        // Compra à vista - inserir diretamente
        const invoicePeriod = calculateInvoicePeriod(purchaseDate, dueDay);
        
        const { data, error } = await supabase
          .from('card_purchases')
          .insert({
            card_id: purchaseData.card_id,
            description: purchaseData.description,
            amount: purchaseData.amount,
            category_id: cleanCategoryId,
            purchase_date: purchaseDate.toISOString().split('T')[0],
            installment_number: 1,
            invoice_month: invoicePeriod.month,
            invoice_year: invoicePeriod.year,
          })
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Compra parcelada - criar grupo e parcelas
        const { data: group, error: groupError } = await supabase
          .from('card_purchase_groups')
          .insert({
            card_id: purchaseData.card_id,
            description: purchaseData.description,
            total_amount: purchaseData.amount,
            total_installments: installments,
            category_id: cleanCategoryId,
            purchase_date: purchaseDate.toISOString().split('T')[0],
          })
          .select()
          .single();

        if (groupError) throw groupError;

        // Criar cada parcela
        const installmentAmount = purchaseData.amount / installments;
        const installmentInserts = [];

        for (let i = 1; i <= installments; i++) {
          // Calcular mês/ano da parcela
          const installmentDate = new Date(purchaseDate);
          installmentDate.setMonth(installmentDate.getMonth() + (i - 1));
          
          const invoicePeriod = calculateInvoicePeriod(installmentDate, dueDay);
          
          installmentInserts.push({
            card_id: purchaseData.card_id,
            purchase_group_id: group.id,
            description: `${purchaseData.description} (${i}/${installments}x)`,
            amount: installmentAmount,
            category_id: cleanCategoryId,
            purchase_date: purchaseDate.toISOString().split('T')[0],
            installment_number: i,
            invoice_month: invoicePeriod.month,
            invoice_year: invoicePeriod.year,
          });
        }

        const { data: installments_data, error: installmentsError } = await supabase
          .from('card_purchases')
          .insert(installmentInserts)
          .select();

        if (installmentsError) throw installmentsError;
        return { group, installments: installments_data };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['card-purchases'] });
      queryClient.invalidateQueries({ queryKey: ['card-monthly-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['card-invoice-purchases'] });
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

// Função auxiliar para calcular período da fatura
function calculateInvoicePeriod(purchaseDate: Date, dueDay: number) {
  const purchaseDay = purchaseDate.getDate();
  let month = purchaseDate.getMonth() + 1;
  let year = purchaseDate.getFullYear();

  // Se a compra foi depois do dia de vencimento, vai para a próxima fatura
  if (purchaseDay > dueDay) {
    if (month === 12) {
      month = 1;
      year += 1;
    } else {
      month += 1;
    }
  }

  return { month, year };
}

export function useMarkInvoiceAsPaid() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      cardId, 
      partialAmount, 
      invoiceMonth, 
      invoiceYear 
    }: { 
      cardId: string; 
      partialAmount?: number;
      invoiceMonth?: number;
      invoiceYear?: number;
      amount?: number;
    }) => {
      // Buscar compras não pagas (da fatura específica ou todas)
      let query = supabase
        .from('card_purchases')
        .select('*')
        .eq('card_id', cardId)
        .eq('is_paid', false);

      // Se especificou mês/ano, filtrar apenas essa fatura
      if (invoiceMonth && invoiceYear) {
        query = query
          .eq('invoice_month', invoiceMonth)
          .eq('invoice_year', invoiceYear);
      }

      const { data: purchases, error: purchasesError } = await query;

      if (purchasesError) {
        throw purchasesError;
      }

      const totalAmount = purchases?.reduce((sum, purchase) => sum + purchase.amount, 0) || 0;
      
      if (purchases && purchases.length > 0) {
        const paymentAmount = partialAmount || totalAmount;
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          throw new Error('Usuário não autenticado');
        }

        // Criar uma transação de pagamento da fatura
        const { data: transaction, error: transactionError } = await supabase
          .from('transactions')
          .insert({
            user_id: user.id,
            amount: paymentAmount,
            description: partialAmount ? 
              `Pagamento parcial fatura ${getMonthName(invoiceMonth || 0)}/${invoiceYear}` : 
              `Pagamento fatura ${getMonthName(invoiceMonth || 0)}/${invoiceYear}`,
            type: 'expense',
            transaction_date: new Date().toISOString().split('T')[0],
          })
          .select()
          .single();

        if (transactionError) {
          console.error('Error creating transaction:', transactionError);
          throw transactionError;
        }

        if (partialAmount && partialAmount < totalAmount) {
          // Pagamento parcial: Pagar compras mais antigas até acabar o dinheiro
          const sortedPurchases = purchases.sort((a, b) => 
            new Date(a.purchase_date).getTime() - new Date(b.purchase_date).getTime()
          );
          
          let remainingPayment = partialAmount;
          const purchasesToPay = [];
          const remainingPurchases = [];
          
          for (const purchase of sortedPurchases) {
            if (remainingPayment <= 0) {
              remainingPurchases.push(purchase);
              continue;
            }
            
            if (remainingPayment >= purchase.amount) {
              // Pode pagar essa compra inteira
              purchasesToPay.push(purchase.id);
              remainingPayment -= purchase.amount;
            } else {
              // Dividir esta compra: pagar parte e mover o resto
              const paidAmount = remainingPayment;
              const remainingAmount = purchase.amount - remainingPayment;
              
              // Marcar como paga a parte paga
              purchasesToPay.push(purchase.id);
              
              // Criar nova entrada para o valor restante na próxima fatura
              const nextMonth = (invoiceMonth || 0) === 12 ? 1 : (invoiceMonth || 0) + 1;
              const nextYear = (invoiceMonth || 0) === 12 ? (invoiceYear || 0) + 1 : (invoiceYear || 0);
              
              const { error: remainingError } = await supabase
                .from('card_purchases')
                .insert({
                  card_id: cardId,
                  description: `${purchase.description} (Saldo restante)`,
                  amount: remainingAmount,
                  category_id: purchase.category_id,
                  purchase_date: purchase.purchase_date,
                  purchase_group_id: purchase.purchase_group_id,
                  installment_number: purchase.installment_number,
                  invoice_month: nextMonth,
                  invoice_year: nextYear,
                  is_paid: false
                });

              if (remainingError) {
                throw remainingError;
              }
              
              remainingPayment = 0;
            }
          }
          
          // Marcar compras como pagas
          if (purchasesToPay.length > 0) {
            const { error: updateError } = await supabase
              .from('card_purchases')
              .update({ 
                is_paid: true,
                transaction_id: transaction.id 
              })
              .in('id', purchasesToPay);

            if (updateError) {
              throw updateError;
            }
          }
          
          console.log(`✅ Pagamento parcial de ${formatCurrency(partialAmount)} aplicado`);
        } else {
          // Pagamento total: marcar APENAS as compras dessa fatura como pagas
          let updateQuery = supabase
            .from('card_purchases')
            .update({ 
              is_paid: true,
              transaction_id: transaction.id 
            })
            .eq('card_id', cardId)
            .eq('is_paid', false);

          // Se especificou mês/ano, filtrar apenas essa fatura
          if (invoiceMonth && invoiceYear) {
            updateQuery = updateQuery
              .eq('invoice_month', invoiceMonth)
              .eq('invoice_year', invoiceYear);
          }

          const { error: updateError } = await updateQuery;

          if (updateError) {
            throw updateError;
          }
        }
      }

      // Não precisamos mais resetar o status do cartão aqui
      // O status é calculado dinamicamente pela view baseado nas compras pendentes
    },
    onSuccess: async (_, variables) => {
      const { partialAmount } = variables;
      
      // Invalidar todas as queries relacionadas
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['cards'] }),
        queryClient.invalidateQueries({ queryKey: ['card-purchases'] }),
        queryClient.invalidateQueries({ queryKey: ['transactions'] }),
        queryClient.invalidateQueries({ queryKey: ['total-card-spending'] }),
      ]);
      
      // Forçar refetch das cards para garantir atualização
      await queryClient.refetchQueries({ queryKey: ['cards'] });
      
      const isPartialPayment = partialAmount && partialAmount > 0;
      toast({
        title: isPartialPayment ? 'Pagamento parcial realizado' : 'Fatura paga',
        description: isPartialPayment ? 
          `Pagamento parcial de ${formatCurrency(partialAmount)} realizado com sucesso!` :
          'Fatura marcada como paga e transação criada! Cartão pronto para próxima fatura.',
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