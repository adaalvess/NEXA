# NEXA — ADR-007: Infraestrutura, Hosting e Observabilidade

| | |
|---|---|
| **Documento** | ADR-007 — Infraestrutura, Hosting e Observabilidade |
| **Fase** | 3b — Architecture Decision Records (7 de 7 — último ADR planeado) |
| **Versão** | 1.4 |
| **Estado** | ✅ Aprovado |
| **Owner** | CTO / Arquiteto Principal / Fundadora / CEO |
| **Documentos de referência** | ADR-002, ADR-003, ADR-004, ADR-005, ADR-006, ADR-008 · Vision Document v1.1 (3.10) · Security & Access Principles v1.1 (3.8) · NFR-09, NFR-10, NFR-11, NFR-12, NFR-20, NFR-21 |
| **Última atualização** | 2026-07-20 |

---

## 1. Objetivo

Este ADR decide o **cloud provider, a estratégia de deployment, a gestão de segredos, a observabilidade, e os backups** da NEXA — e fecha explicitamente 3 questões deixadas em aberto por ADRs anteriores, precisamente porque dependiam desta decisão: política de sessão (ADR-004, Q1), rate limiting de login (ADR-004, Q3), e particionamento do Registo de Auditoria (ADR-005, 3.9a).

---

## 2. Contexto

A restrição mais determinante é NFR-16: uma pessoa, sem equipa de operações dedicada. A escolha de infraestrutura tem de privilegiar serviços geridos que absorvam complexidade operacional, mesmo com menos controlo fino do que uma equipa dedicada teria. O alojamento tem de respeitar a UE (Vision Document, 3.10; NFR-21), e a base de dados já decidida (PostgreSQL, ADR-003) tem de ser suportada de forma gerida nessa região.

---

## 3. Conteúdo Estruturado

### 3.1 Alternativas Consideradas — Plataforma de Hosting

**Opção A — Hyperscaler Direto (AWS, Google Cloud, ou Azure)**

| Prós | Contras |
|---|---|
| Máxima flexibilidade e teto de escala mais elevado | Complexidade operacional desproporcional a uma pessoa sem equipa de operações — contradiz NFR-16 |
| Credibilidade "enterprise" reconhecida | Maior risco de configuração incorreta de segurança |
| — | Custo inicial tipicamente mais elevado para a escala do MVP |

**Opção B — Plataformas Geridas Especializadas — Vercel (frontend) + Render (backend) + Neon (base de dados)**

| Prós | Contras |
|---|---|
| Deployment por git push, sem gestão manual de servidores — proporcional a NFR-16 | Menos controlo fino do que um hyperscaler |
| Vercel é mantido pela mesma equipa do Next.js já escolhido (ADR-006) — integração nativa | Introduz múltiplos fornecedores em vez de um único — mitigado por cada peça estar encapsulada atrás de configuração |
| Neon é PostgreSQL especializado, com branching de base de dados — permite testar migrações em segurança | — |
| Todas as três têm região UE disponível (NFR-21) | — |
| Gestão de segredos, backups automáticos, e TLS incluídos por defeito | — |

**Opção C — Uma Única Plataforma "Tudo-em-Um"**

| Prós | Contras |
|---|---|
| Um único fornecedor, uma única fatura | Perde a integração nativa Vercel-Next.js e o branching de base de dados do Neon — vantagem não suficiente para compensar |

### 3.2 Decisão — Plataforma de Hosting

**A NEXA aloja o frontend em Vercel, o backend (API NestJS) em Render, e a base de dados PostgreSQL em Neon — todos com região UE ativa.**

O número ligeiramente maior de fornecedores é aceitável porque cada um está encapsulado atrás de configuração, nunca de código específico de fornecedor — consistente com o Princípio de Evolução Tecnológica (System Design Principles, 3.8).

### 3.3 Gestão de Segredos

Consistente com Security & Access Principles (3.8): todos os segredos são geridos através dos mecanismos nativos de variáveis de ambiente encriptadas de cada plataforma — nunca em código nem em ficheiros versionados. Um gestor de segredos dedicado não é introduzido nesta fase — complexidade desproporcional à escala atual; a porta fica aberta para essa evolução se um requisito Enterprise futuro o exigir.

### 3.4 Observabilidade — Logging, Rastreio de Erros e Disponibilidade

- **Logs estruturados** (JSON), visíveis através da consola nativa de cada plataforma — suficiente para o volume atual.
- **Sentry** para rastreio de erros — SDKs TypeScript maduros, forte representação em dados de treino de IA, nível gratuito adequado à escala atual, cumprimento direto de NFR-20.
- **Monitorização de disponibilidade (uptime)** — prática recomendada, registada aqui mas não implementada nesta fase: uma solução externa de verificação periódica de disponibilidade (ex: UptimeRobot, Better Stack) confirma que a plataforma está acessível de fora da própria infraestrutura, complementando o Sentry (que só deteta erros dentro da aplicação em execução, não uma indisponibilidade total). A ativar antes do lançamento com empresas piloto, não necessariamente já nesta fase de arquitetura.

### 3.5 Resolução da Questão Q1 do ADR-004 — Política de Sessão

**Decisão:** sessões com validade de 7 dias, renovada de forma deslizante em cada pedido autenticado. Um job periódico (agendador nativo do Render) limpa sessões expiradas semanalmente.

### 3.6 Resolução da Questão Q3 do ADR-004 — Rate Limiting

**Decisão:** o endpoint de autenticação aplica um limite de 5 tentativas falhadas por combinação IP+conta em 15 minutos, com bloqueio progressivo — implementado ao nível da aplicação (guard do NestJS), suficiente por si só para o MVP.

**Camada de rede opcional (não decisão definitiva):** um proxy de rede com WAF, rate limiting e proteção DDoS (ex: Cloudflare, nível gratuito) fica registado como **camada adicional disponível**, a ativar conforme a evolução do produto e do tráfego real — não como dependência assumida desde já. Isto evita comprometer a NEXA com um fornecedor específico antes de existir evidência de necessidade, consistente com o Princípio de Evolução Tecnológica (System Design Principles, 3.8): a aplicação funciona corretamente com ou sem esta camada, que se acrescenta sem alterar a arquitetura por trás dela.

### 3.7 Resolução do Requisito 3.9a do ADR-005 — Particionamento do Registo de Auditoria

**Decisão de princípio:** o Registo de Auditoria é particionado nativamente no PostgreSQL por intervalo de tempo (ex: partições mensais), permitindo que dados fora da janela de retenção obrigatória (mínimo 12 meses, NFR-09) sejam movidos para armazenamento de baixo custo sem afetar a performance de escrita das partições ativas. O detalhe exato de implementação fica para a Fase 5.

### 3.8 Backups e Continuidade

Backups automáticos diários com retenção mínima de 7 dias, e recuperação num ponto no tempo, incluídos nativamente na oferta gerida do Neon — sem configuração manual. **Testes periódicos de recuperação (restore)** são exigidos como prática obrigatória, não apenas os backups em si — um backup nunca testado é uma garantia não verificada; a cadência exata (ex: trimestral) fica a definir na Fase 5, mas o requisito de a exercitar periodicamente é fixado já aqui.

**Exceção temporária, aprovada pela Fundadora/CEO (2026-07-12, Passo 40, M7):** o ambiente de **staging** usa o plano Neon Free, cuja retenção de recuperação num ponto no tempo (PITR) é de **6 horas**, abaixo do mínimo de 7 dias fixado acima. Esta exceção aplica-se **exclusivamente a staging** — nunca a produção. **Antes de qualquer lançamento em produção, o plano Neon tem de ser atualizado para garantir a retenção mínima de 7 dias já decidida nesta secção**, sem exceção. Ver Questão em Aberto Q4 (secção 5).

### 3.9 CI/CD

Deployment automático a partir do repositório git principal (suportado nativamente por Vercel e Render). Uma verificação automática dos testes obrigatórios (NFR-17) corre antes de cada deployment via GitHub Actions, como último portão antes de produção.

**Lacuna real identificada (Passo 47, M8, 2026-07-20)**: o pipeline aplica migrações de schema (`prisma migrate deploy`) só contra a base de dados **efémera do próprio runner de CI** (usada para correr a suite de testes) — nunca contra a base de dados real de staging (Neon). O `buildCommand` do Render (`render.yaml`) nunca incluiu este passo. Até este passo, isto nunca se tinha manifestado como incidente porque cada passo anterior que introduziu uma migração de schema lembrou-se de a aplicar manualmente à Neon de staging antes ou durante a validação (Passo 40 em diante) — mas não é um processo automatizado nem à prova de esquecimento, como este próprio passo demonstrou (a migração do Passo 47 só foi aplicada à Neon de staging depois de um `500` real em produção de staging, diagnosticado e corrigido na hora). Adicionalmente, ao contrário do ambiente local (onde os 3 roles de runtime têm privilégios concedidos automaticamente em tabelas novas), a Neon de staging **não tem `ALTER DEFAULT PRIVILEGES` configurado** para o role `nexa_owner` — cada tabela nova exige `GRANT` explícito aos roles `nexa_app`/`nexa_fundacao` depois de cada migração, também nunca automatizado. Registado como Questão em Aberto Q6 (secção 5) — decisão de como automatizar isto (passo dedicado no pipeline, com `DATABASE_ADMIN_URL` como novo secret) fica para validação explícita, não assumida aqui, dado o risco de introduzir migrações automáticas contra uma base de dados real sem um portão manual.

### 3.10 Suporte à Camada Comercial (ADR-008)

Consistente com a expansão de âmbito aprovada (PRD v1.1, Camada Comercial e Produto): esta infraestrutura já suporta diretamente o fluxo de Stripe Checkout (ADR-008) — os webhooks de pagamento chegam ao backend alojado no Render, verificados e processados de forma idempotente (ADR-008, 3.4), sem exigir nenhuma peça de infraestrutura adicional além das já decididas aqui.

### 3.11 Princípio Operacional — Serviços Geridos e Automação em Primeiro Lugar

*Adicionado por pedido explícito, formalizando um critério que já orientou implicitamente todas as decisões deste ADR.*

Sempre que existir uma escolha entre gerir manualmente uma capacidade de infraestrutura ou usar um serviço gerido, automatizado, ou integrado com IA que a resolva, a NEXA **privilegia a segunda opção** — reduzindo a necessidade de intervenção manual, sem comprometer segurança, qualidade ou escalabilidade. Este princípio já está implícito em todas as decisões deste documento (hosting gerido em vez de servidores próprios, backups automáticos em vez de scripts manuais, deployment por git push em vez de processos manuais) — fica aqui formalizado como critério explícito para decisões futuras de infraestrutura, incluindo as que ainda não foram tomadas (ex: a introdução futura de agregação de logs, ou de um serviço de secrets dedicado).

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Vercel + Render + Neon, todos em região UE | Prioriza a capacidade real de cada peça sobre a conveniência de um único fornecedor; cada peça encapsulada atrás de configuração |
| D2 | Sentry para rastreio de erros; logs nativos de plataforma para o resto | Proporcional à escala atual |
| D3 | Sessão de 7 dias com renovação deslizante (resolve ADR-004, Q1) | Equilibra segurança com experiência |
| D4 | Rate limiting aplicacional como decisão suficiente para o MVP; Cloudflare registado como camada de rede opcional, não assumida (resolve ADR-004, Q3) | Evita dependência desnecessária de um fornecedor específico antes de existir evidência de necessidade, consistente com o Princípio de Evolução Tecnológica |
| D5 | Particionamento do Registo de Auditoria por intervalo de tempo, como decisão de princípio (resolve ADR-005, 3.9a) | Fecha a lacuna de escala sem antecipar detalhe de implementação prematuro |
| D6 | Monitorização de disponibilidade (uptime) registada como prática recomendada, a ativar antes do lançamento com empresas piloto | Complementa o Sentry, que só deteta erros dentro da aplicação, não uma indisponibilidade total |
| D7 | Testes periódicos de recuperação de backups exigidos como prática obrigatória | Um backup nunca testado é uma garantia não verificada — a cadência exata fica para a Fase 5 |
| D8 | Formalizado o Princípio Operacional de privilegiar serviços geridos, automação e integração com IA sobre gestão manual | Torna explícito um critério que já orientava implicitamente todas as decisões deste ADR, aplicável também a decisões de infraestrutura futuras |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Estratégia exata de armazenamento de baixo custo para partições de auditoria arquivadas | Fase 5 | CTO |
| Q2 | Momento exato de introdução de um serviço de agregação de logs dedicado | Revisão futura, orientada por evidência | CTO |
| Q3 | Parâmetros exatos de calibração do rate limiting | Coding Standards / observação pós-lançamento | CTO |
| Q4 | Upgrade do plano Neon (Free → pago) para elevar a retenção de PITR de 6h para o mínimo de 7 dias já exigido em 3.8 — **obrigatório antes de qualquer lançamento em produção**, aceite temporariamente só para staging (Passo 40, M7, 2026-07-12) | Bloqueante para produção, não para staging | Fundadora/CEO (decisão de custo) |
| Q5 | Criação dos 2 monitores UptimeRobot (backend `nexa-api-staging`, frontend `nexa-web-staging`, ambos já identificados no Passo 43, M7, 2026-07-14) — bloqueada por `access_denied` da API da UptimeRobot na conta da Fundadora/CEO (leitura funciona, escrita não; conta com `active_subscription: null`, criada horas antes, indício de verificação pendente do lado do fornecedor); Sentry (rastreio de erros) já concluído e validado, não afetado por esta questão | **Obrigatório antes de qualquer lançamento com empresas piloto/produção** (ADR-007 §3.4/D6), não bloqueante para o encerramento do M7 nem do Passo 43 | Fundadora/CEO (ação na conta UptimeRobot) |
| Q6 | Migrações de schema (`prisma migrate deploy`) e `GRANT`s de tabelas novas nunca automatizados contra a Neon de staging (só contra a BD efémera de CI) — aplicados manualmente a cada passo desde o Passo 40; incidente real no Passo 47 (M8, 2026-07-20) quando isto foi esquecido, causando um `500` real em staging até ser diagnosticado e corrigido na hora (ver §3.9) | A decidir antes do Passo 49 (ambiente de produção) — automatizar no pipeline exige um novo secret (`DATABASE_ADMIN_URL`) e uma decisão explícita sobre o nível de portão manual para migrações contra bases de dados reais, nunca assumida | CTO (Claude), decisão de arquitetura a validar com a Fundadora/CEO |

---

## 6. Validação Arquitetural Final

*Resumo — narrativa completa disponível no Architecture Review Log caso seja solicitada auditoria formal.*

1. **Dependência tecnológica desnecessária?** Moderada e aceite conscientemente — 3 fornecedores geridos, cada um encapsulado atrás de configuração.
2. **Risco de escalabilidade futura?** Não bloqueante — as três plataformas escalam muito além do volume projetado.
3. **Risco de segurança, performance ou manutenção não mitigado?** Nenhum sem mitigação explícita.
4. **Coerência com todos os princípios já definidos?** Sim — fecha 3 questões pendentes de ADRs anteriores, sem contradizer nenhuma.
5. **Oportunidade de reforçar sem complexidade desnecessária?** Sim: Cloudflare acrescenta Defense in Depth sem custo relevante.
6. **Lacuna documental a resolver agora?** Não de forma bloqueante.
7. **Válida daqui a 5-10 anos?** Sim — caminho de migração para hyperscaler preservado, se algum dia necessário.
8. **Alinhada com a filosofia fundacional?** Sim — simplicidade, evolução incremental, baixo acoplamento, independência tecnológica, segurança por defeito, manutenção assistida por IA.

**Parecer do Arquiteto Principal:** decisão madura para arquitetura permanente. Fecha, de forma coerente, três lacunas deixadas deliberadamente em aberto por ADRs anteriores — comportamento correto de sequenciamento. **Com este ADR, os 7 ADRs planeados da Fase 3b estão completos** (mais o ADR-008, adicional, motivado pelo pivô de execução).

---

## 7. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do ADR, decidindo Vercel + Render + Neon como infraestrutura gerida em região UE, resolvendo 3 questões herdadas do ADR-004 e ADR-005, e confirmando suporte à Camada Comercial (ADR-008). Fecha os 7 ADRs planeados da Fase 3b | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Cloudflare reformulado como camada de rede opcional (não decisão definitiva); adicionada monitorização de disponibilidade (uptime) como prática recomendada; adicionados testes periódicos de recuperação de backups; formalizado o Princípio Operacional de privilegiar serviços geridos e automação (3.11) | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado. Fecha os 7 ADRs planeados da Fase 3b (mais o ADR-008 adicional) | Fundadora/CEO |
| 1.2 | 2026-07-12 | **Exceção temporária registada em 3.8, aprovada pela Fundadora/CEO (Passo 40, M7)**: staging usa o plano Neon Free (retenção de PITR de 6h, abaixo do mínimo de 7 dias já decidido nesta secção) — exceção exclusiva de staging, nunca de produção; upgrade do plano obrigatório antes de qualquer lançamento em produção. Nova Questão em Aberto Q4 (secção 5), com responsável e critério de bloqueio explícitos, para que a exceção nunca seja esquecida | CTO (Claude) + Fundadora/CEO |
| 1.3 | 2026-07-14 | **Passo 43 (M7, Observabilidade) concluído e formalmente aprovado pela Fundadora/CEO — Sentry (§3.4/D2) implementado e validado ao vivo** nos dois componentes de staging. Monitorização de disponibilidade (§3.4/D6, UptimeRobot) bloqueada por `access_denied` na conta da Fundadora/CEO (leitura funciona, escrita não — indício de verificação de conta pendente do lado do fornecedor); decisão explícita da Fundadora/CEO de encerrar o Passo 43 sem esta dependência externa, registando-a como nova Questão em Aberto Q5 (secção 5) — **obrigatória antes de qualquer lançamento com empresas piloto/produção**, nunca esquecida | CTO (Claude) + Fundadora/CEO |
| 1.4 | 2026-07-20 | **Lacuna real identificada e corrigida durante o Passo 47 (M8): migrações de schema e `GRANT`s de tabelas novas nunca automatizados contra a Neon de staging** — o pipeline de CI/CD (§3.9) só aplica migrações contra a base de dados efémera do próprio runner, nunca contra a Neon real; incidente real (`500` em staging) causado por esta lacuna, diagnosticado e corrigido na hora (migração + `GRANT`s aplicados manualmente, mesma disciplina do Passo 40). Nova Questão em Aberto Q6 (secção 5) — decisão sobre automatizar isto no pipeline fica para validação explícita antes do Passo 49 (ambiente de produção), nunca assumida | CTO (Claude) + Fundadora/CEO |
