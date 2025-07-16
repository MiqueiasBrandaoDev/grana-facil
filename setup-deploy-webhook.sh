#!/bin/bash

# Script para configurar o webhook de deploy na VPS
# Execute este script na sua VPS como root

echo "🚀 Configurando webhook de deploy..."

# 1. Instalar PM2 se não estiver instalado
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    npm install -g pm2
fi

# 2. Copiar o arquivo de webhook para a VPS
echo "📁 Copiando arquivo de webhook..."
cp deploy-webhook.js /root/grana-facil/

# 3. Criar arquivo de configuração PM2
echo "⚙️ Criando configuração PM2..."
cat > /root/grana-facil/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'deploy-webhook',
      script: '/root/grana-facil/deploy-webhook.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
        DEPLOY_SECRET: 'MUDE-ESTA-CHAVE-SECRETA-AQUI'
      }
    }
  ]
};
EOF

# 4. Instalar dependências
echo "📦 Instalando dependências..."
cd /root/grana-facil
npm install express

# 5. Configurar firewall (permitir porta 3001)
echo "🔥 Configurando firewall..."
if command -v ufw &> /dev/null; then
    ufw allow 3001/tcp
fi

# 6. Criar arquivo de configuração nginx para o webhook
echo "🌐 Configurando nginx para webhook..."
cat > /etc/nginx/sites-available/deploy-webhook << 'EOF'
server {
    listen 80;
    server_name deploy.granaboard.com.br;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }
}
EOF

# 7. Habilitar site nginx
ln -sf /etc/nginx/sites-available/deploy-webhook /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 8. Iniciar o webhook com PM2
echo "🚀 Iniciando webhook com PM2..."
pm2 start ecosystem.config.js
pm2 save
pm2 startup

# 9. Verificar se está funcionando
echo "🔍 Verificando se o webhook está funcionando..."
sleep 2
curl -f http://localhost:3001/health

echo ""
echo "✅ Webhook de deploy configurado com sucesso!"
echo ""
echo "🔐 IMPORTANTE: Mude a chave secreta em /root/grana-facil/ecosystem.config.js"
echo "🌐 URL do webhook: http://deploy.granaboard.com.br"
echo "📝 Para ver logs: pm2 logs deploy-webhook"
echo "🔄 Para reiniciar: pm2 restart deploy-webhook"
echo ""
echo "⚠️  Lembre-se de:"
echo "   1. Configurar certificado SSL se necessário"
echo "   2. Configurar DNS para deploy.granaboard.com.br"
echo "   3. Mudar a chave secreta no ecosystem.config.js"
echo ""