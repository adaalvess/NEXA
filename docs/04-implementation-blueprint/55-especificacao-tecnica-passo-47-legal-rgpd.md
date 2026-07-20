# NEXA — Especificação Técnica do Passo 47 (M8 — Documentos Legais e Consentimento RGPD)

| | |
|---|---|
| **Documento** | Especificação Técnica — Passo 47: Documentos Legais e Consentimento RGPD |
| **Fase** | 7 — Desenvolvimento da Plataforma, M8 (Preparação para Lançamento), Passo 47 — segundo passo do M8 |
| **Versão** | 1.0 |
| **Estado** | 🔶 Aguarda aprovação |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | Proposta e Especificação Técnica do M8 (§ Passo 47); Especificação Técnica do Passo 26 (bloqueador registado); Relatório Executivo Consolidado, secção 9; Product & Security Decisions Register (PSD-001, PSD-003) |
| **Última atualização** | 2026-07-20 |

---

## 1. Objetivo

Resolver o bloqueador de pré-lançamento registado desde o Passo 26: o registo público (`/registar`) não pode ser disponibilizado a utilizadores reais em produção sem Termos de Serviço, Política de Privacidade, e captura efetiva de consentimento — nunca apenas um checkbox visual sem persistência.

**Nota de âmbito, já validada na aprovação do M8**: este passo entrega um **rascunho técnico** de Termos de Serviço/Política de Privacidade, estruturado com base em práticas comuns de RGPD para SaaS B2B europeu — isto **nunca substitui revisão jurídica profissional**. A implementação técnica (páginas, checkbox, registo de consentimento na BD) fica concluída neste passo; a aprovação para uso em produção com clientes reais fica pendente da tua confirmação explícita de que o conteúdo foi revisto (por um advogado, ou aceite por ti tal como está).

---

## 2. Informação Necessária Antes de Escrever o Conteúdo Legal

Não posso inventar os factos legais concretos da NEXA enquanto entidade. Preciso que confirmes (ou corrijas) o seguinte antes de eu redigir o texto final — se preferires, posso avançar com marcadores `[A PREENCHER]` explícitos nestes campos e o rascunho fica tecnicamente completo mas com esses pontos assinalados para preenchimento contigo:

1. **Nome legal da entidade** que opera a NEXA (razão social, se já existir; se ainda não existir formalmente, indica-o e uso "NEXA" como nome comercial com uma nota clara de que a entidade legal está por constituir).
2. **País/jurisdição** de operação e de direito aplicável (assumo Portugal por defeito, a confirmar).
3. **Contacto para questões de privacidade/RGPD** (um email — pode ser genérico, ex.: `privacidade@nexa.pt`, nem que ainda não exista tecnicamente).
4. **Encarregado de Proteção de Dados (DPO)** — a NEXA já tem um nomeado, ou (mais provável nesta fase) ainda não é legalmente exigido para uma PME nesta dimensão? Vou assumir que não é exigido ainda, salvo indicação contrária.
5. **NIF/número de registo comercial** — se já existir; caso contrário, marcador `[A PREENCHER]`.

Se não tiveres estes dados definidos ainda, aprovo avançar com marcadores explícitos — o rascunho fica estruturalmente completo e pronto a rever, só com estes pontos por preencher antes da revisão jurídica final.

---

## 3. Conteúdo Real Já Determinado Pelo Sistema (Não é Suposição)

Ao contrário dos dados legais acima, o seguinte já está implementado e pode ser descrito com precisão nos documentos, sem inventar nada:

- **Dados pessoais tratados**: nome, email, palavra-passe (hash Argon2id, nunca em texto plano), país, e conteúdo inserido pelo Utilizador nos módulos de negócio (Processos, CRM, interações com o Assistente de IA).
- **Base legal**: execução de contrato (prestação do serviço SaaS) para os dados operacionais; consentimento explícito para o registo público (este passo).
- **Subprocessadores/terceiros que recebem dados**: Anthropic (conteúdo de perguntas ao Assistente de IA, Passo 15), Stripe (dados de pagamento, nunca armazenados diretamente pela NEXA, Passo 21), Resend (endereço de email para envio de convites, Passo 29) — os três fora da UE seguem SCCs (Standard Contractual Clauses) da própria Stripe/Anthropic/Resend, a mencionar de forma genérica sem garantir detalhe contratual que não tenho.
- **Cookies**: só um cookie de sessão estritamente necessário (`httpOnly`, `Secure`, `SameSite=Strict`, ADR-004 §3.4) — sem cookies de análise, marketing ou rastreio (FR-08 telemetria nunca implementado). Isto significa que **não é necessário um banner de consentimento de cookies** — só divulgação na Política de Privacidade, tecnicamente correto porque cookies estritamente necessários estão isentos do requisito de consentimento da Diretiva ePrivacy.
- **Retenção de dados**: PSD-003 (retenção do conteúdo de interações de IA, já com decisão de retenção configurável, Passo 15/16); dados operacionais retidos enquanto a conta permanecer ativa (soft-delete por defeito).
- **Direito ao apagamento**: **PSD-001 permanece uma Questão em Aberto não resolvida** (hard-delete físico vs. soft-delete) — o texto da Política de Privacidade tem de refletir honestamente que o pedido de eliminação é processado manualmente nesta fase (contacto direto), nunca prometer um mecanismo self-service que ainda não existe. Fica fora do âmbito deste passo resolver PSD-001 — só descrever o processo real tal como existe hoje.

---

## 4. Decisões a Validar

- **A — Modelo de dados do consentimento**: novo modelo `ConsentimentoRegisto` (tenant-scoped, RLS, mesmo padrão de `ConviteUtilizador`), com `utilizadorId`/`empresaId` (chave composta, Camada 3 de Defense in Depth), `versaoTermos`, `versaoPrivacidade`, `aceiteEm`. Criado na mesma transação de `AuthService.registar()` (Passo 3) — bootstrap, sem `TenantContext` ainda, mesmo padrão já usado para `Empresa`/`Utilizador`.
- **B — Imutabilidade do registo de consentimento**: **proponho aplicar o mesmo trigger de imutabilidade a nível de BD já usado no Registo de Auditoria** (`BEFORE UPDATE OR DELETE`, Passo 6) a esta nova tabela — um registo de consentimento é, por natureza, prova legal; nunca deveria poder ser alterado ou apagado por nenhum role, incluindo o owner. **Decisão a validar contigo, não assumida.**
- **C — Versionamento**: strings de versão simples (`"1.0"`) definidas como constantes no backend (`legal.constants.ts`, mesmo espírito de `PLANOS_CONFIG`) — fonte de verdade do que fica gravado na BD. As páginas `/termos`/`/privacidade` no frontend mostram o mesmo número de versão como texto simples, mantido em sincronia manualmente (documentos legais mudam raramente; sem justificação para um endpoint dedicado só para isto).
- **D — Enforcement estrutural, não só visual**: `RegistarDto` ganha um campo obrigatório `aceiteTermos: true` (validado com `@Equals(true)`, fronteira única — Data & Consistency Rules 3.6) — o backend rejeita (`400`) qualquer registo sem consentimento explícito, mesmo contornando a UI diretamente via API. O checkbox no frontend fica desabilitado por defeito, só ativa o botão de submissão quando marcado — mas a proteção real é sempre do backend, nunca só da interface (mesmo princípio já seguido em todo o RBAC, ADR-006 §3.7).
- **E — Consentimento só no registo público, nunca no convite**: reconfirma a decisão já validada no Passo 29 — a aceitação de um `ConviteUtilizador` **não** exige este checkbox (base legal distinta: interesse legítimo/contrato administrativo vs. consentimento de registo espontâneo). Sem alteração ao fluxo de convite.

---

## 5. Sequência de Execução (Só Depois da Confirmação das Secções 2 e 4)

1. Redigir o rascunho técnico de `/termos` e `/privacidade` (conteúdo real determinado na secção 3 + marcadores explícitos para a informação da secção 2 ainda não confirmada).
2. Modelo Prisma `ConsentimentoRegisto` + 2 migrações (schema + RLS), mesmo padrão de sempre; trigger de imutabilidade se a Decisão B for aprovada.
3. `RegistarDto` estendido (`aceiteTermos: true`, `@Equals(true)`); `AuthService.registar()` grava o `ConsentimentoRegisto` na mesma transação.
4. Páginas `/termos` e `/privacidade` (Server Components estáticos, mesmo padrão simples de `/precos`).
5. Ecrã de Registo (`/registar`) — checkbox obrigatório com links para as duas páginas (nova aba), submissão desabilitada até estar marcado.
6. Testes e2e novos: registo sem `aceiteTermos` → `400`; registo com consentimento → `ConsentimentoRegisto` criado com a versão e timestamp corretos; se a Decisão B for aprovada, tentativa direta de `UPDATE`/`DELETE` no registo de consentimento → rejeitada pelo trigger.
7. Validação manual no browser: checkbox funcional, páginas legíveis, registo de consentimento confirmado por leitura direta da BD.
8. Deploy a staging via o pipeline CI/CD real (mesma disciplina do M7/Passo 46).

---

## 6. Fora de Âmbito Deste Passo

- Resolver PSD-001 (hard-delete físico para direito ao apagamento) — só descrever o processo manual real na Política de Privacidade.
- Resolver PSD-002 (residência de dados Enterprise) — já fora de âmbito do MVP.
- Banner de consentimento de cookies — não aplicável, só cookie estritamente necessário em uso.
- Revisão jurídica profissional do conteúdo — ação da Fundadora/CEO, fora do âmbito de uma implementação de código.

---

## 7. Exit Criteria

- Informação da secção 2 confirmada (ou explicitamente aceite com marcadores `[A PREENCHER]`) e Decisões A-E confirmadas antes de qualquer alteração de código.
- Páginas `/termos`/`/privacidade` publicadas; checkbox de consentimento obrigatório e funcional; consentimento registado na BD (nunca só visual); testes e2e novos verdes; suite completa sem regressão.
- Deploy a staging confirmado via o pipeline real.
- **A conclusão deste passo é técnica, não legal** — fica explicitamente registado que o passo só é considerado aprovado para uso em produção com clientes reais depois da tua confirmação sobre a validação jurídica do conteúdo (condição já fixada na aprovação do M8).
