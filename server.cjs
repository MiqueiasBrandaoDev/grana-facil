/**
 * 🚀 SERVIDOR HÍBRIDO - FRONTEND + API WEBHOOK
 * Serve o React build + endpoints de API para webhooks
 */

const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configuração do ambiente
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const EVOLUTION_API_URL = process.env.VITE_EVOLUTION_API_URL;
const EVOLUTION_API_KEY = process.env.VITE_EVOLUTION_API_KEY;
const EVOLUTION_INSTANCE_NAME = process.env.VITE_EVOLUTION_INSTANCE_NAME;

// Log de requests da API (não do frontend)
app.use('/api', (req, res, next) => {
  console.log(`${new Date().toISOString()} - API ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

// ==========================================
// 📱 ENDPOINTS DA API
// ==========================================

/**
 * 📱 WEBHOOK EVOLUTION API
 */
app.post('/api/evolution/webhook', async (req, res) => {
  try {
    console.log('\\n🎯 WEBHOOK EVOLUTION API RECEBIDO:');
    console.log('URL:', req.url);
    console.log('Method:', req.method);
    console.log('Headers:', JSON.stringify(req.headers, null, 2));
    console.log('Body:', JSON.stringify(req.body, null, 2));

    const payload = req.body;
    
    // Verificar se é mensagem
    if (payload.event !== 'messages.upsert' || !payload.data) {
      console.log(`⚠️ Evento ignorado: ${payload.event}`);
      return res.status(200).json({ success: true, message: 'Evento ignorado' });
    }

    // Verificar se não é mensagem nossa
    if (payload.data.key?.fromMe) {
      console.log('📤 Mensagem enviada por nós, ignorando');
      return res.status(200).json({ success: true, message: 'Mensagem própria ignorada' });
    }

    // Extrair dados da mensagem
    const phoneNumber = payload.data.key?.remoteJid?.replace('@s.whatsapp.net', '');
    const messageText = payload.data.message?.conversation || 
                       payload.data.message?.extendedTextMessage?.text;
    const senderName = payload.data.pushName || `Usuário ${phoneNumber?.slice(-4)}`;

    if (!messageText || !phoneNumber) {
      console.log('❌ Mensagem inválida, ignorando');
      return res.status(200).json({ success: true, message: 'Mensagem inválida ignorada' });
    }

    console.log(`📨 Mensagem de ${senderName} (${phoneNumber}): ${messageText}`);

    // Processar mensagem
    await processWhatsAppMessage(phoneNumber, messageText, senderName);

    res.status(200).json({ success: true, message: 'Webhook processado' });
  } catch (error) {
    console.error('\\n❌ Erro no webhook:', error);
    console.error('Stack trace:', error.stack);
    
    // Sempre retornar 200 para não fazer a Evolution API reenviar
    res.status(200).json({ 
      success: false, 
      error: 'Erro no processamento', 
      details: error.message 
    });
  }
});

/**
 * 📊 STATUS DA API
 */
app.get('/api/evolution/status', (req, res) => {
  res.json({
    server: 'Grana Fácil - Híbrido Frontend + API',
    status: 'running',
    port: PORT,
    endpoints: {
      webhook: `/api/evolution/webhook`,
      status: `/api/evolution/status`
    },
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
    timestamp: new Date().toISOString(),
    config: {
      supabaseConfigured: !!SUPABASE_URL,
      evolutionConfigured: !!EVOLUTION_API_URL,
      apiKeyConfigured: !!EVOLUTION_API_KEY
    }
  });
});

// ==========================================
// 🔄 FUNÇÕES DE PROCESSAMENTO
// ==========================================

/**
 * 🔄 Processar mensagem do WhatsApp
 */
async function processWhatsAppMessage(phoneNumber, messageText, senderName) {
  try {
    // Buscar usuário
    let user = await findUserByPhone(phoneNumber);
    let isNewUser = false;

    if (!user) {
      console.log(`🆕 Novo usuário detectado: ${phoneNumber}`);
      
      // Enviar apresentação
      await sendSystemPresentation(phoneNumber, senderName);
      
      // Criar usuário temporário
      user = await createTemporaryUser(phoneNumber, senderName);
      isNewUser = true;
    }

    if (!user) {
      await sendMessage(phoneNumber, "❌ Erro interno. Tente novamente.");
      return;
    }

    // Salvar mensagem
    await saveMessage(user.id, messageText, 'user');

    // Processar resposta
    let response;
    if (isNewUser) {
      response = processDemoCommand(messageText);
    } else {
      response = processFullCommand(messageText, user);
    }

    // Enviar resposta
    await sendMessage(phoneNumber, response);
    await saveMessage(user.id, response, 'bot');

    console.log(`✅ Mensagem processada para ${phoneNumber}`);
  } catch (error) {
    console.error('❌ Erro ao processar mensagem:', error);
    await sendMessage(phoneNumber, "❌ Erro interno. Tente novamente em alguns instantes.");
  }
}

/**
 * 👤 Buscar usuário por telefone
 */
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

/**
 * 🆕 Criar usuário temporário
 */
async function createTemporaryUser(phoneNumber, displayName) {
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
      console.error('Erro ao criar usuário:', await response.text());
      return null;
    }
    
    const data = await response.json();
    return data[0];
  } catch (error) {
    console.error('❌ Erro ao criar usuário:', error);
    return null;
  }
}

/**
 * 💾 Salvar mensagem
 */
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

/**
 * 📤 Enviar mensagem
 */
async function sendMessage(to, text) {
  try {
    const url = `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE_NAME}`;
    
    console.log(`📤 Enviando mensagem para ${to}:`, text.substring(0, 50) + '...');
    
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
      console.error('❌ Erro ao enviar mensagem:', error);
      return false;
    }
  } catch (error) {
    console.error('❌ Erro na requisição:', error);
    return false;
  }
}

/**
 * 🎯 Apresentação do sistema
 */
async function sendSystemPresentation(to, userName) {
  const presentationText = `🎉 *Olá${userName ? ` ${userName}` : ''}! Bem-vindo à Grana Fácil!*

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

/**
 * 🎮 Processar comandos demo
 */
function processDemoCommand(command) {
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

/**
 * 🤖 Processar comando completo
 */
function processFullCommand(command, user) {
  return `🤖 Processando seu comando: "${command}"

✅ Usuário cadastrado detectado!
👤 Bem-vindo de volta, ${user.full_name}!

🔄 Processamento completo em desenvolvimento...

💡 Recursos disponíveis para usuários cadastrados:
• Análise financeira completa
• Integração bancária
• Relatórios personalizados
• Metas e orçamentos
• Consultoria IA avançada

Continue usando a plataforma web para acesso completo! 💪`;
}

// ==========================================
// 🌐 SERVIR FRONTEND REACT
// ==========================================

// Servir arquivos estáticos do React
app.use(express.static(path.join(__dirname, 'dist')));

// Health check específico
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Catch-all para o React (apenas para rotas que não são da API)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/dashboard*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/transactions*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/settings*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/webhook*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/whatsapp*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/categories*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/reports*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/goals*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/bills*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Fallback final para outras rotas
app.get('*', (req, res) => {
  // Se não é uma rota da API, serve o React
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    res.status(404).json({ error: 'API endpoint not found' });
  }
});

// ==========================================
// 🚀 INICIAR SERVIDOR
// ==========================================

app.listen(PORT, '0.0.0.0', () => {
  console.log('\\n🚀 SERVIDOR HÍBRIDO INICIADO');
  console.log(`📡 Frontend React: http://0.0.0.0:${PORT}`);
  console.log(`📱 API Webhook: http://0.0.0.0:${PORT}/api/evolution/webhook`);
  console.log(`📊 API Status: http://0.0.0.0:${PORT}/api/evolution/status`);
  console.log('\\n📋 Configuração:');
  console.log(`Supabase URL: ${SUPABASE_URL ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`Evolution API: ${EVOLUTION_API_URL ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`API Key: ${EVOLUTION_API_KEY ? '✅ Configurado' : '❌ Não configurado'}`);
  console.log(`Instance: ${EVOLUTION_INSTANCE_NAME || '❌ Não configurado'}`);
  console.log('\\n💡 Webhook configurado para:');
  console.log(`   https://finance2.ac69mn.easypanel.host/api/evolution/webhook`);
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Promise rejeitada:', reason);
});