import { supabase } from '@/integrations/supabase/client';
import type { OpenAICategorizationRequest } from './openai-client';

export interface TransactionContext {
  description: string;
  amount: number;
  availableCategories: {
    id: string;
    name: string;
    type: 'income' | 'expense';
    icon: string;
  }[];
  userId: string;
}

export interface AICategorizationResult {
  categoryId: string;
  categoryName: string;
  confidence: number;
  reasoning: string;
  type: 'income' | 'expense';
}

/**
 * Usa IA para categorizar transações automaticamente
 * baseado na descrição e contexto do usuário
 */
export async function categorizeTransactionWithAI(
  context: TransactionContext
): Promise<AICategorizationResult> {
  const { description, amount, availableCategories, userId } = context;

  // Buscar histórico de transações similares do usuário para contexto
  const { data: userHistory } = await supabase
    .from('transactions_with_category')
    .select('description, category_name, type, amount')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  // Preparar prompt para IA
  const prompt = buildCategorizationPrompt(
    description,
    amount,
    availableCategories,
    userHistory || []
  );

  try {
    // Simular chamada para IA (substitua pela API real)
    const aiResult = await callAIService(prompt);
    
    return parseAIResponse(aiResult, availableCategories);
  } catch (error) {
    console.error('Erro na categorização por IA:', error);
    
    // Fallback: usar lógica simples baseada em palavras-chave
    return fallbackCategorization(description, amount, availableCategories);
  }
}

function buildCategorizationPrompt(
  description: string,
  amount: number,
  categories: TransactionContext['availableCategories'],
  userHistory: any[]
): string {
  const categoriesText = categories
    .map(c => `${c.name} (${c.type}) - ${c.icon}`)
    .join('\n');

  const historyText = userHistory
    .slice(0, 10)
    .map(h => `"${h.description}" → ${h.category_name} (${h.type})`)
    .join('\n');

  return `
Você é um assistente de IA especializado em categorização de transações financeiras.

CONTEXTO:
- Descrição da transação: "${description}"
- Valor: R$ ${amount.toFixed(2)}
- Tipo esperado: ${amount > 0 ? 'income (receita)' : 'expense (despesa)'}

CATEGORIAS DISPONÍVEIS:
${categoriesText}

HISTÓRICO RECENTE DO USUÁRIO:
${historyText}

TAREFA:
Analise a transação e escolha a categoria mais adequada baseando-se em:
1. Descrição da transação
2. Valor e tipo (receita/despesa)
3. Padrões do histórico do usuário
4. Senso comum financeiro

RESPOSTA ESPERADA (formato JSON):
{
  "categoryName": "nome_da_categoria",
  "confidence": 0.95,
  "reasoning": "Explicação da escolha",
  "type": "income|expense"
}

Seja preciso e considere o contexto brasileiro (nomes de estabelecimentos, serviços, etc.).
`;
}

async function callAIService(prompt: string): Promise<string> {
  // Importar o cliente OpenAI dinamicamente
  const { categorizeWithOpenAI, validateOpenAIConfig } = await import('./openai-client');
  
  // Verificar se OpenAI está configurado
  if (!validateOpenAIConfig()) {
    console.warn('OpenAI não configurado, usando fallback');
    return simulateAIResponse(prompt);
  }

  // Extrair dados do prompt para chamada OpenAI
  const parsedData = extractDataFromPrompt(prompt);
  
  try {
    const result = await categorizeWithOpenAI({
      description: parsedData.description,
      amount: parsedData.amount,
      type: parsedData.type,
      availableCategories: parsedData.categories,
      userHistory: parsedData.userHistory
    });

    return JSON.stringify({
      categoryName: result.categoryName,
      confidence: result.confidence,
      reasoning: result.reasoning,
      type: parsedData.type
    });
  } catch (error) {
    console.error('Erro na chamada OpenAI:', error);
    return simulateAIResponse(prompt);
  }
}

function simulateAIResponse(prompt: string): string {
  // Extrai a descrição do prompt
  const descriptionMatch = prompt.match(/Descrição da transação: "([^"]+)"/);
  const description = descriptionMatch?.[1]?.toLowerCase() || '';
  
  // Extrai valor
  const amountMatch = prompt.match(/Valor: R\$ ([\d.,-]+)/);
  const amount = parseFloat(amountMatch?.[1]?.replace(',', '.') || '0');
  
  // Lógica de categorização baseada em palavras-chave
  const categoryMappings = [
    // Alimentação
    { keywords: ['mercado', 'supermercado', 'açougue', 'padaria', 'restaurante', 'lanchonete', 'ifood', 'uber eats', 'pizza', 'hamburguer'], category: 'Alimentação', type: 'expense' },
    
    // Transporte
    { keywords: ['uber', 'taxi', '99', 'ônibus', 'metro', 'combustível', 'gasolina', 'etanol', 'posto'], category: 'Transporte', type: 'expense' },
    
    // Saúde
    { keywords: ['farmácia', 'médico', 'hospital', 'consulta', 'exame', 'laboratório', 'remédio', 'medicamento'], category: 'Saúde', type: 'expense' },
    
    // Entretenimento
    { keywords: ['cinema', 'teatro', 'netflix', 'spotify', 'amazon prime', 'disney', 'jogo', 'steam'], category: 'Entretenimento', type: 'expense' },
    
    // Casa
    { keywords: ['supermercado', 'casa', 'móveis', 'decoração', 'limpeza', 'condomínio', 'iptu'], category: 'Casa', type: 'expense' },
    
    // Educação
    { keywords: ['curso', 'faculdade', 'universidade', 'livro', 'escola', 'material escolar'], category: 'Educação', type: 'expense' },
    
    // Telefone/Internet
    { keywords: ['tim', 'vivo', 'claro', 'oi', 'internet', 'telefone', 'celular'], category: 'Telefone', type: 'expense' },
    
    // Renda
    { keywords: ['salário', 'freelance', 'trabalho', 'pagamento', 'honorários', 'comissão'], category: 'Salário', type: 'income' },
    
    // Vendas
    { keywords: ['venda', 'mercado livre', 'olx', 'vendeu', 'produto'], category: 'Vendas', type: 'income' }
  ];

  // Encontrar categoria baseada em palavras-chave
  for (const mapping of categoryMappings) {
    if (mapping.keywords.some(keyword => description.includes(keyword))) {
      return JSON.stringify({
        categoryName: mapping.category,
        confidence: 0.85,
        reasoning: `Identificada transação do tipo "${mapping.category}" baseada na descrição "${description}"`,
        type: mapping.type
      });
    }
  }

  // Categoria padrão baseada no valor
  const defaultCategory = amount > 0 ? 'Outros' : 'Outros';
  const defaultType = amount > 0 ? 'income' : 'expense';
  
  return JSON.stringify({
    categoryName: defaultCategory,
    confidence: 0.6,
    reasoning: `Categoria padrão aplicada - não foi possível determinar categoria específica`,
    type: defaultType
  });
}

function parseAIResponse(
  response: string,
  categories: TransactionContext['availableCategories']
): AICategorizationResult {
  try {
    const parsed = JSON.parse(response);
    
    // Encontrar categoria correspondente
    const matchedCategory = categories.find(
      c => c.name.toLowerCase() === parsed.categoryName.toLowerCase() &&
           c.type === parsed.type
    );

    if (!matchedCategory) {
      throw new Error('Categoria não encontrada');
    }

    return {
      categoryId: matchedCategory.id,
      categoryName: matchedCategory.name,
      confidence: parsed.confidence || 0.8,
      reasoning: parsed.reasoning || 'Categorização automática',
      type: parsed.type
    };
  } catch (error) {
    console.error('Erro ao parsear resposta da IA:', error);
    throw error;
  }
}

function fallbackCategorization(
  description: string,
  amount: number,
  categories: TransactionContext['availableCategories']
): AICategorizationResult {
  const type = amount > 0 ? 'income' : 'expense';
  
  // Pegar primeira categoria do tipo correto
  const fallbackCategory = categories.find(c => c.type === type) || categories[0];
  
  return {
    categoryId: fallbackCategory.id,
    categoryName: fallbackCategory.name,
    confidence: 0.5,
    reasoning: 'Categoria padrão - sistema de backup',
    type: type as 'income' | 'expense'
  };
}

/**
 * Função para melhorar a IA com feedback do usuário
 */
export async function provideFeedback(
  transactionId: string,
  correctCategoryId: string,
  wasCorrect: boolean
): Promise<void> {
  // TODO: Implementar sistema de feedback para melhorar a IA
  // Pode armazenar em uma tabela separada para treinamento
  
  console.log('Feedback recebido:', {
    transactionId,
    correctCategoryId,
    wasCorrect
  });
}

/**
 * Função auxiliar para extrair dados do prompt antigo
 */
function extractDataFromPrompt(prompt: string): {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  categories: TransactionContext['availableCategories'];
  userHistory: OpenAICategorizationRequest['userHistory'];
} {
  // Extrair descrição
  const descriptionMatch = prompt.match(/Descrição da transação: "([^"]+)"/);
  const description = descriptionMatch?.[1] || '';

  // Extrair valor
  const amountMatch = prompt.match(/Valor: R\$ ([\d.,-]+)/);
  const amount = parseFloat(amountMatch?.[1]?.replace(',', '.') || '0');

  // Extrair tipo
  const typeMatch = prompt.match(/Tipo esperado: (\w+)/);
  const typeRaw = typeMatch?.[1] || 'expense';
  const type = typeRaw === 'income' ? 'income' : 'expense';

  // Extrair categorias (formato simplificado)
  const categoriesSection = prompt.match(/CATEGORIAS DISPONÍVEIS:\n(.*?)\n\n/s)?.[1] || '';
  const categories = categoriesSection.split('\n').map(line => {
    const match = line.match(/^(.+) \((\w+)\) - (.+)$/);
    if (match) {
      return {
        id: match[1].toLowerCase().replace(/\s+/g, '_'),
        name: match[1],
        type: match[2] as 'income' | 'expense',
        icon: match[3]
      };
    }
    return null;
  }).filter(Boolean) as TransactionContext['availableCategories'];

  // Extrair histórico
  const historySection = prompt.match(/HISTÓRICO RECENTE DO USUÁRIO:\n(.*?)\n\n/s)?.[1] || '';
  const userHistory = historySection.split('\n').map(line => {
    const match = line.match(/^"([^"]+)" → (.+) \((\w+)\)$/);
    if (match) {
      return {
        description: match[1],
        category_name: match[2],
        type: match[3],
        amount: 0 // Não disponível no prompt antigo
      };
    }
    return null;
  }).filter(Boolean) as OpenAICategorizationRequest['userHistory'];

  return {
    description,
    amount,
    type,
    categories,
    userHistory
  };
}