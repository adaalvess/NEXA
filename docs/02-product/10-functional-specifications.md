# NEXA — Functional Specifications

| | |
|---|---|
| **Documento** | Functional Specifications |
| **Fase** | 2 — Documentação Funcional (último documento) |
| **Versão** | 1.1 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO / Product Owner |
| **Documentos de referência** | Todos os documentos da Fase 2 (Aprovados) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este é o documento final da Fase 2 — consolida tudo o que foi aprovado (entidades do Data Model Conceptual, requisitos FR-XX, histórias US-XX, casos de uso UC-XX, regras de negócio RN-XX, alvos NFR-XX) numa **especificação módulo a módulo**, com o nível de detalhe que falta para orientar diretamente o desenho técnico: campos conceptuais de cada entidade, regras de validação, estados possíveis, e matriz de permissões por ação e papel RBAC. Continua sem decidir tecnologia — isso é a Fase 3.

### Nota de Clarificação de Âmbito

Este documento **não repete** o que já foi decidido — cada secção remete para o FR/US/UC/RN/NFR de origem e acrescenta apenas o detalhe ainda não especificado (nomes de campos, tipos conceptuais, obrigatoriedade, validações). É o último elo da cadeia de rastreabilidade construída desde o Vision Document.

---

## 2. Contexto

Especificação organizada pelos mesmos módulos usados em todos os documentos da Fase 2: Fundação, Dashboard, Processos e Tarefas, CRM, Assistente de IA, Comercial. Cada módulo tem uma tabela de entidades/campos e uma matriz de permissões por papel RBAC.

---

## 3. Conteúdo Estruturado

### 3.1 Fundação da Plataforma

**Entidade: Empresa**

| Campo | Tipo conceptual | Obrigatório | Validação |
|---|---|---|---|
| Nome | Texto | Sim | 2-100 caracteres |
| País | Seleção | Sim | Lista de países UE + Portugal por defeito |
| Setor de atividade | Seleção | Não | Lista predefinida, com opção "Outro" |
| Estado da subscrição | Estado (trial / ativa / limitada / cancelada) | Sim | Gerido pelo sistema, não editável diretamente (RN-11) |

**Entidade: Utilizador**

| Campo | Tipo conceptual | Obrigatório | Validação |
|---|---|---|---|
| Nome | Texto | Sim | 2-100 caracteres |
| Email | Texto | Sim | Formato de email válido, único por Empresa |
| Papel RBAC | Seleção | Sim | Super Admin / Admin da Empresa / Gestor / Colaborador / Convidado |
| Departamento/Equipa | Referência | Não | Só aplicável a papéis Gestor/Colaborador |

**Matriz de Permissões — Fundação**

| Ação | Super Admin | Admin da Empresa | Gestor | Colaborador | Convidado |
|---|---|---|---|---|---|
| Criar Empresa | — | Sim (self-service) | — | — | — |
| Convidar Utilizador | — | Sim (toda a empresa) | Sim (só sua equipa) | Não | Não |
| Editar permissões granulares | — | Sim | Não | Não | Não |
| Criar Departamento/Equipa | — | Sim | Não | Não | Não |
| Consultar Registo de Auditoria | Sim (interno) | Sim (sua empresa) | Não | Não | Não |

*Referências: FR-01 a FR-07; UC-01, UC-02; RN-01 a RN-04.*

**Entidade: Partilha** *(adicionada pela auditoria de consistência — resolve Information Architecture, Q2)*

| Campo | Tipo conceptual | Obrigatório | Validação |
|---|---|---|---|
| Entidade partilhada | Referência | Sim | Cliente ou Processo/Tarefa (as duas entidades a que o Convidado pode aceder, por PRD 3.3) |
| Utilizador Convidado | Referência (Utilizador, papel Convidado) | Sim | Deve pertencer à mesma Empresa da entidade partilhada |
| Concedido por | Referência (Utilizador) | Sim | Deve ter permissão de edição sobre a entidade partilhada no momento da concessão |
| Nível de acesso | Estado | Sim | Apenas leitura no MVP — edição por Convidado fora de âmbito (Vision Document, RBAC) |

*Referências: FR-35 (novo); Information Architecture, 3.4 e Q2 (resolvida); Data Model Conceptual v1.1.*

### 3.2 Dashboard Inteligente

**Composição:** agregação, sem entidade própria — lê dados de Processos/Tarefas, CRM e Notificações, filtrados pelo escopo RBAC de quem consulta.

| Elemento | Comportamento | Referência |
|---|---|---|
| Indicadores agregados | Contagens e resumos (ex: tarefas em atraso, clientes ativos) filtrados por escopo RBAC | FR-11 |
| Estado inicial guiado | Se a Empresa não tiver dados suficientes, apresenta ação de criação em vez de vazio | FR-12, Information Architecture 3.3 |
| Atualização de dados | Sincronização periódica, atraso máximo 30 segundos | NFR-04 |

**Entidade: Notificação** *(adicionada pela auditoria de consistência — antes referida mas nunca especificada)*

| Campo | Tipo conceptual | Obrigatório | Validação |
|---|---|---|---|
| Utilizador destinatário | Referência | Sim | Determina a quem a notificação é visível |
| Entidade de origem | Referência | Sim | Ex: a Tarefa que foi atribuída, a Sugestão de IA gerada |
| Tipo de evento | Seleção | Sim | Ex: tarefa atribuída, sugestão de IA pendente, prazo próximo |
| Estado | Estado (não lida / lida) | Sim | Valor por defeito: "não lida" |

*Referências: FR-11, FR-36 (novo); Information Architecture, 3.6.3; Data Model Conceptual v1.1.*

*Referências gerais do módulo: FR-11 a FR-13; UC transversal (não tem UC próprio); NFR-02, NFR-04.*

### 3.3 Gestão de Processos e Tarefas

**Entidade: Processo/Tarefa**

| Campo | Tipo conceptual | Obrigatório | Validação |
|---|---|---|---|
| Título | Texto | Sim | 2-200 caracteres |
| Descrição | Texto longo | Não | — |
| Responsável | Referência (Utilizador) | Sim | Deve pertencer à mesma Empresa |
| Departamento/Equipa | Referência | Não | — |
| Cliente associado | Referência (Cliente) | Não | Só se o criador tiver permissão de visualização sobre esse Cliente (UC-03, E1) |
| Estado | Estado (por fazer / em curso / concluída) | Sim | Valor por defeito: "por fazer" |
| Prazo | Data | Não | — |

**Matriz de Permissões — Processos e Tarefas**

| Ação | Admin da Empresa | Gestor | Colaborador | Convidado |
|---|---|---|---|---|
| Criar Tarefa | Sim | Sim (sua equipa) | Sim (para si) | Não |
| Ver Tarefas | Todas | Da sua equipa | As suas | Só as explicitamente partilhadas consigo (Partilha) |
| Editar Tarefa | Todas | Da sua equipa | As suas | Não |
| Eliminar Tarefa | Todas | Da sua equipa | Não | Não |

*Referências: FR-14 a FR-18, FR-35; US-09 a US-11; UC-03; RN-05.*

### 3.4 CRM Inteligente

**Entidade: Cliente/Contacto/Oportunidade**

| Campo | Tipo conceptual | Obrigatório | Validação |
|---|---|---|---|
| Nome | Texto | Sim | 2-150 caracteres |
| Tipo | Seleção | Sim | Empresa cliente / Contacto individual |
| Contacto principal | Texto (email/telefone) | Não | Pelo menos um preenchido antes de registar a primeira Interação |
| Responsável (Owner) | Referência (Utilizador) | Sim | Determina visibilidade por RBAC |
| Estado da oportunidade | Estado (se aplicável) | Não | Ex: Prospeção / Negociação / Fechada-Ganha / Fechada-Perdida |

**Entidade: Interação**

| Campo | Tipo conceptual | Obrigatório | Validação |
|---|---|---|---|
| Cliente associado | Referência | Sim | — |
| Tipo | Seleção | Sim | Chamada / Reunião / Nota / Outro |
| Data | Data/hora | Sim | Por defeito, momento do registo |
| Descrição | Texto longo | Não | — |

**Matriz de Permissões — CRM**

| Ação | Admin da Empresa | Gestor | Colaborador | Convidado |
|---|---|---|---|---|
| Criar Cliente | Sim | Sim | Sim | Não |
| Ver Clientes | Todos | Da sua equipa | Os seus (Owner) | Só os explicitamente partilhados consigo (Partilha) |
| Editar Cliente | Todos | Da sua equipa | Os seus | Não |
| Registar Interação | Todos | Da sua equipa | Os seus | Não |
| Ver Pipeline Comercial | Total | Da sua equipa | Não aplicável | Não |

*Referências: FR-19 a FR-22, FR-35; US-12 a US-14; UC-04; RN-06.*

### 3.5 Assistente de IA

**Entidade: Sugestão/Conversa de IA**

| Campo | Tipo conceptual | Obrigatório | Validação |
|---|---|---|---|
| Utilizador (autor da pergunta ou destinatário da sugestão) | Referência | Sim | — |
| Tipo | Seleção | Sim | Pergunta / Sugestão de ação |
| Entidade referenciada | Referência (opcional) | Não | Cliente ou Processo/Tarefa, se aplicável |
| Estado | Estado (pendente / aceite / rejeitada) | Sim | "Executada" só após confirmação — nunca automática (RN-08) |
| Fornecedor de IA usado | Metadado interno | Sim | Não visível ao utilizador final (FR-26) |

**Comportamento por Ação**

| Ação | Comportamento |
|---|---|
| Pergunta livre | Responde só com base em entidades no escopo RBAC do Utilizador (UC-05, RN-07) |
| Sugestão de ação | Nunca executada sem confirmação explícita e individual (UC-06, RN-08) |
| Registo de auditoria | Toda pergunta, sugestão e execução é registada, distinguindo autor humano de origem IA (FR-28) |

*Referências: FR-23 a FR-28; US-15 a US-17; UC-05, UC-06; RN-07, RN-08.*

### 3.6 Comercial — Planos e Subscrições

**Entidade: Subscrição/Plano**

| Campo | Tipo conceptual | Obrigatório | Validação |
|---|---|---|---|
| Plano | Seleção | Sim | Starter / Professional / Enterprise |
| Estado | Estado | Sim | Trial / Ativa / Limitada / Cancelada |
| Limite de utilizadores | Número | Sim | Definido por plano |
| Limite de armazenamento | Número | Sim | Definido por plano |
| Limite de uso de IA | Número | Sim | Definido por plano |
| Data de início do trial | Data | Sim | Automática na criação da Empresa (RN-02) |

**Comportamento de Limites (aplicação direta de RN-10, RN-11)**

| Situação | Comportamento |
|---|---|
| Aproximação de um limite (ex: 90%) | Aviso antecipado ao Administrador |
| Limite atingido | Bloqueio apenas da ação específica que excederia o limite; funcionalidades já em uso continuam ativas |
| Trial expirado sem conversão | Estado "limitada": leitura permitida, ações de criação bloqueadas; nenhum dado eliminado |

*Referências: FR-29 a FR-31; US-18, US-19; UC-07, UC-08; RN-09 a RN-11.*

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Cada módulo é especificado com tabela de campos (entidade) e matriz de permissões (ação × papel RBAC), formato consistente em toda a especificação | Facilita a leitura comparável entre módulos e a futura tradução direta para esquema técnico na Fase 3 |
| D2 | Os campos são descritos com "tipo conceptual" (Texto, Número, Data, Referência, Estado), nunca com tipos de base de dados | Mantém a disciplina de neutralidade tecnológica desta fase, consistente com o Data Model Conceptual |
| D3 | Este documento não introduz nenhum campo, regra ou permissão que não decorra diretamente de um FR/US/UC/RN/NFR já aprovado | Fecha a Fase 2 sem introduzir âmbito novo, cumprindo a disciplina de rastreabilidade mantida em toda a fase |
| D4 | Adicionadas as entidades Partilha e Notificação, com as respetivas tabelas de campos, a partir da auditoria de consistência realizada no final da Fase 2 | Ambas as entidades já eram mencionadas neste e noutros documentos sem nunca terem sido especificadas — a correção fecha a lacuna sem violar D3, porque os requisitos que as sustentam (FR-35, FR-36) foram adicionados ao Functional Requirements antes desta especificação |

---

## 5. Questões em Aberto

Todas as questões em aberto anteriores (Functional Requirements, User Stories, Use Cases, Non-Functional Requirements) permanecem válidas e não são repetidas aqui. Nenhuma questão nova é introduzida por este documento — a sua função é consolidar, não decidir further.

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, consolidando todos os módulos do MVP com campos, validações, estados e matrizes de permissão RBAC, fechando a Fase 2 — Documentação Funcional | CTO (Claude) + Fundadora/CEO |
| 1.0 | 2026-07-02 | **Aprovação oficial**, condicionada ao resultado da auditoria de consistência solicitada | Fundadora/CEO |
| 1.1 | 2026-07-02 | Correção da auditoria de consistência Fase 1/2: adicionadas as entidades Partilha e Notificação, com tabelas de campos completas; matrizes de permissão do Convidado atualizadas para referenciar o mecanismo de Partilha | CTO (Claude) + Fundadora/CEO |
