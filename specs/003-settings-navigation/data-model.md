# Data Model: Seção Configurações com Navegação Lateral

**Feature**: `003-settings-navigation` | **Date**: 2026-09-17

## Overview

Esta feature **não altera o schema do banco**. Reorganiza a apresentação e a navegação de
configurações existentes. As entidades abaixo já existem e são **reutilizadas** pelas novas rotas.

## Reused Entities (no change)

### Settings (tabela `settings`)

| Chave | Tipo | Usada em |
| --- | --- | --- |
| `kwh_rate_cents` | number | `/settings/pricing` (parâmetros globais) |
| `hours_per_week` | number | `/settings/pricing` (parâmetros globais) |
| `labor_cost_per_hour_cents` | number | `/settings/pricing` (parâmetros globais) |
| `channel_fee_bps_<canal>` | number | `/settings/sales-channels` |
| `channel_fee_fixed_cents_<canal>` | number | `/settings/sales-channels` |
| `mei_limit_cents` | number | `/settings/mei` (edição) / Dashboard (leitura) |

### Entidades de catálogo

| Entidade | Tabela | Usada em |
| --- | --- | --- |
| `materials` | `materials` | `/settings/pricing` (materiais de filamento) |
| `printers` | `printers` | `/settings/printers` (CRUD) |

### Canais

`shopee`, `tiktok`, `presencial` (constantes `FEE_CHANNELS`). A config de taxa padrão cobre os 3;
o resumo/lista operacional permanece em Vendas.

## Derived / Read-Only (no schema change)

- **Custo/hora global** = impressora ativa mais cara (`src/lib/domain/printer.ts`) — intacto.
- **Progresso do teto MEI** no Dashboard = `stats.meiLimitCents` (leitura) — intacto.

## Navigation Model (new, UI-only)

Rotas do grupo `/settings` (sem registros de banco):

```text
/settings                 → redirect → /settings/pricing
/settings/pricing         → GlobalParamsPanel + MaterialsPanel
/settings/printers        → PrintersPanel
/settings/sales-channels  → ChannelFeesPanel (config taxa padrão)
/settings/mei             → TetoForm (movido)
```

## No Schema Migration

Nenhuma migração Drizzle nesta feature (constitution §V respeitada — mudanças de schema apenas via
migração; aqui não há mudança).