---

description: "Implementation tasks for the master product catalog"
---

# Tasks: Catálogo mestre de produtos e variantes

**Status**: Approved — implementation deferred by user on 2026-09-19

**Input**: Design documents from `/specs/008-master-product-catalog/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Obrigatórios e escritos antes da implementação correspondente, conforme constitution §IV e o risco de regressão em custos, códigos e importação.

**Organization**: Tarefas agrupadas por história para permitir implementação e validação incremental.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Pode executar em paralelo quando não modifica o mesmo arquivo nem depende de tarefa incompleta.
- **[Story]**: História da spec coberta pela tarefa.
- Cada tarefa aponta para os arquivos concretos que deve alterar.

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Preparar fixtures e isolamento de mídia para o ciclo red-green.

- [ ] T001 [P] Criar fixtures mínimas JPEG, PNG, WebP, assinatura inválida e arquivo acima de 5 MiB em `tests/fixtures/images/`
- [ ] T002 [P] Estender `tests/helpers/db.ts` com diretório temporário isolado para `CatalogMediaStore` e limpeza de banco + mídia após cada teste

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Implementar schema, validações e armazenamento local compartilhados por todas as histórias.

**CRITICAL**: Nenhuma história começa antes desta fundação ficar verde.

### Tests first

- [ ] T003 [P] Escrever testes inicialmente falhos para colunas nullable, invariantes de imagem, SKU único normalizado e unicidade `(channel, normalizedCode)` em `tests/catalog-schema.test.ts`
- [ ] T004 [P] Escrever testes inicialmente falhos para campos opcionais, limites (`name` 1–120, SKU 1–60, atributos 60/80/120, notas 2.000), normalização uppercase do SKU e vazio→`null` em `tests/catalog-domain.test.ts`
- [ ] T005 [P] Escrever testes inicialmente falhos de `save/open/delete`, MIME+assinatura, limite de 5 MiB, chaves opacas e bloqueio de path traversal em `tests/catalog-images.test.ts`

### Implementation

- [ ] T006 Gerar e revisar a migração versionada `src/lib/db/migrations/0008_master_product_catalog.sql` e atualizar `src/lib/db/schema.ts` com atributos, overrides, metadados de mídia e `product_codes.channel/normalizedCode`
- [ ] T007 Implementar normalizadores e schemas Zod de produto, variante, imagem, filtros, SKU e código de canal em `src/lib/domain/catalog.ts` até T004 ficar verde
- [ ] T008 Implementar `CatalogMediaStore` local com raiz `data/catalog-media/`, gravação temporária + rename atômico, chaves geradas, leitura confinada e delete idempotente em `src/lib/catalog/media-store.ts` até T005 ficar verde
- [ ] T009 Atualizar os tipos de linha e helpers de valor efetivo `override ?? product` sem carregar conteúdo binário em `src/lib/catalog/service.ts`, preservando as projeções exercitadas após T006

**Checkpoint**: Schema migrado, domínio validado e mídia local isolada estão prontos.

---

## Phase 3: User Story 1 - Cadastrar o produto mestre (Priority: P1) MVP

**Goal**: Criar e editar a identidade canônica do produto, primeira variante e imagem principal em uma operação consistente.

**Independent Test**: Em base vazia, cadastrar produto + primeira variante + imagem, reabrir e encontrar os mesmos valores; qualquer falha deixa banco e pasta de mídia sem escrita parcial.

### Tests first

- [ ] T010 [P] [US1] Escrever testes inicialmente falhos para criação transacional de produto + primeira variante + preços, atributos opcionais, substituição/remoção de imagem e rollback de arquivo/banco em `tests/catalog-master.test.ts`
- [ ] T011 [P] [US1] Escrever testes inicialmente falhos do contrato GET product/variant, fallback de imagem, headers, 400, 404 e arquivo ausente em `tests/catalog-image-route.test.ts`

### Implementation

- [ ] T012 [US1] Implementar criação transacional e edição do produto mestre, incluindo compensação de arquivos em falha e preservação da imagem anterior, em `src/lib/catalog/service.ts`
- [ ] T013 [US1] Evoluir parsing de `FormData`, respostas tipadas e revalidação para produto + primeira variante + upload opcional em `src/app/actions/catalog.ts`
- [ ] T014 [US1] Implementar `GET /api/catalog-images/{ownerType}/{ownerId}` com fallback da variante, streaming local, `nosniff` e sem exposição de caminho em `src/app/api/catalog-images/[ownerType]/[ownerId]/route.ts`
- [ ] T015 [US1] Implementar fluxo único de novo produto e edição das seções identidade, atributos e imagem em `src/app/(dashboard)/products/products-panel.tsx`
- [ ] T016 [US1] Executar `tests/catalog-master.test.ts` e `tests/catalog-image-route.test.ts` e corrigir somente a implementação até ambos ficarem verdes

**Checkpoint**: Produto mestre com primeira unidade vendável pode ser cadastrado e editado independentemente.

---

## Phase 4: User Story 2 - Definir variantes e SKUs sem duplicar dados (Priority: P1)

**Goal**: Criar variantes com SKU único, herdar valores do produto e sobrescrever somente diferenças.

**Independent Test**: Criar variantes herdada e sobrescrita, alterar o produto, remover overrides e confirmar valores efetivos, origem e imagem sem afetar outras variantes.

### Tests first

- [ ] T017 [P] [US2] Escrever testes inicialmente falhos para SKU case/space-insensitive, herança, overrides nullable, remoção de override, imagem efetiva e proteção da última variante em `tests/catalog-variants.test.ts`

### Implementation

- [ ] T018 [US2] Implementar CRUD de variantes, normalização persistida do SKU, valores efetivos e ciclo de vida da imagem própria em `src/lib/catalog/service.ts`
- [ ] T019 [US2] Evoluir ações de variante para campos sobrescrevíveis, `useProductValue` e intenção explícita de manter/substituir/remover imagem em `src/app/actions/catalog.ts`
- [ ] T020 [US2] Implementar editor de variante com origem herdada/sobrescrita, comando “Usar valor do produto” e preview efetivo em `src/app/(dashboard)/products/products-panel.tsx`
- [ ] T021 [US2] Executar `tests/catalog-variants.test.ts` junto com `tests/catalog-master.test.ts` e corrigir regressões até ambos ficarem verdes

**Checkpoint**: Variantes e SKUs funcionam sem duplicar os dados compartilhados do produto.

---

## Phase 5: User Story 3 - Manter custos, preços e códigos na unidade vendável (Priority: P2)

**Goal**: Preservar custos e preços da variante e fortalecer identificadores externos por canal sem alterar histórico financeiro.

**Independent Test**: Cadastrar insumos, preços e códigos; rejeitar duplicatas normalizadas e `Padrao` TikTok; importar fixtures e confirmar vínculo correto e custo congelado apenas em novos itens.

### Tests first

- [ ] T022 [P] [US3] Atualizar testes inicialmente falhos para canal não nulo, `normalizedCode`, unicidade por canal, fallback `geral` e rejeição de `Padrao` TikTok em `tests/codes.test.ts`
- [ ] T023 [P] [US3] Adicionar regressões inicialmente falhas para Shopee por `cProd`, TikTok por descrição e imutabilidade de `frozenCostCents` em `tests/integration-import.test.ts` e `tests/unlinked.test.ts`
- [ ] T024 [P] [US3] Adicionar regressões de custo e preço garantindo que atributos/imagens não recalculam valores e insumos continuam recalculando em `tests/cost.test.ts` e `tests/pricing.test.ts`

### Implementation

- [ ] T025 [US3] Implementar normalização de código, canal canônico `geral|shopee|tiktok` e rejeição TikTok em `src/lib/domain/catalog.ts` e `src/lib/catalog/service.ts`
- [ ] T026 [US3] Adaptar lookup, ranking de canal e vínculo por chave normalizada sem mutar custo congelado em `src/lib/xml/link.ts` e `src/lib/xml/importer.ts`
- [ ] T027 [US3] Atualizar ações de códigos e compatibilidade de payloads do catálogo em `src/app/actions/catalog.ts`
- [ ] T028 [US3] Reorganizar no editor de variante as seções produção/custo, preços e códigos por canal em `src/app/(dashboard)/products/products-panel.tsx`
- [ ] T029 [US3] Executar `tests/codes.test.ts`, `tests/integration-import.test.ts`, `tests/unlinked.test.ts`, `tests/cost.test.ts` e `tests/pricing.test.ts` até a regressão financeira completa ficar verde

**Checkpoint**: Catálogo renovado mantém o contrato financeiro e de integração existente.

---

## Phase 6: User Story 4 - Operar o catálogo com clareza (Priority: P2)

**Goal**: Localizar e editar produtos/variantes por busca e filtros, distinguindo dados internos, herdados, sobrescritos e externos.

**Independent Test**: Com catálogo representativo, buscar nome/SKU, combinar filtros e estado, encontrar produtos por valor efetivo de variante e abrir o editor correto.

### Tests first

- [ ] T030 [P] [US4] Escrever testes inicialmente falhos para busca por produto/variante/SKU, filtros combinados, valores efetivos e status `active|inactive|all` em `tests/catalog-filters.test.ts`
- [ ] T031 [P] [US4] Escrever testes inicialmente falhos garantindo que produtos ou variantes inativos continuam consultáveis no catálogo, mas não aparecem em novas vendas presenciais nem seletores de vínculo em `tests/catalog-active-selection.test.ts`
- [ ] T032 [P] [US4] Escrever benchmark determinístico inicialmente falho para listar, buscar e filtrar 1.000 produtos e 5.000 variantes em até 200 ms no ambiente de teste local em `tests/catalog-performance.test.ts`

### Implementation

- [ ] T033 [US4] Implementar e otimizar `listCatalog` server-side com resultados distintos por produto, variantes correspondentes, índices adequados e sem conteúdo de mídia em `src/lib/catalog/service.ts` até T030 e T032 ficarem verdes
- [ ] T034 [US4] Aplicar a regra de elegibilidade ativa nos provedores de seleção de novas vendas e vínculos em `src/lib/catalog/service.ts` e `src/app/(dashboard)/sales/presential.tsx` até T031 ficar verde
- [ ] T035 [US4] Expor filtros tipados e estado da consulta na página e ações em `src/app/(dashboard)/products/page.tsx` e `src/app/actions/catalog.ts`
- [ ] T036 [US4] Redesenhar barra de pesquisa, filtros compactos, lista estável e navegação mestre-detalhe responsiva em `src/app/(dashboard)/products/products-panel.tsx`
- [ ] T037 [US4] Manter a fila de não vinculados funcional com a nova seleção por SKU/nome e canais canônicos em `src/app/(dashboard)/products/unlinked-panel.tsx`
- [ ] T038 [US4] Executar `tests/catalog-filters.test.ts`, `tests/catalog-active-selection.test.ts`, `tests/catalog-performance.test.ts`, `tests/unlinked.test.ts` e `tests/catalog-variants.test.ts` até busca, filtros, desempenho e elegibilidade ficarem verdes

**Checkpoint**: O catálogo completo é operável e cada classe de dado é identificável.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Fechar portabilidade, reset, documentação e qualidade global.

- [ ] T039 [P] Adicionar testes de backup/restauração de chave relativa, mídia ausente e limpeza compensatória em `tests/catalog-images.test.ts`
- [ ] T040 Atualizar o estado real do catálogo, campos, herança, mídia local e códigos por canal em `docs/domain.md`
- [ ] T041 Executar a suíte completa e gates `npm test`, `npm run typecheck`, `npm run lint:check` e `npm run build`, corrigindo qualquer regressão nos arquivos alterados antes do reset
- [ ] T042 Executar o reset autorizado somente após T041, removendo `data/sale-track.db`, arquivos WAL/SHM e `data/catalog-media/`, depois aplicar migrações/seed e verificar contagens conforme `specs/008-master-product-catalog/quickstart.md`
- [ ] T043 Validar manualmente todos os cenários desktop/mobile, herança, mídia, canais e backup/restauração descritos em `specs/008-master-product-catalog/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sem dependências.
- **Foundational (Phase 2)**: depende do Setup e bloqueia todas as histórias.
- **US1 (Phase 3)**: depende da fundação; entrega o primeiro produto mestre utilizável.
- **US2 (Phase 4)**: depende da fundação e integra com o produto criado em US1.
- **US3 (Phase 5)**: depende da fundação e da variante de US2 para a experiência completa, embora seus testes de domínio possam começar antes.
- **US4 (Phase 6)**: depende de US1 e US2 para exibir valores efetivos e integra com US3 para filtros/seleções finais.
- **Polish (Phase 7)**: depende de todas as histórias concluídas; T042 é destrutiva e ocorre somente depois do gate completo T041.

### User Story Dependencies

```text
Foundation
  └── US1 Produto mestre
       └── US2 Variantes e SKUs
            ├── US3 Custos, preços e códigos
            └── US4 Operação do catálogo
                 └── Polish / reset / aceite
```

### Within Each User Story

1. Escrever os testes e confirmar que falham pelo motivo esperado.
2. Implementar domínio/schema antes do serviço.
3. Implementar serviço antes de action/endpoint.
4. Integrar interface depois dos contratos verdes.
5. Reexecutar testes da história e regressões anteriores no checkpoint.

### Parallel Opportunities

- T001 e T002 podem rodar em paralelo.
- T003, T004 e T005 podem rodar em paralelo antes de T006–T009.
- T010 e T011 podem rodar em paralelo.
- T022, T023 e T024 podem rodar em paralelo.
- T030, T031 e T032 podem ser preparadas em paralelo enquanto US3 termina, depois que os tipos efetivos de US2 estiverem estáveis.
- T039 e T040 podem rodar em paralelo após as histórias.

## Parallel Examples

### Foundation

```text
Task T003: testes de schema e constraints
Task T004: testes de validação/normalização de domínio
Task T005: testes do media store local
```

### User Story 3

```text
Task T022: testes de códigos por canal
Task T023: testes de importação e custo congelado
Task T024: regressões de custo e preço
```

## Implementation Strategy

### MVP First

1. Completar Setup e Foundation.
2. Completar US1 e validar criação do produto mestre.
3. Completar US2 e validar variantes/herança.
4. Parar para demonstração do núcleo canônico antes das integrações secundárias.

### Incremental Delivery

1. **US1**: produto mestre + primeira variante + imagem.
2. **US2**: variantes, SKUs e herança.
3. **US3**: custos, preços e códigos preservados.
4. **US4**: busca, filtros e experiência diária.
5. **Polish**: documentação, reset controlado e aceite completo.

## Notes

- Toda tarefa de teste vem antes da implementação que deve fazê-la passar.
- O reset T042 não pode ser antecipado, automatizado na inicialização nem executado antes do gate T041.
- A implementação S3 está fora desta feature; somente o limite `CatalogMediaStore` é criado.
- Não introduzir galeria, projeção de anúncio, receitas detalhadas, kits, bundles ou personalizações.
- Não alterar venda existente nem `frozenCostCents` durante manutenção do catálogo.

## Phase 8: Convergence

**Purpose**: Fechar os gaps encontrados após a implementação inicial e antes do aceite final da feature.

- [ ] T044 Implementar fluxo de criação que colete produto mestre + primeira variante + SKU revisável antes de concluir o cadastro, evitando SKU temporário invisível, per FR-017 / US1 AC1 / T015 (partial)
- [ ] T045 Adicionar testes do contrato `GET /api/catalog-images/{ownerType}/{ownerId}` para product/variant, fallback, headers, 400, 404 e arquivo ausente em `tests/catalog-image-route.test.ts`, per T011 / T016 / contract: catalog-images (missing)
- [ ] T046 Expor filtros tipados de categoria, tipo, tema, cor, tamanho, acabamento e estado na página `/products` e conectar a experiência a `listCatalog`, per FR-015 / US4 AC2 / T035 / T036 (partial)
- [ ] T047 Diferenciar visualmente valor herdado, sobrescrito, interno e específico de canal no editor de variante sem depender apenas de placeholder ou cor, per FR-016 / US4 AC3 / contract: catalog-ui (partial)
- [ ] T048 Adicionar testes de backup/restauração de chave relativa, mídia ausente e limpeza compensatória em `tests/catalog-images.test.ts`, per T039 / quickstart §9 (missing)
- [ ] T049 Resolver o gate de build para que `npm run build` passe de forma reproduzível no ambiente do projeto, documentando ou ajustando o script/configuração do Next quando necessário, per T041 / plan: static and automated checks (partial)
- [ ] T050 Executar o reset controlado somente após T049, removendo DB/WAL/SHM e `data/catalog-media/`, aplicando migrações/seed e verificando contagens operacionais zeradas, per FR-019–FR-021 / SC-007 / T042 (missing)
- [ ] T051 Validar manualmente os cenários do `quickstart.md` em desktop e mobile, incluindo herança, imagem, canais, backup/restauração e ausência de sobreposição visual, per T043 / quickstart §§4–10 (missing)
