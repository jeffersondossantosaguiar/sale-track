# Feature Specification: Precificação e Apuração de Lucro por Canal

**Feature Branch**: `005-pricing-profit-rework`

**Created**: 2026-09-17

**Status**: Draft

**Input**: User description: "Reformular precificação (margem unificada por produto, tabela de faixas de taxa por canal) e apuração de lucro (recebido como verdade, frete automático da NFe, importação de relatórios Shopee/TikTok para preencher o recebido)"

## Contexto (decisões da entrevista com o dono)

- O **lucro real** é o valor que cai na conta do vendedor (recebido), não o valor da nota. A nota (NFe) embute frete e taxas do marketplace, e o valor de faturamento difere do valor efetivamente recebido (descontos Pix/cupom variam).
- O vendedor recebe o **mesmo** no Pix e no cartão; o subsídio Pix é entre marketplace e comprador e afeta apenas o valor da NFe — **não é modelado**.
- O vendedor já registra manualmente o recebido em planilha; agora descobre que os dois marketplaces exportam relatórios com o recebido por pedido.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Apuração de lucro correta por venda (Priority: P1)

Como vendedor, quero que o lucro de cada venda seja calculado a partir do valor que realmente cai na minha conta (recebido), e não do valor da nota, para eu confiar nos números e não superestimar o lucro.

**Why this priority**: É a correção central de confiabilidade financeira; sem ela, o painel mostra lucro errado (hoje ≈ valor da nota). Entrega valor imediato, sem depender de parser de relatório.

**Independent Test**: Criar/importar uma venda, informar o valor recebido e conferir que o lucro = recebido − custo; com nota contendo frete, confirmar que o frete é lido da NFe.

**Acceptance Scenarios**:

1. **Given** uma venda com nota bruta R$156,49 (produtos R$132,62 + frete R$23,87), **When** informo que recebi R$110,00 e o custo dos itens é R$50,00, **Then** o lucro exibido é R$60,00 (recebido − custo).
2. **Given** uma venda importada sem valor recebido informado, **When** consulto o painel, **Then** o lucro aparece como "pendente" (sem número inventado), e uma estimativa por faixa pode aparecer à parte, claramente marcada como estimativa.
3. **Given** uma nota com linha de quantidade > 1 (ex.: 2 unidades do mesmo produto), **When** calculo o custo, **Then** o custo é multiplicado pela quantidade de cada item.

---

### User Story 2 - Precificação com margem unificada e taxas por faixa (Priority: P2)

Como vendedor, quero definir **uma margem única por produto** (campo livre, ex.: 30% ou 35%) e configurar as **taxas de cada canal por faixas de valor**, para que o preço sugerido de cada canal seja calculado corretamente, preservando meu lucro depois de pagar as taxas.

**Why this priority**: Habilita precificação confiável e centraliza as taxas (que variam por valor do item) em um editor editável, sem código.

**Independent Test**: Definir margem de um produto, configurar faixas Shopee/TikTok e gerar o preço sugerido por canal; editar uma faixa e ver o sugerido recalcular.

**Acceptance Scenarios**:

1. **Given** um produto com margem 30% e faixas Shopee configuradas (ex.: até R$79,99 → 20% + R$4), **When** calculo o preço sugerido, **Then** o preço usa a margem do produto e a faixa de taxa correspondente ao valor, preservando a margem líquida.
2. **Given** uma taxa cuja comissão% + margem ≥ 100%, **When** tento gerar o preço sugerido, **Then** o sistema exibe erro claro de "taxa + margem inválidas", sem gravar valor quebrado.
3. **Given** o editor de taxas de um canal, **When** digito faixas em texto (ex.: `<= 79,99 = 20% + 4`), **Then** o sistema converte em linhas estruturadas, mostra prévia e valida antes de salvar.
4. **Given** um preço praticado definido pelo vendedor por canal, **When** mudo o custo ou as taxas, **Then** o preço sugerido recalcula mas o **praticado não é alterado** automaticamente.

---

### User Story 3 - Importação de relatórios para preencher o recebido (Priority: P3)

Como vendedor, quero importar os relatórios de saldo do Shopee e de renda do TikTok para preencher automaticamente o valor recebido de cada venda, cruzando com as notas fiscais, e conferir manualmente o que não casar.

**Why this priority**: Elimina o trabalho manual de digitar o recebido por venda, mantendo a verdade financeira. É o mais complexo (parser + match), por isso P3.

**Independent Test**: Subir um relatório exportado e ver o recebido preenchido nas vendas correspondentes; vender via Shopee (match por ID) e via TikTok (match por produto+data+quantidade).

**Acceptance Scenarios**:

1. **Given** um relatório de saldo do Shopee exportado, **When** importo, **Then** o recebido de cada pedido é preenchido pelo valor do relatório, casado pelo ID do pedido presente no nome da NFe.
2. **Given** um relatório de renda do TikTok (aba "Detalhes do pedido"), **When** importo, **Then** o recebido de cada venda é preenchido pelo "Valor total a ser liquidado" por pedido, casado por produto/SKU + data + quantidade + valor coerente.
3. **Given** uma venda sem match confiável no relatório, **When** importo, **Then** ela entra numa fila de conferência manual para eu confirmar/ajustar o recebido, sem inventar vínculo.
4. **Given** o recebido preenchido pelo relatório, **When** quero, **Then** posso editar manualmente o valor recebido, com o lucro e a taxa derivada recalculando.

---

### Edge Cases

- Venda com **frete zero** (`vFrete = 0`): frete gravado como 0; o recebido já reflete a ausência de frete.
- Nota com **cupom/desconto** no cliente: não é modelado separadamente; o recebido já embute tudo.
- **Reembolsos** no relatório (valor a liquidar = 0): **ignorados por ora**; documentado como melhoria futura no README (ponto a verificar).
- Venda **sem recebido** informado: lucro "pendente", nunca inventado; estimativa por faixa exibida à parte quando disponível.
- **Match ambíguo** no TikTok (vários pedidos possíveis): não auto-associa; vai para conferência manual.
- **Taxa + margem ≥ 100%**: erro explícito, preço sugerido não gerado nem gravado.
- **Canal novo** sem relatório: cai no modo manual (recebido digitado), como o canal presencial hoje; a apuração e a precificação continuam funcionando.
- Linha de item com **quantidade > 1**: custo e taxa computados multiplicados pela quantidade.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Sistema DEVE calcular o lucro de uma venda como `recebido − Σ(custo × quantidade)`.
- **FR-002**: Sistema DEVE persistir o **valor recebido** por venda (campo `received`), preenchido manualmente ou por relatório.
- **FR-003**: Sistema DEVE extrair o **frete** (`vFrete`) da NFe e persistir por venda; ausente = 0.
- **FR-004**: Sistema DEVE manter o valor bruto da nota (`vNF`) imutável, como base de faturamento/MEI.
- **FR-005**: Sistema DEVE derivar a **taxa** de uma venda como `(bruto − frete) − recebido` e torná-la somente-leitura.
- **FR-006**: Sistema DEVE exibir o lucro como **pendente** quando a venda não tem recebido, sem inventar valor; estimativa por faixa (quando disponível) exibida separada e marcada.
- **FR-007**: Sistema DEVE permitir definir uma **margem única por produto** (campo livre, percentual), herdada pelas variantes na precificação.
- **FR-008**: Sistema DEVE calcular o **preço sugerido por canal** usando a margem do produto e a tabela de faixas de taxa do canal, resolvendo a faixa correspondente ao valor (por iteração).
- **FR-009**: Sistema DEVE manter o **preço praticado por canal** congelado (nunca alterado automaticamente por mudança de custo/taxa).
- **FR-010**: Sistema DEVE permitir configurar, por canal, uma **tabela de faixas** de taxa (comissão% + taxa fixa por faixa de valor do item), editável via texto que converte em linhas estruturadas com prévia e validação.
- **FR-011**: Sistema DEVE computar a taxa de uma venda **por item × quantidade** (faixa escolhida pelo preço unitário do item), não pelo total da nota.
- **FR-012**: Sistema DEVE calcular o custo de uma venda multiplicando o custo congelado de cada item pela quantidade (correção para notas com quantidade > 1).
- **FR-013**: Sistema DEVE importar os relatórios de saldo (Shopee) e de renda (TikTok), em xlsx ou csv, extraindo o recebido por pedido.
- **FR-014**: Sistema DEVE cruzar NFe ↔ relatório por **ID do pedido** (Shopee, match exato) e por **produto/SKU + data + quantidade + valor coerente** (TikTok), preenchendo o recebido.
- **FR-015**: Sistema DEVE enviar **matches ambíguos/sem match** para uma fila de conferência manual.
- **FR-016**: Sistema DEVE permitir **editar manualmente** o recebido de qualquer venda, recalculando lucro e taxa derivada.
- **FR-017**: Sistema DEVE preservar o comportamento do canal **presencial** (recebido = valor digitado; lucro = recebido − custo).
- **FR-018**: Subsídio Pix **NÃO** é modelado (decisão do dono); a tabela de faixas não possui campo de subsídio.
- **FR-019**: Reembolsos nos relatórios são **ignorados por ora** (documentados no README como melhoria/ponto a verificar).

### Key Entities *(include if feature involves data)*

- **Product**: contêiner de variantes; ganha o campo **margem** (unificada, livre, % do preço bruto).
- **VariantPrice**: preço por variante × canal; mantém **praticado** (congelado) e **sugerido** (recalculado); **perde** a margem por canal (margem sobe para o produto).
- **ChannelFeeTier** (nova): faixa de taxa por canal — `channel`, `min`, `max`, `comissão%`, `taxa_fixa`; sem subsídio.
- **Sale**: venda; ganha **recebido** (verdade) e **frete**; redefine **lucro** = recebido − custo e **taxa** = (bruto − frete) − recebido (derivada).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% das vendas com recebido informado exibem lucro = recebido − custo (verificado contra planilha do dono).
- **SC-002**: Notas com frete extraem o frete automaticamente em 100% dos casos com `vFrete` presente.
- **SC-003**: O preço sugerido de um produto reflete a margem definida e a faixa de taxa do canal; alterar margem ou faixa recalcula o sugerido sem tocar no praticado.
- **SC-004**: Importar os relatórios Shopee/TikTok preenche o recebido de ≥ 90% das vendas com match de alta confiança, sem falso vínculo (ambíguos vão para conferência).
- **SC-005**: Nenhuma venda exibe lucro inventado: sem recebido, o lucro fica pendente.
- **SC-006**: Testes automatizados cobrem as regras de lucro, frete, tabela de faixas, preço sugerido por iteração e importação de relatórios.

## Assumptions

- **Margem = % do preço bruto** (o que o cliente paga), semântica já validada; campo livre por produto (default 35%).
- **Recebido é por pedido** (nível do pedido), mesmo com múltiplos itens; `lucro = recebido − Σ(custo × quantidade)`.
- **Relatórios podem ser xlsx ou csv**; formato tratado por ambos os canais; estrutura assumida estável nas exportações.
- **Match Shopee** = ID do pedido no nome da NFe (confere com o ID do relatório). **Match TikTok** = produto/SKU + data + quantidade + valor coerente (nome da NFe é timestamp, não casa por ID).
- **Cupons/descontos Pix** não são modelados; o recebido já os embute; a nota só conta como bruto para imposto.
- **Taxa derivada e somente-leitura**; o recebido é a fonte da verdade.
- **Dados atuais podem ser migrados/recriados** (banco contém apenas NFe de teste; os recebidos reais virão dos relatórios).
- **Reembolsos** ignorados nesta versão; documentados no README como melhoria/ponto a verificar.
- Canal **presencial** sem relatório (manual), comportamento preservado.