# Research — Correções no Motor de Custo e Precificação

**Feature**: `004-cost-pricing-corrections` | **Fase 0 do /speckit.plan**

As decisões desta feature foram resolvidas na entrevista de grill-me com o dono e na investigação do
banco real (`data/sale-track.db`). Este documento registra cada decisão, sua justificativa e as
alternativas descartadas.

## 1. Mão de obra = só tempo manual

- **Decisão**: `laborCostCents` usa **apenas `manualTimeMin`** — o tempo de impressão é trabalho da
  **máquina** (já precificado em energia+máquina). Fórmula: `round(manualTimeMin/60 ×
  laborCostPerHourCents)`.
- **Rationale**: o dono corrigiu explicitamente a regra — "quem trabalha é a impressora". A versão
  atual soma `printTimeMin + manualTimeMin`, superestimando a mão de obra (no Porta Caneta: R$ 33,60
  em vez de ~R$ 3,20).
- **Alternatives**: manter `printTimeMin + manualTimeMin` (descartado — errado por regra de negócio).

## 2. Taxa de mão de obra (R$/h)

- **Decisão**: **R$ 12,89/h** (`labor_cost_per_hour_cents = 1289`). Derivado de: salário mínimo federal
  2026 (R$ 1.621) + ~40% de encargos trabalhistas → R$ 2.269,40/mês ÷ 22 dias trabalhados × 8h (176h)
  = R$ 12,89/h.
- **Rationale**: bate com o valor implícito da planilha (mão de obra R$ 3,20 ÷ 0,25h = R$ 12,80/h).
- **Alternatives**: Piso Paulista R$ 14,91/h (descartado — o dono usa base no mínimo federal); manter
  R$ 6,81/h configurado (descartado — não reflete o custo real).

## 3. Energia e Máquina separadas, com energia real

- **Decisão**: detalhamento em **duas linhas**. **Energia** `= round(printTimeMin/60 × W/1000 ×
  kwhRateCents)` (tarifa real); **Máquina** `= round(printTimeMin/60 × (depreciação/h +
  manutenção/h))`.
- **Rationale**: o dono quer o detalhamento como na planilha, mas com a energia refletindo o kWh real
  (R$ 0,88/kWh CPFL bandeira verde). A planilha usava tarifa/bandeira antiga (energia R$ 0,60/h).
- **Alternatives**: espelhar a planilha (0,60/0,60) (descartado — energia não correspondia à tarifa
  real); manter "Energia + máquina" num campo (descartado — dono quer separado).
- **Consequência**: com energia real (~R$ 0,31/h) + máquina real (~R$ 0,37/h) ≈ R$ 0,68/h, o alvo de
  "R$ 1,19/h" da planilha fica **superado** (a planilha estava com valores inflados).

## 4. Taxa de canal % → bps

- **Decisão**: `setChannelFeeFrom` grava `valor × 100` (percentual → basis points). Corrigir por
  migração os valores existentes (`channel_fee_bps_shopee` 20→2000, `channel_fee_bps_tiktok` 16→1600).
- **Rationale**: o painel mostra o percentual (`bps/100`) e envia "20", mas o setting espera bps.
  Sem o `×100`, a taxa ficou 100× menor, subestimando o preço sugerido (confirmado: sugerido Shopee
  R$ 72,58 em vez de ~R$ 101 com 20%).
- **Alternatives**: corrigir apenas daqui pra frente (descartado — valores existentes continuariam
  errados; o dono aprovou a migração).

## 5. Parâmetros globais recarregam e propagam

- **Decisão**: o painel de Parâmetros globais recebe os valores salvos (via servidor) e inicializa o
  estado com eles; `setGlobalParams` chama `recalcAllCosts(db)`.
- **Rationale**: hoje o painel inicia com campos vazios (zera no refresh, parecendo "não salvar") e
  salvar não propaga a mudança ao custo dos produtos.
- **Alternatives**: nada (descartado — bug reportado).

## 6. Material e escopo

- **Decisão**: material PLA Preto mantém **R$ 90/kg** (R$ 95/kg da planilha está desatualizado). A
  coluna **"preço mínimo"** fica **fora do escopo**.
- **Rationale**: o dono confirmou manter o preço atual e não incluir a coluna nesta feature.

## 7. Dados de produção

- **Decisão**: `kwh_rate_cents = 88` (R$ 0,88/kWh) e `labor_cost_per_hour_cents = 1289` (R$ 12,89/h),
  aplicados por migração; variantes existentes recalculadas.

## Assunções não escritas (meta-pergunta)

- Os dados da variante no app estão corretos; só a fórmula e os parâmetros globais estavam errados.
- O preço praticado permanece congelado (FR-011) e os custos congelados em vendas passadas (D6) não
  mudam.
- O contrato `specs/002/contracts/pricing-engine.md` é atualizado junto.