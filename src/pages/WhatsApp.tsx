import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Bot, User, Brain, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAIAgent } from '@/hooks/useAIAgent';
import { useBalance } from '@/hooks/useBalance';
import { useMonthlyReport } from '@/hooks/useMonthlyReport';
import { useChatHistory } from '@/hooks/useChatHistory';

// Removido - usando ChatMessage do useChatHistory

const WhatsApp: React.FC = () => {
  const { messages, addMessages, isLoaded } = useChatHistory();
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { processChatMessage, isProcessing } = useAIAgent();
  const { currentBalance, monthlyIncome, monthlyExpenses, monthlyNet, formatCurrency, refreshBalance } = useBalance();
  const { totalIncome, totalExpenses, netIncome, topCategories, formatCurrency: formatReportCurrency, refreshReport } = useMonthlyReport();

  const scrollToBottom = (force = false) => {
    const container = messagesContainerRef.current;
    if (container) {
      if (force) {
        // Scroll imediato para casos críticos
        container.scrollTop = container.scrollHeight;
      } else {
        // Scroll suave para casos normais
        container.scrollTo({
          top: container.scrollHeight,
          behavior: 'smooth'
        });
      }
      setShowScrollButton(false);
    }
    
    // Fallback com scrollIntoView
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ 
        behavior: force ? 'auto' : 'smooth',
        block: 'end'
      });
    }
  };

  // Detectar se usuário scrollou para cima
  const handleScroll = () => {
    const container = messagesContainerRef.current;
    if (container) {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;
      setShowScrollButton(!isNearBottom);
    }
  };

  // Scroll automático quando mensagens mudam
  useEffect(() => {
    // Pequeno delay para aguardar renderização
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [messages]);

  // Scroll forçado quando está carregando (typing/processing)
  useEffect(() => {
    if (isTyping || isProcessing) {
      scrollToBottom(true);
    }
  }, [isTyping, isProcessing]);

  // Scroll inicial quando o histórico carrega e foco no input
  useEffect(() => {
    if (isLoaded && messages.length > 0) {
      // Aguardar renderização completa
      setTimeout(() => {
        scrollToBottom(true);
      }, 300);
    }
    
    // Focar no input quando a página carrega
    if (isLoaded) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 500);
    }
  }, [isLoaded]);

  const processMessage = async (text: string): Promise<{ response: string; type: string; confidence?: number; actions?: any[] }> => {
    try {
      // Usar o novo agente IA super inteligente
      const result = await processChatMessage(text);
      
      // O useAIAgent agora cuida da sincronização automática
      return {
        response: result.botMessage,
        type: result.success ? 'ai_action' : 'text',
        confidence: result.confidence,
        actions: result.actions
      };
    } catch (error) {
      console.error('Erro no processamento da mensagem:', error);
      
      // Mensagem de erro mais específica baseada no tipo de erro
      let errorMessage = "❌ Erro interno da Grana IA.";
      
      if (error instanceof Error) {
        if (error.message.includes('OpenAI')) {
          errorMessage += "\n\n🔑 Problema com a API da OpenAI. Verifique se a chave da API está configurada corretamente.";
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          errorMessage += "\n\n🌐 Problema de conexão com a internet. Verifique sua conexão.";
        } else if (error.message.includes('401') || error.message.includes('unauthorized')) {
          errorMessage += "\n\n🚫 Problema de autenticação. Faça login novamente.";
        } else if (error.message.includes('429')) {
          errorMessage += "\n\n⏱️ Muitas requisições. Aguarde alguns segundos e tente novamente.";
        } else {
          errorMessage += `\n\n⚠️ Detalhes: ${error.message}`;
        }
      }
      
      errorMessage += "\n\n🔄 Tente:\n• Aguardar alguns segundos\n• Reformular sua pergunta\n• Recarregar a página\n\n🤖 Estou aqui para ajudar quando estiver funcionando!";
      
      return {
        response: errorMessage,
        type: 'text',
        confidence: 0
      };
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return;

    const messageToProcess = inputValue;
    setInputValue('');
    setIsTyping(true);
    
    // Scroll imediato após enviar mensagem do usuário
    setTimeout(() => scrollToBottom(true), 50);
    
    // Manter foco no input após limpar o valor
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 100);

    try {
      // Processar com o agente IA
      const { response, type, confidence, actions } = await processMessage(messageToProcess);
      
      // Adicionar ambas as mensagens ao histórico
      addMessages(messageToProcess, {
        text: response,
        sender: 'bot',
        type: type as any,
        confidence,
        actions
      });
      
      // Scroll final após resposta da IA
      setTimeout(() => scrollToBottom(), 200);
      
      // Focar no input após resposta da IA
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 300);
      
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      
      // Mensagem de erro específica para falha no envio
      let sendErrorMessage = "❌ Não foi possível processar sua mensagem.";
      
      if (error instanceof Error) {
        if (error.message.includes('network')) {
          sendErrorMessage += "\n\n🌐 Problema de rede detectado. Verifique sua conexão com a internet.";
        } else if (error.message.includes('timeout')) {
          sendErrorMessage += "\n\n⏱️ A operação demorou mais que o esperado. Tente novamente.";
        } else {
          sendErrorMessage += `\n\n⚠️ Erro: ${error.message}`;
        }
      } else {
        sendErrorMessage += "\n\n❓ Erro desconhecido no envio.";
      }
      
      sendErrorMessage += "\n\n🔄 Tente reformular sua pergunta ou aguarde um momento.";
      
      addMessages(messageToProcess, {
        text: sendErrorMessage,
        sender: 'bot',
        type: 'text'
      });
      
      // Scroll mesmo em caso de erro
      setTimeout(() => scrollToBottom(), 200);
      
      // Focar no input mesmo em caso de erro
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 300);
      
    } finally {
      setIsTyping(false);
      // Scroll final garantido
      setTimeout(() => scrollToBottom(), 300);
      
      // Garantir foco no input sempre
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 400);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Loading state para histórico
  if (!isLoaded) {
    return (
      <div className="h-[calc(100vh-8rem)] flex flex-col items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-muted-foreground">Carregando histórico da Grana IA...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-primary p-4 rounded-t-xl text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-semibold">Grana IA</h1>
              <p className="text-sm text-white/80">Assistente Financeiro Inteligente</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-1 text-xs text-white/80">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              Online
            </div>
            <p className="text-xs text-white/60">Powered by GPT-4o</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={messagesContainerRef}
        onScroll={handleScroll}
        className="flex-1 bg-accent/20 p-4 overflow-y-auto space-y-4 scroll-smooth relative" 
        style={{ scrollBehavior: 'smooth' }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex",
              message.sender === 'user' ? 'justify-end' : 'justify-start'
            )}
          >
            <div
              className={cn(
                "max-w-[80%] rounded-lg p-3 shadow-sm",
                message.sender === 'user'
                  ? "bg-primary text-primary-foreground ml-12"
                  : "bg-card border mr-12"
              )}
            >
              <div className="flex items-start gap-2">
                {message.sender === 'bot' && (
                  message.type === 'ai_action' ? (
                    <Brain className="w-4 h-4 mt-1 text-primary shrink-0" />
                  ) : (
                    <Bot className="w-4 h-4 mt-1 text-primary shrink-0" />
                  )
                )}
                {message.sender === 'user' && (
                  <User className="w-4 h-4 mt-1 text-primary-foreground shrink-0" />
                )}
                <div className="flex-1">
                  <p className="text-sm whitespace-pre-line">{message.text}</p>
                  
                  {/* Mostrar confiança da IA e ações executadas */}
                  {message.sender === 'bot' && message.confidence !== undefined && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground">
                          Confiança: {Math.round(message.confidence * 100)}%
                        </div>
                        <div className="flex-1 bg-muted h-1 rounded-full">
                          <div 
                            className="h-1 bg-primary rounded-full transition-all"
                            style={{ width: `${message.confidence * 100}%` }}
                          />
                        </div>
                      </div>
                      
                      {message.actions && message.actions.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          ⚡ {message.actions.filter(a => a.executed).length} ação(ões) executada(s)
                        </div>
                      )}
                    </div>
                  )}
                  
                  <p className={cn(
                    "text-xs mt-1 opacity-70",
                    message.sender === 'user' ? 'text-primary-foreground' : 'text-muted-foreground'
                  )}>
                    {formatTime(message.timestamp)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ))}
        
        {(isTyping || isProcessing) && (
          <div className="flex justify-start">
            <div className="bg-card border rounded-lg p-3 mr-12 flex items-center gap-2">
              <Brain className="w-4 h-4 text-primary" />
              <div className="flex flex-col">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span className="text-xs text-muted-foreground mt-1">Grana IA analisando...</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Botão de scroll para baixo */}
        {showScrollButton && (
          <div className="absolute bottom-4 right-4 z-10">
            <Button
              onClick={() => scrollToBottom()}
              size="sm"
              className="rounded-full w-10 h-10 bg-primary hover:bg-primary/90 shadow-lg"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="bg-card border-t p-4">
        <div className="flex items-end gap-2">
          <Button variant="ghost" size="sm" className="p-2">
            <Paperclip className="w-4 h-4" />
          </Button>
          
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isProcessing ? "Grana IA processando..." : "Digite sua mensagem para a Grana IA..."}
              className="pr-12"
              disabled={isTyping || isProcessing}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 p-2"
            >
              <Mic className="w-4 h-4" />
            </Button>
          </div>
          
          <Button 
            onClick={sendMessage}
            disabled={!inputValue.trim() || isTyping || isProcessing}
            className="bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground text-center">
          🧠 <strong>Grana IA</strong> - Tente: "Quero economizar 5000 reais" ou "Crie uma categoria para pets"
        </div>
      </div>
    </div>
  );
};

export default WhatsApp;