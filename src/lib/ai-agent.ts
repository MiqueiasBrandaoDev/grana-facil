import OpenAI from 'openai';
import { supabase } from '@/integrations/supabase/client';
import { getCurrentUser } from '@/lib/auth';

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export interface AIAgentResponse {
  success: boolean;
  message: string;
  actions: AIAction[];
  data?: any;
  confidence: number;
  reasoning: string;
  needsClarification?: boolean;
  clarificationQuestion?: string;
}

export interface AIAction {
  type: 'create_transaction' | 'create_category' | 'create_goal' | 'update_goal' | 'create_bill' | 'update_bill' | 'delete_bill' | 'update_budget' | 'pay_bill' | 'list_bills' | 'investment_suggestion' | 'financial_advice' | 'create_card' | 'create_card_purchase' | 'pay_card_invoice' | 'list_cards' | 'view_card_history';
  data: any;
  priority: 'high' | 'medium' | 'low';
  executed: boolean;
}

export interface UserContext {
  userId: string;
  currentBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  categories: any[];
  recentTransactions: any[];
  goals: any[];
  bills: any[];
  cards: any[];
}

/**
 * 🤖 AGENTE IA FINANCEIRO INTELIGENTE
 * Processa linguagem natural e executa ações financeiras complexas
 */
export class AIFinancialAgent {
  private openai: OpenAI;
  private userContext: UserContext | null = null;
  private conversationHistory: Array<{message: string, timestamp: Date}> = [];

  constructor() {
    this.openai = openai;
  }

  /**
   * 🧠 Adicionar mensagem ao histórico de conversa
   */
  private addToHistory(message: string, isUser: boolean = true) {
    this.conversationHistory.push({
      message: `${isUser ? 'USUÁRIO' : 'IA'}: ${message}`,
      timestamp: new Date()
    });
    
    // Manter apenas as últimas 10 mensagens para melhor contexto
    if (this.conversationHistory.length > 10) {
      this.conversationHistory = this.conversationHistory.slice(-10);
    }
  }

  /**
   * 🧠 Processar comando em linguagem natural
   */
  async processCommand(message: string): Promise<AIAgentResponse> {
    try {
      console.log('🤖 Processando comando:', message);
      
      // 1. Adicionar mensagem do usuário ao histórico
      this.addToHistory(message, true);

      // 2. Carregar contexto do usuário
      await this.loadUserContext();
      
      if (!this.userContext) {
        console.log('❌ Usuário não autenticado');
        return {
          success: false,
          message: "❌ Erro: Usuário não autenticado",
          actions: [],
          confidence: 0,
          reasoning: "Contexto do usuário não disponível"
        };
      }

      console.log('👤 Contexto do usuário carregado:', {
        userId: this.userContext.userId,
        categoriesCount: this.userContext.categories.length
      });

      // 3. Analisar intenção com GPT-4o (incluindo histórico)
      console.log('🧠 Analisando intenção com GPT-4o...');
      const analysis = await this.analyzeIntent(message);
      console.log('📋 Análise completa:', analysis);
      
      // 3.0. VERIFICAR FALLBACKS PRIMEIRO (antes de verificar esclarecimento)
      const messageNormalized = message.toLowerCase().trim();
      
      // 3.1. FORÇAR list_bills para consultas de contas
      const isContasQuery = 
        messageNormalized.includes('quais contas') ||
        messageNormalized.includes('que contas') ||
        messageNormalized.includes('minhas contas') ||
        messageNormalized.includes('contas pendentes') ||
        messageNormalized.includes('contas que tenho') ||
        messageNormalized.includes('contas não pagas') ||
        messageNormalized.includes('contas em aberto');
        
      if (isContasQuery && (!analysis.actions || analysis.actions.length === 0)) {
        console.log('🔧 FORÇANDO list_bills para consulta de contas');
        analysis.actions = [{
          type: 'list_bills',
          data: {},
          priority: 'high'
        }];
        analysis.intent = 'bill';
      }
      
      // 3.2. FORÇAR list_cards para consultas de cartões
      const hasCartao = messageNormalized.includes('cartão') || messageNormalized.includes('cartoes') || messageNormalized.includes('cartões');
      const hasQueryWord = messageNormalized.includes('quais') || messageNormalized.includes('que') || messageNormalized.includes('meus') || messageNormalized.includes('tenho') || messageNormalized.includes('lista');
      
      const isCartoesQuery = hasCartao && hasQueryWord;
        
      if (isCartoesQuery && (!analysis.actions || analysis.actions.length === 0)) {
        console.log('🔧 FORÇANDO list_cards para consulta de cartões');
        console.log('🔧 Mensagem detectada como consulta de cartões:', messageNormalized);
        analysis.actions = [{
          type: 'list_cards',
          data: {},
          priority: 'high'
        }];
        analysis.intent = 'card';
        analysis.response_message = "Listando seus cartões de crédito...";
      }
      
      // 3.3. FORÇAR create_card para criação de cartões
      const hasCreateCartao = (messageNormalized.includes('criar') || messageNormalized.includes('novo') || messageNormalized.includes('cadastrar')) && hasCartao;
      
      if (hasCreateCartao && (!analysis.actions || analysis.actions.length === 0)) {
        console.log('🔧 FORÇANDO create_card para criação de cartão');
        console.log('🔧 Mensagem detectada como criação de cartão:', messageNormalized);
        
        // Extrair informações básicas de forma mais inteligente
        // 1. Buscar nickname (palavra próxima a "cartão" que não seja comando)
        let nickname = 'Cartão';
        const cartaoWords = messageNormalized.split(/\s+/);
        const cartaoIndex = cartaoWords.findIndex(word => word.includes('cartão') || word.includes('cartao'));
        
        if (cartaoIndex !== -1) {
          // Procurar uma palavra antes ou depois de "cartão"
          for (let i = cartaoIndex - 1; i <= cartaoIndex + 1; i++) {
            if (i >= 0 && i < cartaoWords.length && i !== cartaoIndex) {
              const word = cartaoWords[i].replace(/[,\.;]/g, ''); // Remove pontuação
              if (word && !['criar', 'novo', 'cartão', 'cartao', 'limite', 'dia', 'de', 'com', 'vence'].includes(word) && !/\d/.test(word)) {
                nickname = word;
                break;
              }
            }
          }
        }
        
        // 2. Buscar limite (número seguido de "mil", "k" ou no contexto de "limite")
        let limitAmount = null;
        const limitMatch = messageNormalized.match(/(\d+)\s*(?:mil|k)/i) || messageNormalized.match(/limite\s+(?:de\s+)?(\d+(?:\.\d+)?)/i);
        if (limitMatch) {
          let limitValue = parseFloat(limitMatch[1]);
          if (messageNormalized.includes('mil') || messageNormalized.includes('k')) {
            limitAmount = limitValue * 1000;
          } else {
            limitAmount = limitValue;
          }
        }
        
        // 3. Buscar dia de vencimento (número isolado que não seja do limite)
        let dueDay = null;
        const dayMatch = messageNormalized.match(/(?:dia\s+|vence\s+(?:dia\s+)?)(\d{1,2})(?!\s*mil)/i);
        if (dayMatch) {
          const day = parseInt(dayMatch[1]);
          // Só aceitar se for um dia válido e não parte do limite
          if (day >= 1 && day <= 31 && !limitMatch?.[0]?.includes(dayMatch[1])) {
            dueDay = day;
          }
        }
        
        console.log('🔧 Dados extraídos:', { nickname, limitAmount, dueDay, limitMatch, dayMatch });
        
        // Se tem todas as informações, criar diretamente
        if (nickname && dueDay && dueDay >= 1 && dueDay <= 31) {
          analysis.actions = [{
            type: 'create_card',
            data: {},
            priority: 'high'
          }];
          analysis.extracted_data = {
            ...analysis.extracted_data,
            nickname: nickname,
            due_day: dueDay,
            limit_amount: limitAmount
          };
          analysis.intent = 'card';
          analysis.needsClarification = false;
        } else {
          // Precisa de mais informações - só perguntar o que realmente falta
          if (!dueDay) {
            analysis.needsClarification = true;
            analysis.clarificationQuestion = `💳 Para criar o cartão ${nickname}, qual o dia de vencimento? (1-31)${limitAmount ? `\n💰 Limite será: R$ ${limitAmount.toFixed(2)}` : ''}`;
          } else {
            // Se tem nickname e dia, pode criar mesmo sem limite
            analysis.actions = [{
              type: 'create_card',
              data: {},
              priority: 'high'
            }];
            analysis.extracted_data = {
              ...analysis.extracted_data,
              nickname: nickname,
              due_day: dueDay,
              limit_amount: limitAmount
            };
            analysis.intent = 'card';
            analysis.needsClarification = false;
          }
        }
      }
      
      // Debug: Log final das ações
      console.log('🔍 Ações finais após fallbacks:', analysis.actions);
      
      // 3.4. Detectar comandos de cartão sem especificação e forçar fallbacks
      const isCardPurchaseQuery = 
        (messageNormalized.includes('comprei') || messageNormalized.includes('compra') || messageNormalized.includes('gasto') || messageNormalized.includes('usei') || messageNormalized.includes('paguei')) &&
        (messageNormalized.includes('cartão') || messageNormalized.includes('cartao') || messageNormalized.includes('credito'));
        
      const isCardPaymentQuery = 
        (messageNormalized.includes('pagar') || messageNormalized.includes('quitar')) &&
        (messageNormalized.includes('fatura') || messageNormalized.includes('cartão') || messageNormalized.includes('cartao'));
        
      // 3.5. Detectar comandos específicos de compra no cartão com nome
      const specificCardPurchaseQuery = messageNormalized.match(/(?:comprei|compra|gasto|usei|paguei).*?(?:no\s+cartão|cartão|credito)/i);
      
      if (specificCardPurchaseQuery && (!analysis.actions || analysis.actions.length === 0)) {
        console.log('🔧 Detectado compra específica no cartão:', specificCardPurchaseQuery[0]);
        
        // Extrair valor
        const numberMatch = messageNormalized.match(/(\d+(?:,\d+)?(?:\.\d+)?)/);
        const amount = numberMatch ? parseFloat(numberMatch[1].replace(',', '.')) : null;
        
        // Extrair nome do cartão se especificado
        const cardNameMatch = messageNormalized.match(/(?:cartão|credito)\s+(\w+)/i) || messageNormalized.match(/(\w+)\s+cartão/i);
        let cardName = null;
        
        if (cardNameMatch && cardNameMatch[1]) {
          cardName = cardNameMatch[1];
        } else if (this.userContext?.cards && this.userContext.cards.length > 0) {
          cardName = this.userContext.cards[0].nickname;
        }
        
        if (amount && amount > 0 && cardName) {
          // Extrair descrição
          let description = 'Compra no cartão';
          const descMatch = messageNormalized.match(/(?:comprei|compra|gasto)\s+(?:\d+\s*)?(?:reais?\s+)?(?:de\s+|no\s+|para\s+)?(\w+(?:\s+\w+)*?)(?:\s+(?:no|com|cartão))/i);
          if (descMatch && descMatch[1]) {
            description = descMatch[1].trim();
          }
          
          analysis.actions = [{
            type: 'create_card_purchase',
            data: {},
            priority: 'high'
          }];
          analysis.extracted_data = {
            ...analysis.extracted_data,
            card_name: cardName,
            amount: amount,
            description: description
          };
          analysis.intent = 'card';
          analysis.needsClarification = false;
          
          console.log('🔧 Dados específicos para criar compra:', analysis.extracted_data);
        }
      }
        
      // Detectar se é comando de cartão mas sem especificações suficientes
      if ((isCardPurchaseQuery || isCardPaymentQuery) && (!analysis.actions || analysis.actions.length === 0)) {
        console.log('🔧 Detectado comando de cartão genérico, aplicando fallback');
        
        if (isCardPurchaseQuery) {
          console.log('🔧 Detectado compra no cartão');
          console.log('🔧 UserContext cards:', this.userContext?.cards?.length || 0);
          
          // Extrair valor e descrição se possível
          const numberMatch = messageNormalized.match(/(\d+(?:,\d+)?(?:\.\d+)?)/);
          const amount = numberMatch ? parseFloat(numberMatch[1].replace(',', '.')) : null;
          
          console.log('🔧 Valor extraído:', amount);
          
          // Se há contexto de cartões, tentar usar o primeiro
          if (this.userContext?.cards && this.userContext.cards.length > 0) {
            if (amount && amount > 0) {
              const cardName = this.userContext.cards[0].nickname;
              console.log(`🔧 FALLBACK: Usando cartão "${cardName}" para compra de R$ ${amount}`);
              
              // Extrair descrição mais inteligente
              let description = 'Compra no cartão';
              if (messageNormalized.includes('combustivel') || messageNormalized.includes('gasolina') || messageNormalized.includes('etanol')) {
                description = 'Combustível';
              } else if (messageNormalized.includes('mercado') || messageNormalized.includes('supermercado')) {
                description = 'Compras no mercado';
              } else if (messageNormalized.includes('roupa') || messageNormalized.includes('vestuario')) {
                description = 'Roupas';
              } else if (messageNormalized.includes('comida') || messageNormalized.includes('alimentação') || messageNormalized.includes('alimento')) {
                description = 'Alimentação';
              } else if (messageNormalized.includes('farmacia') || messageNormalized.includes('remedio')) {
                description = 'Farmácia';
              } else {
                // Tentar extrair descrição da mensagem
                const descMatch = messageNormalized.match(/(?:comprei|compra|gasto)(?:\s+(?:r\$|\d+))?\s*(?:reais?)?\s*(?:de|no|para|com)?\s*(\w+(?:\s+\w+)*)/i);
                if (descMatch && descMatch[1]) {
                  description = descMatch[1].trim();
                }
              }
              
              analysis.actions = [{
                type: 'create_card_purchase',
                data: {},
                priority: 'high'
              }];
              analysis.extracted_data = {
                ...analysis.extracted_data,
                card_name: cardName,
                amount: amount,
                description: description
              };
              analysis.intent = 'card';
              analysis.needsClarification = false;
              
              console.log('🔧 Dados finais para criar compra:', analysis.extracted_data);
            } else {
              // Se não tem valor, pedir esclarecimento
              analysis.needsClarification = true;
              analysis.clarificationQuestion = "🛍️ Para registrar a compra no cartão, preciso saber:\n💰 Qual foi o valor?\n📝 O que você comprou?\n\nExemplo: 'comprei 50 reais de combustível no cartão'";
            }
          } else {
            // Se não tem cartões, sugerir criar um primeiro
            analysis.needsClarification = true;
            analysis.clarificationQuestion = "💳 Você ainda não possui cartões cadastrados. Quer criar um cartão primeiro?\n\nExemplo: 'criar cartão Nubank dia 10'";
          }
        } else if (isCardPaymentQuery) {
          // Para pagamento, sempre pode usar o primeiro cartão se houver
          if (this.userContext?.cards && this.userContext.cards.length > 0) {
            const cardName = this.userContext.cards[0].nickname;
            console.log(`🔧 FALLBACK: Pagando fatura do cartão "${cardName}"`);
            
            analysis.actions = [{
              type: 'pay_card_invoice',
              data: {},
              priority: 'high'
            }];
            analysis.extracted_data = {
              ...analysis.extracted_data,
              card_name: cardName
            };
            analysis.intent = 'card';
          }
        }
      }
      
      // 4. Verificar se precisa de esclarecimento (MAS APÓS FALLBACKS!)
      if (analysis.needsClarification && (!analysis.actions || analysis.actions.length === 0)) {
        return {
          success: false,
          message: analysis.clarificationQuestion || "🤔 Preciso de mais informações para te ajudar melhor.",
          actions: [],
          confidence: analysis.confidence || 0.3,
          reasoning: analysis.reasoning || "Comando ambíguo",
          needsClarification: true,
          clarificationQuestion: analysis.clarificationQuestion
        };
      }
      
      // 5. Executar ações baseadas na análise
      const result = await this.executeActions(analysis);
      
      // 6. Adicionar resposta da IA ao histórico
      this.addToHistory(result.message, false);
      
      return result;

    } catch (error) {
      console.error('Erro no agente IA:', error);
      return {
        success: false,
        message: `❌ Erro interno da Grana IA.\n\n🔧 Detalhes técnicos: ${error instanceof Error ? error.message : 'Erro desconhecido'}\n\n💡 Tente reformular sua pergunta ou contate o suporte.`,
        actions: [],
        confidence: 0,
        reasoning: "Erro de processamento interno"
      };
    }
  }

  /**
   * 📊 Carregar contexto completo do usuário
   */
  private async loadUserContext(): Promise<void> {
    const user = await getCurrentUser();
    if (!user) return;

    // Buscar dados paralelos para otimizar performance
    const [
      balanceResult,
      categoriesResult,
      transactionsResult,
      goalsResult,
      billsResult,
      cardsResult
    ] = await Promise.all([
      supabase.rpc('get_user_balance', { input_user_id: user.id }),
      supabase.from('categories').select('*').eq('user_id', user.id),
      supabase.from('transactions_with_category').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('goal_progress').select('*').eq('user_id', user.id),
      supabase.from('bills').select('*').eq('user_id', user.id).order('due_date', { ascending: true }),
      supabase.from('card_spending_summary').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    ]);

    // Calcular receitas e despesas do mês
    const currentMonth = new Date().toISOString().slice(0, 7);
    const monthlyTransactions = transactionsResult.data?.filter(t => 
      t.transaction_date.startsWith(currentMonth)
    ) || [];

    const monthlyIncome = monthlyTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);

    const monthlyExpenses = monthlyTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    this.userContext = {
      userId: user.id,
      currentBalance: balanceResult.data || 0,
      monthlyIncome,
      monthlyExpenses,
      categories: categoriesResult.data || [],
      recentTransactions: transactionsResult.data || [],
      goals: goalsResult.data || [],
      bills: billsResult.data || [],
      cards: cardsResult.data || []
    };
  }

  /**
   * 🔍 Analisar intenção do usuário com GPT-4o
   */
  private async analyzeIntent(message: string): Promise<any> {
    const prompt = this.buildAnalysisPrompt(message);

    const completion = await this.openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Você é o assistente financeiro IA mais avançado do Brasil. Seu nome é "Grana IA". 

CAPACIDADES:
- Processar transações em linguagem natural
- Criar categorias inteligentemente
- Sugerir e criar metas financeiras
- Analisar padrões de gastos
- Dar conselhos financeiros personalizados
- Gerenciar contas a pagar/receber
- Gerenciar cartões de crédito e compras
- Sugerir investimentos

SEMPRE retorne um JSON válido com a estrutura exata especificada.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) throw new Error('Resposta vazia do GPT-4o');

    return JSON.parse(response);
  }

  /**
   * 📝 Construir prompt de análise contextual
   */
  private buildAnalysisPrompt(message: string): string {
    const context = this.userContext!;
    
    // Histórico das últimas mensagens para contexto
    const historyText = this.conversationHistory.length > 0 
      ? this.conversationHistory.map((h, i) => `${i + 1}. ${h.message}`).join('\n')
      : 'Nenhuma conversa anterior';
    
    return `
CONTEXTO FINANCEIRO DO USUÁRIO:
- Saldo atual: R$ ${context.currentBalance.toFixed(2)}
- Receitas mês: R$ ${context.monthlyIncome.toFixed(2)}
- Despesas mês: R$ ${context.monthlyExpenses.toFixed(2)}
- Categorias disponíveis: ${context.categories.map(c => `${c.name} (${c.type})`).join(', ')}
- Últimas transações: ${context.recentTransactions.slice(0, 5).map(t => `${t.description} - R$ ${Math.abs(t.amount)}`).join(', ')}
- Metas ativas: ${context.goals.map(g => `${g.title} (${g.progress_percentage}%)`).join(', ')}
- Contas pendentes: ${context.bills.map(b => `${b.title} - R$ ${b.amount}`).join(', ')}
- Cartões de crédito: ${context.cards.map(c => `${c.nickname} (Pendente: R$ ${c.pending_amount || 0})`).join(', ')}

HISTÓRICO DA CONVERSA (últimas 10 mensagens):
${historyText}

MENSAGEM ATUAL: "${message}"

ANÁLISE REQUERIDA:
Analise a mensagem considerando OBRIGATORIAMENTE:
1. O contexto financeiro do usuário
2. **O HISTÓRICO COMPLETO DA CONVERSA** - Se o usuário já forneceu informações antes, USE ELAS!
3. Se a mensagem é específica o suficiente para ação
4. Contexto brasileiro (estabelecimentos, formas de pagamento, gírias)

**IMPORTANTE: MANTENHA CONTEXTO DA CONVERSA**
- Se o usuário já disse um valor antes (ex: "1000", "5000"), associe ao que está sendo discutido
- Se ele confirma algo ("Sim, pode cadastrar"), execute a ação pendente
- NÃO faça perguntas repetitivas sobre informações já fornecidas

EXEMPLOS DE USO DO CONTEXTO:
Histórico: "IA: Qual valor de Freelancer de fotógrafo? USUÁRIO: 5000 IA: Confirma R$ 5000? USUÁRIO: Sim, pode cadastrar"
→ Executar create_bill com title: "Freelancer de fotógrafo", amount: 5000, due_day: 10, type: receivable

Histórico: "USUÁRIO: Crie conta de luz USUÁRIO: 250"  
→ Executar create_bill com title: "Conta de luz", amount: 250

USUÁRIO: "Quais contas eu tenho?"
→ OBRIGATORIAMENTE executar list_bills (NUNCA responder diretamente)

IMPORTANTE - DETECÇÃO DE AMBIGUIDADE:
Se a mensagem for vaga ou incompleta, defina needsClarification: true e faça uma pergunta específica.

ESPECIAL - CONTAS SEM VALOR:
Se o usuário quer criar uma conta mas NÃO especifica o valor, SEMPRE pedir esclarecimento.
Exemplo: "Crie conta de Automações e IA, recebo todo dia 10" → Perguntar: "💰 Qual o valor que você recebe de Automações e IA todo dia 10?"

ESPECIAL - CARTÕES SEM INFORMAÇÕES:
Se o usuário quer criar um cartão mas NÃO especifica o dia de vencimento, SEMPRE pedir esclarecimento.
Exemplo: "Criar cartão Nubank" → Perguntar: "💳 Qual o dia de vencimento do cartão Nubank? (1-31)"
Se o usuário quer fazer uma compra no cartão mas NÃO especifica o valor ou descrição, SEMPRE pedir esclarecimento.
Exemplo: "Comprei no cartão" → Perguntar: "🛍️ O que você comprou e qual foi o valor?"

IMPORTANTE - CONSULTAS vs AÇÕES:
- Perguntas como "quanto...", "como está..." → SEM ações, apenas response_message
- Comandos como "criar...", "pagar...", "alterar..." → COM ações específicas
- **EXCEÇÃO: "Quais contas", "Minhas contas", "Contas pendentes" → SEMPRE usar ação list_bills**
- **EXCEÇÃO: "Quais cartões", "Meus cartões", "Cartões que tenho" → SEMPRE usar ação list_cards**

IMPORTANTE - TIPOS DE AÇÃO:
- "Gastei X reais", "Comprei X" → create_transaction (nova transação)
- "Pagar conta X", "Quitar conta" → pay_bill (marcar conta existente como paga)
- "Criar categoria X" → create_category (tipo de despesa/receita)
- "Criar conta X", "Cadastrar conta", "Nova conta que pago todo mês" → create_bill (conta a pagar/receber)
- **"Alterar nome da conta X para Y", "Renomear conta X", "Mudar nome para Y" → update_bill**
- **"Excluir conta X", "Deletar conta X", "Remover conta X" → delete_bill**
- "Criar meta X" → create_goal
- "Alterar meta", "Colocar X na meta" → update_goal
- **"Quais contas", "Que contas tenho", "Contas pendentes", "Minhas contas" → list_bills (OBRIGATÓRIO)**
- "Criar cartão X", "Novo cartão" → create_card
- "Comprei X no cartão", "Usei cartão", "Gasto no cartão" → create_card_purchase
- "Pagar fatura do cartão", "Quitar cartão" → pay_card_invoice
- **"Quais cartões tenho", "Meus cartões", "Que cartões eu tenho", "Cartões que tenho" → list_cards (OBRIGATÓRIO)**
- "Histórico do cartão", "Compras do cartão" → view_card_history

IMPORTANTE - CAMPOS DE META:
- target_amount = OBJETIVO da meta (quanto quero chegar)
- current_amount = PROGRESSO atual (quanto já tenho)
- "Colocar 10000 na meta" = alterar OBJETIVO (target_amount)
- "Já consegui 500" = alterar PROGRESSO (current_amount)

DIFERENÇA IMPORTANTE:
- CATEGORIA = tipo de gasto (Alimentação, Transporte, etc.)
- CONTA = obrigação financeira específica (Conta de luz, Aluguel, etc.)

Exemplos de mensagens que PRECISAM de esclarecimento:
- "criar categoria" (qual categoria? para que tipo?)
- "criar categoria jogos" (é despesa ou receita?)
- "gastei dinheiro" (quanto? onde? categoria?)
- "quero economizar" (quanto? para que? em quanto tempo?)
- "pagar conta" (qual conta? valor?)
- "criar conta de luz" (quanto? quando vence?)
- "recebo todo dia 10" (quanto? de onde? que conta?)
- "colocar X na meta" (é aporte no progresso ou mudança do objetivo?)

REGRAS PARA CRIAÇÃO DE CATEGORIAS:
1. Se o usuário ESPECIFICA claramente o tipo: "criar categoria X para despesas" ou "categoria Y de receita" → NÃO pedir esclarecimento, criar diretamente
2. Se menciona palavras explícitas como "gastos", "despesas", "custos" → tipo "expense" 
3. Se menciona palavras como "receitas", "ganhos", "rendas" → tipo "income"
4. Se o usuário menciona apenas o nome da categoria SEM especificar o tipo, verificar se é óbvio:
   - "salário", "freelance", "venda", "vendas" → receita (óbvio)
   - "aluguel", "conta de luz", "medicamentos", "gastos" → despesa (óbvio)
5. Para categorias ambíguas como "jogos", "tecnologia", "casa" SEM contexto, sempre perguntar o tipo

RESPOSTA (JSON obrigatório):
{
  "intent": "transaction|goal|category|advice|report|bill|investment|card|clarification",
  "confidence": 0.95,
  "reasoning": "Explicação detalhada da análise",
  "needsClarification": false,
  "clarificationQuestion": "Pergunta específica se precisar de esclarecimento",
  "extracted_data": {
    "amount": 50.00,
    "description": "Compras no mercado",
    "category": "Alimentação",
    "name": "Nome da categoria OU conta",
    "title": "Título da meta OU conta (OBRIGATÓRIO para create_bill)",
    "type": "expense|income (para categorias) OU payable|receivable (para contas)",
    "bill_type": "payable|receivable (específico para contas)",
    "payment_method": "pix",
    "location": "Pão de Açúcar",
    "target_amount": 5000.00,
    "current_amount": 1500.00,
    "aporte": 1000.00,
    "due_date": "2024-01-15 OU próximo dia 10",
    "due_day": 10,
    "recurring": true,
    "recurring_interval": "monthly|weekly|daily|yearly",
    "pay_all": "true (para pagar todas as contas)",
    "nickname": "Nome do cartão (OBRIGATÓRIO para create_card)",
    "card_id": "ID do cartão específico",
    "card_name": "Nome do cartão para busca",
    "limit_amount": 5000.00,
    "installments": 12,
    "purchase_date": "2024-01-15"
  },
  "actions": [
    {
      "type": "create_transaction|create_category|create_goal|update_goal|create_bill|update_bill|delete_bill|pay_bill|list_bills|create_card|create_card_purchase|pay_card_invoice|list_cards|view_card_history",
      "data": {},
      "priority": "high"
    }
  ],
  "suggestions": [
    "Sugestão 1",
    "Sugestão 2"
  ],
  "response_message": "Mensagem amigável para o usuário"
}

EXEMPLOS DE ESCLARECIMENTO PARA CATEGORIAS:
- "criar categoria jogos" → needsClarification: true, clarificationQuestion: "🎮 Perfeito! A categoria 'Jogos' será para **despesas** (gastos com jogos, equipamentos, assinaturas) ou **receitas** (vendas de jogos, streaming de games)? 💰"

- "criar categoria tecnologia" → needsClarification: true, clarificationQuestion: "💻 Ótima categoria! 'Tecnologia' será para **despesas** (compras de equipamentos, softwares, assinaturas) ou **receitas** (freelances tech, vendas de produtos digitais)? 🤔"

- "criar categoria casa" → needsClarification: true, clarificationQuestion: "🏠 Categoria 'Casa' será para **despesas** (manutenção, móveis, contas) ou **receitas** (aluguel recebido, vendas relacionadas)? 💡"

EXEMPLOS DE ESCLARECIMENTO PARA CONTAS SEM VALOR:
- "Crie conta recorrente, pagamentos de Automações e IA, recebo todo dia 10" → needsClarification: true, clarificationQuestion: "💰 Perfeito! Qual o **valor** que você recebe de 'Pagamentos de Automações e IA' todo dia 10? Por exemplo: R$ 500, R$ 1000, etc."

- "Nova conta de luz que vence dia 15" → needsClarification: true, clarificationQuestion: "💡 Ótimo! Qual o **valor** da conta de luz? Por exemplo: R$ 200, R$ 150, etc."

EXEMPLOS DE ESCLARECIMENTO PARA CARTÕES:
- "Criar cartão Nubank" → needsClarification: true, clarificationQuestion: "💳 Perfeito! Qual o **dia de vencimento** do cartão Nubank? Por exemplo: 10, 15, 25, etc. (entre 1 e 31)"

- "Novo cartão Inter com limite" → needsClarification: true, clarificationQuestion: "💳 Ótimo! Preciso de duas informações:\n1️⃣ **Dia de vencimento** (1-31)\n2️⃣ **Valor do limite** (opcional)\n\nExemplo: 'dia 15 com limite de 5000'"

- "Comprei no cartão" → needsClarification: true, clarificationQuestion: "🛍️ Preciso de mais detalhes sobre a compra:\n1️⃣ **Qual cartão** você usou?\n2️⃣ **O que** você comprou?\n3️⃣ **Qual foi o valor**?\n\nExemplo: 'usei o Nubank para comprar roupas por 150 reais'"

EXEMPLOS DE ESCLARECIMENTO PARA METAS AMBÍGUAS:
- "Quero colocar 10000 na meta abrir empresa" → needsClarification: true, clarificationQuestion: "🎯 Você quer:\n\n💰 **Fazer um aporte** de R$ 10.000 (adicionar ao progresso atual)?\n\nOU\n\n🎯 **Alterar o objetivo** da meta para R$ 10.000 (mudar a meta total)?"

- "Colocar 5000 na meta viagem" → needsClarification: true, clarificationQuestion: "✈️ Você quer:\n\n💰 **Fazer um aporte** de R$ 5.000 (adicionar ao que já tem)?\n\nOU\n\n🎯 **Alterar o objetivo** da meta para R$ 5.000 (nova meta total)?"

EXEMPLOS DE TIPOS ÓBVIOS (não precisam esclarecimento):
- "criar categoria salário" → Receita (óbvio)
- "criar categoria freelance" → Receita (óbvio)  
- "criar categoria aluguel pago" → Despesa (óbvio)
- "criar categoria medicamentos" → Despesa (óbvio)

EXEMPLOS DE AÇÕES CLARAS:
- "Gastei 50 reais no Pão de Açúcar" → Criar transação
- "Quero economizar 5000 reais em 6 meses para viagem" → Criar meta específica
- "Crie uma categoria chamada Pets para despesas com meu cachorro" → Criar categoria despesa (tipo explícito)
- "Criar categoria Freelance para receitas" → Criar categoria receita (tipo explícito)
- "Quero categoria Jogos para gastos" → Criar categoria despesa (palavra "gastos")
- "Categoria Investimentos de receita" → Criar categoria receita (tipo explícito)
- "Criar categoria Medicamentos" → Criar categoria despesa (óbvio)
- "Criar categoria Salário" → Criar categoria receita (óbvio)
- "Alterar meta para 5000" → Atualizar target_amount da meta mais recente
- "Mudar objetivo da meta viagem para 8000" → Atualizar target_amount da meta específica  
- "Atualizar progresso da meta para 1500" → Atualizar current_amount (quanto já tenho)
- "Já consegui 500 da meta" → Atualizar current_amount
- "Fazer aporte de 1000 na meta" → Atualizar current_amount (adicionar ao progresso)
- "Alterar objetivo da meta para 15000" → Atualizar target_amount (clara intenção)
- "Quero colocar 10000 na meta" → PEDIR ESCLARECIMENTO (ambíguo)
- "Quais minhas contas não pagas?" → OBRIGATORIAMENTE usar ação list_bills
- "Pagar conta de luz" → usar pay_bill, NÃO create_transaction
- "Quero pagar a conta asdsdasd" → usar pay_bill com name: "asdsdasd"
- "Pagar todas as contas" → usar pay_bill com pay_all: true
- "Quero criar nova conta, conta de luz, 250 reais, vence dia 10" → create_bill
- **"Altere o nome dela para Camozzi Consultoria" → update_bill com old_name: "Recebimento mensal", new_name: "Camozzi Consultoria"**
- **"Pode excluir a conta Recebimento mensal" → delete_bill com name: "Recebimento mensal"**
- "Cadastrar conta de internet que pago todo mês" → create_bill
- "Nova conta: aluguel de 1500 reais" → create_bill
- "Criar cartão Nubank que vence dia 10" → create_card
- "Comprei R$ 150 de roupa no cartão Nubank" → create_card_purchase
- "Usei o cartão Inter para pagar 250 reais de combustível" → create_card_purchase
- "Pagar fatura do cartão Nubank" → pay_card_invoice
- "Quitar cartão Inter" → pay_card_invoice
- **"Quais cartões tenho?" → OBRIGATORIAMENTE usar ação list_cards**
- **"Meus cartões" → OBRIGATORIAMENTE usar ação list_cards**
- **"Que cartões eu tenho?" → OBRIGATORIAMENTE usar ação list_cards**
- **"Cartões que tenho" → OBRIGATORIAMENTE usar ação list_cards**
- "Histórico do cartão Nubank" → view_card_history
- "Compras do cartão Inter" → view_card_history
`;
  }

  /**
   * ⚡ Executar ações determinadas pela IA
   */
  private async executeActions(analysis: any): Promise<AIAgentResponse> {
    const executedActions: AIAction[] = [];
    let mainMessage = analysis.response_message || "Processado com sucesso!";

    console.log('🔍 Executando ações:', analysis.actions);
    console.log('📊 Dados extraídos:', analysis.extracted_data);

    for (const action of analysis.actions || []) {
      try {
        console.log(`🎯 Executando ação ${action.type} com dados:`, analysis.extracted_data);
        const result = await this.executeAction(action, analysis.extracted_data);
        console.log(`✅ Resultado da ação ${action.type}:`, result);
        
        executedActions.push({
          ...action,
          executed: result.success
        });

        if (result.success && result.message) {
          mainMessage = result.message;
        }
      } catch (error) {
        console.error('❌ Erro ao executar ação:', action.type, error);
        executedActions.push({
          ...action,
          executed: false
        });
      }
    }

    // Para consultas sem ações (como listar contas), considerar sucesso se há uma resposta
    const hasExecutedActions = executedActions.some(a => a.executed);
    const isInformationalQuery = analysis.actions?.length === 0 && analysis.response_message;
    
    return {
      success: hasExecutedActions || isInformationalQuery,
      message: mainMessage,
      actions: executedActions,
      data: analysis.extracted_data,
      confidence: analysis.confidence || 0.8,
      reasoning: analysis.reasoning || "Análise concluída"
    };
  }

  /**
   * 🎯 Executar ação específica
   */
  private async executeAction(action: AIAction, data: any): Promise<{success: boolean, message?: string}> {
    const context = this.userContext!;

    switch (action.type) {
      case 'create_transaction':
        return this.createTransaction(data);
      
      case 'create_category':
        return this.createCategory(data);
      
      case 'create_goal':
        return this.createGoal(data);
      
      case 'update_goal':
        return this.updateGoal(data);
      
      case 'create_bill':
        return this.createBill(data);
      
      case 'update_bill':
        return this.updateBill(data);
      
      case 'delete_bill':
        return this.deleteBill(data);
      
      case 'pay_bill':
        return this.payBill(data);
      
      case 'list_bills':
        return this.listBills(data);
      
      case 'create_card':
        return this.createCard(data);
      
      case 'create_card_purchase':
        return this.createCardPurchase(data);
      
      case 'pay_card_invoice':
        return this.payCardInvoice(data);
      
      case 'list_cards':
        return this.listCards(data);
      
      case 'view_card_history':
        return this.viewCardHistory(data);
      
      case 'financial_advice':
        return this.generateAdvice(data);
      
      default:
        return { success: false, message: 'Ação não reconhecida' };
    }
  }

  /**
   * 💰 Criar transação inteligentemente
   */
  private async createTransaction(data: any): Promise<{success: boolean, message?: string}> {
    try {
      console.log('💰 createTransaction chamada com dados:', data);
      
      const context = this.userContext!;
      
      // Validar dados obrigatórios
      if (!data.amount || data.amount <= 0) {
        console.log('❌ Amount inválido:', data.amount);
        return {
          success: false,
          message: '❌ Valor da transação é obrigatório e deve ser maior que zero.'
        };
      }
      
      if (!data.description && !data.category) {
        console.log('❌ Descrição e categoria não fornecidas');
        return {
          success: false,
          message: '❌ Descrição ou categoria da transação é obrigatória.'
        };
      }
      
      console.log('✅ Dados validados, processando transação...');
      
      // Encontrar ou criar categoria
      let categoryId = null;
      if (data.category) {
        const existingCategory = context.categories.find(c => 
          c.name.toLowerCase().includes(data.category.toLowerCase()) && c.type === data.type
        );
        
        if (existingCategory) {
          categoryId = existingCategory.id;
        } else {
          // Criar categoria automaticamente
          const { data: newCategory } = await supabase
            .from('categories')
            .insert({
              user_id: context.userId,
              name: data.category,
              type: data.type,
              budget: data.type === 'expense' ? (data.amount * 10) : 0, // Budget inteligente
              color: this.getRandomColor(),
              icon: this.getCategoryIcon(data.category)
            })
            .select()
            .single();
          
          if (newCategory) {
            categoryId = newCategory.id;
          }
        }
      }

      // Determinar tipo da transação se não especificado
      let transactionType = data.type;
      if (!transactionType) {
        // Se não especificou tipo, assumir expense por padrão
        transactionType = 'expense';
        console.log('⚠️ Tipo não especificado, usando expense como padrão');
      }
      
      console.log('🔄 Tipo da transação:', transactionType);
      
      const transactionData = {
        user_id: context.userId,
        category_id: categoryId,
        description: data.description || 'Transação via IA',
        amount: transactionType === 'expense' ? -Math.abs(data.amount) : Math.abs(data.amount),
        type: transactionType,
        payment_method: data.payment_method || 'cash',
        status: 'completed',
        transaction_date: new Date().toISOString()
      };
      
      console.log('💾 Criando transação no banco:', transactionData);
      
      // Criar transação
      const { error } = await supabase
        .from('transactions')
        .insert(transactionData);

      if (error) {
        console.error('❌ Erro do Supabase ao criar transação:', error);
        throw error;
      }
      
      console.log('✅ Transação criada com sucesso');

      const emoji = transactionType === 'income' ? '💰' : '💸';
      const successMessage = `${emoji} Transação criada: ${data.description || 'Transação via IA'} - R$ ${Math.abs(data.amount).toFixed(2)}\n📂 Categoria: ${data.category || 'Geral'}`;
      console.log('📤 Retornando sucesso:', successMessage);
      
      return {
        success: true,
        message: successMessage
      };
    } catch (error) {
      console.error('❌ Erro detalhado ao criar transação:', error);
      const errorMessage = `❌ Erro ao criar transação: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      console.log('📤 Retornando erro de transação:', errorMessage);
      return { 
        success: false, 
        message: errorMessage
      };
    }
  }

  /**
   * 🏷️ Criar categoria automaticamente
   */
  private async createCategory(data: any): Promise<{success: boolean, message?: string}> {
    try {
      console.log('🏷️ createCategory chamada com dados:', data);
      
      // Validar dados obrigatórios - aceitar tanto 'name' quanto 'category'
      const categoryName = data.name || data.category;
      if (!categoryName) {
        console.log('❌ Nome da categoria não fornecido');
        return { 
          success: false, 
          message: '❌ Nome da categoria é obrigatório para criar uma categoria.' 
        };
      }
      
      console.log('✅ Nome da categoria encontrado:', categoryName);

      // Se o tipo não foi especificado, tentar detectar automaticamente
      let categoryType = data.type;
      console.log('🔍 Tipo inicial da categoria:', categoryType);
      
      if (!categoryType) {
        const detectedType = this.detectObviousCategoryType(categoryName);
        if (detectedType) {
          categoryType = detectedType;
          console.log(`✅ Tipo detectado automaticamente para "${categoryName}": ${detectedType}`);
        } else {
          // Se não conseguir detectar, usar 'expense' como padrão
          categoryType = 'expense';
          console.log(`⚠️ Tipo não detectado para "${categoryName}", usando 'expense' como padrão`);
        }
      }

      const categoryData = {
        user_id: this.userContext!.userId,
        name: categoryName,
        type: categoryType,
        budget: data.budget || (categoryType === 'income' ? 0 : 500),
        color: data.color || this.getRandomColor(),
        icon: data.icon || this.getCategoryIcon(categoryName)
      };

      console.log('💾 Criando categoria no banco:', categoryData);

      const { data: insertedData, error } = await supabase
        .from('categories')
        .insert(categoryData)
        .select();

      if (error) {
        console.error('❌ Erro do Supabase ao criar categoria:', error);
        throw error;
      }

      console.log('✅ Categoria criada com sucesso:', insertedData);

      const typeText = categoryType === 'income' ? 'Receita' : 'Despesa';
      const budgetText = categoryType === 'income' ? 'sem orçamento' : `R$ ${categoryData.budget.toFixed(2)}`;

      const successMessage = `🏷️ Categoria "${categoryName}" criada com sucesso!\n💰 ${typeText} - ${budgetText}\n${this.getCategoryIcon(categoryName)} Ícone aplicado automaticamente`;
      console.log('📤 Retornando sucesso:', successMessage);

      return {
        success: true,
        message: successMessage
      };
    } catch (error) {
      console.error('❌ Erro detalhado ao criar categoria:', error);
      const errorMessage = `❌ Erro ao criar categoria: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      console.log('📤 Retornando erro:', errorMessage);
      return { 
        success: false, 
        message: errorMessage
      };
    }
  }

  /**
   * 🎯 Criar meta financeira
   */
  private async createGoal(data: any): Promise<{success: boolean, message?: string}> {
    try {
      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: this.userContext!.userId,
          title: data.title,
          description: data.description,
          target_amount: data.target_amount,
          current_amount: 0,
          target_date: data.target_date,
          status: 'active'
        });

      if (error) throw error;

      return {
        success: true,
        message: `🎯 Meta "${data.title}" criada! Objetivo: R$ ${data.target_amount.toFixed(2)}`
      };
    } catch (error) {
      return { success: false, message: 'Erro ao criar meta' };
    }
  }

  /**
   * 🔄 Atualizar meta financeira existente
   */
  private async updateGoal(data: any): Promise<{success: boolean, message?: string}> {
    try {
      console.log('🔄 updateGoal chamada com dados:', data);
      
      const context = this.userContext!;
      
      // Se não especificou qual meta, tentar encontrar a meta mais recente ou ativa
      let goalToUpdate = null;
      
      if (data.goal_id || data.id) {
        // Se especificou ID da meta
        const goalId = data.goal_id || data.id;
        goalToUpdate = context.goals.find(g => g.id === goalId);
      } else if (data.title || data.name) {
        // Se especificou título da meta
        const searchTerm = (data.title || data.name).toLowerCase();
        goalToUpdate = context.goals.find(g => 
          g.title.toLowerCase().includes(searchTerm) ||
          searchTerm.includes(g.title.toLowerCase())
        );
      } else {
        // Buscar a meta mais recente ativa
        goalToUpdate = context.goals
          .filter(g => g.status === 'active')
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      }
      
      if (!goalToUpdate) {
        return {
          success: false,
          message: '❌ Nenhuma meta encontrada para atualizar. Especifique qual meta ou crie uma nova meta primeiro.'
        };
      }
      
      console.log('🎯 Meta encontrada para atualizar:', goalToUpdate);
      
      // Preparar dados de atualização
      const updateData: any = {};
      
      if (data.target_amount !== undefined) {
        updateData.target_amount = data.target_amount;
      }
      
      if (data.title && data.title !== goalToUpdate.title) {
        updateData.title = data.title;
      }
      
      if (data.description !== undefined) {
        updateData.description = data.description;
      }
      
      if (data.target_date !== undefined) {
        updateData.target_date = data.target_date;
      }
      
      if (data.current_amount !== undefined) {
        updateData.current_amount = data.current_amount;
      }
      
      // Se for aporte, adicionar ao valor atual
      if (data.aporte !== undefined) {
        updateData.current_amount = (goalToUpdate.current_amount || 0) + data.aporte;
      }
      
      console.log('💾 Atualizando meta com dados:', updateData);
      
      const { error } = await supabase
        .from('goals')
        .update(updateData)
        .eq('id', goalToUpdate.id)
        .eq('user_id', context.userId);
      
      if (error) {
        console.error('❌ Erro do Supabase ao atualizar meta:', error);
        throw error;
      }
      
      console.log('✅ Meta atualizada com sucesso');
      
      // Construir mensagem de sucesso
      let successMessage = `🎯 Meta "${goalToUpdate.title}" atualizada com sucesso!\n`;
      
      if (data.target_amount !== undefined) {
        successMessage += `💰 Novo objetivo: R$ ${data.target_amount.toFixed(2)}\n`;
      }
      
      if (data.current_amount !== undefined) {
        successMessage += `📈 Valor atual: R$ ${data.current_amount.toFixed(2)}\n`;
      }
      
      if (data.aporte !== undefined) {
        successMessage += `💰 Aporte de R$ ${data.aporte.toFixed(2)} adicionado!\n📈 Novo progresso: R$ ${updateData.current_amount.toFixed(2)}\n`;
      }
      
      const newTarget = data.target_amount || goalToUpdate.target_amount;
      const newCurrent = updateData.current_amount || data.current_amount || goalToUpdate.current_amount;
      const progress = newTarget > 0 ? (newCurrent / newTarget) * 100 : 0;
      
      successMessage += `📊 Progresso: ${progress.toFixed(1)}%`;
      
      console.log('📤 Retornando sucesso:', successMessage);
      
      return {
        success: true,
        message: successMessage
      };
      
    } catch (error) {
      console.error('❌ Erro detalhado ao atualizar meta:', error);
      const errorMessage = `❌ Erro ao atualizar meta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      console.log('📤 Retornando erro:', errorMessage);
      return { 
        success: false, 
        message: errorMessage
      };
    }
  }

  /**
   * 📄 Criar nova conta a pagar/receber
   */
  private async createBill(data: any): Promise<{success: boolean, message?: string}> {
    try {
      console.log('📄 createBill chamada com dados:', data);
      
      const context = this.userContext!;
      
      // Validar dados obrigatórios
      if (!data.title && !data.name) {
        console.log('❌ Nome/título da conta não fornecido');
        return {
          success: false,
          message: '❌ Nome da conta é obrigatório para criar uma conta.'
        };
      }
      
      if (!data.amount || data.amount <= 0) {
        console.log('❌ Amount inválido:', data.amount);
        return {
          success: false,
          message: '❌ Valor da conta é obrigatório e deve ser maior que zero.\n\n💡 Exemplo: "Crie uma conta de luz de R$ 250 que vence todo dia 10"'
        };
      }
      
      const billTitle = data.title || data.name;
      
      // Determinar tipo da conta (payable ou receivable)
      let billType = data.type || 'payable'; // Padrão: conta a pagar
      if (data.bill_type) {
        billType = data.bill_type;
      }
      
      // Calcular data de vencimento
      let dueDate = new Date();
      if (data.due_date) {
        dueDate = new Date(data.due_date);
      } else if (data.due_day) {
        // Se especificou dia do vencimento (ex: todo dia 10)
        dueDate = new Date();
        dueDate.setDate(data.due_day);
        
        // Se o dia já passou neste mês, próximo mês
        if (dueDate < new Date()) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }
      } else {
        // Padrão: vence em 30 dias
        dueDate.setDate(dueDate.getDate() + 30);
      }
      
      // Determinar se é recorrente
      const isRecurring = data.recurring !== false; // Padrão: true para contas mensais
      
      const billData = {
        user_id: context.userId,
        title: billTitle,
        description: data.description || `Conta ${billType === 'payable' ? 'a pagar' : 'a receber'}: ${billTitle}`,
        amount: data.amount,
        type: billType,
        due_date: dueDate.toISOString().split('T')[0], // Apenas a data, sem hora
        status: 'pending',
        is_recurring: isRecurring,
        recurring_interval: data.recurring_interval || 'monthly',
        recurring_day: data.due_day || dueDate.getDate()
      };
      
      console.log('💾 Criando conta no banco:', billData);
      
      const { data: insertedData, error } = await supabase
        .from('bills')
        .insert(billData)
        .select();
      
      if (error) {
        console.error('❌ Erro do Supabase ao criar conta:', error);
        throw error;
      }
      
      console.log('✅ Conta criada com sucesso:', insertedData);
      
      const typeText = billType === 'payable' ? 'a pagar' : 'a receber';
      const recurringText = isRecurring ? ` (${data.recurring_interval || 'mensal'})` : '';
      
      const successMessage = `📄 Conta "${billTitle}" criada com sucesso!\n💰 ${typeText.charAt(0).toUpperCase() + typeText.slice(1)}: R$ ${data.amount.toFixed(2)}${recurringText}\n📅 Vencimento: ${dueDate.toLocaleDateString('pt-BR')}\n${isRecurring ? `🔄 Conta recorrente (${data.recurring_interval || 'mensal'}) - dia ${data.due_day || dueDate.getDate()}` : '📝 Conta única'}`;
      
      console.log('📤 Retornando sucesso:', successMessage);
      
      return {
        success: true,
        message: successMessage
      };
      
    } catch (error) {
      console.error('❌ Erro detalhado ao criar conta:', error);
      const errorMessage = `❌ Erro ao criar conta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      console.log('📤 Retornando erro:', errorMessage);
      return {
        success: false,
        message: errorMessage
      };
    }
  }

  /**
   * 📝 Atualizar conta existente
   */
  private async updateBill(data: any): Promise<{success: boolean, message?: string}> {
    try {
      console.log('📝 updateBill chamada com dados:', data);
      
      const context = this.userContext!;
      
      // Encontrar conta para atualizar
      let billToUpdate = null;
      
      if (data.id) {
        billToUpdate = context.bills.find(b => b.id === data.id);
      } else if (data.old_name || data.current_name) {
        const searchName = data.old_name || data.current_name;
        billToUpdate = context.bills.find(b => 
          b.title.toLowerCase().includes(searchName.toLowerCase())
        );
      } else if (data.title || data.name) {
        // Buscar por similaridade no nome
        billToUpdate = context.bills.find(b => 
          b.title.toLowerCase().includes((data.title || data.name).toLowerCase())
        );
      }
      
      if (!billToUpdate) {
        return {
          success: false,
          message: '❌ Conta não encontrada para atualizar.'
        };
      }
      
      // Preparar dados para atualização
      const updateData: any = {};
      
      if (data.title || data.new_name) {
        updateData.title = data.title || data.new_name;
      }
      if (data.amount && data.amount > 0) {
        updateData.amount = data.amount;
      }
      if (data.due_date) {
        updateData.due_date = data.due_date;
      }
      if (data.due_day) {
        updateData.due_date = `2024-${String(new Date().getMonth() + 1).padStart(2, '0')}-${String(data.due_day).padStart(2, '0')}`;
      }
      
      console.log('📝 Atualizando conta:', billToUpdate.id, updateData);
      
      const { error } = await supabase
        .from('bills')
        .update(updateData)
        .eq('id', billToUpdate.id)
        .eq('user_id', context.userId);
      
      if (error) {
        console.error('❌ Erro ao atualizar conta:', error);
        throw new Error(`Erro ao atualizar conta: ${error.message}`);
      }
      
      const updatedName = updateData.title || billToUpdate.title;
      const successMessage = `✅ Conta "${updatedName}" atualizada com sucesso!`;
      
      console.log('📤 Retornando sucesso:', successMessage);
      
      return {
        success: true,
        message: successMessage
      };
      
    } catch (error) {
      console.error('❌ Erro ao atualizar conta:', error);
      return {
        success: false,
        message: `❌ Erro ao atualizar conta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * 🗑️ Excluir conta
   */
  private async deleteBill(data: any): Promise<{success: boolean, message?: string}> {
    try {
      console.log('🗑️ deleteBill chamada com dados:', data);
      
      const context = this.userContext!;
      
      // Encontrar conta para excluir
      let billToDelete = null;
      
      if (data.id) {
        billToDelete = context.bills.find(b => b.id === data.id);
      } else if (data.title || data.name) {
        const searchName = (data.title || data.name).toLowerCase();
        billToDelete = context.bills.find(b => 
          b.title.toLowerCase().includes(searchName) ||
          b.title.toLowerCase() === searchName
        );
      }
      
      if (!billToDelete) {
        return {
          success: false,
          message: `❌ Conta "${data.title || data.name || 'especificada'}" não encontrada para exclusão.`
        };
      }
      
      console.log('🗑️ Excluindo conta:', billToDelete.id, billToDelete.title);
      
      const { error } = await supabase
        .from('bills')
        .delete()
        .eq('id', billToDelete.id)
        .eq('user_id', context.userId);
      
      if (error) {
        console.error('❌ Erro ao excluir conta:', error);
        throw new Error(`Erro ao excluir conta: ${error.message}`);
      }
      
      const successMessage = `🗑️ Conta "${billToDelete.title}" excluída com sucesso!`;
      
      console.log('📤 Retornando sucesso:', successMessage);
      
      return {
        success: true,
        message: successMessage
      };
      
    } catch (error) {
      console.error('❌ Erro ao excluir conta:', error);
      return {
        success: false,
        message: `❌ Erro ao excluir conta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * 💳 Marcar conta como paga E criar transação automaticamente
   */
  private async payBill(data: any): Promise<{success: boolean, message?: string}> {
    try {
      console.log('💳 payBill chamada com dados:', data);
      
      const context = this.userContext!;
      
      // Encontrar conta(s) para pagar
      let billsToPay = [];
      
      if (data.bill_id || data.id) {
        // Pagar conta específica por ID
        const bill = context.bills.find(b => b.id === (data.bill_id || data.id) && b.status === 'pending');
        if (bill) billsToPay.push(bill);
      } else if (data.title || data.name) {
        // Pagar conta específica por nome
        const bill = context.bills.find(b => 
          b.title.toLowerCase().includes((data.title || data.name).toLowerCase()) && 
          b.status === 'pending'
        );
        if (bill) billsToPay.push(bill);
      } else if (data.pay_all === true || data.all === true) {
        // Pagar todas as contas pendentes
        billsToPay = context.bills.filter(b => b.status === 'pending');
      } else {
        // Se não especificou, tentar encontrar a conta mais próxima do vencimento
        billsToPay = context.bills
          .filter(b => b.status === 'pending')
          .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
          .slice(0, 1);
      }
      
      if (billsToPay.length === 0) {
        return {
          success: false,
          message: '❌ Nenhuma conta pendente encontrada para pagamento.'
        };
      }
      
      console.log('💰 Contas para pagar:', billsToPay);
      
      // PARA CADA CONTA: 1. Marcar como paga 2. Criar transação correspondente
      const processedBills = [];
      
      for (const bill of billsToPay) {
        console.log(`🔄 Processando conta: ${bill.title}`);
        
        // 1. Marcar conta como paga
        const { error: billError } = await supabase
          .from('bills')
          .update({ 
            status: 'paid',
            updated_at: new Date().toISOString()
          })
          .eq('id', bill.id)
          .eq('user_id', context.userId);
          
        if (billError) {
          console.error(`❌ Erro ao marcar conta ${bill.title} como paga:`, billError);
          throw new Error(`Erro ao atualizar conta ${bill.title}: ${billError.message}`);
        }
        
        // 2. Criar transação correspondente
        const transactionType = bill.type === 'payable' ? 'expense' : 'income';
        const transactionAmount = bill.type === 'payable' ? -Math.abs(bill.amount) : Math.abs(bill.amount);
        
        // Buscar categoria apropriada ou usar uma padrão
        let categoryId = bill.category_id;
        if (!categoryId) {
          // Buscar categoria "Outros" do tipo correto
          const defaultCategory = context.categories.find(c => 
            c.type === transactionType && c.name.toLowerCase().includes('outros')
          );
          categoryId = defaultCategory?.id || null;
        }
        
        const transactionData = {
          user_id: context.userId,
          category_id: categoryId,
          description: `Pagamento: ${bill.title}`,
          amount: transactionAmount,
          type: transactionType,
          status: 'completed',
          transaction_date: new Date().toISOString().split('T')[0],
          payment_method: 'transfer' // Método padrão
        };
        
        console.log(`💰 Criando transação para ${bill.title}:`, transactionData);
        
        const { data: transaction, error: transactionError } = await supabase
          .from('transactions')
          .insert([transactionData])
          .select()
          .single();
          
        if (transactionError) {
          console.error(`❌ Erro ao criar transação para ${bill.title}:`, transactionError);
          throw new Error(`Erro ao criar transação para ${bill.title}: ${transactionError.message}`);
        }
        
        console.log(`✅ Transação criada para ${bill.title}:`, transaction.id);
        processedBills.push({ bill, transaction });
      }
      
      console.log('✅ Todas as contas processadas com sucesso');
      
      // Construir mensagem de sucesso
      let successMessage = '';
      
      if (processedBills.length === 1) {
        const { bill, transaction } = processedBills[0];
        const typeText = bill.type === 'payable' ? 'Despesa' : 'Receita';
        successMessage = `💳 Conta "${bill.title}" marcada como paga!\n💰 Valor: R$ ${bill.amount.toFixed(2)}\n📊 ${typeText} registrada no Dashboard e Transações`;
      } else {
        const totalAmount = processedBills.reduce((sum, { bill }) => sum + bill.amount, 0);
        successMessage = `💳 ${processedBills.length} contas marcadas como pagas!\n💰 Total: R$ ${totalAmount.toFixed(2)}\n📊 Todas as transações registradas\n\n📋 Contas processadas:\n`;
        processedBills.forEach(({ bill }) => {
          const typeText = bill.type === 'payable' ? '💸' : '💰';
          successMessage += `${typeText} ${bill.title} - R$ ${bill.amount.toFixed(2)}\n`;
        });
      }
      
      console.log('📤 Retornando sucesso:', successMessage);
      
      return {
        success: true,
        message: successMessage
      };
      
    } catch (error) {
      console.error('❌ Erro detalhado ao pagar conta:', error);
      const errorMessage = `❌ Erro ao pagar conta: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
      console.log('📤 Retornando erro:', errorMessage);
      return { 
        success: false, 
        message: errorMessage
      };
    }
  }

  /**
   * 📋 Listar contas pendentes organizadas
   */
  private async listBills(data: any): Promise<{success: boolean, message?: string}> {
    try {
      console.log('📋 listBills chamada com dados:', data);
      
      const context = this.userContext!;
      
      // Log das contas carregadas para debug
      console.log('🔍 Total de contas carregadas:', context.bills.length);
      console.log('📊 Status das contas:', context.bills.map(b => ({ title: b.title, status: b.status })));
      
      // Filtrar apenas contas NÃO concluídas (pendentes, atrasadas, etc - mas não pagas)
      const activeBills = context.bills.filter(b => b.status !== 'paid' && b.status !== 'cancelled');
      
      console.log('✅ Contas ativas após filtro:', activeBills.length);
      console.log('📋 Contas ativas:', activeBills.map(b => ({ title: b.title, status: b.status, type: b.type })));
      
      if (activeBills.length === 0) {
        return {
          success: true,
          message: '✅ Parabéns! Você não tem contas pendentes no momento.'
        };
      }
      
      // Separar por tipo (a pagar vs a receber)
      const billsToPay = activeBills.filter(b => b.type === 'payable');
      const billsToReceive = activeBills.filter(b => b.type === 'receivable');
      
      let message = `📋 **SUAS CONTAS PENDENTES:**\n\n`;
      
      // ===== CONTAS A PAGAR =====
      if (billsToPay.length > 0) {
        // Separar por recorrência
        const uniquePayable = billsToPay.filter(b => !b.is_recurring);
        const recurringPayable = billsToPay.filter(b => b.is_recurring);
        
        message += `💸 **CONTAS A PAGAR (${billsToPay.length}):**\n\n`;
        
        // Contas únicas a pagar
        if (uniquePayable.length > 0) {
          message += `📄 **Contas Únicas (${uniquePayable.length}):**\n`;
          
          const sortedUnique = uniquePayable.sort((a, b) => 
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          );
          
          sortedUnique.forEach((bill) => {
            const formatBill = this.formatBillInfo(bill);
            message += `${formatBill.icon} ${bill.title} - R$ ${bill.amount.toFixed(2)}${formatBill.urgency}\n`;
          });
          
          const totalUnique = uniquePayable.reduce((sum, bill) => sum + bill.amount, 0);
          message += `💰 Subtotal único: R$ ${totalUnique.toFixed(2)}\n\n`;
        }
        
        // Contas recorrentes a pagar
        if (recurringPayable.length > 0) {
          message += `🔄 **Contas Recorrentes (${recurringPayable.length}):**\n`;
          
          const sortedRecurring = recurringPayable.sort((a, b) => 
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          );
          
          sortedRecurring.forEach((bill) => {
            const formatBill = this.formatBillInfo(bill);
            const intervalText = this.getRecurringIntervalText(bill.recurring_interval);
            message += `${formatBill.icon} ${bill.title} - R$ ${bill.amount.toFixed(2)} (${intervalText})${formatBill.urgency}\n`;
          });
          
          const totalRecurring = recurringPayable.reduce((sum, bill) => sum + bill.amount, 0);
          message += `💰 Subtotal recorrente: R$ ${totalRecurring.toFixed(2)}\n\n`;
        }
        
        const totalToPay = billsToPay.reduce((sum, bill) => sum + bill.amount, 0);
        message += `💸 **TOTAL A PAGAR: R$ ${totalToPay.toFixed(2)}**\n\n`;
      }
      
      // ===== CONTAS A RECEBER =====
      if (billsToReceive.length > 0) {
        // Separar por recorrência
        const uniqueReceivable = billsToReceive.filter(b => !b.is_recurring);
        const recurringReceivable = billsToReceive.filter(b => b.is_recurring);
        
        message += `💰 **CONTAS A RECEBER (${billsToReceive.length}):**\n\n`;
        
        // Contas únicas a receber
        if (uniqueReceivable.length > 0) {
          message += `📄 **Recebimentos Únicos (${uniqueReceivable.length}):**\n`;
          
          const sortedUnique = uniqueReceivable.sort((a, b) => 
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          );
          
          sortedUnique.forEach((bill) => {
            const formatBill = this.formatBillInfo(bill);
            message += `${formatBill.icon} ${bill.title} - R$ ${bill.amount.toFixed(2)}${formatBill.urgency}\n`;
          });
          
          const totalUnique = uniqueReceivable.reduce((sum, bill) => sum + bill.amount, 0);
          message += `💰 Subtotal único: R$ ${totalUnique.toFixed(2)}\n\n`;
        }
        
        // Contas recorrentes a receber
        if (recurringReceivable.length > 0) {
          message += `🔄 **Recebimentos Recorrentes (${recurringReceivable.length}):**\n`;
          
          const sortedRecurring = recurringReceivable.sort((a, b) => 
            new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          );
          
          sortedRecurring.forEach((bill) => {
            const formatBill = this.formatBillInfo(bill);
            const intervalText = this.getRecurringIntervalText(bill.recurring_interval);
            message += `${formatBill.icon} ${bill.title} - R$ ${bill.amount.toFixed(2)} (${intervalText})${formatBill.urgency}\n`;
          });
          
          const totalRecurring = recurringReceivable.reduce((sum, bill) => sum + bill.amount, 0);
          message += `💰 Subtotal recorrente: R$ ${totalRecurring.toFixed(2)}\n\n`;
        }
        
        const totalToReceive = billsToReceive.reduce((sum, bill) => sum + bill.amount, 0);
        message += `💰 **TOTAL A RECEBER: R$ ${totalToReceive.toFixed(2)}**\n\n`;
      }
      
      message += `💡 **Dicas:**\n• "pagar conta [nome]" - marca como paga\n• "criar conta fixa" - adiciona conta recorrente`;
      
      console.log('📤 Retornando lista de contas organizadas:', message);
      
      return {
        success: true,
        message: message
      };
      
    } catch (error) {
      console.error('❌ Erro ao listar contas:', error);
      return { 
        success: false, 
        message: `❌ Erro ao listar contas: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      };
    }
  }

  /**
   * 🎨 Formatar informações da conta (urgência, ícones)
   */
  private formatBillInfo(bill: any): { icon: string; urgency: string } {
    const dueDate = new Date(bill.due_date);
    const today = new Date();
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    let urgencyIcon = '📅';
    let urgencyText = '';
    
    if (diffDays < 0) {
      urgencyIcon = '🔴';
      urgencyText = ` (${Math.abs(diffDays)} dias atrasada!)`;
    } else if (diffDays <= 3) {
      urgencyIcon = '🟡';
      urgencyText = ` (vence em ${diffDays} dias)`;
    } else if (diffDays <= 7) {
      urgencyIcon = '🟠';
      urgencyText = ` (vence em ${diffDays} dias)`;
    } else {
      urgencyText = ` (vence em ${diffDays} dias)`;
    }
    
    return {
      icon: urgencyIcon,
      urgency: urgencyText
    };
  }

  /**
   * 📅 Obter texto do intervalo de recorrência
   */
  private getRecurringIntervalText(interval: string | null): string {
    switch (interval) {
      case 'daily': return 'diário';
      case 'weekly': return 'semanal';
      case 'monthly': return 'mensal';
      case 'yearly': return 'anual';
      default: return 'recorrente';
    }
  }

  /**
   * 🧹 Limpar contexto do usuário (para logout/troca de usuário)
   */
  public clearUserContext(): void {
    console.log('🧹 Limpando contexto do usuário na IA...');
    this.userContext = null;
    this.conversationHistory = [];
    console.log('✅ Contexto da IA limpo');
  }

  /**
   * 💡 Gerar conselho financeiro
   */
  private async generateAdvice(data: any): Promise<{success: boolean, message?: string}> {
    const context = this.userContext!;
    const savings = context.monthlyIncome - context.monthlyExpenses;
    
    let advice = "💡 Análise Financeira:\n\n";
    
    if (savings > 0) {
      advice += `✅ Você está economizando R$ ${savings.toFixed(2)} por mês!\n`;
      advice += "🎯 Sugestão: Considere criar uma meta de investimento.";
    } else {
      advice += `⚠️ Você está gastando R$ ${Math.abs(savings).toFixed(2)} a mais que ganha.\n`;
      advice += "📊 Sugestão: Revise suas despesas nas principais categorias.";
    }

    return { success: true, message: advice };
  }

  /**
   * 🎨 Utilitários para cores e ícones
   */
  private getRandomColor(): string {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * 💳 Criar cartão de crédito
   */
  private async createCard(data: any): Promise<{success: boolean, message?: string}> {
    try {
      console.log('💳 createCard chamada com dados:', data);
      
      const context = this.userContext!;
      
      // Validar dados obrigatórios
      if (!data.nickname) {
        return {
          success: false,
          message: '❌ Nome do cartão é obrigatório.'
        };
      }
      
      if (!data.due_day || data.due_day < 1 || data.due_day > 31) {
        return {
          success: false,
          message: '❌ Dia de vencimento deve estar entre 1 e 31.'
        };
      }
      
      const { data: card, error } = await supabase
        .from('cards')
        .insert({
          user_id: context.userId,
          nickname: data.nickname,
          due_day: data.due_day,
          limit_amount: data.limit_amount || null
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro ao criar cartão:', error);
        throw new Error(`Erro ao criar cartão: ${error.message}`);
      }
      
      return {
        success: true,
        message: `💳 Cartão "${data.nickname}" criado com sucesso! Vencimento dia ${data.due_day}${data.limit_amount ? `, limite de R$ ${data.limit_amount.toFixed(2)}` : ''}.`
      };
      
    } catch (error) {
      console.error('❌ Erro ao criar cartão:', error);
      return {
        success: false,
        message: `❌ Erro ao criar cartão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * 🛍️ Criar compra no cartão de crédito
   */
  private async createCardPurchase(data: any): Promise<{success: boolean, message?: string}> {
    try {
      console.log('🛍️ createCardPurchase chamada com dados:', data);
      
      const context = this.userContext!;
      
      // Validar dados obrigatórios
      if (!data.card_id && !data.card_name) {
        return {
          success: false,
          message: '❌ Cartão deve ser especificado.'
        };
      }
      
      if (!data.amount || data.amount <= 0) {
        return {
          success: false,
          message: '❌ Valor da compra é obrigatório e deve ser maior que zero.'
        };
      }
      
      if (!data.description) {
        return {
          success: false,
          message: '❌ Descrição da compra é obrigatória.'
        };
      }
      
      // Encontrar cartão
      let cardId = data.card_id;
      if (!cardId && data.card_name) {
        const card = context.cards.find(c => 
          c.nickname.toLowerCase().includes(data.card_name.toLowerCase())
        );
        if (!card) {
          return {
            success: false,
            message: `❌ Cartão "${data.card_name}" não encontrado.`
          };
        }
        cardId = card.id;
      }
      
      // Encontrar categoria se especificada
      let categoryId = null;
      if (data.category) {
        const category = context.categories.find(c => 
          c.name.toLowerCase().includes(data.category.toLowerCase()) && c.type === 'expense'
        );
        categoryId = category?.id || null;
      }
      
      const { data: purchase, error } = await supabase
        .from('card_purchases')
        .insert({
          card_id: cardId,
          description: data.description,
          amount: data.amount,
          category_id: categoryId,
          purchase_date: data.purchase_date || new Date().toISOString().split('T')[0],
          installments: data.installments || 1,
          current_installment: 1
        })
        .select()
        .single();
      
      if (error) {
        console.error('❌ Erro ao criar compra no cartão:', error);
        throw new Error(`Erro ao criar compra: ${error.message}`);
      }
      
      const installmentText = data.installments > 1 ? ` em ${data.installments}x` : '';
      return {
        success: true,
        message: `🛍️ Compra "${data.description}" de R$ ${data.amount.toFixed(2)}${installmentText} registrada no cartão!`
      };
      
    } catch (error) {
      console.error('❌ Erro ao criar compra no cartão:', error);
      return {
        success: false,
        message: `❌ Erro ao criar compra: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * 💸 Pagar fatura do cartão
   */
  private async payCardInvoice(data: any): Promise<{success: boolean, message?: string}> {
    try {
      console.log('💸 payCardInvoice chamada com dados:', data);
      
      const context = this.userContext!;
      
      // Encontrar cartão
      let cardToPay = null;
      
      if (data.card_id) {
        cardToPay = context.cards.find(c => c.id === data.card_id);
      } else if (data.card_name) {
        cardToPay = context.cards.find(c => 
          c.nickname.toLowerCase().includes(data.card_name.toLowerCase())
        );
      } else if (context.cards.length === 1) {
        cardToPay = context.cards[0];
      }
      
      if (!cardToPay) {
        return {
          success: false,
          message: '❌ Cartão não encontrado. Especifique o nome ou ID do cartão.'
        };
      }
      
      // Buscar compras não pagas do cartão
      const { data: purchases, error: purchasesError } = await supabase
        .from('card_purchases')
        .select('*')
        .eq('card_id', cardToPay.id)
        .eq('is_paid', false);
      
      if (purchasesError) {
        throw new Error(`Erro ao buscar compras: ${purchasesError.message}`);
      }
      
      if (!purchases || purchases.length === 0) {
        return {
          success: false,
          message: `💳 Cartão "${cardToPay.nickname}" não possui compras pendentes para pagamento.`
        };
      }
      
      const totalAmount = purchases.reduce((sum, p) => sum + p.amount, 0);
      
      // Criar transação de pagamento
      const { data: transaction, error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: context.userId,
          amount: totalAmount,
          description: `Pagamento fatura cartão ${cardToPay.nickname}`,
          type: 'expense',
          transaction_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();
      
      if (transactionError) {
        throw new Error(`Erro ao criar transação: ${transactionError.message}`);
      }
      
      // Marcar compras como pagas
      const { error: updateError } = await supabase
        .from('card_purchases')
        .update({ 
          is_paid: true,
          transaction_id: transaction.id 
        })
        .eq('card_id', cardToPay.id)
        .eq('is_paid', false);
      
      if (updateError) {
        throw new Error(`Erro ao atualizar compras: ${updateError.message}`);
      }
      
      return {
        success: true,
        message: `💸 Fatura do cartão "${cardToPay.nickname}" paga com sucesso!\n💰 Valor: R$ ${totalAmount.toFixed(2)}\n📊 ${purchases.length} compras quitadas`
      };
      
    } catch (error) {
      console.error('❌ Erro ao pagar fatura do cartão:', error);
      return {
        success: false,
        message: `❌ Erro ao pagar fatura: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * 💳 Listar cartões do usuário
   */
  private async listCards(data: any): Promise<{success: boolean, message?: string}> {
    try {
      console.log('💳 listCards chamada com dados:', data);
      
      const context = this.userContext!;
      
      if (context.cards.length === 0) {
        return {
          success: true,
          message: '💳 Você ainda não possui cartões cadastrados.\n\n💡 Dica: "criar cartão Nubank dia 10" para adicionar um novo cartão.'
        };
      }
      
      let message = '💳 **SEUS CARTÕES DE CRÉDITO**\n\n';
      
      for (const card of context.cards) {
        const pendingAmount = card.pending_amount || 0;
        const statusIcon = pendingAmount > 0 ? '🔴' : '✅';
        
        message += `${statusIcon} **${card.nickname}**\n`;
        message += `📅 Vencimento: dia ${card.due_day}\n`;
        message += `💰 Fatura atual: R$ ${pendingAmount.toFixed(2)}\n`;
        if (card.limit_amount) {
          message += `💳 Limite: R$ ${card.limit_amount.toFixed(2)}\n`;
        }
        message += `🛍️ Compras pendentes: ${card.pending_purchases || 0}\n\n`;
      }
      
      const totalPending = context.cards.reduce((sum, c) => sum + (c.pending_amount || 0), 0);
      if (totalPending > 0) {
        message += `💸 **TOTAL PENDENTE EM CARTÕES: R$ ${totalPending.toFixed(2)}**\n\n`;
      }
      
      message += `💡 **Dicas:**\n• "compra no cartão [nome]" - registrar compra\n• "pagar fatura [nome]" - quitar cartão`;
      
      return {
        success: true,
        message: message
      };
      
    } catch (error) {
      console.error('❌ Erro ao listar cartões:', error);
      return {
        success: false,
        message: `❌ Erro ao listar cartões: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * 📋 Ver histórico de compras do cartão
   */
  private async viewCardHistory(data: any): Promise<{success: boolean, message?: string}> {
    try {
      console.log('📋 viewCardHistory chamada com dados:', data);
      
      const context = this.userContext!;
      
      // Encontrar cartão
      let targetCard = null;
      
      if (data.card_id) {
        targetCard = context.cards.find(c => c.id === data.card_id);
      } else if (data.card_name) {
        targetCard = context.cards.find(c => 
          c.nickname.toLowerCase().includes(data.card_name.toLowerCase())
        );
      } else if (context.cards.length === 1) {
        targetCard = context.cards[0];
      }
      
      if (!targetCard) {
        return {
          success: false,
          message: '❌ Cartão não encontrado. Especifique o nome do cartão.'
        };
      }
      
      // Buscar histórico de compras
      const { data: purchases, error } = await supabase
        .from('card_purchases_with_details')
        .select('*')
        .eq('card_id', targetCard.id)
        .order('purchase_date', { ascending: false })
        .limit(20);
      
      if (error) {
        throw new Error(`Erro ao buscar histórico: ${error.message}`);
      }
      
      if (!purchases || purchases.length === 0) {
        return {
          success: true,
          message: `📋 Cartão "${targetCard.nickname}" ainda não possui compras registradas.`
        };
      }
      
      let message = `📋 **HISTÓRICO - CARTÃO ${targetCard.nickname.toUpperCase()}**\n\n`;
      
      const unpaidPurchases = purchases.filter(p => !p.is_paid);
      const paidPurchases = purchases.filter(p => p.is_paid);
      
      if (unpaidPurchases.length > 0) {
        message += `🔴 **FATURA ATUAL (${unpaidPurchases.length} compras)**\n`;
        const currentTotal = unpaidPurchases.reduce((sum, p) => sum + p.amount, 0);
        message += `💰 Total: R$ ${currentTotal.toFixed(2)}\n\n`;
        
        for (const purchase of unpaidPurchases.slice(0, 10)) {
          const date = new Date(purchase.purchase_date).toLocaleDateString('pt-BR');
          const installmentText = purchase.installments > 1 ? ` (${purchase.current_installment}/${purchase.installments}x)` : '';
          message += `• ${purchase.description} - R$ ${purchase.amount.toFixed(2)}${installmentText}\n  📅 ${date}\n\n`;
        }
      }
      
      if (paidPurchases.length > 0) {
        message += `✅ **COMPRAS PAGAS (últimas ${Math.min(paidPurchases.length, 5)})**\n`;
        
        for (const purchase of paidPurchases.slice(0, 5)) {
          const date = new Date(purchase.purchase_date).toLocaleDateString('pt-BR');
          message += `• ${purchase.description} - R$ ${purchase.amount.toFixed(2)} ✅\n  📅 ${date}\n\n`;
        }
      }
      
      return {
        success: true,
        message: message
      };
      
    } catch (error) {
      console.error('❌ Erro ao buscar histórico do cartão:', error);
      return {
        success: false,
        message: `❌ Erro ao buscar histórico: ${error instanceof Error ? error.message : 'Erro desconhecido'}`
      };
    }
  }

  /**
   * 🔍 Detectar automaticamente o tipo de categoria quando óbvio
   */
  private detectObviousCategoryType(categoryName: string): 'income' | 'expense' | null {
    const name = categoryName.toLowerCase();
    
    // Palavras-chave que indicam RECEITA claramente
    const incomeKeywords = [
      'salário', 'salario', 'freelance', 'freela', 'trabalho extra',
      'venda', 'vendas', 'comissão', 'bonificação', 'prêmio',
      'aluguel recebido', 'dividendos', 'juros recebidos',
      'consultoria', 'honorários', 'cachê', 'renda extra',
      'monetização', 'ads', 'publicidade', 'patrocínio',
      'receita', 'receitas', 'ganho', 'ganhos', 'renda', 'rendas'
    ];
    
    // Palavras-chave que indicam DESPESA claramente
    const expenseKeywords = [
      'aluguel', 'financiamento', 'prestação', 'conta de luz',
      'conta de água', 'conta de gás', 'internet', 'telefone',
      'medicamentos', 'remédios', 'plano de saúde', 'seguro',
      'iptu', 'ipva', 'multa', 'taxa', 'anuidade',
      'mensalidade', 'matrícula', 'pensão', 'combustível',
      'gasto', 'gastos', 'despesa', 'despesas', 'custo', 'custos',
      'pagamento', 'pagamentos', 'conta', 'contas'
    ];
    
    // Verificar se é receita óbvia
    for (const keyword of incomeKeywords) {
      if (name.includes(keyword)) {
        return 'income';
      }
    }
    
    // Verificar se é despesa óbvia
    for (const keyword of expenseKeywords) {
      if (name.includes(keyword)) {
        return 'expense';
      }
    }
    
    // Se não for óbvio, retorna null (precisa perguntar)
    return null;
  }

  private getCategoryIcon(categoryName: string): string {
    const icons: { [key: string]: string } = {
      'alimentação': '🍽️',
      'comida': '🍽️',
      'mercado': '🛒',
      'transporte': '🚗',
      'uber': '🚗',
      'táxi': '🚖',
      'ônibus': '🚌',
      'saúde': '🏥',
      'médico': '👨‍⚕️',
      'farmácia': '💊',
      'educação': '📚',
      'curso': '🎓',
      'livro': '📖',
      'lazer': '🎮',
      'jogos': '🎮',
      'jogo': '🎮',
      'gaming': '🎮',
      'entretenimento': '🎬',
      'cinema': '🎬',
      'netflix': '📺',
      'casa': '🏠',
      'moradia': '🏠',
      'aluguel': '🏠',
      'pets': '🐕',
      'pet': '🐕',
      'animal': '🐾',
      'cachorro': '🐕',
      'gato': '🐱',
      'investimentos': '📈',
      'investir': '💰',
      'salário': '💼',
      'trabalho': '💼',
      'freelance': '💻',
      'roupas': '👕',
      'roupa': '👕',
      'vestuário': '👔',
      'beleza': '💄',
      'cabeleireiro': '✂️',
      'esporte': '⚽',
      'academia': '🏋️',
      'gym': '💪',
      'viagem': '✈️',
      'hotel': '🏨',
      'combustível': '⛽',
      'gasolina': '⛽',
      'telefone': '📱',
      'internet': '📶',
      'supermercado': '🛒'
    };
    
    const categoryLower = categoryName.toLowerCase();
    
    // Buscar por palavra-chave na categoria
    for (const [keyword, icon] of Object.entries(icons)) {
      if (categoryLower.includes(keyword)) {
        return icon;
      }
    }
    
    return '📂';
  }
}

// Instância singleton do agente
export const aiAgent = new AIFinancialAgent();

// Expor globalmente para logout seguro
if (typeof window !== 'undefined') {
  (window as any).aiAgent = aiAgent;
}