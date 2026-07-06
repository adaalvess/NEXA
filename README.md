# NEXA

Sistema Operacional Inteligente para Empresas — SaaS multi-tenant com inteligência operacional, automação e IA.

## Estado

**Passo 1 do M1 (Fundação) concluído: scaffolding do monorepo.** Ainda sem lógica de negócio — ver `Blueprint de Implementação` e a checklist de M1 para os próximos passos.

## Arquitetura (resumo — ver documentação completa em `/docs`)

- **Backend:** NestJS + TypeScript + Prisma + PostgreSQL (ADR-002, ADR-003)
- **Frontend:** Next.js + TanStack Query + Tailwind + Radix UI (ADR-006)
- **Multi-tenancy:** isolamento lógico por `tenant_id`, dupla camada (middleware + RLS) (ADR-001)
- **Autenticação:** sessões do lado do servidor, Argon2id (ADR-004)
- **IA:** AI Gateway próprio, multi-fornecedor (ADR-005)
- **Infraestrutura:** Vercel + Render + Neon, região UE (ADR-007)
- **Pagamentos:** Stripe Checkout (ADR-008)

## Como Começar (local, fora deste ambiente sandbox)

```bash
# Na raiz do repositório
npm install

# Configurar variáveis de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# preencher os valores reais — nunca commitar estes ficheiros

# Correr backend e frontend (em terminais separados)
npm run dev:api
npm run dev:web
```

## Estrutura

```
nexa/
├── apps/
│   ├── api/     # Backend NestJS
│   └── web/     # Frontend Next.js
├── docs/        # Toda a documentação aprovada (Fases 1-4)
├── package.json # Monorepo raiz (npm workspaces)
```

## Regras Não-Negociáveis (Coding Standards, 3.3)

Nenhuma query à base de dados fora da camada de acesso a dados única. Nenhum segredo em código. Nenhuma verificação de permissão fora do serviço de autorização único. Ver `/docs/03-engineering/` para a arquitetura completa.
