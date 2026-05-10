FixOps – Gestão e Rastreabilidade de Manutenção Industrial
O FixOps é um ecossistema Full Stack desenvolvido para digitalizar, padronizar e otimizar o fluxo de apontamentos em oficinas mecânicas e frotas industriais. O projeto substitui controles manuais por uma interface ágil e robusta, focada em precisão de dados para tomada de decisão e redução de custos operacionais.

🚀 Proposta de Valor
O sistema foi arquitetado para resolver o gap entre a operação de chão de fábrica e a gestão administrativa, permitindo:

Rastreabilidade Total: Monitoramento de quem realizou a manutenção, em qual equipamento e para qual equipe.

Gestão Financeira: Cálculo automático de custos de insumos e implementos em tempo real.

Prontidão para ERP: Estrutura de dados preparada para integração com sistemas de mercado (ex: TOTVS Protheus), utilizando apontamentos de Data/Hora início e fim para cálculo de eficiência.

Interface Otimizada: Foco em UX para ambientes de oficina, com login simplificado via username e interface limpa.

🛠️ Stack Tecnológica
Backend (API)
Runtime: Node.js com Fastify (Alta performance).

Linguagem: TypeScript.

ORM: Drizzle ORM (Type-safe e leve).

Banco de Dados: PostgreSQL via Docker.

Autenticação: JWT (JSON Web Token) com RBAC (Controle de acesso por cargo).

Validação: Zod.

Frontend (Web)
Framework: React com Vite.

Estilização: Tailwind CSS & ShadCN UI.

Estado & Cache: TanStack Query (React Query).

Formulários: React Hook Form + Zod.

Notificações: Sonner (ShadCN).

📋 Funcionalidades Principais
[x] Dashboard Operacional: Indicadores de custo acumulado, total de ordens de serviço e catálogo ativo.

[x] Gestão de Inventário: Cadastro de equipamentos com custo unitário para cálculo automático de OS.

[x] Catálogo de Serviços: Padronização das atividades realizadas na oficina.

[x] Apontamentos Precisos: Registro de manutenções com vinculação de grupos, técnicos e tempos de execução.

[x] Segurança: Sistema de reset de senha interno e proteção de rotas por nível de acesso (Admin, Manager, Technician).

🔧 Configuração para Desenvolvimento
Clonar o repositório:

Bash
git clone https://github.com/MatheusMadrid473/fixops.git
Configurar o Backend:

Navegue até /api, instale as dependências e configure o arquivo .env.

Suba o banco de dados: docker-compose up -d.

Execute as migrações: npx drizzle-kit push.

Inicie o servidor: npm run dev.

Configurar o Frontend:

Navegue até /web, instale as dependências e inicie o Vite: npm run dev.

FixOps – Transformando a complexidade da manutenção em fluxos seguros e rastreáveis.
