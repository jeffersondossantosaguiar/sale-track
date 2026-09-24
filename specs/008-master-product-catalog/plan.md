# Implementation Plan: Catálogo mestre de produtos e variantes

**Branch**: `008-master-product-catalog` | **Date**: 2026-09-19 | **Spec**: [spec.md](./spec.md)

**Status**: Approved — 2026-09-19

**Input**: Feature specification from `/specs/008-master-product-catalog/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command; its definition describes the execution workflow.

## Summary

Redesenhar o cadastro de produtos para que o Sale Track seja a fonte de verdade de produtos, variantes e SKUs. O modelo existente será ampliado com atributos internos explícitos no produto e sobrescritas opcionais na variante, sem criar um mecanismo genérico de atributos. O custo, os preços e os códigos por canal continuam na variante.

A persistência estruturada continuará em SQLite via Drizzle. Imagens principais serão armazenadas em `data/catalog-media/`, fora do Git, e o banco guardará somente uma chave opaca e metadados. O acesso passará por um limite `CatalogMediaStore`, inicialmente local, para permitir uma evolução posterior para armazenamento compatível com S3 sem alterar o domínio do catálogo. A experiência de produtos será reorganizada como uma área operacional de lista, filtros e editor mestre-detalhe. A mudança parte de uma base operacional limpa e usa migração versionada para criar a estrutura final.

## Technical Context

**Language/Version**: TypeScript 5.7.3, Node.js 22+

**Primary Dependencies**: Next.js 16.3.5 App Router, React 19.3, Drizzle ORM 0.38, better-sqlite3 12.11, Zod 3.24, Tailwind CSS 4, Lucide React

**Storage**: SQLite local para dados estruturados; arquivos de imagem em `data/catalog-media/`, referenciados por chave opaca no banco

**Testing**: Vitest 3 para domínio, serviços e integração com SQLite em memória; TypeScript, Biome e build Next.js como validações estáticas

**Target Platform**: aplicação web local executada em Node.js e acessada por navegador desktop responsivo

**Project Type**: aplicação web fullstack local e single-user

**Performance Goals**: listar, pesquisar e filtrar até 1.000 produtos e 5.000 variantes em até 200 ms no ambiente local de referência; carregar imagens sob demanda; concluir o cadastro mestre inicial em até 3 minutos

**Constraints**: operação offline; sem autenticação ou armazenamento externo nesta fatia; valores monetários em centavos inteiros; imagem opcional JPEG, PNG ou WebP de até 5 MiB; caminhos gerados pelo sistema e confinados a `data/catalog-media/`; migração versionada obrigatória; dados financeiros históricos nunca recalculados silenciosamente

**Scale/Scope**: um usuário, uma instalação local, uma tela principal de catálogo, quatro entidades persistentes já existentes ampliadas, um endpoint de leitura de imagem e ações de catálogo existentes evoluídas

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **I. Integridade dos Dados Financeiros**: PASS. Custos continuam calculados na variante e valores congelados em vendas não são recalculados. O reset é uma operação única e explicitamente autorizada antes da entrada de dados reais.
- **II. Simplicidade Local e Single-User**: PASS. O desenho mantém uma aplicação local, sem autenticação, nuvem, fila ou serviço de mídia externo. Imagens ficam em uma pasta local já coberta por `data/` no `.gitignore`.
- **III. Modelo de Dinheiro Verificável**: PASS. Campos monetários existentes permanecem em centavos inteiros; a feature não funde faturamento e caixa.
- **IV. Testes Obrigatórios no Pipeline de Importação**: PASS. Alterações na normalização dos códigos e no vínculo de itens serão conduzidas por testes red-green, cobrindo Shopee, TikTok, fallback geral e custo congelado.
- **V. Stack Tipada e Manutenível**: PASS. A stack existente será preservada; toda mudança de schema será feita por migração Drizzle versionada e validada no SQLite real e em memória.
- **Backup e portabilidade**: PASS COM PROCEDIMENTO. Banco e `data/catalog-media/` formam juntos o conjunto de dados do catálogo; backup e restauração devem copiar ambos. A chave opaca não incorpora caminho absoluto, mantendo portabilidade e preparando futura troca por S3.
- **Gate pré-pesquisa**: APROVADO. Não há violação constitucional nem `NEEDS CLARIFICATION` pendente.

## Project Structure

### Documentation (this feature)

```text
specs/008-master-product-catalog/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/
│   ├── catalog-actions.md
│   ├── catalog-images.md
│   └── catalog-ui.md
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)
```text
src/
├── app/
│   ├── (dashboard)/products/
│   │   ├── page.tsx
│   │   ├── products-panel.tsx
│   │   └── unlinked-panel.tsx
│   ├── actions/catalog.ts
│   └── api/catalog-images/[ownerType]/[ownerId]/route.ts
└── lib/
    ├── catalog/service.ts
    ├── catalog/media-store.ts
    ├── db/
    │   ├── migrations/
    │   ├── schema.ts
    │   └── seed.ts
    ├── domain/catalog.ts
    └── xml/
        ├── importer.ts
        └── link.ts

tests/
├── catalog.test.ts
├── codes.test.ts
├── catalog-images.test.ts
├── integration-import.test.ts
├── unlinked.test.ts
└── helpers/db.ts

docs/
└── domain.md
```

**Structure Decision**: Manter o projeto Next.js único e os limites atuais: validação pura em `src/lib/domain`, persistência e regras transacionais em `src/lib/catalog`, armazenamento de mídia encapsulado em `src/lib/catalog/media-store.ts`, Server Actions e rota de imagem em `src/app`, e experiência na rota `/products`. Os testes continuam no diretório único `tests/` com SQLite em memória migrado e pasta temporária de mídia.

## Design Strategy

### 1. Modelo e migração

- Ampliar `products` com os atributos compartilhados, chave opaca e metadados da imagem principal.
- Ampliar `variants` com sobrescritas nullable, chave opaca e metadados da imagem própria.
- Normalizar SKU para maiúsculas antes da persistência e manter índice único simples sobre o valor já normalizado.
- Ampliar `product_codes` com chave normalizada e canal canônico não nulo (`geral`, `shopee`, `tiktok`), garantindo unicidade no banco por canal e chave.
- Como a base contém apenas validação, aplicar a migração final e executar um reset controlado do arquivo local antes do aceite; depois, rodar seed apenas para configurações e referências essenciais.

### 2. Domínio e serviços

- Evoluir schemas Zod para converter strings opcionais vazias em `null`, normalizar espaços e validar limites.
- Expor valores efetivos de variante por `override ?? product`, sem copiar os campos do produto para cada variante.
- Criar produto e primeira variante na mesma transação, incluindo preços iniciais por canal.
- Preservar as funções de custo e preço; nenhuma edição de atributos dispara recálculo financeiro.
- Validar imagem por tamanho, MIME e assinatura; gravar primeiro em arquivo temporário, promover por rename atômico e só então atualizar a referência no banco.
- Se a atualização do banco falhar, remover o novo arquivo; depois do commit, remover a mídia anterior sem deixar o cadastro apontar para arquivo apagado.
- Encapsular `save`, `open` e `delete` no `CatalogMediaStore`; a implementação local gera as chaves e nunca aceita caminho fornecido pelo usuário.
- Ajustar o casamento de importação para usar a chave normalizada persistida sem alterar `frozenCostCents`.

### 3. Interface e contratos

- Transformar `/products` em uma área operacional com barra de pesquisa, filtros compactos, tabela ou lista estável de produtos e editor mestre-detalhe.
- O fluxo de criação coleta produto e primeira variante antes de confirmar, evitando SKU temporário invisível.
- Separar visualmente seções de identidade interna, variações, produção e custos, preços e códigos por canal.
- Exibir em cada campo sobrescrevível a origem efetiva e oferecer ação explícita para voltar a herdar o produto.
- Servir imagens por endpoint somente leitura; listagens recebem apenas uma URL derivável e metadados, nunca os bytes.

### 4. Testes e validação

- Escrever primeiro testes de domínio para normalização, herança, remoção de sobrescrita e validação da imagem.
- Escrever testes de serviço para transação produto + primeira variante, unicidade de SKU, filtros efetivos, imagens e códigos por canal.
- Reexecutar os testes de custo, preço, importação, fila de não vinculados e TikTok para impedir regressões.
- Validar manualmente os cenários do `quickstart.md` em desktop e viewport móvel antes de considerar a feature concluída.
- Atualizar `docs/domain.md` somente após a implementação representar o novo estado real.

## Post-Design Constitution Check

- **Integridade financeira**: PASS. O desenho não altera vendas, custos congelados ou ledgers durante operações normais; testes de regressão cobrem o vínculo de importação.
- **Simplicidade local**: PASS. Nenhum serviço, pacote ou processo adicional foi introduzido; o armazenamento é uma pasta sob `data/` acessada por um módulo pequeno.
- **Dinheiro verificável**: PASS. Campos monetários e fórmulas existentes permanecem intactos.
- **Testes do pipeline**: PASS. O plano exige red-green antes de alterar normalização e casamento de códigos.
- **Stack e migrações**: PASS. O desenho usa somente a stack constitucional e uma migração versionada.
- **Portabilidade**: PASS COM PROCEDIMENTO. Chaves são relativas e opacas; copiar o SQLite e `data/catalog-media/` preserva o catálogo. Uma futura implementação S3 poderá substituir o store sem mudar produtos e variantes.
- **Gate pós-design**: APROVADO. Não há violação que exija justificativa de complexidade.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

Nenhuma violação constitucional identificada.
