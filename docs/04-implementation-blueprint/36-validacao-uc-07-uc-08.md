# NEXA — Validação Manual UC-07 + UC-08 (Passo 37, M6)

| | |
|---|---|
| **Documento** | Registo de validação manual — UC-07 (Converter Trial em Subscrição Paga) e UC-08 (Atingir um Limite do Plano Ativo) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M6 (Testes dos 4 Fluxos Críticos + Validação Manual dos Use Cases), Passo 37 — sexto e último passo de validação do M6 |
| **Versão** | 1.0 |
| **Estado** | ✅ Concluído (2026-07-11) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Use Cases, UC-07, UC-08; FR-29, FR-30, FR-31; RN-09, RN-10, RN-11; Proposta do Milestone M6 |
| **Última atualização** | 2026-07-11 |

---

## 1. Método

Validação real via browser + API — Empresa de demonstração criada via API (`Validacao UC07 UC08 Lda`, plano `professional` em trial automático). Sem credenciais reais da Stripe neste ambiente (`STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID_*` vazios, mesma limitação honesta já registada desde o Passo 21/23) — o efeito do webhook (`checkout.session.completed`, já coberto por teste automatizado real desde o Passo 22) foi simulado por escrita direta em `SubscricaoPlano`, permitindo observar o comportamento do sistema **depois** da conversão sem depender de uma sessão de checkout real. Estado confirmado por leitura direta da BD e por respostas HTTP reais em cada passo relevante. Empresa de teste eliminada no fim da validação.

---

## 2. UC-07 — Converter Trial em Subscrição Paga

| Item | Resultado |
|---|---|
| Pré-condição (Empresa em trial) | ✅ Confirmado — `GET /subscricao` → `estado: trial`, `diasRestantesTrial: 14` |
| Fluxo Principal 1 (sistema notifica o Administrador da aproximação do fim do trial) | ⚠️ Ver Achado A — não implementado |
| Fluxo Principal 2 (Administrador consulta os planos disponíveis e limites) | ✅ Ecrã `/subscricao` — secção "Fazer upgrade" com Starter/Professional, limites corretos |
| Fluxo Principal 3 (escolhe plano, introduz dados de pagamento) | ✅ `POST /subscricao/checkout` disparado corretamente a partir do botão "Escolher"; bloqueado por configuração ausente neste ambiente (`400`, mensagem clara, sem crash) — mesma limitação honesta já registada desde o Passo 21/23 |
| Fluxo Principal 4 (sistema confirma a subscrição e atualiza o estado da Empresa) | ✅ Confirmado — após simular o efeito do webhook (`estado: ativa`), `GET /subscricao`/UI refletiram imediatamente: badge "Ativa", secção "Fazer upgrade" desaparece |
| Alternativo 3a (não escolhe plano antes do fim do trial → segue para UC-08) | ✅ Confirmado — trial simulado como expirado (`trialIniciadoEm` há 30 dias) resultou em `estadoEfetivo: limitada`, mesma verificação e mesma mensagem usadas em UC-08 |
| Exceção E1 (pagamento recusado → permanece em trial expirado, nova tentativa disponível) | ⚠️ Ver Achado B |
| RN-09 (nenhum dado eliminado por não conversão) | ✅ Confirmado — Cliente e Processo criados antes da simulação de expiração continuaram intactos e legíveis (`GET /clientes`/`GET /processos` → `200`) depois da "expiração" |

### Achado A — Fluxo Principal 1 (notificação proativa de fim de trial) não implementado

Confirmado por inspeção do código: o `NotificacaoListener` (Passo 11) só reconhece 5 gatilhos (`atribuir_papel`, `atribuir_departamento`, `criar Partilha`, `criar`/`atualizar Processo`) — nenhum relacionado com subscrição ou trial. Confirmado também que **não existe nenhum mecanismo de tarefa agendada em todo o backend** (`grep` sem resultados para `@Cron`/`SchedulerRegistry`/`@nestjs/schedule`), consistente com a aversão já estabelecida a infraestrutura de scheduler prematura (Passo 20). A única aproximação existente é o texto passivo "X dias restantes de trial" no ecrã `/subscricao` — só visível se o Administrador visitar a página por iniciativa própria, nunca uma notificação empurrada (push/email/`Notificacao`) como o Fluxo Principal 1 descreve literalmente. Achado substantivo, nunca antes registado explicitamente — recomenda-se decisão de produto futura (fora do âmbito deste M6, que é validação, não implementação) sobre se vale a pena construir esse gatilho.

### Achado B — Exceção E1 (pagamento recusado) sem tratamento explícito (refinamento de uma Questão em Aberto já registada)

Confirmado no código do `StripeWebhookController` (Passo 22): qualquer evento Stripe que não seja `checkout.session.completed` — incluindo os relacionados com falha de pagamento — é reconhecido com `200` e **ignorado deliberadamente** (Decisão E do Passo 22, já documentada como Questão em Aberto explícita, não uma omissão silenciosa). Confirmado ao vivo que a parte estrutural da Exceção E1 funciona corretamente por efeito colateral: como o `estado` nunca chega a `ativa` sem o evento de sucesso, `POST /subscricao/checkout` nunca é bloqueado por "já ativa" (`409`) e a nova tentativa está sempre disponível. **Mas não existe nenhuma distinção de mensagem** entre "a pessoa ainda não tentou pagar" e "o pagamento foi recusado" — ambos os casos mostram exatamente o mesmo ecrã genérico de upgrade, sem nenhum aviso específico do motivo. Não é um achado novo — é a implicação prática, agora confirmada ao vivo, da Questão em Aberto já registada no Passo 22.

---

## 3. UC-08 — Atingir um Limite do Plano Ativo

| Item | Resultado |
|---|---|
| Pré-condição (Empresa a operar dentro de um plano com limites definidos) | ✅ Confirmado |
| Fluxo Principal 1 (Utilizador tenta ação que excederia um limite) | ✅ Testado com dois limites distintos — ver abaixo |
| Fluxo Principal 2 (sistema verifica o limite antes de confirmar a ação) | ✅ Verificação sempre antes de qualquer escrita (`ConviteService.criar`, `SubscricaoGuard`) |
| Fluxo Principal 3 (sistema bloqueia especificamente essa ação, com mensagem clara sobre o limite atingido) | ✅ Mensagens exatas confirmadas — ver abaixo |
| Fluxo Principal 4 (sistema sugere o upgrade de plano como próximo passo) | ✅ Ambas as mensagens de erro terminam em "Contacta o Administrador para atualizar o plano" / "...para atualizar o plano"; o ecrã `/subscricao` (onde o upgrade acontece) reaparece automaticamente sempre que `estadoEfetivo !== 'ativa'` |
| Alternativo 1a (aproximação de um limite, ex: 90% → aviso antecipado) | ⚠️ Ver Achado C |
| RN-10 (bloqueia apenas a ação específica, nunca o acesso geral) | ✅ Confirmado de forma decisiva — ver abaixo |
| RN-11 (trial expirado → acesso limitado, leitura permitida, criação bloqueada) | ✅ Confirmado — ver UC-07, Alternativo 3a |

### Confirmação decisiva de RN-10 (limite de Utilizadores, isolado de RN-11)

Para distinguir RN-10 (bloqueio de uma ação específica) de RN-11 (acesso limitado por trial expirado, que bloqueia **todas** as criações), a Empresa foi colocada em `estado: ativa` (não trial/limitada) com `limiteUtilizadores: 1` — já no limite. Confirmado no mesmo momento:

- `POST /convites` (a ação que excederia o limite) → `402`, `code: LIMITE_UTILIZADORES_ATINGIDO`, mensagem "A Empresa atingiu o limite de 1 utilizadores do plano atual. Contacta o Administrador para atualizar o plano."
- `GET /clientes` (leitura, não relacionada com o limite) → `200`, funcionando normalmente.
- `POST /processos` (**outra ação de criação**, não relacionada com o limite de Utilizadores) → `201 Created`, criada com sucesso.

Isto prova RN-10 de forma inequívoca: só a ação que efetivamente excederia o limite (`limiteUtilizadores`) foi bloqueada — outra ação de criação, no mesmo momento, na mesma Empresa, continuou a funcionar sem qualquer restrição, exatamente como o texto de RN-10 exige ("nunca bloqueia... funcionalidades já em uso que não dependem desse limite").

### Achado C — Alternativo 1a (aviso a 90%) só existe para `limiteUsoIA`

Confirmado ao vivo: com o uso de IA em 180/200 (90%), o ecrã `/subscricao` mostrou corretamente "Estás perto do limite mensal de uso de IA (90%)." (aviso já validado no Passo 23, reconfirmado aqui como parte formal da validação do UC-08). Com `limiteUtilizadores` literalmente no limite (1/1), a secção "Limites do plano" mostrou só "Utilizadores: 1", **sem nenhum aviso equivalente de aproximação**. A Decisão D do Passo 23 já documentava esta escolha ("aviso a 90% só para `limiteUsoIA`, único limite com uso real medido neste Milestone") — mas, ao contrário do que essa frase sugeria, `limiteUtilizadores` **tem**, de facto, uso real mensurável (a contagem de Utilizadores ativos já existe e é usada pelo próprio enforcement, Passo 33). Achado menor, não bloqueante — registado como possível melhoria futura (estender o aviso de 90% a `limiteUtilizadores`), fora do âmbito deste M6.

---

## 4. Bugs Encontrados

**Nenhum.** Zero erros de consola durante toda a sessão de validação. O único incidente operacional — o servidor de desenvolvimento da API reiniciar automaticamente ao detetar alterações nos scripts temporários criados dentro de `apps/api` (mesma classe de interferência dev-server-vs-ficheiro já documentada noutros passos) — foi identificado, não teve impacto no resultado (confirmado por nova tentativa após o servidor estabilizar) e não é um bug do produto.

---

## 5. Conclusão

UC-07 e UC-08 validados manualmente pelo menos uma vez, com registo escrito de cada pré-condição, fluxo, alternativa, exceção e regra de negócio, confirmados no sistema real — critério de conclusão do M6 cumprido para os 8 Use Cases na íntegra. RN-10 foi isolada de RN-11 de forma decisiva (limite de Utilizadores vs. trial expirado, testados em separado, na mesma sessão), confirmando que o sistema distingue corretamente "bloquear uma ação específica" de "bloquear toda a criação" — a distinção central que UC-08 exige. Três achados registados: um substantivo e novo (Achado A — notificação proativa de fim de trial nunca implementada), um refinamento de uma Questão em Aberto já conhecida (Achado B — Exceção E1 do UC-07 sem tratamento explícito), e um menor (Achado C — aviso de 90% ausente para `limiteUtilizadores`). Nenhum bloqueante para o encerramento do M6.

**Passo 37 concluído — os 8 Use Cases do MVP (UC-01 a UC-08) têm agora todos registo de validação manual.**
