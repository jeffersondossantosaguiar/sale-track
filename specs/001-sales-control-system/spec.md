# Feature Specification: Controle de Vendas (sale-track)

**Feature Branch**: `001-sales-control-system`

**Created**: 2026-09-15

**Status**: Draft

**Input**: User description: "Sistema de controle de vendas para MEI de impressão 3D (Shopee, TikTok e vendas presenciais): cadastro de produtos e preços, importação de notas fiscais via XML, controle do valor das notas emitidas, fluxo de caixa (recebido/gasto) e relatórios — sem integração com os marketplaces nesta fase."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Importar notas fiscais e controlar o faturamento (Priority: P1)

O dono baixa os arquivos XML das notas fiscais que emiti em vendas de marketplace, seleciona
vários de uma vez e envia para o sistema. O sistema cria automaticamente uma venda para cada
nota — com data, itens vendidos, valor bruto e número da nota — identifica de qual canal
(Shopee/TikTok) cada arquivo veio, e mostra o total de notas do mês e o quanto do limite anual
MEI já foi usado. Se o dono reenviar um arquivo já importado, nada é duplicado.

**Why this priority**: é a necessidade legal do MEI (controle de notas e teto de faturamento) e
o maior ganho de tempo do dia a dia: a maioria das vendas entra sozinha, sem digitação.

**Independent Test**: Pode ser testado de ponta a ponta só com um lote de arquivos XML de
exemplo (uma venda Shopee + uma TikTok + um arquivo repetido): todos os arquivos distintos
viram vendas únicas, o canal é identificado, e o faturamento do mês fecha com a soma das notas.

**Acceptance Scenarios**:

1. **Given** um lote com 3 XMLs distintos (2 Shopee, 1 TikTok), **When** o dono envia e confirma
   a importação, **Then** o sistema cria 3 vendas únicas, cada uma no canal correto, com data,
   itens, valor bruto e número da nota preenchidos do arquivo.
2. **Given** a mesma nota já importada, **When** o dono envia o mesmo XML outra vez, **Then**
   o sistema informa que a nota já existe e não cria venda duplicada.
3. **Given** um XML cujo nome de arquivo não tem padrão conhecido, **When** o dono envia lote,
   **Then** o sistema pergunta manualmente o canal antes de importar.
4. **Given** vendas importadas e presenciais lançadas no mês, **When** o dono abre o
   acompanhamento do teto MEI, **Then** vê o faturamento do mês, o acumulado do ano e a
   porcentagem do limite anual utilizada.

---

### User Story 2 - Cadastrar produtos e precificar (Priority: P2)

O dono cadastra seus produtos com nome, categoria, preço de venda e custo estimado de produção
(filamento + energia). Para cada produto, indica os códigos usados em cada canal, e o sistema
mostra a margem (preço − custo). Quando uma nota importada traz itens com códigos conhecidos,
as vendas já nascem vinculadas aos produtos, mostrando a margem de cada venda.

**Why this priority**: dá visão de qual produto é lucrativo e alimenta o vínculo automático dos
itens importados, mas o controle de faturamento (US1) já funciona sem ele.

**Independent Test**: Cadastrar 2 produtos com preço/custo e códigos por canal; conferir a
margem exibida; importar um XML cujos itens usam esses códigos e conferir que as vendas
nasceram vinculadas aos produtos certos.

**Acceptance Scenarios**:

1. **Given** um produto cadastrado com preço R$ 50 e custo R$ 20, **When** o dono abre o
   cadastro, **Then** vê a margem de R$ 30 (60%).
2. **Given** códigos de um produto diferentes entre Shopee e TikTok, **When** uma nota importada
   traz esses códigos, **Then** as vendas são vinculadas ao produto correto em cada canal.
3. **Given** um item importado cujo código não existe em nenhum produto, **When** a importação
   termina, **Then** o item aparece numa lista de "códigos sem vínculo" e, após o dono vincular
   manualmente, o sistema passa a reconhecer aquele código nas próximas notas.
4. **Given** uma venda vinculada a um produto com custo R$ 5, **When** o dono depois altera o
   custo do produto para R$ 7, **Then** a margem daquela venda continua calculada com R$ 5
   (a venda congela o custo vigente na data da venda).
5. **Given** vendas antigas sem custo definido, **When** o dono aciona "aplicar custo atual às
   vendas sem custo", **Then** só as vendas sem custo recebem o valor atual — nenhuma venda que
   já tem custo é alterada.

---

### User Story 3 - Controlar o caixa (Priority: P2)

O dono registra no caixa quanto entrou (repasse do marketplace, PIX/cash de venda presencial) e
quanto saiu (filamento, energia, manutenção, embalagem, taxas), cada lançamento com data,
categoria, valor e descrição. O sistema mostra o saldo, o total de entradas e saídas do período,
e quanto foi gasto em cada categoria. Lançamentos podem ser vinculados a uma venda.

**Why this priority**: o caixa responde a pergunta "eu realmente ganhei dinheiro?", que o
faturamento das notas não responde sozinho. É independente da US1/US2.

**Independent Test**: Registrar entradas e saídas de um mês com categorias variadas; conferir
saldo, totais e o gasto por categoria; vincular um lançamento a uma venda e ver o vínculo.

**Acceptance Scenarios**:

1. **Given** 3 entradas e 2 saídas lançadas, **When** o dono abre o caixa do período, **Then**
   vê o total de entradas, o total de saídas e o saldo resultante.
2. **Given** saídas em categorias diferentes (filamento, energia, taxas), **When** o dono pede o
   resumo por categoria, **Then** vê o total de cada categoria no período.
3. **Given** um lançamento vinculado a uma venda, **When** o dono consulta a venda, **Then** vê o
   lançamento associado (e vice-versa).

---

### User Story 4 - Registrar venda presencial (Priority: P2)

Para as poucas vendas feitas pessoalmente (sem nota fiscal), o dono lança a venda manualmente:
canal presencial, data, valor recebido e descrição dos itens. Essa venda **conta no
faturamento** do mês para o controle do teto MEI, mesmo sem ter nota fiscal.

**Why this priority**: sem as vendas presenciais, o faturamento do MEI fica subdeclarado no
sistema e o teto fica mentindo.

**Independent Test**: Lançar 2 vendas presenciais históricas e conferir que elas somam ao
faturamento do mês e ao acumulado do ano no acompanhamento do teto.

**Acceptance Scenarios**:

1. **Given** uma venda presencial lançada manualmente com valor e data, **Then** ela aparece na
   lista de vendas, marcada como presencial, e compõe o faturamento do mês.
2. **Given** soma de todas as NF importadas do mês = R$ 1.000 e venda presencial de R$ 200,
   **Then** o faturamento exibido do mês é R$ 1.200.

---

### User Story 5 - Acompanhar taxas e valor líquido (Priority: P3)

Para cada venda de marketplace, o sistema calcula o valor líquido (bruto − taxa). A taxa vem
pré-preenchida com um padrão que o dono configurou para o canal (com base nas regras divulgadas
e no detalhamento do painel do vendedor) e pode ser ajustada vendida a venda, usando o
detalhamento real que o marketplace mostra. O líquido total por canal fica visível nos
relatórios.

**Why this priority**: mostra quanto a taxa efetivamente custa e aproxima faturamento do caixa,
mas não bloqueia o uso das US1–US4.

**Independent Test**: Configurar uma taxa padrão para a Shopee, importar vendas, ajustar a taxa
de uma delas para o valor real, e conferir o líquido bruto − taxa por venda e por canal.

**Acceptance Scenarios**:

1. **Given** taxa padrão de 12% configurada para um canal, **When** vendas desse canal são
   importadas, **Then** a taxa de cada venda nasce em 12% do valor bruto.
2. **Given** venda com taxa padrão, **When** o dono ajusta a taxa para o valor real mostrado no
   painel, **Then** o líquido da venda passa a ser bruto − taxa ajustada.
3. **Given** vendas com taxas registradas, **When** o dono consulta o resumo por canal, **Then**
   vê, por canal, o bruto, o total de taxas e o líquido.

---

### User Story 6 - Dashboard e extrato para declaração (Priority: P3)

O dono abre um dashboard mensal com: faturamento do mês, barra do teto anual MEI, resumo do
caixa (entradas, saídas, saldo), gastos por categoria e vendas por canal. Ele consegue exportar
um extrato mensal (faturamento por tipo), pronto para servir de base à declaração mensal do MEI.

**Why this priority**: é a visão consolidada do negócio, mas depende dos dados das outras
histórias, então fica por último.

**Independent Test**: Com vendas (importadas + presenciais), taxas, estornos e lançamentos de
caixa de um mês registrados, conferir cada bloco do dashboard e gerar o extrato do mês.

**Acceptance Scenarios**:

1. **Given** dados completos de um mês, **When** o dono abre o dashboard, **Then** vê
   faturamento (NF + presencial − estornos), % do teto MEI usado, saldo do caixa e gasto por
   categoria no mesmo lugar.
2. **Given** um mês fechado, **When** o dono exporta o extrato, **Then** recebe um documento com
   o faturamento do mês separado por tipo, utilizável como base da declaração MEI.
3. **Given** uma venda estornada no mês, **When** o dono olha o dashboard, **Then** a venda não
   está no faturamento do mês e o estorno aparece como reembolso/lançamento correspondente.

---

### Edge Cases

- Reenvio do mesmo arquivo XML (nota já importada) → aviso "nota já existe", sem duplicar.
- Nome de arquivo XML em padrão desconhecido (ex.: formato que o marketplace mudou) → sistema
  pergunta o canal manualmente; a venda ainda é importada corretamente.
- Item da nota cujo código não existe no catálogo → vai para "códigos sem vínculo" sem quebrar a
  importação; o restante do lote importa normalmente.
- Venda estornada depois de contada no mês → deixa de contar no faturamento (mês e ano) e gera
  sugestão de reembolso no caixa.
- Mudança de preço/custo de produto após vendas existirem → nenhuma venda passada é alterada.
- Ano novo: o acumulado do teto MEI zera em 1º de janeiro (o limite é anual, por ano-calendário).
- Dois pedidos do mesmo cliente → dois XMLs, duas vendas separadas.
- Um pedido com dois itens → um XML com os dois itens, uma venda com as duas linhas.
- Percentual padrão de taxa desatualizado → o dono ajusta a taxa no vendedor real da venda; a
  regra serve só como padrão inicial.
- Backup/restauração: dados locais; o dono exporta uma cópia dos dados para proteger o histórico.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE importar vários arquivos XML de nota fiscal de uma vez, criando
  uma venda por nota com data, itens, valor bruto e número da nota extraídos do arquivo.
- **FR-002**: O sistema DEVE deduplicar por número da nota: um arquivo já importado nunca cria
  venda duplicada e o reenvio DEVE exibir aviso claro.
- **FR-003**: O sistema DEVE identificar o canal (Shopee/TikTok) pelo padrão do nome do arquivo
  como sugestão, e PERMITIR que o dono confirme ou ajuste o canal do lote antes de importar.
  Arquivos com padrão desconhecido DEVEM exigir escolha manual de canal.
- **FR-004**: O sistema DEVE permitir cadastrar produtos com nome, categoria, preço de venda,
  custo estimado e um ou mais códigos (por canal ou geral), mostrando a margem preço − custo.
- **FR-005**: Na importação, o sistema DEVE vincular automaticamente cada item ao produto pelo
  código da nota; itens sem correspondência DEVEM entrar numa lista de "códigos sem vínculo"
  onde o dono vincula manualmente e o vínculo DEVE ser lembrado nas próximas importações.
- **FR-006**: Cada venda DEVE congelar o custo do produto vigente na data da venda; alterações
  posteriores de custo/preço NÃO DEVEM alterar vendas passadas.
- **FR-007**: O sistema DEVE oferecer a ação "aplicar custo atual às vendas sem custo", que
  preenche apenas vendas sem custo definido.
- **FR-008**: O sistema DEVE permitir registrar venda presencial manualmente (data, valor,
  itens, canal presencial), e essa venda DEVE compor o faturamento do mês e do ano.
- **FR-009**: O sistema DEVE permitir lançar movimentações de caixa com data, tipo
  (entrada/saída), categoria, valor, descrição e vínculo opcional a uma venda.
- **FR-010**: O sistema DEVE registrar a taxa do marketplace por venda, pré-preenchida por um
  padrão configurável por canal e editável em cada venda; o valor líquido DEVE ser
  bruto − taxa.
- **FR-011**: O sistema DEVE estornar uma venda registrando a data do estorno, excluindo-a do
  faturamento e sugerindo um lançamento de reembolso no caixa.
- **FR-012**: O dashboard DEVE mostrar: faturamento do mês (NF + presencial − estornos), %
  do teto MEI usado no ano, saldo/entradas/saídas do caixa, gastos por categoria e vendas por
  canal (bruto, taxas, líquido).
- **FR-013**: O teto anual MEI DEVE ser configurável e DEVE ter R$ 81.000,00 como padrão;
  o sistema DEVE indicar a porcentagem do limite já utilizada no ano.
- **FR-014**: O sistema DEVE exportar um extrato mensal com o faturamento do mês por tipo,
  utilizável como base da declaração mensal do MEI.
- **FR-015**: O sistema DEVE preservar uma cópia do XML original de cada nota importada para
  conferência e auditoria.

### Key Entities *(include if feature involves data)*

- **Produto**: nome, categoria, preço de venda, custo estimado, códigos por canal. Base da
  precificação e do vínculo automático dos itens importados.
- **Venda**: canal (Shopee/TikTok/Presencial), data, status (normal/estornado), linhas de
  itens, valor bruto, taxa, líquido, e dados da nota fiscal quando houver. Venda presencial não
  tem nota.
- **Linha da venda**: descrição do item, quantidade, valor unitário, código da nota e produto
  vinculado (quando conhecido) com custo congelado.
- **Nota Fiscal**: número, série, data, valor total e XML original; chave de deduplicação das
  importações.
- **Lançamento de caixa**: data, tipo entrada/saída, categoria, valor, descrição e vínculo
  opcional a uma venda.
- **Configuração**: teto anual MEI e percentual padrão de taxa por canal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O dono importa e confere o faturamento de um mês de vendas de marketplace em
  menos de 10 minutos, sem digitar nenhuma venda individual.
- **SC-002**: 100% das notas distintas são importadas uma única vez; reenviar qualquer arquivo já
  importado nunca gera venda duplicada.
- **SC-003**: Para cada venda, o líquido exibido (bruto − taxa ajustada) confere com o
  detalhamento de taxas mostrado pelo marketplace, sem retrabalho de conferência manual.
- **SC-004**: O dono obtém em menos de 60 segundos a resposta "quanto do limite anual MEI já
  foi usado".
- **SC-005**: Ao longo de um mês de uso, o saldo do caixa registrado confere com o valor
  realmente movimentado (diferença = 0), contando entradas e saídas lançadas.
- **SC-006**: Nenhuma venda passada muda quando o dono edita preço ou custo de um produto
  (verificação de imutabilidade garantida por teste automatizado no processo de desenvolvimento).
- **SC-007**: O dono consegue exportar o extrato mensal e usá-lo diretamente como base da
  declaração MEI, sem recompilar números manualmente.

## Assumptions

- Usuário único (o próprio MEI) em máquina própria; sem login, sem multiusuário, sem nuvem.
- As notas emitidas são de mercadoria (padrão nacional único); notas de serviço ficam fora de
  escopo nesta fase.
- Todo pedido de Shopee/TikTok exige nota fiscal; portanto, o XML é a fonte integral do
  faturamento online.
- Vendas presenciais são poucas, sem nota, e lançadas manualmente; compõem o faturamento para a
  declaração.
- Faturamento e caixa são medidos separadamente: dinheiro recebido é registrado à mão no caixa
  quando de fato entra/sai, porque a taxa é retida e o repasse chegou depois.
- A taxa do marketplace é parametrizável por canal e o valor real é sempre ajustável por venda;
  uma eventual mudança de regra do marketplace não exige código novo.
- O teto do MEI pode mudar por lei (há propostas em tramitação) — por isso é configurável.
- Estorno é um status de venda, nunca uma exclusão silenciosa de registro.
- Vendas históricas da planilha são migradas por importação dos XMLs já guardados pelo dono;
  vendas presenciais históricas são poucas e entram manualmente.
- Backup/exportação manual dos dados é responsabilidade do dono (hábito mensal).
- Nesta fase não há integração com APIs dos marketplaces; todo o fluxo é via arquivos XML.