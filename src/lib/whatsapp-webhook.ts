import { supabase } from '@/integrations/supabase/client';
import { aiAgent } from '@/lib/ai-agent';

export interface WhatsAppWebhookPayload {
  object: string;
  entry: WhatsAppEntry[];
}

export interface WhatsAppEntry {
  id: string;
  changes: WhatsAppChange[];
}

export interface WhatsAppChange {
  value: {
    messaging_product: string;
    metadata: {
      display_phone_number: string;
      phone_number_id: string;
    };
    messages?: WhatsAppMessage[];
    statuses?: WhatsAppStatus[];
  };
  field: string;
}

export interface WhatsAppMessage {
  from: string;
  id: string;
  timestamp: string;
  text?: {
    body: string;
  };
  type: 'text' | 'image' | 'audio' | 'video';
}

export interface WhatsAppStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
}

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  verifyToken: string;
  webhookUrl: string;
}

/**
 * 📱 SERVIÇO DE WEBHOOK WHATSAPP
 * Gerencia integração completa com WhatsApp Business API
 */
export class WhatsAppWebhookService {
  private config: WhatsAppConfig;

  constructor(config: WhatsAppConfig) {
    this.config = config;
  }

  /**
   * 🔐 Verificar webhook do WhatsApp
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.config.verifyToken) {
      console.log('✅ Webhook do WhatsApp verificado com sucesso');
      return challenge;
    } else {
      console.log('❌ Falha na verificação do webhook do WhatsApp');
      return null;
    }
  }

  /**
   * 📨 Processar webhook recebido
   */
  async processWebhook(payload: WhatsAppWebhookPayload): Promise<void> {
    try {
      // Verificar se é uma mensagem do WhatsApp
      if (payload.object !== 'whatsapp_business_account') {
        console.log('❌ Payload não é do WhatsApp Business');
        return;
      }

      for (const entry of payload.entry) {
        for (const change of entry.changes) {
          if (change.field === 'messages' && change.value.messages) {
            for (const message of change.value.messages) {
              await this.processIncomingMessage(message, change.value.metadata.phone_number_id);
            }
          }
        }
      }
    } catch (error) {
      console.error('❌ Erro ao processar webhook:', error);
    }
  }

  /**
   * 💬 Processar mensagem recebida
   */
  private async processIncomingMessage(message: WhatsAppMessage, phoneNumberId: string): Promise<void> {
    try {
      // Verificar se é mensagem de texto
      if (message.type !== 'text' || !message.text?.body) {
        await this.sendMessage(
          message.from,
          phoneNumberId,
          "🤖 Olá! Sou a Grana IA. No momento, processamos apenas mensagens de texto. Tente enviar comandos como:\n\n• Gastei R$ 50 no mercado\n• Recebi R$ 2000 de salário\n• Qual meu saldo?\n• Quero economizar 5000 reais"
        );
        return;
      }

      // Buscar ou criar usuário baseado no número do WhatsApp
      const user = await this.findOrCreateUser(message.from);
      if (!user) {
        await this.sendMessage(
          message.from,
          phoneNumberId,
          "❌ Erro interno. Não foi possível identificar seu usuário. Entre em contato com o suporte."
        );
        return;
      }

      // Salvar mensagem recebida no banco
      await this.saveMessage(user.id, message.text.body, 'user');

      // Processar com o agente IA
      const response = await aiAgent.processCommand(message.text.body);

      // Enviar resposta
      await this.sendMessage(message.from, phoneNumberId, response.message);

      // Salvar resposta no banco
      await this.saveMessage(user.id, response.message, 'bot');

      // Log de sucesso
      console.log(`✅ Mensagem processada para ${message.from}: ${message.text.body}`);

    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      
      // Enviar mensagem de erro para o usuário
      await this.sendMessage(
        message.from,
        phoneNumberId,
        "❌ Desculpe, ocorreu um erro interno. Tente novamente em alguns instantes ou entre em contato com o suporte."
      );
    }
  }

  /**
   * 👤 Buscar ou criar usuário pelo número do WhatsApp
   */
  private async findOrCreateUser(phoneNumber: string): Promise<any> {
    try {
      // Primeiro, tentar encontrar usuário existente
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phoneNumber)
        .single();

      if (existingUser) {
        return existingUser;
      }

      // Se não existe, criar novo usuário
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          phone: phoneNumber,
          full_name: `Usuário WhatsApp ${phoneNumber.slice(-4)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar usuário:', error);
        return null;
      }

      // Criar categorias padrão para o novo usuário
      await supabase.rpc('create_default_categories', { user_id: newUser.id });

      console.log(`✅ Novo usuário criado: ${phoneNumber}`);
      return newUser;

    } catch (error) {
      console.error('❌ Erro ao buscar/criar usuário:', error);
      return null;
    }
  }

  /**
   * 💾 Salvar mensagem no banco de dados
   */
  private async saveMessage(userId: string, messageText: string, sender: 'user' | 'bot'): Promise<void> {
    try {
      await supabase
        .from('whatsapp_messages')
        .insert({
          user_id: userId,
          message_text: messageText,
          sender: sender,
          message_type: 'text',
          processed: true,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('❌ Erro ao salvar mensagem:', error);
    }
  }

  /**
   * 📤 Enviar mensagem para o WhatsApp
   */
  async sendMessage(to: string, phoneNumberId: string, text: string): Promise<boolean> {
    try {
      const url = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
      
      const payload = {
        messaging_product: 'whatsapp',
        to: to,
        type: 'text',
        text: {
          body: text
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`✅ Mensagem enviada para ${to}`);
        return true;
      } else {
        const error = await response.text();
        console.error('❌ Erro ao enviar mensagem:', error);
        return false;
      }
    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      return false;
    }
  }

  /**
   * 📊 Enviar template de boas-vindas
   */
  async sendWelcomeMessage(to: string, phoneNumberId: string, userName?: string): Promise<boolean> {
    const welcomeText = `🎉 Bem-vindo${userName ? ` ${userName}` : ''} à *Grana IA*!

🤖 Sou seu assistente financeiro inteligente, powered by GPT-4o.

💡 *O que posso fazer por você:*

💰 Processar transações em linguagem natural
🏷️ Criar categorias automaticamente  
🎯 Sugerir metas personalizadas
📊 Analisar seus gastos
💳 Gerenciar contas e investimentos

🚀 *Comandos de exemplo:*
• "Gastei 50 reais no Carrefour"
• "Recebi meu salário de 3000 reais"
• "Quero economizar 10000 reais em 6 meses"
• "Qual meu saldo atual?"
• "Me dê conselhos financeiros"

Digite qualquer comando para começar! 💪`;

    return await this.sendMessage(to, phoneNumberId, welcomeText);
  }

  /**
   * 📈 Enviar relatório financeiro
   */
  async sendFinancialReport(to: string, phoneNumberId: string, userId: string): Promise<boolean> {
    try {
      // Buscar dados financeiros do usuário
      const [balanceResult, transactionsResult] = await Promise.all([
        supabase.rpc('get_user_balance', { input_user_id: userId }),
        supabase.from('monthly_summary').select('*').eq('user_id', userId).single()
      ]);

      const balance = balanceResult.data || 0;
      const summary = transactionsResult.data;

      const reportText = `📊 *Seu Relatório Financeiro*

💰 *Saldo Atual:* R$ ${balance.toFixed(2)}

📈 *Este Mês:*
• Receitas: R$ ${summary?.total_income?.toFixed(2) || '0,00'}
• Despesas: R$ ${summary?.total_expenses?.toFixed(2) || '0,00'}
• Saldo Mensal: R$ ${summary?.net_income?.toFixed(2) || '0,00'}
• Transações: ${summary?.transaction_count || 0}

${summary?.net_income > 0 ? '🎯 Parabéns! Você está economizando este mês!' : '⚠️ Atenção: revise seus gastos este mês.'}

💡 Digite "conselhos" para dicas personalizadas!`;

      return await this.sendMessage(to, phoneNumberId, reportText);
    } catch (error) {
      console.error('❌ Erro ao gerar relatório:', error);
      return false;
    }
  }
}

/**
 * 🌐 Configuração padrão do webhook
 */
export const createWhatsAppWebhookService = (): WhatsAppWebhookService => {
  const config: WhatsAppConfig = {
    accessToken: import.meta.env.VITE_WHATSAPP_ACCESS_TOKEN || '',
    phoneNumberId: import.meta.env.VITE_WHATSAPP_PHONE_NUMBER_ID || '',
    verifyToken: import.meta.env.VITE_WHATSAPP_VERIFY_TOKEN || 'grana_facil_webhook_verify',
    webhookUrl: import.meta.env.VITE_WHATSAPP_WEBHOOK_URL || ''
  };

  return new WhatsAppWebhookService(config);
};

/**
 * 🔧 Utilitários para configuração
 */
export const getWebhookSetupInstructions = (): string => {
  return `
🔧 **INSTRUÇÕES DE CONFIGURAÇÃO DO WEBHOOK WHATSAPP**

1️⃣ **Configurar variáveis de ambiente:**
   - VITE_WHATSAPP_ACCESS_TOKEN: Token de acesso do Meta Business
   - VITE_WHATSAPP_PHONE_NUMBER_ID: ID do número do WhatsApp Business
   - VITE_WHATSAPP_VERIFY_TOKEN: Token de verificação (use: grana_facil_webhook_verify)
   - VITE_WHATSAPP_WEBHOOK_URL: URL pública do seu webhook

2️⃣ **Configurar webhook no Meta Developers:**
   - URL: https://seu-dominio.com/api/whatsapp/webhook
   - Verify Token: grana_facil_webhook_verify
   - Campos: messages, message_deliveries

3️⃣ **Implementar endpoint no backend:**
   - GET /api/whatsapp/webhook (verificação)
   - POST /api/whatsapp/webhook (recebimento de mensagens)

4️⃣ **Testar integração:**
   - Envie mensagem de teste para o número do WhatsApp Business
   - Verifique logs no console/banco de dados

📱 **Exemplo de uso:**
   Usuário envia: "Gastei 50 reais no mercado"
   Grana IA responde: "💸 Transação criada: Compras no mercado - R$ 50,00..."
`;
};

export default WhatsAppWebhookService;