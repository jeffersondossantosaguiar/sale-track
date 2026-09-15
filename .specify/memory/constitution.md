<!--
## Sync Impact Report (temporary — remove before committing)
Version: - → 1.0.0 (initial adoption)
Modified principles: none (new document)
Added sections: Core Principles (5), Additional Constraints, Development Workflow, Governance
Removed sections: none
Deferred TODO placeholders: none
-->
# Sale Track Constitution

## Core Principles

### I. Integridade dos Dados Financeiros (NON-NEGOTIABLE)
Números que afetam faturamento, caixa ou margem nunca são alterados silenciosamente.
O valor da NFe é imutável, o custo é congelado na venda, e qualquer retificação passa por
uma ação explícita (estorno com data, nunca recálculo silencioso).
Racional: controle de MEI e confiabilidade contábil — um bug que corrompe histórico
silenciosamente é o pior tipo de falha deste sistema.

### II. Simplicidade Local e Single-User
App local, sem login, SQLite como fonte de verdade; qualquer funcionalidade nova deve
justificar o custo de complexidade que adiciona (YAGNI). O app deve operar com um comando.
Racional: usuário único (MEI); complexidade antecipada (auth, nuvem, filas) é dívida, não
ativo. Integrações futuras são adiadas até serem realmente necessárias.

### III. Modelo de Dinheiro Verificável
Faturamento (NFe + presencial) e Caixa (dinheiro recebido/gasto) são ledger separados e
nunca fundidos. Taxas de marketplace e estornos são registros explícitos e rastreáveis;
todo número do dashboard deve traçar de volta a um registro no banco.
Racional: faturamento ≠ dinheiro recebido (taxas retidas, atrasos de repasse); confundir
os dois gera lucro aparente incorreto.

### IV. Testes Obrigatórios no Pipeline de Importação (NON-NEGOTIABLE)
Parsing de XML NFe 55, detecção de canal pelo nome do arquivo, deduplicação por número de
nota e casamento de `cProd` exigem testes antes de serem confiáveis; red-green-refactor.
Racional: este é o ponto onde um erro silencioso corrompe o faturamento sem alerta.

### V. Stack Tipada e Manutenível
Next.js fullstack (App Router + Server Actions) + SQLite via Drizzle (better-sqlite3) +
Tailwind + ShadCN + Biome (lint/format) + Node LTS. Migrações de schema são versionadas;
nunca há alteração de schema fora de migração.
Racional: o mantenedor é técnico e evoluirá o app (ex.: integrações) — tipos e migrações
previnem bugs de dinheiro silenciosos.

## Additional Constraints

- **Stack fixa**: Next.js fullstack, SQLite (Drizzle + better-sqlite3), Tailwind + ShadCN,
  Biome, Node LTS. Mudanças de stack exigem emenda constitucional.
- **Dinheiro em centavos inteiros**: valores monetários nunca usam ponto flutuante e nunca
  são arredondados silenciosamente; moeda BRL.
- **NFe**: apenas modelo 55 (mercadoria); XML bruto é armazenado com a venda; a mesma nota
  nunca importa duas vezes (dedup por número).
- **Teto MEI**: configurável, default R$ 81.000,00/ano (vigente em 2026; propostas de
  aumento monitoradas — não implementar como constante fixa).
- **Canal**: detectado pelo padrão do nome do arquivo, sempre editável no lote antes do
  import; padrão desconhecido pede confirmação manual.
- **Backup**: cópia do arquivo SQLite + botão de exportar; dados locais não trafegam para
  terceiros.

## Development Workflow

- Seguir SDD do spec-kit por funcionalidade: `/speckit.specify` → `/speckit.plan` →
  `/speckit.tasks` → `/speckit.implement` → `/speckit.converge`.
- **Qualidade**: pipeline de importação com testes obrigatórios; lógica de dinheiro com
  testes unitários; dashboard validado por testes de integração com XMLs de fixture.
- **Migrações** via Drizzle; rodar `biome check` (lint + format) e typecheck antes de
  qualquer commit.
- **Commits** em estilo convencional (ex.: `docs:`, `feat:`, `fix:`).
- Proibido mutar dados financeiros históricos de forma silenciosa; estorno é ação explícita.

## Governance

- Esta Constitution prevalece sobre decisões ad hoc; emendas exigem documentação desta emenda
  (via `/speckit.constitution`), versão incrementada e atualização do `docs/domain.md` quando
  o domínio mudar.
- Situações não cobertas: registrar decisão, revisar na próxima convergência e propor emenda
  se recorrente.
- Revisão de conformidade a cada `/speckit.converge`: números rastreáveis, NFe imutável,
  fluxo de estorno explícito.
- Versionamento semântico: MAJOR para mudanças incompatíveis/remoção de princípio; MINOR para
  novo princípio ou orientação expandida; PATCH para clarificação/revisão de texto.

**Version**: 1.0.0 | **Ratified**: 2026-09-15 | **Last Amended**: 2026-09-15