import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { categorizeTransactionWithAI, TransactionContext } from '@/lib/ai-categorization';
import { useToast } from '@/components/ui/use-toast';
import { getCurrentUser } from '@/lib/auth';

export const useAITransactionProcessing = () => {
  const { toast } = useToast();

  const processWhatsAppMessage = useCallback(async (
    messageText: string
  ): Promise<{ success: boolean; transactionId?: string; error?: string; categoryInfo?: any }> => {
    try {
      // 1. Verificar usuário autenticado
      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // 2. Extrair transação básica via SQL function
      const { data: transactionId, error: extractError } = await supabase
        .rpc('process_whatsapp_transaction', {
          user_id: user.id,
          message_text: messageText
        });

      if (extractError || !transactionId) {
        return { 
          success: false, 
          error: 'Não foi possível extrair a transação da mensagem' 
        };
      }

      // 3. Buscar transação criada para categorização
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .single();

      if (fetchError || !transaction) {
        return { 
          success: false, 
          error: 'Erro ao buscar transação criada' 
        };
      }

      // 4. Buscar categorias do usuário
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, type, icon')
        .eq('user_id', user.id);

      if (categoriesError || !categories || categories.length === 0) {
        return { 
          success: false, 
          error: 'Nenhuma categoria encontrada para o usuário' 
        };
      }

      // 5. Usar IA para categorizar
      const context: TransactionContext = {
        description: transaction.description,
        amount: Math.abs(transaction.amount),
        availableCategories: categories,
        userId: user.id
      };

      const aiResult = await categorizeTransactionWithAI(context);

      // 6. Atualizar transação com categoria sugerida pela IA
      const { error: updateError } = await supabase
        .from('transactions')
        .update({
          category_id: aiResult.categoryId,
          status: 'completed'
        })
        .eq('id', transactionId);

      if (updateError) {
        return { 
          success: false, 
          error: 'Erro ao atualizar categoria da transação' 
        };
      }

      // 7. Salvar feedback da IA para melhorias futuras
      await supabase
        .from('whatsapp_messages')
        .insert({
          user_id: user.id,
          message_text: messageText,
          sender: 'user',
          message_type: 'transaction',
          processed: true,
          transaction_id: transactionId
        });

      // 8. Mostrar resultado para o usuário
      toast({
        title: "Transação processada! 🎉",
        description: `Categorizada automaticamente como "${aiResult.categoryName}" (${Math.round(aiResult.confidence * 100)}% de confiança)`,
        duration: 5000,
      });

      return { 
        success: true, 
        transactionId: transactionId,
        categoryInfo: {
          categoryName: aiResult.categoryName,
          confidence: aiResult.confidence,
          reasoning: aiResult.reasoning
        }
      };

    } catch (error) {
      console.error('Erro no processamento da transação:', error);
      
      toast({
        title: "Erro no processamento",
        description: "Não foi possível processar a transação. Tente novamente.",
        variant: "destructive"
      });

      return { 
        success: false, 
        error: 'Erro interno no processamento' 
      };
    }
  }, [toast]);

  const categorizeExistingTransaction = useCallback(async (
    transactionId: string
  ): Promise<{ success: boolean; categoryName?: string; error?: string }> => {
    try {
      // Verificar usuário autenticado
      const user = await getCurrentUser();
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Buscar transação
      const { data: transaction, error: fetchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('id', transactionId)
        .eq('user_id', user.id)
        .single();

      if (fetchError || !transaction) {
        return { success: false, error: 'Transação não encontrada' };
      }

      // Buscar categorias
      const { data: categories, error: categoriesError } = await supabase
        .from('categories')
        .select('id, name, type, icon')
        .eq('user_id', user.id);

      if (categoriesError || !categories) {
        return { success: false, error: 'Erro ao buscar categorias' };
      }

      // Categorizar com IA
      const context: TransactionContext = {
        description: transaction.description,
        amount: Math.abs(transaction.amount),
        availableCategories: categories,
        userId: user.id
      };

      const aiResult = await categorizeTransactionWithAI(context);

      // Atualizar transação
      const { error: updateError } = await supabase
        .from('transactions')
        .update({ category_id: aiResult.categoryId })
        .eq('id', transactionId);

      if (updateError) {
        return { success: false, error: 'Erro ao atualizar categoria' };
      }

      return { 
        success: true, 
        categoryName: aiResult.categoryName
      };

    } catch (error) {
      console.error('Erro na categorização:', error);
      return { success: false, error: 'Erro interno' };
    }
  }, []);

  return {
    processWhatsAppMessage,
    categorizeExistingTransaction
  };
};