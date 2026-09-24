# Contract: Catalog UI

## Estrutura da tela `/products`

1. Cabeçalho compacto com contagem e comando “Novo produto”.
2. Barra de pesquisa e filtros por categoria, tipo, tema, cor, tamanho, acabamento e estado.
3. Lista ou tabela estável de produtos, com imagem efetiva pequena, nome, categoria, atributos principais, número de variantes e estado.
4. Editor de produto em painel próprio, sem card aninhado, dividido em identidade, atributos e variantes.
5. Editor de variante dividido em identidade/SKU, diferenças, produção/custo, preços e códigos por canal.
6. Fila de itens não vinculados permanece acessível como fluxo secundário da mesma área.

## Criação

- “Novo produto” abre um fluxo único com os campos do produto e da primeira variante.
- Campos obrigatórios visíveis: nome interno, nome da variante e SKU.
- A confirmação fica indisponível enquanto campos obrigatórios forem inválidos.
- Sucesso abre o produto recém-criado; falha mantém os valores digitados e mostra o erro junto ao campo ou seção correspondente.

## Herança

- Cor, tamanho, acabamento, observações e imagem da variante mostram a origem atual.
- Estado herdado exibe o valor do produto como referência.
- Definir valor próprio troca a origem para variante.
- O comando “Usar valor do produto” remove a sobrescrita; não copia o texto do produto para o campo da variante.

## Imagem

- Upload aceita JPEG, PNG e WebP e informa limite de 5 MiB no seletor/erro, não como texto promocional permanente.
- Preview só muda definitivamente após confirmação bem-sucedida.
- Remoção é uma ação explícita; na variante, remover revela imediatamente a imagem herdada do produto.
- Ausência de imagem usa placeholder discreto com dimensões estáveis.

## Pesquisa e filtros

- Busca cobre nome do produto, nome da variante e SKU.
- Filtros podem ser combinados e possuem ação clara para limpar.
- Estado padrão mostra ativos; inativos aparecem quando solicitado.
- Uma correspondência em sobrescrita de variante torna o produto visível e destaca a variante correspondente.

## Feedback e acessibilidade

- Operações pendentes desabilitam apenas o comando relacionado e mantêm o layout estável.
- Erros não apagam entradas do formulário.
- Inputs possuem rótulos persistentes; botões de ícone usam tooltip e nome acessível.
- Navegação por teclado alcança filtros, tabela, editor e ações na ordem visual.
- Desktop e mobile não apresentam sobreposição de texto, campos ou comandos.
