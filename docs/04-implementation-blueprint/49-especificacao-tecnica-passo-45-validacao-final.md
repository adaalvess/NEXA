# NEXA — Especificação Técnica do Passo 45 (M7 — Validação Técnica Final)

| | |
|---|---|
| **Documento** | Especificação Técnica — Passo 45: Validação Técnica Final do M7 |
| **Fase** | 7 — Desenvolvimento da Plataforma, M7 (Deploy em Staging), Passo 45 — sétimo e último passo do M7 |
| **Versão** | 1.0 |
| **Estado** | 🔶 Aguarda aprovação |
| **Owner** | CTO / Arquiteto Principal |
| **Documentos de referência** | ADR-007 (v1.3) §3.8/§3.9; Relatórios dos Passos 39-44 |
| **Última atualização** | 2026-07-20 |

---

## 1. Objetivo

Último passo do M7 — duas peças independentes: (A) o **teste real de recuperação de backup** já exigido literalmente pelo ADR-007 §3.8 ("testes periódicos de recuperação são exigidos como prática obrigatória, não apenas os backups em si"), nunca antes exercitado em todo o projeto; (B) um **checklist de encerramento formal do M7**, revisitando os Exit Criteria dos 7 passos (39-45) e as exceções/Questões em Aberto herdadas, para o Milestone fechar com o mesmo rigor de M1-M6.

---

## 2. Teste de Recuperação de Backup — Desenho Seguro

A retenção de PITR (Point-in-Time Recovery) em staging é de 6h (plano Neon Free, exceção já registada como Q4 do ADR-007) — a janela de teste tem de caber dentro disso.

**Decisão de desenho**: usar a funcionalidade de **branching** da Neon para criar um ramo novo a partir de um ponto no tempo passado — nunca restaurar o ramo principal diretamente. Isto prova a capacidade de recuperação com **risco zero** para o ambiente de staging real (o ramo de teste é isolado, eliminado no final, nunca substitui nem afeta o ramo `main` da Neon que o Render/Vercel usam).

**Sequência**:
1. Criar uma Empresa de demonstração real (`Passo45 Teste Restore`), registar timestamp exato (T0).
2. Aguardar alguns minutos, depois eliminar essa Empresa fisicamente da base de dados (T1) — simula uma perda de dados real.
3. Criar um branch Neon a partir de um timestamp **entre T0 e T1** (a API/CLI da Neon suporta `--timestamp`).
4. Ligar-se ao branch novo (nunca ao `main`) e confirmar que a Empresa **ainda lá está** — prova real de que a recuperação funciona.
5. Eliminar o branch de teste — nunca fica um recurso órfão a acumular custo/confusão.

---

## 3. Checklist de Encerramento do M7 (Parte B)

Revisão formal, não uma nova implementação — confirmar, um a um, que cada Exit Criteria dos Passos 39-45 está genuinamente cumprido (não só "marcado"), e que todas as exceções/Questões em Aberto herdadas continuam corretamente registadas (nunca silenciosamente esquecidas):

- Repositório GitHub remoto ativo, rate limiting conforme ADR-007 §3.6 (Passo 39).
- Base de dados Neon em staging, região UE, schema/roles/RLS/trigger replicados (Passo 40) — **Q4 do ADR-007 (retenção PITR 6h) permanece ativa e corretamente documentada**.
- Backend em Render, região UE, servindo tráfego real (Passo 41).
- Frontend em Vercel, região UE, CORS correto, ponta a ponta validado (Passo 42).
- Sentry ativo e validado nos dois componentes (Passo 43) — **Q5 do ADR-007 (UptimeRobot bloqueado) permanece ativa e corretamente documentada**.
- Pipeline CI/CD real, portão validado nas duas direções, `autoDeploy` do Render desativado (Passo 44).
- Teste de recuperação de backup real, concluído com sucesso (Passo 45, secção 2).

---

## 4. Fora de Âmbito Deste Passo

- Upgrade do plano Neon (Q4) — só obrigatório antes de produção, não de staging.
- Resolução do bloqueio UptimeRobot (Q5) — depende de ação da Fundadora/CEO na própria conta, fora do controlo técnico.
- Qualquer novo desenvolvimento de produto — este passo é só validação e encerramento.

---

## 5. Exit Criteria

- Branch de teste da Neon criado a partir de um ponto no tempo, dados confirmados recuperados, branch eliminado no final.
- Checklist da secção 3 revisto, com evidência concreta (não suposição) para cada item.
- Relatório final de encerramento do M7, com resumo executivo equivalente ao já feito para o M6 (Passo 38).
