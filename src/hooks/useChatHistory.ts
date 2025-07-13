import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'transaction' | 'balance' | 'report' | 'ai_action';
  confidence?: number;
  actions?: any[];
}

export const useChatHistory = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const { user } = useAuth();

  const STORAGE_KEY = user ? `grana_ia_chat_history_${user.id}` : 'grana_ia_chat_history_guest';
  const MAX_MESSAGES = 100; // Limitar histórico

  // Carregar histórico do localStorage (recarrega quando usuário muda)
  useEffect(() => {
    if (!user) {
      setMessages([]);
      setIsLoaded(true);
      return;
    }

    try {
      console.log(`📚 Carregando histórico do chat para usuário: ${user.id}`);
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Converter timestamps de string para Date
        const messagesWithDates = parsed.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(messagesWithDates);
        console.log(`✅ ${messagesWithDates.length} mensagens carregadas do histórico`);
      } else {
        // Mensagens de boas-vindas iniciais para novo usuário
        const welcomeMessages: ChatMessage[] = [
          {
            id: `welcome-1-${user.id}`,
            text: `🤖 Olá${user.full_name ? `, ${user.full_name.split(' ')[0]}` : ''}! Sou a **Grana IA**, seu assistente financeiro super inteligente! Posso:\n\n💰 **Processar transações** em linguagem natural\n🏷️ **Criar categorias** automaticamente\n🎯 **Sugerir metas** personalizadas\n📊 **Analisar gastos** e dar conselhos\n💳 **Gerenciar contas** e investimentos\n\nO que você gostaria de fazer hoje?`,
            sender: 'bot',
            timestamp: new Date(),
            type: 'text'
          },
          {
            id: `welcome-2-${user.id}`,
            text: '💡 **Exemplos do que posso entender:**\n\n• "Gastei 50 reais no Pão de Açúcar comprando comida"\n• "Recebi meu salário de 3000 reais"\n• "Quero economizar 10000 reais em 12 meses"\n• "Crie uma categoria para gastos com pets"\n• "Como estão meus gastos este mês?"\n• "Me dê conselhos financeiros"\n\n🧠 **Powered by Grana-IA**',
            sender: 'bot',
            timestamp: new Date(),
            type: 'text'
          }
        ];
        setMessages(welcomeMessages);
        console.log('✅ Mensagens de boas-vindas inicializadas para novo usuário');
      }
    } catch (error) {
      console.error('Erro ao carregar histórico do chat:', error);
      setMessages([]);
    } finally {
      setIsLoaded(true);
    }
  }, [user?.id, STORAGE_KEY]); // Recarrega quando usuário muda

  // Salvar no localStorage sempre que messages mudar
  useEffect(() => {
    if (isLoaded && messages.length > 0) {
      try {
        // Manter apenas os últimos MAX_MESSAGES
        const messagesToSave = messages.slice(-MAX_MESSAGES);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(messagesToSave));
      } catch (error) {
        console.error('Erro ao salvar histórico do chat:', error);
      }
    }
  }, [messages, isLoaded]);

  // Adicionar nova mensagem
  const addMessage = useCallback((message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newMessage]);
    return newMessage.id;
  }, []);

  // Adicionar múltiplas mensagens (para conversas)
  const addMessages = useCallback((userMessage: string, botResponse: ChatMessage) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      text: userMessage,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    const botMsg: ChatMessage = {
      ...botResponse,
      id: `bot-${Date.now()}`,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg, botMsg]);
    return { userMsgId: userMsg.id, botMsgId: botMsg.id };
  }, []);

  // Limpar histórico
  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  // Buscar mensagens por texto
  const searchMessages = useCallback((query: string) => {
    const lowerQuery = query.toLowerCase();
    return messages.filter(msg => 
      msg.text.toLowerCase().includes(lowerQuery)
    );
  }, [messages]);

  // Exportar histórico
  const exportHistory = useCallback(() => {
    const exportData = {
      exported_at: new Date().toISOString(),
      total_messages: messages.length,
      messages: messages.map(msg => ({
        text: msg.text,
        sender: msg.sender,
        timestamp: msg.timestamp.toISOString(),
        type: msg.type,
        confidence: msg.confidence
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `grana-ia-chat-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages]);

  // Estatísticas do chat
  const getChatStats = useCallback(() => {
    const totalMessages = messages.length;
    const userMessages = messages.filter(m => m.sender === 'user').length;
    const botMessages = messages.filter(m => m.sender === 'bot').length;
    const avgConfidence = messages
      .filter(m => m.confidence !== undefined)
      .reduce((sum, m) => sum + (m.confidence || 0), 0) / 
      messages.filter(m => m.confidence !== undefined).length || 0;

    const messagesByType = messages.reduce((acc, msg) => {
      const type = msg.type || 'text';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const oldestMessage = messages[0]?.timestamp;
    const newestMessage = messages[messages.length - 1]?.timestamp;

    return {
      totalMessages,
      userMessages,
      botMessages,
      avgConfidence: avgConfidence * 100,
      messagesByType,
      oldestMessage,
      newestMessage,
      conversationDays: oldestMessage && newestMessage 
        ? Math.ceil((newestMessage.getTime() - oldestMessage.getTime()) / (1000 * 60 * 60 * 24))
        : 0
    };
  }, [messages]);

  return {
    messages,
    isLoaded,
    addMessage,
    addMessages,
    clearHistory,
    searchMessages,
    exportHistory,
    getChatStats
  };
};