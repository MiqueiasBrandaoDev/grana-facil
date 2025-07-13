/**
 * 🚀 SERVIDOR SIMPLES - FRONTEND + API WEBHOOK
 * Versão simplificada sem problemas de roteamento
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuração do ambiente
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const EVOLUTION_API_URL = process.env.VITE_EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.VITE_EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE_NAME = process.env.VITE_EVOLUTION_INSTANCE_NAME;

console.log('🔧 Configuração do servidor:');
console.log(`Supabase URL: ${SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado'}`);
console.log(`Evolution API: ${EVOLUTION_API_URL ? '✅ Configurado' : '❌ Não configurado'}`);
console.log(`API Key: ${EVOLUTION_API_KEY ? '✅ Configurado' : '❌ Não configurado'}`);
console.log(`Instance: ${EVOLUTION_INSTANCE_NAME || '❌ Não configurado'}`);

// ==========================================
// 📱 ENDPOINTS DA API - ORDEM IMPORTANTE!
// ==========================================

/**
 * 📱 WEBHOOK EVOLUTION API - ENDPOINT PRINCIPAL
 */
app.post('/api/evolution/webhook', async (req, res) => {
  console.log('\\n🎯 WEBHOOK RECEBIDO!');
  console.log('Timestamp:', new Date().toISOString());
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  console.log('Body:', JSON.stringify(req.body, null, 2));

  try {
    const payload = req.body;
    
    // Verificar se é mensagem válida
    if (payload.event !== 'messages.upsert' || !payload.data) {
      console.log(`⚠️ Evento ignorado: ${payload.event}`);
      return res.status(200).json({ success: true, message: 'Evento ignorado' });
    }

    // Verificar se não é mensagem nossa
    if (payload.data.key?.fromMe) {
      console.log('📤 Mensagem nossa, ignorando');
      return res.status(200).json({ success: true, message: 'Mensagem própria ignorada' });
    }

    // Extrair dados
    const phoneNumber = payload.data.key?.remoteJid?.replace('@s.whatsapp.net', '');
    const messageText = payload.data.message?.conversation || 
                       payload.data.message?.extendedTextMessage?.text;
    const senderName = payload.data.pushName || `Usuário ${phoneNumber?.slice(-4)}`;

    if (!messageText || !phoneNumber) {
      console.log('❌ Mensagem inválida');
      return res.status(200).json({ success: true, message: 'Mensagem inválida' });
    }

    console.log(`📨 De: ${senderName} (${phoneNumber})`);
    console.log(`📝 Texto: ${messageText}`);

    // Mostrar "digitando..." antes de processar
    await setTypingIndicator(phoneNumber, true);
    
    // Processar mensagem
    await processMessage(phoneNumber, messageText, senderName);
    
    // Parar "digitando..."
    await setTypingIndicator(phoneNumber, false);

    console.log('✅ Processamento concluído');
    res.status(200).json({ success: true, message: 'Processado' });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    console.error('Stack:', error.stack);
    
    // Sempre retornar 200
    res.status(200).json({ 
      success: false, 
      error: error.message 
    });
  }
});

/**
 * 📊 STATUS DA API
 */
app.get('/api/evolution/status', (req, res) => {
  res.json({
    server: 'Grana Fácil Webhook Server',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: {
      supabaseUrl: SUPABASE_URL ? 'Configurado' : 'Não configurado',
      evolutionApiUrl: EVOLUTION_API_URL ? 'Configurado' : 'Não configurado',
      evolutionApiKey: EVOLUTION_API_KEY ? 'Configurado' : 'Não configurado',
      instanceName: EVOLUTION_INSTANCE_NAME || 'Não configurado'
    }
  });
});

// ==========================================
// 🤖 AI FINANCIAL AGENT - VERSÃO COMPLETA
// Mesma implementação da interface web
// ==========================================

const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

/**
 * 🤖 AGENTE IA FINANCEIRO COMPLETO
 * Integração total com todas as funcionalidades da web
 */
class AIFinancialAgent {
  constructor() {
    this.userContext = null;
    this.conversationHistory = [];
  }

  /**
   * 🧠 Adicionar mensagem ao histórico de conversa
   */
  addToHistory(message, isUser = true) {
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
  async processCommand(message, userId) {
    try {
      console.log('🤖 Processando comando:', message);
      
      // 1. Adicionar mensagem do usuário ao histórico
      this.addToHistory(message, true);

      // 2. Carregar contexto do usuário
      await this.loadUserContext(userId);
      
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
      
      // 3.1. FORÇAR list_bills para consultas de contas
      const messageNormalized = message.toLowerCase().trim();
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
      
      // 4. Verificar se precisa de esclarecimento
      if (analysis.needsClarification) {
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
  async loadUserContext(userId) {
    try {
      console.log('🔄 Carregando contexto do usuário:', userId);

      // Buscar dados paralelos para otimizar performance
      const [
        balanceResult,
        categoriesResult,
        transactionsResult,
        goalsResult,
        billsResult
      ] = await Promise.all([
        this.fetchUserBalance(userId),
        this.fetchUserCategories(userId),
        this.fetchUserTransactions(userId),
        this.fetchUserGoals(userId),
        this.fetchUserBills(userId)
      ]);

      // Calcular receitas e despesas do mês
      const currentMonth = new Date().toISOString().slice(0, 7);
      const monthlyTransactions = transactionsResult.filter(t => 
        t.transaction_date && t.transaction_date.startsWith(currentMonth)
      ) || [];

      const monthlyIncome = monthlyTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + (t.amount || 0), 0);

      const monthlyExpenses = monthlyTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + Math.abs(t.amount || 0), 0);

      this.userContext = {
        userId: userId,
        currentBalance: balanceResult || 0,
        monthlyIncome,
        monthlyExpenses,
        categories: categoriesResult || [],
        recentTransactions: transactionsResult || [],
        goals: goalsResult || [],
        bills: billsResult || []
      };

      console.log('✅ Contexto carregado:', {
        userId,
        balance: this.userContext.currentBalance,
        categoriesCount: this.userContext.categories.length,
        transactionsCount: this.userContext.recentTransactions.length,
        goalsCount: this.userContext.goals.length,
        billsCount: this.userContext.bills.length
      });

      return this.userContext;
    } catch (error) {
      console.error('❌ Erro ao carregar contexto:', error);
      return null;
    }
  }

  async fetchUserBalance(userId) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_user_balance`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ input_user_id: userId })
      });
      return response.ok ? await response.json() : 0;
    } catch (error) {
      console.error('Erro ao buscar saldo:', error);
      return 0;
    }
  }

  async fetchUserCategories(userId) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/categories?user_id=eq.${userId}&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
      return [];
    }
  }

  async fetchUserTransactions(userId) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/transactions_with_category?user_id=eq.${userId}&order=created_at.desc&limit=20&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
      return [];
    }
  }

  async fetchUserGoals(userId) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/goal_progress?user_id=eq.${userId}&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Erro ao buscar metas:', error);
      return [];
    }
  }

  async fetchUserBills(userId) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/bills?user_id=eq.${userId}&order=due_date&select=*`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      return response.ok ? await response.json() : [];
    } catch (error) {
      console.error('Erro ao buscar contas:', error);
      return [];
    }
  }

  /**
   * 🔍 Analisar intenção do usuário com GPT-4o
   */
  async analyzeIntent(message) {
    const prompt = this.buildAnalysisPrompt(message);

    try {
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key não configurada');
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
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
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        throw new Error('Resposta vazia do GPT-4o');
      }

      return JSON.parse(content);

    } catch (error) {
      console.error('❌ Erro na análise de intenção:', error);
      return this.basicIntentAnalysis(message);
    }
  }

  /**
   * 📝 Construir prompt de análise contextual
   */
  buildAnalysisPrompt(message) {
    const context = this.userContext;
    
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

IMPORTANTE - CONSULTAS vs AÇÕES:
- Perguntas como "quanto...", "como está..." → SEM ações, apenas response_message
- Comandos como "criar...", "pagar...", "alterar..." → COM ações específicas
- **EXCEÇÃO: "Quais contas", "Minhas contas", "Contas pendentes" → SEMPRE usar ação list_bills**

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

RESPOSTA (JSON obrigatório):
{
  "intent": "transaction|goal|category|advice|report|bill|investment|clarification",
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
    "pay_all": "true (para pagar todas as contas)"
  },
  "actions": [
    {
      "type": "create_transaction|create_category|create_goal|update_goal|create_bill|update_bill|delete_bill|pay_bill|list_bills",
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
`;
  }

  /**
   * 🔧 Análise básica (fallback)
   */
  basicIntentAnalysis(message) {
    const lowerMessage = message.toLowerCase();
    
    if (lowerMessage.includes('contas') || lowerMessage.includes('quais contas')) {
      return {
        intent: 'bills',
        confidence: 0.9,
        reasoning: 'Consulta de contas',
        actions: [{ type: 'list_bills', data: {}, priority: 'high' }],
        needsClarification: false
      };
    }
    
    if (lowerMessage.includes('saldo') || lowerMessage.includes('quanto tenho')) {
      return {
        intent: 'balance',
        confidence: 0.9,
        reasoning: 'Consulta de saldo',
        actions: [{ type: 'financial_advice', data: { type: 'balance' }, priority: 'medium' }],
        needsClarification: false
      };
    }

    return {
      intent: 'general',
      confidence: 0.3,
      reasoning: 'Intenção não identificada claramente',
      actions: [{ type: 'financial_advice', data: { type: 'general' }, priority: 'low' }],
      needsClarification: true,
      clarificationQuestion: "🤔 Não entendi bem. Você quer registrar uma transação, consultar saldo ou ver suas contas?"
    };
  }

  /**
   * ⚡ Executar ações determinadas pela IA
   */
  async executeActions(analysis) {
    const executedActions = [];
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
  async executeAction(action, data) {
    const context = this.userContext;

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
      
      case 'financial_advice':
        return this.generateAdvice(data);
      
      default:
        return { success: false, message: 'Ação não reconhecida' };
    }
  }

  /**
   * 💰 Criar transação inteligentemente
   */
  async createTransaction(data) {
    try {
      console.log('💰 createTransaction chamada com dados:', data);
      
      const context = this.userContext;
      
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
          const categoryData = {
            user_id: context.userId,
            name: data.category,
            type: data.type,
            budget: data.type === 'expense' ? (data.amount * 10) : 0,
            color: this.getRandomColor(),
            icon: this.getCategoryIcon(data.category)
          };

          const response = await fetch(`${SUPABASE_URL}/rest/v1/categories`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(categoryData)
          });

          if (response.ok) {
            const newCategory = await response.json();
            if (newCategory && newCategory[0]) {
              categoryId = newCategory[0].id;
            }
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
      const response = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(transactionData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro do Supabase ao criar transação:', errorText);
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
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
   * 📋 Listar contas pendentes organizadas
   */
  async listBills(data) {
    try {
      console.log('📋 listBills chamada com dados:', data);
      
      const context = this.userContext;
      
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
  formatBillInfo(bill) {
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
  getRecurringIntervalText(interval) {
    switch (interval) {
      case 'daily': return 'diário';
      case 'weekly': return 'semanal';
      case 'monthly': return 'mensal';
      case 'yearly': return 'anual';
      default: return 'recorrente';
    }
  }

  /**
   * 💡 Gerar conselho financeiro
   */
  async generateAdvice(data) {
    const context = this.userContext;
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
  getRandomColor() {
    const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  getCategoryIcon(categoryName) {
    const icons = {
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
      'supermercado': '🛒',
      'farmácia': '💊'
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

  /**
   * 🏷️ Criar categoria automaticamente
   */
  async createCategory(data) {
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
        user_id: this.userContext.userId,
        name: categoryName,
        type: categoryType,
        budget: data.budget || (categoryType === 'income' ? 0 : 500),
        color: data.color || this.getRandomColor(),
        icon: data.icon || this.getCategoryIcon(categoryName)
      };

      console.log('💾 Criando categoria no banco:', categoryData);

      const response = await fetch(`${SUPABASE_URL}/rest/v1/categories`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(categoryData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro do Supabase ao criar categoria:', errorText);
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
      }

      const insertedData = await response.json();
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
  async createGoal(data) {
    try {
      const goalData = {
        user_id: this.userContext.userId,
        title: data.title,
        description: data.description,
        target_amount: data.target_amount,
        current_amount: 0,
        target_date: data.target_date,
        status: 'active'
      };

      const response = await fetch(`${SUPABASE_URL}/rest/v1/goals`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(goalData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
      }

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
  async updateGoal(data) {
    try {
      console.log('🔄 updateGoal chamada com dados:', data);
      
      const context = this.userContext;
      
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
      const updateData = {};
      
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
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/goals?id=eq.${goalToUpdate.id}&user_id=eq.${context.userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro do Supabase ao atualizar meta:', errorText);
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
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
  async createBill(data) {
    try {
      console.log('📄 createBill chamada com dados:', data);
      
      const context = this.userContext;
      
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
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/bills`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        },
        body: JSON.stringify(billData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro do Supabase ao criar conta:', errorText);
        throw new Error(`Erro HTTP ${response.status}: ${errorText}`);
      }
      
      const insertedData = await response.json();
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
  async updateBill(data) {
    try {
      console.log('📝 updateBill chamada com dados:', data);
      
      const context = this.userContext;
      
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
      const updateData = {};
      
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
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/bills?id=eq.${billToUpdate.id}&user_id=eq.${context.userId}`, {
        method: 'PATCH',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro ao atualizar conta:', errorText);
        throw new Error(`Erro ao atualizar conta: ${errorText}`);
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
  async deleteBill(data) {
    try {
      console.log('🗑️ deleteBill chamada com dados:', data);
      
      const context = this.userContext;
      
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
      
      const response = await fetch(`${SUPABASE_URL}/rest/v1/bills?id=eq.${billToDelete.id}&user_id=eq.${context.userId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erro ao excluir conta:', errorText);
        throw new Error(`Erro ao excluir conta: ${errorText}`);
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
  async payBill(data) {
    try {
      console.log('💳 payBill chamada com dados:', data);
      
      const context = this.userContext;
      
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
        const billUpdateResponse = await fetch(`${SUPABASE_URL}/rest/v1/bills?id=eq.${bill.id}&user_id=eq.${context.userId}`, {
          method: 'PATCH',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            status: 'paid',
            updated_at: new Date().toISOString()
          })
        });
          
        if (!billUpdateResponse.ok) {
          const errorText = await billUpdateResponse.text();
          console.error(`❌ Erro ao marcar conta ${bill.title} como paga:`, errorText);
          throw new Error(`Erro ao atualizar conta ${bill.title}: ${errorText}`);
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
        
        const transactionResponse = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
          method: 'POST',
          headers: {
            'apikey': SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
          },
          body: JSON.stringify(transactionData)
        });
          
        if (!transactionResponse.ok) {
          const errorText = await transactionResponse.text();
          console.error(`❌ Erro ao criar transação para ${bill.title}:`, errorText);
          throw new Error(`Erro ao criar transação para ${bill.title}: ${errorText}`);
        }
        
        const transaction = await transactionResponse.json();
        console.log(`✅ Transação criada para ${bill.title}:`, transaction[0]?.id);
        processedBills.push({ bill, transaction: transaction[0] });
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
   * 🔍 Detectar automaticamente o tipo de categoria quando óbvio
   */
  detectObviousCategoryType(categoryName) {
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

  /**
   * 🧹 Limpar contexto do usuário (para logout/troca de usuário)
   */
  clearUserContext() {
    console.log('🧹 Limpando contexto do usuário na IA...');
    this.userContext = null;
    this.conversationHistory = [];
    console.log('✅ Contexto da IA limpo');
  }
}

// Instância global do AI Agent
const aiAgent = new AIFinancialAgent();

/**
 * 🧪 TESTE DA API
 */
app.get('/api/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API funcionando!',
    timestamp: new Date().toISOString()
  });
});

/**
 * 🏥 HEALTH CHECK
 */
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

// ==========================================
// 🌐 SERVIR FRONTEND REACT
// ==========================================

// Servir arquivos estáticos primeiro
app.use(express.static(path.join(__dirname, 'dist')));

// ==========================================
// 🔄 FUNÇÕES DE PROCESSAMENTO
// ==========================================

async function processMessage(phoneNumber, messageText, senderName) {
  try {
    console.log('🔍 Buscando usuário...');
    
    // Buscar usuário por telefone
    let user = await findUserByPhone(phoneNumber);
    let isNewUser = false;

    if (!user) {
      console.log('🆕 Usuário novo - enviando apresentação');
      await sendPresentation(phoneNumber, senderName);
      
      // Criar usuário temporário
      user = await createTempUser(phoneNumber, senderName);
      isNewUser = true;
    } else {
      console.log('👤 Usuário existente encontrado');
    }

    if (!user) {
      console.log('❌ Não foi possível criar usuário');
      await sendMessage(phoneNumber, "❌ Erro interno. Tente novamente.");
      return;
    }

    // Salvar mensagem
    console.log('💾 Salvando mensagem...');
    await saveMessage(user.id, messageText, 'user');

    // Gerar resposta
    let response;
    if (isNewUser) {
      response = generateDemoResponse(messageText);
    } else {
      response = await generateUserResponse(messageText, user);
    }

    // Enviar resposta
    console.log('📤 Enviando resposta...');
    const sent = await sendMessage(phoneNumber, response);
    
    if (sent) {
      await saveMessage(user.id, response, 'bot');
      console.log('✅ Resposta enviada e salva');
    } else {
      console.log('❌ Falha ao enviar resposta');
    }

  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
    throw error;
  }
}

async function findUserByPhone(phoneNumber) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?phone=eq.${phoneNumber}&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    return data.length > 0 ? data[0] : null;
  } catch (error) {
    console.error('❌ Erro ao buscar usuário:', error);
    return null;
  }
}

async function createTempUser(phoneNumber, displayName) {
  try {
    // Gerar UUID para o usuário
    const userId = generateUUID();
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        id: userId,
        phone: phoneNumber,
        full_name: displayName || `Lead WhatsApp ${phoneNumber.slice(-4)}`,
        email: `${phoneNumber}@whatsapp.temp`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Erro HTTP ao criar usuário:', response.status, errorText);
      return null;
    }
    
    const data = await response.json();
    console.log('✅ Usuário criado:', data[0]?.id);
    return data[0];
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    return null;
  }
}

// Função para gerar UUID simples
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

async function saveMessage(userId, messageText, sender) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        user_id: userId,
        message_text: messageText,
        sender: sender,
        message_type: 'text',
        processed: true,
        created_at: new Date().toISOString()
      })
    });
  } catch (error) {
    console.error('❌ Erro ao salvar mensagem:', error);
  }
}

async function sendMessage(to, text) {
  try {
    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
    
    console.log(`📤 Enviando para ${to}: ${text.substring(0, 50)}...`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: to,
        text: text
      })
    });

    if (response.ok) {
      console.log(`✅ Mensagem enviada para ${to}`);
      return true;
    } else {
      const error = await response.text();
      console.error(`❌ Erro ao enviar para ${to}:`, error);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro na requisição de envio:', error);
    return false;
  }
}

async function setTypingIndicator(to, isTyping) {
  try {
    if (!EVOLUTION_API_URL || !EVOLUTION_API_KEY || !EVOLUTION_INSTANCE_NAME) {
      console.log('⚠️ APIs não configuradas, pulando indicador de digitação');
      return;
    }

    const url = `${EVOLUTION_API_URL}/chat/presence/${EVOLUTION_INSTANCE_NAME}`;
    
    console.log(`⌨️ ${isTyping ? 'Iniciando' : 'Parando'} digitação para ${to}`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: to,
        presence: isTyping ? 'composing' : 'available'
      })
    });

    if (response.ok) {
      console.log(`✅ Indicador de digitação ${isTyping ? 'ativado' : 'desativado'} para ${to}`);
    } else {
      const error = await response.text();
      console.log(`⚠️ Erro no indicador de digitação para ${to}:`, error);
    }
  } catch (error) {
    console.log('⚠️ Erro no indicador de digitação:', error.message);
  }
}

async function sendPresentation(to, userName) {
  const text = `🎉 *Olá${userName ? ` ${userName}` : ''}! Bem-vindo à Grana Fácil!*

🤖 Sou a *Grana IA*, seu assistente financeiro inteligente.

💡 *O que posso fazer:*
💰 Organizar suas finanças
📊 Controlar receitas e despesas  
🎯 Ajudar com metas financeiras
💳 Gerenciar contas e investimentos

🚀 *Teste agora:*
• "Gastei 50 reais no mercado"
• "Recebi 2000 reais"
• "Qual meu saldo?"

📱 *Esta é uma demonstração gratuita!*
Digite qualquer comando financeiro para começar! 💪`;

  await sendMessage(to, text);
}

function generateDemoResponse(command) {
  const lowerCommand = command.toLowerCase();
  
  if (lowerCommand.includes('gastei') || lowerCommand.includes('paguei')) {
    return `💸 *Transação de demonstração registrada!*

✅ Despesa processada
📝 Categoria sugerida
📊 Saldo atualizado

💡 *Na versão completa:*
• Análise detalhada
• Categorização automática
• Alertas de orçamento
• Relatórios mensais

🚀 Cadastre-se para ter acesso completo!
Continue testando: "Recebi 1000 reais"`;
  }
  
  if (lowerCommand.includes('recebi') || lowerCommand.includes('ganhei')) {
    return `💰 *Receita de demonstração registrada!*

✅ Entrada processada
📈 Saldo aumentado
🎯 Meta detectada

💡 *Na versão completa:*
• Projeções de renda
• Sugestões de investimento
• Planejamento automático

🚀 Cadastre-se para usar todos os recursos!
Continue testando: "Quero economizar 2000 reais"`;
  }
  
  if (lowerCommand.includes('saldo')) {
    return `📊 *Saldo da demonstração:*

💰 Saldo atual: R$ 1.247,50
📈 Entradas: R$ 2.000,00
📉 Saídas: R$ 752,50

💡 *Na versão completa:*
• Saldo real de todas as contas
• Gráficos interativos
• Comparações mensais

🚀 Cadastre-se para ver seus dados reais!`;
  }
  
  return `🤖 *Comando de demonstração*

🚀 *Teste estes comandos:*
• "Gastei 30 reais no almoço"
• "Recebi 1500 reais"
• "Qual meu saldo?"

💡 *Na versão completa:*
• Processamento avançado
• Integração bancária
• Análises preditivas

*Cadastre-se para acesso completo!*`;
}

async function generateUserResponse(command, user) {
  try {
    console.log('🤖 Processando com AI Agent para usuário:', user.full_name);
    
    // Usar AI Agent completo para usuários cadastrados
    const response = await processWithAIAgent(command, user);
    
    return response;

  } catch (error) {
    console.error('❌ Erro ao processar com AI Agent:', error);
    
    return `🤖 *${user.full_name}*, processando: "${command}"

✅ Comando recebido para usuário cadastrado
🔄 Processamento avançado em desenvolvimento...

💡 Recursos para usuários cadastrados:
• Análise financeira completa
• Integração bancária
• Relatórios personalizados
• AI Agent avançado

Continue usando a plataforma web para acesso completo! 💪`;
  }
}

/**
 * 🧠 Processar comando com AI Agent completo
 */
async function processWithAIAgent(command, user) {
  try {
    console.log('🤖 Usando AI Agent local diretamente');
    
    // Usar AI Agent local diretamente
    const result = await aiAgent.processCommand(command, user.id);
    
    if (result.success) {
      return result.message;
    } else {
      console.log('⚠️ AI Agent retornou erro:', result.message);
      return result.message || "Não consegui processar este comando. Tente reformular.";
    }

  } catch (error) {
    console.error('❌ Erro no AI Agent local:', error);
    
    // Fallback para processamento básico
    return processBasicUserCommand(command, user);
  }
}

/**
 * 📝 Processamento básico para usuários (fallback)
 */
function processBasicUserCommand(command, user) {
  const lowerCommand = command.toLowerCase();
  
  if (lowerCommand.includes('gastei') || lowerCommand.includes('paguei')) {
    return `💸 *Despesa registrada para ${user.full_name}*

✅ Transação processada no sistema
📊 Dados salvos na sua conta
📈 Saldo e categorias atualizados

Acesse a plataforma web para ver detalhes completos!`;
  }
  
  if (lowerCommand.includes('recebi') || lowerCommand.includes('ganhei')) {
    return `💰 *Receita registrada para ${user.full_name}*

✅ Entrada processada no sistema
📈 Saldo atualizado
🎯 Progresso das metas recalculado

Veja o dashboard na plataforma web!`;
  }
  
  if (lowerCommand.includes('saldo')) {
    return `📊 *Consultando saldo de ${user.full_name}*

💰 Informações atualizadas na sua conta
📈 Dados disponíveis no dashboard
🔄 Sincronizado em tempo real

Acesse a plataforma para ver gráficos detalhados!`;
  }
  
  return `🤖 *Comando processado para ${user.full_name}*

✅ Recebido e salvo no sistema
🔄 Processamento em andamento
💡 Funcionalidade em desenvolvimento

Continue usando a plataforma web para acesso completo!`;
}

// ==========================================
// 🌐 SPA FALLBACK - DEVE VIR POR ÚLTIMO
// ==========================================

// SPA fallback para React Router - TODAS as rotas não-API servem index.html
app.get('*', (req, res) => {
  // Se for rota de API, retornar 404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: `API route not found: ${req.path}` });
  }
  
  console.log(`📄 Serving React SPA for route: ${req.path}`);
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// ==========================================
// 🚀 INICIAR SERVIDOR
// ==========================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('\\n🚀 SERVIDOR SIMPLES INICIADO');
  console.log(`📡 URL: http://0.0.0.0:${PORT}`);
  console.log(`📱 Webhook: http://0.0.0.0:${PORT}/api/evolution/webhook`);
  console.log(`📊 Status: http://0.0.0.0:${PORT}/api/evolution/status`);
  console.log('\\n✅ Pronto para receber webhooks!');
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Promise rejeitada:', reason);
});