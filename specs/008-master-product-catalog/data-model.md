# Data Model: Catálogo mestre de produtos e variantes

## Visão geral

```text
Category 1 ── 0..N Product 1 ── 1..N Variant
                                  ├── 0..N VariantPrice
                                  ├── 0..N ProductCode
                                  └── 0..N SaleItem (histórico futuro)

Product values + nullable Variant overrides = Effective Variant
```

As entidades existentes são ampliadas. Não há entidade genérica de atributo nem tabela de galeria nesta fatia.

## Product

Representa a identidade canônica e os valores compartilhados.

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---:|---|
| `id` | inteiro | sim | Identificador interno |
| `name` | texto | sim | 1–120 caracteres, espaços normalizados |
| `categoryId` | referência | não | Categoria existente; `null` permitido |
| `productType` | texto | não | Até 60 caracteres |
| `theme` | texto | não | Tema ou personagem, até 120 caracteres |
| `primaryColor` | texto | não | Até 60 caracteres |
| `sizeLabel` | texto | não | Tamanho ou escala legível, até 60 caracteres |
| `finish` | texto | não | Até 80 caracteres |
| `internalNotes` | texto longo | não | Até 2.000 caracteres; uso interno |
| `mainImageKey` | texto | não | Chave opaca gerada pelo media store; nunca caminho absoluto |
| `mainImageMimeType` | texto | condicional | Obrigatório quando há chave |
| `mainImageFileName` | texto | condicional | Nome original normalizado, máximo 255 |
| `mainImageSizeBytes` | inteiro | condicional | Maior que zero e igual ao tamanho do arquivo |
| `marginBps` | inteiro | sim | 0–10.000; comportamento atual |
| `active` | booleano | sim | Default verdadeiro |
| `createdAt` | data/hora | sim | Definido na criação |
| `updatedAt` | data/hora | sim | Atualizado em qualquer edição |

### Invariantes

- `name` é obrigatório; os novos atributos permanecem opcionais para permitir cadastro progressivo.
- Os quatro campos da imagem são todos nulos ou todos preenchidos.
- `mainImageKey` é opaca, relativa ao store e não aceita `..`, separador de diretório ou entrada fornecida pelo usuário.
- Uma atualização de atributo não recalcula custo ou preço.
- A exclusão continua bloqueada quando houver venda vinculada; inativação é a alternativa histórica.

## Variant

Representa a unidade vendável e os dados próprios de produção.

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---:|---|
| `id` | inteiro | sim | Identificador interno |
| `productId` | referência | sim | Produto proprietário; cascade na exclusão permitida |
| `sku` | texto | sim | 1–60, trim, espaços colapsados, maiúsculas, único globalmente |
| `name` | texto | sim | 1–120 caracteres |
| `primaryColorOverride` | texto | não | `null` significa herdar produto |
| `sizeLabelOverride` | texto | não | `null` significa herdar produto |
| `finishOverride` | texto | não | `null` significa herdar produto |
| `internalNotesOverride` | texto longo | não | `null` significa herdar produto |
| `mainImageKey` | texto | não | Chave da imagem específica; mesmas regras do produto |
| `mainImageMimeType` | texto | condicional | Obrigatório quando há chave |
| `mainImageFileName` | texto | condicional | Obrigatório quando há chave |
| `mainImageSizeBytes` | inteiro | condicional | Obrigatório quando há chave |
| `printTimeMin` | inteiro | sim | Não negativo |
| `manualTimeMin` | inteiro | sim | Não negativo |
| `filamentMaterialId` | referência | não | Material existente e ativo na seleção |
| `filamentGrams` | inteiro | sim | Não negativo |
| `packagingCents` | inteiro | sim | Não negativo, centavos |
| `accessoriesCents` | inteiro | sim | Não negativo, centavos |
| `costCents` | inteiro | sim | Derivado pelo motor atual, centavos |
| `active` | booleano | sim | Default verdadeiro |
| `createdAt` | data/hora | sim | Definido na criação |
| `updatedAt` | data/hora | sim | Atualizado em qualquer edição |

### Valores efetivos

| Valor | Regra |
|---|---|
| Cor | `primaryColorOverride ?? product.primaryColor` |
| Tamanho/escala | `sizeLabelOverride ?? product.sizeLabel` |
| Acabamento | `finishOverride ?? product.finish` |
| Observações | `internalNotesOverride ?? product.internalNotes` |
| Imagem | imagem da variante quando completa; senão imagem do produto |
| Tipo, tema e categoria | sempre do produto |

### Invariantes

- Todo produto é criado com ao menos uma variante na mesma transação.
- O último SKU de um produto não pode ser removido sem remover o produto inteiro.
- String vazia em sobrescrita é normalizada para `null`.
- Alterar atributos ou imagem não altera `costCents`; alterar insumos executa o cálculo existente.

## VariantPrice

Permanece o contrato atual.

| Campo | Regra |
|---|---|
| `variantId` | Variante proprietária |
| `channel` | `shopee` ou `tiktok` |
| `suggestedPriceCents` | Inteiro não negativo derivado |
| `practicedPriceCents` | Inteiro não negativo informado |

Unicidade: uma linha por variante e canal.

## ProductCode

Relaciona identidade externa a uma variante.

| Campo | Tipo lógico | Obrigatório | Regra |
|---|---|---:|---|
| `id` | inteiro | sim | Identificador interno |
| `variantId` | referência | sim | Variante proprietária |
| `channel` | enum | sim | `geral`, `shopee` ou `tiktok` |
| `code` | texto | sim | Valor original normalizado em espaços, até 255 |
| `normalizedCode` | texto | sim | trim, espaços colapsados e minúsculas |
| `createdAt` | data/hora | sim | Definido na criação |

Unicidade: `(channel, normalizedCode)`. O mesmo texto pode existir em canais diferentes.

### Regras de casamento

- Shopee: normalizar e comparar o `cProd`; preferir `shopee`, depois `geral`.
- TikTok: normalizar e comparar a descrição; preferir `tiktok`, depois `geral`; rejeitar `Padrao` como código TikTok.
- Presencial: comparar somente códigos `geral`.
- Ao vincular venda, congelar o custo atual somente no novo item; nunca atualizar custo já congelado.

## CatalogFilter

Objeto de consulta, não persistido.

| Campo | Regra |
|---|---|
| `query` | Busca case-insensitive por produto, variante ou SKU |
| `categoryId` | Categoria exata |
| `productType` | Comparação normalizada |
| `theme` | Comparação normalizada |
| `primaryColor` | Produto aparece quando alguma variante tem esse valor efetivo |
| `sizeLabel` | Produto aparece quando alguma variante tem esse valor efetivo |
| `finish` | Produto aparece quando alguma variante tem esse valor efetivo |
| `status` | `active`, `inactive` ou `all`; default `active` |

Resultados são distintos por produto, ordenados por nome; variante correspondente pode ser destacada sem duplicar o produto.

## ImageInput

Objeto de domínio, não persistido isoladamente.

| Campo | Regra |
|---|---|
| `bytes` | 1 a 5 MiB |
| `mimeType` | `image/jpeg`, `image/png` ou `image/webp` |
| `fileName` | 1–255, somente nome base para exibição |

Validação verifica consistência entre MIME declarado e assinatura dos bytes. Uma falha preserva a imagem anterior.

## CatalogMediaStore

Limite de infraestrutura, não persistido.

| Operação | Contrato |
|---|---|
| `save(input)` | Valida e grava mídia; retorna chave opaca e metadados |
| `open(key)` | Abre conteúdo pela chave sem aceitar caminho físico externo |
| `delete(key)` | Remove de forma idempotente; arquivo ausente é sucesso |

A implementação inicial usa `data/catalog-media/`. Testes usam diretório temporário isolado. Uma implementação S3 futura deve manter o mesmo contrato e migrar as chaves por procedimento separado.

## State transitions

### Produto e variante

```text
active ── deactivate ──> inactive
inactive ── reactivate ──> active
```

Não há arquivamento separado nesta fatia. Registros inativos permanecem pesquisáveis com filtro explícito.

### Sobrescrita

```text
inherited ── set override ──> overridden
overridden ── use product value ──> inherited
```

### Imagem efetiva

```text
none ── upload product ──> product image
product image ── upload variant ──> variant image
variant image ── remove variant image ──> product image
product image ── remove product image ──> none
```

## Migration and reset

- Criar migração versionada para as novas colunas e a nova representação de `product_codes`.
- A migração deve ser válida mesmo em um banco existente, mas não precisa converter semanticamente os dados de validação.
- Após a migração ser testada, o banco local de validação será removido de forma explícita junto com WAL/SHM e `data/catalog-media/`, então recriado por `db:migrate` + `db:seed`.
- O seed recria somente referências e configurações essenciais; produtos, variantes, vendas, caixa e códigos começam vazios.
- Backup e restauração devem copiar o SQLite e a pasta de mídia juntos; a ausência de um arquivo referenciado é detectada como mídia indisponível, sem falhar a leitura do produto.
