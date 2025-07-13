import { supabase } from '@/integrations/supabase/client';
import { aiAgent } from '@/lib/ai-agent';
import { getCurrentUser } from '@/lib/auth';

/**
 * 📱 EVOLUTION API WEBHOOK TYPES
 * Estruturas específicas da Evolution API
 */
export interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: EvolutionMessageData | EvolutionStatusData;
}

export interface EvolutionMessageData {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation?: string;
    extendedTextMessage?: {
      text: string;
    };
  };
  messageTimestamp: number;
  pushName?: string;
  participant?: string;
}

export interface EvolutionStatusData {
  remoteJid: string;
  status: 'pending' | 'server' | 'delivery' | 'read' | 'played';
  participant?: string;
}

export interface EvolutionConfig {
  baseUrl: string;
  apiKey: string;
  instanceName: string;
  webhookUrl: string;
}

/**
 * 🤖 SERVIÇO DE WEBHOOK EVOLUTION API
 * Gerencia integração completa com Evolution API para WhatsApp
 */
export class EvolutionWebhookService {
  private config: EvolutionConfig;

  constructor(config: EvolutionConfig) {
    this.config = config;
  }

  /**
   * 📨 Processar webhook recebido da Evolution API
   */
  async processWebhook(payload: EvolutionWebhookPayload): Promise<void> {
    try {
      console.log('📱 Webhook recebido:', payload.event, payload.instance);

      // Processar diferentes tipos de eventos
      switch (payload.event) {
        case 'messages.upsert':
          await this.processIncomingMessage(payload.data as EvolutionMessageData);
          break;
        
        case 'messages.update':
          console.log('📊 Status de mensagem atualizado');
          break;
        
        case 'connection.update':
          console.log('🔄 Status de conexão atualizado');
          break;
        
        default:
          console.log(`⚠️ Evento não tratado: ${payload.event}`);
      }
    } catch (error) {
      console.error('❌ Erro ao processar webhook:', error);
    }
  }

  /**
   * 💬 Processar mensagem recebida
   */
  private async processIncomingMessage(messageData: EvolutionMessageData): Promise<void> {
    try {
      // Verificar se a mensagem é de entrada (não enviada por nós)
      if (messageData.key.fromMe) {
        console.log('📤 Mensagem enviada por nós, ignorando');
        return;
      }

      // Extrair texto da mensagem
      const messageText = messageData.message.conversation || 
                         messageData.message.extendedTextMessage?.text;

      if (!messageText) {
        console.log('❌ Mensagem sem texto, ignorando');
        return;
      }

      // Limpar número de telefone (remover @s.whatsapp.net)
      const phoneNumber = messageData.key.remoteJid.replace('@s.whatsapp.net', '');
      const senderName = messageData.pushName || `Usuário ${phoneNumber.slice(-4)}`;

      console.log(`📨 Mensagem de ${senderName} (${phoneNumber}): ${messageText}`);

      // Buscar ou criar usuário baseado no número do WhatsApp
      const user = await this.findOrCreateUser(phoneNumber, senderName);
      if (!user) {
        await this.sendMessage(
          phoneNumber,
          "❌ Erro interno. Não foi possível identificar seu usuário. Entre em contato com o suporte."
        );
        return;
      }

      // Salvar mensagem recebida no banco
      await this.saveMessage(user.id, messageText, 'user');

      // Processar com o agente IA
      console.log('🤖 Processando com IA Agent...');
      const response = await aiAgent.processCommand(messageText);

      // Enviar resposta
      await this.sendMessage(phoneNumber, response.message);

      // Salvar resposta no banco
      await this.saveMessage(user.id, response.message, 'bot');

      console.log(`✅ Mensagem processada para ${phoneNumber}`);

    } catch (error) {
      console.error('❌ Erro ao processar mensagem:', error);
      
      // Enviar mensagem de erro para o usuário
      const phoneNumber = messageData.key.remoteJid.replace('@s.whatsapp.net', '');
      await this.sendMessage(
        phoneNumber,
        "❌ Desculpe, ocorreu um erro interno. Tente novamente em alguns instantes."
      );
    }
  }

  /**
   * 👤 Buscar ou criar usuário pelo número do WhatsApp
   */
  private async findOrCreateUser(phoneNumber: string, displayName?: string): Promise<any> {
    try {
      // Primeiro, tentar encontrar usuário existente
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phoneNumber)
        .single();

      if (existingUser) {
        console.log(`👤 Usuário existente: ${phoneNumber}`);
        return existingUser;
      }

      // Se não existe, criar novo usuário
      const { data: newUser, error } = await supabase
        .from('users')
        .insert({
          phone: phoneNumber,
          full_name: displayName || `Usuário WhatsApp ${phoneNumber.slice(-4)}`,
          email: `${phoneNumber}@whatsapp.user`, // Email fictício para satisfazer constraints
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
      try {
        await supabase.rpc('create_default_categories', { user_id: newUser.id });
        console.log('🏷️ Categorias padrão criadas');
      } catch (catError) {
        console.warn('⚠️ Erro ao criar categorias padrão:', catError);
      }

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
   * 📤 Enviar mensagem via Evolution API
   */
  async sendMessage(to: string, text: string): Promise<boolean> {
    try {
      const url = `${this.config.baseUrl}/message/sendText/${this.config.instanceName}`;
      
      const payload = {
        number: to,
        text: text
      };

      console.log(`📤 Enviando mensagem para ${to}:`, text.substring(0, 50) + '...');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'apikey': this.config.apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Mensagem enviada para ${to}:`, result);
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
   * 📊 Enviar mensagem de boas-vindas
   */
  async sendWelcomeMessage(to: string, userName?: string): Promise<boolean> {
    const welcomeText = `🎉 *Bem-vindo${userName ? ` ${userName}` : ''} à Grana IA!*

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

    return await this.sendMessage(to, welcomeText);
  }

  /**
   * 📱 Obter informações da instância
   */
  async getInstanceInfo(): Promise<any> {
    try {
      const url = `${this.config.baseUrl}/instance/fetchInstances`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.config.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return await response.json();
      } else {
        throw new Error(`Erro ao buscar instâncias: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Erro ao buscar info da instância:', error);
      return null;
    }
  }

  /**
   * 📷 Obter QR Code para conexão
   */
  async getQRCode(): Promise<string | null> {
    try {
      const url = `${this.config.baseUrl}/instance/connect/${this.config.instanceName}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'apikey': this.config.apiKey,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const result = await response.json();
        return result.base64 || result.qrcode || null;
      } else {
        throw new Error(`Erro ao obter QR Code: ${response.statusText}`);
      }
    } catch (error) {
      console.error('❌ Erro ao obter QR Code:', error);
      return null;
    }
  }
}

/**
 * 🌐 Configuração padrão para Evolution API
 */
export const createEvolutionWebhookService = (): EvolutionWebhookService => {
  const config: EvolutionConfig = {
    baseUrl: import.meta.env.VITE_EVOLUTION_API_URL || 'http://localhost:8080',
    apiKey: import.meta.env.VITE_EVOLUTION_API_KEY || '',
    instanceName: import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || 'granafacil',
    webhookUrl: import.meta.env.VITE_EVOLUTION_WEBHOOK_URL || ''
  };

  return new EvolutionWebhookService(config);
};

export default EvolutionWebhookService;