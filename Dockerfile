# 🚀 DOCKERFILE SIMPLES PARA GRANA FÁCIL - EASYPANEL
# Build e serve com Node.js usando 'serve'

FROM node:18-alpine

# Definir diretório de trabalho
WORKDIR /app

# Copiar arquivos de dependência
COPY package*.json ./

# Instalar todas as dependências (incluindo dev para o build)
RUN npm ci --silent

# Copiar código fonte
COPY . .

# Build da aplicação para produção
RUN npm run build

# Instalar 'serve' globalmente para servir arquivos estáticos
RUN npm install -g serve

# Expor porta 3000 (padrão do serve)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/ || exit 1

# Comando para servir a aplicação
CMD ["serve", "-s", "dist", "-l", "3000"]