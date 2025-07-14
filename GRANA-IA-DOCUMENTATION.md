# 🤖 GRANA IA - Documentação Completa

## 🚀 Visão Geral

A **Grana IA** é um agente de inteligência artificial super avançado, powered by **GPT-4o**, que revoluciona o controle financeiro pessoal. O sistema processa linguagem natural em português brasileiro e executa ações financeiras automaticamente.

## ✨ Recursos Principais

### 🧠 **Inteligência Artificial Avançada**
- **GPT-4o** com prompts otimizados para contexto brasileiro
- Processamento de linguagem natural em português
- Análise contextual baseada no histórico do usuário
- Confiança e reasoning detalhados para cada ação

### 💰 **Gestão Financeira Automática**
- **Transações inteligentes**: Criação automática com categorização
- **Categorias dinâmicas**: Criação automática baseada em padrões
- **Metas personalizadas**: Sugestões baseadas no perfil financeiro
- **Conselhos inteligentes**: Análise de padrões e sugestões

### 📱 **Integração WhatsApp Completa**
- Interface de chat moderna no webapp
- Webhook para WhatsApp Business API real
- Processamento em tempo real de mensagens
- Suporte a múltiplos usuários simultâneos

## 🏗️ Arquitetura do Sistema

### **Core Components**

#### `AIFinancialAgent` (`src/lib/ai-agent.ts`)
```typescript
// Agente principal da IA
class AIFinancialAgent {
  async processCommand(message: string): Promise<AIAgentResponse>
  private analyzeIntent(message: string): Promise<any>
  private executeActions(analysis: any): Promise<AIAgentResponse>
}
```

**Capacidades:**
- ✅ Processar transações em linguagem natural
- ✅ Criar categorias automaticamente
- ✅ Sugerir e criar metas financeiras
- ✅ Analisar padrões de gastos
- ✅ Dar conselhos financeiros personalizados
- ✅ Gerenciar contas a pagar/receber

#### `useAIAgent` (`src/hooks/useAIAgent.ts`)
```typescript
// Hook React para integração com a IA
const {
  processCommand,
  processChatMessage,
  analyzeFinancialPatterns,
  suggestSmartGoals,
  organizeCategories,
  getFinancialInsights
} = useAIAgent();
```

#### `WhatsAppWebhookService` (`src/lib/whatsapp-webhook.ts`)
```typescript
// Serviço completo de webhook WhatsApp
class WhatsAppWebhookService {
  verifyWebhook(mode, token, challenge): string | null
  processWebhook(payload): Promise<void>
  sendMessage(to, phoneNumberId, text): Promise<boolean>
}
```

## 💬 Exemplos de Comandos

### **Transações**
```
Usuário: "Gastei 50 reais no Pão de Açúcar comprando comida"
Grana IA: "💸 Transação criada: Compras no Pão de Açúcar - R$ 50,00
📂 Categoria: Alimentação (95% confiança)
🤖 Análise: Pão de Açúcar é uma rede de supermercados brasileira"

Usuário: "Recebi meu salário de 3000 reais"
Grana IA: "💰 Receita adicionada: Salário - R$ 3.000,00
📂 Categoria: Salário (98% confiança)
💡 Sugestão: Considere criar uma meta de economia mensal"
```

### **Metas Financeiras**
```
Usuário: "Quero economizar 10000 reais em 12 meses para uma viagem"
Grana IA: "🎯 Meta criada: Viagem - R$ 10.000,00
📅 Prazo: 12 meses (R$ 833,33/mês)
💡 Análise: Com sua renda atual, é uma meta realizável
🚀 Dica: Configure uma transferência automática mensal"
```

### **Categorias Automáticas**
```
Usuário: "Crie uma categoria para gastos com meus pets"
Grana IA: "🏷️ Categoria criada: Pets 🐕
💰 Orçamento sugerido: R$ 200,00/mês
📊 Baseado em: Padrões de gastos similares
✨ Status: Ativa e pronta para uso"
```

### **Análises e Conselhos**
```
Usuário: "Como estão meus gastos este mês?"
Grana IA: "📊 Análise Financeira de Novembro:

💰 Receitas: R$ 3.000,00
💸 Despesas: R$ 2.100,00
💵 Economia: R$ 900,00 (30%)

🏆 Top Categorias:
• Alimentação: R$ 800,00 (38%)
• Transporte: R$ 500,00 (24%)
• Lazer: R$ 300,00 (14%)

💡 Insights:
✅ Você está economizando bem!
⚠️ Gastos com alimentação acima do ideal
🎯 Sugestão: Considere meal prep para reduzir custos"
```

## 🛠️ Implementação Técnica

### **1. Configuração Inicial**

#### Variáveis de Ambiente
```env
# OpenAI
VITE_OPENAI_API_KEY=sk-your-openai-key

# Supabase
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key

# WhatsApp (opcional)
VITE_WHATSAPP_ACCESS_TOKEN=your-meta-business-token
VITE_WHATSAPP_PHONE_NUMBER_ID=your-phone-number-id
VITE_WHATSAPP_VERIFY_TOKEN=granaboard_webhook_verify
VITE_WHATSAPP_WEBHOOK_URL=https://your-domain.com/api/whatsapp/webhook
```

### **2. Uso da Grana IA**

#### No Frontend (React)
```typescript
import { useAIAgent } from '@/hooks/useAIAgent';

function ChatComponent() {
  const { processChatMessage, isProcessing } = useAIAgent();
  
  const handleMessage = async (message: string) => {
    const response = await processChatMessage(message);
    console.log(response.botMessage);
  };
}
```

#### Processamento Direto
```typescript
import { aiAgent } from '@/lib/ai-agent';

const response = await aiAgent.processCommand(
  "Gastei 75 reais no Carrefour comprando alimentos"
);

console.log(response.message); // Resposta da IA
console.log(response.actions); // Ações executadas
console.log(response.confidence); // Nível de confiança
```

### **3. Configuração do Webhook WhatsApp**

#### Meta Developers Console
1. Acesse [developers.facebook.com](https://developers.facebook.com)
2. Crie um app "Business"
3. Adicione "WhatsApp Business API"
4. Configure:
   - **Webhook URL**: `https://seu-dominio.com/api/whatsapp/webhook`
   - **Verify Token**: `granaboard_webhook_verify`
   - **Webhook Fields**: `messages`

#### Implementação do Endpoint
```typescript
// Exemplo para Next.js API Route
export default async function handler(req, res) {
  const whatsappService = createWhatsAppWebhookService();
  
  if (req.method === 'GET') {
    // Verificação do webhook
    const result = whatsappService.verifyWebhook(
      req.query['hub.mode'],
      req.query['hub.verify_token'],
      req.query['hub.challenge']
    );
    return res.status(200).send(result);
  }
  
  if (req.method === 'POST') {
    // Processar mensagens
    await whatsappService.processWebhook(req.body);
    return res.status(200).json({ success: true });
  }
}
```

## 📊 Banco de Dados

### **Tabelas Principais**
- `users`: Usuários do sistema
- `transactions`: Transações financeiras
- `categories`: Categorias de gastos/receitas
- `goals`: Metas financeiras
- `bills`: Contas a pagar/receber
- `whatsapp_messages`: Histórico de conversas

### **Views Otimizadas**
- `transactions_with_category`: Transações com dados da categoria
- `monthly_summary`: Resumo mensal por usuário
- `goal_progress`: Progresso das metas
- `upcoming_bills`: Contas próximas do vencimento

### **Functions**
- `get_user_balance(user_id)`: Calcula saldo total
- `get_monthly_spending_by_category(user_id, month)`: Gastos por categoria
- `process_whatsapp_transaction(user_id, message)`: Processa transação via WhatsApp

## 🔧 Configuração Avançada

### **Personalização de Prompts**
O sistema permite personalização dos prompts da IA editando `buildAnalysisPrompt()` em `ai-agent.ts`:

```typescript
private buildAnalysisPrompt(message: string): string {
  return `
CONTEXTO PERSONALIZADO:
- Foco em economia familiar
- Priorizar categorias de alimentação e educação
- Sugerir metas conservadoras

MENSAGEM: "${message}"
...
  `;
}
```

### **Extensão de Funcionalidades**
Para adicionar novas capacidades:

1. **Novo tipo de ação** em `AIAction`
2. **Implementar handler** em `executeAction()`
3. **Atualizar prompts** para reconhecer novos comandos

```typescript
// Exemplo: Adicionar sugestões de investimento
case 'investment_suggestion':
  return this.suggestInvestments(data);
```

## 🚀 Deploy e Produção

### **Frontend (Vercel/Netlify)**
```bash
npm run build
npm run preview  # Testar build local
# Deploy automático via Git
```

### **Backend do Webhook**
- **Vercel Functions**: Automático com Next.js
- **Netlify Functions**: Arquivo em `netlify/functions/`
- **Railway/Render**: Deploy direto do repositório

### **Monitoramento**
- Logs de conversas no Supabase
- Métricas de uso da OpenAI API
- Status de webhooks do WhatsApp

## 📱 Teste em Desenvolvimento

### **Chat Local**
1. Configure `VITE_OPENAI_API_KEY`
2. Execute `npm run dev`
3. Acesse `/whatsapp` no app
4. Teste comandos na interface

### **Webhook Local**
1. Instale ngrok: `npm install -g ngrok`
2. Execute seu servidor: `npm run dev`
3. Execute ngrok: `ngrok http 3000`
4. Use URL do ngrok no Meta Developers

### **Comandos de Teste**
```
✅ "Gastei 45 reais no Extra comprando frutas"
✅ "Recebi 2500 de freelance hoje"
✅ "Quero juntar 8000 reais em 10 meses"
✅ "Crie uma categoria para gastos médicos"
✅ "Como estão minhas finanças?"
✅ "Me dê conselhos para economizar"
```

## 🔒 Segurança

### **API Keys**
- Nunca commitar keys no repositório
- Usar variáveis de ambiente
- Rotacionar tokens regularmente

### **Webhook Security**
- Verificar `verify_token` do WhatsApp
- Validar origem das requisições
- Rate limiting para evitar spam

### **Dados do Usuário**
- RLS (Row Level Security) no Supabase
- Criptografia de dados sensíveis
- LGPD compliance para dados brasileiros

## 🎯 Roadmap

### **Próximas Features**
- [ ] Análise de documentos (extratos PDF)
- [ ] Integração com bancos via Open Banking
- [ ] Relatórios visuais avançados
- [ ] Machine Learning para previsões
- [ ] App mobile nativo
- [ ] Multi-idiomas (inglês, espanhol)

### **Melhorias da IA**
- [ ] Fine-tuning com dados do usuário
- [ ] Análise de sentimento financeiro
- [ ] Detecção de fraudes
- [ ] Conselhos de investimento personalizados

---

## 🆘 Suporte

### **Documentação**
- Código bem documentado em TypeScript
- Exemplos práticos em cada módulo
- Testes unitários (TODO)

### **Community**
- Issues no GitHub
- Discord/Slack para desenvolvedores
- Wiki colaborativa

### **Contato**
- 📧 Email: suporte@granaboard.com
- 💬 WhatsApp: +55 11 99999-9999
- 🌐 Site: https://granaboard.com

---

**🎉 A Grana IA está pronta para revolucionar como você gerencia suas finanças!**