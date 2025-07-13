import { useState, useCallback } from 'react';
import { aiAgent, AIAgentResponse } from '@/lib/ai-agent';
// useToast removido - usando apenas chat
import { useDataSync } from '@/hooks/useDataSync';

export interface AIConversation {
  id: string;
  userMessage: string;
  aiResponse: AIAgentResponse;
  timestamp: Date;
}

export const useAIAgent = () => {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResponse, setLastResponse] = useState<AIAgentResponse | null>(null);
  // toast removido
  const { syncAllData, syncFinancialData } = useDataSync();

  /**
   * 🤖 Processar comando com o agente IA
   */
  const processCommand = useCallback(async (message: string): Promise<AIAgentResponse> => {
    setIsProcessing(true);
    
    try {
      // Processar com o agente IA
      const response = await aiAgent.processCommand(message);
      
      // Salvar conversa
      const conversation: AIConversation = {
        id: Date.now().toString(),
        userMessage: message,
        aiResponse: response,
        timestamp: new Date()
      };
      
      setConversations(prev => [conversation, ...prev.slice(0, 49)]); // Manter apenas 50 conversas
      setLastResponse(response);

      // Sincronizar dados se ações foram executadas
      if (response.success && response.actions && response.actions.length > 0) {
        console.log('🔄 Iniciando sincronização após ações da IA...');
        
        // Sincronizar dados baseado nos tipos de ações executadas
        const actionTypes = response.actions.map(a => a.type);
        
        if (actionTypes.includes('create_transaction') || actionTypes.includes('pay_bill')) {
          console.log('💰 Sincronizando por transação/pagamento...');
          await syncAllData(); // pay_bill agora cria transação, precisa sync completo
        } else if (actionTypes.includes('create_category') || actionTypes.includes('create_goal')) {
          console.log('🏷️ Sincronizando por criação de categoria/meta...');
          await syncAllData();
        } else if (actionTypes.includes('create_bill') || actionTypes.includes('update_bill') || actionTypes.includes('delete_bill')) {
          console.log('📄 Sincronizando por ação em contas...');
          await syncAllData();
        } else {
          console.log('🔄 Sincronização padrão...');
          await syncFinancialData();
        }
        
        console.log('✅ Sincronização concluída após ações da IA');
      }

      // Toasts removidos - tudo vai para o chat

      return response;
    } catch (error) {
      console.error('Erro no processamento IA:', error);
      
      const errorResponse: AIAgentResponse = {
        success: false,
        message: "❌ Erro interno do agente IA. Verifique sua conexão e tente novamente.",
        actions: [],
        confidence: 0,
        reasoning: "Erro de processamento"
      };

      // Toast removido - erro vai para o chat

      return errorResponse;
    } finally {
      setIsProcessing(false);
    }
  }, []);

  /**
   * 💬 Processar mensagem para chat WhatsApp
   */
  const processChatMessage = useCallback(async (message: string) => {
    const response = await processCommand(message);
    
    return {
      success: response.success,
      botMessage: response.message,
      actions: response.actions,
      confidence: response.confidence,
      reasoning: response.reasoning
    };
  }, [processCommand]);

  /**
   * 📊 Analisar padrões financeiros
   */
  const analyzeFinancialPatterns = useCallback(async () => {
    const analysisMessage = "Analise meus padrões de gastos e me dê conselhos financeiros personalizados";
    return await processCommand(analysisMessage);
  }, [processCommand]);

  /**
   * 🎯 Sugerir metas inteligentes
   */
  const suggestSmartGoals = useCallback(async () => {
    const goalMessage = "Com base no meu perfil financeiro, sugira metas realistas para os próximos meses";
    return await processCommand(goalMessage);
  }, [processCommand]);

  /**
   * 🏷️ Organizar categorias automaticamente
   */
  const organizeCategories = useCallback(async () => {
    const organizeMessage = "Analise minhas transações e sugira melhorias na organização das categorias";
    return await processCommand(organizeMessage);
  }, [processCommand]);

  /**
   * 💡 Obter insights financeiros
   */
  const getFinancialInsights = useCallback(async () => {
    const insightMessage = "Me dê insights sobre minha situação financeira e oportunidades de melhoria";
    return await processCommand(insightMessage);
  }, [processCommand]);

  /**
   * 🔄 Limpar histórico de conversas
   */
  const clearConversations = useCallback(() => {
    setConversations([]);
    setLastResponse(null);
  }, []);

  /**
   * 📈 Estatísticas de uso da IA
   */
  const getUsageStats = useCallback(() => {
    const totalConversations = conversations.length;
    const successfulConversations = conversations.filter(c => c.aiResponse.success).length;
    const averageConfidence = conversations.reduce((sum, c) => sum + c.aiResponse.confidence, 0) / totalConversations || 0;
    
    const actionTypes = conversations.flatMap(c => c.aiResponse.actions.map(a => a.type));
    const mostUsedAction = actionTypes.reduce((a, b, i, arr) => 
      arr.filter(v => v === a).length >= arr.filter(v => v === b).length ? a : b, actionTypes[0]
    );

    return {
      totalConversations,
      successfulConversations,
      successRate: totalConversations > 0 ? (successfulConversations / totalConversations) * 100 : 0,
      averageConfidence: averageConfidence * 100,
      mostUsedAction: mostUsedAction || 'Nenhuma',
      lastActivity: conversations[0]?.timestamp || null
    };
  }, [conversations]);

  /**
   * 🔍 Buscar conversas por palavra-chave
   */
  const searchConversations = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    return conversations.filter(c => 
      c.userMessage.toLowerCase().includes(lowerQuery) ||
      c.aiResponse.message.toLowerCase().includes(lowerQuery) ||
      c.aiResponse.reasoning.toLowerCase().includes(lowerQuery)
    );
  }, [conversations]);

  return {
    // Estado
    conversations,
    isProcessing,
    lastResponse,
    
    // Funções principais
    processCommand,
    processChatMessage,
    
    // Funções especializadas
    analyzeFinancialPatterns,
    suggestSmartGoals,
    organizeCategories,
    getFinancialInsights,
    
    // Utilitários
    clearConversations,
    getUsageStats,
    searchConversations
  };
};