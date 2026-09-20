# Research: Visão e Roadmap do ERP

## Decisão 1 — Separar visão, mapa e roadmap

**Decision**: Produzir três documentos, cada um com uma responsabilidade: identidade do produto, inventário de capacidades e ordem de evolução.

**Rationale**: Um único documento ficaria longo, misturaria realidade com intenção e seria difícil de atualizar. A separação permite mudar prioridades sem reescrever princípios ou o domínio atual.

**Alternatives considered**:

- Um documento único de visão e roadmap: rejeitado por baixa navegabilidade e alto risco de desatualização.
- Uma spec por domínio antes do roadmap: rejeitado porque congelaria detalhes antes de priorizar e validar dependências.

## Decisão 2 — Manter `docs/domain.md` estritamente factual

**Decision**: `docs/domain.md` descreve somente comportamento implementado; futuro fica em visão, mapa e roadmap.

**Rationale**: O domínio atual é usado para entender e manter o sistema. Misturar funcionalidades futuras faria leitores e agentes assumirem capacidades inexistentes.

**Alternatives considered**:

- Expandir `domain.md` com uma seção futura extensa: rejeitado por confundir fonte de verdade atual e desenho alvo.
- Substituir `domain.md` pelo mapa: rejeitado porque mapa de capacidades não documenta regras detalhadas existentes.

## Decisão 3 — Usar estados de capacidade explícitos

**Decision**: Classificar cada capacidade como `Existente`, `Existente — redesenhar`, `Planejada`, `Hipótese futura` ou `Fora de escopo`.

**Rationale**: O sistema já possui implementações parciais de catálogo, configuração e financeiro. Uma classificação binária apagaria esse investimento ou daria falsa impressão de conclusão.

**Alternatives considered**:

- Percentuais de conclusão: rejeitados porque seriam subjetivos e rapidamente ficariam obsoletos.
- Somente “feito” e “não feito”: rejeitado porque não representa redesenhos e hipóteses.

## Decisão 4 — Roadmap por horizontes e gates, não por datas

**Decision**: Organizar o roadmap em Agora, Próximo, Depois e Exploração, com critérios de entrada e dependências.

**Rationale**: Não há estimativas validadas nem equipe dedicada que justifique datas. Horizontes deixam a ordem clara sem transformar intenção em promessa.

**Alternatives considered**:

- Roadmap trimestral: rejeitado até haver capacidade e esforço estimados.
- Backlog linear sem horizontes: rejeitado porque mistura fundações, entregas e pesquisas exploratórias.

## Decisão 5 — Tratar o ERP como fonte de verdade com projeções por canal

**Decision**: A visão registra o catálogo interno como fonte de verdade; anúncios são representações específicas por canal e podem ter sobrescritas controladas.

**Rationale**: Shopee, TikTok e canais futuros possuem títulos, categorias, atributos e regras diferentes. Copiar o modelo de um canal para o núcleo criaria acoplamento e impediria expansão.

**Alternatives considered**:

- Usar o cadastro Shopee como cadastro principal: rejeitado por dependência de um canal.
- Sincronização bidirecional irrestrita: rejeitada pelo risco de sobrescritas silenciosas e divergência.

## Decisão 6 — Separar estimativa comercial do realizado financeiro

**Decision**: Configurações de taxa e margem produzem preço e recebimento estimados; relatórios ou transações conciliadas determinam o resultado real.

**Rationale**: As plataformas aplicam regras, descontos, ajustes, impostos, reembolsos e repasses que não são totalmente representados por uma taxa percentual única.

**Alternatives considered**:

- Considerar taxa configurada como resultado final: rejeitado por não reconciliar o dinheiro recebido.
- Manter apenas o valor agregado recebido: aceito no estado atual, mas marcado para evolução para transações rastreáveis.

## Decisão 7 — Registrar emissão unificada de NF-e como exploração

**Decision**: Documentar a oportunidade, mas exigir pesquisa fiscal, operacional e de fornecedores antes de abrir uma spec de implementação.

**Rationale**: A experiência pode ser valiosa, porém emissão fiscal envolve requisitos externos, contingência, certificados, cancelamentos e atualização contínua. A viabilidade não foi validada.

**Alternatives considered**:

- Comprometer implementação própria desde já: rejeitado pelo risco e pela complexidade não pesquisada.
- Excluir a ideia: rejeitado porque ela pode fechar um fluxo importante do ERP.

## Decisão 8 — Uma spec independente por resultado de negócio

**Decision**: Cada iniciativa do roadmap origina uma spec pequena, com descoberta e gates próprios.

**Rationale**: Catálogo, conciliação, produção, estoque e publicação possuem riscos e critérios de aceitação diferentes. Entregas menores facilitam testes, revisão e reversão.

**Alternatives considered**:

- Uma “spec do ERP completo”: rejeitada por escopo impossível de validar e implementar incrementalmente.
- Implementar diretamente a partir do roadmap: rejeitado por violar o fluxo SDD e omitir decisões específicas.
