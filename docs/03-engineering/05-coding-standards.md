# NEXA — Coding Standards (Versão Essencial)

| | |
|---|---|
| **Documento** | Coding Standards |
| **Fase** | 3c — Engenharia (versão essencial) |
| **Versão** | 1.0 |
| **Estado** | ✅ Aprovado — Vivo (evolui com a experiência de desenvolvimento) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Todos os ADRs (001-008) · System Design Principles v1.6 |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento fixa as **regras práticas de escrita de código** que garantem consistência entre tudo o que for gerado por IA (Claude Code) e por revisão humana — a versão essencial, focada no que previne inconsistência real, não um manual exaustivo de estilo.

---

## 2. Contexto

Quase todas as decisões estruturais já foram tomadas nos ADRs 001-008. Este documento não as repete — traduz-as em convenções de código verificáveis.

---

## 3. Conteúdo Estruturado

### 3.1 Linguagem e Formatação

- TypeScript em modo `strict`, em todo o projeto (backend e frontend, ADR-002/006).
- ESLint + Prettier com configuração partilhada entre backend e frontend — um único ficheiro de regras, não duas configurações divergentes.
- Nomenclatura: `PascalCase` para classes/componentes/tipos, `camelCase` para funções/variáveis, `kebab-case` para nomes de ficheiro e pasta.

### 3.2 Estrutura de Projeto

- **Backend (NestJS):** um módulo por domínio, espelhando exatamente os módulos do Functional Specifications — `fundacao`, `dashboard`, `processos`, `crm`, `ia`, `comercial`. Nenhum módulo importa o repositório de dados de outro diretamente (System Design Principles, 3.2).
- **Frontend (Next.js):** estrutura de rotas espelha o mapa de navegação do Information Architecture (3.1) — não é inventada ad-hoc por quem constrói cada ecrã.

### 3.3 Acesso a Dados

- Nenhuma query à base de dados fora da camada de acesso a dados única (a Camada 1 do ADR-001, implementada no ADR-003) — esta é a regra mais importante deste documento, porque protege a garantia de zero-tolerância a fugas entre Empresas (NFR-05).
- Toda entidade de negócio inclui `tenant_id`, indexado, desde a primeira migração Prisma.

### 3.4 Testes

- Cobertura obrigatória para os 4 fluxos críticos já fixados em NFR-17: isolamento multi-tenant, RBAC, limites de plano, ações de IA. Nenhum destes é aceite em código sem teste correspondente.
- Testes unitários com Jest; testes de integração apenas onde a lógica atravessa módulos (ex: fluxo de autorização completo).

### 3.5 Tratamento de Erros

- Respostas de erro da API seguem um formato único e consistente em toda a aplicação.
- Nenhum erro exposto ao cliente contém stack trace ou detalhe interno — consistente com Fail Secure (Security & Access Principles, 3.9).

### 3.6 Segredos e Configuração

- Nenhum segredo alguma vez em código ou commitado — só variáveis de ambiente (ADR-007, 3.3).
- Um ficheiro `.env.example` documenta todas as variáveis necessárias, sem valores reais.

### 3.7 Interfaces e Substituibilidade Controlada

- Toda interface que encapsula uma decisão de tecnologia (Camada 1 de dados, AI Gateway, Session Store) é documentada com comentários TSDoc explicando o contrato — não apenas o tipo, mas a garantia que fornece (ex: "nunca devolve dados fora do escopo RBAC de quem pede").

### 3.8 Git e Deployment

- Commits em formato convencional (`feat:`, `fix:`, `docs:`, etc.) — mantém o histórico legível e rastreável, coerente com a disciplina já aplicada a toda a documentação da NEXA.
- Merge para a branch principal desencadeia deployment automático (ADR-007, 3.9) — só depois de os testes dos 4 fluxos críticos passarem.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Documento mantido deliberadamente compacto, focado em regras que previnem inconsistência real | Consistente com o pedido explícito de uma versão essencial, sem detalhe excessivo antes de existir código real a informar mais detalhe |
| D2 | A regra de acesso a dados (3.3) é a única marcada como "mais importante" | Reflete que é a única regra deste documento ligada a uma garantia de zero-tolerância (NFR-05) — as restantes são consistência, esta é segurança |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Regras mais detalhadas (ex: convenções específicas de componentes React, padrões de hooks) ficam para quando existir código real a padronizar | Evolução deste documento, pós-início do desenvolvimento | CTO |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação da versão essencial, consolidando os 8 ADRs em convenções práticas de código | CTO (Claude) + Fundadora/CEO |
| 1.0 | 2026-07-02 | **Aprovação oficial como documento vivo** — evolui com a experiência de desenvolvimento, sem atrasar o início da construção | Fundadora/CEO |
