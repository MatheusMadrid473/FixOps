# FixOps – Gestão Inteligente de Manutenção Industrial

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

> **Transformando a complexidade da manutenção industrial em fluxos seguros, rastreáveis e otimizados.**

---

## 📌 Sobre o Projeto

**FixOps** é uma plataforma Full Stack de última geração desenvolvida para **digitalizar, padronizar e otimizar** o fluxo de apontamentos em oficinas mecânicas, frotas industriais e ambientes de manutenção complexos.

O sistema substitui controles manuais (planilhas, cadernos) por uma interface intuitiva e robusta, focada em:
- ✅ **Precisão de dados** para tomada de decisão
- ✅ **Rastreabilidade completa** de operações
- ✅ **Redução de custos operacionais**
- ✅ **Prontidão para integração ERP**

---

## 🎯 Proposta de Valor

### Rastreabilidade Total
Monitore em tempo real: quem realizou cada manutenção, qual equipamento foi atendido, em qual equipe e quanto tempo levou.

### Gestão Financeira Inteligente
Cálculo automático de custos de insumos e implementos com precisão, gerando insights imediatos sobre rentabilidade por serviço.

### Pronto para ERP
Estrutura de dados preparada para integração com **TOTVS Protheus** e sistemas de mercado, utilizando apontamentos de Data/Hora para cálculo automático de eficiência operacional.

### UX Otimizada para Oficina
Interface limpa e intuitiva, desenhada especificamente para ambientes de chão de fábrica, com login rápido e fluxo de apontamento simplificado.

---

## 🛠️ Stack Tecnológica

### Backend (API)
| Tecnologia | Descrição |
|-----------|-----------|
| **Node.js + Fastify** | Runtime de alta performance com servidor web ultrarrápido |
| **TypeScript** | Type-safety em 100% do código |
| **Drizzle ORM** | ORM type-safe e leve para PostgreSQL |
| **PostgreSQL** | Banco de dados relacional robusto (via Docker) |
| **JWT + RBAC** | Autenticação segura com controle de acesso por cargo |
| **Zod** | Validação de esquemas em tempo de execução |

### Frontend (Web)
| Tecnologia | Descrição |
|-----------|-----------|
| **React 18** | UI component library moderna e reativa |
| **Vite** | Build tool ultrarrápido (< 1s de startup) |
| **TypeScript** | Type-safety em frontend |
| **Tailwind CSS** | Estilização utilitária e responsiva |
| **TanStack Query** | Cache inteligente e sincronização de dados |
| **React Hook Form** | Gerenciamento eficiente de formulários |
| **Sonner** | Sistema de notificações elegante |

---

## 📋 Funcionalidades Principais

### ✅ Dashboard Operacional
- Indicadores em tempo real (Total de OS, Tempo Médio, Equipamentos Ativos)
- Gráficos de tendência (últimos 7 dias)
- Distribuição de serviços por tipo
- Monitoramento dinâmico de ordens de serviço

### ✅ Gestão de Inventário
- Cadastro de equipamentos com custo unitário
- Cálculo automático de custos operacionais
- Alertas de estoque baixo
- Categorização flexível

### ✅ Catálogo de Serviços
- Padronização de atividades de manutenção
- Tempo estimado por tipo de serviço
- Histórico de execução

### ✅ Apontamentos Precisos
- Registro de manutenções com início/fim automático
- Vinculação de grupos, técnicos e equipamentos
- Notas técnicas por apontamento
- Cálculo automático de duração

### ✅ Segurança Multinível
- Autenticação JWT com refresh tokens
- Controle de acesso por cargo (Admin, Manager, Technician)
- Sistema de reset de senha integrado
- Proteção de rotas backend

---

## 🚀 Quick Start

### Pré-requisitos
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+

### Backend

```bash
# Clonar repositório
git clone https://github.com/seu-usuario/fixops.git
cd fixops/api

# Instalar dependências
npm install

# Configurar variáveis de ambiente
cp .env.example .env
# Editar .env com suas credenciais

# Subir banco de dados
docker-compose up -d

# Executar migrações
npx drizzle-kit push

# Iniciar servidor de desenvolvimento
npm run dev
# API rodando em http://localhost:3333
```

### Frontend

```bash
cd fixops/web

# Instalar dependências
npm install

# Iniciar desenvolvimento
npm run dev
# Interface disponível em http://localhost:5173
```

---

## 📊 Arquitetura

```
FixOps/
├── api/                    # Backend Fastify + Drizzle
│   ├── src/
│   │   ├── server.ts       # Configuração do servidor
│   │   ├── db/
│   │   │   ├── schema.ts   # Modelos de dados
│   │   │   └── index.ts    # Conexão database
│   │   └── routes/
│   ├── .env.example        # Template de variáveis
│   └── package.json
│
├── web/                    # Frontend React + Vite
│   ├── src/
│   │   ├── pages/          # Telas principais
│   │   ├── components/     # Componentes reutilizáveis
│   │   ├── hooks/          # Custom hooks
│   │   ├── lib/            # Utilitários (axios, etc)
│   │   └── main.tsx
│   ├── vite.config.ts
│   └── package.json
│
├── docker-compose.yml      # Configuração PostgreSQL
└── README.md
```

---

## 🔑 Variáveis de Ambiente

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/fixops_db"

# Security
JWT_SECRET="your-secret-key-change-in-production"

# Server
PORT=3333

# Default Admin (criado na primeira execução)
DEFAULT_ADMIN_LOGIN=admin
DEFAULT_ADMIN_PASSWORD=password123
DEFAULT_ADMIN_EMAIL=admin@example.com
```

---

## 📈 Roadmap

- [ ] **Integração TOTVS Protheus** - Sincronização automática de ordens
- [ ] **Relatórios Avançados** - Exportação PDF/Excel com análise de eficiência
- [ ] **Mobile App** - Aplicativo nativo para apontamentos em tempo real
- [ ] **API Pública** - Webhooks para sistemas terceiros
- [ ] **BI & Analytics** - Dashboard gerencial com previsões

---

## 🤝 Como Contribuir

Contribuições são bem-vindas! Para reportar bugs ou sugerir melhorias:

1. Abra uma **Issue** descrevendo o problema/sugestão
2. Faça um **Fork** do projeto
3. Crie uma branch: `git checkout -b feature/sua-funcionalidade`
4. Commit suas mudanças: `git commit -m 'Add: sua funcionalidade'`
5. Push para a branch: `git push origin feature/sua-funcionalidade`
6. Abra um **Pull Request**

---

## 📝 Licença

Este projeto está licenciado sob a **MIT License** - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 💬 Suporte & Contato

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/fixops/issues)
- **LinkedIn**: [Seu Perfil]
- **Email**: seu-email@example.com

---

## 🎓 Aprendizados & Destaques Técnicos

Este projeto demonstra:
- ✨ Arquitetura Full Stack moderna com TypeScript
- ✨ ORM type-safe com Drizzle
- ✨ Autenticação JWT robusta com RBAC
- ✨ State management eficiente com TanStack Query
- ✨ UI responsiva com Tailwind CSS
- ✨ Otimizações de performance (lazy loading, code splitting)

---

**FixOps – Excelência em Rastreabilidade Industrial** 🏭
