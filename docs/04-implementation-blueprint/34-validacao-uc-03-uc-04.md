# NEXA — Validação Manual UC-03 + UC-04 (Passo 35, M6)

| | |
|---|---|
| **Documento** | Registo de validação manual — UC-03 (Tarefa associada a Cliente) e UC-04 (Registar Cliente e Interação) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M6 (Testes dos 4 Fluxos Críticos + Validação Manual dos Use Cases), Passo 35 — quarto passo do M6 |
| **Versão** | 1.0 |
| **Estado** | ✅ Concluído (2026-07-11) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Use Cases, UC-03, UC-04; FR-16, FR-18, FR-19, FR-20; Proposta do Milestone M6 |
| **Última atualização** | 2026-07-11 |

---

## 1. Método

Validação real no browser + API — Empresa de demonstração criada via API (equivalente ao fluxo já validado no Passo 34), UC-04 executado primeiro (criar Cliente) para viabilizar a associação em UC-03. Estado confirmado por leitura direta da BD e por respostas HTTP reais, nunca apenas assumido. Empresa de teste eliminada no fim da validação.

---

## 2. UC-04 — Registar Cliente e Interação

| Item | Resultado |
|---|---|
| Pré-condição (permissão para criar Clientes no seu escopo) | ✅ Já coberto por RBAC (Passo 10/30) |
| Fluxo Principal 1 (registar Cliente com nome + contacto mínimo) | ✅ Cliente criado via `/crm/novo` |
| Fluxo Principal 2 (Cliente em estado "existe, vazia por escolha") | ✅ "Oportunidade: Sem oportunidade" visível sem erro |
| Fluxo Principal 3 (registar Interação) | ✅ Interação registada via formulário no detalhe do Cliente |
| Fluxo Principal 4 (Interação adicionada ao histórico) | ✅ Visível imediatamente na lista de Interações |
| Alternativo 1a (preencher info adicional — oportunidade, notas — no mesmo momento) | ⚠️ Ver Achado A |
| RN-06 (Cliente pode existir sem Interação) | ✅ Confirmado — Cliente mostrou "Ainda não há interações registadas." sem erro, antes de qualquer Interação ser registada |

### Achado A — Fluxo Alternativo 1a não é literalmente suportado

O formulário de criação de Cliente (`/crm/novo`) só recolhe `nome`/`tipo`/`contactoPrincipal`/`owner` — não existe nenhum campo para definir a oportunidade nem notas no mesmo momento da criação. Para atingir o estado descrito em 1a ("o Cliente é criado já com esses dados"), é sempre necessário um segundo passo (editar o Cliente já criado). Não é um bug — `contactoPrincipal` continua opcional na criação por decisão já tomada no Passo 10 (CR-06: só obrigatório antes da primeira Interação) — mas o Fluxo Alternativo 1a, tal como descrito literalmente no UC-04, não tem hoje um caminho de um único passo.

---

## 3. UC-03 — Criar e Associar uma Tarefa a um Cliente

| Item | Resultado |
|---|---|
| Pré-condição (permissão para criar tarefas; permissão de visualização sobre o Cliente a associar) | ✅ Confirmado |
| Fluxo Principal 1 (criar tarefa, título + responsável) | ✅ |
| Fluxo Principal 2 (associar Departamento, opcional) | ✅ Campo presente (admin/gestor) |
| Fluxo Principal 3 (associar Cliente, opcional) | ✅ Dropdown já filtrado pelo escopo RBAC do próprio Utilizador |
| Fluxo Principal 4 (registo da tarefa + referência bidirecional, FR-18) | ⚠️ Ver Achado B |
| Alternativo 3a (sem Cliente associado → tarefa independente) | ✅ `POST /processos` sem `clienteId` → `201`, `clienteId: null` |
| Exceção E1 (associar Cliente sem permissão de visualização) | ✅ `403`, mensagem "Não tens permissão de visualização sobre este Cliente." — confirmado com pedido direto à API (contornando o dropdown já filtrado da UI, para provar que a proteção é do backend, não só da interface) |
| RN-05 (visibilidade da tarefa segue o escopo RBAC de quem consulta, não de quem criou) | ✅ Confirmado nos dois sentidos: `admin_empresa` (criador) vê a tarefa; um `colaborador` sem relação com ela (nem responsável, nem admin/gestor) vê uma lista vazia |

### Achado B — Referência bidirecional (FR-18) incompleta

FR-18 exige explicitamente "navegar de um Processo/Tarefa associado para o respetivo Cliente, **e vice-versa**". Confirmado no código e na UI:

- **Processo → Cliente**: o detalhe do Processo mostra o nome do Cliente associado, mas como **texto estático**, nunca um link clicável.
- **Cliente → Processo**: o detalhe do Cliente **não mostra nada** sobre Processos associados — nenhuma lista, nenhuma contagem, nenhuma referência.

Confirmado ao vivo: criei um Processo associado a um Cliente, o Processo mostrou o nome do Cliente (sem link); o Cliente, visitado a seguir, não mostrou nenhuma menção ao Processo. FR-18 está, portanto, **parcialmente implementado** — a associação de dados existe corretamente na BD (`Processo.clienteId`), mas a navegação cruzada bidirecional exigida pelo requisito não existe em nenhuma das duas direções como link real, e está totalmente ausente na direção Cliente→Processo. Este é o achado mais substantivo desta validação — recomenda-se registá-lo como item a corrigir num passo dedicado (fora do âmbito deste M6, que é validação, não implementação).

---

## 4. Bugs Encontrados

**Nenhum.** Zero erros de consola durante toda a sessão. Todos os fluxos, incluindo a Exceção E1 testada diretamente contra a API (contornando a UI), comportaram-se exatamente como documentado — a única falha real encontrada (Achado B) é uma lacuna de funcionalidade já confirmada, não um erro/crash.

---

## 5. Conclusão

UC-03 e UC-04 validados manualmente pelo menos uma vez, com registo escrito de cada pré-condição, fluxo, alternativa, exceção e regra de negócio, confirmados no sistema real. Dois achados registados: um menor (Alternativo 1a do UC-04, sem caminho de um único passo) e um substantivo (FR-18, referência bidirecional Processo↔Cliente incompleta — Achado B), nenhum bloqueante para o encerramento deste passo, mas o Achado B justifica atenção futura fora do M6.

**Passo 35 concluído.**
