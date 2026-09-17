# Feature Specification: Seção Configurações com Navegação Lateral

**Feature Branch**: `003-settings-navigation`

**Created**: 2026-09-17

**Status**: Implemented

**Input**: User description: "Mover a precificação (parâmetros globais, impressoras, taxas por canal, teto MEI) para uma seção de Configurações, e trocar a barra de navegação superior por um menu lateral com submenu (accordion) em Configurações."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Acessar Configurações pelo menu lateral (Priority: P1)

O dono usa um **menu lateral** (sidebar) no lugar da barra de navegação superior. O menu tem os itens
Dashboard, Vendas, Produtos, Caixa e um item expansível **Configurações**. Ao expandir Configurações,
ele vê os subitens Precificação, Impressoras, Taxas por canal e Teto MEI. O item da página atual fica
destacado. Em telas pequenas, o menu lateral vira um botão (hambúrguer) que abre/oculta o menu.

**Why this priority**: é a base — sem a navegação nova, nada das configurações é alcançável. Também
é a mudança que reorganiza a UX pedida.

**Independent Test**: Abrir o app, ver o menu lateral com os 5 itens, expandir Configurações e
navegar para cada uma das 4 rotas; conferir que o item ativo fica destacado. Em janela estreita,
abrir o menu pelo hambúrguer.

**Acceptance Scenarios**:

1. **Given** o app aberto em desktop, **When** o dono vê o menu lateral, **Then** há Dashboard, Vendas,
   Produtos, Caixa e Configurações (expansível), com o item da rota atual destacado.
2. **Given** o dono clica em Configurações, **When** o item expande, **Then** aparecem Precificação,
   Impressoras, Taxas por canal e Teto MEI como subitens.
3. **Given** uma janela estreita, **When** o dono clica no botão hambúrguer, **Then** o menu lateral
   abre como overlay (drawer) e fecha ao clicar fora ou selecionar um item.
4. **Given** o dono navega para `/settings/pricing`, **When** a página carrega, **Then** o subitem
   Precificação fica destacado no menu.

---

### User Story 2 - Configurar precificação em Configurações (Priority: P1)

O dono configura os **parâmetros globais** (tarifa de energia R$/kWh, horas de uso por semana, mão de
obra R$/hora) e os **materiais de filamento** (nome + R$/kg) em **Precificação**, sob Configurações.
Esse painel é o mesmo de antes, apenas movido de Produtos para `/settings/pricing`.

**Why this priority**: é o conteúdo central de precificação; migrar é pré-requisito para a seção de
Configurações fazer sentido.

**Independent Test**: Em `/settings/pricing`, alterar R$/kWh, horas/semana, mão de obra e um material;
conferir que salvam e que o custo das variantes acompanha.

**Acceptance Scenarios**:

1. **Given** `/settings/pricing`, **When** o dono edita os parâmetros globais e salva, **Then** os
   valores persistem e o custo das variantes que usam energia/mão de obra recalcula.
2. **Given** `/settings/pricing`, **When** o dono adiciona/edita/remove um material de filamento,
   **Then** o catálogo reflete o novo preço/kg e o custo das variantes que o usam acompanha.

---

### User Story 3 - Gerenciar impressoras em Configurações (Priority: P1)

O dono cadastra, edita e remove suas **impressoras** (aquisição, vida útil, consumo W, manutenção
R$/h) em **Impressoras**, sob Configurações (`/settings/printers`). O custo/hora global continua
derivado da impressora mais cara. Esse painel é separado do restante da precificação.

**Why this priority**: separação pedida pelo dono — impressoras viram um bloco próprio de
Configurações, desacoplado dos parâmetros globais e materiais.

**Independent Test**: Em `/settings/printers`, cadastrar 2 impressoras, editar uma e remover outra;
conferir que o custo/hora global usa a impressora mais cara e que o custo das variantes acompanha.

**Acceptance Scenarios**:

1. **Given** `/settings/printers`, **When** o dono cadastra/edita/remove impressoras, **Then** a lista
   atualiza e o custo/hora global usa a impressora ativa mais cara.
2. **Given** uma impressora alterada, **When** o dono abre o catálogo, **Then** o custo das variantes
   que usam energia+máquina acompanha a mudança.

---

### User Story 4 - Configurar taxas por canal em Configurações (Priority: P2)

O dono configura a **taxa padrão** (% e taxa fixa) por canal (Shopee/TikTok/Presencial) em **Taxas
por canal**, sob Configurações (`/settings/sales-channels`). O **resumo por canal** e a **lista
operacional de vendas** (com edição de taxa e estorno) continuam em Vendas — apenas a configuração
da taxa padrão migra.

**Why this priority**: consolida a configuração em Configurações sem quebrar o fluxo operacional de
Vendas. É P2 porque depende de a seção existir.

**Independent Test**: Em `/settings/sales-channels`, alterar a taxa % e fixa de um canal; conferir que
salva, que o resumo em Vendas reflete e que a próxima venda importada usa a nova taxa.

**Acceptance Scenarios**:

1. **Given** `/settings/sales-channels`, **When** o dono altera a % e a taxa fixa de um canal, **Then**
   os valores persistem e o resumo por canal em Vendas atualiza.
2. **Given** o dono está em Vendas, **When** ele vê o resumo e a lista, **Then** não há edição de taxa
   padrão ali (a configuração está em Configurações), apenas o resumo e a lista operacional.

---

### User Story 5 - Configurar teto MEI em Configurações (Priority: P2)

O dono configura o **teto anual MEI** em **Teto MEI**, sob Configurações (`/settings/mei`). No
Dashboard, o teto passa a ser exibido apenas como leitura (barra + % + "X de Y"), sem o input de
edição, que agora mora em Configurações.

**Why this priority**: consolida o parâmetro de MEI em Configurações; o dashboard mantém só o
progresso. É P2 porque a edição ainda funciona em outro lugar hoje.

**Independent Test**: Em `/settings/mei`, alterar o teto; conferir que o Dashboard mostra a % atualizada
sem input de edição.

**Acceptance Scenarios**:

1. **Given** `/settings/mei`, **When** o dono altera o teto e salva, **Then** o valor persiste e o
   Dashboard reflete a nova % na barra de progresso.
2. **Given** o Dashboard, **When** o dono vê o bloco do teto, **Then** há apenas a barra + % + "X de Y"
   (leitura), sem botão de edição — a edição está em Configurações.

---

### Edge Cases

- **Janela estreita**: sidebar vira drawer via hambúrguer; o conteúdo continua acessível.
- **Item ativo**: o subitem de Configurações correspondente à rota atual fica destacado; o accordion
  abre automaticamente quando a rota é `/settings/*`.
- **ProductsPanel continua usando materiais**: remover o `PricingSettingsPanel` de Produtos não remove
  o uso de materiais pelo painel operacional de catálogo.
- **Resumo por canal em Vendas**: após a migração, Vendas mantém resumo + lista; a taxa padrão só em
  Configurações. Não duplicar `FeesState` inteiro em Configurações.
- **Teto no dashboard**: continua aparecendo (leitura), só a edição migra.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE substituir a barra de navegação superior por um **menu lateral** com os
  itens Dashboard, Vendas, Produtos, Caixa e Configurações (expansível).
- **FR-002**: O item **Configurações** DEVE expandir/recolher (accordion) revelando os subitens
  Precificação (`/settings/pricing`), Impressoras (`/settings/printers`), Taxas por canal
  (`/settings/sales-channels`) e Teto MEI (`/settings/mei`).
- **FR-003**: O item da rota atual DEVE ser destacado no menu lateral; ao navegar para `/settings/*`,
  o accordion Configurações DEVE abrir automaticamente.
- **FR-004**: Em telas pequenas, o menu lateral DEVE virar um overlay/drawer acionado por um botão
  (hambúrguer), fechando ao clicar fora ou selecionar um item.
- **FR-005**: A rota `/settings/pricing` DEVE conter a configuração de parâmetros globais (energia,
  horas/semana, mão de obra) e dos materiais de filamento, com o mesmo comportamento do painel atual.
- **FR-006**: A rota `/settings/printers` DEVE conter o CRUD de impressoras, separado dos demais
  parâmetros; o custo/hora global DEVE continuar derivado da impressora mais cara.
- **FR-007**: A rota `/settings/sales-channels` DEVE conter a configuração da taxa padrão (% e taxa
  fixa) por canal; o resumo por canal e a lista operacional de vendas DEVE permanecer em Vendas.
- **FR-008**: A rota `/settings/mei` DEVE conter a edição do teto anual MEI; o Dashboard DEVE exibir
  o teto apenas como leitura (barra + % + "X de Y"), sem input de edição.
- **FR-009**: A configuração de parâmetros globais, impressoras, materiais e taxas DEVE persistir via
  as mesmas server actions existentes, apenas com `revalidatePath` apontando para as novas rotas
  `/settings/*` (mantendo `/products` e `/sales` onde o painel operacional os usa).

### Key Entities *(include if feature involves data)*

- **Configurações**: agrupamento navegacional de parâmetros globais, impressoras, taxas por canal e
  teto MEI. Sem novos registros de banco — reaproveita as entidades e `settings` existentes
  (`kwh_rate_cents`, `hours_per_week`, `labor_cost_per_hour_cents`, `channel_fee_*`, `mei_limit_cents`,
  tabelas `materials`, `printers`).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O dono navega para qualquer uma das 4 rotas de Configurações em ≤ 2 cliques a partir de
  qualquer página.
- **SC-002**: A edição de precificação, impressoras, taxas por canal e teto MEI funciona em
  Configurações exatamente como funcionava antes, sem perda de funcionalidade.
- **SC-003**: O resumo por canal e a lista operacional de vendas em Vendas permanecem intactos após a
  migração da taxa padrão.
- **SC-004**: Nenhum dado muda (schema, domínio, valores) — apenas a organização de UI/rotas; verificado
  por `biome check`, typecheck e testes existentes.

## Assumptions

- Esta feature **não altera schema nem lógica de domínio** — é reorganização de UI e rotas. Nenhuma
  migração Drizzle.
- O `PricingSettingsPanel` atual em Produtos é **substituído** pelos novos painéis; o painel de
  impressoras ganha rota própria.
- `products/page.tsx` continua chamando `listMaterials` (o `ProductsPanel` usa materiais), mas para de
  renderizar o `PricingSettingsPanel`.
- `taxes-panel.tsx` em Vendas perde o bloco de configuração da taxa padrão, mantendo resumo + lista.
- `teto-form.tsx` é **movido** (não duplicado) para `/settings/mei`.
- As server actions `setGlobalParams`, `create/update/deleteMaterial`, `create/update/deletePrinter`,
  `setChannelFeeFrom` e `setMeiLimitFrom` são reutilizadas, com ajustes de `revalidatePath`.
- O custo/hora global (impressora mais cara) e a fórmula de preço sugerido não mudam.
- Toda a navegação de Configurações vem do menu lateral; não há sub-menu interno nas páginas.