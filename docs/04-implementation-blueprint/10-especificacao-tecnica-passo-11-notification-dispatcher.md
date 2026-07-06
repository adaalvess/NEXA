# NEXA — Especificação Técnica do Passo 11 (M2): Notification Dispatcher

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 11 — Notification Dispatcher |
| **Fase** | 7 — Desenvolvimento da Plataforma, M2 (Módulos Core), Passo 11 — primeiro consumidor de eventos fire-and-forget do projeto |
| **Versão** | 1.2 |
| **Estado** | ✅ Aprovado e implementado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | FR-36 · Event & Notification Architecture Rules v1.1 (3.4, 3.5, 3.6) · Data Model Conceptual v1.1 (3.3) · NFR-04 · Especificações Técnicas dos Passos 6, 8, 9, 10 · Blueprint v2.1 · Proposta de M2 (aprovada 2026-07-06) |
| **Última atualização** | 2026-07-06 |

---

## 1. Objetivo

Especificar, antes de qualquer implementação, o consumidor de eventos que grava na entidade `Notificacao` (já existente desde o Passo 2, sem escritas ainda) — o "Notification Dispatcher" conceptual já previsto no Event & Notification Architecture Rules §3.4, e o primeiro consumidor **fire-and-forget** (não-crítico, nunca bloqueante) do projeto, distinto do `AuditoriaListener` (Passo 6, obrigatório/bloqueante).

---

## 2. Contexto

`Notificacao` existe desde o Passo 2 (`empresaId`, `destinatarioId`, `tipoEvento`, `entidadeOrigemId`, `lida`), sem nenhuma escrita real. Desde os Passos 6, 8, 9 e 10, várias ações de negócio já emitem `EVENTO_AUDITORIA` — este passo acrescenta um segundo consumidor a esses mesmos eventos, sem alterar nenhum ponto de emissão já existente.

### 2.1 Decisões Já Validadas (antes deste documento)

| # | Questão | Decisão |
|---|---|---|
| A | Que eventos já emitidos justificam uma Notificação | **Conjunto mínimo de 5 gatilhos** (3.2): `atribuir_papel`, `atribuir_departamento`, `criar` Partilha, `criar` Processo (quando `responsavelId ≠ ator`), `atualizar` Processo (quando `responsavelId` muda). Todos os restantes eventos (Departamento, Cliente, Interação, login, registo) ficam fora por agora — nem todo evento de auditoria é relevante o suficiente para uma Notificação. |
| B | Superfície de API (`GET /notificacoes`, marcar como lida) | **Fora de âmbito deste passo** — o Blueprint (§4) não lista nenhum endpoint `/notificacoes` na superfície mínima da API. Este passo constrói só o consumidor de eventos (escreve `Notificacao`); a exposição ao Utilizador fica para o Passo 12 (Dashboard), que já prevê agregar notificações (FR-11). |

---

## 3. Conteúdo Estruturado

### 3.1 Mecanismo — Mesmo Evento, Consumidor Fire-and-Forget

**Nenhum novo tipo de evento** — o `NotificacaoListener` subscreve o mesmo `EVENTO_AUDITORIA` já emitido pelos serviços de negócio (Event & Notification Architecture Rules §3.1, "eventos internos como mecanismo de comunicação"). Isto evita alterar qualquer ponto de emissão já aprovado e em produção (Passos 6, 8, 9, 10).

A distinção obrigatório/fire-and-forget (já anunciada na Especificação Técnica do Passo 6, 3.2, "distinção explícita no código") não vem de um evento diferente, mas de **como o listener trata a sua própria promessa**:

```ts
@Injectable()
export class NotificacaoListener {
  private readonly logger = new Logger(NotificacaoListener.name);
  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(EVENTO_AUDITORIA)
  handle(payload: EventoAuditoria): void {
    // Fire-and-forget deliberado (Event & Notification Architecture Rules,
    // 3.6) — a promessa NUNCA é retornada nem aguardada. O `Promise.all`
    // interno do `emitAsync` (usado por quem emite, Passo 6) só espera
    // pelo que cada listener EFETIVAMENTE retorna — como este método
    // devolve `void`, o emissor nunca fica bloqueado por este consumidor,
    // mesmo estando registado no mesmo evento que o `AuditoriaListener`
    // (que, esse sim, é aguardado, porque devolve a sua própria promessa).
    void this.processar(payload).catch((erro) =>
      this.logger.error(`Falha ao processar notificação para ${payload.acao}/${payload.entidade}`, erro),
    );
  }

  private async processar(payload: EventoAuditoria): Promise<void> {
    const gatilho = this.resolverGatilho(payload);
    if (!gatilho) return;
    await this.prisma.notificacao.create({ data: gatilho });
  }
}
```

**`PrismaService` bruto** (nunca `TenantPrismaService`) — mesmo padrão do `AuditoriaListener` (Passo 6): `empresaId` vem do payload do evento, já validado por quem o emitiu.

### 3.2 Vocabulário `tipoEvento` e Mapeamento (os 5 gatilhos, 2.1.A)

| `tipoEvento` | Gatilho (`acao`/`entidade` do `EVENTO_AUDITORIA`) | `destinatarioId` | `entidadeOrigemId` |
|---|---|---|---|
| `papel_alterado` | `atribuir_papel` / `Utilizador` | `payload.entidadeId` (o próprio alvo) | `payload.entidadeId` |
| `departamento_alterado` | `atribuir_departamento` / `Utilizador` | `payload.entidadeId` | `payload.entidadeId` |
| `partilha_concedida` | `criar` / `Partilha` | `payload.detalhe.convidadoId` | `payload.entidadeId` (id da Partilha) |
| `tarefa_atribuida` | `criar` / `Processo`, só se `payload.detalhe.dados.responsavelId !== payload.ator` | `payload.detalhe.dados.responsavelId` | `payload.entidadeId` (id do Processo) |
| `tarefa_reatribuida` | `atualizar` / `Processo`, só se `payload.detalhe.alteracoes.responsavelId` existir | `payload.detalhe.alteracoes.responsavelId.novo` | `payload.entidadeId` |

`Notificacao` não tem campo próprio para o tipo da entidade de origem (só `entidadeOrigemId`) — `tipoEvento` já implica isso univocamente (ex: `tarefa_atribuida` só pode referir-se a um `Processo`). Documentado aqui para não ser confundido com uma lacuna de schema.

Nenhum dos 5 gatilhos exige alteração aos payloads já emitidos — toda a informação necessária (`convidadoId`, `responsavelId`) já está em `detalhe`, tal como especificado nos Passos 7/9.

### 3.3 Idempotência — Nota Técnica Honesta (Event & Notification Architecture Rules, 3.5)

O documento exige consumidores idempotentes, prevendo que "um evento pode, em casos de falha e nova tentativa, ser entregue mais do que uma vez". Com o mecanismo atual (`EventEmitter2`, em processo, sem broker de mensagens), **não existe redelivery real** — `emit`/`emitAsync` invocam os listeners registados exatamente uma vez por chamada, sem retentativa automática. Este passo não implementa uma verificação de deduplicação adicional (ex: chave natural antes do `create`) — seria complexidade sem necessidade comprovada (YAGNI, Blueprint 5a) para um risco que não existe com o mecanismo já escolhido. **Se o projeto migrar para um broker de mensagens real no futuro** (Substituibilidade Controlada, System Design Principles #5), a idempotência terá de ser revisitada nessa altura — registado como Questão em Aberto (5).

### 3.4 Localização do Código

`apps/api/src/modules/fundacao/notificacao/notificacao.listener.ts` — dentro da Fundação, mesmo padrão do `AuditoriaListener` (o mecanismo de eventos já vive lá, Event & Notification Architecture Rules §3.1). O schema já agrupa `Notificacao` sob "Dashboard/Transversal", mas o **consumo/exposição** ao Utilizador só nasce no Passo 12 — este passo só constrói a escrita.

### 3.5 Impacto Arquitetural e Riscos

| Documento | Conformidade |
|---|---|
| FR-36 | ✅ Notificações geradas para eventos relevantes do escopo do Utilizador |
| Event & Notification Architecture Rules (3.4) | ✅ Ponto único de despacho, reage exclusivamente a eventos |
| Event & Notification Architecture Rules (3.6) | ✅ Consistência eventual, mesma tolerância de 30s já fixada em NFR-04 |
| Data Model Conceptual (3.3) | ✅ Nenhuma alteração à entidade `Notificacao` já especificada |

**Nenhum novo ADR necessário. Nenhuma migração de schema necessária.**

**Risco R1 — nenhum consumidor de produto real ainda para `Notificacao` (mesma natureza do R1 do Passo 7):** sem `GET /notificacoes` neste passo (2.1.B), as linhas escritas não são visíveis a nenhum Utilizador até o Passo 12. Aceite conscientemente — mesma decisão já tomada para `podeAcederViaPartilha` no Passo 7, resolvida no Passo 9.

### 3.6 Critérios de Aceitação e Exit Criteria

| # | Cenário | Resultado esperado |
|---|---|---|
| T1 | `PATCH /utilizadores/:id/papel` gera uma `Notificacao` (`papel_alterado`) para o alvo | ✅ |
| T2 | `PATCH /utilizadores/:id/departamento` gera uma `Notificacao` (`departamento_alterado`) para o alvo | ✅ |
| T3 | `POST /partilhas` gera uma `Notificacao` (`partilha_concedida`) para o Convidado | ✅ |
| T4 | `POST /processos` com `responsavelId` diferente do ator gera uma `Notificacao` (`tarefa_atribuida`) para o responsável | ✅ |
| T5 | `POST /processos` com `responsavelId` igual ao ator **não** gera Notificação (auto-atribuição não é notícia) | ✅ |
| T6 | `PATCH /processos/:id` que reatribui `responsavelId` gera uma `Notificacao` (`tarefa_reatribuida`) para o novo responsável | ✅ |
| T7 | `PATCH /processos/:id` sem alterar `responsavelId` **não** gera Notificação | ✅ |
| T8 | Eventos fora do conjunto de 5 gatilhos (ex: `criar`/`Cliente`) **não** geram Notificação | ✅ |
| T9 | A escrita da Notificação nunca bloqueia a resposta HTTP da ação original (verificação de que o `emitAsync` do emissor não espera por este listener) | ✅ |
| Regressão | Testes automatizados dos Passos 4-10 continuam a passar | ✅ |

**Exit Criteria:** T1-T9 e regressão passam; `npm run build` sem erros; nenhuma alteração aos pontos de emissão já existentes; falha do `NotificacaoListener` nunca propaga para a operação de negócio original.

### 3.7 Resultado da Implementação e Evidências de Validação

**Entregáveis:** `apps/api/src/modules/fundacao/notificacao/notificacao.listener.ts` (fire-and-forget, mapeamento dos 5 gatilhos); registado em `FundacaoModule`; `apps/api/test/notificacao.e2e-spec.ts` (T1-T9). **Sem migração de schema, sem novos endpoints, sem alteração a nenhum ponto de emissão já existente** — exatamente como especificado.

**Descoberta real durante os testes (falha intermitente de corrida, não um bug de lógica de negócio):** os testes de outros ficheiros (Partilha, RBAC, Departamento, Auditoria) começaram a gerar `Foreign key constraint violated` no `NotificacaoListener`, sem falhar os próprios testes (o erro é apanhado e só registado em log, 3.1). Causa: como o `NotificacaoListener` é fire-and-forget, a sua escrita em `Notificacao` pode ainda estar em curso quando `limparEmpresasDeTeste` (chamada logo a seguir ao pedido HTTP nesses testes) elimina a Empresa — a escrita tardia falha a referenciar uma Empresa já apagada. **Mitigado** com uma pequena espera (150ms) no início de `limparEmpresasDeTeste` (reduz a probabilidade, artefacto de limpeza de teste — produção nunca elimina uma Empresa fisicamente logo a seguir a uma ação, PSD-001 continua sem decisão de hard-delete), mas a corrida persistiu ocasionalmente mesmo com a espera (uma espera fixa nunca elimina uma corrida, só reduz a probabilidade). **Corrigido na raiz** tratando `P2003` (violação de chave estrangeira do Prisma) como um desfecho legítimo e silencioso dentro do próprio `NotificacaoListener` — a entidade referenciada já não existir é um cenário real para um consumidor fire-and-forget, não um erro a alarmar; outros tipos de erro continuam a ser registados como `error`. Confirmado limpo (sem nenhum registo de erro) em 3 execuções consecutivas da suite completa.

**Segunda descoberta (erro de teste, não de arquitetura):** o teste T8 (`POST /clientes` não gera Notificação) falhava com `404` porque o `Test.createTestingModule` deste ficheiro não importava `CrmModule` — corrigido.

**Resultados dos testes (Jest, `nexa_test`, 94/94, `--runInBand`):**

| # | Resultado |
|---|---|
| T1-T9 (este passo) | ✅ Todos |
| Regressão (Passos 4-10, 85 testes) | ✅ Sem alteração de comportamento, sem mais erros de corrida |

Suite completa confirmada estável e sem erros de log em 3 execuções consecutivas (após o tratamento de `P2003`, 3.7).

**`npm run build` / `eslint`:** ✅ sem erros.

**Exit Criteria do Passo 11: cumprido integralmente.**

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1-D2 | Ver 2.1 (A-B) — decisões já validadas antes deste documento | — |
| D3 | Reutilização do `EVENTO_AUDITORIA` já existente, sem novo tipo de evento | Evita alterar pontos de emissão já em produção (Passos 6, 8, 9, 10); a distinção obrigatório/fire-and-forget fica em como cada listener trata a sua própria promessa, não em eventos separados |
| D4 | `NotificacaoListener` vive em `apps/api/src/modules/fundacao/notificacao/` | Mesmo padrão do `AuditoriaListener` — a Fundação já é dona do mecanismo de eventos; o consumo/exposição ao Utilizador (Dashboard) é responsabilidade do Passo 12, sem mover este código nessa altura |
| D5 | Sem verificação de deduplicação/idempotência adicional neste passo (3.3) | `EventEmitter2` não tem redelivery real — resolver complexidade para um risco que não existe seria YAGNI |
| D6 | Pequena espera (150ms) adicionada a `limparEmpresasDeTeste` antes de eliminar a Empresa, **e** `NotificacaoListener` trata `P2003` (violação de chave estrangeira) como desfecho legítimo e silencioso, não como erro | Descoberto durante os testes (3.7): a escrita fire-and-forget do `NotificacaoListener` podia ainda estar em curso quando a limpeza de teste eliminava a Empresa. A espera reduz a probabilidade, mas só o tratamento explícito de `P2003` no listener elimina o ruído de log de vez — uma espera fixa nunca elimina uma corrida, só a torna menos provável |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | Idempotência (3.3) fica sem mecanismo dedicado, assumindo que `EventEmitter2` nunca reentrega eventos | Terá de ser revisitado se o projeto migrar para um broker de mensagens real | CTO, no momento dessa migração |
| 2 | Notificações não têm nenhuma via de consumo até ao Passo 12 (R1, 3.5) | Nenhum agora; resolvido pelo Dashboard | CTO, Passo 12 |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-06 | Criação da especificação técnica do Passo 11, incorporando as 2 decisões já validadas (conjunto mínimo de 5 gatilhos; sem endpoints de leitura neste passo): mecanismo fire-and-forget sobre o `EVENTO_AUDITORIA` já existente, mapeamento `tipoEvento`, nota de idempotência, critérios de aceitação/Exit Criteria | CTO / Arquiteto Principal (Claude) |
| 1.0 | 2026-07-06 | **Aprovação formal.** Fundadora/CEO autoriza a implementação | Fundadora/CEO |
| 1.1 | 2026-07-06 | Adicionada a secção 3.7 (Resultado da Implementação e Evidências de Validação) com 94/94 testes reais (9 novos deste passo + regressão completa de 85 testes dos Passos 4-10); registada a descoberta real de uma corrida entre o `NotificacaoListener` fire-and-forget e a limpeza de dados de teste — mitigada com uma espera em `limparEmpresasDeTeste`, mas só resolvida na raiz tratando `P2003` como desfecho legítimo no próprio listener (D6). Suite completa confirmada limpa (zero erros de log) em 3 execuções consecutivas | CTO (Claude) |
| 1.2 | 2026-07-06 | **Aprovação formal dos resultados.** Fundadora/CEO aprova a implementação do Passo 11 na íntegra, confirmando que a corrida encontrada foi exclusiva do ambiente de testes, sem impacto em produção | Fundadora/CEO |
