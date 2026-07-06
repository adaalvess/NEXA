# NEXA — ADR-004: Autenticação, Sessão e Autorização (RBAC)

| | |
|---|---|
| **Documento** | ADR-004 — Autenticação, Sessão e Autorização (RBAC) |
| **Fase** | 3b — Architecture Decision Records (4 de 7) |
| **Versão** | 1.0 |
| **Estado** | ✅ Aprovado |
| **Owner** | CTO / Arquiteto Principal / Fundadora / CEO |
| **Documentos de referência** | ADR-001, ADR-002, ADR-003 · System Design Principles v1.5 (3.4, 3.6, 3.8, 3.9) · Security & Access Principles v1.1 (3.1-3.9) · Vision Document v1.1 (RBAC) · NFR-06, NFR-08, NFR-17 |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este ADR decide o **mecanismo técnico de autenticação e sessão**, e a **implementação concreta do ponto único de autorização** já exigido pelo Security & Access Principles (3.1) e pelo System Design Principles (3.6).

---

## 2. Contexto

Duas restrições já aprovadas moldam esta decisão de forma direta: a exigência de que toda verificação de permissão passe por um único mecanismo, sem exceção (Security & Access Principles, 3.1), e o princípio de "Autorização Reforça, Nunca Deriva" (3.3 desse documento) — a decisão de acesso tem de consultar a fonte de verdade em tempo real, nunca assumir uma permissão a partir de dados desatualizados. Isto tem uma implicação técnica direta na escolha entre sessão e token, explorada em 3.1.

---

## 3. Conteúdo Estruturado

### 3.1 Alternativas Consideradas

**Opção A — Sessões do Lado do Servidor (cookie httpOnly + armazenamento partilhado)**

O servidor cria uma sessão após o login, guarda-a numa tabela da própria base de dados já decidida (ADR-003), e devolve ao browser um cookie `httpOnly`, `Secure`, `SameSite=Strict` que apenas referencia essa sessão.

| Prós | Contras |
|---|---|
| Revogação imediata — revogar acesso (ex: Admin muda o papel de um Utilizador, ou remove um Convidado) tem efeito no pedido seguinte, porque a verificação consulta a sessão em tempo real | Uma verificação de sessão por pedido implica uma leitura adicional à base de dados (mitigável com indexação e, no futuro, cache) |
| Não introduz nenhuma tecnologia nova — reutiliza a base de dados já decidida no ADR-003, sem exigir infraestrutura adicional (ex: Redis) | Menos natural para consumidores futuros de API pura (apps nativas, integrações externas) do que um token — mitigável adicionando um método de autenticação alternativo mais tarde, sem substituir este |
| Cookie `httpOnly` não é acessível a JavaScript no browser, reduzindo a superfície de roubo de sessão por XSS | — |
| Consistente por desenho com "Autorização Reforça, Nunca Deriva" (Security & Access Principles, 3.3) — a verificação lê sempre o estado atual, nunca um valor assumido a partir de um token antigo | — |

**Opção B — JSON Web Tokens (JWT) sem estado**

O servidor emite um token assinado após o login, que o cliente guarda e envia em cada pedido; o servidor valida a assinatura sem consultar a base de dados.

| Prós | Contras |
|---|---|
| Sem leitura à base de dados por pedido — mais rápido em teoria | **Revogação é estruturalmente difícil**: um token permanece válido até expirar, mesmo que o Admin revogue o acesso do Utilizador nesse momento — contradiz diretamente "Autorização Reforça, Nunca Deriva" (3.3) e o princípio Fail Secure (3.9), ambos já aprovados |
| Mais natural para consumidores de API externos | Resolver a revogação exige manter uma lista de tokens invalidados — o que reintroduz estado do lado do servidor, anulando a principal vantagem da opção |
| — | Se guardado em `localStorage` (comum em implementações JWT), fica acessível a JavaScript, aumentando a superfície de roubo por XSS |

**Opção C — Híbrido: Token de Acesso de Curta Duração + Token de Atualização Revogável**

Um token de acesso (ex: 15 minutos) sem estado, mais um token de atualização guardado do lado do servidor e revogável.

| Prós | Contras |
|---|---|
| Combina desempenho do token sem estado com revogabilidade do token de atualização | Complexidade de implementação significativamente maior (rotação de tokens, endpoint de renovação, gestão de dois tipos de credencial) — desproporcional à escala do MVP e ao perfil da equipa (NFR-16) |
| Bom ajuste para múltiplos tipos de cliente (web, apps nativas futuras) | Superfície de ataque maior (dois tipos de token a proteger, não um) |

### 3.2 Decisão

**A NEXA adota sessões do lado do servidor (Opção A), armazenadas na base de dados PostgreSQL já decidida (ADR-003), entregues via cookie `httpOnly`, `Secure`, `SameSite=Strict`.**

Esta é a única opção que satisfaz, sem compromisso, o princípio já aprovado de que a autorização nunca deriva de um valor potencialmente desatualizado (Security & Access Principles, 3.3) — uma alteração de papel RBAC ou uma revogação de Partilha tem de ter efeito imediato, e só um mecanismo que consulta o estado atual em cada pedido garante isso de forma estrutural, não apenas por convenção. A Opção B foi descartada precisamente por violar este princípio; a Opção C foi descartada por introduzir complexidade desproporcional para o benefício que traria nesta fase.

A tabela de sessões vive na mesma base de dados PostgreSQL já decidida (ADR-003), não numa tecnologia nova — consistente com o padrão já estabelecido de preferir capacidades do motor já escolhido a introduzir infraestrutura adicional sem necessidade comprovada.

### 3.3 A Camada de Autorização — Implementação do Ponto Único (Security & Access Principles, 3.1)

A verificação de permissões é implementada como um único serviço de autorização, consultado por todos os pontos de entrada (controladores da API, o futuro Notification Dispatcher, e a camada de IA no ADR-005) — nunca reimplementada localmente em cada módulo. Este serviço:
1. Resolve a sessão a partir do cookie.
2. Carrega o Utilizador, o seu papel RBAC, e as regras granulares da sua Empresa (Vision Document, RBAC).
3. Consulta a entidade Partilha (FR-35) quando aplicável.
4. Aplica negação por defeito (Security & Access Principles, 3.3) sempre que não existir uma regra explícita de acesso.

Este serviço é a implementação concreta do "ponto único de autorização" já exigido — não uma nova camada, mas a materialização técnica de uma decisão já aprovada, seguindo o mesmo padrão já usado no ADR-003 para a Camada 1 de multi-tenancy.

### 3.4 Hashing de Palavras-Passe

Consistente com NFR-08 (palavras-passe nunca em texto plano), a NEXA usa **Argon2id** para hashing de palavras-passe — o algoritmo vencedor da Password Hashing Competition e atual recomendação de referência da indústria, com resistência superior a ataques por hardware especializado (GPU/ASIC) face a alternativas mais antigas como bcrypt.

### 3.5 Documentos que Este ADR Reforça

- **Security & Access Principles (3.1, 3.2, 3.3, 3.9):** implementa tecnicamente o ponto único de autorização, a sequência autenticação-antes-de-autorização, a não-derivação de permissões, e o princípio Fail Secure.
- **Vision Document (RBAC):** os 5 papéis e as regras granulares por Empresa tornam-se verificáveis em runtime através deste serviço único.
- **ADR-003:** reutiliza a base de dados já decidida, sem introduzir tecnologia nova.
- **System Design Principles (3.4, Stateless):** os servidores de aplicação continuam sem estado local — a sessão vive na base de dados partilhada, não em memória de um servidor específico.

### 3.6 Documentos e Decisões que Este ADR Passa a Condicionar

- **ADR-005 (Camada de IA):** o Assistente de IA consulta o mesmo serviço de autorização (Security & Access Principles, 3.6), usando a sessão do Utilizador que perguntou.
- **Coding Standards (Fase 3c):** deve incluir a convenção de que nenhum controlador verifica permissões diretamente — todos delegam no serviço de autorização único.
- **ADR-007 (Infraestrutura):** deve considerar a política de expiração e limpeza de sessões antigas na estratégia de backups/manutenção.
- **Fase 8 (Testes e QA):** os fluxos de autenticação e autorização entram diretamente no conjunto de testes obrigatórios já exigido (NFR-17).

### 3.7 Riscos que Esta Decisão Elimina

- Elimina o risco de uma alteração de permissão (RBAC ou Partilha) não ter efeito imediato — problema estrutural da Opção B, evitado pela Opção A.
- Elimina o risco de duplicação de lógica de autorização por módulo, ao centralizá-la no serviço único (3.3).
- Elimina o risco de dependência de infraestrutura adicional nesta fase, ao reutilizar a base de dados já decidida.

### 3.8 Novos Riscos que Esta Decisão Introduz

- **Risco de carga adicional na base de dados** por verificação de sessão em cada pedido. *Mitigação:* indexação da tabela de sessões; caminho de evolução futuro para uma camada de cache (ex: Redis) atrás da mesma interface de sessão, sem alterar os módulos consumidores (Princípio de Evolução Tecnológica, 3.8).
- **Risco de crescimento não controlado da tabela de sessões.** *Mitigação:* política de expiração e job de limpeza periódica, a detalhar no ADR-007.
- **Risco de ataques de força bruta ao login.** *Mitigação:* limitação de taxa (rate limiting) no endpoint de autenticação, a detalhar em conjunto com o ADR-007.
- **Risco de menor adequação imediata a consumidores de API externos futuros.** *Mitigação:* um método de autenticação adicional (ex: API keys ou tokens de curta duração) pode ser introduzido mais tarde como método alternativo, atrás do mesmo serviço de autorização — não substitui as sessões para a aplicação web, complementa-as.

### 3.9 Consequências Técnicas, Operacionais e de Negócio

| Dimensão | Consequência |
|---|---|
| Técnica | Nova tabela de sessões no schema Prisma; um serviço de autorização único, consultado por todos os controladores; Argon2id como dependência de hashing |
| Operacional | Nenhuma infraestrutura nova a gerir nesta fase; política de limpeza de sessões a incluir na rotina operacional (ADR-007) |
| Negócio | Revogação imediata de acesso é uma capacidade que pode ser comunicada como argumento de confiança a clientes Enterprise sensíveis a segurança, sem custo adicional de implementação |

### 3.10 Aplicação do Princípio de Evolução Tecnológica

O acesso à sessão é encapsulado atrás de uma interface de "Session Store" — hoje implementada sobre a tabela PostgreSQL já decidida, mas substituível por uma camada de cache no futuro, sem alterar o serviço de autorização nem os módulos consumidores. A escolha de Argon2id para hashing está igualmente isolada num serviço de credenciais próprio, não espalhada pelo código.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Sessões do lado do servidor (Opção A), não JWT nem híbrido | Único mecanismo compatível, sem compromisso, com "Autorização Reforça, Nunca Deriva" já aprovado — revogação imediata é exigência de segurança, não preferência |
| D2 | Sessões armazenadas na base de dados PostgreSQL já decidida, sem infraestrutura nova | Consistente com o padrão já estabelecido no ADR-003 de reutilizar capacidades já escolhidas |
| D3 | Serviço de autorização único, consultado por todos os pontos de entrada, incluindo a futura camada de IA | Implementação direta do ponto único já exigido no Security & Access Principles, 3.1 |
| D4 | Argon2id para hashing de palavras-passe | Recomendação atual de referência da indústria, superior a bcrypt em resistência a ataques por hardware especializado |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Política exata de expiração de sessão (tempo de vida, renovação em uso ativo) | Coding Standards (Fase 3c) | CTO |
| Q2 | Autenticação multi-fator (MFA) não é requisito do MVP — a considerar para fase posterior, sobretudo para planos Enterprise | Product Roadmap (Arco 2 ou posterior) | CEO + CTO, quando houver procura ou requisito de cliente |
| Q3 | Limites exatos de rate limiting no endpoint de login | ADR-007 (Infraestrutura) | CTO |

---

## 6. Validação Arquitetural Final

*Assumindo o papel de Arquiteto Principal da NEXA, revejo criticamente esta decisão antes de a considerar madura para referência permanente.*

**1. Esta decisão cria alguma dependência tecnológica desnecessária?** Não. Sessões do lado do servidor são um padrão standard, sem dependência de fornecedor; Argon2id é um algoritmo aberto e amplamente adotado. Nenhuma infraestrutura nova foi introduzida.

**2. Existe algum risco de escalabilidade futura?** Não de forma bloqueante. A leitura de sessão por pedido é indexável; o caminho de evolução para cache já está identificado (3.8) e não exige alterar a interface consumida pelo resto da aplicação.

**3. Existe algum risco de segurança, performance ou manutenção ainda não mitigado?** Os quatro riscos identificados (3.8) têm mitigação explícita ou caminho de resolução claro. Nenhum é motivo para reconsiderar a decisão.

**4. Esta decisão continua coerente com todos os princípios já definidos?** Sim — verificada contra Security & Access Principles (3.1, 3.2, 3.3, 3.9), System Design Principles (3.4), Vision Document (RBAC), e ADR-003. É, aliás, a decisão que mais diretamente testa e confirma "Autorização Reforça, Nunca Deriva" — sem esta escolha de sessões em vez de JWT, esse princípio teria ficado apenas como intenção.

**5. Há alguma oportunidade de reforçar a arquitetura sem aumentar complexidade desnecessária?** Sim: a tabela de sessões herda automaticamente o isolamento por `tenant_id` e RLS já decidido (ADR-001/003) — a sessão de um Utilizador de uma Empresa nunca é, estruturalmente, visível a partir do contexto de outra.

**6. Existe alguma lacuna documental que deva ser resolvida agora?** Não de forma bloqueante. As 3 Questões em Aberto são detalhe de política, corretamente remetidas para a Fase 3c e o ADR-007.

**7. Esta decisão continuará válida daqui a 5 ou 10 anos, com a NEXA a crescer de dezenas para milhares de empresas?** Sim. Sessões do lado do servidor com cache continuam a ser o padrão predominante em SaaS multi-tenant de grande escala; a adição futura de um método de autenticação por token para consumidores de API não substitui este mecanismo, complementa-o.

**8. Esta decisão continua alinhada com a filosofia fundacional da NEXA?** Sim: **simplicidade** — nenhuma infraestrutura nova; **evolução incremental** — caminho claro para cache futuro sem reescrita; **baixo acoplamento** — sessão e hashing isolados atrás de interfaces próprias; **independência tecnológica** — padrões abertos, sem lock-in; **segurança por defeito** — revogação imediata, negação por defeito, Argon2id desde o primeiro utilizador registado; **manutenção assistida por IA** — um padrão amplamente documentado, que o Claude Code implementa de forma previsível.

**Parecer do Arquiteto Principal:** esta decisão está suficientemente madura para permanecer como referência permanente da plataforma. É, de todos os ADRs até agora, o que mais diretamente prova um princípio de segurança já aprovado em vez de apenas o respeitar — não identifico nenhum ponto que exija revisão antes de avançar para o ADR-005.

---

## 7. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do ADR, decidindo sessões do lado do servidor sobre PostgreSQL, serviço de autorização único, e Argon2id para hashing, com a estrutura completa de rigor arquitetural (8 perguntas de Validação Arquitetural Final) | CTO / Arquiteto Principal (Claude) + Fundadora/CEO |
| 1.0 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |
