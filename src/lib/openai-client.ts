import OpenAI from 'openai';

// Configuração do cliente OpenAI
const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Só para desenvolvimento - em produção use um backend
});

export interface OpenAICategorizationRequest {
  description: string;
  amount: number;
  type: 'income' | 'expense';
  availableCategories: {
    id: string;
    name: string;
    type: 'income' | 'expense';
    icon: string;
  }[];
  userHistory: {
    description: string;
    category_name: string;
    type: string;
    amount: number;
  }[];
}

export interface OpenAICategorizationResponse {
  categoryName: string;
  confidence: number;
  reasoning: string;
  suggestedDescription?: string;
}

/**
 * Chama a API da OpenAI para categorizar uma transação
 */
export async function categorizeWithOpenAI(
  request: OpenAICategorizationRequest
): Promise<OpenAICategorizationResponse> {
  const { description, amount, type, availableCategories, userHistory } = request;

  // Filtrar categorias do tipo correto
  const relevantCategories = availableCategories.filter(cat => cat.type === type);

  // Construir prompt otimizado para GPT-4o
  const prompt = buildOptimizedPrompt(
    description,
    amount,
    type,
    relevantCategories,
    userHistory
  );

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "Você é um assistente especializado em categorização de transações financeiras brasileiras. Analise com precisão e retorne sempre um JSON válido."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.1, // Baixa temperatura para respostas mais consistentes
      max_tokens: 500,
      response_format: { type: "json_object" } // Garantir resposta em JSON
    });

    const response = completion.choices[0]?.message?.content;
    if (!response) {
      throw new Error('Resposta vazia da OpenAI');
    }

    const parsed = JSON.parse(response);
    
    // Validar se a categoria existe
    const matchedCategory = relevantCategories.find(
      cat => cat.name.toLowerCase() === parsed.categoryName.toLowerCase()
    );

    if (!matchedCategory) {
      // Fallback para primeira categoria disponível
      const fallbackCategory = relevantCategories[0];
      return {
        categoryName: fallbackCategory.name,
        confidence: 0.5,
        reasoning: "Categoria não reconhecida - usando categoria padrão",
        suggestedDescription: description
      };
    }

    return {
      categoryName: matchedCategory.name,
      confidence: Math.min(Math.max(parsed.confidence || 0.8, 0), 1),
      reasoning: parsed.reasoning || "Categorização automática",
      suggestedDescription: parsed.suggestedDescription || description
    };

  } catch (error) {
    console.error('Erro na chamada OpenAI:', error);
    
    // Fallback para lógica local
    return fallbackCategorization(description, relevantCategories);
  }
}

function buildOptimizedPrompt(
  description: string,
  amount: number,
  type: 'income' | 'expense',
  categories: OpenAICategorizationRequest['availableCategories'],
  userHistory: OpenAICategorizationRequest['userHistory']
): string {
  const categoriesText = categories
    .map(c => `"${c.name}" (${c.icon})`)
    .join(', ');

  const historyText = userHistory
    .slice(0, 8)
    .map(h => `"${h.description}" → ${h.category_name}`)
    .join('\n');

  const typeText = type === 'income' ? 'receita' : 'despesa';

  return `
TAREFA: Categorize esta transação financeira brasileira.

TRANSAÇÃO:
- Descrição: "${description}"
- Valor: R$ ${amount.toFixed(2)}
- Tipo: ${typeText}

CATEGORIAS DISPONÍVEIS:
${categoriesText}

HISTÓRICO DO USUÁRIO (últimas transações):
${historyText}

INSTRUÇÕES:
1. Analise a descrição considerando o contexto brasileiro
2. Use o histórico do usuário para entender padrões
3. Escolha a categoria mais adequada da lista
4. Seja preciso com estabelecimentos/serviços brasileiros
5. Considere variações de nome (ex: "Extra" = supermercado)

RESPOSTA (JSON obrigatório):
{
  "categoryName": "nome_exato_da_categoria",
  "confidence": 0.95,
  "reasoning": "Explicação da escolha em português",
  "suggestedDescription": "versão limpa da descrição (opcional)"
}

EXEMPLO:
Para "Paguei R$ 45 no Extra":
{
  "categoryName": "Alimentação",
  "confidence": 0.92,
  "reasoning": "Extra é uma rede de supermercados brasileira, categorizada como Alimentação",
  "suggestedDescription": "Compras no Extra"
}
`;
}

function fallbackCategorization(
  description: string,
  categories: OpenAICategorizationRequest['availableCategories']
): OpenAICategorizationResponse {
  const desc = description.toLowerCase();
  
  // Mapeamento de palavras-chave para categorias
  const keywordMap = {
    'alimentação': ['mercado', 'supermercado', 'extra', 'pão de açúcar', 'carrefour', 'atacadão', 'açougue', 'padaria', 'restaurante', 'lanchonete', 'ifood', 'uber eats'],
    'transporte': ['uber', 'taxi', '99', 'ônibus', 'metro', 'combustível', 'gasolina', 'posto', 'shell', 'petrobras'],
    'saúde': ['farmácia', 'drogaria', 'médico', 'hospital', 'consulta', 'exame', 'laboratorio', 'remédio'],
    'entretenimento': ['cinema', 'netflix', 'spotify', 'amazon prime', 'disney', 'jogo', 'steam', 'teatro'],
    'casa': ['casa', 'móveis', 'decoração', 'condomínio', 'iptu', 'limpeza', 'casas bahia'],
    'educação': ['curso', 'faculdade', 'escola', 'livro', 'material escolar', 'estácio', 'uninove'],
    'telefone': ['tim', 'vivo', 'claro', 'oi', 'internet', 'telefone', 'celular'],
    'salário': ['salário', 'salario', 'pagamento', 'empresa', 'trabalho', 'honorários'],
    'freelance': ['freelance', 'freela', 'projeto', 'serviço', 'consultoria']
  };

  // Procurar categoria baseada em palavras-chave
  for (const [categoryType, keywords] of Object.entries(keywordMap)) {
    if (keywords.some(keyword => desc.includes(keyword))) {
      const matchedCategory = categories.find(cat => 
        cat.name.toLowerCase().includes(categoryType)
      );
      
      if (matchedCategory) {
        return {
          categoryName: matchedCategory.name,
          confidence: 0.75,
          reasoning: `Identificada por palavra-chave: ${categoryType}`,
          suggestedDescription: description
        };
      }
    }
  }

  // Fallback para primeira categoria
  const fallbackCategory = categories[0];
  return {
    categoryName: fallbackCategory.name,
    confidence: 0.5,
    reasoning: "Não foi possível identificar categoria específica",
    suggestedDescription: description
  };
}

/**
 * Função auxiliar para validar se a API key está configurada
 */
export function validateOpenAIConfig(): boolean {
  return !!import.meta.env.VITE_OPENAI_API_KEY;
}

/**
 * Função para estimar custo da chamada
 */
export function estimateTokenCost(prompt: string): number {
  // Estimativa aproximada: 1 token ≈ 4 caracteres
  const estimatedTokens = prompt.length / 4;
  const inputCost = (estimatedTokens / 1000) * 0.005; // $0.005 per 1K tokens input
  const outputCost = (200 / 1000) * 0.015; // $0.015 per 1K tokens output (estimativa)
  
  return inputCost + outputCost;
}