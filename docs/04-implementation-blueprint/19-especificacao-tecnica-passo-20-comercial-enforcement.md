# NEXA — Especificação Técnica do Passo 20 (M4): Enforcement de RN-11 — Resposta Uniforme em Toda a Aplicação

| | |
|---|---|
| **Documento** | Especificação Técnica do Passo 20 — Enforcement transversal de RN-11 (subscrição limitada) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M4 (Comercial e Pagamentos), Passo 20 |
| **Versão** | 1.1 |
| **Estado** | 🟢 Implementado e formalmente aprovado |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Proposta do Milestone M4 (aprovada, 2026-07-07), Decisão 6.2 · Especificação Técnica do Passo 19 (`SubscricaoPlano`, `SubscricaoListener`) · Use Cases (UC-08, RN-09 a RN-11) · Functional Requirements (FR-31) · Security & Access Principles §3.9 (Fail Secure, Secure by Default) · Especificação Técnica do Passo 5 (`PermissaoGuard`, precedente de guard+decorator) |
| **Última atualização** | 2026-07-08 |

---

## 1. Objetivo

Aplicar RN-11 (trial expirado, ou subscrição de outra forma não ativa → estado de acesso limitado: leitura permitida, ações de criação bloqueadas) de forma **estruturalmente uniforme em toda a aplicação** — mesmo código de erro, mesma estrutura de resposta, mesma mensagem, independentemente do módulo onde a ação for bloqueada. Esta exigência foi pedida explicitamente pela Fundadora/CEO na aprovação do Passo 19. Confirma também, sem alteração de código, que a quota de IA por plano (`QuotaService`, Passo 15/19) já está corretamente diferenciada — esse enforcement específico (RN-10) já está ativo desde o Passo 19.

---

## 2. Contexto

A Proposta do M4 (Decisão 6.2) já aprovou o princípio: "novo serviço/guard em `comercial`, exportado e consumido pelos módulos de negócio". A implementação concreta, porém, levanta uma questão que essa decisão não fechou em detalhe — **como** garantir estruturalmente que a resposta é sempre idêntica, em vez de depender de cada módulo aplicar corretamente um guard e devolver a mesma mensagem por convenção (frágil — um novo endpoint futuro podia facilmente "esquecer-se"). Cinco decisões técnicas emergentes, nenhuma coberta literalmente pela Proposta do M4, precisam de validação explícita.

### 2.1 Decisões a Validar

| # | Questão | Recomendação |
|---|---|---|
| A | **Como garantir estruturalmente a uniformidade pedida — não apenas por convenção entre módulos.** A Decisão 6.2 da Proposta do M4 sugeria um guard "consumido pelos módulos de negócio" (cada módulo importaria `ComercialModule`). Isto funcionaria, mas a uniformidade da *resposta* dependeria de cada módulo aplicar corretamente o mesmo filtro de exceção — repetível, mas não estruturalmente garantido. | **Refinamento sobre a Decisão 6.2**: `SubscricaoGuard` registado **globalmente** via `APP_GUARD` (mesmo padrão já usado por `ThrottlerGuard`, `app.module.ts`) e `SubscricaoExceptionFilter` registado **globalmente** via `APP_FILTER` — ambos definidos uma única vez em `ComercialModule`, nunca precisam de ser lembrados módulo a módulo. Os endpoints de criação optam por esta regra através de um decorator leve, `@BloqueadoPorSubscricao()` (`SetMetadata`, mesmo padrão de `@RequirePermissao`, Passo 5) — os módulos de negócio importam só este decorator (sem dependências), nunca `ComercialModule` inteiro. Resultado: a resposta é *impossível* de divergir entre módulos, porque existe um único ponto de tradução de erro para HTTP em toda a aplicação — mais forte do que a Decisão 6.2 original pedia, sem a contradizer. |
| B | **Código de erro HTTP.** Já existem `403` (RBAC) e `429` (quota de IA, Passo 15/16) — nenhum dos dois descreve com precisão "bloqueado por causa do estado da subscrição". | **`402 Payment Required`** — semanticamente correto, e criticamente, **distinto e inequívoco** dos outros dois: o frontend (Passo 23) consegue sempre distinguir "sem permissão" de "quota de IA esgotada" de "subscrição limitada", sem ambiguidade nem inspeção de mensagem. |
| C | **Como saber que o trial expirou, sem scheduler.** O projeto evita deliberadamente introduzir infraestrutura de tarefas agendadas antes de ser genuinamente necessária (mesmo raciocínio já usado em PSD-003/ADR-005 §3.9a) — não há nada a "virar" `estado` de `trial` para `limitada` ao fim de 14 dias. | **Derivação dinâmica, nunca escrita por um job.** `SubscricaoService.obterEstadoEfetivo(empresaId)` calcula, a cada verificação: `cancelada`/`limitada` armazenados são sempre respeitados tal-e-qual; `trial` é reavaliado contra `trialIniciadoEm + 14 dias` (FR-30, constante nomeada `TRIAL_DURACAO_DIAS`) — se excedido, o estado efetivo é `limitada`, mesmo que a coluna na BD ainda diga `trial`. `estado` armazenado só muda por eventos reais (pagamento confirmado, Passo 22) — nunca por este cálculo. Consumido pelo `SubscricaoGuard` e, no futuro, por `GET /subscricao` (Passo 23) — nunca duas implementações do mesmo cálculo. |
| D | **Que ações exatas ficam sujeitas a este bloqueio.** RN-11 diz "ações de criação bloqueadas" — precisa de fronteiras exatas, nunca assumidas por módulo. | **Só criação de conteúdo de negócio**: `POST /processos`, `POST /clientes`, `POST /clientes/:id/interacoes`, `POST /ia/perguntar`, `POST /ia/sugestoes` (geração). **Nunca**: edição/eliminação de recursos já existentes (RN-10 protege explicitamente "funcionalidades já em uso"); confirmar/rejeitar uma sugestão de IA (opera sobre um recurso já existente, não cria um novo); ações administrativas da Fundação (Departamento, papel, convite — uma Empresa em acesso limitado continua a precisar de se conseguir gerir a si própria, ex: reduzir utilizadores para caber num plano menor). |
| E | **Mensagem e `code` únicos, independentemente do papel de quem é bloqueado.** | Uma só mensagem, um só `code` (`SUBSCRICAO_LIMITADA`) — nunca personalizados por papel no backend. O frontend (Passo 23) decide a chamada-à-ação exata (ex: botão "Atualizar Plano" só visível para `admin_empresa`) com base neste `code`, nunca o backend a construir texto diferente por papel. |

---

## 3. Conteúdo Estruturado

### 3.1 `SubscricaoService.obterEstadoEfetivo` (Decisão C)

```ts
// apps/api/src/modules/comercial/subscricao.service.ts
const TRIAL_DURACAO_DIAS = 14; // FR-30, literal — não uma configuração de negócio em aberto

@Injectable()
export class SubscricaoService {
  constructor(private readonly tenantPrisma: TenantPrismaService) {}

  async obterEstadoEfetivo(empresaId: string): Promise<EstadoSubscricao> {
    const subscricao = await this.tenantPrisma.client.subscricaoPlano.findUnique({ where: { empresaId } });
    if (!subscricao) return 'limitada'; // Fail Secure — nunca deveria acontecer desde o Passo 19, mas nunca assume acesso total na ausência de dados.

    if (subscricao.estado === 'trial') {
      const diasDesde = (Date.now() - subscricao.trialIniciadoEm.getTime()) / (1000 * 60 * 60 * 24);
      return diasDesde > TRIAL_DURACAO_DIAS ? 'limitada' : 'trial';
    }

    return subscricao.estado; // 'ativa'/'limitada'/'cancelada' já são o estado real, sem cálculo.
  }
}
```

### 3.2 `SubscricaoGuard` + `@BloqueadoPorSubscricao()` (Decisão A)

```ts
// apps/api/src/modules/comercial/bloqueado-por-subscricao.decorator.ts
export const BLOQUEADO_POR_SUBSCRICAO_KEY = 'bloqueadoPorSubscricao';
export const BloqueadoPorSubscricao = () => SetMetadata(BLOQUEADO_POR_SUBSCRICAO_KEY, true);
```

```ts
// apps/api/src/modules/comercial/subscricao.guard.ts
@Injectable()
export class SubscricaoGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly subscricaoService: SubscricaoService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const bloqueavel = this.reflector.get<boolean>(BLOQUEADO_POR_SUBSCRICAO_KEY, context.getHandler());
    if (!bloqueavel) {
      return true; // maioria dos endpoints — nunca sujeitos a esta regra (ao contrário do PermissaoGuard, aqui a ausência de metadata significa "permitir", não "negar").
    }

    const ctx = tenantContext.getStore();
    if (!ctx) return false; // Fail Secure.

    const estado = await this.subscricaoService.obterEstadoEfetivo(ctx.empresaId);
    if (estado === 'limitada' || estado === 'cancelada') {
      throw new SubscricaoLimitadaError();
    }

    return true;
  }
}
```

Registado globalmente (`APP_GUARD`, em `ComercialModule`) — corre depois do `TenantContextMiddleware` (que já populariza `tenantContext` antes de qualquer guard, independentemente da ordem entre guards). Nota deliberada de assimetria face ao `PermissaoGuard` (Passo 5): lá, ausência de metadata = negar (Fail Secure, RBAC é a regra geral); aqui, ausência de metadata = permitir (esta é uma restrição estreita e específica, não a regra geral de acesso).

### 3.3 `SubscricaoLimitadaError` + `SubscricaoExceptionFilter` (Decisões A/B/E)

```ts
// apps/api/src/modules/comercial/errors.ts
export class SubscricaoLimitadaError extends Error {}
```

```ts
// apps/api/src/modules/comercial/subscricao-exception.filter.ts
@Catch(SubscricaoLimitadaError)
export class SubscricaoExceptionFilter implements ExceptionFilter {
  catch(erro: SubscricaoLimitadaError, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();
    res.status(402).json({
      statusCode: 402,
      code: 'SUBSCRICAO_LIMITADA',
      message: 'A tua Empresa está em acesso limitado (trial expirado ou subscrição inativa). Contacta o Administrador da Empresa para atualizar o plano.',
    });
  }
}
```

Registado globalmente (`APP_FILTER`, em `ComercialModule`) — único ponto de tradução para HTTP em toda a aplicação, nunca repetido por controlador (mesmo princípio já usado no `IaExceptionFilter`, Passo 16, mas elevado a global aqui precisamente pela exigência de uniformidade entre módulos).

### 3.4 Endpoints Decorados (Decisão D)

| Endpoint | Controlador |
|---|---|
| `POST /processos` | `ProcessosController.criar` |
| `POST /clientes` | `CrmController.criarCliente` |
| `POST /clientes/:id/interacoes` | `CrmController.criarInteracao` |
| `POST /ia/perguntar` | `IaController.perguntar` |
| `POST /ia/sugestoes` | `IaController.gerarSugestoes` |

Cada um ganha `@BloqueadoPorSubscricao()`, importado só do ficheiro do decorator (`comercial/bloqueado-por-subscricao.decorator.ts`) — nenhum destes módulos passa a importar `ComercialModule`.

**Nunca decorados** (Decisão D): `PATCH`/`DELETE /processos/:id`, `PATCH /clientes/:id`, `POST /ia/sugestoes/:id/confirmar`/`.../rejeitar`, todos os endpoints de `fundacao` (Departamento, papel, convite, Partilha).

### 3.5 `ComercialModule` — Providers Globais

```ts
@Module({
  imports: [FundacaoModule],
  controllers: [ComercialController],
  providers: [
    SubscricaoListener,
    SubscricaoService,
    { provide: APP_GUARD, useClass: SubscricaoGuard },
    { provide: APP_FILTER, useClass: SubscricaoExceptionFilter },
  ],
  exports: [SubscricaoService],
})
export class ComercialModule {}
```

`SubscricaoService` exportado — não para os módulos de negócio o consumirem diretamente neste passo (nenhum precisa, o `SubscricaoGuard` já cobre a necessidade real via decorator), mas para o Passo 23 (`GET /subscricao`) o reutilizar sem duplicar o cálculo de 3.1.

### 3.6 Impacto Arquitetural

| Documento | Conformidade |
|---|---|
| RN-11 | ✅ Ações de criação bloqueadas, acesso de leitura preservado |
| RN-10 | ✅ Funcionalidades já em uso (edição, confirmação de sugestões) nunca bloqueadas |
| Pedido explícito da Fundadora/CEO (aprovação do Passo 19) | ✅ Resposta uniforme garantida estruturalmente (guard + filtro globais), não por convenção |
| Security & Access Principles §3.9 (Fail Secure) | ✅ Ausência de `SubscricaoPlano`/`TenantContext` nunca resulta em acesso permitido |
| ADR-005 §3.9a / PSD-003 (evitar scheduler prematuro) | ✅ Estado derivado dinamicamente, sem nova infraestrutura |

**Nenhum novo ADR necessário.**

### 3.7 Critérios de Aceitação e Exit Criteria

| # | Cenário | Resultado esperado | Resultado |
|---|---|---|---|
| T1 | Subscrição `limitada` → `POST /processos` devolve `402`, `code: SUBSCRICAO_LIMITADA` | HTTP real | ✅ |
| T2 | Mesma resposta (`402`, mesmo `code`, mesma `message`) em `POST /clientes` | HTTP real | ✅ |
| T3 | Mesma resposta em `POST /clientes/:id/interacoes` | HTTP real | ✅ |
| T4 | Mesma resposta em `POST /ia/perguntar` | HTTP real | ✅ |
| T5 | Mesma resposta em `POST /ia/sugestoes` (geração) | HTTP real | ✅ |
| T6 | **Prova estrutural de uniformidade** — comparar byte-a-byte o corpo da resposta de Processos e de IA (dois módulos distintos) | HTTP real | ✅ `JSON.stringify` idêntico |
| T7 | `PATCH /processos/:id` nunca bloqueado, mesmo com subscrição `limitada` (RN-10) | HTTP real | ✅ |
| T8 | `POST /ia/sugestoes/:id/confirmar` nunca bloqueado, mesmo com subscrição `limitada` | HTTP real | ✅ |
| T9 | `POST /departamentos` nunca bloqueado, mesmo com subscrição `limitada` | HTTP real | ✅ |
| T10 | Trial dentro dos 14 dias — nunca bloqueado | HTTP real | ✅ |
| T11 | Trial expirado (`trialIniciadoEm` há mais de 14 dias, `estado` ainda `trial` na BD) — bloqueado corretamente, confirma deteção dinâmica sem scheduler | HTTP real | ✅ |
| T12 | Subscrição `ativa` — nunca bloqueada, mesmo com `trialIniciadoEm` antigo | HTTP real | ✅ |
| T13 | Regressão completa — todos os testes herdados (141) continuam a passar | `npm run test:e2e` | ✅ 153/153 |
| T14 | `npm run build` sem erros | build limpo | ✅ |

**Exit Criteria: T1-T14 todos cumpridos.** T6 é a prova estrutural, automatizada, da exigência de uniformidade pedida pela Fundadora/CEO — tratada como teste estrutural (compara respostas de dois módulos distintos byte-a-byte), não apenas funcional.

### 3.8 Resultado da Implementação e Evidências de Validação

**Entregáveis:**
- `apps/api/src/modules/comercial/` — `bloqueado-por-subscricao.decorator.ts` (`@BloqueadoPorSubscricao()`), `subscricao.service.ts` (`SubscricaoService.obterEstadoEfetivo`), `subscricao.guard.ts` (`SubscricaoGuard`, global), `subscricao-exception.filter.ts` (`SubscricaoExceptionFilter`, global), `errors.ts` (`SubscricaoLimitadaError`). `ComercialModule` atualizado — `SubscricaoGuard`/`SubscricaoExceptionFilter` registados via `APP_GUARD`/`APP_FILTER`, `SubscricaoService` exportado.
- 5 endpoints decorados com `@BloqueadoPorSubscricao()`: `ProcessosController.criar`, `CrmController.criarCliente`, `CrmController.criarInteracao`, `IaController.perguntar`, `IaController.gerarSugestoes` — cada um só importa o decorator, nunca `ComercialModule`.
- `apps/api/test/comercial-enforcement.e2e-spec.ts` — 12 testes (T1-T12), único ficheiro a importar `ProcessosModule`, `CrmModule`, `IaModule` e `ComercialModule` em simultâneo, necessário para T6 provar uniformidade entre módulos.

**Implementação estritamente conforme a especificação aprovada** — nenhuma situação surgiu durante a implementação que exigisse alterar a arquitetura, o âmbito ou uma decisão já aprovada; nenhuma decisão adicional tomada sem validação prévia, conforme pedido explícito da Fundadora/CEO na aprovação desta especificação.

**Resultados de validação:**
- `apps/api/test/comercial-enforcement.e2e-spec.ts` — 12 testes (T1-T12), via HTTP real.
- Suite completa: **153/153 testes** (141 herdados + 12 novos), zero regressões.
- `npm run build` (`apps/api`) limpo.

**Exit Criteria T1-T14: todos cumpridos.** RN-11 aplicada de forma estruturalmente uniforme em toda a aplicação, confirmado por teste estrutural dedicado (T6).

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | `SubscricaoGuard`/`SubscricaoExceptionFilter` globais (`APP_GUARD`/`APP_FILTER`), decorator leve `@BloqueadoPorSubscricao()` (Decisão a Validar A) | Uniformidade garantida estruturalmente, nunca por convenção entre módulos — refinamento sobre a Decisão 6.2 da Proposta do M4, não uma contradição |
| D2 | Código de erro `402 Payment Required` (Decisão a Validar B) | Distinto e inequívoco de `403`/`429` já existentes |
| D3 | Estado efetivo derivado dinamicamente, nunca escrito por scheduler (Decisão a Validar C) | Consistente com a aversão já estabelecida a infraestrutura de tarefas agendadas prematura |
| D4 | Só 5 endpoints de criação de conteúdo de negócio ficam sujeitos (Decisão a Validar D) | RN-10 protege explicitamente funcionalidades já em uso; ações administrativas da Fundação nunca bloqueadas |
| D5 | Mensagem/`code` únicos, nunca personalizados por papel no backend (Decisão a Validar E) | Pedido explícito da Fundadora/CEO; frontend decide a CTA com base no `code` |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável |
|---|---|---|---|
| 1 | `GET /subscricao` (estado efetivo da própria Empresa, para o frontend mostrar "X dias restantes de trial") continua a não existir | Fica para o Passo 23, mesmo raciocínio de adiamento já usado nos Passos 16-19 | CTO, no Passo 23 |
| 2 | Aviso antecipado ao aproximar-se do fim do trial (US-19, "90% do limite") ainda não implementado | Fora do âmbito literal deste passo (RN-11 é sobre o bloqueio em si, não o aviso prévio); considerar no Passo 23 | CEO + CTO |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-07 | Criação da proposta de Especificação Técnica do Passo 20 — sem implementação. Cinco Decisões a Validar (A-E): guard/filtro globais com decorator leve de opt-in (refinamento estrutural sobre a Decisão 6.2 da Proposta do M4, respondendo diretamente ao pedido de resposta uniforme da Fundadora/CEO), código `402`, estado efetivo derivado dinamicamente sem scheduler, âmbito exato de 5 endpoints de criação, mensagem/`code` únicos sem personalização por papel. Plano de testes T1-T14, incluindo T6 como prova literal de uniformidade (não executado ainda) | CTO / Arquiteto Principal (Claude) |
| 1.1 | 2026-07-08 | Adicionado §3.8 — Resultado da Implementação, após aprovação e implementação completa das 5 Decisões a Validar (A-E) tal como propostas, sem nenhum desvio à arquitetura, âmbito ou decisões já aprovadas (confirmado explicitamente, conforme pedido da Fundadora/CEO). T1-T14 confirmados, 153/153 testes, T6 tratado como teste estrutural. RN-11 aplicada de forma uniforme em toda a aplicação | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |
