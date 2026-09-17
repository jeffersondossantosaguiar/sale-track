# Feature Specification: Correções no Motor de Custo e Precificação

**Feature Branch**: `004-cost-pricing-corrections`

**Created**: 2026-09-17

**Status**: Draft

**Input**: User description: "Corrigir o motor de custo e a precificação para bater com o uso diário: a mão de obra não deve contar o tempo de impressão (quem trabalha é a máquina); separar energia e máquina no detalhamento; a taxa de energia usa a tarifa real (R$ 0,88/kWh CPFL bandeira verde); a taxa de canal % está sendo salva como se fosse bps; e os parâmetros globais não recarregam os valores salvos nem propagam o recálculo."

## Contexto

Investigação na feature 002 revelou quatro problemas reais (confirmados no banco `data/sale-track.db`):

1. **Mão de obra superestimada**: `laborCostCents` soma `printTimeMin + manualTimeMin`, mas a impressão é trabalho da **máquina** (já precificada em energia+máquina). Pela regra do dono, mão de obra = **apenas tempo manual**.
2. **Energia e máquina num campo só**: o detalhamento mostra "Energia + máquina" numa linha; o dono quer as linhas **Energia** e **Máquina** separadas (como na planilha), com energia derivada do kWh real.
3. **Taxa de canal % gravada como bps**: `setChannelFeeFrom` guarda o percentual digitado (ex.: "20") direto como bps (0,2%) em vez de `2000` (20%), subestimando o preço sugerido.
4. **Parâmetros globais não recarregam nem propagam**: o painel não lê os valores salvos (zera no refresh) e `setGlobalParams` não chama `recalcAllCosts`.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Corrigir o cálculo de custo da variante (Priority: P1)

O sistema calcula o custo da variante com **mão de obra = só tempo manual** (impressão é trabalho da
máquina) e exibe o detalhamento com linhas **Energia** e **Máquina** separadas. A **Energia** deriva
da tarifa real de kWh (`kwh_rate_cents` × W/1000 × tempo de impressão) e a **Máquina** da depreciação
+ manutenção da impressora mais cara × tempo de impressão.

**Why this priority**: é o coração do custo — sem a correção, custo e lucro ficam errados e a
precificação herda o erro.

**Independent Test**: Cadastrar uma variante com tempo de impressão 60min e manual 30min; conferir
que a mão de obra usa apenas os 30min, que energia e máquina aparecem em linhas separadas, e que o
custo total = filamento + energia + máquina + mão de obra + embalagem + acessórios.

**Acceptance Scenarios**:

1. **Given** uma variante com tempo de impressão e manual, **When** o sistema calcula, **Then** a mão
   de obra = `round(manualTimeMin / 60 × laborCostPerHourCents)` (impressão NÃO entra).
2. **Given** uma impressora e a tarifa de energia, **When** o sistema detalha o custo, **Then** mostra
   **Energia** = `round(printTimeMin/60 × W/1000 × kwhRateCents)` e **Máquina** =
   `round(printTimeMin/60 × (depreciação/h + manutenção/h))` como linhas separadas.
3. **Given** filamento, embalagem e acessórios, **When** o sistema soma o custo, **Then** o total
   permanece `filamento + energia + máquina + mão de obra + embalagem + acessórios` (sem alterar a
   soma agregada).
4. **Given** o custo corrigido, **When** o preço sugerido recalcula, **Then** usa o novo `costCents`
   e o praticado permanece congelado.

---

### User Story 2 - Parâmetros globais recarregam e propagam (Priority: P1)

O painel de **Parâmetros globais** (R$/kWh, horas/semana, mão de obra R$/h) **carrega os valores
salvos** ao abrir/atualizar (não zera mais no refresh) e, ao salvar, **recalcula o custo de todas as
variantes** que dependem de energia/máquina/mão de obra.

**Why this priority**: sem isso, o usuário não vê o que está configurado nem o efeito da mudança nos
produtos — a causa direta do relato "não salva".

**Independent Test**: Configurar parâmetros, atualizar a página e conferir que os campos continuam
preenchidos; alterar um parâmetro e conferir que o custo das variantes acompanha.

**Acceptance Scenarios**:

1. **Given** parâmetros globais já configurados, **When** o dono abre `/settings/pricing`, **Then** os
   campos exibem os valores salvos.
2. **Given** o dono altera um parâmetro e salva, **When** o recálculo roda, **Then** `costCents` e
   `suggestedPriceCents` de todas as variantes atualizam; `practicedPriceCents` não muda.

---

### User Story 3 - Corrigir a taxa de canal (% → bps) (Priority: P1)

A configuração de **taxa % por canal** (Shopee/TikTok/Presencial) passa a gravar o percentual como
**basis points** (`valor × 100`). Os valores já gravados de forma incorreta (shopee `20` → `2000`,
tiktok `16` → `1600`) são **corrigidos** por migração.

**Why this priority**: taxa gravada 100× menor subestima o preço sugerido — impacto financeiro direto.

**Independent Test**: Configurar 20% na Shopee; conferir que o preço sugerido usa 20% (2000bps) e que
o valor persistido é 2000.

**Acceptance Scenarios**:

1. **Given** o dono digita `20` na taxa % da Shopee, **When** salva, **Then** o setting
   `channel_fee_bps_shopee` = `2000` e o preço sugerido desconta 20%.
2. **Given** o banco com `channel_fee_bps_shopee = 20` e `channel_fee_bps_tiktok = 16`, **When** a
   migração roda, **Then** os valores viram `2000` e `1600`.

---

### User Story 4 - Ajustar dados de produção (Priority: P2)

Os valores de produção são ajustados para o uso real: `kwh_rate_cents = 88` (R$ 0,88/kWh CPFL bandeira
verde) e `labor_cost_per_hour_cents = 1289` (R$ 12,89/h — mínimo federal R$ 1.621 + ~40% encargos ÷ 22
dias × 8h). As variantes existentes são recalculadas. O material mantém R$ 90/kg (PLA Preto). A coluna
"preço mínimo" da planilha fica **fora do escopo**.

**Why this priority**: realinha o app aos números que o dono usa no dia a dia, após a planilha ter
usado tarifa/bandeira antiga.

**Independent Test**: Conferir que o custo do Porta Caneta recalculado se aproxima dos valores reais
(energia+máquina reais, mão de obra só manual) e que o praticado não muda.

**Acceptance Scenarios**:

1. **Given** `kwh_rate_cents = 88` e `labor_cost_per_hour_cents = 1289`, **When** o custo recalcula,
   **Then** energia e mão de obra usam os novos valores.
2. **Given** a correção do motor, **When** as variantes existentes recalculam, **Then** `costCents` e
   `suggestedPriceCents` atualizam e `practicedPriceCents` permanece congelado.

---

### Edge Cases

- **Custo zero**: variante sem material/impressora/parâmetros → energia/máquina/mão de obra 0, sem
  erro.
- **Denominador ≤ 0**: margem + taxa % do canal ≥ 100% → erro explícito (já tratado).
- **Migração idempotente**: após aplicar `20`→`2000`/`16`→`1600`, re-executar não altera nada.
- **Valor de taxa futuro**: depois do fix, salvar sempre grava `% × 100`; a migração só corrige o que
  já estava errado.
- **Praticado congelado**: recálculos nunca sobrescrevem `practicedPriceCents` (FR-011/D6).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O custo de mão de obra DEVE usar apenas `manualTimeMin` (tempo de impressão é trabalho
  da máquina): `laborCostCents = round(manualTimeMin/60 × laborCostPerHourCents)`.
- **FR-002**: O detalhamento de custo DEVE exibir **Energia** e **Máquina** como linhas separadas:
  energia `= round(printTimeMin/60 × W/1000 × kwhRateCents)`; máquina `= round(printTimeMin/60 ×
  (depreciação/h + manutenção/h))`.
- **FR-003**: A soma total permanece `filamento + energia + máquina + mão de obra + embalagem +
  acessórios`.
- **FR-004**: O painel de Parâmetros globais DEVE carregar os valores salvos em `settings` ao abrir e
  não zerar no refresh.
- **FR-005**: `setGlobalParams` DEVE chamar `recalcAllCosts(db)` para propagar a mudança a todas as
  variantes.
- **FR-006**: `setChannelFeeFrom` DEVE gravar a taxa % como basis points (`valor × 100`).
- **FR-007**: Uma migração DEVE corrigir os settings existentes (`channel_fee_bps_shopee` 20→2000,
  `channel_fee_bps_tiktok` 16→1600) de forma idempotente.
- **FR-008**: Os dados de produção DEVM ser `kwh_rate_cents = 88` e `labor_cost_per_hour_cents = 1289`;
  variantes existentes DEVM ser recalculadas.
- **FR-009**: `practicedPriceCents` NUNCA muda por recálculo automático.

### Key Entities

- **settings** (`kwh_rate_cents`, `hours_per_week`, `labor_cost_per_hour_cents`,
  `channel_fee_bps_*`, `channel_fee_fixed_cents_*`): atualização de valores, sem mudança de schema.
- **variants.costCents**, **variant_prices.suggestedPriceCents**: recalculados; nenhum campo novo.
- Sem tabelas/colunas novas — apenas a correção da fórmula (domínio) e de dados.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Para o Porta Caneta, o custo recalculado (~R$ 16–17) fica próximo do valor real esperado
  (antes R$ 46,66 por mão de obra inflada), e o preço sugerido Shopee usa a taxa 20% corrigida.
- **SC-002**: Abrir `/settings/pricing` mostra os valores salvos (sem refresh zerar).
- **SC-003**: Salvar qualquer parâmetro global recalcula o custo de todas as variantes.
- **SC-004**: `channel_fee_bps_shopee`/`tiktok` persistem como `2000`/`1600` após salvar 20%/16% e após
  a migração.
- **SC-005**: `pnpm test`, `pnpm typecheck` e `pnpm lint:check` passam.

## Assumptions

- Os dados da variante no app (tempo de impressão, manual, peso, embalagem, acessórios) estão corretos;
  apenas a fórmula e os parâmetros globais estavam errados.
- A planilha usava tarifa/bandeira antiga — por isso a Energia dela (R$ 0,60/h) não reflete o kWh real.
- O material PLA Preto mantém R$ 90/kg (preço da planilha R$ 95/kg está desatualizado).
- A coluna "preço mínimo" da planilha fica fora do escopo desta feature.
- O preço praticado permanece congelado (FR-011) e os custos congelados em vendas passadas (D6) não
  mudam.
- O contrato `specs/002-product-variants-pricing/contracts/pricing-engine.md` é atualizado junto.