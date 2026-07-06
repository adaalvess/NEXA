# NEXA — Use Cases

| | |
|---|---|
| **Documento** | Use Cases |
| **Fase** | 2 — Documentação Funcional |
| **Versão** | 1.0 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO / Product Owner |
| **Documentos de referência** | User Stories v1.0 · Functional Requirements v1.0 (Aprovados) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento detalha, para os fluxos mais críticos ou complexos já identificados no User Stories, o **percurso completo de interação** — pré-condições, fluxo principal passo a passo, fluxos alternativos, exceções, pós-condições e regras de negócio. Serve de base direta à implementação e aos testes funcionais.

### Nota de Clarificação de Âmbito

Nem toda User Story tem um Use Case correspondente — apenas as que envolvem fluxo com decisões, exceções ou regras de negócio não triviais merecem este nível de detalhe (ex: "criar uma tarefa" é suficientemente simples para não precisar de um Use Case próprio; "converter trial em subscrição" tem exceções e regras de negócio que justificam o detalhe). Cada Use Case referencia a(s) User Story(ies) e Functional Requirement(s) de que deriva, sem duplicar o que já lá está descrito.

---

## 2. Contexto

Foram selecionados 9 Use Cases, cobrindo os fluxos mais representativos de cada módulo e, em particular, os que têm impacto direto nos objetivos do Business Goals (onboarding, conversão, confiança na IA).

---

## 3. Conteúdo Estruturado

### UC-01 — Criar Empresa e Configurar Conta Inicial

**Deriva de:** US-01, US-02, US-03 · **FR:** FR-01, FR-02, FR-03, FR-04, FR-05

| | |
|---|---|
| **Pré-condições** | A pessoa não tem ainda conta na NEXA |
| **Pós-condições (sucesso)** | Empresa criada com isolamento de dados; conta de Administrador ativa; trial de 14 dias iniciado |

**Fluxo Principal**
1. A pessoa acede ao registo da NEXA e introduz dados básicos da empresa (nome, país, setor).
2. O sistema cria a Empresa (Workspace Context) com isolamento lógico face a qualquer outra empresa.
3. O sistema cria a conta de Utilizador da pessoa, associada a essa Empresa, com o papel "Administrador da Empresa".
4. O sistema inicia automaticamente o trial de 14 dias (Subscrição/Plano em estado "trial").
5. A pessoa é conduzida ao Dashboard, em estado inicial guiado (FR-12).

**Fluxos Alternativos**
- **3a.** A pessoa opta por convidar colaboradores imediatamente após a criação → segue para UC-02 antes de explorar o Dashboard.
- **3b.** A pessoa opta por criar Departamentos/Equipas antes de convidar utilizadores → a ordem entre estas duas ações não é imposta pelo sistema.

**Exceções**
- **E1.** O email usado no registo já está associado a uma conta existente → o sistema impede a criação de uma segunda Empresa com o mesmo email como Administrador único, e sugere iniciar sessão em vez de registar.

**Regras de Negócio**
- RN-01: Uma Empresa nasce sempre com exatamente um Administrador (quem a cria); mais Administradores podem ser adicionados depois, mas nunca zero.
- RN-02: O trial inicia-se automaticamente, sem exigir dados de pagamento (consistente com Business Goals, 3.1).

---

### UC-02 — Convidar Utilizador e Atribuir Papel

**Deriva de:** US-02 · **FR:** FR-02, FR-03, FR-04

| | |
|---|---|
| **Pré-condições** | Quem convida tem papel Administrador da Empresa ou Gestor (para a sua equipa); a Empresa não atingiu o limite de utilizadores do plano ativo |
| **Pós-condições (sucesso)** | Convite enviado; ao ser aceite, o Utilizador fica associado à Empresa com o papel atribuído |

**Fluxo Principal**
1. O Administrador (ou Gestor, dentro do seu escopo) introduz o email da pessoa a convidar.
2. O Administrador seleciona o papel RBAC a atribuir (e, opcionalmente, o Departamento/Equipa).
3. O sistema envia um convite por email.
4. A pessoa convidada aceita o convite e cria a sua palavra-passe.
5. O sistema associa essa pessoa à Empresa, com o papel e Departamento/Equipa definidos.

**Fluxos Alternativos**
- **2a.** O Administrador ajusta regras de permissão granulares além do papel predefinido → essas regras ficam associadas a este Utilizador dentro desta Empresa (FR-04).

**Exceções**
- **E1.** A Empresa já atingiu o limite de utilizadores do plano ativo → o convite é bloqueado; ver UC-08 (Atingir Limite do Plano).
- **E2.** O convite expira sem ser aceite (prazo a definir na Functional Specification) → o Administrador pode reenviar o convite.

**Regras de Negócio**
- RN-03: Um Gestor só pode convidar e atribuir papéis dentro do seu próprio Departamento/Equipa, nunca ao nível de toda a Empresa.
- RN-04: O papel "Super Administrador" nunca é atribuível através deste fluxo — é reservado à equipa interna da NEXA.

---

### UC-03 — Criar e Associar uma Tarefa a um Cliente

**Deriva de:** US-09, US-10 · **FR:** FR-14, FR-16, FR-18

| | |
|---|---|
| **Pré-condições** | O Utilizador tem permissão para criar tarefas no seu escopo; se associar a um Cliente, tem também permissão de visualização sobre esse Cliente |
| **Pós-condições (sucesso)** | Tarefa criada, visível na lista de Processos/Tarefas e, se associada, também no detalhe do Cliente |

**Fluxo Principal**
1. O Utilizador cria uma nova tarefa, definindo título e responsável.
2. O Utilizador associa, opcionalmente, um Departamento/Equipa.
3. O Utilizador associa, opcionalmente, um Cliente do CRM.
4. O sistema regista a tarefa e, se associada a um Cliente, cria a referência bidirecional (FR-18).

**Fluxos Alternativos**
- **3a.** O Utilizador não associa nenhum Cliente → a tarefa existe de forma independente, sem relação com o CRM.

**Exceções**
- **E1.** O Utilizador tenta associar um Cliente ao qual não tem permissão de visualização → o sistema impede a associação e informa que não tem acesso a esse Cliente.

**Regras de Negócio**
- RN-05: A visibilidade de uma tarefa segue sempre o escopo RBAC de quem a consulta, independentemente de quem a criou.

---

### UC-04 — Registar Cliente e Interação

**Deriva de:** US-12, US-13 · **FR:** FR-19, FR-20

| | |
|---|---|
| **Pré-condições** | O Utilizador tem permissão para criar Clientes no seu escopo |
| **Pós-condições (sucesso)** | Cliente criado (mesmo com dados mínimos); Interação registada no histórico do Cliente |

**Fluxo Principal**
1. O Utilizador regista um novo Cliente com, no mínimo, nome e contacto.
2. O sistema cria o Cliente em estado "existe, vazia por escolha" quanto aos campos não preenchidos (Data Model Conceptual, 3.5).
3. O Utilizador regista uma Interação associada a esse Cliente (ex: uma chamada).
4. O sistema adiciona essa Interação ao histórico do Cliente.

**Fluxos Alternativos**
- **1a.** O Utilizador preenche informação adicional (oportunidade associada, notas) no mesmo momento → o Cliente é criado já com esses dados.

**Exceções**
- Nenhuma exceção de negócio identificada para este fluxo além das já cobertas pelo RBAC (transversal a todos os Use Cases).

**Regras de Negócio**
- RN-06: Um Cliente pode existir sem nenhuma Interação registada — a ausência de histórico não é tratada como erro, apenas como estado normal de um Cliente recém-criado.

---

### UC-05 — Consultar o Assistente de IA

**Deriva de:** US-15 · **FR:** FR-23, FR-26

| | |
|---|---|
| **Pré-condições** | O Utilizador está autenticado e tem pelo menos uma entidade visível dentro do seu escopo RBAC |
| **Pós-condições (sucesso)** | Resposta apresentada ao Utilizador, registada no histórico de Conversa de IA |

**Fluxo Principal**
1. O Utilizador coloca uma pergunta ao Assistente de IA.
2. O sistema resolve a pergunta apenas com base em entidades dentro do escopo RBAC do Utilizador.
3. A camada de abstração de IA processa o pedido através do fornecedor de IA configurado (FR-26).
4. O sistema apresenta a resposta ao Utilizador.
5. O sistema regista a interação no Registo de Auditoria (FR-28).

**Fluxos Alternativos**
- **2a.** A pergunta refere-se a uma entidade fora do escopo RBAC do Utilizador → o sistema nunca revela essa informação, mesmo indiretamente (ex: não confirma nem nega a existência da entidade fora do escopo).

**Exceções**
- **E1.** O fornecedor de IA configurado está indisponível → o sistema informa o Utilizador de forma clara, sem expor detalhes técnicos do erro, e sugere tentar novamente.

**Regras de Negócio**
- RN-07: O Assistente de IA nunca deve gerar uma resposta que revele, direta ou indiretamente, a existência de dados fora do escopo RBAC de quem pergunta — este é o mesmo princípio de visibilidade única já fixado no Data Model Conceptual (D4), aplicado agora à IA.

---

### UC-06 — Receber e Confirmar uma Sugestão da IA

**Deriva de:** US-16, US-17 · **FR:** FR-24, FR-25, FR-28

| | |
|---|---|
| **Pré-condições** | O Assistente de IA identificou uma situação relevante dentro do escopo do Utilizador (ex: uma tarefa em risco) |
| **Pós-condições (sucesso — aceite)** | A ação sugerida é executada, e ambos os eventos (sugestão e execução) ficam auditados |
| **Pós-condições (sucesso — rejeitada)** | Nenhuma ação é executada; a rejeição fica registada |

**Fluxo Principal**
1. O sistema apresenta ao Utilizador uma sugestão de ação, com contexto suficiente para decidir (ex: "Tarefa X está atrasada — reatribuir a Colaborador Y?").
2. O Utilizador avalia a sugestão.
3. O Utilizador confirma a ação.
4. O sistema executa a ação sugerida.
5. O sistema regista, no Registo de Auditoria, tanto a sugestão original como a execução confirmada, distinguindo claramente autor humano de origem IA.

**Fluxos Alternativos**
- **3a.** O Utilizador rejeita a sugestão → o sistema não executa nenhuma ação e regista a rejeição (FR-25).
- **3b.** O Utilizador ignora a sugestão sem responder → a sugestão permanece pendente, visível na área de Sugestões Pendentes (Information Architecture, 3.1), sem expirar automaticamente nesta fase (comportamento de expiração não definido — ver Questão em Aberto, Q1).

**Exceções**
- **E1.** A ação sugerida deixou de ser válida entre o momento da sugestão e a confirmação (ex: a tarefa já foi concluída por outra via) → o sistema informa o Utilizador de que a ação já não se aplica, em vez de a executar de forma inconsistente.

**Regras de Negócio**
- RN-08: Nenhuma ação sugerida pela IA é executada sem confirmação explícita e individual — não existe "aceitar todas" em lote no MVP, para preservar a intenção de controlo humano definida no Vision Document, 3.9.

---

### UC-07 — Converter Trial em Subscrição Paga

**Deriva de:** US-18 · **FR:** FR-29, FR-30

| | |
|---|---|
| **Pré-condições** | A Empresa está em período de trial |
| **Pós-condições (sucesso)** | Empresa passa a estado "subscrito", com o plano escolhido ativo |

**Fluxo Principal**
1. O sistema notifica o Administrador da Empresa da aproximação do fim do trial.
2. O Administrador consulta os planos disponíveis (Starter/Professional/Enterprise) e os respetivos limites.
3. O Administrador escolhe um plano e introduz os dados de pagamento.
4. O sistema confirma a subscrição e atualiza o estado da Empresa.

**Fluxos Alternativos**
- **3a.** O Administrador não escolhe nenhum plano antes do fim do trial → segue para UC-08 (Atingir Limite do Plano), que também cobre o comportamento de trial expirado sem conversão.

**Exceções**
- **E1.** O pagamento é recusado → a Empresa permanece em estado de trial expirado (ver UC-08), com nova tentativa de pagamento disponível.

**Regras de Negócio**
- RN-09: Nenhum dado da Empresa é eliminado por não conversão do trial — a conversão tardia deve ser sempre possível sem perda de informação (consistente com "Confiança Não Se Assume, Constrói-se").

---

### UC-08 — Atingir um Limite do Plano Ativo

**Deriva de:** US-19 · **FR:** FR-31

Este Use Case **resolve formalmente a Questão Q1 herdada do Functional Requirements e do User Stories** — o comportamento exato ao atingir um limite de plano.

| | |
|---|---|
| **Pré-condições** | A Empresa está a operar dentro de um plano com limites definidos (ex: número de utilizadores) |
| **Pós-condições** | A ação que excederia o limite é bloqueada; todas as restantes funcionalidades continuam a operar normalmente |

**Fluxo Principal**
1. Um Utilizador tenta realizar uma ação que excederia um limite do plano ativo (ex: convidar um utilizador além do limite contratado).
2. O sistema verifica o limite antes de confirmar a ação.
3. O sistema bloqueia especificamente essa ação, apresentando de forma clara qual o limite atingido.
4. O sistema sugere o upgrade de plano como próximo passo.

**Fluxos Alternativos**
- **1a.** O Utilizador está a aproximar-se de um limite (ex: 90% do limite de armazenamento) → o sistema apresenta um aviso antecipado (US-19), antes de qualquer bloqueio.

**Exceções**
- Não aplicável — este Use Case descreve, ele próprio, o tratamento de uma condição-limite, não uma exceção a outro fluxo.

**Regras de Negócio (decisão formal, resolvendo Q1)**
- **RN-10:** Ao atingir um limite de plano, o sistema bloqueia **apenas a ação específica que excederia o limite** — nunca bloqueia o acesso geral à plataforma, nem funcionalidades já em uso que não dependem desse limite. Ex: atingir o limite de utilizadores impede convidar mais um utilizador, mas não impede os utilizadores existentes de continuarem a trabalhar normalmente.
- **RN-11:** Um trial que expira sem conversão para plano pago segue a mesma lógica — a Empresa entra em estado de acesso limitado (leitura permitida, ações de criação bloqueadas), nunca com eliminação ou bloqueio total de acesso aos dados, consistente com RN-09.

*Justificação desta decisão: um bloqueio total penalizaria a confiança já construída durante o trial (contrário ao valor "Confiança Não Se Assume, Constrói-se") e poderia causar perda de produtividade da empresa cliente por uma decisão comercial — o padrão de "bloquear só a ação que excede o limite, nunca o acesso à operação já em curso" é também a prática mais comum em SaaS B2B maduro, e alinha-se com a prioridade já registada no Business Goals de privilegiar retenção e confiança sobre pressão comercial agressiva.*

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Apenas 9 Use Cases foram detalhados, cobrindo os fluxos com decisões, exceções ou regras de negócio não triviais | Consistente com a disciplina de evitar sobreengenharia já reforçada nesta fase — nem toda User Story precisa do nível de detalhe de um Use Case |
| D2 | A Questão Q1 herdada (comportamento ao limite de plano) é resolvida formalmente neste documento, com regras de negócio explícitas (RN-10, RN-11) | Esta é exatamente a fase indicada para esta decisão, conforme já assinalado no User Stories (D4); adiar mais uma vez impediria a Functional Specification de avançar com este comportamento definido |
| D3 | O bloqueio por limite de plano nunca afeta funcionalidade já em uso, apenas a ação específica que excederia o limite | Protege a confiança construída durante o trial e a retenção de empresas piloto — prioridade já estabelecida no Business Goals sobre pressão comercial agressiva |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | O comportamento de expiração de uma Sugestão de IA pendente e não respondida (UC-06, 3b) não está definido — deve expirar ao fim de X dias, ou permanecer indefinidamente até ação humana? | Functional Specifications do Assistente de IA | CEO + CTO |
| Q2 | O prazo de expiração de um convite de utilizador não respondido (UC-02, E2) ainda não está definido | Functional Specifications da Fundação | CEO + CTO |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, com 9 Use Cases detalhados (pré-condições, fluxo principal, alternativos, exceções, pós-condições, regras de negócio), incluindo a resolução formal da Questão Q1 herdada sobre limites de plano (RN-10, RN-11) | CTO (Claude) + Fundadora/CEO |
| 1.0 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |
