# NEXA — Brand Book

| | |
|---|---|
| **Documento** | Brand Book |
| **Fase** | 1 — Documentação Estratégica |
| **Versão** | 1.3 |
| **Estado** | ✅ Aprovado |
| **Owner** | Fundadora / CEO / Product Owner |
| **Documentos de referência** | Vision Document v1.1 · Product Vision v1.1 · Mission & Values v1.1 (todos Aprovados) |
| **Última atualização** | 2026-07-02 |

---

## 1. Objetivo

Este documento formaliza e desenvolve a identidade visual e verbal da NEXA, já definida em conceito na fase de Discovery (Dark Tech Premium — preto, cinza escuro, roxo elétrico), num sistema de marca completo e utilizável: tipografia, paleta de cores com códigos técnicos, sistema de logótipo, iconografia, espaçamento, estilo fotográfico, elementos gráficos, tom de comunicação, aplicações e regras de utilização. Não altera a identidade já aprovada — desenvolve-a com o rigor necessário para ser aplicada de forma consistente em qualquer material, por qualquer pessoa, a partir de agora.

### Nota de Clarificação de Âmbito

Este Brand Book opera ao **nível da marca** (cores, tipografia, logótipo, tom, aplicações). Não inclui a especificação de componentes de interface (botões, formulários, cartões, estados de erro, etc.) — esse é o âmbito de um **Design System de componentes**, que será desenvolvido tecnicamente mais à frente, quando a Fase de UI/UX Design for iniciada, e que herdará diretamente as decisões aqui tomadas (cores, tipografia, espaçamento) como os seus tokens de base. Esta separação evita comprometer decisões de implementação de interface antes de existir arquitetura técnica definida.

---

## 2. Contexto

A NEXA já entra neste documento com decisões de conceito aprovadas e não negociáveis nesta fase: conceito Dark Tech Premium, paleta principal preto/cinza escuro/roxo elétrico, estilo minimalista, tecnológico, sofisticado e premium, posicionamento de inteligência operacional e automação empresarial. O que falta — logótipo final e tipografia oficial — é o que este documento propõe de forma fundamentada, mantendo total coerência com o que já foi validado.

---

## 3. Conteúdo Estruturado

### 3.1 Conceito e Posicionamento da Marca

**Dark Tech Premium.** A marca NEXA comunica-se através de contraste, precisão e sofisticação — nunca através de excesso visual. O fundo escuro não é uma escolha estética isolada: reforça, visualmente, o posicionamento de "inteligência operacional" — um ambiente de controlo, foco e clareza, onde o roxo elétrico assinala exatamente os pontos que exigem atenção ou ação, tal como a Missão da NEXA se propõe a fazer na operação real de uma empresa (Mission & Values, 3.1).

Três palavras-chave orientam toda e qualquer decisão visual futura: **Preciso. Inteligente. Confiável.** Qualquer elemento gráfico, fotografia ou escolha tipográfica que não reforce pelo menos uma destas três palavras deve ser questionado antes de ser aprovado.

### 3.2 Tipografia

**Tipografia primária (títulos, destaques, identidade) — proposta: Space Grotesk**

Fonte geométrica, sans-serif, com carácter técnico e contemporâneo — os seus contornos ligeiramente angulares reforçam a sensação "tech" sem cair no exagero futurista. É gratuita, open-source (licença SIL Open Font License), disponível no Google Fonts, com excelente suporte para caracteres latinos (incluindo acentuação portuguesa) e inglês — essencial dado o requisito de plataforma multilíngue desde o dia 1 (Vision Document, 2). Pesos recomendados: Medium (500), SemiBold (600), Bold (700).

**Tipografia secundária (corpo de texto, interface) — proposta: Inter**

Fonte desenhada especificamente para ecrãs e interfaces digitais, com excelente legibilidade a tamanhos pequenos — crítico para um produto de uso intensivo diário (Mission & Values, 3.1: "parte da rotina operacional"). Também gratuita, open-source, e uma das fontes mais testadas e utilizadas em produtos SaaS modernos, o que reduz risco de problemas de renderização entre dispositivos. Pesos recomendados: Regular (400), Medium (500), SemiBold (600).

**Porquê duas fontes, não uma:** a combinação de uma fonte de identidade mais expressiva (Space Grotesk, para títulos e momentos de marca) com uma fonte de interface otimizada para leitura prolongada (Inter, para o dia a dia de uso da plataforma) é o padrão de produtos SaaS premium bem-sucedidos — evita o erro comum de usar uma fonte muito "de marca" também no corpo de texto, o que cansa a leitura em uso intensivo.

**Escala tipográfica de referência** (base 16px, razão 1.25 — escala modular "Major Third" adaptada):

| Nível | Tamanho | Uso |
|---|---|---|
| Display | 48px / 56px | Títulos de grande destaque (landing page, apresentações) |
| H1 | 36px / 44px | Títulos de página |
| H2 | 28px / 36px | Títulos de secção |
| H3 | 22px / 28px | Subtítulos |
| Body Large | 18px / 28px | Texto de destaque, introduções |
| Body | 16px / 24px | Texto corrente |
| Small | 14px / 20px | Texto auxiliar, legendas |
| Caption | 12px / 16px | Metadados, timestamps |

### 3.3 Paleta de Cores Completa

**Cores de base (Dark Tech)**

| Nome | HEX | RGB | CMYK* | Uso |
|---|---|---|---|---|
| NEXA Black | `#0A0A0F` | 10, 10, 15 | 33, 33, 0, 94 | Fundo base da aplicação e materiais de marca |
| NEXA Charcoal | `#16161D` | 22, 22, 29 | 24, 24, 0, 89 | Superfícies elevadas (cartões, painéis, modais) |
| NEXA Slate | `#3A3A46` | 58, 58, 70 | 17, 17, 0, 73 | Contornos, divisores, texto secundário sobre fundo escuro |

**Cor de marca (Roxo Elétrico)**

| Nome | HEX | RGB | CMYK* | Uso |
|---|---|---|---|---|
| NEXA Electric Purple | `#7B2FF7` | 123, 47, 247 | 50, 81, 0, 3 | Cor primária de marca — ações principais, elementos de destaque, logótipo |
| NEXA Violet Glow | `#A855F7` | 168, 85, 247 | 32, 66, 0, 3 | Variante secundária — gradientes, estados de hover, efeitos de destaque (glow) |

**Cores neutras (texto e superfícies claras)**

| Nome | HEX | RGB | CMYK* | Uso |
|---|---|---|---|---|
| NEXA White | `#F5F5F7` | 245, 245, 247 | 1, 1, 0, 3 | Texto principal sobre fundo escuro |
| NEXA Gray | `#A1A1AA` | 161, 161, 170 | 5, 5, 0, 33 | Texto secundário, placeholders |

**Cores semânticas (estados funcionais da plataforma)**

| Nome | HEX | RGB | CMYK* | Uso |
|---|---|---|---|---|
| Success | `#22C55E` | 34, 197, 94 | 83, 0, 52, 23 | Confirmações, estados positivos |
| Warning | `#F59E0B` | 245, 158, 11 | 0, 36, 96, 4 | Avisos, ações que requerem atenção |
| Error | `#EF4444` | 239, 68, 68 | 0, 72, 72, 6 | Erros, ações destrutivas |
| Info | `#38BDF8` | 56, 189, 248 | 77, 24, 0, 3 | Informação neutra, dicas |

*\*Valores CMYK calculados por conversão matemática padrão a partir do RGB, para referência de aplicação em materiais impressos. Antes de qualquer produção gráfica em grande escala (ex: material institucional impresso), recomenda-se validação e calibração das cores com o fornecedor de impressão, dado que a conversão RGB→CMYK é sempre uma aproximação e a perceção de cor varia por dispositivo e processo de impressão.*

**Regra de contraste (acessibilidade):** dado que a interface assenta sobre fundo escuro, todo o texto principal deve usar NEXA White (`#F5F5F7`) sobre NEXA Black ou NEXA Charcoal, garantindo conformidade com WCAG AA (rácio de contraste mínimo 4.5:1 para texto corrente). O uso de NEXA Electric Purple como cor de texto deve ser limitado a elementos de destaque de grande tamanho (títulos, botões), nunca a texto corrente extenso, por não garantir o mesmo nível de contraste em todos os fundos.

### 3.4 Sistema de Logótipo — Direção e Princípios

**A identidade visual definitiva da NEXA será desenvolvida numa fase dedicada de Brand Design, tendo como referência oficial o conceito visual já aprovado pela fundadora. O objetivo é preservar a direção estética apresentada, refinando-a profissionalmente sem alterar a sua essência.**

> **Referência visual oficial:** o processo de Brand Design deverá utilizar como ponto de partida a composição visual aprovada pela fundadora — wordmark "NEXA" com estética Dark Tech Premium, "N" com personalidade própria e "X" em destaque — refinando-a profissionalmente sem alterar a essência da identidade já validada.

Este documento não fecha um símbolo específico nesta fase — faria exatamente o tipo de compromisso prematuro que a restante documentação estratégica tem evitado deliberadamente (ver, por exemplo, a decisão equivalente tomada no Product Roadmap D2, de não especificar em detalhe os Arcos 2-4 antes de existir evidência suficiente). Em vez disso, esta secção regista os **princípios que qualquer proposta de logótipo — desenhada por um designer, uma agência, ou gerada com apoio de IA — deve obrigatoriamente cumprir**, para que a evolução da identidade visual mantenha sempre a essência já validada, independentemente de quem a executa.

**Princípios do logótipo:**

1. **A palavra "NEXA" é a base da identidade, não um símbolo isolado.** Ao contrário de um monograma ou ícone abstrato usado como marca principal, a identidade da NEXA assenta na própria palavra, tratada como uma composição gráfica cuidada — cada letra desenhada com intenção, não apenas tipografada.
2. **O "N" deve ter personalidade própria.** Não deve ler-se como uma letra comum de uma fonte standard — deve ser trabalhado (proporção, corte, ângulo, ou tratamento próprio) até se tornar tão reconhecível quanto o resto da palavra, contribuindo para a memorabilidade do conjunto.
3. **O "X" mantém-se o elemento icónico da marca, mas integrado naturalmente na palavra**, não destacado como símbolo à parte. O destaque do X pode vir de cor (roxo elétrico sobre o resto em tom neutro/metálico), de peso, ou de um tratamento gráfico subtil — nunca de uma separação que quebre a leitura fluida da palavra "NEXA" como um todo.
4. **O conjunto completo deve transmitir robustez e sofisticação de nível "top tier tech"** — o tipo de wordmark que se associa a empresas tecnológicas de referência internacional, não a um exercício gráfico genérico ou a um símbolo geométrico abstrato desligado do nome da marca.
5. **Coerência total com o Dark Tech Premium já aprovado** — paleta preto/cinza escuro/roxo elétrico (secção 3.3), minimalismo, ausência de elementos decorativos supérfluos.

**Requisitos técnicos que qualquer proposta final deve cumprir** (independentes da direção criativa exata, e por isso mantidos como requisitos de sistema):

| Requisito | Descrição |
|---|---|
| Legibilidade a qualquer escala | O wordmark deve manter-se legível desde aplicações de grande formato até tamanhos reduzidos de interface (ex: cabeçalho da aplicação) |
| Elemento standalone para espaços mínimos | Deve existir uma redução válida do wordmark (ex: apenas o "X" tratado, ou um monograma extraído da própria palavra) para uso em favicon, ícone de aplicação e avatares, onde a palavra completa não cabe |
| Versões de cor | Cor cheia (sobre fundo escuro), reversa (versão clara, para fundos onde a cor principal não for aplicável) e monocromática (para impressão a uma cor) |
| Área de proteção | Espaço mínimo de respiro à volta do logótipo, a definir com precisão na fase de Brand Design, com base no desenho final |
| Tamanho mínimo | Medidas mínimas de reprodução digital e impressa, a validar com o artefacto final |

*Nota de processo: numa iteração anterior deste documento, foi explorada e temporariamente aprovada uma direção específica de símbolo ("X Negativo em Diamante"), juntamente com três alternativas. Essa exploração fica registada no histórico de alterações (secção 6) como referência de processo, mas deixa de ser a direção vinculativa da marca — foi substituída pela abordagem de princípios acima, mais alinhada com a referência visual fornecida pela fundadora.*

### 3.5 Iconografia

**Estilo:** icons de linha (outline), nunca preenchidos a sólido, com espessura de traço consistente (1.5-2px) e terminações arredondadas — reforça o mesmo carácter "preciso mas humano" da tipografia.

**Recomendação de biblioteca base:** Lucide Icons — biblioteca open-source, gratuita, com mais de 1.000 ícones consistentes, ativamente mantida, e já compatível com o ecossistema técnico moderno (React) que é candidato natural para a interface da NEXA. Usar uma biblioteca estabelecida em vez de desenhar cada ícone de raiz reduz custo e tempo sem comprometer consistência, reservando desenho customizado apenas para o símbolo de marca e para eventuais ícones muito específicos do domínio da NEXA (ex: representações próprias para "automação" ou "confiança de IA") que a biblioteca não cubra bem.

**Cor:** ícones funcionais em NEXA White ou NEXA Gray sobre fundo escuro; NEXA Electric Purple reservado para ícones que representam ações principais ou estados ativos/selecionados — nunca usado indiscriminadamente, para preservar o seu valor como sinal de destaque.

### 3.6 Espaçamento e Grid

Sistema de espaçamento baseado numa grelha de 8px — padrão da indústria para interfaces digitais, que garante alinhamento consistente entre qualquer elemento da plataforma e reduz decisões arbitrárias de espaçamento durante o desenvolvimento:

| Token | Valor | Uso típico |
|---|---|---|
| space-1 | 4px | Espaçamento mínimo (entre ícone e texto) |
| space-2 | 8px | Espaçamento base |
| space-3 | 12px | Espaçamento entre elementos relacionados |
| space-4 | 16px | Espaçamento padrão entre componentes |
| space-6 | 24px | Espaçamento entre secções pequenas |
| space-8 | 32px | Espaçamento entre blocos de conteúdo |
| space-12 | 48px | Espaçamento entre secções principais |
| space-16 | 64px | Espaçamento amplo (landing pages, materiais de marca) |

### 3.7 Estilo Fotográfico e Imagético

- **Tom visual:** escuro, alto contraste, com elementos de luz roxa a emergir do fundo negro — nunca imagens claras, coloridas ou "corporate stock" genéricas (pessoas a apertar as mãos, escritórios genéricos).
- **Temática preferida:** visualizações de dados abstratas, texturas tecnológicas (redes, nós, partículas de luz), capturas de interface reais da plataforma em contexto (enquadradas em dispositivos), em vez de fotografia de stock de pessoas.
- **Quando pessoas são necessárias** (ex: página "Sobre Nós", testemunhos de clientes piloto): fotografia autêntica e natural, nunca poses de stock genéricas — prioridade a fotografar as próprias empresas piloto reais quando possível, reforçando autenticidade.
- **Evitar:** gradientes multicoloridos fora da paleta definida, ilustrações "fofas"/cartoon (destoam do posicionamento premium), excesso de elementos decorativos que competem com o conteúdo.

### 3.8 Elementos Gráficos

- **Efeito de glow (brilho):** elementos em NEXA Electric Purple podem usar um efeito de desfoque suave (blur/glow) por trás, para reforçar sensação de "energia" e tecnologia — usado com moderação, nunca em todos os elementos da mesma tela.
- **Bordas subtis:** contornos finos (1px) em NEXA Slate ou branco a baixa opacidade (~10-15%), para delimitar cartões e painéis sem criar divisões pesadas.
- **Padrões de fundo:** texturas discretas de grelha ou pontos (dot grid), a opacidade muito baixa, como textura de fundo em áreas vazias — nunca como elemento dominante.
- **Gradientes de marca:** transição entre NEXA Electric Purple e NEXA Violet Glow, sempre em ângulo consistente (recomendado 135°), reservada para elementos de destaque (botões principais, call-to-actions, elementos hero).
- **Evitar:** sombras pesadas e skeuomorfismo (relevo 3D exagerado); a estética Dark Tech Premium assenta em profundidade através de contraste e luz, não através de volume artificial.

### 3.9 Tom de Comunicação e Voz da Marca

Consistente com o valor "Clareza é Respeito" (Mission & Values, 3.3):

- **A NEXA fala como uma parceira competente, não como uma startup em busca de hype.** Evitamos linguagem exagerada ("revolucionário", "vai mudar tudo") a favor de afirmações concretas e verificáveis sobre o que a plataforma faz.
- **Direta e sem jargão desnecessário.** O público-alvo (donos e gestores de PME) não é tecnicamente especializado — a comunicação deve ser inteligível sem depender de vocabulário técnico de IA ou engenharia de software.
- **Confiante, nunca arrogante.** A NEXA comunica com segurança sobre o que já sabe (dados, resultados de clientes piloto), e com humildade sobre o que ainda está a validar — nunca promete o que ainda não provou.
- **Humana, apesar de tecnológica.** Mesmo sendo uma plataforma de IA, a comunicação da marca nunca deve soar fria ou robótica — o objetivo da NEXA é servir pessoas reais a gerir negócios reais.

**Exemplo prático (o que fazer vs. evitar):**

| Evitar | Preferir |
|---|---|
| "A NEXA revoluciona a gestão empresarial com IA de última geração." | "A NEXA organiza a sua operação num único lugar, com IA que ajuda a decidir melhor." |
| "Automatize tudo com o poder da inteligência artificial." | "A IA da NEXA sugere; você decide." |

### 3.10 Aplicações da Marca

Lista de referência dos contextos onde esta identidade deve ser aplicada de forma consistente, a título de checklist para materiais futuros: website institucional e landing pages, interface da plataforma (aplicação direta dos tokens de cor/tipografia/espaçamento), apresentações e materiais para investidores/parceiros, redes sociais, assinatura de email, cartões de visita e papelaria, favicon e ícones de aplicação.

### 3.11 Regras de Utilização

**Fazer:**
- Manter sempre o logótipo com a área de proteção mínima definida (3.4).
- Usar NEXA Electric Purple apenas para destacar — nunca como cor de fundo dominante em grandes áreas.
- Verificar sempre o contraste de texto sobre fundo, especialmente ao combinar roxo com outras cores da paleta.

**Não fazer:**
- Não distorcer, rodar ou alterar as proporções do logótipo.
- Não recolorir o logótipo fora das versões definidas em 3.4.
- Não colocar o logótipo em cor cheia (roxo) sobre fundos claros ou coloridos sem antes validar contraste — a versão reversa/monocromática existe exatamente para estes casos.
- Não misturar a tipografia de marca (Space Grotesk) com outras fontes decorativas no mesmo material.
- Não usar gradientes ou cores fora da paleta definida em 3.3, mesmo que visualmente "combinem" — a consistência da marca depende da disciplina da paleta fechada.

---

## 4. Decisões Tomadas

| # | Decisão | Justificação |
|---|---|---|
| D1 | Tipografia dupla: Space Grotesk (identidade/títulos) + Inter (interface/corpo de texto), ambas open-source | Equilibra carácter de marca com legibilidade em uso intensivo diário; licenciamento gratuito elimina custo e risco legal, relevante dado o orçamento controlado da fase atual (Discovery, Pergunta 5) |
| D2 | Paleta de cores fechada e codificada (HEX/RGB/CMYK), incluindo cores semânticas de estado (sucesso/aviso/erro/info) | Uma paleta fechada desde já evita decisões ad-hoc de cor durante o desenvolvimento da interface, e as cores semânticas são um requisito funcional real de qualquer SaaS (estados de formulários, notificações, alertas) |
| D3 | O logótipo mantém-se ao nível de princípios (wordmark como base, N com personalidade, X integrado e icónico, robustez premium), sem fechar um símbolo geométrico específico nesta fase — a direção "X Negativo em Diamante", explorada e temporariamente aprovada numa iteração anterior, foi revertida | A fundadora já possui uma referência visual concreta e aprovada (imagem de marca própria) que deve orientar a fase dedicada de Brand Design; fechar um símbolo alternativo neste documento contrariaria essa referência e comprometeria prematuramente uma decisão que pertence a essa fase, não à documentação estratégica |
| D4 | Recomendação de biblioteca de iconografia open-source (Lucide) em vez de iconografia customizada de raiz | Reduz custo e tempo de desenvolvimento visual sem comprometer consistência, reservando esforço de design customizado apenas para elementos exclusivos de marca (símbolo do logótipo) |
| D5 | Este documento não especifica componentes de interface (Design System de componentes); apenas os tokens de base (cor, tipografia, espaçamento) | Mantém o Brand Book ao nível da marca, evitando comprometer decisões de implementação de UI antes de existir arquitetura técnica — consistente com a metodologia de não avançar fases prematuramente |

---

## 5. Questões em Aberto

| # | Questão | Impacto | Responsável pela decisão |
|---|---|---|---|
| Q1 | Quem conduz a fase dedicada de Brand Design — designer freelancer, agência especializada em identidade de marca, ferramenta assistida por IA, ou o próprio CTO em fase de UI/UX — a partir da referência visual já aprovada e dos princípios registados em 3.4? | Timeline, orçamento, qualidade do artefacto final de marca | CEO, antes do lançamento público do MVP |
| Q2 | Deve a NEXA proceder ao registo formal da marca (nome + logótipo) junto do INPI/EUIPO antes do lançamento público, para proteção legal do nome "NEXA"? | Proteção legal, risco de conflito de marca | CEO, recomenda-se decisão antes do lançamento com clientes piloto |
| Q3 | A plataforma terá, no futuro, uma versão "modo claro" (light mode) da interface, ou o Dark Tech mantém-se como único modo visual da aplicação? | Design System de componentes, esforço de desenvolvimento de UI | CEO + CTO, a decidir na Fase de UI/UX Design |
| Q4 | Confirmação de disponibilidade do domínio e handles de redes sociais sob o nome "NEXA" (frequentemente já ocupados, dado tratar-se de uma palavra comum) | Marketing, aquisição de clientes, consistência de marca online | CEO, verificação prática a realizar em paralelo |

---

## 6. Histórico de Alterações

| Versão | Data | Alteração | Autor |
|---|---|---|---|
| 1.0 | 2026-07-02 | Criação do documento, desenvolvendo a identidade Dark Tech Premium já aprovada em conceito num sistema de marca completo (tipografia, cor, logótipo, iconografia, espaçamento, imagética, tom de voz, aplicações e regras de uso) | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | Revisão da secção de Sistema de Logótipo (3.4): substituída a proposta genérica inicial por um processo de exploração dirigida de 4 direções de símbolo (X Negativo em Diamante, X Assimétrico, X Circuito Ortogonal, X Luminoso em Gradiente), testadas em formato de ícone de aplicação; direção final aprovada e formalizada — X Negativo em Diamante, com variantes de cor e composição detalhadas | CTO (Claude) + Fundadora/CEO |
| 1.1 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |
| 1.2 | 2026-07-02 | Revisão da secção de Sistema de Logótipo (3.4): revertida a direção fechada "X Negativo em Diamante" para uma abordagem de princípios (wordmark como base da identidade, N com personalidade própria, X integrado e icónico dentro da palavra, robustez premium), remetendo o desenho definitivo para uma fase dedicada de Brand Design, com referência visual oficial fornecida pela fundadora; decisão D3 e questão Q1 atualizadas em conformidade | CTO (Claude) + Fundadora/CEO |
| 1.3 | 2026-07-02 | Adicionada declaração formal de "Referência Visual Oficial" em 3.4, fixando em texto explícito que o processo de Brand Design parte da composição visual já aprovada (wordmark Dark Tech Premium, N com personalidade, X em destaque) | CTO (Claude) + Fundadora/CEO |
| 1.3 | 2026-07-02 | **Aprovação oficial.** Documento passa a estado Aprovado | Fundadora/CEO |
