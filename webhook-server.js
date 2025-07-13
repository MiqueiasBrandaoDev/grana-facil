/**
 * 🚀 SERVIDOR DE WEBHOOK LOCAL
 * Para receber webhooks da Evolution API durante desenvolvimento
 */

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001; // Porta diferente do Vite (5173)

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log de todas as requisições
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('Body:', JSON.stringify(req.body, null, 2));
  }
  next();
});

/**
 * 📱 ENDPOINT PRINCIPAL DO WEBHOOK
 * Recebe webhooks da Evolution API
 */
app.post('/webhook', async (req, res) => {
  try {
    console.log('\n🎯 WEBHOOK RECEBIDO:');
    console.log('Headers:', req.headers);
    console.log('Body:', JSON.stringify(req.body, null, 2));

    // Aqui você processaria com a Evolution API
    // Por enquanto, apenas logamos
    const payload = req.body;
    
    if (payload.event === 'messages.upsert' && payload.data) {
      const messageData = payload.data;
      
      // Verificar se não é mensagem nossa
      if (!messageData.key?.fromMe) {
        const phoneNumber = messageData.key?.remoteJid?.replace('@s.whatsapp.net', '');
        const messageText = messageData.message?.conversation || 
                           messageData.message?.extendedTextMessage?.text;
        
        console.log('\n📨 NOVA MENSAGEM:');
        console.log(`De: ${phoneNumber}`);
        console.log(`Texto: ${messageText}`);
        console.log(`Nome: ${messageData.pushName || 'Desconhecido'}`);
        
        // Aqui você chamaria o processamento da IA
        console.log('\n🤖 Processando com IA Agent...');
        console.log('(Simulação - integração completa será feita depois)');
        
        // Simular resposta
        console.log('\n✅ Resposta simulada enviada!');
      }
    }

    res.status(200).json({ success: true, message: 'Webhook processado' });
  } catch (error) {
    console.error('\n❌ Erro no webhook:', error);
    res.status(500).json({ error: 'Erro interno', details: error.message });
  }
});

/**
 * 🔍 ENDPOINT DE TESTE
 * Para verificar se o servidor está funcionando
 */
app.get('/test', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Servidor de webhook funcionando!',
    timestamp: new Date().toISOString()
  });
});

/**
 * 📋 ENDPOINT DE STATUS
 * Para verificar status e logs
 */
app.get('/status', (req, res) => {
  res.json({
    server: 'Webhook Evolution API',
    status: 'running',
    port: PORT,
    endpoints: {
      webhook: `http://localhost:${PORT}/webhook`,
      test: `http://localhost:${PORT}/test`,
      status: `http://localhost:${PORT}/status`
    },
    ngrok_setup: {
      install: 'npm install -g ngrok',
      run: `ngrok http ${PORT}`,
      webhook_url: 'https://your-ngrok-url.ngrok.io/webhook'
    }
  });
});

/**
 * 🎯 ENDPOINT RAIZ
 */
app.get('/', (req, res) => {
  res.send(`
    <h1>🤖 Webhook Server - Grana IA</h1>
    <h2>Status: ✅ Rodando</h2>
    <h3>Endpoints:</h3>
    <ul>
      <li><a href="/test">/test</a> - Testar servidor</li>
      <li><a href="/status">/status</a> - Status e configuração</li>
      <li><strong>/webhook</strong> - Endpoint principal (POST)</li>
    </ul>
    <h3>Setup ngrok:</h3>
    <pre>
1. npm install -g ngrok
2. ngrok http ${PORT}
3. Usar URL do ngrok como webhook na Evolution API
    </pre>
    <p><small>Servidor rodando na porta ${PORT}</small></p>
  `);
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('\n🚀 SERVIDOR DE WEBHOOK INICIADO');
  console.log(`📡 Rodando em: http://localhost:${PORT}`);
  console.log(`📱 Webhook endpoint: http://localhost:${PORT}/webhook`);
  console.log('\n📋 Próximos passos:');
  console.log('1. Instalar ngrok: npm install -g ngrok');
  console.log(`2. Expor servidor: ngrok http ${PORT}`);
  console.log('3. Configurar webhook na Evolution API');
  console.log('4. Testar enviando mensagem no WhatsApp');
  console.log('\n💡 Acesse http://localhost:3001/status para mais detalhes');
});

// Tratamento de erros
process.on('uncaughtException', (error) => {
  console.error('❌ Erro não capturado:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('❌ Promise rejeitada:', reason);
});