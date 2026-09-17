# Feature Specification: Catálogo com Variantes e Precificação por Canal

**Feature Branch**: `002-product-variants-pricing`

**Created**: 2026-09-16

**Status**: Draft

**Input**: User description: "Melhorar o cadastro de produto: SKU unificado, variações (cor/tamanho/kit) com preço próprio, e um calculador de preço sugerido por canal baseado nas regras de negócio (filamento, energia, máquina, mão de obra, embalagem, acessórios e margem por canal)."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar produto com variantes e SKU (Priority: P1)

O dono cadastra um produto e, em vez de um preço/custo único, define uma ou mais variantes —
cor, tamanho, versão, ou um kit. Cada variante tem um SKU único e legível que o dono usa para
reconhecer o produto entre os canais. Um produto simples (sem variações) é apenas um produto
com uma única variante. Todo SKU é único no catálogo.

**Why this priority**: é a base de tudo — sem o modelo de variantes, nenhuma precificação por
variação funciona. Entrega valor sozinho: organiza o catálogo em unidades de venda reais.

**Independent Test**: Cadastrar um produto com 3 variantes (2 cores + 1 kit) e um produto
simples; conferir que cada variante tem SKU único, que o produto simples ganha 1 variante
default, e que todos aparecem corretamente no catálogo.

**Acceptance Scenarios**:

1. **Given** um produto com 3 variantes (cores e kit), **When** o dono salva o cadastro,
   **Then** cada variante tem um SKU único e é listada no catálogo sob o produto.
2. **Given** um produto cadastrado sem variações, **When** o dono salva, **Then** o sistema cria
   automaticamente uma única variante default para ele.
3. **Given** o dono tenta salvar um SKU já usado em outra variante, **When** ele confirma,
   **Then** o sistema recusa e pede um SKU diferente.
4. **Given** uma variante inativa, **When** o dono vê o catálogo, **Then** ela não aparece como
   opção de venda nova, mas não é apagada do histórico.

---

### User Story 2 - Calcular o custo de cada variante (Priority: P1)

Para cada variante, o dono informa os dados de fabricação — tempo de impressão, tempo de
trabalho manual (pintar, colar, remover suporte), peso (filamento gasto), material do filamento,
custo de embalagem e eventuais acessórios (ex.: a argola do chaveiro). O sistema calcula o custo
total da variante somando: filamento, energia+máquina, mão de obra, embalagem e acessórios, e
mostra o detalhamento linha a linha, com a mão de obra destacada separadamente.

**Why this priority**: é o coração da feature — transforma os insumos em um custo confiável, o
que alimenta tanto o preço sugerido quanto o lucro. É o sub-problema mais difícil.

**Independent Test**: Cadastrar 2 variantes com parâmetros diferentes (tempo, peso, material,
embalagem, acessórios) e conferir que o custo total e cada linha do detalhamento batem com o
cálculo manual na planilha.

**Acceptance Scenarios**:

1. **Given** uma variante com peso 100g de filamento preto, **When** o dono abre o detalhamento,
   **Then** o custo de filamento é peso × preço/kg do material preto.
2. **Given** uma variante com tempo de impressão e o custo por hora global de energia+máquina,
   **When** o sistema calcula, **Then** o custo de energia+máquina é tempo × custo/hora.
3. **Given** uma variante com tempo de impressão e manual e o custo/hora de mão de obra, **When**
   o sistema calcula, **Then** a mão de obra é (tempo impressão + tempo manual) × custo/hora e
   aparece como linha destacada no detalhamento.
4. **Given** uma variante com embalagem e acessórios, **When** o sistema calcula, **Then** embalagem
   e acessórios somam no custo total.
5. **Given** o dono troca o preço do material de filamento, **When** o sistema recalcula, **Then**
   o custo das variantes que usam aquele material acompanha a mudança.

---

### User Story 3 - Precificar por canal com preço sugerido e praticado (Priority: P2)

O dono define, por variante e por canal (Shopee/TikTok), uma margem de lucro. O sistema calcula o
**preço sugerido** do canal usando o custo da variante e as taxas do canal (fixa + percentual), de
modo que, descontadas as taxas e a margem, o custo esteja coberto. O dono decide o **preço
praticado** final por canal — que fica congelado até ele o alterar manualmente, mesmo que o
sugerido recalcule depois. O sistema mostra o lucro esperado (praticado − custo) e a porcentagem.

**Why this priority**: é o valor final de negócio — responde "por quanto vender em cada canal".
Depende do custo (US2), por isso é P2.

**Independent Test**: Para uma variante com custo conhecido, configurar margens e taxas de
Shopee/TikTok; conferir o preço sugerido de cada canal, ajustar o praticado e verificar que ele
fica congelado quando o custo muda.

**Acceptance Scenarios**:

1. **Given** custo de uma variante = R$ 10, taxa fixa do canal = R$ 2 e taxa % = 10% com margem
   40%, **When** o sistema calcula o preço sugerido, **Then** o resultado é (10 + 2) / (1 − 0,10 −
   0,40) = R$ 24.
2. **Given** um preço praticado definido pelo dono, **When** o custo ou a margem muda e o sugerido
   recalcula, **Then** o preço praticado permanece o mesmo até o dono alterá-lo manualmente.
3. **Given** uma variante com preço praticado por canal, **When** o dono abre o cadastro, **Then**
   vê o praticado, o sugerido e o lucro esperado (praticado − custo) com a porcentagem.
4. **Given** margens diferentes entre Shopee e TikTok na mesma variante, **When** o sistema calcula,
   **Then** cada canal recebe seu próprio preço sugerido.

---

### User Story 4 - Parâmetros globais de custo: energia, máquina e mão de obra (Priority: P2)

O dono configura os custos que não variam por produto: tarifa de energia (R$/kWh), horas de uso
por semana, e o custo por hora de mão de obra. Ele também cadastra suas impressoras (custo de
aquisição, vida útil, consumo e manutenção) como referência; o sistema usa a impressora mais cara
para derivar o custo/hora global de energia+máquina, que é aplicado a todas as variantes pelo
tempo de impressão.

**Why this priority**: sem esses parâmetros, o custo de energia+máquina e mão de obra do US2 não
existem. É pré-requisito do cálculo de custo, mas os valores são configuração simples.

**Independent Test**: Configurar tarifa, horas/semana, custo/hora de mão de obra e cadastrar 2
impressoras; conferir que o custo/hora global usa a impressora mais cara e que alterar qualquer
parâmetro atualiza o custo das variantes.

**Acceptance Scenarios**:

1. **Given** duas impressoras cadastradas com custos/hora diferentes, **When** o sistema deriva o
   custo/hora global, **Then** usa o da impressora mais cara.
2. **Given** o dono altera a tarifa de energia ou o custo/hora de mão de obra, **When** o sistema
   recalcula, **Then** o custo das variantes que usam esses parâmetros acompanha.
3. **Given** os parâmetros configurados, **When** o dono calcula o custo de uma variante, **Then** o
   custo de energia+máquina usa o tempo de impressão da variante e o custo/hora global.

---

### User Story 5 - Vendas e importação na granularidade de variante (Priority: P3)

A importação de notas e o vínculo dos itens passam a operar sobre **variantes** (não sobre o
produto): o código da nota (cProd) casa com uma variante, e o custo congelado na venda é o custo
da variante vigente na data da venda. Os códigos por canal existentes continuam funcionando, agora
apontando para a variante correta.

**Why this priority**: mantém a importação e a auditoria de custo íntegras com o novo modelo de
variantes, mas só importa depois que as US1–US4 existem. Os dados de teste são migrados/recriados
livremente.

**Independent Test**: Importar uma nota com itens de uma variante conhecida; conferir que a venda
vincula na variante e congela o custo correto; confirmar que a margem usa o custo congelado mesmo
se a variante for editada depois.

**Acceptance Scenarios**:

1. **Given** uma nota cujos itens correspondem a uma variante, **When** o dono importa, **Then** a
   venda vincula na variante e congela o custo da variante na data da venda.
2. **Given** um item importado cujo código não casa com nenhuma variante, **When** a importação
   termina, **Then** o item entra na lista de códigos sem vínculo como hoje, sem quebrar o lote.
3. **Given** uma variante editada (custo muda) após uma venda, **When** o dono consulta a venda,
   **Then** a margem da venda continua usando o custo congelado, sem alteração retroativa.

---

### Edge Cases

- Produto sem variações → sistema cria 1 variante default; o cadastro trata igual aos demais.
- Duas variantes tentando usar o mesmo SKU → sistema recusa e pede SKU único.
- Cor/material com preço diferente → cada material tem seu preço/kg; a variante referencia o
  material usado.
- Custo/hora global com várias impressoras → usa a mais cara (decisão do dono).
- Mudança de preço do material ou de parâmetro global → custo das variantes recalcula; preço
  praticado NÃO muda automaticamente.
- Variante inativa → some das opções de venda nova, mas o histórico é preservado.
- Kit → tratado como variante normal, com custo montado manualmente (sem composição automática
  de componentes nesta versão).
- Presencial → fora do escopo desta feature; comportamento atual do sistema é mantido.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: O sistema DEVE permitir cadastrar um produto com uma ou mais variantes, cada uma com
  um SKU único e legível definido pelo dono.
- **FR-002**: Todo produto DEVE ter ao menos uma variante; ao cadastrar um produto sem variações, o
  sistema DEVE criar automaticamente uma única variante default.
- **FR-003**: O sistema DEVE impedir que dois SKUs sejam iguais no catálogo.
- **FR-004**: O sistema DEVE permitir cadastrar materiais de filamento com preço por kg, e cada
  variante DEVE referenciar um material e informar o peso (filamento gasto).
- **FR-005**: O sistema DEVE calcular o custo da variante somando filamento, energia+máquina, mão de
  obra, embalagem e acessórios, e DEVE exibir o detalhamento por linha, com a mão de obra destacada
  separadamente.
- **FR-006**: O custo de filamento DEVE ser peso × preço/kg do material; alterar o preço do material
  DEVE recalcular o custo das variantes que o usam.
- **FR-007**: O sistema DEVE permitir configurar tarifa de energia (R$/kWh), horas de uso por semana
  e custo por hora de mão de obra como parâmetros globais.
- **FR-008**: O sistema DEVE permitir cadastrar impressoras (custo de aquisição, vida útil, consumo,
  manutenção) e DEVE derivar o custo/hora global de energia+máquina a partir da impressora mais
  cara, aplicando-o a todas as variantes pelo tempo de impressão.
- **FR-009**: O custo de energia+máquina da variante DEVE ser tempo de impressão × custo/hora global;
  o custo de mão de obra DEVE ser (tempo de impressão + tempo manual) × custo/hora de mão de obra.
- **FR-010**: O sistema DEVE permitir definir, por variante e por canal (Shopee/TikTok), uma margem
  de lucro e calcular o preço sugerido do canal como (custo + taxa fixa do canal) / (1 − taxa
  percentual do canal − margem).
- **FR-011**: O sistema DEVE permitir definir um preço praticado por variante e canal; o preço
  praticado NÃO DEVE mudar automaticamente quando o custo, a margem ou as taxas mudam — só com ação
  manual do dono.
- **FR-012**: O sistema DEVE mostrar, por variante e canal, o preço sugerido, o preço praticado e o
  lucro esperado (praticado − custo) com a porcentagem.
- **FR-013**: As taxas dos canais (fixa e percentual) DEVEM ser configuráveis globalmente.
- **FR-014**: A importação de notas e o vínculo dos itens DEVEM operar na granularidade de variante;
  o custo congelado na venda DEVE ser o custo da variante vigente na data da venda, e os códigos por
  canal DEVEM apontar para a variante.
- **FR-015**: O sistema DEVE preservar a imutabilidade das vendas passadas: editar variante, material
  ou parâmetro global NÃO DEVE alterar custo/margem já congelados em vendas anteriores.

### Key Entities *(include if feature involves data)*

- **Produto**: contêiner de uma ou mais variantes; nome e categoria.
- **Variante**: unidade real de venda com SKU único, tempo de impressão, tempo manual, peso
  (filamento), material, embalagem, acessórios, custo calculado e status ativo. Produto simples =
  1 variante.
- **Material**: filamento com preço por kg (cor/tipo) usado pelas variantes.
- **Preço por canal (variante × canal)**: margem, preço sugerido e preço praticado, por Shopee/TikTok.
- **Impressora**: referência de custo (aquisição, vida útil, consumo, manutenção) para derivar o
  custo/hora global.
- **Configuração global**: tarifa de energia, horas/semana, custo/hora de mão de obra e taxas
  (fixa + percentual) por canal.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: O dono cadastra um produto com variantes e SKUs em menos de 2 minutos por produto.
- **SC-002**: Para qualquer variante, o custo total e o detalhamento por linha conferem com o
  cálculo manual na planilha do dono, sem divergência.
- **SC-003**: O preço sugerido de um canal confere com a fórmula (custo + taxa fixa) / (1 − taxa % −
  margem) em 100% dos casos testados.
- **SC-004**: O preço praticado permanece inalterado após qualquer mudança de custo, margem ou taxa,
  até o dono alterá-lo manualmente (verificado por teste automatizado).
- **SC-005**: A importação de notas continua vinculando itens e congelando custos na granularidade de
  variante, com a mesma taxa de acerto de vínculo que existia na granularidade de produto.
- **SC-006**: Nenhuma venda passada muda quando o dono edita variante, material ou parâmetro global.

## Assumptions

- O peso da peça equivale ao filamento gasto na fabricação; não há campo de peso separado do consumo
  de filamento.
- O canal presencial está fora do escopo desta feature; o comportamento atual do sistema (cadastro de
  venda presencial) é mantido sem novas regras de precificação.
- Kits são variantes normais com custo montado manualmente; composição automática de componentes
  (lista de materiais) fica para evolução futura.
- O controle de estoque de filamento com média ponderada por compra fica para evolução futura; nesta
  versão o preço do material é cadastrado manualmente.
- O custo/hora global de energia+máquina é derivado da impressora mais cara cadastrada, pois o dono
  não atribui produto a uma impressora específica (usa a que estiver livre).
- Todos os valores monetários são em centavos inteiros, sem ponto flutuante.
- Os dados existentes (uma nota de teste) podem ser migrados/recriados; notas reais de Shopee/TikTok
  com múltiplos itens e variantes estão disponíveis para validar as regras.
- Esta feature não altera a apuração do teto MEI: o comportamento atual (as vendas consideradas no
  teto, incluindo presencial) é preservado, pois o canal presencial está fora do escopo desta feature.