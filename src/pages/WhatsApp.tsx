import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, Paperclip, Bot, User, Brain } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { useAITransactionProcessing } from '@/hooks/useAITransactionProcessing';
import { useBalance } from '@/hooks/useBalance';
import { useMonthlyReport } from '@/hooks/useMonthlyReport';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  type?: 'text' | 'transaction' | 'balance' | 'report';
}

const WhatsApp: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: 'Olá! 👋 Sou seu assistente financeiro Grana Fácil com IA integrada. Como posso ajudar você hoje?',
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    },
    {
      id: '2',
      text: 'Você pode me dizer coisas como:\n• "Gastei R$ 50 no mercado"\n• "Recebi R$ 2000 de salário"\n• "Qual meu saldo atual?"\n• "Quanto gastei esse mês?"\n\n🤖 A IA analisará automaticamente suas transações e escolherá a melhor categoria!',
      sender: 'bot',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { processWhatsAppMessage } = useAITransactionProcessing();
  const { currentBalance, monthlyIncome, monthlyExpenses, monthlyNet, formatCurrency, refreshBalance } = useBalance();
  const { totalIncome, totalExpenses, netIncome, topCategories, formatCurrency: formatReportCurrency, refreshReport } = useMonthlyReport();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const processMessage = async (text: string): Promise<{ response: string; type: string }> => {
    const lowerText = text.toLowerCase();
    
    // Detectar transação (gasto ou receita)
    if (lowerText.includes('gastei') || lowerText.includes('paguei') || lowerText.includes('comprei') ||
        lowerText.includes('recebi') || lowerText.includes('ganhei') || lowerText.includes('salário')) {
      
      const valueMatch = text.match(/r\$\s*(\d+(?:,\d{2})?)/i);
      if (valueMatch) {
        const value = valueMatch[1].replace(',', '.');
        const isExpense = lowerText.includes('gastei') || lowerText.includes('paguei') || lowerText.includes('comprei');
        
        try {
          // Processar com IA real
          const result = await processWhatsAppMessage(text);
          
          if (result.success && result.categoryInfo) {
            // Atualizar saldo após transação
            await refreshBalance();
            await refreshReport();
            
            return {
              response: `${isExpense ? '💸' : '💰'} Transação de R$ ${value} processada com sucesso!\n\n🤖 IA GPT-4o analisou e categorizou:\n• Categoria: ${result.categoryInfo.categoryName}\n• Confiança: ${Math.round(result.categoryInfo.confidence * 100)}%\n• Motivo: ${result.categoryInfo.reasoning}\n• Status: Processado\n• Data: Hoje\n\nDigite "saldo" para ver seu saldo atual.`,
              type: 'transaction'
            };
          } else {
            return {
              response: `❌ Erro ao processar transação de R$ ${value}.\n\nMotivo: ${result.error}\n\nTente novamente em alguns instantes.`,
              type: 'text'
            };
          }
        } catch (error) {
          return {
            response: `❌ Erro interno ao processar transação.\n\nVerifique sua conexão e tente novamente.`,
            type: 'text'
          };
        }
      }
    }
    
    // Consultar saldo
    if (lowerText.includes('saldo')) {
      // Atualizar saldo antes de mostrar
      await refreshBalance();
      
      return {
        response: `💳 Seu saldo atual:\n\n💰 ${formatCurrency(currentBalance)}\n\n📈 Este mês:\n• Receitas: ${formatCurrency(monthlyIncome)}\n• Despesas: ${formatCurrency(monthlyExpenses)}\n• Saldo mensal: ${formatCurrency(monthlyNet)}\n\n${monthlyNet > 0 ? '🎯 Você está economizando este mês!' : '⚠️ Cuidado com os gastos este mês!'}`,
        type: 'balance'
      };
    }
    
    // Relatório mensal
    if (lowerText.includes('relatório') || lowerText.includes('resumo') || lowerText.includes('quanto gastei')) {
      // Atualizar relatório antes de mostrar
      await refreshReport();
      
      const categoriesText = topCategories.length > 0 
        ? topCategories.map(cat => `• ${cat.category_name}: ${formatReportCurrency(cat.total_spent)}`).join('\n')
        : '• Nenhuma categoria encontrada';
      
      return {
        response: `📊 Relatório do mês atual:\n\n💰 Receitas: ${formatReportCurrency(totalIncome)}\n💸 Despesas: ${formatReportCurrency(totalExpenses)}\n💵 Saldo: ${formatReportCurrency(netIncome)}\n\n🏷️ Principais categorias (IA):\n${categoriesText}\n\n${netIncome > 0 ? '📈 Você está economizando este mês!' : '⚠️ Revise seus gastos este mês!'}`,
        type: 'report'
      };
    }
    
    // Resposta padrão
    return {
      response: `Desculpe, não entendi completamente. 🤔\n\nTente comandos como:\n• "Gastei R$ 50 no mercado"\n• "Recebi R$ 1500 de freelance"\n• "Qual meu saldo?"\n• "Quanto gastei esse mês?"\n\nA IA irá categorizar automaticamente suas transações! 🤖💪`,
      type: 'text'
    };
  };

  const sendMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputValue,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simular delay de processamento
    setTimeout(async () => {
      const { response, type } = await processMessage(inputValue);
      
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        sender: 'bot',
        timestamp: new Date(),
        type: type as any
      };

      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1500);
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

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-primary p-4 rounded-t-xl text-white">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="font-semibold">Grana Fácil Assistant</h1>
            <p className="text-sm text-white/80">Assistente Financeiro</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-accent/20 p-4 overflow-y-auto space-y-4">
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
                  message.type === 'transaction' ? (
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
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-card border rounded-lg p-3 mr-12 flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              <div className="flex space-x-1">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
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
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Digite sua mensagem..."
              className="pr-12"
              disabled={isTyping}
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
            disabled={!inputValue.trim() || isTyping}
            className="bg-gradient-primary hover:opacity-90 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        
        <div className="mt-2 text-xs text-muted-foreground text-center">
          🤖 Dica: Tente "Gastei R$ 50 no Pão de Açúcar" - A IA categorizará automaticamente!
        </div>
      </div>
    </div>
  );
};

export default WhatsApp;