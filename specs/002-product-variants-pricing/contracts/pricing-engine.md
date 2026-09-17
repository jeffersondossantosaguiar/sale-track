# Contrato do Motor de Custo e Precificação (sale-track)

Parte dos contratos da feature `002-product-variants-pricing`. Define o **cálculo** que o motor de
custo/preço entrega — o contrato entre o domínio de custo e o resto da aplicação. É o coração da
precificação e deve ser coberto por testes unitários (constitution §III).

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

### 1. Custo por hora da impressora (`machineCostPerHourCents`)
```
hoursPerYear   = hoursPerWeek × 52
deprPerHour    = acquisitionCents / (usefulLifeYears × hoursPerYear)   // arredondar
energyPerHour  = (powerWatts / 1000) × kwhRateCents
costPerHour    = deprPerHour + energyPerHour + maintenanceCentsPerHour
```
O `R$/hora global` = **maior** `costPerHour` entre as impressoras ativas.

### 2. Custo da variante (`costCents`)
```
filamentCents        = round(filamentGrams / 1000 × pricePerKgCents)
energyMachineCents   = round(printTimeMin / 60 × globalMachineCostPerHourCents)
laborCents           = round((printTimeMin + manualTimeMin) / 60 × laborCostPerHourCents)
packagingCents       = packagingCents
accessoriesCents     = sum(accessory.costCents)

costCents = filamentCents + energyMachineCents + laborCents + packagingCents + accessoriesCents
```
> Detalhamento por linha, com `laborCents` destacada separadamente (não é escondida).

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
   digitado à mão.
2. `practicedPriceCents` é intocável pelo motor (imutabilidade do preço decidido).
3. Filamento usa peso = filamento gasto (um único campo).
4. Kit = variante normal; custo montado manualmente (sem BOM nesta versão).
5. Todo valor é inteiro em centavos; arredondamentos feitos explicitamente, nunca silenciosos.

## Validação (exemplo do dono)
- Custo R$ 10, taxa fixa R$ 2, taxa % 10%, margem 40% → `(10 + 2) / (1 − 0,10 − 0,40)` = R$ 24.