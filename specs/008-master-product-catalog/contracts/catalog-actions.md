# Contract: Catalog Server Actions

## Convenções

- Todas as ações retornam `ActionResult<T>` no padrão existente: `{ ok: true, data }` ou `{ ok: false, error }`.
- Strings são normalizadas e validadas no domínio antes de qualquer escrita.
- Escritas compostas são transacionais.
- Erro de validação ou imagem preserva integralmente o registro anterior.
- Após sucesso, `/products` é revalidado.

## `createProduct`

Cria produto, primeira variante e preços iniciais em uma única transação.

### Input lógico

```text
product:
  name, categoryId?, productType?, theme?, primaryColor?, sizeLabel?,
  finish?, internalNotes?, marginBps?, mainImage?

initialVariant:
  sku, name, primaryColorOverride?, sizeLabelOverride?, finishOverride?,
  internalNotesOverride?, printTimeMin, manualTimeMin, filamentMaterialId?,
  filamentGrams, packagingCents, accessoriesCents, mainImage?
```

### Success

Retorna `productId`, `variantId` e a lista atualizada necessária pela interface.

### Errors

- Nome ou SKU ausente/inválido.
- SKU já existente após normalização.
- Categoria ou material inexistente.
- Valor numérico negativo ou fora do limite.
- Imagem vazia, acima de 5 MiB, MIME não suportado ou assinatura incompatível.

Nenhum produto fica persistido quando a primeira variante falha.

## `updateProduct`

Atualiza somente campos enviados. Campo opcional vazio vira `null`. A imagem usa intenção explícita:

- ausente: preservar;
- novo arquivo válido: substituir;
- `removeMainImage=true`: remover referência, metadados e solicitar limpeza do arquivo.

Alterar atributos compartilhados afeta o valor efetivo das variantes herdadas por leitura, sem atualizações em massa.

## `createVariant`

Cria uma variante adicional para produto existente, normaliza o SKU, calcula custo e cria preços iniciais por canal na mesma transação.

## `updateVariant`

Atualiza identidade, sobrescritas ou insumos. Remover uma sobrescrita grava `null`. Recalcula custo e preços sugeridos somente quando algum insumo de custo muda.

## `setProductActive` e `setVariantActive`

Mantêm o comportamento atual. Variante ou produto inativo não aparece por padrão em novos fluxos de venda, mas continua consultável no catálogo.

## `listCatalog`

### Input lógico

```text
query?, categoryId?, productType?, theme?, primaryColor?,
sizeLabel?, finish?, status = active | inactive | all
```

### Output

- Produtos distintos com contagem de variantes.
- Resumo de atributos compartilhados.
- Variantes sem conteúdo binário de imagem, incluindo valores efetivos e origem (`product` ou `variant`) dos campos sobrescrevíveis.
- Indicadores `hasOwnImage` e `hasEffectiveImage`; a URL é derivada de tipo e id.

## Códigos por canal

`addProductCode` preserva o texto apresentado, calcula `normalizedCode`, rejeita `Padrao` no TikTok e garante unicidade por canal. O retorno externo usa `channel: geral | shopee | tiktok`; `null` deixa de fazer parte do contrato novo.

## Compatibilidade financeira

- Ações de atributos e imagem não escrevem em vendas nem em `frozenCostCents`.
- Alterar insumos muda o custo atual da variante e seus preços sugeridos conforme regras atuais, mas não altera itens de venda existentes.
- Vínculo futuro de item usa o custo atual apenas no momento do vínculo/importação já previsto pelo domínio.
