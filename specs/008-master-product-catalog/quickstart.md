# Quickstart: validação do catálogo mestre

Este guia será executado após a implementação para provar a feature de ponta a ponta. Ele não autoriza implementação nem reset antes da aprovação do plano e das tasks.

## Prerequisites

- Node.js 22+
- Dependências instaladas
- Plano e tasks aprovados
- Aplicativo parado antes do reset local

## 1. Static and automated checks

```bash
npm test
npm run typecheck
npm run lint:check
npm run build
```

Expected:

- Todos os testes passam.
- Nenhum erro de tipo, lint ou build.
- Testes novos cobrem herança, SKU, filtros, imagem, código por canal e regressão do importador.

## 2. Controlled validation-data reset

Executar somente na implementação aprovada e com o aplicativo parado.

1. Confirmar que `data/sale-track.db` contém apenas dados descartáveis de validação.
2. Remover explicitamente o banco local, seus arquivos WAL/SHM e a pasta `data/catalog-media/`.
3. Executar:

```bash
npm run db:migrate
npm run db:seed
```

4. Verificar que produtos, variantes, vendas, itens de venda, caixa e códigos têm contagem zero.
5. Verificar que `data/catalog-media/` está vazio ou foi recriado vazio no primeiro upload.
6. Verificar que configurações e referências padrão necessárias ao primeiro uso foram recriadas.

Expected: a aplicação abre normalmente com catálogo e dados operacionais vazios.

## 3. Start the application

```bash
npm run dev
```

Abrir `/products` na URL informada pelo servidor.

## 4. Product master scenario

1. Criar “Mini Dragão” na categoria Geral.
2. Informar tipo “Miniatura”, tema “Fantasia”, cor “Verde”, escala “12 cm”, acabamento “Fosco” e observações internas.
3. Selecionar uma imagem JPEG, PNG ou WebP válida.
4. Criar a primeira variante com SKU `DRAGAO-VERDE-12`, tempos, material, consumo, embalagem e acessórios.
5. Fechar e reabrir o produto.

Expected:

- Produto e variante aparecem uma única vez.
- SKU está normalizado e custos são exibidos.
- Atributos e imagem persistem.
- Cadastro é concluído em até 3 minutos.

## 5. Inheritance scenario

1. Criar uma segunda variante sem sobrescritas.
2. Criar uma terceira variante com cor “Azul”, escala “18 cm” e imagem própria.
3. Alterar a cor do produto de “Verde” para “Esmeralda”.
4. Remover a imagem da terceira variante.

Expected:

- Primeira e segunda variantes mostram “Esmeralda” com origem produto.
- Terceira variante continua “Azul” com origem variante.
- Após remover a imagem própria, a terceira variante mostra a imagem do produto.

## 6. SKU and filtering scenario

1. Tentar criar SKU ` dragao-verde-12 ` em outra variante.
2. Pesquisar por `DRAGAO-VERDE-12`.
3. Filtrar cor “Azul” e escala “18 cm”.
4. Inativar a terceira variante e alternar o filtro de estado.

Expected:

- SKU duplicado é rejeitado sem escrita parcial.
- Busca por SKU abre o produto correto.
- Filtros efetivos encontram e destacam a terceira variante.
- Inativos somem do padrão e reaparecem no filtro explícito.

## 7. Channel-code scenario

1. Na primeira variante, cadastrar código Shopee `ABC-123`.
2. Tentar cadastrar ` abc-123 ` para outra variante no mesmo canal.
3. Cadastrar o mesmo texto para TikTok.
4. Tentar cadastrar `Padrao` para TikTok.
5. Executar os fixtures de importação Shopee e TikTok usados nos testes.

Expected:

- Duplicata normalizada no mesmo canal é rejeitada.
- Mesmo texto em canal diferente é aceito.
- `Padrao` TikTok é rejeitado.
- Shopee vincula por código, TikTok por descrição e custo é congelado somente no novo item.

## 8. Image failure scenario

1. Tentar enviar arquivo não-imagem renomeado como `.png`.
2. Tentar enviar imagem acima de 5 MiB.
3. Interromper uma atualização inválida de imagem de produto que já tem imagem.

Expected:

- Todos os uploads inválidos são rejeitados com mensagem clara.
- A imagem anterior permanece acessível.
- A listagem continua rápida porque carrega somente chaves/metadados e solicita cada imagem sob demanda.

## 9. Media backup and restore

1. Com produto e variante contendo imagens, parar o aplicativo.
2. Copiar juntos o arquivo SQLite e `data/catalog-media/` para uma pasta temporária de backup.
3. Restaurar os dois no mesmo layout relativo e iniciar o aplicativo.

Expected:

- Produto, variante e imagens efetivas são restaurados.
- Nenhum caminho absoluto da máquina anterior está persistido.
- `data/catalog-media/` continua fora do Git.

## 10. Responsive UI review

Validar `/products` em desktop e viewport móvel.

Expected:

- Pesquisa, filtros, lista, editor e ações permanecem acessíveis.
- Não há campos, textos ou comandos sobrepostos.
- Controles têm dimensões estáveis durante carregamento e erro.
- Dados internos, herdados, sobrescritos e específicos de canal são visualmente distinguíveis.

## 11. Domain documentation

Após todos os cenários passarem, conferir `docs/domain.md`.

Expected: o documento descreve somente o catálogo realmente implementado, incluindo os novos campos e regras, sem antecipar projeções de canal, galeria, receitas detalhadas, kits ou personalizações.
