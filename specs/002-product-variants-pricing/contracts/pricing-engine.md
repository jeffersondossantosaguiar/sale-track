# Contrato do Motor de Custo e Precificação (sale-track)

Parte dos contratos das features `002-product-variants-pricing` e
`004-cost-pricing-corrections`. Define o **cálculo** que o motor de custo/preço entrega — o contrato
entre o domínio de custo e o resto da aplicação. É o coração da precificação e deve ser coberto por
testes unitários (constitution §III).

> ⚠️ **Atualizado na feature 004**: a mão de obra passou a usar **só tempo manual** e o detalhamento
> separou **Energia** de **Máquina**. Aplicável a partir da 004.

> Dinheiro em **centavos inteiros**; percentuais como `Bps` inteiros (0..10000 = 0%..100%).

## Entrada

### Parâmetros globais (settings)
- `kwhRateCents` — R$/kWh (ex.: 90 = R$ 0,90).
- `hoursPerWeek` — horas de uso/semana (ex.: 72).
- `laborCostPerHourCents` — custo/hora de mão de obra.
- `feeFixedCents[channel]` — taxa fixa por canal (centavos).
- `feeRateBps[channel]` — taxa percentual por canal (base-points).

### Impressoras (referência)
- Por impressora: `acquisitionCents`, `usefulLifeYears`, `powerWatts`,
  `maintenanceCentsPerHour`.
- Deriva-se `machineCostPerHourCents` **da impressora mais cara** (maior custo/hora).

### Por variante
- `printTimeMin`, `manualTimeMin`, `filamentGrams`, `material.pricePerKgCents`,
  `packagingCents`, `accessories[]` (custos somados).
- Por canal: `marginBps[channel]`.

## Cálculo

### 1. Custo por hora da impressora (derivação global)

```
hoursPerYear   = hoursPerWeek × 52
deprPerHour    = round(acquisitionCents / (usefulLifeYears × hoursPerYear))
energyPerHour  = round((powerWatts / 1000) × kwhRateCents)
maintenancePerHour = maintenanceCentsPerHour
machinePerHour = deprPerHour + maintenancePerHour          // depreciação + manutenção (Máquina)
globalEnergyPerHour  = maior energyPerHour entre impressoras ativas
globalMachinePerHour = maior machinePerHour entre impressoras ativas
```

> **004**: energia e máquina são derivadas **separadamente** (cada uma usa o maior valor entre as
> impressoras ativas), e não mais combinadas num único `R$/hora global`.

### 2. Custo da variante (`costCents`)
```
filamentCents        = round(filamentGrams / 1000 × pricePerKgCents)
energyCents          = round(printTimeMin / 60 × globalEnergyPerHour)
machineCents         = round(printTimeMin / 60 × globalMachinePerHour)
laborCents           = round(manualTimeMin / 60 × laborCostPerHourCents)   // SÓ tempo manual (004)
packagingCents       = packagingCents
accessoriesCents     = sum(accessory.costCents)

costCents = filamentCents + energyCents + machineCents + laborCents + packagingCents + accessoriesCents
```
> Detalhamento por linha: **Filamento, Energia, Máquina, Mão de obra** (destacada), **Embalagem,
> Acessórios**. `laborCents` usa apenas o tempo manual — o tempo de impressão é trabalho da máquina
> (004).

### 3. Preço sugerido por canal (`suggestedPriceCents`)
```
denominator = 1 − feeRateBps[channel]/10000 − marginBps[channel]/10000
suggestedPriceCents = round((costCents + feeFixedCents[channel]) / denominator)
```
- `denominator > 0` (erro se margem + taxa % ≥ 100%).

### 4. Preço praticado (`practicedPriceCents`)
- Default = sugerido na criação; depois **congelado** — não muda quando custo/margem/taxa mudam.
- Recalculável apenas por ação manual do dono ("re-sugerir" não sobrescreve o praticado).

### 5. Lucro esperado
```
profitCents       = practicedPriceCents − costCents
profitBps         = round(profitCents / practicedPriceCents × 10000)   // 0 se praticado ≤ 0
```

## Regras de negócio (borda)
1. `costCents` é **cache**: recomputa quando material, parâmetros globais ou tempos mudam; nunca é
   digitado à mão. Alterar parâmetro global ou impressora dispara `recalcAllCosts`.
2. `practicedPriceCents` é intocável pelo motor (imutabilidade do preço decidido).
3. Filamento usa peso = filamento gasto (um único campo).
4. Kit = variante normal; custo montado manualmente (sem BOM nesta versão).
5. Todo valor é inteiro em centavos; arredondamentos feitos explicitamente, nunca silenciosos.
6. **Taxa % do canal** é salva como **basis points** (`% × 100`); `channel_fee_bps_*` é sempre bps.

## Validação (exemplo do dono)
- Custo R$ 10, taxa fixa R$ 2, taxa % 10%, margem 40% → `(10 + 2) / (1 − 0,10 − 0,40)` = R$ 24.