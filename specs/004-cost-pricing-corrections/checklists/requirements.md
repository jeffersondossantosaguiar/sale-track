# Checklist — Feature 004: Correções no Motor de Custo e Precificação

## Qualidade da Spec

- [ ] User stories com prioridade, "Why", "Independent Test" e acceptance scenarios.
- [ ] Edge cases cobertos (custo zero, denominador ≤ 0, migração idempotente, praticado congelado).
- [ ] Functional requirements (FR) rastreáveis e sem ambiguidade.
- [ ] Success criteria mensuráveis (SC).
- [ ] Assumptions explícitas (dados da variante corretos; planilha com tarifa antiga; material R$ 90;
      preço mínimo fora de escopo).

## Requisitos Funcionais

- [ ] FR-001 Mão de obra usa só `manualTimeMin`.
- [ ] FR-002 Energia e Máquina em linhas separadas (energia do kWh real).
- [ ] FR-003 Total = soma das linhas (agregação inalterada).
- [ ] FR-004 Painel de parâmetros carrega valores salvos (não zera no refresh).
- [ ] FR-005 `setGlobalParams` chama `recalcAllCosts`.
- [ ] FR-006 `setChannelFeeFrom` grava `% × 100` (bps).
- [ ] FR-007 Migração corrige 20→2000 / 16→1600 (idempotente).
- [ ] FR-008 `kwh=88`, `labor=1289`; variantes existentes recalculadas.
- [ ] FR-009 `practicedPriceCents` nunca muda por recálculo.

## Técnico

- [ ] Contrato `pricing-engine.md` (002) atualizado.
- [ ] Testes do motor de custo/preço/taxas (red-green) — constitution §III.
- [ ] Migração de dados em `settings` (sem schema novo) registrada no journal.
- [ ] `recalcAllCosts` roda sobre o banco real (refresh de custos/sugeridos).
- [ ] `pnpm test`, `pnpm typecheck`, `pnpm lint:check` verdes.
- [ ] `docs/domain.md` atualizado.