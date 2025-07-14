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

      // Primeiro, buscar usuário existente
      let user = await this.findUserByPhone(phoneNumber);
      let isNewUser = false;

      if (!user) {
        // Usuário não encontrado - enviar apresentação do sistema
        console.log(`🆕 Novo usuário detectado: ${phoneNumber}`);
        
        await this.sendSystemPresentation(phoneNumber, senderName);
        
        // Criar usuário temporário para demo
        user = await this.createTemporaryUser(phoneNumber, senderName);
        isNewUser = true;
        
        if (!user) {
          await this.sendMessage(
            phoneNumber,
            "❌ Erro interno. Não foi possível processar sua solicitação. Entre em contato com o suporte."
          );
          return;
        }
      }

      // Salvar mensagem recebida no banco
      await this.saveMessage(user.id, messageText, 'user');

      // Se for usuário novo, processar comandos de demonstração
      if (isNewUser) {
        console.log('🎯 Processando comando de demonstração...');
        const demoResponse = await this.processDemoCommand(messageText, user);
        await this.sendMessage(phoneNumber, demoResponse);
        await this.saveMessage(user.id, demoResponse, 'bot');
      } else {
        // Usuário existente - processar normalmente com IA Agent
        console.log('🤖 Processando com IA Agent...');
        const response = await aiAgent.processCommand(messageText);
        await this.sendMessage(phoneNumber, response.message);
        await this.saveMessage(user.id, response.message, 'bot');
      }

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
   * 👤 Buscar usuário pelo número do WhatsApp
   * Se não encontrar, retorna null (não cria automaticamente)
   */
  private async findUserByPhone(phoneNumber: string): Promise<any> {
    try {
      // Buscar usuário existente que já tem o telefone configurado
      const { data: existingUser } = await supabase
        .from('users')
        .select('*')
        .eq('phone', phoneNumber)
        .single();

      if (existingUser) {
        console.log(`👤 Usuário existente encontrado: ${phoneNumber}`);
        return existingUser;
      }

      console.log(`❌ Nenhum usuário encontrado para o telefone: ${phoneNumber}`);
      return null;

    } catch (error) {
      console.error('❌ Erro ao buscar usuário:', error);
      return null;
    }
  }

  /**
   * 🎯 Criar usuário temporário para lead/demo
   * Para usuários que ainda não se cadastraram no sistema
   */
  private async createTemporaryUser(phoneNumber: string, displayName?: string): Promise<any> {
    try {
      // Criar usuário temporário apenas para demonstração
      const { data: tempUser, error } = await supabase
        .from('users')
        .insert({
          phone: phoneNumber,
          full_name: displayName || `Lead WhatsApp ${phoneNumber.slice(-4)}`,
          email: `${phoneNumber}@whatsapp.temp`, // Email temporário
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Erro ao criar usuário temporário:', error);
        return null;
      }

      // Criar categorias básicas para demonstração
      try {
        await supabase.rpc('create_default_categories', { user_id: tempUser.id });
        console.log('🏷️ Categorias demo criadas');
      } catch (catError) {
        console.warn('⚠️ Erro ao criar categorias demo:', catError);
      }

      console.log(`✅ Usuário temporário criado para demo: ${phoneNumber}`);
      return tempUser;

    } catch (error) {
      console.error('❌ Erro ao criar usuário temporário:', error);
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
   * 🎯 Apresentação do sistema para novos usuários
   */
  async sendSystemPresentation(to: string, userName?: string): Promise<boolean> {
    const presentationText = `🎉 *Olá${userName ? ` ${userName}` : ''}! Bem-vindo ao Grana Board!*

🤖 Sou a *Grana IA*, seu assistente financeiro inteligente powered by GPT-4o.

💡 *O que eu posso fazer por você:*
💰 Organizar suas finanças automaticamente
📊 Controlar receitas e despesas  
🎯 Ajudar com metas financeiras
💳 Gerenciar contas e investimentos
📈 Gerar relatórios detalhados
🏷️ Categorizar gastos inteligentemente

🚀 *Experimente agora mesmo:*
• "Gastei 50 reais no supermercado"
• "Recebi 2000 reais de salário"
• "Quero economizar 5000 reais"
• "Qual meu saldo atual?"

📱 *Esta é uma demonstração gratuita!*
Para ter acesso completo, cadastre-se em nossa plataforma web.

Digite qualquer comando financeiro para começar! 💪`;

    return await this.sendMessage(to, presentationText);
  }

  /**
   * 🎯 Processar comandos de demonstração para novos usuários
   */
  async processDemoCommand(command: string, user: any): Promise<string> {
    try {
      // Verificar se é comando financeiro básico
      const lowerCommand = command.toLowerCase();
      
      if (lowerCommand.includes('gastei') || lowerCommand.includes('paguei') || lowerCommand.includes('comprei')) {
        return `💸 *Transação de demonstração registrada!*

✅ Despesa processada com sucesso
📝 Categoria sugerida automaticamente
📊 Saldo atualizado

💡 *Na versão completa você teria:*
• Análise detalhada de gastos
• Categorização automática avançada
• Alertas de orçamento
• Relatórios mensais
• Sincronização bancária

🚀 *Quer experimentar mais recursos?*
Cadastre-se gratuitamente em nossa plataforma!

Continue testando: "Recebi 1000 reais" ou "Qual meu saldo?"`;
      }
      
      if (lowerCommand.includes('recebi') || lowerCommand.includes('ganhei') || lowerCommand.includes('salário')) {
        return `💰 *Receita de demonstração registrada!*

✅ Entrada processada com sucesso
📈 Saldo aumentado
🎯 Oportunidade de meta detectada

💡 *Na versão completa você teria:*
• Projeções de renda
• Sugestões de investimento
• Planejamento automático
• Metas personalizadas
• Dashboard completo

🚀 *Quer ver tudo funcionando?*
Cadastre-se e conecte suas contas!

Continue testando: "Quero economizar 2000 reais"`;
      }
      
      if (lowerCommand.includes('saldo') || lowerCommand.includes('quanto tenho')) {
        return `📊 *Saldo da demonstração:*

💰 Saldo atual: R$ 1.247,50
📈 Entradas do mês: R$ 2.000,00
📉 Saídas do mês: R$ 752,50
💹 Resultado: +R$ 1.247,50

💡 *Na versão completa você veria:*
• Saldo real de todas as contas
• Histórico detalhado
• Gráficos interativos
• Comparações mensais
• Previsões futuras

🚀 *Cadastre-se para ver seus dados reais!*`;
      }
      
      if (lowerCommand.includes('economizar') || lowerCommand.includes('meta') || lowerCommand.includes('guardar')) {
        return `🎯 *Meta de demonstração criada!*

✅ Objetivo registrado
📅 Prazo sugerido: 12 meses
💪 Valor mensal necessário calculado

💡 *Na versão completa você teria:*
• Múltiplas metas simultâneas
• Acompanhamento automático
• Lembretes personalizados
• Estratégias de economia
• Simulações de investimento

🚀 *Quer planejar suas metas reais?*
Cadastre-se e use todos os recursos!

Continue testando: "Me dê dicas financeiras"`;
      }
      
      if (lowerCommand.includes('dica') || lowerCommand.includes('conselho') || lowerCommand.includes('ajuda')) {
        return `💡 *Dicas financeiras da Grana IA:*

🎯 *Para você especificamente:*
• Controle gastos com categorização
• Estabeleça metas realistas  
• Automatize investimentos
• Monitore fluxo de caixa

💰 *Dicas gerais:*
• Regra 50/30/20 (necessidades/desejos/poupança)
• Emergency fund = 6 meses de gastos
• Invista regularmente, mesmo valores pequenos

🚀 *Na versão completa:*
• Análises personalizadas baseadas no seu perfil
• Sugestões específicas para sua situação
• Alertas inteligentes
• Consultoria financeira automatizada

*Cadastre-se para conselhos personalizados!*`;
      }
      
      // Comando não reconhecido
      return `🤖 *Comando não reconhecido na demonstração*

🚀 *Comandos que você pode testar:*
• "Gastei 30 reais no almoço"
• "Recebi 1500 reais"
• "Qual meu saldo?"
• "Quero economizar 3000 reais"
• "Me dê dicas financeiras"

💡 *Na versão completa da Grana IA:*
• Processamento de linguagem natural avançado
• Integração com bancos e cartões
• Análises preditivas
• Relatórios personalizados

*Cadastre-se para ter acesso completo!*`;
      
    } catch (error) {
      console.error('❌ Erro ao processar comando demo:', error);
      return `❌ Erro na demonstração. 

🚀 *Cadastre-se na versão completa* para ter:
• Processamento avançado
• Integração real com bancos
• Suporte técnico dedicado
• Backup automático dos dados

*Visite nossa plataforma para começar!*`;
    }
  }

  /**
   * 📊 Enviar mensagem de boas-vindas (usuários cadastrados)
   */
  async sendWelcomeMessage(to: string, userName?: string): Promise<boolean> {
    const welcomeText = `🎉 *Bem-vindo de volta${userName ? ` ${userName}` : ''}!*

🤖 Sou a Grana IA, seu assistente financeiro inteligente.

✅ *Conta vinculada com sucesso!*
Agora você tem acesso completo a todos os recursos.

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
    instanceName: import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || 'granaboard',
    webhookUrl: import.meta.env.VITE_EVOLUTION_WEBHOOK_URL || ''
  };

  return new EvolutionWebhookService(config);
};

export default EvolutionWebhookService;