const express = require('express');
const { exec } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(express.json());

// Chave secreta para autenticação (configure no .env)
const DEPLOY_SECRET = process.env.DEPLOY_SECRET || 'sua-chave-secreta-aqui';

// Diretório do projeto
const PROJECT_DIR = '/root/grana-facil';

// Função para executar comandos
function executeCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    
    const process = exec(command, {
      cwd: options.cwd || PROJECT_DIR,
      ...options
    });

    let stdout = '';
    let stderr = '';

    process.stdout.on('data', (data) => {
      stdout += data;
    });

    process.stderr.on('data', (data) => {
      stderr += data;
    });

    process.on('close', (code) => {
      const endTime = Date.now();
      const duration = ((endTime - startTime) / 1000).toFixed(2);
      
      resolve({
        command,
        code,
        stdout,
        stderr,
        duration,
        success: code === 0
      });
    });

    process.on('error', (error) => {
      reject({
        command,
        error: error.message,
        success: false
      });
    });
  });
}

// Endpoint para iniciar deploy
app.post('/deploy', async (req, res) => {
  try {
    const { secret, deployId, branch = 'main' } = req.body;

    // Verificar autenticação
    if (secret !== DEPLOY_SECRET) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log(`🚀 Iniciando deploy da branch ${branch} (ID: ${deployId})`);

    // Comandos de deploy
    const commands = [
      `cd ${PROJECT_DIR}`,
      'git pull origin main',
      'docker-compose down',
      'docker-compose build --no-cache',
      'docker-compose up -d',
      'curl -f https://app.granaboard.com.br/health'
    ];

    let deployLogs = '';
    let success = true;

    for (const command of commands) {
      try {
        deployLogs += `$ ${command}\n`;
        console.log(`Executando: ${command}`);

        const result = await executeCommand(command);
        
        if (result.stdout) {
          deployLogs += `${result.stdout}\n`;
        }
        if (result.stderr) {
          deployLogs += `STDERR: ${result.stderr}\n`;
        }
        
        deployLogs += `Comando executado em ${result.duration}s\n\n`;

        if (!result.success) {
          success = false;
          deployLogs += `❌ Erro: comando falhou com código ${result.code}\n`;
          break;
        }

      } catch (error) {
        success = false;
        deployLogs += `❌ Erro ao executar comando: ${error.error || error.message}\n`;
        break;
      }
    }

    if (success) {
      deployLogs += '✅ Deploy concluído com sucesso!\n';
      console.log('✅ Deploy concluído com sucesso!');
    } else {
      deployLogs += '❌ Deploy falhou!\n';
      console.log('❌ Deploy falhou!');
    }

    // Retornar resultado
    res.json({
      success,
      deployId,
      logs: deployLogs,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Erro no deploy:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      details: error.message 
    });
  }
});

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'deploy-webhook'
  });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`🚀 Deploy webhook rodando na porta ${PORT}`);
  console.log(`🔐 Secret configurado: ${DEPLOY_SECRET ? 'Sim' : 'Não'}`);
});

module.exports = app;