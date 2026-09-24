# Feature Specification: Catálogo mestre de produtos e variantes

**Feature Branch**: `008-master-product-catalog`

**Created**: 2026-09-19

**Status**: Approved — 2026-09-19

**Input**: User description: "Redesenhar o catálogo mestre de produtos do Sale Track para que o ERP seja a fonte de verdade dos produtos, variantes e SKUs."

## Contexto

O catálogo atual já representa produtos, variantes, SKUs, custos de produção, preços e códigos aprendidos por canal, mas foi construído como apoio aos fluxos de venda existentes. Ele ainda não funciona como o cadastro canônico completo que alimentará produção, organização interna e futuras projeções para marketplaces.

Esta primeira fatia transforma produto e variante no núcleo mestre do Sale Track. O cadastro passa a reunir identidade interna, atributos essenciais, uma imagem principal, custos existentes e identificadores por canal. Informações compartilhadas pertencem ao produto; a variante registra o SKU e somente as diferenças que precisa sobrescrever.

Os dados atuais foram criados apenas para validar o sistema. Por decisão do usuário, a implementação poderá iniciar com a base operacional vazia, sem migração dos registros existentes. O reset não faz parte desta etapa de especificação e só poderá ocorrer durante a implementação aprovada.

## Clarifications

### Session 2026-09-19

- **Q:** Qual é o menor cadastro mestre aceitável nesta primeira spec? **A:** Produto, variantes, SKUs, custos atuais, códigos por canal, atributos internos essenciais e mídia básica.
- **Q:** Como modelar os atributos internos essenciais? **A:** Campos fixos principais acompanhados de observações ou atributos internos livres.
- **Q:** Qual é o papel da mídia básica? **A:** Uma imagem principal por produto ou variante para identificação no catálogo interno.
- **Q:** Como tratar os dados existentes? **A:** Todos os dados atuais podem ser apagados porque serviam apenas para validar o sistema.
- **Q:** Como distribuir os campos entre produto e variante? **A:** O produto mantém os valores compartilhados; a variante sobrescreve apenas o que for diferente.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Cadastrar o produto mestre (Priority: P1)

Como dono da operação, quero cadastrar a identidade e os atributos comuns de um produto em um único lugar, para que o Sale Track seja a referência interna para reconhecer, organizar e vender esse item.

**Why this priority**: Sem uma identidade canônica do produto, variantes e futuras integrações repetem informações e podem divergir entre si.

**Independent Test**: Em uma base vazia, cadastrar um produto com os campos obrigatórios, atributos internos, observações e imagem principal; fechar e reabrir o cadastro e confirmar que a mesma informação é exibida e pode ser encontrada na listagem.

**Acceptance Scenarios**:

1. **Given** uma base vazia, **When** o usuário cadastra nome interno, categoria, tipo e estado do produto, **Then** o produto mestre fica disponível para consulta e inclusão de variantes.
2. **Given** um produto cadastrado, **When** o usuário informa tema ou personagem, cor principal, tamanho ou escala, acabamento, observações internas e imagem principal, **Then** esses valores ficam associados ao produto e são tratados como padrão para suas variantes.
3. **Given** um produto com atributos opcionais ainda desconhecidos, **When** o usuário salva o cadastro sem preenchê-los, **Then** o produto permanece válido e pode ser completado depois.

---

### User Story 2 - Definir variantes e SKUs sem duplicar dados (Priority: P1)

Como dono da operação, quero criar uma ou mais variantes com SKU único e registrar apenas suas diferenças, para controlar cada unidade vendável sem repetir os dados comuns do produto.

**Why this priority**: A variante é a unidade real de venda, cálculo de custo, preço e vínculo com canais; o SKU precisa identificá-la sem ambiguidade.

**Independent Test**: Criar duas variantes do mesmo produto, uma herdando os atributos comuns e outra sobrescrevendo cor, tamanho, acabamento e imagem; confirmar que cada SKU resolve para a combinação efetiva correta.

**Acceptance Scenarios**:

1. **Given** um produto mestre, **When** o usuário cria uma variante com nome e SKU exclusivos, **Then** ela herda os campos compartilhados do produto e pode receber seus dados de produção e custo.
2. **Given** uma variante que difere do produto, **When** o usuário informa uma sobrescrita de atributo ou imagem, **Then** o valor efetivo da variante usa a sobrescrita sem alterar o produto nem as demais variantes.
3. **Given** uma variante sem diferença em determinado atributo, **When** o valor desse atributo é alterado no produto, **Then** a variante passa a refletir o novo valor compartilhado.
4. **Given** um SKU já utilizado, **When** o usuário tenta atribuí-lo a outra variante, **Then** o sistema rejeita a operação e preserva os dois cadastros anteriores.

---

### User Story 3 - Manter custos, preços e códigos ligados à unidade vendável (Priority: P2)

Como dono da operação, quero consultar e editar os dados produtivos, custos, preços e códigos de canal no contexto da variante, para que vendas e integrações identifiquem exatamente o item comercializado.

**Why this priority**: Esses vínculos já sustentam cálculo de custo, precificação e associação das vendas importadas; o redesenho do catálogo não pode embaralhar suas responsabilidades.

**Independent Test**: Em uma variante, informar tempos, material, consumo, custos adicionais, preços e códigos de Shopee e TikTok; confirmar que o custo é calculado para aquela variante e que cada código fica associado ao canal correto.

**Acceptance Scenarios**:

1. **Given** uma variante, **When** o usuário informa tempo de impressão, tempo manual, material, consumo, embalagem e acessórios, **Then** o custo atual é calculado e exibido para essa variante pelas regras vigentes.
2. **Given** uma variante, **When** o usuário informa preços por canal, **Then** os preços permanecem associados à variante e separados dos atributos canônicos do produto.
3. **Given** uma variante vendida na Shopee, **When** o usuário associa o código recebido pelo canal, **Then** esse código identifica a variante em importações futuras da Shopee.
4. **Given** uma variante vendida no TikTok, **When** o usuário associa a descrição recebida pelo canal, **Then** essa descrição identifica a variante em importações futuras do TikTok e o valor genérico `Padrao` não é usado como identidade.

---

### User Story 4 - Operar o catálogo com clareza (Priority: P2)

Como dono da operação, quero localizar e editar rapidamente produtos e variantes e distinguir dados internos de dados de canal, para usar o catálogo no trabalho diário sem navegar por cadastros duplicados.

**Why this priority**: Tornar o ERP a fonte de verdade depende tanto do modelo quanto de uma experiência em que o registro canônico seja fácil de encontrar e manter.

**Independent Test**: Com um conjunto representativo de produtos, localizar itens por nome, SKU, categoria e atributos fixos; abrir um resultado e identificar visualmente quais campos são internos, herdados, sobrescritos ou específicos de canal.

**Acceptance Scenarios**:

1. **Given** vários produtos e variantes, **When** o usuário pesquisa por nome ou SKU, **Then** encontra o registro correto e consegue abrir seu cadastro.
2. **Given** vários produtos, **When** o usuário filtra por categoria, tipo, tema ou personagem, cor, tamanho ou escala, acabamento ou estado, **Then** a listagem contém somente os itens compatíveis.
3. **Given** uma variante aberta, **When** o usuário consulta seus dados, **Then** consegue distinguir valores herdados do produto, sobrescritas da variante e identificadores específicos de canal.
4. **Given** um cadastro incompleto, **When** o usuário retorna à listagem, **Then** ainda consegue localizar e editar o registro sem perder os campos já preenchidos.

### Edge Cases

- Um produto simples continua sendo representado por um produto com uma única variante e um único SKU.
- Um produto pode existir sem imagem e sem atributos opcionais; ausências não devem gerar valores fictícios.
- Remover uma sobrescrita da variante restaura o valor compartilhado do produto, inclusive quando esse valor também estiver vazio.
- Alterar um atributo do produto não substitui uma sobrescrita já definida na variante.
- A imagem da variante, quando presente, substitui apenas para aquela variante a imagem principal do produto.
- Nomes iguais podem existir quando representam produtos distintos, mas SKU deve ser único em todo o catálogo.
- Espaços excedentes e diferenças apenas de maiúsculas ou minúsculas não podem permitir SKUs efetivamente duplicados.
- Produtos e variantes inativos continuam consultáveis e não aparecem como opções normais para novas operações de venda.
- Um código de canal não pode apontar ambiguamente para duas variantes no mesmo canal.
- O código da Shopee e a descrição do TikTok são identificadores externos; não substituem o SKU interno.
- O valor genérico `Padrao` do TikTok não pode ser aprendido ou persistido como identidade da variante.
- Falha ao vincular ou trocar uma imagem não pode apagar silenciosamente a referência anterior.
- Valores de tempo, peso e custo não podem ser negativos; campos monetários seguem as regras de integridade financeira do projeto.
- Como a implantação parte de base vazia, não haverá conversão nem inferência automática a partir dos dados de validação atuais.

## Requirements *(mandatory)*

### Field Inventory

| Nível | Campos desta fatia | Regra de propriedade |
|---|---|---|
| Produto mestre | nome interno, categoria, tipo, tema ou personagem, cor principal, tamanho ou escala, acabamento, observações ou atributos internos livres, imagem principal, margem e estado | Fonte dos valores compartilhados por todas as variantes |
| Variante / SKU | nome da variante, SKU, sobrescritas opcionais de cor, tamanho ou escala, acabamento, observações e imagem; tempo de impressão, tempo manual, material, consumo, embalagem, acessórios, custo calculado e estado | Unidade vendável; guarda apenas diferenças de identidade e seus dados próprios de produção e custo |
| Preço por canal | canal, preço sugerido e preço praticado | Pertence à variante; permanece separado do cadastro canônico e não constitui projeção completa de anúncio |
| Código por canal | canal, identificador externo e variante associada | Pertence à variante; Shopee usa o código do item e TikTok usa a descrição recebida |

### Functional Requirements

- **FR-001**: O sistema DEVE manter um cadastro mestre de produto como fonte de verdade para os campos internos compartilhados enumerados no inventário.
- **FR-002**: O sistema DEVE representar toda unidade vendável como uma variante pertencente a exatamente um produto e identificada por um SKU obrigatório.
- **FR-003**: O SKU DEVE ser único em todo o catálogo, desconsiderando diferenças de caixa e espaços externos.
- **FR-004**: O sistema DEVE permitir que uma variante sobrescreva somente cor, tamanho ou escala, acabamento, observações e imagem principal nesta primeira fatia.
- **FR-005**: Quando não houver sobrescrita, o valor efetivo da variante DEVE ser obtido do produto no momento da consulta, sem duplicar o valor compartilhado.
- **FR-006**: O sistema DEVE permitir remover uma sobrescrita e voltar a usar o valor do produto sem afetar outras variantes.
- **FR-007**: O sistema DEVE manter na variante os campos produtivos existentes: tempo de impressão, tempo manual, material, consumo em gramas, custo de embalagem e custo de acessórios.
- **FR-008**: O custo calculado da variante DEVE continuar obedecendo às regras financeiras vigentes e ser expresso em centavos inteiros.
- **FR-009**: O sistema DEVE manter preços sugeridos e praticados por canal associados à variante, sem tratá-los como atributos internos do produto.
- **FR-010**: O sistema DEVE manter identificadores externos por canal associados à variante e impedir ambiguidade de um mesmo identificador dentro do mesmo canal.
- **FR-011**: Para Shopee, o identificador externo DEVE representar o código recebido no item da venda; para TikTok, DEVE representar a descrição recebida, nunca o valor genérico `Padrao`.
- **FR-012**: O SKU interno, os atributos canônicos e os identificadores externos DEVEM ser apresentados como conceitos distintos.
- **FR-013**: Produto e variante DEVEM poder ter uma imagem principal opcional para reconhecimento interno; a imagem da variante, quando existente, prevalece apenas na visualização dessa variante.
- **FR-014**: A ausência de imagem, atributos opcionais ou observações NÃO DEVE impedir o cadastro de produto ou variante.
- **FR-015**: O sistema DEVE permitir pesquisar por nome interno e SKU e filtrar por categoria, tipo, tema ou personagem, cor, tamanho ou escala, acabamento e estado.
- **FR-016**: O sistema DEVE indicar no cadastro da variante quais valores são herdados e quais são sobrescritos.
- **FR-017**: Produto simples DEVE continuar sendo modelado com exatamente uma variante inicial, cujo SKU pode ser revisado antes da conclusão do cadastro.
- **FR-018**: Produto e variante DEVEM possuir estado ativo ou inativo; registros inativos permanecem consultáveis, mas não são oferecidos normalmente em novas operações.
- **FR-019**: A implantação desta feature DEVE poder eliminar todos os dados operacionais existentes e iniciar o catálogo vazio, pois a base atual contém somente dados de validação.
- **FR-020**: O reset autorizado NÃO DEVE remover estrutura de schema, migrações, configurações versionadas do projeto ou dados de referência necessários para iniciar o aplicativo.
- **FR-021**: O procedimento de reset DEVE ser explícito, verificável e executado somente na etapa de implementação após a aprovação dos artefatos SDD.
- **FR-022**: Esta feature NÃO DEVE criar projeções completas de anúncio, publicação ou sincronização com canais.
- **FR-023**: Esta feature NÃO DEVE introduzir receitas detalhadas de produção, kits, bundles ou personalizações como entidades de primeira classe.

### Key Entities

- **Produto Mestre**: identidade canônica compartilhada, com nome interno, classificação, atributos essenciais, observações, imagem, margem e estado.
- **Variante**: unidade vendável pertencente ao produto, com nome, SKU, sobrescritas opcionais, dados produtivos, custo e estado.
- **Valor Efetivo de Variante**: resultado da sobrescrita da variante quando presente ou, caso contrário, do valor compartilhado do produto.
- **Imagem Principal**: referência visual interna opcional do produto ou da variante; não representa galeria nem ativo de publicação por canal.
- **Preço de Variante por Canal**: preço sugerido e praticado para uma variante em determinado canal, preservando o comportamento atual de precificação.
- **Código de Canal**: identificador externo aprendido ou cadastrado para relacionar itens importados a uma variante.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Em teste de aceitação, o usuário consegue cadastrar um produto com sua primeira variante e SKU, incluindo atributos essenciais e custos, em até 3 minutos.
- **SC-002**: 100% das variantes exibem um SKU único e uma origem identificável para cada atributo efetivo: produto ou sobrescrita da variante.
- **SC-003**: Pesquisas por nome ou SKU e filtros por cada campo fixo retornam o registro esperado em todos os cenários de aceitação definidos.
- **SC-004**: Alterar um valor compartilhado atualiza 100% das variantes que o herdam e 0% das variantes que possuem sobrescrita própria.
- **SC-005**: Em todos os testes de canal, códigos Shopee e descrições TikTok resolvem para no máximo uma variante, sem usar `Padrao` como identificador TikTok.
- **SC-006**: Produtos e variantes podem ser reconhecidos visualmente pela imagem efetiva quando cadastrada, e 100% dos cadastros sem imagem continuam funcionais.
- **SC-007**: Após o reset aprovado, não permanece nenhum produto, variante, venda, vínculo ou outro dado operacional de validação, e o aplicativo inicia apto a receber o primeiro produto mestre.
- **SC-008**: Nenhum fluxo desta entrega cria anúncio, envia alteração ou sincroniza conteúdo com marketplace.

## Assumptions

- O usuário principal continua sendo o dono da empresa em uma operação local e single-user.
- A base atual não contém dados reais que precisem de retenção, auditoria ou migração.
- A forma técnica de armazenar e apresentar imagens será decidida no plano; esta spec exige apenas uma imagem principal opcional e interna.
- Categoria continua sendo um cadastro controlado já existente; tipo e os demais atributos fixos são campos do produto, não um mecanismo genérico de atributos.
- Observações ou atributos internos livres servem para detalhes não cobertos pelos campos fixos e não alimentam automaticamente anúncios de canal.
- O cálculo de custo, margem e preço vigente será preservado nesta fatia; mudanças nas fórmulas exigem outra decisão de escopo.
- Projeções por canal, galerias, receitas detalhadas, kits, bundles e personalizações permanecem para specs posteriores.
- A disponibilidade do skill obrigatório `grill-me` não foi identificada no ambiente; a descoberta aplicou manualmente sua revisão crítica de dependências, integrações, propriedade de dados e casos de borda.
