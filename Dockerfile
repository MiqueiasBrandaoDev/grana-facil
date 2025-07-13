# 🚀 DOCKERFILE HÍBRIDO PARA GRANA FÁCIL - EASYPANEL
# Build React + Servidor Node.js com API para webhooks

FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependência
COPY package*.json ./

# Instalar todas as dependências (incluindo dev para o build)
RUN npm ci --silent

# Copiar código fonte
COPY . .

# Build da aplicação React para produção
RUN npm run build

# Instalar dependências do servidor (express, cors)
RUN npm install express cors --save

# Expor porta 3000
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/test || exit 1

# Comando para iniciar servidor híbrido
CMD ["node", "server.js"]