# Implementation Plan: Controle de Vendas MEI (sale-track)

**Branch**: `001-sales-control-system` | **Date**: 2026-09-15 | **Spec**: [spec.md](./spec.md)

**Input**: Especificação funcional de `specs/001-sales-control-system/spec.md`

**Note**: Plan preenchido pelo `/speckit.plan` a partir da especificação e da constitution.

## Summary

Construir um sistema **local, single-user** para o dono de uma impressora 3D (MEI) controlar
vendas nas canais Shopee, TikTok e presencial. Entregável central: **importação em lote dos
XMLs de NFe modelo 55** — cada XML vira uma venda completa (data, itens, valor bruto, nº da
nota), deduplicada por número de nota e com canal detectado pelo nome do arquivo. Em volta
disso: catálogo de produtos com custo/códigos, registros de venda presencial manual, caixa
(entradas/saídas por categoria com vínculo às vendas), estorno, e um dashboard que mostra
faturamento mensal, % do teto MEI usado no ano, saldo/listas de caixa e vendas por canal —
com exportação mensal pronta para a DASN.

## Technical Context

**Language/Version**: TypeScript (Node.js LTS 22) no servidor; app Next.js.

**Primary Dependencies**: Next.js (App Router fullstack + Server Actions), Drizzle ORM +
better-sqlite3 + sql.js (import/parse offline no navegador via Worker), Tailwind CSS +
ShadCN/UI (Radix), Biome, Vitest + Testing Library + Playwright.

**Storage**: SQLite — arquivo local único (fonte de verdade). Cópia do armazenamento é o
backup/exportação.

**Testing**: Vitest (unit dos cálculos de dinheiro, margem, parser XML, dedup; RTL nos
componentes) + Playwright (fluxo ponta a ponta de importação/caixa). Importação e lógica de
dinheiro exigem testes antes de serem confiáveis (constitution III/IV).

**Target Platform**: Navegador local (localhost); acessível de celular na mesma rede Wi-Fi
passando o IP da máquina.

**Project Type**: Web application fullstack (Next.js), single-user, sem login.

**Performance Goals**: Dashboard carrega em < 1s; lote de importação de ~100 XMLs conclui em
< 10s no diálogo; operação fluida em máquina pessoal.

**Constraints**: local-first e offline; sem contas/credenciais de terceiros; dinheiro em
centavos inteiros; vendas passadas imutáveis (custo congelado na venda); teto MEI
configurável; um único usuário.

**Scale/Scope**: 1 usuário, ~200–400 vendas/ano, dezenas de produtos. SQLite comporta
holgadamente. Sem integração com APIs de marketplace nesta fase.

## Constitution Check

*GATE: passa — o design cumpre os cinco princípios:*
- **I (Integridade dos Dados Financeiros)** — NFe imutável, custo congelado na venda, estorno
  explícito com data (nunca exclusão silenciosa), dedup por nº de nota. ✓
- **II (Simplicidade Local / Single-User)** — local, sem login, SQLite; sem infraestrutura
  extra. ✓
- **III (Modelo de Dinheiro Verificável)** — faturamento (NF + presencial − estornos) separado
  do caixa (entradas/saídas); taxas rastreáveis por venda. ✓
- **IV (Test-First na Importação)** — pipeline de importação + cálculos cobertos por testes
  antes de serem usados. ✓
- **V (Stack Tipada)** — TypeScript/Next/Drizzle/Biome, migrações versionadas via Drizzle. ✓

Sem violações a justificar → sem Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/001-sales-control-system/
├── plan.md              # Este arquivo (/speckit.plan)
├── research.md          # Fase 0 (/speckit.plan)
├── data-model.md        # Fase 1 (/speckit.plan)
├── quickstart.md        # Fase 1 (/speckit.plan)
├── contracts/
│   └── xml-import.md    # Contrato de importação XML (/speckit.plan)
├── spec.md              # Especificação funcional (/speckit.specify)
├── checklists/
│   └── requirements.md  # Checklist de qualidade da spec
└── tasks.md             # Fase 2 (/speckit.tasks - NÃO criado por /speckit.plan)
```

### Source Code (repository root)

```text
src/
├── app/                          # Next.js App Router (rotas/UI)
│   ├── (dashboard)/
│   │   ├── page.tsx              # Visão geral do mês
│   │   ├── sales/                # Vendas (listagem/importar/estornar)
│   │   ├── products/             # Catálogo de produtos
│   │   ├── cash/                 # Caixa (entradas/saídas por categoria)
│   │   └── settings/             # Teto MEI, % taxa por canal, backups
│   ├── actions/                  # Server Actions (mutações)
│   ├── api/
│   │   └── taxas/route.ts        # Exposição futura/exportação
│   └── globals.css
├── components/                   # ShadCN + componentes de domínio
├── lib/
│   ├── db/
│   │   ├── schema.ts             # Schema Drizzle
│   │   ├── client.ts             # better-sqlite3
│   │   └── migrations/
│   ├── domain/                   # Cálculos de dinheiro (centavos)
│   │   ├── margin.ts
│   │   ├── meiteto.ts
│   │   └── cxmoney.ts
│   ├── xml/
│   │   ├── parser.ts             # Chama o Worker (xml parser)
│   │   ├── channel.ts            # Detecção de canal por nome/arquivo
│   │   ├── link.ts               # Vínculo cProd → produto
│   │   └── worker.ts             # Web Worker (offline XML parse)
│   └── utils.ts
└── public/storage/               # XMLs originais + backup SQLite (git-ignored)
```

**Structure Decision**: Next.js fullstack single-process com Server Actions para mutações e
SQLite local. O parse de XML roda num **Web Worker** no navegador (mantém o app responsivo ao
importar lotes e garante que só o resultado saneado toque o banco via Server Action). A pasta
`public/storage/` guarda a cópia dos XMLs e o backup do banco, fora do controle de versão.

## Complexity Tracking

*Nenhuma violação da Constitution Check a justificar — tabela vazia.*
