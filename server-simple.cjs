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

    // Processar mensagem
    await processMessage(phoneNumber, messageText, senderName);

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

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'dist')));

// SPA fallback - DEVE VIR POR ÚLTIMO
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

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
      response = generateUserResponse(messageText, user);
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
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
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

    if (!response.ok) {
      console.error('Erro HTTP ao criar usuário:', response.status, await response.text());
      return null;
    }
    
    const data = await response.json();
    return data[0];
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    return null;
  }
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

function generateUserResponse(command, user) {
  return `🤖 Processando: "${command}"

✅ Usuário: ${user.full_name}
🔄 Funcionalidade em desenvolvimento...

💡 Recursos para usuários cadastrados:
• Análise financeira completa
• Integração bancária
• Relatórios personalizados

Continue usando a plataforma web! 💪`;
}

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