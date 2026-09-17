# Feature Specification: Vínculo de Itens TikTok por Descrição

**Feature Branch**: `006-tiktok-description-linking`

**Created**: 2026-09-17

**Status**: Draft

**Input**: User description: "O Ash Greninja mostra 54 vendas, mas pela Shopee são 38 e o TikTok não deve ter 16 desse produto. O código do TikTok ficou 'Padrao' para o produto — está puxando vendas de outros produtos. Corrigir o vínculo do TikTok por descrição e reparar os dados contaminados."

## Contexto (decisões da entrevista com o dono)

- A **coluna Vendas** (soma de `sale_items.quantity`, ignorando `refunded`) no painel de produtos está inflada para o Ash Greninja (54), mas o número real é ~46 (38 Shopee + 8 TikTok do próprio Ash).
- **Causa raiz:** o vínculo de itens casa por **`cProd`** (`linkCProd`, src/lib/xml/link.ts). Todos os itens do TikTok usam o **mesmo código genérico `'Padrao'`** (a NFe do TikTok não tem código por produto). Ao vincular manualmente `'Padrao'` → variante do Ash Greninja, o sistema **aprende** `product_codes ('Padrao', 'tiktok') → variant 2` e faz **backfill de todos** os itens TikTok `'Padrao'` para essa variante — inclusive itens de outros produtos (Luffy, Sauron, Jotaro, Mimikyu, Goku/Chi-Chi, Vegeta/Bulma, Jinx).
- **Consequência:** só o Ash Greninja fica inflado; os produtos reais ficam com 0 vendas; e a fila "sem vínculo" fica vazia para esses itens (ficam "vinculados" incorretamente). `frozen_cost_cents` desses itens está `0`/não aplicado → **custo/lucro não foi corrompido** (D6 preservado).
- **Decisão do dono (aprovada):** **reparar os dados contaminados** (desvincular itens errados, mantendo os corretos) **e passar a vincular o TikTok por descrição** (nome do produto), em vez de por código. Para Shopee/presencial, o vínculo continua por `cProd`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vincular itens TikTok pela descrição do produto (Priority: P1)

Como vendedor, quero que os itens do TikTok sejam vinculados pelo **nome/descrição do produto** (e não pelo código genérico `'Padrao'`), para que cada produto receba apenas as vendas que realmente são dele e a coluna Vendas seja fiel.

**Why this priority**: É a correção central — sem ela, o vínculo TikTok agrupa tudo num código genérico e contamina a contagem de vendas e a apuração por produto. Entrega valor imediato e habilita o reparo.

**Independent Test**: Importar itens TikTok com descrições distintas e conferir que o vínculo casa pela descrição; vincular um grupo por descrição e ver que só itens com aquela descrição são afetados (outros produtos não são puxados).

**Acceptance Scenarios**:

1. **Given** itens TikTok todos com `cProd='Padrao'` mas descrições diferentes ("Ash Greninja Low Poly…", "Luffy Low Poly…"), **When** vinculo a descrição "Ash Greninja Low Poly…" à variante do Ash Greninja, **Then** apenas os itens com essa descrição são vinculados (Luffy e demais permanecem na fila).
2. **Given** um vínculo TikTok aprendido por descrição, **When** importo uma nova nota TikTok com a mesma descrição, **Then** o item casa automaticamente por descrição e recebe o custo congelado da variante.
3. **Given** a fila de itens sem vínculo no TikTok, **When** listo os grupos, **Then** os grupos são separados por **descrição** (e não colapsados num único `'Padrao'`).
4. **Given** um produto Shopee/presencial com código real, **When** vinculo, **Then** o vínculo continua por `cProd` (sem mudança de comportamento).

---

### User Story 2 - Reparar os dados já contaminados (Priority: P2)

Como vendedor, quero que os itens TikTok incorretamente vinculados ao Ash Greninja sejam **desvinculados** (e voltem à fila), mantendo os que realmente são dele, para que a coluna Vendas mostre o número real.

**Why this priority**: É a correção do dado histórico já gravado; depende do US1 (a definição de "vínculo correto" por descrição) para saber o que manter/desvincular.

**Independent Test**: Rodar o reparo e conferir que o Ash Greninja passa a somar só os itens cuja descrição corresponde a ele; os demais voltam à fila sem vínculo.

**Acceptance Scenarios**:

1. **Given** a base atual com 26 itens TikTok `'Padrao'` vinculados ao Ash Greninja, **When** aplico o reparo, **Then** ficam vinculados ao Ash Greninja apenas os itens cuja descrição corresponde ao produto (≈8), e os demais (≈18) têm `variant_id`/`frozen_cost_cents` = null (voltam à fila).
2. **Given** o código aprendido `('Padrao','tiktok')` no `product_codes`, **When** aplico o reparo, **Then** esse código genérico é removido (não re-puxa itens em importações futuras).
3. **Given** itens TikTok corretamente vinculados por descrição após o reparo, **When** o reparo termina, **Then** fica registrado em `product_codes` um código por descrição (`'tiktok'`) para re-vinculação automática em importações futuras.
4. **Given** uma base sem contaminação, **When** aplico o reparo, **Then** o reparo é idempotente e não altera nada (no-op seguro).

---

### Edge Cases

- **Descrições com pequenas variações** (ex.: "Pokémon" vs "Pokemon", acentos/espaços): o casamento por descrição usa forma normalizada (colapso de espaços + minúsculas) para aumentar o acerto; variações maiores seguem para a fila e são vinculadas manualmente.
- **Venda `refunded`**: continua fora da soma da coluna Vendas (sem mudança).
- **Reparo em base limpa**: deve ser no-op (nenhuma desvinculação/remoção indevida).
- **Vínculo TikTok ambíguo** (descrição que casa com mais de um produto): não auto-associa; vai para conferência manual na fila.
- **Código genérico `'Padrao'` já aprendido** para outro canal/variante: o reparo remove apenas o vínculo `'tiktok'` desse código genérico; códigos Shopee/presencial reais não são afetados.
- **Itens TikTok vinculados cuja descrição NÃO contém o nome do produto**: considerados contaminados e desvinculados (regra do reparo).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O vínculo automático de itens DEVE usar **`cProd`** para os canais Shopee/presencial/geral e **`description`** para o canal TikTok (chave de vínculo por canal).
- **FR-002**: O sistema DEVE aprender o vínculo TikTok por **descrição** (gravado em `product_codes.code` = descrição, `channel='tiktok'`), para que importações futuras casem automaticamente.
- **FR-003**: A fila de itens sem vínculo DEVE agrupar os itens TikTok por **descrição** (e os demais canais por `cProd`).
- **FR-004**: O vínculo manual de um grupo TikTok DEVE fazer backfill apenas nos itens da **mesma descrição** no mesmo canal (não em todos os `'Padrao'`).
- **FR-005**: O reparo de dados DEVE desvincular (definir `variant_id`/`frozen_cost_cents` como null) os itens TikTok cujo vínculo atual não corresponde à descrição (o nome do produto vinculado não está contido na descrição), preservando os corretos.
- **FR-006**: O reparo DEVE remover o código aprendido genérico `('Padrao','tiktok')` e DEVE registrar um código por descrição para os itens TikTok mantidos.
- **FR-007**: O reparo DEVE ser **idempotente** e **seguro em base limpa** (no-op quando não há contaminação).
- **FR-008**: O custo congelado (`frozen_cost_cents`) NÃO é alterado silenciosamente em vendas já custeadas (D6); o reparo só toca itens desvinculados (que não tinham custo aplicado).
- **FR-009**: Vendas `refunded` continuam excluídas da soma da coluna Vendas (sem regressão).

### Key Entities *(include if feature involves data)*

- **SaleItem**: item de venda; ganha semântica de chave de vínculo por canal — `cProd` (Shopee/presencial) ou `description` (TikTok). `variant_id` null = sem vínculo (fila).
- **ProductCode**: mapeamento chave→variante; para TikTok, `code` passa a conter a **descrição** (com `channel='tiktok'`), não o `'Padrao'` genérico.
- **UnlinkedGroup**: grupo da fila; a chave de agrupamento passa a ser a **descrição** para o canal TikTok.
- **Product**: contêiner de variantes; recebe a coluna Vendas (soma de `quantity`, ignorando `refunded`) — sem mudança nesta feature (já entregue), mas o número precisa refletir o vínculo correto.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Após o reparo, o Ash Greninja exibe ~46 vendas (38 Shopee + itens TikTok cuja descrição é dele), e produtos como Luffy/Sauron/Jotaro deixam de ser contabilizados no Ash Greninja.
- **SC-002**: 100% dos itens TikTok corretamente vinculados permanecem vinculados após o reparo; 100% dos contaminados voltam à fila (`variant_id` null).
- **SC-003**: Nova importação TikTok com descrição já vinculada casa automaticamente em 100% dos casos com descrição idêntica (normalizada).
- **SC-004**: O reparo é idempotente — rodar duas vezes não altera nada na segunda execução.
- **SC-005**: Testes automatizados cobrem: chave de vínculo por canal (cProd vs descrição), agrupamento da fila por descrição no TikTok, backfill por descrição, e idempotência/segurança do reparo.

## Assumptions

- **Chave de vínculo por canal**: TikTok → `description`; Shopee/presencial/geral → `cProd`. Presencial continua sem códigos de marketplace (casa `cProd` geral).
- **Casamento por descrição usa forma normalizada** (colapso de espaços + minúsculas) para tolerar variações de espaço/caixa; diferenças de acento/grafia maiores vão para a fila (vínculo manual).
- **O nome do produto vinculado deve estar contido na descrição** para o item ser considerado "corretamente vinculado" no reparo.
- **Contaminação atual restrita ao canal TikTok** (via código `'Padrao'`); Shopee usa códigos reais e não é afetada pelo reparo.
- **Dados atuais são reparáveis por ação explícita e idempotente** (Server Action `repairTikTokLinks` + botão), sem migração/schema; banco local single-user com backup via arquivo SQLite.
- **`frozen_cost_cents` dos itens contaminados está sem custo** — o reparo não precisa reverter custo já aplicado (se algum estiver, permanece imutável por D6).