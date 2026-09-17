# Contrato — Correções no Motor de Custo (004)

**Feature**: `004-cost-pricing-corrections`

Este contrato documenta o **delta** corrigido na feature 004. O contrato canônico (fonte de verdade,
com a fórmula completa) é `specs/002-product-variants-pricing/contracts/pricing-engine.md`, já
atualizado nesta feature.

## Correções

### 1. Mão de obra = só tempo manual
```
laborCents = round(manualTimeMin / 60 × laborCostPerHourCents)
```
O tempo de impressão é trabalho da máquina (energia/máquina), não entra na mão de obra.

### 2. Energia e Máquina separadas
```
energyPerHour  = round((powerWatts / 1000) × kwhRateCents)      // por impressora
machinePerHour = round(acquisitionCents / (lifeYears × hoursPerYear)) + maintenanceCentsPerHour

globalEnergyPerHour  = maior energyPerHour entre impressoras ativas
globalMachinePerHour = maior machinePerHour entre impressoras ativas

energyCents  = round(printTimeMin / 60 × globalEnergyPerHour)
machineCents = round(printTimeMin / 60 × globalMachinePerHour)
```

### 3. Total (inalterado em agregação)
```
costCents = filamentCents + energyCents + machineCents + laborCents + packagingCents + accessoriesCents
```

### 4. Shape do detalhamento (novo)
`{ filament, energy, machine, labor, packaging, accessories, total }`

## Tipo/domínio afetados
- `src/lib/domain/printer.ts` — expor `energyPerHour` e `machinePerHour` separados (e os globais).
- `src/lib/domain/cost.ts` — `laborCostCents(manualTimeMin)`; `computeVariantCost` retorna o novo shape.
- `src/lib/catalog/service.ts` — `recomputeVariantCost` / `getVariantCostBreakdown` usam o novo shape.
- `src/app/(dashboard)/products/products-panel.tsx` — UI com linhas Energia e Máquina.

## Verificação
Coberto por unit tests (constitution §III) em `tests/cost.test.ts` e `tests/pricing.test.ts`.