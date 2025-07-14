/**
 * 🚀 FUNÇÃO SERVERLESS PARA WEBHOOK EVOLUTION API
 * Netlify/Vercel Function para receber webhooks
 */

import { Handler } from '@netlify/functions';

// Tipos da Evolution API
interface EvolutionWebhookPayload {
  event: string;
  instance: string;
  data: {
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
  };
}

// Configuração do Supabase
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const EVOLUTION_API_URL = process.env.VITE_EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.VITE_EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE_NAME = process.env.VITE_EVOLUTION_INSTANCE_NAME;

export const handler: Handler = async (event) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Responder OPTIONS para CORS
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Apenas aceitar POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    console.log('📱 Webhook Evolution API recebido:', event.body);

    // Parse do payload
    const payload: EvolutionWebhookPayload = JSON.parse(event.body || '{}');

    // Verificar se é mensagem
    if (payload.event !== 'messages.upsert' || !payload.data) {
      console.log(`⚠️ Evento ignorado: ${payload.event}`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Evento ignorado' })
      };
    }

    // Verificar se não é mensagem nossa
    if (payload.data.key.fromMe) {
      console.log('📤 Mensagem enviada por nós, ignorando');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Mensagem própria ignorada' })
      };
    }

    // Extrair dados da mensagem
    const phoneNumber = payload.data.key.remoteJid.replace('@s.whatsapp.net', '');
    const messageText = payload.data.message.conversation || 
                       payload.data.message.extendedTextMessage?.text;
    const senderName = payload.data.pushName || `Usuário ${phoneNumber.slice(-4)}`;

    if (!messageText) {
      console.log('❌ Mensagem sem texto, ignorando');
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Mensagem sem texto ignorada' })
      };
    }

    console.log(`📨 Mensagem de ${senderName} (${phoneNumber}): ${messageText}`);

    // Buscar usuário no Supabase
    let user = await findUserByPhone(phoneNumber);
    let isNewUser = false;

    if (!user) {
      console.log(`🆕 Novo usuário detectado: ${phoneNumber}`);
      
      // Enviar apresentação do sistema
      await sendSystemPresentation(phoneNumber, senderName);
      
      // Criar usuário temporário
      user = await createTemporaryUser(phoneNumber, senderName);
      isNewUser = true;
    }

    if (!user) {
      await sendMessage(phoneNumber, "❌ Erro interno. Tente novamente em alguns instantes.");
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Não foi possível processar usuário' })
      };
    }

    // Salvar mensagem no banco
    await saveMessage(user.id, messageText, 'user');

    // Processar resposta
    let response: string;
    if (isNewUser) {
      response = await processDemoCommand(messageText);
    } else {
      response = await processFullCommand(messageText, user);
    }

    // Enviar resposta
    await sendMessage(phoneNumber, response);
    
    // Salvar resposta no banco
    await saveMessage(user.id, response, 'bot');

    console.log(`✅ Mensagem processada para ${phoneNumber}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Webhook processado' })
    };

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Erro interno', 
        details: error instanceof Error ? error.message : 'Erro desconhecido' 
      })
    };
  }
};

// Funções auxiliares
async function findUserByPhone(phoneNumber: string): Promise<any> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?phone=eq.${phoneNumber}&select=*`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY!,
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

async function createTemporaryUser(phoneNumber: string, displayName: string): Promise<any> {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY!,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        phone: phoneNumber,
        full_name: displayName || `Lead WhatsApp ${phoneNumber.slice(-4)}`,
        email: `${phoneNumber}@whatsapp.temp`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
    });

    if (!response.ok) return null;
    
    const data = await response.json();
    return data[0];
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    return null;
  }
}

async function saveMessage(userId: string, messageText: string, sender: 'user' | 'bot'): Promise<void> {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/whatsapp_messages`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY!,
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

async function sendMessage(to: string, text: string): Promise<boolean> {
  try {
    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'apikey': EVOLUTION_API_KEY!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        number: to,
        text: text
      })
    });

    return response.ok;
  } catch (error) {
    console.error('❌ Erro ao enviar mensagem:', error);
    return false;
  }
}

async function sendSystemPresentation(to: string, userName?: string): Promise<void> {
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

  await sendMessage(to, presentationText);
}

async function processDemoCommand(command: string): Promise<string> {
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
  
  return `🤖 *Comando não reconhecido na demonstração*

🚀 *Comandos que você pode testar:*
• "Gastei 30 reais no almoço"
• "Recebi 1500 reais"
• "Qual meu saldo?"
• "Quero economizar 3000 reais"

💡 *Na versão completa da Grana IA:*
• Processamento de linguagem natural avançado
• Integração com bancos e cartões
• Análises preditivas
• Relatórios personalizados

*Cadastre-se para ter acesso completo!*`;
}

async function processFullCommand(command: string, user: any): Promise<string> {
  // Aqui seria a integração com o AI Agent completo
  // Por ora, retorna uma resposta padrão
  return `🤖 Processando seu comando: "${command}"

✅ Usuário cadastrado detectado!
🔄 Processamento completo em desenvolvimento...

💡 Recursos disponíveis para usuários cadastrados:
• Análise financeira completa
• Integração bancária
• Relatórios personalizados
• Metas e orçamentos
• Consultoria IA avançada

Continue usando a plataforma web para acesso completo! 💪`;
}