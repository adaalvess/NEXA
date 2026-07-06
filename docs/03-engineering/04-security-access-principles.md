# NEXA — Security & Access Principles

| | |
|---|---|
| **Documento** | Security & Access Principles |
| **Fase** | 3 — Engineering Principles (4 de 4 — último documento desta subfase) |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado |
| **Owner** | CTO / Fundadora / CEO |
| **Documentos de referência** | System Design Principles v1.3 · Data & Consistency Rules v1.1 · Event & Notification Architecture Rules v1.1 · Vision Document v1.1 (RBAC, 3.10) (Aprovados) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento fixa os **princípios técnicos de RBAC, permissões e regras de partilha** — como as decisões de acesso já aprovadas (Vision Document, Data Model Conceptual, RN-05 a RN-07, FR-35) se tornam garantias de engenharia verificáveis. É o último dos 4 documentos da Fase 3 — Engineering Principles, e o mais sensível: aplica com especial rigor o limite já registado no System Design Principles (3.7) — a arquitetura **reforça** decisões de acesso já tomadas, nunca inventa novas.

### Nota de Clarificação de Âmbito

Este documento não redefine o modelo RBAC (papéis, regras granulares por empresa — já fixado no Vision Document), nem a entidade Partilha (já especificada no Functional Specifications). Traduz essas decisões já aprovadas em princípios técnicos de implementação. Onde uma questão de segurança tocar uma decisão de produto ainda não explícita, segue o processo já estabelecido: extração para o Product & Security Decisions Register, nunca decisão por conta própria.

---

## 2. Contexto

Três documentos já aprovados convergem aqui: o RBAC com 5 papéis e regras granulares por empresa (Vision Document); o enforcement centralizado de multi-tenancy e visibilidade "num único ponto de controlo" (System Design Principles, 3.6; Data Model Conceptual, D4); e a entidade Partilha, que estende o acesso do papel Convidado (FR-35, Data Model Conceptual v1.1).

---

## 3. Conteúdo Estruturado

### 3.1 Autorização Verificada num Único Ponto, Sempre

Reforça diretamente o princípio já fixado no System Design Principles (3.6) e no Data Model Conceptual (Decisão D4): toda verificação de permissão — navegação, Pesquisa Global, Command Palette, API, Assistente de IA — passa pelo **mesmo mecanismo de autorização**, nunca por lógica de permissão duplicada ou reimplementada módulo a módulo. Este é o princípio de segurança mais importante deste documento: um segundo caminho de autorização, por mais bem-intencionado que pareça, é a causa mais comum de fugas de acesso em sistemas multi-tenant.

### 3.2 Autenticação Antes de Autorização, Sempre

Nenhum pedido chega à camada de autorização (RBAC) sem primeiro passar por autenticação válida. Estas são duas responsabilidades estruturalmente distintas e sequenciais — nunca combinadas numa única verificação, para que cada uma possa ser testada e auditada de forma independente (NFR-17: RBAC é um dos 4 fluxos críticos com cobertura de testes obrigatória).

### 3.3 Autorização Reforça, Nunca Deriva — Toda Decisão de Acesso é Explícita

Consistente com o limite de imposição estrutural (System Design Principles, 3.7): a camada de autorização técnica **consulta** as regras RBAC já definidas (papel predefinido + regras granulares por empresa, Vision Document) — nunca infere ou deriva uma permissão que não esteja explicitamente configurada. Na ausência de uma regra explícita de acesso, o comportamento por defeito é **negar**, nunca permitir (princípio de "negação por defeito", padrão consolidado de segurança, não uma decisão de produto nova).

### 3.4 Partilha é uma Extensão do RBAC, Não um Sistema de Acesso Paralelo

A entidade Partilha (FR-35) concede acesso a uma entidade específica a um Convidado — mas essa concessão é verificada **pelo mesmo mecanismo de autorização** de 3.1, nunca por um sistema de verificação separado. Uma Partilha é, tecnicamente, mais uma regra que a camada de autorização consulta, não uma exceção ao seu funcionamento.

### 3.5 Escopo de Dados É Aplicado na Origem, Não Filtrado à Saída

Reforça o Princípio 3 do Data Model Conceptual (visibilidade é uma propriedade do modelo, não da interface): os dados fora do escopo RBAC de quem pede nunca chegam a ser carregados para depois serem filtrados antes de mostrar — o escopo é aplicado **na origem do pedido de dados**. Esta distinção importa: filtrar à saída é frágil (basta um esquecimento num módulo novo para vazar dados); aplicar na origem é estruturalmente mais seguro porque o dado fora de escopo nunca existe na resposta a filtrar.

### 3.6 O Assistente de IA Está Sujeito às Mesmas Regras de Autorização

Reforça UC-05 e RN-07 (Use Cases): quando o Assistente de IA processa uma pergunta, o pedido de dados que faz à plataforma passa pelo **mesmo mecanismo de autorização** de 3.1, com o escopo RBAC do Utilizador que perguntou — a IA não tem, nem pode ter, um caminho de acesso privilegiado ou paralelo aos dados. Isto é uma extensão direta de 3.1 e 3.5, aplicada especificamente à IA por ser o ponto onde uma exceção seria mais fácil de introduzir por conveniência técnica (ex: "dar à IA acesso mais amplo para respostas melhores") — e é exatamente por isso que fica explícito aqui.

### 3.7 Toda Verificação de Autorização é Auditável

Reforça Data & Consistency Rules (3.3, auditoria imutável): uma tentativa de acesso negada por falta de permissão é, em si, um evento que pode ser relevante para auditoria de segurança — não apenas os acessos bem-sucedidos. O nível de detalhe exato (registar todas as negações, ou apenas padrões anómalos) é uma decisão de implementação, não deste documento (ver Questão em Aberto, Q1).

### 3.8 Segredos e Credenciais Nunca em Código ou Configuração Versionada

Princípio de segurança consolidado, sem ligação a nenhuma decisão de produto específica: credenciais de acesso a fornecedores de IA (FR-26), credenciais de base de dados, e quaisquer outros segredos nunca são escritos diretamente no código-fonte nem em ficheiros de configuração sob controlo de versões — são geridos através de um mecanismo de gestão de segredos, cuja tecnologia exata é uma decisão de ADR (Q2).

### 3.9 Princípios Clássicos de Segurança — Aplicação Formal

Os quatro princípios seguintes são disciplina de engenharia consolidada, não decisões de produto. Cada um é mapeado ao que já está aprovado; onde havia lacuna real, é fechada aqui, sem introduzir comportamento novo além do que a disciplina de segurança já exige por definição.

**Least Privilege (privilégio mínimo).** Já aplicado a utilizadores através do RBAC granular por empresa (Vision Document) e da Partilha, que concede acesso a uma entidade específica, nunca a um âmbito genérico (3.4). **Reforço formal:** este princípio estende-se também a componentes internos do sistema — credenciais de serviço, o token de acesso usado pelo Assistente de IA para consultar dados (3.6), processos em segundo plano (ex: o Notification Dispatcher, Event & Notification Architecture Rules 3.4) — nenhum destes deve operar com um privilégio mais amplo do que a tarefa específica que executa exige, mesmo sendo componentes internos e não utilizadores finais.

**Defense in Depth (defesa em profundidade).** Já existem, aprovadas em documentos anteriores, múltiplas camadas complementares: o ponto único de autorização (3.1), o isolamento lógico multi-tenant (NFR-05), a encriptação em trânsito e em repouso (NFR-06, NFR-07), e a validação de dados numa única fronteira (Data & Consistency Rules, 3.6). **Reforço formal:** nenhuma destas camadas deve ser assumida, isoladamente, como suficiente. Se uma falhar (ex: um erro no ponto único de autorização), as restantes continuam a limitar o dano possível — é essa redundância deliberada, e não a perfeição de uma única camada, que sustenta a garantia de zero-tolerância a fugas de dados já fixada em NFR-05.

**Secure by Default (seguro por omissão).** Já aplicado em casos concretos já decididos: a autonomia do Assistente de IA nunca arranca no nível mais permissivo (Product Roadmap, D3; nível C nunca ativo sem validação); o papel Convidado é, por desenho, o mais restritivo do RBAC. **Reforço formal, generalizado a qualquer funcionalidade futura:** todo módulo, papel, integração ou configuração nova (Arco 2 e além) nasce na configuração tecnicamente mais restritiva possível, exigindo uma ação explícita para ampliar acesso — nunca o inverso. Este é o mesmo princípio já usado nos casos concretos, agora fixado como regra geral para tudo o que ainda não foi decidido.

**Fail Secure (falha segura).** A regra 3.3 já cobre a ausência de uma regra explícita de acesso ("negar por defeito"). **Lacuna fechada aqui:** um cenário distinto — o próprio mecanismo de verificação de autorização falhar, gerar erro, ou não conseguir ser avaliado (ex: indisponibilidade momentânea do ponto único de autorização de 3.1) — nunca foi coberto. A partir de agora, este cenário segue a mesma lógica: **qualquer impossibilidade de validar uma permissão resulta em negação de acesso, nunca em permissão por defeito.** Um erro no sistema de segurança nunca deve, por si só, tornar-se uma brecha de segurança.

Nenhum destes quatro princípios altera o RBAC, a Partilha, ou qualquer decisão de produto já aprovada — todos reforçam, com o rigor de disciplina de engenharia estabelecida na indústria, decisões que já existiam.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Toda autorização passa por um único mecanismo, sem exceção — incluindo Partilha e Assistente de IA | Aplica com rigor o princípio já estabelecido no System Design Principles (3.6) aos dois pontos onde uma exceção seria mais tentadora de introduzir por conveniência (IA, Convidados) |
| D2 | Negação por defeito na ausência de regra explícita de acesso | Padrão de segurança consolidado da indústria, não uma decisão de produto — aplicável independentemente de qualquer escolha de tecnologia |
| D3 | Escopo de dados aplicado na origem do pedido, nunca filtrado à saída | Estruturalmente mais seguro do que filtragem posterior; reduz a superfície de erro humano em módulos futuros |
| D4 | O nível de detalhe do registo de tentativas de acesso negadas fica como questão de implementação, não decidido aqui | Consistente com o limite de imposição estrutural — este documento fixa que deve ser auditável, não a política exata de retenção/verbosidade, que pode ter implicação de custo e performance a avaliar em ADR |
| D5 | Formalizados os 4 princípios clássicos de segurança (Least Privilege, Defense in Depth, Secure by Default, Fail Secure), com Fail Secure a fechar uma lacuna real (falha do próprio mecanismo de autorização) não coberta antes | Disciplina de engenharia consolidada, aplicada sem alterar nenhuma decisão de produto — cada princípio cita explicitamente onde já estava implícito, tornando a cobertura de segurança auditável e completa |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Nível de detalhe do registo de tentativas de acesso negadas (todas vs. apenas padrões anómalos) | ADR de Observabilidade/Segurança | CTO, com base em custo/performance real |
| Q2 | Tecnologia exata de gestão de segredos (ex: serviço gerido do cloud provider escolhido) | ADR de Infraestrutura | CTO, no ADR correspondente, dependente da escolha de cloud provider |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, com 8 princípios de segurança e acesso, cada um explicitamente ligado à decisão de produto que reforça, consistente com o limite de imposição estrutural registado no System Design Principles v1.3. Fecha os 4 documentos da Fase 3 — Engineering Principles | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Adicionada a secção 3.9, formalizando Least Privilege, Defense in Depth, Secure by Default e Fail Secure, cada um mapeado ao que já estava implícito nos documentos aprovados; Fail Secure fecha uma lacuna real (falha do mecanismo de autorização, distinta da ausência de regra já coberta em 3.3) | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado. Fase 3 — Engineering Principles considerada concluída (4 documentos) | Fundadora/CEO |
