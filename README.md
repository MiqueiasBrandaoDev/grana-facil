# 💰 Grana Board

**Controle Financeiro Inteligente com IA Integrada**

Uma aplicação web moderna e intuitiva para gestão financeira pessoal, desenvolvida com React, TypeScript e integração com inteligência artificial para categorização automática de transações.

---

## 🚀 Funcionalidades

### 📊 **Dashboard Inteligente**
- Visão geral completa das finanças
- Gráficos e métricas em tempo real
- Resumo de receitas, despesas e saldo atual

### 💱 **Gestão de Transações**
- Registro rápido de receitas e despesas
- **IA integrada** para categorização automática
- Histórico completo com filtros avançados
- Suporte a diferentes métodos de pagamento

### 🏷️ **Categorias Personalizadas**
- Criação de categorias customizadas
- Orçamentos mensais por categoria
- Controle de gastos com alertas visuais
- Ícones e cores personalizáveis

### 🎯 **Metas Financeiras**
- Definição de objetivos financeiros
- Acompanhamento de progresso
- Sistema de contribuições
- Histórico de depósitos

### 📅 **Contas a Pagar/Receber**
- Gestão completa de compromissos financeiros
- Alertas de vencimento
- **Integração automática**: contas pagas viram transações
- Contas recorrentes

### 📈 **Relatórios e Análises**
- Relatórios mensais detalhados
- Gráficos de tendências
- Análise de gastos por categoria
- Exportação de dados

### 📱 **WhatsApp Bot (Destaque)**
- **Controle financeiro via WhatsApp**
- Comandos naturais em português
- IA para processamento de mensagens
- Interface familiar e acessível

---

## 🛠️ Tecnologias

### **Frontend**
- **React 18** - Interface moderna e reativa
- **TypeScript** - Tipagem estática para maior confiabilidade
- **Vite** - Build tool ultrarrápido
- **Tailwind CSS** - Estilização utilitária e responsiva

### **UI/UX**
- **shadcn/ui** - Componentes elegantes e acessíveis
- **Radix UI** - Primitivos de interface robustos
- **Lucide React** - Ícones consistentes e modernos
- **Responsive Design** - Otimizado para todos os dispositivos

### **Estado e Dados**
- **React Query** - Gerenciamento de estado servidor
- **React Hook Form** - Formulários performáticos
- **Zod** - Validação de schemas

### **Backend e Banco**
- **Supabase** - Backend as a Service
- **PostgreSQL** - Banco de dados robusto
- **Row Level Security** - Segurança por usuário
- **Real-time subscriptions** - Atualizações em tempo real

### **IA e Integrações**
- **OpenAI GPT-4** - Categorização inteligente
- **Análise contextual** - Compreensão de transações em português
- **Fallback inteligente** - Sistema offline para categorização

---

## 🚀 Como Executar

### **Pré-requisitos**
- Node.js 18+ ([instalar com nvm](https://github.com/nvm-sh/nvm))
- npm ou yarn
- Conta no Supabase

### **Instalação**

```bash
# 1. Clone o repositório
git clone https://github.com/MiqueiasBrandaoDev/grana-facil.git

# 2. Entre no diretório
cd grana-facil

# 3. Instale as dependências
npm install

# 4. Configure as variáveis de ambiente
cp .env.example .env
# Configure VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_OPENAI_API_KEY

# 5. Execute as migrações do banco
npm run db:migrate

# 6. Inicie o servidor de desenvolvimento
npm run dev
```

### **Scripts Disponíveis**

```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run build:dev    # Build para desenvolvimento
npm run preview      # Preview da build de produção
npm run lint         # Verificação de código
```

---

## 🏗️ Arquitetura

### **Estrutura do Projeto**

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes shadcn/ui
│   ├── dashboard/      # Componentes específicos do dashboard
│   ├── layout/         # Layout (Header, Sidebar, MainLayout)
│   └── modals/         # Modais da aplicação
├── pages/              # Páginas da aplicação
├── hooks/              # Custom React hooks
├── lib/                # Utilitários e configurações
├── integrations/       # Integrações externas
│   └── supabase/       # Cliente e tipos do Supabase
└── assets/             # Recursos estáticos

supabase/
├── config.toml         # Configuração do Supabase
└── migrations/         # Migrações do banco de dados
```

### **Padrões Utilizados**

- **Component-driven development** - Componentes reutilizáveis e testáveis
- **Custom Hooks** - Lógica de negócio encapsulada
- **React Query** - Cache inteligente e sincronização de dados
- **TypeScript strict** - Tipagem rigorosa em todo o projeto
- **Responsive first** - Design mobile-first

---

## 🎨 Design System

### **Cores e Temas**
- **Tema claro/escuro** - Suporte completo a dark mode
- **Paleta consistente** - Cores semânticas e acessíveis
- **Gradientes personalizados** - Visual moderno e atrativo

### **Componentes**
- **Design system** baseado em shadcn/ui
- **Componentes acessíveis** - ARIA labels e navegação por teclado
- **Feedback visual** - Loading states, toasts e validações

---

## 🔐 Segurança

- **Row Level Security (RLS)** - Isolamento de dados por usuário
- **Autenticação segura** - Via Supabase Auth
- **Validação client/server** - Dupla validação de dados
- **Sanitização de inputs** - Prevenção de XSS

---

## 📱 Funcionalidade WhatsApp

O diferencial do **Grana Board** é o controle financeiro via WhatsApp:

- **Interface familiar** - Usa a interface que todos conhecem
- **Comandos naturais** - "Gastei R$ 50 no mercado"
- **IA contextual** - Entende intenções em português brasileiro
- **Categorização automática** - Aprende com seus hábitos

### **Exemplos de Uso**
```
👤 "Recebi meu salário de R$ 3000"
🤖 Transação de receita criada: R$ 3.000,00 em Salário

👤 "Gastei 45 reais no supermercado"
🤖 Despesa registrada: R$ 45,00 em Alimentação

👤 "Qual meu saldo atual?"
🤖 Seu saldo atual é R$ 2.955,00
```

---

## 🤝 Contribuição

Contribuições são sempre bem-vindas! Para contribuir:

1. **Fork** o repositório
2. **Crie** uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. **Commit** suas mudanças (`git commit -m 'Add: nova feature'`)
4. **Push** para a branch (`git push origin feature/nova-feature`)
5. **Abra** um Pull Request

### **Padrões de Commit**
- `feat:` - Nova funcionalidade
- `fix:` - Correção de bug
- `docs:` - Documentação
- `style:` - Formatação
- `refactor:` - Refatoração
- `test:` - Testes

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 📞 Suporte

- **Documentação**: [CLAUDE.md](CLAUDE.md)
- **Issues**: [GitHub Issues](https://github.com/MiqueiasBrandaoDev/grana-facil/issues)
- **Discussões**: [GitHub Discussions](https://github.com/MiqueiasBrandaoDev/grana-facil/discussions)

---

<div align="center">

**Desenvolvido com 💚 para facilitar sua vida financeira**

[⭐ Dê uma estrela](https://github.com/MiqueiasBrandaoDev/grana-facil) • [🐛 Reporte um bug](https://github.com/MiqueiasBrandaoDev/grana-facil/issues) • [💡 Sugira uma feature](https://github.com/MiqueiasBrandaoDev/grana-facil/discussions)

</div>