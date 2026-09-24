# Research: Catálogo mestre de produtos e variantes

## 1. Representação dos atributos internos

**Decision**: Usar colunas explícitas e opcionais no produto para `productType`, `theme`, `primaryColor`, `sizeLabel`, `finish` e `internalNotes`. A variante terá colunas nullable somente para as sobrescritas permitidas: cor, tamanho, acabamento e observações.

**Rationale**: Os campos foram definidos na descoberta, são poucos e precisam participar de filtros previsíveis. Colunas explícitas preservam tipagem, consultas simples e legibilidade do domínio. `null` representa herança de modo inequívoco.

**Alternatives considered**:

- Tabela genérica de atributos: rejeitada por adicionar metamodelo, joins e UI administrativa sem necessidade nesta fatia.
- Documento JSON: rejeitado porque enfraquece validação, indexação e filtros.
- Copiar valores do produto para cada variante: rejeitado porque cria divergência e exige propagação em atualizações.

## 2. Regra de herança e sobrescrita

**Decision**: Calcular o valor efetivo em leitura com `override ?? productValue`. Inputs opcionais vazios viram `null`; uma ação explícita “usar valor do produto” remove a sobrescrita.

**Rationale**: O produto permanece fonte de verdade e mudanças compartilhadas alcançam automaticamente as variantes que não têm diferença própria. Não há processo de sincronização nem mutação em massa.

**Alternatives considered**:

- Materializar o valor efetivo na variante: rejeitado por duplicar dados.
- Sistema de eventos para propagar alterações: rejeitado por complexidade desnecessária em app local.

## 3. Normalização e unicidade de SKU

**Decision**: Normalizar o SKU no domínio com trim, colapso de espaços e conversão para maiúsculas antes de persistir. Manter índice único sobre `variants.sku`.

**Rationale**: A representação canônica faz o índice simples cumprir a regra case-insensitive, produz mensagens previsíveis e mantém o SKU legível em integrações e seleção de vendas.

**Alternatives considered**:

- Índice funcional SQLite sobre `lower(trim(sku))`: válido, mas duplica no banco a regra que a UI também precisa conhecer.
- Comparação somente no serviço: rejeitada porque concorrência ou escrita direta poderia criar duplicatas.

## 4. Identificadores de canal

**Decision**: Persistir `channel` como valor não nulo (`geral`, `shopee`, `tiktok`), preservar o texto original em `code` e persistir também `normalizedCode`. Criar unicidade composta entre canal e chave normalizada.

**Rationale**: O esquema atual usa `NULL` para geral, o que enfraquece a unicidade composta do SQLite e obriga verificação manual. Uma chave canônica elimina ambiguidade no banco e mantém o valor original para exibição. Shopee continua casando `cProd`; TikTok continua casando descrição.

**Alternatives considered**:

- Manter `NULL` e validar apenas no serviço: rejeitada porque a própria restrição de banco permite duplicatas gerais.
- Usar SKU como código externo: rejeitada porque os canais fornecem identidades próprias e o TikTok não entrega SKU útil no XML atual.

## 5. Armazenamento da imagem principal

**Decision**: Armazenar a imagem principal em `data/catalog-media/`, fora do Git. Produto ou variante guarda somente uma chave opaca gerada pelo sistema e metadados (`mimeType`, `fileName`, `sizeBytes`). Aceitar JPEG, PNG e WebP até 5 MiB, validando MIME e assinatura.

**Rationale**: Arquivos mantêm o SQLite enxuto, permitem entrega por streaming e não passam pelo payload das consultas. A chave opaca evita acoplamento a caminhos absolutos. O diretório `data/` já é local e ignorado pelo Git. Um limite de armazenamento permite substituir a implementação local por S3 no futuro sem alterar o modelo do catálogo.

**Alternatives considered**:

- BLOB no SQLite: mantém backup em arquivo único, mas cresce o banco com mídia, aumenta custo operacional e dificulta uma futura migração para object storage.
- Base64 em texto: rejeitado por aumentar o tamanho e custo de conversão.
- S3 agora: rejeitado por exigir rede, credenciais e configuração antes de haver essa necessidade; fica registrado como melhoria futura.
- Tabela genérica de mídia: adiada até existir galeria, reutilização ou publicação multicanal.

### Consistência e ciclo de vida

- O store grava em arquivo temporário dentro do diretório de mídia e promove para a chave final por rename atômico.
- O banco só recebe a nova chave depois que o arquivo final existe.
- Falha no banco remove o arquivo recém-criado.
- Substituição ou remoção limpa a referência no banco antes de apagar o arquivo anterior; uma falha de limpeza pode deixar órfão recuperável, nunca uma referência quebrada deliberadamente.
- Backup e restauração devem tratar o SQLite e `data/catalog-media/` como uma unidade.

## 6. Contrato de entrega da imagem

**Decision**: Usar rota GET somente leitura por tipo e id do proprietário. A rota resolve a chave pelo banco, abre o arquivo pelo `CatalogMediaStore`, responde com o MIME persistido, `X-Content-Type-Options: nosniff` e 404 quando não houver imagem. Atualização e remoção continuam em Server Actions no contexto local da aplicação.

**Rationale**: URLs estáveis funcionam diretamente em `<img>`, carregam bytes sob demanda e mantêm os arquivos fora de `public`. O navegador e a rota não recebem caminhos físicos.

**Alternatives considered**:

- Data URI no HTML: rejeitada por aumentar o payload e impedir carregamento sob demanda.
- Escrever em `public/`: rejeitada porque é área de artefato da aplicação, não armazenamento mutável e portável.

## 7. Fluxo de criação do produto

**Decision**: Criar produto, primeira variante e preços iniciais na mesma transação a partir de um único fluxo de cadastro. O usuário informa ou revisa o SKU antes de confirmar.

**Rationale**: O produto nunca fica sem variante, o SKU temporário deixa de ser necessário e o cenário de produto simples termina em uma única operação consistente.

**Alternatives considered**:

- Criar variante automática com SKU por timestamp: rejeitada porque introduz identidade que o usuário não revisou e exige edição posterior.
- Permitir produto sem variante: rejeitada pela regra de unidade vendável e pelo fluxo atual de custos e vendas.

## 8. Pesquisa e filtros

**Decision**: Pesquisar nome do produto, nome da variante e SKU de forma case-insensitive. Filtros por cor, tamanho e acabamento consideram o valor efetivo de qualquer variante; tipo, tema, categoria e estado pertencem ao produto. A consulta retorna somente chaves e metadados de imagem.

**Rationale**: O usuário busca unidades vendáveis, e uma variante sobrescrita precisa tornar seu produto encontrável. O volume esperado permite consultas SQLite diretas com índices nos campos de maior seletividade.

**Alternatives considered**:

- Filtro apenas client-side: rejeitado por transferir todo o catálogo e misturar regra de herança na UI.
- Motor de busca separado: rejeitado para a escala local prevista.

## 9. Reset da base de validação

**Decision**: Tratar o reset como procedimento único e explícito da implementação: parar o app, remover banco, arquivos WAL/SHM e `data/catalog-media/`, aplicar migrações, executar seed e verificar contagens operacionais zeradas e diretório de mídia vazio. Configurações e referências padrão são recriadas pelo seed.

**Rationale**: Não há dados reais a migrar, e uma base limpa evita carregar inconsistências de protótipo para o modelo canônico. Recriar pelo caminho oficial também valida a cadeia completa de migrações.

**Alternatives considered**:

- Migração dos registros existentes: rejeitada por decisão explícita do usuário.
- Deletes parciais por tabela: rejeitados porque podem deixar dados órfãos ou configurações acidentais de validação.
- Reset automático na inicialização: rejeitado por risco destrutivo recorrente.

## 10. Estratégia de testes

**Decision**: Aplicar red-green em domínio, serviço e integração. Cobrir especialmente herança, normalização, unicidade, transação de criação, imagens, filtros efetivos e regressão do vínculo de importação/custo congelado.

**Rationale**: A feature cruza o catálogo usado pelo pipeline financeiro. Testes em SQLite migrado exercitam índices, FKs e transações reais sem depender da base local.

**Alternatives considered**:

- Testes apenas de UI: rejeitados porque não protegem invariantes do banco nem caminhos de importação.
- Testes apenas unitários: rejeitados porque a maior parte do risco está na interação schema-serviço.

## Limitações da pesquisa

- O skill `grill-me` exigido pelo `AGENTS.md` não está instalado; dependências, integrações e casos de borda foram estressados manualmente.
- O skill `context7-mcp` foi carregado, mas seu conector não está disponível nesta sessão. O desenho usa APIs já presentes no repositório e não introduz nova dependência externa.
