# NEXA — Validação Manual UC-01 + UC-02 (Passo 34, M6)

| | |
|---|---|
| **Documento** | Registo de validação manual — UC-01 (Criar Empresa) e UC-02 (Convidar Utilizador) |
| **Fase** | 7 — Desenvolvimento da Plataforma, M6 (Testes dos 4 Fluxos Críticos + Validação Manual dos Use Cases), Passo 34 — terceiro passo do M6 |
| **Versão** | 1.0 |
| **Estado** | ✅ Concluído (2026-07-11) |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Use Cases, UC-01, UC-02; Proposta do Milestone M6 (aprovada em chat, 2026-07-08/09) |
| **Última atualização** | 2026-07-11 |

---

## 1. Método

Validação real no browser (não simulada) — Empresa de demonstração criada via o próprio fluxo de registo público (`/registar`), nunca via API diretamente, para exercitar UC-01 literalmente como uma pessoa o faria. Continuidade direta para UC-02 com a mesma Empresa (Fluxo Alternativo 3a). Estado confirmado por leitura direta da BD em cada passo relevante, nunca apenas pela resposta HTTP. Empresa de teste eliminada no fim da validação.

---

## 2. UC-01 — Criar Empresa e Configurar Conta Inicial

| Item | Resultado |
|---|---|
| Pré-condição (pessoa sem conta) | ✅ Email novo usado |
| Fluxo Principal 1 (introduzir dados básicos) | ⚠️ Ver Achado A |
| Fluxo Principal 2 (Empresa criada, isolamento lógico) | ✅ Confirmado — Empresa criada; isolamento em si já coberto exaustivamente por cobertura automatizada existente (Passo 32), não re-provado do zero aqui |
| Fluxo Principal 3 (conta de Administrador) | ✅ `GET /auth/eu` → `papel: admin_empresa` |
| Fluxo Principal 4 (trial de 14 dias automático) | ✅ `GET /subscricao` → `estado: trial`, `diasRestantesTrial: 14` |
| Fluxo Principal 5 (Dashboard, estado inicial guiado) | ✅ "Ainda não há Processos"/"Ainda não há Clientes" com ação clara (FR-12) |
| Alternativo 3a (convidar logo após criação) | ✅ Confirmado por continuidade direta para UC-02 (abaixo) |
| Alternativo 3b (criar Departamento antes de convidar) | ✅ Departamento "Vendas UC02" criado com sucesso antes de qualquer convite — sistema nunca impõe ordem |
| Exceção E1 (email já em uso) | ✅ Segunda tentativa de registo com o mesmo email → `409`, mensagem exata "Este email já está associado a uma conta existente. Inicia sessão em vez de registar." |
| RN-01 (exatamente 1 Administrador) | ✅ Confirmado na BD imediatamente após o registo (1 Utilizador, 1 admin) |
| RN-02 (trial sem dados de pagamento) | ✅ Formulário de registo nunca pede cartão/dados de pagamento |

### Achado A — `setor` nunca coletado pelo ecrã de Registo

O Fluxo Principal (passo 1) do UC-01 descreve "nome, país, setor" como os dados básicos recolhidos no registo. O ecrã real (`/registar`, Passo 26) só tem os campos "Nome da Empresa" e "País" — `setor` nunca é pedido, apesar de existir como campo opcional em `RegistarDto`/`Empresa.setor` desde o Passo 2. Não é um bug (o campo é opcional, nada quebra), mas é uma divergência literal face ao texto do UC-01 nunca antes assinalada explicitmente — registada aqui para decisão futura (adicionar o campo ao formulário, ou aceitar formalmente a simplificação e atualizar o UC-01).

---

## 3. UC-02 — Convidar Utilizador e Atribuir Papel

| Item | Resultado |
|---|---|
| Pré-condição (quem convida é Admin/Gestor; Empresa dentro do limite) | ✅ Confirmado via RBAC (Passo 30) + RN-10 (Passo 33) |
| Fluxo Principal 1-2 (email + papel/Departamento) | ✅ Formulário "Convidar Utilizador" (Configurações → Utilizadores e Permissões) |
| Fluxo Principal 3 (envio do email) | ⚠️ Ver Achado B (limitação já conhecida, não um achado novo) |
| Fluxo Principal 4 (aceitar + criar password) | ✅ `/convites/:token` — contexto (Empresa/papel) sempre visível antes da palavra-passe, aceitação bem-sucedida |
| Fluxo Principal 5 (associação com papel/Departamento) | ✅ Confirmado na BD: `papel: colaborador`, `departamento: Vendas UC02`, `convite.estado: aceite`; login automático funcionou |
| Alternativo 2a (`RegraPermissao` granular) | ⚠️ Ver Achado C |
| Exceção E1 (limite de Utilizadores atingido) | ✅ Confirmado ao vivo, via API (`402`/`LIMITE_UTILIZADORES_ATINGIDO`, mensagem com o valor do limite) e via UI (mesma mensagem no toast de erro, sem crash) |
| Exceção E2 (convite expira, reenvio) | ⚠️ Ver Achado D (limitação já conhecida, não um achado novo) |
| RN-03 (Gestor só no seu Departamento) | ✅ Confirmado nas duas direções: convite para o próprio Departamento passa a verificação (chega ao envio do email); convite para outro Departamento → `403`, mensagem exata |
| RN-04 (nunca `super_admin`) | ✅ `400`, fronteira única do DTO, mensagem lista os papéis válidos |

### Achado B — Envio real de email não observável neste ambiente (limitação já conhecida)

Sem `RESEND_API_KEY` real (decisão já aprovada desde o M3/M5), o envio real do email de convite não pode ser observado — `POST /convites` devolve `502` de forma consistente e sem crash, tratado corretamente pela UI (toast, `Modal` continua aberto). Mesma limitação honesta já registada desde o Passo 18 e revalidada no Passo 31 — não é um achado novo, é a mesma nota de âmbito. A continuação do fluxo (aceitação) foi validada com um `ConviteUtilizador` inserido diretamente na BD (mesmo mecanismo de fixture já usado no Passo 31), nunca através de um envio real.

### Achado C — Fluxo Alternativo 2a não é alcançável a partir do formulário de Convite

O mecanismo `RegraPermissao` (override granular de permissões por Utilizador) existe e está corretamente aplicado (`rbac.e2e-spec.ts`, T9/T10), mas o formulário "Convidar Utilizador" (Passo 31) não expõe nenhuma forma de o definir no momento do convite — só `email`/`papel`/`Departamento`. Consistente com a decisão já tomada na Proposta do M5 ("edição granular de `RegraPermissao` fica fora do M5") — não é uma lacuna nova, é a confirmação literal de que o Fluxo Alternativo 2a do UC-02, tal como descrito, não tem ainda interface. Registado para decisão futura (M7+ ou dedicado).

### Achado D — Exceção E2 (reenvio de convite) continua sem implementação

Confirmado, sem alteração face ao já registado: não existe nenhum mecanismo de reenvio de um convite expirado — nem endpoint, nem UI. Já identificado como Questão em Aberto Q2 desde o Passo 30/31; reconfirmado aqui como ainda verdadeiro, não uma descoberta nova.

---

## 4. Bugs Encontrados

**Nenhum.** Zero erros de consola durante toda a sessão de validação; todos os fluxos (incluindo os dois casos de exceção testados ao vivo) comportaram-se exatamente como documentado, sem crashes.

---

## 5. Conclusão

UC-01 e UC-02 validados manualmente pelo menos uma vez, com registo escrito de cada pré-condição, fluxo, alternativa, exceção e regra de negócio, confirmados no sistema real (não apenas lidos no código) — critério de conclusão do M6 cumprido para estes dois Use Cases. Quatro achados registados, todos qualificados (um é uma divergência literal menor nunca antes assinalada — Achado A; três são limitações/decisões de âmbito já conhecidas e apenas reconfirmadas — Achados B, C, D), nenhum bloqueante.

**Passo 34 concluído.**
