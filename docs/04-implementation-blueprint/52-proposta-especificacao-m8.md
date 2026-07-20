# NEXA — Proposta e Especificação Técnica do Milestone M8 (Preparação para Lançamento/Produção)

| | |
|---|---|
| **Documento** | Proposta e Especificação Técnica — M8: Preparação para Lançamento/Produção |
| **Fase** | 7 — Desenvolvimento da Plataforma, M8 |
| **Versão** | 1.0 |
| **Estado** | 🔶 Aguarda aprovação |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | [Relatório Executivo Consolidado do Estado da NEXA](../00-governance/03-relatorio-executivo-estado-nexa.md), secções 9-11 (Opção A, aprovada); Relatório Final de Encerramento do M7; ADR-007 (v1.3) |
| **Última atualização** | 2026-07-20 |

---

## 1. Objetivo do Milestone

Resolver, um a um, os 7 pré-requisitos de lançamento identificados no Relatório Executivo (secção 9) — deixar a NEXA **verdadeiramente pronta para ser lançada a clientes piloto reais**, não apenas tecnicamente completa. Âmbito exclusivamente de preparação para lançamento — nenhuma funcionalidade de produto nova, consistente com a Opção A já aprovada.

**Metodologia — sem alteração face ao M7**: alterações pequenas e controladas; validação com evidência real, nunca suposição; testes em ambiente real sempre que possível; documentação sincronizada (CLAUDE.md/Blueprint/Master Roadmap/ADRs conforme aplicável) e relatório completo no final de cada passo; Especificação Técnica própria de cada passo aprovada antes da respetiva implementação — este documento fixa a sequência e o critério de cada passo, mas cada um continua a merecer o mesmo nível de detalhe técnico já usado em M1-M7 antes de ser implementado.

---

## 2. Âmbito — 7 Passos (Numeração Continua a Partir do M7)

| Passo | Conteúdo | Resolve |
|---|---|---|
| 46 | Triagem e correção de vulnerabilidades de dependências | Item 5 do Relatório Executivo |
| 47 | Documentos legais e consentimento RGPD | Item 1 (bloqueador legal) |
| 48 | Base de dados de produção (Neon, plano pago, região UE) | Item 2 (Q4) |
| 49 | Backend + Frontend de produção (Render + Vercel) | Item 6 (ambiente de produção) |
| 50 | Observabilidade de produção + resolução do UptimeRobot | Item 3 (Q5) + item 6 (alertas) |
| 51 | Credenciais reais de fornecedores (Anthropic, Stripe, Resend) | Item 4 |
| 52 | Validação final — teste de carga, checklist de segurança, DoD do M8 | Item 7 |

**Ordem justificada**: o Passo 47 (documentos legais) é colocado cedo deliberadamente — é o único item com dependência de tempo fora do controlo de engenharia (revisão jurídica), por isso começa cedo para nunca ser o bloqueador final, mesmo que a implementação técnica de cada passo seguinte continue sequencialmente entretanto. Os Passos 48-49 seguem a mesma ordem já validada no M7 (BD → backend → frontend). O Passo 51 (credenciais reais) fica propositadamente perto do fim — só faz sentido ativar tráfego real de fornecedores pagos depois do ambiente de produção já existir e estar observável (Passo 50).

---

## 3. Especificação Detalhada por Passo

### Passo 46 — Triagem e Correção de Vulnerabilidades de Dependências

- **Propósito**: resolver as 32 vulnerabilidades já confirmadas (`npm audit`, 26 backend + 6 frontend, 0 críticas) antes de qualquer ambiente servir tráfego real.
- **Critérios de aceitação**: cada vulnerabilidade "high" investigada individualmente (é explorável no contexto real de uso da NEXA, ou é só uma dependência de build/dev nunca exposta em runtime?); corrigidas as que forem genuinamente exploráveis; as que não forem, documentadas explicitamente com a justificação de por que ficam aceites (nunca silenciosamente ignoradas); suite completa (219 testes) continua 100% verde depois de qualquer atualização de dependência.
- **Riscos**: `npm audit fix --force` pode introduzir alterações de versão major com breaking changes — nunca aplicado às cegas, cada atualização de dependência com risco de breaking change testada isoladamente.
- **Dependências**: nenhuma — pode começar imediatamente após aprovação deste documento.
- **Evidência esperada**: relatório com a lista completa das 32 vulnerabilidades, classificação individual (corrigida / aceite com justificação), e confirmação da suite completa a passar depois de cada alteração.

### Passo 47 — Documentos Legais e Consentimento RGPD

- **Propósito**: resolver o bloqueador de pré-lançamento já registado desde o Passo 26 — Termos de Serviço, Política de Privacidade, e captura de consentimento no registo público.
- **Nota de âmbito honesta, a validar já nesta especificação**: eu posso preparar um **rascunho técnico** de Termos de Serviço/Política de Privacidade, estruturado com base em práticas comuns de SaaS B2B europeu (RGPD, base legal do tratamento, direitos do titular dos dados, retenção), mas **isto nunca substitui revisão jurídica profissional** — são documentos com implicação legal real. Proposta: eu preparo o rascunho técnico + a implementação (páginas, checkbox de consentimento, registo do consentimento na BD), a Fundadora/CEO confirma que o conteúdo foi revisto por um advogado (ou decide que o rascunho é aceitável tal como está) antes de este passo ser considerado aprovado para produção.
- **Critérios de aceitação**: páginas `/termos` e `/privacidade` publicadas; checkbox de consentimento obrigatório no registo público, desabilitando o botão de submissão até estar marcado; consentimento registado na base de dados (timestamp, versão do documento aceite) — nunca apenas um checkbox visual sem persistência; confirmação explícita da Fundadora/CEO de que o conteúdo legal foi validado.
- **Riscos**: é o único passo deste Milestone com uma dependência de tempo genuinamente fora do controlo de engenharia — pode demorar mais do que os restantes.
- **Dependências**: nenhuma técnica; depende da Fundadora/CEO (ou de quem ela designar) para validar o conteúdo legal.
- **Evidência esperada**: páginas publicadas em staging, checkbox funcional testado em browser real, registo de consentimento confirmado na base de dados, confirmação explícita da Fundadora/CEO sobre a validação jurídica do conteúdo.

### Passo 48 — Base de Dados de Produção (Neon)

- **Propósito**: resolver a Questão em Aberto Q4 — provisionar a base de dados que vai servir produção diretamente num **plano pago** da Neon (região UE), com retenção de PITR de pelo menos 7 dias desde o início, nunca por "upgrade" de um projeto Free existente.
- **Critérios de aceitação**: novo projeto Neon (produção, distinto do de staging), região UE confirmada, plano pago com retenção ≥ 7 dias confirmada via API; schema/roles/RLS/trigger replicados com o mesmo rigor do Passo 40; teste de fumo real (registo, login, isolamento multi-tenant, imutabilidade da auditoria) — nunca assumido só porque staging já funciona.
- **Riscos**: custo real recorrente (plano pago) — **exige confirmação explícita da Fundadora/CEO antes de qualquer ativação de cobrança**, mesma disciplina já seguida para qualquer ação com custo neste projeto.
- **Dependências**: nenhuma técnica de passos anteriores deste M8.
- **Evidência esperada**: relatório equivalente ao do Passo 40, com a retenção de PITR confirmada ≥ 7 dias por leitura direta da API da Neon (nunca assumida).

### Passo 49 — Backend + Frontend de Produção (Render + Vercel)

- **Propósito**: replicar o processo já validado nos Passos 41-42/44 para produção — Web Service Render + projeto Vercel novos (distintos dos de staging), ligados à base de dados de produção do Passo 48, com o mesmo pipeline CI/CD real (portão de qualidade) a controlar os deploys.
- **Critérios de aceitação**: `GET /health` e `GET /` respondem `200` nos domínios de produção; CORS correto; pipeline CI/CD estendido para também dispor de um ambiente/branch de produção (a decidir nesta especificação própria do passo: branch dedicado, ou o mesmo `main` com um segundo job de deploy condicional — decisão a validar antes de implementar, não assumida aqui); teste de fumo real ponta a ponta.
- **Riscos**: introduzir um segundo alvo de deploy no mesmo pipeline exige uma decisão de arquitetura sobre como distinguir staging de produção (branches diferentes? tags/releases? aprovação manual extra?) — **decisão a trazer explicitamente para validação na Especificação Técnica deste passo, não a assumir aqui**.
- **Dependências**: Passo 48 (base de dados de produção tem de existir primeiro).
- **Evidência esperada**: relatório equivalente aos dos Passos 41/42, com URLs de produção reais, e confirmação de que staging continua a funcionar sem interferência.

### Passo 50 — Observabilidade de Produção + Resolução do UptimeRobot

- **Propósito**: resolver a Questão em Aberto Q5 (ativação da conta UptimeRobot, ação da Fundadora/CEO) e estender a observabilidade (Sentry) ao ambiente de produção; configurar alertas reais em ambos (Sentry + UptimeRobot) — atualmente nenhum dos dois notifica proativamente, mesmo já ativos em staging.
- **Critérios de aceitação**: conta UptimeRobot confirmada ativa (leitura e escrita); monitores criados para staging **e** produção; alertas configurados (pelo menos email) em Sentry e UptimeRobot; 2 projetos Sentry adicionais para produção (ou reconfiguração dos existentes com `environment: production`, decisão a validar na Especificação Técnica do passo); erro deliberado testado em produção (mesma metodologia do Passo 43) para confirmar captura real antes do lançamento.
- **Riscos**: nenhum técnico relevante além dos já geridos em M7 (dependência da conta da Fundadora/CEO continuar bloqueada — se persistir, este passo fica formalmente registado como pendente, sem bloquear os restantes, mesma disciplina já usada no Passo 43).
- **Dependências**: Passo 49 (ambiente de produção tem de existir); resolução do bloqueio da conta UptimeRobot pela Fundadora/CEO.
- **Evidência esperada**: monitores ativos confirmados via API; captura de erro real em produção confirmada nos dois dashboards Sentry (staging + produção); confirmação de alerta realmente recebido (não só configurado).

### Passo 51 — Credenciais Reais de Fornecedores (Anthropic, Stripe, Resend)

- **Propósito**: ativar, pela primeira vez em qualquer ambiente, credenciais reais dos 3 fornecedores — resolve a lacuna "nunca exercitado com tráfego real" identificada no Relatório Executivo.
- **Critérios de aceitação**: `ANTHROPIC_API_KEY` real configurada, caminho de sucesso da pergunta livre (UC-05) finalmente observável ao vivo (nunca antes possível, desde o Passo 18); Stripe em modo `live` (não só teste) com Price IDs reais, um checkout real de baixo valor executado e confirmado (ou modo teste avançado da Stripe, a decidir com a Fundadora/CEO — nunca cobrar a própria empresa sem necessidade); `RESEND_API_KEY` real, um convite de utilizador real enviado e recebido, confirmando pela primeira vez o envio de email de ponta a ponta (nunca antes observável, desde o Passo 18/31).
- **Riscos**: **este é o passo com maior risco financeiro/reputacional direto do M8** — credenciais reais de pagamento e de fornecedores pagos por uso (IA, email). Nenhuma ativação sem confirmação explícita da Fundadora/CEO, incluindo a origem exata de cada credencial (conta/projeto/plano de faturação escolhido por ela, nunca criado autonomamente por mim, mesma disciplina já seguida para Render/Vercel/Neon/Sentry/UptimeRobot em M7).
- **Dependências**: Passo 50 (observabilidade tem de estar ativa antes de expor a aplicação a tráfego real pago — queremos ver erros em tempo real, não descobri-los depois).
- **Evidência esperada**: os 3 caminhos de sucesso, nunca antes observáveis, finalmente confirmados ao vivo — pergunta à IA com resposta real, checkout com confirmação real, email de convite recebido de facto.

### Passo 52 — Validação Final: Teste de Carga, Checklist de Segurança, DoD do M8

- **Propósito**: último passo do M8, equivalente ao Passo 45 do M7 — validação técnica final antes de recomendar o encerramento do Milestone.
- **Critérios de aceitação**: teste de carga básico executado contra o ambiente de produção (definir uma carga realista para "primeiros clientes piloto", não uma carga arbitrária — a decidir com a Fundadora/CEO na Especificação Técnica própria deste passo); checklist de segurança estruturado revisto item a item (RBAC, isolamento multi-tenant, gestão de segredos, HTTPS/TLS em todos os componentes, cabeçalhos de segurança HTTP, dependências já triadas no Passo 46); checklist de encerramento dos 7 pré-requisitos do Relatório Executivo (secção 9) revisto um a um, com evidência concreta, mesma disciplina do Passo 45.
- **Riscos**: um teste de carga mal desenhado pode gerar custo real (consumo de recursos nos planos pagos) ou, no limite, indisponibilidade temporária — a desenhar com um limite de carga conservador e claramente comunicado antes de executar.
- **Dependências**: todos os passos anteriores (46-51) concluídos.
- **Evidência esperada**: relatório final de encerramento do M8, equivalente ao Relatório Final do M7 (Passo 51 deste documento), com recomendação explícita sobre se a NEXA está, ou não, genuinamente pronta para clientes piloto reais.

---

## 4. Fora de Âmbito do M8

- Qualquer funcionalidade de produto nova (Centro de Ajuda, FR-08/09/27, FR-18, notificação de trial) — fica para um Milestone de produto futuro, nunca absorvido silenciosamente aqui.
- Testes automatizados de frontend — item da Opção B/C do Relatório Executivo, não desta.
- Upgrade/downgrade/cancelamento self-service de subscrição.
- Onboarding ativo de clientes piloto reais (contactar, agendar, formar) — este M8 prepara a plataforma, não executa o lançamento comercial em si.

---

## 5. Definition of Done do M8

Os 7 pré-requisitos do Relatório Executivo (secção 9) resolvidos e confirmados com evidência real, um a um — nunca por suposição. A NEXA tem um ambiente de **produção** real, distinto de staging, com a mesma disciplina de segurança/observabilidade/CI-CD já validada em M7, e os 3 fornecedores externos finalmente exercitados com credenciais reais. Recomendação final e objetiva sobre prontidão para clientes piloto, apresentada no Passo 52.

---

## 6. Riscos Transversais do M8 (Além dos Já Listados por Passo)

- **Custo real**: pelo menos 2 passos (48, 51) implicam despesa recorrente ou por uso — nenhuma ativação sem confirmação explícita, item a item, nunca uma autorização genérica para todo o Milestone.
- **Passo 47 pode atrasar o Milestone como um todo** se a revisão jurídica demorar — proposta explícita: não bloquear os Passos 48-51 à espera do 47, desde que a Fundadora/CEO concorde (a decidir na aprovação deste documento).
- **Nenhum destes passos deve nunca expor dados reais de clientes antes do Passo 47 (RGPD) estar formalmente aprovado** — mesmo que os Passos 48-51 estejam tecnicamente prontos primeiro, o lançamento real a clientes piloto só pode acontecer depois do 47 fechar.

---

## 7. Pergunta a Validar Antes de Iniciar

**O Passo 47 (legal/RGPD) pode avançar em paralelo com os Passos 48-51 (infraestrutura de produção), ou preferes que a sequência seja estritamente uma de cada vez, pela ordem listada?** A minha recomendação é a primeira opção — como só há uma pessoa a decidir (eu, um passo de cada vez, aprovado por ti), "em paralelo" na prática significa só que o Passo 47 não bloqueia o início do 48 enquanto aguarda a tua revisão jurídica, não que ambos avancem literalmente ao mesmo tempo.
