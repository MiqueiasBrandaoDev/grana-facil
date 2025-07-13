/**
 * 🧪 SERVIDOR DE TESTE SIMPLES
 * Para verificar se o problema é configuração ou dependências
 */

const express = require('express');
const path = require('path');

const app = express();
const PORT = 3001;

console.log('🔬 Testando servidor básico...');

// Middleware básico
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Rota de teste
app.get('/api/test', (req, res) => {
  res.json({ message: 'API funcionando!' });
});

// SPA fallback simples
app.get('*', (req, res) => {
  console.log(`📄 Rota solicitada: ${req.path}`);
  
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API não encontrada' });
  }
  
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor de teste rodando em http://localhost:${PORT}`);
  console.log('📋 Teste estas rotas:');
  console.log('  - http://localhost:3001/');
  console.log('  - http://localhost:3001/bills');
  console.log('  - http://localhost:3001/dashboard');
  console.log('  - http://localhost:3001/api/test');
});